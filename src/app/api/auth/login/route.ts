import { db } from '@/lib/db'
import { ok, bad } from '@/lib/api-helpers'
import { verifyPassword, hashPassword, isHashed } from '@/lib/security'
import { logAudit } from '@/lib/audit'

// POST /api/auth/login — Inicio de sesión (migra contraseñas legacy automáticamente)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const username = (body.username || '').trim().toLowerCase()
    const password = (body.password || '').trim()
    if (!username || !password) return bad('Usuario y contraseña requeridos')

    const user = await db.user.findUnique({ where: { username } })
    if (!user || !verifyPassword(password, user.password)) return bad('Credenciales incorrectas', 401)
    if (!user.active) return bad('Usuario desactivado. Contacte al administrador', 403)

    // Migración transparente de contraseñas en texto plano a hash
    if (!isHashed(user.password)) {
      await db.user.update({ where: { id: user.id }, data: { password: hashPassword(password) } }).catch(() => {})
    }

    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {})
    await logAudit({ userId: user.id, userName: user.name, action: 'LOGIN', module: 'Autenticación', detail: `Sesión iniciada (@${user.username})` })

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
