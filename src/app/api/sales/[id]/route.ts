import { db } from '@/lib/db'
import { ok, bad } from '@/lib/api-helpers'

// GET /api/sales/[id] — detalle completo de la venta
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const sale = await db.sale.findUnique({
      where: { id },
      include: {
        items: true,
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, document: true } },
        prescriptions: true,
      },
    })
    if (!sale) return bad('Venta no encontrada', 404)
    return ok(sale)
  } catch {
    return bad('Error obteniendo venta', 500)
  }
}
