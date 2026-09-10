import { db } from '@/lib/db'
import { ok, bad, str } from '@/lib/api-helpers'

// PUT /api/customers/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json()
    const name = str(b.name)
    if (!name) return bad('El nombre es obligatorio')
    const customer = await db.customer.update({
      where: { id },
      data: {
        name,
        document: str(b.document) || null,
        phone: str(b.phone) || null,
        email: str(b.email) || null,
        address: str(b.address) || null,
        notes: str(b.notes) || null,
      },
    })
    return ok(customer)
  } catch {
    return bad('Error actualizando cliente', 500)
  }
}

// DELETE /api/customers/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const count = await db.sale.count({ where: { customerId: id } })
    if (count > 0) return bad(`No se puede eliminar: el cliente tiene ${count} ventas asociadas`)
    await db.customer.delete({ where: { id } })
    return ok({ success: true })
  } catch {
    return bad('Error eliminando cliente', 500)
  }
}
