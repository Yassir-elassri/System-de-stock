import { type NextRequest, NextResponse } from "next/server"
import db, { initializeDatabase } from "@/lib/database"

initializeDatabase()

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, phone, email, address } = body
    
    if (!name) {
      return NextResponse.json({ error: "Le nom est obligatoire" }, { status: 400 })
    }

    const stmt = db.prepare(`
      UPDATE clients 
      SET name = ?, phone = ?, email = ?, address = ?
      WHERE id = ?
    `)
    
    const result = stmt.run(name, phone || null, email || null, address || null, params.id)

    if (result.changes === 0) {
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 })
    }

    const updatedClient = db.prepare(`
      SELECT * FROM clients WHERE id = ?
    `).get(params.id)

    return NextResponse.json(updatedClient)
  } catch (error) {
    console.error("Error updating client:", error)
    return NextResponse.json({ error: "Erreur lors de la modification du client" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = parseInt(params.id)
    if (isNaN(clientId)) {
      return NextResponse.json({ error: "ID de client invalide" }, { status: 400 })
    }

    // Check if client exists
    const existingClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId)
    if (!existingClient) {
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 })
    }

    // Check if client has related sales
    const relatedSales = db.prepare('SELECT COUNT(*) as count FROM sales WHERE client_id = ?').get(clientId) as any
    if (relatedSales.count > 0) {
      return NextResponse.json({ 
        error: "Impossible de supprimer ce client car il a des ventes associées. Supprimez d'abord toutes les ventes de ce client." 
      }, { status: 400 })
    }

    // Check if client has related credits
    const relatedCredits = db.prepare('SELECT COUNT(*) as count FROM client_credits WHERE client_id = ?').get(clientId) as any
    if (relatedCredits.count > 0) {
      return NextResponse.json({ 
        error: "Impossible de supprimer ce client car il a des crédits associés. Régularisez d'abord tous les crédits de ce client." 
      }, { status: 400 })
    }

    // Delete the client
    const stmt = db.prepare(`DELETE FROM clients WHERE id = ?`)
    const result = stmt.run(clientId)

    if (result.changes === 0) {
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ message: "Client supprimé avec succès" })
  } catch (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression du client" }, { status: 500 })
  }
} 