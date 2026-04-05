"use client"

import { useState, useEffect } from "react"
import { Transaction } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, DollarSign, Calendar, Receipt, CreditCard, Edit, Eye, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

// Mock data - in real app this would come from API
const mockBankTransactions = [
  {
    id: 1,
    type: "deposit",
    category: "Vente en ligne",
    amount: 1500.00,
    description: "Paiement vente en ligne - Client Ahmed",
    bank_account: "Compte Principal",
    reference: "REF-2024-001",
    date: "2024-01-15",
    created_at: "2024-01-15T10:30:00"
  },
  {
    id: 2,
    type: "withdrawal",
    category: "Fournisseur",
    amount: 2500.00,
    description: "Paiement fournisseur - Matériaux de construction",
    bank_account: "Compte Principal",
    reference: "REF-2024-002",
    date: "2024-01-16",
    created_at: "2024-01-16T14:20:00"
  },
  {
    id: 3,
    type: "deposit",
    category: "Remboursement",
    amount: 750.00,
    description: "Remboursement assurance",
    bank_account: "Compte Épargne",
    reference: "REF-2024-003",
    date: "2024-01-20",
    created_at: "2024-01-20T09:15:00"
  },
  {
    id: 4,
    type: "withdrawal",
    category: "Loyer",
    amount: 5000.00,
    description: "Loyer du magasin",
    bank_account: "Compte Principal",
    reference: "REF-2024-004",
    date: "2024-01-22",
    created_at: "2024-01-22T16:45:00"
  }
]

const bankAccounts = [
  "Compte Principal",
  "Compte Épargne",
  "Compte Courant"
]

const transactionCategories = [
  "Vente en ligne",
  "Fournisseur",
  "Loyer",
  "Salaire",
  "Remboursement",
  "Maintenance",
  "Électricité",
  "Eau",
  "Internet",
  "Autre"
]

export default function BankTransactionsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedType, setSelectedType] = useState("all")
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    type: "deposit",
    category: "",
    amount: "",
    description: "",
    bank_account: "Compte Principal",
    reference: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [editFormData, setEditFormData] = useState({
    amount: "",
    payment_method: "",
    reference: "",
    client_supplier_name: "",
    notes: "",
    payment_date: ""
  })

  // Fetch transactions from API
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/manual-payments')
        if (response.ok) {
          const data = await response.json()
          // Transform the data to match our expected format
          const transformedData = data.map((payment: any) => ({
            id: payment.id,
            type: payment.amount > 0 ? "deposit" : "withdrawal",
            category: payment.reference || "Paiement",
            amount: Math.abs(payment.amount),
            description: payment.notes || payment.reference || "Paiement manuel",
            bank_account: "Compte Principal",
            reference: payment.reference || `REF-${payment.id}`,
            date: payment.payment_date,
            created_at: payment.created_at
          }))
          setTransactions(transformedData)
        } else {
          console.error('Error fetching transactions')
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.reference.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === "all" || transaction.type === selectedType
    return matchesSearch && matchesType
  })

  const totalDeposits = transactions.filter(t => t.type === "deposit").reduce((sum, t) => sum + t.amount, 0)
  const totalWithdrawals = transactions.filter(t => t.type === "withdrawal").reduce((sum, t) => sum + t.amount, 0)
  const netBalance = totalDeposits - totalWithdrawals

  // Button handlers
  const handleNewTransaction = () => {
    setShowModal(true)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const generateReference = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `REF-${year}-${month}${day}-${random}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.amount || !formData.description || !formData.category) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/manual-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: formData.type === "deposit" ? parseFloat(formData.amount) : -parseFloat(formData.amount),
          payment_method: "bank_transfer",
          reference: formData.reference || generateReference(),
          client_supplier_name: formData.description,
          notes: formData.description,
          payment_date: new Date().toISOString().split('T')[0]
        }),
      })

      if (response.ok) {
        const newPayment = await response.json()
        // Transform the new payment to match our format
        const newTransaction: Transaction = {
          id: newPayment.id,
          type: newPayment.amount > 0 ? "deposit" : "withdrawal",
          category: formData.category,
          amount: Math.abs(newPayment.amount),
          description: newPayment.notes || newPayment.reference || "Paiement manuel",
          bank_account: "Compte Principal",
          reference: newPayment.reference || `REF-${newPayment.id}`,
          date: newPayment.payment_date,
          created_at: newPayment.created_at
        }
        
        setTransactions([newTransaction, ...transactions])
        
        // Reset form and close modal
        setFormData({
          type: "deposit",
          category: "",
          amount: "",
          description: "",
          bank_account: "Compte Principal",
          reference: ""
        })
        setShowModal(false)
      } else {
        console.error('Error creating transaction')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditTransaction = (transaction: any) => {
    // Map display data back to original format
    const originalAmount = transaction.type === "withdrawal" ? -transaction.amount : transaction.amount
    
    setSelectedTransaction(transaction)
    setEditFormData({
      amount: originalAmount.toString(),
      payment_method: "bank_transfer",
      reference: transaction.reference,
      client_supplier_name: "",
      notes: transaction.description,
      payment_date: transaction.date
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEditTransaction = async () => {
    if (!selectedTransaction) return
    
    if (!editFormData.amount || !editFormData.payment_method || !editFormData.payment_date) {
      toast.error("Tous les champs obligatoires doivent être remplis")
      return
    }

    try {
      const res = await fetch(`/api/manual-payments/${selectedTransaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(editFormData.amount),
          payment_method: editFormData.payment_method,
          reference: editFormData.reference,
          client_supplier_name: editFormData.client_supplier_name,
          notes: editFormData.notes,
          payment_date: editFormData.payment_date
        })
      })

      if (res.ok) {
        const updatedPayment = await res.json()
        
        // Transform updated payment back to display format
        const transformedTransaction: Transaction = {
          id: updatedPayment.id,
          type: updatedPayment.amount > 0 ? "deposit" : "withdrawal",
          category: updatedPayment.reference || "Paiement",
          amount: Math.abs(updatedPayment.amount),
          description: updatedPayment.notes || updatedPayment.reference || "Paiement manuel",
          bank_account: "Compte Principal",
          reference: updatedPayment.reference || `REF-${updatedPayment.id}`,
          date: updatedPayment.payment_date,
          created_at: updatedPayment.created_at
        }
        
        // Update local state
        setTransactions(transactions.map(t => 
          t.id === selectedTransaction.id ? transformedTransaction : t
        ))
        
        setIsEditModalOpen(false)
        setEditFormData({
          amount: "",
          payment_method: "",
          reference: "",
          client_supplier_name: "",
          notes: "",
          payment_date: ""
        })
        toast.success("Transaction modifiée avec succès")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Erreur lors de la modification de la transaction")
      }
    } catch (error) {
      console.error("Error updating transaction:", error)
      toast.error("Erreur lors de la modification de la transaction")
    }
  }

  const handleViewTransaction = (transaction: any) => {
    // For now, just show transaction details in an alert
    alert(`Détails de la transaction:\nRéférence: ${transaction.reference}\nMontant: ${transaction.amount} DH\nCompte: ${transaction.bank_account}\nDescription: ${transaction.description}`)
  }

  const handleDeleteTransaction = async (transaction: any) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la transaction ${transaction.reference} ?`)) {
      return
    }

    try {
      const response = await fetch(`/api/manual-payments/${transaction.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setTransactions(transactions.filter(t => t.id !== transaction.id))
        toast.success("Transaction supprimée avec succès")
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Erreur lors de la suppression de la transaction")
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast.error("Erreur lors de la suppression de la transaction")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Transactions Bancaires</h1>
        <p className="text-slate-600">Gestion des transactions bancaires et virements</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Dépôts</p>
                <p className="text-2xl font-bold text-green-600">{totalDeposits.toFixed(2)} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Retraits</p>
                <p className="text-2xl font-bold text-red-600">{totalWithdrawals.toFixed(2)} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Solde Net</p>
                <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netBalance.toFixed(2)} DH
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
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
            placeholder="Rechercher une transaction..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Type de transaction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="deposit">Dépôts</SelectItem>
            <SelectItem value="withdrawal">Retraits</SelectItem>
          </SelectContent>
        </Select>
        <Button className="flex items-center gap-2" onClick={handleNewTransaction}>
          <Plus className="h-4 w-4" />
          Nouvelle Transaction Bancaire
        </Button>
      </div>

      {/* Liste des transactions bancaires */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des Transactions Bancaires</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Chargement des transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune transaction trouvée
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Référence</th>
                  <th className="text-left p-2">Compte</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Montant</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-slate-50">
                    <td className="p-2">
                      {new Date(transaction.date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="p-2">
                      <Badge variant={transaction.type === "deposit" ? "default" : "destructive"}>
                        {transaction.type === "deposit" ? "Dépôt" : "Retrait"}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <span className="font-mono text-sm">{transaction.reference}</span>
                    </td>
                    <td className="p-2">{transaction.bank_account}</td>
                    <td className="p-2">{transaction.description}</td>
                    <td className={`text-right p-2 font-semibold ${
                      transaction.type === "deposit" ? "text-green-600" : "text-red-600"
                    }`}>
                      {transaction.type === "deposit" ? "+" : "-"}{transaction.amount.toFixed(2)} DH
                    </td>
                    <td className="text-center p-2">
                      <div className="flex gap-2 justify-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditTransaction(transaction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewTransaction(transaction)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteTransaction(transaction)}
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

      {/* Modal for New Transaction */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle Transaction Bancaire</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Dépôt</SelectItem>
                    <SelectItem value="withdrawal">Retrait</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Montant (DH)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {transactionCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_account">Compte Bancaire</Label>
              <Select value={formData.bank_account} onValueChange={(value) => handleInputChange('bank_account', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account} value={account}>
                      {account}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Référence (optionnel)</Label>
              <Input
                id="reference"
                placeholder="Laissez vide pour générer automatiquement"
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Description de la transaction..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Création..." : "Créer la Transaction"}
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

      {/* Modal modifier transaction */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la Transaction Bancaire</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_amount">Montant *</Label>
              <Input
                id="edit_amount"
                type="number"
                step="0.01"
                value={editFormData.amount}
                onChange={e => setEditFormData({ ...editFormData, amount: e.target.value })}
                placeholder="Montant (positif pour dépôt, négatif pour retrait)"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Utilisez un montant positif pour un dépôt, négatif pour un retrait
              </p>
            </div>

            <div>
              <Label htmlFor="edit_payment_method">Méthode de paiement *</Label>
              <Select value={editFormData.payment_method} onValueChange={value => setEditFormData({ ...editFormData, payment_method: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la méthode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                  <SelectItem value="check">Chèque</SelectItem>
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="card">Carte bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit_reference">Référence</Label>
              <Input
                id="edit_reference"
                value={editFormData.reference}
                onChange={e => setEditFormData({ ...editFormData, reference: e.target.value })}
                placeholder="Référence de la transaction"
              />
            </div>

            <div>
              <Label htmlFor="edit_client_supplier">Client/Fournisseur</Label>
              <Input
                id="edit_client_supplier"
                value={editFormData.client_supplier_name}
                onChange={e => setEditFormData({ ...editFormData, client_supplier_name: e.target.value })}
                placeholder="Nom du client ou fournisseur"
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

            <div>
              <Label htmlFor="edit_payment_date">Date de paiement *</Label>
              <Input
                id="edit_payment_date"
                type="date"
                value={editFormData.payment_date}
                onChange={e => setEditFormData({ ...editFormData, payment_date: e.target.value })}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveEditTransaction}>
                Modifier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 