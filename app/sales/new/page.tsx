"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Plus, Save } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SaleLineRow } from "@/components/new-sale-modal/SaleLineRow"
import { useNewSaleForm, sortedClients } from "@/components/new-sale-modal/useNewSaleForm"
import type { ClientOption, PaymentMethod, ProductOption } from "@/components/new-sale-modal/types"
import { parseMoneyInput, round2 } from "@/components/new-sale-modal/money"

export default function NewSalePage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [products, setProducts] = React.useState<ProductOption[]>([])
  const [clients, setClients] = React.useState<ClientOption[]>([])

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsResponse, clientsResponse] = await Promise.all([fetch("/api/products"), fetch("/api/clients")])

        if (productsResponse.ok) setProducts(await productsResponse.json())
        if (clientsResponse.ok) {
          const data = await clientsResponse.json()
          setClients(data)
        }
      } catch {
        toast.error("Erreur lors du chargement des données")
      }
    }
    void fetchData()
  }, [])

  const {
    clientId,
    setClientId,
    paymentMethod,
    setPaymentMethod,
    cashStr,
    setCashStr,
    creditStr,
    setCreditStr,
    notes,
    setNotes,
    lines,
    addLine,
    removeLine,
    updateLine,
    selectProduct,
    grandTotal,
    buildSaveItems,
  } = useNewSaleForm({ open: true, products, resetOnOpen: false })

  const clientsSorted = React.useMemo(() => sortedClients(clients), [clients])

  const cashStrRef = React.useRef(cashStr)
  cashStrRef.current = cashStr

  React.useEffect(() => {
    if (paymentMethod !== "mixed") return
    const t = grandTotal
    const cash = parseMoneyInput(cashStrRef.current)
    setCreditStr(String(round2(Math.max(0, t - cash))))
  }, [grandTotal, paymentMethod, setCreditStr])

  const handleMixedCashChange = (raw: string) => {
    setCashStr(raw)
    const t = grandTotal
    const cash = parseMoneyInput(raw)
    setCreditStr(String(round2(Math.max(0, t - cash))))
  }

  const handleMixedCreditChange = (raw: string) => {
    setCreditStr(raw)
    const t = grandTotal
    const credit = parseMoneyInput(raw)
    setCashStr(String(round2(Math.max(0, t - credit))))
  }

  const handlePaymentSelect = (value: string) => {
    const m = value as PaymentMethod
    setPaymentMethod(m)
    if (m === "mixed") {
      const t = grandTotal
      setCashStr(t === 0 ? "0" : String(round2(t)))
      setCreditStr("0")
    }
  }

  const mixedDelta =
    paymentMethod === "mixed"
      ? Math.abs(grandTotal - parseMoneyInput(cashStr) - parseMoneyInput(creditStr))
      : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientId) {
      toast.error("Veuillez sélectionner un client")
      return
    }
    if (lines.length === 0) {
      toast.error("Veuillez ajouter au moins un produit")
      return
    }
    if (lines.some((l) => l.productId === 0)) {
      toast.error("Veuillez sélectionner tous les produits")
      return
    }

    const items = buildSaveItems()
    const total_amount = round2(items.reduce((s, i) => s + i.total_price, 0))

    let cash_amount = 0
    let credit_amount = 0

    if (paymentMethod === "cash") {
      cash_amount = total_amount
      credit_amount = 0
    } else if (paymentMethod === "credit") {
      cash_amount = 0
      credit_amount = total_amount
    } else {
      cash_amount = parseMoneyInput(cashStr)
      credit_amount = parseMoneyInput(creditStr)
      if (Math.abs(cash_amount + credit_amount - total_amount) > 0.02) {
        toast.error("Le montant en espèces plus le crédit doit égaler le total")
        return
      }
    }

    setLoading(true)
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: parseInt(clientId, 10),
          total_amount,
          payment_method: paymentMethod,
          cash_amount,
          credit_amount,
          notes: notes || null,
          items: items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            additional_price: i.additional_price,
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error ?? "Erreur lors de la création de la vente")
        return
      }

      toast.success("Vente créée avec succès!")
      router.push("/sales")
    } catch {
      toast.error("Erreur lors de la création de la vente")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Button type="button" variant="outline" onClick={() => router.push("/sales")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nouvelle vente</h1>
            <p className="text-muted-foreground">Créer une nouvelle transaction (même logique que la fenêtre vente)</p>
          </div>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Client et paiement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="page-sale-client">Client *</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger id="page-sale-client">
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[min(280px,50vh)]">
                    {clientsSorted.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.phone ? `${c.name} — ${c.phone}` : c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="page-sale-payment">Méthode de paiement *</Label>
                <Select value={paymentMethod} onValueChange={handlePaymentSelect}>
                  <SelectTrigger id="page-sale-payment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="credit">Crédit</SelectItem>
                    <SelectItem value="mixed">Paiement mixte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {paymentMethod === "mixed" ? (
              <div className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/30 p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="page-sale-cash">Montant en espèces (DH)</Label>
                  <Input
                    id="page-sale-cash"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={cashStr}
                    onChange={(e) => handleMixedCashChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page-sale-credit">Montant en crédit (DH)</Label>
                  <Input
                    id="page-sale-credit"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={creditStr}
                    onChange={(e) => handleMixedCreditChange(e.target.value)}
                  />
                </div>
                <div className="text-sm text-muted-foreground md:col-span-2">
                  Total vente&nbsp;: <span className="font-medium text-foreground">{grandTotal.toFixed(2)} DH</span>
                  {mixedDelta > 0.02 ? (
                    <span className="ml-2 text-destructive">Écart&nbsp;: {mixedDelta.toFixed(2)} DH</span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="page-sale-notes">Notes</Label>
              <Textarea
                id="page-sale-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes additionnelles…"
                rows={2}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Produits</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter un produit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {lines.length === 0 ? (
              <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                Aucune ligne. Utilisez «&nbsp;Ajouter un produit&nbsp;».
              </p>
            ) : (
              <div className="space-y-4">
                {lines.map((line, index) => (
                  <SaleLineRow
                    key={line.rowId}
                    line={line}
                    products={products}
                    rowIndex={index}
                    onChange={(patch) => updateLine(line.rowId, patch)}
                    onSelectProduct={(id) => selectProduct(line.rowId, id)}
                    onRemove={() => removeLine(line.rowId)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résumé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-lg font-semibold">Montant total</span>
              <span className="text-2xl font-bold tabular-nums text-green-600">{grandTotal.toFixed(2)} DH</span>
            </div>
            {paymentMethod === "mixed" ? (
              <p className={`mt-2 text-sm ${mixedDelta < 0.02 ? "text-green-600" : "text-destructive"}`}>
                {mixedDelta < 0.02 ? "Paiement équilibré" : `Reste à répartir : ${mixedDelta.toFixed(2)} DH`}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push("/sales")}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading || lines.length === 0} className="gap-2">
            <Save className="h-4 w-4" />
            {loading ? "Création…" : "Créer la vente"}
          </Button>
        </div>
      </form>
    </div>
  )
}
