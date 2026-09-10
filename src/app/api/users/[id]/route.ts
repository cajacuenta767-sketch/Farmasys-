import { db } from '@/lib/db'
import { ok, bad, str } from '@/lib/api-helpers'
import { hashPassword } from '@/lib/security'
import { logAudit } from '@/lib/audit'

// PUT /api/users/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json()
    const name = str(b.name)
    const role = str(b.role)
    const actor = str(b.actorName) || 'Sistema'
    if (!name) return bad('El nombre es obligatorio')
    if (role && !['ADMIN', 'FARMACEUTICO', 'VENDEDOR'].includes(role)) return bad('Rol inválido')

    const data: Record<string, unknown> = {
      name,
      role: role || 'VENDEDOR',
      email: str(b.email) || null,
      phone: str(b.phone) || null,
      active: b.active !== false,
    }
    const password = str(b.password)
    if (password) {
      if (password.length < 6) return bad('La contraseña debe tener al menos 6 caracteres')
      data.password = hashPassword(password)
    }

    const user = await db.user.update({
      where: { id },
      data,
      select: { id: true, username: true, name: true, role: true, email: true, phone: true, active: true },
    })
    await logAudit({ userName: actor, action: 'USUARIO', module: 'Administración', detail: `Usuario actualizado: ${user.name} (@${user.username})` })
    return ok(user)
  } catch {
    return bad('Error actualizando usuario', 500)
  }
}

// DELETE /api/users/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const sales = await db.sale.count({ where: { userId: id } })
    if (sales > 0) {
      await db.user.update({ where: { id }, data: { active: false } })
      return ok({ success: true, deactivated: true })
    }
    await db.user.delete({ where: { id } })
    return ok({ success: true })
  } catch {
    return bad('Error eliminando usuario', 500)
  }
}
