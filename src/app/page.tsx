'use client'

// FarmaSys - Sistema Integral de Farmacias
// Página principal: login + shell con navegación por módulos según rol
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SessionUser } from '@/lib/pharmacy-types'
import { canAccess, MODULES_BY_ROLE, ETIQUETA_ROL, MODULO_INICIAL, puedeEditarInventario } from '@/lib/permisos'
import { api_logout, api_changePassword, api_licencia, api_setupEstado, api_me, ApiError } from '@/lib/pharmacy-client'
import type { ResumenLicencia } from '@/lib/licencia-types'
import { LoginView } from '@/components/pharmacy/login-view'
import { LicenciaView } from '@/components/pharmacy/licencia-view'
import { SetupView } from '@/components/pharmacy/setup-view'
import { DashboardView } from '@/components/pharmacy/dashboard-view'
import { PosView } from '@/components/pharmacy/pos-view'
import { CashView } from '@/components/pharmacy/cash-view'
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
import { AlertsView } from '@/components/pharmacy/alerts-view'
import { MovementsView } from '@/components/pharmacy/movements-view'
import { ControlledView } from '@/components/pharmacy/controlled-view'
import { QuotationsView } from '@/components/pharmacy/quotations-view'
import { PromotionsView } from '@/components/pharmacy/promotions-view'
import { ReturnsView } from '@/components/pharmacy/returns-view'
import { CategoriesView } from '@/components/pharmacy/categories-view'
import { InteractionsView } from '@/components/pharmacy/interactions-view'
import { CountsView } from '@/components/pharmacy/counts-view'
import { SuggestionsView } from '@/components/pharmacy/suggestions-view'
import { AuditView } from '@/components/pharmacy/audit-view'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Cross, LayoutDashboard, ShoppingCart, Pill, Warehouse, ReceiptText,
  ClipboardList, Truck, Users, FileHeart, BarChart3, UserCog, Settings,
  LogOut, Menu, ChevronRight, Wallet, BellRing, ArrowLeftRight, ShieldAlert,
  FileText, Undo2, Percent, Tags, FlaskConical, ClipboardCheck, Lightbulb, History, KeyRound, BadgeCheck,
} from 'lucide-react'

const NAV = [
  { id: 'dashboard', label: 'Panel principal', icon: LayoutDashboard, group: 'General' },
  { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart, group: 'Operación' },
  { id: 'cash', label: 'Caja y Arqueo', icon: Wallet, group: 'Operación' },
  { id: 'sales', label: 'Ventas y Facturación', icon: ReceiptText, group: 'Operación' },
  { id: 'quotations', label: 'Cotizaciones', icon: FileText, group: 'Operación' },
  { id: 'returns', label: 'Devoluciones', icon: Undo2, group: 'Operación' },
  { id: 'prescriptions', label: 'Recetas Médicas', icon: FileHeart, group: 'Operación' },
  { id: 'interactions', label: 'Interacciones', icon: FlaskConical, group: 'Clínica' },
  { id: 'controlled', label: 'Medicamentos Controlados', icon: ShieldAlert, group: 'Clínica' },
  { id: 'products', label: 'Medicamentos', icon: Pill, group: 'Inventario' },
  { id: 'categories', label: 'Categorías', icon: Tags, group: 'Inventario' },
  { id: 'promotions', label: 'Promociones', icon: Percent, group: 'Inventario' },
  { id: 'inventory', label: 'Inventario y Lotes', icon: Warehouse, group: 'Inventario' },
  { id: 'counts', label: 'Conteo Físico', icon: ClipboardCheck, group: 'Inventario' },
  { id: 'movements', label: 'Kardex de Movimientos', icon: ArrowLeftRight, group: 'Inventario' },
  { id: 'alerts', label: 'Centro de Alertas', icon: BellRing, group: 'Inventario' },
  { id: 'purchases', label: 'Compras', icon: ClipboardList, group: 'Inventario' },
  { id: 'suggestions', label: 'Sugerencias de Compra', icon: Lightbulb, group: 'Inventario' },
  { id: 'suppliers', label: 'Proveedores', icon: Truck, group: 'Directorio' },
  { id: 'customers', label: 'Clientes', icon: Users, group: 'Directorio' },
  { id: 'reports', label: 'Reportes', icon: BarChart3, group: 'Administración' },
  { id: 'audit', label: 'Bitácora de Auditoría', icon: History, group: 'Administración' },
  { id: 'users', label: 'Usuarios y Roles', icon: UserCog, group: 'Administración' },
  { id: 'settings', label: 'Configuración', icon: Settings, group: 'Administración' },
  { id: 'licencia', label: 'Licencia', icon: BadgeCheck, group: 'Administración' },
] as const

type Arranque = 'cargando' | 'licencia' | 'instalacion' | 'listo'

export default function Home() {
  const { toast } = useToast()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [arranque, setArranque] = useState<Arranque>('cargando')
  const [licencia, setLicencia] = useState<ResumenLicencia | null>(null)
  const [module, setModule] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [dashKey, setDashKey] = useState(0)
  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)

  // Arranque: 1) licencia CONTROL válida → 2) instalación con administrador → 3) sesión (cookie firmada)
  const arrancar = useCallback(async () => {
    try {
      const lic = await api_licencia()
      setLicencia(lic)
      if (!lic.valido) { setArranque('licencia'); return }
      const setup = await api_setupEstado()
      if (setup.requiereConfiguracion) { setArranque('instalacion'); return }
      const u = await api_me().catch(() => null)
      if (u) { setUser(u); setModule((m) => (canAccess(u.role, m) ? m : MODULO_INICIAL[u.role])) }
      setArranque('listo')
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) { setArranque('licencia'); return }
      toast({ title: 'No se pudo conectar con el servidor', description: e instanceof Error ? e.message : '', variant: 'destructive' })
      setArranque('listo')
    }
  }, [toast])

  useEffect(() => { arrancar() }, [arrancar])

  // Cualquier llamada a la API que devuelva 402 (licencia) o 401 (sesión) reinicia el flujo
  useEffect(() => {
    const onBloqueo = (ev: Event) => {
      const err = (ev as CustomEvent<ApiError>).detail
      if (err.status === 402) { setUser(null); setArranque('licencia'); api_licencia().then(setLicencia).catch(() => {}) }
      else if (err.status === 401) setUser(null)
    }
    window.addEventListener('farmasys:bloqueo', onBloqueo)
    return () => window.removeEventListener('farmasys:bloqueo', onBloqueo)
  }, [])

  // PWA: el service worker permite instalar la web como app en Android, Windows y escritorio
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  function handleLogin(u: SessionUser) {
    setUser(u)
    setModule(MODULO_INICIAL[u.role])
    toast({ title: `Bienvenido, ${u.name}`, description: `Sesión iniciada como ${ETIQUETA_ROL[u.role]}` })
  }

  async function logout() {
    await api_logout()
    setUser(null)
  }

  function go(m: string) {
    setModule(m)
    setMenuOpen(false)
    if (m === 'dashboard') setDashKey((k) => k + 1)
  }

  async function changePassword() {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      toast({ title: 'Complete todos los campos', variant: 'destructive' }); return
    }
    if (pwForm.next !== pwForm.confirm) {
      toast({ title: 'Las contraseñas no coinciden', variant: 'destructive' }); return
    }
    setPwSaving(true)
    try {
      await api_changePassword(user!.username, pwForm.current, pwForm.next)
      toast({ title: 'Contraseña actualizada', description: 'Úsela la próxima vez que inicie sesión' })
      setPwOpen(false)
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'No se pudo cambiar la contraseña', variant: 'destructive' })
    } finally {
      setPwSaving(false)
    }
  }

  const visibleNav = useMemo(() => {
    if (!user) return []
    return NAV.filter((n) => canAccess(user.role, n.id))
  }, [user])

  const moduloActual = user && !canAccess(user.role, module) ? MODULO_INICIAL[user.role] : module

  const groups = useMemo(() => {
    const map: Record<string, typeof visibleNav[number][]> = {}
    for (const n of visibleNav) {
      if (!map[n.group]) map[n.group] = []
      map[n.group].push(n)
    }
    return map
  }, [visibleNav])

  if (arranque === 'cargando') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-950">
        <div className="flex items-center gap-3 text-white">
          <Cross className="h-8 w-8 animate-pulse" />
          <span className="text-lg font-semibold">FarmaSys</span>
        </div>
      </div>
    )
  }

  if (arranque === 'licencia') return <LicenciaView inicial={licencia} bloqueante onValida={() => { setArranque('cargando'); arrancar() }} />
  if (arranque === 'instalacion') return <SetupView onListo={(u) => { setArranque('listo'); handleLogin(u) }} />
  if (!user) return <LoginView onLogin={handleLogin} />

  const roleLabel = ETIQUETA_ROL[user.role]
  const editaInventario = puedeEditarInventario(user.role)

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
                    moduloActual === n.id
                      ? 'bg-emerald-500/20 text-white font-medium border border-emerald-400/30'
                      : 'text-emerald-100/80 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <n.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{n.label}</span>
                  {moduloActual === n.id && <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0" />}
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
          onClick={() => setPwOpen(true)}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-emerald-100/90 hover:bg-white/5 hover:text-white transition-colors"
        >
          <KeyRound className="h-4 w-4" /> Cambiar contraseña
        </button>
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
            {moduloActual === 'dashboard' && <DashboardView key={dashKey} userName={user.name} onNavigate={go} />}
            {moduloActual === 'pos' && <PosView user={user} onSaleDone={() => setDashKey((k) => k + 1)} />}
            {moduloActual === 'cash' && <CashView user={user} />}
            {moduloActual === 'products' && <ProductsView canEdit={editaInventario} />}
            {moduloActual === 'inventory' && <InventoryView canEdit={editaInventario} />}
            {moduloActual === 'sales' && <SalesView user={user} canVoid={user.role === 'ADMIN'} />}
            {moduloActual === 'purchases' && <PurchasesView user={user} canEdit={editaInventario} />}
            {moduloActual === 'suggestions' && <SuggestionsView user={user} onCreated={() => setDashKey((k) => k + 1)} />}
            {moduloActual === 'suppliers' && <SuppliersView canEdit={editaInventario} />}
            {moduloActual === 'customers' && <CustomersView />}
            {moduloActual === 'prescriptions' && <PrescriptionsView canEdit={editaInventario} userName={user.name} />}
            {moduloActual === 'interactions' && <InteractionsView user={user} />}
            {moduloActual === 'counts' && <CountsView user={user} />}
            {moduloActual === 'reports' && <ReportsView />}
            {moduloActual === 'users' && user.role === 'ADMIN' && <UsersView currentUserId={user.id} />}
            {moduloActual === 'settings' && user.role === 'ADMIN' && <SettingsView />}
            {moduloActual === 'alerts' && <AlertsView onNavigate={go} />}
            {moduloActual === 'movements' && <MovementsView user={user} />}
            {moduloActual === 'controlled' && user.role !== 'CAJERO' && <ControlledView user={user} />}
            {moduloActual === 'quotations' && <QuotationsView user={user} />}
            {moduloActual === 'promotions' && <PromotionsView />}
            {moduloActual === 'returns' && <ReturnsView user={user} canEdit={true} />}
            {moduloActual === 'categories' && <CategoriesView canEdit={editaInventario} />}
            {moduloActual === 'audit' && user.role === 'ADMIN' && <AuditView />}
            {moduloActual === 'licencia' && user.role === 'ADMIN' && <LicenciaView />}
          </main>

          <footer className="mt-auto border-t bg-white py-3 text-center text-xs text-muted-foreground">
            FarmaSys — Sistema Integral de Farmacias · Sesión: {user.name} ({roleLabel}) · Módulos: {MODULES_BY_ROLE[user.role].length}
          </footer>
        </div>
      </div>

      {/* Cambiar contraseña propia */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-emerald-600" /> Cambiar mi contraseña</DialogTitle>
            <DialogDescription>Sesión de {user.name} (@{user.username})</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Contraseña actual</Label>
              <Input type="password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Nueva contraseña</Label>
              <Input type="password" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} />
              <p className="text-[11px] text-muted-foreground">Mínimo 6 caracteres</p>
            </div>
            <div className="space-y-1">
              <Label>Confirmar nueva contraseña</Label>
              <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>Cancelar</Button>
            <Button onClick={changePassword} disabled={pwSaving} className="bg-emerald-600 hover:bg-emerald-700">{pwSaving ? 'Guardando...' : 'Actualizar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
