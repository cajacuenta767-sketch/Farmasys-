'use client'

// Gestión de categorías del catálogo farmacéutico
import { useCallback, useEffect, useState } from 'react'
import type { Category } from '@/lib/pharmacy-types'
import { api_categories, api_createCategory, api_updateCategory, api_deleteCategory } from '@/lib/pharmacy-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Tags, LayoutGrid } from 'lucide-react'

const COLORS = ['bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-teal-100 text-teal-700', 'bg-orange-100 text-orange-700', 'bg-cyan-100 text-cyan-700']

const empty = { name: '', description: '' }

export function CategoriesView({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState(empty)
  const [toDelete, setToDelete] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setCategories(await api_categories())
  }, [])
  useEffect(() => { load().catch(() => {}) }, [load])

  async function save() {
    if (!form.name.trim()) { toast({ title: 'El nombre es obligatorio', variant: 'destructive' }); return }
    setSaving(true)
    try {
      if (editing) {
        await api_updateCategory(editing.id, form)
        toast({ title: 'Categoría actualizada' })
      } else {
        await api_createCategory(form)
        toast({ title: 'Categoría creada', description: form.name })
      }
      setDialogOpen(false); setForm(empty); setEditing(null)
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Ya existe una categoría con ese nombre', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
          <p className="text-muted-foreground text-sm">{categories.length} categorías del catálogo farmacéutico</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setForm(empty); setDialogOpen(true) }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1" /> Nueva categoría
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((c, idx) => (
          <Card key={c.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${COLORS[idx % COLORS.length]}`}>
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <span className="text-xs bg-slate-100 rounded px-1.5 py-0.5">{c._count?.products ?? 0} productos</span>
              </div>
              <p className="font-medium mt-3">{c.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 min-h-8">{c.description || 'Sin descripción'}</p>
              {canEdit && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    setEditing(c)
                    setForm({ name: c.name, description: c.description || '' })
                    setDialogOpen(true)
                  }}><Pencil className="h-3.5 w-3.5 mr-1" /> Editar</Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setToDelete(c)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {categories.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            <Tags className="h-8 w-8 mx-auto mb-2 opacity-40" /> No hay categorías
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
            <DialogDescription>Agrupe medicamentos por tipo o uso terapéutico</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Antibióticos" /></div>
            <div className="space-y-1"><Label>Descripción</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción de la categoría..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>&quot;{toDelete?.name}&quot; será eliminada. No es posible si tiene productos asociados.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => {
              if (toDelete) {
                try {
                  await api_deleteCategory(toDelete.id)
                  toast({ title: 'Categoría eliminada' })
                  await load()
                } catch (e) {
                  toast({ title: 'No se puede eliminar', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
                }
              }
            }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
