import { db } from '@/lib/db'
import { ok } from '@/lib/api-helpers'

// GET /api/purchase-suggestions — Sugerencias automáticas de reabastecimiento
export async function GET() {
  try {
    const now = new Date()
    const monthAgo = new Date(now)
    monthAgo.setDate(monthAgo.getDate() - 30)

    const [products, soldItems] = await Promise.all([
      db.product.findMany({
        where: { active: true },
        include: {
          lots: { where: { quantity: { gt: 0 } } },
          supplier: { select: { id: true, name: true } },
          category: { select: { name: true } },
        },
      }),
      db.saleItem.findMany({
        where: { sale: { status: 'COMPLETADA', createdAt: { gte: monthAgo } } },
        select: { productId: true, quantity: true },
      }),
    ])

    // Venta promedio diaria por producto (últimos 30 días)
    const soldQty: Record<string, number> = {}
    for (const it of soldItems) soldQty[it.productId] = (soldQty[it.productId] || 0) + it.quantity

    const suggestions = products
      .map((p) => {
        const stock = p.lots.reduce((s, l) => s + l.quantity, 0)
        const sold30 = soldQty[p.id] || 0
        const avgDaily = sold30 / 30
        // Objetivo: cubrir 30 días de venta promedio o 2× stock mínimo (lo mayor)
        const target = Math.max(p.minStock * 2, Math.ceil(avgDaily * 30), p.minStock + 1)
        let suggested = Math.max(0, target - stock)
        const daysCover = avgDaily > 0 ? stock / avgDaily : Infinity

        let urgency = 'BAJA'
        if (stock === 0) urgency = 'AGOTADO'
        else if (stock <= Math.max(1, Math.floor(p.minStock * 0.5))) urgency = 'CRITICA'
        else if (stock <= p.minStock) urgency = 'ALTA'
        else if (daysCover < 15) urgency = 'MEDIA'
        else if (suggested === 0) return null // saludable: no sugerir nada

        if (urgency === 'CRITICA' || urgency === 'AGOTADO') suggested = Math.max(suggested, p.minStock - stock, 5)

        return {
          productId: p.id,
          code: p.code,
          name: p.name,
          category: p.category?.name,
          supplierId: p.supplier?.id || null,
          supplierName: p.supplier?.name || 'Sin proveedor asignado',
          stock,
          minStock: p.minStock,
          sold30,
          avgDaily: Math.round(avgDaily * 100) / 100,
          daysCover: Number.isFinite(daysCover) ? Math.round(daysCover) : null,
          suggested,
          urgency,
          unitCost: p.purchasePrice,
          estimatedCost: Math.round(suggested * p.purchasePrice * 100) / 100,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => {
        const order: Record<string, number> = { AGOTADO: 0, CRITICA: 1, ALTA: 2, MEDIA: 3, BAJA: 4 }
        return (order[a.urgency] ?? 9) - (order[b.urgency] ?? 9) || a.stock - b.stock
      })

    const totalEstimated = Math.round(suggestions.reduce((s, x) => s + x.estimatedCost, 0) * 100) / 100
    return ok({ suggestions, totalEstimated, generatedAt: now.toISOString() })
  } catch (e) {
    console.error('purchase-suggestions GET', e)
    return ok({ suggestions: [], totalEstimated: 0, error: 'Error calculando sugerencias' })
  }
}
