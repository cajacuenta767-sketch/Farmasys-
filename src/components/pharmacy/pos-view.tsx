'use client'

// Punto de Venta (POS) del Sistema de Farmacias
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  api_products, api_customers, api_createSale, api_getSale, api_settings, fmtMoney,
} from '@/lib/pharmacy-client'
import type { Product, Customer, Sale, SessionUser } from '@/lib/pharmacy-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, ScanBarcode, FileText, Printer, RotateCcw, Pill, AlertCircle,
} from 'lucide-react'

interface CartItem {
  productId: string
  name: string
  code: string
  unitPrice: number
  quantity: number
  stock: number
  requiresPrescription: boolean
  controlled: boolean
  presentation?: string | null
}

export function PosView({ user, onSaleDone }: { user: SessionUser; onSaleDone?: () => void }) {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerId, setCustomerId] = useState<string>('ocasional')
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO')
  const [discount, setDiscount] = useState('0')
  const [amountPaid, setAmountPaid] = useState('')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [lastSale, setLastSale] = useState<Sale | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [taxRate, setTaxRate] = useState(12)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api_products().then(setProducts).catch(() => {})
    api_customers().then(setCustomers).catch(() => {})
    api_settings().then((s) => setTaxRate(parseFloat(s.taxRate || '12'))).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products.slice(0, 24)
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) ||
      (p.barcode || '').includes(q) || (p.activeIngredient || '').toLowerCase().includes(q)
    ).slice(0, 24)
  }, [products, search])

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const discountNum = Math.min(parseFloat(discount) || 0, subtotal)
  const tax = Math.round((subtotal - discountNum) * (taxRate / 100) * 100) / 100
  const total = Math.round((subtotal - discountNum + tax) * 100) / 100
  const paidNum = parseFloat(amountPaid) || 0
  const change = paymentMethod === 'EFECTIVO' ? Math.max(0, paidNum - total) : 0
  const needsRx = cart.some((i) => i.requiresPrescription)

  function addToCart(p: Product) {
    const stock = p.stock ?? 0
    if (stock <= 0) {
      toast({ title: 'Sin stock', description: `"${p.name}" no tiene existencias en ningún lote`, variant: 'destructive' })
      return
    }
    setCart((c) => {
      const existing = c.find((i) => i.productId === p.id)
      if (existing) {
        if (existing.quantity >= stock) {
          toast({ title: 'Stock máximo alcanzado', description: `Solo hay ${stock} unidades disponibles`, variant: 'destructive' })
          return c
        }
        return c.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...c, {
        productId: p.id, name: p.name, code: p.code, unitPrice: p.salePrice,
        quantity: 1, stock, requiresPrescription: p.requiresPrescription, controlled: p.controlled,
        presentation: p.presentation,
      }]
    })
  }

  function setQty(productId: string, qty: number) {
    setCart((c) => c.map((i) => i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(i.stock, qty)) } : i))
  }

  function removeItem(productId: string) {
    setCart((c) => c.filter((i) => i.productId !== productId))
  }

  function resetSale() {
    setCart([])
    setDiscount('0')
    setAmountPaid('')
    setNotes('')
    setCustomerId('ocasional')
    setPaymentMethod('EFECTIVO')
    searchRef.current?.focus()
  }

  async function completeSale() {
    if (cart.length === 0) return
    if (paymentMethod === 'EFECTIVO' && paidNum > 0 && paidNum < total) {
      toast({ title: 'Monto insuficiente', description: `El total es ${fmtMoney(total)}`, variant: 'destructive' })
      return
    }
    setProcessing(true)
    try {
      const cust = customers.find((c) => c.id === customerId)
      const created = await api_createSale({
        userId: user.id,
        customerId: cust && cust.id ? customerId : null,
        customerName: cust ? cust.name : 'Cliente Ocasional',
        paymentMethod,
        discount: discountNum,
        amountPaid: paidNum,
        notes,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      })
      const full = await api_getSale(created.id).catch(() => created)
      setLastSale(full)
      setReceiptOpen(true)
      resetSale()
      api_products().then(setProducts).catch(() => {})
      onSaleDone?.()
      toast({ title: 'Venta registrada', description: `Factura ${full.invoiceNumber} · ${fmtMoney(full.total)}` })
    } catch (e) {
      toast({ title: 'Error al registrar la venta', description: e instanceof Error ? e.message : 'Intente nuevamente', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Punto de Venta</h1>
          <p className="text-muted-foreground text-sm">Atendiendo como: {user.name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetSale}><RotateCcw className="h-4 w-4 mr-1" /> Limpiar venta</Button>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Catálogo */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Buscar por nombre, código, código de barras o principio activo..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[62vh] overflow-y-auto pr-1">
            {filtered.map((p) => {
              const stock = p.stock ?? 0
              const inCart = cart.find((i) => i.productId === p.id)?.quantity || 0
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`text-left rounded-xl border p-3 transition-all hover:border-emerald-400 hover:shadow-md ${stock === 0 ? 'opacity-50' : ''} ${inCart > 0 ? 'border-emerald-500 bg-emerald-50' : 'bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <Pill className="h-4 w-4 text-emerald-700" />
                      </div>
                      <p className="text-sm font-medium leading-tight line-clamp-2">{p.name}</p>
                    </div>
                    {stock === 0 && <Badge variant="destructive" className="shrink-0 text-[10px]">AGOTADO</Badge>}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold text-emerald-700">{fmtMoney(p.salePrice)}</span>
                    <span className={`text-xs ${stock <= (p.minStock || 5) ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                      Stock: {stock}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{p.code}</Badge>
                    {p.requiresPrescription && <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 hover:bg-red-100">RX</Badge>}
                    {p.controlled && <Badge className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700 hover:bg-purple-100">Controlado</Badge>}
                  </div>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <ScanBarcode className="h-10 w-10 mx-auto mb-2 opacity-40" />
                No se encontraron productos para &quot;{search}&quot;
              </div>
            )}
          </div>
        </div>

        {/* Carrito / Ticket */}
        <div className="lg:col-span-2">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><ShoppingCart className="h-4 w-4 text-emerald-600" /> Carrito ({cart.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {cart.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Agregue productos haciendo clic en el catálogo</p>
                )}
                {cart.map((i) => (
                  <div key={i.productId} className="flex items-center gap-2 rounded-lg border p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">{i.name}</p>
                      <p className="text-xs text-muted-foreground">{fmtMoney(i.unitPrice)} × {i.quantity} = {fmtMoney(i.unitPrice * i.quantity)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(i.productId, i.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                      <Input
                        className="h-7 w-12 text-center px-1"
                        value={i.quantity}
                        onChange={(e) => setQty(i.productId, parseInt(e.target.value) || 1)}
                        inputMode="numeric"
                      />
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(i.productId, i.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => removeItem(i.productId)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>

              {needsRx && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Esta venta incluye medicamentos que <b>requieren receta médica</b>. Solicite y registre la receta.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Cliente</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ocasional">Cliente Ocasional</SelectItem>
                      {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pago</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                      <SelectItem value="TARJETA">Tarjeta</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                      <SelectItem value="QR">QR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descuento ($)</Label>
                  <Input className="h-9" value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" placeholder="0.00" />
                </div>
                {paymentMethod === 'EFECTIVO' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Efectivo recibido ($)</Label>
                    <Input className="h-9" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} inputMode="decimal" placeholder={total.toFixed(2)} />
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-slate-50 border p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Descuento</span><span className="text-red-600">-{fmtMoney(discountNum)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">IVA ({taxRate}%)</span><span>{fmtMoney(tax)}</span></div>
                <div className="flex justify-between border-t pt-1.5 mt-1.5 font-bold text-base"><span>TOTAL</span><span className="text-emerald-700">{fmtMoney(total)}</span></div>
                {paymentMethod === 'EFECTIVO' && paidNum > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Cambio</span><span className="font-semibold">{fmtMoney(change)}</span></div>
                )}
              </div>

              <Textarea placeholder="Notas (opcional)" className="min-h-[52px]" value={notes} onChange={(e) => setNotes(e.target.value)} />

              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-base" disabled={cart.length === 0 || processing} onClick={completeSale}>
                {processing ? 'Procesando...' : <>🧾 Cobrar {fmtMoney(total)}</>}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Factura / Recibo */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-md">
          {lastSale && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-600" /> Venta completada</DialogTitle>
                <DialogDescription>Factura {lastSale.invoiceNumber}</DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border bg-slate-50 p-4 font-mono text-xs space-y-1">
                <p className="text-center font-bold text-sm">{lastSale.customerName || 'Cliente Ocasional'}</p>
                <p className="text-center text-muted-foreground">{new Date(lastSale.createdAt).toLocaleString('es-EC')}</p>
                <div className="border-t my-2" />
                {(lastSale.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between gap-2">
                    <span className="truncate">{it.quantity} × {it.productName}</span>
                    <span>{fmtMoney(it.subtotal)}</span>
                  </div>
                ))}
                <div className="border-t my-2" />
                <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(lastSale.subtotal)}</span></div>
                <div className="flex justify-between"><span>Descuento</span><span>-{fmtMoney(lastSale.discount)}</span></div>
                <div className="flex justify-between"><span>IVA</span><span>{fmtMoney(lastSale.tax)}</span></div>
                <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>{fmtMoney(lastSale.total)}</span></div>
                <div className="flex justify-between"><span>{lastSale.paymentMethod}</span><span>Pagado: {fmtMoney(lastSale.amountPaid)}</span></div>
                {lastSale.change > 0 && <div className="flex justify-between"><span>Cambio</span><span>{fmtMoney(lastSale.change)}</span></div>}
                <p className="text-center text-muted-foreground mt-2">¡Gracias por su compra!</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Imprimir</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setReceiptOpen(false)}>Nueva venta</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
