// Roles del sistema y qué puede ver / hacer cada uno.
// Este archivo lo usan el cliente (menú) y el servidor (proxy y rutas): es la única fuente de verdad.

export const ROLES = ['ADMIN', 'FARMACEUTICO', 'CAJERO'] as const
export type Rol = (typeof ROLES)[number]

export const ETIQUETA_ROL: Record<Rol, string> = {
  ADMIN: 'Administrador',
  FARMACEUTICO: 'Farmacéutico',
  CAJERO: 'Cajero',
}

export const DESCRIPCION_ROL: Record<Rol, string> = {
  ADMIN: 'Dueño o gerente: todos los módulos, usuarios, configuración, auditoría y licencia',
  FARMACEUTICO: 'Operación completa: ventas, recetas, controlados, inventario, compras y reportes',
  CAJERO: 'Solo su espacio de caja: punto de venta, su turno de caja, sus ventas, cotizaciones y clientes',
}

/** Módulos visibles por rol. El cajero no ve tablero, inventario, compras, reportes ni administración. */
export const MODULES_BY_ROLE: Record<Rol, string[]> = {
  ADMIN: [
    'dashboard', 'pos', 'cash', 'sales', 'quotations', 'returns', 'prescriptions',
    'interactions', 'controlled',
    'products', 'categories', 'promotions', 'inventory', 'counts', 'movements', 'alerts',
    'purchases', 'suggestions', 'suppliers', 'customers',
    'reports', 'audit', 'users', 'settings', 'licencia',
  ],
  FARMACEUTICO: [
    'dashboard', 'pos', 'cash', 'sales', 'quotations', 'returns', 'prescriptions',
    'interactions', 'controlled',
    'products', 'categories', 'promotions', 'inventory', 'counts', 'movements', 'alerts',
    'purchases', 'suggestions', 'suppliers', 'customers',
    'reports',
  ],
  CAJERO: ['pos', 'cash', 'sales', 'quotations', 'customers'],
}

/** Módulo con el que arranca cada rol al iniciar sesión. */
export const MODULO_INICIAL: Record<Rol, string> = { ADMIN: 'dashboard', FARMACEUTICO: 'dashboard', CAJERO: 'pos' }

export function esRol(v: unknown): v is Rol {
  return typeof v === 'string' && (ROLES as readonly string[]).includes(v)
}

export function canAccess(role: string, module: string): boolean {
  return esRol(role) ? MODULES_BY_ROLE[role].includes(module) : false
}

export const puedeEditarInventario = (role: string) => role === 'ADMIN' || role === 'FARMACEUTICO'

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
interface Regla { ruta: RegExp; metodos?: Metodo[]; roles: readonly Rol[] }

const TODOS: readonly Rol[] = ROLES
const GESTION: readonly Rol[] = ['ADMIN', 'FARMACEUTICO']
const SOLO_ADMIN: readonly Rol[] = ['ADMIN']
const ESCRITURA: Metodo[] = ['POST', 'PUT', 'PATCH', 'DELETE']

/**
 * Permisos de la API por ruta y método. Se evalúa la primera regla que coincide.
 * Lo que un cajero necesita para vender (catálogo, promociones, interacciones, IVA) es de solo lectura.
 */
const REGLAS: Regla[] = [
  { ruta: /^\/api\/users(\/|$)/, roles: SOLO_ADMIN },
  { ruta: /^\/api\/audit(\/|$)/, roles: SOLO_ADMIN },
  { ruta: /^\/api\/backup(\/|$)/, roles: SOLO_ADMIN },
  { ruta: /^\/api\/settings(\/|$)/, metodos: ESCRITURA, roles: SOLO_ADMIN },
  { ruta: /^\/api\/settings(\/|$)/, roles: TODOS },
  { ruta: /^\/api\/sales\/[^/]+\/void(\/|$)/, roles: SOLO_ADMIN },
  { ruta: /^\/api\/sales(\/|$)/, roles: TODOS },
  { ruta: /^\/api\/cash-(sessions|movements)(\/|$)/, roles: TODOS },
  { ruta: /^\/api\/quotations(\/|$)/, roles: TODOS },
  { ruta: /^\/api\/customers(\/|$)/, metodos: ['DELETE'], roles: GESTION },
  { ruta: /^\/api\/customers(\/|$)/, roles: TODOS },
  { ruta: /^\/api\/(products|categories|promotions|drug-interactions|prescriptions)(\/|$)/, metodos: ESCRITURA, roles: GESTION },
  { ruta: /^\/api\/(products|categories|promotions|drug-interactions|prescriptions)(\/|$)/, roles: TODOS },
  { ruta: /^\/api\/(dashboard|reports|returns|lots|inventory-movements|inventory-counts|controlled-logs|purchases|purchase-suggestions|suppliers|alerts)(\/|$)/, roles: GESTION },
]

/** Devuelve true si el rol puede llamar a esa ruta con ese método. Rutas no listadas: solo ADMIN. */
export function puedeLlamarApi(role: string, ruta: string, metodo: string): boolean {
  if (!esRol(role)) return false
  const m = metodo.toUpperCase() as Metodo
  for (const r of REGLAS) {
    if (!r.ruta.test(ruta)) continue
    if (r.metodos && !r.metodos.includes(m)) continue
    return r.roles.includes(role)
  }
  return role === 'ADMIN'
}

/** Rutas que no exigen sesión (login, arranque inicial y pantalla de licencia). */
export function esRutaLibre(ruta: string): boolean {
  return /^\/api\/(auth\/(login|logout|me)|setup|licencia|salud)(\/|$)/.test(ruta)
}
