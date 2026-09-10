import { db } from '@/lib/db'
import { ok, bad } from '@/lib/api-helpers'
import { logAudit } from '@/lib/audit'

// POST /api/purchases/[id]/cancel — Cancelar orden pendiente
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userName = new URL(_req.url).searchParams.get('userName') || 'Usuario'
    const purchase = await db.purchase.findUnique({ where: { id } })
    if (!purchase) return bad('Compra no encontrada', 404)
    if (purchase.status !== 'PENDIENTE') return bad('Solo se pueden cancelar órdenes pendientes')
    await db.purchase.update({ where: { id }, data: { status: 'CANCELADA' } })
    await logAudit({ userName, action: 'COMPRA', module: 'Inventario', detail: `Orden ${purchase.orderNumber} cancelada` })
    return ok({ success: true })
  } catch {
    return bad('Error cancelando la compra', 500)
  }
}
