'use client'

// Configuración de la Farmacia
import { useCallback, useEffect, useState } from 'react'
import { api_settings, api_saveSettings, downloadBackup } from '@/lib/pharmacy-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Save, Store, Percent, ReceiptText, DatabaseBackup, ShieldCheck } from 'lucide-react'

const DEFAULTS: Record<string, string> = {
  pharmacyName: '', taxId: '', address: '', phone: '', email: '',
  taxRate: '12', currency: '$', invoiceFooter: '', expiryWarningDays: '90',
}

export function SettingsView() {
  const { toast } = useToast()
  const [form, setForm] = useState<Record<string, string>>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [backingUp, setBackingUp] = useState(false)

  const load = useCallback(async () => {
    const s = await api_settings()
    setForm({ ...DEFAULTS, ...s })
  }, [])
  useEffect(() => { load().catch(() => {}) }, [load])

  async function backup() {
    setBackingUp(true)
    try {
      await downloadBackup()
      toast({ title: 'Respaldo descargado', description: 'Archivo JSON con todos los datos del sistema' })
    } catch {
      toast({ title: 'Error generando el respaldo', variant: 'destructive' })
    } finally {
      setBackingUp(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      await api_saveSettings(form)
      toast({ title: 'Configuración guardada' })
    } catch {
      toast({ title: 'Error guardando configuración', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm">Datos de la farmacia, impuestos y facturación</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4 text-emerald-600" /> Datos de la farmacia</CardTitle>
            <CardDescription>Aparecen en facturas y reportes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label>Nombre comercial</Label><Input value={form.pharmacyName} onChange={(e) => setForm({ ...form, pharmacyName: e.target.value })} /></div>
            <div className="space-y-1"><Label>NIT / RUC</Label><Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} /></div>
            <div className="space-y-1"><Label>Dirección</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Percent className="h-4 w-4 text-emerald-600" /> Impuestos y facturación</CardTitle>
            <CardDescription>Configuración fiscal del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>IVA (%)</Label><Input value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} inputMode="decimal" /></div>
              <div className="space-y-1"><Label>Símbolo de moneda</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Alerta de vencimiento (días antes)</Label><Input value={form.expiryWarningDays} onChange={(e) => setForm({ ...form, expiryWarningDays: e.target.value })} inputMode="numeric" /></div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1"><ReceiptText className="h-3.5 w-3.5" /> Pie de factura</Label>
              <Textarea value={form.invoiceFooter} onChange={(e) => setForm({ ...form, invoiceFooter: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700"><Save className="h-4 w-4 mr-2" /> {saving ? 'Guardando...' : 'Guardar configuración'}</Button>
        <Button variant="outline" onClick={backup} disabled={backingUp}><DatabaseBackup className="h-4 w-4 mr-2" /> {backingUp ? 'Generando...' : 'Descargar respaldo (JSON)'}</Button>
        <p className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Se recomienda respaldar la base de datos semanalmente</p>
      </div>
    </div>
  )
}
