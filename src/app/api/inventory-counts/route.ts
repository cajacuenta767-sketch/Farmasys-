import { db } from '@/lib/db'
import { ok, bad, str, int, formatSeq } from '@/lib/api-helpers'

// GET /api/inventory-counts — Listado de conteos físicos
export async function GET() {
  try {
    const counts = await db.inventoryCount.findMany({
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return ok(counts)
  } catch (e) {
    console.error('inventory-counts GET', e)
    return bad('Error obteniendo conteos', 500)
  }
}

// POST /api/inventory-counts — Crear toma de inventario (snapshot de lotes activos)
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const userId = str(b.userId)
    const notes = str(b.notes) || null
    const categoryId = str(b.categoryId) || null
    if (!userId) return bad('Falta el usuario del conteo')

    const lots = await db.lot.findMany({
      where: { quantity: { gt: 0 }, ...(categoryId ? { product: { categoryId } } : {}) },
      include: { product: { select: { name: true } } },
      orderBy: [{ productId: 'asc' }, { expiryDate: 'asc' }],
    })
    if (lots.length === 0) return bad('No hay lotes con existencias para contar')

    const count = await db.$transaction(async (tx) => {
      const n = await tx.inventoryCount.count()
      return tx.inventoryCount.create({
        data: {
          countNumber: formatSeq('CON', n, 4),
          userId,
          notes,
          totalLots: lots.length,
          items: {
            create: lots.map((l) => ({
              lotId: l.id,
              productId: l.productId,
              productName: l.product.name,
              lotNumber: l.lotNumber,
              systemQty: l.quantity,
            })),
          },
        },
      })
    })

    return ok(count)
  } catch (e) {
    console.error('inventory-counts POST', e)
    return bad('Error creando el conteo', 500)
  }
}
