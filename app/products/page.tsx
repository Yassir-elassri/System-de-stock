"use client"

import { useState, useEffect, useMemo } from "react"
import { normalizeSearchQuery, productMatchesSearch } from "@/lib/search-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Trash2, AlertTriangle, Package, Eye, Save, X, DollarSign, TrendingUp } from "lucide-react"
import { toast } from "sonner"

// Données d'exemple - à remplacer par des appels API
const sampleProducts = [
  {
    id: 1,
    name: "Câble électrique 2.5mm²",
    description: "Câble électrique rigide pour installation",
    purchase_price: 2.5,
    selling_price: 4.0,
    current_stock: 150,
    minimum_stock: 30,
    unit: "mètre",
    category: "Électricité",
    barcode: "1234567890123",
  },
  {
    id: 2,
    name: "Peinture Blanche 1L",
    description: "Peinture acrylique blanche",
    purchase_price: 45.0,
    selling_price: 65.0,
    current_stock: 12,
    minimum_stock: 5,
    unit: "litre",
    category: "Peinture",
    barcode: "1234567890124",
  },
  {
    id: 3,
    name: "Tuyau PVC 32mm",
    description: "Tuyau PVC pour plomberie",
    purchase_price: 8.0,
    selling_price: 12.0,
    current_stock: 25,
    minimum_stock: 10,
    unit: "mètre",
    category: "Plombier",
    barcode: "1234567890125",
  },
]

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    purchase_price: '',
    selling_price: '',
    current_stock: '',
    minimum_stock: ''
  })

  // Fetch products from API on component mount
  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true)
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      } else {
        console.error('Failed to fetch products')
        toast.error('Erreur lors du chargement des produits')
      }
    } catch (error) {
      console.error('Error fetching products:', error)
        toast.error('Erreur lors du chargement des produits')
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const searchNeedle = useMemo(() => normalizeSearchQuery(searchTerm), [searchTerm])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = productMatchesSearch(product, searchNeedle)
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchNeedle, selectedCategory])

  // Get unique categories for filter dropdown
  const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort()

  // Group products by first letter for alphabetical classification
  const groupProductsByLetter = (products: any[]) => {
    const grouped = products.reduce((acc, product) => {
      const productName = product.name || 'Sans nom'
      const firstChar = productName.charAt(0).toUpperCase()
      
      // Check if the first character is a letter
      const isLetter = /[A-Z]/.test(firstChar)
      
      // Use the first letter if it's alphabetic, otherwise group under "Autres"
      const groupKey = isLetter ? firstChar : 'Autres'
      
      if (!acc[groupKey]) {
        acc[groupKey] = []
      }
      acc[groupKey].push(product)
      return acc
    }, {} as Record<string, any[]>)
    
    // Sort the groups by letter, but put "Autres" at the end
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === 'Autres') return 1
      if (b === 'Autres') return -1
      return a.localeCompare(b)
    })
    
    return sortedKeys.reduce((result, key) => {
      result[key] = grouped[key]
      return result
    }, {} as Record<string, any[]>)
  }

  const groupedProducts = groupProductsByLetter(filteredProducts)

  // Clear category filter
  const clearCategoryFilter = () => {
    setSelectedCategory("all")
  }

  const getStockStatus = (current: number, minimum: number) => {
    const currentStock = current || 0
    const minStock = minimum || 0
    if (currentStock === 0) return { label: "Rupture", color: "destructive" }
    if (currentStock <= minStock) return { label: "Stock faible", color: "secondary" }
    return { label: "En stock", color: "default" }
  }

  const handleAddProduct = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      purchase_price: '',
      selling_price: '',
      current_stock: '',
      minimum_stock: ''
    })
    setIsAddModalOpen(true)
  }

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product)
    setFormData({
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      purchase_price: product.purchase_price?.toString() || '',
      selling_price: product.selling_price?.toString() || '',
      current_stock: product.current_stock?.toString() || '',
      minimum_stock: product.minimum_stock?.toString() || ''
    })
    setIsEditModalOpen(true)
  }

  const handleDeleteProduct = (product: any) => {
    setSelectedProduct(product)
    setIsDeleteModalOpen(true)
  }

  const handleViewProduct = (product: any) => {
    setSelectedProduct(product)
    // Show product details in a modal or navigate to detail page
    toast.info(`Voir les détails de ${product.name || 'Produit'}`)
  }

  const handleSaveProduct = async () => {
    setIsLoading(true)
    
    // Helper function to parse numbers with commas and other formatting
    const parseNumber = (value: string) => {
      if (!value) return 0;
      // Remove commas and other non-numeric characters except decimal point and minus
      const cleaned = value.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    const productData = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      purchase_price: parseNumber(formData.purchase_price),
      selling_price: parseNumber(formData.selling_price),
      current_stock: parseNumber(formData.current_stock),
      minimum_stock: parseNumber(formData.minimum_stock),
      unit: 'pièce',
      barcode: ''
    }
    
    try {
      if (selectedProduct) {
        // Update existing product
        const response = await fetch('/api/products', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...productData,
            id: selectedProduct.id
          })
        })
        
        if (response.ok) {
          const updatedProduct = await response.json()
          setProducts(products.map(p => p.id === selectedProduct.id ? updatedProduct : p))
          toast.success("Produit modifié avec succès")
        } else {
          toast.error("Erreur lors de la modification du produit")
        }
      } else {
        // Add new product to database
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productData)
        })
        
        if (response.ok) {
          const newProduct = await response.json()
          setProducts([...products, newProduct])
          toast.success("Produit ajouté avec succès")
        } else {
          toast.error("Erreur lors de l'ajout du produit")
        }
      }
    } catch (error) {
      console.error('Error saving product:', error)
      toast.error("Erreur lors de l'enregistrement du produit")
    } finally {
      setIsLoading(false)
      setIsEditModalOpen(false)
      setIsAddModalOpen(false)
      setSelectedProduct(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/products?id=${selectedProduct.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setProducts(products.filter(p => p.id !== selectedProduct.id))
        toast.success("Produit supprimé avec succès")
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Erreur lors de la suppression du produit")
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error("Erreur lors de la suppression du produit")
    } finally {
      setIsLoading(false)
      setIsDeleteModalOpen(false)
      setSelectedProduct(null)
    }
  }

  const handleStockAdjustment = (productId: number, adjustment: number) => {
    setProducts(products.map(p => 
      p.id === productId 
        ? { ...p, current_stock: Math.max(0, p.current_stock + adjustment) }
        : p
    ))
    toast.success("Stock ajusté avec succès")
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestion des Produits</h1>
          <p className="text-slate-600">Gérez votre inventaire et stock</p>
        </div>
        <Button className="flex items-center gap-2" onClick={handleAddProduct}>
          <Plus className="h-4 w-4" />
          Nouveau Produit
        </Button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Produits</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Stock Faible</p>
                <p className="text-2xl font-bold">
                  {products.filter((p) => p.current_stock <= p.minimum_stock && p.current_stock > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Rupture</p>
                <p className="text-2xl font-bold">
                  {products.filter((p) => p.current_stock === 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Catégories</p>
                <p className="text-2xl font-bold">
                  {new Set(products.map((p) => p.category)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Valeur totale des produits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Valeur Totale (Prix d'Achat)</p>
                <p className="text-2xl font-bold text-green-600">
                  {products.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.current_stock || 0)), 0).toFixed(2)} DH
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Valeur Totale (Prix de Vente)</p>
                <p className="text-2xl font-bold text-blue-600">
                  {products.reduce((sum, p) => sum + ((p.selling_price || 0) * (p.current_stock || 0)), 0).toFixed(2)} DH
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtre de catégorie */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="categoryFilter" className="text-sm font-medium">Filtrer par catégorie:</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCategory && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearCategoryFilter}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Effacer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filtres rapides par catégorie */}
      {uniqueCategories.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Filtres rapides:</span>
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className="text-xs"
              >
                Toutes
              </Button>
              {/* Show all categories */}
              {uniqueCategories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="text-xs"
                >
                  {category}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Valeur par catégorie */}
      {uniqueCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Valeur par Catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniqueCategories.map(category => {
                const categoryProducts = products.filter(p => p.category === category)
                const totalPurchaseValue = categoryProducts.reduce((sum, p) => 
                  sum + ((p.purchase_price || 0) * (p.current_stock || 0)), 0)
                const totalSellingValue = categoryProducts.reduce((sum, p) => 
                  sum + ((p.selling_price || 0) * (p.current_stock || 0)), 0)
                const productCount = categoryProducts.length
                
                return (
                  <div key={category} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{category}</h3>
                      <Badge variant="outline">{productCount} produit{productCount !== 1 ? 's' : ''}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Valeur Achat:</span>
                        <span className="font-semibold text-green-600">
                          {totalPurchaseValue.toFixed(2)} DH
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Valeur Vente:</span>
                        <span className="font-semibold text-blue-600">
                          {totalSellingValue.toFixed(2)} DH
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-sm font-medium text-gray-700">Marge Potentielle:</span>
                        <span className="font-bold text-purple-600">
                          {(totalSellingValue - totalPurchaseValue).toFixed(2)} DH
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barre de recherche — juste au-dessus de la liste */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste des produits */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Liste des Produits</CardTitle>
            <div className="text-sm text-muted-foreground">
              {selectedCategory !== "all" && (
                <span className="mr-2">
                  Filtré par: <Badge variant="secondary">{selectedCategory}</Badge>
                </span>
              )}
              <span>
                {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} sur {products.length}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingProducts ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement des produits...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(groupedProducts).length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun produit trouvé</h3>
                  <p className="text-gray-500">Essayez de modifier vos filtres ou ajoutez un nouveau produit.</p>
                </div>
              ) : (
                Object.entries(groupedProducts).map(([letter, letterProducts]) => (
                  <div key={letter} className="space-y-3">
                    {/* Letter Header */}
                    <div className="flex items-center gap-3 py-2 border-b-2 border-blue-200">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                        {letter === 'Autres' ? '#' : letter}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {letter === 'Autres' ? 'Autres' : letter} - {letterProducts.length} produit{letterProducts.length !== 1 ? 's' : ''}
                      </h3>
                    </div>
                    
                    {/* Products Table for this letter */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-3 font-medium text-gray-700">Produit</th>
                            <th className="text-left p-3 font-medium text-gray-700">Catégorie</th>
                            <th className="text-right p-3 font-medium text-gray-700">Prix Achat</th>
                            <th className="text-right p-3 font-medium text-gray-700">Prix Vente</th>
                            <th className="text-center p-3 font-medium text-gray-700">Stock</th>
                            <th className="text-center p-3 font-medium text-gray-700">Statut</th>
                            <th className="text-center p-3 font-medium text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {letterProducts.map((product) => {
                            const stockStatus = getStockStatus(product.current_stock, product.minimum_stock)
                            return (
                              <tr key={product.id} className="border-b hover:bg-slate-50 transition-colors">
                                <td className="p-3">
                                  <div>
                                    <p className="font-medium text-gray-900">{product.name || 'Sans nom'}</p>
                                    <p className="text-sm text-gray-500">{product.description || 'Aucune description'}</p>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <Badge variant="outline" className="text-xs">
                                    {product.category || 'Non catégorisé'}
                                  </Badge>
                                </td>
                                <td className="text-right p-3 font-medium text-gray-900">
                                  {(product.purchase_price || 0).toFixed(2)} DH
                                </td>
                                <td className="text-right p-3 font-semibold text-blue-600">
                                  {(product.selling_price || 0).toFixed(2)} DH
                                </td>
                                <td className="text-center p-3">
                                  <div className="flex flex-col items-center">
                                    <span className="font-semibold text-gray-900">
                                      {typeof product.current_stock === 'number' 
                                        ? product.current_stock % 1 === 0 
                                          ? product.current_stock 
                                          : product.current_stock.toFixed(1)
                                        : product.current_stock || 0}
                                    </span>
                                    <span className="text-xs text-gray-500">{product.unit || 'pièce'}</span>
                                  </div>
                                </td>
                                <td className="text-center p-3">
                                  <Badge variant={stockStatus.color as any}>{stockStatus.label}</Badge>
                                </td>
                                <td className="text-center p-3">
                                  <div className="flex gap-1 justify-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewProduct(product)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditProduct(product)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleStockAdjustment(product.id, 1)}
                                      className="h-8 w-8 p-0"
                                    >
                                      +
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleStockAdjustment(product.id, -1)}
                                      className="h-8 w-8 p-0"
                                    >
                                      -
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteProduct(product)}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal d'ajout/édition de produit */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? "Modifier le Produit" : "Nouveau Produit"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nom</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">Catégorie</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Électricité">Électricité</SelectItem>
                  <SelectItem value="Plombier">Plombier</SelectItem>
                  <SelectItem value="Peinture">Peinture</SelectItem>
                  <SelectItem value="Boulonnerie">Boulonnerie</SelectItem>
                  <SelectItem value="Quincaillerie">Quincaillerie</SelectItem>
                  <SelectItem value="Matériel de construction">Matériel de construction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="purchase_price" className="text-right">Prix Achat</Label>
              <Input
                id="purchase_price"
                type="text"
                value={formData.purchase_price}
                onChange={(e) => setFormData({...formData, purchase_price: e.target.value})}
                placeholder="Ex: 100.50 ou 1,000.00"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="selling_price" className="text-right">Prix Vente</Label>
              <Input
                id="selling_price"
                type="text"
                value={formData.selling_price}
                onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
                placeholder="Ex: 150.75 ou 2,500.00"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="current_stock" className="text-right">Stock Actuel</Label>
              <Input
                id="current_stock"
                type="text"
                value={formData.current_stock}
                onChange={(e) => setFormData({...formData, current_stock: e.target.value})}
                placeholder="Ex: 50 ou 1,000"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="minimum_stock" className="text-right">Stock Minimum</Label>
              <Input
                id="minimum_stock"
                type="text"
                value={formData.minimum_stock}
                onChange={(e) => setFormData({...formData, minimum_stock: e.target.value})}
                placeholder="Ex: 10 ou 100"
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveProduct} disabled={isLoading}>
              {isLoading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmation de suppression */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Êtes-vous sûr de vouloir supprimer le produit &quot;{selectedProduct?.name}&quot; ?</p>
            <p className="text-sm text-muted-foreground mt-2">Cette action est irréversible.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isLoading}>
              {isLoading ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
