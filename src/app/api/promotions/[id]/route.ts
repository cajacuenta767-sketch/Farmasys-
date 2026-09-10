import { db } from '@/lib/db'
import { ok, bad, num, str } from '@/lib/api-helpers'

// PUT /api/promotions/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json()
    const data: Record<string, unknown> = {}
    if (b.name !== undefined) data.name = str(b.name)
    if (b.description !== undefined) data.description = str(b.description) || null
    if (b.type !== undefined) {
      if (b.type !== 'PORCENTAJE' && b.type !== 'MONTO') return bad('Tipo inválido')
      data.type = b.type
    }
    if (b.value !== undefined) {
      const v = num(b.value, 0)
      if (v <= 0) return bad('El valor debe ser mayor a cero')
      data.value = v
    }
    if (b.productId !== undefined) data.productId = str(b.productId) || null
    if (b.categoryId !== undefined) data.categoryId = str(b.categoryId) || null
    if (b.startDate !== undefined) data.startDate = b.startDate ? new Date(b.startDate as string) : null
    if (b.endDate !== undefined) data.endDate = b.endDate ? new Date(b.endDate as string) : null
    if (b.active !== undefined) data.active = !!b.active

    const promotion = await db.promotion.update({
      where: { id },
      data,
      include: {
        product: { select: { id: true, name: true, code: true } },
        category: { select: { id: true, name: true } },
      },
    })
    return ok(promotion)
  } catch (e) {
    console.error('promotions PUT [id]', e)
    return bad('Error actualizando promoción', 400)
  }
}

// DELETE /api/promotions/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.promotion.delete({ where: { id } })
    return ok({ success: true })
  } catch (e) {
    console.error('promotions DELETE [id]', e)
    return bad('Error eliminando promoción', 400)
  }
}
