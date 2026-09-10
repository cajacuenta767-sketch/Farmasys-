import { db } from '@/lib/db'
import { ok, bad, int, str } from '@/lib/api-helpers'

// GET /api/inventory-movements?productId=&type= — Kardex de inventario
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId') || ''
    const type = searchParams.get('type') || ''

    const where: Record<string, unknown> = {}
    if (productId) where.productId = productId
    if (type) where.type = type

    const movements = await db.inventoryMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, code: true, purchasePrice: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    })
    return ok(movements)
  } catch (e) {
    console.error('inventory-movements GET', e)
    return bad('Error obteniendo movimientos de inventario', 500)
  }
}

// POST /api/inventory-movements — ajuste, merma o entrada manual de inventario
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const productId = str(b.productId)
    const type = str(b.type)
    const quantity = int(b.quantity)
    const reason = str(b.reason)
    const userId = str(b.userId)
    const lotNumber = str(b.lotNumber)

    if (!productId) return bad('Seleccione un producto')
    if (type !== 'ENTRADA' && type !== 'AJUSTE' && type !== 'MERMA') {
      return bad('Tipo inválido: use ENTRADA, AJUSTE o MERMA')
    }
    if (quantity <= 0) return bad('La cantidad debe ser mayor a cero')
    if (!reason) return bad('Indique el motivo del movimiento')
    if (!userId) return bad('Falta el usuario')

    const result = await db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: { lots: { where: { quantity: { gt: 0 } }, orderBy: { expiryDate: 'asc' } } },
      })
      if (!product) throw new Error('Producto no encontrado')

      if (type === 'MERMA') {
        // Descuenta del lote más próximo a vencer (FEFO)
        const available = product.lots.reduce((s: number, l: { quantity: number }) => s + l.quantity, 0)
        if (available < quantity) throw new Error(`Stock insuficiente para merma. Disponible: ${available}`)
        let remaining = quantity
        for (const lot of product.lots) {
          if (remaining <= 0) break
          const take = Math.min(remaining, lot.quantity)
          await tx.lot.update({ where: { id: lot.id }, data: { quantity: { decrement: take } } })
          remaining -= take
        }
      } else if (type === 'ENTRADA') {
        // Suma al lote indicado o crea uno nuevo
        if (lotNumber) {
          const lot = await tx.lot.findFirst({ where: { productId, lotNumber } })
          if (lot) {
            await tx.lot.update({ where: { id: lot.id }, data: { quantity: { increment: quantity } } })
          } else {
            await tx.lot.create({
              data: {
                productId,
                lotNumber,
                quantity,
                expiryDate: b.expiryDate ? new Date(b.expiryDate as string) : new Date(Date.now() + 730 * 24 * 3600 * 1000),
                purchasePrice: product.purchasePrice,
              },
            })
          }
        } else {
          throw new Error('Indique el número de lote para la entrada')
        }
      }
      // AJUSTE: solo registro documental (conteo físico), no modifica lotes

      return tx.inventoryMovement.create({
        data: { productId, lotNumber: lotNumber || null, type, quantity, reason, reference: str(b.reference) || null, userId },
      })
    })
    return ok(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error registrando movimiento'
    console.error('inventory-movements POST', e)
    return bad(msg, 400)
  }
}
