'use client'

// Kardex: trazabilidad completa de entradas, salidas, ajustes y mermas
import { useCallback, useEffect, useState } from 'react'
import type { SessionUser, InventoryMovement, Product } from '@/lib/pharmacy-types'
import { api_inventoryMovements, api_addInventoryMovement, api_products } from '@/lib/pharmacy-client'
import { fmtMoney, fmtDateTime } from '@/lib/pharmacy-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeftRight, Plus } from 'lucide-react'

const typeBadge = (t: string) => {
  if (t === 'ENTRADA') return <Badge className="bg-emerald-100 text-emerald-700 border-0">Entrada</Badge>
  if (t === 'SALIDA') return <Badge className="bg-red-100 text-red-700 border-0">Salida</Badge>
  if (t === 'MERMA') return <Badge className="bg-orange-100 text-orange-700 border-0">Merma</Badge>
  return <Badge className="bg-sky-100 text-sky-700 border-0">Ajuste</Badge>
}

export function MovementsView({ user }: { user: SessionUser }) {
  const { toast } = useToast()
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [typeFilter, setTypeFilter] = useState('TODOS')
  const [productFilter, setProductFilter] = useState('TODOS')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ productId: '', type: 'MERMA', quantity: '1', lotNumber: '', reason: '' })

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (typeFilter !== 'TODOS') params.set('type', typeFilter)
    if (productFilter !== 'TODOS') params.set('productId', productFilter)
    setMovements(await api_inventoryMovements(params.toString()))
  }, [typeFilter, productFilter])
  useEffect(() => { load().catch(() => {}) }, [load])

  useEffect(() => {
    api_products().then(setProducts).catch(() => {})
  }, [])

  async function save() {
    if (!form.productId) { toast({ title: 'Seleccione un producto', variant: 'destructive' }); return }
    const qty = parseInt(form.quantity)
    if (isNaN(qty) || qty <= 0) { toast({ title: 'Cantidad inválida', variant: 'destructive' }); return }
    if (!form.reason.trim()) { toast({ title: 'Indique el motivo', variant: 'destructive' }); return }
    setSaving(true)
    try {
      await api_addInventoryMovement({
        productId: form.productId,
        type: form.type,
        quantity: qty,
        reason: form.reason,
        userId: user.id,
        lotNumber: form.lotNumber || undefined,
      })
      toast({ title: 'Movimiento registrado' })
      setDialogOpen(false)
      setForm({ productId: '', type: 'MERMA', quantity: '1', lotNumber: '', reason: '' })
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const totals = {
    entrada: movements.filter((m) => m.type === 'ENTRADA').reduce((s, m) => s + m.quantity, 0),
    salida: movements.filter((m) => m.type === 'SALIDA').reduce((s, m) => s + m.quantity, 0),
    merma: movements.filter((m) => m.type === 'MERMA').reduce((s, m) => s + m.quantity, 0),
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kardex de Inventario</h1>
          <p className="text-muted-foreground text-sm">Trazabilidad completa: {movements.length} movimientos</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Registrar merma / ajuste
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Unidades ingresadas</p>
          <p className="text-lg font-bold text-emerald-600">+{totals.entrada}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Unidades vendidas</p>
          <p className="text-lg font-bold text-red-600">−{totals.salida}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Mermas</p>
          <p className="text-lg font-bold text-orange-600">−{totals.merma}</p>
        </CardContent></Card>
        <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-3 text-center">
          <p className="text-xs text-emerald-700">Costo de mermas</p>
          <p className="text-lg font-bold text-emerald-700">
            {fmtMoney(movements.filter((m) => m.type === 'MERMA').reduce((s, m) => s + m.quantity * (m.product?.purchasePrice ?? 0), 0))}
          </p>
        </CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los tipos</SelectItem>
            <SelectItem value="ENTRADA">Entradas</SelectItem>
            <SelectItem value="SALIDA">Salidas</SelectItem>
            <SelectItem value="AJUSTE">Ajustes</SelectItem>
            <SelectItem value="MERMA">Mermas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los productos</SelectItem>
            {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Fecha</TableHead><TableHead>Producto</TableHead><TableHead>Lote</TableHead>
                <TableHead>Tipo</TableHead><TableHead className="text-right">Cant.</TableHead>
                <TableHead>Motivo</TableHead><TableHead>Ref.</TableHead><TableHead>Usuario</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs whitespace-nowrap">{fmtDateTime(m.createdAt)}</TableCell>
                    <TableCell className="text-sm max-w-52 truncate">{m.product?.name || '-'}</TableCell>
                    <TableCell className="text-xs">{m.lotNumber || '-'}</TableCell>
                    <TableCell>{typeBadge(m.type)}</TableCell>
                    <TableCell className={`text-right font-semibold ${m.type === 'ENTRADA' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {m.type === 'ENTRADA' ? '+' : '−'}{m.quantity}
                    </TableCell>
                    <TableCell className="text-xs max-w-48 truncate">{m.reason}</TableCell>
                    <TableCell className="text-xs">{m.reference || '-'}</TableCell>
                    <TableCell className="text-xs">{m.user?.name}</TableCell>
                  </TableRow>
                ))}
                {movements.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-40" /> Sin movimientos registrados
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar movimiento de inventario</DialogTitle>
            <DialogDescription>Mermas descuentan del lote más próximo a vencer (FEFO). Los ajustes son solo documentales.</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Producto *</Label>
              <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccione producto" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MERMA">Merma (vencido, dañado)</SelectItem>
                    <SelectItem value="ENTRADA">Entrada manual</SelectItem>
                    <SelectItem value="AJUSTE">Ajuste documental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Cantidad *</Label>
                <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
            </div>
            {form.type === 'ENTRADA' && (
              <div className="space-y-1">
                <Label>Número de lote (para entrada) *</Label>
                <Input value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} placeholder="L-2026-001" />
              </div>
            )}
            <div className="space-y-1">
              <Label>Motivo *</Label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Ej: envases rotos, producto vencido, conteo físico..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Guardando...' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
