// FarmaSys para Windows: Electron arranca el servidor Next.js (salida standalone) en un puerto local
// y abre la ventana. La base de datos y la licencia viven en la carpeta de datos del usuario.
const { app, BrowserWindow, shell, dialog, Menu } = require('electron')
const { spawn } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')
const net = require('node:net')
const http = require('node:http')

const NOMBRE = 'FarmaSys'
// desktop/config.json se rellena en la compilación (variable CONTROL_URL del repositorio): así el cliente
// solo escribe su código de verificación CTL-… y no la dirección del panel CONTROL.
let configuracion = {}
try { configuracion = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')) } catch { /* sin config */ }
let servidor = null
let ventana = null

// Con la app empaquetada, el servidor está en resources/servidor; en desarrollo, en ../.next/standalone
const carpetaServidor = app.isPackaged ? path.join(process.resourcesPath, 'servidor') : path.join(__dirname, '..', '.next', 'standalone')

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => { if (ventana) { if (ventana.isMinimized()) ventana.restore(); ventana.focus() } })
  app.whenReady().then(iniciar).catch((e) => { dialog.showErrorBox(NOMBRE, `No se pudo iniciar: ${e.message}`); app.quit() })
}

function puertoLibre() {
  return new Promise((ok, mal) => {
    const s = net.createServer()
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)) })
    s.on('error', mal)
  })
}

function esperarServidor(url, intentos = 120) {
  return new Promise((ok, mal) => {
    const probar = (n) => {
      http.get(`${url}/api/salud`, (res) => { res.resume(); res.statusCode < 500 ? ok() : reintentar(n) }).on('error', () => reintentar(n))
    }
    const reintentar = (n) => (n <= 0 ? mal(new Error('El servidor no respondió a tiempo')) : setTimeout(() => probar(n - 1), 500))
    probar(intentos)
  })
}

async function iniciar() {
  const datos = path.join(app.getPath('userData'), 'datos')
  fs.mkdirSync(datos, { recursive: true })
  const puerto = await puertoLibre()
  const url = `http://127.0.0.1:${puerto}`
  const registro = fs.createWriteStream(path.join(datos, 'servidor.log'), { flags: 'a' })

  servidor = spawn(process.execPath, [path.join(carpetaServidor, 'server.js')], {
    cwd: carpetaServidor,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(puerto),
      HOSTNAME: '127.0.0.1',
      DATABASE_URL: `file:${path.join(datos, 'farmasys.db')}`,
      FARMASYS_DATA_DIR: datos,
      FARMASYS_TEMPLATE_DB: path.join(carpetaServidor, 'prisma', 'template.db'),
      FARMASYS_PLATAFORMA: 'escritorio',
      ...(configuracion.controlUrl ? { CONTROL_URL: configuracion.controlUrl } : {}),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  servidor.stdout.pipe(registro)
  servidor.stderr.pipe(registro)
  servidor.on('exit', (codigo) => {
    servidor = null
    if (!app.isQuitting) {
      dialog.showErrorBox(NOMBRE, `El servidor interno se detuvo (código ${codigo}). Revisa ${path.join(datos, 'servidor.log')}`)
      app.quit()
    }
  })

  ventana = new BrowserWindow({
    width: 1360, height: 860, minWidth: 900, minHeight: 600, show: false,
    title: NOMBRE, backgroundColor: '#022c22',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  Menu.setApplicationMenu(menu())
  ventana.once('ready-to-show', () => ventana.show())
  // Los enlaces externos (descargas, CONTROL) se abren en el navegador del sistema
  ventana.webContents.setWindowOpenHandler(({ url: destino }) => { if (!destino.startsWith(url)) shell.openExternal(destino); return { action: 'deny' } })
  ventana.webContents.on('will-navigate', (e, destino) => { if (!destino.startsWith(url)) { e.preventDefault(); shell.openExternal(destino) } })

  await esperarServidor(url)
  await ventana.loadURL(url)
}

function menu() {
  return Menu.buildFromTemplate([
    { label: 'Archivo', submenu: [{ role: 'reload', label: 'Recargar' }, { type: 'separator' }, { role: 'quit', label: 'Salir' }] },
    { label: 'Ver', submenu: [{ role: 'zoomIn', label: 'Acercar' }, { role: 'zoomOut', label: 'Alejar' }, { role: 'resetZoom', label: 'Tamaño normal' }, { type: 'separator' }, { role: 'togglefullscreen', label: 'Pantalla completa' }] },
    { label: 'Ayuda', submenu: [{ label: 'Carpeta de datos', click: () => shell.openPath(path.join(app.getPath('userData'), 'datos')) }, { label: `Versión ${app.getVersion()}`, enabled: false }] },
  ])
}

app.on('before-quit', () => { app.isQuitting = true; if (servidor) servidor.kill() })
app.on('window-all-closed', () => app.quit())
