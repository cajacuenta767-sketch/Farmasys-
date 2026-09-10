import { db } from '@/lib/db'
import { ok, bad, int } from '@/lib/api-helpers'

// GET /api/audit?action=&search=&take= — Bitácora de auditoría
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || ''
    const search = searchParams.get('search') || ''
    const take = Math.min(int(searchParams.get('take'), 150) || 150, 500)

    const where: Record<string, unknown> = {}
    if (action) where.action = action
    if (search) {
      where.OR = [
        { userName: { contains: search } },
        { detail: { contains: search } },
        { module: { contains: search } },
      ]
    }

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    })
    return ok(logs)
  } catch (e) {
    console.error('audit GET', e)
    return bad('Error obteniendo bitácora', 500)
  }
}
