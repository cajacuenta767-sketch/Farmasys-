import type { Metadata } from 'next'
import { ENLACES_DESCARGA } from '@/lib/descargas'
import { VERSION } from '@/lib/version'
import { Cross, MonitorDown, Smartphone, Globe, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = { title: 'Descargas — FarmaSys' }

const OPCIONES = [
  {
    icon: MonitorDown, titulo: 'Windows (instalador)', archivo: 'FarmaSys-Setup.exe', enlace: ENLACES_DESCARGA.windows,
    pasos: ['Descarga y ejecuta el instalador.', 'Al abrir por primera vez, ingresa la clave de licencia CTL-… y el servidor CONTROL que te dio tu asesor.', 'Crea el usuario administrador. Los datos quedan en tu equipo.'],
  },
  {
    icon: Smartphone, titulo: 'Android (APK)', archivo: 'FarmaSys.apk', enlace: ENLACES_DESCARGA.android,
    pasos: ['Descarga el APK y permite "instalar de fuentes desconocidas".', 'Al abrir, escribe la dirección de tu servidor FarmaSys (la web de tu farmacia).', 'Inicia sesión con tu usuario; cada rol ve solo su espacio.'],
  },
  {
    icon: Globe, titulo: 'Web / instalar desde el navegador', archivo: null, enlace: '/',
    pasos: ['Abre la web de tu farmacia en Chrome o Edge.', 'En el menú del navegador elige "Instalar aplicación" o "Agregar a pantalla de inicio".', 'Funciona en Windows, Android, iPhone y Mac sin descargar nada.'],
  },
]

export default function DescargasPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center"><Cross className="h-7 w-7" /></div>
          <div>
            <h1 className="text-2xl font-bold">Descargar FarmaSys</h1>
            <p className="text-emerald-300 text-sm">Versión {VERSION} · licencias gestionadas con CONTROL</p>
          </div>
          <a href="/" className="ml-auto text-sm text-emerald-300 hover:text-white">Volver al sistema</a>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {OPCIONES.map((o) => (
            <div key={o.titulo} className="rounded-2xl border border-white/15 bg-white/5 p-5 flex flex-col">
              <o.icon className="h-8 w-8 text-emerald-400" />
              <h2 className="mt-3 font-semibold">{o.titulo}</h2>
              {o.archivo && <p className="text-xs text-emerald-300 font-mono mt-1">{o.archivo}</p>}
              <ol className="mt-3 space-y-1.5 text-sm text-emerald-100/90 list-decimal list-inside flex-1">
                {o.pasos.map((p) => <li key={p}>{p}</li>)}
              </ol>
              <a href={o.enlace} className="mt-4 inline-flex justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold hover:bg-emerald-400">
                {o.archivo ? 'Descargar' : 'Abrir la web'}
              </a>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-emerald-100/90 space-y-2">
          <p className="font-semibold flex items-center gap-2 text-white"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Licencia</p>
          <p>Cada instalación se activa con una clave <code className="font-mono">CTL-XXXX-XXXX-XXXX-XXXX</code> atada a un equipo o dominio. La app recibe un token firmado que verifica sin internet durante 7 días y avisa cuando hay una versión nueva. Si no puedes validar, tu asesor puede emitir un código de emergencia de 72 horas.</p>
          <p className="text-xs text-emerald-300">Todas las versiones publicadas: <a className="underline" href={ENLACES_DESCARGA.releases}>{ENLACES_DESCARGA.releases}</a></p>
        </section>
      </div>
    </div>
  )
}
