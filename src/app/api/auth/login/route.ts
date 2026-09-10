import { db } from '@/lib/db'
import { ok, bad } from '@/lib/api-helpers'

// POST /api/auth/login — Inicio de sesión
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const username = (body.username || '').trim().toLowerCase()
    const password = (body.password || '').trim()
    if (!username || !password) return bad('Usuario y contraseña requeridos')

    const user = await db.user.findUnique({ where: { username } })
    if (!user || user.password !== password) return bad('Credenciales incorrectas', 401)
    if (!user.active) return bad('Usuario desactivado. Contacte al administrador', 403)

    return ok({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    })
  } catch {
    return bad('Error al iniciar sesión', 500)
  }
}
