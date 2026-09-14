import { ok, bad, str } from '@/lib/api-helpers'
import { activar, estadoLicencia, resumen } from '@/lib/licencia'
import { sesionDe } from '@/lib/sesion'
import { logAudit } from '@/lib/audit'

// POST /api/licencia/activar — { clave, url } activa esta instalación contra CONTROL.
// Cambiar la clave o el servidor solo se permite sin licencia vigente o siendo ADMIN.
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}))
    const clave = str(b.clave)
    const url = str(b.url)
    const sesion = sesionDe(req)
    if (estadoLicencia().valido && sesion?.role !== 'ADMIN') return bad('Solo un administrador puede cambiar la licencia', 403)
    const e = await activar({ clave, url })
    await logAudit({ userId: sesion?.id, userName: sesion?.name || 'Sistema', action: 'LICENCIA', module: 'Licencia', detail: e.valido ? `Licencia activada (${clave || 'clave guardada'})` : `Activación rechazada: ${e.motivo}` })
    return ok({ ...resumen(), resultado: e.valido ? 'Licencia verificada correctamente.' : `No se pudo activar: ${e.motivo}` })
  } catch (e) {
    return bad(`Sin conexión con CONTROL: ${e instanceof Error ? e.message : 'error'}`, 502)
  }
}
