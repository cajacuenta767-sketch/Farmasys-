import { db } from '@/lib/db'
import { ok, bad, str } from '@/lib/api-helpers'
import { logAudit } from '@/lib/audit'

// GET /api/drug-interactions?severity= — Interacciones medicamentosas activas
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const severity = searchParams.get('severity') || ''
    const includeInactive = searchParams.get('all') === '1'

    const where: Record<string, unknown> = {}
    if (!includeInactive) where.active = true
    if (severity) where.severity = severity

    const rows = await db.drugInteraction.findMany({
      where,
      include: {
        productA: { select: { id: true, name: true, code: true } },
        productB: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    })
    return ok(rows)
  } catch (e) {
    console.error('drug-interactions GET', e)
    return bad('Error obteniendo interacciones', 500)
  }
}

// POST /api/drug-interactions — Registrar interacción clínica
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const productAId = str(b.productAId)
    const productBId = str(b.productBId)
    const severity = str(b.severity) || 'MODERADA'
    const description = str(b.description)
    const userName = str(b.userName) || 'Sistema'

    if (!productAId || !productBId) return bad('Seleccione los dos productos')
    if (productAId === productBId) return bad('Los productos deben ser diferentes')
    if (!['LEVE', 'MODERADA', 'GRAVE'].includes(severity)) return bad('Severidad inválida')
    if (!description) return bad('Describa la interacción clínica')

    const dup = await db.drugInteraction.findFirst({
      where: {
        OR: [
          { productAId, productBId },
          { productAId: productBId, productBId: productAId },
        ],
      },
    })
    if (dup) return bad('Ya existe registrada esta interacción entre ambos productos')

    const row = await db.drugInteraction.create({
      data: { productAId, productBId, severity, description },
      include: {
        productA: { select: { id: true, name: true, code: true } },
        productB: { select: { id: true, name: true, code: true } },
      },
    })
    await logAudit({ userName, action: 'INTERACCION', module: 'Clínica', detail: `Interacción ${severity}: ${row.productA.name} + ${row.productB.name}` })
    return ok(row)
  } catch (e) {
    console.error('drug-interactions POST', e)
    return bad('Error creando interacción', 500)
  }
}
