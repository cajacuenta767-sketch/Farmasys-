import { db } from '@/lib/db'
import { ok, bad, int, num, str, formatSeq } from '@/lib/api-helpers'

// GET /api/quotations?status=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || ''
    const where = status ? { status } : {}

    const quotations = await db.quotation.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, code: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 150,
    })
    return ok(quotations)
  } catch (e) {
    console.error('quotations GET', e)
    return bad('Error obteniendo cotizaciones', 500)
  }
}

// POST /api/quotations — crear cotización
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const userId = str(b.userId)
    const items = Array.isArray(b.items) ? b.items : []
    if (!userId) return bad('Falta el usuario')
    if (items.length === 0) return bad('Agregue al menos un producto a la cotización')

    const quotation = await db.$transaction(async (tx) => {
      const count = await tx.quotation.count()
      const quoteNumber = formatSeq('CT', count, 5)
      const total = items.reduce(
        (s: number, i: { unitPrice: number; quantity: number }) => s + num(i.unitPrice) * int(i.quantity),
        0
      )
      return tx.quotation.create({
        data: {
          quoteNumber,
          customerId: str(b.customerId) || null,
          customerName: str(b.customerName) || null,
          userId,
          total: Math.round(total * 100) / 100,
          validUntil: b.validUntil ? new Date(b.validUntil as string) : new Date(Date.now() + 15 * 24 * 3600 * 1000),
          notes: str(b.notes) || null,
          items: {
            create: items.map((i: { productId: string; productName: string; quantity: number; unitPrice: number }) => ({
              productId: str(i.productId) as string,
              productName: i.productName,
              quantity: int(i.quantity),
              unitPrice: num(i.unitPrice),
              subtotal: Math.round(int(i.quantity) * num(i.unitPrice) * 100) / 100,
            })),
          },
        },
        include: { items: true, user: { select: { id: true, name: true } } },
      })
    })
    return ok(quotation)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error creando cotización'
    console.error('quotations POST', e)
    return bad(msg, 400)
  }
}
