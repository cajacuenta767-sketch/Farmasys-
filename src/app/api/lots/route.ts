import { db } from '@/lib/db'
import { ok, bad, int, num, str } from '@/lib/api-helpers'

// GET /api/lots?productId=&status=vencidos|proximos
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}
    if (productId) where.productId = productId

    const now = new Date()
    if (status === 'vencidos') where.expiryDate = { lt: now }
    if (status === 'proximos') {
      const limit = new Date(now)
      limit.setDate(limit.getDate() + 90)
      where.expiryDate = { gte: now, lte: limit }
    }
    where.quantity = { gt: 0 }

    const lots = await db.lot.findMany({
      where,
      include: { product: { include: { category: { select: { name: true } } } } },
      orderBy: { expiryDate: 'asc' },
    })
    return ok(lots)
  } catch (e) {
    console.error('lots GET', e)
    return bad('Error obteniendo lotes', 500)
  }
}

// POST /api/lots — entrada de inventario (nuevo lote o suma a existente)
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const productId = str(b.productId)
    const lotNumber = str(b.lotNumber)
    const quantity = int(b.quantity)
    const expiryDate = str(b.expiryDate)
    if (!productId || !lotNumber || quantity <= 0 || !expiryDate) {
      return bad('Producto, lote, cantidad (>0) y fecha de vencimiento son obligatorios')
    }

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) return bad('Producto no encontrado', 404)

    const result = await db.$transaction(async (tx) => {
      const existing = await tx.lot.findFirst({
        where: { productId, lotNumber },
      })
      let lot
      if (existing) {
        lot = await tx.lot.update({
          where: { id: existing.id },
          data: { quantity: { increment: quantity }, expiryDate: new Date(expiryDate) },
        })
      } else {
        lot = await tx.lot.create({
          data: {
            productId,
            lotNumber,
            quantity,
            expiryDate: new Date(expiryDate),
            purchasePrice: num(b.purchasePrice, product.purchasePrice),
          },
        })
      }
      // Actualiza precio de compra de referencia del producto
      await tx.product.update({ where: { id: productId }, data: { purchasePrice: num(b.purchasePrice, product.purchasePrice) } })
      return lot
    })

    return ok(result)
  } catch (e) {
    console.error('lots POST', e)
    return bad('Error registrando entrada de inventario', 500)
  }
}
