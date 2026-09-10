import { db } from '@/lib/db'
import { ok, bad, int, str } from '@/lib/api-helpers'

// GET /api/controlled-logs — libro oficial de medicamentos controlados
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const operation = searchParams.get('operation') || ''
    const productId = searchParams.get('productId') || ''

    const where: Record<string, unknown> = {}
    if (operation) where.operation = operation
    if (productId) where.productId = productId

    const logs = await db.controlledLog.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, code: true, concentration: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    })
    return ok(logs)
  } catch (e) {
    console.error('controlled-logs GET', e)
    return bad('Error obteniendo libro de controlados', 500)
  }
}

// POST /api/controlled-logs — registrar entrada o salida de sustancia controlada
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const productId = str(b.productId)
    const operation = str(b.operation)
    const quantity = int(b.quantity)
    const lotNumber = str(b.lotNumber)
    const userId = str(b.userId)

    if (!productId) return bad('Seleccione el medicamento controlado')
    if (operation !== 'ENTRADA' && operation !== 'SALIDA') return bad('Operación inválida (ENTRADA o SALIDA)')
    if (quantity <= 0) return bad('La cantidad debe ser mayor a cero')
    if (!lotNumber) return bad('El número de lote es obligatorio para controlados')
    if (!userId) return bad('Falta el usuario')

    const result = await db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } })
      if (!product) throw new Error('Producto no encontrado')
      if (!product.controlled) throw new Error('Este producto no está marcado como controlado')

      if (operation === 'SALIDA') {
        const doctorName = str(b.doctorName)
        const patientName = str(b.patientName)
        if (!doctorName) throw new Error('Las salidas requieren el nombre del médico que receta')
        if (!patientName) throw new Error('Las salidas requieren el nombre del paciente')

        const lot = await tx.lot.findFirst({
          where: { productId, lotNumber, quantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        })
        if (!lot) throw new Error('Lote no encontrado o sin stock')
        if (lot.quantity < quantity) throw new Error(`Stock insuficiente en lote ${lotNumber}. Disponible: ${lot.quantity}`)
        await tx.lot.update({ where: { id: lot.id }, data: { quantity: { decrement: quantity } } })

        await tx.inventoryMovement.create({
          data: {
            productId, lotNumber, type: 'SALIDA', quantity,
            reason: `Venta controlada — Paciente: ${patientName}`,
            reference: str(b.folio) || null, userId,
          },
        })
      } else {
        // ENTRADA: suma al lote o lo crea
        const lot = await tx.lot.findFirst({ where: { productId, lotNumber } })
        if (lot) {
          await tx.lot.update({ where: { id: lot.id }, data: { quantity: { increment: quantity } } })
        } else {
          await tx.lot.create({
            data: {
              productId, lotNumber, quantity,
              expiryDate: b.expiryDate ? new Date(b.expiryDate as string) : new Date(Date.now() + 730 * 24 * 3600 * 1000),
              purchasePrice: product.purchasePrice,
            },
          })
        }
        await tx.inventoryMovement.create({
          data: {
            productId, lotNumber, type: 'ENTRADA', quantity,
            reason: 'Ingreso de controlado al inventario', userId,
          },
        })
      }

      return tx.controlledLog.create({
        data: {
          productId, lotNumber, operation, quantity,
          doctorName: str(b.doctorName) || null,
          patientName: str(b.patientName) || null,
          folio: str(b.folio) || null,
          userId,
        },
      })
    })
    return ok(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error registrando en libro de controlados'
    console.error('controlled-logs POST', e)
    return bad(msg, 400)
  }
}
