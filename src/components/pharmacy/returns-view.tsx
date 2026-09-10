'use client'

// Devoluciones de clientes: reingresa productos al inventario y registra el motivo
import { useCallback, useEffect, useState } from 'react'
import type { SessionUser, ReturnRecord, Sale } from '@/lib/pharmacy-types'
import { api_returns, api_createReturn, api_getSale, api_sales, fmtMoney, fmtDateTime } from '@/lib/pharmacy-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Undo2, Search, PackageOpen } from 'lucide-react'

export function ReturnsView({ user, canEdit }: { user: SessionUser; canEdit: boolean }) {
  const { toast } = useToast()
  const [returns, setReturns] = useState<ReturnRecord[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setReturns(await api_returns())
  }, [])
  useEffect(() => { load().catch(() => {}) }, [load])

  const searchSales = useCallback(async (q: string) => {
    try {
      const list = await api_sales(q ? `?search=${encodeURIComponent(q)}` : '')
      setSales(list.filter((s) => s.status === 'COMPLETADA').slice(0, 30))
    } catch { /* ignore */ }
  }, [])
  useEffect(() => {
    if (dialogOpen) searchSales('')
  }, [dialogOpen, searchSales])
  useEffect(() => {
    const t = setTimeout(() => { if (dialogOpen) searchSales(search) }, 300)
    return () => clearTimeout(t)
  }, [search, dialogOpen, searchSales])

  async function selectSale(s: Sale) {
    const full = await api_getSale(s.id)
    setSelectedSale(full)
    setSelectedItems([])
  }

  async function process() {
    if (!selectedSale) return
    if (!reason.trim()) { toast({ title: 'Indique el motivo de la devolución', variant: 'destructive' }); return }
    setSaving(true)
    try {
      const r = await api_createReturn({
        saleId: selectedSale.id,
        reason,
        userId: user.id,
        itemIds: selectedItems.length > 0 ? selectedItems : undefined,
      })
      toast({ title: 'Devolución registrada', description: `${r.returnNumber} — ${fmtMoney(r.amount)} reingresados al inventario` })
      setDialogOpen(false); setReason(''); setSelectedSale(null)
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const amountToReturn = selectedSale
    ? (selectedSale.items || []).filter((i) => selectedItems.length === 0 || selectedItems.includes(i.id || '')).reduce((s, i) => s + i.subtotal, 0)
    : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Devoluciones</h1>
          <p className="text-muted-foreground text-sm">{returns.length} devoluciones procesadas</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setSelectedSale(null); setDialogOpen(true) }} className="bg-emerald-600 hover:bg-emerald-700">
            <Undo2 className="h-4 w-4 mr-1" /> Nueva devolución
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Número</TableHead><TableHead>Venta origen</TableHead><TableHead>Fecha</TableHead>
                <TableHead>Motivo</TableHead><TableHead className="text-right">Monto devuelto</TableHead>
                <TableHead>Stock</TableHead><TableHead>Registró</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {returns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.returnNumber}</TableCell>
                    <TableCell className="text-sm">{r.sale?.invoiceNumber || r.saleId}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{fmtDateTime(r.createdAt)}</TableCell>
                    <TableCell className="text-sm max-w-52 truncate">{r.reason}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">{fmtMoney(r.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={r.restocked ? 'border-emerald-300 text-emerald-700' : 'border-slate-300 text-slate-500'}>
                        {r.restocked ? 'Reingresado' : 'Sin reingreso'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.user?.name}</TableCell>
                  </TableRow>
                ))}
                {returns.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    <Undo2 className="h-8 w-8 mx-auto mb-2 opacity-40" /> Sin devoluciones registradas
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          {!selectedSale ? (
            <>
              <DialogHeader><DialogTitle>Seleccionar venta a devolver</DialogTitle>
                <DialogDescription>Busque la factura y seleccione la venta completada</DialogDescription></DialogHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por número de factura o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="max-h-80 overflow-y-auto rounded-lg border divide-y">
                {sales.map((s) => (
                  <button key={s.id} onClick={() => selectSale(s)} className="w-full flex items-center justify-between p-3 hover:bg-slate-50 text-left">
                    <div>
                      <p className="text-sm font-medium">{s.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{s.customerName || 'Cliente ocasional'} · {fmtDateTime(s.createdAt)}</p>
                    </div>
                    <span className="text-sm font-semibold">{fmtMoney(s.total)}</span>
                  </button>
                ))}
                {sales.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Sin resultados</p>}
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Devolución de {selectedSale.invoiceNumber}</DialogTitle>
                <DialogDescription>Seleccione los productos a devolver. El stock se reingresa al lote original.</DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-10"></TableHead><TableHead>Producto</TableHead><TableHead>Lote</TableHead><TableHead className="text-right">Cant.</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(selectedSale.items || []).map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.includes(it.id || '')}
                            onCheckedChange={(v) => {
                              setSelectedItems((prev) => v ? [...prev, it.id || ''] : prev.filter((x) => x !== it.id))
                            }}
                            aria-label={`Seleccionar ${it.productName}`}
                          />
                        </TableCell>
                        <TableCell className="text-sm">{it.productName}</TableCell>
                        <TableCell className="text-xs">{it.lotNumber || '-'}</TableCell>
                        <TableCell className="text-right text-sm">{it.quantity}</TableCell>
                        <TableCell className="text-right text-sm">{fmtMoney(it.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between text-sm">
                <Button size="sm" variant="ghost" onClick={() => setSelectedItems([])}>Ninguno (toda la venta)</Button>
                <span className="font-semibold">Monto a devolver: <span className="text-red-600">{fmtMoney(selectedItems.length === 0 ? selectedSale.total : amountToReturn)}</span></span>
              </div>
              <div className="space-y-1">
                <Label>Motivo *</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: producto vencido, reacción adversa, error de compra..." />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setSelectedSale(null); setReason('') }}>Volver</Button>
                <Button onClick={process} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  <PackageOpen className="h-4 w-4 mr-1" /> {saving ? 'Procesando...' : 'Procesar devolución'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
