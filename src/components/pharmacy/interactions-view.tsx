'use client'

// Interacciones Medicamentosas — alertas clínicas para el dispensario
import { useCallback, useEffect, useState } from 'react'
import { api_interactions, api_products, api_createInteraction, api_updateInteraction, api_deleteInteraction } from '@/lib/pharmacy-client'
import type { DrugInteraction, Product } from '@/lib/pharmacy-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, FlaskConical, Search, TriangleAlert } from 'lucide-react'

const SEVERITY_BADGE: Record<string, { label: string; cls: string }> = {
  GRAVE: { label: 'Grave', cls: 'bg-red-100 text-red-700 hover:bg-red-100' },
  MODERADA: { label: 'Moderada', cls: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  LEVE: { label: 'Leve', cls: 'bg-slate-100 text-slate-700 hover:bg-slate-100' },
}

const empty = { productAId: '', productBId: '', severity: 'MODERADA', description: '' }

export function InteractionsView({ user }: { user: { id: string; name: string } }) {
  const { toast } = useToast()
  const [rows, setRows] = useState<DrugInteraction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [toDelete, setToDelete] = useState<DrugInteraction | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [i, p] = await Promise.all([api_interactions(true), api_products()])
    setRows(i)
    setProducts(p)
  }, [])
  useEffect(() => { load().catch(() => {}) }, [load])

  const filtered = rows.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (r.productA?.name || '').toLowerCase().includes(q) || (r.productB?.name || '').toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) || r.severity.toLowerCase() === q
  })

  async function save() {
    if (!form.productAId || !form.productBId) {
      toast({ title: 'Seleccione ambos productos', variant: 'destructive' }); return
    }
    if (!form.description.trim()) {
      toast({ title: 'Describa la interacción', variant: 'destructive' }); return
    }
    setSaving(true)
    try {
      await api_createInteraction({ ...form, userName: user.name })
      toast({ title: 'Interacción registrada', description: 'El POS advertirá al vender estos productos juntos' })
      setDialogOpen(false)
      setForm(empty)
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error guardando', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(r: DrugInteraction) {
    try {
      await api_updateInteraction(r.id, { active: !r.active })
      await load()
    } catch {
      toast({ title: 'Error cambiando estado', variant: 'destructive' })
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await api_deleteInteraction(toDelete.id, user.name)
      toast({ title: 'Interacción eliminada' })
      await load()
    } catch {
      toast({ title: 'Error eliminando', variant: 'destructive' })
    } finally {
      setToDelete(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interacciones Medicamentosas</h1>
          <p className="text-muted-foreground text-sm">
            Alertas clínicas que el POS muestra al vender productos incompatibles · {rows.filter((r) => r.active).length} activas
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Nueva interacción</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por producto o severidad..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto A</TableHead>
                  <TableHead>Producto B</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead className="hidden md:table-cell">Descripción clínica</TableHead>
                  <TableHead className="text-center">Activa</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className={!r.active ? 'opacity-50' : ''}>
                    <TableCell className="font-medium text-sm">{r.productA?.name}</TableCell>
                    <TableCell className="font-medium text-sm">{r.productB?.name}</TableCell>
                    <TableCell><Badge className={SEVERITY_BADGE[r.severity]?.cls}>{SEVERITY_BADGE[r.severity]?.label || r.severity}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">{r.description}</TableCell>
                    <TableCell className="text-center"><Switch checked={r.active} onCheckedChange={() => toggleActive(r)} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setToDelete(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No hay interacciones registradas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><TriangleAlert className="h-5 w-5 text-amber-500" /> Registrar interacción</DialogTitle>
            <DialogDescription>El POS advertirá automáticamente cuando ambos productos estén en el carrito</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Producto A *</Label>
              <Select value={form.productAId || 'none'} onValueChange={(v) => setForm({ ...form, productAId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none" disabled>Producto A</SelectItem>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Producto B *</Label>
              <Select value={form.productBId || 'none'} onValueChange={(v) => setForm({ ...form, productBId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none" disabled>Producto B</SelectItem>
                  {products.filter((p) => p.id !== form.productAId).map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Severidad</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GRAVE">Grave — no administrar juntos</SelectItem>
                  <SelectItem value="MODERADA">Moderada — requiere vigilancia</SelectItem>
                  <SelectItem value="LEVE">Leve — información al usuario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Descripción clínica *</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ej.: riesgo de sangrado gastrointestinal; separar dosis al menos 8 horas" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Guardando...' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar interacción?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la interacción entre &quot;{toDelete?.productA?.name}&quot; y &quot;{toDelete?.productB?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
