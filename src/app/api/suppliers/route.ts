import { db } from '@/lib/db'
import { ok, bad, str } from '@/lib/api-helpers'

// GET /api/suppliers
export async function GET() {
  try {
    const suppliers = await db.supplier.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
    return ok(suppliers)
  } catch {
    return bad('Error obteniendo proveedores', 500)
  }
}

// POST /api/suppliers
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const name = str(b.name)
    if (!name) return bad('El nombre es obligatorio')
    const supplier = await db.supplier.create({
      data: {
        name,
        taxId: str(b.taxId) || null,
        contactName: str(b.contactName) || null,
        phone: str(b.phone) || null,
        email: str(b.email) || null,
        address: str(b.address) || null,
      },
    })
    return ok(supplier)
  } catch {
    return bad('Error creando proveedor', 500)
  }
}
