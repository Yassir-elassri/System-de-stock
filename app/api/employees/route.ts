import { type NextRequest, NextResponse } from "next/server"
import db, { initializeDatabase } from "@/lib/database"

initializeDatabase()

export async function GET() {
  try {
    const employees = db.prepare(`
      SELECT * FROM employees
      ORDER BY created_at DESC
    `).all()
    return NextResponse.json(employees)
  } catch (error) {
    console.error("Error fetching employees:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des employés" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, role, salary, hire_date, phone, address, is_active } = body
    
    if (!name || !role || !salary || !hire_date || !phone) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 })
    }

    const stmt = db.prepare(`
      INSERT INTO employees (name, role, salary, hire_date, phone, address, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(
      name,
      role,
      salary,
      hire_date,
      phone,
      address || null,
      is_active ? 1 : 0
    )

    const newEmployee = db.prepare(`
      SELECT * FROM employees WHERE id = ?
    `).get(result.lastInsertRowid)

    return NextResponse.json(newEmployee, { status: 201 })
  } catch (error) {
    console.error("Error creating employee:", error)
    return NextResponse.json({ error: "Erreur lors de la création de l'employé" }, { status: 500 })
  }
} 