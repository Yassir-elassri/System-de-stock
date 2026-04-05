import { type NextRequest, NextResponse } from "next/server"
import db, { initializeDatabase } from "@/lib/database"
import { validatePurchaseTotalMatchesLines } from "@/lib/purchase-calculations"

initializeDatabase()

export async function GET() {
  try {
    // First get all purchases with supplier info
    const purchases = db.prepare(`
      SELECT 
        p.*, 
        s.name as supplier_name,
        s.id as supplier_id,
        COALESCE(COUNT(pi.id), 0) as items_count,
        COALESCE(SUM(pi.total_price), 0) as items_total,
        COALESCE(SUM(pi.quantity), 0) as total_quantity,
        COALESCE(AVG(pi.unit_price), 0) as avg_unit_price
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      GROUP BY p.id, p.supplier_id, p.total_amount, p.payment_method, p.notes, p.purchase_date, p.invoice_number, p.status, s.name
      ORDER BY p.purchase_date DESC
    `).all() as any[]

    if (purchases.length === 0) {
      return NextResponse.json([])
    }

    const purchaseIds = purchases.map((p) => p.id)
    const chunkSize = 900
    const allItems: any[] = []
    const itemSql = `
      SELECT
        pi.purchase_id,
        pi.id,
        pi.quantity,
        pi.unit_price,
        pi.additional_price,
        pi.total_price,
        COALESCE(NULLIF(TRIM(pi.designation), ''), p.name, 'Produit') as designation,
        (pi.quantity * pi.unit_price) as amount,
        COALESCE(pi.avance, '0.00') as avance,
        COALESCE(pi.reste, (pi.quantity * pi.unit_price)) as reste,
        p.id as product_id,
        p.current_stock as product_stock
      FROM purchase_items pi
      LEFT JOIN products p ON pi.product_id = p.id
      WHERE pi.purchase_id IN (
    `
    for (let i = 0; i < purchaseIds.length; i += chunkSize) {
      const chunk = purchaseIds.slice(i, i + chunkSize)
      const ph = chunk.map(() => "?").join(",")
      const rows = db.prepare(`${itemSql}${ph})`).all(...chunk) as any[]
      allItems.push(...rows)
    }

    const itemsByPurchaseId = new Map<number, any[]>()
    for (const row of allItems) {
      const { purchase_id, ...item } = row
      const list = itemsByPurchaseId.get(purchase_id) ?? []
      list.push(item)
      itemsByPurchaseId.set(purchase_id, list)
    }

    const purchasesWithItems = purchases.map((purchase: any) => ({
      ...purchase,
      items: itemsByPurchaseId.get(purchase.id) ?? [],
    }))

    return NextResponse.json(purchasesWithItems)
  } catch (error) {
    console.error("Error fetching purchases:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des achats" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplier_id, total_amount, payment_method, notes, invoice_number, purchase_date, items } = body
    if (!supplier_id || !total_amount || !payment_method) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 })
    }

    const totalCheck = validatePurchaseTotalMatchesLines(total_amount, items)
    if (!totalCheck.ok) {
      return NextResponse.json({ error: totalCheck.message }, { status: 400 })
    }

    // Start a transaction to ensure data consistency
    const transaction = db.transaction(() => {
      // Insert the purchase
      const stmt = db.prepare(`
        INSERT INTO purchases (
          supplier_id, total_amount, payment_method, notes, invoice_number, purchase_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `)
      const result = stmt.run(
        supplier_id,
        total_amount,
        payment_method,
        notes || null,
        invoice_number || null,
        purchase_date || null
      )
      
      const purchaseId = result.lastInsertRowid
      
      // Insert purchase items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        const insertItemStmt = db.prepare(`
          INSERT INTO purchase_items (
            purchase_id, product_id, quantity, unit_price, additional_price, total_price, designation, avance, reste
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        
        // Prepare statements for product management
        const findProductStmt = db.prepare("SELECT id, current_stock FROM products WHERE name = ?")
        const createProductStmt = db.prepare(`
          INSERT INTO products (
            name, description, purchase_price, selling_price, current_stock, minimum_stock, unit, category
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        const updateProductStockStmt = db.prepare("UPDATE products SET current_stock = ? WHERE id = ?")
        
        items.forEach((item: any) => {
          if (item.quantity && item.unit_price) {
            let productId: number
            
            // Check if product exists by name
            const existingProduct = findProductStmt.get(item.designation) as any
            
            if (existingProduct && existingProduct.id) {
              // Product exists, update stock
              productId = existingProduct.id
              const newStock = existingProduct.current_stock + parseFloat(item.quantity)
              updateProductStockStmt.run(newStock, productId)
            } else {
              // Product doesn't exist, create it
              const result = createProductStmt.run(
                item.designation, // name
                `Produit acheté le ${new Date().toLocaleDateString()}`, // description
                parseFloat(item.unit_price), // purchase_price
                parseFloat(item.unit_price) * 1.2, // selling_price (20% markup)
                parseFloat(item.quantity), // current_stock
                0, // minimum_stock
                'pièce', // unit
                'Achat' // category
              )
              productId = result.lastInsertRowid as number
            }
            
            // Calculate total price including additional_price
            const baseAmount = parseFloat(item.quantity) * parseFloat(item.unit_price)
            const additionalPrice = parseFloat(item.additional_price || '0')
            const totalPrice = baseAmount + additionalPrice
            
            
            // Insert purchase item with the real product_id
            insertItemStmt.run(
              purchaseId,
              productId,
              parseFloat(item.quantity),
              parseFloat(item.unit_price),
              parseFloat(item.additional_price || '0'),
              totalPrice,
              item.designation,
              parseFloat(item.avance || '0'),
              parseFloat(item.reste || '0')
            )
          }
        })
      }
      
      return purchaseId
    })
    
    // Execute the transaction
    const purchaseId = transaction()
    
    // Return the new purchase with supplier name and items count
    const newPurchase = db.prepare(`
      SELECT 
        p.*, 
        s.name as supplier_name,
        s.id as supplier_id,
        COALESCE(COUNT(pi.id), 0) as items_count,
        COALESCE(SUM(pi.total_price), 0) as items_total,
        COALESCE(SUM(pi.quantity), 0) as total_quantity,
        COALESCE(AVG(pi.unit_price), 0) as avg_unit_price
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      WHERE p.id = ?
      GROUP BY p.id, p.supplier_id, p.total_amount, p.payment_method, p.notes, p.purchase_date, p.invoice_number, p.status, s.name
    `).get(purchaseId)
    
    return NextResponse.json(newPurchase, { status: 201 })
  } catch (error) {
    console.error("Error creating purchase:", error)
    return NextResponse.json({ error: "Erreur lors de la création de l'achat" }, { status: 500 })
  }
} 