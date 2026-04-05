"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, DollarSign, Calculator, Receipt, CreditCard, TrendingUp, RefreshCw, Trash2, Edit } from "lucide-react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface Transaction {
  id: number
  type: string
  amount: number
  payment_method: string
  description: string
  client_name: string | null
  date: string
}

export default function CashRegisterPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedMethod, setSelectedMethod] = useState("all")
  const [selectedType, setSelectedType] = useState("all")
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [editFormData, setEditFormData] = useState({
    type: "",
    amount: "",
    payment_method: "",
    description: "",
    client_id: ""
  })
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [hasNewTransactions, setHasNewTransactions] = useState(false)

  // Define handleRefresh function with useCallback to prevent unnecessary re-renders
  const handleRefresh = useCallback(() => {
    // Refetch transactions when returning to this page
    const fetchTransactions = async () => {
      try {
        setLoading(true)
        
        // Fetch sales data
        const salesResponse = await fetch('/api/sales')
        const salesData = await salesResponse.json()
        
        // Fetch purchases data
        const purchasesResponse = await fetch('/api/purchases')
        const purchasesData = await purchasesResponse.json()
        
        // Fetch cash-register transactions (refunds, etc.)
        const cashRegisterResponse = await fetch('/api/cash-register')
        const cashRegisterData = await cashRegisterResponse.json()
        
        // Transform sales data to match transaction format
        const salesTransactions: Transaction[] = salesData.map((sale: any) => ({
          id: sale.id,
          type: 'sale',
          amount: sale.total_amount,
          payment_method: sale.payment_method,
          description: `Vente - ${sale.client_name || 'Client anonyme'}`,
          client_name: sale.client_name || 'Client anonyme',
          date: sale.sale_date
        }))
        
        // Transform purchases data to match transaction format
        const purchaseTransactions: Transaction[] = purchasesData.map((purchase: any) => ({
          id: purchase.id,
          type: 'purchase',
          amount: -purchase.total_amount, // Negative amount for purchases (money going out)
          payment_method: purchase.payment_method,
          description: `Achat - ${purchase.supplier_name || 'Fournisseur'}`,
          client_name: purchase.supplier_name || 'Fournisseur',
          date: purchase.purchase_date
        }))
        
        // Transform cash-register data to match transaction format
        const cashRegisterTransactions: Transaction[] = cashRegisterData.map((transaction: any) => ({
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          payment_method: transaction.payment_method,
          description: transaction.description,
          client_name: transaction.client_name,
          date: transaction.date
        }))
        
        // Combine and sort by date (newest first)
        const allTransactions = [...salesTransactions, ...purchaseTransactions, ...cashRegisterTransactions]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        
        // Check if we have new transactions
        const previousCount = transactions.length
        const newCount = allTransactions.length
        
        if (newCount > previousCount) {
          setHasNewTransactions(true)
          // Show toast notification for new transactions
          const newTransactionsCount = newCount - previousCount
          toast.success(`${newTransactionsCount} nouvelle(s) transaction(s) détectée(s)`)
          // Auto-hide the indicator after 5 seconds
          setTimeout(() => setHasNewTransactions(false), 5000)
        }
        
        setTransactions(allTransactions)
        setLastUpdateTime(new Date())
        
        // Notify other pages that transactions have been updated
        localStorage.setItem('transactions-updated', Date.now().toString())
      } catch (error) {
        console.error('Error fetching transactions:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchTransactions()
  }, [transactions.length])

  // Expose refresh function globally so other pages can call it
  useEffect(() => {
    // @ts-ignore
    window.refreshCashRegister = handleRefresh
    return () => {
      // @ts-ignore
      delete window.refreshCashRegister
    }
  }, [handleRefresh])

  // Set initial time after component mounts to avoid hydration issues
  useEffect(() => {
    setLastUpdateTime(new Date())
  }, [])

  // Fetch transactions from sales, purchases, and cash-register APIs
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true)
        
        // Fetch sales data
        const salesResponse = await fetch('/api/sales')
        const salesData = await salesResponse.json()
        
        // Fetch purchases data
        const purchasesResponse = await fetch('/api/purchases')
        const purchasesData = await purchasesResponse.json()
        
        // Fetch cash-register transactions (refunds, etc.)
        const cashRegisterResponse = await fetch('/api/cash-register')
        const cashRegisterData = await cashRegisterResponse.json()
        
        // Transform sales data to match transaction format
        const salesTransactions: Transaction[] = salesData.map((sale: any) => ({
          id: sale.id,
          type: 'sale',
          amount: sale.total_amount,
          payment_method: sale.payment_method,
          description: `Vente - ${sale.client_name || 'Client anonyme'}`,
          client_name: sale.client_name || 'Client anonyme',
          date: sale.sale_date
        }))
        
        // Transform purchases data to match transaction format
        const purchaseTransactions: Transaction[] = purchasesData.map((purchase: any) => ({
          id: purchase.id,
          type: 'purchase',
          amount: -purchase.total_amount, // Negative amount for purchases (money going out)
          payment_method: purchase.payment_method,
          description: `Achat - ${purchase.supplier_name || 'Fournisseur'}`,
          client_name: purchase.supplier_name || 'Fournisseur',
          date: purchase.purchase_date
        }))
        
        // Transform cash-register data to match transaction format
        const cashRegisterTransactions: Transaction[] = cashRegisterData.map((transaction: any) => ({
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          payment_method: transaction.payment_method,
          description: transaction.description,
          client_name: transaction.client_name,
          date: transaction.date
        }))
        
        // Combine and sort by date (newest first)
        const allTransactions = [...salesTransactions, ...purchaseTransactions, ...cashRegisterTransactions]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        

        
        setTransactions(allTransactions)
      } catch (error) {
        console.error('Error fetching transactions:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchTransactions()
  }, [])

  // Refresh data when page comes into focus (e.g., when returning from sales page)
  useEffect(() => {
    // Only add event listener on client side
    if (typeof window !== 'undefined') {
      const handleFocus = () => {
        handleRefresh()
      }
      
      window.addEventListener('focus', handleFocus)
      return () => window.removeEventListener('focus', handleFocus)
    }
  }, [handleRefresh])

  // Auto-refresh every 30 seconds to catch new transactions
  useEffect(() => {
    // Only start interval on client side
    if (typeof window !== 'undefined') {
      const interval = setInterval(() => {
        handleRefresh()
      }, 30000) // 30 seconds

      return () => clearInterval(interval)
    }
  }, [handleRefresh])

  // Listen for storage events (when other tabs/pages update data)
  useEffect(() => {
    // Only add event listener on client side
    if (typeof window !== 'undefined') {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'transactions-updated') {
          handleRefresh()
      }
      }

      window.addEventListener('storage', handleStorageChange)
      return () => window.removeEventListener('storage', handleStorageChange)
    }
  }, [handleRefresh])

  // Filter transactions for today only
  const today = new Date().toDateString()
  const todayTransactions = transactions.filter(t => 
    new Date(t.date).toDateString() === today
  )

  const filteredTransactions = transactions.filter(transaction => {
    // Filter for today's transactions only
    const transactionDate = new Date(transaction.date).toDateString()
    const isToday = transactionDate === today
    
    const matchesSearch = (transaction.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMethod = selectedMethod === "all" || transaction.payment_method === selectedMethod
    const matchesType = selectedType === "all" || transaction.type === selectedType
    
    return isToday && matchesSearch && matchesMethod && matchesType
  })

  const totalSales = todayTransactions.filter(t => t.type === "sale" && t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalRefunds = todayTransactions.filter(t => t.type === "refund" || t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const cashSales = todayTransactions.filter(t => t.payment_method === "cash" && t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const creditSales = todayTransactions.filter(t => t.payment_method === "credit" && t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const netCash = cashSales - totalRefunds

  // Button handlers
  const handleNewSale = () => {
    router.push('/sales')
  }



  const handleRefund = () => {
    router.push('/sales/refund')
  }

  const handleDailyReport = () => {
    router.push('/reports/daily')
  }

  const handleDeleteTransaction = async (transaction: any) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
      return
    }

    try {
      let response
      if (transaction.type === 'sale') {
        // Delete from sales table
        response = await fetch(`/api/sales/${transaction.id}`, {
          method: 'DELETE'
        })
      } else if (transaction.type === 'purchase') {
        // Delete from purchases table
        response = await fetch(`/api/purchases/${transaction.id}`, {
          method: 'DELETE'
        })
      } else {
        // Delete from cash-register table
        response = await fetch(`/api/cash-register/${transaction.id}`, {
          method: 'DELETE'
        })
      }

      if (response.ok) {
        // Remove from local state
        setTransactions(transactions.filter(t => t.id !== transaction.id))
        toast.success("Transaction supprimée avec succès")
      } else {
        console.error('Error deleting transaction')
        toast.error("Erreur lors de la suppression de la transaction")
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error("Erreur lors de la suppression de la transaction")
    }
  }

  const handleEditTransaction = (transaction: Transaction) => {
    // Only allow editing of cash-register transactions (not sales)
    if (transaction.type === 'sale') {
      toast.error("Les ventes ne peuvent pas être modifiées depuis cette page. Utilisez la page des ventes.")
      return
    }
    
    setSelectedTransaction(transaction)
    setEditFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      payment_method: transaction.payment_method,
      description: transaction.description || "",
      client_id: transaction.client_name || ""
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEditTransaction = async () => {
    if (!selectedTransaction) return
    
    if (!editFormData.type || !editFormData.amount || !editFormData.payment_method) {
      toast.error("Tous les champs obligatoires doivent être remplis")
      return
    }

    if (parseFloat(editFormData.amount) <= 0) {
      toast.error("Le montant doit être supérieur à 0")
      return
    }

    try {
      const res = await fetch(`/api/cash-register/${selectedTransaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editFormData.type,
          amount: parseFloat(editFormData.amount),
          payment_method: editFormData.payment_method,
          description: editFormData.description,
          client_id: editFormData.client_id ? parseInt(editFormData.client_id) : null
        })
      })

      if (res.ok) {
        const updatedTransaction = await res.json()
        
        // Update local state
        setTransactions(transactions.map(t => 
          t.id === selectedTransaction.id ? {
            ...updatedTransaction,
            client_name: updatedTransaction.client_name || 'Client anonyme'
          } : t
        ))
        
        setIsEditModalOpen(false)
        setEditFormData({
          type: "",
          amount: "",
          payment_method: "",
          description: "",
          client_id: ""
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

  const handlePrintTransaction = (transaction: any) => {
    // Create a print-friendly version of the transaction
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Transaction #${transaction.id}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .transaction { border: 1px solid #ccc; padding: 15px; margin: 10px 0; }
              .amount { font-size: 18px; font-weight: bold; }
              .positive { color: green; }
              .negative { color: red; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Reçu de Transaction</h1>
              <p>Date: ${new Date(transaction.date).toLocaleDateString('fr-FR')}</p>
            </div>
            <div class="transaction">
              <p><strong>Transaction #${transaction.id}</strong></p>
              <p><strong>Type:</strong> ${
                transaction.type === 'sale' ? 'Vente' : 
                transaction.type === 'purchase' ? 'Achat' : 
                'Remboursement'
              }</p>
              <p><strong>${transaction.type === 'purchase' ? 'Fournisseur' : 'Client'}:</strong> ${transaction.client_name || 'Anonyme'}</p>
              <p><strong>Description:</strong> ${transaction.description || ''}</p>
              <p><strong>Méthode de paiement:</strong> ${transaction.payment_method === 'cash' ? 'Espèces' : 'Crédit'}</p>
              <p class="amount ${transaction.amount > 0 ? 'positive' : 'negative'}">
                <strong>Montant:</strong> ${transaction.amount > 0 ? '+' : ''}${transaction.amount.toFixed(2)} DH
              </p>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Caisse</h1>
          <p className="text-slate-600">Gestion de la caisse et transactions quotidiennes</p>
          <div className="flex items-center gap-2 mt-1">
            {lastUpdateTime && (
              <span className="text-xs text-slate-500">
                Dernière mise à jour: {lastUpdateTime.toLocaleTimeString('fr-FR')}
              </span>
            )}
            {hasNewTransactions && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                ✨ Nouvelles transactions détectées
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Ventes</p>
                <p className="text-2xl font-bold text-green-600">{totalSales.toFixed(2)} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Espèces</p>
                <p className="text-2xl font-bold text-blue-600">{cashSales.toFixed(2)} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Crédit</p>
                <p className="text-2xl font-bold text-purple-600">{creditSales.toFixed(2)} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Solde Caisse</p>
                <p className={`text-2xl font-bold ${netCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netCash.toFixed(2)} DH
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Button 
          className="flex items-center gap-2 h-16 text-lg"
          onClick={handleNewSale}
        >
          <Plus className="h-5 w-5" />
          Nouvelle Vente
        </Button>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 h-16 text-lg"
          onClick={() => router.push('/purchases')}
        >
          <Plus className="h-5 w-5" />
          Nouvel Achat
        </Button>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 h-16 text-lg"
          onClick={handleRefund}
        >
          <Receipt className="h-5 w-5" />
          Remboursement
        </Button>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 h-16 text-lg"
          onClick={handleDailyReport}
        >
          <TrendingUp className="h-5 w-5" />
          Rapport Journalier
        </Button>
      </div>

      {/* Filtres */}
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
        <Select value={selectedMethod} onValueChange={setSelectedMethod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Méthode de paiement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les méthodes</SelectItem>
            <SelectItem value="cash">Espèces</SelectItem>
            <SelectItem value="credit">Crédit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Type Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={selectedType === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedType("all")}
          className="flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Toutes
        </Button>
        <Button
          variant={selectedType === "sale" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedType("sale")}
          className="flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Ventes
        </Button>
        <Button
          variant={selectedType === "purchase" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedType("purchase")}
          className="flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          Achats
        </Button>
      </div>

      {/* Liste des transactions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Transactions d&apos;Aujourd&apos;hui</CardTitle>
            <div className="text-sm text-muted-foreground">
              {filteredTransactions.length} transaction(s) trouvée(s)
              {selectedType !== "all" && (
                <span className="ml-2 text-blue-600">
                  • Filtré par {selectedType === "sale" ? "Ventes" : "Achats"}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Chargement des transactions...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune transaction trouvée
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Heure</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Client</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Montant</th>
                    <th className="text-center p-2">Méthode</th>
                    <th className="text-center p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-slate-50">
                    <td className="p-2">
                      {new Date(transaction.date).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td className="p-2">
                      <Badge variant={
                        transaction.type === "sale" ? "default" : 
                        transaction.type === "purchase" ? "secondary" : 
                        "destructive"
                      }>
                        {transaction.type === "sale" ? "Vente" : 
                         transaction.type === "purchase" ? "Achat" : 
                         "Remboursement"}
                      </Badge>
                    </td>
                    <td className="p-2">{transaction.client_name}</td>
                    <td className="p-2">{transaction.description}</td>
                    <td className={`text-right p-2 font-semibold ${
                      transaction.amount > 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {transaction.amount > 0 ? "+" : ""}{transaction.amount.toFixed(2)} DH
                    </td>
                    <td className="text-center p-2">
                      <Badge variant="outline">
                        {transaction.payment_method === "cash" ? "Espèces" : "Crédit"}
                      </Badge>
                    </td>
                    <td className="text-center p-2">
                      <div className="flex gap-2 justify-center">
                        {transaction.type !== 'sale' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditTransaction(transaction)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePrintTransaction(transaction)}
                        >
                          Imprimer
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

      {/* Modal modifier transaction */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier la Transaction</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_type">Type de transaction *</Label>
              <Select value={editFormData.type} onValueChange={value => setEditFormData({ ...editFormData, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund">Remboursement</SelectItem>
                  <SelectItem value="expense">Dépense</SelectItem>
                  <SelectItem value="income">Recette</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              <Label htmlFor="edit_payment_method">Méthode de paiement *</Label>
              <Select value={editFormData.payment_method} onValueChange={value => setEditFormData({ ...editFormData, payment_method: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la méthode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="credit">Crédit</SelectItem>
                  <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Input
                id="edit_description"
                value={editFormData.description}
                onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Description de la transaction"
              />
            </div>

            <div>
              <Label htmlFor="edit_client">Client (optionnel)</Label>
              <Input
                id="edit_client"
                value={editFormData.client_id}
                onChange={e => setEditFormData({ ...editFormData, client_id: e.target.value })}
                placeholder="Nom du client"
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