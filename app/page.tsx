"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, TrendingUp, Users, DollarSign, AlertTriangle, ShoppingCart, Plus, CreditCard, Receipt } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function Dashboard() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    todaySales: 0,
    monthSales: 0,
    totalClients: 0,
    totalSuppliers: 0,
    cashBalance: 0,
    creditBalance: 0,
  })
  const [stockAlerts, setStockAlerts] = useState<Array<{
    name: string,
    stock: number,
    unit: string,
    type: 'low' | 'out'
  }>>([])
  const [recentSales, setRecentSales] = useState<Array<{
    id: string,
    clientName: string,
    amount: number,
    date: string
  }>>([])
  const [activeClients, setActiveClients] = useState<Array<{
    name: string,
    purchases: number,
    status: string
  }>>([])
  const [loading, setLoading] = useState(true)

  // Fetch real data from all APIs
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)

        const fetchJson = async (url: string) => {
          const r = await fetch(url)
          return r.ok ? r.json() : []
        }

        const [
          productsData,
          salesData,
          clientsData,
          suppliersData,
          purchasesData,
          creditsData,
        ] = await Promise.all([
          fetchJson("/api/products"),
          fetchJson("/api/sales"),
          fetchJson("/api/clients"),
          fetchJson("/api/suppliers"),
          fetchJson("/api/purchases"),
          fetchJson("/api/private-credits"),
        ])
        
        // Calculate today's sales
        const today = new Date()
        const todaySales = salesData.filter((sale: any) => {
          const saleDate = new Date(sale.created_at || sale.date_created || Date.now())
          return saleDate.toDateString() === today.toDateString()
        }).reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0)
        
        // Calculate month sales
        const thisMonth = today.getMonth()
        const thisYear = today.getFullYear()
        const monthSales = salesData.filter((sale: any) => {
          const saleDate = new Date(sale.created_at || sale.date_created || Date.now())
          return saleDate.getMonth() === thisMonth && saleDate.getFullYear() === thisYear
        }).reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0)
        
        // Calculate product metrics
        const totalProducts = productsData.length
        const lowStockProducts = productsData.filter((p: any) => (p.current_stock || 0) <= 10 && (p.current_stock || 0) > 0).length
        
        // Calculate financial metrics
        const totalRevenue = salesData.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0)
        const totalExpenses = purchasesData.reduce((sum: number, purchase: any) => sum + (purchase.total_amount || 0), 0)
        const cashBalance = totalRevenue - totalExpenses
        
        // Calculate credit balance
        const creditBalance = creditsData.reduce((sum: number, credit: any) => {
          if (credit.status === 'active') return sum + (credit.amount || 0)
          return sum
        }, 0)
        
        // Generate stock alerts
        const alerts = productsData
          .filter((p: any) => (p.current_stock || 0) <= 10)
          .map((p: any) => ({
            name: p.name || 'Produit',
            stock: p.current_stock || 0,
            unit: p.unit || 'unités',
            type: (p.current_stock || 0) === 0 ? 'out' : 'low'
          }))
          .slice(0, 5) // Show max 5 alerts
        
        // Get recent sales
        const recent = salesData
          .sort((a: any, b: any) => new Date(b.created_at || b.date_created || 0).getTime() - new Date(a.created_at || a.date_created || 0).getTime())
          .slice(0, 3)
          .map((sale: any) => ({
            id: `#${sale.id}`,
            clientName: sale.client_name || 'Client',
            amount: sale.total_amount || 0,
            date: new Date(sale.created_at || sale.date_created || Date.now()).toLocaleDateString('fr-FR')
          }))
        
        // Get active clients
        const active = clientsData
          .map((client: any) => {
            const clientSales = salesData.filter((sale: any) => 
              sale.client_id === client.id || sale.client_name === client.name
            )
            const thisMonthPurchases = clientSales.filter((sale: any) => {
              const saleDate = new Date(sale.created_at || sale.date_created || Date.now())
              return saleDate.getMonth() === thisMonth && saleDate.getFullYear() === thisYear
            }).length
            
            let status = 'Nouveau'
            if (thisMonthPurchases >= 3) status = 'Fidèle'
            else if (thisMonthPurchases >= 1) status = 'Régulier'
            
            return {
              name: client.name || 'Client',
              purchases: thisMonthPurchases,
              status
            }
          })
          .sort((a: any, b: any) => b.purchases - a.purchases)
          .slice(0, 3)
        
        // Update state with real data
        setStats({
          totalProducts,
          lowStockProducts,
          todaySales,
          monthSales,
          totalClients: clientsData.length,
          totalSuppliers: suppliersData.length,
          cashBalance,
          creditBalance
        })
        
        setStockAlerts(alerts)
        setRecentSales(recent)
        setActiveClients(active)
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    
        fetchDashboardData()
  }, [])

  const handleQuickAction = (action: string) => {
    setIsLoading(true)
    setTimeout(() => {
      switch (action) {
        case 'new-sale':
          router.push('/sales')
          break
        case 'new-purchase':
          router.push('/purchases')
          break
        case 'new-product':
          router.push('/products')
          break
        case 'manual-payment':
          router.push('/manual-payments')
          break
        default:
          break
      }
      setIsLoading(false)
    }, 500)
  }

  const handleViewDetails = (type: string) => {
    switch (type) {
      case 'products':
        router.push('/products')
        break
      case 'sales':
        router.push('/sales')
        break
      case 'clients':
        router.push('/clients')
        break
      case 'suppliers':
        router.push('/suppliers')
        break
      case 'broken-products':
        router.push('/broken-products')
        break
      default:
        break
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Tableau de Bord</h1>
        <p className="text-slate-600">Vue d&apos;ensemble de votre droguerie</p>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewDetails('products')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produits Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <>
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded mb-2"></div>
                <div className="animate-pulse bg-gray-200 h-3 w-20 rounded"></div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
                <p className="text-xs text-muted-foreground">{stats.lowStockProducts} en stock faible</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewDetails('sales')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes Aujourd&apos;hui</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <>
                <div className="animate-pulse bg-gray-200 h-8 w-20 rounded mb-2"></div>
                <div className="animate-pulse bg-gray-200 h-3 w-24 rounded"></div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.todaySales.toFixed(2)} DH</div>
                <p className="text-xs text-muted-foreground">Ce mois: {stats.monthSales.toFixed(2)} DH</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewDetails('clients')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">{stats.totalSuppliers} fournisseurs</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewDetails('cash-register')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Caisse</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cashBalance.toFixed(2)} DH</div>
            <p className="text-xs text-muted-foreground">Crédit: {stats.creditBalance.toFixed(2)} DH</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertes et actions rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alertes Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <>
                  <div className="animate-pulse bg-gray-100 h-16 rounded-lg"></div>
                  <div className="animate-pulse bg-gray-100 h-16 rounded-lg"></div>
                </>
              ) : stockAlerts.length > 0 ? (
                stockAlerts.map((alert, index) => (
                  <div key={index} className={`flex justify-between items-center p-3 rounded-lg ${
                    alert.type === 'out' ? 'bg-red-50' : 'bg-orange-50'
                  }`}>
                    <div>
                      <p className="font-medium">{alert.name}</p>
                      <p className="text-sm text-muted-foreground">Stock: {alert.stock} {alert.unit}</p>
                    </div>
                    <span className={`font-semibold ${
                      alert.type === 'out' ? 'text-red-600' : 'text-orange-600'
                    }`}>
                      {alert.type === 'out' ? 'Rupture' : 'Stock faible'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Aucune alerte de stock
                </div>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-3"
                onClick={() => handleViewDetails('broken-products')}
              >
                Voir tous les produits cassés
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
              Actions Rapides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                className="p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors h-auto flex-col items-start"
                variant="ghost"
                onClick={() => handleQuickAction('new-sale')}
                disabled={isLoading}
              >
                <div className="font-medium text-blue-900">Nouvelle Vente</div>
                <div className="text-sm text-blue-600">Enregistrer une vente</div>
              </Button>
              <Button 
                className="p-3 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors h-auto flex-col items-start"
                variant="ghost"
                onClick={() => handleQuickAction('new-purchase')}
                disabled={isLoading}
              >
                <div className="font-medium text-green-900">Nouvel Achat</div>
                <div className="text-sm text-green-600">Ajouter un achat</div>
              </Button>
              <Button 
                className="p-3 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors h-auto flex-col items-start"
                variant="ghost"
                onClick={() => handleQuickAction('new-product')}
                disabled={isLoading}
              >
                <div className="font-medium text-purple-900">Nouveau Produit</div>
                <div className="text-sm text-purple-600">Ajouter au stock</div>
              </Button>
              <Button 
                className="p-3 bg-orange-50 hover:bg-orange-100 rounded-lg text-left transition-colors h-auto flex-col items-start"
                variant="ghost"
                onClick={() => handleQuickAction('manual-payment')}
                disabled={isLoading}
              >
                <div className="font-medium text-orange-900">Paiement Manuel</div>
                <div className="text-sm text-orange-600">Enregistrer paiement</div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques et tendances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Ventes Récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <>
                  <div className="animate-pulse bg-gray-100 h-16 rounded-lg"></div>
                  <div className="animate-pulse bg-gray-100 h-16 rounded-lg"></div>
                </>
              ) : recentSales.length > 0 ? (
                recentSales.map((sale, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium">{sale.id}</p>
                      <p className="text-sm text-muted-foreground">{sale.clientName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{sale.amount.toFixed(2)} DH</p>
                      <p className="text-xs text-muted-foreground">{sale.date}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Aucune vente récente
                </div>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-3"
                onClick={() => handleViewDetails('sales')}
              >
                Voir toutes les ventes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Clients Actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <>
                  <div className="animate-pulse bg-gray-100 h-16 rounded-lg"></div>
                  <div className="animate-pulse bg-gray-100 h-16 rounded-lg"></div>
                </>
              ) : activeClients.length > 0 ? (
                activeClients.map((client, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">{client.purchases} achats ce mois</p>
                    </div>
                    <span className="text-blue-600 font-semibold">{client.status}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Aucun client actif
                </div>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-3"
                onClick={() => handleViewDetails('clients')}
              >
                Voir tous les clients
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
