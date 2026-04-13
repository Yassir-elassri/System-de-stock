"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Plus, Search, Eye, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { NewSaleModal } from "@/components/NewSaleModal"
import type { ClientOption, ProductOption } from "@/components/new-sale-modal/types"

interface SaleRow {
  id: number
  sale_date: string
  total_amount: number
  payment_method: string
  client_name?: string | null
}

export default function SalesPage() {
  const [sales, setSales] = React.useState<SaleRow[]>([])
  const [products, setProducts] = React.useState<ProductOption[]>([])
  const [clients, setClients] = React.useState<ClientOption[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [modalOpen, setModalOpen] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [salesRes, productsRes, clientsRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/products"),
        fetch("/api/clients"),
      ])
      if (salesRes.ok) setSales(await salesRes.json())
      if (productsRes.ok) setProducts(await productsRes.json())
      if (clientsRes.ok) setClients(await clientsRes.json())
    } catch {
      toast.error("Erreur lors du chargement des ventes")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sales
    return sales.filter(
      (s) =>
        String(s.id).includes(q) ||
        (s.client_name ?? "").toLowerCase().includes(q) ||
        s.payment_method.toLowerCase().includes(q),
    )
  }, [sales, search])

  const handleSaveSale = async (data: {
    client_id: string
    payment_method: string
    cash_amount: number
    credit_amount: number
    notes: string
    items: Array<{
      product_id: number
      quantity: number
      unit_price: number
      additional_price: number
    }>
    total_amount: number
  }) => {
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: data.client_id ? parseInt(data.client_id, 10) : null,
          total_amount: data.total_amount,
          payment_method: data.payment_method,
          cash_amount: data.cash_amount,
          credit_amount: data.credit_amount,
          notes: data.notes || null,
          items: data.items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            additional_price: i.additional_price ?? 0,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "Erreur lors de la création de la vente")
        throw new Error("SAVE_FAILED")
      }
      toast.success("Vente enregistrée")
      await load()
      if (typeof window !== "undefined" && (window as unknown as { refreshCashRegister?: () => void }).refreshCashRegister) {
        ;(window as unknown as { refreshCashRegister: () => void }).refreshCashRegister()
      }
    } catch (e) {
      if (e instanceof Error && e.message === "SAVE_FAILED") throw e
      toast.error("Erreur lors de la création de la vente")
      throw e
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventes</h1>
          <p className="text-muted-foreground">Historique et nouvelle vente</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="icon" onClick={() => void load()} aria-label="Actualiser">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button type="button" onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle vente
          </Button>
          <Button type="button" variant="secondary" asChild>
            <Link href="/sales/refund">Remboursement</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Liste des ventes</CardTitle>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Filtrer les ventes"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading && sales.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Aucune vente à afficher.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">N°</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Client</th>
                    <th className="px-4 py-3 text-left font-medium">Paiement</th>
                    <th className="px-4 py-3 text-right font-medium">Montant</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono">#{s.id}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {s.sale_date ? new Date(s.sale_date).toLocaleString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3">{s.client_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{s.payment_method}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {(s.total_amount ?? 0).toFixed(2)} DH
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button type="button" variant="ghost" size="sm" asChild>
                          <Link href={`/sales/${s.id}`}>
                            <Eye className="mr-1 h-4 w-4" />
                            Facture
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <NewSaleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        products={products}
        clients={clients}
        onSave={handleSaveSale}
      />
    </div>
  )
}
