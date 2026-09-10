import { db } from '@/lib/db'
import { ok, bad, num, int, str } from '@/lib/api-helpers'

// GET /api/products?search=&categoryId=&rx=&lowStock=&active=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const rx = searchParams.get('rx') || ''
    const lowStock = searchParams.get('lowStock') || ''

    const where: Record<string, unknown> = { active: true }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { barcode: { contains: search } },
        { activeIngredient: { contains: search } },
        { lab: { contains: search } },
      ]
    }
    if (categoryId) where.categoryId = categoryId
    if (rx === 'true') where.requiresPrescription = true
    if (rx === 'false') where.requiresPrescription = false

    const products = await db.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        lots: { where: { quantity: { gt: 0 } }, orderBy: { expiryDate: 'asc' } },
      },
      orderBy: { name: 'asc' },
    })

    let result = products.map((p) => ({
      ...p,
      stock: p.lots.reduce((s, l) => s + l.quantity, 0),
    }))

    if (lowStock === 'true') result = result.filter((p) => p.stock <= p.minStock)

    return ok(result)
  } catch (e) {
    console.error('products GET', e)
    return bad('Error obteniendo productos', 500)
  }
}

// POST /api/products
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const name = str(b.name)
    const code = str(b.code)
    if (!name || !code) return bad('Código y nombre son obligatorios')

    const exists = await db.product.findUnique({ where: { code } })
    if (exists) return bad('Ya existe un producto con ese código')

    const product = await db.product.create({
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
    console.error('products POST', e)
    return bad('Error creando producto', 500)
  }
}
