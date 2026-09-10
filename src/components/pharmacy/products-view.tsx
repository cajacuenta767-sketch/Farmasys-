'use client'

// Catálogo de Medicamentos (CRUD)
import { useCallback, useEffect, useState } from 'react'
import {
  api_products, api_categories, api_suppliers, api_createProduct, api_updateProduct, api_deleteProduct,
  fmtMoney,
} from '@/lib/pharmacy-client'
import type { Product, Category, Supplier } from '@/lib/pharmacy-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Search, Plus, Pencil, Trash2, Pill, PackageX, FileDown } from 'lucide-react'

const emptyForm = {
  code: '', barcode: '', name: '', description: '', categoryId: '', supplierId: '',
  lab: '', activeIngredient: '', presentation: '', concentration: '',
  purchasePrice: '', salePrice: '', minStock: '5', requiresPrescription: false,
  controlled: false, location: '',
}

export function ProductsView({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [rxFilter, setRxFilter] = useState('all')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [toDelete, setToDelete] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', description: '' })

  const load = useCallback(async () => {
    const [p, c, s] = await Promise.all([api_products(), api_categories(), api_suppliers()])
    setProducts(p)
    setCategories(c)
    setSuppliers(s)
  }, [])

  useEffect(() => { load().catch(() => {}) }, [load])

  const filtered = products.filter((p) => {
    const q = search.toLowerCase()
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) ||
      (p.activeIngredient || '').toLowerCase().includes(q) || (p.lab || '').toLowerCase().includes(q)
    const matchCat = categoryFilter === 'all' || p.categoryId === categoryFilter
    const matchRx = rxFilter === 'all' || (rxFilter === 'rx' ? p.requiresPrescription : !p.requiresPrescription)
    const matchLow = !lowStockOnly || (p.stock ?? 0) <= p.minStock
    return matchQ && matchCat && matchRx && matchLow
  })

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, code: `MED-${String(products.length + 1).padStart(3, '0')}` })
    setDialogOpen(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({
      code: p.code, barcode: p.barcode || '', name: p.name, description: p.description || '',
      categoryId: p.categoryId || '', supplierId: p.supplierId || '',
      lab: p.lab || '', activeIngredient: p.activeIngredient || '', presentation: p.presentation || '',
      concentration: p.concentration || '',
      purchasePrice: String(p.purchasePrice), salePrice: String(p.salePrice),
      minStock: String(p.minStock), requiresPrescription: p.requiresPrescription,
      controlled: p.controlled, location: p.location || '',
    })
    setDialogOpen(true)
  }

  async function save() {
    if (!form.code.trim() || !form.name.trim()) {
      toast({ title: 'Datos incompletos', description: 'Código y nombre son obligatorios', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        purchasePrice: parseFloat(form.purchasePrice) || 0,
        salePrice: parseFloat(form.salePrice) || 0,
        minStock: parseInt(form.minStock) || 5,
        categoryId: form.categoryId || null,
        supplierId: form.supplierId || null,
      }
      if (editing) {
        await api_updateProduct(editing.id, payload)
        toast({ title: 'Producto actualizado', description: form.name })
      } else {
        await api_createProduct(payload)
        toast({ title: 'Producto creado', description: form.name })
      }
      setDialogOpen(false)
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
      await api_deleteProduct(toDelete.id)
      toast({ title: 'Producto eliminado', description: toDelete.name })
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error eliminando', variant: 'destructive' })
    } finally {
      setToDelete(null)
    }
  }

  async function createCategory() {
    if (!newCat.name.trim()) return
    try {
      await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCat) })
      setCategories(await api_categories())
      setNewCat({ name: '', description: '' })
      setCatDialogOpen(false)
      toast({ title: 'Categoría creada' })
    } catch {
      toast({ title: 'Error creando categoría', variant: 'destructive' })
    }
  }

  function exportCsv() {
    const rows = [
      ['Código', 'Nombre', 'Categoría', 'Laboratorio', 'Principio Activo', 'Presentación', 'Precio Compra', 'Precio Venta', 'Stock', 'Stock Mín', 'Requiere Receta'],
      ...filtered.map((p) => [p.code, p.name, p.category?.name || '', p.lab || '', p.activeIngredient || '', p.presentation || '', String(p.purchasePrice), String(p.salePrice), String(p.stock ?? 0), String(p.minStock), p.requiresPrescription ? 'SÍ' : 'NO']),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'medicamentos.csv'
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Medicamentos</h1>
          <p className="text-muted-foreground text-sm">{products.length} productos en catálogo · {filtered.length} mostrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}><FileDown className="h-4 w-4 mr-1" /> Exportar CSV</Button>
          <Button variant="outline" onClick={() => setCatDialogOpen(true)}>+ Categoría</Button>
          {canEdit && <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Nuevo medicamento</Button>}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar medicamento..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="md:w-52"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c._count?.products ?? 0})</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={rxFilter} onValueChange={setRxFilter}>
              <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="rx">Con receta</SelectItem>
                <SelectItem value="otc">Sin receta (OTC)</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm border rounded-md px-3 cursor-pointer hover:bg-slate-50">
              <Checkbox checked={lowStockOnly} onCheckedChange={(v) => setLowStockOnly(!!v)} /> Stock bajo
            </label>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Medicamento</TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead className="hidden lg:table-cell">Principio activo</TableHead>
                  <TableHead className="text-right">P. Venta</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="hidden sm:table-cell">Alertas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const stock = p.stock ?? 0
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell>
                        <p className="font-medium leading-tight">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.lab} · {p.presentation}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{p.category?.name || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{p.activeIngredient || '-'}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtMoney(p.salePrice)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={stock === 0 ? 'destructive' : stock <= p.minStock ? 'secondary' : 'outline'}
                          className={stock > 0 && stock <= p.minStock ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : ''}>
                          {stock}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {p.requiresPrescription && <Badge variant="outline" className="text-[10px] text-red-600 border-red-300">RX</Badge>}
                          {p.controlled && <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-300">CTRL</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canEdit && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>}
                          {canEdit && <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setToDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                          {!canEdit && <span className="text-xs text-muted-foreground">Solo lectura</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      <PackageX className="h-8 w-8 mx-auto mb-2 opacity-40" /> No se encontraron medicamentos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialogo crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pill className="h-5 w-5 text-emerald-600" /> {editing ? 'Editar medicamento' : 'Nuevo medicamento'}</DialogTitle>
            <DialogDescription>Complete la información del producto</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label>Código *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div className="space-y-1"><Label>Código de barras</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Nombre comercial *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Acetaminofén 500mg x 30 tabletas" /></div>
            <div className="space-y-1"><Label>Categoría</Label>
              <Select value={form.categoryId || 'none'} onValueChange={(v) => setForm({ ...form, categoryId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Proveedor</Label>
              <Select value={form.supplierId || 'none'} onValueChange={(v) => setForm({ ...form, supplierId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proveedor</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Laboratorio</Label><Input value={form.lab} onChange={(e) => setForm({ ...form, lab: e.target.value })} placeholder="Genfar, MK, Bayer..." /></div>
            <div className="space-y-1"><Label>Principio activo</Label><Input value={form.activeIngredient} onChange={(e) => setForm({ ...form, activeIngredient: e.target.value })} placeholder="Acetaminofén" /></div>
            <div className="space-y-1"><Label>Presentación</Label><Input value={form.presentation} onChange={(e) => setForm({ ...form, presentation: e.target.value })} placeholder="Caja x 30 tabletas" /></div>
            <div className="space-y-1"><Label>Concentración</Label><Input value={form.concentration} onChange={(e) => setForm({ ...form, concentration: e.target.value })} placeholder="500 mg" /></div>
            <div className="space-y-1"><Label>Precio de compra ($)</Label><Input value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} inputMode="decimal" /></div>
            <div className="space-y-1"><Label>Precio de venta ($)</Label><Input value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} inputMode="decimal" /></div>
            <div className="space-y-1"><Label>Stock mínimo</Label><Input value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} inputMode="numeric" /></div>
            <div className="space-y-1"><Label>Ubicación (estante)</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="A1, B3..." /></div>
            <div className="flex items-center space-x-2 sm:col-span-1">
              <Checkbox id="rx" checked={form.requiresPrescription} onCheckedChange={(v) => setForm({ ...form, requiresPrescription: !!v })} />
              <Label htmlFor="rx" className="cursor-pointer">Requiere receta médica</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="ctrl" checked={form.controlled} onCheckedChange={(v) => setForm({ ...form, controlled: !!v })} />
              <Label htmlFor="ctrl" className="cursor-pointer">Medicamento controlado</Label>
            </div>
            <div className="space-y-1 sm:col-span-2"><Label>Descripción</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogo nueva categoría */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
            <DialogDescription>Agrupe sus medicamentos por tipo</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nombre *</Label><Input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="Ej: Oftálmicos" /></div>
            <div className="space-y-1"><Label>Descripción</Label><Input value={newCat.description} onChange={(e) => setNewCat({ ...newCat, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Cancelar</Button>
            <Button onClick={createCategory} className="bg-emerald-600 hover:bg-emerald-700">Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar medicamento?</AlertDialogTitle>
            <AlertDialogDescription>Se desactivará &quot;{toDelete?.name}&quot; del catálogo. El historial de ventas se conserva.</AlertDialogDescription>
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
