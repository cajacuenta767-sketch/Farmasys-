import { ok, bad, str } from '@/lib/api-helpers'
import { listarDispositivos, quitarDispositivo } from '@/lib/dispositivos'
import { sesionDe } from '@/lib/sesion'
import { logAudit } from '@/lib/audit'

// GET /api/licencia/dispositivos — dispositivos vinculados (solo ADMIN)
export async function GET(req: Request) {
  if (sesionDe(req)?.role !== 'ADMIN') return bad('Solo un administrador puede ver los dispositivos', 403)
  return ok(listarDispositivos())
}

// DELETE /api/licencia/dispositivos — { huella } desvincula un dispositivo (tendrá que volver a ingresar el código)
export async function DELETE(req: Request) {
  const s = sesionDe(req)
  if (s?.role !== 'ADMIN') return bad('Solo un administrador puede desvincular dispositivos', 403)
  const b = await req.json().catch(() => ({}))
  const huella = str(b.huella)
  if (!huella) return bad('Falta la huella del dispositivo')
  const lista = quitarDispositivo(huella)
  await logAudit({ userId: s.id, userName: s.name, action: 'LICENCIA', module: 'Licencia', detail: `Dispositivo desvinculado: ${huella}` })
  return ok(lista)
}
