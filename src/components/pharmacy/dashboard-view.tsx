'use client'

// Dashboard del Sistema de Farmacias
import { useEffect, useState } from 'react'
import { api_dashboard, fmtMoney, fmtDate, api_dashboard as refresh } from '@/lib/pharmacy-client'
import type { DashboardData } from '@/lib/pharmacy-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DollarSign, ShoppingCart, Package, AlertTriangle, CalendarClock,
  TrendingUp, TrendingDown, ClipboardList, PackageCheck, Clock,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#059669', '#0d9488', '#65a30d', '#d97706', '#dc2626', '#7c3aed']

export function DashboardView({ userName, onNavigate }: { userName: string; onNavigate?: (m: string) => void }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      setData(await refresh())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }
  if (!data) return <p className="text-muted-foreground">No se pudo cargar el panel.</p>

  // Comparación con ayer
  const ytd = data.yesterdayTotal ?? 0
  const diffPct = ytd > 0 ? Math.round(((data.todayTotal - ytd) / ytd) * 100) : null
  const bestHours = (data.byHour || []).slice().sort((a, b) => b.total - a.total).slice(0, 3)

  const kpis = [
    {
      title: 'Ventas de hoy', value: fmtMoney(data.todayTotal),
      sub: diffPct !== null
        ? `${data.todayCount} transacciones · ${diffPct >= 0 ? '+' : ''}${diffPct}% vs ayer`
        : `${data.todayCount} transacciones`,
      icon: DollarSign, color: 'text-emerald-600 bg-emerald-100',
    },
    { title: 'Ventas del mes', value: fmtMoney(data.monthTotal), sub: 'Acumulado del mes', icon: TrendingUp, color: 'text-teal-600 bg-teal-100' },
    { title: 'Stock bajo', value: String(data.lowStockCount), sub: 'Productos por reabastecer', icon: AlertTriangle, color: 'text-amber-600 bg-amber-100' },
    { title: 'Por vencer (90 días)', value: String(data.expiringCount), sub: 'Lotes con inventario', icon: CalendarClock, color: 'text-red-600 bg-red-100' },
  ]

  const paymentColors: Record<string, string> = {
    EFECTIVO: '#059669', TARJETA: '#0d9488', TRANSFERENCIA: '#65a30d', QR: '#d97706',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">¡Hola, {userName.split(' ')[0]}! 👋</h1>
        <p className="text-muted-foreground">Este es el resumen de su farmacia hoy, {fmtDate(new Date())}</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${k.color}`}>
                <k.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">{k.title}</p>
                <p className="text-xl font-bold truncate">{k.value}</p>
                <p className={`text-xs truncate ${k.title === 'Ventas de hoy' && diffPct !== null ? (diffPct >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium') : 'text-muted-foreground'}`}>{k.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficas */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Ventas últimos 7 días</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.last7}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [fmtMoney(Number(v)), 'Ventas']} />
                <Bar dataKey="total" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-emerald-600" /> Top productos (30 días)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center pt-16">Sin ventas registradas aún</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.topProducts} dataKey="qty" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {data.topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} uds`, n]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Horas pico */}
      {(data.byHour || []).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-600" /> Ventas por hora (últimos 7 días)</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {diffPct !== null && (
                  <Badge variant="outline" className={diffPct >= 0 ? 'text-emerald-700 border-emerald-300' : 'text-red-600 border-red-300'}>
                    {diffPct >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {diffPct >= 0 ? '+' : ''}{diffPct}% vs ayer ({fmtMoney(ytd)})
                  </Badge>
                )}
                <span>Hora pico: <b className="text-foreground">{bestHours[0]?.hour}</b> ({fmtMoney(bestHours[0]?.total || 0)})</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byHour}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [fmtMoney(Number(v)), 'Ventas']} />
                <Bar dataKey="total" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Alertas y listas */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Stock bajo</CardTitle>
            <CardDescription>Productos en o bajo el mínimo</CardDescription>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto space-y-2">
            {data.lowStock.length === 0 ? <p className="text-sm text-muted-foreground">Todo el inventario está saludable ✓</p> : data.lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.code} · {p.category || 'Sin categoría'}</p>
                </div>
                <Badge variant={p.stock === 0 ? 'destructive' : 'secondary'} className="shrink-0 ml-2">
                  {p.stock}/{p.minStock}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><CalendarClock className="h-4 w-4 text-red-500" /> Próximos a vencer</CardTitle>
            <CardDescription>Lotes con stock en los próximos 90 días</CardDescription>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto space-y-2">
            {data.expiring.length === 0 ? <p className="text-sm text-muted-foreground">Sin lotes próximos a vencer ✓</p> : data.expiring.map((l) => {
              const days = Math.ceil((new Date(l.expiryDate).getTime() - Date.now()) / 86400000)
              return (
                <div key={l.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{l.productName}</p>
                    <p className="text-xs text-muted-foreground">Lote {l.lotNumber} · {l.quantity} uds</p>
                  </div>
                  <Badge variant={days < 30 ? 'destructive' : 'outline'} className={`shrink-0 ml-2 ${days >= 30 ? 'text-amber-600 border-amber-300' : ''}`}>
                    {days < 0 ? 'VENCIDO' : `${days} días`}
                  </Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-emerald-600" /> Últimas ventas</CardTitle>
            <CardDescription>{data.pendingPurchases > 0 ? `${data.pendingPurchases} compras pendientes por recibir` : 'Sin compras pendientes'}</CardDescription>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto space-y-2">
            {data.recentSales.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{s.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.customer} · {s.seller}</p>
                </div>
                <span className="text-sm font-semibold text-emerald-700 shrink-0 ml-2">{fmtMoney(s.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Accesos rápidos */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => onNavigate?.('pos')} className="bg-emerald-600 hover:bg-emerald-700"><ShoppingCart className="h-4 w-4 mr-2" /> Nueva venta</Button>
        <Button variant="outline" onClick={() => onNavigate?.('purchases')}><PackageCheck className="h-4 w-4 mr-2" /> Compras</Button>
        <Button variant="outline" onClick={() => onNavigate?.('inventory')}><Package className="h-4 w-4 mr-2" /> Inventario</Button>
        <Button variant="ghost" onClick={load}>Actualizar datos</Button>
      </div>
    </div>
  )
}
