'use client'

// Sugerencias Automáticas de Compra — análisis de stock mínimo y velocidad de venta
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api_suggestions, api_createPurchase, fmtMoney } from '@/lib/pharmacy-client'
import type { PurchaseSuggestion, SessionUser } from '@/lib/pharmacy-types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Lightbulb, RefreshCcw, ShoppingCart, TrendingDown, Zap, CircleAlert, Info } from 'lucide-react'

const URGENCY: Record<string, { label: string; cls: string; icon: typeof Zap }> = {
  AGOTADO: { label: 'Agotado', cls: 'bg-red-600 text-white hover:bg-red-600', icon: Zap },
  CRITICA: { label: 'Crítica', cls: 'bg-red-100 text-red-700 hover:bg-red-100', icon: CircleAlert },
  ALTA: { label: 'Alta', cls: 'bg-amber-100 text-amber-700 hover:bg-amber-100', icon: CircleAlert },
  MEDIA: { label: 'Media', cls: 'bg-sky-100 text-sky-700 hover:bg-sky-100', icon: TrendingDown },
  BAJA: { label: 'Baja', cls: 'bg-slate-100 text-slate-600 hover:bg-slate-100', icon: Info },
}

export function SuggestionsView({ user, onCreated }: { user: SessionUser; onCreated?: () => void }) {
  const { toast } = useToast()
  const [data, setData] = useState<{ suggestions: PurchaseSuggestion[]; totalEstimated: number; generatedAt: string } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmOrder, setConfirmOrder] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api_suggestions()
      setData(d)
      setSelected(new Set())
    } catch {
      toast({ title: 'Error calculando sugerencias', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])
  useEffect(() => { load().catch(() => {}) }, [load])

  const bySupplier = useMemo(() => {
    const map: Record<string, PurchaseSuggestion[]> = {}
    for (const s of data?.suggestions || []) {
      const k = s.supplierName
      if (!map[k]) map[k] = []
      map[k].push(s)
    }
    return map
  }, [data])

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const selectedItems = (data?.suggestions || []).filter((s) => selected.has(s.productId))
  const selectedCost = selectedItems.reduce((s, x) => s + x.estimatedCost, 0)
  const suppliersOfSelected = [...new Set(selectedItems.map((s) => s.supplierName))]

  async function generateOrders() {
    setCreating(true)
    try {
      // Agrupar seleccionados por proveedor y crear una orden por cada uno
      const groups: Record<string, PurchaseSuggestion[]> = {}
      for (const s of selectedItems) {
        const k = s.supplierId || 'sin-proveedor'
        if (!groups[k]) groups[k] = []
        groups[k].push(s)
      }
      let created = 0
      for (const [supplierId, items] of Object.entries(groups)) {
        if (supplierId === 'sin-proveedor') continue
        await api_createPurchase({
          supplierId,
          userId: user.id,
          notes: `Generada desde Sugerencias de Compra (${items.length} productos)`,
          items: items.map((i) => ({ productId: i.productId, quantity: i.suggested, unitCost: i.unitCost })),
        })
        created++
      }
      if (created > 0) {
        toast({ title: `${created} orden(es) de compra creada(s)`, description: 'Revíselas en el módulo Compras y recíbalas al llegar la mercancía' })
        onCreated?.()
      } else {
        toast({ title: 'Productos sin proveedor', description: 'Asigne un proveedor a los productos seleccionados para generar órdenes', variant: 'destructive' })
      }
      setConfirmOrder(false)
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error generando órdenes', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <p className="text-muted-foreground py-10 text-center">Calculando sugerencias...</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Lightbulb className="h-6 w-6 text-amber-500" /> Sugerencias de Compra</h1>
          <p className="text-muted-foreground text-sm">
            {data?.suggestions.length || 0} producto(s) a reabastecer · costo estimado total: <b className="text-foreground">{fmtMoney(data?.totalEstimated || 0)}</b>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCcw className="h-4 w-4 mr-1" /> Recalcular</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={selected.size === 0} onClick={() => setConfirmOrder(true)}>
            <ShoppingCart className="h-4 w-4 mr-1" /> Generar orden ({selected.size})
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {['AGOTADO', 'CRITICA', 'ALTA', 'MEDIA'].map((u) => {
          const n = (data?.suggestions || []).filter((s) => s.urgency === u).length
          const meta = URGENCY[u]
          return (
            <Card key={u}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center"><meta.icon className="h-5 w-5 text-slate-600" /></div>
                <div>
                  <p className="text-xl font-bold">{n}</p>
                  <p className="text-xs text-muted-foreground">Urgencia {meta.label.toLowerCase()}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {Object.entries(bySupplier).map(([supplier, items]) => (
        <Card key={supplier}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold">{supplier}</p>
                <p className="text-xs text-muted-foreground">{items.length} producto(s) · costo estimado {fmtMoney(items.reduce((s, x) => s + x.estimatedCost, 0))}</p>
              </div>
            </div>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Mín.</TableHead>
                    <TableHead className="text-center hidden lg:table-cell">Vendido 30d</TableHead>
                    <TableHead className="text-center hidden lg:table-cell">Cobertura</TableHead>
                    <TableHead className="text-center">Pedir</TableHead>
                    <TableHead className="text-right">Costo est.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((s) => {
                    const meta = URGENCY[s.urgency] || URGENCY.BAJA
                    return (
                      <TableRow key={s.productId}>
                        <TableCell><Checkbox checked={selected.has(s.productId)} onCheckedChange={() => toggle(s.productId)} /></TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{s.code}</p>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{s.stock}</TableCell>
                        <TableCell className="text-center hidden md:table-cell text-muted-foreground">{s.minStock}</TableCell>
                        <TableCell className="text-center hidden lg:table-cell text-sm">{s.sold30} uds</TableCell>
                        <TableCell className="text-center hidden lg:table-cell text-sm">{s.daysCover !== null ? `${s.daysCover} d` : '—'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Badge variant="outline" className="font-bold">{s.suggested}</Badge>
                            <Badge className={`${meta.cls} text-[10px] px-1.5`}>{meta.label}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{fmtMoney(s.estimatedCost)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {(data?.suggestions.length || 0) === 0 && (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Todo el inventario está saludable</p>
            <p className="text-sm">No hay productos que requieran reabastecimiento según su stock mínimo y velocidad de venta.</p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOrder} onOpenChange={setConfirmOrder}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Generar órdenes de compra?</AlertDialogTitle>
            <AlertDialogDescription>
              Se crearán órdenes agrupadas por proveedor ({suppliersOfSelected.join(', ') || '—'}) con {selectedItems.length} producto(s) por un total estimado de <b>{fmtMoney(selectedCost)}</b>. Podrá ajustarlas antes de recibirlas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={generateOrders} disabled={creating}>
              {creating ? 'Generando...' : 'Generar órdenes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
