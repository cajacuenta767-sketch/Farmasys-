import { ok } from '@/lib/api-helpers'
import { VERSION } from '@/lib/version'

// GET /api/salud — comprobación de vida (Docker, Electron, monitoreo)
export async function GET() {
  return ok({ ok: true, version: VERSION, hora: new Date().toISOString() })
}
