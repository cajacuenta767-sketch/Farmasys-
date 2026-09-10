import { ok } from '@/lib/api-helpers'
import { logAudit } from '@/lib/audit'

// POST /api/auth/logout — Cierre de sesión con registro de auditoría
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}))
    await logAudit({
      userId: b.userId || null,
      userName: b.userName || 'Usuario',
      action: 'LOGOUT',
      module: 'Autenticación',
      detail: 'Sesión cerrada',
    })
    return ok({ success: true })
  } catch {
    return ok({ success: true })
  }
}
