import { db } from '@/lib/db'
import { ok, bad, str } from '@/lib/api-helpers'

// PUT /api/suppliers/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json()
    const name = str(b.name)
    if (!name) return bad('El nombre es obligatorio')
    const supplier = await db.supplier.update({
      where: { id },
      data: {
        name,
        taxId: str(b.taxId) || null,
        contactName: str(b.contactName) || null,
        phone: str(b.phone) || null,
        email: str(b.email) || null,
        address: str(b.address) || null,
        active: b.active !== false,
      },
    })
    return ok(supplier)
  } catch {
    return bad('Error actualizando proveedor', 500)
  }
}

// DELETE /api/suppliers/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const count = await db.product.count({ where: { supplierId: id } })
    if (count > 0) {
      await db.supplier.update({ where: { id }, data: { active: false } })
      return ok({ success: true, deactivated: true })
    }
    await db.supplier.delete({ where: { id } })
    return ok({ success: true })
  } catch {
    return bad('Error eliminando proveedor', 500)
  }
}
