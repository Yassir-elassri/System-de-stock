"use client"

import { useState, useEffect } from "react"
import { BusinessExpense } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Receipt, DollarSign, Calendar, TrendingUp, AlertTriangle, Eye, Edit, CreditCard, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

// Mock data - in real app this would come from API
const mockExpenses = [
  {
    id: 1,
    category: "Électricité",
    amount: 250.00,
    description: "Facture d'électricité - Janvier 2024",
    expense_date: "2024-01-15",
    status: "paid" as const,
    notes: "Consommation normale",
    created_at: "2024-01-15T10:00:00"
  },
  {
    id: 2,
    category: "Loyer",
    amount: 5000.00,
    description: "Loyer du magasin",
    expense_date: "2024-01-20",
    status: "paid" as const,
    notes: "Paiement mensuel",
    created_at: "2024-01-20T10:00:00"
  },
  {
    id: 3,
    category: "Maintenance",
    amount: 450.00,
    description: "Réparation climatisation",
    expense_date: "2024-01-18",
    status: "pending" as const,
    notes: "Urgence - panne système",
    created_at: "2024-01-18T10:00:00"
  },
  {
    id: 4,
    category: "Cuisine",
    amount: 180.50,
    description: "Équipements de cuisine",
    expense_date: "2024-01-22",
    status: "paid" as const,
    notes: "Achat ustensiles",
    created_at: "2024-01-22T10:00:00"
  },
  {
    id: 5,
    category: "Téléphone",
    amount: 120.00,
    description: "Abonnement téléphonique",
    expense_date: "2024-01-25",
    status: "pending" as const,
    notes: "Facture mensuelle",
    created_at: "2024-01-25T10:00:00"
  }
]

const categoryOptions = [
  { value: "all", label: "Toutes les catégories" },
  { value: "Électricité", label: "Électricité" },
  { value: "Loyer", label: "Loyer" },
  { value: "Eau", label: "Eau" },
  { value: "Téléphone", label: "Téléphone" },
  { value: "Maintenance", label: "Maintenance" },
  { value: "Cuisine", label: "Cuisine" },
  { value: "Aménagement", label: "Aménagement" },
  { value: "Autres", label: "Autres" }
]

export default function ExpensesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [expenses, setExpenses] = useState<BusinessExpense[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [loading, setLoading] = useState(true)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<BusinessExpense | null>(null)
  const [editFormData, setEditFormData] = useState({
    description: "",
    amount: "",
    category: "",
    expense_date: "",
    notes: ""
  })
  const [addFormData, setAddFormData] = useState({
    description: "",
    amount: "",
    category: "",
    expense_date: "",
    notes: ""
  })

  // Fetch expenses from API
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/expenses')
        if (response.ok) {
          const data = await response.json()
          setExpenses(data)
        } else {
          // Fallback to mock data if API fails
          setExpenses(mockExpenses)
        }
      } catch (error) {
        console.error('Error fetching expenses:', error)
        // Fallback to mock data
        setExpenses(mockExpenses)
      } finally {
        setLoading(false)
      }
    }

    fetchExpenses()
  }, [])

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (expense.category || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const totalExpenses = expenses.length
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const paidExpenses = expenses.filter(e => e.status === "paid").length
  const pendingExpenses = expenses.filter(e => e.status === "pending").length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default">Payé</Badge>
      case "pending":
        return <Badge variant="secondary">En attente</Badge>
      case "overdue":
        return <Badge variant="destructive">En retard</Badge>
      default:
        return <Badge variant="outline">Inconnu</Badge>
    }
  }

  const handleViewExpense = (expense: BusinessExpense) => {
    setSelectedExpense(expense)
    setIsViewModalOpen(true)
  }

  const handleEditExpense = (expense: BusinessExpense) => {
    setSelectedExpense(expense)
    setEditFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category || "",
      expense_date: expense.expense_date,
      notes: expense.notes || ""
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEditExpense = async () => {
    if (!selectedExpense) return
    
    if (!editFormData.description || !editFormData.amount || !editFormData.expense_date) {
      toast.error("Tous les champs obligatoires doivent être remplis")
      return
    }

    if (parseFloat(editFormData.amount) <= 0) {
      toast.error("Le montant doit être supérieur à 0")
      return
    }

    try {
      const res = await fetch(`/api/expenses/${selectedExpense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editFormData.description,
          amount: parseFloat(editFormData.amount),
          category: editFormData.category,
          expense_date: editFormData.expense_date,
          notes: editFormData.notes
        })
      })

      if (res.ok) {
        const updatedExpense = await res.json()
        
        // Update local state
        setExpenses(expenses.map(exp => 
          exp.id === selectedExpense.id ? updatedExpense : exp
        ))
        
        setIsEditModalOpen(false)
        setEditFormData({
          description: "",
          amount: "",
          category: "",
          expense_date: "",
          notes: ""
        })
        toast.success("Dépense modifiée avec succès")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Erreur lors de la modification de la dépense")
      }
    } catch (error) {
      console.error("Error updating expense:", error)
      toast.error("Erreur lors de la modification de la dépense")
    }
  }

  const handlePayExpense = (expense: BusinessExpense) => {
    setSelectedExpense(expense)
    setIsPayModalOpen(true)
  }

  const handleConfirmPayment = () => {
    if (!selectedExpense) return
    
    // In a real app, this would update the payment status in the database
    // For now, we'll just update the local state
    setExpenses(expenses.map(exp => 
      exp.id === selectedExpense.id ? { ...exp, status: "paid" } : exp
    ))
    
    setIsPayModalOpen(false)
    toast.success("Paiement enregistré avec succès")
  }

  const handleDeleteExpense = async (expense: BusinessExpense) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la dépense "${expense.description}" ?`)) return
    
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: "DELETE"
      })
      
      if (res.ok) {
        setExpenses(expenses.filter(exp => exp.id !== expense.id))
        toast.success("Dépense supprimée avec succès")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Erreur lors de la suppression de la dépense")
      }
    } catch (error) {
      console.error("Error deleting expense:", error)
      toast.error("Erreur lors de la suppression de la dépense")
    }
  }

  const handleAddExpense = () => {
    setAddFormData({
      description: "",
      amount: "",
      category: "",
      expense_date: new Date().toISOString().split('T')[0], // Today's date
      notes: ""
    })
    setIsAddModalOpen(true)
  }

  const handleSaveNewExpense = async () => {
    if (!addFormData.description || !addFormData.amount || !addFormData.expense_date) {
      toast.error("Tous les champs obligatoires doivent être remplis")
      return
    }

    if (parseFloat(addFormData.amount) <= 0) {
      toast.error("Le montant doit être supérieur à 0")
      return
    }

    try {
      const res = await fetch('/api/expenses', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: addFormData.description,
          amount: parseFloat(addFormData.amount),
          category: addFormData.category,
          expense_date: addFormData.expense_date,
          notes: addFormData.notes
        })
      })

      if (res.ok) {
        const newExpense = await res.json()
        
        // Add to local state
        setExpenses([newExpense, ...expenses])
        
        setIsAddModalOpen(false)
        setAddFormData({
          description: "",
          amount: "",
          category: "",
          expense_date: "",
          notes: ""
        })
        toast.success("Nouvelle dépense créée avec succès")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Erreur lors de la création de la dépense")
      }
    } catch (error) {
      console.error("Error creating expense:", error)
      toast.error("Erreur lors de la création de la dépense")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Charges</h1>
        <p className="text-slate-600">Gestion des dépenses et charges d&apos;exploitation</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Charges</p>
                <p className="text-2xl font-bold text-red-600">{totalExpenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Montant Total</p>
                <p className="text-2xl font-bold text-orange-600">{totalAmount.toFixed(2)} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Payées</p>
                <p className="text-2xl font-bold text-green-600">{paidExpenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">En Attente</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingExpenses}</p>
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
            placeholder="Rechercher une charge..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="flex items-center gap-2" onClick={handleAddExpense}>
          <Plus className="h-4 w-4" />
          Nouvelle Charge
        </Button>
      </div>

      {/* Liste des charges */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Charges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Catégorie</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-right p-2">Montant</th>
                  <th className="text-center p-2">Paiement</th>
                  <th className="text-center p-2">Statut</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-medium">{expense.category}</td>
                    <td className="p-2">{expense.description}</td>
                    <td className="p-2">
                      {new Date(expense.expense_date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="text-right p-2 font-semibold text-red-600">
                      {expense.amount.toFixed(2)} DH
                    </td>
                    <td className="text-center p-2">
                      <Badge variant="outline">
                        Espèces
                      </Badge>
                    </td>
                    <td className="text-center p-2">
                      {getStatusBadge(expense.status || "pending")}
                    </td>
                    <td className="text-center p-2">
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" size="sm" onClick={() => handleViewExpense(expense)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Détails
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditExpense(expense)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Modifier
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handlePayExpense(expense)}
                          disabled={expense.status === "paid"}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          {(expense.status || "pending") === "paid" ? "Payé" : "Payer"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteExpense(expense)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal détails */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Détails de la Dépense</DialogTitle>
          </DialogHeader>
          
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Catégorie</Label>
                  <p className="font-medium">{selectedExpense.category}</p>
                </div>
                <div>
                  <Label>Montant</Label>
                  <p className="font-medium text-lg">{selectedExpense.amount.toFixed(2)} DH</p>
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <p className="font-medium">{selectedExpense.description}</p>
              </div>
              
              <div>
                <Label>Date</Label>
                <p className="font-medium">{new Date(selectedExpense.expense_date).toLocaleDateString("fr-FR")}</p>
              </div>
              
              {selectedExpense.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedExpense.notes}</p>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button onClick={() => setIsViewModalOpen(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal modifier */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier la Dépense</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_description">Description *</Label>
              <Input
                id="edit_description"
                value={editFormData.description}
                onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Description de la dépense"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_amount">Montant *</Label>
                <Input
                  id="edit_amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editFormData.amount}
                  onChange={e => setEditFormData({ ...editFormData, amount: e.target.value })}
                  placeholder="Montant en DH"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit_category">Catégorie</Label>
                <Select value={editFormData.category} onValueChange={value => setEditFormData({ ...editFormData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Électricité">Électricité</SelectItem>
                    <SelectItem value="Loyer">Loyer</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Fournitures">Fournitures</SelectItem>
                    <SelectItem value="Internet">Internet</SelectItem>
                    <SelectItem value="Eau">Eau</SelectItem>
                    <SelectItem value="Salaire">Salaire</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_expense_date">Date *</Label>
              <Input
                id="edit_expense_date"
                type="date"
                value={editFormData.expense_date}
                onChange={e => setEditFormData({ ...editFormData, expense_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={editFormData.notes}
                onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="Notes additionnelles"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveEditExpense}>
                Modifier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal paiement */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmer le Paiement</DialogTitle>
          </DialogHeader>
          
          {selectedExpense && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg">Confirmer le paiement de :</p>
                <p className="text-xl font-bold text-green-600">
                  {selectedExpense.amount.toFixed(2)} DH
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedExpense.description}
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsPayModalOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleConfirmPayment}>
                  Confirmer le Paiement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal ajouter nouvelle charge */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouvelle Charge</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="add_description">Description *</Label>
              <Input
                id="add_description"
                value={addFormData.description}
                onChange={e => setAddFormData({ ...addFormData, description: e.target.value })}
                placeholder="Description de la dépense"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add_amount">Montant *</Label>
                <Input
                  id="add_amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={addFormData.amount}
                  onChange={e => setAddFormData({ ...addFormData, amount: e.target.value })}
                  placeholder="Montant en DH"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="add_category">Catégorie</Label>
                <Select value={addFormData.category} onValueChange={value => setAddFormData({ ...addFormData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Électricité">Électricité</SelectItem>
                    <SelectItem value="Loyer">Loyer</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Fournitures">Fournitures</SelectItem>
                    <SelectItem value="Internet">Internet</SelectItem>
                    <SelectItem value="Eau">Eau</SelectItem>
                    <SelectItem value="Salaire">Salaire</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="add_expense_date">Date *</Label>
              <Input
                id="add_expense_date"
                type="date"
                value={addFormData.expense_date}
                onChange={e => setAddFormData({ ...addFormData, expense_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="add_notes">Notes</Label>
              <Textarea
                id="add_notes"
                value={addFormData.notes}
                onChange={e => setAddFormData({ ...addFormData, notes: e.target.value })}
                placeholder="Notes additionnelles"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveNewExpense}>
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 