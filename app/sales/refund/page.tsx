"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"

export default function RefundPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    client_name: "",
    description: "",
    amount: "",
    payment_method: "cash",
    reason: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/cash-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'refund',
          amount: -Math.abs(parseFloat(formData.amount)), // Ensure negative amount for refunds
          payment_method: formData.payment_method,
          description: `${formData.description} - Raison: ${formData.reason}`,
          client_name: formData.client_name
        }),
      })

      if (response.ok) {
        router.push('/cash-register')
      } else {
        console.error('Error creating refund')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Remboursement</h1>
          <p className="text-slate-600">Traiter un remboursement client</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Détails du Remboursement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="client_name">Nom du Client</Label>
                <Input
                  id="client_name"
                  placeholder="Entrez le nom du client"
                  value={formData.client_name}
                  onChange={(e) => handleInputChange('client_name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Montant à Rembourser (DH)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description du Produit/Service</Label>
              <Textarea
                id="description"
                placeholder="Description du produit ou service remboursé..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Raison du Remboursement</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) => handleInputChange('reason', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez la raison du remboursement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defective">Produit défectueux</SelectItem>
                  <SelectItem value="wrong_item">Mauvais article livré</SelectItem>
                  <SelectItem value="customer_request">Demande client</SelectItem>
                  <SelectItem value="overcharge">Surfacturation</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Méthode de Remboursement</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => handleInputChange('payment_method', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez la méthode de remboursement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="credit">Crédit client</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Traitement..." : "Traiter le Remboursement"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 