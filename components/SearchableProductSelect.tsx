"use client"

import * as React from "react"
import { Check, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { normalizeSearchQuery, productMatchesSearch } from "@/lib/search-utils"

interface Product {
  id: number
  name: string
  current_stock: number
  selling_price: number
  unit: string
}

interface SearchableProductSelectProps {
  products: Product[]
  value: number
  onChange: (productId: number) => void
  placeholder?: string
  disabled?: boolean
}

export function SearchableProductSelect({
  products,
  value,
  onChange,
  placeholder = "Rechercher un produit...",
  disabled = false
}: SearchableProductSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selectedProduct = products.find(p => p.id === value)
  
  // Optimized search filtering with memoization
  const filteredProducts = React.useMemo(() => {
    const normalizedQuery = normalizeSearchQuery(searchQuery)
    
    if (normalizedQuery === "") {
      return products.slice(0, 200)
    }
    
    return products.filter(product => productMatchesSearch(product, normalizedQuery))
  }, [products, searchQuery])
  
  // Focus input when dropdown opens
  React.useEffect(() => {
    if (open) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
    if (!open) {
      setSearchQuery("")
    }
  }, [open])

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
    }
    if (e.key === 'Enter' && filteredProducts.length > 0) {
      // Select first filtered product
      onChange(filteredProducts[0].id)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <div 
          role="combobox"
          aria-expanded={open}
          aria-label="Select product"
          className={cn(
            "flex h-10 w-full items-center justify-between border border-input bg-background px-3 py-2 rounded-md text-sm cursor-pointer hover:border-primary transition-colors",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none"
          )}
          onClick={() => !disabled && setOpen(true)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setOpen(true)
            }
          }}
        >
          {selectedProduct ? (
            <div className="flex items-center gap-2 truncate flex-1 min-w-0">
              <span className="truncate">{selectedProduct.name}</span>
              <Badge variant="secondary" className="text-xs font-normal shrink-0">
                {selectedProduct.current_stock} {selectedProduct.unit}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground flex-1">{placeholder}</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-70" />
        </div>
      </PopoverTrigger>
      
      {/* Dropdown content - input + filtered list */}
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 max-w-[400px]" 
        align="start" 
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Search input - always visible at top */}
        <div className="flex items-center border-b px-3 py-2 bg-background sticky top-0 z-10">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            type="text"
            className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Rechercher par nom, code ou référence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
        
        {/* Filtered product list */}
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filteredProducts.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Aucun produit trouvé.
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                className={cn(
                  "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
                  value === product.id && "bg-accent text-accent-foreground"
                )}
                onClick={() => {
                  onChange(product.id)
                  setOpen(false)
                }}
                role="option"
                aria-selected={value === product.id}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onChange(product.id)
                    setOpen(false)
                  }
                }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {value === product.id && (
                    <Check className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">{product.name}</span>
                </div>
                <Badge 
                  variant={product.current_stock === 0 ? "destructive" : product.current_stock < 5 ? "default" : "secondary"}
                  className="ml-auto text-xs font-normal shrink-0"
                >
                  {product.current_stock} {product.unit}
                </Badge>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}