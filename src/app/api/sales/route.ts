import { db } from '@/lib/db'
import { ok, bad, num, int, str, formatSeq } from '@/lib/api-helpers'

// GET /api/sales?from=&to=&status=&search=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = {}
    if (from || to) {
      const createdAt: Record<string, Date> = {}
      if (from) createdAt.gte = new Date(`${from}T00:00:00`)
      if (to) createdAt.lte = new Date(`${to}T23:59:59`)
      where.createdAt = createdAt
    }
    if (status) where.status = status
    if (search) {
      where.OR = [{ invoiceNumber: { contains: search } }, { customerName: { contains: search } }]
    }

    const sales = await db.sale.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return ok(sales)
  } catch (e) {
    console.error('sales GET', e)
    return bad('Error obteniendo ventas', 500)
  }
}

// POST /api/sales — Registrar venta desde el POS (descuento FEFO por lotes)
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const userId = str(b.userId)
    const customerId = str(b.customerId) || null
    const customerName = str(b.customerName) || null
    const paymentMethod = str(b.paymentMethod) || 'EFECTIVO'
    const discount = num(b.discount, 0)
    const amountPaid = num(b.amountPaid, 0)
    const items = Array.isArray(b.items) ? b.items : []

    if (!userId) return bad('Falta el usuario de la venta')
    if (items.length === 0) return bad('El carrito está vacío')

    for (const it of items) {
      if (!str(it.productId) || int(it.quantity) <= 0) {
        return bad('Cada ítem requiere producto y cantidad válida')
      }
    }

    const sale = await db.$transaction(async (tx) => {
      // Verificar stock disponible total por producto
      const productIds = [...new Set(items.map((i: { productId: string }) => i.productId))]
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { lots: { where: { quantity: { gt: 0 } }, orderBy: { expiryDate: 'asc' } } },
      })

      for (const it of items) {
        const p = products.find((x: { id: string }) => x.id === it.productId)
        if (!p) throw new Error(`Producto no encontrado: ${it.productName || it.productId}`)
        const available = p.lots.reduce((s: number, l: { quantity: number }) => s + l.quantity, 0)
        if (available < it.quantity) {
          throw new Error(`Stock insuficiente de "${p.name}". Disponible: ${available}`)
        }
      }

      // Calcular totales
      const subtotal = items.reduce((s: number, i: { unitPrice: number; quantity: number }) => s + i.unitPrice * i.quantity, 0)
      const settings = await tx.setting.findUnique({ where: { key: 'taxRate' } })
      const taxRate = settings ? parseFloat(settings.value) : 0
      const tax = Math.round((subtotal - discount) * (taxRate / 100) * 100) / 100
      const total = Math.round((subtotal - discount + tax) * 100) / 100

      if (paymentMethod === 'EFECTIVO' && amountPaid > 0 && amountPaid < total) {
        throw new Error('El monto pagado es menor al total')
      }

      const count = await tx.sale.count()
      const invoiceNumber = formatSeq('FV', count, 5)

      const created = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId,
          customerName,
          userId,
          subtotal: Math.round(subtotal * 100) / 100,
          tax,
          discount,
          total,
          paymentMethod,
          amountPaid: paymentMethod === 'EFECTIVO' ? amountPaid : total,
          change: paymentMethod === 'EFECTIVO' ? Math.max(0, Math.round((amountPaid - total) * 100) / 100) : 0,
          status: 'COMPLETADA',
          notes: str(b.notes) || null,
        },
      })

      // Asignar lotes FEFO (First Expired, First Out) y crear items
      for (const it of items) {
        const p = products.find((x: { id: string }) => x.id === it.productId)
        let remaining = it.quantity
        for (const lot of p.lots) {
          if (remaining <= 0) break
          const take = Math.min(remaining, lot.quantity)
          if (take <= 0) continue
          await tx.lot.update({ where: { id: lot.id }, data: { quantity: { decrement: take } } })
          await tx.saleItem.create({
            data: {
              saleId: created.id,
              productId: it.productId,
              lotId: lot.id,
              productName: p.name,
              lotNumber: lot.lotNumber,
              quantity: take,
              unitPrice: it.unitPrice,
              subtotal: Math.round(take * it.unitPrice * 100) / 100,
            },
          })
          // Kardex: salida por venta
          await tx.inventoryMovement.create({
            data: {
              productId: it.productId,
              lotNumber: lot.lotNumber,
              type: 'SALIDA',
              quantity: take,
              reason: 'Venta en mostrador',
              reference: invoiceNumber,
              userId,
            },
          })
          // Libro de controlados: toda salida queda registrada
          if (p.controlled) {
            await tx.controlledLog.create({
              data: {
                productId: it.productId,
                lotNumber: lot.lotNumber,
                operation: 'SALIDA',
                quantity: take,
                patientName: customerName || 'Cliente ocasional',
                folio: str(b.prescriptionFolio) || null,
                userId,
              },
            })
          }
          remaining -= take
        }
      }

      // Caja: registrar la venta en efectivo dentro de la sesión abierta
      if (paymentMethod === 'EFECTIVO') {
        const cashSession = await tx.cashSession.findFirst({ where: { status: 'ABIERTA' } })
        if (cashSession) {
          await tx.cashMovement.create({
            data: {
              cashSessionId: cashSession.id,
              type: 'VENTA',
              amount: total,
              reason: `Venta ${invoiceNumber}`,
              userId,
            },
          })
        }
      }

      return created
    })

    return ok(sale)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error registrando venta'
    console.error('sales POST', e)
    return bad(msg, 400)
  }
}
