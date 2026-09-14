import { ok, bad } from '@/lib/api-helpers'
import { activar, resumen } from '@/lib/licencia'

// POST /api/licencia/reactivar — botón "Reactivar / verificar ahora" de la pantalla Licencia
export async function POST() {
  try {
    const e = await activar()
    return ok({ ...resumen(), resultado: e.valido ? 'Licencia verificada correctamente.' : `No se pudo reactivar: ${e.motivo}` })
  } catch (e) {
    return bad(`Sin conexión con CONTROL: ${e instanceof Error ? e.message : 'error'}`, 502)
  }
}
