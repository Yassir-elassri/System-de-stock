import { type NextRequest, NextResponse } from "next/server"
import db, { initializeDatabase } from "@/lib/database"

initializeDatabase()

class SaleValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SaleValidationError"
  }
}

export async function GET() {
  try {
    const sales = db.prepare(`
      SELECT s.*, c.name as client_name
      FROM sales s
      LEFT JOIN clients c ON s.client_id = c.id
      ORDER BY s.sale_date DESC
    `).all() as any[]

    if (sales.length === 0) {
      return NextResponse.json([])
    }

    const saleIds = sales.map((s) => s.id)
    const chunkSize = 900
    const allItems: any[] = []
    const itemQuery = `
      SELECT
        si.sale_id,
        si.id,
        si.quantity,
        si.unit_price,
        si.additional_price,
        si.total_price,
        p.name as product_name,
        p.id as product_id
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id IN (
    `
    for (let i = 0; i < saleIds.length; i += chunkSize) {
      const chunk = saleIds.slice(i, i + chunkSize)
      const ph = chunk.map(() => "?").join(",")
      const rows = db.prepare(`${itemQuery}${ph})`).all(...chunk) as any[]
      allItems.push(...rows)
    }

    const itemsBySaleId = new Map<number, any[]>()
    for (const row of allItems) {
      const { sale_id, ...item } = row
      const list = itemsBySaleId.get(sale_id) ?? []
      list.push(item)
      itemsBySaleId.set(sale_id, list)
    }

    const salesWithItems = sales.map((sale: any) => ({
      ...sale,
      items: itemsBySaleId.get(sale.id) ?? [],
    }))

    return NextResponse.json(salesWithItems)
  } catch (error) {
    console.error("Error fetching sales:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des ventes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { client_id, total_amount, payment_method, cash_amount, credit_amount, notes, items } = body
    if (!total_amount || !payment_method) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 })
    }

    // Validate mixed payment amounts
    if (payment_method === 'mixed') {
      const calculatedCashAmount = cash_amount || 0
      const calculatedCreditAmount = credit_amount || 0
      if (Math.abs((calculatedCashAmount + calculatedCreditAmount) - total_amount) > 0.01) {
        return NextResponse.json({ 
          error: "Le montant payé en espèces plus le crédit doit égaler le montant total" 
        }, { status: 400 })
      }
    }

    // Start transaction
    const transaction = db.transaction(() => {
      if (items && Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const product = db
            .prepare("SELECT name, current_stock FROM products WHERE id = ?")
            .get(item.product_id) as { name: string; current_stock: number } | undefined
          if (!product) {
            throw new SaleValidationError(`Produit avec l'ID ${item.product_id} non trouvé`)
          }
          if (product.current_stock < item.quantity) {
            throw new SaleValidationError(
              `Stock insuffisant pour "${product.name}". Disponible: ${product.current_stock}, Demandé: ${item.quantity}`,
            )
          }
        }
      }

      // Insert the sale
      const saleStmt = db.prepare(`
        INSERT INTO sales (
          client_id, total_amount, payment_method, cash_amount, credit_amount, notes
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      
      // Calculate cash_amount and credit_amount based on payment_method
      let finalCashAmount = 0
      let finalCreditAmount = 0
      
      if (payment_method === 'cash') {
        finalCashAmount = total_amount
        finalCreditAmount = 0
      } else if (payment_method === 'credit') {
        finalCashAmount = 0
        finalCreditAmount = total_amount
      } else if (payment_method === 'mixed') {
        finalCashAmount = cash_amount || 0
        finalCreditAmount = credit_amount || 0
      }
      
      const saleResult = saleStmt.run(
        client_id || null,
        total_amount,
        payment_method,
        finalCashAmount,
        finalCreditAmount,
        notes || null
      )
      const saleId = saleResult.lastInsertRowid

      // If there's a credit amount and client_id, create a client credit record
      if (finalCreditAmount > 0 && client_id) {
        const creditStmt = db.prepare(`
          INSERT INTO client_credits (
            client_id, amount, credit_type, reference_id, description, credit_date
          ) VALUES (?, ?, ?, ?, ?, date('now'))
        `)
        creditStmt.run(
          client_id,
          finalCreditAmount,
          'sale',
          saleId,
          `Crédit de vente #${saleId}${payment_method === 'mixed' ? ' (paiement mixte)' : ''}`
        )
      }

      // Create cash register entries
      if (finalCashAmount > 0) {
        const cashRegisterStmt = db.prepare(`
          INSERT INTO cash_register (type, amount, payment_method, description, client_id)
          VALUES (?, ?, ?, ?, ?)
        `)
        cashRegisterStmt.run(
          'sale',
          finalCashAmount,
          'cash',
          `Vente #${saleId}${payment_method === 'mixed' ? ' (portion espèces)' : ''}`,
          client_id || null
        )
      }

      if (finalCreditAmount > 0) {
        const creditRegisterStmt = db.prepare(`
          INSERT INTO cash_register (type, amount, payment_method, description, client_id)
          VALUES (?, ?, ?, ?, ?)
        `)
        creditRegisterStmt.run(
          'sale',
          finalCreditAmount,
          'credit',
          `Vente #${saleId}${payment_method === 'mixed' ? ' (portion crédit)' : ''}`,
          client_id || null
        )
      }

      if (items && Array.isArray(items) && items.length > 0) {
        const itemStmt = db.prepare(`
          INSERT INTO sale_items (
            sale_id, product_id, quantity, unit_price, additional_price, total_price
          ) VALUES (?, ?, ?, ?, ?, ?)
        `)
        
        // Update stock for each item
        const updateStockStmt = db.prepare(`
          UPDATE products 
          SET current_stock = current_stock - ? 
          WHERE id = ?
        `)
        
        for (const item of items) {
          const basePrice = item.quantity * item.unit_price
          const additionalPrice = item.additional_price || 0
          const totalPrice = basePrice + additionalPrice

          itemStmt.run(saleId, item.product_id, item.quantity, item.unit_price, additionalPrice, totalPrice)

          updateStockStmt.run(item.quantity, item.product_id)

          const updatedProduct = db
            .prepare("SELECT name, current_stock, minimum_stock FROM products WHERE id = ?")
            .get(item.product_id) as { name: string; current_stock: number; minimum_stock: number } | undefined
          if (updatedProduct && updatedProduct.current_stock < updatedProduct.minimum_stock) {
            console.warn(
              `Product "${updatedProduct.name}" stock (${updatedProduct.current_stock}) is below minimum (${updatedProduct.minimum_stock})`,
            )
          }
        }
      }

      // Return the new sale with client name
      const newSale = db.prepare(`
        SELECT s.*, c.name as client_name
        FROM sales s
        LEFT JOIN clients c ON s.client_id = c.id
        WHERE s.id = ?
      `).get(saleId)

      return newSale
    })

    const newSale = transaction()
    return NextResponse.json(newSale, { status: 201 })
  } catch (error) {
    if (error instanceof SaleValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Error creating sale:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la création de la vente",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
} 