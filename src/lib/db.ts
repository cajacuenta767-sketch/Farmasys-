import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/** Base vacía con el esquema ya aplicado; se genera en `npm run build` (scripts/prepare-db.mjs). */
function plantillaDb(): string | null {
  const candidatos = [process.env.FARMASYS_TEMPLATE_DB, path.join(process.cwd(), 'prisma', 'template.db')].filter(Boolean) as string[]
  return candidatos.find((c) => fs.existsSync(/*turbopackIgnore: true*/ c)) || null
}

/**
 * Resuelve DATABASE_URL:
 *  - URL remota (Postgres, Turso, etc.): se usa tal cual.
 *  - `file:` relativa: se resuelve contra la carpeta prisma/ para que no dependa del cwd.
 *  - Serverless (Vercel): la base vive en /tmp (efímera; para producción usa una base remota).
 *  - Si el archivo no existe, se copia la plantilla vacía: así el primer arranque no necesita `prisma db push`.
 */
function resolveDatabaseUrl(): string | undefined {
  const isServerless = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  const envUrl = process.env.DATABASE_URL
  if (envUrl && !envUrl.startsWith('file:')) return envUrl

  let archivo: string
  if (isServerless) {
    archivo = '/tmp/farmasys.db'
  } else {
    const relativo = (envUrl || 'file:./dev.db').slice('file:'.length)
    archivo = path.isAbsolute(relativo) ? relativo : path.resolve(process.cwd(), 'prisma', relativo)
  }

  if (!fs.existsSync(/*turbopackIgnore: true*/ archivo)) {
    const plantilla = plantillaDb()
    try {
      fs.mkdirSync(/*turbopackIgnore: true*/ path.dirname(archivo), { recursive: true })
      if (plantilla) {
        fs.copyFileSync(/*turbopackIgnore: true*/ plantilla, archivo)
        console.log(`[db] Base de datos nueva creada en ${archivo}`)
      } else {
        console.warn(`[db] No existe ${archivo} ni la plantilla prisma/template.db. Ejecuta "npm run db:push".`)
      }
    } catch (err) {
      console.error('[db] No se pudo preparar la base de datos:', err)
    }
  }

  const resolved = `file:${archivo}`
  process.env.DATABASE_URL = resolved
  return resolved
}

const resolvedDbUrl = resolveDatabaseUrl()

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: resolvedDbUrl ? { db: { url: resolvedDbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
