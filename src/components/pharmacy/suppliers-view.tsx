'use client'

// Gestión de Proveedores
import { useCallback, useEffect, useState } from 'react'
import { api_suppliers, api_createSupplier, api_updateSupplier, api_deleteSupplier } from '@/lib/pharmacy-client'
import type { Supplier } from '@/lib/pharmacy-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Truck, Search } from 'lucide-react'

const empty = { name: '', taxId: '', contactName: '', phone: '', email: '', address: '' }

export function SuppliersView({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState(empty)
  const [toDelete, setToDelete] = useState<Supplier | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setSuppliers(await api_suppliers())
  }, [])
  useEffect(() => { load().catch(() => {}) }, [load])

  const filtered = suppliers.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.taxId || '').includes(search))

  async function save() {
    if (!form.name.trim()) { toast({ title: 'El nombre es obligatorio', variant: 'destructive' }); return }
    setSaving(true)
    try {
      if (editing) {
        await api_updateSupplier(editing.id, form)
        toast({ title: 'Proveedor actualizado' })
      } else {
        await api_createSupplier(form)
        toast({ title: 'Proveedor creado', description: form.name })
      }
      setDialogOpen(false)
      setForm(empty)
      setEditing(null)
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error guardando', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      const res = await api_deleteSupplier(toDelete.id)
      toast({ title: res.deactivated ? 'Proveedor desactivado (tiene productos asociados)' : 'Proveedor eliminado' })
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
          <h1 className="text-2xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground text-sm">{suppliers.length} proveedores registrados</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setForm(empty); setDialogOpen(true) }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1" /> Nuevo proveedor
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar proveedor..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s) => (
          <Card key={s.id} className={`hover:shadow-md transition-shadow ${!s.active ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center shrink-0"><Truck className="h-5 w-5 text-teal-700" /></div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.taxId || 'Sin NIT/RUC'}</p>
                  </div>
                </div>
                {s.active ? <Badge variant="outline" className="text-emerald-600 border-emerald-300 shrink-0">Activo</Badge> : <Badge variant="secondary" className="shrink-0">Inactivo</Badge>}
              </div>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                {s.contactName && <p>👤 {s.contactName}</p>}
                {s.phone && <p>📞 {s.phone}</p>}
                {s.email && <p className="truncate">✉️ {s.email}</p>}
                {s.address && <p className="truncate">📍 {s.address}</p>}
              </div>
              {canEdit && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(s); setForm({ name: s.name, taxId: s.taxId || '', contactName: s.contactName || '', phone: s.phone || '', email: s.email || '', address: s.address || '' }); setDialogOpen(true) }}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setToDelete(s)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground col-span-full text-center py-10">No hay proveedores</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
            <DialogDescription>Distribuidora o laboratorio que abastece su farmacia</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>Nombre / Razón social *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>NIT / RUC</Label><Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} /></div>
              <div className="space-y-1"><Label>Contacto</Label><Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
              <div className="space-y-1"><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Dirección</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>&quot;{toDelete?.name}&quot; será eliminado o desactivado si tiene productos/órdenes asociadas.</AlertDialogDescription>
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
