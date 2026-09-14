import { ok } from '@/lib/api-helpers'
import { resumen } from '@/lib/licencia'

// GET /api/licencia — resumen para la pantalla estándar "Licencia" (libre: se muestra aunque la app esté bloqueada)
export async function GET() {
  return ok(resumen())
}
