import { db } from '@/lib/db'
import { ok } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

function daysUntil(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / (24 * 3600 * 1000))
}

// GET /api/alerts — centro consolidado de alertas de la farmacia
export async function GET() {
  try {
    const [products, lots, pendingPurchases, openQuotations, openCash] = await Promise.all([
      db.product.findMany({
        where: { active: true },
        include: { category: { select: { name: true } }, lots: { where: { quantity: { gt: 0 } } } },
      }),
      db.lot.findMany({
        where: { quantity: { gt: 0 }, expiryDate: { lte: new Date(Date.now() + 180 * 24 * 3600 * 1000) } },
        include: { product: { select: { id: true, name: true, code: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
      db.purchase.count({ where: { status: 'PENDIENTE' } }),
      db.quotation.count({ where: { status: 'PENDIENTE' } }),
      db.cashSession.findFirst({ where: { status: 'ABIERTA' }, include: { user: { select: { name: true } } } }),
    ])

    const lowStock = products
      .map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        category: p.category?.name,
        stock: p.lots.reduce((s, l) => s + l.quantity, 0),
        minStock: p.minStock,
      }))
      .filter((p) => p.stock <= p.minStock)
      .map((p) => ({
        ...p,
        severity: p.stock === 0 ? 'CRITICA' : 'ADVERTENCIA',
        message: p.stock === 0 ? `Sin existencias de ${p.name}` : `Stock bajo de ${p.name}: ${p.stock} uds (mínimo ${p.minStock})`,
      }))

    const expired = lots.filter((l) => daysUntil(l.expiryDate) <= 0)
    const expiringSoon = lots.filter((l) => {
      const d = daysUntil(l.expiryDate)
      return d > 0 && d <= 90
    })

    const alerts = [
      ...lowStock.map((a) => ({ type: 'STOCK', ...a })),
      ...expired.map((l) => ({
        type: 'CADUCIDAD' as const,
        severity: 'CRITICA',
        id: l.id,
        code: l.product.code,
        name: `${l.product.name} (Lote ${l.lotNumber})`,
        message: `Lote ${l.lotNumber} de ${l.product.name} VENCIDO hace ${Math.abs(daysUntil(l.expiryDate))} días — ${l.quantity} uds deben retirarse del inventario`,
        stock: l.quantity,
      })),
      ...expiringSoon.map((l) => ({
        type: 'CADUCIDAD' as const,
        severity: daysUntil(l.expiryDate) <= 30 ? 'ADVERTENCIA' : 'INFO',
        id: l.id,
        code: l.product.code,
        name: `${l.product.name} (Lote ${l.lotNumber})`,
        message: `Lote ${l.lotNumber} de ${l.product.name} vence en ${daysUntil(l.expiryDate)} días — ${l.quantity} uds en stock`,
        stock: l.quantity,
      })),
    ]

    return ok({
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === 'CRITICA').length,
      warning: alerts.filter((a) => a.severity === 'ADVERTENCIA').length,
      info: alerts.filter((a) => a.severity === 'INFO').length,
      alerts,
      pendingPurchases,
      openQuotations,
      openCash: openCash ? { id: openCash.id, openedAt: openCash.openedAt, user: openCash.user?.name } : null,
    })
  } catch (e) {
    console.error('alerts GET', e)
    return ok({ total: 0, critical: 0, warning: 0, info: 0, alerts: [], pendingPurchases: 0, openQuotations: 0, openCash: null })
  }
}
