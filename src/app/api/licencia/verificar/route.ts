import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { str } from '@/lib/api-helpers'
import { configuracion, estadoLicencia, resumen } from '@/lib/licencia'
import { registrarDispositivo } from '@/lib/dispositivos'
import { logAudit } from '@/lib/audit'

// Cabeceras CORS: lo llama la app Android (origen capacitor/https://localhost) antes de abrir el sistema.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }
const json = (cuerpo: unknown, status = 200) => NextResponse.json(cuerpo, { status, headers: CORS })

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// POST /api/licencia/verificar — { clave, huella, nombre_equipo?, plataforma? }
// Un dispositivo (app Android) solo puede abrir esta instalación si presenta el mismo código CTL-… con el
// que la farmacia está licenciada en CONTROL y la licencia sigue vigente. No consume activaciones en CONTROL.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const clave = (str(b.clave) || '').toUpperCase()
  const huella = str(b.huella)
  if (!clave || !huella) return json({ ok: false, error: 'Faltan el código de verificación o la huella del dispositivo' }, 400)

  const e = estadoLicencia()
  if (e.desarrollo) return json({ ok: true, aviso: 'Servidor en modo desarrollo: sin licencia CONTROL', vence_en: null, sin_conexion_hasta: null })
  if (!e.configurada) return json({ ok: false, codigo: 'sin_licencia', error: 'El servidor de la farmacia aún no tiene licencia activada' }, 402)
  if (clave !== configuracion().clave) {
    await logAudit({ userName: 'Dispositivo', action: 'LICENCIA', module: 'Licencia', detail: `Código de verificación rechazado desde ${huella} (${str(b.nombre_equipo) || 'sin nombre'})` })
    return json({ ok: false, codigo: 'clave_incorrecta', error: 'El código no corresponde a la licencia de esta farmacia' }, 403)
  }
  if (!e.valido) return json({ ok: false, codigo: e.codigo || 'licencia', error: e.motivo || 'Licencia no válida' }, 402)

  const lista = registrarDispositivo({ huella, nombre: str(b.nombre_equipo), plataforma: str(b.plataforma) || 'android' })
  const nuevo = lista.find((d) => d.huella === huella)?.verificaciones === 1
  if (nuevo) await logAudit({ userName: 'Dispositivo', action: 'LICENCIA', module: 'Licencia', detail: `Dispositivo vinculado con el código de verificación: ${str(b.nombre_equipo) || huella}` })

  const farmacia = await db.setting.findUnique({ where: { key: 'pharmacyName' } }).catch(() => null)
  const r = resumen()
  return json({ ok: true, farmacia: farmacia?.value || 'FarmaSys', plan: r.plan, vence_en: r.vence_en, sin_conexion_hasta: r.sin_conexion_hasta, dispositivos: lista.length })
}
