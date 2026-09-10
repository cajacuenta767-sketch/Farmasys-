'use client'

// Historial de Ventas y Facturación
import { useCallback, useEffect, useState } from 'react'
import { api_sales, api_getSale, api_voidSale, fmtMoney, fmtDateTime } from '@/lib/pharmacy-client'
import type { Sale } from '@/lib/pharmacy-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Search, Eye, Ban, FileText, ReceiptText } from 'lucide-react'

const monthAgo = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10) }
const today = () => new Date().toISOString().slice(0, 10)

export function SalesView({ canVoid }: { canVoid: boolean }) {
  const { toast } = useToast()
  const [sales, setSales] = useState<Sale[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState(monthAgo())
  const [to, setTo] = useState(today())
  const [detail, setDetail] = useState<Sale | null>(null)
  const [toVoid, setToVoid] = useState<Sale | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (status !== 'all') params.set('status', status)
    if (search.trim()) params.set('search', search.trim())
    setSales(await api_sales(params.toString()))
  }, [from, to, status, search])

  useEffect(() => { load().catch(() => {}) }, [load])

  const totalShown = sales.filter((s) => s.status === 'COMPLETADA').reduce((sum, s) => sum + s.total, 0)

  async function openDetail(s: Sale) {
    try {
      setDetail(await api_getSale(s.id))
    } catch {
      toast({ title: 'Error cargando detalle', variant: 'destructive' })
    }
  }

  async function confirmVoid() {
    if (!toVoid) return
    setSaving(true)
    try {
      await api_voidSale(toVoid.id, voidReason)
      toast({ title: 'Venta anulada', description: 'El stock fue devuelto al inventario' })
      setToVoid(null)
      setVoidReason('')
      setDetail(null)
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error anulando', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ventas y Facturación</h1>
        <p className="text-muted-foreground text-sm">{sales.length} facturas · Total completadas: {fmtMoney(totalShown)}</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por N° factura o cliente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 items-center">
              <Input type="date" className="w-36" value={from} onChange={(e) => setFrom(e.target.value)} />
              <span className="text-muted-foreground text-sm">a</span>
              <Input type="date" className="w-36" value={to} onChange={(e) => setTo(e.target.value)} />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="COMPLETADA">Completadas</SelectItem>
                  <SelectItem value="ANULADA">Anuladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factura</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">Cliente</TableHead>
                  <TableHead className="hidden lg:table-cell">Vendedor</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs font-medium">{s.invoiceNumber}</TableCell>
                    <TableCell className="text-sm">{fmtDateTime(s.createdAt)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{s.customer?.name || s.customerName || 'Cliente Ocasional'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{s.user?.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{s.paymentMethod}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{fmtMoney(s.total)}</TableCell>
                    <TableCell>
                      {s.status === 'COMPLETADA' ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Completada</Badge> : <Badge variant="destructive">Anulada</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openDetail(s)}><Eye className="h-3.5 w-3.5" /></Button>
                        {canVoid && s.status === 'COMPLETADA' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setToVoid(s)}><Ban className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground"><ReceiptText className="h-8 w-8 mx-auto mb-2 opacity-40" /> No hay ventas en este período</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detalle de factura */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-600" /> Factura {detail.invoiceNumber}</DialogTitle>
                <DialogDescription>
                  {fmtDateTime(detail.createdAt)} · {detail.user?.name} · {detail.status === 'ANULADA' ? 'ANULADA' : detail.paymentMethod}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="text-sm">
                  <p><span className="text-muted-foreground">Cliente:</span> <b>{detail.customer?.name || detail.customerName || 'Cliente Ocasional'}</b></p>
                  {detail.customer?.document && <p className="text-muted-foreground text-xs">Documento: {detail.customer.document}</p>}
                </div>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Lote</TableHead><TableHead className="text-center">Cant.</TableHead><TableHead className="text-right">Precio</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(detail.items || []).map((it) => (
                        <TableRow key={it.id}>
                          <TableCell className="text-sm">{it.productName}</TableCell>
                          <TableCell className="text-xs font-mono">{it.lotNumber || '-'}</TableCell>
                          <TableCell className="text-center">{it.quantity}</TableCell>
                          <TableCell className="text-right">{fmtMoney(it.unitPrice)}</TableCell>
                          <TableCell className="text-right font-medium">{fmtMoney(it.subtotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtMoney(detail.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Descuento</span><span>-{fmtMoney(detail.discount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span>{fmtMoney(detail.tax)}</span></div>
                  <div className="flex justify-between font-bold text-base border-t pt-1"><span>TOTAL</span><span className="text-emerald-700">{fmtMoney(detail.total)}</span></div>
                  {detail.status === 'ANULADA' && detail.voidReason && (
                    <p className="text-xs text-red-600 pt-2">Motivo de anulación: {detail.voidReason}</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => window.print()}><FileText className="h-4 w-4 mr-2" /> Imprimir</Button>
                <Button onClick={() => setDetail(null)}>Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Anular venta */}
      <AlertDialog open={!!toVoid} onOpenChange={(o) => !o && setToVoid(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular factura {toVoid?.invoiceNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se devolverán las {toVoid?.items ? 'existencias' : 'unidades'} al inventario. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder="Motivo de anulación (opcional)" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmVoid} disabled={saving}>{saving ? 'Anulando...' : 'Anular venta'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
