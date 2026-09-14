// Proxy de Next.js (corre en Node.js): protege toda la API.
//   1. Sin licencia CONTROL válida → 402 (solo quedan libres /api/licencia y /api/salud).
//   2. Sin sesión → 401 (salvo login, arranque inicial y licencia).
//   3. Con sesión pero sin permiso para esa ruta/método según el rol → 403.
import { NextResponse, type NextRequest } from 'next/server'
import { estadoLicencia, latidoSiHaceFalta } from '@/lib/licencia'
import { sesionDe } from '@/lib/sesion'
import { esRutaLibre, puedeLlamarApi } from '@/lib/permisos'

export default function proxy(req: NextRequest) {
  const ruta = req.nextUrl.pathname
  if (ruta.startsWith('/api/licencia') || ruta === '/api/salud') return NextResponse.next()

  const lic = estadoLicencia()
  latidoSiHaceFalta()
  if (!lic.valido) {
    return NextResponse.json({ error: 'Licencia no válida', motivo: lic.motivo, codigo: lic.codigo || 'licencia' }, { status: 402 })
  }

  if (esRutaLibre(ruta)) return NextResponse.next()

  const sesion = sesionDe(req)
  if (!sesion) return NextResponse.json({ error: 'Sesión requerida', codigo: 'sesion' }, { status: 401 })
  if (!puedeLlamarApi(sesion.role, ruta, req.method)) {
    return NextResponse.json({ error: 'Tu rol no permite esta acción', codigo: 'rol' }, { status: 403 })
  }

  const headers = new Headers(req.headers)
  headers.set('x-usuario-id', sesion.id)
  headers.set('x-usuario-rol', sesion.role)
  const res = NextResponse.next({ request: { headers } })
  if (lic.payload?.estado === 'mora') res.headers.set('X-Licencia-Aviso', 'Licencia vencida: renueva antes de que se suspenda')
  return res
}

export const config = { matcher: ['/api/:path*'] }
