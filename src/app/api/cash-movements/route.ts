import { db } from '@/lib/db'
import { ok, bad, num, str } from '@/lib/api-helpers'

// GET /api/cash-movements?sessionId= — movimientos de una sesión
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')
    const where = sessionId ? { cashSessionId: sessionId } : {}
    const movements = await db.cashMovement.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return ok(movements)
  } catch (e) {
    console.error('cash-movements GET', e)
    return bad('Error obteniendo movimientos de caja', 500)
  }
}

// POST /api/cash-movements — registrar ingreso o retiro de efectivo
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const type = str(b.type)
    const amount = num(b.amount, 0)
    const reason = str(b.reason)
    const userId = str(b.userId)

    if (type !== 'INGRESO' && type !== 'RETIRO') return bad('Tipo de movimiento inválido (INGRESO o RETIRO)')
    if (amount <= 0) return bad('El monto debe ser mayor a cero')
    if (!reason) return bad('Indique el motivo del movimiento')
    if (!userId) return bad('Falta el usuario')

    const session = await db.cashSession.findFirst({ where: { status: 'ABIERTA' } })
    if (!session) return bad('No hay ninguna caja abierta')

    const movement = await db.cashMovement.create({
      data: { cashSessionId: session.id, type, amount, reason, userId },
      include: { user: { select: { id: true, name: true } } },
    })
    return ok(movement)
  } catch (e) {
    console.error('cash-movements POST', e)
    return bad('Error registrando movimiento de caja', 400)
  }
}
