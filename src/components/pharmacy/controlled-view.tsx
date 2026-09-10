'use client'

// Libro oficial de sustancias controladas: registro legal de entradas y salidas
import { useCallback, useEffect, useState } from 'react'
import type { SessionUser, ControlledLog, Product } from '@/lib/pharmacy-types'
import { api_controlledLogs, api_addControlledLog, api_products } from '@/lib/pharmacy-client'
import { fmtDateTime } from '@/lib/pharmacy-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ShieldAlert, Plus } from 'lucide-react'

export function ControlledView({ user }: { user: SessionUser }) {
  const { toast } = useToast()
  const [logs, setLogs] = useState<ControlledLog[]>([])
  const [controlledProducts, setControlledProducts] = useState<Product[]>([])
  const [opFilter, setOpFilter] = useState('TODOS')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    productId: '', operation: 'SALIDA', quantity: '1', lotNumber: '',
    doctorName: '', patientName: '', folio: '',
  })

  const load = useCallback(async () => {
    const params = opFilter !== 'TODOS' ? `?operation=${opFilter}` : ''
    setLogs(await api_controlledLogs(params))
  }, [opFilter])
  useEffect(() => { load().catch(() => {}) }, [load])

  useEffect(() => {
    api_products().then((ps) => setControlledProducts(ps.filter((p) => p.controlled && p.active))).catch(() => {})
  }, [])

  async function save() {
    if (!form.productId) { toast({ title: 'Seleccione el medicamento controlado', variant: 'destructive' }); return }
    if (!form.lotNumber.trim()) { toast({ title: 'El lote es obligatorio', variant: 'destructive' }); return }
    if (form.operation === 'SALIDA' && (!form.doctorName.trim() || !form.patientName.trim())) {
      toast({ title: 'Salidas requieren médico y paciente', description: 'Toda salida de controlados debe estar respaldada por una receta médica', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api_addControlledLog({
        productId: form.productId,
        operation: form.operation,
        quantity: parseInt(form.quantity) || 1,
        lotNumber: form.lotNumber,
        doctorName: form.doctorName || undefined,
        patientName: form.patientName || undefined,
        folio: form.folio || undefined,
        userId: user.id,
      })
      toast({ title: 'Registro agregado al libro de controlados' })
      setDialogOpen(false)
      setForm({ productId: '', operation: 'SALIDA', quantity: '1', lotNumber: '', doctorName: '', patientName: '', folio: '' })
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const entradas = logs.filter((l) => l.operation === 'ENTRADA').reduce((s, l) => s + l.quantity, 0)
  const salidas = logs.filter((l) => l.operation === 'SALIDA').reduce((s, l) => s + l.quantity, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-600" /> Medicamentos Controlados
          </h1>
          <p className="text-muted-foreground text-sm">Libro oficial de sustancias sujetas a fiscalización · {controlledProducts.length} productos bajo control</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Nuevo registro
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Entradas registradas</p>
          <p className="text-lg font-bold text-emerald-600">+{entradas} uds</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Salidas dispensadas</p>
          <p className="text-lg font-bold text-red-600">−{salidas} uds</p>
        </CardContent></Card>
        <Card className="bg-amber-50 border-amber-200"><CardContent className="p-3 text-center">
          <p className="text-xs text-amber-700">Registros en el libro</p>
          <p className="text-lg font-bold text-amber-700">{logs.length}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        {['TODOS', 'ENTRADA', 'SALIDA'].map((f) => (
          <button
            key={f}
            onClick={() => setOpFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
              opFilter === f ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-muted-foreground hover:border-emerald-400'
            }`}
          >
            {f === 'TODOS' ? 'Todos' : f === 'ENTRADA' ? 'Entradas' : 'Salidas'}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Fecha</TableHead><TableHead>Operación</TableHead><TableHead>Producto</TableHead>
                <TableHead>Lote</TableHead><TableHead className="text-right">Cant.</TableHead>
                <TableHead>Médico</TableHead><TableHead>Paciente</TableHead><TableHead>Folio</TableHead><TableHead>Registró</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs whitespace-nowrap">{fmtDateTime(l.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={l.operation === 'ENTRADA' ? 'border-emerald-300 text-emerald-700' : 'border-red-300 text-red-700'}>
                        {l.operation === 'ENTRADA' ? 'Entrada' : 'Salida'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-48 truncate">{l.product?.name}{l.product?.concentration ? ` ${l.product.concentration}` : ''}</TableCell>
                    <TableCell className="text-xs">{l.lotNumber}</TableCell>
                    <TableCell className={`text-right font-semibold ${l.operation === 'ENTRADA' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {l.operation === 'ENTRADA' ? '+' : '−'}{l.quantity}
                    </TableCell>
                    <TableCell className="text-xs">{l.doctorName || '-'}</TableCell>
                    <TableCell className="text-xs">{l.patientName || '-'}</TableCell>
                    <TableCell className="text-xs">{l.folio || '-'}</TableCell>
                    <TableCell className="text-xs">{l.user?.name}</TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-40" /> Sin registros en el libro
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registro en libro de controlados</DialogTitle>
            <DialogDescription>Las salidas requieren datos de la receta médica y descuentan stock del lote indicado.</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Medicamento controlado *</Label>
              <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  {controlledProducts.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} {p.concentration || ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Operación *</Label>
                <Select value={form.operation} onValueChange={(v) => setForm({ ...form, operation: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTRADA">Entrada (recepción)</SelectItem>
                    <SelectItem value="SALIDA">Salida (dispensación)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Cantidad *</Label>
                <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Número de lote *</Label>
              <Input value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} placeholder="L-2026-001" />
            </div>
            {form.operation === 'SALIDA' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Médico que receta *</Label>
                    <Input value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} placeholder="Dr. Juan Pérez" />
                  </div>
                  <div className="space-y-1">
                    <Label>Folio de receta</Label>
                    <Input value={form.folio} onChange={(e) => setForm({ ...form, folio: e.target.value })} placeholder="R-00123" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Paciente *</Label>
                  <Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} placeholder="Nombre del paciente" />
                </div>
              </>
            )}
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
