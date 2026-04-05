"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Truck,
  CreditCard,
  DollarSign,
  UserCheck,
  Receipt,
  AlertTriangle,
  UserX,
  BarChart3,
  Home,
  Database,
} from "lucide-react"

const menuItems = [
  { href: "/", label: "Tableau de bord", icon: Home },
  { href: "/products", label: "Stock", icon: Package },
  { href: "/purchases", label: "Achats", icon: ShoppingCart },
  { href: "/sales", label: "Ventes", icon: TrendingUp },
  { href: "/suppliers", label: "Fournisseurs", icon: Truck },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/cash-register", label: "Caisse", icon: DollarSign },
  { href: "/manual-payments", label: "Paiements manuels", icon: CreditCard },
  { href: "/employees", label: "Personnel", icon: UserCheck },
  { href: "/expenses", label: "Charges", icon: Receipt },
  { href: "/broken-products", label: "Produits cassés", icon: AlertTriangle },
  { href: "/private-credits", label: "Crédits privés", icon: UserX },
  { href: "/reports", label: "Rapports", icon: BarChart3 },
  { href: "/backup", label: "Sauvegarde", icon: Database },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-center">Gestion Droguerie</h1>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                pathname === item.href
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
