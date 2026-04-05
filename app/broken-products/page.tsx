"use client"

import { useState, useEffect } from "react"
import { BrokenProduct } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, AlertTriangle, Package, DollarSign, Calendar, Trash2, Eye, Edit } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

// Mock data - in real app this would come from API
const mockBrokenProducts = [
  {
    id: 1,
    product_id: 1,
    product_name: "Câble électrique 2.5mm²",
    quantity: 2,
    original_price: 4.00,
    total_loss: 8.00,
    loss_amount: 8.00,
    reason: "Endommagé",
    date_reported: "2024-01-20",
    break_date: "2024-01-20",
    status: "pending" as const,
    notes: "Câble coupé et endommagé",
    created_at: "2024-01-20T10:00:00"
  },
  {
    id: 2,
    product_id: 2,
    product_name: "Tuyau PVC 32mm",
    quantity: 5,
    original_price: 12.00,
    total_loss: 60.00,
    loss_amount: 60.00,
    reason: "Fissuré",
    date_reported: "2024-01-18",
    break_date: "2024-01-18",
    status: "approved" as const,
    notes: "Fissures dans le tuyau",
    created_at: "2024-01-18T10:00:00"
  },
  {
    id: 3,
    product_id: 3,
    product_name: "Peinture Blanche 1L",
    quantity: 1,
    original_price: 65.00,
    total_loss: 65.00,
    loss_amount: 65.00,
    reason: "Expirée",
    date_reported: "2024-01-15",
    break_date: "2024-01-15",
    status: "rejected" as const,
    notes: "Date d'expiration dépassée",
    created_at: "2024-01-15T10:00:00"
  },
  {
    id: 4,
    product_id: 4,
    product_name: "Vis 6mm",
    quantity: 100,
    original_price: 0.75,
    total_loss: 75.00,
    loss_amount: 75.00,
    reason: "Rouillées",
    date_reported: "2024-01-22",
    break_date: "2024-01-22",
    status: "pending" as const,
    notes: "Stockage inapproprié",
    created_at: "2024-01-22T10:00:00"
  }
]

const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Approuvé" },
  { value: "rejected", label: "Rejeté" }
]

export default function BrokenProductsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [brokenProducts, setBrokenProducts] = useState<BrokenProduct[]>([])
  const [products, setProducts] = useState<Array<{id: number, name: string}>>([])
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<BrokenProduct | null>(null)
  const [editFormData, setEditFormData] = useState({
    product_id: "",
    quantity: "",
    reason: "",
    loss_amount: "",
    break_date: "",
    status: "pending"
  })
  const [addFormData, setAddFormData] = useState({
    product_id: "",
    quantity: "",
    reason: "",
    loss_amount: "",
    break_date: ""
  })

  // Fetch broken products and products from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch broken products
        const brokenResponse = await fetch('/api/broken-products')
        if (brokenResponse.ok) {
          const brokenData = await brokenResponse.json()
          setBrokenProducts(brokenData)
        } else {
          // Fallback to mock data if API fails
          setBrokenProducts(mockBrokenProducts)
        }
        
        // Fetch available products
        const productsResponse = await fetch('/api/products')
        if (productsResponse.ok) {
          const productsData = await productsResponse.json()
          setProducts(productsData)
        } else {
          console.error('Failed to fetch products')
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        // Fallback to mock data for broken products
        setBrokenProducts(mockBrokenProducts)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredProducts = brokenProducts.filter(product => {
    const matchesSearch = (product.product_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.reason || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === "all" || product.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const totalProducts = brokenProducts.length
  const totalLoss = brokenProducts.reduce((sum, product) => sum + (product.total_loss || product.loss_amount || 0), 0)
  const pendingProducts = brokenProducts.filter(p => p.status === "pending").length
  const approvedProducts = brokenProducts.filter(p => p.status === "approved").length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">En attente</Badge>
      case "approved":
        return <Badge variant="default">Approuvé</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejeté</Badge>
      default:
        return <Badge variant="outline">Inconnu</Badge>
    }
  }

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId)
    return product ? product.name : `Produit ${productId}`
  }

  const handleViewProduct = (product: BrokenProduct) => {
    setSelectedProduct(product)
    setIsViewModalOpen(true)
  }

  const handleEditProduct = (product: BrokenProduct) => {
    setSelectedProduct(product)
    setEditFormData({
      product_id: product.product_id.toString(),
      quantity: product.quantity.toString(),
      reason: product.reason || "",
      loss_amount: (product.loss_amount || 0).toString(),
      break_date: product.break_date || product.date_reported || "",
      status: product.status || "pending"
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEditProduct = async () => {
    if (!selectedProduct) return
    
    if (!editFormData.product_id || !editFormData.quantity || !editFormData.break_date) {
      toast.error("Tous les champs obligatoires doivent être remplis")
      return
    }

    if (parseInt(editFormData.quantity) <= 0) {
      toast.error("La quantité doit être supérieure à 0")
      return
    }

    try {
      const res = await fetch(`/api/broken-products/${selectedProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: parseInt(editFormData.product_id),
          quantity: parseInt(editFormData.quantity),
          reason: editFormData.reason,
          loss_amount: parseFloat(editFormData.loss_amount) || null,
          break_date: editFormData.break_date,
          status: editFormData.status
        })
      })

      if (res.ok) {
        const updatedProduct = await res.json()
        
        // Update local state
        setBrokenProducts(brokenProducts.map(product => 
          product.id === selectedProduct.id ? updatedProduct : product
        ))
        
        setIsEditModalOpen(false)
        setEditFormData({
          product_id: "",
          quantity: "",
          reason: "",
          loss_amount: "",
          break_date: "",
          status: "pending"
        })
        toast.success("Produit cassé modifié avec succès")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Erreur lors de la modification du produit cassé")
      }
    } catch (error) {
      console.error("Error updating broken product:", error)
      toast.error("Erreur lors de la modification du produit cassé")
    }
  }

  const handleDeleteProduct = async (product: BrokenProduct) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ce rapport pour "${product.product_name}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/broken-products/${product.id}`, {
        method: "DELETE"
      })

      if (res.ok) {
        // Remove from local state
        setBrokenProducts(brokenProducts.filter(p => p.id !== product.id))
        toast.success("Produit cassé supprimé avec succès")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Erreur lors de la suppression du produit cassé")
      }
    } catch (error) {
      console.error("Error deleting broken product:", error)
      toast.error("Erreur lors de la suppression du produit cassé")
    }
  }

  const handleAddProduct = () => {
    setAddFormData({
      product_id: "",
      quantity: "",
      reason: "",
      loss_amount: "",
      break_date: new Date().toISOString().split('T')[0] // Today's date
    })
    setIsAddModalOpen(true)
  }

  const handleSaveNewProduct = async () => {
    if (!addFormData.product_id || !addFormData.quantity || !addFormData.break_date) {
      toast.error("Tous les champs obligatoires doivent être remplis")
      return
    }

    if (parseInt(addFormData.quantity) <= 0) {
      toast.error("La quantité doit être supérieure à 0")
      return
    }

    try {
      const res = await fetch('/api/broken-products', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: parseInt(addFormData.product_id),
          quantity: parseInt(addFormData.quantity),
          reason: addFormData.reason,
          loss_amount: parseFloat(addFormData.loss_amount) || null,
          break_date: addFormData.break_date
        })
      })

      if (res.ok) {
        const newProduct = await res.json()
        
        // Add to local state
        setBrokenProducts([newProduct, ...brokenProducts])
        
        setIsAddModalOpen(false)
        setAddFormData({
          product_id: "",
          quantity: "",
          reason: "",
          loss_amount: "",
          break_date: ""
        })
        toast.success("Nouveau rapport de produit cassé créé avec succès")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Erreur lors de la création du rapport")
      }
    } catch (error) {
      console.error("Error creating broken product:", error)
      toast.error("Erreur lors de la création du rapport")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Produits Cassés</h1>
        <p className="text-slate-600">Gestion des produits endommagés et défectueux</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Produits</p>
                <p className="text-2xl font-bold text-red-600">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Perte Totale</p>
                <p className="text-2xl font-bold text-orange-600">{totalLoss.toFixed(2)} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">En Attente</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Approuvés</p>
                <p className="text-2xl font-bold text-green-600">{approvedProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="flex items-center gap-2" onClick={handleAddProduct}>
          <Plus className="h-4 w-4" />
          Nouveau Rapport
        </Button>
      </div>

      {/* Liste des produits cassés */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Produits Cassés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Produit</th>
                  <th className="text-left p-2">Quantité</th>
                  <th className="text-left p-2">Raison</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-right p-2">Perte</th>
                  <th className="text-center p-2">Statut</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-medium">{product.product_name || "Produit inconnu"}</td>
                    <td className="p-2">{product.quantity}</td>
                    <td className="p-2">{product.reason || "Non spécifiée"}</td>
                    <td className="p-2">
                      {new Date(product.break_date || product.date_reported || "").toLocaleDateString("fr-FR")}
                    </td>
                    <td className="text-right p-2 font-semibold text-red-600">
                      {(product.total_loss || product.loss_amount || 0).toFixed(2)} DH
                    </td>
                    <td className="text-center p-2">
                      {getStatusBadge(product.status || "pending")}
                    </td>
                    <td className="text-center p-2">
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" size="sm" onClick={() => handleViewProduct(product)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Détails
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditProduct(product)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Modifier
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDeleteProduct(product)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal détails */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Détails du Produit Cassé</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Produit</Label>
                  <p className="font-medium">{selectedProduct.product_name || "Produit inconnu"}</p>
                </div>
                <div>
                  <Label>Quantité</Label>
                  <p className="font-medium">{selectedProduct.quantity}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Raison</Label>
                  <p className="font-medium">{selectedProduct.reason || "Non spécifiée"}</p>
                </div>
                <div>
                  <Label>Perte</Label>
                  <p className="font-medium text-lg text-red-600">
                    {(selectedProduct.total_loss || selectedProduct.loss_amount || 0).toFixed(2)} DH
                  </p>
                </div>
              </div>
              
              <div>
                <Label>Date</Label>
                <p className="font-medium">
                  {new Date(selectedProduct.break_date || selectedProduct.date_reported || "").toLocaleDateString("fr-FR")}
                </p>
              </div>
              
              <div>
                <Label>Statut</Label>
                <div className="mt-1">
                  {getStatusBadge(selectedProduct.status || "pending")}
                </div>
              </div>
              
              {selectedProduct.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedProduct.notes}</p>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button onClick={() => setIsViewModalOpen(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal modifier */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier le Produit Cassé</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_product_id">Sélectionner le Produit *</Label>
                <Select
                  value={editFormData.product_id}
                  onValueChange={(value) => setEditFormData({ ...editFormData, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un produit">
                      {editFormData.product_id ? getProductName(parseInt(editFormData.product_id)) : "Sélectionner un produit"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit_quantity">Quantité *</Label>
                <Input
                  id="edit_quantity"
                  type="number"
                  min="1"
                  value={editFormData.quantity}
                  onChange={e => setEditFormData({ ...editFormData, quantity: e.target.value })}
                  placeholder="Quantité cassée"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_reason">Raison</Label>
              <Input
                id="edit_reason"
                value={editFormData.reason}
                onChange={e => setEditFormData({ ...editFormData, reason: e.target.value })}
                placeholder="Raison de la casse"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_loss_amount">Montant de la perte</Label>
                <Input
                  id="edit_loss_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.loss_amount}
                  onChange={e => setEditFormData({ ...editFormData, loss_amount: e.target.value })}
                  placeholder="Montant en DH"
                />
              </div>
              
              <div>
                <Label htmlFor="edit_status">Statut</Label>
                <Select value={editFormData.status} onValueChange={value => setEditFormData({ ...editFormData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="approved">Approuvé</SelectItem>
                    <SelectItem value="rejected">Rejeté</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_break_date">Date *</Label>
              <Input
                id="edit_break_date"
                type="date"
                value={editFormData.break_date}
                onChange={e => setEditFormData({ ...editFormData, break_date: e.target.value })}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveEditProduct}>
                Modifier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal ajouter nouveau rapport */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouveau Rapport de Produit Cassé</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add_product_id">Sélectionner le Produit *</Label>
                <Select
                  value={addFormData.product_id}
                  onValueChange={(value) => setAddFormData({ ...addFormData, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un produit">
                      {addFormData.product_id ? getProductName(parseInt(addFormData.product_id)) : "Sélectionner un produit"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="add_quantity">Quantité *</Label>
                <Input
                  id="add_quantity"
                  type="number"
                  min="1"
                  value={addFormData.quantity}
                  onChange={e => setAddFormData({ ...addFormData, quantity: e.target.value })}
                  placeholder="Quantité cassée"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="add_reason">Raison</Label>
              <Input
                id="add_reason"
                value={addFormData.reason}
                onChange={e => setAddFormData({ ...addFormData, reason: e.target.value })}
                placeholder="Raison de la casse"
              />
            </div>

            <div>
              <Label htmlFor="add_loss_amount">Montant de la perte</Label>
              <Input
                id="add_loss_amount"
                type="number"
                step="0.01"
                min="0"
                value={addFormData.loss_amount}
                onChange={e => setAddFormData({ ...addFormData, loss_amount: e.target.value })}
                placeholder="Montant en DH"
              />
            </div>

            <div>
              <Label htmlFor="add_break_date">Date *</Label>
              <Input
                id="add_break_date"
                type="date"
                value={addFormData.break_date}
                onChange={e => setAddFormData({ ...addFormData, break_date: e.target.value })}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveNewProduct}>
                Créer le Rapport
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 