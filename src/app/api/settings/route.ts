import { db } from '@/lib/db'
import { ok } from '@/lib/api-helpers'
import { logAudit } from '@/lib/audit'

// GET /api/settings
export async function GET() {
  try {
    const rows = await db.setting.findMany()
    const settings: Record<string, string> = {}
    for (const r of rows) settings[r.key] = r.value
    return ok(settings)
  } catch {
    return ok({})
  }
}

// PUT /api/settings — recibe { key: value, ... } y guarda cada una
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const userName = body.userName || 'Usuario'
    delete body.userName
    const entries = Object.entries(body as Record<string, string>).filter(([k]) => k && typeof k === 'string')
    for (const [key, value] of entries) {
      await db.setting.upsert({
        where: { key },
        update: { value: String(value ?? '') },
        create: { key, value: String(value ?? '') },
      })
    }
    await logAudit({ userName: String(userName), action: 'CONFIG', module: 'Configuración', detail: `Configuración actualizada (${entries.length} campo(s))` })
    return ok({ success: true })
  } catch {
    return ok({ success: false })
  }
}
