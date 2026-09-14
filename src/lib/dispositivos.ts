// Dispositivos vinculados (app Android / equipos que abren esta instalación con el código de verificación).
// Se guardan en data/dispositivos.json; la pantalla Licencia los muestra al administrador.
import { leerJson, guardarJson } from '@/lib/datos'

export interface Dispositivo {
  huella: string
  nombre: string
  plataforma: string
  primera_vez: string
  ultima_vez: string
  verificaciones: number
}

const ARCHIVO = 'dispositivos.json'

export function listarDispositivos(): Dispositivo[] {
  return leerJson<Dispositivo[]>(ARCHIVO) || []
}

export function registrarDispositivo(d: { huella: string; nombre?: string; plataforma?: string }): Dispositivo[] {
  const lista = listarDispositivos()
  const ahora = new Date().toISOString()
  const existente = lista.find((x) => x.huella === d.huella)
  if (existente) {
    existente.ultima_vez = ahora
    existente.verificaciones += 1
    if (d.nombre) existente.nombre = d.nombre
  } else {
    lista.push({ huella: d.huella, nombre: d.nombre || 'Dispositivo', plataforma: d.plataforma || 'android', primera_vez: ahora, ultima_vez: ahora, verificaciones: 1 })
  }
  guardarJson(ARCHIVO, lista)
  return lista
}

export function quitarDispositivo(huella: string): Dispositivo[] {
  const lista = listarDispositivos().filter((x) => x.huella !== huella)
  guardarJson(ARCHIVO, lista)
  return lista
}
