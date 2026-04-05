"use client"

import { useState, useEffect } from "react"
import { Employee } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Users, DollarSign, Calendar, UserCheck, Phone, Mail, Edit, Eye, Trash2, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

// Mock data - in real app this would come from API
const mockEmployees = [
  {
    id: 1,
    name: "Ahmed Benali",
    role: "Vendeur",
    salary: 3500.00,
    hire_date: "2023-01-15",
    phone: "0612345678",
    address: "123 Rue Hassan II, Casablanca",
    is_active: true
  },
  {
    id: 2,
    name: "Fatima Zahra",
    role: "Caissière",
    salary: 3200.00,
    hire_date: "2023-03-20",
    phone: "0698765432",
    address: "456 Avenue Mohammed V, Rabat",
    is_active: true
  },
  {
    id: 3,
    name: "Mohammed Alami",
    role: "Gestionnaire",
    salary: 4500.00,
    hire_date: "2022-08-10",
    phone: "0687654321",
    address: "789 Boulevard Al Massira, Fès",
    is_active: true
  },
  {
    id: 4,
    name: "Amina Tazi",
    role: "Vendeur",
    salary: 3300.00,
    hire_date: "2023-06-05",
    phone: "0676543210",
    address: "321 Rue Ibn Khaldoun, Marrakech",
    is_active: false
  }
]

const roleOptions = [
  { value: "all", label: "Tous les rôles" },
  { value: "Vendeur", label: "Vendeur" },
  { value: "Caissière", label: "Caissière" },
  { value: "Gestionnaire", label: "Gestionnaire" },
  { value: "Magasinier", label: "Magasinier" }
]

export default function EmployeesPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedRole, setSelectedRole] = useState("all")
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    salary: "",
    hire_date: "",
    phone: "",
    address: "",
    is_active: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: "",
    role: "",
    salary: "",
    hire_date: "",
    phone: "",
    address: "",
    is_active: true
  })

  // Fetch employees from API
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/employees')
        if (response.ok) {
          const data = await response.json()
          setEmployees(data)
        } else {
          console.error('Error fetching employees')
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEmployees()
  }, [])

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.role.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === "all" || employee.role === selectedRole
    return matchesSearch && matchesRole
  })

  const totalEmployees = employees.length
  const activeEmployees = employees.filter(e => e.is_active).length
  const totalSalary = employees.filter(e => e.is_active).reduce((sum, e) => sum + e.salary, 0)
  const averageSalary = activeEmployees > 0 ? totalSalary / activeEmployees : 0

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 
      <Badge variant="default">Actif</Badge> : 
      <Badge variant="secondary">Inactif</Badge>
  }

  // Button handlers
  const handleNewEmployee = () => {
    setShowModal(true)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.role || !formData.salary || !formData.hire_date || !formData.phone) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          salary: parseFloat(formData.salary),
          hire_date: formData.hire_date,
          phone: formData.phone,
          address: formData.address,
          is_active: formData.is_active
        }),
      })

      if (response.ok) {
        const newEmployee = await response.json()
        setEmployees([newEmployee, ...employees])
        
        // Reset form and close modal
        setFormData({
          name: "",
          role: "",
          salary: "",
          hire_date: "",
          phone: "",
          address: "",
          is_active: true
        })
        setShowModal(false)
      } else {
        console.error('Error creating employee')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewEmployee = (employee: any) => {
    // Show employee details in an alert for now
    alert(`Détails de l'employé:\nNom: ${employee.name}\nRôle: ${employee.role}\nTéléphone: ${employee.phone}\nAdresse: ${employee.address}\nDate d'embauche: ${new Date(employee.hire_date).toLocaleDateString('fr-FR')}\nSalaire: ${employee.salary.toFixed(2)} DH\nStatut: ${employee.is_active ? 'Actif' : 'Inactif'}`)
  }

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setEditFormData({
      name: employee.name,
      role: employee.role,
      salary: employee.salary.toString(),
      hire_date: employee.hire_date,
      phone: employee.phone || "",
      address: employee.address || "",
      is_active: employee.is_active
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEditEmployee = async () => {
    if (!selectedEmployee) return
    
    if (!editFormData.name || !editFormData.role || !editFormData.salary || !editFormData.hire_date || !editFormData.phone) {
      toast.error("Tous les champs obligatoires doivent être remplis")
      return
    }

    if (parseFloat(editFormData.salary) <= 0) {
      toast.error("Le salaire doit être supérieur à 0")
      return
    }

    try {
      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFormData.name,
          role: editFormData.role,
          salary: parseFloat(editFormData.salary),
          hire_date: editFormData.hire_date,
          phone: editFormData.phone,
          address: editFormData.address,
          is_active: editFormData.is_active
        })
      })

      if (res.ok) {
        const updatedEmployee = await res.json()
        
        // Update local state
        setEmployees(employees.map(emp => 
          emp.id === selectedEmployee.id ? updatedEmployee : emp
        ))
        
        setIsEditModalOpen(false)
        setEditFormData({
          name: "",
          role: "",
          salary: "",
          hire_date: "",
          phone: "",
          address: "",
          is_active: true
        })
        toast.success("Employé modifié avec succès")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Erreur lors de la modification de l'employé")
      }
    } catch (error) {
      console.error("Error updating employee:", error)
      toast.error("Erreur lors de la modification de l'employé")
    }
  }

  const handleSalaryManagement = (employee: any) => {
    // For now, show an alert. You can create a salary management page later
    alert(`Gestion du salaire pour ${employee.name}\nSalaire actuel: ${employee.salary.toFixed(2)} DH`)
  }

  const handleToggleStatus = (employee: any) => {
    if (confirm(`Êtes-vous sûr de vouloir ${employee.is_active ? 'désactiver' : 'activer'} ${employee.name} ?`)) {
      setEmployees(employees.map(emp => 
        emp.id === employee.id 
          ? { ...emp, is_active: !emp.is_active }
          : emp
      ))
    }
  }

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'employé ${employee.name} ?`)) return
    
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "DELETE"
      })
      
      if (res.ok) {
        setEmployees(employees.filter(emp => emp.id !== employee.id))
        toast.success("Employé supprimé avec succès")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Erreur lors de la suppression de l'employé")
      }
    } catch (error) {
      console.error("Error deleting employee:", error)
      toast.error("Erreur lors de la suppression de l'employé")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Personnel</h1>
        <p className="text-slate-600">Gestion des employés et du personnel</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Employés</p>
                <p className="text-2xl font-bold text-blue-600">{totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Actifs</p>
                <p className="text-2xl font-bold text-green-600">{activeEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Salaire Total</p>
                <p className="text-2xl font-bold text-orange-600">{totalSalary.toFixed(2)} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Salaire Moyen</p>
                <p className="text-2xl font-bold text-purple-600">{averageSalary.toFixed(2)} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher un employé..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Rôle" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="flex items-center gap-2" onClick={handleNewEmployee}>
          <Plus className="h-4 w-4" />
          Nouvel Employé
        </Button>
      </div>

      {/* Liste des employés */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Employés</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Chargement des employés...</div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun employé trouvé
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Nom</th>
                  <th className="text-left p-2">Rôle</th>
                  <th className="text-left p-2">Adresse</th>
                  <th className="text-left p-2">Téléphone</th>
                  <th className="text-left p-2">Date d&apos;embauche</th>
                  <th className="text-right p-2">Salaire</th>
                  <th className="text-center p-2">Statut</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-medium">{employee.name}</td>
                    <td className="p-2">{employee.role}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm truncate max-w-[150px]" title={employee.address}>
                          {employee.address || "Non spécifiée"}
                        </span>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {employee.phone}
                      </div>
                    </td>
                    <td className="p-2">
                      {new Date(employee.hire_date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="text-right p-2 font-semibold">{employee.salary.toFixed(2)} DH</td>
                    <td className="text-center p-2">
                      {getStatusBadge(employee.is_active)}
                    </td>
                    <td className="text-center p-2">
                      <div className="flex gap-2 justify-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewEmployee(employee)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditEmployee(employee)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSalaryManagement(employee)}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleStatus(employee)}
                          className={employee.is_active ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                        >
                          {employee.is_active ? "Désactiver" : "Activer"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteEmployee(employee)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Modal for New Employee */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvel Employé</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom Complet</Label>
                <Input
                  id="name"
                  placeholder="Nom et prénom"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.slice(1).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary">Salaire (DH)</Label>
                <Input
                  id="salary"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.salary}
                  onChange={(e) => handleInputChange('salary', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hire_date">Date d&apos;embauche</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => handleInputChange('hire_date', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                placeholder="06XXXXXXXX"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                placeholder="Adresse complète..."
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_active">Statut</Label>
              <Select value={formData.is_active ? "true" : "false"} onValueChange={(value) => handleInputChange('is_active', value === "true" ? "true" : "false")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Actif</SelectItem>
                  <SelectItem value="false">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Création..." : "Créer l'Employé"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Annuler
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal modifier employé */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;Employé</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">Nom Complet *</Label>
                <Input
                  id="edit_name"
                  placeholder="Nom et prénom"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_role">Rôle *</Label>
                <Select value={editFormData.role} onValueChange={value => setEditFormData({ ...editFormData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gestionnaire">Gestionnaire</SelectItem>
                    <SelectItem value="Vendeur">Vendeur</SelectItem>
                    <SelectItem value="Caissière">Caissière</SelectItem>
                    <SelectItem value="Responsable Stock">Responsable Stock</SelectItem>
                    <SelectItem value="Comptable">Comptable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_salary">Salaire *</Label>
                <Input
                  id="edit_salary"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Salaire en DH"
                  value={editFormData.salary}
                  onChange={(e) => setEditFormData({ ...editFormData, salary: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_hire_date">Date d&apos;embauche *</Label>
                <Input
                  id="edit_hire_date"
                  type="date"
                  value={editFormData.hire_date}
                  onChange={(e) => setEditFormData({ ...editFormData, hire_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_phone">Téléphone *</Label>
              <Input
                id="edit_phone"
                placeholder="Numéro de téléphone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_address">Adresse</Label>
              <Textarea
                id="edit_address"
                placeholder="Adresse complète"
                rows={2}
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_status">Statut</Label>
              <Select value={editFormData.is_active.toString()} onValueChange={value => setEditFormData({ ...editFormData, is_active: value === 'true' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Actif</SelectItem>
                  <SelectItem value="false">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveEditEmployee}>
                Modifier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 