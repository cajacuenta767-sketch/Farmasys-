// Tipos compartidos del Sistema de Farmacias
import type { Rol } from './permisos'

export interface SessionUser {
  id: string
  username: string
  name: string
  role: Rol
}

export interface Product {
  id: string
  code: string
  barcode?: string | null
  name: string
  description?: string | null
  categoryId?: string | null
  category?: { id: string; name: string } | null
  supplierId?: string | null
  supplier?: { id: string; name: string } | null
  lab?: string | null
  activeIngredient?: string | null
  presentation?: string | null
  concentration?: string | null
  purchasePrice: number
  salePrice: number
  minStock: number
  requiresPrescription: boolean
  controlled: boolean
  location?: string | null
  active: boolean
  lots?: Lot[]
  stock?: number
}

export interface Lot {
  id: string
  productId: string
  lotNumber: string
  expiryDate: string
  quantity: number
  purchasePrice: number
  product?: Product
}

export interface SaleItem {
  id?: string
  productId: string
  lotId?: string | null
  productName: string
  lotNumber?: string | null
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface Sale {
  id: string
  invoiceNumber: string
  customerId?: string | null
  customer?: { id: string; name: string; document?: string | null } | null
  customerName?: string | null
  userId: string
  user?: { id: string; name: string } | null
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: string
  amountPaid: number
  paidCash?: number
  paidCard?: number
  paidTransfer?: number
  change: number
  pointsEarned?: number
  pointsRedeemed?: number
  status: string
  voidReason?: string | null
  notes?: string | null
  createdAt: string
  items?: SaleItem[]
  prescriptions?: Prescription[]
}

export interface PurchaseItem {
  id?: string
  productId: string
  product?: { id: string; name: string; code: string }
  quantity: number
  unitCost: number
  lotNumber?: string | null
  expiryDate?: string | null
}

export interface Purchase {
  id: string
  orderNumber: string
  supplierId: string
  supplier?: { id: string; name: string } | null
  userId: string
  user?: { id: string; name: string } | null
  total: number
  status: string
  notes?: string | null
  createdAt: string
  receivedAt?: string | null
  items?: PurchaseItem[]
}

export interface Customer {
  id: string
  document?: string | null
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  points?: number
  notes?: string | null
  createdAt: string
  _count?: { sales: number }
}

export interface Supplier {
  id: string
  name: string
  taxId?: string | null
  contactName?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  active: boolean
}

export interface PrescriptionItem {
  id?: string
  prescriptionId?: string
  productId?: string | null
  productName: string
  quantity: number
  dispensed: boolean
}

export interface Prescription {
  id: string
  folio: string
  doctorName: string
  doctorLicense?: string | null
  patientName: string
  saleId?: string | null
  sale?: { id: string; invoiceNumber: string } | null
  prescriptionDate?: string | null
  status: 'REGISTRADA' | 'PARCIAL' | 'DISPENSADA'
  notes?: string | null
  createdAt: string
  items?: PrescriptionItem[]
}

export interface SystemUser {
  id: string
  username: string
  password?: string
  name: string
  role: string
  email?: string | null
  phone?: string | null
  active: boolean
  lastLoginAt?: string | null
  createdAt?: string
}

export interface Category {
  id: string
  name: string
  description?: string | null
  _count?: { products: number }
}

export interface CashMovement {
  id: string
  cashSessionId: string
  type: 'INGRESO' | 'RETIRO' | 'VENTA'
  amount: number
  reason: string
  userId: string
  user?: { id: string; name: string } | null
  createdAt: string
}

export interface CashSession {
  id: string
  userId: string
  user?: { id: string; name: string } | null
  openingAmount: number
  closingAmount?: number | null
  expectedAmount?: number | null
  difference?: number | null
  status: 'ABIERTA' | 'CERRADA'
  openedAt: string
  closedAt?: string | null
  notes?: string | null
  movements?: CashMovement[]
}

export interface InventoryMovement {
  id: string
  productId: string
  product?: { id: string; name: string; code: string; purchasePrice?: number } | null
  lotNumber?: string | null
  type: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'MERMA'
  quantity: number
  reason: string
  reference?: string | null
  userId: string
  user?: { id: string; name: string } | null
  createdAt: string
}

export interface ControlledLog {
  id: string
  productId: string
  product?: { id: string; name: string; code: string; concentration?: string | null } | null
  lotNumber: string
  operation: 'ENTRADA' | 'SALIDA'
  quantity: number
  doctorName?: string | null
  patientName?: string | null
  folio?: string | null
  userId: string
  user?: { id: string; name: string } | null
  createdAt: string
}

export interface QuotationItem {
  id?: string
  productId: string
  product?: { id: string; name: string; code: string } | null
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface Quotation {
  id: string
  quoteNumber: string
  customerId?: string | null
  customerName?: string | null
  userId: string
  user?: { id: string; name: string } | null
  total: number
  status: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'VENCIDA'
  validUntil?: string | null
  notes?: string | null
  createdAt: string
  items?: QuotationItem[]
}

export interface Promotion {
  id: string
  name: string
  description?: string | null
  type: 'PORCENTAJE' | 'MONTO'
  value: number
  productId?: string | null
  product?: { id: string; name: string; code: string } | null
  categoryId?: string | null
  category?: { id: string; name: string } | null
  startDate?: string | null
  endDate?: string | null
  active: boolean
  createdAt: string
}

export interface ReturnRecord {
  id: string
  returnNumber: string
  saleId: string
  sale?: { id: string; invoiceNumber: string; total: number; customerName?: string | null } | null
  userId: string
  user?: { id: string; name: string } | null
  amount: number
  reason: string
  restocked: boolean
  createdAt: string
}

export interface AlertItem {
  type: 'STOCK' | 'CADUCIDAD'
  severity: 'CRITICA' | 'ADVERTENCIA' | 'INFO'
  id: string
  code: string
  name: string
  message: string
  stock?: number
  category?: string
  minStock?: number
}

export interface AlertsData {
  total: number
  critical: number
  warning: number
  info: number
  alerts: AlertItem[]
  pendingPurchases: number
  openQuotations: number
  openCash: { id: string; openedAt: string; user?: string } | null
}

// ===== NUEVOS MÓDULOS (fase 3) =====
export interface DrugInteraction {
  id: string
  productAId: string
  productA?: { id: string; name: string; code: string } | null
  productBId: string
  productB?: { id: string; name: string; code: string } | null
  severity: 'LEVE' | 'MODERADA' | 'GRAVE'
  description: string
  active: boolean
  createdAt: string
}

export interface InventoryCountItem {
  id: string
  countId?: string
  lotId: string
  productId: string
  productName: string
  lotNumber: string
  systemQty: number
  countedQty?: number | null
  difference?: number | null
}

export interface InventoryCount {
  id: string
  countNumber: string
  userId: string
  user?: { id: string; name: string } | null
  status: 'EN_PROCESO' | 'APLICADO' | 'CANCELADO'
  notes?: string | null
  totalLots: number
  differences: number
  createdAt: string
  appliedAt?: string | null
  items?: InventoryCountItem[]
  _count?: { items: number }
}

export interface PurchaseSuggestion {
  productId: string
  code: string
  name: string
  category?: string
  supplierId?: string | null
  supplierName: string
  stock: number
  minStock: number
  sold30: number
  avgDaily: number
  daysCover?: number | null
  suggested: number
  urgency: 'AGOTADO' | 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
  unitCost: number
  estimatedCost: number
}

export interface SuggestionsData {
  suggestions: PurchaseSuggestion[]
  totalEstimated: number
  generatedAt: string
}

export interface AuditLogEntry {
  id: string
  userId?: string | null
  userName: string
  action: string
  module: string
  detail?: string | null
  createdAt: string
}

// Roles, módulos por rol y permisos: ver src/lib/permisos.ts (fuente única para cliente y servidor)
export { MODULES_BY_ROLE, canAccess } from './permisos'
