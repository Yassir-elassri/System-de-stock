import { type NextRequest, NextResponse } from "next/server"
import db, { initializeDatabase } from "@/lib/database"

initializeDatabase()

export async function GET() {
  try {
    const payments = db.prepare(`
      SELECT * FROM manual_payments
      ORDER BY payment_date DESC
    `).all()
    return NextResponse.json(payments)
  } catch (error) {
    console.error("Error fetching manual payments:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des paiements" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, payment_method, reference, client_supplier_name, notes, payment_date } = body
    
    if (!amount || !payment_method || !payment_date) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 })
    }

    const stmt = db.prepare(`
      INSERT INTO manual_payments (amount, payment_method, reference, client_supplier_name, notes, payment_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(
      amount,
      payment_method,
      reference || null,
      client_supplier_name || null,
      notes || null,
      payment_date
    )

    const newPayment = db.prepare(`
      SELECT * FROM manual_payments WHERE id = ?
    `).get(result.lastInsertRowid)

    return NextResponse.json(newPayment, { status: 201 })
  } catch (error) {
    console.error("Error creating manual payment:", error)
    return NextResponse.json({ error: "Erreur lors de la création du paiement" }, { status: 500 })
  }
} 