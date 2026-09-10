import { db } from '@/lib/db'
import { ok, bad } from '@/lib/api-helpers'

// GET /api/reports?type=ventas|top-productos|stock-bajo|vencimientos&from=&to=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'ventas'
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const now = new Date()
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    const fromDate = from ? new Date(`${from}T00:00:00`) : defaultFrom
    const toDate = to ? new Date(`${to}T23:59:59`) : now

    if (type === 'ventas') {
      const where = { status: 'COMPLETADA', createdAt: { gte: fromDate, lte: toDate } }
      const [agg, byDay, byPayment, bySeller, count] = await Promise.all([
        db.sale.aggregate({ _sum: { total: true, subtotal: true, tax: true, discount: true }, where }),
        db.sale.findMany({ where, select: { createdAt: true, total: true } }),
        db.sale.groupBy({ by: ['paymentMethod'], _sum: { total: true }, _count: true, where }),
        db.sale.groupBy({ by: ['userId'], _sum: { total: true }, _count: true, where }),
        db.sale.count({ where }),
      ])
      const dayMap: Record<string, { total: number; count: number }> = {}
      for (const s of byDay) {
        const k = `${String(s.createdAt.getDate()).padStart(2, '0')}/${String(s.createdAt.getMonth() + 1).padStart(2, '0')}`
        if (!dayMap[k]) dayMap[k] = { total: 0, count: 0 }
        dayMap[k].total += s.total
        dayMap[k].count += 1
      }
      const sellers = await db.user.findMany({ select: { id: true, name: true } })
      const bySellerNamed = bySeller.map((s) => ({
        seller: sellers.find((u) => u.id === s.userId)?.name || 'Desconocido',
        total: s._sum.total || 0,
        count: s._count,
      }))
      return ok({
        summary: {
          total: agg._sum.total || 0,
          subtotal: agg._sum.subtotal || 0,
          tax: agg._sum.tax || 0,
          discount: agg._sum.discount || 0,
          count,
        },
        byDay: Object.entries(dayMap).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
        byPayment: byPayment.map((p) => ({ method: p.paymentMethod, total: p._sum.total || 0, count: p._count })),
        bySeller: bySellerNamed.sort((a, b) => b.total - a.total),
      })
    }

    if (type === 'top-productos') {
      const items = await db.saleItem.findMany({
        where: { sale: { status: 'COMPLETADA', createdAt: { gte: fromDate, lte: toDate } } },
        select: { productName: true, quantity: true, subtotal: true, unitPrice: true },
      })
      const map: Record<string, { name: string; qty: number; revenue: number }> = {}
      for (const it of items) {
        if (!map[it.productName]) map[it.productName] = { name: it.productName, qty: 0, revenue: 0 }
        map[it.productName].qty += it.quantity
        map[it.productName].revenue += it.subtotal
      }
      const top = Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 20)
      return ok({ top })
    }

    if (type === 'stock-bajo') {
      const products = await db.product.findMany({
        where: { active: true },
        include: { lots: { where: { quantity: { gt: 0 } } }, category: { select: { name: true } }, supplier: { select: { name: true } } },
      })
      const low = products
        .map((p) => ({ ...p, stock: p.lots.reduce((s, l) => s + l.quantity, 0) }))
        .filter((p) => p.stock <= p.minStock)
        .sort((a, b) => a.stock - b.stock)
        .map((p) => ({
          code: p.code,
          name: p.name,
          category: p.category?.name,
          supplier: p.supplier?.name,
          stock: p.stock,
          minStock: p.minStock,
        }))
      return ok({ low })
    }

    if (type === 'vencimientos') {
      const lots = await db.lot.findMany({
        where: { quantity: { gt: 0 }, expiryDate: { lte: new Date(now.getTime() + 365 * 24 * 3600 * 1000) } },
        include: { product: { include: { category: { select: { name: true } } } } },
        orderBy: { expiryDate: 'asc' },
      })
      type ExpiryRow = {
        lotNumber: string
        expiryDate: Date
        quantity: number
        daysLeft: number
        code: string
        productName: string
        category?: string
        value: number
      }
      const expired: ExpiryRow[] = []
      const rows: ExpiryRow[] = lots.map((l) => {
        const daysLeft = Math.ceil((l.expiryDate.getTime() - now.getTime()) / (24 * 3600 * 1000))
        const row = {
          lotNumber: l.lotNumber,
          expiryDate: l.expiryDate,
          quantity: l.quantity,
          daysLeft,
          code: l.product.code,
          productName: l.product.name,
          category: l.product.category?.name,
          value: l.quantity * l.purchasePrice,
        }
        if (daysLeft < 0) expired.push(row)
        return row
      })
      return ok({ rows, expiredCount: expired.length, expiredValue: expired.reduce((s, r) => s + r.value, 0) })
    }

    return bad('Tipo de reporte inválido')
  } catch (e) {
    console.error('reports GET', e)
    return bad('Error generando reporte', 500)
  }
}
