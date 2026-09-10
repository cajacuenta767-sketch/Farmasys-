'use client'

// Compras a Proveedores - órdenes y recepción de mercancía
import { useCallback, useEffect, useState } from 'react'
import {
  api_purchases, api_suppliers, api_products, api_createPurchase, api_receivePurchase, api_cancelPurchase,
  fmtMoney, fmtDate, api_settings,
} from '@/lib/pharmacy-client'
import type { Purchase, Supplier, Product, PurchaseItem as PItem, SessionUser } from '@/lib/pharmacy-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, PackageCheck, XCircle, Eye, ClipboardList } from 'lucide-react'

const plusYears = (n: number) => { const d = new Date(); d.setFullYear(d.getFullYear() + n); return d.toISOString().slice(0, 10) }

export function PurchasesView({ user, canEdit }: { user: SessionUser; canEdit: boolean }) {
  const { toast } = useToast()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<Purchase | null>(null)
  const [toReceive, setToReceive] = useState<Purchase | null>(null)
  const [toCancel, setToCancel] = useState<Purchase | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ supplierId: '', notes: '' })
  const [items, setItems] = useState<PItem[]>([])
  const [newItem, setNewItem] = useState({ productId: '', quantity: '10', unitCost: '', lotNumber: '', expiryDate: plusYears(2) })

  const load = useCallback(async () => {
    const [p, s, pr] = await Promise.all([api_purchases(), api_suppliers(), api_products()])
    setPurchases(p)
    setSuppliers(s)
    setProducts(pr)
  }, [])

  useEffect(() => { load().catch(() => {}) }, [load])

  const orderTotal = items.reduce((s, i) => s + i.quantity * i.unitCost, 0)

  function addProductToOrder() {
    if (!newItem.productId || !newItem.quantity) {
      toast({ title: 'Seleccione un producto y cantidad', variant: 'destructive' })
      return
    }
    const p = products.find((x) => x.id === newItem.productId)
    if (!p) return
    setItems((its) => [...its, {
      productId: p.id,
      quantity: parseInt(newItem.quantity) || 1,
      unitCost: parseFloat(newItem.unitCost) || p.purchasePrice,
      lotNumber: newItem.lotNumber || null,
      expiryDate: newItem.expiryDate ? new Date(`${newItem.expiryDate}T12:00:00`).toISOString() : null,
    }])
    setNewItem({ productId: '', quantity: '10', unitCost: '', lotNumber: '', expiryDate: plusYears(2) })
  }

  async function createOrder() {
    if (!form.supplierId) { toast({ title: 'Seleccione un proveedor', variant: 'destructive' }); return }
    if (items.length === 0) { toast({ title: 'Agregue productos a la orden', variant: 'destructive' }); return }
    setSaving(true)
    try {
      await api_createPurchase({ supplierId: form.supplierId, userId: user.id, notes: form.notes, items })
      toast({ title: 'Orden de compra creada', description: `Total: ${fmtMoney(orderTotal)}` })
      setCreateOpen(false)
      setForm({ supplierId: '', notes: '' })
      setItems([])
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error creando orden', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function confirmReceive() {
    if (!toReceive) return
    setSaving(true)
    try {
      await api_receivePurchase(toReceive.id, user.name)
      toast({ title: 'Mercancía recibida', description: 'Los lotes ingresaron al inventario' })
      setToReceive(null)
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error recibiendo', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function confirmCancel() {
    if (!toCancel) return
    try {
      await api_cancelPurchase(toCancel.id, user.name)
      toast({ title: 'Orden cancelada' })
      setToCancel(null)
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error cancelando', variant: 'destructive' })
    }
  }

  const statusBadge = (s: string) => {
    if (s === 'RECIBIDA') return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Recibida</Badge>
    if (s === 'PENDIENTE') return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pendiente</Badge>
    return <Badge variant="destructive">Cancelada</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compras a Proveedores</h1>
          <p className="text-muted-foreground text-sm">Órdenes de compra y recepción de mercancía</p>
        </div>
        {canEdit && (
          <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Nueva orden</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead className="hidden md:table-cell">Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-medium">{p.orderNumber}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{p.supplier?.name}</TableCell>
                    <TableCell className="text-sm">{fmtDate(p.createdAt)}</TableCell>
                    <TableCell className="text-center">{p.items?.length || 0}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtMoney(p.total)}</TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDetail(p)}><Eye className="h-3.5 w-3.5" /></Button>
                        {canEdit && p.status === 'PENDIENTE' && (
                          <>
                            <Button size="sm" variant="outline" className="h-8 text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => setToReceive(p)}>
                              <PackageCheck className="h-3.5 w-3.5 mr-1" /> Recibir
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setToCancel(p)}><XCircle className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {purchases.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground"><ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" /> No hay órdenes de compra</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Crear orden */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva orden de compra</DialogTitle>
            <DialogDescription>Seleccione proveedor y agregue los productos a pedir</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Proveedor *</Label>
                <Select value={form.supplierId || 'none'} onValueChange={(v) => setForm({ ...form, supplierId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Seleccione proveedor</SelectItem>
                    {suppliers.filter((s) => s.active).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Notas</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">Agregar producto</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="col-span-2">
                  <Select value={newItem.productId || 'none'} onValueChange={(v) => {
                    const p = products.find((x) => x.id === v)
                    setNewItem({ ...newItem, productId: v === 'none' ? '' : v, unitCost: p ? String(p.purchasePrice) : newItem.unitCost })
                  }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Producto" /></SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="none" disabled>Producto</SelectItem>
                      {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Input className="h-9" placeholder="Cantidad" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} inputMode="numeric" />
                <Input className="h-9" placeholder="Costo unit." value={newItem.unitCost} onChange={(e) => setNewItem({ ...newItem, unitCost: e.target.value })} inputMode="decimal" />
                <Button className="h-9 bg-emerald-600 hover:bg-emerald-700" onClick={addProductToOrder}><Plus className="h-4 w-4" /></Button>
                <Input className="h-9 col-span-2" placeholder="N° de lote (opcional)" value={newItem.lotNumber} onChange={(e) => setNewItem({ ...newItem, lotNumber: e.target.value })} />
                <div className="col-span-2 sm:col-span-3 relative">
                  <Label className="absolute -top-2 left-2 text-[10px] bg-white px-1 text-muted-foreground">Vencimiento</Label>
                  <Input type="date" className="h-9" value={newItem.expiryDate} onChange={(e) => setNewItem({ ...newItem, expiryDate: e.target.value })} />
                </div>
              </div>
            </div>

            {items.length > 0 && (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-center">Cant.</TableHead><TableHead className="text-right">Costo</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {items.map((it, idx) => {
                      const p = products.find((x) => x.id === it.productId)
                      return (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">{p?.name}</TableCell>
                          <TableCell className="text-center">{it.quantity}</TableCell>
                          <TableCell className="text-right">{fmtMoney(it.unitCost)}</TableCell>
                          <TableCell className="text-right font-medium">{fmtMoney(it.quantity * it.unitCost)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                <div className="flex justify-end gap-4 p-3 border-t bg-slate-50">
                  <span className="text-sm font-medium">Total orden:</span>
                  <span className="font-bold text-emerald-700">{fmtMoney(orderTotal)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={createOrder} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Creando...' : 'Crear orden'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>Orden {detail.orderNumber}</DialogTitle>
                <DialogDescription>{detail.supplier?.name} · {fmtDate(detail.createdAt)} · {detail.status}</DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-center">Cant.</TableHead><TableHead className="text-right">Costo</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(detail.items || []).map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="text-sm">{it.product?.name || it.productId}</TableCell>
                        <TableCell className="text-center">{it.quantity}</TableCell>
                        <TableCell className="text-right">{fmtMoney(it.unitCost)}</TableCell>
                        <TableCell className="text-right">{fmtMoney(it.quantity * it.unitCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end gap-4 p-3 border-t bg-slate-50 font-bold"><span>TOTAL</span><span className="text-emerald-700">{fmtMoney(detail.total)}</span></div>
              </div>
              {detail.notes && <p className="text-sm text-muted-foreground">Notas: {detail.notes}</p>}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Recibir */}
      <AlertDialog open={!!toReceive} onOpenChange={(o) => !o && setToReceive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Recibir mercancía de {toReceive?.orderNumber}?</AlertDialogTitle>
            <AlertDialogDescription>Se crearán/actualizarán los lotes de inventario con las cantidades y vencimientos de la orden. Total: {fmtMoney(toReceive?.total || 0)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={confirmReceive} disabled={saving}>{saving ? 'Procesando...' : 'Confirmar recepción'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancelar */}
      <AlertDialog open={!!toCancel} onOpenChange={(o) => !o && setToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar orden {toCancel?.orderNumber}?</AlertDialogTitle>
            <AlertDialogDescription>La orden quedará marcada como cancelada sin ingresar mercancía.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmCancel}>Cancelar orden</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
