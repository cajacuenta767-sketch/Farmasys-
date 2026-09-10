// Cliente API del Sistema de Farmacias
import type {
  SessionUser, Product, Lot, Sale, Purchase, Customer, Supplier,
  Prescription, SystemUser, Category,
  CashSession, CashMovement, InventoryMovement, ControlledLog,
  Quotation, Promotion, ReturnRecord, AlertsData,
  DrugInteraction, InventoryCount, SuggestionsData, AuditLogEntry,
} from './pharmacy-types'

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Error de conexión')
  return data as T
}

export const fmtMoney = (n: number | undefined | null) =>
  '$' + (n ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtDate = (d: string | Date | undefined | null) => {
  if (!d) return '-'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const fmtDateTime = (d: string | Date | undefined | null) => {
  if (!d) return '-'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const daysUntil = (d: string | Date) => {
  const date = typeof d === 'string' ? new Date(d) : d
  return Math.ceil((date.getTime() - Date.now()) / (24 * 3600 * 1000))
}

export const api_login = (username: string, password: string) =>
  api<SessionUser>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })

export const api_logout = (userId?: string, userName?: string) =>
  api<{ success: boolean }>('/api/auth/logout', { method: 'POST', body: JSON.stringify({ userId, userName }) }).catch(() => undefined)

export const api_changePassword = (username: string, currentPassword: string, newPassword: string) =>
  api<{ success: boolean }>('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ username, currentPassword, newPassword }) })

export const api_dashboard = () => api<DashboardData>('/api/dashboard')

export const api_products = (params = '') => api<Product[]>(`/api/products${params ? `?${params}` : ''}`)
export const api_createProduct = (p: Partial<Product>) => api<Product>('/api/products', { method: 'POST', body: JSON.stringify(p) })
export const api_updateProduct = (id: string, p: Partial<Product>) => api<Product>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(p) })
export const api_deleteProduct = (id: string) => api<{ success: boolean }>(`/api/products/${id}`, { method: 'DELETE' })

export const api_categories = () => api<Category[]>('/api/categories')
export const api_createCategory = (c: { name: string; description?: string }) => api<Category>('/api/categories', { method: 'POST', body: JSON.stringify(c) })
export const api_updateCategory = (id: string, c: { name: string; description?: string }) => api<Category>(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(c) })
export const api_deleteCategory = (id: string) => api<{ success: boolean }>(`/api/categories/${id}`, { method: 'DELETE' })

export const api_lots = (params = '') => api<Lot[]>(`/api/lots${params ? `?${params}` : ''}`)
export const api_addLot = (l: { productId: string; lotNumber: string; quantity: number; expiryDate: string; purchasePrice?: number }) =>
  api<Lot>('/api/lots', { method: 'POST', body: JSON.stringify(l) })
export const api_updateLot = (id: string, quantity: number) => api<Lot>(`/api/lots/${id}`, { method: 'PUT', body: JSON.stringify({ quantity }) })
export const api_deleteLot = (id: string) => api<{ success: boolean }>(`/api/lots/${id}`, { method: 'DELETE' })

export const api_sales = (params = '') => api<Sale[]>(`/api/sales${params ? `?${params}` : ''}`)
export const api_createSale = (s: Record<string, unknown>) => api<Sale>('/api/sales', { method: 'POST', body: JSON.stringify(s) })
export const api_getSale = (id: string) => api<Sale>(`/api/sales/${id}`)
export const api_voidSale = (id: string, reason: string, userName?: string) =>
  api<{ success: boolean }>(`/api/sales/${id}/void`, { method: 'POST', body: JSON.stringify({ reason, userName }) })

export const api_purchases = (params = '') => api<Purchase[]>(`/api/purchases${params ? `?${params}` : ''}`)
export const api_createPurchase = (p: Record<string, unknown>) => api<Purchase>('/api/purchases', { method: 'POST', body: JSON.stringify(p) })
export const api_receivePurchase = (id: string, userName?: string) =>
  api<{ success: boolean }>(`/api/purchases/${id}/receive?userName=${encodeURIComponent(userName || 'Usuario')}`, { method: 'POST' })
export const api_cancelPurchase = (id: string, userName?: string) =>
  api<{ success: boolean }>(`/api/purchases/${id}/cancel?userName=${encodeURIComponent(userName || 'Usuario')}`, { method: 'POST' })

export const api_customers = (search = '') => api<Customer[]>(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`)
export const api_createCustomer = (c: Partial<Customer>) => api<Customer>('/api/customers', { method: 'POST', body: JSON.stringify(c) })
export const api_updateCustomer = (id: string, c: Partial<Customer>) => api<Customer>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(c) })
export const api_deleteCustomer = (id: string) => api<{ success: boolean }>(`/api/customers/${id}`, { method: 'DELETE' })

export const api_suppliers = () => api<Supplier[]>('/api/suppliers')
export const api_createSupplier = (s: Partial<Supplier>) => api<Supplier>('/api/suppliers', { method: 'POST', body: JSON.stringify(s) })
export const api_updateSupplier = (id: string, s: Partial<Supplier>) => api<Supplier>(`/api/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(s) })
export const api_deleteSupplier = (id: string) => api<{ success: boolean }>(`/api/suppliers/${id}`, { method: 'DELETE' })

export const api_prescriptions = () => api<Prescription[]>('/api/prescriptions')
export const api_createPrescription = (p: Record<string, unknown>) => api<Prescription>('/api/prescriptions', { method: 'POST', body: JSON.stringify(p) })

export const api_users = () => api<SystemUser[]>('/api/users')
export const api_createUser = (u: Partial<SystemUser> & { password?: string }) => api<SystemUser>('/api/users', { method: 'POST', body: JSON.stringify(u) })
export const api_updateUser = (id: string, u: Partial<SystemUser> & { password?: string }) => api<SystemUser>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(u) })
export const api_deleteUser = (id: string) => api<{ success: boolean }>(`/api/users/${id}`, { method: 'DELETE' })

export const api_settings = () => api<Record<string, string>>('/api/settings')
export const api_saveSettings = (s: Record<string, string>) => api<{ success: boolean }>('/api/settings', { method: 'PUT', body: JSON.stringify(s) })

export const api_report = (type: string, from?: string, to?: string) => {
  const p = new URLSearchParams({ type })
  if (from) p.set('from', from)
  if (to) p.set('to', to)
  return api<ReportData>(`/api/reports?${p.toString()}`)
}

// ===== CAJA =====
export const api_cashSessions = () => api<CashSession[]>('/api/cash-sessions')
export const api_openCash = (userId: string, openingAmount: number) =>
  api<CashSession>('/api/cash-sessions', { method: 'POST', body: JSON.stringify({ userId, openingAmount }) })
export const api_getCashSession = (id: string) => api<CashSession>(`/api/cash-sessions/${id}`)
export const api_closeCash = (id: string, closingAmount: number, notes?: string) =>
  api<CashSession>(`/api/cash-sessions/${id}`, { method: 'POST', body: JSON.stringify({ closingAmount, notes }) })
export const api_cashMovements = (sessionId?: string) =>
  api<CashMovement[]>(`/api/cash-movements${sessionId ? `?sessionId=${sessionId}` : ''}`)
export const api_addCashMovement = (m: { type: 'INGRESO' | 'RETIRO'; amount: number; reason: string; userId: string }) =>
  api<CashMovement>('/api/cash-movements', { method: 'POST', body: JSON.stringify(m) })

// ===== ALERTAS =====
export const api_alerts = () => api<AlertsData>('/api/alerts')

// ===== KARDEX =====
export const api_inventoryMovements = (params = '') =>
  api<InventoryMovement[]>(`/api/inventory-movements${params ? `?${params}` : ''}`)
export const api_addInventoryMovement = (m: { productId: string; type: string; quantity: number; reason: string; userId: string; lotNumber?: string; reference?: string }) =>
  api<InventoryMovement>('/api/inventory-movements', { method: 'POST', body: JSON.stringify(m) })

// ===== CONTROLADOS =====
export const api_controlledLogs = (params = '') =>
  api<ControlledLog[]>(`/api/controlled-logs${params ? `?${params}` : ''}`)
export const api_addControlledLog = (l: Record<string, unknown>) =>
  api<ControlledLog>('/api/controlled-logs', { method: 'POST', body: JSON.stringify(l) })

// ===== COTIZACIONES =====
export const api_quotations = (params = '') => api<Quotation[]>(`/api/quotations${params ? `?${params}` : ''}`)
export const api_createQuotation = (q: Record<string, unknown>) =>
  api<Quotation>('/api/quotations', { method: 'POST', body: JSON.stringify(q) })
export const api_updateQuotation = (id: string, status: string) =>
  api<Quotation>(`/api/quotations/${id}`, { method: 'PUT', body: JSON.stringify({ status }) })
export const api_deleteQuotation = (id: string) => api<{ success: boolean }>(`/api/quotations/${id}`, { method: 'DELETE' })

// ===== PROMOCIONES =====
export const api_promotions = () => api<Promotion[]>('/api/promotions')
export const api_createPromotion = (p: Record<string, unknown>) =>
  api<Promotion>('/api/promotions', { method: 'POST', body: JSON.stringify(p) })
export const api_updatePromotion = (id: string, p: Record<string, unknown>) =>
  api<Promotion>(`/api/promotions/${id}`, { method: 'PUT', body: JSON.stringify(p) })
export const api_deletePromotion = (id: string) => api<{ success: boolean }>(`/api/promotions/${id}`, { method: 'DELETE' })

// ===== DEVOLUCIONES =====
export const api_returns = () => api<ReturnRecord[]>('/api/returns')
export const api_createReturn = (r: { saleId: string; reason: string; userId: string; itemIds?: string[] }) =>
  api<ReturnRecord>('/api/returns', { method: 'POST', body: JSON.stringify(r) })

// ===== INTERACCIONES MEDICAMENTOSAS =====
export const api_interactions = (all = false) => api<DrugInteraction[]>(`/api/drug-interactions${all ? '?all=1' : ''}`)
export const api_createInteraction = (i: Record<string, unknown>) =>
  api<DrugInteraction>('/api/drug-interactions', { method: 'POST', body: JSON.stringify(i) })
export const api_updateInteraction = (id: string, i: Record<string, unknown>) =>
  api<DrugInteraction>(`/api/drug-interactions/${id}`, { method: 'PUT', body: JSON.stringify(i) })
export const api_deleteInteraction = (id: string, userName?: string) =>
  api<{ success: boolean }>(`/api/drug-interactions/${id}?userName=${encodeURIComponent(userName || 'Usuario')}`, { method: 'DELETE' })

// ===== CONTEO FÍSICO DE INVENTARIO =====
export const api_counts = () => api<InventoryCount[]>('/api/inventory-counts')
export const api_createCount = (c: { userId: string; notes?: string; categoryId?: string }) =>
  api<InventoryCount>('/api/inventory-counts', { method: 'POST', body: JSON.stringify(c) })
export const api_getCount = (id: string) => api<InventoryCount>(`/api/inventory-counts/${id}`)
export const api_countAction = (id: string, action: 'GUARDAR' | 'APLICAR' | 'CANCELAR', items?: { id: string; countedQty: number }[], userName?: string) =>
  api<InventoryCount | { success: boolean }>(`/api/inventory-counts/${id}`, { method: 'POST', body: JSON.stringify({ action, items: items || [], userName }) })

// ===== SUGERENCIAS DE COMPRA =====
export const api_suggestions = () => api<SuggestionsData>('/api/purchase-suggestions')

// ===== BITÁCORA DE AUDITORÍA =====
export const api_audit = (params = '') => api<AuditLogEntry[]>(`/api/audit${params ? `?${params}` : ''}`)

// ===== RESPALDO DE DATOS =====
export async function downloadBackup() {
  const data = await api<Record<string, unknown>>('/api/backup')
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `farmasys-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
}

// Exportar una tabla HTML como CSV (BOM para Excel)
export function exportTableCsv(id: string, filename: string) {
  const table = document.getElementById(id)
  if (!table) return
  const rows = Array.from(table.querySelectorAll('tr')).map((tr) =>
    Array.from(tr.querySelectorAll('th,td')).map((c) => `"${(c.textContent || '').replace(/"/g, '""')}"`).join(',')
  )
  const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

// Tipos de datos del dashboard y reportes
export interface DashboardData {
  todayTotal: number
  todayCount: number
  monthTotal: number
  productCount: number
  lowStockCount: number
  lowStock: { id: string; code: string; name: string; stock: number; minStock: number; category?: string }[]
  expiringCount: number
  expiring: { id: string; lotNumber: string; expiryDate: string; quantity: number; productId: string; productName: string; code: string }[]
  last7: { date: string; total: number; count: number }[]
  topProducts: { name: string; qty: number; total: number }[]
  recentSales: { id: string; invoiceNumber: string; total: number; createdAt: string; seller: string; customer: string }[]
  pendingPurchases: number
  byHour?: { hour: string; total: number; count: number }[]
  yesterdayTotal?: number
  yesterdayCount?: number
}

export interface ReportData {
  summary?: { total: number; subtotal: number; tax: number; discount: number; count: number }
  byDay?: { date: string; total: number; count: number }[]
  byPayment?: { method: string; total: number; count: number }[]
  bySeller?: { seller: string; total: number; count: number }[]
  top?: { name: string; qty: number; revenue: number }[]
  low?: { code: string; name: string; category?: string; supplier?: string; stock: number; minStock: number }[]
  rows?: { lotNumber: string; expiryDate: string; quantity: number; daysLeft: number; code: string; productName: string; category?: string; value: number }[]
  expiredCount?: number
  expiredValue?: number
  valuation?: {
    rows: { code: string; name: string; category?: string; stock: number; avgCost: number; costValue: number; saleValue: number; marginPct: number }[]
    totalCost: number
    totalSale: number
    byCategory: { category: string; costValue: number; saleValue: number; products: number }[]
  }
}
