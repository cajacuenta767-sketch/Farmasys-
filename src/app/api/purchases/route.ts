import { db } from '@/lib/db'
import { ok, bad, num, str, formatSeq } from '@/lib/api-helpers'

// GET /api/purchases?status=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || ''
    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const purchases = await db.purchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, code: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok(purchases)
  } catch (e) {
    console.error('purchases GET', e)
    return bad('Error obteniendo compras', 500)
  }
}

// POST /api/purchases — crear orden de compra
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const supplierId = str(b.supplierId)
    const userId = str(b.userId)
    const items = Array.isArray(b.items) ? b.items : []
    if (!supplierId) return bad('Seleccione un proveedor')
    if (!userId) return bad('Falta el usuario')
    if (items.length === 0) return bad('Agregue al menos un producto a la orden')

    for (const it of items) {
      if (!str(it.productId) || it.quantity <= 0) return bad('Cada ítem requiere producto y cantidad válida')
    }

    const total = items.reduce((s: number, i: { quantity: number; unitCost: number }) => s + i.quantity * i.unitCost, 0)
    const count = await db.purchase.count()

    const purchase = await db.purchase.create({
      data: {
        orderNumber: formatSeq('OC', count, 4),
        supplierId,
        userId,
        total: Math.round(total * 100) / 100,
        status: 'PENDIENTE',
        notes: str(b.notes) || null,
        items: {
          create: items.map((i: { productId: string; quantity: number; unitCost: number; lotNumber?: string; expiryDate?: string }) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            lotNumber: i.lotNumber || null,
            expiryDate: i.expiryDate ? new Date(i.expiryDate) : null,
          })),
        },
      },
      include: { items: true, supplier: true },
    })
    return ok(purchase)
  } catch (e) {
    console.error('purchases POST', e)
    return bad('Error creando orden de compra', 500)
  }
}
