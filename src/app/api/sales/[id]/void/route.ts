import { db } from '@/lib/db'
import { ok, bad, str } from '@/lib/api-helpers'

// POST /api/sales/[id]/void — Anular venta y devolver stock a los lotes
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json().catch(() => ({}))
    const reason = str(b.reason)

    const sale = await db.sale.findUnique({ where: { id }, include: { items: true } })
    if (!sale) return bad('Venta no encontrada', 404)
    if (sale.status === 'ANULADA') return bad('La venta ya está anulada')

    await db.$transaction(async (tx) => {
      // Devolver cantidades a los lotes correspondientes
      for (const item of sale.items) {
        if (item.lotId) {
          await tx.lot.update({ where: { id: item.lotId }, data: { quantity: { increment: item.quantity } } }).catch(async () => {
            // Si el lote fue eliminado, recrearlo con valores aproximados
            await tx.lot.create({
              data: {
                id: item.lotId!,
                productId: item.productId,
                lotNumber: item.lotNumber || 'DEVOLUCION',
                expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
                quantity: item.quantity,
                purchasePrice: 0,
              },
            })
          })
        }
        // Kardex: entrada por anulación de venta
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            lotNumber: item.lotNumber,
            type: 'ENTRADA',
            quantity: item.quantity,
            reason: 'Anulación de venta',
            reference: sale.invoiceNumber,
            userId: sale.userId,
          },
        })
        // Caja: retirar el efectivo de la venta anulada de la sesión abierta
        if (sale.paymentMethod === 'EFECTIVO') {
          const cashSession = await tx.cashSession.findFirst({ where: { status: 'ABIERTA' } })
          if (cashSession) {
            await tx.cashMovement.create({
              data: {
                cashSessionId: cashSession.id,
                type: 'RETIRO',
                amount: item.subtotal,
                reason: `Anulación de venta ${sale.invoiceNumber} (${item.productName})`,
                userId: sale.userId,
              },
            })
          }
        }
      }
      await tx.sale.update({
        where: { id },
        data: { status: 'ANULADA', voidReason: reason || 'Anulada por el usuario' },
      })
    })

    return ok({ success: true })
  } catch (e) {
    console.error('sale void', e)
    return bad('Error anulando la venta', 500)
  }
}
