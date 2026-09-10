import { db } from '@/lib/db'
import { ok, bad } from '@/lib/api-helpers'
import { verifyPassword, hashPassword } from '@/lib/security'
import { logAudit } from '@/lib/audit'

// POST /api/auth/change-password — Cambio de contraseña propia
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const username = (b.username || '').trim().toLowerCase()
    const current = (b.currentPassword || '').trim()
    const next = (b.newPassword || '').trim()
    if (!username || !current || !next) return bad('Todos los campos son obligatorios')
    if (next.length < 6) return bad('La nueva contraseña debe tener al menos 6 caracteres')
    if (current === next) return bad('La nueva contraseña debe ser diferente a la actual')

    const user = await db.user.findUnique({ where: { username } })
    if (!user || !verifyPassword(current, user.password)) return bad('La contraseña actual es incorrecta', 401)

    await db.user.update({ where: { id: user.id }, data: { password: hashPassword(next) } })
    await logAudit({ userId: user.id, userName: user.name, action: 'CAMBIO_CLAVE', module: 'Autenticación', detail: 'Contraseña actualizada por el propio usuario' })

    return ok({ success: true })
  } catch {
    return bad('Error cambiando la contraseña', 500)
  }
}
