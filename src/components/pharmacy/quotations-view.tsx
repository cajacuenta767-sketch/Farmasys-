'use client'

// Cotizaciones: presupuesto de productos para clientes, con conversión a estados
import { useCallback, useEffect, useState } from 'react'
import type { SessionUser, Quotation, Product, Customer } from '@/lib/pharmacy-types'
import { api_quotations, api_createQuotation, api_updateQuotation, api_deleteQuotation, api_products, api_customers, fmtMoney, fmtDate, fmtDateTime } from '@/lib/pharmacy-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { FileText, Plus, Trash2, Check, X, ShoppingCart } from 'lucide-react'

interface QuoteItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

const statusBadge = (s: string) => {
  if (s === 'ACEPTADA') return <Badge className="bg-emerald-100 text-emerald-700 border-0">Aceptada</Badge>
  if (s === 'RECHAZADA') return <Badge className="bg-red-100 text-red-700 border-0">Rechazada</Badge>
  if (s === 'VENCIDA') return <Badge className="bg-slate-200 text-slate-600 border-0">Vencida</Badge>
  return <Badge className="bg-amber-100 text-amber-700 border-0">Pendiente</Badge>
}

export function QuotationsView({ user }: { user: SessionUser }) {
  const { toast } = useToast()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detail, setDetail] = useState<Quotation | null>(null)
  const [toDelete, setToDelete] = useState<Quotation | null>(null)
  const [saving, setSaving] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [items, setItems] = useState<QuoteItem[]>([])
  const [selProduct, setSelProduct] = useState('')
  const [selQty, setSelQty] = useState('1')

  const load = useCallback(async () => {
    setQuotations(await api_quotations())
  }, [])
  useEffect(() => { load().catch(() => {}) }, [load])

  useEffect(() => {
    api_products().then(setProducts).catch(() => {})
    api_customers().then(setCustomers).catch(() => {})
  }, [])

  function addItem() {
    const p = products.find((x) => x.id === selProduct)
    if (!p) { toast({ title: 'Seleccione un producto', variant: 'destructive' }); return }
    const qty = parseInt(selQty) || 1
    setItems((prev) => [
      ...prev,
      { productId: p.id, productName: p.name, quantity: qty, unitPrice: p.salePrice, subtotal: p.salePrice * qty },
    ])
    setSelProduct(''); setSelQty('1')
  }

  async function save() {
    if (items.length === 0) { toast({ title: 'Agregue productos a la cotización', variant: 'destructive' }); return }
    setSaving(true)
    try {
      await api_createQuotation({
        userId: user.id,
        customerId: customerId || undefined,
        customerName: customerName || undefined,
        items,
      })
      toast({ title: 'Cotización creada', description: 'Válida por 15 días' })
      setDialogOpen(false); setItems([]); setCustomerName(''); setCustomerId('')
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  async function setStatus(q: Quotation, status: string) {
    try {
      await api_updateQuotation(q.id, status)
      toast({ title: `Cotización ${status.toLowerCase()}` })
      setDetail(null)
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const total = items.reduce((s, i) => s + i.subtotal, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cotizaciones</h1>
          <p className="text-muted-foreground text-sm">{quotations.length} cotizaciones emitidas</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Nueva cotización
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Número</TableHead><TableHead>Cliente</TableHead><TableHead>Fecha</TableHead>
                <TableHead>Válida hasta</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Estado</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {quotations.map((q) => (
                  <TableRow key={q.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetail(q)}>
                    <TableCell className="font-medium">{q.quoteNumber}</TableCell>
                    <TableCell className="text-sm">{q.customerName || 'Cliente ocasional'}</TableCell>
                    <TableCell className="text-xs">{fmtDate(q.createdAt)}</TableCell>
                    <TableCell className="text-xs">{fmtDate(q.validUntil)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtMoney(q.total)}</TableCell>
                    <TableCell>{statusBadge(q.status)}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={(e) => { e.stopPropagation(); setToDelete(q) }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {quotations.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" /> Sin cotizaciones emitidas
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Nueva cotización */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nueva cotización</DialogTitle><DialogDescription>Los precios toman el valor actual de venta</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cliente registrado</Label>
                <Select value={customerId} onValueChange={(v) => {
                  setCustomerId(v)
                  const c = customers.find((x) => x.id === v)
                  if (c) setCustomerName(c.name)
                }}>
                  <SelectTrigger><SelectValue placeholder="Ocasional" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Nombre (si es ocasional)</Label>
                <Input value={customerName} onChange={(e) => { setCustomerName(e.target.value); setCustomerId('') }} placeholder="Nombre del cliente" />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_80px_44px] gap-2 items-end">
              <div className="space-y-1">
                <Label>Producto</Label>
                <Select value={selProduct} onValueChange={setSelProduct}>
                  <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {fmtMoney(p.salePrice)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Cant.</Label>
                <Input type="number" min="1" value={selQty} onChange={(e) => setSelQty(e.target.value)} />
              </div>
              <Button type="button" onClick={addItem} size="icon" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4" /></Button>
            </div>

            {items.length > 0 && (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Cant.</TableHead><TableHead className="text-right">P.U.</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {items.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">{it.productName}</TableCell>
                        <TableCell className="text-right text-sm">{it.quantity}</TableCell>
                        <TableCell className="text-right text-sm">{fmtMoney(it.unitPrice)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{fmtMoney(it.subtotal)}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow><TableCell colSpan={3} className="text-right font-semibold">TOTAL</TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">{fmtMoney(total)}</TableCell><TableCell /></TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Guardando...' : 'Crear cotización'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">Cotización {detail.quoteNumber} {statusBadge(detail.status)}</DialogTitle>
                <DialogDescription>
                  {detail.customerName || 'Cliente ocasional'} · Emitida {fmtDateTime(detail.createdAt)} · Válida hasta {fmtDate(detail.validUntil)}
                </DialogDescription>
              </DialogHeader>
              <Table>
                <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Cant.</TableHead><TableHead className="text-right">P.U.</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(detail.items || []).map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="text-sm">{it.productName}</TableCell>
                      <TableCell className="text-right text-sm">{it.quantity}</TableCell>
                      <TableCell className="text-right text-sm">{fmtMoney(it.unitPrice)}</TableCell>
                      <TableCell className="text-right text-sm">{fmtMoney(it.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow><TableCell colSpan={3} className="text-right font-semibold">TOTAL</TableCell>
                    <TableCell className="text-right font-bold text-emerald-700">{fmtMoney(detail.total)}</TableCell></TableRow>
                </TableBody>
              </Table>
              {detail.status === 'PENDIENTE' && (
                <DialogFooter>
                  <Button variant="outline" className="text-red-600" onClick={() => setStatus(detail, 'RECHAZADA')}><X className="h-4 w-4 mr-1" /> Rechazar</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setStatus(detail, 'ACEPTADA')}><Check className="h-4 w-4 mr-1" /> Aceptar</Button>
                </DialogFooter>
              )}
              {detail.status === 'ACEPTADA' && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
                  <ShoppingCart className="h-4 w-4" /> Cotización aceptada. Registre la venta desde el Punto de Venta con estos productos.
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle>
            <AlertDialogDescription>La cotización {toDelete?.quoteNumber} será eliminada permanentemente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => {
              if (toDelete) { await api_deleteQuotation(toDelete.id); toast({ title: 'Cotización eliminada' }); await load() }
            }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
