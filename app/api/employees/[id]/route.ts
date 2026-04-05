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
    const { name, role, salary, hire_date, phone, address, is_active } = body

    if (!name || !role || !salary || !hire_date || !phone) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 })
    }

    // Check if employee exists
    const existingEmployee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as any
    if (!existingEmployee) {
      return NextResponse.json({ error: "Employé non trouvé" }, { status: 404 })
    }

    // Update the employee
    const updateStmt = db.prepare(`
      UPDATE employees 
      SET name = ?, role = ?, salary = ?, hire_date = ?, phone = ?, address = ?, is_active = ?
      WHERE id = ?
    `)
    updateStmt.run(
      name,
      role,
      salary,
      hire_date,
      phone,
      address || null,
      is_active ? 1 : 0,
      id
    )

    // Return updated employee
    const updatedEmployee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id)

    return NextResponse.json(updatedEmployee)
  } catch (error) {
    console.error("Error updating employee:", error)
    return NextResponse.json({ 
      error: "Erreur lors de la mise à jour de l'employé",
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

    // Check if employee exists
    const existingEmployee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as any
    if (!existingEmployee) {
      return NextResponse.json({ error: "Employé non trouvé" }, { status: 404 })
    }

    // Check if employee has related salary payments
    const relatedSalaryPayments = db.prepare('SELECT COUNT(*) as count FROM salary_payments WHERE employee_id = ?').get(id) as any
    if (relatedSalaryPayments.count > 0) {
      return NextResponse.json({ 
        error: "Impossible de supprimer cet employé car il a des paiements de salaire associés. Supprimez d'abord tous les paiements de salaire de cet employé." 
      }, { status: 400 })
    }

    // Delete the employee
    const stmt = db.prepare('DELETE FROM employees WHERE id = ?')
    stmt.run(id)

    return NextResponse.json({ message: "Employé supprimé avec succès" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting employee:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression de l'employé" }, { status: 500 })
  }
} 