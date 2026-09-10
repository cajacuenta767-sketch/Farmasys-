'use client'

// Centro de Alertas: stock bajo, caducidades críticas y pendientes operativos
import { useEffect, useState } from 'react'
import { api_alerts, fmtDateTime } from '@/lib/pharmacy-client'
import type { AlertsData, AlertItem } from '@/lib/pharmacy-types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BellRing, AlertTriangle, XCircle, Info, PackageX, CalendarClock, ShoppingCart, FileText, Wallet } from 'lucide-react'

function severityIcon(severity: string) {
  if (severity === 'CRITICA') return <XCircle className="h-4 w-4 text-red-500 shrink-0" />
  if (severity === 'ADVERTENCIA') return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
  return <Info className="h-4 w-4 text-sky-500 shrink-0" />
}

function severityBadge(severity: string) {
  if (severity === 'CRITICA') return <Badge className="bg-red-100 text-red-700 border-0">Crítica</Badge>
  if (severity === 'ADVERTENCIA') return <Badge className="bg-amber-100 text-amber-700 border-0">Advertencia</Badge>
  return <Badge className="bg-sky-100 text-sky-700 border-0">Informativa</Badge>
}

export function AlertsView({ onNavigate }: { onNavigate: (m: string) => void }) {
  const [data, setData] = useState<AlertsData | null>(null)
  const [filter, setFilter] = useState<'TODAS' | 'STOCK' | 'CADUCIDAD'>('TODAS')

  useEffect(() => {
    let cancelled = false
    api_alerts().then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    )
  }

  const list = data.alerts.filter((a: AlertItem) => filter === 'TODAS' || a.type === filter)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Centro de Alertas</h1>
        <p className="text-muted-foreground text-sm">{data.total} alertas activas — {data.critical} críticas, {data.warning} advertencias</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className={data.critical > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center"><XCircle className="h-5 w-5 text-red-600" /></div>
            <div><p className="text-xl font-bold text-red-700">{data.critical}</p><p className="text-xs text-muted-foreground">Alertas críticas</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-xl font-bold text-amber-700">{data.warning}</p><p className="text-xs text-muted-foreground">Advertencias</p></div>
          </CardContent>
        </Card>
        <button className="text-left" onClick={() => onNavigate('purchases')}>
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center"><ShoppingCart className="h-5 w-5 text-teal-600" /></div>
              <div><p className="text-xl font-bold">{data.pendingPurchases}</p><p className="text-xs text-muted-foreground">Compras pendientes</p></div>
            </CardContent>
          </Card>
        </button>
        <button className="text-left" onClick={() => onNavigate('quotations')}>
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center"><FileText className="h-5 w-5 text-violet-600" /></div>
              <div><p className="text-xl font-bold">{data.openQuotations}</p><p className="text-xs text-muted-foreground">Cotizaciones pendientes</p></div>
            </CardContent>
          </Card>
        </button>
      </div>

      {data.openCash && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-3 flex items-center gap-2 text-sm text-emerald-800">
            <Wallet className="h-4 w-4" />
            Caja abierta desde {fmtDateTime(data.openCash.openedAt)} por {data.openCash.user}. Recuerde cerrarla al final del turno.
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        {(['TODAS', 'STOCK', 'CADUCIDAD'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
              filter === f ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-muted-foreground hover:border-emerald-400'
            }`}
          >
            {f === 'TODAS' ? 'Todas' : f === 'STOCK' ? 'Stock bajo' : 'Caducidad'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {list.map((a, idx) => (
          <Card key={`${a.type}-${a.id}-${idx}`} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-3 flex items-start gap-3">
              {severityIcon(a.severity)}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm truncate">{a.name}</span>
                  <span className="text-[10px] text-muted-foreground">{a.code}</span>
                  {severityBadge(a.severity)}
                  <Badge variant="outline" className="text-[10px]">
                    {a.type === 'STOCK' ? <><PackageX className="h-3 w-3 mr-1 inline" />Stock</> : <><CalendarClock className="h-3 w-3 mr-1 inline" />Caducidad</>}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{a.message}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && (
          <Card><CardContent className="py-10 text-center text-muted-foreground">
            <BellRing className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Sin alertas en esta categoría</p>
            <p className="text-sm">Todo el inventario está en buen estado.</p>
          </CardContent></Card>
        )}
      </div>
    </div>
  )
}
