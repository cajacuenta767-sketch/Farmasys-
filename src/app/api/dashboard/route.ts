import { db } from '@/lib/db'
import { ok } from '@/lib/api-helpers'

// GET /api/dashboard — KPIs y datos del panel principal
export async function GET() {
  try {
    const now = new Date()
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const in90Days = new Date(now)
    in90Days.setDate(in90Days.getDate() + 90)

    // Ventas de hoy / mes
    const [todaySales, monthSales, todayCount, productCount, lowStockRaw, expiringRaw, recentSales] = await Promise.all([
      db.sale.aggregate({ _sum: { total: true }, where: { status: 'COMPLETADA', createdAt: { gte: startToday } } }),
      db.sale.aggregate({ _sum: { total: true }, where: { status: 'COMPLETADA', createdAt: { gte: startMonth } } }),
      db.sale.count({ where: { status: 'COMPLETADA', createdAt: { gte: startToday } } }),
      db.product.count({ where: { active: true } }),
      db.product.findMany({
        where: { active: true },
        include: { lots: true, category: true },
      }),
      db.lot.findMany({
        where: { quantity: { gt: 0 }, expiryDate: { lte: in90Days } },
        include: { product: { include: { category: true } } },
        orderBy: { expiryDate: 'asc' },
        take: 10,
      }),
      db.sale.findMany({
        where: { status: 'COMPLETADA' },
        include: { user: { select: { name: true } }, customer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ])

    // Stock total por producto (sumando lotes)
    const stockOf = (p: { lots: { quantity: number }[] }) => p.lots.reduce((s, l) => s + l.quantity, 0)
    const lowStock = lowStockRaw
      .filter((p) => stockOf(p) <= p.minStock)
      .map((p) => ({ id: p.id, code: p.code, name: p.name, stock: stockOf(p), minStock: p.minStock, category: p.category?.name }))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10)

    // Ventas de los últimos 7 días
    const last7: { date: string; total: number; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
      const agg = await db.sale.aggregate({
        _sum: { total: true },
        _count: true,
        where: { status: 'COMPLETADA', createdAt: { gte: start, lt: end } },
      })
      last7.push({
        date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        total: agg._sum.total || 0,
        count: agg._count,
      })
    }

    // Top 5 productos más vendidos (últimos 30 días)
    const monthAgo = new Date(now)
    monthAgo.setDate(monthAgo.getDate() - 30)
    const monthItems = await db.saleItem.findMany({
      where: { sale: { status: 'COMPLETADA', createdAt: { gte: monthAgo } } },
      select: { productName: true, quantity: true, subtotal: true },
    })
    const byProduct: Record<string, { name: string; qty: number; total: number }> = {}
    for (const it of monthItems) {
      if (!byProduct[it.productName]) byProduct[it.productName] = { name: it.productName, qty: 0, total: 0 }
      byProduct[it.productName].qty += it.quantity
      byProduct[it.productName].total += it.subtotal
    }
    const topProducts = Object.values(byProduct).sort((a, b) => b.qty - a.qty).slice(0, 5)

    // Pendientes: compras por recibir
    const pendingPurchases = await db.purchase.count({ where: { status: 'PENDIENTE' } })

    // Ventas por hora (últimos 7 días) para detectar horas pico
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekSales = await db.sale.findMany({
      where: { status: 'COMPLETADA', createdAt: { gte: weekAgo } },
      select: { createdAt: true, total: true },
    })
    const hourMap: Record<number, { hour: number; total: number; count: number }> = {}
    for (const s of weekSales) {
      const h = s.createdAt.getHours()
      if (!hourMap[h]) hourMap[h] = { hour: h, total: 0, count: 0 }
      hourMap[h].total += s.total
      hourMap[h].count += 1
    }
    const byHour = Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, '0')}h`,
      total: Math.round((hourMap[h]?.total || 0) * 100) / 100,
      count: hourMap[h]?.count || 0,
    })).filter((x) => x.count > 0)

    // Comparación con ayer
    const startYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    const yesterdayAgg = await db.sale.aggregate({
      _sum: { total: true },
      _count: true,
      where: { status: 'COMPLETADA', createdAt: { gte: startYesterday, lt: startToday } },
    })

    return ok({
      todayTotal: todaySales._sum.total || 0,
      todayCount,
      monthTotal: monthSales._sum.total || 0,
      productCount,
      lowStockCount: lowStock.length,
      lowStock,
      expiring: expiringRaw.map((l) => ({
        id: l.id,
        lotNumber: l.lotNumber,
        expiryDate: l.expiryDate,
        quantity: l.quantity,
        productId: l.productId,
        productName: l.product.name,
        code: l.product.code,
      })),
      expiringCount: expiringRaw.length,
      last7,
      topProducts,
      recentSales: recentSales.map((s) => ({
        id: s.id,
        invoiceNumber: s.invoiceNumber,
        total: s.total,
        createdAt: s.createdAt,
        seller: s.user?.name,
        customer: s.customer?.name || s.customerName || 'Cliente Ocasional',
      })),
      pendingPurchases,
      byHour,
      yesterdayTotal: yesterdayAgg._sum.total || 0,
      yesterdayCount: yesterdayAgg._count,
    })
  } catch (e) {
    console.error('dashboard error', e)
    return ok({ error: 'Error cargando dashboard' })
  }
}
