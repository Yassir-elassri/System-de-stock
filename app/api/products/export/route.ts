import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { format } from "date-fns"
import db, { initializeDatabase } from "@/lib/database"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

initializeDatabase()

type ProductExportRow = {
  name: string | null
  description: string | null
  category: string | null
  purchase_price: number | null
  selling_price: number | null
  current_stock: number | null
}

function safeStr(value: unknown): string {
  if (value == null) return ""
  const s = String(value)
  return s === "undefined" ? "" : s
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatPriceDh(value: unknown): string {
  return `${toFiniteNumber(value).toFixed(2)} DH`
}

function stockStatut(stock: number): "En stock" | "Rupture" {
  return stock > 0 ? "En stock" : "Rupture"
}

const HEADER_ROW = [
  "Produit",
  "Description",
  "Catégorie",
  "Prix Achat",
  "Prix Vente",
  "Stock",
  "Statut",
] as const

export async function GET() {
  try {
    const products = db
      .prepare(
        `
        SELECT name, description, category, purchase_price, selling_price, current_stock
        FROM products
        ORDER BY name ASC
      `,
      )
      .all() as ProductExportRow[]

    const dataRows = products.map((p) => {
      const stock = toFiniteNumber(p.current_stock)
      return [
        safeStr(p.name),
        safeStr(p.description),
        safeStr(p.category),
        formatPriceDh(p.purchase_price),
        formatPriceDh(p.selling_price),
        stock,
        stockStatut(stock),
      ] as (string | number)[]
    })

    const worksheet = XLSX.utils.aoa_to_sheet([[...HEADER_ROW], ...dataRows])

    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 42 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 12 },
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Produits")

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
    const fileName = `produits_${format(new Date(), "yyyy-MM-dd")}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Error exporting products to Excel:", error)
    return NextResponse.json({ error: "Erreur lors de l'export Excel" }, { status: 500 })
  }
}
