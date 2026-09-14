// Sesión firmada en cookie httpOnly. El servidor es la autoridad sobre quién es el usuario y su rol.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { leerJson, guardarJson } from '@/lib/datos'
import type { Rol } from '@/lib/permisos'

export const COOKIE_SESION = 'farmasys_sesion'
const DURACION_MS = 7 * 24 * 3600 * 1000

export interface SesionUsuario {
  id: string
  username: string
  name: string
  role: Rol
  exp: number
}

let secreto: string | null = null

/** SESSION_SECRET del entorno; si no existe, se genera una vez y se guarda en data/secreto.json. */
function obtenerSecreto(): string {
  if (secreto) return secreto
  if (process.env.SESSION_SECRET) { secreto = process.env.SESSION_SECRET; return secreto }
  const guardado = leerJson<{ secreto: string }>('secreto.json')
  if (guardado?.secreto) { secreto = guardado.secreto; return secreto }
  secreto = randomBytes(32).toString('base64url')
  guardarJson('secreto.json', { secreto, creado_en: new Date().toISOString() })
  return secreto
}

const firmar = (cuerpo: string) => createHmac('sha256', obtenerSecreto()).update(cuerpo).digest('base64url')

export function crearTokenSesion(u: Omit<SesionUsuario, 'exp'>): string {
  const cuerpo = Buffer.from(JSON.stringify({ ...u, exp: Date.now() + DURACION_MS })).toString('base64url')
  return `${cuerpo}.${firmar(cuerpo)}`
}

export function leerTokenSesion(token: string | undefined | null): SesionUsuario | null {
  if (!token || !token.includes('.')) return null
  const [cuerpo, firma] = token.split('.')
  const esperada = firmar(cuerpo)
  if (firma.length !== esperada.length || !timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null
  try {
    const s = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8')) as SesionUsuario
    if (!s.id || !s.role || s.exp < Date.now()) return null
    return s
  } catch {
    return null
  }
}

export function leerCookie(cabeceraCookie: string | null | undefined, nombre: string): string | undefined {
  for (const par of (cabeceraCookie || '').split(';')) {
    const i = par.indexOf('=')
    if (i > 0 && par.slice(0, i).trim() === nombre) return decodeURIComponent(par.slice(i + 1).trim())
  }
  return undefined
}

/** Usuario de la petición actual (cookie firmada) o null. */
export function sesionDe(req: Request): SesionUsuario | null {
  return leerTokenSesion(leerCookie(req.headers.get('cookie'), COOKIE_SESION))
}

export function cabeceraSetCookie(token: string | null, req?: Request): string {
  const seguro = req ? new URL(req.url).protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https' : false
  const partes = [`${COOKIE_SESION}=${token ? encodeURIComponent(token) : ''}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${token ? Math.floor(DURACION_MS / 1000) : 0}`]
  if (seguro) partes.push('Secure')
  return partes.join('; ')
}
