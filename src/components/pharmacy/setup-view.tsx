'use client'

// Asistente de primer arranque: la instalación llega vacía y aquí se crea el primer administrador.
import { useState } from 'react'
import { api_setupCrear } from '@/lib/pharmacy-client'
import type { SessionUser } from '@/lib/pharmacy-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Cross, UserCog, Store, ArrowRight } from 'lucide-react'

export function SetupView({ onListo }: { onListo: (u: SessionUser) => void }) {
  const [f, setF] = useState({ name: '', username: '', password: '', confirm: '', email: '', pharmacyName: '', taxId: '', taxRate: '0', currency: '$' })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (f.password !== f.confirm) { setError('Las contraseñas no coinciden'); return }
    if (f.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    setGuardando(true)
    try {
      const u = await api_setupCrear({ name: f.name, username: f.username, password: f.password, email: f.email, pharmacyName: f.pharmacyName, taxId: f.taxId, taxRate: f.taxRate, currency: f.currency })
      onListo(u)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la instalación')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-600 flex items-center justify-center"><Cross className="h-6 w-6 text-white" /></div>
            <div>
              <CardTitle className="text-xl">Bienvenido a FarmaSys</CardTitle>
              <CardDescription>La instalación está vacía. Crea el usuario administrador y los datos básicos de tu farmacia.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="space-y-5">
            <section className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2"><UserCog className="h-4 w-4 text-emerald-600" /> Administrador</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1"><Label>Nombre completo *</Label><Input value={f.name} onChange={set('name')} required /></div>
                <div className="space-y-1"><Label>Usuario *</Label><Input value={f.username} onChange={set('username')} placeholder="admin" autoComplete="username" required /></div>
                <div className="space-y-1"><Label>Contraseña *</Label><Input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" required /></div>
                <div className="space-y-1"><Label>Confirmar contraseña *</Label><Input type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" required /></div>
                <div className="space-y-1 md:col-span-2"><Label>Correo (opcional)</Label><Input type="email" value={f.email} onChange={set('email')} /></div>
              </div>
            </section>
            <section className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2"><Store className="h-4 w-4 text-emerald-600" /> Farmacia (puedes completarlo después en Configuración)</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1"><Label>Nombre comercial</Label><Input value={f.pharmacyName} onChange={set('pharmacyName')} /></div>
                <div className="space-y-1"><Label>NIT / RUC</Label><Input value={f.taxId} onChange={set('taxId')} /></div>
                <div className="space-y-1"><Label>Impuesto (%)</Label><Input type="number" min="0" step="0.01" value={f.taxRate} onChange={set('taxRate')} /></div>
                <div className="space-y-1"><Label>Símbolo de moneda</Label><Input value={f.currency} onChange={set('currency')} /></div>
              </div>
            </section>
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={guardando}>
              {guardando ? 'Creando…' : 'Crear administrador y entrar'} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
