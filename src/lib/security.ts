// Utilidades de seguridad: hash de contraseñas (SHA-256 con salt de aplicación)
import { createHash } from 'node:crypto'

const APP_SALT = 'farmasys::v1::'

export function hashPassword(password: string): string {
  return createHash('sha256').update(APP_SALT + password).digest('hex')
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false
  // Las contraseñas hash tienen 64 caracteres hexadecimales
  if (stored.length === 64 && /^[0-9a-f]+$/.test(stored)) {
    return hashPassword(password) === stored
  }
  // Migración automática: contraseñas legacy en texto plano
  return password === stored
}

export function isHashed(stored: string): boolean {
  return stored.length === 64 && /^[0-9a-f]+$/.test(stored)
}
