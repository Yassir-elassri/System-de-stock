import { type NextRequest, NextResponse } from "next/server"
import db, { initializeDatabase } from "@/lib/database"
import { validatePurchaseTotalMatchesLines } from "@/lib/purchase-calculations"

// Initialize database on first API call
initializeDatabase()

/** Next.js 15+: `params` in route handlers may be a Promise. */
async function resolveRouteId(
  params: { id: string } | Promise<{ id: string }>,
): Promise<number | null> {
  const resolved = await Promise.resolve(params)
  const n = parseInt(resolved.id, 10)
  return Number.isFinite(n) ? n : null
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const purchaseId = await resolveRouteId(context.params)
    
    if (purchaseId === null) {
      return NextResponse.json({ error: "ID d'achat invalide" }, { status: 400 })
    }

    // Check if purchase exists
    const existingPurchase = db.prepare("SELECT id FROM purchases WHERE id = ?").get(purchaseId)
    if (!existingPurchase) {
      return NextResponse.json({ error: "Achat non trouvé" }, { status: 404 })
    }

    // Start a transaction to ensure data consistency
    const transaction = db.transaction(() => {
      // First, delete all related purchase items
      const deleteItemsStmt = db.prepare("DELETE FROM purchase_items WHERE purchase_id = ?")
      deleteItemsStmt.run(purchaseId)
      
      // Delete any stock movements that reference this purchase
      const deleteStockMovementsStmt = db.prepare("DELETE FROM stock_movements WHERE reference_id = ? AND reference_type = 'purchase'")
      deleteStockMovementsStmt.run(purchaseId)
      
      // Delete any supplier credits that reference this purchase
      const deleteSupplierCreditsStmt = db.prepare("DELETE FROM supplier_credits WHERE reference_id = ? AND credit_type = 'purchase'")
      deleteSupplierCreditsStmt.run(purchaseId)
      
      // Then delete the purchase
      const deletePurchaseStmt = db.prepare("DELETE FROM purchases WHERE id = ?")
      const result = deletePurchaseStmt.run(purchaseId)
      
      return result
    })

    // Execute the transaction
    const result = transaction()

    if (result.changes === 0) {
      return NextResponse.json({ error: "Aucun achat supprimé" }, { status: 404 })
    }

    return NextResponse.json({ message: "Achat supprimé avec succès" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting purchase:", error)
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"
    return NextResponse.json({ 
      error: "Erreur lors de la suppression de l'achat",
      details: errorMessage 
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const purchaseId = await resolveRouteId(context.params)
    console.log("PUT request received for purchase ID:", purchaseId)
    
    if (purchaseId === null) {
      return NextResponse.json({ error: "ID d'achat invalide" }, { status: 400 })
    }

    const body = await request.json()
    console.log("Request body:", body)
    const { supplier_id, total_amount, payment_method, notes, invoice_number, purchase_date, status, items } = body

    const totalCheck = validatePurchaseTotalMatchesLines(total_amount, items)
    if (!totalCheck.ok) {
      return NextResponse.json({ error: totalCheck.message }, { status: 400 })
    }

    // Check if purchase exists
    const existingPurchase = db.prepare("SELECT id FROM purchases WHERE id = ?").get(purchaseId)
    if (!existingPurchase) {
      return NextResponse.json({ error: "Achat non trouvé" }, { status: 404 })
    }

    // Start a transaction to ensure data consistency
    console.log("Starting transaction for purchase update")
    const transaction = db.transaction(() => {
      // Update the purchase
      const stmt = db.prepare(`
        UPDATE purchases 
        SET supplier_id = ?, total_amount = ?, payment_method = ?, notes = ?, 
            invoice_number = ?, purchase_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      
      const result = stmt.run(
        supplier_id,
        total_amount,
        payment_method,
        notes || null,
        invoice_number || null,
        purchase_date || null,
        status || 'pending',
        purchaseId
      )

      // If items are provided, update them
      if (items && Array.isArray(items) && items.length > 0) {
        // First, delete existing items
        const deleteItemsStmt = db.prepare("DELETE FROM purchase_items WHERE purchase_id = ?")
        deleteItemsStmt.run(purchaseId)
        
        // Prepare statements for product management
        const findProductStmt = db.prepare("SELECT id, current_stock FROM products WHERE name = ?")
        const createProductStmt = db.prepare(`
          INSERT INTO products (
            name, description, purchase_price, selling_price, current_stock, minimum_stock, unit, category
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        const updateProductStockStmt = db.prepare("UPDATE products SET current_stock = ? WHERE id = ?")
        
        // Insert new items
        const insertItemStmt = db.prepare(`
          INSERT INTO purchase_items (
            purchase_id, product_id, quantity, unit_price, additional_price, total_price, designation, avance, reste
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        
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
      
      return result
    })

    // Execute the transaction
    console.log("Executing transaction")
    const result = transaction()
    console.log("Transaction result:", result)

    if (result.changes === 0) {
      return NextResponse.json({ error: "Aucune modification effectuée" }, { status: 400 })
    }

    // Return the updated purchase with supplier name and items
    console.log("Fetching updated purchase data")
    const updatedPurchase = db.prepare(`
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

    // Get the updated items with calculated amounts
    const updatedItems = db.prepare(`
      SELECT 
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
      WHERE pi.purchase_id = ?
    `).all(purchaseId)

    return NextResponse.json({
      ...(updatedPurchase as any),
      items: updatedItems
    }, { status: 200 })
  } catch (error) {
    console.error("Error updating purchase:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    console.error("Error message:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Erreur lors de la modification de l'achat" }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const purchaseId = await resolveRouteId(context.params)
    
    if (purchaseId === null) {
      return NextResponse.json({ error: "ID d'achat invalide" }, { status: 400 })
    }

    // Get the specific purchase with supplier name
    const purchase = db.prepare(`
      SELECT p.*, s.name as supplier_name
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `).get(purchaseId)

    if (!purchase) {
      return NextResponse.json({ error: "Achat non trouvé" }, { status: 404 })
    }

    // Get the purchase items
    const items = db.prepare(`
      SELECT 
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
      WHERE pi.purchase_id = ?
    `).all(purchaseId)

    const purchaseWithItems = {
      ...purchase,
      items: items
    }

    return NextResponse.json(purchaseWithItems)
  } catch (error) {
    console.error("Error fetching purchase:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération de l'achat" }, { status: 500 })
  }
} 

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const body = await request.json()
    const { items } = body
    
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Items requis" }, { status: 400 })
    }
    
    const purchaseId = await resolveRouteId(context.params)
    if (purchaseId === null) {
      return NextResponse.json({ error: "ID d'achat invalide" }, { status: 400 })
    }
    
    // Check if purchase exists
    const existingPurchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId)
    if (!existingPurchase) {
      return NextResponse.json({ error: "Achat non trouvé" }, { status: 404 })
    }
    
    // Start a transaction to ensure data consistency
    const transaction = db.transaction(() => {
      // Prepare statements for product management
      const findProductStmt = db.prepare("SELECT id, current_stock FROM products WHERE name = ?")
      const createProductStmt = db.prepare(`
        INSERT INTO products (
          name, description, purchase_price, selling_price, current_stock, minimum_stock, unit, category
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const updateProductStockStmt = db.prepare("UPDATE products SET current_stock = ? WHERE id = ?")
      
      // Add new items
      const insertItemStmt = db.prepare(`
        INSERT INTO purchase_items (
          purchase_id, product_id, quantity, unit_price, additional_price, total_price, designation, avance, reste
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      let totalItemsAmount = 0
      items.forEach((item: any) => {
        if (item.designation && item.quantity && item.unit_price) {
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
          
          const baseAmount = parseFloat(item.quantity) * parseFloat(item.unit_price)
          const additionalPrice = parseFloat(item.additional_price || '0')
          const totalPrice = baseAmount + additionalPrice
          const avance = parseFloat(item.avance || '0')
          const reste = parseFloat(item.reste || '0')
          insertItemStmt.run(
            purchaseId,
            productId,
            parseFloat(item.quantity),
            parseFloat(item.unit_price),
            parseFloat(item.additional_price || '0'),
            totalPrice,
            item.designation,
            avance,
            reste
          )
          totalItemsAmount += totalPrice
        }
      })
      
      // Update the purchase total amount to match items
      if (totalItemsAmount > 0) {
        const updatePurchaseStmt = db.prepare(`
          UPDATE purchases 
          SET total_amount = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        updatePurchaseStmt.run(totalItemsAmount, purchaseId)
      }
      
      return { success: true, itemsAdded: items.length, newTotal: totalItemsAmount }
    })
    
    // Execute the transaction
    const result = transaction()
    
    // Return the updated purchase with items
    const updatedPurchase = db.prepare(`
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

    // Get the updated items with calculated amounts
    const updatedItems = db.prepare(`
      SELECT 
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
      WHERE pi.purchase_id = ?
    `).all(purchaseId)
    
    return NextResponse.json({
      ...(updatedPurchase as any),
      items: updatedItems
    })
  } catch (error) {
    console.error("Error adding items to purchase:", error)
    return NextResponse.json({ error: "Erreur lors de l'ajout d'articles" }, { status: 500 })
  }
} 