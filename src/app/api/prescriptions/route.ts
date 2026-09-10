import { db } from '@/lib/db'
import { ok, bad, str, formatSeq } from '@/lib/api-helpers'

// GET /api/prescriptions
export async function GET() {
  try {
    const prescriptions = await db.prescription.findMany({
      include: { sale: { select: { id: true, invoiceNumber: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return ok(prescriptions)
  } catch {
    return bad('Error obteniendo recetas', 500)
  }
}

// POST /api/prescriptions
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const doctorName = str(b.doctorName)
    const patientName = str(b.patientName)
    if (!doctorName || !patientName) return bad('Médico y paciente son obligatorios')

    const count = await db.prescription.count()
    const prescription = await db.prescription.create({
      data: {
        folio: formatSeq('RC', count, 4),
        doctorName,
        doctorLicense: str(b.doctorLicense) || null,
        patientName,
        saleId: str(b.saleId) || null,
        notes: str(b.notes) || null,
      },
      include: { sale: { select: { id: true, invoiceNumber: true } } },
    })
    return ok(prescription)
  } catch {
    return bad('Error registrando receta', 500)
  }
}
