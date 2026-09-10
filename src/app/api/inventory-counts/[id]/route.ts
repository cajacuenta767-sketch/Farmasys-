import { db } from '@/lib/db'
import { ok, bad, int } from '@/lib/api-helpers'
import { logAudit } from '@/lib/audit'

// GET /api/inventory-counts/[id] — Detalle del conteo con sus items
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const count = await db.inventoryCount.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        items: { orderBy: [{ productName: 'asc' }, { lotNumber: 'asc' }] },
      },
    })
    if (!count) return bad('Conteo no encontrado', 404)
    return ok(count)
  } catch (e) {
    console.error('inventory-counts [id] GET', e)
    return bad('Error obteniendo el conteo', 500)
  }
}

// POST /api/inventory-counts/[id] — Guardar captura | Aplicar ajustes | Cancelar
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json()
    const action = (b.action || '').toUpperCase()
    const userName = b.userName || 'Usuario'
    const items: { id: string; countedQty: number }[] = Array.isArray(b.items) ? b.items : []

    const count = await db.inventoryCount.findUnique({ where: { id } })
    if (!count) return bad('Conteo no encontrado', 404)
    if (count.status !== 'EN_PROCESO') return bad('El conteo ya fue cerrado')

    if (action === 'GUARDAR') {
      for (const it of items) {
        const counted = int(it.countedQty, -1)
        if (counted < 0) continue
        await db.inventoryCountItem.update({ where: { id: it.id }, data: { countedQty: counted } }).catch(() => {})
      }
      const updated = await db.inventoryCount.findUnique({
        where: { id },
        include: { items: { orderBy: [{ productName: 'asc' }, { lotNumber: 'asc' }] } },
      })
      return ok(updated)
    }

    if (action === 'APLICAR') {
      let differences = 0
      await db.$transaction(async (tx) => {
        for (const it of items) {
          const counted = int(it.countedQty, -1)
          if (counted < 0) continue
          const item = await tx.inventoryCountItem.findUnique({ where: { id: it.id } })
          if (!item || item.countId !== id) continue
          const diff = counted - item.systemQty
          await tx.inventoryCountItem.update({
            where: { id: item.id },
            data: { countedQty: counted, difference: diff },
          })
          if (diff !== 0) {
            differences++
            const lot = await tx.lot.findUnique({ where: { id: item.lotId } })
            if (lot) {
              await tx.lot.update({ where: { id: lot.id }, data: { quantity: counted } })
              await tx.inventoryMovement.create({
                data: {
                  productId: item.productId,
                  lotNumber: item.lotNumber,
                  type: 'AJUSTE',
                  quantity: Math.abs(diff),
                  reason: `Conteo físico ${count.countNumber} (${diff > 0 ? 'sobrante' : 'faltante'})`,
                  reference: count.countNumber,
                  userId: count.userId,
                },
              })
            }
          }
        }
        await tx.inventoryCount.update({
          where: { id },
          data: { status: 'APLICADO', differences, appliedAt: new Date() },
        })
      })
      await logAudit({ userId: count.userId, userName, action: 'CONTEO', module: 'Inventario', detail: `${count.countNumber} aplicado · ${differences} diferencia(s) ajustadas al kardex` })
      const updated = await db.inventoryCount.findUnique({ where: { id }, include: { items: true } })
      return ok(updated)
    }

    if (action === 'CANCELAR') {
      await db.inventoryCount.update({ where: { id }, data: { status: 'CANCELADO', appliedAt: new Date() } })
      await logAudit({ userId: count.userId, userName, action: 'CONTEO', module: 'Inventario', detail: `${count.countNumber} cancelado sin ajustes` })
      return ok({ success: true })
    }

    return bad('Acción inválida (GUARDAR | APLICAR | CANCELAR)')
  } catch (e) {
    console.error('inventory-counts [id] POST', e)
    return bad('Error procesando el conteo', 500)
  }
}
