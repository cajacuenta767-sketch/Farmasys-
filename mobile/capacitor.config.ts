import type { CapacitorConfig } from '@capacitor/cli'

// Si al compilar se define FARMASYS_URL (por ejemplo, https://farmacia.midominio.com), la app abre esa web directamente.
// Si no, muestra la pantalla www/index.html donde el usuario escribe la dirección de su servidor una sola vez.
const url = process.env.FARMASYS_URL?.trim()

const config: CapacitorConfig = {
  appId: 'com.farmasys.app',
  appName: 'FarmaSys',
  webDir: 'www',
  android: { allowMixedContent: true },
  server: url ? { url, cleartext: url.startsWith('http://'), allowNavigation: ['*'] } : { allowNavigation: ['*'], cleartext: true },
}

export default config
