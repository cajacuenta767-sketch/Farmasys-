// Tipos compartidos del Sistema de Farmacias
export interface SessionUser {
  id: string
  username: string
  name: string
  role: 'ADMIN' | 'FARMACEUTICO' | 'VENDEDOR'
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
  customer?: { id: string; name: string } | null
  customerName?: string | null
  userId: string
  user?: { id: string; name: string } | null
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: string
  amountPaid: number
  change: number
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
  notes?: string | null
  createdAt: string
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

export interface Prescription {
  id: string
  folio: string
  doctorName: string
  doctorLicense?: string | null
  patientName: string
  saleId?: string | null
  sale?: { id: string; invoiceNumber: string } | null
  notes?: string | null
  createdAt: string
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
  createdAt?: string
}

export interface Category {
  id: string
  name: string
  description?: string | null
  _count?: { products: number }
}

// Módulos disponibles y roles con acceso
export const MODULES_BY_ROLE: Record<string, string[]> = {
  ADMIN: ['dashboard', 'pos', 'products', 'inventory', 'sales', 'purchases', 'suppliers', 'customers', 'prescriptions', 'reports', 'users', 'settings'],
  FARMACEUTICO: ['dashboard', 'pos', 'products', 'inventory', 'sales', 'purchases', 'suppliers', 'customers', 'prescriptions', 'reports'],
  VENDEDOR: ['dashboard', 'pos', 'sales', 'customers', 'products'],
}

export function canAccess(role: string, module: string): boolean {
  return (MODULES_BY_ROLE[role] || []).includes(module)
}
