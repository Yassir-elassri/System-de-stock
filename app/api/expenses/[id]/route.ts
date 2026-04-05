import { type NextRequest, NextResponse } from "next/server"
import db, { initializeDatabase } from "@/lib/database"

initializeDatabase()

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 })
    }

    const body = await request.json()
    const { description, amount, category, expense_date, notes } = body

    if (!description || !amount || !expense_date) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 })
    }

    // Check if expense exists
    const existingExpense = db.prepare('SELECT * FROM business_expenses WHERE id = ?').get(id) as any
    if (!existingExpense) {
      return NextResponse.json({ error: "Dépense non trouvée" }, { status: 404 })
    }

    // Update the expense
    const updateStmt = db.prepare(`
      UPDATE business_expenses 
      SET description = ?, amount = ?, category = ?, expense_date = ?, notes = ?
      WHERE id = ?
    `)
    updateStmt.run(
      description,
      amount,
      category || null,
      expense_date,
      notes || null,
      id
    )

    // Return updated expense
    const updatedExpense = db.prepare('SELECT * FROM business_expenses WHERE id = ?').get(id)

    return NextResponse.json(updatedExpense)
  } catch (error) {
    console.error("Error updating expense:", error)
    return NextResponse.json({ 
      error: "Erreur lors de la mise à jour de la dépense",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 })
    }

    // Check if expense exists
    const existingExpense = db.prepare('SELECT * FROM business_expenses WHERE id = ?').get(id) as any
    if (!existingExpense) {
      return NextResponse.json({ error: "Dépense non trouvée" }, { status: 404 })
    }

    // Delete the expense
    const stmt = db.prepare('DELETE FROM business_expenses WHERE id = ?')
    stmt.run(id)

    return NextResponse.json({ message: "Dépense supprimée avec succès" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting expense:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression de la dépense" }, { status: 500 })
  }
} 