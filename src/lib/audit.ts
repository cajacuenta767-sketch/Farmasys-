// Registro de auditoría — nunca debe interrumpir el flujo principal
import { db } from '@/lib/db'

export async function logAudit(data: {
  userId?: string | null
  userName: string
  action: string
  module: string
  detail?: string
}) {
  try {
    await db.auditLog.create({ data })
  } catch {
    // la auditoría no debe romper la operación principal
  }
}
