/**
 * Rapports agrégés (SQLite / better-sqlite3).
 * Équivalent logique aux filtres Prisma `where: { createdAt: { gte, lte } }` avec bornes UTC.
 */
import { type NextRequest, NextResponse } from "next/server"
import db, { initializeDatabase } from "@/lib/database"
import {
  formatUtcForSqlite,
  getReportUtcBounds,
  normalizeReportTypeParam,
  type ReportPeriodType,
} from "@/lib/report-date-range"

initializeDatabase()

const TABLE_NAMES = new Set([
  "sales",
  "purchases",
  "clients",
  "products",
  "expenses",
  "broken_products",
  "private_credits",
  "manual_payments",
  "cash_register",
  "employees",
  "suppliers",
])

function pickTimestampColumn(table: string, candidates: string[]): string | null {
  if (!TABLE_NAMES.has(table)) return null
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  const names = new Set(rows.map((r) => r.name))
  for (const c of candidates) {
    if (names.has(c)) return c
  }
  return null
}

function hasColumn(table: string, column: string): boolean {
  if (!TABLE_NAMES.has(table)) return false
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  return rows.some((r) => r.name === column)
}

/** Comma-separated list of columns that exist (avoids "no such column" on legacy schemas). */
function selectExistingColumns(table: string, wanted: string[]): string {
  if (!TABLE_NAMES.has(table)) return "*"
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  const names = new Set(rows.map((r) => r.name))
  const picks = wanted.filter((c) => names.has(c))
  return picks.length > 0 ? picks.join(", ") : "*"
}

function sumAmount(rows: { total_amount?: number; amount?: number }[], key: "total_amount" | "amount"): number {
  return rows.reduce((acc, r) => acc + Number(r[key] ?? 0), 0)
}

function assertSqlIdent(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error(`Identifiant SQL invalide: ${name}`)
  }
  return name
}

/** Prisma-style `createdAt` gte/lte using the best available timestamp column on each table. */
function rowsInDateRange(
  table: string,
  dateCol: string | null,
  selectList: string,
  startSql: string,
  endSql: string,
): any[] {
  if (!dateCol || !TABLE_NAMES.has(table)) return []
  const col = assertSqlIdent(dateCol)
  const t = assertSqlIdent(table)
  return db
    .prepare(
      `SELECT ${selectList} FROM ${t}
       WHERE datetime(${col}) >= datetime(?) AND datetime(${col}) <= datetime(?)
       ORDER BY datetime(${col}) DESC`,
    )
    .all(startSql, endSql) as any[]
}

export async function GET(request: NextRequest) {
  try {
    const typeParam = request.nextUrl.searchParams.get("type")
    const type = normalizeReportTypeParam(typeParam)
    if (!type) {
      return NextResponse.json(
        { success: false, error: "Paramètre type invalide. Utilisez daily, monthly ou yearly." },
        { status: 400 },
      )
    }

    const { startDate, endDate } = getReportUtcBounds(type as ReportPeriodType)
    const startSql = formatUtcForSqlite(startDate)
    const endSql = formatUtcForSqlite(endDate)

    console.log("[reports] type=%s startDate=%s endDate=%s", type, startDate.toISOString(), endDate.toISOString())

    const salesDateCol = pickTimestampColumn("sales", ["created_at", "sale_date"])
    const purchasesDateCol = pickTimestampColumn("purchases", ["created_at", "purchase_date"])
    const clientsDateCol = pickTimestampColumn("clients", ["created_at", "date_created"])
    const expensesDateCol = pickTimestampColumn("expenses", ["created_at", "expense_date"])
    const brokenDateCol = pickTimestampColumn("broken_products", ["created_at", "broken_date"])
    const creditsDateCol = pickTimestampColumn("private_credits", ["created_at", "credit_date"])
    const manualDateCol = pickTimestampColumn("manual_payments", ["created_at", "payment_date"])
    const employeesDateCol = pickTimestampColumn("employees", ["created_at", "hire_date"])
    const suppliersDateCol = pickTimestampColumn("suppliers", ["created_at"])
    const productsDateCol = pickTimestampColumn("products", ["created_at"])
    const cashCol = pickTimestampColumn("cash_register", ["created_at", "transaction_date", "date"])

    console.log("[reports] resolved date columns", {
      sales: salesDateCol,
      purchases: purchasesDateCol,
      clients: clientsDateCol,
      expenses: expensesDateCol,
      broken_products: brokenDateCol,
      private_credits: creditsDateCol,
      manual_payments: manualDateCol,
      cash_register: cashCol,
      employees: employeesDateCol,
      suppliers: suppliersDateCol,
      products: productsDateCol,
    })

    const sales = rowsInDateRange(
      "sales",
      salesDateCol,
      selectExistingColumns("sales", [
        "id",
        "client_id",
        "total_amount",
        "payment_method",
        "cash_amount",
        "credit_amount",
        "notes",
        "created_at",
        "sale_date",
      ]),
      startSql,
      endSql,
    )
    const purchases = rowsInDateRange(
      "purchases",
      purchasesDateCol,
      selectExistingColumns("purchases", [
        "id",
        "supplier_id",
        "total_amount",
        "payment_method",
        "notes",
        "created_at",
        "purchase_date",
      ]),
      startSql,
      endSql,
    )
    const clients = rowsInDateRange(
      "clients",
      clientsDateCol,
      selectExistingColumns("clients", ["id", "name", "phone", "email", "created_at", "date_created"]),
      startSql,
      endSql,
    )
    const expenses = rowsInDateRange(
      "expenses",
      expensesDateCol,
      selectExistingColumns("expenses", ["id", "description", "amount", "category", "expense_date", "created_at"]),
      startSql,
      endSql,
    )
    const brokenProducts = rowsInDateRange(
      "broken_products",
      brokenDateCol,
      selectExistingColumns("broken_products", [
        "id",
        "product_id",
        "quantity",
        "loss_amount",
        "broken_date",
        "created_at",
        "description",
      ]),
      startSql,
      endSql,
    )
    const privateCredits = rowsInDateRange(
      "private_credits",
      creditsDateCol,
      selectExistingColumns("private_credits", [
        "id",
        "client_id",
        "amount",
        "status",
        "credit_date",
        "created_at",
        "due_date",
        "description",
      ]),
      startSql,
      endSql,
    )
    const manualPayments = rowsInDateRange(
      "manual_payments",
      manualDateCol,
      selectExistingColumns("manual_payments", [
        "id",
        "client_id",
        "amount",
        "payment_method",
        "payment_date",
        "created_at",
        "description",
      ]),
      startSql,
      endSql,
    )

    let cashRegister: any[] = []
    if (cashCol) {
      const c = assertSqlIdent(cashCol)
      const cashBase = selectExistingColumns("cash_register", [
        "id",
        "type",
        "amount",
        "payment_method",
        "description",
        "client_id",
      ])
      cashRegister = db
        .prepare(
          `SELECT ${cashBase}, ${c} as event_at
           FROM cash_register
           WHERE datetime(${c}) >= datetime(?) AND datetime(${c}) <= datetime(?)
           ORDER BY datetime(${c}) DESC`,
        )
        .all(startSql, endSql) as any[]
    }

    const employees = rowsInDateRange(
      "employees",
      employeesDateCol,
      selectExistingColumns("employees", ["id", "name", "salary", "created_at", "hire_date", "phone", "is_active"]),
      startSql,
      endSql,
    )
    const suppliers = rowsInDateRange(
      "suppliers",
      suppliersDateCol,
      selectExistingColumns("suppliers", ["id", "name", "created_at", "phone"]),
      startSql,
      endSql,
    )
    const productsInPeriod = rowsInDateRange(
      "products",
      productsDateCol,
      selectExistingColumns("products", [
        "id",
        "name",
        "current_stock",
        "min_stock",
        "category",
        "created_at",
        "unit_price",
      ]),
      startSql,
      endSql,
    )

    const lowStockExpr = hasColumn("products", "min_stock")
      ? "SUM(CASE WHEN current_stock > 0 AND current_stock <= COALESCE(min_stock, 10) THEN 1 ELSE 0 END)"
      : "SUM(CASE WHEN current_stock > 0 AND current_stock <= 10 THEN 1 ELSE 0 END)"

    const productSnapshot = db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
          ${lowStockExpr} as low_stock
        FROM products`,
      )
      .get() as { total: number; out_of_stock: number; low_stock: number }

    const totalClientsAllTime = (db.prepare(`SELECT COUNT(*) as c FROM clients`).get() as { c: number }).c

    const salesTotal = sumAmount(sales, "total_amount")
    const salesCount = sales.length
    const salesAverage = salesCount > 0 ? salesTotal / salesCount : 0

    const purchasesTotal = sumAmount(purchases, "total_amount")
    const purchasesCount = purchases.length

    const expensesTotal = sumAmount(expenses, "amount")
    const expensesCount = expenses.length

    const manualTotal = sumAmount(manualPayments, "amount")
    const manualCount = manualPayments.length

    const brokenTotal = brokenProducts.reduce((a, p) => a + Number(p.loss_amount ?? 0), 0)
    const brokenCount = brokenProducts.length

    const activeCreditsAmount = privateCredits
      .filter((c) => !c.status || c.status === "active")
      .reduce((a, c) => a + Number(c.amount ?? 0), 0)

    const creditTotal = privateCredits.reduce((a, c) => a + Number(c.amount ?? 0), 0)

    let cashInflows = 0
    let cashOutflows = 0
    for (const t of cashRegister) {
      const typ = String(t.type ?? "").toLowerCase()
      const amt = Number(t.amount ?? 0)
      if (typ === "income" || typ === "sale") cashInflows += amt
      else if (typ === "expense" || typ === "purchase" || typ === "refund") cashOutflows += amt
      else cashInflows += amt
    }

    const employeesSalarySum = employees.reduce((a, e) => a + Number(e.salary ?? 0), 0)

    const financialRevenue = salesTotal
    const financialExpenses = purchasesTotal
    const financialProfit = financialRevenue - financialExpenses
    const profitMargin = financialRevenue > 0 ? (financialProfit / financialRevenue) * 100 : 0

    const recordCounts = {
      sales: sales.length,
      purchases: purchases.length,
      clients: clients.length,
      expenses: expenses.length,
      brokenProducts: brokenProducts.length,
      privateCredits: privateCredits.length,
      manualPayments: manualPayments.length,
      cashRegister: cashRegister.length,
      employees: employees.length,
      suppliers: suppliers.length,
      productsInPeriod: productsInPeriod.length,
    }
    const totalRecords = Object.values(recordCounts).reduce((a, b) => a + b, 0)
    console.log("[reports] recordCounts=", recordCounts, "totalRecords=", totalRecords)

    const summary = {
      sales: {
        total: salesTotal,
        count: salesCount,
        average: salesAverage,
        growth: 0,
        today: type === "daily" ? salesTotal : 0,
        todayCount: type === "daily" ? salesCount : 0,
        yearly: type === "yearly" ? salesTotal : 0,
        yearlyCount: type === "yearly" ? salesCount : 0,
      },
      products: {
        total: Number(productSnapshot.total ?? 0),
        lowStock: Number(productSnapshot.low_stock ?? 0),
        outOfStock: Number(productSnapshot.out_of_stock ?? 0),
        categories: 0,
      },
      customers: {
        total: totalClientsAllTime,
        newThisMonth: clients.length,
        active: clients.length,
        creditTotal: activeCreditsAmount,
      },
      financial: {
        revenue: financialRevenue,
        expenses: financialExpenses,
        profit: financialProfit,
        profitMargin,
      },
      businessExpenses: {
        total: expensesTotal,
        count: expensesCount,
        thisMonth: expensesTotal,
        thisMonthAmount: expensesTotal,
      },
      privateCredits: {
        total: privateCredits.length,
        active: privateCredits.filter((c) => !c.status || c.status === "active").length,
        totalAmount: creditTotal,
        activeAmount: activeCreditsAmount,
      },
      brokenProducts: {
        total: brokenCount,
        totalValue: brokenTotal,
        thisMonth: brokenCount,
        thisMonthValue: brokenTotal,
      },
      cashAccounts: {
        mainCash: financialProfit,
        manualPayments: manualTotal,
        salaryPayments: employeesSalarySum,
        totalOutflows: expensesTotal + manualTotal + employeesSalarySum + brokenTotal,
        netAfterCredits:
          financialProfit - expensesTotal - manualTotal - employeesSalarySum - brokenTotal - activeCreditsAmount,
      },
      suppliers: {
        total: (db.prepare(`SELECT COUNT(*) as c FROM suppliers`).get() as { c: number }).c,
        active: (db.prepare(`SELECT COUNT(*) as c FROM suppliers`).get() as { c: number }).c,
      },
      cashRegister: {
        totalTransactions: cashRegister.length,
        inflows: cashInflows,
        outflows: cashOutflows,
      },
      employees: {
        total: (db.prepare(`SELECT COUNT(*) as c FROM employees`).get() as { c: number }).c,
        totalSalary: (
          db.prepare(`SELECT COALESCE(SUM(salary),0) as s FROM employees WHERE salary IS NOT NULL`).get() as {
            s: number
          }
        ).s,
        activeCount: hasColumn("employees", "is_active")
          ? (db.prepare(`SELECT COUNT(*) as c FROM employees WHERE is_active = 1`).get() as { c: number }).c
          : (db.prepare(`SELECT COUNT(*) as c FROM employees`).get() as { c: number }).c,
      },
    }

    return NextResponse.json(
      {
        success: true,
        type,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalOrders: salesCount,
        totalRevenue: salesTotal,
        totals: {
          purchasesAmount: purchasesTotal,
          expensesAmount: expensesTotal,
          manualPaymentsAmount: manualTotal,
          brokenProductsValue: brokenTotal,
          cashInflows,
          cashOutflows,
        },
        recordCounts,
        summary,
        data: {
          sales,
          purchases,
          clients,
          expenses,
          brokenProducts,
          privateCredits,
          manualPayments,
          cashRegister,
          employees,
          suppliers,
          productsInPeriod,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    )
  } catch (error) {
    console.error("GET /api/reports:", error)
    return NextResponse.json({ success: false, error: "Erreur lors de la génération du rapport" }, { status: 500 })
  }
}
