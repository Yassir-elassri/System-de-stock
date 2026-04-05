import { NextResponse } from "next/server"
import db, { initializeDatabase } from "@/lib/database"

initializeDatabase()

export async function GET() {
  try {
    const clients = db.prepare("SELECT * FROM clients ORDER BY LOWER(name) ASC").all()
    return NextResponse.json(clients)
  } catch (error) {
    console.error("Error fetching clients:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des clients" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, phone, email, address } = body
    if (!name) {
      return NextResponse.json({ error: "Le nom du client est obligatoire" }, { status: 400 })
    }
    const stmt = db.prepare(`
      INSERT INTO clients (name, phone, email, address)
      VALUES (?, ?, ?, ?)
    `)
    const result = stmt.run(
      name,
      phone || null,
      email || null,
      address || null
    )
    const newClient = db.prepare("SELECT * FROM clients WHERE id = ?").get(result.lastInsertRowid)
    return NextResponse.json(newClient, { status: 201 })
  } catch (error) {
    console.error("Error creating client:", error)
    return NextResponse.json({ error: "Erreur lors de la création du client" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    console.log("DELETE /api/clients called")
    const body = await request.json()
    const { id } = body
    
    console.log("Received ID:", id, "Type:", typeof id)
    
    if (!id) {
      console.log("Missing ID")
      return NextResponse.json({ error: "ID du client manquant" }, { status: 400 })
    }

    const clientId = parseInt(id)
    console.log("Parsed clientId:", clientId)
    
    if (isNaN(clientId)) {
      console.log("Invalid ID")
      return NextResponse.json({ error: "ID du client invalide" }, { status: 400 })
    }

    // Check if client exists first
    const existingClient = db.prepare("SELECT * FROM clients WHERE id = ?").get(clientId)
    console.log("Existing client:", existingClient)
    
    if (!existingClient) {
      console.log("Client not found")
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 })
    }

    // Check if client has related sales records
    const salesCount = db.prepare("SELECT COUNT(*) as count FROM sales WHERE client_id = ?").get(clientId) as any
    console.log("Sales count:", salesCount)
    
    if (salesCount && salesCount.count > 0) {
      console.log("Client has sales, cannot delete")
      return NextResponse.json({ 
        error: `Impossible de supprimer ce client car il a ${salesCount.count} vente(s) associée(s). Supprimez d'abord les ventes.` 
      }, { status: 400 })
    }

    // Check if client has related credits
    const creditsCount = db.prepare("SELECT COUNT(*) as count FROM client_credits WHERE client_id = ?").get(clientId) as any
    console.log("Credits count:", creditsCount)
    
    if (creditsCount && creditsCount.count > 0) {
      console.log("Client has credits, cannot delete")
      return NextResponse.json({ 
        error: `Impossible de supprimer ce client car il a ${creditsCount.count} crédit(s) associé(s). Supprimez d'abord les crédits.` 
      }, { status: 400 })
    }

    // Check if client has related cash register transactions
    const cashRegisterCount = db.prepare("SELECT COUNT(*) as count FROM cash_register WHERE client_id = ?").get(clientId) as any
    console.log("Cash register count:", cashRegisterCount)
    
    if (cashRegisterCount && cashRegisterCount.count > 0) {
      console.log("Client has cash register transactions, cannot delete")
      return NextResponse.json({ 
        error: `Impossible de supprimer ce client car il a ${cashRegisterCount.count} transaction(s) de caisse associée(s). Supprimez d'abord ces transactions.` 
      }, { status: 400 })
    }

    // Delete the client
    console.log("Attempting to delete client")
    const stmt = db.prepare("DELETE FROM clients WHERE id = ?")
    const result = stmt.run(clientId)
    console.log("Delete result:", result)
    
    if (result.changes === 0) {
      console.log("No rows affected")
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 })
    }
    
    console.log("Client deleted successfully")
    return NextResponse.json({ success: true, message: "Client supprimé avec succès" })
  } catch (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression du client" }, { status: 500 })
  }
} 