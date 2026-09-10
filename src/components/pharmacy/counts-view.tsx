'use client'

// Conteo Físico de Inventario — tomas de inventario con ajuste automático al kardex
import { useCallback, useEffect, useState } from 'react'
import { api_counts, api_createCount, api_getCount, api_countAction, api_categories, fmtDateTime } from '@/lib/pharmacy-client'
import type { InventoryCount, InventoryCountItem, Category, SessionUser } from '@/lib/pharmacy-types'
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
import { Plus, Eye, ClipboardCheck, RotateCcw } from 'lucide-react'

const statusBadge = (s: string) => {
  if (s === 'APLICADO') return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aplicado</Badge>
  if (s === 'EN_PROCESO') return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">En proceso</Badge>
  return <Badge variant="destructive">Cancelado</Badge>
}

export function CountsView({ user }: { user: SessionUser }) {
  const { toast } = useToast()
  const [counts, setCounts] = useState<InventoryCount[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [createNotes, setCreateNotes] = useState('')
  const [createCategory, setCreateCategory] = useState('todas')
  const [detail, setDetail] = useState<InventoryCount | null>(null)
  const [items, setItems] = useState<InventoryCountItem[]>([])
  const [onlyDiff, setOnlyDiff] = useState(false)
  const [confirmApply, setConfirmApply] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [c, cat] = await Promise.all([api_counts(), api_categories()])
    setCounts(c)
    setCategories(cat)
  }, [])
  useEffect(() => { load().catch(() => {}) }, [load])

  async function openDetail(c: InventoryCount) {
    try {
      const full = await api_getCount(c.id)
      setDetail(full)
      setItems(full.items || [])
      setOnlyDiff(false)
    } catch {
      toast({ title: 'Error cargando el conteo', variant: 'destructive' })
    }
  }

  async function create() {
    setSaving(true)
    try {
      const created = await api_createCount({
        userId: user.id,
        notes: createNotes,
        categoryId: createCategory === 'todas' ? undefined : createCategory,
      })
      toast({ title: `Conteo ${created.countNumber} creado`, description: `${created.totalLots} lotes en la lista para contar` })
      setCreateOpen(false)
      setCreateNotes('')
      await load()
      if (created.id) openDetail(created)
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error creando conteo', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  function setCounted(item: InventoryCountItem, value: string) {
    const n = parseInt(value, 10)
    setItems((its) => its.map((i) => i.id === item.id ? { ...i, countedQty: Number.isFinite(n) ? n : null } : i))
  }

  async function saveCapture() {
    if (!detail) return
    setSaving(true)
    try {
      const payload = items.filter((i) => i.countedQty !== null && i.countedQty !== undefined).map((i) => ({ id: i.id, countedQty: i.countedQty as number }))
      await api_countAction(detail.id, 'GUARDAR', payload, user.name)
      toast({ title: 'Captura guardada', description: `${payload.length} lotes contados hasta ahora` })
      await openDetail(detail)
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error guardando', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function applyCount() {
    if (!detail) return
    setSaving(true)
    try {
      const payload = items.filter((i) => i.countedQty !== null && i.countedQty !== undefined).map((i) => ({ id: i.id, countedQty: i.countedQty as number }))
      const res = await api_countAction(detail.id, 'APLICAR', payload, user.name)
      const applied = res as InventoryCount
      toast({ title: 'Ajustes aplicados al kardex', description: `${applied.differences ?? 0} diferencia(s) ajustadas` })
      setConfirmApply(false)
      setDetail(null)
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error aplicando', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function cancelCount() {
    if (!detail) return
    try {
      await api_countAction(detail.id, 'CANCELAR', [], user.name)
      toast({ title: 'Conteo cancelado' })
      setDetail(null)
      await load()
    } catch {
      toast({ title: 'Error cancelando', variant: 'destructive' })
    }
  }

  const counted = items.filter((i) => i.countedQty !== null && i.countedQty !== undefined).length
  const diffs = items.filter((i) => i.countedQty !== null && i.countedQty !== undefined && i.countedQty !== i.systemQty).length
  const visibleItems = onlyDiff ? items.filter((i) => i.countedQty !== null && i.countedQty !== undefined && i.countedQty !== i.systemQty) : items

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conteo Físico de Inventario</h1>
          <p className="text-muted-foreground text-sm">Tomas de inventario · las diferencias se ajustan automáticamente al kardex</p>
        </div>
        {user.role !== 'VENDEDOR' && (
          <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Nueva toma de inventario</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conteo</TableHead>
                  <TableHead className="hidden md:table-cell">Responsable</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead className="text-center">Lotes</TableHead>
                  <TableHead className="text-center">Diferencias</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs font-medium">{c.countNumber}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{c.user?.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{fmtDateTime(c.createdAt)}</TableCell>
                    <TableCell className="text-center">{c.totalLots}</TableCell>
                    <TableCell className="text-center">{c.status === 'APLICADO' ? c.differences : '—'}</TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                    <TableCell className="text-right">
                      {c.status === 'EN_PROCESO' ? (
                        <Button size="sm" variant="outline" className="h-8 text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => openDetail(c)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Continuar
                        </Button>
                      ) : (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openDetail(c)}><Eye className="h-3.5 w-3.5" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {counts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No hay tomas de inventario registradas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Nueva toma */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva toma de inventario</DialogTitle>
            <DialogDescription>Se tomará una foto del stock actual de todos los lotes para contar contra ella</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Alcance</Label>
              <Select value={createCategory} onValueChange={setCreateCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos los productos</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>Categoría: {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Notas (opcional)</Label><Input value={createNotes} onChange={(e) => setCreateNotes(e.target.value)} placeholder="Ej.: conteo mensual de estantería A" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={create} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Creando...' : 'Crear conteo'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle / captura */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-emerald-600" /> Conteo {detail.countNumber}</DialogTitle>
                <DialogDescription>
                  {detail.status === 'EN_PROCESO' ? `${counted}/${items.length} lotes contados · ${diffs} diferencia(s)` : `Estado: ${detail.status} · ${detail.differences} diferencia(s) ajustadas`}
                  {detail.notes ? ` · ${detail.notes}` : ''}
                </DialogDescription>
              </DialogHeader>

              {detail.status === 'EN_PROCESO' && (
                <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Mostrar solo diferencias encontradas</span>
                  <Switch checked={onlyDiff} onCheckedChange={setOnlyDiff} />
                </div>
              )}

              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead className="text-center">Sistema</TableHead>
                      <TableHead className="text-center">Contado</TableHead>
                      <TableHead className="text-center">Dif.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleItems.map((i) => {
                      const hasDiff = i.countedQty !== null && i.countedQty !== undefined && i.countedQty !== i.systemQty
                      return (
                        <TableRow key={i.id} className={hasDiff ? 'bg-amber-50/60' : ''}>
                          <TableCell className="text-sm font-medium max-w-56 truncate">{i.productName}</TableCell>
                          <TableCell className="font-mono text-xs">{i.lotNumber}</TableCell>
                          <TableCell className="text-center">{i.systemQty}</TableCell>
                          <TableCell className="text-center w-24">
                            {detail.status === 'EN_PROCESO' ? (
                              <Input
                                className="h-8 text-center"
                                value={i.countedQty ?? ''}
                                onChange={(e) => setCounted(i, e.target.value)}
                                inputMode="numeric"
                                placeholder="-"
                              />
                            ) : (
                              i.countedQty ?? '—'
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {i.countedQty !== null && i.countedQty !== undefined && (
                              <Badge variant={hasDiff ? 'destructive' : 'secondary'} className="text-[10px]">
                                {((i.countedQty as number) - i.systemQty) > 0 ? '+' : ''}{(i.countedQty as number) - i.systemQty}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {detail.status === 'EN_PROCESO' && (
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="ghost" className="text-red-500 sm:mr-auto" onClick={cancelCount}><RotateCcw className="h-4 w-4 mr-1" /> Cancelar conteo</Button>
                  <Button variant="outline" onClick={saveCapture} disabled={saving}>Guardar captura</Button>
                  <Button onClick={() => setConfirmApply(true)} disabled={saving || counted === 0} className="bg-emerald-600 hover:bg-emerald-700">Aplicar ajustes</Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar aplicación */}
      <AlertDialog open={confirmApply} onOpenChange={setConfirmApply}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aplicar {diffs} diferencia(s) al inventario?</AlertDialogTitle>
            <AlertDialogDescription>
              Los lotes con diferencias se ajustarán a la cantidad contada y se registrará un movimiento de AJUSTE en el kardex. Esta acción no puede revertirse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={applyCount} disabled={saving}>
              {saving ? 'Aplicando...' : 'Aplicar ajustes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
