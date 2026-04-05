"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, Calendar, DollarSign, TrendingUp, TrendingDown, Printer, RefreshCw, FileText, FileSpreadsheet, CreditCard } from "lucide-react"
import { useRouter } from "next/navigation"

interface Transaction {
  id: number
  type: string
  amount: number
  payment_method: string
  description: string
  client_id: number
  client_name: string
  date: string
}

interface PrivateCredit {
  id: number
  person_name: string
  amount: number
  credit_type: string
  description: string
  credit_date: string
  status: string
}

export default function DailyReportPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [privateCredits, setPrivateCredits] = useState<PrivateCredit[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch('/api/cash-register')
      if (response.ok) {
        const data = await response.json()
        // Filter transactions for the selected date
        const filteredData = data.filter((transaction: Transaction) => 
          transaction.date.startsWith(selectedDate)
        )
        setTransactions(filteredData)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }, [selectedDate])

  const fetchPrivateCredits = useCallback(async () => {
    try {
      const response = await fetch('/api/private-credits')
      if (response.ok) {
        const data = await response.json()
        setPrivateCredits(data)
      }
    } catch (error) {
      console.error('Error fetching private credits:', error)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
    fetchPrivateCredits()
  }, [fetchTransactions, fetchPrivateCredits])

  const totalSales = transactions.filter(t => t.type === "sale" && t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalRefunds = transactions.filter(t => t.type === "refund" || t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const cashSales = transactions.filter(t => t.payment_method === "cash" && t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const creditSales = transactions.filter(t => t.payment_method === "credit" && t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  
  // Calculate private credits total (only active credits)
  const privateCreditsTotal = privateCredits
    .filter(credit => !credit.status || credit.status === 'active')
    .reduce((sum, credit) => sum + (credit.amount || 0), 0)
  
  // Calculate net cash after subtracting private credits
  const netCashBeforeCredits = cashSales - totalRefunds
  const netCash = netCashBeforeCredits - privateCreditsTotal
  const transactionCount = transactions.length

  const handleExportPDF = () => {
    // Create PDF content
    const pdfContent = `
      <html>
        <head>
          <title>Rapport Journalier - ${new Date(selectedDate).toLocaleDateString('fr-FR')}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .summary-title { font-weight: bold; color: #666; margin-bottom: 5px; }
            .summary-value { font-size: 24px; font-weight: bold; }
            .transactions { margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .positive { color: green; }
            .negative { color: red; }
            .warning { color: orange; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Rapport Journalier</h1>
            <h2>${new Date(selectedDate).toLocaleDateString('fr-FR')}</h2>
          </div>
          
          <div class="summary">
            <div class="summary-card">
              <div class="summary-title">Total Ventes</div>
              <div class="summary-value positive">${totalSales.toFixed(2)} DH</div>
            </div>
            <div class="summary-card">
              <div class="summary-title">Remboursements</div>
              <div class="summary-value negative">${totalRefunds.toFixed(2)} DH</div>
            </div>
            <div class="summary-card">
              <div class="summary-title">Crédits Privés (Actifs)</div>
              <div class="summary-value warning">${privateCreditsTotal.toFixed(2)} DH</div>
            </div>
            <div class="summary-card">
              <div class="summary-title">Solde Net (Après Crédits)</div>
              <div class="summary-value ${netCash >= 0 ? 'positive' : 'negative'}">${netCash.toFixed(2)} DH</div>
            </div>
            <div class="summary-card">
              <div class="summary-title">Solde Avant Crédits</div>
              <div class="summary-value ${netCashBeforeCredits >= 0 ? 'positive' : 'negative'}">${netCashBeforeCredits.toFixed(2)} DH</div>
            </div>
            <div class="summary-card">
              <div class="summary-title">Transactions</div>
              <div class="summary-value">${transactionCount}</div>
            </div>
          </div>
          
          <div class="transactions">
            <h3>Transactions</h3>
            <table>
              <thead>
                <tr>
                  <th>Heure</th>
                  <th>Type</th>
                  <th>Client</th>
                  <th>Description</th>
                  <th>Montant</th>
                  <th>Méthode</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map(t => `
                  <tr>
                    <td>${new Date(t.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td>${t.type === "sale" ? "Vente" : "Remboursement"}</td>
                    <td>${t.client_name}</td>
                    <td>${t.description}</td>
                    <td class="${t.amount > 0 ? 'positive' : 'negative'}">${t.amount > 0 ? '+' : ''}${t.amount.toFixed(2)} DH</td>
                    <td>${t.payment_method === "cash" ? "Espèces" : "Crédit"}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="private-credits" style="margin-top: 30px;">
            <h3>Crédits Privés Actifs</h3>
            <table>
              <thead>
                <tr>
                  <th>Personne</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Montant</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${privateCredits
                  .filter(credit => !credit.status || credit.status === 'active')
                  .map(credit => `
                    <tr>
                      <td>${credit.person_name}</td>
                      <td>${credit.credit_type === 'loan_given' ? 'Prêt Accordé' : 'Prêt Reçu'}</td>
                      <td>${credit.description || '-'}</td>
                      <td class="warning">${credit.amount.toFixed(2)} DH</td>
                      <td>${new Date(credit.credit_date).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `
    
    // Open in new window and trigger print for PDF
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(pdfContent)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
        setTimeout(() => printWindow.close(), 1000)
      }, 500)
    }
    
    alert(`Rapport PDF du ${new Date(selectedDate).toLocaleDateString('fr-FR')} généré avec succès! Utilisez "Enregistrer en PDF" dans l'impression.`)
  }

  const handleExportExcel = () => {
    // Create Excel-like CSV content with proper formatting
    let excelContent = ''
    
    // Header
    excelContent += `Rapport Journalier - ${new Date(selectedDate).toLocaleDateString('fr-FR')}\n`
    excelContent += `Généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}\n\n`
    
    // Summary section
    excelContent += 'RÉSUMÉ\n'
    excelContent += 'Métrique,Valeur\n'
    excelContent += `Total Ventes,${totalSales.toFixed(2)} DH\n`
    excelContent += `Remboursements,${totalRefunds.toFixed(2)} DH\n`
    excelContent += `Solde Net,${netCash.toFixed(2)} DH\n`
    excelContent += `Nombre de Transactions,${transactionCount}\n`
    excelContent += `Ventes en Espèces,${cashSales.toFixed(2)} DH\n`
    excelContent += `Ventes en Crédit,${creditSales.toFixed(2)} DH\n\n`
    
    // Transactions
    excelContent += 'TRANSACTIONS\n'
    excelContent += 'Heure,Type,Client,Description,Montant,Méthode\n'
    transactions.forEach(t => {
      excelContent += `${new Date(t.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })},`
      excelContent += `${t.type === "sale" ? "Vente" : "Remboursement"},`
      excelContent += `${t.client_name},`
      excelContent += `${t.description},`
      excelContent += `${t.amount.toFixed(2)} DH,`
      excelContent += `${t.payment_method === "cash" ? "Espèces" : "Crédit"}\n`
    })
    
    // Create and download CSV file
    const blob = new Blob([excelContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rapport-journalier-${selectedDate}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    alert(`Rapport Excel du ${new Date(selectedDate).toLocaleDateString('fr-FR')} téléchargé avec succès!`)
  }

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Rapport Journalier - ${new Date(selectedDate).toLocaleDateString('fr-FR')}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
              .summary-title { font-weight: bold; color: #666; margin-bottom: 5px; }
              .summary-value { font-size: 24px; font-weight: bold; }
              .transactions { margin-top: 30px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              .positive { color: green; }
              .negative { color: red; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Rapport Journalier</h1>
              <h2>${new Date(selectedDate).toLocaleDateString('fr-FR')}</h2>
            </div>
            
            <div class="summary">
              <div class="summary-card">
                <div class="summary-title">Total Ventes</div>
                <div class="summary-value positive">${totalSales.toFixed(2)} DH</div>
              </div>
              <div class="summary-card">
                <div class="summary-title">Remboursements</div>
                <div class="summary-value negative">${totalRefunds.toFixed(2)} DH</div>
              </div>
              <div class="summary-card">
                <div class="summary-title">Solde Net</div>
                <div class="summary-value ${netCash >= 0 ? 'positive' : 'negative'}">${netCash.toFixed(2)} DH</div>
              </div>
              <div class="summary-card">
                <div class="summary-title">Transactions</div>
                <div class="summary-value">${transactionCount}</div>
              </div>
            </div>
            
            <div class="transactions">
              <h3>Transactions</h3>
              <table>
                <thead>
                  <tr>
                    <th>Heure</th>
                    <th>Type</th>
                    <th>Client</th>
                    <th>Description</th>
                    <th>Montant</th>
                    <th>Méthode</th>
                  </tr>
                </thead>
                <tbody>
                  ${transactions.map(t => `
                    <tr>
                      <td>${new Date(t.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td>${t.type === "sale" ? "Vente" : "Remboursement"}</td>
                      <td>${t.client_name}</td>
                      <td>${t.description}</td>
                      <td class="${t.amount > 0 ? 'positive' : 'negative'}">${t.amount > 0 ? '+' : ''}${t.amount.toFixed(2)} DH</td>
                      <td>${t.payment_method === "cash" ? "Espèces" : "Crédit"}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
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
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Rapport Journalier</h1>
          <p className="text-slate-600">Résumé des transactions quotidiennes</p>
        </div>
      </div>

      {/* Date Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <label htmlFor="date" className="font-medium">Date:</label>
            </div>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
            <Button
              onClick={handleExportPDF}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Exporter PDF
            </Button>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exporter Excel
            </Button>
            <Button
              variant="outline"
              onClick={handlePrintReport}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
            <Button
              variant="outline"
              onClick={fetchTransactions}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
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
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Remboursements</p>
                <p className="text-2xl font-bold text-red-600">{totalRefunds.toFixed(2)} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Crédits Privés (Actifs)</p>
                <p className="text-2xl font-bold text-orange-600">{privateCreditsTotal.toFixed(2)} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Solde Net (Après Crédits)</p>
                <p className={`text-2xl font-bold ${netCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netCash.toFixed(2)} DH
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold text-purple-600">{transactionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Cash Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Détails de la Caisse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Solde Avant Crédits Privés</span>
                <span className={`font-bold ${netCashBeforeCredits >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netCashBeforeCredits.toFixed(2)} DH
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Crédits Privés Actifs</span>
                <span className="font-bold text-orange-600">-{privateCreditsTotal.toFixed(2)} DH</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="font-semibold">Solde Final</span>
                <span className={`font-bold text-lg ${netCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netCash.toFixed(2)} DH
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Impact des Crédits Privés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Total Crédits Actifs</span>
                <span className="font-bold text-orange-600">{privateCreditsTotal.toFixed(2)} DH</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Nombre de Crédits</span>
                <span className="font-medium">{privateCredits.filter(credit => !credit.status || credit.status === 'active').length}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="font-semibold">Disponibilité Réelle</span>
                <span className={`font-bold text-lg ${netCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netCash.toFixed(2)} DH
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                * Ce montant représente l'argent réellement disponible après déduction des crédits privés
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions du {new Date(selectedDate).toLocaleDateString('fr-FR')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune transaction pour cette date
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
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-slate-50">
                      <td className="p-2">
                        {new Date(transaction.date).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="p-2">
                        <Badge variant={transaction.type === "sale" ? "default" : "destructive"}>
                          {transaction.type === "sale" ? "Vente" : "Remboursement"}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Private Credits */}
      {privateCredits.filter(credit => !credit.status || credit.status === 'active').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Crédits Privés Actifs (Affectant la Caisse)</CardTitle>
            <CardDescription>
              Ces montants sont automatiquement déduits du solde de la caisse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Personne</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Montant</th>
                    <th className="text-left p-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {privateCredits
                    .filter(credit => !credit.status || credit.status === 'active')
                    .map((credit) => (
                      <tr key={credit.id} className="border-b hover:bg-slate-50">
                        <td className="p-2 font-medium">{credit.person_name}</td>
                        <td className="p-2">
                          <Badge variant="outline">
                            {credit.credit_type === 'loan_given' ? 'Prêt Accordé' : 'Prêt Reçu'}
                          </Badge>
                        </td>
                        <td className="p-2">{credit.description || '-'}</td>
                        <td className="text-right p-2 font-semibold text-orange-600">
                          {credit.amount.toFixed(2)} DH
                        </td>
                        <td className="p-2">
                          {new Date(credit.credit_date).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 