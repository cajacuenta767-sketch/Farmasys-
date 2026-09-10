'use client'

// Punto de Venta (POS) del Sistema de Farmacias
// Fase 3: pagos mixtos, promociones automáticas, puntos de lealtad e interacciones medicamentosas
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  api_products, api_customers, api_createSale, api_getSale, api_settings, api_promotions, api_interactions, fmtMoney,
} from '@/lib/pharmacy-client'
import type { Product, Customer, Sale, SessionUser, Promotion, DrugInteraction } from '@/lib/pharmacy-types'
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
  Search, Plus, Minus, Trash2, ShoppingCart, ScanBarcode, FileText, Printer, RotateCcw, Pill, AlertCircle, TriangleAlert, Percent, Star,
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
  categoryId?: string | null
  presentation?: string | null
}

const POINTS_PER = 10 // 1 punto por cada $10 de compra
const POINT_VALUE = 0.10 // cada punto canjeado vale $0.10

export function PosView({ user, onSaleDone }: { user: SessionUser; onSaleDone?: () => void }) {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [interactions, setInteractions] = useState<DrugInteraction[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerId, setCustomerId] = useState<string>('ocasional')
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO')
  const [discount, setDiscount] = useState('0')
  const [amountPaid, setAmountPaid] = useState('')
  const [paidCash, setPaidCash] = useState('')
  const [paidCard, setPaidCard] = useState('')
  const [paidTransfer, setPaidTransfer] = useState('')
  const [pointsToRedeem, setPointsToRedeem] = useState('')
  const [prescriptionFolio, setPrescriptionFolio] = useState('')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [lastSale, setLastSale] = useState<Sale | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [taxRate, setTaxRate] = useState(12)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api_products().then(setProducts).catch(() => {})
    api_customers().then(setCustomers).catch(() => {})
    api_promotions().then(setPromotions).catch(() => {})
    api_interactions().then(setInteractions).catch(() => {})
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

  // Promociones vigentes hoy (activas y dentro de rango de fechas)
  const activePromos = useMemo(() => {
    const now = new Date()
    return promotions.filter((p) => {
      if (!p.active) return false
      if (p.startDate && new Date(p.startDate) > now) return false
      if (p.endDate && new Date(new Date(p.endDate).setHours(23, 59, 59)) < now) return false
      return true
    })
  }, [promotions])

  // Descuento automático por promociones (la mejor promoción por línea)
  const promoDiscount = useMemo(() => {
    let total = 0
    const applied: string[] = []
    for (const i of cart) {
      let best = 0
      for (const promo of activePromos) {
        const matches = promo.product?.id === i.productId || (promo.categoryId && promo.categoryId === i.categoryId)
        if (!matches) continue
        const line = i.unitPrice * i.quantity
        const d = promo.type === 'PORCENTAJE' ? line * (promo.value / 100) : promo.value * i.quantity
        const capped = Math.min(d, line)
        if (capped > best) {
          best = capped
          if (!applied.includes(promo.name)) applied.push(promo.name)
        }
      }
      total += best
    }
    return { amount: Math.round(total * 100) / 100, names: applied }
  }, [cart, activePromos])

  // Interacciones medicamentosas dentro del carrito
  const cartInteractions = useMemo(() => {
    const ids = cart.map((i) => i.productId)
    const found: { pair: [string, string]; severity: string; description: string }[] = []
    for (const ix of interactions) {
      if (ids.includes(ix.productAId) && ids.includes(ix.productBId)) {
        found.push({
          pair: [ix.productA?.name || 'Producto A', ix.productB?.name || 'Producto B'],
          severity: ix.severity,
          description: ix.description,
        })
      }
    }
    return found
  }, [cart, interactions])

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const selectedCustomer = customers.find((c) => c.id === customerId)
  const manualDiscount = Math.min(parseFloat(discount) || 0, subtotal)
  const redeemable = Math.min(parseInt(pointsToRedeem, 10) || 0, selectedCustomer?.points || 0, Math.floor(subtotal / POINT_VALUE))
  const pointsDiscount = Math.round(redeemable * POINT_VALUE * 100) / 100
  const discountNum = Math.min(manualDiscount + promoDiscount.amount + pointsDiscount, subtotal)
  const tax = Math.round((subtotal - discountNum) * (taxRate / 100) * 100) / 100
  const total = Math.round((subtotal - discountNum + tax) * 100) / 100

  const cashNum = parseFloat(paidCash) || 0
  const cardNum = parseFloat(paidCard) || 0
  const transferNum = parseFloat(paidTransfer) || 0
  const paidNum = parseFloat(amountPaid) || 0
  const mixTotal = Math.round((cashNum + cardNum + transferNum) * 100) / 100
  const change = paymentMethod === 'EFECTIVO'
    ? Math.max(0, paidNum - total)
    : paymentMethod === 'MIXTO'
      ? Math.max(0, mixTotal - total)
      : 0
  const mixMissing = paymentMethod === 'MIXTO' ? Math.max(0, Math.round((total - mixTotal) * 100) / 100) : 0
  const needsRx = cart.some((i) => i.requiresPrescription)

  function checkInteractionsFor(p: Product): DrugInteraction[] {
    const ids = cart.filter((c) => c.productId !== p.id).map((c) => c.productId)
    return interactions.filter((ix) => ix.active && (
      (ix.productAId === p.id && ids.includes(ix.productBId)) ||
      (ix.productBId === p.id && ids.includes(ix.productAId))
    ))
  }

  function addToCart(p: Product) {
    const stock = p.stock ?? 0
    if (stock <= 0) {
      toast({ title: 'Sin stock', description: `"${p.name}" no tiene existencias en ningún lote`, variant: 'destructive' })
      return
    }
    // Advertencia clínica de interacciones al agregar
    const conflicts = checkInteractionsFor(p)
    if (conflicts.length > 0) {
      const worst = conflicts.find((c) => c.severity === 'GRAVE') || conflicts[0]
      const other = worst.productAId === p.id ? worst.productB?.name : worst.productA?.name
      toast({
        title: `⚠ Interacción ${worst.severity} detectada`,
        description: `"${p.name}" interactúa con "${other}": ${worst.description}`,
        variant: 'destructive',
        duration: 8000,
      })
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
        categoryId: p.categoryId, presentation: p.presentation,
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
    setPaidCash('')
    setPaidCard('')
    setPaidTransfer('')
    setPointsToRedeem('')
    setPrescriptionFolio('')
    setNotes('')
    setCustomerId('ocasional')
    setPaymentMethod('EFECTIVO')
    searchRef.current?.focus()
  }

  function validate(): string | null {
    if (paymentMethod === 'EFECTIVO' && paidNum > 0 && paidNum < total) {
      return `El monto pagado es menor al total (${fmtMoney(total)})`
    }
    if (paymentMethod === 'MIXTO' && mixTotal < total) {
      return `Los pagos suman ${fmtMoney(mixTotal)} y el total es ${fmtMoney(total)} (faltan ${fmtMoney(mixMissing)})`
    }
    return null
  }

  async function completeSale() {
    if (cart.length === 0) return
    const err = validate()
    if (err) {
      toast({ title: 'Revisa el pago', description: err, variant: 'destructive' })
      return
    }
    setProcessing(true)
    try {
      const cust = customers.find((c) => c.id === customerId)
      const created = await api_createSale({
        userId: user.id,
        userName: user.name,
        customerId: cust && cust.id ? customerId : null,
        customerName: cust ? cust.name : 'Cliente Ocasional',
        paymentMethod,
        discount: discountNum,
        amountPaid: paidNum,
        paidCash: paymentMethod === 'MIXTO' ? cashNum : undefined,
        paidCard: paymentMethod === 'MIXTO' ? cardNum : undefined,
        paidTransfer: paymentMethod === 'MIXTO' ? transferNum : undefined,
        pointsRedeemed: redeemable,
        prescriptionFolio: prescriptionFolio || undefined,
        notes,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      })
      const full = await api_getSale(created.id).catch(() => created)
      setLastSale(full)
      setReceiptOpen(true)
      resetSale()
      api_products().then(setProducts).catch(() => {})
      api_customers().then(setCustomers).catch(() => {})
      onSaleDone?.()
      const pts = full.pointsEarned ? ` · +${full.pointsEarned} pts` : ''
      toast({ title: 'Venta registrada', description: `Factura ${full.invoiceNumber} · ${fmtMoney(full.total)}${pts}` })
    } catch (e) {
      toast({ title: 'Error al registrar la venta', description: e instanceof Error ? e.message : 'Intente nuevamente', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const severityCls = (s: string) => s === 'GRAVE' ? 'border-red-300 bg-red-50 text-red-800' : s === 'MODERADA' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-300 bg-slate-50 text-slate-700'

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
              const hasPromo = activePromos.some((pr) => pr.product?.id === p.id || (pr.categoryId && pr.categoryId === p.categoryId))
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
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold ${hasPromo ? 'text-amber-600' : 'text-emerald-700'}`}>{fmtMoney(p.salePrice)}</span>
                      {hasPromo && <Percent className="h-3 w-3 text-amber-500" />}
                    </div>
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

              {cartInteractions.length > 0 && (
                <div className="space-y-1.5">
                  {cartInteractions.map((ix, idx) => (
                    <div key={idx} className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${severityCls(ix.severity)}`}>
                      <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
                      <span><b>Interacción {ix.severity.toLowerCase()}:</b> {ix.pair[0]} + {ix.pair[1]}. {ix.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {needsRx && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Esta venta incluye medicamentos que <b>requieren receta médica</b>. Solicite la receta e ingrese su folio:</span>
                </div>
              )}
              {needsRx && (
                <Input
                  placeholder="Folio de receta (opcional) — ej. RC-0001"
                  value={prescriptionFolio}
                  onChange={(e) => setPrescriptionFolio(e.target.value)}
                  className="h-9 text-sm"
                />
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Cliente</Label>
                  <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setPointsToRedeem('') }}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ocasional">Cliente Ocasional</SelectItem>
                      {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pago</Label>
                  <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); setAmountPaid('') }}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                      <SelectItem value="TARJETA">Tarjeta</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                      <SelectItem value="QR">QR</SelectItem>
                      <SelectItem value="MIXTO">Mixto (varios)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descuento manual ($)</Label>
                  <Input className="h-9" value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" placeholder="0.00" />
                </div>
                {paymentMethod === 'EFECTIVO' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Efectivo recibido ($)</Label>
                    <Input className="h-9" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} inputMode="decimal" placeholder={total.toFixed(2)} />
                  </div>
                )}
              </div>

              {paymentMethod === 'MIXTO' && (
                <div className="grid grid-cols-3 gap-2 rounded-lg border bg-slate-50 p-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Efectivo</Label>
                    <Input className="h-8" value={paidCash} onChange={(e) => setPaidCash(e.target.value)} inputMode="decimal" placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Tarjeta</Label>
                    <Input className="h-8" value={paidCard} onChange={(e) => setPaidCard(e.target.value)} inputMode="decimal" placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Transf.</Label>
                    <Input className="h-8" value={paidTransfer} onChange={(e) => setPaidTransfer(e.target.value)} inputMode="decimal" placeholder="0.00" />
                  </div>
                  <p className={`col-span-3 text-xs ${mixMissing > 0 ? 'text-red-600 font-medium' : 'text-emerald-700'}`}>
                    Suma: {fmtMoney(mixTotal)} {mixMissing > 0 ? `— faltan ${fmtMoney(mixMissing)}` : mixTotal > total ? `— cambio ${fmtMoney(change)}` : '— ok ✓'}
                  </p>
                </div>
              )}

              {/* Puntos de lealtad */}
              {selectedCustomer && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                  <Star className="h-4 w-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-amber-800">{selectedCustomer.name}: {selectedCustomer.points ?? 0} puntos ≈ {fmtMoney((selectedCustomer.points ?? 0) * POINT_VALUE)}</p>
                    <p className="text-[10px] text-amber-700">Esta venta generará {Math.floor(total / POINTS_PER)} puntos · 1 punto por cada {fmtMoney(POINTS_PER)}</p>
                  </div>
                  {(selectedCustomer.points ?? 0) > 0 && (
                    <Input
                      className="h-8 w-20 shrink-0"
                      value={pointsToRedeem}
                      onChange={(e) => setPointsToRedeem(e.target.value)}
                      inputMode="numeric"
                      placeholder="Canjear"
                    />
                  )}
                </div>
              )}

              <div className="rounded-lg bg-slate-50 border p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
                {promoDiscount.amount > 0 && (
                  <div className="flex justify-between text-amber-700"><span>Promos: {promoDiscount.names.join(', ')}</span><span>-{fmtMoney(promoDiscount.amount)}</span></div>
                )}
                {pointsDiscount > 0 && (
                  <div className="flex justify-between text-amber-700"><span>Canje de {redeemable} pts</span><span>-{fmtMoney(pointsDiscount)}</span></div>
                )}
                {manualDiscount > 0 && (
                  <div className="flex justify-between text-red-600"><span>Descuento manual</span><span>-{fmtMoney(manualDiscount)}</span></div>
                )}
                {promoDiscount.amount === 0 && pointsDiscount === 0 && manualDiscount === 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Descuento</span><span>-{fmtMoney(0)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">IVA ({taxRate}%)</span><span>{fmtMoney(tax)}</span></div>
                <div className="flex justify-between border-t pt-1.5 mt-1.5 font-bold text-base"><span>TOTAL</span><span className="text-emerald-700">{fmtMoney(total)}</span></div>
                {((paymentMethod === 'EFECTIVO' && paidNum > 0) || paymentMethod === 'MIXTO') && change > 0 && (
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
                {lastSale.paymentMethod === 'MIXTO' && (
                  <div className="text-[10px] text-muted-foreground">
                    Efectivo: {fmtMoney(lastSale.paidCash || 0)} · Tarjeta: {fmtMoney(lastSale.paidCard || 0)} · Transf.: {fmtMoney(lastSale.paidTransfer || 0)}
                  </div>
                )}
                {lastSale.change > 0 && <div className="flex justify-between"><span>Cambio</span><span>{fmtMoney(lastSale.change)}</span></div>}
                {(lastSale.pointsEarned || 0) > 0 && (
                  <div className="flex justify-between text-amber-600"><span>Puntos ganados</span><span>+{lastSale.pointsEarned} pts</span></div>
                )}
                {(lastSale.pointsRedeemed || 0) > 0 && (
                  <div className="flex justify-between text-amber-600"><span>Puntos canjeados</span><span>-{lastSale.pointsRedeemed} pts</span></div>
                )}
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
