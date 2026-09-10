'use client'

// Promociones y descuentos: reglas por producto o por categoría
import { useCallback, useEffect, useState } from 'react'
import type { Promotion, Product, Category } from '@/lib/pharmacy-types'
import { api_promotions, api_createPromotion, api_updatePromotion, api_deletePromotion, api_products, api_categories, fmtMoney } from '@/lib/pharmacy-client'
import { fmtDate } from '@/lib/pharmacy-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Percent, Plus, Pencil, Trash2, DollarSign, Tag } from 'lucide-react'

const empty = {
  name: '', description: '', type: 'PORCENTAJE', value: '10',
  productId: 'NONE', categoryId: 'NONE', startDate: '', endDate: '', active: true,
}

export function PromotionsView() {
  const { toast } = useToast()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [form, setForm] = useState(empty)
  const [toDelete, setToDelete] = useState<Promotion | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setPromotions(await api_promotions())
  }, [])
  useEffect(() => { load().catch(() => {}) }, [load])

  useEffect(() => {
    api_products().then(setProducts).catch(() => {})
    api_categories().then(setCategories).catch(() => {})
  }, [])

  async function save() {
    if (!form.name.trim()) { toast({ title: 'Indique el nombre', variant: 'destructive' }); return }
    const value = parseFloat(form.value)
    if (isNaN(value) || value <= 0) { toast({ title: 'Valor inválido', variant: 'destructive' }); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name, description: form.description || undefined, type: form.type, value,
        productId: form.productId !== 'NONE' ? form.productId : undefined,
        categoryId: form.categoryId !== 'NONE' ? form.categoryId : undefined,
        startDate: form.startDate || undefined, endDate: form.endDate || undefined, active: form.active,
      }
      if (editing) {
        await api_updatePromotion(editing.id, payload)
        toast({ title: 'Promoción actualizada' })
      } else {
        await api_createPromotion(payload)
        toast({ title: 'Promoción creada' })
      }
      setDialogOpen(false); setForm(empty); setEditing(null)
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  async function toggleActive(p: Promotion) {
    try {
      await api_updatePromotion(p.id, { active: !p.active })
      await load()
    } catch {
      toast({ title: 'Error cambiando estado', variant: 'destructive' })
    }
  }

  const target = (p: Promotion) => {
    if (p.product) return `Producto: ${p.product.name}`
    if (p.category) return `Categoría: ${p.category.name}`
    return 'Toda la farmacia'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Promociones y Descuentos</h1>
          <p className="text-muted-foreground text-sm">{promotions.filter((p) => p.active).length} activas de {promotions.length}</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(empty); setDialogOpen(true) }} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Nueva promoción
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {promotions.map((p) => (
          <Card key={p.id} className={p.active ? 'border-emerald-200' : 'opacity-70'}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${p.type === 'PORCENTAJE' ? 'bg-violet-100' : 'bg-teal-100'}`}>
                    {p.type === 'PORCENTAJE'
                      ? <Percent className="h-5 w-5 text-violet-600" />
                      : <DollarSign className="h-5 w-5 text-teal-600" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><Tag className="h-3 w-3" /> {target(p)}</p>
                  </div>
                </div>
                <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-700 border-0">
                  {p.type === 'PORCENTAJE' ? `−${p.value}%` : `−${fmtMoney(p.value)}`}
                </Badge>
                {p.startDate && <span className="text-xs text-muted-foreground">Desde {fmtDate(p.startDate)}</span>}
                {p.endDate && <span className="text-xs text-muted-foreground">Hasta {fmtDate(p.endDate)}</span>}
              </div>
              {p.description && <p className="text-sm text-muted-foreground mt-2">{p.description}</p>}
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  setEditing(p)
                  setForm({
                    name: p.name, description: p.description || '', type: p.type, value: String(p.value),
                    productId: p.productId || 'NONE', categoryId: p.categoryId || 'NONE',
                    startDate: p.startDate ? p.startDate.slice(0, 10) : '', endDate: p.endDate ? p.endDate.slice(0, 10) : '', active: p.active,
                  })
                  setDialogOpen(true)
                }}><Pencil className="h-3.5 w-3.5 mr-1" /> Editar</Button>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setToDelete(p)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {promotions.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            <Percent className="h-8 w-8 mx-auto mb-2 opacity-40" /> No hay promociones configuradas
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar promoción' : 'Nueva promoción'}</DialogTitle>
            <DialogDescription>Defina el descuento y su alcance (producto, categoría o general)</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Semana de la Gripe" /></div>
            <div className="space-y-1"><Label>Descripción</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo de descuento *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PORCENTAJE">Porcentaje (%)</SelectItem>
                    <SelectItem value="MONTO">Monto fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Valor *</Label>
                <Input type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Producto (opcional)</Label>
              <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v, categoryId: v !== 'NONE' ? 'NONE' : form.categoryId })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— Toda la farmacia —</SelectItem>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Categoría (opcional)</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v, productId: v !== 'NONE' ? 'NONE' : form.productId })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— Sin categoría —</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Inicio</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div className="space-y-1"><Label>Fin</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} id="promo-active" />
              <Label htmlFor="promo-active">Promoción activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar promoción?</AlertDialogTitle>
            <AlertDialogDescription>&quot;{toDelete?.name}&quot; será eliminada permanentemente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => {
              if (toDelete) { await api_deletePromotion(toDelete.id); toast({ title: 'Promoción eliminada' }); await load() }
            }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
