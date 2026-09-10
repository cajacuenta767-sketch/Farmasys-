import { db } from '@/lib/db'
import { ok, bad, str } from '@/lib/api-helpers'

// GET /api/customers?search=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [{ name: { contains: search } }, { document: { contains: search } }, { phone: { contains: search } }]
    }
    const customers = await db.customer.findMany({
      where,
      include: { _count: { select: { sales: true } } },
      orderBy: { name: 'asc' },
    })
    return ok(customers)
  } catch {
    return bad('Error obteniendo clientes', 500)
  }
}

// POST /api/customers
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const name = str(b.name)
    if (!name) return bad('El nombre es obligatorio')
    const customer = await db.customer.create({
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
    return bad('Error creando cliente', 500)
  }
}
