"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableProductSelect } from "@/components/SearchableProductSelect"
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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
}

interface SaleItem {
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  total: number
  unit: string
}

export default function NewSalePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [notes, setNotes] = useState("")

  // Fetch products and clients on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsResponse, clientsResponse] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/clients')
        ])
        
        if (productsResponse.ok) {
          const productsData = await productsResponse.json()
          setProducts(productsData)
        }
        
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json()
          setClients(clientsData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error("Erreur lors du chargement des données")
      }
    }

    fetchData()
  }, [])

  // Add new sale item
  const addSaleItem = () => {
    const newItem: SaleItem = {
      product_id: 0,
      product_name: "",
      quantity: 1,
      unit_price: 0,
      total: 0,
      unit: ""
    }
    setSaleItems([...saleItems, newItem])
  }

  // Remove sale item
  const removeSaleItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index))
  }

  // Update sale item
  const updateSaleItem = (index: number, field: keyof SaleItem, value: any) => {
    const updatedItems = [...saleItems]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Auto-calculate total if quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      const item = updatedItems[index]
      item.total = item.quantity * item.unit_price
    }
    
    // Auto-fill product details if product_id changes
    if (field === 'product_id') {
      const product = products.find(p => p.id === value)
      if (product) {
        updatedItems[index].product_name = product.name
        updatedItems[index].unit_price = product.selling_price
        updatedItems[index].unit = product.unit
        updatedItems[index].total = updatedItems[index].quantity * product.selling_price
      }
    }
    
    setSaleItems(updatedItems)
  }

  // Calculate total amount
  const totalAmount = saleItems.reduce((sum, item) => sum + item.total, 0)

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (saleItems.length === 0) {
      toast.error("Veuillez ajouter au moins un produit")
      return
    }

    if (!selectedClient) {
      toast.error("Veuillez sélectionner un client")
      return
    }

    if (saleItems.some(item => item.product_id === 0)) {
      toast.error("Veuillez sélectionner tous les produits")
      return
    }

    setLoading(true)

    try {
      const saleData = {
        client_id: parseInt(selectedClient),
        payment_method: paymentMethod,
        notes: notes,
        items: saleItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      }

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData),
      })

      if (response.ok) {
        toast.success("Vente créée avec succès!")
        router.push('/sales')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Erreur lors de la création de la vente")
      }
    } catch (error) {
      console.error('Error creating sale:', error)
      toast.error("Erreur lors de la création de la vente")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/sales')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nouvelle Vente</h1>
            <p className="text-muted-foreground">Créer une nouvelle transaction de vente</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client and Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informations Client et Paiement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client">Client *</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name} - {client.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment">Méthode de Paiement *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="credit">Crédit</SelectItem>
                    <SelectItem value="bank_transfer">Virement Bancaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes additionnelles..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        <Card>
          <CardHeader>
            <CardTitle>Produits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {saleItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end border p-4 rounded-lg">
                <div className="space-y-2">
                  <Label>Produit *</Label>
                  <SearchableProductSelect
                    products={products}
                    value={item.product_id}
                    onChange={(productId) => updateSaleItem(index, 'product_id', productId)}
                    placeholder="Rechercher un produit..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Quantité *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateSaleItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Prix Unitaire (DH)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateSaleItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Total (DH)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.total.toFixed(2)}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeSaleItem(index)}
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={addSaleItem}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter un Produit
            </Button>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Résumé de la Vente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Montant Total:</span>
              <span className="text-2xl text-green-600">{totalAmount.toFixed(2)} DH</span>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/sales')}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={loading || saleItems.length === 0}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            {loading ? "Création..." : "Créer la Vente"}
          </Button>
        </div>
      </form>
    </div>
  )
} 