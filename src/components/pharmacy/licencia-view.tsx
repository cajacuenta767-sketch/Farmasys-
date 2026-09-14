'use client'

// Pantalla estándar "Licencia" (misma en todos los productos de la agencia, ver sdk/pantalla-licencia de CONTROL):
// estado, clave, plan, vence, soporte hasta, funciona sin internet hasta, equipo, versión,
// botón "Reactivar / verificar ahora" y campo para el código de emergencia (72 h).
import { useCallback, useEffect, useState } from 'react'
import { api_licencia, api_licenciaActivar, api_licenciaReactivar, api_licenciaEmergencia, api_dispositivos, api_quitarDispositivo, fmtDate, fmtDateTime } from '@/lib/pharmacy-client'
import type { ResumenLicencia, DispositivoVinculado } from '@/lib/licencia-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Cross, KeyRound, RefreshCw, LifeBuoy, ShieldCheck, ShieldAlert, Monitor, Smartphone, Trash2 } from 'lucide-react'

const ESTADOS: Record<string, string> = {
  activa: 'Licencia activa', mora: 'Licencia vencida: renueva pronto', pendiente_pago: 'Pago pendiente de confirmación',
  suspendida: 'Licencia suspendida', vencida: 'Licencia vencida', revocada: 'Licencia revocada', no_encontrada: 'Clave no encontrada',
  max_activaciones: 'Activada en otro equipo', producto_incorrecto: 'La clave es de otro producto', no_activada: 'Equipo no activado',
}

export function LicenciaView({ inicial, bloqueante = false, onValida, puedeCambiar = true }: {
  inicial?: ResumenLicencia | null
  bloqueante?: boolean
  onValida?: () => void
  puedeCambiar?: boolean
}) {
  const [r, setR] = useState<ResumenLicencia | null>(inicial ?? null)
  const [clave, setClave] = useState('')
  const [url, setUrl] = useState('')
  const [codigo, setCodigo] = useState('')
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [cargando, setCargando] = useState<string | null>(null)
  const [cambiar, setCambiar] = useState(false)
  const [dispositivos, setDispositivos] = useState<DispositivoVinculado[]>([])

  useEffect(() => {
    if (!bloqueante) api_dispositivos().then(setDispositivos).catch(() => {})
  }, [bloqueante])

  async function desvincular(huella: string) {
    try { setDispositivos(await api_quitarDispositivo(huella)) } catch (e) { setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : 'Error' }) }
  }

  const cargar = useCallback(async () => {
    const d = await api_licencia()
    setR(d)
    if (!clave && d.clave) setClave(d.clave)
    if (!url && d.url) setUrl(d.url)
  }, [clave, url])

  useEffect(() => { cargar().catch(() => {}) }, [cargar])

  function aplicar(d: ResumenLicencia & { resultado?: string }) {
    setR(d)
    setAviso({ tipo: d.valido ? 'ok' : 'error', texto: d.resultado || (d.valido ? 'Licencia verificada.' : d.motivo || 'Licencia no válida') })
    if (d.valido) onValida?.()
  }

  async function ejecutar(nombre: string, fn: () => Promise<ResumenLicencia & { resultado?: string }>) {
    setCargando(nombre)
    setAviso(null)
    try { aplicar(await fn()) }
    catch (e) { setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : 'Error' }) }
    finally { setCargando(null) }
  }

  const valido = Boolean(r?.valido)
  const titulo = !r ? 'Cargando…' : r.desarrollo ? 'Modo desarrollo (sin CONTROL)' : !r.configurada ? 'Sin licencia' : valido ? ESTADOS[r.estado] || 'Licencia activa' : ESTADOS[r.estado] || 'Licencia no válida'
  const tono = !r || !r.configurada ? 'bg-slate-500' : valido ? (r.estado === 'mora' ? 'bg-amber-600' : 'bg-emerald-600') : 'bg-red-600'
  const mostrarFormulario = Boolean(r && (!r.configurada || cambiar))

  const contenido = (
    <div className="space-y-4">
      {aviso && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${aviso.tipo === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>{aviso.texto}</div>
      )}
      {r && !valido && r.motivo && !aviso && (
        <div className="rounded-lg border bg-amber-50 border-amber-200 px-3 py-2 text-sm text-amber-800">{r.motivo}</div>
      )}
      {r?.desactualizada && (
        <div className="rounded-lg border bg-amber-50 border-amber-200 px-3 py-2 text-sm text-amber-800">
          Hay una versión nueva ({r.version_actual}); esta instalación tiene la {r.version}. Pide la actualización a tu asesor.
        </div>
      )}

      {mostrarFormulario && (
        <div className="rounded-lg border p-4 space-y-3 bg-slate-50">
          <p className="text-sm font-medium flex items-center gap-2"><KeyRound className="h-4 w-4 text-emerald-600" /> {r?.configurada ? 'Cambiar clave o servidor' : 'Activar esta instalación'}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Clave de licencia</Label>
              <Input value={clave} onChange={(e) => setClave(e.target.value.toUpperCase())} placeholder="CTL-XXXX-XXXX-XXXX-XXXX" className="font-mono" autoComplete="off" />
            </div>
            <div className="space-y-1">
              <Label>Servidor CONTROL de tu asesor</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://control.tuagencia.com" autoComplete="off" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={cargando !== null || !clave || !url} onClick={() => ejecutar('activar', () => api_licenciaActivar(clave, url))}>
              <ShieldCheck className="h-4 w-4 mr-1" /> {cargando === 'activar' ? 'Activando…' : 'Activar licencia'}
            </Button>
            {r?.configurada && <Button variant="outline" onClick={() => setCambiar(false)}>Cancelar</Button>}
          </div>
        </div>
      )}

      {r && (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Clave</dt><dd><code className="rounded bg-slate-100 px-1.5 py-0.5">{r.clave || '—'}</code></dd>
          <dt className="text-muted-foreground">Plan</dt><dd>{[r.plan, r.etiqueta].filter(Boolean).join(' · ') || '—'}</dd>
          <dt className="text-muted-foreground">Vence</dt><dd>{r.vence_en ? fmtDate(r.vence_en) : valido ? 'Nunca' : '—'}</dd>
          <dt className="text-muted-foreground">Soporte hasta</dt><dd>{r.soporte_hasta ? fmtDate(r.soporte_hasta) : '—'}</dd>
          <dt className="text-muted-foreground">Funciona sin internet hasta</dt><dd>{r.sin_conexion_hasta ? fmtDateTime(r.sin_conexion_hasta) : '—'}{r.emergencia ? ' (código de emergencia)' : ''}</dd>
          <dt className="text-muted-foreground">Equipo</dt><dd className="flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5 text-muted-foreground" /><code className="rounded bg-slate-100 px-1.5 py-0.5 break-all">{r.huella}</code><span className="text-xs text-muted-foreground">({r.plataforma})</span></dd>
          <dt className="text-muted-foreground">Versión</dt><dd>{r.version}{r.version_actual ? ` · actual ${r.version_actual}` : ''}</dd>
          <dt className="text-muted-foreground">Servidor</dt><dd className="break-all">{r.url || '—'}</dd>
          <dt className="text-muted-foreground">Último latido</dt><dd>{r.ultimo_latido ? fmtDateTime(r.ultimo_latido) : '—'}</dd>
        </dl>
      )}

      {r?.configurada && (
        <div className="flex flex-wrap gap-2">
          <Button className="bg-blue-700 hover:bg-blue-800" disabled={cargando !== null} onClick={() => ejecutar('reactivar', api_licenciaReactivar)}>
            <RefreshCw className={`h-4 w-4 mr-1 ${cargando === 'reactivar' ? 'animate-spin' : ''}`} /> Reactivar / verificar ahora
          </Button>
          {puedeCambiar && !cambiar && <Button variant="outline" onClick={() => setCambiar(true)}>Cambiar clave o servidor</Button>}
        </div>
      )}

      {r?.configurada && (
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); ejecutar('emergencia', () => api_licenciaEmergencia(codigo)) }}>
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Pega aquí el código de emergencia (72 h)" className="flex-1 min-w-[220px] font-mono text-xs" required />
          <Button type="submit" variant="outline" disabled={cargando !== null || !codigo}><LifeBuoy className="h-4 w-4 mr-1" /> Aplicar</Button>
        </form>
      )}

      <p className="text-xs text-muted-foreground">Si el sistema está bloqueado, escribe a tu asesor con la clave y el identificador del equipo. Licencias gestionadas con CONTROL.</p>
    </div>
  )

  if (!bloqueante) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Licencia</h1>
            <p className="text-muted-foreground text-sm">Estado de la licencia de esta instalación de FarmaSys</p>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white ${tono}`}>{valido ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}{titulo}</span>
        </div>
        <Card><CardContent className="p-5">{contenido}</CardContent></Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-4 w-4 text-emerald-600" /> Dispositivos vinculados</CardTitle>
            <CardDescription>Equipos y teléfonos que abrieron esta instalación con el código de verificación de la licencia. Al desvincular uno, tendrá que ingresar el código de nuevo.</CardDescription>
          </CardHeader>
          <CardContent>
            {dispositivos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ningún dispositivo vinculado todavía. En la app Android se pide la dirección del servidor y el código CTL-… de esta licencia.</p>
            ) : (
              <div className="divide-y rounded-lg border">
                {dispositivos.map((d) => (
                  <div key={d.huella} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    <div className="flex-1 min-w-[200px]">
                      <p className="font-medium">{d.nombre} <span className="text-xs text-muted-foreground">({d.plataforma})</span></p>
                      <p className="text-xs text-muted-foreground">Huella <code>{d.huella}</code> · vinculado {fmtDate(d.primera_vez)} · última vez {fmtDateTime(d.ultima_vez)} · {d.verificaciones} verificaciones</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => desvincular(d.huella)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Desvincular</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-600 flex items-center justify-center"><Cross className="h-6 w-6 text-white" /></div>
            <div>
              <CardTitle className="text-xl">FarmaSys · Licencia</CardTitle>
              <CardDescription>Esta instalación necesita una licencia válida para funcionar</CardDescription>
            </div>
            <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white ${tono}`}>{titulo}</span>
          </div>
        </CardHeader>
        <CardContent>{contenido}</CardContent>
      </Card>
    </div>
  )
}
