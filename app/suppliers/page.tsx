"use client"

import { useState, useEffect } from "react"
import { Supplier } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Phone, Mail, MapPin, Building2, Edit } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: ""
  })

  // Fetch suppliers from API
  useEffect(() => {
    async function fetchSuppliers() {
      const res = await fetch("/api/suppliers")
      const data = await res.json()
      setSuppliers(data)
    }
    fetchSuppliers()
  }, [])

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.contact_person || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalSuppliers = suppliers.length
  const totalCredit = suppliers.reduce((sum, supplier) => sum + (supplier.credit_balance || 0), 0)

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        const newSupplier = await res.json()
        setSuppliers([...suppliers, newSupplier])
        setFormData({ name: "", contact_person: "", phone: "", email: "", address: "" })
      } else {
        alert("Erreur lors de l'ajout du fournisseur")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setEditFormData({
      name: supplier.name || "",
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || ""
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEditSupplier = async () => {
    if (!selectedSupplier) return
    
    if (!editFormData.name.trim()) {
      toast.error("Le nom du fournisseur est obligatoire")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/suppliers/${selectedSupplier.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData)
      })

      if (res.ok) {
        const updatedSupplier = await res.json()
        setSuppliers(suppliers.map(supplier => 
          supplier.id === selectedSupplier.id ? updatedSupplier : supplier
        ))
        setIsEditModalOpen(false)
        setEditFormData({
          name: "",
          contact_person: "",
          phone: "",
          email: "",
          address: ""
        })
        toast.success("Fournisseur modifié avec succès")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Erreur lors de la modification du fournisseur")
      }
    } catch (error) {
      console.error("Error updating supplier:", error)
      toast.error("Erreur lors de la modification du fournisseur")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSupplier = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur ?")) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        setSuppliers(suppliers.filter(s => s.id !== id))
        toast.success("Fournisseur supprimé avec succès")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Erreur lors de la suppression du fournisseur")
      }
    } catch (error) {
      console.error("Error deleting supplier:", error)
      toast.error("Erreur lors de la suppression du fournisseur")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Fournisseurs</h1>
        <p className="text-slate-600">Gestion des fournisseurs et partenaires</p>
      </div>

      {/* Formulaire d'ajout */}
      <form onSubmit={handleAddSupplier} className="space-y-4 bg-white p-4 rounded shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Input placeholder="Nom du fournisseur" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          <Input placeholder="Contact" value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} />
          <Input placeholder="Téléphone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          <Input placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          <Input placeholder="Adresse" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
        </div>
        <Button type="submit" disabled={isLoading}>Ajouter</Button>
      </form>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Fournisseurs</p>
                <p className="text-2xl font-bold">{totalSuppliers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avec Crédit</p>
                <p className="text-2xl font-bold">
                  {suppliers.filter(s => (s.credit_balance || 0) > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Crédit</p>
                <p className="text-2xl font-bold">{totalCredit.toFixed(2)} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des fournisseurs */}
      <div className="bg-white p-4 rounded shadow">
        <div className="mb-4 flex items-center gap-2">
          <Input
            placeholder="Rechercher un fournisseur..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Nom</th>
                <th className="text-left p-2">Contact</th>
                <th className="text-left p-2">Téléphone</th>
                <th className="text-left p-2">Email</th>
                <th className="text-left p-2">Adresse</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map(supplier => (
                <tr key={supplier.id}>
                  <td className="p-2 font-medium">{supplier.name}</td>
                  <td className="p-2">{supplier.contact_person}</td>
                  <td className="p-2">{supplier.phone}</td>
                  <td className="p-2">{supplier.email}</td>
                  <td className="p-2">{supplier.address}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditSupplier(supplier)}
                        disabled={isLoading}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDeleteSupplier(supplier.id)} 
                        disabled={isLoading}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal modifier fournisseur */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier le Fournisseur</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_name">Nom du fournisseur *</Label>
              <Input
                id="edit_name"
                value={editFormData.name}
                onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Nom du fournisseur"
                required
              />
            </div>

            <div>
              <Label htmlFor="edit_contact_person">Personne de contact</Label>
              <Input
                id="edit_contact_person"
                value={editFormData.contact_person}
                onChange={e => setEditFormData({ ...editFormData, contact_person: e.target.value })}
                placeholder="Nom de la personne de contact"
              />
            </div>

            <div>
              <Label htmlFor="edit_phone">Téléphone</Label>
              <Input
                id="edit_phone"
                value={editFormData.phone}
                onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                placeholder="Numéro de téléphone"
              />
            </div>

            <div>
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={editFormData.email}
                onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="Adresse email"
              />
            </div>

            <div>
              <Label htmlFor="edit_address">Adresse</Label>
              <Input
                id="edit_address"
                value={editFormData.address}
                onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                placeholder="Adresse complète"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveEditSupplier} disabled={isLoading}>
                {isLoading ? "Modification..." : "Modifier"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 