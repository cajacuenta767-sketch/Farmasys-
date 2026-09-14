import { ok, bad } from '@/lib/api-helpers'
import { aplicarCodigoEmergencia, resumen } from '@/lib/licencia'
import { logAudit } from '@/lib/audit'

// POST /api/licencia/emergencia — { codigo } aplica un código de emergencia de 72 h emitido desde CONTROL
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const r = aplicarCodigoEmergencia(b.codigo)
  if (!r.ok) return bad(r.motivo || 'Código inválido', 422)
  await logAudit({ userName: 'Sistema', action: 'LICENCIA', module: 'Licencia', detail: `Código de emergencia aplicado hasta ${r.expira_en}` })
  return ok({ ...resumen(), resultado: `Código aplicado: el sistema funciona hasta ${new Date(r.expira_en!).toLocaleString('es')}.` })
}
