'use client'

// Control de Recetas Médicas
import { useCallback, useEffect, useState } from 'react'
import { api_prescriptions, api_createPrescription, api_sales, fmtDate } from '@/lib/pharmacy-client'
import type { Prescription, Sale } from '@/lib/pharmacy-types'
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
import { Plus, FileHeart, Search } from 'lucide-react'

const empty = { doctorName: '', doctorLicense: '', patientName: '', saleId: '', notes: '' }

export function PrescriptionsView({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([api_prescriptions(), api_sales()])
    setPrescriptions(p)
    setSales(s.filter((x) => x.status === 'COMPLETADA'))
  }, [])
  useEffect(() => { load().catch(() => {}) }, [load])

  const filtered = prescriptions.filter((p) =>
    !search || p.patientName.toLowerCase().includes(search.toLowerCase()) ||
    p.doctorName.toLowerCase().includes(search.toLowerCase()) || p.folio.toLowerCase().includes(search.toLowerCase())
  )

  async function save() {
    if (!form.doctorName.trim() || !form.patientName.trim()) {
      toast({ title: 'Datos incompletos', description: 'Médico y paciente son obligatorios', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api_createPrescription({ ...form, saleId: form.saleId || null })
      toast({ title: 'Receta registrada' })
      setDialogOpen(false)
      setForm(empty)
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
          <p className="text-muted-foreground text-sm">Control de dispensación con receta · {prescriptions.length} registradas</p>
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
                  <TableHead className="hidden lg:table-cell">Registro</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden sm:table-cell">Factura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-medium">{p.folio}</TableCell>
                    <TableCell className="font-medium text-sm">{p.patientName}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{p.doctorName}{p.doctorLicense ? ` · ${p.doctorLicense}` : ''}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{p.doctorLicense || '-'}</TableCell>
                    <TableCell className="text-sm">{fmtDate(p.createdAt)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {p.sale ? <Badge variant="outline" className="font-mono text-[10px]">{p.sale.invoiceNumber}</Badge> : <span className="text-xs text-muted-foreground">Sin venta</span>}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground"><FileHeart className="h-8 w-8 mx-auto mb-2 opacity-40" /> No hay recetas registradas</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar receta médica</DialogTitle>
            <DialogDescription>Documente la dispensación de medicamentos con receta</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Médico *</Label><Input value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} placeholder="Dr. Juan Pérez" /></div>
              <div className="space-y-1"><Label>Registro médico</Label><Input value={form.doctorLicense} onChange={(e) => setForm({ ...form, doctorLicense: e.target.value })} placeholder="RM 12345" /></div>
            </div>
            <div className="space-y-1"><Label>Paciente *</Label><Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Factura asociada</Label>
              <Select value={form.saleId || 'none'} onValueChange={(v) => setForm({ ...form, saleId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="none">Sin asociar</SelectItem>
                  {sales.slice(0, 50).map((s) => <SelectItem key={s.id} value={s.id}>{s.invoiceNumber} — {fmtDate(s.createdAt)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Indicaciones / notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Dosis, duración del tratamiento..." /></div>
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
