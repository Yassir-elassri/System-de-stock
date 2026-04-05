import { NextResponse } from "next/server"
import db, { initializeDatabase } from "@/lib/database"

initializeDatabase()

export async function GET() {
  try {
    const suppliers = db.prepare("SELECT * FROM suppliers ORDER BY name ASC").all()
    return NextResponse.json(suppliers)
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des fournisseurs" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, contact_person, phone, email, address } = body
    if (!name) {
      return NextResponse.json({ error: "Le nom du fournisseur est obligatoire" }, { status: 400 })
    }
    const stmt = db.prepare(`
      INSERT INTO suppliers (name, contact_person, phone, email, address)
      VALUES (?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      name,
      contact_person || null,
      phone || null,
      email || null,
      address || null
    )
    const newSupplier = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(result.lastInsertRowid)
    return NextResponse.json(newSupplier, { status: 201 })
  } catch (error) {
    console.error("Error creating supplier:", error)
    return NextResponse.json({ error: "Erreur lors de la création du fournisseur" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { id } = body
    if (!id) {
      return NextResponse.json({ error: "ID du fournisseur manquant" }, { status: 400 })
    }

    // Check if supplier has related purchases
    const purchasesCount = db.prepare("SELECT COUNT(*) as count FROM purchases WHERE supplier_id = ?").get(id) as { count: number }
    
    if (purchasesCount.count > 0) {
      return NextResponse.json({ 
        error: `Impossible de supprimer ce fournisseur car il a ${purchasesCount.count} achat(s) associé(s). Supprimez d'abord les achats.` 
      }, { status: 400 })
    }

    // Check if supplier has related credits
    const creditsCount = db.prepare("SELECT COUNT(*) as count FROM supplier_credits WHERE supplier_id = ?").get(id) as { count: number }
    
    if (creditsCount.count > 0) {
      return NextResponse.json({ 
        error: `Impossible de supprimer ce fournisseur car il a ${creditsCount.count} crédit(s) associé(s). Supprimez d'abord les crédits.` 
      }, { status: 400 })
    }

    const stmt = db.prepare("DELETE FROM suppliers WHERE id = ?")
    const result = stmt.run(id)
    
    if (result.changes === 0) {
      return NextResponse.json({ error: "Fournisseur non trouvé" }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting supplier:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression du fournisseur" }, { status: 500 })
  }
} 