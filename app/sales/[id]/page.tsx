"use client"

import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download } from "lucide-react"
import Link from "next/link"
import { generateModernInvoiceHTML } from "../invoice-template"

interface Sale {
  id: number
  sale_date: string
  total_amount: number
  payment_method: string
  cash_amount?: number
  credit_amount?: number
  client_name?: string
  notes?: string
  items: SaleItem[]
}

interface SaleItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  additional_price: number
  total_price: number
}

export default function InvoicePage() {
  const params = useParams()
  const saleId = params.id as string
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (saleId) {
      fetchSale()
    }
  }, [saleId])

  const fetchSale = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sales/${saleId}`)
      if (!response.ok) {
        throw new Error("Vente non trouvée")
      }
      const data = await response.json()
      setSale(data)
    } catch (error) {
      console.error("Error fetching sale:", error)
      setError("Erreur lors du chargement de la vente")
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = async () => {
    if (!sale) return

    try {
      const invoiceHTML = generateModernInvoiceHTML(sale)
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert("Veuillez autoriser les popups pour cette fonction")
        return
      }

      printWindow.document.write(invoiceHTML)
      printWindow.document.close()
      
      setTimeout(() => {
        printWindow.print()
        setTimeout(() => {
          printWindow.close()
        }, 1000)
      }, 500)
    } catch (error) {
      console.error('PDF export error:', error)
      alert("Erreur lors de la génération du PDF")
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la facture...</p>
        </div>
      </div>
    )
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600 mb-4">{error || "Vente non trouvée"}</p>
          <Link href="/sales">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux ventes
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const totalLaborCost = sale.items?.reduce((sum, item) => sum + (item.additional_price || 0), 0) || 0
  const totalProductsCost = sale.items?.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header with Actions */}
        <div className="mb-6 flex justify-between items-center print:hidden">
          <Link href="/sales">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux ventes
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button onClick={exportToPDF} className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Invoice Container */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden print:shadow-none print:rounded-none">
          {/* Invoice Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 text-center relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-white bg-opacity-20 px-4 py-2 rounded-full text-sm font-semibold">
              #{sale.id}
            </div>
            <h1 className="text-4xl font-bold mb-2">FACTURE / فاتورة</h1>
            <p className="text-blue-100">Gestion Droguerie - Système de Gestion de Stock</p>
          </div>

          {/* Invoice Details */}
          <div className="p-8 bg-gray-50 border-b">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">N° Facture / رقم الفاتورة</p>
                  <p className="text-xl font-bold text-gray-900">#{sale.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Date / التاريخ</p>
                  <p className="text-lg font-semibold text-gray-900">{new Date(sale.sale_date).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Client / عميل</p>
                  <p className="text-lg font-semibold text-gray-900">{sale.client_name || 'Non spécifié'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Vendeur / البائع</p>
                  <p className="text-lg font-semibold text-gray-900">Système</p>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="p-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <th className="px-4 py-3 text-left font-semibold">N° / رقم</th>
                  <th className="px-4 py-3 text-left font-semibold">Désignation / البيان</th>
                  <th className="px-4 py-3 text-center font-semibold">Quantité / الكمية</th>
                  <th className="px-4 py-3 text-right font-semibold">Prix Unitaire / السعر (DH)</th>
                  <th className="px-4 py-3 text-right font-semibold">Montant / المبلغ (DH)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sale.items && sale.items.length > 0 ? (
                  sale.items.map((item, index) => {
                    const basePrice = item.quantity * item.unit_price
                    const laborCost = item.additional_price || 0
                    
                    return (
                      <React.Fragment key={item.id || index}>
                        {/* Product Row */}
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.product_name || 'Produit'}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{item.unit_price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{basePrice.toFixed(2)}</td>
                        </tr>
                        {/* Labor Cost Row */}
                        {laborCost > 0 && (
                          <tr className="bg-yellow-50 border-l-4 border-yellow-400">
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3 text-sm font-medium text-yellow-800 italic pl-8">+ Main d'œuvre</td>
                            <td className="px-4 py-3 text-sm text-center text-yellow-800">-</td>
                            <td className="px-4 py-3 text-sm text-right text-yellow-800">{laborCost.toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-yellow-800">{laborCost.toFixed(2)}</td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Aucun article</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Cost Breakdown */}
            {totalLaborCost > 0 && (
              <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 text-center">Détail des Coûts / تفاصيل التكاليف</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-blue-300 text-center">
                    <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Produits / المنتجات</p>
                    <p className="text-2xl font-bold text-blue-700 mt-2">{totalProductsCost.toFixed(2)} DH</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-yellow-300 text-center">
                    <p className="text-sm font-semibold text-yellow-600 uppercase tracking-wide">Main d'œuvre / العمالة</p>
                    <p className="text-2xl font-bold text-yellow-700 mt-2">{totalLaborCost.toFixed(2)} DH</p>
                  </div>
                </div>
                
                {/* Labor Summary */}
                <div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg flex justify-between items-center">
                  <span className="text-lg font-semibold text-yellow-800">Main d'œuvre / العمالة:</span>
                  <span className="text-2xl font-bold text-yellow-800">{totalLaborCost.toFixed(2)} DH</span>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-center">
              <p className="text-lg font-semibold mb-2">Total Général / المجموع العام</p>
              <p className="text-4xl font-bold">{sale.total_amount.toFixed(2)} DH</p>
            </div>
          </div>

          {/* Payment Details */}
          <div className="p-8 bg-gray-50 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Détails de la Vente / تفاصيل البيع</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 font-semibold">Méthode de Paiement / طريقة الدفع:</p>
                <p className="text-lg font-semibold text-gray-900">
                  {sale.payment_method === 'cash' ? 'Espèces / نقداً' : 
                   sale.payment_method === 'credit' ? 'Crédit / ائتمان' : 
                   'Paiement Mixte / دفع مختلط'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">Nombre d'Articles / عدد المواد:</p>
                <p className="text-lg font-semibold text-gray-900">{sale.items?.length || 0}</p>
              </div>
            </div>

            {/* Mixed Payment Details */}
            {sale.payment_method === 'mixed' && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-md font-semibold text-blue-900 mb-3">Détails du Paiement / تفاصيل الدفع</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-sm text-gray-600 font-semibold">Espèces / نقداً</p>
                    <p className="text-xl font-bold text-green-600">{sale.cash_amount?.toFixed(2) || '0.00'} DH</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-sm text-gray-600 font-semibold">Crédit / ائتمان</p>
                    <p className="text-xl font-bold text-purple-600">{sale.credit_amount?.toFixed(2) || '0.00'} DH</p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {sale.notes && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="text-md font-semibold text-yellow-800 mb-2">Notes / ملاحظات</h4>
                <p className="text-yellow-700 italic">{sale.notes}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-800 text-white p-6 text-center">
            <p className="text-lg font-semibold mb-2">Merci pour votre confiance / شكراً لتفتكم</p>
            <p className="text-sm text-gray-300 mb-1">Gestion Droguerie - Système de Gestion de Stock</p>
            <p className="text-xs text-gray-400">
              Généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
