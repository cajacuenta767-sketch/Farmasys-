import { db } from '@/lib/db'
import { ok, bad, str, formatSeq } from '@/lib/api-helpers'

// GET /api/returns — historial de devoluciones
export async function GET() {
  try {
    const returns = await db.return.findMany({
      include: {
        sale: { select: { id: true, invoiceNumber: true, total: true, customerName: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return ok(returns)
  } catch (e) {
    console.error('returns GET', e)
    return bad('Error obteniendo devoluciones', 500)
  }
}

// POST /api/returns — procesar devolución de una venta (reingresa stock a lotes)
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const saleId = str(b.saleId)
    const reason = str(b.reason)
    const userId = str(b.userId)
    const itemIds = Array.isArray(b.itemIds) ? b.itemIds.map((x: unknown) => String(x)) : null // null = toda la venta

    if (!saleId) return bad('Seleccione la venta a devolver')
    if (!reason) return bad('Indique el motivo de la devolución')
    if (!userId) return bad('Falta el usuario')

    const result = await db.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: {
          items: { include: { product: true, lot: true } },
          returns: true,
        },
      })
      if (!sale) throw new Error('Venta no encontrada')
      if (sale.status === 'ANULADA') throw new Error('No se puede devolver una venta anulada')

      // Productos ya devueltos en devoluciones anteriores con reingreso
      const returnedQtyByProduct: Record<string, number> = {}
      for (const r of sale.returns) {
        if (r.restocked) returnedQtyByProduct[r.id] = (returnedQtyByProduct[r.id] || 0) + 1
      }

      const itemsToReturn = itemIds ? sale.items.filter((i: { id: string }) => itemIds.includes(i.id)) : sale.items
      if (itemsToReturn.length === 0) throw new Error('No hay productos seleccionados para devolver')

      let amount = 0
      for (const it of itemsToReturn) {
        amount += it.subtotal
        if (it.lotId && it.lot) {
          await tx.lot.update({ where: { id: it.lotId }, data: { quantity: { increment: it.quantity } } })
        } else {
          // Lote ya no existe: reingresa creando lote de devolución
          await tx.lot.create({
            data: {
              productId: it.productId,
              lotNumber: it.lotNumber || 'DEVOLUCION',
              quantity: it.quantity,
              expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
              purchasePrice: it.product.purchasePrice,
            },
          })
        }
        await tx.inventoryMovement.create({
          data: {
            productId: it.productId,
            lotNumber: it.lotNumber || 'DEVOLUCION',
            type: 'ENTRADA',
            quantity: it.quantity,
            reason: `Devolución de cliente — ${reason}`,
            reference: sale.invoiceNumber,
            userId,
          },
        })
        if (it.product.controlled) {
          await tx.controlledLog.create({
            data: {
              productId: it.productId,
              lotNumber: it.lotNumber || 'DEVOLUCION',
              operation: 'ENTRADA',
              quantity: it.quantity,
              patientName: sale.customerName || 'Cliente ocasional',
              userId,
            },
          })
        }
      }

      const count = await tx.return.count()
      const returnNumber = formatSeq('DEV', count, 5)

      return tx.return.create({
        data: {
          returnNumber,
          saleId,
          userId,
          amount: Math.round(amount * 100) / 100,
          reason,
          restocked: true,
        },
      })
    })
    return ok(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error procesando devolución'
    console.error('returns POST', e)
    return bad(msg, 400)
  }
}
