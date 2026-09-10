'use client'

// Control de Recetas Médicas — con items prescritos y estado de dispensación
import { useCallback, useEffect, useState } from 'react'
import { api_prescriptions, api_createPrescription, api_products, fmtDate, fmtDateTime } from '@/lib/pharmacy-client'
import type { Prescription, PrescriptionItem, Product } from '@/lib/pharmacy-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { Plus, FileHeart, Search, Trash2, Eye, CheckCircle2, Clock } from 'lucide-react'

const empty = { doctorName: '', doctorLicense: '', patientName: '', prescriptionDate: '', notes: '' }

const statusBadge = (s: string) => {
  if (s === 'DISPENSADA') return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1 inline" />Dispensada</Badge>
  if (s === 'PARCIAL') return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Clock className="h-3 w-3 mr-1 inline" />Parcial</Badge>
  return <Badge variant="outline">Registrada</Badge>
}

export function PrescriptionsView({ canEdit, userName }: { canEdit: boolean; userName: string }) {
  const { toast } = useToast()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [items, setItems] = useState<PrescriptionItem[]>([])
  const [newItem, setNewItem] = useState({ productId: '', quantity: '1' })
  const [detail, setDetail] = useState<Prescription | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [p, pr] = await Promise.all([api_prescriptions(), api_products()])
    setPrescriptions(p)
    setProducts(pr)
  }, [])
  useEffect(() => { load().catch(() => {}) }, [load])

  const filtered = prescriptions.filter((p) =>
    !search || p.patientName.toLowerCase().includes(search.toLowerCase()) ||
    p.doctorName.toLowerCase().includes(search.toLowerCase()) || p.folio.toLowerCase().includes(search.toLowerCase())
  )

  function addRxItem() {
    const p = products.find((x) => x.id === newItem.productId)
    if (!p) {
      toast({ title: 'Seleccione un medicamento', variant: 'destructive' }); return
    }
    if (items.some((i) => i.productId === p.id)) {
      toast({ title: 'Ese medicamento ya está en la receta', variant: 'destructive' }); return
    }
    setItems((its) => [...its, { productId: p.id, productName: p.name, quantity: Math.max(1, parseInt(newItem.quantity) || 1), dispensed: false }])
    setNewItem({ productId: '', quantity: '1' })
  }

  async function save() {
    if (!form.doctorName.trim() || !form.patientName.trim()) {
      toast({ title: 'Datos incompletos', description: 'Médico y paciente son obligatorios', variant: 'destructive' })
      return
    }
    if (items.length === 0) {
      toast({ title: 'Agregue los medicamentos prescritos', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const rx = await api_createPrescription({
        ...form,
        prescriptionDate: form.prescriptionDate || undefined,
        userName,
        items: items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity })),
      })
      toast({ title: 'Receta registrada', description: `Folio ${rx.folio} con ${items.length} medicamento(s) prescrito(s)` })
      setDialogOpen(false)
      setForm(empty)
      setItems([])
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error registrando receta', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recetas Médicas</h1>
          <p className="text-muted-foreground text-sm">
            Control de dispensación con receta · {prescriptions.filter((p) => p.status === 'DISPENSADA').length} dispensadas de {prescriptions.length} registradas
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Registrar receta</Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por folio, paciente o médico..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="hidden md:table-cell">Médico</TableHead>
                  <TableHead className="hidden lg:table-cell">Fecha receta</TableHead>
                  <TableHead className="text-center">Medicamentos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden sm:table-cell">Factura</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const disp = (p.items || []).filter((i) => i.dispensed).length
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-medium">{p.folio}</TableCell>
                      <TableCell className="font-medium text-sm">{p.patientName}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{p.doctorName}{p.doctorLicense ? ` · ${p.doctorLicense}` : ''}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{fmtDate(p.prescriptionDate || p.createdAt)}</TableCell>
                      <TableCell className="text-center text-sm">
                        {p.items && p.items.length > 0 ? `${disp}/${p.items.length}` : '—'}
                      </TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {p.sale ? <Badge variant="outline" className="font-mono text-[10px]">{p.sale.invoiceNumber}</Badge> : <span className="text-xs text-muted-foreground">Sin venta</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDetail(p)}><Eye className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground"><FileHeart className="h-8 w-8 mx-auto mb-2 opacity-40" /> No hay recetas registradas</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Registrar receta con items */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar receta médica</DialogTitle>
            <DialogDescription>Documente los medicamentos prescritos; el POS marcará la dispensación al vender con este folio</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Médico *</Label><Input value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} placeholder="Dr. Juan Pérez" /></div>
              <div className="space-y-1"><Label>Registro médico</Label><Input value={form.doctorLicense} onChange={(e) => setForm({ ...form, doctorLicense: e.target.value })} placeholder="RM 12345" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Paciente *</Label><Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Fecha de emisión</Label>
                <Input type="date" value={form.prescriptionDate} onChange={(e) => setForm({ ...form, prescriptionDate: e.target.value })} />
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">Medicamentos prescritos *</p>
              <div className="grid grid-cols-6 gap-2">
                <div className="col-span-4">
                  <Select value={newItem.productId || 'none'} onValueChange={(v) => setNewItem({ ...newItem, productId: v === 'none' ? '' : v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Medicamento" /></SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="none" disabled>Medicamento</SelectItem>
                      {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Input className="h-9 col-span-1" placeholder="Cant." value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} inputMode="numeric" />
                <Button className="h-9 col-span-1 bg-emerald-600 hover:bg-emerald-700" onClick={addRxItem}><Plus className="h-4 w-4" /></Button>
              </div>
              {items.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {items.map((i, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded border bg-slate-50 px-2.5 py-1.5">
                      <p className="text-sm"><span className="font-medium">{i.productName}</span> <span className="text-muted-foreground">× {i.quantity}</span></p>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => setItems(items.filter((_, x) => x !== idx))}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1"><Label>Indicaciones / notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Dosis, duración del tratamiento..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Guardando...' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">Receta {detail.folio} {statusBadge(detail.status)}</DialogTitle>
                <DialogDescription>{detail.doctorName}{detail.doctorLicense ? ` · ${detail.doctorLicense}` : ''} → {detail.patientName} · {fmtDateTime(detail.createdAt)}</DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Medicamento</TableHead><TableHead className="text-center">Cantidad</TableHead><TableHead className="text-center">Dispensado</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(detail.items || []).map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="text-sm font-medium">{i.productName}</TableCell>
                        <TableCell className="text-center">{i.quantity}</TableCell>
                        <TableCell className="text-center">
                          {i.dispensed ? <CheckCircle2 className="h-4 w-4 text-emerald-600 inline" /> : <Clock className="h-4 w-4 text-amber-500 inline" />}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!detail.items || detail.items.length === 0) && (
                      <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">Receta sin items prescritos (legacy)</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {detail.notes && <p className="text-sm text-muted-foreground">Indicaciones: {detail.notes}</p>}
              {detail.sale && <p className="text-sm">Factura asociada: <Badge variant="outline" className="font-mono">{detail.sale.invoiceNumber}</Badge></p>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
