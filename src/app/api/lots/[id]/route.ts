import { db } from '@/lib/db'
import { ok, bad, int } from '@/lib/api-helpers'

// PUT /api/lots/[id] — ajuste de inventario
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json()
    const quantity = int(b.quantity, -1)
    if (quantity < 0) return bad('Cantidad inválida')
    const lot = await db.lot.update({ where: { id }, data: { quantity } })
    return ok(lot)
  } catch {
    return bad('Error ajustando lote', 500)
  }
}

// DELETE /api/lots/[id] — eliminar lote (baj manual / vencido)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const used = await db.saleItem.count({ where: { lotId: id } })
    if (used > 0) {
      // Si tiene historial, solo ponemos cantidad en 0
      await db.lot.update({ where: { id }, data: { quantity: 0 } })
      return ok({ success: true, softDeleted: true })
    }
    await db.lot.delete({ where: { id } })
    return ok({ success: true })
  } catch {
    return bad('Error eliminando lote', 500)
  }
}
