import { db } from '@/lib/db'
import { ok, bad, str } from '@/lib/api-helpers'

// GET /api/users
export async function GET() {
  try {
    const users = await db.user.findMany({
      select: { id: true, username: true, name: true, role: true, email: true, phone: true, active: true, createdAt: true },
      orderBy: { name: 'asc' },
    })
    return ok(users)
  } catch {
    return bad('Error obteniendo usuarios', 500)
  }
}

// POST /api/users
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const username = (str(b.username) || '').toLowerCase()
    const password = str(b.password)
    const name = str(b.name)
    const role = str(b.role) || 'VENDEDOR'
    if (!username || !password || !name) return bad('Usuario, contraseña y nombre son obligatorios')
    if (!['ADMIN', 'FARMACEUTICO', 'VENDEDOR'].includes(role)) return bad('Rol inválido')

    const exists = await db.user.findUnique({ where: { username } })
    if (exists) return bad('Ese nombre de usuario ya existe')

    const user = await db.user.create({
      data: {
        username,
        password,
        name,
        role,
        email: str(b.email) || null,
        phone: str(b.phone) || null,
      },
      select: { id: true, username: true, name: true, role: true, email: true, phone: true, active: true },
    })
    return ok(user)
  } catch {
    return bad('Error creando usuario', 500)
  }
}
