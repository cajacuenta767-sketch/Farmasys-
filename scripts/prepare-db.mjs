// Genera prisma/template.db: una base SQLite vacía con el esquema aplicado.
// Se ejecuta en `npm run build`; en el primer arranque src/lib/db.ts copia esta plantilla
// a la ruta real (Electron: carpeta de datos del usuario; Docker: volumen; Vercel: /tmp).
import { spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const plantilla = resolve('prisma', 'template.db')
if (existsSync(plantilla)) rmSync(plantilla)
const r = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, DATABASE_URL: 'file:./template.db' },
})
if (r.status !== 0 || !existsSync(plantilla)) {
  console.error('No se pudo generar prisma/template.db')
  process.exit(1)
}
console.log(`Plantilla de base de datos lista: ${plantilla}`)
