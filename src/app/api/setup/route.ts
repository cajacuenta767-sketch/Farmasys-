import { db } from '@/lib/db'
import { ok, bad, str } from '@/lib/api-helpers'
import { hashPassword } from '@/lib/security'
import { logAudit } from '@/lib/audit'
import { crearTokenSesion, cabeceraSetCookie } from '@/lib/sesion'
import { NextResponse } from 'next/server'

// GET /api/setup — ¿la instalación está vacía (sin usuarios)?
export async function GET() {
  try {
    const usuarios = await db.user.count()
    return ok({ requiereConfiguracion: usuarios === 0 })
  } catch {
    return bad('No se pudo leer la base de datos', 500)
  }
}

// POST /api/setup — crea el primer administrador y los datos básicos de la farmacia. Solo funciona con la base vacía.
export async function POST(req: Request) {
  try {
    if ((await db.user.count()) > 0) return bad('La instalación ya tiene usuarios', 409)
    const b = await req.json()
    const username = (str(b.username) || '').toLowerCase()
    const password = str(b.password)
    const name = str(b.name)
    if (!username || !password || !name) return bad('Usuario, contraseña y nombre son obligatorios')
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return bad('El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion')
    if (password.length < 8) return bad('La contraseña debe tener al menos 8 caracteres')

    const user = await db.user.create({
      data: { username, password: hashPassword(password), name, role: 'ADMIN', email: str(b.email) || null, phone: str(b.phone) || null, lastLoginAt: new Date() },
    })
    const ajustes: Record<string, string> = {
      pharmacyName: str(b.pharmacyName) || '', taxId: str(b.taxId) || '', address: '', phone: '', email: '',
      taxRate: str(b.taxRate) || '0', currency: str(b.currency) || '$', invoiceFooter: '¡Gracias por su compra!', expiryWarningDays: '90',
    }
    for (const [key, value] of Object.entries(ajustes)) {
      await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
    }
    await logAudit({ userId: user.id, userName: user.name, action: 'SETUP', module: 'Instalación', detail: `Instalación inicial: administrador @${username} creado` })

    const sesion = { id: user.id, username: user.username, name: user.name, role: 'ADMIN' as const }
    const res = NextResponse.json(sesion)
    res.headers.set('Set-Cookie', cabeceraSetCookie(crearTokenSesion(sesion), req))
    return res
  } catch (e) {
    console.error('setup POST', e)
    return bad('Error creando el administrador', 500)
  }
}
