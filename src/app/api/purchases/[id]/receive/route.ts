import { db } from '@/lib/db'
import { ok, bad, num } from '@/lib/api-helpers'

// POST /api/purchases/[id]/receive — Recibir mercancía: crea/actualiza lotes e ingresa al inventario
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const purchase = await db.purchase.findUnique({ where: { id }, include: { items: true } })
    if (!purchase) return bad('Compra no encontrada', 404)
    if (purchase.status !== 'PENDIENTE') return bad('Esta compra ya fue procesada')

    await db.$transaction(async (tx) => {
      for (const item of purchase.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product) continue

        // Generar número de lote si no se especificó
        const lotNumber = item.lotNumber || `L-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
        const expiryDate = item.expiryDate || new Date(Date.now() + 730 * 24 * 3600 * 1000) // +2 años por defecto

        const existing = await tx.lot.findFirst({ where: { productId: item.productId, lotNumber } })
        if (existing) {
          await tx.lot.update({
            where: { id: existing.id },
            data: { quantity: { increment: item.quantity }, expiryDate, purchasePrice: num(item.unitCost, existing.purchasePrice) },
          })
        } else {
          await tx.lot.create({
            data: {
              productId: item.productId,
              lotNumber,
              quantity: item.quantity,
              expiryDate,
              purchasePrice: item.unitCost,
            },
          })
        }
        // Actualizar último costo de compra
        await tx.product.update({ where: { id: item.productId }, data: { purchasePrice: item.unitCost } })
      }

      await tx.purchase.update({
        where: { id },
        data: { status: 'RECIBIDA', receivedAt: new Date() },
      })
    })

    return ok({ success: true })
  } catch (e) {
    console.error('purchase receive', e)
    return bad('Error recibiendo la compra', 500)
  }
}
