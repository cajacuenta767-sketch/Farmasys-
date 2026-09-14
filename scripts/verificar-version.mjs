// Comprueba que la versión reportada a CONTROL (src/lib/version.ts) coincide con package.json.
import { readFileSync } from 'node:fs'
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const src = readFileSync('src/lib/version.ts', 'utf8')
const m = src.match(/VERSION = '([^']+)'/)
if (!m || m[1] !== pkg.version) {
  console.error(`La versión de package.json (${pkg.version}) no coincide con src/lib/version.ts (${m?.[1]})`)
  process.exit(1)
}
console.log(`Versión ${pkg.version} verificada`)
