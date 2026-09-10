'use client'

// Inventario por Lotes - entradas, ajustes y vencimientos
import { useCallback, useEffect, useState } from 'react'
import { api_lots, api_products, api_addLot, api_updateLot, api_deleteLot, fmtMoney, fmtDate, daysUntil } from '@/lib/pharmacy-client'
import type { Lot, Product } from '@/lib/pharmacy-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { PackagePlus, AlertTriangle, CalendarClock, Warehouse, Pencil, Trash2, Search } from 'lucide-react'

const todayStr = () => new Date().toISOString().slice(0, 10)
const plusYears = (n: number) => { const d = new Date(); d.setFullYear(d.getFullYear() + n); return d.toISOString().slice(0, 10) }

export function InventoryView({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast()
  const [lots, setLots] = useState<Lot[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [tab, setTab] = useState('todos')
  const [search, setSearch] = useState('')
  const [entryOpen, setEntryOpen] = useState(false)
  const [adjustLot, setAdjustLot] = useState<Lot | null>(null)
  const [toDelete, setToDelete] = useState<Lot | null>(null)
  const [saving, setSaving] = useState(false)
  const [entry, setEntry] = useState({ productId: '', lotNumber: '', quantity: '', expiryDate: plusYears(2), purchasePrice: '' })
  const [adjustQty, setAdjustQty] = useState('')

  const load = useCallback(async () => {
    const [l, p] = await Promise.all([api_lots(), api_products()])
    setLots(l)
    setProducts(p)
  }, [])

  useEffect(() => { load().catch(() => {}) }, [load])

  const filtered = lots.filter((l) => {
    const days = daysUntil(l.expiryDate)
    if (tab === 'vencidos' && days >= 0) return false
    if (tab === 'proximos' && (days < 0 || days > 90)) return false
    const q = search.toLowerCase()
    if (!q) return true
    return l.product?.name.toLowerCase().includes(q) || l.product?.code.toLowerCase().includes(q) || l.lotNumber.toLowerCase().includes(q)
  })

  const totalValue = lots.reduce((s, l) => s + l.quantity * l.purchasePrice, 0)
  const expiredCount = lots.filter((l) => daysUntil(l.expiryDate) < 0).length
  const soonCount = lots.filter((l) => { const d = daysUntil(l.expiryDate); return d >= 0 && d <= 90 }).length

  async function saveEntry() {
    if (!entry.productId || !entry.lotNumber.trim() || !entry.quantity || !entry.expiryDate) {
      toast({ title: 'Datos incompletos', description: 'Producto, lote, cantidad y vencimiento son obligatorios', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api_addLot({
        productId: entry.productId,
        lotNumber: entry.lotNumber.trim(),
        quantity: parseInt(entry.quantity),
        expiryDate: new Date(`${entry.expiryDate}T12:00:00`).toISOString(),
        purchasePrice: parseFloat(entry.purchasePrice) || undefined,
      })
      toast({ title: 'Entrada registrada', description: `${entry.quantity} unidades agregadas al inventario` })
      setEntryOpen(false)
      setEntry({ productId: '', lotNumber: '', quantity: '', expiryDate: plusYears(2), purchasePrice: '' })
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error registrando entrada', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function saveAdjust() {
    if (!adjustLot) return
    setSaving(true)
    try {
      await api_updateLot(adjustLot.id, parseInt(adjustQty) || 0)
      toast({ title: 'Lote ajustado' })
      setAdjustLot(null)
      await load()
    } catch {
      toast({ title: 'Error ajustando lote', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await api_deleteLot(toDelete.id)
      toast({ title: 'Lote eliminado del inventario' })
      await load()
    } catch {
      toast({ title: 'Error eliminando lote', variant: 'destructive' })
    } finally {
      setToDelete(null)
    }
  }

  function expiryBadge(days: number) {
    if (days < 0) return <Badge variant="destructive">VENCIDO</Badge>
    if (days <= 30) return <Badge variant="destructive">{days} días</Badge>
    if (days <= 90) return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{days} días</Badge>
    return <Badge variant="outline">{days} días</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario por Lotes</h1>
          <p className="text-muted-foreground text-sm">Sistema FEFO: primero sale el lote más próximo a vencer</p>
        </div>
        {canEdit && (
          <Button onClick={() => setEntryOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <PackagePlus className="h-4 w-4 mr-1" /> Registrar entrada
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center"><Warehouse className="h-5 w-5 text-emerald-700" /></div>
          <div><p className="text-xs text-muted-foreground">Valor del inventario</p><p className="text-lg font-bold">{fmtMoney(totalValue)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
          <div><p className="text-xs text-muted-foreground">Lotes vencidos</p><p className="text-lg font-bold">{expiredCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center"><CalendarClock className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Vencen en 90 días</p><p className="text-lg font-bold">{soonCount}</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="todos">Todos ({lots.length})</TabsTrigger>
                <TabsTrigger value="proximos">Próximos 90d ({soonCount})</TabsTrigger>
                <TabsTrigger value="vencidos">Vencidos ({expiredCount})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1 w-full md:max-w-xs md:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar producto o lote..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  {canEdit && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const days = daysUntil(l.expiryDate)
                  return (
                    <TableRow key={l.id} className={days < 0 ? 'bg-red-50/50' : days <= 30 ? 'bg-amber-50/50' : ''}>
                      <TableCell>
                        <p className="font-medium text-sm leading-tight">{l.product?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{l.product?.code}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{l.lotNumber}</TableCell>
                      <TableCell>
                        <p className="text-sm">{fmtDate(l.expiryDate)}</p>
                        <div className="mt-0.5">{expiryBadge(days)}</div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{l.quantity}</TableCell>
                      <TableCell className="text-right">{fmtMoney(l.quantity * l.purchasePrice)}</TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setAdjustLot(l); setAdjustQty(String(l.quantity)) }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setToDelete(l)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No hay lotes en esta vista</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Entrada de inventario */}
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar entrada de inventario</DialogTitle>
            <DialogDescription>Si el número de lote ya existe, la cantidad se sumará</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Producto *</Label>
              <Select value={entry.productId || 'none'} onValueChange={(v) => {
                const p = products.find((x) => x.id === v)
                setEntry({ ...entry, productId: v === 'none' ? '' : v, purchasePrice: p ? String(p.purchasePrice) : entry.purchasePrice })
              }}>
                <SelectTrigger><SelectValue placeholder="Seleccione un producto" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="none" disabled>Seleccione un producto</SelectItem>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Número de lote *</Label><Input value={entry.lotNumber} onChange={(e) => setEntry({ ...entry, lotNumber: e.target.value })} placeholder="L-2025-0001" /></div>
              <div className="space-y-1"><Label>Cantidad *</Label><Input value={entry.quantity} onChange={(e) => setEntry({ ...entry, quantity: e.target.value })} inputMode="numeric" /></div>
              <div className="space-y-1"><Label>Fecha vencimiento *</Label><Input type="date" value={entry.expiryDate} onChange={(e) => setEntry({ ...entry, expiryDate: e.target.value })} /></div>
              <div className="space-y-1"><Label>Precio compra ($)</Label><Input value={entry.purchasePrice} onChange={(e) => setEntry({ ...entry, purchasePrice: e.target.value })} inputMode="decimal" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryOpen(false)}>Cancelar</Button>
            <Button onClick={saveEntry} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Guardando...' : 'Registrar entrada'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ajustar lote */}
      <Dialog open={!!adjustLot} onOpenChange={(o) => !o && setAdjustLot(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar inventario</DialogTitle>
            <DialogDescription>{adjustLot?.product?.name} — Lote {adjustLot?.lotNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Cantidad real (conteo físico)</Label>
            <Input value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} inputMode="numeric" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustLot(null)}>Cancelar</Button>
            <Button onClick={saveAdjust} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">Guardar ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación de lote */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Retirar lote del inventario?</AlertDialogTitle>
            <AlertDialogDescription>Lote {toDelete?.lotNumber} de &quot;{toDelete?.product?.name}&quot; ({toDelete?.quantity} unidades). Si el lote tiene historial de ventas, su cantidad pasará a 0.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>Retirar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
