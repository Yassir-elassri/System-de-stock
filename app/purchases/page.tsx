"use client"

import React, { useState, useEffect, useMemo } from "react"
import { normalizeSearchQuery, purchaseMatchesSearch } from "@/lib/search-utils"
import {
  aggregatePurchaseDocumentTotals,
  computePurchaseLine,
  parseMoney,
  recalculatePurchaseItemRow,
  round2,
  sumLineTotals,
} from "@/lib/purchase-calculations"
import { Purchase, Supplier } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, ShoppingCart, DollarSign, Truck, TrendingUp, Eye, Edit, Trash2, Filter, X, Download } from "lucide-react"
import { toast } from "sonner"

// Utility function to safely parse JSON responses
/** Avoid broken HTML / missing rows when designation or notes contain <, >, etc. */
function escapeHtmlInvoice(s: unknown): string {
  if (s == null) return ""
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

const safeJsonParse = async (response: Response) => {
  const contentType = response.headers.get("content-type")
  if (contentType && contentType.includes("application/json")) {
    try {
      return await response.json()
    } catch (error) {
      console.error("Error parsing JSON response:", error)
      throw new Error("Invalid JSON response")
    }
  } else {
    console.error("Non-JSON response received:", contentType)
    throw new Error("Non-JSON response received")
  }
}

export default function PurchasesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false)
  const [isViewPurchaseModalOpen, setIsViewPurchaseModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isPrintInvoiceModalOpen, setIsPrintInvoiceModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    supplier_id: '',
    total_amount: '',
    payment_method: '',
    notes: '',
    status: 'pending',
    invoice_number: '',
    purchase_date: new Date().toISOString().split('T')[0]
  })

  const [purchaseItems, setPurchaseItems] = useState([
    {
      id: 1,
      designation: '',
      quantity: '',
      unit_price: '',
      additional_price: '0.00',
      amount: '',
      avance: '0.00',
      reste: '0.00'
    }
  ])

  // Initial calculation for items on mount
  useEffect(() => {
    setPurchaseItems((prevItems) => prevItems.map(recalculatePurchaseItemRow))
  }, [])

  // Generate Purchase Invoice HTML (totals from aggregatePurchaseDocumentTotals = same rules as the form)
  const generatePurchaseInvoiceHTML = (purchase: any) => {
    const items = purchase.items ?? []
    const agg = aggregatePurchaseDocumentTotals(items)
    const totalGeneral =
      items.length > 0 ? agg.totalSum : round2(parseMoney(purchase.total_amount))
    return `
      <!DOCTYPE html>
      <html lang="fr" dir="ltr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Facture d'Achat #${purchase.id}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
        body {
          font-family: 'Segoe UI', 'Tahoma', 'Arial', 'Noto Sans Arabic', 'Amiri', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 10px;
          color: #2d3748;
          line-height: 1.4;
          direction: ltr;
        }
        
        .arabic-text {
          font-family: 'Noto Sans Arabic', 'Amiri', 'Segoe UI', sans-serif;
          direction: rtl;
          text-align: right;
          unicode-bidi: bidi-override;
        }
          
          .invoice-wrapper {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            overflow: hidden;
            position: relative;
          }
          
          .invoice-wrapper::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #059669, #10b981, #34d399);
          }
          
          .invoice-header {
            background: linear-gradient(135deg, #047857 0%, #059669 50%, #10b981 100%);
            color: white;
            padding: 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          
          .invoice-title {
            font-size: 28px;
            font-weight: 800;
            margin: 0 0 8px 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          
          .invoice-subtitle {
            font-size: 16px;
            opacity: 0.95;
            margin: 0;
          }
          
          .invoice-number {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            backdrop-filter: blur(10px);
          }
          
          .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            padding: 20px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .detail-section {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          
          .detail-item {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          
          .detail-label {
            font-size: 12px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .detail-value {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
            padding: 8px 0;
            border-bottom: 2px solid #e2e8f0;
          }
          
          .invoice-content {
            padding: 20px;
          }
          
          .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
          }
          
          .invoice-table thead {
            background: linear-gradient(135deg, #047857, #059669);
            color: white;
          }
          
          .invoice-table th {
            padding: 8px 6px;
            text-align: center;
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .invoice-table td {
            padding: 8px 6px;
            text-align: center;
            border-bottom: 1px solid #f1f5f9;
            font-size: 12px;
          }
          
          .invoice-total {
            margin: 15px 0;
            padding: 15px;
            background: linear-gradient(135deg, #047857, #059669);
            color: white;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 12px -3px rgba(4, 120, 87, 0.3);
          }
          
          .total-label {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 4px;
            opacity: 0.9;
          }
          
          .total-amount {
            font-size: 24px;
            font-weight: 800;
            margin: 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          
          .payment-details {
            margin: 15px 0;
            padding: 15px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }
          
          .payment-title {
            font-size: 14px;
            font-weight: 700;
            color: #374151;
            margin-bottom: 10px;
            text-align: center;
          }
          
          .payment-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 10px;
          }
          
          .payment-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .payment-label {
            font-weight: 600;
            color: #64748b;
          }
          
          .payment-value {
            font-weight: 700;
            color: #1e293b;
          }
          
          .footer {
            background: #1e293b;
            color: white;
            padding: 15px;
            text-align: center;
          }
          
          .footer-title {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 5px;
          }
          
          .footer-subtitle {
            font-size: 12px;
            opacity: 0.8;
            margin-bottom: 8px;
          }
          
          .footer-info {
            font-size: 12px;
            opacity: 0.7;
          }
          
          .costs-breakdown {
            margin: 15px 0;
            padding: 15px;
            background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
            border: 2px solid #0ea5e9;
            border-radius: 8px;
            box-shadow: 0 2px 4px -1px rgba(14, 165, 233, 0.1);
          }
          
          .costs-title {
            font-size: 16px;
            font-weight: 700;
            color: #0c4a6e;
            margin-bottom: 10px;
            text-align: center;
          }
          
          .costs-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          
          .cost-item {
            padding: 10px;
            border-radius: 6px;
            text-align: center;
            transition: transform 0.2s ease;
          }
          
          .cost-item:hover {
            transform: translateY(-2px);
          }
          
          .cost-item.products {
            background: linear-gradient(135deg, #dbeafe, #bfdbfe);
            border: 2px solid #3b82f6;
          }
          
          .cost-item.labor {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            border: 2px solid #f59e0b;
          }
          
          .cost-label {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .cost-label.products {
            color: #1e40af;
          }
          
          .cost-label.labor {
            color: #92400e;
          }
          
          .cost-amount {
            font-size: 18px;
            font-weight: 800;
            margin: 0;
          }
          
          .cost-amount.products {
            color: #1e40af;
          }
          
          .cost-amount.labor {
            color: #92400e;
          }
          
          .labor-summary {
            margin: 10px 0;
            padding: 10px;
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            border: 2px solid #f59e0b;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px -1px rgba(245, 158, 11, 0.2);
          }
          
          .labor-summary-label {
            font-size: 14px;
            font-weight: 700;
            color: #92400e;
          }
          
          .labor-summary-amount {
            font-size: 20px;
            font-weight: 800;
            color: #92400e;
          }
        </style>
      </head>
      <body>
        <div class="invoice-wrapper">
          <div class="invoice-header">
            <div class="invoice-number">#${purchase.id}</div>
            <div class="invoice-title">FACTURE D'ACHAT / <span class="arabic-text">فاتورة الشراء</span></div>
            <div class="invoice-subtitle">Gestion Droguerie - Système de Gestion de Stock</div>
          </div>
          
          <div class="invoice-details">
            <div class="detail-section">
              <div class="detail-item">
                <div class="detail-label">N° Facture / <span class="arabic-text">رقم الفاتورة</span></div>
                <div class="detail-value">${escapeHtmlInvoice(purchase.invoice_number || "#" + purchase.id)}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Date / <span class="arabic-text">التاريخ</span></div>
                <div class="detail-value">${new Date(purchase.purchase_date).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
            <div class="detail-section">
              <div class="detail-item">
                <div class="detail-label">Fournisseur / <span class="arabic-text">المورد</span></div>
                <div class="detail-value">${escapeHtmlInvoice(purchase.supplier_name || "Non spécifié")}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Statut / <span class="arabic-text">الحالة</span></div>
                <div class="detail-value">${purchase.status === 'completed' ? 'Terminé' : purchase.status === 'pending' ? 'En attente' : 'Annulé'}</div>
              </div>
            </div>
          </div>
          
          <div class="invoice-content">
            <table class="invoice-table">
              <thead>
                <tr>
                  <th>N° / <span class="arabic-text">رقم</span></th>
                  <th>Désignation / <span class="arabic-text">البيان</span></th>
                  <th>Quantité / <span class="arabic-text">الكمية</span></th>
                  <th>Prix Unitaire / <span class="arabic-text">السعر</span> (DH)</th>
                  <th>Main d'œuvre / <span class="arabic-text">العمالة</span> (DH)</th>
                  <th>Total / <span class="arabic-text">المجموع</span> (DH)</th>
                  <th>Avance / <span class="arabic-text">تسبيق</span></th>
                  <th>Reste / <span class="arabic-text">الباقي</span></th>
                </tr>
              </thead>
              <tbody>
                ${purchase.items && purchase.items.length > 0 ? 
                  purchase.items.map((item: any, index: number) => {
                    const line = computePurchaseLine({
                      quantity: item.quantity,
                      unit_price: item.unit_price,
                      labor_cost: item.additional_price,
                      avance: item.avance,
                    })
                    const laborCost = round2(parseMoney(item.additional_price))
                    const unitPrice = parseMoney(item.unit_price)
                    
                    return `
                      <tr>
                        <td>${index + 1}</td>
                        <td style="text-align: left; font-weight: 600;">${escapeHtmlInvoice(item.designation || "Article")}</td>
                        <td>${item.quantity}</td>
                        <td>${unitPrice.toFixed(2)}</td>
                        <td style="color: #059669; font-weight: 600;">${laborCost.toFixed(2)}</td>
                        <td style="font-weight: 700;">${line.total.toFixed(2)}</td>
                        <td>${parseMoney(item.avance).toFixed(2)}</td>
                        <td style="font-weight: 600;">${line.reste.toFixed(2)}</td>
                      </tr>
                    `
                  }).join('') : 
                  '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">Aucun article</td></tr>'
                }
              </tbody>
            </table>
            
            ${
              agg.laborSum > 0
                ? `
                  <div class="costs-breakdown">
                    <div class="costs-title">Détail des Coûts / <span class="arabic-text">تفاصيل التكاليف</span></div>
                    <div class="costs-grid">
                      <div class="cost-item products">
                        <div class="cost-label products">Produits (base) / <span class="arabic-text">المنتجات</span></div>
                        <div class="cost-amount products">${agg.baseSum.toFixed(2)} DH</div>
                      </div>
                      <div class="cost-item labor">
                        <div class="cost-label labor">Main d'œuvre / <span class="arabic-text">العمالة</span></div>
                        <div class="cost-amount labor">${agg.laborSum.toFixed(2)} DH</div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="labor-summary">
                    <div class="labor-summary-label">Main d'œuvre / <span class="arabic-text">العمالة</span>:</div>
                    <div class="labor-summary-amount">${agg.laborSum.toFixed(2)} DH</div>
                  </div>
                `
                : ""
            }
            
            <div class="invoice-total">
              <div class="total-label">Total Général / <span class="arabic-text">المجموع العام</span></div>
              <div class="total-amount">${totalGeneral.toFixed(2)} DH</div>
            </div>
            
            <div class="payment-details">
              <div class="payment-title">Détails de l'Achat / <span class="arabic-text">تفاصيل الشراء</span></div>
              <div class="payment-info">
                <div class="payment-item">
                  <div class="payment-label">Méthode de Paiement / <span class="arabic-text">طريقة الدفع</span>:</div>
                  <div class="payment-value">${
                    purchase.payment_method === 'cash' ? 'Espèces / <span class="arabic-text">نقداً</span>' : 
                    purchase.payment_method === 'credit' ? 'Crédit / <span class="arabic-text">ائتمان</span>' : 
                    purchase.payment_method === 'card' ? 'Carte / <span class="arabic-text">بطاقة</span>' :
                    purchase.payment_method === 'transfer' ? 'Virement / <span class="arabic-text">تحويل</span>' :
                    purchase.payment_method === 'check' ? 'Chèque / <span class="arabic-text">شيك</span>' :
                    purchase.payment_method
                  }</div>
                </div>
                <div class="payment-item">
                  <div class="payment-label">Nombre d'Articles / <span class="arabic-text">عدد المواد</span>:</div>
                  <div class="payment-value">${purchase.items?.length || 0}</div>
                </div>
                ${
                  items.length > 0
                    ? `
                <div class="payment-item">
                  <div class="payment-label">Total avances / <span class="arabic-text">مجموع التسبيق</span></div>
                  <div class="payment-value">${agg.avanceSum.toFixed(2)} DH</div>
                </div>
                <div class="payment-item">
                  <div class="payment-label">Total reste à payer / <span class="arabic-text">المتبقي</span></div>
                  <div class="payment-value">${agg.resteSum.toFixed(2)} DH</div>
                </div>
                `
                    : ""
                }
              </div>
              
              ${purchase.notes ? `
                <div style="margin-top: 15px; padding: 10px; background: #fefce8; border: 1px solid #facc15; border-radius: 8px;">
                  <div style="font-size: 14px; font-weight: 700; color: #a16207; margin-bottom: 5px;">Notes / <span class="arabic-text">ملاحظات</span></div>
                  <div style="color: #a16207; font-style: italic;">${escapeHtmlInvoice(purchase.notes)}</div>
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-title">Merci pour votre confiance / <span class="arabic-text">شكراً لتفتكم</span></div>
            <div class="footer-subtitle">Gestion Droguerie - Système de Gestion de Stock</div>
            <div class="footer-info">
              Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // PDF Export function for individual purchase
  const exportPurchaseToPDF = async (purchase: any) => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      toast.error("Export PDF non disponible côté serveur")
      return
    }

    try {
      let purchaseForPdf = purchase
      try {
        const res = await fetch(`/api/purchases/${purchase.id}`)
        if (res.ok) {
          purchaseForPdf = await safeJsonParse(res)
        } else {
          const err = await res.json().catch(() => ({}))
          console.warn("Facture: impossible de recharger l'achat, données du tableau utilisées", err)
        }
      } catch {
        console.warn("Facture: erreur réseau, données du tableau utilisées")
      }

      const invoiceHTML = generatePurchaseInvoiceHTML(purchaseForPdf)

      // html2pdf captures a real DOM tree; a string alone can render incomplete — use a hidden iframe
      const iframe = document.createElement("iframe")
      iframe.setAttribute("aria-hidden", "true")
      iframe.style.cssText =
        "position:fixed;left:-10000px;top:0;width:816px;min-height:1200px;border:none;background:#fff;"
      document.body.appendChild(iframe)
      const idoc = iframe.contentDocument!
      idoc.open()
      idoc.write(invoiceHTML)
      idoc.close()
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      )

      try {
        const html2pdf = (await import("html2pdf.js")).default
        const opt = {
          margin: 0.5,
          filename: `facture-achat-${purchase.id}-${new Date().toISOString().split("T")[0]}.pdf`,
          image: { type: "jpeg" as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "in", format: "a4", orientation: "portrait" as const },
        }
        await html2pdf().set(opt).from(idoc.body).save()
        toast.success("Facture exportée avec succès")
      } finally {
        document.body.removeChild(iframe)
      }
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast.error("Erreur lors de l'export PDF")
    }
  }





  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        
        // Fetch purchases
        try {
          const purchasesRes = await fetch("/api/purchases")
          if (purchasesRes.ok) {
            try {
              const purchasesData = await safeJsonParse(purchasesRes)
              setPurchases(purchasesData)
            } catch (parseError) {
              console.error("Error parsing purchases response:", parseError)
              toast.error("Format de réponse invalide pour les achats")
            }
          } else {
            try {
              const errorData = await safeJsonParse(purchasesRes)
              console.error("Failed to fetch purchases:", errorData)
              toast.error("Erreur lors du chargement des achats")
            } catch (parseError) {
              console.error("Non-JSON error response for purchases")
              toast.error("Erreur serveur lors du chargement des achats")
            }
          }
        } catch (error) {
          console.error("Error fetching purchases:", error)
          toast.error("Erreur de connexion lors du chargement des achats")
        }

        // Fetch suppliers
        try {
          const suppliersRes = await fetch("/api/suppliers")
          if (suppliersRes.ok) {
            try {
              const suppliersData = await safeJsonParse(suppliersRes)
              setSuppliers(suppliersData)
            } catch (parseError) {
              console.error("Error parsing suppliers response:", parseError)
              toast.error("Format de réponse invalide pour les fournisseurs")
            }
          } else {
            try {
              const errorData = await safeJsonParse(suppliersRes)
              console.error("Failed to fetch suppliers:", errorData)
              toast.error("Erreur lors du chargement des fournisseurs")
            } catch (parseError) {
              console.error("Non-JSON error response for suppliers")
              toast.error("Erreur serveur lors du chargement des fournisseurs")
            }
          }
        } catch (error) {
          console.error("Error fetching suppliers:", error)
          toast.error("Erreur de connexion lors du chargement des fournisseurs")
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Erreur lors du chargement des données")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const searchNeedle = useMemo(() => normalizeSearchQuery(searchTerm), [searchTerm])

  const filteredPurchases = useMemo(() => {
    return purchases.filter((purchase) => {
      const matchesSearch = purchaseMatchesSearch(purchase, searchNeedle)

      const matchesStatus = statusFilter === "all" || purchase.status === statusFilter
      const matchesPayment = paymentFilter === "all" || purchase.payment_method === paymentFilter

      let matchesDate = true
      if (dateFrom) {
        const purchaseDate = new Date(purchase.purchase_date)
        const fromDate = new Date(dateFrom)
        if (purchaseDate < fromDate) matchesDate = false
      }
      if (dateTo) {
        const purchaseDate = new Date(purchase.purchase_date)
        const toDate = new Date(dateTo)
        if (purchaseDate > toDate) matchesDate = false
      }

      return matchesSearch && matchesStatus && matchesPayment && matchesDate
    })
  }, [purchases, searchNeedle, statusFilter, paymentFilter, dateFrom, dateTo])

  // Calculate summary data
  const totalPurchases = filteredPurchases.length
  const totalAmount = filteredPurchases.reduce((sum, p) => sum + (p.total_amount || 0), 0)
  const completedPurchases = filteredPurchases.filter(p => p.status === "completed").length
  const pendingPurchases = filteredPurchases.filter(p => p.status === "pending").length

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      cancelled: "bg-red-100 text-red-800 border-red-200"
    }
    return variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const getPaymentBadge = (method: string) => {
    const variants = {
      cash: "bg-blue-100 text-blue-800 border-blue-200",
      card: "bg-purple-100 text-purple-800 border-purple-200",
      transfer: "bg-green-100 text-green-800 border-green-200",
      check: "bg-orange-100 text-orange-800 border-orange-200"
    }
    return variants[method as keyof typeof variants] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setPaymentFilter("all")
    setDateFrom("")
    setDateTo("")
  }

  const addPurchaseItem = () => {
    const newId = Math.max(...purchaseItems.map(item => item.id)) + 1
    const newItem = recalculatePurchaseItemRow({
      id: newId,
      designation: '',
      quantity: '',
      unit_price: '',
      additional_price: '0.00',
      amount: '0.00',
      avance: '0.00',
      reste: '0.00',
    })
    setPurchaseItems((prevItems) => [...prevItems, newItem])
  }

  const removePurchaseItem = (id: number) => {
    if (purchaseItems.length > 1) {
      setPurchaseItems(purchaseItems.filter(item => item.id !== id))
    }
  }

  const updatePurchaseItem = (id: number, field: string, value: string) => {
    setPurchaseItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        if (field === "designation") return updated
        return recalculatePurchaseItemRow(updated)
      }),
    )
  }

  const handleNewPurchase = () => {
    setFormData({
      supplier_id: '',
      total_amount: '',
      payment_method: '',
      notes: '',
      status: 'pending',
      invoice_number: 'INV-' + Date.now().toString().slice(-6),
      purchase_date: new Date().toISOString().split('T')[0]
    })
    setPurchaseItems([
      {
        id: 1,
        designation: '',
        quantity: '',
        unit_price: '',
        additional_price: '0.00',
        amount: '',
        avance: '0.00',
        reste: '0.00'
      }
    ])
    setSelectedPurchase(null)
    setIsEditing(false)
    setIsNewPurchaseModalOpen(true)
  }

  const handleViewPurchase = (purchase: any) => {
    setSelectedPurchase(purchase)
    setIsViewPurchaseModalOpen(true)
  }

  const handleEditPurchase = (purchase: any) => {
    setSelectedPurchase(purchase)
    setFormData({
      supplier_id: purchase.supplier_id.toString(),
      total_amount: purchase.total_amount.toString(),
      payment_method: purchase.payment_method,
      notes: purchase.notes || '',
      status: purchase.status,
      invoice_number: purchase.invoice_number || '',
      purchase_date: purchase.purchase_date ? new Date(purchase.purchase_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    })
    
    // Load existing purchase items if available
    if (purchase.items && purchase.items.length > 0) {
      setPurchaseItems(
        purchase.items.map((item: any, index: number) =>
          recalculatePurchaseItemRow({
            id: index + 1,
            designation: item.designation || "Produit",
            quantity: item.quantity != null ? String(item.quantity) : "",
            unit_price: item.unit_price != null ? String(item.unit_price) : "",
            additional_price:
              item.additional_price != null ? String(item.additional_price) : "0.00",
            amount: "0.00",
            avance: item.avance != null ? String(item.avance) : "0.00",
            reste: "0.00",
          }),
        ),
      )
    } else {
      // Reset to default if no items
      setPurchaseItems([
        {
          id: 1,
          designation: '',
          quantity: '',
          unit_price: '',
          additional_price: '0.00',
          amount: '',
          avance: '0.00',
          reste: '0.00'
        }
      ])
    }
    
    setIsEditing(true)
    setIsNewPurchaseModalOpen(true)
  }

  const handleDeletePurchase = (purchase: any) => {
    setSelectedPurchase(purchase)
    setIsDeleteModalOpen(true)
  }


  // Print dialog: same HTML as téléchargement PDF (fetch + generatePurchaseInvoiceHTML)
  const handleNewExportPDF = async () => {
    if (!selectedPurchase) return
    
    try {
      toast.loading('Génération du PDF en cours...', { id: 'pdf-export' })

      let purchaseForPrint = selectedPurchase
      try {
        const res = await fetch(`/api/purchases/${selectedPurchase.id}`)
        if (res.ok) {
          purchaseForPrint = await safeJsonParse(res)
        }
      } catch {
        /* use modal snapshot */
      }

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('Popup blocked')
      }

      const invoiceHTML = generatePurchaseInvoiceHTML(purchaseForPrint)
      
      printWindow.document.write(invoiceHTML)
      printWindow.document.close()
      
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
        printWindow.close()
        toast.success('PDF généré avec succès!', { id: 'pdf-export' })
      }, 1000)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Erreur lors de la génération du PDF', { id: 'pdf-export' })
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedPurchase) return
    
    try {
      setIsLoading(true)
      
      // Delete purchase via API
      const response = await fetch('/api/purchases/' + selectedPurchase.id, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        // Refresh purchases list from API
        try {
          const purchasesRes = await fetch("/api/purchases")
          if (purchasesRes.ok) {
            const contentType = purchasesRes.headers.get("content-type")
            if (contentType && contentType.includes("application/json")) {
              const purchasesData = await purchasesRes.json()
              setPurchases(purchasesData)
            } else {
              console.error("Invalid response type when refreshing purchases:", contentType)
            }
          } else {
            console.error("Failed to refresh purchases after deletion")
          }
        } catch (error) {
          console.error("Error refreshing purchases:", error)
        }
        
        toast.success("Achat supprimé avec succès!")
        setIsDeleteModalOpen(false)
        setSelectedPurchase(null)
      } else {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          try {
          const errorData = await response.json()
          console.error("Delete error:", errorData)
            toast.error(errorData.error || errorData.message || "Erreur lors de la suppression")
          } catch (jsonError) {
            console.error("Failed to parse error response:", jsonError)
            toast.error("Erreur lors de la suppression")
          }
        } else {
          console.error("Non-JSON error response for delete")
          toast.error("Erreur serveur lors de la suppression")
        }
      }
    } catch (error) {
      console.error("Error deleting purchase:", error)
      toast.error("Erreur de connexion lors de la suppression")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Achats</h1>
            <p className="text-gray-600 mt-1">Gérez vos achats et fournisseurs</p>
          </div>
          <Button 
            onClick={handleNewPurchase}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouvel Achat
          </Button>
      </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-gray-600">Total Achats</p>
                  <p className="text-2xl font-bold text-gray-900">{totalPurchases}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-gray-600">Montant Total</p>
                  <p className="text-2xl font-bold text-gray-900">{totalAmount.toFixed(2)} DH</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-gray-600">Terminés</p>
                  <p className="text-2xl font-bold text-gray-900">{completedPurchases}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Truck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-gray-600">En Attente</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingPurchases}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

          {/* Search and Filters */}
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Main Search */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Rechercher par facture, fournisseur ou notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 border-gray-200 hover:bg-gray-50"
                >
                  <Filter className="w-4 h-4" />
                  Filtres
                </Button>
                {(statusFilter !== "all" || paymentFilter !== "all" || dateFrom || dateTo) && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="flex items-center gap-2 border-gray-200 hover:bg-gray-50 text-gray-600"
                  >
                    <X className="w-4 h-4" />
                    Effacer
                  </Button>
                )}
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Statut</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="border-gray-200">
                        <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="completed">Terminé</SelectItem>
                        <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Paiement</Label>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                      <SelectTrigger className="border-gray-200">
                        <SelectValue placeholder="Tous les paiements" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="cash">Espèces</SelectItem>
                        <SelectItem value="card">Carte</SelectItem>
                    <SelectItem value="transfer">Virement</SelectItem>
                        <SelectItem value="check">Chèque</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            
                <div>
                    <Label className="text-sm font-medium text-gray-700">Du</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                      className="border-gray-200"
                  />
                </div>

                <div>
                    <Label className="text-sm font-medium text-gray-700">Au</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                      className="border-gray-200"
                  />
                </div>
              </div>
              )}
            </div>

            {/* Results Count */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                {filteredPurchases.length} achat(s) trouvé(s) sur {purchases.length} total
              </p>
              </div>
          </CardContent>
        </Card>

        {/* Purchases Table */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Historique des Achats</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table id="purchases-table" className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facture</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fournisseur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paiement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {filteredPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                          <p className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                            {purchase.invoice_number || '#' + purchase.id.toString().padStart(4, '0')}
                          </p>
                          <p className="text-xs text-gray-500">Achat #{purchase.id}</p>
                      </div>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                          <p className="text-sm font-medium text-gray-900">{purchase.supplier_name}</p>
                          <p className="text-xs text-gray-500">ID: {purchase.supplier_id}</p>
                      </div>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(purchase.purchase_date).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{purchase.total_amount} DH</p>
                          <p className="text-xs text-gray-500">{purchase.items_count || 1} article(s)</p>
                      </div>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <Badge className={getPaymentBadge(purchase.payment_method)}>
                            {purchase.payment_method === 'cash' ? 'Espèces' : 
                                                           purchase.payment_method === 'card' ? 'Carte' :
                              purchase.payment_method === 'transfer' ? 'Virement' :
                              purchase.payment_method === 'check' ? 'Chèque' :
                              purchase.payment_method === 'bank_transfer' ? 'Virement Bancaire' :
                              purchase.payment_method === 'credit' ? 'Crédit' : purchase.payment_method}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">✓ Payé</p>
                      </div>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusBadge(purchase.status)}>
                          {purchase.status === 'completed' ? 'Terminé' :
                           purchase.status === 'pending' ? 'En attente' :
                           purchase.status === 'cancelled' ? 'Annulé' : purchase.status}
                        </Badge>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost"
                          size="sm"
                          onClick={() => handleViewPurchase(purchase)}
                            className="p-2 hover:bg-gray-100"
                        >
                            <Eye className="w-4 h-4 text-gray-600" />
                        </Button>
                        <Button 
                            variant="ghost"
                          size="sm"
                          onClick={() => handleEditPurchase(purchase)}
                            className="p-2 hover:bg-gray-100"
                        >
                            <Edit className="w-4 h-4 text-gray-600" />
                        </Button>
                        <Button 
                            variant="ghost"
                          size="sm"
                          onClick={() => exportPurchaseToPDF(purchase)}
                            className="p-2 hover:bg-gray-100"
                        >
                            <Download className="w-4 h-4 text-blue-600" />
                        </Button>
                          <Button 
                            variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePurchase(purchase)}
                            className="p-2 hover:bg-gray-100"
                        >
                            <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>

            {/* Empty State */}
            {filteredPurchases.length === 0 && (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun achat trouvé</h3>
                <p className="text-gray-500">Essayez de modifier vos filtres ou créez un nouvel achat.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Footer */}
        {filteredPurchases.length > 0 && (
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="text-sm text-gray-600">
                  Total des résultats filtrés: <span className="font-medium text-gray-900">{filteredPurchases.length} achat(s)</span>
                    </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Montant Total:</span>
                    <span className="font-semibold text-blue-600">{totalAmount.toFixed(2)} DH</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Articles:</span>
                    <span className="font-semibold text-green-600">
                      {filteredPurchases.reduce((sum, p) => sum + (p.items_count || 1), 0)}
                    </span>
                  </div>
                </div>
          </div>
        </CardContent>
      </Card>
        )}
      </div>

      {/* New Purchase Modal */}
      <Dialog open={isNewPurchaseModalOpen} onOpenChange={setIsNewPurchaseModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Modifier l'Achat" : "Nouvel Achat"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier">Fournisseur</Label>
                <Select value={formData.supplier_id} onValueChange={(value) => setFormData({...formData, supplier_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
              <div>
                <Label htmlFor="invoice">N° Facture</Label>
                <Input
                  id="invoice"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                  placeholder="N° de facture"
                />
              </div>
              <div>
                <Label htmlFor="date">Date d&apos;achat</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="payment">Méthode de paiement</Label>
                <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="credit">Crédit</SelectItem>
                    <SelectItem value="card">Carte</SelectItem>
                    <SelectItem value="transfer">Virement</SelectItem>
                    <SelectItem value="check">Chèque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </div>

            {/* Purchase Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-semibold">Articles</Label>
                <Button type="button" variant="outline" onClick={addPurchaseItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un article
                </Button>
          </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Désignation / البيان
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Quantité / الكمية
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Prix Unitaire (DH) / السعر / الوحدة (درهم)
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Montant Base (DH) / المبلغ الأساسي (درهم)
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-orange-700">
                        Main d&apos;œuvre (DH) / العمالة (درهم)
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Total (DH) / المجموع (درهم)
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Avance / تسبيق
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Reste / الباقي
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                  {purchaseItems.map((item) => {
                    const line = computePurchaseLine({
                      quantity: item.quantity,
                      unit_price: item.unit_price,
                      labor_cost: item.additional_price,
                      avance: item.avance,
                    })
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
              <Input
                          value={item.designation || ''}
                          onChange={(e) => updatePurchaseItem(item.id, 'designation', e.target.value)}
                            placeholder="Nom de l'article"
                            className="border-0 bg-transparent p-0 focus:ring-0"
                        />
                      </td>
                        <td className="px-4 py-3">
                        <Input 
                          type="number" 
                          value={item.quantity || ''}
                          onChange={(e) => updatePurchaseItem(item.id, 'quantity', e.target.value)}
                            placeholder="0"
                            className="border-0 bg-transparent p-0 focus:ring-0 w-20"
                        />
                      </td>
                        <td className="px-4 py-3">
                        <Input 
                type="number"
                step="0.01"
                          value={item.unit_price || ''}
                          onChange={(e) => updatePurchaseItem(item.id, 'unit_price', e.target.value)}
                            placeholder="0.00"
                            className="border-0 bg-transparent p-0 focus:ring-0 w-24"
                        />
                      </td>
                        <td className="px-4 py-3">
                        <div
                          className="text-center font-medium text-blue-600 tabular-nums"
                          title="Base = quantité × prix unitaire (hors main d'œuvre)"
                        >
                          {line.baseAmount.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.additional_price ?? "0.00"}
                          onChange={(e) =>
                            updatePurchaseItem(item.id, "additional_price", e.target.value)
                          }
                          placeholder="0.00"
                          className="border-0 bg-transparent p-0 focus:ring-0 w-24 text-center font-medium text-orange-700"
                        />
                      </td>
                        <td className="px-4 py-3">
                          <div
                            className="text-center font-semibold text-gray-900 tabular-nums"
                            title="Total ligne = base + main d'œuvre"
                          >
                            {line.total.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                        <Input 
                          type="number" 
                          step="0.01" 
                          value={item.avance || '0.00'}
                          onChange={(e) => updatePurchaseItem(item.id, 'avance', e.target.value)}
                            placeholder="0.00" 
                            className="border-0 bg-transparent p-0 focus:ring-0 w-24"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="text-center font-bold text-lg text-green-600 w-24 tabular-nums"
                            title="Reste = total ligne − avance"
                          >
                            {line.reste.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {purchaseItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePurchaseItem(item.id)}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
                  {/* Total Row */}
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-700">
                        Totaux / المجاميع:
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-blue-600">
                        {round2(
                          purchaseItems.reduce((sum, item) => {
                            const { baseAmount } = computePurchaseLine({
                              quantity: item.quantity,
                              unit_price: item.unit_price,
                              labor_cost: item.additional_price,
                              avance: item.avance,
                            })
                            return sum + baseAmount
                          }, 0),
                        ).toFixed(2)}{" "}
                        DH
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-orange-600">
                        {round2(
                          purchaseItems.reduce(
                            (sum, item) => sum + parseMoney(item.additional_price),
                            0,
                          ),
                        ).toFixed(2)}{" "}
                        DH
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900">
                        {sumLineTotals(purchaseItems).toFixed(2)} DH
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-orange-600">
                        {round2(
                          purchaseItems.reduce(
                            (sum, item) => sum + parseMoney(item.avance),
                            0,
                          ),
                        ).toFixed(2)}{" "}
                        DH
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-lg text-green-600">
                        {round2(
                          purchaseItems.reduce(
                            (sum, item) => sum + parseMoney(item.reste),
                            0,
                          ),
                        ).toFixed(2)}{" "}
                        DH
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
              </table>
            </div>
            </div>
            
            {/* Enhanced Cost Breakdown */}
            {purchaseItems.some(item => parseFloat(item.additional_price || "0") > 0) && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-orange-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Détail des Coûts / تفاصيل التكاليف
                  </h4>
                  <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
                    Répartition des coûts
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-blue-300 rounded-lg text-center hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <p className="text-sm text-blue-600 font-medium">Produits / المنتجات</p>
                    </div>
                    <p className="text-xl font-bold text-blue-700">
                      {round2(
                        purchaseItems.reduce((sum, item) => {
                          const { baseAmount } = computePurchaseLine({
                            quantity: item.quantity,
                            unit_price: item.unit_price,
                            labor_cost: item.additional_price,
                            avance: item.avance,
                          })
                          return sum + baseAmount
                        }, 0),
                      ).toFixed(2)}{" "}
                      DH
                    </p>
                    <p className="text-xs text-blue-500 mt-1">Coût des matières premières</p>
                  </div>
                  <div className="p-4 bg-orange-50 border border-orange-300 rounded-lg text-center hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <p className="text-sm text-orange-600 font-medium">Main d'œuvre / العمالة</p>
                    </div>
                    <p className="text-xl font-bold text-orange-700">
                      {round2(
                        purchaseItems.reduce(
                          (sum, item) => sum + parseMoney(item.additional_price),
                          0,
                        ),
                      ).toFixed(2)}{" "}
                      DH
                    </p>
                    <p className="text-xs text-orange-500 mt-1">Coût de la main d'œuvre</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-700">Total Général:</span>
                    <span className="text-2xl font-bold text-gray-800">
                      {sumLineTotals(purchaseItems).toFixed(2)} DH
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes additionnelles..."
                rows={3}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Main d&apos;œuvre: saisir par ligne dans le tableau (colonne orange).
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsNewPurchaseModalOpen(false)}
              >
                Annuler
                  </Button>
                              <Button
                onClick={async () => {
                  if (!formData.supplier_id) {
                    toast.error("Veuillez sélectionner un fournisseur")
                    return
                  }
                  
                  if (!formData.payment_method) {
                    toast.error("Veuillez sélectionner une méthode de paiement")
                    return
                  }
                  
                  if (!formData.invoice_number || formData.invoice_number.trim() === '') {
                    toast.error("Veuillez saisir un numéro de facture")
                    return
                  }
                  
                  const totalFromItems = sumLineTotals(purchaseItems)
                  
                  // Validate that we have at least one valid item
                  const validItems = purchaseItems.filter(item => 
                    item.designation && 
                    item.designation.trim() !== '' && 
                    parseFloat(item.quantity) > 0 && 
                    parseFloat(item.unit_price) > 0
                  )
                  
                  if (validItems.length === 0) {
                    toast.error("Veuillez ajouter au moins un article valide avec une désignation, quantité et prix")
                    return
                  }
                  
                  try {
                    const purchaseData = {
                      supplier_id: parseInt(formData.supplier_id),
                      total_amount: totalFromItems.toFixed(2),
                      payment_method: formData.payment_method,
                      notes: formData.notes,
                      invoice_number: formData.invoice_number,
                      purchase_date: formData.purchase_date,
                      items: validItems.map(item => ({
                        product_id: 1, // Placeholder - in real app this would be selected
                        quantity: parseFloat(item.quantity),
                        unit_price: parseFloat(item.unit_price),
                        additional_price: parseFloat(item.additional_price || '0'),
                        total_price: parseFloat(item.amount),
                        avance: parseFloat(item.avance),
                        reste: parseFloat(item.reste),
                        designation: item.designation
                      }))
                    }
                    
                    console.log('Sending purchase data:', purchaseData)
                    console.log('Valid items:', validItems)
                    
                    let response
                    if (isEditing && selectedPurchase) {
                      // Update existing purchase
                      response = await fetch('/api/purchases/' + selectedPurchase.id, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(purchaseData)
                      })
                    } else {
                      // Create new purchase
                      response = await fetch('/api/purchases', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(purchaseData)
                      })
                    }
                    
                    if (response.ok) {
                      const contentType = response.headers.get("content-type")
                      if (contentType && contentType.includes("application/json")) {
                        if (isEditing && selectedPurchase) {
                          // Update the selectedPurchase with the new data
                          const updatedPurchaseData = await response.json()
                          setSelectedPurchase(updatedPurchaseData)
                        }
                        
                        // Refresh purchases list from API
                        try {
                          const purchasesRes = await fetch("/api/purchases")
                          if (purchasesRes.ok) {
                            const refreshContentType = purchasesRes.headers.get("content-type")
                            if (refreshContentType && refreshContentType.includes("application/json")) {
                              const purchasesData = await purchasesRes.json()
                              setPurchases(purchasesData)
                            } else {
                              console.error("Invalid response type when refreshing purchases after save:", refreshContentType)
                            }
                          } else {
                            console.error("Failed to refresh purchases after save")
                          }
                        } catch (error) {
                          console.error("Error refreshing purchases:", error)
                        }
                      } else {
                        console.error("Invalid response type for purchase save:", contentType)
                        toast.error("Format de réponse invalide lors de la sauvegarde")
                      }
                      
                      // Close modal and show success
                      setIsNewPurchaseModalOpen(false)
                      toast.success(isEditing ? "Achat modifié avec succès!" : "Achat créé avec succès!")
                      
                      // Reset form
                      setFormData({
                        supplier_id: '',
                        total_amount: '',
                        payment_method: '',
                        notes: '',
                        status: 'pending',
                        invoice_number: '',
                        purchase_date: new Date().toISOString().split('T')[0]
                      })
                      setPurchaseItems([
                        {
                          id: 1,
                          designation: '',
                          quantity: '',
                          unit_price: '',
                          additional_price: '0.00',
                          amount: '',
                          avance: '0.00',
                          reste: '0.00'
                        }
                      ])
                      setIsEditing(false)
                      setSelectedPurchase(null)
                    } else {
                      try {
                        const errorData = await response.json()
                        toast.error(errorData.error || (isEditing ? "Erreur lors de la modification de l'achat" : "Erreur lors de la création de l'achat"))
                      } catch (parseError) {
                        // If we can't parse the error response, show a generic message
                        toast.error('Erreur ' + response.status + ': ' + response.statusText)
                      }
                    }
                  } catch (error) {
                    console.error("Error saving purchase:", error)
                    toast.error(isEditing ? "Erreur lors de la modification de l'achat" : "Erreur lors de la création de l'achat")
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isEditing ? "Modifier l'achat" : "Enregistrer l'achat"}
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Simple View Modal */}
      <Dialog open={isViewPurchaseModalOpen} onOpenChange={setIsViewPurchaseModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Détails de l&apos;Achat</DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">N° Facture</Label>
                  <p className="text-lg font-semibold">{selectedPurchase.invoice_number || '#' + selectedPurchase.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Fournisseur</Label>
                  <p className="text-lg font-semibold">{selectedPurchase.supplier_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Date</Label>
                  <p className="text-lg">{new Date(selectedPurchase.purchase_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Montant Total</Label>
                  <p className="text-lg font-semibold text-green-600">{selectedPurchase.total_amount} DH</p>
                </div>
                </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsViewPurchaseModalOpen(false)}
                >
                  Fermer
                </Button>
                <Button
                  onClick={() => {
                    setIsViewPurchaseModalOpen(false)
                    handleEditPurchase(selectedPurchase)
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Modifier
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p>Êtes-vous sûr de vouloir supprimer cet achat ? Cette action est irréversible.</p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmDelete}
              variant="destructive"
            >
              Supprimer
            </Button>
                </div>
        </DialogContent>
      </Dialog>

      {/* Print Invoice Modal */}
      <Dialog open={isPrintInvoiceModalOpen} onOpenChange={setIsPrintInvoiceModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:p-0">
          <style jsx global>{`
            @media print {
              body {
                font-size: 10px !important;
                line-height: 1.2 !important;
              }
              .print\\:p-0 {
                padding: 0 !important;
              }
              .print\\:space-y-2 > * + * {
                margin-top: 0.5rem !important;
              }
              .text-4xl {
                font-size: 18px !important;
              }
              .text-2xl {
                font-size: 14px !important;
              }
              .text-xl {
                font-size: 12px !important;
              }
              .text-lg {
                font-size: 11px !important;
              }
              .text-base {
                font-size: 10px !important;
              }
              .text-sm {
                font-size: 9px !important;
              }
              .text-xs {
                font-size: 8px !important;
              }
              .py-4 {
                padding-top: 0.5rem !important;
                padding-bottom: 0.5rem !important;
              }
              .py-3 {
                padding-top: 0.25rem !important;
                padding-bottom: 0.25rem !important;
              }
              .py-2 {
                padding-top: 0.125rem !important;
                padding-bottom: 0.125rem !important;
              }
              .px-4 {
                padding-left: 0.5rem !important;
                padding-right: 0.5rem !important;
              }
              .px-3 {
                padding-left: 0.25rem !important;
                padding-right: 0.25rem !important;
              }
              .px-2 {
                padding-left: 0.125rem !important;
                padding-right: 0.125rem !important;
              }
              .mb-6 {
                margin-bottom: 1rem !important;
              }
              .mb-4 {
                margin-bottom: 0.5rem !important;
              }
              .mb-3 {
                margin-bottom: 0.375rem !important;
              }
              .mb-2 {
                margin-bottom: 0.25rem !important;
              }
              .pb-6 {
                padding-bottom: 1rem !important;
              }
              .pb-4 {
                padding-bottom: 0.5rem !important;
              }
              .pb-3 {
                padding-bottom: 0.375rem !important;
              }
              .pb-2 {
                padding-bottom: 0.25rem !important;
              }
              .pt-4 {
                padding-top: 0.5rem !important;
              }
              .pt-3 {
                padding-top: 0.375rem !important;
              }
              .pt-2 {
                padding-top: 0.25rem !important;
              }
              .space-y-4 > * + * {
                margin-top: 0.5rem !important;
              }
              .space-y-3 > * + * {
                margin-top: 0.375rem !important;
              }
              .space-y-2 > * + * {
                margin-top: 0.25rem !important;
              }
              .space-y-1 > * + * {
                margin-top: 0.125rem !important;
              }
              table {
                font-size: 8px !important;
              }
              th, td {
                padding: 0.125rem 0.25rem !important;
              }
              .border-b-4 {
                border-bottom-width: 2px !important;
              }
              .border-b-2 {
                border-bottom-width: 1px !important;
              }
            }
          `}</style>
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center justify-between">
              <span>Facture d&apos;Achat / فاتورة الشراء</span>
              <Button
                onClick={handleNewExportPDF}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          
                    {selectedPurchase && (
            <div className="max-w-4xl mx-auto p-6 print-invoice">
              {/* Print Styles */}
              <style>{`
                @media print {
                  /* Hide all background elements */
                  body * {
                    visibility: hidden;
                  }
                  
                  /* Show only the invoice content */
                  .print-invoice,
                  .print-invoice * {
                    visibility: visible !important;
                  }
                  
                  /* Reset body styles for print */
                  body {
                    font-size: 10px !important;
                    line-height: 1.1 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                  }
                  
                  /* Hide dialog overlay and background elements */
                  [role="dialog"],
                  .fixed,
                  .absolute,
                  nav,
                  header,
                  aside,
                  .sidebar,
                  .bg-gray-50,
                  .bg-white {
                    display: none !important;
                  }
                  
                  /* Ensure only invoice content is visible */
                  .print-invoice {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    margin: 0 !important;
                    padding: 20px !important;
                    background: white !important;
                    box-shadow: none !important;
                    border: none !important;
                  }
                  .print\\:p-0 {
                    padding: 0 !important;
                  }
                  .print\\:space-y-2 > * + * {
                    margin-top: 0.5rem !important;
                  }
                  .text-3xl {
                    font-size: 16px !important;
                  }
                  .text-2xl {
                    font-size: 14px !important;
                  }
                  .text-xl {
                    font-size: 12px !important;
                  }
                  .text-lg {
                    font-size: 11px !important;
                  }
                  .text-base {
                    font-size: 10px !important;
                  }
                  .text-sm {
                    font-size: 9px !important;
                  }
                  .text-xs {
                    font-size: 8px !important;
                  }
                  .py-4 {
                    padding-top: 0.25rem !important;
                    padding-bottom: 0.25rem !important;
                  }
                  .py-3 {
                    padding-top: 0.125rem !important;
                    padding-bottom: 0.125rem !important;
                  }
                  .py-2 {
                    padding-top: 0.0625rem !important;
                    padding-bottom: 0.0625rem !important;
                  }
                  .px-4 {
                    padding-left: 0.25rem !important;
                    padding-right: 0.25rem !important;
                  }
                  .px-3 {
                    padding-left: 0.125rem !important;
                    padding-right: 0.125rem !important;
                  }
                  .px-2 {
                    padding-left: 0.0625rem !important;
                    padding-right: 0.0625rem !important;
                  }
                  .mb-8 {
                    margin-bottom: 0.5rem !important;
                  }
                  .mb-6 {
                    margin-bottom: 0.375rem !important;
                  }
                  .mb-4 {
                    margin-bottom: 0.25rem !important;
                  }
                  .mb-2 {
                    margin-bottom: 0.125rem !important;
                  }
                  .pb-6 {
                    padding-bottom: 0.75rem !important;
                  }
                  .pb-4 {
                    padding-bottom: 0.5rem !important;
                  }
                  .pb-3 {
                    padding-bottom: 0.375rem !important;
                  }
                  .pb-2 {
                    padding-bottom: 0.25rem !important;
                  }
                  .pt-4 {
                    padding-top: 0.5rem !important;
                  }
                  .pt-3 {
                    padding-top: 0.375rem !important;
                  }
                  .pt-2 {
                    padding-top: 0.25rem !important;
                  }
                  .space-y-4 > * + * {
                    margin-top: 0.5rem !important;
                  }
                  .space-y-3 > * + * {
                    margin-top: 0.375rem !important;
                  }
                  .space-y-2 > * + * {
                    margin-top: 0.25rem !important;
                  }
                  .space-y-1 > * + * {
                    margin-top: 0.125rem !important;
                  }
                  table {
                    font-size: 11px !important;
                  }
                  th, td {
                    padding: 0.25rem 0.5rem !important;
                  }
                  .border-b-4 {
                    border-bottom-width: 2px !important;
                  }
                  .border-b-2 {
                    border-bottom-width: 1px !important;
                  }
                  .max-w-4xl {
                    max-width: 100% !important;
                  }
                  .mx-auto {
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                  }
                  .p-6 {
                    padding: 0.5rem !important;
                  }
                  .p-4 {
                    padding: 0.375rem !important;
                  }
                  .p-3 {
                    padding: 0.25rem !important;
                  }
                  .p-2 {
                    padding: 0.125rem !important;
                  }
                }
              `}</style>
              {/* Ultra Compact Header */}
              <div className="text-center mb-2">
                <h1 className="text-lg font-bold text-gray-800">FACTURE D'ACHAT</h1>
                <p className="text-sm text-gray-600">Gestion Droguerie</p>
              </div>

              {/* Invoice Info - Ultra Compact */}
              <div className="mb-2 p-2 bg-gray-50 rounded text-xs">
                <div className="grid grid-cols-4 gap-2">
                  <div><span className="text-gray-600">N°:</span> {selectedPurchase.invoice_number}</div>
                  <div><span className="text-gray-600">Date:</span> {new Date(selectedPurchase.purchase_date).toLocaleDateString('fr-FR')}</div>
                  <div><span className="text-gray-600">Fournisseur:</span> {selectedPurchase.supplier_name}</div>
                  <div><span className="text-gray-600">Paiement:</span> {
                    selectedPurchase.payment_method === 'cash' ? 'Espèces' : 
                    selectedPurchase.payment_method === 'card' ? 'Carte' :
                    selectedPurchase.payment_method === 'transfer' ? 'Virement' :
                    selectedPurchase.payment_method === 'check' ? 'Chèque' : selectedPurchase.payment_method
                  }</div>
                </div>
              </div>

              {/* Ultra Compact Items Table */}
              <div className="mb-2">
                <h2 className="text-sm font-bold text-gray-800 mb-1">Articles</h2>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-1 py-0.5 text-left font-semibold">Article</th>
                      <th className="border border-gray-300 px-1 py-0.5 text-center font-semibold">Qté</th>
                      <th className="border border-gray-300 px-1 py-0.5 text-center font-semibold">Prix</th>
                      <th className="border border-gray-300 px-1 py-0.5 text-center font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.items && selectedPurchase.items.length > 0 ? (
                      selectedPurchase.items.map((item: any, index: number) => {
                        const { total: lineTotal } = computePurchaseLine({
                          quantity: item.quantity,
                          unit_price: item.unit_price,
                          labor_cost: item.additional_price,
                          avance: item.avance,
                        })
                        return (
                          <tr key={index}>
                            <td className="border border-gray-300 px-1 py-0.5">{item.designation || 'Produit'}</td>
                            <td className="border border-gray-300 px-1 py-0.5 text-center">{item.quantity}</td>
                            <td className="border border-gray-300 px-1 py-0.5 text-center">{parseMoney(item.unit_price).toFixed(2)} DH</td>
                            <td className="border border-gray-300 px-1 py-0.5 text-center font-semibold">{lineTotal.toFixed(2)} DH</td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="border border-gray-300 px-1 py-2 text-center text-gray-500">Aucun article</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={3} className="border border-gray-300 px-1 py-0.5 text-right">TOTAL:</td>
                      <td className="border border-gray-300 px-1 py-0.5 text-center">
                        {round2(
                          selectedPurchase.items?.reduce((sum: number, item: any) => {
                            const { total } = computePurchaseLine({
                              quantity: item.quantity,
                              unit_price: item.unit_price,
                              labor_cost: item.additional_price,
                              avance: item.avance,
                            })
                            return sum + total
                          }, 0) || 0,
                        ).toFixed(2)}{" "}
                        DH
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Total Summary - Ultra Compact */}
              <div className="mb-2 p-2 bg-gray-100 border border-gray-300 rounded text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">TOTAL GÉNÉRAL:</span>
                  <span className="font-bold text-gray-800">
                    {round2(
                      selectedPurchase.items?.reduce((sum: number, item: any) => {
                        const { total } = computePurchaseLine({
                          quantity: item.quantity,
                          unit_price: item.unit_price,
                          labor_cost: item.additional_price,
                          avance: item.avance,
                        })
                        return sum + total
                      }, 0) || 0,
                    ).toFixed(2)}{" "}
                    DH
                  </span>
                </div>
              </div>

              {/* Notes - Ultra Compact */}
              {selectedPurchase.notes && (
                <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <span className="font-semibold text-gray-800">Notes:</span>
                  <span className="ml-2 text-gray-700">{selectedPurchase.notes}</span>
                </div>
              )}

              {/* Ultra Compact Footer */}
              <div className="text-center text-xs text-gray-600">
                Merci pour votre confiance - Gestion Droguerie
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}