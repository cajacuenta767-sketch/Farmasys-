'use client'

// Gestión de Usuarios y Roles
import { useCallback, useEffect, useState } from 'react'
import { api_users, api_createUser, api_updateUser, api_deleteUser, fmtDateTime } from '@/lib/pharmacy-client'
import type { SystemUser } from '@/lib/pharmacy-types'
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
import { Plus, Pencil, Trash2, UserCog, ShieldCheck } from 'lucide-react'

import { ROLES as LISTA_ROLES, ETIQUETA_ROL, DESCRIPCION_ROL, MODULES_BY_ROLE } from '@/lib/permisos'

const ROLES = LISTA_ROLES.map((r) => ({ value: r, label: ETIQUETA_ROL[r], desc: DESCRIPCION_ROL[r], modulos: MODULES_BY_ROLE[r].length }))

const empty = { username: '', password: '', name: '', role: 'CAJERO', email: '', phone: '', active: true }

export function UsersView({ currentUserId }: { currentUserId: string }) {
  const { toast } = useToast()
  const [users, setUsers] = useState<SystemUser[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SystemUser | null>(null)
  const [form, setForm] = useState(empty)
  const [toDelete, setToDelete] = useState<SystemUser | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setUsers(await api_users())
  }, [])
  useEffect(() => { load().catch(() => {}) }, [load])

  async function save() {
    if (!form.name.trim() || !form.username.trim()) {
      toast({ title: 'Datos incompletos', description: 'Usuario y nombre son obligatorios', variant: 'destructive' })
      return
    }
    if (!editing && !form.password) {
      toast({ title: 'Defina una contraseña', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api_updateUser(editing.id, form)
        toast({ title: 'Usuario actualizado' })
      } else {
        await api_createUser(form)
        toast({ title: 'Usuario creado', description: form.name })
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
    if (toDelete.id === currentUserId) {
      toast({ title: 'No puede eliminar su propio usuario', variant: 'destructive' })
      setToDelete(null)
      return
    }
    try {
      await api_deleteUser(toDelete.id)
      toast({ title: 'Usuario eliminado/desactivado' })
      await load()
    } catch {
      toast({ title: 'Error eliminando usuario', variant: 'destructive' })
    } finally {
      setToDelete(null)
    }
  }

  async function toggleActive(u: SystemUser) {
    try {
      await api_updateUser(u.id, { ...u, active: !u.active, password: '' })
      await load()
    } catch {
      toast({ title: 'Error cambiando estado', variant: 'destructive' })
    }
  }

  const roleBadge = (role: string) => {
    if (role === 'ADMIN') return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Administrador</Badge>
    if (role === 'FARMACEUTICO') return <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100">Farmacéutico</Badge>
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Cajero</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios y Roles</h1>
          <p className="text-muted-foreground text-sm">{users.length} usuarios del sistema · cada rol ve solo su espacio</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(empty); setDialogOpen(true) }} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Nuevo usuario
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r.value} className="rounded-lg border bg-white p-3">
            <div className="flex items-center justify-between">{roleBadge(r.value)}<span className="text-xs text-muted-foreground">{r.modulos} módulos</span></div>
            <p className="mt-2 text-xs text-muted-foreground">{r.desc}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="hidden md:table-cell">Contacto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">Último acceso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{u.name} {u.id === currentUserId && <span className="text-xs text-muted-foreground">(tú)</span>}</p>
                      <p className="text-xs font-mono text-muted-foreground">@{u.username}</p>
                    </TableCell>
                    <TableCell>{roleBadge(u.role)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{u.email || u.phone || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={u.active} onCheckedChange={() => toggleActive(u)} disabled={u.id === currentUserId} />
                        <span className="text-xs text-muted-foreground">{u.active ? 'Activo' : 'Inactivo'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : <span className="opacity-50">Nunca</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                          setEditing(u)
                          setForm({ username: u.username, password: '', name: u.name, role: u.role, email: u.email || '', phone: u.phone || '', active: u.active })
                          setDialogOpen(true)
                        }}><Pencil className="h-3.5 w-3.5" /></Button>
                        {u.id !== currentUserId && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setToDelete(u)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserCog className="h-5 w-5 text-emerald-600" /> {editing ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Deje la contraseña vacía para mantenerla' : 'Credenciales de acceso al sistema'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Usuario *</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!editing} /></div>
              <div className="space-y-1"><Label>Contraseña {editing ? '' : '*'}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? 'Sin cambios' : '••••••'} /></div>
            </div>
            <div className="space-y-1"><Label>Nombre completo *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <span className="font-medium">{r.label}</span> <span className="text-muted-foreground text-xs">· {r.modulos} módulos</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1"><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <p className="text-xs text-muted-foreground flex-1">El rol define los módulos visibles según el principio de menor privilegio.</p>
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
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>&quot;{toDelete?.name}&quot; será eliminado o desactivado si tiene ventas registradas.</AlertDialogDescription>
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
