import { type NextRequest, NextResponse } from "next/server"
import db, { initializeDatabase } from "@/lib/database"

initializeDatabase()

export async function GET() {
  try {
    const expenses = db.prepare(`
      SELECT * FROM business_expenses
      ORDER BY expense_date DESC
    `).all()
    return NextResponse.json(expenses)
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des dépenses" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description, amount, category, expense_date, notes } = body
    
    if (!description || !amount || !expense_date) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 })
    }

    const stmt = db.prepare(`
      INSERT INTO business_expenses (description, amount, category, expense_date, notes)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(
      description,
      amount,
      category || null,
      expense_date,
      notes || null
    )

    const newExpense = db.prepare(`
      SELECT * FROM business_expenses WHERE id = ?
    `).get(result.lastInsertRowid)

    return NextResponse.json(newExpense, { status: 201 })
  } catch (error) {
    console.error("Error creating expense:", error)
    return NextResponse.json({ error: "Erreur lors de la création de la dépense" }, { status: 500 })
  }
} 