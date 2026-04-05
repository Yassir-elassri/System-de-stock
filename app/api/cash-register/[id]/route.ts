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
    const { type, amount, payment_method, description, client_id } = body

    if (!type || !amount || !payment_method) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 })
    }

    // Check if transaction exists
    const existingTransaction = db.prepare('SELECT * FROM cash_register WHERE id = ?').get(id)
    if (!existingTransaction) {
      return NextResponse.json({ error: "Transaction non trouvée" }, { status: 404 })
    }

    // Update the transaction
    const updateStmt = db.prepare(`
      UPDATE cash_register 
      SET type = ?, amount = ?, payment_method = ?, description = ?, client_id = ?
      WHERE id = ?
    `)
    updateStmt.run(
      type,
      amount,
      payment_method,
      description || null,
      client_id || null,
      id
    )

    // Return updated transaction with client name
    const updatedTransaction = db.prepare(`
      SELECT cr.*, c.name as client_name
      FROM cash_register cr
      LEFT JOIN clients c ON cr.client_id = c.id
      WHERE cr.id = ?
    `).get(id)

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    console.error("Error updating transaction:", error)
    return NextResponse.json({ 
      error: "Erreur lors de la mise à jour de la transaction",
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

    // Check if transaction exists
    const existingTransaction = db.prepare('SELECT * FROM cash_register WHERE id = ?').get(id)
    if (!existingTransaction) {
      return NextResponse.json({ error: "Transaction non trouvée" }, { status: 404 })
    }

    // Delete the transaction
    const stmt = db.prepare('DELETE FROM cash_register WHERE id = ?')
    stmt.run(id)

    return NextResponse.json({ message: "Transaction supprimée avec succès" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression de la transaction" }, { status: 500 })
  }
} 