import { db } from '@/lib/db'
import { ok, bad, num, str } from '@/lib/api-helpers'

// GET /api/promotions
export async function GET() {
  try {
    const promotions = await db.promotion.findMany({
      include: {
        product: { select: { id: true, name: true, code: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok(promotions)
  } catch (e) {
    console.error('promotions GET', e)
    return bad('Error obteniendo promociones', 500)
  }
}

// POST /api/promotions
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const name = str(b.name)
    const type = str(b.type)
    const value = num(b.value, 0)
    if (!name) return bad('Indique el nombre de la promoción')
    if (type !== 'PORCENTAJE' && type !== 'MONTO') return bad('Tipo inválido (PORCENTAJE o MONTO)')
    if (value <= 0) return bad('El valor debe ser mayor a cero')
    if (type === 'PORCENTAJE' && value > 100) return bad('El porcentaje no puede exceder 100')

    const promotion = await db.promotion.create({
      data: {
        name,
        description: str(b.description) || null,
        type,
        value,
        productId: str(b.productId) || null,
        categoryId: str(b.categoryId) || null,
        startDate: b.startDate ? new Date(b.startDate as string) : null,
        endDate: b.endDate ? new Date(b.endDate as string) : null,
        active: b.active !== false,
      },
      include: {
        product: { select: { id: true, name: true, code: true } },
        category: { select: { id: true, name: true } },
      },
    })
    return ok(promotion)
  } catch (e) {
    console.error('promotions POST', e)
    return bad('Error creando promoción', 400)
  }
}
