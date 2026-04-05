import { type NextRequest, NextResponse } from "next/server"
import db, { initializeDatabase } from "@/lib/database"

// Initialize database on first API call
initializeDatabase()

export async function GET() {
  try {
    const products = db
      .prepare(`
        SELECT * FROM products 
        ORDER BY name ASC
      `)
      .all()

    return NextResponse.json(products)
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des produits" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, purchase_price, selling_price, current_stock, minimum_stock, unit, category, barcode } =
      body

    const stmt = db.prepare(`
      INSERT INTO products (
        name, description, purchase_price, selling_price,
        current_stock, minimum_stock, unit, category, barcode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      name,
      description || null,
      purchase_price,
      selling_price,
      current_stock || 0,
      minimum_stock || 0,
      unit || "pièce",
      category || null,
      barcode || null,
    )

    const newProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid)

    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Erreur lors de la création du produit" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, purchase_price, selling_price, current_stock, minimum_stock, unit, category, barcode } =
      body

    const stmt = db.prepare(`
      UPDATE products SET 
        name = ?, description = ?, purchase_price = ?, selling_price = ?,
        current_stock = ?, minimum_stock = ?, unit = ?, category = ?, barcode = ?
      WHERE id = ?
    `)

    const result = stmt.run(
      name,
      description || null,
      purchase_price,
      selling_price,
      current_stock || 0,
      minimum_stock || 0,
      unit || "pièce",
      category || null,
      barcode || null,
      id
    )

    if (result.changes === 0) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 })
    }

    const updatedProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(id)

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json({ error: "Erreur lors de la mise à jour du produit" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: "ID du produit requis" }, { status: 400 })
    }
    
    const productId = parseInt(id)
    if (isNaN(productId)) {
      return NextResponse.json({ error: "ID du produit invalide" }, { status: 400 })
    }
    
    // Check if product exists
    const existingProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(productId)
    if (!existingProduct) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 })
    }
    
    // Check for foreign key constraints
    // Check purchase_items
    const purchaseItemsCount = db.prepare("SELECT COUNT(*) as count FROM purchase_items WHERE product_id = ?").get(productId) as any
    if (purchaseItemsCount && purchaseItemsCount.count > 0) {
      return NextResponse.json({ 
        error: `Impossible de supprimer ce produit car il a ${purchaseItemsCount.count} article(s) d'achat associé(s). Supprimez d'abord ces articles.` 
      }, { status: 400 })
    }
    
    // Check sale_items
    const saleItemsCount = db.prepare("SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?").get(productId) as any
    if (saleItemsCount && saleItemsCount.count > 0) {
      return NextResponse.json({ 
        error: `Impossible de supprimer ce produit car il a ${saleItemsCount.count} article(s) de vente associé(s). Supprimez d'abord ces articles.` 
      }, { status: 400 })
    }
    
    // Check stock_movements
    const stockMovementsCount = db.prepare("SELECT COUNT(*) as count FROM stock_movements WHERE product_id = ?").get(productId) as any
    if (stockMovementsCount && stockMovementsCount.count > 0) {
      return NextResponse.json({ 
        error: `Impossible de supprimer ce produit car il a ${stockMovementsCount.count} mouvement(s) de stock associé(s). Supprimez d'abord ces mouvements.` 
      }, { status: 400 })
    }
    
    // Check broken_products
    const brokenProductsCount = db.prepare("SELECT COUNT(*) as count FROM broken_products WHERE product_id = ?").get(productId) as any
    if (brokenProductsCount && brokenProductsCount.count > 0) {
      return NextResponse.json({ 
        error: `Impossible de supprimer ce produit car il a ${brokenProductsCount.count} produit(s) cassé(s) associé(s). Supprimez d'abord ces produits cassés.` 
      }, { status: 400 })
    }
    
    // Delete the product
    const result = db.prepare("DELETE FROM products WHERE id = ?").run(productId)
    
    if (result.changes === 0) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 })
    }
    
    return NextResponse.json({ message: "Produit supprimé avec succès" })
  } catch (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression du produit" }, { status: 500 })
  }
}
