import { NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import { sesionDe, cabeceraSetCookie } from '@/lib/sesion'

// POST /api/auth/logout — Cierre de sesión: borra la cookie y deja registro en auditoría
export async function POST(req: Request) {
  const s = sesionDe(req)
  if (s) {
    await logAudit({ userId: s.id, userName: s.name, action: 'LOGOUT', module: 'Autenticación', detail: 'Sesión cerrada' })
  }
  const res = NextResponse.json({ success: true })
  res.headers.set('Set-Cookie', cabeceraSetCookie(null, req))
  return res
}
