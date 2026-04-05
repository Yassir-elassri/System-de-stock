"use client"

import React, { useState, Fragment } from "react"
import { Client } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, Plus, Phone, Mail, MapPin, Users, DollarSign, CreditCard, Edit, Trash2 } from "lucide-react"
import { useEffect } from "react"

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [clients, setClients] = useState<Client[]>([])
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: ""
  })

  // Fetch clients from API
  useEffect(() => {
    async function fetchClients() {
      const res = await fetch("/api/clients")
      const data = await res.json()
      setClients(data)
    }
    fetchClients()
  }, [])

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.phone || "").includes(searchTerm) ||
    (client.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))

  const totalClients = clients.length
  const totalCredit = clients.reduce((sum, client) => sum + (client.credit_balance || 0), 0)
  const clientsWithCredit = clients.filter(client => (client.credit_balance || 0) > 0).length

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        const newClient = await res.json()
        setClients([...clients, newClient])
        setFormData({ name: "", phone: "", email: "", address: "" })
      } else {
        alert("Erreur lors de l'ajout du client")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setEditFormData({
      name: client.name,
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || ""
    })
    setShowEditModal(true)
  }

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClient) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/clients/${editingClient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData)
      })
      if (res.ok) {
        const updatedClient = await res.json()
        setClients(clients.map(c => c.id === editingClient.id ? updatedClient : c))
        setShowEditModal(false)
        setEditingClient(null)
        setEditFormData({ name: "", phone: "", email: "", address: "" })
      } else {
        alert("Erreur lors de la modification du client")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClient = async (id: number) => {
    if (!window.confirm("Supprimer ce client ?")) return
    setIsLoading(true)
    try {
      console.log(`Attempting to delete client ID: ${id}`)
      const res = await fetch("/api/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      })
      
      console.log(`Response status: ${res.status}`)
      
      if (res.ok) {
        const result = await res.json()
        console.log('Delete successful:', result)
        setClients(clients.filter(c => c.id !== id))
        alert("Client supprimé avec succès!")
      } else {
        const errorData = await res.json()
        console.error('Delete failed:', errorData)
        alert(errorData.error || "Erreur lors de la suppression du client")
      }
    } catch (error) {
      console.error("Error deleting client:", error)
      alert("Erreur de connexion lors de la suppression du client")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
        <p className="text-slate-600">Gestion des clients et crédits</p>
      </div>

      {/* Formulaire d'ajout */}
      <form onSubmit={handleAddClient} className="space-y-4 bg-white p-4 rounded shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input placeholder="Nom du client" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          <Input placeholder="Téléphone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          <Input placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          <Input placeholder="Adresse" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
        </div>
        <Button type="submit" disabled={isLoading}>Ajouter</Button>
      </form>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avec Crédit</p>
                <p className="text-2xl font-bold">{clientsWithCredit}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Crédit</p>
                <p className="text-2xl font-bold">{totalCredit.toFixed(2)} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Nouveaux (30j)</p>
                <p className="text-2xl font-bold">{clients.filter(client => {
                  const created = new Date(client.created_at)
                  const now = new Date()
                  const diff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
                  return diff <= 30
                }).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre de recherche et actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Liste des clients */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Nom</th>
                  <th className="text-left p-2">Téléphone</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Adresse</th>
                  <th className="text-right p-2">Crédit</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Group clients by first letter
                  const groupedClients = filteredClients.reduce((groups, client) => {
                    // Clean the name and get first letter
                    const cleanName = client.name.trim()
                    const firstLetter = cleanName.charAt(0).toUpperCase()
                    
                    // Handle special cases
                    const letter = firstLetter.match(/[A-Z]/) ? firstLetter : '#' // Use # for non-alphabetic characters
                    
                    if (!groups[letter]) {
                      groups[letter] = []
                    }
                    groups[letter].push(client)
                    return groups
                  }, {} as Record<string, typeof filteredClients>)

                  // Sort groups by letter (put # at the end)
                  const sortedGroups = Object.keys(groupedClients).sort((a, b) => {
                    if (a === '#') return 1
                    if (b === '#') return -1
                    return a.localeCompare(b)
                  })

                  return sortedGroups.map((letter) => (
                    <Fragment key={letter}>
                      {/* Letter Header */}
                      <tr className="bg-blue-50 border-b-2 border-blue-200">
                        <td colSpan={6} className="p-3">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg mr-3">
                              {letter === '#' ? '#' : letter}
                            </div>
                            <span className="text-blue-800 font-semibold text-lg">
                              {letter === '#' ? 'Autres' : letter} ({groupedClients[letter].length} client{groupedClients[letter].length > 1 ? 's' : ''})
                            </span>
                          </div>
                        </td>
                      </tr>
                      {/* Clients in this group */}
                      {groupedClients[letter].map((client) => (
                        <tr key={client.id} className="border-b hover:bg-slate-50">
                          <td className="p-2 font-medium">{client.name}</td>
                          <td className="p-2">{client.phone}</td>
                          <td className="p-2">{client.email}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{client.address}</span>
                            </div>
                          </td>
                          <td className="text-right p-2">
                            {client.credit_balance > 0 ? (
                              <Badge variant="destructive">
                                {client.credit_balance.toFixed(2)} DH
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Solde</Badge>
                            )}
                          </td>
                          <td className="text-center p-2">
                            <div className="flex gap-2 justify-center">
                              <Button variant="outline" size="sm" onClick={() => handleEditClient(client)} disabled={isLoading}>
                                <Edit className="h-4 w-4 mr-1" />
                                Modifier
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteClient(client.id)} disabled={isLoading}>
                                <Trash2 className="h-4 w-4 mr-1" />
                                Supprimer
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))
                })()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateClient} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nom</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Téléphone</Label>
              <Input
                id="edit-phone"
                value={editFormData.phone}
                onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Adresse</Label>
              <Input
                id="edit-address"
                value={editFormData.address}
                onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Modification..." : "Modifier"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 