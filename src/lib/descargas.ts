// Enlaces de descarga de los instaladores publicados en GitHub Releases por .github/workflows/release.yml
const BASE = (process.env.NEXT_PUBLIC_DESCARGAS_URL || 'https://github.com/cajacuenta767-sketch/Farmasys-/releases/latest/download').replace(/\/$/, '')

export const ENLACES_DESCARGA = {
  windows: `${BASE}/FarmaSys-Setup.exe`,
  android: `${BASE}/FarmaSys.apk`,
  releases: 'https://github.com/cajacuenta767-sketch/Farmasys-/releases',
}
