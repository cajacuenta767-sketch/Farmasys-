// Tipo del resumen de licencia que devuelve GET /api/licencia (compartido con el cliente; sin dependencias de Node)
export interface ResumenLicencia {
  configurada: boolean
  desarrollo: boolean
  valido: boolean
  estado: string
  motivo: string | null
  clave: string | null
  url: string | null
  producto: string
  plan: string | null
  etiqueta: string | null
  huella: string
  plataforma: string
  vence_en: string | null
  soporte_hasta: string | null
  sin_conexion_hasta: string | null
  emergencia: boolean
  version: string
  version_actual: string | null
  desactualizada: boolean
  ultimo_latido: string | null
}

export interface DispositivoVinculado {
  huella: string
  nombre: string
  plataforma: string
  primera_vez: string
  ultima_vez: string
  verificaciones: number
}
