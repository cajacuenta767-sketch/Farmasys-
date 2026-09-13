import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function resolveDatabaseUrl(): string | undefined {
  const isVercel = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  const envUrl = process.env.DATABASE_URL

  // Si se proporciona una URL remota (Postgres, Neon, Supabase, Turso), usarla directamente
  if (envUrl && !envUrl.startsWith('file:')) {
    return envUrl
  }

  // En Vercel Serverless, el filesystem /var/task es de solo lectura.
  // Clonamos la base de datos pre-sembrada a /tmp para habilitar escrituras y funcionamiento completo.
  if (isVercel) {
    const tmpDbPath = '/tmp/farmasys.db'
    if (!fs.existsSync(tmpDbPath)) {
      const seedCandidate = path.join(process.cwd(), 'prisma', 'dev.db')
      if (fs.existsSync(seedCandidate)) {
        try {
          fs.copyFileSync(seedCandidate, tmpDbPath)
          console.log(`[db] Cloned seed database to ${tmpDbPath}`)
        } catch (err) {
          console.error('[db] Error copying seed db to /tmp:', err)
        }
      } else {
        console.warn('[db] Seed database template not found at prisma/dev.db')
      }
    }
    const resolvedUrl = `file:${tmpDbPath}`
    process.env.DATABASE_URL = resolvedUrl
    return resolvedUrl
  }

  return envUrl
}

const resolvedDbUrl = resolveDatabaseUrl()

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: resolvedDbUrl ? { db: { url: resolvedDbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db