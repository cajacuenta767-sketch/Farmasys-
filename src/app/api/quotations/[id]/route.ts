import { db } from '@/lib/db'
import { ok, bad, str } from '@/lib/api-helpers'

// PUT /api/quotations/[id] — cambiar estado (ACEPTADA | RECHAZADA | VENCIDA)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json()
    const status = str(b.status)
    if (!status || !['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'VENCIDA'].includes(status)) {
      return bad('Estado inválido')
    }
    const quotation = await db.quotation.update({ where: { id }, data: { status }, include: { items: true } })
    return ok(quotation)
  } catch (e) {
    console.error('quotations PUT [id]', e)
    return bad('Error actualizando cotización', 400)
  }
}

// DELETE /api/quotations/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.quotationItem.deleteMany({ where: { quotationId: id } })
    await db.quotation.delete({ where: { id } })
    return ok({ success: true })
  } catch (e) {
    console.error('quotations DELETE [id]', e)
    return bad('Error eliminando cotización', 400)
  }
}
