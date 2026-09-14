import { db } from '@/lib/db'
import { ok, bad, num, str } from '@/lib/api-helpers'
import { sesionDe } from '@/lib/sesion'

// GET /api/cash-sessions — historial de sesiones de caja
export async function GET(req: Request) {
  try {
    // El cajero solo ve sus propios turnos de caja
    const sesion = sesionDe(req)
    const sessions = await db.cashSession.findMany({
      where: sesion?.role === 'CAJERO' ? { userId: sesion.id } : undefined,
      include: {
        user: { select: { id: true, name: true } },
        movements: true,
      },
      orderBy: { openedAt: 'desc' },
      take: 100,
    })
    return ok(sessions)
  } catch (e) {
    console.error('cash-sessions GET', e)
    return bad('Error obteniendo sesiones de caja', 500)
  }
}

// POST /api/cash-sessions — abrir turno de caja
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const userId = str(b.userId)
    const openingAmount = num(b.openingAmount, 0)
    if (!userId) return bad('Falta el usuario que abre la caja')
    if (openingAmount < 0) return bad('El monto inicial no puede ser negativo')

    const open = await db.cashSession.findFirst({ where: { status: 'ABIERTA' } })
    if (open) return bad('Ya existe una caja abierta. Debe cerrarla antes de abrir otra.')

    const session = await db.cashSession.create({
      data: { userId, openingAmount, status: 'ABIERTA' },
      include: { user: { select: { id: true, name: true } } },
    })
    return ok(session)
  } catch (e) {
    console.error('cash-sessions POST', e)
    return bad('Error abriendo caja', 400)
  }
}
