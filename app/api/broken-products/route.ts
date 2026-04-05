import { type NextRequest, NextResponse } from "next/server"
import db, { initializeDatabase } from "@/lib/database"

initializeDatabase()

export async function GET() {
  try {
    const brokenProducts = db.prepare(`
      SELECT bp.*, p.name as product_name, p.selling_price
      FROM broken_products bp
      LEFT JOIN products p ON bp.product_id = p.id
      ORDER BY bp.break_date DESC
    `).all()
    return NextResponse.json(brokenProducts)
  } catch (error) {
    console.error("Error fetching broken products:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des produits cassés" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { product_id, quantity, reason, loss_amount, break_date } = body
    
    if (!product_id || !quantity || !break_date) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 })
    }

    // Check if the product exists
    const productExists = db.prepare('SELECT id FROM products WHERE id = ?').get(product_id)
    if (!productExists) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 })
    }

    const stmt = db.prepare(`
      INSERT INTO broken_products (product_id, quantity, reason, loss_amount, break_date)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(
      product_id,
      quantity,
      reason || null,
      loss_amount || null,
      break_date
    )

    const newBrokenProduct = db.prepare(`
      SELECT bp.*, p.name as product_name, p.selling_price
      FROM broken_products bp
      LEFT JOIN products p ON bp.product_id = p.id
      WHERE bp.id = ?
    `).get(result.lastInsertRowid)

    return NextResponse.json(newBrokenProduct, { status: 201 })
  } catch (error: any) {
    console.error("Error creating broken product:", error)
    
    // Provide more specific error messages
    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return NextResponse.json({ 
        error: "Produit introuvable ou invalide. Vérifiez que le produit existe." 
      }, { status: 400 })
    }
    
    return NextResponse.json({ error: "Erreur lors de la création du produit cassé" }, { status: 500 })
  }
} 