'use client'

// Reportes del Sistema de Farmacias
import { useCallback, useEffect, useState } from 'react'
import { api_report, fmtMoney, fmtDate } from '@/lib/pharmacy-client'
import type { ReportData } from '@/lib/pharmacy-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, Award, Package, CalendarClock, FileDown } from 'lucide-react'

const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }
const today = () => new Date().toISOString().slice(0, 10)

export function ReportsView() {
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(today())
  const [salesRep, setSalesRep] = useState<ReportData | null>(null)
  const [topRep, setTopRep] = useState<ReportData | null>(null)
  const [lowRep, setLowRep] = useState<ReportData | null>(null)
  const [expRep, setExpRep] = useState<ReportData | null>(null)
  const [tab, setTab] = useState('ventas')

  const load = useCallback(async (f: string, t: string) => {
    const [s, tp, low, exp] = await Promise.all([
      api_report('ventas', f, t),
      api_report('top-productos', f, t),
      api_report('stock-bajo'),
      api_report('vencimientos'),
    ])
    setSalesRep(s)
    setTopRep(tp)
    setLowRep(low)
    setExpRep(exp)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { load(from, to).catch(() => {}) }, 0)
    return () => clearTimeout(t)
  }, [load, from, to])

  function exportTable(id: string, filename: string) {
    const table = document.getElementById(id)
    if (!table) return
    const rows = Array.from(table.querySelectorAll('tr')).map((tr) =>
      Array.from(tr.querySelectorAll('th,td')).map((c) => `"${(c.textContent || '').replace(/"/g, '""')}"`).join(',')
    )
    const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground text-sm">Análisis del negocio en tiempo real</p>
        </div>
        <div className="flex gap-2 items-center">
          <Input type="date" className="w-36" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-muted-foreground text-sm">a</span>
          <Input type="date" className="w-36" value={to} onChange={(e) => setTo(e.target.value)} />
          <Button variant="outline" onClick={() => load(from, to)}>Actualizar</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="top">Top productos</TabsTrigger>
          <TabsTrigger value="stock">Stock bajo</TabsTrigger>
          <TabsTrigger value="vencimientos">Vencimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="ventas" className="space-y-4 mt-4">
          {salesRep?.summary && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total facturado</p><p className="text-xl font-bold text-emerald-700">{fmtMoney(salesRep.summary.total)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">N° de facturas</p><p className="text-xl font-bold">{salesRep.summary.count}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">IVA cobrado</p><p className="text-xl font-bold">{fmtMoney(salesRep.summary.tax)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Descuentos</p><p className="text-xl font-bold text-red-600">{fmtMoney(salesRep.summary.discount)}</p></CardContent></Card>
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Ventas por día</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesRep.byDay || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [fmtMoney(Number(v)), 'Ventas']} />
                      <Bar dataKey="total" fill="#059669" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Por método de pago</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Método</TableHead><TableHead className="text-center">Facturas</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(salesRep.byPayment || []).map((p) => (
                          <TableRow key={p.method}>
                            <TableCell className="font-medium">{p.method}</TableCell>
                            <TableCell className="text-center">{p.count}</TableCell>
                            <TableCell className="text-right font-semibold">{fmtMoney(p.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Por vendedor</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Vendedor</TableHead><TableHead className="text-center">Facturas</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(salesRep.bySeller || []).map((s) => (
                          <TableRow key={s.seller}>
                            <TableCell className="font-medium">{s.seller}</TableCell>
                            <TableCell className="text-center">{s.count}</TableCell>
                            <TableCell className="text-right font-semibold">{fmtMoney(s.total)}</TableCell>
                          </TableRow>
                        ))}
                        {(salesRep.bySeller || []).length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sin datos</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="top" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <div><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4 text-emerald-600" /> Productos más vendidos</CardTitle>
              <CardDescription>Del {fmtDate(from)} al {fmtDate(to)}</CardDescription></div>
              <Button variant="outline" size="sm" onClick={() => exportTable('tbl-top', 'top-productos.csv')}><FileDown className="h-4 w-4 mr-1" /> CSV</Button>
            </CardHeader>
            <CardContent>
              <div id="tbl-top" className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Producto</TableHead><TableHead className="text-center">Unidades</TableHead><TableHead className="text-right">Ingresos</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(topRep?.top || []).map((p, i) => (
                      <TableRow key={p.name}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium text-sm">{p.name}</TableCell>
                        <TableCell className="text-center"><Badge variant="secondary">{p.qty}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">{fmtMoney(p.revenue)}</TableCell>
                      </TableRow>
                    ))}
                    {(topRep?.top || []).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin datos en este período</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <div><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-amber-600" /> Productos con stock bajo</CardTitle>
              <CardDescription>Productos en o bajo su nivel mínimo — requiere reabastecimiento</CardDescription></div>
              <Button variant="outline" size="sm" onClick={() => exportTable('tbl-low', 'stock-bajo.csv')}><FileDown className="h-4 w-4 mr-1" /> CSV</Button>
            </CardHeader>
            <CardContent>
              <div id="tbl-low" className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Producto</TableHead><TableHead className="hidden md:table-cell">Categoría</TableHead><TableHead className="hidden lg:table-cell">Proveedor</TableHead><TableHead className="text-center">Stock</TableHead><TableHead className="text-center">Mínimo</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(lowRep?.low || []).map((p) => (
                      <TableRow key={p.code}>
                        <TableCell className="font-mono text-xs">{p.code}</TableCell>
                        <TableCell className="font-medium text-sm">{p.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{p.category}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{p.supplier || '-'}</TableCell>
                        <TableCell className="text-center"><Badge variant={p.stock === 0 ? 'destructive' : 'secondary'}>{p.stock}</Badge></TableCell>
                        <TableCell className="text-center">{p.minStock}</TableCell>
                      </TableRow>
                    ))}
                    {(lowRep?.low || []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Todo el stock está saludable ✓</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencimientos" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <div><CardTitle className="text-base flex items-center gap-2"><CalendarClock className="h-4 w-4 text-red-500" /> Control de vencimientos</CardTitle>
              <CardDescription>Lotes con stock que vencen en los próximos 12 meses</CardDescription></div>
              <Button variant="outline" size="sm" onClick={() => exportTable('tbl-exp', 'vencimientos.csv')}><FileDown className="h-4 w-4 mr-1" /> CSV</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {expRep && expRep.expiredCount! > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  ⚠️ Hay <b>{expRep.expiredCount}</b> lotes vencidos con inventario. Pérdida estimada: <b>{fmtMoney(expRep.expiredValue || 0)}</b>. Retírelos del inventario.
                </div>
              )}
              <div id="tbl-exp" className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Producto</TableHead><TableHead>Lote</TableHead><TableHead>Vence</TableHead><TableHead className="text-center">Stock</TableHead><TableHead className="text-right">Valor en riesgo</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(expRep?.rows || []).map((r) => (
                      <TableRow key={`${r.code}-${r.lotNumber}`} className={r.daysLeft < 0 ? 'bg-red-50/50' : r.daysLeft <= 30 ? 'bg-amber-50/50' : ''}>
                        <TableCell className="font-mono text-xs">{r.code}</TableCell>
                        <TableCell className="font-medium text-sm">{r.productName}</TableCell>
                        <TableCell className="font-mono text-xs">{r.lotNumber}</TableCell>
                        <TableCell className="text-sm">
                          {fmtDate(r.expiryDate)}{' '}
                          <Badge variant={r.daysLeft < 0 ? 'destructive' : r.daysLeft <= 30 ? 'destructive' : 'outline'} className={r.daysLeft >= 30 ? 'text-amber-600 border-amber-300' : ''}>
                            {r.daysLeft < 0 ? 'VENCIDO' : `${r.daysLeft}d`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{r.quantity}</TableCell>
                        <TableCell className="text-right">{fmtMoney(r.value)}</TableCell>
                      </TableRow>
                    ))}
                    {(expRep?.rows || []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin lotes próximos a vencer ✓</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
