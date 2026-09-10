import { db } from '@/lib/db'
import { ok, bad, num } from '@/lib/api-helpers'

// GET /api/cash-sessions/[id] — detalle con movimientos
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await db.cashSession.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        movements: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
      },
    })
    if (!session) return bad('Sesión de caja no encontrada', 404)
    return ok(session)
  } catch (e) {
    console.error('cash-sessions GET [id]', e)
    return bad('Error obteniendo sesión de caja', 500)
  }
}

// POST /api/cash-sessions/[id] — cerrar caja con arqueo
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json()
    const closingAmount = num(b.closingAmount, -1)
    if (closingAmount < 0) return bad('Debe indicar el efectivo contado')

    const result = await db.$transaction(async (tx) => {
      const session = await tx.cashSession.findUnique({ where: { id }, include: { movements: true } })
      if (!session) throw new Error('Sesión de caja no encontrada')
      if (session.status === 'CERRADA') throw new Error('Esta caja ya está cerrada')

      const cashSales = session.movements
        .filter((m: { type: string }) => m.type === 'VENTA')
        .reduce((s: number, m: { amount: number }) => s + m.amount, 0)
      const incomes = session.movements
        .filter((m: { type: string }) => m.type === 'INGRESO')
        .reduce((s: number, m: { amount: number }) => s + m.amount, 0)
      const withdraws = session.movements
        .filter((m: { type: string }) => m.type === 'RETIRO')
        .reduce((s: number, m: { amount: number }) => s + m.amount, 0)

      const expected = Math.round((session.openingAmount + cashSales + incomes - withdraws) * 100) / 100
      const difference = Math.round((closingAmount - expected) * 100) / 100

      return tx.cashSession.update({
        where: { id },
        data: { status: 'CERRADA', closedAt: new Date(), closingAmount, expectedAmount: expected, difference, notes: (b.notes as string) || session.notes },
        include: { user: { select: { id: true, name: true } }, movements: true },
      })
    })
    return ok(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error cerrando caja'
    console.error('cash-sessions POST [id]', e)
    return bad(msg, 400)
  }
}
