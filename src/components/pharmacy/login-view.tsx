'use client'

// Login del Sistema de Farmacias
import { useState } from 'react'
import { api_login } from '@/lib/pharmacy-client'
import type { SessionUser } from '@/lib/pharmacy-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Cross, LogIn, ShieldCheck, User, Lock } from 'lucide-react'

const DEMO_USERS = [
  { username: 'admin', password: 'admin123', role: 'Administrador', desc: 'Acceso total al sistema' },
  { username: 'farmacia', password: 'farm123', role: 'Farmacéutico', desc: 'Ventas, inventario y recetas' },
  { username: 'vendedor', password: 'venta123', role: 'Vendedor', desc: 'Punto de venta y clientes' },
]

export function LoginView({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await api_login(username, password)
      onLogin(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  function quickFill(u: string, p: string) {
    setUsername(u)
    setPassword(p)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6 items-center">
        {/* Branding */}
        <div className="hidden md:block text-white space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Cross className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">FarmaSys</h1>
              <p className="text-emerald-300 text-sm">Sistema Integral de Farmacias</p>
            </div>
          </div>
          <div className="space-y-3 text-emerald-100/90">
            <p className="text-lg font-medium">Gestione su farmacia de principio a fin:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Punto de venta con facturación</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Inventario por lotes con vencimientos FEFO</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Compras a proveedores y órdenes</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Control de recetas y medicamentos controlados</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Reportes de ventas y alertas inteligentes</li>
            </ul>
          </div>
        </div>

        {/* Formulario */}
        <Card className="w-full shadow-2xl border-emerald-900/20">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center md:hidden">
              <Cross className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl">Iniciar Sesión</CardTitle>
            <CardDescription>Ingrese sus credenciales para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="username" className="pl-9" placeholder="usuario" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" className="pl-9" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                <LogIn className="h-4 w-4 mr-2" />
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>

            <div className="mt-6 border-t pt-4">
              <p className="text-xs text-muted-foreground text-center mb-3">Cuentas de demostración (haga clic para llenar):</p>
              <div className="grid gap-2">
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.username}
                    type="button"
                    onClick={() => quickFill(u.username, u.password)}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-left hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{u.role}</p>
                      <p className="text-xs text-muted-foreground">{u.desc}</p>
                    </div>
                    <span className="text-xs font-mono bg-slate-100 rounded px-2 py-1">{u.username} / {u.password}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
