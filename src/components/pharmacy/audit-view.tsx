'use client'

// Bitácora de Auditoría — registro de todas las acciones del sistema
import { useCallback, useEffect, useState } from 'react'
import { api_audit, fmtDateTime } from '@/lib/pharmacy-client'
import type { AuditLogEntry } from '@/lib/pharmacy-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RefreshCcw, History, Search } from 'lucide-react'

const ACTIONS = [
  { value: 'todas', label: 'Todas las acciones' },
  { value: 'LOGIN', label: 'Inicios de sesión' },
  { value: 'LOGOUT', label: 'Cierres de sesión' },
  { value: 'VENTA', label: 'Ventas' },
  { value: 'ANULACION', label: 'Anulaciones' },
  { value: 'COMPRA', label: 'Compras' },
  { value: 'PRODUCTO', label: 'Productos' },
  { value: 'RECETA', label: 'Recetas' },
  { value: 'INTERACCION', label: 'Interacciones' },
  { value: 'CONTEO', label: 'Conteos físicos' },
  { value: 'USUARIO', label: 'Usuarios' },
  { value: 'CAMBIO_CLAVE', label: 'Cambios de contraseña' },
  { value: 'CONFIG', label: 'Configuración' },
]

const ACTION_BADGE: Record<string, string> = {
  LOGIN: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  LOGOUT: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
  VENTA: 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  ANULACION: 'bg-red-100 text-red-700 hover:bg-red-100',
  COMPRA: 'bg-sky-100 text-sky-700 hover:bg-sky-100',
  PRODUCTO: 'bg-lime-100 text-lime-700 hover:bg-lime-100',
  RECETA: 'bg-pink-100 text-pink-700 hover:bg-pink-100',
  INTERACCION: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  CONTEO: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
  USUARIO: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  CAMBIO_CLAVE: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  CONFIG: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-100',
}

export function AuditView() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [action, setAction] = useState('todas')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (a: string, s: string) => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (a !== 'todas') p.set('action', a)
      if (s) p.set('search', s)
      setLogs(await api_audit(p.toString()))
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { load(action, search).catch(() => {}) }, 200)
    return () => clearTimeout(t)
  }, [load, action, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><History className="h-6 w-6 text-purple-600" /> Bitácora de Auditoría</h1>
          <p className="text-muted-foreground text-sm">Registro cronológico de acciones realizadas en el sistema</p>
        </div>
        <Button variant="outline" onClick={() => load(action, search)}><RefreshCcw className="h-4 w-4 mr-1" /> Actualizar</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por usuario, módulo o detalle..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Fecha y hora</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="hidden md:table-cell">Módulo</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground font-mono">{fmtDateTime(l.createdAt)}</TableCell>
                    <TableCell><Badge className={ACTION_BADGE[l.action] || 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>{l.action}</Badge></TableCell>
                    <TableCell className="text-sm font-medium">{l.userName}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{l.module}</TableCell>
                    <TableCell className="text-sm max-w-md truncate">{l.detail}</TableCell>
                  </TableRow>
                ))}
                {!loading && logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground"><History className="h-8 w-8 mx-auto mb-2 opacity-40" /> No hay registros de auditoría</TableCell>
                  </TableRow>
                )}
                {loading && logs.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Cargando...</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
