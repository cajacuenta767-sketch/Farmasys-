import { db } from '@/lib/db'
import { ok, bad, num, int, str } from '@/lib/api-helpers'

// GET /api/products/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      supplier: true,
      lots: { orderBy: { expiryDate: 'asc' } },
    },
  })
  if (!product) return bad('Producto no encontrado', 404)
  return ok({ ...product, stock: product.lots.reduce((s, l) => s + l.quantity, 0) })
}

// PUT /api/products/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json()
    const name = str(b.name)
    const code = str(b.code)
    if (!name || !code) return bad('Código y nombre son obligatorios')

    const dup = await db.product.findFirst({ where: { code, id: { not: id } } })
    if (dup) return bad('Ya existe otro producto con ese código')

    const product = await db.product.update({
      where: { id },
      data: {
        code,
        barcode: str(b.barcode) || null,
        name,
        description: str(b.description) || null,
        categoryId: str(b.categoryId) || null,
        supplierId: str(b.supplierId) || null,
        lab: str(b.lab) || null,
        activeIngredient: str(b.activeIngredient) || null,
        presentation: str(b.presentation) || null,
        concentration: str(b.concentration) || null,
        purchasePrice: num(b.purchasePrice),
        salePrice: num(b.salePrice),
        minStock: int(b.minStock, 5),
        requiresPrescription: !!b.requiresPrescription,
        controlled: !!b.controlled,
        location: str(b.location) || null,
      },
      include: { category: true, supplier: true },
    })
    return ok(product)
  } catch (e) {
    console.error('products PUT', e)
    return bad('Error actualizando producto', 500)
  }
}

// DELETE /api/products/[id] — desactivación lógica
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.product.update({ where: { id }, data: { active: false } })
    return ok({ success: true })
  } catch (e) {
    console.error('products DELETE', e)
    return bad('Error eliminando producto', 500)
  }
}
