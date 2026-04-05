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
    const { amount, payment_method, reference, client_supplier_name, notes, payment_date } = body

    if (!amount || !payment_method || !payment_date) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 })
    }

    // Check if payment exists
    const existingPayment = db.prepare('SELECT * FROM manual_payments WHERE id = ?').get(id)
    if (!existingPayment) {
      return NextResponse.json({ error: "Paiement non trouvé" }, { status: 404 })
    }

    // Update the payment
    const updateStmt = db.prepare(`
      UPDATE manual_payments 
      SET amount = ?, payment_method = ?, reference = ?, client_supplier_name = ?, notes = ?, payment_date = ?
      WHERE id = ?
    `)
    updateStmt.run(
      amount,
      payment_method,
      reference || null,
      client_supplier_name || null,
      notes || null,
      payment_date,
      id
    )

    // Return updated payment
    const updatedPayment = db.prepare('SELECT * FROM manual_payments WHERE id = ?').get(id)

    return NextResponse.json(updatedPayment)
  } catch (error) {
    console.error("Error updating manual payment:", error)
    return NextResponse.json({ 
      error: "Erreur lors de la mise à jour du paiement",
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

    // Check if payment exists
    const existingPayment = db.prepare('SELECT * FROM manual_payments WHERE id = ?').get(id)
    if (!existingPayment) {
      return NextResponse.json({ error: "Paiement non trouvé" }, { status: 404 })
    }

    // Delete the payment
    const stmt = db.prepare('DELETE FROM manual_payments WHERE id = ?')
    stmt.run(id)

    return NextResponse.json({ message: "Paiement supprimé avec succès" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting manual payment:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression du paiement" }, { status: 500 })
  }
} 