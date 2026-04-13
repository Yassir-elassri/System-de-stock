"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { ProductOption } from "./types"

const LIST_CAP = 150

interface ProductSearchComboboxProps {
  products: ProductOption[]
  valueId: number
  onSelect: (productId: number) => void
  disabled?: boolean
  inputId?: string
}

export function ProductSearchCombobox({
  products,
  valueId,
  onSelect,
  disabled,
  inputId,
}: ProductSearchComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(0)
  const deferredQuery = React.useDeferredValue(query)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listBaseId = inputId ?? "product"
  const listId = `${listBaseId}-listbox`

  const selected = products.find((p) => p.id === valueId)

  const filtered = React.useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    if (!q) return products.slice(0, LIST_CAP)
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          String(p.id).includes(q),
      )
      .slice(0, LIST_CAP)
  }, [products, deferredQuery])

  const filteredKey = filtered.map((p) => p.id).join(",")

  React.useEffect(() => {
    if (open) setActiveIndex(0)
  }, [deferredQuery, open])

  React.useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const showList = open && !disabled

  const clampedActive =
    filtered.length === 0 ? -1 : Math.min(Math.max(0, activeIndex), filtered.length - 1)

  React.useEffect(() => {
    if (!showList || clampedActive < 0) return
    const id = `${listId}-opt-${filtered[clampedActive].id}`
    document.getElementById(id)?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [clampedActive, showList, listId, filteredKey])

  const pickAt = (index: number) => {
    const p = filtered[index]
    if (!p) return
    onSelect(p.id)
    setOpen(false)
    setQuery("")
    setActiveIndex(0)
  }

  const activeDescendantId =
    showList && clampedActive >= 0 ? `${listId}-opt-${filtered[clampedActive].id}` : undefined

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <button
        type="button"
        id={inputId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={showList}
        className={cn(
          "flex h-10 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background",
          "hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          disabled && "pointer-events-none opacity-50",
        )}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.name : "Rechercher un produit…"}
        </span>
        {selected ? (
          <Badge variant="secondary" className="ml-2 shrink-0 text-xs font-normal">
            {selected.current_stock} {selected.unit}
          </Badge>
        ) : null}
      </button>

      {showList ? (
        <div
          className="absolute left-0 right-0 z-[60] mt-1 max-h-[min(280px,50vh)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
          role="listbox"
          aria-label="Produits"
        >
          <div className="sticky top-0 z-10 border-b bg-background px-2 py-2">
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-activedescendant={activeDescendantId}
              autoComplete="off"
              spellCheck={false}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Tapez pour filtrer…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation()
                  setOpen(false)
                  return
                }
                if (filtered.length === 0) return

                if (e.key === "ArrowDown") {
                  e.preventDefault()
                  setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
                  return
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault()
                  setActiveIndex((i) => Math.max(i - 1, 0))
                  return
                }
                if (e.key === "Home") {
                  e.preventDefault()
                  setActiveIndex(0)
                  return
                }
                if (e.key === "End") {
                  e.preventDefault()
                  setActiveIndex(filtered.length - 1)
                  return
                }
                if (e.key === "Enter") {
                  e.preventDefault()
                  const idx =
                    filtered.length === 0
                      ? -1
                      : Math.min(Math.max(0, activeIndex), filtered.length - 1)
                  if (idx >= 0) pickAt(idx)
                }
              }}
            />
          </div>
          <div id={listId} className="max-h-[220px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">Aucun produit trouvé.</div>
            ) : (
              filtered.map((p, idx) => (
                <div
                  key={p.id}
                  id={`${listId}-opt-${p.id}`}
                  role="option"
                  aria-selected={p.id === valueId}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                    p.id === valueId && "bg-accent/70",
                    idx === clampedActive && "bg-accent/50",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => pickAt(idx)}
                >
                  <span className="min-w-0 truncate">{p.name}</span>
                  <Badge
                    variant={p.current_stock === 0 ? "destructive" : p.current_stock < 5 ? "default" : "secondary"}
                    className="shrink-0 text-xs font-normal"
                  >
                    {p.current_stock} {p.unit}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
