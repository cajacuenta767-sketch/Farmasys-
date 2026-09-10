import { db } from '@/lib/db'
import { ok, bad, str, int, formatSeq } from '@/lib/api-helpers'
import { logAudit } from '@/lib/audit'

// GET /api/prescriptions — recetas con items prescritos
export async function GET() {
  try {
    const prescriptions = await db.prescription.findMany({
      include: {
        sale: { select: { id: true, invoiceNumber: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok(prescriptions)
  } catch {
    return bad('Error obteniendo recetas', 500)
  }
}

// POST /api/prescriptions — registra receta con sus medicamentos prescritos
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const doctorName = str(b.doctorName)
    const patientName = str(b.patientName)
    if (!doctorName || !patientName) return bad('Médico y paciente son obligatorios')

    const rawItems = Array.isArray(b.items) ? b.items : []
    const items = rawItems
      .map((it: { productId?: string; productName?: string; quantity?: number }) => ({
        productId: str(it.productId) || null,
        productName: str(it.productName) || (it.productId ? 'Producto' : '') || '',
        quantity: Math.max(1, int(it.quantity, 1)),
      }))
      .filter((it: { productName: string }) => it.productName !== '')
      .map((it: { productId: string | null; productName: string; quantity: number }) => ({
        // resolver nombre desde el producto si falta
        ...(it as { productId: string | null; productName: string; quantity: number }),
      }))

    // Resolver nombres de producto
    const productIds = items.map((i: { productId: string | null }) => i.productId).filter(Boolean) as string[]
    if (productIds.length > 0) {
      const prods = await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
      for (const it of items) {
        if (it.productId) {
          const p = prods.find((x) => x.id === it.productId)
          if (p) it.productName = p.name
        }
      }
    }
    if (items.length === 0) return bad('Agregue al menos un medicamento prescrito')

    const count = await db.prescription.count()
    const prescription = await db.prescription.create({
      data: {
        folio: formatSeq('RC', count, 4),
        doctorName,
        doctorLicense: str(b.doctorLicense) || null,
        patientName,
        saleId: str(b.saleId) || null,
        prescriptionDate: b.prescriptionDate ? new Date(`${b.prescriptionDate}T12:00:00`) : new Date(),
        notes: str(b.notes) || null,
        items: { create: items },
      },
      include: {
        sale: { select: { id: true, invoiceNumber: true } },
        items: true,
      },
    })
    await logAudit({ userName: str(b.userName) || 'Usuario', action: 'RECETA', module: 'Clínica', detail: `Receta ${prescription.folio} de ${doctorName} para ${patientName} (${items.length} medicamento(s))` })
    return ok(prescription)
  } catch (e) {
    console.error('prescriptions POST', e)
    return bad('Error registrando receta', 500)
  }
}
