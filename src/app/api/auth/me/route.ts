import { ok, bad } from '@/lib/api-helpers'
import { sesionDe } from '@/lib/sesion'

// GET /api/auth/me — usuario de la sesión actual (cookie firmada)
export async function GET(req: Request) {
  const s = sesionDe(req)
  if (!s) return bad('Sin sesión', 401)
  return ok({ id: s.id, username: s.username, name: s.name, role: s.role })
}
