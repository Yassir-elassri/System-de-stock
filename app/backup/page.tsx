"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Download, 
  Upload, 
  Trash2, 
  Database, 
  Clock, 
  HardDrive, 
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"

interface Backup {
  filename: string
  size: number
  createdAt: string
  modifiedAt: string
}

export default function BackupPage() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [restoringBackup, setRestoringBackup] = useState(false)
  const [deletingBackup, setDeletingBackup] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null)
  const [backupDescription, setBackupDescription] = useState("")

  // Fetch backups on component mount
  useEffect(() => {
    fetchBackups()
  }, [])

  const fetchBackups = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backup')
      if (response.ok) {
        const data = await response.json()
        setBackups(data)
      } else {
        console.error('Failed to fetch backups')
        toast.error('Erreur lors du chargement des sauvegardes')
      }
    } catch (error) {
      console.error('Error fetching backups:', error)
      toast.error('Erreur lors du chargement des sauvegardes')
    } finally {
      setLoading(false)
    }
  }

  const createBackup = async () => {
    if (!backupDescription.trim()) {
      toast.error('Veuillez entrer une description pour la sauvegarde')
      return
    }

    try {
      setCreatingBackup(true)
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: backupDescription })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        setBackupDescription("")
        setIsCreateModalOpen(false)
        fetchBackups() // Refresh the list
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Erreur lors de la création de la sauvegarde')
      }
    } catch (error) {
      console.error('Error creating backup:', error)
      toast.error('Erreur lors de la création de la sauvegarde')
    } finally {
      setCreatingBackup(false)
    }
  }

  const restoreBackup = async (backup: Backup) => {
    if (!confirm(`Êtes-vous sûr de vouloir restaurer la sauvegarde "${backup.filename}" ? Cette action remplacera toutes les données actuelles.`)) {
      return
    }

    try {
      setRestoringBackup(true)
      const response = await fetch('/api/backup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: backup.filename })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        setIsRestoreModalOpen(false)
        setSelectedBackup(null)
        // Reload the page to reflect restored data
        window.location.reload()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Erreur lors de la restauration de la sauvegarde')
      }
    } catch (error) {
      console.error('Error restoring backup:', error)
      toast.error('Erreur lors de la restauration de la sauvegarde')
    } finally {
      setRestoringBackup(false)
    }
  }

  const deleteBackup = async (backup: Backup) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la sauvegarde "${backup.filename}" ?`)) {
      return
    }

    try {
      setDeletingBackup(true)
      const response = await fetch(`/api/backup?filename=${encodeURIComponent(backup.filename)}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        fetchBackups() // Refresh the list
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Erreur lors de la suppression de la sauvegarde')
      }
    } catch (error) {
      console.error('Error deleting backup:', error)
      toast.error('Erreur lors de la suppression de la sauvegarde')
    } finally {
      setDeletingBackup(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Sauvegarde</h1>
        <p className="text-slate-600">Gestion des sauvegardes de la base de données</p>
      </div>

      {/* Backup Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Sauvegardes</p>
                <p className="text-2xl font-bold text-blue-600">{backups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Espace Utilisé</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatFileSize(backups.reduce((sum, backup) => sum + backup.size, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Dernière Sauvegarde</p>
                <p className="text-2xl font-bold text-orange-600">
                  {backups.length > 0 ? formatDate(backups[0].createdAt).split(' ')[0] : 'Aucune'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {backups.length > 0 ? 'Protégé' : 'Non protégé'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Créer une Sauvegarde
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer une Sauvegarde</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Ex: Sauvegarde avant mise à jour"
                      value={backupDescription}
                      onChange={(e) => setBackupDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                      Annuler
                    </Button>
                    <Button 
                      onClick={createBackup} 
                      disabled={creatingBackup || !backupDescription.trim()}
                    >
                      {creatingBackup ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Création...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Créer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={fetchBackups} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Sauvegardes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-muted-foreground">Chargement des sauvegardes...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">Aucune sauvegarde</p>
              <p className="text-sm text-muted-foreground">Créez votre première sauvegarde pour protéger vos données</p>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div key={backup.filename} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Database className="h-8 w-8 text-blue-500" />
                    <div>
                      <h3 className="font-medium">{backup.filename}</h3>
                      <p className="text-sm text-muted-foreground">
                        Créé le {formatDate(backup.createdAt)} • {formatFileSize(backup.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog open={isRestoreModalOpen && selectedBackup?.filename === backup.filename} 
                            onOpenChange={(open) => {
                              setIsRestoreModalOpen(open)
                              if (!open) setSelectedBackup(null)
                            }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedBackup(backup)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Restaurer
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Restaurer la Sauvegarde</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            <p className="text-sm text-yellow-800">
                              Attention : Cette action remplacera toutes les données actuelles par celles de la sauvegarde.
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Sauvegarde à restaurer : <strong>{backup.filename}</strong>
                          </p>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsRestoreModalOpen(false)}>
                              Annuler
                            </Button>
                            <Button 
                              variant="destructive" 
                              onClick={() => restoreBackup(backup)}
                              disabled={restoringBackup}
                            >
                              {restoringBackup ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Restauration...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Restaurer
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteBackup(backup)}
                      disabled={deletingBackup}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 