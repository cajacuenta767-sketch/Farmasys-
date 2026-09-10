import { db } from '@/lib/db'
import { ok, bad } from '@/lib/api-helpers'

// GET /api/backup — Exportación JSON de toda la base de datos (respaldo)
export async function GET() {
  try {
    const [
      settings, categories, suppliers, products, lots, customers,
      sales, purchases, prescriptions, quotations, promotions, returns, counts,
    ] = await Promise.all([
      db.setting.findMany(),
      db.category.findMany(),
      db.supplier.findMany(),
      db.product.findMany(),
      db.lot.findMany(),
      db.customer.findMany(),
      db.sale.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' }, take: 2000 }),
      db.purchase.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' }, take: 1000 }),
      db.prescription.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' }, take: 1000 }),
      db.quotation.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' }, take: 1000 }),
      db.promotion.findMany(),
      db.return.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 }),
      db.inventoryCount.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' }, take: 200 }),
    ])

    const payload = {
      system: 'FarmaSys - Sistema Integral de Farmacias',
      version: 3,
      exportedAt: new Date().toISOString(),
      data: {
        settings, categories, suppliers, products, lots, customers,
        sales, purchases, prescriptions, quotations, promotions, returns, inventoryCounts: counts,
      },
    }
    return ok(payload)
  } catch (e) {
    console.error('backup GET', e)
    return bad('Error generando el respaldo', 500)
  }
}
