"use client"

import * as React from "react"
import { Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ProductSearchCombobox } from "./ProductSearchCombobox"
import type { ProductOption, SaleLineDraft } from "./types"
import { lineTotal, parseMoneyInput, parseQuantity, round2 } from "./money"

interface SaleLineRowProps {
  line: SaleLineDraft
  products: ProductOption[]
  rowIndex: number
  onChange: (patch: Partial<SaleLineDraft>) => void
  onSelectProduct: (productId: number) => void
  onRemove: () => void
}

export function SaleLineRow({
  line,
  products,
  rowIndex,
  onChange,
  onSelectProduct,
  onRemove,
}: SaleLineRowProps) {
  const base = round2(parseQuantity(line.qtyStr) * parseMoneyInput(line.unitPriceStr))
  const total = lineTotal(line.qtyStr, line.unitPriceStr, line.laborStr)
  const productFieldId = `sale-line-${line.rowId}-product`

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
        <div className="sm:col-span-5">
          <label htmlFor={productFieldId} className="mb-1 block text-sm font-medium text-foreground">
            Produit
          </label>
          <ProductSearchCombobox
            inputId={productFieldId}
            products={products}
            valueId={line.productId}
            onSelect={onSelectProduct}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`${line.rowId}-qty`} className="mb-1 block text-sm font-medium text-foreground">
            Quantité
          </label>
          <Input
            id={`${line.rowId}-qty`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={line.qtyStr}
            onChange={(e) => onChange({ qtyStr: e.target.value })}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`${line.rowId}-unit`} className="mb-1 block text-sm font-medium text-foreground">
            Prix unitaire (DH)
          </label>
          <Input
            id={`${line.rowId}-unit`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={line.unitPriceStr}
            onChange={(e) => onChange({ unitPriceStr: e.target.value })}
          />
        </div>

        <div className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-foreground">Sous-total</span>
          <div className="flex h-10 items-center rounded-md border border-dashed bg-muted/40 px-3 text-sm tabular-nums">
            {base.toFixed(2)}
          </div>
        </div>

        <div className="flex sm:col-span-1 sm:justify-end">
          <Button type="button" variant="outline" size="icon" className="text-destructive" onClick={onRemove} aria-label={`Supprimer la ligne ${rowIndex + 1}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-12 sm:items-end">
        <div className="sm:col-span-4">
          <label htmlFor={`${line.rowId}-labor`} className="mb-1 block text-sm font-medium text-foreground">
            Main d&apos;œuvre (DH)
          </label>
          <Input
            id={`${line.rowId}-labor`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={line.laborStr}
            onChange={(e) => onChange({ laborStr: e.target.value })}
            className="border-orange-200 focus-visible:ring-orange-400/30"
          />
        </div>
        <div className="sm:col-span-4">
          <span className="mb-1 block text-sm font-medium text-foreground">Total ligne (DH)</span>
          <div className="flex h-10 items-center rounded-md border border-blue-200 bg-blue-50/80 px-3 text-sm font-semibold tabular-nums text-blue-900">
            {total.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  )
}
