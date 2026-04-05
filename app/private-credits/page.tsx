"use client"

import { useState, useEffect } from "react"
import { PrivateCredit } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, DollarSign, Calendar, User, CreditCard, TrendingUp, AlertTriangle, Eye, Edit, CheckCircle, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

// Mock data - in real app this would come from API
const mockPrivateCredits = [
  {
    id: 1,
    person_name: "hicham",
    amount: 100.00,
    purpose: "test",
    date_given: "2025-08-09",
    due_date: undefined,
    status: "active" as const,
    notes: "Test credit",
    credit_type: "loan_given" as const,
    description: "test",
    credit_date: "2025-08-09",
    created_at: "2025-08-09T10:00:00"
  },
  {
    id: 2,
    person_name: "norddin",
    amount: 100.00,
    purpose: "poche",
    date_given: "2025-08-12",
    due_date: undefined,
    status: "active" as const,
    notes: "Credit pour poche",
    credit_type: "loan_given" as const,
    description: "poche",
    credit_date: "2025-08-12",
    created_at: "2025-08-12T10:00:00"
  }
]

const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Actif" },
  { value: "paid", label: "Payé" },
  { value: "overdue", label: "En retard" }
]

export default function PrivateCreditsPage() {
  const [privateCredits, setPrivateCredits] = useState<PrivateCredit[]>([])
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedCredit, setSelectedCredit] = useState<PrivateCredit | null>(null)
  const [editFormData, setEditFormData] = useState({
    person_name: "",
    amount: "",
    credit_type: "loan_given",
    description: "",
    credit_date: "",
    due_date: "",
    status: "active"
  })
  const [addFormData, setAddFormData] = useState({
    person_name: "",
    amount: "",
    credit_type: "loan_given",
    description: "",
    credit_date: "",
    due_date: ""
  })

  // Fetch private credits from API
  useEffect(() => {
    const fetchPrivateCredits = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/private-credits')
        if (response.ok) {
          const data = await response.json()
          setPrivateCredits(data)
        } else {
          // Fallback to mock data if API fails
          setPrivateCredits(mockPrivateCredits)
        }
      } catch (error) {
        console.error('Error fetching private credits:', error)
        // Fallback to mock data
        setPrivateCredits(mockPrivateCredits)
      } finally {
        setLoading(false)
      }
    }

    fetchPrivateCredits()
  }, [])

  const filteredCredits = privateCredits.filter(credit => {
    // Only show hicham and norddin
    const isAllowedPerson = credit.person_name?.toLowerCase() === "hicham" || 
                           credit.person_name?.toLowerCase() === "norddin"
    
    const matchesStatus = selectedStatus === "all" || credit.status === selectedStatus
    return isAllowedPerson && matchesStatus
  })

  const totalCredits = privateCredits.length
  const totalAmount = privateCredits.reduce((sum, credit) => sum + credit.amount, 0)
  const activeCredits = privateCredits.filter(c => c.status === "active").length
  const overdueCredits = privateCredits.filter(c => c.status === "overdue").length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Actif</Badge>
      case "paid":
        return <Badge variant="secondary">Payé</Badge>
      case "overdue":
        return <Badge variant="destructive">En retard</Badge>
      default:
        return <Badge variant="outline">Inconnu</Badge>
    }
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  const handleViewCredit = (credit: PrivateCredit) => {
    setSelectedCredit(credit)
    setIsViewModalOpen(true)
  }

  const handleEditCredit = (credit: PrivateCredit) => {
    setSelectedCredit(credit)
    setEditFormData({
      person_name: credit.person_name,
      amount: credit.amount.toString(),
      credit_type: credit.credit_type || "loan_given",
      description: credit.description || credit.purpose || "",
      credit_date: credit.credit_date || credit.date_given || "",
      due_date: credit.due_date || "",
      status: credit.status || "active"
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEditCredit = async () => {
    if (!selectedCredit) return
    
    if (!editFormData.person_name || !editFormData.amount || !editFormData.credit_date) {
      toast.error("Tous les champs obligatoires doivent être remplis")
      return
    }

    if (parseFloat(editFormData.amount) <= 0) {
      toast.error("Le montant doit être supérieur à 0")
      return
    }

    try {
      const res = await fetch(`/api/private-credits/${selectedCredit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_name: editFormData.person_name,
          amount: parseFloat(editFormData.amount),
          credit_type: editFormData.credit_type,
          description: editFormData.description,
          credit_date: editFormData.credit_date,
          due_date: editFormData.due_date,
          status: editFormData.status
        })
      })

      if (res.ok) {
        const updatedCredit = await res.json()
        
        // Update local state
        setPrivateCredits(privateCredits.map(credit => 
          credit.id === selectedCredit.id ? updatedCredit : credit
        ))
        
        setIsEditModalOpen(false)
        setEditFormData({
          person_name: "",
          amount: "",
          credit_type: "loan_given",
          description: "",
          credit_date: "",
          due_date: "",
          status: "active"
        })
        toast.success("Crédit privé modifié avec succès")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Erreur lors de la modification du crédit privé")
      }
    } catch (error) {
      console.error("Error updating private credit:", error)
      toast.error("Erreur lors de la modification du crédit privé")
    }
  }

  const handleRepayCredit = async (credit: PrivateCredit) => {
    if (!confirm(`Confirmer le remboursement du crédit de ${credit.person_name} (${credit.amount.toFixed(2)} DH)?`)) {
      return
    }

    try {
      const res = await fetch(`/api/private-credits/${credit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...credit,
          status: "paid"
        })
      })

      if (res.ok) {
        const updatedCredit = await res.json()
        
        // Update local state
        setPrivateCredits(privateCredits.map(c => 
          c.id === credit.id ? updatedCredit : c
        ))
        
        toast.success("Crédit marqué comme remboursé")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Erreur lors du remboursement")
      }
    } catch (error) {
      console.error("Error repaying credit:", error)
      toast.error("Erreur lors du remboursement")
    }
  }

  const handleDeleteCredit = async (credit: PrivateCredit) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le crédit de ${credit.person_name} (${credit.amount.toFixed(2)} DH)?`)) return
    
    try {
      const res = await fetch(`/api/private-credits/${credit.id}`, {
        method: "DELETE"
      })
      
      if (res.ok) {
        setPrivateCredits(privateCredits.filter(c => c.id !== credit.id))
        toast.success("Crédit supprimé avec succès")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Erreur lors de la suppression du crédit")
      }
    } catch (error) {
      console.error("Error deleting credit:", error)
      toast.error("Erreur lors de la suppression du crédit")
    }
  }

  const handleAddCredit = () => {
    setAddFormData({
      person_name: "",
      amount: "",
      credit_type: "loan_given",
      description: "",
      credit_date: new Date().toISOString().split('T')[0], // Today's date
      due_date: ""
    })
    setIsAddModalOpen(true)
  }

  const handleSaveNewCredit = async () => {
    if (!addFormData.person_name || !addFormData.amount || !addFormData.credit_date) {
      toast.error("Tous les champs obligatoires doivent être remplis")
      return
    }

    if (parseFloat(addFormData.amount) <= 0) {
      toast.error("Le montant doit être supérieur à 0")
      return
    }

    try {
      const res = await fetch('/api/private-credits', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_name: addFormData.person_name,
          amount: parseFloat(addFormData.amount),
          credit_type: addFormData.credit_type,
          description: addFormData.description,
          credit_date: addFormData.credit_date,
          due_date: addFormData.due_date
        })
      })

      if (res.ok) {
        const newCredit = await res.json()
        
        // Add to local state
        setPrivateCredits([newCredit, ...privateCredits])
        
        setIsAddModalOpen(false)
        setAddFormData({
          person_name: "",
          amount: "",
          credit_type: "loan_given",
          description: "",
          credit_date: "",
          due_date: ""
        })
        toast.success("Nouveau crédit privé créé avec succès")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Erreur lors de la création du crédit")
      }
    } catch (error) {
      console.error("Error creating private credit:", error)
      toast.error("Erreur lors de la création du crédit")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Crédits Privés</h1>
        <p className="text-slate-600">Gestion des prêts personnels et crédits privés</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Crédits</p>
                <p className="text-2xl font-bold text-blue-600">{totalCredits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Montant Total</p>
                <p className="text-2xl font-bold text-green-600">{totalAmount.toFixed(2)} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Actifs</p>
                <p className="text-2xl font-bold text-orange-600">{activeCredits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">En Retard</p>
                <p className="text-2xl font-bold text-red-600">{overdueCredits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-4">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="flex items-center gap-2" onClick={handleAddCredit}>
          <Plus className="h-4 w-4" />
          Nouveau Crédit
        </Button>
      </div>

      {/* Liste des crédits privés */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Crédits Privés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonne Hicham */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-blue-600">Hicham</h3>
                <Badge variant="outline" className="text-sm">
                  Total: {privateCredits.filter(c => c.person_name?.toLowerCase() === "hicham").reduce((sum, c) => sum + c.amount, 0).toFixed(2)} DH
                </Badge>
              </div>
              
              <div className="space-y-3">
                {filteredCredits.filter(credit => credit.person_name?.toLowerCase() === "hicham").map((credit) => (
                  <div key={credit.id} className={`p-4 border rounded-lg hover:bg-slate-50 ${
                    credit.due_date && isOverdue(credit.due_date) ? 'bg-red-50 border-red-200' : 'bg-white'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-lg">{credit.amount.toFixed(2)} DH</div>
                      {getStatusBadge(credit.status || "active")}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div><strong>Raison:</strong> {credit.purpose || credit.description || "Non spécifiée"}</div>
                      <div><strong>Date Prêt:</strong> {new Date(credit.date_given || credit.credit_date || "").toLocaleDateString("fr-FR")}</div>
                      <div><strong>Échéance:</strong> 
                        <span className={credit.due_date && isOverdue(credit.due_date) ? 'text-red-600 font-semibold ml-1' : 'ml-1'}>
                          {credit.due_date ? new Date(credit.due_date).toLocaleDateString("fr-FR") : "Non définie"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={() => handleViewCredit(credit)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Détails
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditCredit(credit)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleRepayCredit(credit)}
                        disabled={credit.status === "paid"}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {credit.status === "paid" ? "Remboursé" : "Rembourser"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteCredit(credit)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
                
                {filteredCredits.filter(credit => credit.person_name?.toLowerCase() === "hicham").length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Aucun crédit pour Hicham
                  </div>
                )}
              </div>
            </div>

            {/* Colonne Norddin */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-green-600">Norddin</h3>
                <Badge variant="outline" className="text-sm">
                  Total: {privateCredits.filter(c => c.person_name?.toLowerCase() === "norddin").reduce((sum, c) => sum + c.amount, 0).toFixed(2)} DH
                </Badge>
              </div>
              
              <div className="space-y-3">
                {filteredCredits.filter(credit => credit.person_name?.toLowerCase() === "norddin").map((credit) => (
                  <div key={credit.id} className={`p-4 border rounded-lg hover:bg-slate-50 ${
                    credit.due_date && isOverdue(credit.due_date) ? 'bg-red-50 border-red-200' : 'bg-white'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-lg">{credit.amount.toFixed(2)} DH</div>
                      {getStatusBadge(credit.status || "active")}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div><strong>Raison:</strong> {credit.purpose || credit.description || "Non spécifiée"}</div>
                      <div><strong>Date Prêt:</strong> {new Date(credit.date_given || credit.credit_date || "").toLocaleDateString("fr-FR")}</div>
                      <div><strong>Échéance:</strong> 
                        <span className={credit.due_date && isOverdue(credit.due_date) ? 'text-red-600 font-semibold ml-1' : 'ml-1'}>
                          {credit.due_date ? new Date(credit.due_date).toLocaleDateString("fr-FR") : "Non définie"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={() => handleViewCredit(credit)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Détails
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditCredit(credit)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleRepayCredit(credit)}
                        disabled={credit.status === "paid"}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {credit.status === "paid" ? "Remboursé" : "Rembourser"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteCredit(credit)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
                
                {filteredCredits.filter(credit => credit.person_name?.toLowerCase() === "norddin").length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Aucun crédit pour Norddin
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal détails */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Détails du Crédit Privé</DialogTitle>
          </DialogHeader>
          
          {selectedCredit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Personne</Label>
                  <p className="font-medium">{selectedCredit.person_name}</p>
                </div>
                <div>
                  <Label>Montant</Label>
                  <p className="font-medium text-lg">{selectedCredit.amount.toFixed(2)} DH</p>
                </div>
              </div>
              
              <div>
                <Label>Raison</Label>
                <p className="font-medium">{selectedCredit.purpose || selectedCredit.description || "Non spécifiée"}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date du prêt</Label>
                  <p className="font-medium">
                    {new Date(selectedCredit.date_given || selectedCredit.credit_date || "").toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div>
                  <Label>Échéance</Label>
                  <p className="font-medium">
                    {selectedCredit.due_date ? new Date(selectedCredit.due_date).toLocaleDateString("fr-FR") : "Non définie"}
                  </p>
                </div>
              </div>
              
              <div>
                <Label>Statut</Label>
                <div className="mt-1">
                  {getStatusBadge(selectedCredit.status || "active")}
                </div>
              </div>
              
              {selectedCredit.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedCredit.notes}</p>
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
            <DialogTitle>Modifier le Crédit Privé</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_person_name">Nom de la personne *</Label>
              <Select value={editFormData.person_name} onValueChange={value => setEditFormData({ ...editFormData, person_name: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la personne" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hicham">Hicham</SelectItem>
                  <SelectItem value="norddin">Norddin</SelectItem>
                </SelectContent>
              </Select>
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
                <Label htmlFor="edit_credit_type">Type</Label>
                <Select value={editFormData.credit_type} onValueChange={value => setEditFormData({ ...editFormData, credit_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loan_given">Prêt accordé</SelectItem>
                    <SelectItem value="loan_received">Prêt reçu</SelectItem>
                    <SelectItem value="payment">Paiement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={editFormData.description}
                onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Raison du crédit"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_credit_date">Date du crédit *</Label>
                <Input
                  id="edit_credit_date"
                  type="date"
                  value={editFormData.credit_date}
                  onChange={e => setEditFormData({ ...editFormData, credit_date: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit_due_date">Date d&apos;échéance</Label>
                <Input
                  id="edit_due_date"
                  type="date"
                  value={editFormData.due_date}
                  onChange={e => setEditFormData({ ...editFormData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_status">Statut</Label>
              <Select value={editFormData.status} onValueChange={value => setEditFormData({ ...editFormData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="paid">Payé</SelectItem>
                  <SelectItem value="overdue">En retard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveEditCredit}>
                Modifier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal ajouter nouveau crédit */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouveau Crédit Privé</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="add_person_name">Nom de la personne *</Label>
              <Select value={addFormData.person_name} onValueChange={value => setAddFormData({ ...addFormData, person_name: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la personne" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hicham">Hicham</SelectItem>
                  <SelectItem value="norddin">Norddin</SelectItem>
                </SelectContent>
              </Select>
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
                <Label htmlFor="add_credit_type">Type</Label>
                <Select value={addFormData.credit_type} onValueChange={value => setAddFormData({ ...addFormData, credit_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loan_given">Prêt accordé</SelectItem>
                    <SelectItem value="loan_received">Prêt reçu</SelectItem>
                    <SelectItem value="payment">Paiement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="add_description">Description</Label>
              <Textarea
                id="add_description"
                value={addFormData.description}
                onChange={e => setAddFormData({ ...addFormData, description: e.target.value })}
                placeholder="Raison du crédit"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add_credit_date">Date du crédit *</Label>
                <Input
                  id="add_credit_date"
                  type="date"
                  value={addFormData.credit_date}
                  onChange={e => setAddFormData({ ...addFormData, credit_date: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="add_due_date">Date d&apos;échéance</Label>
                <Input
                  id="add_due_date"
                  type="date"
                  value={addFormData.due_date}
                  onChange={e => setAddFormData({ ...addFormData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveNewCredit}>
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 