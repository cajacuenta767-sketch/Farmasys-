'use client'

// Gestión de Clientes
import { useCallback, useEffect, useState } from 'react'
import { api_customers, api_createCustomer, api_updateCustomer, api_deleteCustomer } from '@/lib/pharmacy-client'
import type { Customer } from '@/lib/pharmacy-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Users, Search } from 'lucide-react'

const empty = { name: '', document: '', phone: '', email: '', address: '', notes: '' }

export function CustomersView() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(empty)
  const [toDelete, setToDelete] = useState<Customer | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setCustomers(await api_customers(search))
  }, [search])
  useEffect(() => { load().catch(() => {}) }, [load])

  async function save() {
    if (!form.name.trim()) { toast({ title: 'El nombre es obligatorio', variant: 'destructive' }); return }
    setSaving(true)
    try {
      if (editing) {
        await api_updateCustomer(editing.id, form)
        toast({ title: 'Cliente actualizado' })
      } else {
        await api_createCustomer(form)
        toast({ title: 'Cliente creado', description: form.name })
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
      await api_deleteCustomer(toDelete.id)
      toast({ title: 'Cliente eliminado' })
      await load()
    } catch (e) {
      toast({ title: 'No se puede eliminar', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    } finally {
      setToDelete(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm">{customers.length} clientes registrados</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(empty); setDialogOpen(true) }} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Nuevo cliente
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, documento o teléfono..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {customers.map((c) => (
          <Card key={c.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <span className="text-emerald-700 font-bold text-sm">{c.name.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.document || 'Sin documento'}</p>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-100 rounded px-1.5 py-0.5 shrink-0">{c._count?.sales ?? 0} compras</span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                {c.phone && <p>📞 {c.phone}</p>}
                {c.email && <p className="truncate">✉️ {c.email}</p>}
                {c.address && <p className="truncate">📍 {c.address}</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditing(c); setForm({ name: c.name, document: c.document || '', phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' }); setDialogOpen(true) }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setToDelete(c)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {customers.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground"><Users className="h-8 w-8 mx-auto mb-2 opacity-40" /> No hay clientes</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
            <DialogDescription>Registre los datos del cliente para facturación</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>Nombre completo *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Documento</Label><Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} /></div>
              <div className="space-y-1"><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Dirección</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-1"><Label>Notas (alergias, condiciones...)</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>&quot;{toDelete?.name}&quot; será eliminado. No es posible si tiene ventas asociadas.</AlertDialogDescription>
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
