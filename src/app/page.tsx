'use client'

// FarmaSys - Sistema Integral de Farmacias
// Página principal: login + shell con navegación por módulos según rol
import { useEffect, useMemo, useState } from 'react'
import type { SessionUser } from '@/lib/pharmacy-types'
import { canAccess, MODULES_BY_ROLE } from '@/lib/pharmacy-types'
import { LoginView } from '@/components/pharmacy/login-view'
import { DashboardView } from '@/components/pharmacy/dashboard-view'
import { PosView } from '@/components/pharmacy/pos-view'
import { ProductsView } from '@/components/pharmacy/products-view'
import { InventoryView } from '@/components/pharmacy/inventory-view'
import { SalesView } from '@/components/pharmacy/sales-view'
import { PurchasesView } from '@/components/pharmacy/purchases-view'
import { SuppliersView } from '@/components/pharmacy/suppliers-view'
import { CustomersView } from '@/components/pharmacy/customers-view'
import { PrescriptionsView } from '@/components/pharmacy/prescriptions-view'
import { ReportsView } from '@/components/pharmacy/reports-view'
import { UsersView } from '@/components/pharmacy/users-view'
import { SettingsView } from '@/components/pharmacy/settings-view'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'
import {
  Cross, LayoutDashboard, ShoppingCart, Pill, Warehouse, ReceiptText,
  ClipboardList, Truck, Users, FileHeart, BarChart3, UserCog, Settings,
  LogOut, Menu, ChevronRight,
} from 'lucide-react'

const NAV = [
  { id: 'dashboard', label: 'Panel principal', icon: LayoutDashboard, group: 'General' },
  { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart, group: 'Operación' },
  { id: 'sales', label: 'Ventas y Facturación', icon: ReceiptText, group: 'Operación' },
  { id: 'prescriptions', label: 'Recetas Médicas', icon: FileHeart, group: 'Operación' },
  { id: 'products', label: 'Medicamentos', icon: Pill, group: 'Inventario' },
  { id: 'inventory', label: 'Inventario y Lotes', icon: Warehouse, group: 'Inventario' },
  { id: 'purchases', label: 'Compras', icon: ClipboardList, group: 'Inventario' },
  { id: 'suppliers', label: 'Proveedores', icon: Truck, group: 'Directorio' },
  { id: 'customers', label: 'Clientes', icon: Users, group: 'Directorio' },
  { id: 'reports', label: 'Reportes', icon: BarChart3, group: 'Administración' },
  { id: 'users', label: 'Usuarios y Roles', icon: UserCog, group: 'Administración' },
  { id: 'settings', label: 'Configuración', icon: Settings, group: 'Administración' },
] as const

const SESSION_KEY = 'farmasys_session'

export default function Home() {
  const { toast } = useToast()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)
  const [module, setModule] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [dashKey, setDashKey] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem(SESSION_KEY)
        if (raw) setUser(JSON.parse(raw))
      } catch { /* ignore */ }
      setReady(true)
    }, 0)
    return () => clearTimeout(t)
  }, [])

  function handleLogin(u: SessionUser) {
    setUser(u)
    localStorage.setItem(SESSION_KEY, JSON.stringify(u))
    setModule('dashboard')
    toast({ title: `Bienvenido, ${u.name}`, description: `Sesión iniciada como ${u.role}` })
  }

  function logout() {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
  }

  function go(m: string) {
    setModule(m)
    setMenuOpen(false)
    if (m === 'dashboard') setDashKey((k) => k + 1)
  }

  const visibleNav = useMemo(() => {
    if (!user) return []
    return NAV.filter((n) => canAccess(user.role, n.id))
  }, [user])

  const groups = useMemo(() => {
    const map: Record<string, typeof visibleNav[number][]> = {}
    for (const n of visibleNav) {
      if (!map[n.group]) map[n.group] = []
      map[n.group].push(n)
    }
    return map
  }, [visibleNav])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-950">
        <div className="flex items-center gap-3 text-white">
          <Cross className="h-8 w-8 animate-pulse" />
          <span className="text-lg font-semibold">FarmaSys</span>
        </div>
      </div>
    )
  }

  if (!user) return <LoginView onLogin={handleLogin} />

  const roleLabel = user.role === 'ADMIN' ? 'Administrador' : user.role === 'FARMACEUTICO' ? 'Farmacéutico' : 'Vendedor'

  const sidebar = (
    <div className="flex h-full flex-col bg-gradient-to-b from-emerald-950 to-teal-950 text-white">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <Cross className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="font-bold leading-tight">FarmaSys</p>
          <p className="text-[11px] text-emerald-300">Sistema de Farmacias</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <p className="px-3 pb-1.5 text-[10px] uppercase tracking-widest text-emerald-400/80 font-semibold">{group}</p>
            <div className="space-y-0.5">
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => go(n.id)}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    module === n.id
                      ? 'bg-emerald-500/20 text-white font-medium border border-emerald-400/30'
                      : 'text-emerald-100/80 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <n.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{n.label}</span>
                  {module === n.id && <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="rounded-lg bg-white/5 p-3 mb-2">
          <p className="text-sm font-medium truncate">{user.name}</p>
          <p className="text-xs text-emerald-300">{roleLabel}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        {/* Sidebar desktop */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
          {sidebar}
        </aside>

        {/* Contenido */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header móvil */}
          <header className="lg:hidden sticky top-0 z-40 bg-emerald-950 text-white flex items-center gap-3 px-4 py-3">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" aria-label="Abrir menú">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-0">
                <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                {sidebar}
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <Cross className="h-5 w-5 text-emerald-400" />
              <span className="font-bold">FarmaSys</span>
            </div>
            <span className="ml-auto text-xs text-emerald-300 truncate">{user.name}</span>
          </header>

          <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">
            {module === 'dashboard' && <DashboardView key={dashKey} userName={user.name} onNavigate={go} />}
            {module === 'pos' && <PosView user={user} onSaleDone={() => setDashKey((k) => k + 1)} />}
            {module === 'products' && <ProductsView canEdit={user.role === 'ADMIN' || user.role === 'FARMACEUTICO'} />}
            {module === 'inventory' && <InventoryView canEdit={user.role === 'ADMIN' || user.role === 'FARMACEUTICO'} />}
            {module === 'sales' && <SalesView canVoid={user.role === 'ADMIN'} />}
            {module === 'purchases' && <PurchasesView user={user} canEdit={user.role === 'ADMIN' || user.role === 'FARMACEUTICO'} />}
            {module === 'suppliers' && <SuppliersView canEdit={user.role === 'ADMIN' || user.role === 'FARMACEUTICO'} />}
            {module === 'customers' && <CustomersView />}
            {module === 'prescriptions' && <PrescriptionsView canEdit={user.role === 'ADMIN' || user.role === 'FARMACEUTICO'} />}
            {module === 'reports' && <ReportsView />}
            {module === 'users' && user.role === 'ADMIN' && <UsersView currentUserId={user.id} />}
            {module === 'settings' && user.role === 'ADMIN' && <SettingsView />}
          </main>

          <footer className="mt-auto border-t bg-white py-3 text-center text-xs text-muted-foreground">
            FarmaSys © 2026 — Sistema Integral de Farmacias · Sesión: {user.name} ({roleLabel}) · Módulos activos: {(MODULES_BY_ROLE[user.role] || []).length}
          </footer>
        </div>
      </div>
    </div>
  )
}
