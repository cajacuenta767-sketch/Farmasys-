import { db } from '@/lib/db'
import { ok, bad, str } from '@/lib/api-helpers'

// GET /api/categories — con conteo de productos
export async function GET() {
  try {
    const categories = await db.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
    return ok(categories)
  } catch (e) {
    console.error('categories GET', e)
    return bad('Error obteniendo categorías', 500)
  }
}

// POST /api/categories
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const name = str(b.name)
    if (!name) return bad('El nombre es obligatorio')
    const exists = await db.category.findUnique({ where: { name } })
    if (exists) return bad('Ya existe esa categoría')
    const category = await db.category.create({ data: { name, description: str(b.description) || null } })
    return ok(category)
  } catch (e) {
    console.error('categories POST', e)
    return bad('Error creando categoría', 500)
  }
}
