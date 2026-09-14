// Cliente de licencias CONTROL para FarmaSys.
// Es el mismo protocolo del SDK oficial (sdk/node/control-licencia.js del repo CONTROL):
//   - activar:  POST /api/v1/licencias/activar  { clave, producto, huella, dominio?, nombre_equipo?, version }
//   - latido:   POST /api/v1/licencias/latido   { clave, huella, version }   (cada 24 h)
//   - token = base64url(payload).base64url(firma Ed25519); se verifica sin internet con la clave pública
//   - código de emergencia de 72 h: token firmado con `emergencia: true`, se acepta sin red
// El estado se guarda en data/licencia.json para que sobreviva reinicios y funcione en serverless.
import { createHash, createPublicKey, verify, type KeyObject } from 'node:crypto'
import { hostname } from 'node:os'
import { leerJson, guardarJson, fechaModificacion } from '@/lib/datos'
import { VERSION, PRODUCTO } from '@/lib/version'

const ARCHIVO = 'licencia.json'
const PREFIJO_SPKI_ED25519 = Buffer.from('302a300506032b6570032100', 'hex')
const LATIDO_MS = 24 * 3600 * 1000

export interface PayloadLicencia {
  clave: string
  producto: string
  plan?: string
  huella: string
  estado: string
  etiqueta?: string | null
  vence_en?: string | null
  soporte_hasta?: string | null
  emergencia?: boolean
  emitido_en: string
  expira_en: string
}

interface InfoLicencia {
  estado?: string
  etiqueta?: string | null
  vence_en?: string | null
  soporte_hasta?: string | null
  producto?: string
  plan?: string
  motivo?: string | null
  version_actual?: string | null
  desactualizada?: boolean
}

interface ArchivoLicencia {
  url?: string
  clave?: string
  clave_publica?: string
  huella?: string
  token?: string | null
  guardado_en?: string
  ultimo_latido?: string
  info?: InfoLicencia
  bloqueo?: { codigo?: string; motivo: string; en: string } | null
}

export interface EstadoLicencia {
  configurada: boolean
  valido: boolean
  payload: PayloadLicencia | null
  motivo: string | null
  codigo?: string
  desarrollo?: boolean
}

let cache: { mtime: number; datos: ArchivoLicencia } | null = null
let memoria: ArchivoLicencia | null = null // respaldo cuando el disco es de solo lectura
let latidoEnCurso: Promise<unknown> | null = null

function leerArchivo(): ArchivoLicencia {
  const mtime = fechaModificacion(ARCHIVO)
  if (cache && cache.mtime === mtime && mtime !== 0) return cache.datos
  const datos = leerJson<ArchivoLicencia>(ARCHIVO) || memoria || {}
  cache = { mtime, datos }
  return datos
}

function escribirArchivo(datos: ArchivoLicencia) {
  memoria = datos
  guardarJson(ARCHIVO, datos)
  cache = { mtime: fechaModificacion(ARCHIVO), datos }
}

/** Configuración efectiva: lo guardado desde la pantalla Licencia tiene prioridad sobre las variables de entorno. */
export function configuracion() {
  const a = leerArchivo()
  return {
    url: (a.url || process.env.CONTROL_URL || '').replace(/\/$/, ''),
    clave: (a.clave || process.env.CONTROL_LICENCIA || '').trim().toUpperCase(),
    clavePublica: a.clave_publica || process.env.CONTROL_CLAVE_PUBLICA || '',
  }
}

/** Huella estable del equipo o dominio (misma regla que el SDK: sha256 → 32 hex). */
export function huella(): string {
  if (process.env.CONTROL_HUELLA) return process.env.CONTROL_HUELLA
  const a = leerArchivo()
  if (a.huella) return a.huella
  const base = process.env.CONTROL_DOMINIO || process.env.VERCEL_PROJECT_PRODUCTION_URL || hostname()
  return createHash('sha256').update(base).digest('hex').slice(0, 32)
}

export const plataforma = () => process.env.FARMASYS_PLATAFORMA || (process.env.VERCEL ? 'vercel' : 'web')

function clavePublicaObjeto(valor: string): KeyObject | null {
  try {
    if (valor.includes('BEGIN PUBLIC KEY')) return createPublicKey(valor)
    return createPublicKey({ key: Buffer.concat([PREFIJO_SPKI_ED25519, Buffer.from(valor, 'base64')]), format: 'der', type: 'spki' })
  } catch {
    return null
  }
}

/** Verifica un token con la clave pública y que sea de esta clave, este producto y este equipo. */
export function verificarToken(token: unknown, opciones?: { clave?: string; clavePublica?: string; huella?: string }): PayloadLicencia | null {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const conf = configuracion()
  const publica = clavePublicaObjeto(opciones?.clavePublica ?? conf.clavePublica)
  if (!publica) return null
  const [cuerpo, firma] = token.split('.')
  try {
    if (!verify(null, Buffer.from(cuerpo), publica, Buffer.from(firma, 'base64url'))) return null
    const p = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8')) as PayloadLicencia
    if (p.clave !== (opciones?.clave ?? conf.clave) || p.producto !== PRODUCTO || p.huella !== (opciones?.huella ?? huella())) return null
    if (Date.parse(p.expira_en) < Date.now()) return null
    return p
  } catch {
    return null
  }
}

const modoDesarrollo = () => process.env.NODE_ENV !== 'production' && !configuracion().url

/**
 * Estado actual sin tocar la red: token guardado válido → funciona (gracia offline hasta expira_en).
 * Un bloqueo explícito del servidor (suspendida, vencida, revocada…) invalida aunque haya token.
 */
export function estadoLicencia(): EstadoLicencia {
  if (modoDesarrollo()) return { configurada: false, valido: true, payload: null, motivo: 'Modo desarrollo: sin CONTROL_URL configurada', desarrollo: true }
  const conf = configuracion()
  if (!conf.url || !conf.clave) return { configurada: false, valido: false, payload: null, motivo: 'Esta instalación aún no tiene licencia. Ingresa tu clave CTL-XXXX-XXXX-XXXX-XXXX.' }
  const a = leerArchivo()
  if (a.bloqueo) return { configurada: true, valido: false, payload: null, motivo: a.bloqueo.motivo, codigo: a.bloqueo.codigo }
  const p = verificarToken(a.token)
  if (p) return { configurada: true, valido: true, payload: p, motivo: null }
  return { configurada: true, valido: false, payload: null, motivo: a.token ? 'El periodo sin conexión terminó. Conéctate a internet y pulsa "Reactivar".' : 'Licencia sin activar en este equipo' }
}

async function llamar(url: string, ruta: string, cuerpo: unknown) {
  const r = await fetch(`${url}/api/v1/licencias/${ruta}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(15000),
  })
  const datos = (await r.json().catch(() => ({}))) as Record<string, unknown>
  return { ok: r.ok, status: r.status, ...datos } as { ok: boolean; status: number; token?: string; licencia?: InfoLicencia; error?: string; codigo?: string }
}

/** La clave pública se obtiene una vez de CONTROL y queda fijada; después solo se acepta lo firmado con ella. */
async function asegurarClavePublica(url: string): Promise<string> {
  const actual = configuracion().clavePublica
  if (actual) return actual
  const r = await fetch(`${url}/api/v1/licencias/clave-publica`, { signal: AbortSignal.timeout(15000) })
  if (!r.ok) throw new Error(`CONTROL respondió ${r.status} al pedir la clave pública`)
  const d = (await r.json()) as { clave_publica_base64?: string; clave_publica?: string; clave_publica_pem?: string }
  const clave = d.clave_publica_base64 || d.clave_publica || d.clave_publica_pem
  if (!clave) throw new Error('CONTROL no devolvió la clave pública')
  return clave
}

function procesarRespuesta(r: Awaited<ReturnType<typeof llamar>>, base: ArchivoLicencia): EstadoLicencia {
  const ahora = new Date().toISOString()
  if (r.ok && r.token) {
    const p = verificarToken(r.token, { clave: base.clave, clavePublica: base.clave_publica, huella: base.huella })
    if (p) {
      escribirArchivo({ ...base, token: r.token, guardado_en: ahora, ultimo_latido: ahora, info: r.licencia, bloqueo: null })
      return { configurada: true, valido: true, payload: p, motivo: null }
    }
    return { configurada: true, valido: false, payload: null, motivo: 'CONTROL devolvió un token que no verifica con la clave pública guardada' }
  }
  if (r.status === 403 || r.status === 404) {
    // Bloqueo explícito del servidor: suspendida, vencida, revocada, otro equipo, clave inexistente…
    const motivo = r.error || r.codigo || 'Licencia no válida'
    escribirArchivo({ ...base, token: null, ultimo_latido: ahora, info: r.licencia || base.info, bloqueo: { codigo: r.codigo, motivo, en: ahora } })
    return { configurada: true, valido: false, payload: null, motivo, codigo: r.codigo }
  }
  return { configurada: true, valido: false, payload: null, motivo: r.error || `CONTROL respondió ${r.status}` }
}

/** Activa (o re-valida) esta instalación. Con clave/url nuevas, reemplaza la configuración guardada. */
export async function activar(entrada?: { clave?: string; url?: string }): Promise<EstadoLicencia> {
  const previo = leerArchivo()
  const url = (entrada?.url || configuracion().url).replace(/\/$/, '')
  const clave = (entrada?.clave || configuracion().clave).trim().toUpperCase()
  if (!url || !clave) throw new Error('Faltan la URL de CONTROL o la clave de licencia')
  if (!/^CTL-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(clave)) throw new Error('La clave debe tener el formato CTL-XXXX-XXXX-XXXX-XXXX')
  const cambioServidor = previo.url && previo.url !== url
  const base: ArchivoLicencia = { ...previo, url, clave, huella: huella(), clave_publica: cambioServidor ? '' : previo.clave_publica }
  // Cambiar de servidor obliga a fijar la clave pública nueva.
  if (cambioServidor) escribirArchivo({ ...base, token: null, bloqueo: null })
  base.clave_publica = await asegurarClavePublica(url)
  const r = await llamar(url, 'activar', { clave, producto: PRODUCTO, huella: base.huella, dominio: process.env.CONTROL_DOMINIO, nombre_equipo: `${hostname()} (${plataforma()})`, version: VERSION })
  return procesarRespuesta(r, base)
}

export async function latido(): Promise<EstadoLicencia> {
  const a = leerArchivo()
  const conf = configuracion()
  if (!conf.url || !conf.clave) return estadoLicencia()
  const base: ArchivoLicencia = { ...a, url: conf.url, clave: conf.clave, clave_publica: conf.clavePublica, huella: huella() }
  const r = await llamar(conf.url, 'latido', { clave: conf.clave, huella: base.huella, version: VERSION })
  return procesarRespuesta(r, base)
}

/** Latido en segundo plano si pasaron más de 24 h desde el último. No bloquea la petición. */
export function latidoSiHaceFalta(): void {
  if (modoDesarrollo() || latidoEnCurso) return
  const conf = configuracion()
  if (!conf.url || !conf.clave) return
  const a = leerArchivo()
  const ultimo = a.ultimo_latido ? Date.parse(a.ultimo_latido) : 0
  if (Date.now() - ultimo < LATIDO_MS) return
  latidoEnCurso = latido().catch(() => null).finally(() => { latidoEnCurso = null })
}

/** Código de emergencia (72 h) emitido desde CONTROL para este equipo: se verifica y se guarda como token. */
export function aplicarCodigoEmergencia(codigo: unknown): { ok: boolean; motivo?: string; expira_en?: string } {
  const c = String(codigo || '').trim()
  const p = verificarToken(c)
  if (!p || !p.emergencia) return { ok: false, motivo: p ? 'Ese código no es de emergencia' : 'Código inválido, vencido o de otro equipo' }
  const a = leerArchivo()
  escribirArchivo({ ...a, token: c, guardado_en: new Date().toISOString(), bloqueo: null })
  return { ok: true, expira_en: p.expira_en }
}

/** Resumen para la pantalla estándar "Licencia" (mismos campos que el SDK). */
export function resumen() {
  const e = estadoLicencia()
  const a = leerArchivo()
  const p = e.payload
  const conf = configuracion()
  return {
    configurada: e.configurada,
    desarrollo: Boolean(e.desarrollo),
    valido: e.valido,
    estado: p?.estado || e.codigo || a.info?.estado || 'desconocido',
    motivo: e.motivo,
    clave: conf.clave || null,
    url: conf.url || null,
    producto: PRODUCTO,
    plan: p?.plan || a.info?.plan || null,
    etiqueta: p?.etiqueta || a.info?.etiqueta || null,
    huella: huella(),
    plataforma: plataforma(),
    vence_en: p?.vence_en || a.info?.vence_en || null,
    soporte_hasta: p?.soporte_hasta || a.info?.soporte_hasta || null,
    sin_conexion_hasta: p?.expira_en || null,
    emergencia: Boolean(p?.emergencia),
    version: VERSION,
    version_actual: a.info?.version_actual || null,
    desactualizada: Boolean(a.info?.desactualizada),
    ultimo_latido: a.ultimo_latido || null,
  }
}

export type ResumenLicencia = ReturnType<typeof resumen>
