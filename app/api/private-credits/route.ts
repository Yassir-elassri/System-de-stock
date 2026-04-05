import { type NextRequest, NextResponse } from "next/server"
import db, { initializeDatabase } from "@/lib/database"

initializeDatabase()

export async function GET() {
  try {
    const privateCredits = db.prepare(`
      SELECT 
        pc.id, 
        pc.client_id,
        c.name as person_name,
        pc.amount, 
        pc.description, 
        pc.credit_date, 
        pc.due_date,
        pc.created_at,
        COALESCE(pc.status, 'active') as status
      FROM private_credits pc
      LEFT JOIN clients c ON pc.client_id = c.id
      ORDER BY pc.credit_date DESC
    `).all()
    return NextResponse.json(privateCredits)
  } catch (error) {
    console.error("Error fetching private credits:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des crédits privés" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { client_id, amount, description, credit_date, due_date } = body
    
    if (!client_id || !amount || !credit_date) {
      return NextResponse.json({ error: "Champs obligatoires manquants (client_id, amount, credit_date)" }, { status: 400 })
    }

    const stmt = db.prepare(`
      INSERT INTO private_credits (client_id, amount, description, credit_date, due_date, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `)
    
    const result = stmt.run(
      client_id,
      amount,
      description || null,
      credit_date,
      due_date || null
    )

    const newPrivateCredit = db.prepare(`
      SELECT 
        pc.id, 
        pc.client_id,
        c.name as person_name,
        pc.amount, 
        pc.description, 
        pc.credit_date, 
        pc.due_date,
        pc.created_at,
        COALESCE(pc.status, 'active') as status
      FROM private_credits pc
      LEFT JOIN clients c ON pc.client_id = c.id
      WHERE pc.id = ?
    `).get(result.lastInsertRowid)

    return NextResponse.json(newPrivateCredit, { status: 201 })
  } catch (error) {
    console.error("Error creating private credit:", error)
    return NextResponse.json({ error: "Erreur lors de la création du crédit privé" }, { status: 500 })
  }
} 