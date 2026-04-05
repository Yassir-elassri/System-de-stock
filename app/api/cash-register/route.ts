import { NextRequest, NextResponse } from "next/server"
import db, { initializeDatabase } from "@/lib/database"

initializeDatabase()

export async function GET() {
  try {
    // Fetch all cash register transactions (sales and refunds)
    const transactions = db.prepare(`
      SELECT cr.*, c.name as client_name
      FROM cash_register cr
      LEFT JOIN clients c ON cr.client_id = c.id
      ORDER BY cr.date DESC
    `).all()
    return NextResponse.json(transactions)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des transactions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, amount, payment_method, description, client_id, client_name } = body
    if (!type || !amount || !payment_method) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 })
    }
    
    // If client_name is provided but client_id is not, try to find or create the client
    let finalClientId = client_id
    if (client_name && !client_id) {
      // Try to find existing client by name
      const existingClient = db.prepare('SELECT id FROM clients WHERE name = ?').get(client_name) as any
      if (existingClient) {
        finalClientId = existingClient.id
      } else {
        // Create new client if not found
        const clientResult = db.prepare('INSERT INTO clients (name) VALUES (?)').run(client_name)
        finalClientId = clientResult.lastInsertRowid
      }
    }
    
    const stmt = db.prepare(`
      INSERT INTO cash_register (type, amount, payment_method, description, client_id)
      VALUES (?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      type,
      amount,
      payment_method,
      description || null,
      finalClientId || null
    )
    const newTransaction = db.prepare(`
      SELECT cr.*, c.name as client_name
      FROM cash_register cr
      LEFT JOIN clients c ON cr.client_id = c.id
      WHERE cr.id = ?
    `).get(result.lastInsertRowid)
    return NextResponse.json(newTransaction, { status: 201 })
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json({ error: "Erreur lors de la création de la transaction" }, { status: 500 })
  }
} 