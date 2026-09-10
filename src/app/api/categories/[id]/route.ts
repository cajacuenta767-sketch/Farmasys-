import { db } from '@/lib/db'
import { ok, bad, str } from '@/lib/api-helpers'

// PUT /api/categories/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json()
    const name = str(b.name)
    if (!name) return bad('El nombre es obligatorio')
    const category = await db.category.update({
      where: { id },
      data: { name, description: str(b.description) || null },
    })
    return ok(category)
  } catch {
    return bad('Error actualizando categoría', 500)
  }
}

// DELETE /api/categories/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const count = await db.product.count({ where: { categoryId: id } })
    if (count > 0) return bad(`No se puede eliminar: hay ${count} productos en esta categoría`)
    await db.category.delete({ where: { id } })
    return ok({ success: true })
  } catch {
    return bad('Error eliminando categoría', 500)
  }
}
