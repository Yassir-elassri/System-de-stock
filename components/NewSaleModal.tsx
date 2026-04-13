"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { SaleLineRow } from "./new-sale-modal/SaleLineRow"
import { useNewSaleForm, sortedClients } from "./new-sale-modal/useNewSaleForm"
import type { ClientOption, NewSaleSavePayload, PaymentMethod, ProductOption } from "./new-sale-modal/types"
import { parseMoneyInput, round2 } from "./new-sale-modal/money"

export interface NewSaleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: ProductOption[]
  clients: ClientOption[]
  onSave: (data: NewSaleSavePayload) => void | Promise<void>
}

export type { NewSaleSavePayload }

export function NewSaleModal({ open, onOpenChange, products, clients, onSave }: NewSaleModalProps) {
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
  } = useNewSaleForm({ open, products })

  const clientsSorted = React.useMemo(() => sortedClients(clients), [clients])

  const cashStrRef = React.useRef(cashStr)
  cashStrRef.current = cashStr

  /** When line totals change under mixed payment, keep cash and adjust credit. */
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

  const handleSave = async () => {
    if (!clientId) {
      toast.error("Veuillez sélectionner un client")
      return
    }
    if (lines.length === 0) {
      toast.error("Veuillez ajouter au moins un article")
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

    const payload: NewSaleSavePayload = {
      client_id: clientId,
      payment_method: paymentMethod,
      cash_amount,
      credit_amount,
      notes,
      items,
      total_amount,
    }

    try {
      await Promise.resolve(onSave(payload))
      onOpenChange(false)
    } catch {
      /* parent handles toasts; keep modal open */
    }
  }

  const mixedDelta =
    paymentMethod === "mixed"
      ? Math.abs(grandTotal - parseMoneyInput(cashStr) - parseMoneyInput(creditStr))
      : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 space-y-2 px-6 pb-2 pt-6 text-left">
          <DialogTitle>Nouvelle vente</DialogTitle>
          <DialogDescription>
            Sélectionnez un client, ajoutez des lignes de produits, puis enregistrez. Les totaux se mettent à jour
            automatiquement.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-sale-client">Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="new-sale-client">
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[min(280px,50vh)]">
                  {clientsSorted.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-sale-payment">Méthode de paiement</Label>
              <Select value={paymentMethod} onValueChange={handlePaymentSelect}>
                <SelectTrigger id="new-sale-payment">
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
            <div className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-sale-cash">Montant en espèces (DH)</Label>
                <Input
                  id="new-sale-cash"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={cashStr}
                  onChange={(e) => handleMixedCashChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-sale-credit">Montant en crédit (DH)</Label>
                <Input
                  id="new-sale-credit"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={creditStr}
                  onChange={(e) => handleMixedCreditChange(e.target.value)}
                />
              </div>
              <div className="text-sm text-muted-foreground sm:col-span-2">
                Total vente&nbsp;: <span className="font-medium text-foreground">{grandTotal.toFixed(2)} DH</span>
                {mixedDelta > 0.02 ? (
                  <span className="ml-2 text-destructive">Écart&nbsp;: {mixedDelta.toFixed(2)} DH</span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-base">Articles</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un article
              </Button>
            </div>

            {lines.length === 0 ? (
              <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                Aucune ligne. Cliquez sur «&nbsp;Ajouter un article&nbsp;» pour commencer.
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-sale-notes">Notes (optionnel)</Label>
            <Textarea
              id="new-sale-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes optionnelles…"
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-4 border-t bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full space-y-1 sm:w-auto">
            <div className="text-lg font-semibold tabular-nums">Total&nbsp;: {grandTotal.toFixed(2)} DH</div>
            {paymentMethod === "mixed" ? (
              <p
                className={
                  mixedDelta < 0.02 ? "text-sm text-green-600" : "text-sm text-destructive"
                }
              >
                {mixedDelta < 0.02 ? "Paiement équilibré" : `Reste à répartir : ${mixedDelta.toFixed(2)} DH`}
              </p>
            ) : null}
          </div>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void handleSave()}>
              Enregistrer la vente
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
