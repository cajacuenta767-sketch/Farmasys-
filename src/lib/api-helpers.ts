// Helpers para respuestas API y utilidades comunes
import { NextResponse } from 'next/server'

export function ok<T>(data: T) {
  return NextResponse.json(data)
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : fallback
}

export function int(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? parseInt(v, 10) : typeof v === 'number' ? Math.trunc(v) : NaN
  return Number.isFinite(n) ? n : fallback
}

export function str(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t === '' ? undefined : t
}

// Genera el siguiente número secuencial con prefijo
export function formatSeq(prefix: string, count: number, pad: number): string {
  return `${prefix}-${String(count + 1).padStart(pad, '0')}`
}
