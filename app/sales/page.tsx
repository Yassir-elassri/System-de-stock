"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Search, Plus, Printer, Edit, Trash2, Eye } from "lucide-react"
import { generateModernInvoiceHTML } from "./invoice-template"

interface Product {
  id: number
  name: string
  current_stock: number
  selling_price: number
  unit: string
}

interface Client {
  id: number
  name: string
  phone: string
  credit_limit: number
  current_credit: number
}

interface SaleItem {
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  additional_price: number
  total_price: number
}

interface Sale {
  id: number
  client_id: number
  client_name: string
  total_amount: number
  payment_method: string
  cash_amount: number
  credit_amount: number
  notes: string | null
  sale_date: string
  items: SaleItem[]
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    client_id: "",
    payment_method: "cash",
    notes: "",
    items: [] as SaleItem[]
  })

  // New sale form state
  const [newSaleData, setNewSaleData] = useState({
    client_id: "",
    payment_method: "cash",
    cash_amount: 0,
    credit_amount: 0,
    notes: "",
    items: [] as SaleItem[]
  })

  // Fetch data
  useEffect(() => {
    fetchSales()
    fetchProducts()
    fetchClients()
  }, [])

  // Export invoice to PDF
  const exportToPDF = async () => {
    if (!selectedSale) return

    try {
      // Create a temporary container for the invoice content
      const invoiceContent = document.querySelector('[data-radix-portal] [role="dialog"] > div:last-child') ||
                            document.querySelector('[role="dialog"] .max-w-4xl') ||
                            document.querySelector('.DialogContent .max-w-4xl')
      
      if (!invoiceContent) {
        // Try alternative selectors
        const alternativeContent = document.querySelector('.DialogContent') || 
                                 document.querySelector('[role="dialog"]') ||
                                 document.querySelector('.max-w-4xl')
        
        if (!alternativeContent) {
          toast.error("Impossible de générer le PDF - contenu non trouvé")
          return
        }
        
        console.log('Using alternative content:', alternativeContent)
      }

      // Create a new window for printing
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast.error("Veuillez autoriser les popups pour cette fonction")
        return
      }

      // Generate the modern invoice HTML content
      const invoiceHTML = generateModernInvoiceHTML(selectedSale)
      
      // Write the invoice content to the new window
      printWindow.document.write(invoiceHTML)
      printWindow.document.close()
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print()
        // Close the window after printing
        setTimeout(() => {
          printWindow.close()
        }, 1000)
      }, 500)
      
      toast.success("PDF généré avec succès")
    } catch (error) {
      console.error('PDF export error:', error)
      toast.error("Erreur lors de la génération du PDF")
    }
  }



  // Helper function to generate invoice HTML
  const generateInvoiceHTML = (sale: Sale) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facture #${sale.id}</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: black;
          }
          .invoice-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
          }
          .invoice-title {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
          }
          .invoice-subtitle {
            font-size: 14px;
            color: #6b7280;
          }
          .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
            text-align: center;
          }
          .detail-item {
            border: 1px solid #d1d5db;
            padding: 10px;
            border-radius: 5px;
          }
          .detail-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 5px;
          }
          .detail-value {
            font-size: 14px;
            font-weight: bold;
          }
          .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .invoice-table th,
          .invoice-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
          }
          .invoice-table th {
            background-color: #f3f4f6;
            font-weight: bold;
          }
          .invoice-total {
            text-align: right;
            font-size: 18px;
            font-weight: bold;
            color: #2563eb;
            border-top: 2px solid #2563eb;
            padding-top: 10px;
            margin-top: 20px;
          }
          .sale-details {
            margin-top: 20px;
            padding: 15px;
            border: 1px solid #d1d5db;
            border-radius: 5px;
          }
          .sale-details h3 {
            margin-top: 0;
            color: #374151;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #6b7280;
            font-size: 12px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div class="invoice-title">FACTURE / فاتورة</div>
          <div class="invoice-subtitle">Gestion Droguerie - Système de Gestion de Stock</div>
        </div>
        
        <div class="invoice-details">
          <div class="detail-item">
            <div class="detail-label">N° Facture / رقم الفاتورة</div>
            <div class="detail-value">#${sale.id}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Date / التاريخ</div>
            <div class="detail-value">${new Date(sale.sale_date).toLocaleDateString('fr-FR')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Client / عميل</div>
            <div class="detail-value">${sale.client_name || 'Client anonyme'}</div>
          </div>
        </div>
        
        <table class="invoice-table">
          <thead>
            <tr>
              <th>N° / رقم</th>
              <th>Désignation / البيان</th>
              <th>Quantité / الكمية</th>
              <th>Prix Unitaire / السعر (DH)</th>
              <th>Montant / المبلغ (DH)</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items && sale.items.length > 0 ? 
              sale.items.map((item: any, index: number) => {
                const basePrice = item.quantity * item.unit_price
                const laborCost = item.additional_price || 0
                const totalPrice = item.total_price
                
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.product_name || 'Produit'}</td>
                    <td>${item.quantity}</td>
                    <td>${item.unit_price.toFixed(2)}</td>
                    <td>${basePrice.toFixed(2)}</td>
                  </tr>
                  ${laborCost > 0 ? `
                    <tr style="background-color: #fef3c7; border-left: 4px solid #f59e0b;">
                      <td></td>
                      <td style="padding-left: 20px; font-style: italic; color: #92400e; font-weight: bold;">+ Main d'œuvre</td>
                      <td>-</td>
                      <td>${laborCost.toFixed(2)}</td>
                      <td style="color: #92400e; font-weight: bold;">${laborCost.toFixed(2)}</td>
                    </tr>
                  ` : ''}
                `
              }).join('') : 
              '<tr><td colspan="5" style="text-align: center;">Aucun article</td></tr>'
            }
          </tbody>
        </table>
        
        ${(() => {
          const totalLaborCost = sale.items?.reduce((sum: number, item: any) => sum + (item.additional_price || 0), 0) || 0;
          const totalProductsCost = sale.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0) || 0;
          
          return totalLaborCost > 0 ? `
            <div style="margin: 20px 0; padding: 15px; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;">
              <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 16px;">Détail des Coûts / تفاصيل التكاليف</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: center;">
                <div style="padding: 10px; background-color: #f0f9ff; border: 1px solid #3b82f6; border-radius: 5px;">
                  <p style="margin: 0; font-size: 12px; color: #1e40af; font-weight: bold;">Produits / المنتجات</p>
                  <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #1e40af;">${totalProductsCost.toFixed(2)} DH</p>
                </div>
                <div style="padding: 10px; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 5px;">
                  <p style="margin: 0; font-size: 12px; color: #92400e; font-weight: bold;">Main d'œuvre / العمالة</p>
                  <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #92400e;">${totalLaborCost.toFixed(2)} DH</p>
                </div>
              </div>
            </div>
          ` : '';
        })()}
        
        ${(() => {
          const totalLaborCost = sale.items?.reduce((sum: number, item: any) => sum + (item.additional_price || 0), 0) || 0;
          
          return totalLaborCost > 0 ? `
            <div style="margin: 15px 0; padding: 15px; background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; color: #92400e; font-size: 16px;">Main d'œuvre / العمالة:</span>
                <span style="font-weight: bold; color: #92400e; font-size: 20px;">${totalLaborCost.toFixed(2)} DH</span>
              </div>
            </div>
          ` : '';
        })()}
        
        <div class="invoice-total">
          Total Général / المجموع العام: ${sale.total_amount.toFixed(2)} DH
        </div>
        
                  <div class="sale-details">
            <h3>Détails de la Vente / تفاصيل البيع</h3>
            <p><strong>Méthode de Paiement / طريقة الدفع:</strong> ${
              sale.payment_method === 'cash' ? 'Espèces / نقداً' : 
              sale.payment_method === 'credit' ? 'Crédit / ائتمان' : 
              'Paiement Mixte / دفع مختلط'
            }</p>
            <p><strong>Nombre d\'Articles / عدد المواد:</strong> ${sale.items?.length || 0}</p>
            
            ${sale.payment_method === 'mixed' ? `
              <div style="margin: 15px 0; padding: 15px; border: 1px solid #d1d5db; border-radius: 5px; background-color: #f0f9ff;">
                <h4 style="margin: 0 0 10px 0; color: #374151;">Détails du Paiement / تفاصيل الدفع:</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: center;">
                  <div>
                    <p style="margin: 0; font-size: 12px; color: #6b7280;">Espèces / نقداً</p>
                    <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #059669;">${sale.cash_amount?.toFixed(2) || '0.00'} DH</p>
                  </div>
                  <div>
                    <p style="margin: 0; font-size: 12px; color: #6b7280;">Crédit / ائتمان</p>
                    <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #7c3aed;">${sale.credit_amount?.toFixed(2) || '0.00'} DH</p>
                  </div>
                </div>
              </div>
            ` : ''}
            
            ${sale.notes ? `<p><strong>Notes / ملاحظات:</strong> ${sale.notes}</p>` : ''}
          </div>
        
        <div class="footer">
          <p>Merci pour votre confiance / شكراً لتفتكم</p>
          <p>Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        </div>
      </body>
      </html>
    `
  }





  const fetchSales = async () => {
    try {
      const response = await fetch("/api/sales")
      const data = await response.json()
      setSales(data)
    } catch (error) {
      console.error("Error fetching sales:", error)
      toast.error("Erreur lors du chargement des ventes")
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products")
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Erreur lors du chargement des produits")
    }
  }

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients")
      const data = await response.json()
      setClients(data)
    } catch (error) {
      console.error("Error fetching clients:", error)
      toast.error("Erreur lors du chargement des clients")
    }
  }

  // Handle new sale
  const handleNewSale = () => {
    setIsEditing(false)
    setNewSaleData({
      client_id: "",
      payment_method: "cash",
      cash_amount: 0,
      credit_amount: 0,
      notes: "",
      items: []
    })
    setIsModalOpen(true)
  }

  // Add item to sale
  const addItem = () => {
    setNewSaleData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: 0,
        product_name: "",
        quantity: 1,
        unit_price: 0,
        additional_price: 0,
        total_price: 0
      }]
    }))
  }

  // Update item
  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    setNewSaleData(prev => {
      const newItems = [...prev.items]
      newItems[index] = { ...newItems[index], [field]: value }
      
      // Calculate total price
      if (field === 'quantity' || field === 'unit_price' || field === 'additional_price') {
        const basePrice = newItems[index].quantity * newItems[index].unit_price
        const additionalPrice = newItems[index].additional_price || 0
        newItems[index].total_price = basePrice + additionalPrice
      }
      
      // Update product name when product_id changes
      if (field === 'product_id') {
        const product = products.find(p => p.id === value)
        newItems[index].product_name = product?.name || ""
        newItems[index].unit_price = product?.selling_price || 0
        const basePrice = newItems[index].quantity * (product?.selling_price || 0)
        const additionalPrice = newItems[index].additional_price || 0
        newItems[index].total_price = basePrice + additionalPrice
      }
      
      return { ...prev, items: newItems }
    })
  }

  // Remove item
  const removeItem = (index: number) => {
    setNewSaleData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  // Save sale
  const saveSale = async () => {
    // Validation
    if (!newSaleData.client_id) {
      toast.error("Veuillez sélectionner un client")
      return
    }
    if (newSaleData.items.length === 0) {
      toast.error("Veuillez ajouter au moins un article")
      return
    }
    if (newSaleData.items.some(item => item.product_id === 0)) {
      toast.error("Veuillez sélectionner tous les produits")
      return
    }

    // Calculate total amount
    const total_amount = newSaleData.items.reduce((sum, item) => sum + item.total_price, 0)
    
    // Calculate payment amounts based on payment method
    let cash_amount = 0
    let credit_amount = 0
    
    if (newSaleData.payment_method === 'cash') {
      cash_amount = total_amount
      credit_amount = 0
    } else if (newSaleData.payment_method === 'credit') {
      cash_amount = 0
      credit_amount = total_amount
    } else if (newSaleData.payment_method === 'mixed') {
      cash_amount = newSaleData.cash_amount
      credit_amount = newSaleData.credit_amount
      
      // Validate that cash + credit equals total
      if (Math.abs((cash_amount + credit_amount) - total_amount) > 0.01) {
        toast.error("Le montant en espèces plus le crédit doit égaler le total")
      return
      }
    }
    
    // Prepare sale data
    const saleData = {
      ...newSaleData,
      total_amount: total_amount,
      cash_amount: cash_amount,
      credit_amount: credit_amount
    }

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData)
      })

      if (response.ok) {
        toast.success("Vente créée avec succès")
        setIsModalOpen(false)
        fetchSales()
      } else {
        const error = await response.json()
        toast.error(error.message || error.details || "Erreur lors de la création de la vente")
      }
    } catch (error) {
      console.error("Error creating sale:", error)
      toast.error("Erreur lors de la création de la vente")
    }
  }

  // View sale details
  const viewSale = async (sale: Sale) => {
    try {
      const response = await fetch(`/api/sales/${sale.id}`)
      const saleData = await response.json()
      setSelectedSale(saleData)
      setIsPrintModalOpen(true)
    } catch (error) {
      console.error("Error fetching sale details:", error)
      toast.error("Erreur lors du chargement des détails")
    }
  }

  // Edit sale
  const editSale = async (sale: Sale) => {
    try {
      const response = await fetch(`/api/sales/${sale.id}`)
      const saleData = await response.json()
      setSelectedSale(saleData)
      setFormData({
        client_id: saleData.client_id?.toString() || "",
        payment_method: saleData.payment_method || "cash",
        notes: saleData.notes || "",
        items: saleData.items || []
      })
      setIsEditModalOpen(true)
    } catch (error) {
      console.error("Error fetching sale details:", error)
      toast.error("Erreur lors du chargement des détails")
    }
  }

  // Update sale
  const updateSale = async () => {
    if (!selectedSale) return

    try {
      const response = await fetch(`/api/sales/${selectedSale.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: formData.client_id,
          payment_method: formData.payment_method,
          notes: formData.notes,
          items: formData.items.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            additional_price: item.additional_price,
            total_price: item.total_price
          }))
        })
      })

      if (response.ok) {
        toast.success("Vente modifiée avec succès")
        setIsEditModalOpen(false)
        fetchSales()
      } else {
        const error = await response.json()
        toast.error(error.message || "Erreur lors de la modification")
      }
    } catch (error) {
      console.error("Error updating sale:", error)
      toast.error("Erreur lors de la modification")
    }
  }

  // Delete sale
  const deleteSale = async (saleId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette vente ?")) return

    try {
      const response = await fetch(`/api/sales/${saleId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast.success("Vente supprimée avec succès")
        fetchSales()
      } else {
        toast.error("Erreur lors de la suppression")
      }
    } catch (error) {
      console.error("Error deleting sale:", error)
      toast.error("Erreur lors de la suppression")
    }
  }

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = newSaleData.items.reduce((sum, item) => sum + item.total_price, 0)
    return {
      subtotal,
      total: subtotal
    }
  }

  const filteredSales = sales.filter(sale => 
    sale.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.id.toString().includes(searchTerm)
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Ventes</h1>
        <Button onClick={handleNewSale} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
            Nouvelle Vente
          </Button>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Sales */}
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total des Ventes</p>
                <p className="text-2xl font-bold">{sales.length}</p>
              </div>
              <div className="bg-white/20 p-2 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Revenu Total</p>
                <p className="text-2xl font-bold">
                  {sales.reduce((sum, sale) => sum + sale.total_amount, 0).toFixed(2)} DH
                </p>
              </div>
              <div className="bg-white/20 p-2 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash Sales */}
        <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Ventes en Espèces</p>
                <p className="text-2xl font-bold">
                  {sales.filter(sale => 
                    sale.payment_method === 'cash' || 
                    (sale.payment_method === 'mixed' && sale.cash_amount > 0)
                  ).length}
                </p>
              </div>
              <div className="bg-white/20 p-2 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Sales */}
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
            <div>
                <p className="text-sm opacity-90">Ventes à Crédit</p>
              <p className="text-2xl font-bold">
                  {sales.filter(sale => 
                    sale.payment_method === 'credit' || 
                    (sale.payment_method === 'mixed' && sale.credit_amount > 0)
                  ).length}
                </p>
              </div>
              <div className="bg-white/20 p-2 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Sales Chart */}
      <Card>
          <CardHeader>
            <CardTitle>Ventes Récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sales.slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      sale.payment_method === 'cash' ? 'bg-green-500' : 
                      sale.payment_method === 'credit' ? 'bg-purple-500' :
                      sale.payment_method === 'mixed' ? 'bg-blue-500' : 'bg-gray-500'
                    }`}></div>
                    <div>
                      <p className="font-medium">Vente #{sale.id}</p>
                      <p className="text-sm text-gray-600">{sale.client_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{sale.total_amount.toFixed(2)} DH</p>
                    <p className="text-xs text-gray-500">
                      {new Date(sale.sale_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

        {/* Payment Methods Distribution */}
      <Card>
        <CardHeader>
            <CardTitle>Répartition des Paiements</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span>Espèces</span>
                </div>
                <span className="font-semibold">
                  {sales.length > 0 ? 
                    Math.round((sales.filter(sale => 
                      sale.payment_method === 'cash' || 
                      (sale.payment_method === 'mixed' && sale.cash_amount > 0)
                    ).length / sales.length) * 100) : 0
                  }%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                  <span>Crédit</span>
                </div>
                <span className="font-semibold">
                  {sales.length > 0 ? 
                    Math.round((sales.filter(sale => 
                      sale.payment_method === 'credit' || 
                      (sale.payment_method === 'mixed' && sale.credit_amount > 0)
                    ).length / sales.length) * 100) : 0
                  }%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{
                  width: `${sales.length > 0 ? 
                    (sales.filter(sale => 
                      sale.payment_method === 'cash' || 
                      (sale.payment_method === 'mixed' && sale.cash_amount > 0)
                    ).length / sales.length) * 100 : 0
                  }%`
                }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher par client ou numéro de vente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="grid gap-4">
                {filteredSales.map((sale) => (
          <Card key={sale.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold">Vente #{sale.id}</h3>
                    <Badge variant={sale.payment_method === 'cash' ? 'default' : 'secondary'}>
                      {sale.payment_method === 'cash' ? 'Espèces' : 'Crédit'}
                        </Badge>
                          </div>
                  <p className="text-gray-600">Client: {sale.client_name}</p>
                  <p className="text-gray-600">
                    Date: {new Date(sale.sale_date).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-gray-600">
                    Articles: {sale.items?.length || 0} | Total: {sale.total_amount.toFixed(2)} DH
                  </p>
                      </div>
                <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                    onClick={() => viewSale(sale)}
                        >
                    <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editSale(sale)}
                          className="text-green-600 hover:text-green-700"
                        >
                    <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/sales/${sale.id}`, '_blank')}
                          className="text-blue-600 hover:text-blue-700"
                        >
                    <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                    onClick={() => deleteSale(sale.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                    <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
          </div>
        </CardContent>
      </Card>
        ))}
      </div>

      {/* New Sale Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle Vente</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
                        {/* Client and Payment */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client</Label>
                <Select
                  value={newSaleData.client_id}
                  onValueChange={(value) => setNewSaleData(prev => ({ ...prev, client_id: value }))}
                >
                  <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                    {clients.sort((a, b) => a.name.localeCompare(b.name)).map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
              
              <div>
                <Label>Méthode de Paiement</Label>
              <Select
                  value={newSaleData.payment_method}
                  onValueChange={(value) => setNewSaleData(prev => ({ ...prev, payment_method: value }))}
              >
                  <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="credit">Crédit</SelectItem>
                    <SelectItem value="mixed">Paiement Mixte</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>
            
            {/* Mixed Payment Fields */}
            {newSaleData.payment_method === 'mixed' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
                <div>
                  <Label>Montant en Espèces</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newSaleData.cash_amount}
                    onChange={(e) => {
                      const cashAmount = parseFloat(e.target.value) || 0
                      setNewSaleData(prev => ({ 
                        ...prev, 
                        cash_amount: cashAmount,
                        credit_amount: Math.max(0, (calculateTotals().total || 0) - cashAmount)
                      }))
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Montant en Crédit</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newSaleData.credit_amount}
                    onChange={(e) => {
                      const creditAmount = parseFloat(e.target.value) || 0
                      setNewSaleData(prev => ({ 
                        ...prev, 
                        credit_amount: creditAmount,
                        cash_amount: Math.max(0, (calculateTotals().total || 0) - creditAmount)
                      }))
                    }}
                    placeholder="0.00"
                  />
              </div>
                <div className="col-span-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Total: {calculateTotals().total.toFixed(2)} DH</span>
                    <span>Restant: {Math.abs(calculateTotals().total - newSaleData.cash_amount - newSaleData.credit_amount).toFixed(2)} DH</span>
          </div>
                </div>
              </div>
            )}
            
            {/* Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <Label>Articles</Label>
                <Button onClick={addItem} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter Article
                </Button>
              </div>
              
              <div className="space-y-4">
                {newSaleData.items.map((item, index) => (
                  <div key={index} className="border p-4 rounded-lg space-y-4">
                    {/* Main Product Information */}
                    <div className="grid grid-cols-5 gap-4 items-end">
                      <div className="col-span-2">
                        <Label>Produit</Label>
                        <Select
                          value={item.product_id.toString()}
                          onValueChange={(value) => updateItem(index, 'product_id', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un produit" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} (Stock: {product.current_stock})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Quantité</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      
                      <div>
                        <Label>Prix Unitaire</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div>
                        <Label>Total Base</Label>
                        <Input
                          value={(item.quantity * item.unit_price).toFixed(2)}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                    </div>

                    {/* Additional Price Section */}
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-3 gap-4 items-end">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Main d'œuvre</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.additional_price}
                            onChange={(e) => updateItem(index, 'additional_price', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="border-orange-200 focus:border-orange-400"
                          />
                          <p className="text-xs text-gray-500 mt-1">Coût de la main d'œuvre...</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Total Final</Label>
                          <Input
                            value={item.total_price.toFixed(2)}
                            readOnly
                            className="bg-blue-50 border-blue-200 font-semibold text-blue-700"
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={() => removeItem(index)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Input
                value={newSaleData.notes}
                onChange={(e) => setNewSaleData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes optionnelles..."
              />
                </div>

            {/* Totals */}
            <div className="border-t pt-4">
              <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total: {calculateTotals().total.toFixed(2)} DH</span>
                  </div>
                
                {newSaleData.payment_method === 'mixed' && (
                  <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Espèces</p>
                      <p className="text-lg font-semibold text-green-600">{(newSaleData.cash_amount || 0).toFixed(2)} DH</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Crédit</p>
                      <p className="text-lg font-semibold text-purple-600">{(newSaleData.credit_amount || 0).toFixed(2)} DH</p>
                </div>
              </div>
            )}
                
                {newSaleData.payment_method === 'mixed' && (
                  <div className="text-center">
                    <p className={`text-sm ${Math.abs(calculateTotals().total - (newSaleData.cash_amount || 0) - (newSaleData.credit_amount || 0)) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(calculateTotals().total - (newSaleData.cash_amount || 0) - (newSaleData.credit_amount || 0)) < 0.01 
                        ? '✓ Paiement équilibré' 
                        : `⚠ Restant: ${Math.abs(calculateTotals().total - (newSaleData.cash_amount || 0) - (newSaleData.credit_amount || 0)).toFixed(2)} DH`
                      }
                    </p>
                  </div>
                )}
          </div>

              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
                  <Button onClick={saveSale} className="bg-blue-600 hover:bg-blue-700">
                    Enregistrer la Vente
            </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Invoice Modal */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:p-0 print:fixed print:inset-0 print:z-50 print:bg-white">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center justify-between">
              <span>Facture de Vente / فاتورة البيع</span>
              <Button
                onClick={() => exportToPDF()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-4 print:p-0 print:space-y-1 print:bg-white print:text-black print:block">
              {/* Company Header for Print */}
              <div className="hidden print:block text-center pb-1 mb-2">
                <div className="text-right text-xs text-gray-500 mb-1">
                  {new Date().toLocaleDateString('fr-FR')}, {new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}
                </div>
                <div className="text-right text-xs text-gray-500 mb-1">
                  Facture #{selectedSale.id}
                </div>
                <h1 className="text-2xl font-bold text-blue-600 mb-1">FACTURE / فاتورة</h1>
                <div className="text-center text-sm text-gray-600">
                  Gestion Droguerie - Système de Gestion de Stock
                </div>
              </div>

              {/* Company Header for Screen */}
              <div className="print:hidden text-center pb-2 mb-3">
                <h1 className="text-2xl font-bold text-blue-600 mb-1">FACTURE / فاتورة</h1>
                <div className="text-center text-sm text-gray-600">
                  Gestion Droguerie - Système de Gestion de Stock
                </div>
              </div>

              {/* Invoice Header */}
              <div className="border-b-2 border-blue-300 pb-1 mb-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                    <p className="text-xs text-gray-600 mb-1">N° Facture / رقم الفاتورة</p>
                    <p className="text-sm font-semibold text-gray-900">#{selectedSale.id}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-600 mb-1">Date / التاريخ</p>
                    <p className="text-sm font-semibold text-gray-900">{new Date(selectedSale.sale_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-600 mb-1">Client / عميل</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedSale.client_name || 'Client anonyme'}</p>
                      </div>
                  </div>
                </div>

              {/* Invoice Items Table */}
              <div className="border rounded-lg overflow-hidden print:border-2 print:border-gray-300 print:rounded-none print:block">
                <table className="w-full print:border-collapse print:table print:w-full">
                  <thead className="bg-gray-100 border-b print:bg-gray-100 print:border-b print:border-gray-300 print:table-header-group">
                    <tr className="print:table-row">
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 print:text-xs print:py-0 print:border print:border-gray-300 print:table-cell">N° / رقم</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 print:text-xs print:py-0 print:border print:border-gray-300 print:table-cell">Désignation / البيان</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 print:text-xs print:py-0 print:border print:border-gray-300 print:table-cell">Quantité / الكمية</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 print:text-xs print:py-0 print:border print:border-gray-300 print:table-cell">Prix Unitaire / السعر / (DH) الوحدة (درهم)</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 print:text-xs print:py-0 print:border print:border-gray-300 print:table-cell">Montant / المبلغ / (DH) (درهم)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 print:divide-y-0 print:table-row-group">
                    {selectedSale.items && selectedSale.items.length > 0 ? (
                      selectedSale.items.map((item: any, index: number) => {
                        const basePrice = item.quantity * item.unit_price
                        const laborCost = item.additional_price || 0
                        
                        return (
                          <React.Fragment key={item.id || index}>
                            <tr className="print:border-b print:border-gray-300 print:table-row">
                              <td className="px-2 py-1 text-center print:text-xs print:py-0 print:border print:border-gray-300 print:table-cell">
                                {index + 1}
                              </td>
                              <td className="px-2 py-1 font-medium print:text-xs print:py-0 print:border print:border-gray-300 print:table-cell">
                                {item.product_name || 'Produit'}
                              </td>
                              <td className="px-2 py-1 text-center print:text-xs print:py-0 print:border print:border-gray-300 print:table-cell">
                                {item.quantity}
                              </td>
                              <td className="px-2 py-1 text-center print:text-xs print:py-0 print:border print:border-gray-300 print:table-cell">
                                {item.unit_price.toFixed(2)}
                              </td>
                              <td className="px-2 py-1 text-center font-medium print:text-xs print:py-0 print:border print:border-gray-300 print:table-cell">
                                {basePrice.toFixed(2)}
                              </td>
                            </tr>
                            {laborCost > 0 && (
                              <tr className="print:border-b print:border-gray-300 print:table-row bg-orange-50 border-l-4 border-orange-400">
                                <td className="px-2 py-1 text-center print:text-xs print:py-0 print:border print:border-gray-300 print:table-cell"></td>
                                <td className="px-2 py-1 font-medium print:text-xs print:py-0 print:border print:border-gray-300 print:table-cell pl-6 italic text-orange-700">
                                  + Main d'œuvre
                                </td>
                                <td className="px-2 py-1 text-center print:text-xs print:py-0 print:border print:border-gray-300 print:table-cell">
                                  -
                                </td>
                                <td className="px-2 py-1 text-center print:text-xs print:py-0 print:border print:border-gray-300 print:table-cell">
                                  {laborCost.toFixed(2)}
                                </td>
                                <td className="px-2 py-1 text-center font-medium print:text-xs print:py-0 print:border print:border-gray-300 print:table-cell text-orange-700">
                                  {laborCost.toFixed(2)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })
                    ) : (
                      <tr className="print:table-row">
                        <td colSpan={5} className="text-center py-4 text-gray-500 print:table-cell">
                          Aucun article
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

                            {/* Labor Costs Breakdown */}
              {(() => {
                const totalLaborCost = selectedSale.items?.reduce((sum: number, item: any) => sum + (item.additional_price || 0), 0) || 0;
                const totalProductsCost = selectedSale.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0) || 0;
                
                return totalLaborCost > 0 ? (
                  <>
                    <div className="border-t border-gray-200 pt-4 mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Détail des Coûts / تفاصيل التكاليف</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                          <p className="text-xs text-blue-600 font-medium mb-1">Produits / المنتجات</p>
                          <p className="text-lg font-bold text-blue-700">{totalProductsCost.toFixed(2)} DH</p>
                        </div>
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-center">
                          <p className="text-xs text-orange-600 font-medium mb-1">Main d'œuvre / العمالة</p>
                          <p className="text-lg font-bold text-orange-700">{totalLaborCost.toFixed(2)} DH</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Simple Labor Costs Line */}
                    <div className="border-t border-orange-200 pt-2 mb-4">
                      <div className="flex justify-between items-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <span className="font-semibold text-orange-700">Main d'œuvre / العمالة:</span>
                        <span className="font-bold text-orange-700 text-lg">{totalLaborCost.toFixed(2)} DH</span>
                      </div>
                    </div>
                  </>
                ) : null;
              })()}

                            {/* Totals */}
              <div className="border-t-2 border-blue-300 pt-2">
                <div className="flex justify-between items-center text-lg font-semibold text-blue-600">
                  <span>Total Général / المجموع العام</span>
                  <span>{selectedSale.total_amount.toFixed(2)} DH</span>
              </div>
            </div>

                            {/* Sale Details */}
              <div className="border-t border-gray-200 pt-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Détails de la Vente / تفاصيل البيع</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="text-gray-600">Méthode de Paiement / طريقة الدفع:</span>
                    <span className="ml-2 font-medium">
                      {selectedSale.payment_method === 'cash' ? 'Espèces / نقداً' : 
                       selectedSale.payment_method === 'credit' ? 'Crédit / ائتمان' : 
                       'Paiement Mixte / دفع مختلط'}
                    </span>
                </div>
                <div>
                    <span className="text-gray-600">Nombre d&apos;Articles / عدد المواد:</span>
                    <span className="ml-2 font-medium">{selectedSale.items?.length || 0}</span>
                </div>

                  {/* Mixed Payment Details */}
                  {selectedSale.payment_method === 'mixed' && (
                    <>
                      <div className="col-span-2">
                        <span className="text-gray-600">Détails du Paiement / تفاصيل الدفع:</span>
                  </div>
                      <div className="col-span-2 grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Espèces / نقداً</p>
                          <p className="text-lg font-semibold text-green-600">{selectedSale.cash_amount?.toFixed(2) || '0.00'} DH</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Crédit / ائتمان</p>
                          <p className="text-lg font-semibold text-purple-600">{selectedSale.credit_amount?.toFixed(2) || '0.00'} DH</p>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {selectedSale.notes && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Notes / ملاحظات:</span>
                      <span className="ml-2">{selectedSale.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between text-xs text-gray-500 print:text-xs print:pt-2">
                <p>Merci pour votre confiance</p>
                <p>شكراً لتفتكم</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Sale Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier la Vente #{selectedSale?.id}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Client Selection */}
            <div>
              <Label htmlFor="client_id">Client</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({...formData, client_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.sort((a, b) => a.name.localeCompare(b.name)).map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div>
              <Label htmlFor="payment_method">Méthode de Paiement</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({...formData, payment_method: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="credit">Crédit</SelectItem>
                  <SelectItem value="mixed">Paiement Mixte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Notes additionnelles..."
              />
            </div>

            {/* Sale Items - Editable */}
            {selectedSale && selectedSale.items && selectedSale.items.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Articles de la Vente</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newItem = {
                        product_id: products.length > 0 ? products[0].id : 1,
                        product_name: products.length > 0 ? products[0].name : "Nouveau Produit",
                        quantity: 1,
                        unit_price: products.length > 0 ? products[0].selling_price : 0,
                        additional_price: 0,
                        total_price: products.length > 0 ? products[0].selling_price : 0
                      }
                      setFormData({
                        ...formData,
                        items: [...formData.items, newItem]
                      })
                    }}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter Article
                  </Button>
                </div>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="space-y-2">
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                        <div className="flex-1 grid grid-cols-4 gap-2">
                          <Select
                            value={item.product_id?.toString() || ""}
                            onValueChange={(value) => {
                              const selectedProduct = products.find(p => p.id.toString() === value)
                              const updatedItems = [...formData.items]
                              if (selectedProduct) {
                                updatedItems[index].product_id = selectedProduct.id
                                updatedItems[index].product_name = selectedProduct.name
                                updatedItems[index].unit_price = selectedProduct.selling_price
                                updatedItems[index].total_price = updatedItems[index].quantity * selectedProduct.selling_price + updatedItems[index].additional_price
                              }
                              setFormData({...formData, items: updatedItems})
                            }}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Sélectionner un produit" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  {product.name} - {product.selling_price.toFixed(2)} DH (Stock: {product.current_stock})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const updatedItems = [...formData.items]
                              updatedItems[index].quantity = parseFloat(e.target.value) || 0
                              updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price + updatedItems[index].additional_price
                              setFormData({...formData, items: updatedItems})
                            }}
                            placeholder="Quantité"
                            className="text-sm"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => {
                              const updatedItems = [...formData.items]
                              updatedItems[index].unit_price = parseFloat(e.target.value) || 0
                              updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price + updatedItems[index].additional_price
                              setFormData({...formData, items: updatedItems})
                            }}
                            placeholder="Prix unitaire"
                            className="text-sm"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            value={item.additional_price}
                            onChange={(e) => {
                              const updatedItems = [...formData.items]
                              updatedItems[index].additional_price = parseFloat(e.target.value) || 0
                              updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price + updatedItems[index].additional_price
                              setFormData({...formData, items: updatedItems})
                            }}
                            placeholder="Prix additionnel"
                            className="text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="min-w-[120px] text-right">
                            <div className="text-xs text-gray-500 mb-1">{item.product_name}</div>
                            <div className="font-semibold">{item.total_price.toFixed(2)} DH</div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updatedItems = formData.items.filter((_, i) => i !== index)
                              setFormData({...formData, items: updatedItems})
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center font-bold text-lg">
                        <span>Total:</span>
                        <span>{formData.items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)} DH</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={updateSale}
                className="bg-green-600 hover:bg-green-700"
              >
                Sauvegarder les Modifications
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}