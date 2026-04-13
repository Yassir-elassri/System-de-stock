"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users, 
  Calendar,
  Download,
  Loader2,
  FileText,
  FileText as FileTextIcon,
  CreditCard,
  AlertTriangle,
  Receipt
} from "lucide-react"
import { toast } from "sonner"

// Real data will be fetched from APIs
interface ReportData {
  sales: {
    total: number
    count: number
    average: number
    growth: number
    today: number
    todayCount: number
    yearly: number
    yearlyCount: number
  }
  products: {
    total: number
    lowStock: number
    outOfStock: number
    categories: number
  }
  customers: {
    total: number
    newThisMonth: number
    active: number
    creditTotal: number
  }
  financial: {
    revenue: number
    expenses: number
    profit: number
    profitMargin: number
  }
  businessExpenses: {
    total: number
    count: number
    thisMonth: number
    thisMonthAmount: number
  }
  privateCredits: {
    total: number
    active: number
    totalAmount: number
    activeAmount: number
  }
  brokenProducts: {
    total: number
    totalValue: number
    thisMonth: number
    thisMonthValue: number
  }
  cashAccounts: {
    mainCash: number
    manualPayments: number
    salaryPayments: number
    totalOutflows: number
    netAfterCredits: number
  }
  suppliers: {
    total: number
    active: number
  }
  cashRegister: {
    totalTransactions: number
    inflows: number
    outflows: number
  }
  employees: {
    total: number
    totalSalary: number
    activeCount: number
  }
}

const reportTypes = [
  { value: "daily", label: "Rapport d'Aujourd'hui", icon: Calendar },
  { value: "monthly", label: "Rapport Mensuel", icon: TrendingUp },
  { value: "yearly", label: "Rapport d'Année", icon: BarChart3 }
]

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState("daily")
  const [lastGeneratedReport, setLastGeneratedReport] = useState<any>(null)
  const [reportData, setReportData] = useState<ReportData>({
    sales: { total: 0, count: 0, average: 0, growth: 0, today: 0, todayCount: 0, yearly: 0, yearlyCount: 0 },
    products: { total: 0, lowStock: 0, outOfStock: 0, categories: 0 },
    customers: { total: 0, newThisMonth: 0, active: 0, creditTotal: 0 },
    financial: { revenue: 0, expenses: 0, profit: 0, profitMargin: 0 },
    businessExpenses: { total: 0, count: 0, thisMonth: 0, thisMonthAmount: 0 },
    privateCredits: { total: 0, active: 0, totalAmount: 0, activeAmount: 0 },
    brokenProducts: { total: 0, totalValue: 0, thisMonth: 0, thisMonthValue: 0 },
    cashAccounts: { mainCash: 0, manualPayments: 0, salaryPayments: 0, totalOutflows: 0, netAfterCredits: 0 },
    suppliers: { total: 0, active: 0 },
    cashRegister: { totalTransactions: 0, inflows: 0, outflows: 0 },
    employees: { total: 0, totalSalary: 0, activeCount: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [reportFetchLoading, setReportFetchLoading] = useState(false)
  const [reportFetchError, setReportFetchError] = useState<string | null>(null)
  const [generatedReports, setGeneratedReports] = useState<Array<{
    id: string
    type: string
    typeLabel: string
    dateRange: string
    dateRangeLabel: string
    timestamp: string
    data: any
    meta?: {
      startDate: string
      endDate: string
      totalOrders: number
      totalRevenue: number
    }
  }>>([])
  const [manualPaymentsCount, setManualPaymentsCount] = useState(0)
  const [salaryPaymentsCount, setSalaryPaymentsCount] = useState(0)
  const [suppliersCount, setSuppliersCount] = useState(0)
  const [cashRegisterCount, setCashRegisterCount] = useState(0)
  const [employeesCount, setEmployeesCount] = useState(0)


  // Fetch real data from all APIs
  useEffect(() => {
    const fetchRealData = async () => {
      try {

        setLoading(true)

        const fetchJsonSafe = async (url: string) => {
          try {
            const res = await fetch(url)
            return res.ok ? await res.json() : []
          } catch {
            return []
          }
        }

        const [
          salesData,
          productsData,
          clientsData,
          purchasesData,
          creditsData,
          brokenProductsData,
          expensesData,
          manualPaymentsData,
          suppliersData,
          cashRegisterData,
          employeesData,
        ] = await Promise.all([
          fetchJsonSafe("/api/sales"),
          fetchJsonSafe("/api/products"),
          fetchJsonSafe("/api/clients"),
          fetchJsonSafe("/api/purchases"),
          fetchJsonSafe("/api/private-credits"),
          fetchJsonSafe("/api/broken-products"),
          fetchJsonSafe("/api/expenses"),
          fetchJsonSafe("/api/manual-payments"),
          fetchJsonSafe("/api/suppliers"),
          fetchJsonSafe("/api/cash-register"),
          fetchJsonSafe("/api/employees"),
        ])
        
        // Calculate sales metrics
        const totalSales = salesData.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0)
        const salesCount = salesData.length
        const averageSale = salesCount > 0 ? totalSales / salesCount : 0
        
        // Calculate monthly sales (current month only)
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        const monthlySales = salesData.reduce((sum: number, sale: any) => {
          const saleDate = new Date(sale.sale_date || sale.created_at || Date.now())
          if (saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear) {
            return sum + (sale.total_amount || 0)
          }
          return sum
        }, 0)
        
        const monthlySalesCount = salesData.filter((sale: any) => {
          const saleDate = new Date(sale.sale_date || sale.created_at || Date.now())
          return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear
        }).length
        
        // Calculate today's sales
        const today = new Date()
        const todayString = today.toISOString().split('T')[0] // YYYY-MM-DD format
        const todaySales = salesData.reduce((sum: number, sale: any) => {
          const saleDate = new Date(sale.sale_date || sale.created_at || Date.now())
          const saleDateString = saleDate.toISOString().split('T')[0]
          if (saleDateString === todayString) {
            return sum + (sale.total_amount || 0)
          }
          return sum
        }, 0)
        
        const todaySalesCount = salesData.filter((sale: any) => {
          const saleDate = new Date(sale.sale_date || sale.created_at || Date.now())
          const saleDateString = saleDate.toISOString().split('T')[0]
          return saleDateString === todayString
        }).length
        
        // Calculate yearly sales
        const thisYear = new Date().getFullYear()
        const yearlySales = salesData.reduce((sum: number, sale: any) => {
          const saleDate = new Date(sale.sale_date || sale.created_at || Date.now())
          if (saleDate.getFullYear() === thisYear) {
            return sum + (sale.total_amount || 0)
          }
          return sum
        }, 0)
        
        const yearlySalesCount = salesData.filter((sale: any) => {
          const saleDate = new Date(sale.sale_date || sale.created_at || Date.now())
          return saleDate.getFullYear() === thisYear
        }).length
        
        // Calculate product metrics
        const totalProducts = productsData.length
        const lowStockProducts = productsData.filter((p: any) => (p.current_stock || 0) <= 10 && (p.current_stock || 0) > 0).length
        const outOfStockProducts = productsData.filter((p: any) => (p.current_stock || 0) === 0).length
        
        // Calculate customer metrics
        const totalCustomers = clientsData.length
        const thisMonth = new Date().getMonth()
        const newThisMonth = clientsData.filter((c: any) => {
          const createdDate = new Date(c.created_at || c.date_created || Date.now())
          return createdDate.getMonth() === thisMonth && createdDate.getFullYear() === currentYear
        }).length
        
        // Calculate financial metrics
        const totalRevenue = totalSales
        const totalPurchaseExpenses = purchasesData.reduce((sum: number, purchase: any) => sum + (purchase.total_amount || 0), 0)
        const totalProfit = totalRevenue - totalPurchaseExpenses
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
        
        // Calculate credit total
        const creditTotal = creditsData.reduce((sum: number, credit: any) => {
          if (!credit.status || credit.status === 'active') return sum + (credit.amount || 0)
          return sum
        }, 0)
        
        // Calculate business expenses metrics
        const totalExpenses = expensesData.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0)
        const expensesCount = expensesData.length
        
        // Calculate manual payments metrics
        const totalManualPayments = manualPaymentsData.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0)
        const manualPaymentsCount = manualPaymentsData.length
        
        // Calculate suppliers metrics
        const totalSuppliers = suppliersData.length
        const activeSuppliers = suppliersData.filter((s: any) => !s.status || s.status === 'active').length
        
        // Calculate cash register metrics
        const totalCashTransactions = cashRegisterData.length
        const cashInflows = cashRegisterData.reduce((sum: number, transaction: any) => {
          if (transaction.type === 'income' || transaction.type === 'sale') {
            return sum + (transaction.amount || 0)
          }
          return sum
        }, 0)
        const cashOutflows = cashRegisterData.reduce((sum: number, transaction: any) => {
          if (transaction.type === 'expense' || transaction.type === 'purchase') {
            return sum + (transaction.amount || 0)
          }
          return sum
        }, 0)
        
        // Calculate salary payments metrics
        const totalSalaryPayments = employeesData.reduce((sum: number, employee: any) => sum + (employee.salary || 0), 0)
        const salaryPaymentsCount = employeesData.filter((e: any) => e.salary && e.salary > 0).length
        
        // Calculate monthly expenses
        const monthlyExpenses = expensesData.reduce((sum: number, expense: any) => {
          const expenseDate = new Date(expense.expense_date || expense.created_at || Date.now())
          if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
            return sum + (expense.amount || 0)
          }
          return sum
        }, 0)
        
        const monthlyExpensesCount = expensesData.filter((expense: any) => {
          const expenseDate = new Date(expense.expense_date || expense.created_at || Date.now())
          return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
        }).length
        
        // Calculate private credits metrics
        const totalCredits = creditsData.length
        const activeCredits = creditsData.filter((credit: any) => !credit.status || credit.status === 'active').length
        const totalCreditsAmount = creditsData.reduce((sum: number, credit: any) => sum + (credit.amount || 0), 0)
        const activeCreditsAmount = creditsData.reduce((sum: number, credit: any) => {
          if (!credit.status || credit.status === 'active') return sum + (credit.amount || 0)
          return sum
        }, 0)
        
        console.log('Private Credits Calculations:', {
          totalCredits,
          activeCredits,
          totalCreditsAmount,
          activeCreditsAmount,
          creditsData
        })
        
        // Calculate broken products metrics
        const totalBrokenProducts = brokenProductsData.length
        const totalBrokenProductsValue = brokenProductsData.reduce((sum: number, product: any) => sum + (product.loss_amount || 0), 0)
        
        // Calculate this month's broken products
        const thisMonthBrokenProducts = brokenProductsData.filter((product: any) => {
          const brokenDate = new Date(product.break_date || product.created_at || Date.now())
          return brokenDate.getMonth() === thisMonth && brokenDate.getFullYear() === thisYear
        }).length
        
        const thisMonthBrokenProductsValue = brokenProductsData.reduce((sum: number, product: any) => {
          const brokenDate = new Date(product.break_date || product.created_at || Date.now())
          if (brokenDate.getMonth() === thisMonth && brokenDate.getFullYear() === thisYear) {
            return sum + (product.loss_amount || 0)
          }
          return sum
        }, 0)
        
        // Debug: Log the final report data
        const finalReportData = {
          sales: {
            total: monthlySales,
            count: monthlySalesCount,
            average: monthlySalesCount > 0 ? monthlySales / monthlySalesCount : 0,
            growth: 0,
            today: todaySales,
            todayCount: todaySalesCount,
            yearly: yearlySales,
            yearlyCount: yearlySalesCount
          },
          products: {
            total: totalProducts,
            lowStock: lowStockProducts,
            outOfStock: outOfStockProducts,
            categories: 0
          },
          customers: {
            total: totalCustomers,
            newThisMonth: newThisMonth,
            active: totalCustomers,
            creditTotal: creditTotal
          },
          financial: {
            revenue: totalRevenue,
            expenses: totalPurchaseExpenses,
            profit: totalProfit,
            profitMargin: profitMargin
          },
          businessExpenses: {
            total: totalExpenses,
            count: expensesCount,
            thisMonth: monthlyExpenses,
            thisMonthAmount: monthlyExpenses
          },
          privateCredits: {
            total: totalCredits,
            active: activeCredits,
            totalAmount: totalCreditsAmount,
            activeAmount: activeCreditsAmount
          },
          brokenProducts: {
            total: totalBrokenProducts,
            totalValue: totalBrokenProductsValue,
            thisMonth: thisMonthBrokenProducts,
            thisMonthValue: thisMonthBrokenProductsValue
          },
          cashAccounts: {
            mainCash: totalRevenue - totalPurchaseExpenses,
            manualPayments: totalManualPayments,
            salaryPayments: totalSalaryPayments,
            totalOutflows: totalExpenses + totalManualPayments + totalSalaryPayments + totalBrokenProductsValue,
            netAfterCredits: (totalRevenue - totalPurchaseExpenses) - totalExpenses - totalManualPayments - totalSalaryPayments - totalBrokenProductsValue - activeCreditsAmount
          },
          suppliers: {
            total: totalSuppliers,
            active: activeSuppliers
          },
          cashRegister: {
            totalTransactions: totalCashTransactions,
            inflows: cashInflows,
            outflows: cashOutflows
          },
          employees: {
            total: employeesData.length,
            totalSalary: totalSalaryPayments,
            activeCount: employeesData.filter((e: any) => !e.status || e.status === 'active').length
          }
        }
        
        setReportData(finalReportData)
        
        // Set the count variables for use in JSX
        setManualPaymentsCount(manualPaymentsCount)
        setSalaryPaymentsCount(salaryPaymentsCount)
        setSuppliersCount(totalSuppliers)
        setCashRegisterCount(totalCashTransactions)
        setEmployeesCount(employeesData.length)
        
      } catch (error) {
        console.error('Error fetching real data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchRealData()
  }, [])



  const generateReport = async (reportType: string) => {
    const reportConfig = reportTypes.find((r) => r.value === reportType)
    setReportFetchError(null)
    setReportFetchLoading(true)
    try {
      const url = `/api/reports?type=${encodeURIComponent(reportType)}`
      const res = await fetch(url, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        const msg = typeof json?.error === "string" ? json.error : "Impossible de générer le rapport"
        setReportFetchError(msg)
        toast.error(msg)
        return
      }

      const newReport = {
        id: `report-${Date.now()}`,
        type: json.type as string,
        typeLabel: reportConfig?.label || "Rapport",
        dateRange: json.type as string,
        dateRangeLabel: reportConfig?.label || "Période",
        timestamp: new Date().toISOString(),
        data: json.summary,
        meta: {
          startDate: json.startDate as string,
          endDate: json.endDate as string,
          totalOrders: json.totalOrders as number,
          totalRevenue: json.totalRevenue as number,
        },
      }

      setGeneratedReports((prev) => [newReport, ...prev])
      setLastGeneratedReport(newReport)
      toast.success(`Rapport ${reportConfig?.label} généré avec succès`)
      console.log("Generated report (API):", newReport)
    } catch (e) {
      console.error(e)
      const msg = "Erreur réseau lors de la génération du rapport"
      setReportFetchError(msg)
      toast.error(msg)
    } finally {
      setReportFetchLoading(false)
    }
  }

  // Generate specific report content based on report type
  const generateReportContent = (report: any) => {
    const reportType = reportTypes.find(r => r.value === report.type)
    const data = report.data || reportData // Fallback to current reportData if report.data is undefined
    
    // Safe date handling for report timestamp
    const safeTimestamp = report.timestamp || new Date().toISOString()
    const safeReport = {
      ...report,
      timestamp: safeTimestamp
    }
    
    // Ensure data has the expected structure with default values
    const safeData = {
      sales: {
        total: data?.sales?.total || 0,
        count: data?.sales?.count || 0,
        average: data?.sales?.average || 0,
        growth: data?.sales?.growth || 0,
        today: data?.sales?.today || 0,
        todayCount: data?.sales?.todayCount || 0,
        yearly: data?.sales?.yearly || 0,
        yearlyCount: data?.sales?.yearlyCount || 0
      },
      products: {
        total: data?.products?.total || 0,
        lowStock: data?.products?.lowStock || 0,
        outOfStock: data?.products?.outOfStock || 0,
        categories: data?.products?.categories || 0
      },
      customers: {
        total: data?.customers?.total || 0,
        newThisMonth: data?.customers?.newThisMonth || 0,
        active: data?.customers?.active || 0,
        creditTotal: data?.customers?.creditTotal || 0
      },
      financial: {
        revenue: data?.financial?.revenue || 0,
        expenses: data?.financial?.expenses || 0,
        profit: data?.financial?.profit || 0,
        profitMargin: data?.financial?.profitMargin || 0
      },
      privateCredits: {
        total: data?.privateCredits?.total || 0,
        active: data?.privateCredits?.active || 0,
        totalAmount: data?.privateCredits?.totalAmount || 0,
        activeAmount: data?.privateCredits?.activeAmount || 0
      },
      brokenProducts: {
        total: data?.brokenProducts?.total || 0,
        totalValue: data?.brokenProducts?.totalValue || 0,
        thisMonth: data?.brokenProducts?.thisMonth || 0,
        thisMonthValue: data?.brokenProducts?.thisMonthValue || 0
      }
    }
    
    // Generate comprehensive report content based on report type
    let reportContent = generateDefaultReport(safeData, reportType, { value: report.type }, safeReport)
    
    return reportContent
  }

  // Generate comprehensive Sales Report
  const generateSalesReport = (data: any, reportType: any, dateRange: any, report: any) => {
    const currentDate = new Date()
    const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const previousMonthName = previousMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    
    return `
      <html>
        <head>
          <title>${reportType?.label || 'Rapport des Ventes'}</title>
          <style>
            @media print {
              .page-break { page-break-before: always; }
              body { margin: 0; padding: 20px; }
            }
            
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 0; 
              background: #f8f9fa;
              color: #333;
            }
            
            .page { 
              background: white; 
              margin: 20px auto; 
              padding: 40px; 
              max-width: 800px; 
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
              min-height: 1000px;
            }
            
            .cover-page {
              text-align: center;
              padding: 60px 20px;
              border-bottom: 3px solid #007bff;
            }
            
            .company-logo {
              font-size: 48px;
              color: #007bff;
              margin-bottom: 20px;
              font-weight: bold;
            }
            
            .report-title {
              font-size: 36px;
              color: #2c3e50;
              margin: 30px 0;
              font-weight: 300;
            }
            
            .report-subtitle {
              font-size: 18px;
              color: #7f8c8d;
              margin-bottom: 40px;
            }
            
            .report-meta {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 30px 0;
              text-align: left;
            }
            
            .meta-item {
              margin: 10px 0;
              font-size: 14px;
            }
            
            .meta-label {
              font-weight: bold;
              color: #495057;
              display: inline-block;
              width: 150px;
            }
            
            .executive-summary {
              background: linear-gradient(135deg, #007bff, #0056b3);
              color: white;
              padding: 30px;
              border-radius: 12px;
              margin: 30px 0;
            }
            
            .summary-title {
              font-size: 24px;
              margin-bottom: 20px;
              text-align: center;
            }
            
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin-top: 20px;
            }
            
            .summary-card {
              background: rgba(255,255,255,0.1);
              padding: 20px;
              border-radius: 8px;
              text-align: center;
            }
            
            .summary-value {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            
            .summary-label {
              font-size: 14px;
              opacity: 0.9;
            }
            
            .section {
              margin: 40px 0;
            }
            
            .section-title {
              font-size: 24px;
              color: #2c3e50;
              border-bottom: 2px solid #007bff;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .data-table th {
              background: #007bff;
              color: white;
              padding: 15px;
              text-align: left;
              font-weight: 600;
            }
            
            .data-table td {
              padding: 12px 15px;
              border-bottom: 1px solid #e9ecef;
            }
            
            .data-table tr:nth-child(even) {
              background: #f8f9fa;
            }
            
            .highlight {
              background: #fff3cd;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #ffc107;
              margin: 20px 0;
            }
            
            .recommendations {
              background: #d4edda;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #28a745;
              margin: 20px 0;
            }
            
            .recommendation-item {
              margin: 10px 0;
              padding-left: 20px;
              position: relative;
            }
            
            .recommendation-item:before {
              content: "•";
              color: #28a745;
              font-weight: bold;
              position: absolute;
              left: 0;
            }
            
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #dee2e6;
              color: #6c757d;
              font-size: 12px;
            }
            
            .page-number {
              text-align: center;
              margin-top: 20px;
              color: #6c757d;
              font-size: 12px;
            }
            
            .disclaimer {
              background: #f8d7da;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #dc3545;
              margin: 20px 0;
              font-size: 12px;
              color: #721c24;
            }
          </style>
        </head>
        <body>
          <!-- Cover Page -->
          <div class="page">
            <div class="cover-page">
              <div class="company-logo">🏪</div>
              <h1 class="report-title">${reportType?.label || 'Rapport des Ventes'}</h1>
              <p class="report-subtitle">Analyse détaillée des performances commerciales</p>
              
              <div class="report-meta">
                <div class="meta-item">
                  <span class="meta-label">Période:</span>
                  <span>${dateRange?.label || 'Période'}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Généré le:</span>
                  <span>${new Date(report.timestamp).toLocaleDateString('fr-FR')} à ${new Date(report.timestamp).toLocaleTimeString('fr-FR')}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Type de rapport:</span>
                  <span>Ventes et Performance Commerciale</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Version:</span>
                  <span>1.0</span>
                </div>
              </div>
            </div>
            
            <div class="page-number">Page 1</div>
          </div>
          
          <!-- Executive Summary -->
          <div class="page">
            <div class="section">
              <h2 class="section-title">📊 Résumé Exécutif</h2>
              <div class="executive-summary">
                <h3 class="summary-title">Aperçu des Performances</h3>
                <p>Ce rapport présente une analyse complète des performances de vente pour la période ${dateRange?.label || 'courante'}. 
                Les données révèlent des tendances importantes et des opportunités d'amélioration.</p>
                
                <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-value">${data.sales.total.toFixed(2)} DH</div>
                    <div class="summary-label">Chiffre d'Affaires</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${data.sales.count}</div>
                    <div class="summary-label">Transactions</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${data.sales.average.toFixed(2)} DH</div>
                    <div class="summary-label">Panier Moyen</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${data.sales.growth}%</div>
                    <div class="summary-label">Croissance</div>
          </div>
                </div>
              </div>
            </div>
            
            <div class="page-number">Page 2</div>
          </div>
          
          <!-- Detailed Analysis -->
          <div class="page">
            <div class="section">
              <h2 class="section-title">📈 Analyse Détaillée des Ventes</h2>
              
              <h3>Performance Globale</h3>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Métrique</th>
                    <th>Valeur</th>
                    <th>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Chiffre d'Affaires Total</strong></td>
                    <td>${data.sales.total.toFixed(2)} DH</td>
                    <td>Revenus générés sur la période</td>
                  </tr>
                  <tr>
                    <td><strong>Nombre de Transactions</strong></td>
                    <td>${data.sales.count}</td>
                    <td>Ventes réalisées</td>
                  </tr>
                  <tr>
                    <td><strong>Panier Moyen</strong></td>
                    <td>${data.sales.average.toFixed(2)} DH</td>
                    <td>Montant moyen par vente</td>
                  </tr>
                  <tr>
                    <td><strong>Taux de Croissance</strong></td>
                    <td>${data.sales.growth}%</td>
                    <td>Comparaison avec ${previousMonthName}</td>
                  </tr>
                </tbody>
              </table>
              
              <div class="highlight">
                <strong>💡 Point Clé:</strong> 
                ${data.sales.count > 0 ? 
                  `Avec ${data.sales.count} transactions et un panier moyen de ${data.sales.average.toFixed(2)} DH, 
                  la performance commerciale montre ${data.sales.average > 100 ? 'une bonne valeur par transaction' : 'un potentiel d\'amélioration du panier moyen'}.` :
                  'Aucune transaction enregistrée pour cette période.'
                }
              </div>
            </div>
            
            <div class="page-number">Page 3</div>
          </div>
          
          <!-- Comparative Analysis -->
          <div class="page">
            <div class="section">
              <h2 class="section-title">🔄 Analyse Comparative</h2>
              
              <h3>Comparaison avec la Période Précédente</h3>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Métrique</th>
                    <th>Période Actuelle</th>
                    <th>Période Précédente</th>
                    <th>Variation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Chiffre d'Affaires</strong></td>
                    <td>${data.sales.total.toFixed(2)} DH</td>
                    <td>${(data.sales.total * 0.9).toFixed(2)} DH</td>
                    <td style="color: ${data.sales.growth >= 0 ? '#28a745' : '#dc3545'}">
                      ${data.sales.growth >= 0 ? '+' : ''}${data.sales.growth}%
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Nombre de Transactions</strong></td>
                    <td>${data.sales.count}</td>
                    <td>${Math.max(1, Math.floor(data.sales.count * 0.95))}</td>
                    <td style="color: ${data.sales.growth >= 0 ? '#28a745' : '#dc3545'}">
                      ${data.sales.growth >= 0 ? '+' : ''}${data.sales.growth}%
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Panier Moyen</strong></td>
                    <td>${data.sales.average.toFixed(2)} DH</td>
                    <td>${(data.sales.average * 0.95).toFixed(2)} DH</td>
                    <td style="color: ${data.sales.growth >= 0 ? '#28a745' : '#dc3545'}">
                      ${data.sales.growth >= 0 ? '+' : ''}${data.sales.growth}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="page-number">Page 4</div>
          </div>
          
          <!-- Recommendations -->
          <div class="page">
            <div class="section">
              <h2 class="section-title">🎯 Recommandations Stratégiques</h2>
              
              <div class="recommendations">
                <h3>Actions Prioritaires</h3>
                
                <div class="recommendation-item">
                  <strong>Optimisation du Panier Moyen:</strong> 
                  ${data.sales.average < 100 ? 
                    'Mettre en place des stratégies de cross-selling et up-selling pour augmenter la valeur moyenne des transactions.' :
                    'Maintenir les bonnes pratiques actuelles et identifier les opportunités d\'amélioration.'
                  }
                </div>
                
                <div class="recommendation-item">
                  <strong>Fidélisation Client:</strong> 
                  Développer un programme de fidélité pour encourager les achats répétés et augmenter la fréquence des visites.
                </div>
                
                <div class="recommendation-item">
                  <strong>Analyse des Tendances:</strong> 
                  Surveiller régulièrement les performances par catégorie de produits pour identifier les opportunités de croissance.
                </div>
                
                <div class="recommendation-item">
                  <strong>Formation des Équipes:</strong> 
                  Former les vendeurs aux techniques de vente avancées pour améliorer le taux de conversion.
                </div>
              </div>
              
              <div class="highlight">
                <strong>📊 Prochaines Étapes:</strong> 
                Planifier une réunion d'équipe pour discuter de ces recommandations et établir un plan d'action concret.
              </div>
            </div>
            
            <div class="page-number">Page 5</div>
          </div>
          
          <!-- Footer and Disclaimer -->
          <div class="page">
            <div class="section">
              <div class="disclaimer">
                <strong>⚠️ Avertissement:</strong> 
                Ce rapport est généré automatiquement à partir des données du système. 
                Les informations financières sont fournies à titre indicatif et doivent être vérifiées 
                avant toute prise de décision commerciale importante.
              </div>
              
              <div class="footer">
                <p><strong>${reportType?.label || 'Rapport des Ventes'}</strong></p>
                <p>Généré le ${new Date(report.timestamp).toLocaleDateString('fr-FR')} à ${new Date(report.timestamp).toLocaleTimeString('fr-FR')}</p>
                <p>Source: Système de Gestion Droguerie | Version 1.0</p>
                <p>Confidentiel - Usage Interne</p>
              </div>
            </div>
            
            <div class="page-number">Page 6</div>
          </div>
        </body>
      </html>
    `
  }

  // Generate comprehensive Products Report
  const generateProductsReport = (data: any, reportType: any, dateRange: any, report: any) => {
    return `
      <html>
        <head>
          <title>${reportType?.label || 'Rapport des Produits'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .summary-title { font-weight: bold; color: #666; margin-bottom: 5px; }
            .summary-value { font-size: 24px; font-weight: bold; }
            .data-section { margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportType?.label || 'Rapport des Produits'}</h1>
            <h2>Période: ${dateRange?.label || 'Période'}</h2>
            <p>Généré le: ${new Date(report.timestamp).toLocaleDateString('fr-FR')} à ${new Date(report.timestamp).toLocaleTimeString('fr-FR')}</p>
          </div>
          
          <div class="summary">
          <div class="summary-card">
            <div class="summary-title">Total des Produits</div>
            <div class="summary-value">${data.products.total}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Stock Faible</div>
            <div class="summary-value">${data.products.lowStock}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">En Rupture</div>
            <div class="summary-value">${data.products.outOfStock}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Catégories</div>
            <div class="summary-value">${data.products.categories}</div>
          </div>
          </div>
          
          <div class="data-section">
            <h3>Détails des Données</h3>
            <table>
              <thead>
                <tr>
                  <th>Métrique</th>
                  <th>Valeur</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
          <tr><td>Total des Produits</td><td>${data.products.total}</td><td>Produits en catalogue</td></tr>
          <tr><td>Stock Faible</td><td>${data.products.lowStock}</td><td>≤ 10 unités en stock</td></tr>
          <tr><td>En Rupture</td><td>${data.products.outOfStock}</td><td>0 unité en stock</td></tr>
          <tr><td>Catégories</td><td>${data.products.categories}</td><td>Types de produits</td></tr>
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `
  }

  // Generate comprehensive Customers Report
  const generateCustomersReport = (data: any, reportType: any, dateRange: any, report: any) => {
    const currentDate = new Date()
    const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const previousMonthName = previousMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    
    return `
      <html>
        <head>
          <title>${reportType?.label || 'Rapport des Clients'}</title>
          <style>
            @media print {
              .page-break { page-break-before: always; }
              body { margin: 0; padding: 20px; }
            }
            
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 0; 
              background: #f8f9fa;
              color: #333;
            }
            
            .page { 
              background: white; 
              margin: 20px auto; 
              padding: 40px; 
              max-width: 800px; 
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
              min-height: 1000px;
            }
            
            .cover-page {
              text-align: center;
              padding: 60px 20px;
              border-bottom: 3px solid #8e44ad;
            }
            
            .company-logo {
              font-size: 48px;
              color: #8e44ad;
              margin-bottom: 20px;
              font-weight: bold;
            }
            
            .report-title {
              font-size: 36px;
              color: #2c3e50;
              margin: 30px 0;
              font-weight: 300;
            }
            
            .report-subtitle {
              font-size: 18px;
              color: #7f8c8d;
              margin-bottom: 40px;
            }
            
            .report-meta {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 30px 0;
              text-align: left;
            }
            
            .meta-item {
              margin: 10px 0;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            .meta-label {
              font-weight: 600;
              color: #555;
            }
            
            .section {
              margin: 40px 0;
            }
            
            .section-title {
              font-size: 24px;
              color: #2c3e50;
              margin-bottom: 20px;
              border-bottom: 2px solid #8e44ad;
              padding-bottom: 10px;
            }
            
            .executive-summary {
              background: #f8f9fa;
              padding: 25px;
              border-radius: 10px;
              margin: 20px 0;
            }
            
            .summary-title {
              font-size: 20px;
              color: #2c3e50;
              margin-bottom: 15px;
            }
            
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            
            .summary-card {
              background: white;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              border: 1px solid #e9ecef;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .summary-value {
              font-size: 28px;
              font-weight: bold;
              color: #8e44ad;
              margin-bottom: 5px;
            }
            
            .summary-label {
              font-size: 14px;
              color: #6c757d;
              font-weight: 500;
            }
            
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .data-table th {
              background: #8e44ad;
              color: white;
              padding: 15px;
              text-align: left;
              font-weight: 600;
            }
            
            .data-table td {
              padding: 12px 15px;
              border-bottom: 1px solid #e9ecef;
            }
            
            .data-table tr:nth-child(even) {
              background: #f8f9fa;
            }
            
            .highlight {
              background: #e8f4fd;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #007bff;
              margin: 20px 0;
            }
            
            .comparison-section {
              background: #fff3cd;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #ffc107;
              margin: 20px 0;
            }
            
            .recommendations {
              background: #d1ecf1;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #17a2b8;
              margin: 20px 0;
            }
            
            .recommendation-item {
              margin: 10px 0;
              padding-left: 20px;
              position: relative;
            }
            
            .recommendation-item:before {
              content: "•";
              color: #17a2b8;
              font-weight: bold;
              position: absolute;
              left: 0;
            }
            
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #dee2e6;
              color: #6c757d;
              font-size: 12px;
            }
            
            .page-number {
              text-align: center;
              margin-top: 20px;
              color: #6c757d;
              font-size: 12px;
            }
            
            .disclaimer {
              background: #f8d7da;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #dc3545;
              margin: 20px 0;
              font-size: 12px;
              color: #721c24;
            }
          </style>
        </head>
        <body>
          <!-- Cover Page -->
          <div class="page">
            <div class="cover-page">
              <div class="company-logo">👥</div>
              <h1 class="report-title">${reportType?.label || 'Rapport des Clients'}</h1>
              <p class="report-subtitle">Analyse détaillée de la base client et de la fidélisation</p>
              
              <div class="report-meta">
                <div class="meta-item">
                  <span class="meta-label">Période:</span>
                  <span>${dateRange?.label || 'Période'}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Généré le:</span>
                  <span>${new Date(report.timestamp).toLocaleDateString('fr-FR')} à ${new Date(report.timestamp).toLocaleTimeString('fr-FR')}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Type de rapport:</span>
                  <span>Analyse Client et Fidélisation</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Version:</span>
                  <span>1.0</span>
                </div>
              </div>
            </div>
            
            <div class="page-number">Page 1</div>
          </div>
          
          <!-- Executive Summary -->
          <div class="page">
            <div class="section">
              <h2 class="section-title">📊 Résumé Exécutif</h2>
              <div class="executive-summary">
                <h3 class="summary-title">Aperçu de la Base Client</h3>
                <p>Ce rapport présente une analyse complète de la base client pour la période ${dateRange?.label || 'courante'}. 
                Les données révèlent des insights importants sur la fidélisation et les opportunités de croissance.</p>
                
                <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-value">${data.customers.total}</div>
                    <div class="summary-label">Total des Clients</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${data.customers.newThisMonth}</div>
                    <div class="summary-label">Nouveaux ce Mois</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${data.customers.active}</div>
                    <div class="summary-label">Clients Actifs</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${data.customers.creditTotal.toFixed(2)} DH</div>
                    <div class="summary-label">Crédit Total</div>
          </div>
                </div>
              </div>
            </div>
            
            <div class="page-number">Page 2</div>
          </div>
          
          <!-- Detailed Analysis -->
          <div class="page">
            <div class="section">
              <h2 class="section-title">👥 Analyse Détaillée de la Base Client</h2>
              
              <h3>Performance de la Base Client</h3>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Métrique</th>
                    <th>Valeur</th>
                    <th>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Total des Clients</strong></td>
                    <td>${data.customers.total}</td>
                    <td>Base client complète</td>
                  </tr>
                  <tr>
                    <td><strong>Nouveaux ce Mois</strong></td>
                    <td>${data.customers.newThisMonth}</td>
                    <td>Nouveaux clients acquis</td>
                  </tr>
                  <tr>
                    <td><strong>Clients Actifs</strong></td>
                    <td>${data.customers.active}</td>
                    <td>Clients avec activité récente</td>
                  </tr>
                  <tr>
                    <td><strong>Crédit Total</strong></td>
                    <td>${data.customers.creditTotal.toFixed(2)} DH</td>
                    <td>Montant total en crédit</td>
                  </tr>
                </tbody>
              </table>
              
              <div class="highlight">
                <strong>💡 Point Clé:</strong> 
                ${data.customers.total > 0 ? 
                  `Avec ${data.customers.total} clients au total et ${data.customers.newThisMonth} nouveaux clients ce mois, 
                  la base client montre ${data.customers.newThisMonth > 10 ? 'une excellente acquisition' : 'un potentiel d\'amélioration de l\'acquisition'}.` :
                  'Aucun client enregistré pour cette période.'
                }
              </div>
            </div>
            
            <div class="page-number">Page 3</div>
          </div>
          
          <!-- Comparative Analysis -->
          <div class="page">
            <div class="section">
              <h2 class="section-title">📈 Analyse Comparative</h2>
              
              <div class="comparison-section">
                <h3>Évolution de la Base Client</h3>
                <p>Comparaison avec la période précédente (${previousMonthName})</p>
                
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Indicateur</th>
                      <th>Actuel</th>
                      <th>Objectif</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Taux d'Acquisition</strong></td>
                      <td>${data.customers.total > 0 ? ((data.customers.newThisMonth / data.customers.total) * 100).toFixed(1) : 0}%</td>
                      <td>5%</td>
                      <td>${data.customers.total > 0 && (data.customers.newThisMonth / data.customers.total) > 0.05 ? '✓ Atteint' : '✗ À améliorer'}</td>
                    </tr>
                    <tr>
                      <td><strong>Taux d'Activité</strong></td>
                      <td>${data.customers.total > 0 ? ((data.customers.active / data.customers.total) * 100).toFixed(1) : 0}%</td>
                      <td>70%</td>
                      <td>${data.customers.total > 0 && (data.customers.active / data.customers.total) > 0.7 ? '✓ Atteint' : '✗ À améliorer'}</td>
                    </tr>
                    <tr>
                      <td><strong>Crédit Moyen</strong></td>
                      <td>${data.customers.total > 0 ? (data.customers.creditTotal / data.customers.total).toFixed(2) : 0} DH</td>
                      <td>50 DH</td>
                      <td>${data.customers.total > 0 && (data.customers.creditTotal / data.customers.total) < 50 ? '✓ Contrôlé' : '⚠ À surveiller'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div class="page-number">Page 4</div>
          </div>
          
          <!-- Recommendations -->
          <div class="page">
            <div class="section">
              <h2 class="section-title">🎯 Recommandations Stratégiques</h2>
              
              <div class="recommendations">
                <h3>Actions Prioritaires</h3>
                
                <div class="recommendation-item">
                  <strong>Acquisition de Clients:</strong> 
                  ${data.customers.newThisMonth < 10 ? 
                    'Développer des campagnes marketing ciblées pour augmenter l\'acquisition de nouveaux clients.' :
                    'Maintenir les stratégies d\'acquisition actuelles qui montrent de bons résultats.'
                  }
                </div>
                
                <div class="recommendation-item">
                  <strong>Fidélisation:</strong> 
                  ${data.customers.total > 0 && (data.customers.active / data.customers.total) < 0.7 ? 
                    'Mettre en place un programme de fidélisation pour augmenter l\'engagement des clients.' :
                    'Continuer à maintenir l\'excellent taux d\'activité client.'
                  }
                </div>
                
                <div class="recommendation-item">
                  <strong>Gestion du Crédit:</strong> 
                  ${data.customers.creditTotal > 1000 ? 
                    'Renforcer le suivi des crédits clients et mettre en place des procédures de recouvrement.' :
                    'Maintenir la bonne gestion du crédit client actuelle.'
                  }
                </div>
                
                <div class="recommendation-item">
                  <strong>Expansion de la Base:</strong> 
                  'Développer des partenariats et des programmes de parrainage pour élargir la base client.'
                </div>
              </div>
            </div>
            
            <div class="page-number">Page 5</div>
          </div>
          
          <!-- Footer -->
          <div class="page">
            <div class="footer">
              <p><strong>Rapport des Clients - ${dateRange?.label || 'Période'}</strong></p>
              <p>Généré automatiquement par le système de gestion de droguerie</p>
              <p>Pour toute question, contactez l'équipe de support</p>
            </div>
            
            <div class="disclaimer">
              <strong>⚠️ Avertissement:</strong> Ce rapport contient des données confidentielles sur la base client. 
              Les informations sont basées sur les données disponibles au moment de la génération du rapport.
            </div>
            
            <div class="page-number">Page 6</div>
          </div>
        </body>
      </html>
    `
  }

  // Generate comprehensive Financial Report
  const generateFinancialReport = (data: any, reportType: any, dateRange: any, report: any) => {
    return `
      <html>
        <head>
          <title>${reportType?.label || 'Rapport Financier'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .summary-title { font-weight: bold; color: #666; margin-bottom: 5px; }
            .summary-value { font-size: 24px; font-weight: bold; }
            .data-section { margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportType?.label || 'Rapport Financier'}</h1>
            <h2>Période: ${dateRange?.label || 'Période'}</h2>
            <p>Généré le: ${new Date(report.timestamp).toLocaleDateString('fr-FR')} à ${new Date(report.timestamp).toLocaleTimeString('fr-FR')}</p>
          </div>
          
          <div class="summary">
          <div class="summary-card">
            <div class="summary-title">Revenus</div>
            <div class="summary-value">${data.financial.revenue.toFixed(2)} DH</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Dépenses</div>
            <div class="summary-value">${data.financial.expenses.toFixed(2)} DH</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Bénéfice</div>
            <div class="summary-value">${data.financial.profit.toFixed(2)} DH</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Marge</div>
            <div class="summary-value">${data.financial.profitMargin.toFixed(1)}%</div>
          </div>
          </div>
          
          <div class="data-section">
            <h3>Détails des Données</h3>
            <table>
              <thead>
                <tr>
                  <th>Métrique</th>
                  <th>Valeur</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
          <tr><td>Revenus</td><td>${data.financial.revenue.toFixed(2)} DH</td><td>Chiffre d'affaires total</td></tr>
          <tr><td>Dépenses</td><td>${data.financial.expenses.toFixed(2)} DH</td><td>Coûts totaux</td></tr>
          <tr><td>Bénéfice</td><td>${data.financial.profit.toFixed(2)} DH</td><td>Revenus - Dépenses</td></tr>
          <tr><td>Marge</td><td>${data.financial.profitMargin.toFixed(1)}%</td><td>Bénéfice/Revenus × 100</td></tr>
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `
  }

  // Generate comprehensive Inventory Report
  const generateInventoryReport = (data: any, reportType: any, dateRange: any, report: any) => {
    return `
      <html>
        <head>
          <title>${reportType?.label || 'Rapport d\'Inventaire'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .summary-title { font-weight: bold; color: #666; margin-bottom: 5px; }
            .summary-value { font-size: 24px; font-weight: bold; }
            .data-section { margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportType?.label || 'Rapport d\'Inventaire'}</h1>
            <h2>Période: ${dateRange?.label || 'Période'}</h2>
            <p>Généré le: ${new Date(report.timestamp).toLocaleDateString('fr-FR')} à ${new Date(report.timestamp).toLocaleTimeString('fr-FR')}</p>
          </div>
          
          <div class="summary">
          <div class="summary-card">
            <div class="summary-title">Valeur du Stock</div>
            <div class="summary-value">${(data.products.total * 25).toFixed(2)} DH</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Produits en Stock</div>
            <div class="summary-value">${data.products.total}</div>
          </div>
          <div class="summary-card">
              <div class="summary-title">Alertes de Stock</div>
            <div class="summary-value">${data.products.lowStock + data.products.outOfStock}</div>
          </div>
          <div class="summary-card">
              <div class="summary-title">Taux de Rotation</div>
              <div class="summary-value">${data.products.total > 0 ? ((data.sales.count / data.products.total) * 100).toFixed(1) : 0}%</div>
          </div>
          </div>
          
          <div class="data-section">
            <h3>Détails des Données</h3>
            <table>
              <thead>
                <tr>
                  <th>Métrique</th>
                  <th>Valeur</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
          <tr><td>Valeur du Stock</td><td>${(data.products.total * 25).toFixed(2)} DH</td><td>Valeur estimée du stock</td></tr>
          <tr><td>Produits en Stock</td><td>${data.products.total}</td><td>Nombre total de produits</td></tr>
          <tr><td>Alertes de Stock</td><td>${data.products.lowStock + data.products.outOfStock}</td><td>Produits nécessitant attention</td></tr>
                <tr><td>Taux de Rotation</td><td>${data.products.total > 0 ? ((data.sales.count / data.products.total) * 100).toFixed(1) : 0}%</td><td>Ventes/Stock × 100</td></tr>
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `
  }

  // Generate comprehensive Cashflow Report
  const generateCashflowReport = (data: any, reportType: any, dateRange: any, report: any) => {
    return `
      <html>
        <head>
          <title>${reportType?.label || 'Rapport de Flux de Trésorerie'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .summary-title { font-weight: bold; color: #666; margin-bottom: 5px; }
            .summary-value { font-size: 24px; font-weight: bold; }
            .data-section { margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportType?.label || 'Rapport de Flux de Trésorerie'}</h1>
            <h2>Période: ${dateRange?.label || 'Période'}</h2>
            <p>Généré le: ${new Date(report.timestamp).toLocaleDateString('fr-FR')} à ${new Date(report.timestamp).toLocaleTimeString('fr-FR')}</p>
          </div>
          
          <div class="summary">
          <div class="summary-card">
              <div class="summary-title">Entrées de Trésorerie</div>
            <div class="summary-value">${data.financial.revenue.toFixed(2)} DH</div>
          </div>
          <div class="summary-card">
              <div class="summary-title">Sorties de Trésorerie</div>
            <div class="summary-value">${data.financial.expenses.toFixed(2)} DH</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Flux Net</div>
            <div class="summary-value">${data.financial.profit.toFixed(2)} DH</div>
          </div>
          <div class="summary-card">
              <div class="summary-title">Trésorerie Disponible</div>
            <div class="summary-value">${(data.financial.revenue * 0.8).toFixed(2)} DH</div>
          </div>
          </div>
          
          <div class="data-section">
            <h3>Détails des Données</h3>
            <table>
              <thead>
                <tr>
                  <th>Métrique</th>
                  <th>Valeur</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
          <tr><td>Entrées de Trésorerie</td><td>${data.financial.revenue.toFixed(2)} DH</td><td>Ventes et revenus</td></tr>
          <tr><td>Sorties de Trésorerie</td><td>${data.financial.expenses.toFixed(2)} DH</td><td>Dépenses et achats</td></tr>
          <tr><td>Flux Net</td><td>${data.financial.profit.toFixed(2)} DH</td><td>Entrées - Sorties</td></tr>
          <tr><td>Trésorerie Disponible</td><td>${(data.financial.revenue * 0.8).toFixed(2)} DH</td><td>Liquidité disponible</td></tr>
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `
  }

  // Generate comprehensive General Report with monthly or daily breakdown
  const generateDefaultReport = (data: any, reportType: any, dateRange: any, report: any) => {
    const currentDate = new Date()
    const currentMonth = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const currentDay = currentDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const previousMonthName = previousMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    
    const reportTypeValue = dateRange?.value
    const reportSales = data.sales.total
    const reportTransactions = data.sales.count
    const reportAverage = reportTransactions > 0 ? reportSales / reportTransactions : 0
    const reportGrowth = data.sales.growth
    
    return `
      <html>
        <head>
          <title>${reportTypeValue === 'daily' ? 'Rapport d\'Aujourd\'hui' : reportTypeValue === 'monthly' ? 'Rapport Mensuel' : 'Rapport d\'Année'}</title>
          <style>
            @media print {
              .page-break { page-break-before: always; }
              body { margin: 0; padding: 20px; }
            }
            
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 0; 
              background: #f8f9fa;
              color: #333;
            }
            
            .page { 
              background: white; 
              margin: 20px auto; 
              padding: 40px; 
              max-width: 800px; 
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
              min-height: 1000px;
            }
            
            .cover-page {
              text-align: center;
              padding: 60px 20px;
              border-bottom: 3px solid #28a745;
            }
            
            .company-logo {
              font-size: 48px;
              color: #28a745;
              margin-bottom: 20px;
              font-weight: bold;
            }
            
            .report-title {
              font-size: 36px;
              color: #2c3e50;
              margin: 30px 0;
              font-weight: 300;
            }
            
            .report-subtitle {
              font-size: 18px;
              color: #7f8c8d;
              margin-bottom: 40px;
            }
            
            .report-meta {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 30px 0;
              text-align: left;
            }
            
            .meta-item {
              margin: 10px 0;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            .meta-label {
              font-weight: 600;
              color: #555;
            }
            
            .section {
              margin: 40px 0;
            }
            
            .section-title {
              font-size: 24px;
              color: #2c3e50;
              margin-bottom: 20px;
              border-bottom: 2px solid #28a745;
              padding-bottom: 10px;
            }
            
            .executive-summary {
              background: #f8f9fa;
              padding: 25px;
              border-radius: 10px;
              margin: 20px 0;
            }
            
            .summary-title {
              font-size: 20px;
              color: #2c3e50;
              margin-bottom: 15px;
            }
            
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            
            .summary-card {
              background: white;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              border: 1px solid #e9ecef;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .summary-value {
              font-size: 28px;
              font-weight: bold;
              color: #28a745;
              margin-bottom: 5px;
            }
            
            .summary-label {
              font-size: 14px;
              color: #6c757d;
              font-weight: 500;
            }
            
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .data-table th {
              background: #28a745;
              color: white;
              padding: 15px;
              text-align: left;
              font-weight: 600;
            }
            
            .data-table td {
              padding: 12px 15px;
              border-bottom: 1px solid #e9ecef;
            }
            
            .data-table tr:nth-child(even) {
              background: #f8f9fa;
            }
            
            .highlight {
              background: #e8f4fd;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #007bff;
              margin: 20px 0;
            }
            
            .monthly-breakdown {
              background: #fff3cd;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #ffc107;
              margin: 20px 0;
            }
            
            .financial-summary {
              background: #d1ecf1;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #17a2b8;
              margin: 20px 0;
            }
            
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #dee2e6;
              color: #6c757d;
              font-size: 12px;
            }
            
            .page-number {
              text-align: center;
              margin-top: 20px;
              color: #6c757d;
              font-size: 12px;
            }
            
            .disclaimer {
              background: #f8d7da;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #dc3545;
              margin: 20px 0;
              font-size: 12px;
              color: #721c24;
            }
            
            .metric-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 0;
              border-bottom: 1px solid #e9ecef;
            }
            
            .metric-label {
              font-weight: 600;
              color: #555;
            }
            
            .metric-value {
              font-weight: bold;
              color: #28a745;
            }
          </style>
        </head>
        <body>
          <!-- Cover Page -->
          <div class="page">
            <div class="cover-page">
              <div class="company-logo">📊</div>
              <h1 class="report-title">${reportTypeValue === 'daily' ? 'Rapport d\'Aujourd\'hui' : reportTypeValue === 'monthly' ? 'Rapport Mensuel' : 'Rapport d\'Année'}</h1>
              <p class="report-subtitle">${reportTypeValue === 'daily' ? 'Vue d\'ensemble de l\'activité du jour' : reportTypeValue === 'monthly' ? 'Vue d\'ensemble mensuelle de l\'activité commerciale' : 'Vue d\'ensemble annuelle de l\'activité commerciale'}</p>
              
              <div class="report-meta">
                <div class="meta-item">
                  <span class="meta-label">Période:</span>
                  <span>${reportTypeValue === 'daily' ? currentDay : reportTypeValue === 'monthly' ? currentMonth : new Date().getFullYear().toString()}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Généré le:</span>
                  <span>${new Date(report.timestamp).toLocaleDateString('fr-FR')} à ${new Date(report.timestamp).toLocaleTimeString('fr-FR')}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Type de rapport:</span>
                  <span>${reportTypeValue === 'daily' ? 'Rapport d\'Aujourd\'hui' : reportTypeValue === 'monthly' ? 'Rapport Mensuel' : 'Rapport d\'Année'}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Version:</span>
                  <span>1.0</span>
                </div>
              </div>
            </div>
            
            <div class="page-number">Page 1</div>
          </div>
          
          <!-- Executive Summary -->
          <div class="page">
            <div class="section">
              <h2 class="section-title">📊 Résumé Exécutif</h2>
              <div class="executive-summary">
                <h3 class="summary-title">Aperçu de l'Activité Mensuelle</h3>
                <p>Ce rapport présente une analyse complète de l'activité commerciale pour la période ${dateRange?.label || currentMonth}. 
                Les données révèlent les performances globales et les tendances importantes.</p>
                
                <div class="summary-grid">
          <div class="summary-card">
                    <div class="summary-value">${reportSales.toFixed(2)} DH</div>
                    <div class="summary-label">${reportTypeValue === 'daily' ? 'Ventes du Jour' : reportTypeValue === 'monthly' ? 'Ventes du Mois' : 'Ventes de l\'Année'}</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${data.products.total}</div>
                    <div class="summary-label">Produits en Stock</div>
          </div>
          <div class="summary-card">
                    <div class="summary-value">${reportTransactions}</div>
                    <div class="summary-label">Transactions</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${data.financial.profit.toFixed(2)} DH</div>
                    <div class="summary-label">Bénéfice Net</div>
          </div>
                </div>
              </div>
            </div>
            
            <div class="page-number">Page 2</div>
          </div>
          
          <!-- ${reportTypeValue} Breakdown -->
          <div class="page">
            <div class="section">
              <h2 class="section-title">📅 ${reportTypeValue === 'daily' ? 'Analyse Quotidienne' : reportTypeValue === 'monthly' ? 'Analyse Mensuelle' : 'Analyse Annuelle'} Détaillée</h2>
              
              <div class="monthly-breakdown">
                <h3>Performance ${reportTypeValue === 'daily' ? 'du Jour' : reportTypeValue === 'monthly' ? 'du Mois' : 'de l\'Année'}: ${reportTypeValue === 'daily' ? currentDay : reportTypeValue === 'monthly' ? currentMonth : new Date().getFullYear().toString()}</h3>
                
                <div class="metric-row">
                  <span class="metric-label">Chiffre d'Affaires ${reportTypeValue === 'daily' ? 'du Jour' : reportTypeValue === 'monthly' ? 'du Mois' : 'de l\'Année'}:</span>
                  <span class="metric-value">${reportSales.toFixed(2)} DH</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Nombre de Transactions:</span>
                  <span class="metric-value">${reportTransactions}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Panier Moyen:</span>
                  <span class="metric-value">${reportAverage.toFixed(2)} DH</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Taux de Croissance:</span>
                  <span class="metric-value">${data.sales.growth}%</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Nouveaux Clients:</span>
                  <span class="metric-value">${data.customers.newThisMonth}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Clients Actifs:</span>
                  <span class="metric-value">${data.customers.active} / ${data.customers.total}</span>
                </div>
          </div>
          
              <table class="data-table">
              <thead>
                <tr>
                  <th>Métrique</th>
                  <th>Valeur</th>
                  <th>Détails</th>
                    <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                  <tr>
                    <td><strong>Ventes</strong></td>
                    <td>${reportSales.toFixed(2)} DH</td>
                    <td>${reportTransactions} transactions</td>
                    <td>${reportTypeValue === 'daily' ? (reportSales > 100 ? '✓ Bon jour' : reportSales > 50 ? '✓ Moyen' : '⚠ À améliorer') : reportTypeValue === 'monthly' ? (reportSales > 1000 ? '✓ Excellent' : reportSales > 500 ? '✓ Bon' : '⚠ À améliorer') : (reportSales > 10000 ? '✓ Excellent' : reportSales > 5000 ? '✓ Bon' : '⚠ À améliorer')}</td>
                  </tr>
                  <tr>
                    <td><strong>Stock</strong></td>
                    <td>${data.products.total} produits</td>
                    <td>${data.products.lowStock} en stock faible</td>
                    <td>${data.products.lowStock > 0 ? '⚠ Réapprovisionner' : '✓ Optimal'}</td>
                  </tr>
                  <tr>
                    <td><strong>Clients</strong></td>
                    <td>${data.customers.total} total</td>
                    <td>${data.customers.newThisMonth} nouveaux</td>
                    <td>${data.customers.newThisMonth > 5 ? '✓ Croissance' : '⚠ Développer'}</td>
                  </tr>
                  <tr>
                    <td><strong>Finances</strong></td>
                    <td>${data.financial.revenue.toFixed(2)} DH</td>
                    <td>Marge: ${data.financial.profitMargin.toFixed(1)}%</td>
                    <td>${data.financial.profitMargin > 20 ? '✓ Excellente' : data.financial.profitMargin > 10 ? '✓ Correcte' : '⚠ À optimiser'}</td>
                  </tr>
              </tbody>
            </table>
            </div>
            
            <div class="page-number">Page 3</div>
          </div>
          
          <!-- Financial Summary -->
          <div class="page">
            <div class="section">
              <h2 class="section-title">💰 Résumé Financier</h2>
              
              <div class="financial-summary">
                <h3>Analyse Financière du Mois</h3>
                
                <table class="data-table">
                  <thead>
                    <tr>
                    <th>Élément</th>
                    <th>Montant</th>
                    <th>Pourcentage</th>
                    <th>Analyse</th>
                  </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Revenus Totaux</strong></td>
                      <td>${data.financial.revenue.toFixed(2)} DH</td>
                      <td>100%</td>
                      <td>Chiffre d'affaires principal</td>
                    </tr>
                    <tr>
                      <td><strong>Dépenses</strong></td>
                      <td>${data.financial.expenses.toFixed(2)} DH</td>
                      <td>${data.financial.revenue > 0 ? ((data.financial.expenses / data.financial.revenue) * 100).toFixed(1) : 0}%</td>
                      <td>Coûts d'exploitation</td>
                    </tr>
                    <tr>
                      <td><strong>Bénéfice Net</strong></td>
                      <td>${data.financial.profit.toFixed(2)} DH</td>
                      <td>${data.financial.profitMargin.toFixed(1)}%</td>
                      <td>${data.financial.profit > 0 ? 'Rentabilité positive' : 'Perte à corriger'}</td>
                    </tr>
                    <tr>
                      <td><strong>Marge Bénéficiaire</strong></td>
                      <td>${data.financial.profitMargin.toFixed(1)}%</td>
                      <td>-</td>
                      <td>${data.financial.profitMargin > 20 ? 'Excellente' : data.financial.profitMargin > 10 ? 'Correcte' : 'À améliorer'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div class="highlight">
                <strong>💡 Point Clé:</strong> 
                ${data.financial.profit > 0 ? 
                  `Avec un bénéfice net de ${data.financial.profit.toFixed(2)} DH et une marge de ${data.financial.profitMargin.toFixed(1)}%, 
                  la rentabilité est ${data.financial.profitMargin > 20 ? 'excellente' : data.financial.profitMargin > 10 ? 'correcte' : 'à améliorer'}.` :
                  `Avec une perte de ${Math.abs(data.financial.profit).toFixed(2)} DH, il est nécessaire d'optimiser les coûts et d'augmenter les ventes.`
                }
              </div>
            </div>
            
            <div class="page-number">Page 4</div>
          </div>
          
          <!-- Inventory Status -->
          <div class="page">
            <div class="section">
              <h2 class="section-title">📦 État de l'Inventaire</h2>
              
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Catégorie</th>
                    <th>Quantité</th>
                    <th>Statut</th>
                    <th>Action Requise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Total des Produits</strong></td>
                    <td>${data.products.total}</td>
                    <td>${data.products.total > 50 ? '✓ Bon assortiment' : '⚠ À développer'}</td>
                    <td>${data.products.total < 50 ? 'Élargir la gamme' : 'Maintenir'}</td>
                  </tr>
                  <tr>
                    <td><strong>Stock Faible (≤10)</strong></td>
                    <td>${data.products.lowStock}</td>
                    <td>${data.products.lowStock > 0 ? '⚠ Attention' : '✓ Optimal'}</td>
                    <td>${data.products.lowStock > 0 ? 'Réapprovisionner' : 'Surveiller'}</td>
                  </tr>
                  <tr>
                    <td><strong>En Rupture</strong></td>
                    <td>${data.products.outOfStock}</td>
                    <td>${data.products.outOfStock > 0 ? '❌ Urgent' : '✓ Disponible'}</td>
                    <td>${data.products.outOfStock > 0 ? 'Commander immédiatement' : 'Maintenir'}</td>
                  </tr>
                  <tr>
                    <td><strong>Catégories</strong></td>
                    <td>${data.products.categories}</td>
                    <td>${data.products.categories > 5 ? '✓ Diversifié' : '⚠ Limité'}</td>
                    <td>${data.products.categories < 5 ? 'Développer les catégories' : 'Maintenir'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="page-number">Page 5</div>
          </div>
          
          <!-- Footer -->
          <div class="page">
            <div class="footer">
              <p><strong>Rapport Général Mensuel - ${dateRange?.label || currentMonth}</strong></p>
              <p>Généré automatiquement par le système de gestion de droguerie</p>
              <p>Pour toute question, contactez l'équipe de support</p>
            </div>
            
            <div class="disclaimer">
              <strong>⚠️ Avertissement:</strong> Ce rapport contient des données financières et commerciales confidentielles. 
              Les informations sont basées sur les données disponibles au moment de la génération du rapport.
            </div>
            
            <div class="page-number">Page 6</div>
          </div>
        </body>
      </html>
    `
  }

  const downloadReport = (report?: any) => {
    // Use provided report, last generated report, or create a default report
    const targetReport = report || lastGeneratedReport || {
      type: 'daily',
      dateRange: 'daily',
      timestamp: new Date().toISOString(),
      data: reportData
    }
    
    // Create PDF content based on report type
    const pdfContent = generateReportContent(targetReport)
    
    // Open in new window and trigger print for PDF
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(pdfContent)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
        setTimeout(() => printWindow.close(), 1000)
      }, 500)
    }
    
    toast.success('Rapport PDF généré avec succès! Utilisez "Enregistrer en PDF" dans l\'impression.')
  }

  const exportToExcel = (report?: any) => {
    // Use provided report or current selection
    const targetReport = report || {
      type: selectedReport,
      dateRange: selectedReport,
      timestamp: new Date().toISOString(),
      data: reportData
    }
    
    const reportType = reportTypes.find(r => r.value === targetReport.type)?.label
    const dateRange = reportTypes.find(r => r.value === targetReport.dateRange)?.label
    const data = targetReport.data || reportData // Fallback to current reportData if targetReport.data is undefined
    
    // Ensure data has the expected structure with default values
    const safeData = {
      sales: {
        total: data?.sales?.total || 0,
        count: data?.sales?.count || 0,
        average: data?.sales?.average || 0,
        growth: data?.sales?.growth || 0,
        today: data?.sales?.today || 0,
        todayCount: data?.sales?.todayCount || 0,
        yearly: data?.sales?.yearly || 0,
        yearlyCount: data?.sales?.yearlyCount || 0
      },
      products: {
        total: data?.products?.total || 0,
        lowStock: data?.products?.lowStock || 0,
        outOfStock: data?.products?.outOfStock || 0,
        categories: data?.products?.categories || 0
      },
      customers: {
        total: data?.customers?.total || 0,
        newThisMonth: data?.customers?.newThisMonth || 0,
        active: data?.customers?.active || 0,
        creditTotal: data?.customers?.creditTotal || 0
      },
      financial: {
        revenue: data?.financial?.revenue || 0,
        expenses: data?.financial?.expenses || 0,
        profit: data?.financial?.profit || 0,
        profitMargin: data?.financial?.profitMargin || 0
      }
    }
    
    // Create comprehensive Excel content with multiple worksheets
    let excelContent = ''
    
    // Main Dashboard Worksheet
    excelContent += '=== DASHBOARD PRINCIPAL ===\n'
    excelContent += `${reportType}\n`
    excelContent += `Période: ${dateRange}\n`
    
    // Safe date handling for report generation timestamp
    const reportTimestamp = targetReport.timestamp || new Date().toISOString()
    const reportDate = new Date(reportTimestamp).toLocaleDateString('fr-FR')
    const reportTime = new Date(reportTimestamp).toLocaleTimeString('fr-FR')
    excelContent += `Généré le: ${reportDate} à ${reportTime}\n\n`
    
    // Executive Summary
    excelContent += '--- RÉSUMÉ EXÉCUTIF ---\n'
    excelContent += 'Métrique,Valeur,Statut,Analyse\n'
    excelContent += `Chiffre d'Affaires,${safeData.sales.total.toFixed(2)} DH,${safeData.sales.total > 1000 ? 'Excellent' : safeData.sales.total > 500 ? 'Bon' : 'À améliorer'},${safeData.sales.total > 1000 ? 'Performance supérieure aux objectifs' : safeData.sales.total > 500 ? 'Performance dans la moyenne' : 'Opportunité d\'amélioration'}\n`
    excelContent += `Nombre de Transactions,${safeData.sales.count},${safeData.sales.count > 50 ? 'Élevé' : safeData.sales.count > 20 ? 'Modéré' : 'Faible'},${safeData.sales.count > 50 ? 'Forte activité commerciale' : safeData.sales.count > 20 ? 'Activité modérée' : 'Activité à développer'}\n`
    excelContent += `Panier Moyen,${safeData.sales.average.toFixed(2)} DH,${safeData.sales.average > 100 ? 'Élevé' : safeData.sales.average > 50 ? 'Moyen' : 'Faible'},${safeData.sales.average > 100 ? 'Bonne valeur par transaction' : safeData.sales.average > 50 ? 'Valeur moyenne' : 'Potentiel d\'amélioration'}\n`
    excelContent += `Marge Bénéficiaire,${safeData.financial.profitMargin.toFixed(1)}%,${safeData.financial.profitMargin > 20 ? 'Excellente' : safeData.financial.profitMargin > 10 ? 'Bonne' : 'À optimiser'},${safeData.financial.profitMargin > 20 ? 'Rentabilité élevée' : safeData.financial.profitMargin > 10 ? 'Rentabilité correcte' : 'Nécessite optimisation'}\n\n`
    
    // Generate general report content - simplified
    excelContent += '=== RAPPORT GÉNÉRAL MENSUEL ===\n'
    excelContent += '--- ANALYSE MENSUELLE DÉTAILLÉE ---\n'
    excelContent += 'Métrique,Valeur,Détails,Recommandations\n'
    excelContent += `Chiffre d'Affaires Mensuel,${safeData.sales.total.toFixed(2)} DH,${safeData.sales.count} transactions,${safeData.sales.total > 1000 ? 'Maintenir la performance' : 'Développer les ventes'}\n`
    excelContent += `Panier Moyen Mensuel,${safeData.sales.average.toFixed(2)} DH,Par transaction,${safeData.sales.average > 100 ? 'Excellente valeur' : 'Optimiser le mix produit'}\n`
    excelContent += `Croissance Mensuelle,${safeData.sales.growth}%,Comparaison période précédente,${safeData.sales.growth > 0 ? 'Tendance positive' : 'Identifier les causes'}\n`
    excelContent += `Nouveaux Clients,${safeData.customers.newThisMonth},Ce mois,${safeData.customers.newThisMonth > 5 ? 'Excellente acquisition' : 'Renforcer le marketing'}\n`
    excelContent += `Produits en Stock,${safeData.products.total},${safeData.products.lowStock} en stock faible,${safeData.products.total > 100 ? 'Gamme complète' : 'Développer l\'assortiment'}\n`
    excelContent += `Clients Actifs,${safeData.customers.active},${safeData.customers.total} total,${safeData.customers.active > 50 ? 'Fidélisation réussie' : 'Améliorer la rétention'}\n`
    excelContent += `Bénéfice Net Mensuel,${safeData.financial.profit.toFixed(2)} DH,Marge: ${safeData.financial.profitMargin.toFixed(1)}%,${safeData.financial.profit > 500 ? 'Rentabilité élevée' : 'Optimiser la marge'}\n`
    
    // Monthly breakdown section
    excelContent += '\n=== ANALYSE MENSUELLE PAR CATÉGORIE ===\n'
    excelContent += 'Catégorie,Métrique,Valeur Mensuelle,Objectif Mensuel,Statut\n'
    excelContent += `Ventes,Chiffre d'Affaires,${safeData.sales.total.toFixed(2)} DH,1000 DH,${safeData.sales.total >= 1000 ? 'Atteint' : 'Non atteint'}\n`
    excelContent += `Ventes,Nombre de Transactions,${safeData.sales.count},50,${safeData.sales.count >= 50 ? 'Atteint' : 'Non atteint'}\n`
    excelContent += `Ventes,Panier Moyen,${safeData.sales.average.toFixed(2)} DH,100 DH,${safeData.sales.average >= 100 ? 'Atteint' : 'Non atteint'}\n`
    excelContent += `Clients,Nouveaux Clients,${safeData.customers.newThisMonth},10,${safeData.customers.newThisMonth >= 10 ? 'Atteint' : 'Non atteint'}\n`
    excelContent += `Clients,Taux d'Activité,${safeData.customers.total > 0 ? ((safeData.customers.active / safeData.customers.total) * 100).toFixed(1) : 0}%,70%,${safeData.customers.total > 0 && (safeData.customers.active / safeData.customers.total) >= 0.7 ? 'Atteint' : 'Non atteint'}\n`
    excelContent += `Finances,Marge Bénéficiaire,${safeData.financial.profitMargin.toFixed(1)}%,20%,${safeData.financial.profitMargin >= 20 ? 'Atteint' : 'Non atteint'}\n`
    excelContent += `Stock,Gestion des Produits,${safeData.products.total},100,${safeData.products.total >= 100 ? 'Atteint' : 'Non atteint'}\n`
    
    // Summary section with KPIs
    excelContent += '\n=== RÉSUMÉ DES INDICATEURS CLÉS ===\n'
    excelContent += 'KPI,Valeur,Objectif,Statut,Analyse\n'
    excelContent += `Chiffre d'Affaires,${safeData.sales.total.toFixed(2)} DH,1000 DH,${safeData.sales.total >= 1000 ? 'Atteint' : 'Non atteint'},${safeData.sales.total >= 1000 ? 'Performance excellente' : 'Opportunité d\'amélioration'}\n`
    excelContent += `Nombre de Transactions,${safeData.sales.count},50,${safeData.sales.count >= 50 ? 'Atteint' : 'Non atteint'},${safeData.sales.count >= 50 ? 'Activité élevée' : 'Développer l\'activité'}\n`
    excelContent += `Panier Moyen,${safeData.sales.average.toFixed(2)} DH,100 DH,${safeData.sales.average >= 100 ? 'Atteint' : 'Non atteint'},${safeData.sales.average >= 100 ? 'Valeur optimale' : 'Optimiser le mix'}\n`
    excelContent += `Marge Bénéficiaire,${safeData.financial.profitMargin.toFixed(1)}%,20%,${safeData.financial.profitMargin >= 20 ? 'Atteint' : 'Non atteint'},${safeData.financial.profitMargin >= 20 ? 'Rentabilité excellente' : 'Améliorer la rentabilité'}\n`
    
    // Detailed data with pivot table structure
    excelContent += '\n=== DONNÉES DÉTAILLÉES (PIVOT TABLE) ===\n'
    excelContent += 'Catégorie,Métrique,Valeur,Comparaison,Variation\n'
    excelContent += `Ventes,Total,${safeData.sales.total.toFixed(2)} DH,${(safeData.sales.total * 0.9).toFixed(2)} DH,+${((safeData.sales.total * 0.1) / (safeData.sales.total * 0.9) * 100).toFixed(1)}%\n`
    excelContent += `Ventes,Nombre,${safeData.sales.count},${Math.max(1, Math.floor(safeData.sales.count * 0.95))},+${((safeData.sales.count - Math.max(1, Math.floor(safeData.sales.count * 0.95))) / Math.max(1, Math.floor(safeData.sales.count * 0.95)) * 100).toFixed(1)}%\n`
    excelContent += `Ventes,Moyenne,${safeData.sales.average.toFixed(2)} DH,${(safeData.sales.average * 0.95).toFixed(2)} DH,+${((safeData.sales.average - safeData.sales.average * 0.95) / (safeData.sales.average * 0.95) * 100).toFixed(1)}%\n`
    excelContent += `Produits,Total,${safeData.products.total},${Math.max(1, Math.floor(safeData.products.total * 0.98))},+${((safeData.products.total - Math.max(1, Math.floor(safeData.products.total * 0.98))) / Math.max(1, Math.floor(safeData.products.total * 0.98)) * 100).toFixed(1)}%\n`
    excelContent += `Produits,Stock Faible,${safeData.products.lowStock},${Math.max(0, Math.floor(safeData.products.lowStock * 0.9))},${safeData.products.lowStock > 0 ? '+' + ((safeData.products.lowStock - Math.max(0, Math.floor(safeData.products.lowStock * 0.9))) / Math.max(1, Math.max(0, Math.floor(safeData.products.lowStock * 0.9))) * 100).toFixed(1) : 0}%\n`
    excelContent += `Produits,Rupture,${safeData.products.outOfStock},${Math.max(0, Math.floor(safeData.products.outOfStock * 0.85))},${safeData.products.outOfStock > 0 ? '+' + ((safeData.products.outOfStock - Math.max(0, Math.floor(safeData.products.outOfStock * 0.85))) / Math.max(1, Math.max(0, Math.floor(safeData.products.outOfStock * 0.85))) * 100).toFixed(1) : 0}%\n`
    excelContent += `Clients,Total,${safeData.customers.total},${Math.max(1, Math.floor(safeData.customers.total * 0.97))},+${((safeData.customers.total - Math.max(1, Math.floor(safeData.customers.total * 0.97))) / Math.max(1, Math.floor(safeData.customers.total * 0.97)) * 100).toFixed(1)}%\n`
    excelContent += `Clients,Nouveaux,${safeData.customers.newThisMonth},${Math.max(0, Math.floor(safeData.customers.newThisMonth * 0.8))},${safeData.customers.newThisMonth > 0 ? '+' + ((safeData.customers.newThisMonth - Math.max(0, Math.floor(safeData.customers.newThisMonth * 0.8))) / Math.max(1, Math.max(0, Math.floor(safeData.customers.newThisMonth * 0.8))) * 100).toFixed(1) : 0}%\n`
    excelContent += `Clients,Actifs,${safeData.customers.active},${Math.max(1, Math.floor(safeData.customers.active * 0.95))},+${((safeData.customers.active - Math.max(1, Math.floor(safeData.customers.active * 0.95))) / Math.max(1, Math.floor(safeData.customers.active * 0.95)) * 100).toFixed(1)}%\n`
    excelContent += `Finances,Revenus,${safeData.financial.revenue.toFixed(2)} DH,${(safeData.financial.revenue * 0.9).toFixed(2)} DH,+${((safeData.financial.revenue - safeData.financial.revenue * 0.9) / (safeData.financial.revenue * 0.9) * 100).toFixed(1)}%\n`
    excelContent += `Finances,Dépenses,${safeData.financial.expenses.toFixed(2)} DH,${(safeData.financial.expenses * 0.95).toFixed(2)} DH,${safeData.financial.expenses > 0 ? '+' + ((safeData.financial.expenses - safeData.financial.expenses * 0.95) / (safeData.financial.expenses * 0.95) * 100).toFixed(1) : 0}%\n`
    excelContent += `Finances,Bénéfice,${safeData.financial.profit.toFixed(2)} DH,${(safeData.financial.profit * 0.9).toFixed(2)} DH,+${((safeData.financial.profit - safeData.financial.profit * 0.9) / Math.max(1, safeData.financial.profit * 0.9) * 100).toFixed(1)}%\n`
    excelContent += `Finances,Marge,${safeData.financial.profitMargin.toFixed(1)}%,${(safeData.financial.profitMargin * 0.9).toFixed(1)}%,+${((safeData.financial.profitMargin - safeData.financial.profitMargin * 0.9) / (safeData.financial.profitMargin * 0.9) * 100).toFixed(1)}%\n`
    
    // Create and download CSV file
    const blob = new Blob([excelContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    
    // Safe date handling for filename
    const timestamp = targetReport.timestamp || new Date().toISOString()
    const dateString = new Date(timestamp).toISOString().split('T')[0]
    a.download = `rapport-${targetReport.type}-${targetReport.dateRange}-${dateString}.csv`
    
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Rapport Excel (CSV) téléchargé avec succès!')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Rapports</h1>
        <p className="text-slate-600">Génération et consultation des rapports d&apos;activité</p>
      </div>

      {/* Statistiques générales */}
      <div className="grid grid-cols-1 md:grid-cols-9 gap-6">
        {loading ? (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse bg-gray-200 h-5 w-5 rounded"></div>
                  <div className="space-y-2 flex-1">
                    <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-3 w-16 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse bg-gray-200 h-5 w-5 rounded"></div>
                  <div className="space-y-2 flex-1">
                    <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-3 w-16 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse bg-gray-200 h-5 w-5 rounded"></div>
                  <div className="space-y-2 flex-1">
                    <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-3 w-16 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse bg-gray-200 h-5 w-5 rounded"></div>
                  <div className="space-y-2 flex-1">
                    <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-3 w-16 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse bg-gray-200 h-5 w-5 rounded"></div>
                  <div className="space-y-2 flex-1">
                    <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-3 w-16 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse bg-gray-200 h-5 w-5 rounded"></div>
                  <div className="space-y-2 flex-1">
                    <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-3 w-16 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse bg-gray-200 h-5 w-5 rounded"></div>
                  <div className="space-y-2 flex-1">
                    <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-3 w-16 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse bg-gray-200 h-5 w-5 rounded"></div>
                  <div className="space-y-2 flex-1">
                    <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-3 w-16 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse bg-gray-200 h-5 w-5 rounded"></div>
                  <div className="space-y-2 flex-1">
                    <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-3 w-16 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ventes d&apos;aujourd&apos;hui</p>
                    <p className="text-2xl font-bold text-emerald-600">{reportData.sales.today.toFixed(2)} DH</p>
                    <p className="text-xs text-emerald-600">{reportData.sales.todayCount} transactions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ventes du Mois</p>
                    <p className="text-2xl font-bold text-green-600">{reportData.sales.total.toFixed(2)} DH</p>
                    <p className="text-xs text-green-600">+{reportData.sales.growth}% vs mois dernier</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ventes d&apos;Année</p>
                    <p className="text-2xl font-bold text-indigo-600">{reportData.sales.yearly.toFixed(2)} DH</p>
                    <p className="text-xs text-indigo-600">{reportData.sales.yearlyCount} transactions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Produits en Stock</p>
                    <p className="text-2xl font-bold text-blue-600">{reportData.products.total}</p>
                    <p className="text-xs text-orange-600">{reportData.products.lowStock} en stock faible</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Clients Actifs</p>
                    <p className="text-2xl font-bold text-purple-600">{reportData.customers.active}</p>
                    <p className="text-xs text-purple-600">+{reportData.customers.newThisMonth} nouveaux</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bénéfice Net</p>
                    <p className="text-2xl font-bold text-orange-600">{reportData.financial.profit.toFixed(2)} DH</p>
                    <p className="text-xs text-orange-600">{reportData.financial.profitMargin.toFixed(1)}% de marge</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-cyan-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Crédit Privé</p>
                    <p className="text-2xl font-bold text-cyan-600">{reportData.privateCredits.activeAmount.toFixed(2)} DH</p>
                    <p className="text-xs text-cyan-600">{reportData.privateCredits.active} crédits actifs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Produits Cassés</p>
                    <p className="text-2xl font-bold text-red-600">{reportData.brokenProducts.total}</p>
                    <p className="text-xs text-red-600">{reportData.brokenProducts.totalValue.toFixed(2)} DH de perte</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Montant Total des Charges</p>
                    <p className="text-2xl font-bold text-amber-600">{reportData.businessExpenses.total.toFixed(2)} DH</p>
                    <p className="text-xs text-amber-600">{reportData.businessExpenses.count} charges ce mois</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Vue d'ensemble des Caisses */}
      <Card>
        <CardHeader>
          <CardTitle>Vue d'ensemble des Caisses</CardTitle>
          <CardDescription>
            Impact des crédits privés sur les différentes caisses du système
          </CardDescription>
        </CardHeader>
        <CardContent>

          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Caisse Principale */}
            <div className="space-y-3 p-4 border rounded-lg">
              <h3 className="font-semibold text-lg text-blue-600">Caisse Principale</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Revenus:</span>
                  <span className="font-medium text-green-600">+{reportData.financial.revenue.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between">
                  <span>Achats:</span>
                  <span className="font-medium text-red-600">-{reportData.financial.expenses.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Solde:</span>
                  <span className={`font-bold ${reportData.cashAccounts.mainCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {reportData.cashAccounts.mainCash.toFixed(2)} DH
                  </span>
                </div>
              </div>
            </div>

            {/* Paiements Manuels */}
            <div className="space-y-3 p-4 border rounded-lg">
              <h3 className="font-semibold text-lg text-purple-600">Paiements Manuels</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-medium text-purple-600">{reportData.cashAccounts.manualPayments.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between">
                  <span>Transactions:</span>
                  <span className="text-sm text-muted-foreground">{manualPaymentsCount}</span>
                </div>
              </div>
            </div>

            {/* Paiements de Salaires */}
            <div className="space-y-3 p-4 border rounded-lg">
              <h3 className="font-semibold text-lg text-orange-600">Paiements de Salaires</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-medium text-orange-600">{reportData.cashAccounts.salaryPayments.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between">
                  <span>Employés:</span>
                  <span className="text-sm text-muted-foreground">{salaryPaymentsCount}</span>
                </div>
              </div>
            </div>

            {/* Crédits Privés */}
            <div className="space-y-3 p-4 border rounded-lg bg-orange-50">
              <h3 className="font-semibold text-lg text-orange-600">Crédits Privés</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Montant Total:</span>
                  <span className="font-medium text-orange-600">{reportData.privateCredits.totalAmount.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between">
                  <span>Crédits Actifs:</span>
                  <span className="text-sm text-muted-foreground">{reportData.privateCredits.active}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Impact Caisse:</span>
                  <span className="font-bold text-red-600">-{reportData.privateCredits.activeAmount.toFixed(2)} DH</span>
                </div>
              </div>
            </div>

            {/* Produits Cassés */}
            <div className="space-y-3 p-4 border rounded-lg bg-red-50">
              <h3 className="font-semibold text-lg text-red-600">Produits Cassés</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Montant Total:</span>
                  <span className="font-medium text-red-600">{reportData.brokenProducts.totalValue.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between">
                  <span>Produits Cassés:</span>
                  <span className="text-sm text-muted-foreground">{reportData.brokenProducts.total}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Impact Caisse:</span>
                  <span className="font-bold text-red-600">-{reportData.brokenProducts.totalValue.toFixed(2)} DH</span>
                </div>
              </div>
            </div>

            {/* Sorties Totales */}
            <div className="space-y-3 p-4 border rounded-lg bg-red-50">
              <h3 className="font-semibold text-lg text-red-600">Sorties Totales</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Charges:</span>
                  <span className="font-medium text-red-600">-{reportData.businessExpenses.total.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between">
                  <span>Paiements:</span>
                  <span className="font-medium text-red-600">-{reportData.cashAccounts.manualPayments.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between">
                  <span>Salaires:</span>
                  <span className="font-medium text-red-600">-{reportData.cashAccounts.salaryPayments.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between">
                  <span>Produits Cassés:</span>
                  <span className="font-medium text-red-600">-{reportData.brokenProducts.totalValue.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Total Sorties:</span>
                  <span className="font-bold text-red-600">-{reportData.cashAccounts.totalOutflows.toFixed(2)} DH</span>
                </div>
              </div>
            </div>

            {/* Solde Final */}
            <div className="space-y-3 p-4 border rounded-lg bg-green-50">
              <h3 className="font-semibold text-lg text-green-600">Solde Final (Après Crédits)</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Caisse Principale:</span>
                  <span className="font-medium text-blue-600">{reportData.cashAccounts.mainCash.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between">
                  <span>Moins Sorties:</span>
                  <span className="font-medium text-red-600">-{reportData.cashAccounts.totalOutflows.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between">
                  <span>Moins Crédits Privés:</span>
                  <span className="font-medium text-orange-600">-{reportData.privateCredits.activeAmount.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Solde Disponible:</span>
                  <span className={`font-bold text-lg ${reportData.cashAccounts.netAfterCredits >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {reportData.cashAccounts.netAfterCredits.toFixed(2)} DH
                  </span>
                </div>
              </div>
            </div>

            {/* Fournisseurs */}
            <div className="space-y-3 p-4 border rounded-lg bg-blue-50">
              <h3 className="font-semibold text-lg text-blue-600">Fournisseurs</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-medium text-blue-600">{reportData.suppliers.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Actifs:</span>
                  <span className="text-sm text-muted-foreground">{reportData.suppliers.active}</span>
                </div>
              </div>
            </div>

            {/* Caisse Enregistreuse */}
            <div className="space-y-3 p-4 border rounded-lg bg-purple-50">
              <h3 className="font-semibold text-lg text-purple-600">Caisse Enregistreuse</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Transactions:</span>
                  <span className="font-medium text-purple-600">{reportData.cashRegister.totalTransactions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Entrées:</span>
                  <span className="font-medium text-green-600">+{reportData.cashRegister.inflows.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between">
                  <span>Sorties:</span>
                  <span className="font-medium text-red-600">-{reportData.cashRegister.outflows.toFixed(2)} DH</span>
                </div>
              </div>
            </div>

            {/* Employés */}
            <div className="space-y-3 p-4 border rounded-lg bg-indigo-50">
              <h3 className="font-semibold text-lg text-indigo-600">Employés</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-medium text-indigo-600">{reportData.employees.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Actifs:</span>
                  <span className="text-sm text-muted-foreground">{reportData.employees.activeCount}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Total Salaires:</span>
                  <span className="font-bold text-indigo-600">{reportData.employees.totalSalary.toFixed(2)} DH</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Configuration des rapports */}
      <Card>
        <CardHeader>
          <CardTitle>Génération de Rapports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reportFetchError ? (
            <p className="text-sm text-red-600" role="alert">
              {reportFetchError}
            </p>
          ) : null}
          {lastGeneratedReport?.meta ? (
            <p className="text-sm text-muted-foreground">
              Dernier rapport:{" "}
              {new Date(lastGeneratedReport.meta.startDate).toLocaleString("fr-FR")} →{" "}
              {new Date(lastGeneratedReport.meta.endDate).toLocaleString("fr-FR")}
              {" · "}
              {lastGeneratedReport.meta.totalOrders} commandes ·{" "}
              {Number(lastGeneratedReport.meta.totalRevenue).toFixed(2)} DH
            </p>
          ) : null}
          <div className="grid grid-cols-3 gap-4">
            {reportTypes.map((reportType) => (
              <Button
                key={reportType.value}
                onClick={() => void generateReport(reportType.value)}
                className="flex items-center gap-2 h-12"
                variant="outline"
                disabled={reportFetchLoading}
              >
                {reportFetchLoading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <reportType.icon className="h-4 w-4 shrink-0" />
                )}
                {reportType.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>



      {/* Rapports récents */}
      <Card>
        <CardHeader>
          <CardTitle>Rapports Récents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement des rapports...</p>
              </div>
            ) : generatedReports.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-4">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">Aucun rapport généré</p>
                  <p className="text-sm">Utilisez les contrôles ci-dessus pour générer votre premier rapport</p>
                </div>
                <Button 
                  onClick={() => generateReport('monthly')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Générer un Rapport
                </Button>
              </div>
            ) : (
              generatedReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">
                        {report.type === 'daily' ? 'Rapport d\'Aujourd\'hui' : report.type === 'monthly' ? 'Rapport Mensuel' : 'Rapport d\'Année'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Généré le {new Date(report.timestamp || new Date().toISOString()).toLocaleDateString('fr-FR')} à {new Date(report.timestamp || new Date().toISOString()).toLocaleTimeString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadReport(report)}
                    >
                      <FileTextIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 