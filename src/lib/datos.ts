// Carpeta de datos de la instalación (licencia, secreto de sesión).
// Se resuelve una sola vez: FARMASYS_DATA_DIR → /tmp en serverless → ./data
import fs from 'node:fs'
import path from 'node:path'

export function carpetaDatos(): string {
  if (process.env.FARMASYS_DATA_DIR) return process.env.FARMASYS_DATA_DIR
  const serverless = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  return serverless ? '/tmp/farmasys-data' : path.join(process.cwd(), 'data')
}

export function leerJson<T>(nombre: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(carpetaDatos(), nombre), 'utf8')) as T
  } catch {
    return null
  }
}

/** Escribe el archivo; si el disco es de solo lectura, devuelve false y se sigue en memoria. */
export function guardarJson(nombre: string, valor: unknown): boolean {
  try {
    fs.mkdirSync(carpetaDatos(), { recursive: true })
    fs.writeFileSync(path.join(carpetaDatos(), nombre), JSON.stringify(valor, null, 2))
    return true
  } catch {
    return false
  }
}

export function fechaModificacion(nombre: string): number {
  try {
    return fs.statSync(path.join(carpetaDatos(), nombre)).mtimeMs
  } catch {
    return 0
  }
}
