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
    const { product_id, quantity, reason, loss_amount, break_date, status } = body

    if (!product_id || !quantity || !break_date) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 })
    }

    // Check if broken product exists
    const existingProduct = db.prepare('SELECT * FROM broken_products WHERE id = ?').get(id) as any
    if (!existingProduct) {
      return NextResponse.json({ error: "Produit cassé non trouvé" }, { status: 404 })
    }

    // Update the broken product
    const updateStmt = db.prepare(`
      UPDATE broken_products 
      SET product_id = ?, quantity = ?, reason = ?, loss_amount = ?, break_date = ?, status = ?
      WHERE id = ?
    `)
    updateStmt.run(
      product_id,
      quantity,
      reason || null,
      loss_amount || null,
      break_date,
      status || 'pending',
      id
    )

    // Return updated broken product with product info
    const updatedProduct = db.prepare(`
      SELECT bp.*, p.name as product_name, p.selling_price
      FROM broken_products bp
      LEFT JOIN products p ON bp.product_id = p.id
      WHERE bp.id = ?
    `).get(id)

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error("Error updating broken product:", error)
    return NextResponse.json({ 
      error: "Erreur lors de la mise à jour du produit cassé",
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

    // Check if broken product exists
    const existingProduct = db.prepare('SELECT * FROM broken_products WHERE id = ?').get(id) as any
    if (!existingProduct) {
      return NextResponse.json({ error: "Produit cassé non trouvé" }, { status: 404 })
    }

    // Delete the broken product
    const stmt = db.prepare('DELETE FROM broken_products WHERE id = ?')
    stmt.run(id)

    return NextResponse.json({ message: "Produit cassé supprimé avec succès" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting broken product:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression du produit cassé" }, { status: 500 })
  }
} 