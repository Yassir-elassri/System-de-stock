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
    const { client_id, payment_method, cash_amount, credit_amount, notes, items } = body

    // Check if sale exists
    const existingSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as any
    if (!existingSale) {
      return NextResponse.json({ error: "Vente non trouvée" }, { status: 404 })
    }

    // Validate mixed payment amounts
    if (payment_method === 'mixed') {
      const calculatedCashAmount = parseFloat(cash_amount) || 0
      const calculatedCreditAmount = parseFloat(credit_amount) || 0
      if (Math.abs((calculatedCashAmount + calculatedCreditAmount) - existingSale.total_amount) > 0.01) {
        return NextResponse.json({ 
          error: "Le montant payé en espèces plus le crédit doit égaler le montant total" 
        }, { status: 400 })
      }
    }

    // Calculate cash_amount and credit_amount based on payment_method
    let finalCashAmount = 0
    let finalCreditAmount = 0
    
    if (payment_method === 'cash') {
      finalCashAmount = existingSale.total_amount
      finalCreditAmount = 0
    } else if (payment_method === 'credit') {
      finalCashAmount = 0
      finalCreditAmount = existingSale.total_amount
    } else if (payment_method === 'mixed') {
      finalCashAmount = parseFloat(cash_amount) || 0
      finalCreditAmount = parseFloat(credit_amount) || 0
    }

    // Start transaction
    const transaction = db.transaction(() => {
      // Update the sale
      const updateStmt = db.prepare(`
        UPDATE sales 
        SET client_id = ?, payment_method = ?, cash_amount = ?, credit_amount = ?, notes = ?
        WHERE id = ?
      `)
      updateStmt.run(
        client_id || null,
        payment_method,
        finalCashAmount,
        finalCreditAmount,
        notes || null,
        id
      )

      // Update client credits if payment method changed
      if (existingSale.credit_amount !== finalCreditAmount) {
        // Remove old client credit if it exists
        if (existingSale.credit_amount > 0 && existingSale.client_id) {
          db.prepare("DELETE FROM client_credits WHERE reference_id = ? AND credit_type = 'sale'").run(id)
        }

        // Add new client credit if needed
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
            id,
            `Crédit de vente #${id}${payment_method === 'mixed' ? ' (paiement mixte)' : ''}`
          )
        }
      }

      // Update cash register entries
      db.prepare('DELETE FROM cash_register WHERE description LIKE ?').run(`%Vente #${id}%`)

      if (finalCashAmount > 0) {
        const cashRegisterStmt = db.prepare(`
          INSERT INTO cash_register (type, amount, payment_method, description, client_id)
          VALUES (?, ?, ?, ?, ?)
        `)
        cashRegisterStmt.run(
          'sale',
          finalCashAmount,
          'cash',
          `Vente #${id}${payment_method === 'mixed' ? ' (portion espèces)' : ''}`,
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
          `Vente #${id}${payment_method === 'mixed' ? ' (portion crédit)' : ''}`,
          client_id || null
        )
      }

      // Update sale items if provided
      if (items && Array.isArray(items)) {
        // Delete existing sale items
        db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(id)
        
        // Insert new sale items
        const insertItemStmt = db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, additional_price, total_price)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        
        let newTotalAmount = 0
        items.forEach((item: any) => {
          if (item.quantity && item.unit_price) {
            insertItemStmt.run(
              id,
              item.product_id || 1,
              parseFloat(item.quantity),
              parseFloat(item.unit_price),
              parseFloat(item.additional_price || '0'),
              parseFloat(item.total_price || '0')
            )
            newTotalAmount += parseFloat(item.total_price || '0')
          }
        })
        
        // Update the sale total amount
        if (newTotalAmount > 0) {
          db.prepare('UPDATE sales SET total_amount = ? WHERE id = ?').run(newTotalAmount, id)
        }
      }

      // Return updated sale with client name
      const updatedSale = db.prepare(`
        SELECT s.*, c.name as client_name
        FROM sales s
        LEFT JOIN clients c ON s.client_id = c.id
        WHERE s.id = ?
      `).get(id)

      return updatedSale
    })

    const updatedSale = transaction()
    return NextResponse.json(updatedSale)
  } catch (error) {
    console.error("Error updating sale:", error)
    return NextResponse.json({ 
      error: "Erreur lors de la mise à jour de la vente",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 })
    }

    // Get the specific sale with client name
    const sale = db.prepare(`
      SELECT s.*, c.name as client_name
      FROM sales s
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.id = ?
    `).get(id)

    if (!sale) {
      return NextResponse.json({ error: "Vente non trouvée" }, { status: 404 })
    }

    // Get the sale items
    const items = db.prepare(`
      SELECT 
        si.id,
        si.quantity,
        si.unit_price,
        si.additional_price,
        si.total_price,
        p.name as product_name,
        p.id as product_id
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(id)

    const saleWithItems = {
      ...sale,
      items: items
    }

    console.log(`Fetched sale ${id} with ${items.length} items:`, saleWithItems)

    return NextResponse.json(saleWithItems)
  } catch (error) {
    console.error("Error fetching sale:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération de la vente" }, { status: 500 })
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

    console.log(`Attempting to delete sale with ID: ${id}`)

    // Check if sale exists
    const existingSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as any
    if (!existingSale) {
      console.log(`Sale with ID ${id} not found`)
      return NextResponse.json({ error: "Vente non trouvée" }, { status: 404 })
    }

    console.log(`Found sale:`, existingSale)

    // Check if sale_items table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sale_items'").get()
    console.log(`sale_items table exists:`, !!tableExists)

    // Start transaction to ensure data consistency
    const transaction = db.transaction(() => {
      try {
        // Check if client_credits table exists and delete related records
        const clientCreditsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='client_credits'").get()
        if (clientCreditsTableExists) {
          const clientCreditsDeleted = db.prepare("DELETE FROM client_credits WHERE reference_id = ? AND credit_type = 'sale'").run(id)
          console.log(`Deleted ${clientCreditsDeleted.changes} client credit records`)
        } else {
          console.log('client_credits table does not exist, skipping client credits deletion')
        }
        
        // Check if cash_register table exists and delete related entries
        const cashRegisterTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cash_register'").get()
        if (cashRegisterTableExists) {
          const cashRegisterDeleted = db.prepare('DELETE FROM cash_register WHERE description LIKE ?').run(`%Vente #${id}%`)
          console.log(`Deleted ${cashRegisterDeleted.changes} cash register entries`)
        } else {
          console.log('cash_register table does not exist, skipping cash register deletion')
        }
        
        // Delete sale items first (due to foreign key constraint)
        if (tableExists) {
          const saleItemsDeleted = db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(id)
          console.log(`Deleted ${saleItemsDeleted.changes} sale items`)
        } else {
          console.log('sale_items table does not exist, skipping sale items deletion')
        }

        // Delete the sale
        const stmt = db.prepare('DELETE FROM sales WHERE id = ?')
        const result = stmt.run(id)
        console.log(`Deleted sale with ${result.changes} changes`)
        
        return result
      } catch (transactionError) {
        console.error("Error in transaction:", transactionError)
        throw transactionError
      }
    })

    // Execute the transaction
    const result = transaction()

    if (result.changes === 0) {
      console.log(`No sale was deleted`)
      return NextResponse.json({ error: "Aucune vente supprimée" }, { status: 404 })
    }

    console.log(`Successfully deleted sale ${id}`)
    return NextResponse.json({ message: "Vente supprimée avec succès" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting sale:", error)
    return NextResponse.json({ 
      error: "Erreur lors de la suppression de la vente",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 