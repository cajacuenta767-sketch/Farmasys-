'use client'

// Módulo de Caja: apertura de turno, movimientos de efectivo y arqueo de cierre
import { useCallback, useEffect, useState } from 'react'
import type { SessionUser, CashSession, CashMovement } from '@/lib/pharmacy-types'
import {
  api_cashSessions, api_openCash, api_closeCash, api_cashMovements, api_addCashMovement,
} from '@/lib/pharmacy-client'
import { fmtMoney, fmtDateTime } from '@/lib/pharmacy-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Wallet, LockOpen, Lock, ArrowDownCircle, ArrowUpCircle, TrendingUp, TrendingDown } from 'lucide-react'

export function CashView({ user }: { user: SessionUser }) {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [current, setCurrent] = useState<CashSession | null>(null)
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [openDialog, setOpenDialog] = useState(false)
  const [openAmount, setOpenAmount] = useState('50')
  const [closeDialog, setCloseDialog] = useState(false)
  const [counted, setCounted] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [mvDialog, setMvDialog] = useState(false)
  const [mvType, setMvType] = useState<'INGRESO' | 'RETIRO'>('INGRESO')
  const [mvAmount, setMvAmount] = useState('')
  const [mvReason, setMvReason] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const list = await api_cashSessions()
    setSessions(list)
    const open = list.find((s) => s.status === 'ABIERTA')
    setCurrent(open || null)
    if (open) {
      const detail = await api_cashMovements(open.id)
      setMovements(detail)
    } else {
      setMovements([])
    }
  }, [])
  useEffect(() => { load().catch(() => {}) }, [load])

  const cashSales = movements.filter((m) => m.type === 'VENTA').reduce((s, m) => s + m.amount, 0)
  const incomes = movements.filter((m) => m.type === 'INGRESO').reduce((s, m) => s + m.amount, 0)
  const withdraws = movements.filter((m) => m.type === 'RETIRO').reduce((s, m) => s + m.amount, 0)
  const expected = current ? current.openingAmount + cashSales + incomes - withdraws : 0

  async function handleOpen() {
    setSaving(true)
    try {
      await api_openCash(user.id, parseFloat(openAmount) || 0)
      toast({ title: 'Caja abierta', description: `Fondo inicial: ${fmtMoney(parseFloat(openAmount) || 0)}` })
      setOpenDialog(false)
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  async function handleClose() {
    if (!current) return
    const countedN = parseFloat(counted)
    if (isNaN(countedN) || countedN < 0) {
      toast({ title: 'Ingrese el efectivo contado', variant: 'destructive' }); return
    }
    setSaving(true)
    try {
      const closed = await api_closeCash(current.id, countedN, closeNotes)
      const diff = closed.difference ?? 0
      toast({
        title: 'Caja cerrada',
        description: diff === 0
          ? 'Arqueo cuadrado perfectamente. ¡Sin diferencias!'
          : diff > 0 ? `Sobrante: ${fmtMoney(diff)}` : `Faltante: ${fmtMoney(Math.abs(diff))}`,
        variant: diff === 0 ? 'default' : 'destructive',
      })
      setCloseDialog(false); setCounted(''); setCloseNotes('')
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  async function handleMovement() {
    const amount = parseFloat(mvAmount)
    if (!mvReason.trim() || isNaN(amount) || amount <= 0) {
      toast({ title: 'Complete monto y motivo', variant: 'destructive' }); return
    }
    setSaving(true)
    try {
      await api_addCashMovement({ type: mvType, amount, reason: mvReason, userId: user.id })
      toast({ title: mvType === 'INGRESO' ? 'Ingreso registrado' : 'Retiro registrado', description: fmtMoney(amount) })
      setMvDialog(false); setMvAmount(''); setMvReason('')
      await load()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Caja y Arqueo</h1>
          <p className="text-muted-foreground text-sm">Control de efectivo por turno</p>
        </div>
        {!current ? (
          <Button onClick={() => setOpenDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <LockOpen className="h-4 w-4 mr-1" /> Abrir caja
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => setMvDialog(true)} variant="outline">
              <ArrowDownCircle className="h-4 w-4 mr-1 text-emerald-600" /> Movimiento
            </Button>
            <Button onClick={() => setCloseDialog(true)} variant="destructive">
              <Lock className="h-4 w-4 mr-1" /> Cerrar caja
            </Button>
          </div>
        )}
      </div>

      {current ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Fondo inicial</p>
              <p className="text-xl font-bold">{fmtMoney(current.openingAmount)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-500" /> Ventas en efectivo + ingresos</p>
              <p className="text-xl font-bold text-emerald-600">{fmtMoney(cashSales + incomes)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-500" /> Retiros</p>
              <p className="text-xl font-bold text-red-600">{fmtMoney(withdraws)}</p>
            </CardContent></Card>
            <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-4">
              <p className="text-xs text-emerald-700">Efectivo esperado en caja</p>
              <p className="text-2xl font-bold text-emerald-700">{fmtMoney(expected)}</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Turno abierto — {fmtDateTime(current.openedAt)} · Cajero: {current.user?.name}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Hora</TableHead><TableHead>Tipo</TableHead><TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {[...movements].reverse().map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs">{fmtDateTime(m.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={m.type === 'VENTA' ? 'border-emerald-300 text-emerald-700' : m.type === 'INGRESO' ? 'border-teal-300 text-teal-700' : 'border-red-300 text-red-700'}>
                            {m.type === 'VENTA' ? 'Venta' : m.type === 'INGRESO' ? 'Ingreso' : 'Retiro'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{m.reason}</TableCell>
                        <TableCell className={`text-right font-medium ${m.type === 'RETIRO' ? 'text-red-600' : 'text-emerald-700'}`}>
                          {m.type === 'RETIRO' ? '−' : ''}{fmtMoney(m.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {movements.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin movimientos aún en este turno</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          <Wallet className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay caja abierta</p>
          <p className="text-sm">Abra la caja para iniciar el turno y registrar ventas en efectivo.</p>
        </CardContent></Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Historial de turnos</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="max-h-72 overflow-y-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Apertura</TableHead><TableHead>Cajero</TableHead>
                <TableHead className="text-right">Apertura</TableHead><TableHead className="text-right">Esperado</TableHead>
                <TableHead className="text-right">Contado</TableHead><TableHead className="text-right">Diferencia</TableHead><TableHead>Estado</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {sessions.filter((s) => s.status === 'CERRADA').map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">{fmtDateTime(s.openedAt)}</TableCell>
                    <TableCell className="text-sm">{s.user?.name}</TableCell>
                    <TableCell className="text-right text-sm">{fmtMoney(s.openingAmount)}</TableCell>
                    <TableCell className="text-right text-sm">{s.expectedAmount != null ? fmtMoney(s.expectedAmount) : '-'}</TableCell>
                    <TableCell className="text-right text-sm">{s.closingAmount != null ? fmtMoney(s.closingAmount) : '-'}</TableCell>
                    <TableCell className={`text-right text-sm font-medium ${(s.difference ?? 0) === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {s.difference != null ? (s.difference > 0 ? '+' : '') + fmtMoney(s.difference).slice(0) : '-'}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="border-slate-300 text-slate-600">Cerrada</Badge></TableCell>
                  </TableRow>
                ))}
                {sessions.filter((s) => s.status === 'CERRADA').length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Aún no hay turnos cerrados</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Abrir caja */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Abrir caja</DialogTitle><DialogDescription>Indique el fondo inicial en efectivo</DialogDescription></DialogHeader>
          <div className="space-y-2">
            <Label>Fondo inicial *</Label>
            <Input type="number" min="0" step="0.01" value={openAmount} onChange={(e) => setOpenAmount(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
            <Button onClick={handleOpen} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Abriendo...' : 'Abrir caja'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cerrar caja */}
      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cerrar caja (arqueo)</DialogTitle>
            <DialogDescription>Efectivo esperado: {fmtMoney(expected)}. Cuente el dinero físico e ingrese el total.</DialogDescription></DialogHeader>
          <div className="space-y-2">
            <Label>Efectivo contado *</Label>
            <Input type="number" min="0" step="0.01" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="0.00" />
            <Label>Observaciones</Label>
            <Textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder="Notas del cierre..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(false)}>Cancelar</Button>
            <Button onClick={handleClose} disabled={saving} variant="destructive">{saving ? 'Cerrando...' : 'Cerrar caja'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movimiento de caja */}
      <Dialog open={mvDialog} onOpenChange={setMvDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar movimiento</DialogTitle><DialogDescription>Ingreso o retiro de efectivo en caja</DialogDescription></DialogHeader>
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={mvType} onValueChange={(v) => setMvType(v as 'INGRESO' | 'RETIRO')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="INGRESO">Ingreso de efectivo</SelectItem>
                <SelectItem value="RETIRO">Retiro de efectivo</SelectItem>
              </SelectContent>
            </Select>
            <Label>Monto *</Label>
            <Input type="number" min="0" step="0.01" value={mvAmount} onChange={(e) => setMvAmount(e.target.value)} placeholder="0.00" />
            <Label>Motivo *</Label>
            <Input value={mvReason} onChange={(e) => setMvReason(e.target.value)} placeholder="Ej: compra de insumos, deposito al banco..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMvDialog(false)}>Cancelar</Button>
            <Button onClick={handleMovement} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Guardando...' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
