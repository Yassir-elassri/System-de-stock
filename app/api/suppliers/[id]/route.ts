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
    const { name, contact_person, phone, email, address } = body

    if (!name) {
      return NextResponse.json({ error: "Le nom du fournisseur est obligatoire" }, { status: 400 })
    }

    // Check if supplier exists
    const existingSupplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id)
    if (!existingSupplier) {
      return NextResponse.json({ error: "Fournisseur non trouvé" }, { status: 404 })
    }

    // Update the supplier
    const updateStmt = db.prepare(`
      UPDATE suppliers 
      SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?
      WHERE id = ?
    `)
    updateStmt.run(
      name,
      contact_person || null,
      phone || null,
      email || null,
      address || null,
      id
    )

    // Return updated supplier
    const updatedSupplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id)
    return NextResponse.json(updatedSupplier)
  } catch (error) {
    console.error("Error updating supplier:", error)
    return NextResponse.json({ 
      error: "Erreur lors de la mise à jour du fournisseur",
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

    // Check if supplier exists
    const existingSupplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id)
    if (!existingSupplier) {
      return NextResponse.json({ error: "Fournisseur non trouvé" }, { status: 404 })
    }

    // Check if supplier has related purchases
    const relatedPurchases = db.prepare('SELECT COUNT(*) as count FROM purchases WHERE supplier_id = ?').get(id) as any
    if (relatedPurchases.count > 0) {
      return NextResponse.json({ 
        error: "Impossible de supprimer ce fournisseur car il a des achats associés. Supprimez d'abord tous les achats de ce fournisseur." 
      }, { status: 400 })
    }

    // Check if supplier has related credits
    const relatedCredits = db.prepare('SELECT COUNT(*) as count FROM supplier_credits WHERE supplier_id = ?').get(id) as any
    if (relatedCredits.count > 0) {
      return NextResponse.json({ 
        error: "Impossible de supprimer ce fournisseur car il a des crédits associés. Régularisez d'abord tous les crédits de ce fournisseur." 
      }, { status: 400 })
    }

    // Delete the supplier
    const deleteStmt = db.prepare('DELETE FROM suppliers WHERE id = ?')
    deleteStmt.run(id)

    return NextResponse.json({ message: "Fournisseur supprimé avec succès" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting supplier:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression du fournisseur" }, { status: 500 })
  }
} 