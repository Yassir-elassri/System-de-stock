"use client"

import * as React from "react"
import type { ClientOption, PaymentMethod, ProductOption, SaleLineDraft } from "./types"
import { lineTotal, parseMoneyInput, parseQuantity, sumLineTotals } from "./money"

function newRowId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createEmptyLine(): SaleLineDraft {
  return {
    rowId: newRowId(),
    productId: 0,
    productName: "",
    qtyStr: "1",
    unitPriceStr: "",
    laborStr: "0",
  }
}

export interface UseNewSaleFormOptions {
  open: boolean
  products: ProductOption[]
  /** When true (default), clearing/resets when `open` becomes true — for modals. Set false for full-page forms. */
  resetOnOpen?: boolean
}

export function useNewSaleForm({ open, products, resetOnOpen = true }: UseNewSaleFormOptions) {
  const [clientId, setClientId] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("cash")
  const [cashStr, setCashStr] = React.useState("0")
  const [creditStr, setCreditStr] = React.useState("0")
  const [notes, setNotes] = React.useState("")
  const [lines, setLines] = React.useState<SaleLineDraft[]>([])

  const grandTotal = React.useMemo(() => sumLineTotals(lines), [lines])

  const reset = React.useCallback(() => {
    setClientId("")
    setPaymentMethod("cash")
    setCashStr("0")
    setCreditStr("0")
    setNotes("")
    setLines([])
  }, [])

  React.useEffect(() => {
    if (open && resetOnOpen) reset()
  }, [open, reset, resetOnOpen])

  const addLine = React.useCallback(() => {
    setLines((prev) => [...prev, createEmptyLine()])
  }, [])

  const removeLine = React.useCallback((rowId: string) => {
    setLines((prev) => prev.filter((l) => l.rowId !== rowId))
  }, [])

  const updateLine = React.useCallback((rowId: string, patch: Partial<SaleLineDraft>) => {
    setLines((prev) => prev.map((l) => (l.rowId === rowId ? { ...l, ...patch } : l)))
  }, [])

  const selectProduct = React.useCallback(
    (rowId: string, productId: number) => {
      const p = products.find((x) => x.id === productId)
      if (!p) return
      updateLine(rowId, {
        productId: p.id,
        productName: p.name,
        unitPriceStr: p.selling_price === 0 ? "" : String(p.selling_price),
      })
    },
    [products, updateLine],
  )

  const buildSaveItems = React.useCallback(() => {
    return lines.map((l) => {
      const quantity = parseQuantity(l.qtyStr)
      const unit_price = parseMoneyInput(l.unitPriceStr)
      const additional_price = parseMoneyInput(l.laborStr)
      const total_price = lineTotal(l.qtyStr, l.unitPriceStr, l.laborStr)
      return {
        product_id: l.productId,
        product_name: l.productName,
        quantity,
        unit_price,
        additional_price,
        total_price,
      }
    })
  }, [lines])

  return {
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
  }
}

export function sortedClients(clients: ClientOption[]): ClientOption[] {
  return [...clients].sort((a, b) => a.name.localeCompare(b.name, "fr"))
}
