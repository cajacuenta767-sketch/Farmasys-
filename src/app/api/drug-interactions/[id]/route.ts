import { db } from '@/lib/db'
import { ok, bad, str } from '@/lib/api-helpers'
import { logAudit } from '@/lib/audit'

// PUT /api/drug-interactions/[id] — Actualizar severidad/descripción/estado
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json()
    const data: Record<string, unknown> = {}
    if (b.severity !== undefined) {
      if (!['LEVE', 'MODERADA', 'GRAVE'].includes(b.severity)) return bad('Severidad inválida')
      data.severity = b.severity
    }
    if (b.description !== undefined) data.description = str(b.description)
    if (b.active !== undefined) data.active = !!b.active

    const row = await db.drugInteraction.update({
      where: { id },
      data,
      include: {
        productA: { select: { id: true, name: true, code: true } },
        productB: { select: { id: true, name: true, code: true } },
      },
    })
    return ok(row)
  } catch (e) {
    console.error('drug-interactions PUT', e)
    return bad('Error actualizando interacción', 500)
  }
}

// DELETE /api/drug-interactions/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const userName = searchParams.get('userName') || 'Sistema'
    const row = await db.drugInteraction.delete({ where: { id } })
    await logAudit({ userName, action: 'INTERACCION', module: 'Clínica', detail: `Interacción eliminada (${row.id})` })
    return ok({ success: true })
  } catch (e) {
    console.error('drug-interactions DELETE', e)
    return bad('Error eliminando interacción', 500)
  }
}
