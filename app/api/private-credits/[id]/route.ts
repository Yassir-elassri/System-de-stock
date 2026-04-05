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
    const { client_id, amount, description, credit_date, due_date, status } = body

    if (!client_id || !amount || !credit_date) {
      return NextResponse.json({ error: "Champs obligatoires manquants (client_id, amount, credit_date)" }, { status: 400 })
    }

    // Check if private credit exists
    const existingCredit = db.prepare('SELECT * FROM private_credits WHERE id = ?').get(id) as any
    if (!existingCredit) {
      return NextResponse.json({ error: "Crédit privé non trouvé" }, { status: 404 })
    }

    // Update the private credit
    const updateStmt = db.prepare(`
      UPDATE private_credits 
      SET client_id = ?, amount = ?, description = ?, credit_date = ?, due_date = ?, status = ?
      WHERE id = ?
    `)
    updateStmt.run(
      client_id,
      amount,
      description || null,
      credit_date,
      due_date || null,
      status || 'active',
      id
    )

    // Return updated private credit with client name
    const updatedCredit = db.prepare(`
      SELECT 
        pc.id, 
        pc.client_id,
        c.name as person_name,
        pc.amount, 
        pc.description, 
        pc.credit_date, 
        pc.due_date,
        pc.created_at,
        COALESCE(pc.status, 'active') as status
      FROM private_credits pc
      LEFT JOIN clients c ON pc.client_id = c.id
      WHERE pc.id = ?
    `).get(id)

    return NextResponse.json(updatedCredit)
  } catch (error) {
    console.error("Error updating private credit:", error)
    return NextResponse.json({ 
      error: "Erreur lors de la mise à jour du crédit privé",
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

    // Check if private credit exists
    const existingCredit = db.prepare('SELECT * FROM private_credits WHERE id = ?').get(id) as any
    if (!existingCredit) {
      return NextResponse.json({ error: "Crédit privé non trouvé" }, { status: 404 })
    }

    // Delete the private credit
    const stmt = db.prepare('DELETE FROM private_credits WHERE id = ?')
    stmt.run(id)

    return NextResponse.json({ message: "Crédit privé supprimé avec succès" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting private credit:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression du crédit privé" }, { status: 500 })
  }
} 