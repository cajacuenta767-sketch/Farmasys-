import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad } from '@/lib/api-helpers'
import { verifyPassword, hashPassword, isHashed } from '@/lib/security'
import { logAudit } from '@/lib/audit'
import { crearTokenSesion, cabeceraSetCookie } from '@/lib/sesion'
import { esRol, type Rol } from '@/lib/permisos'

// POST /api/auth/login — Inicio de sesión: valida credenciales y entrega una cookie httpOnly firmada
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const username = (body.username || '').trim().toLowerCase()
    const password = (body.password || '').trim()
    if (!username || !password) return bad('Usuario y contraseña requeridos')

    const user = await db.user.findUnique({ where: { username } })
    if (!user || !verifyPassword(password, user.password)) return bad('Credenciales incorrectas', 401)
    if (!user.active) return bad('Usuario desactivado. Contacte al administrador', 403)

    // Migración transparente de contraseñas en texto plano a hash
    if (!isHashed(user.password)) {
      await db.user.update({ where: { id: user.id }, data: { password: hashPassword(password) } }).catch(() => {})
    }
    // Instalaciones anteriores usaban el rol VENDEDOR; ahora es CAJERO
    let role: Rol = 'CAJERO'
    if (esRol(user.role)) role = user.role
    else await db.user.update({ where: { id: user.id }, data: { role } }).catch(() => {})

    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {})
    await logAudit({ userId: user.id, userName: user.name, action: 'LOGIN', module: 'Autenticación', detail: `Sesión iniciada (@${user.username})` })

    const sesion = { id: user.id, username: user.username, name: user.name, role }
    const res = NextResponse.json(sesion)
    res.headers.set('Set-Cookie', cabeceraSetCookie(crearTokenSesion(sesion), req))
    return res
  } catch {
    return bad('Error al iniciar sesión', 500)
  }
}
