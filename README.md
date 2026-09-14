# 💊 FarmaSys — Sistema Integral de Gestión de Farmacias

Sistema completo para farmacias: punto de venta, caja, inventario por lotes con vencimientos (FEFO),
compras, recetas, medicamentos controlados, reportes y auditoría. Se entrega como **web**,
**instalador para Windows** y **app para Android**, y cada instalación se activa con una licencia
del panel [CONTROL](https://github.com/cajacuenta767-sketch/CONTROL) de la agencia.

- La instalación llega **vacía**: sin usuarios, productos ni datos de ejemplo. El primer arranque
  pide la licencia y luego crea el administrador.
- **Tres roles** con espacios separados: el cajero solo ve su caja y sus ventas.
- Licencias con clave `CTL-XXXX-XXXX-XXXX-XXXX`, token firmado Ed25519 que se verifica sin
  internet, latido diario, aviso de versión nueva y código de emergencia de 72 h.

---

## Descargas e instalación

| Plataforma | Cómo | Dónde quedan los datos |
|---|---|---|
| **Windows** | `FarmaSys-Setup.exe` (instalador NSIS con Electron) desde [Releases](https://github.com/cajacuenta767-sketch/Farmasys-/releases/latest). Al abrir pide el código de verificación `CTL-…` | `%APPDATA%\FarmaSys\datos` (base SQLite, licencia, registro) |
| **Android** | `FarmaSys.apk` desde Releases. Al abrir pide la dirección del servidor y el código de verificación `CTL-…` de la licencia de la farmacia | En el servidor |
| **Web** | Docker (`docker compose up -d`) o Vercel/Node. Instalable desde el navegador como PWA | Volumen `/datos` o base remota |

La página `/descargas` de la web muestra estos enlaces al cliente final.

### Primer arranque (todas las plataformas)

1. **Licencia**: pantalla estándar "Licencia". Ingresa la clave `CTL-…` y la URL de CONTROL que te
   dio tu asesor. La app activa la instalación, fija la clave pública de CONTROL y guarda el token.
2. **Instalación**: crea el usuario **administrador** y los datos básicos de la farmacia.
3. **Inicia sesión** y crea el resto de usuarios en *Usuarios y Roles*.

---

## Roles

| Rol | Ve | No ve |
|---|---|---|
| **Administrador** (dueño/gerente) | Todo: 25 módulos, usuarios, configuración, auditoría, respaldo, licencia | — |
| **Farmacéutico** | Operación completa: panel, POS, caja, ventas, cotizaciones, devoluciones, recetas, interacciones, controlados, inventario, compras, proveedores, clientes, reportes (21) | Usuarios, configuración, auditoría, licencia |
| **Cajero** | Solo su espacio: punto de venta, **su** turno de caja, **sus** ventas, cotizaciones y clientes (5) | Panel con ganancias, inventario, compras, reportes, administración |

Los permisos se aplican en el **servidor** (`src/lib/permisos.ts`): la API responde `403` a un rol
sin permiso aunque alguien modifique el navegador, y `401` sin sesión. La sesión es una cookie
`httpOnly` firmada (HMAC) que emite el login. El cajero además recibe filtradas las listas de
ventas y turnos de caja (solo los suyos) y no puede anular ventas.

---

## Licencias con CONTROL

FarmaSys sigue el protocolo del SDK oficial de CONTROL (`sdk/node/control-licencia.js`) con el
código de producto `farmasys`:

| Paso | Llamada a CONTROL | Cuándo |
|---|---|---|
| Activar | `POST /api/v1/licencias/activar` `{ clave, producto, huella, nombre_equipo, version }` | Primera vez o botón "Reactivar" |
| Latido | `POST /api/v1/licencias/latido` `{ clave, huella, version }` | Automático cada 24 h |
| Clave pública | `GET /api/v1/licencias/clave-publica` | Una vez, en la primera activación (queda fijada) |

- El token (`base64url(payload).base64url(firma)`) se guarda en `data/licencia.json` y se verifica
  con Ed25519 sin red: la app funciona **sin internet hasta `expira_en`** (7 días).
- Estados `suspendida`, `vencida`, `revocada` o `pendiente_pago` bloquean toda la API con `402` y la
  pantalla "Licencia" muestra el motivo; `mora` funciona con aviso.
- **Código de emergencia**: el asesor lo emite en CONTROL → Licencia → Código de emergencia para la
  huella del equipo; se pega en la pantalla "Licencia" y desbloquea 72 h sin red.
- **Huella**: `CONTROL_HUELLA` → `CONTROL_DOMINIO` (web) → nombre del equipo (escritorio/VPS).
- **Código de verificación en los instalables**: el instalador de Windows pide la clave `CTL-…` en su
  primera pantalla (si el repositorio define la variable `CONTROL_URL`, el instalador ya trae fijada la URL
  del panel y el cliente solo escribe el código). La app Android pide la dirección del servidor y el mismo
  código `CTL-…`; el servidor lo comprueba contra su licencia (`POST /api/licencia/verificar`), registra la
  huella del teléfono y el administrador ve y desvincula dispositivos en la pantalla Licencia. Un teléfono
  no consume activaciones en CONTROL: pertenece a la licencia de la farmacia.
- Versión instalada: `src/lib/version.ts`. Si CONTROL fija una versión actual mayor, la app avisa.

Variables (opcionales, todo se puede escribir desde la pantalla "Licencia"): `CONTROL_URL`,
`CONTROL_LICENCIA`, `CONTROL_CLAVE_PUBLICA`, `CONTROL_DOMINIO`. En desarrollo (`next dev`) sin
`CONTROL_URL` el sistema funciona sin licencia y lo indica.

---

## Módulos (25)

| Grupo | Módulos |
|---|---|
| General | Panel principal (KPIs, ventas por hora, alertas) |
| Operación | Punto de venta (pagos mixtos, puntos, promociones, alertas de interacciones), Caja y arqueo, Ventas y facturación, Cotizaciones, Devoluciones, Recetas médicas |
| Clínica | Interacciones medicamentosas, Medicamentos controlados |
| Inventario | Medicamentos, Categorías, Promociones, Inventario y lotes (FEFO), Conteo físico, Kardex, Centro de alertas, Compras, Sugerencias de compra |
| Directorio | Proveedores, Clientes |
| Administración | Reportes, Bitácora de auditoría, Usuarios y roles, Configuración (respaldo JSON), Licencia |

---

## Desarrollo

Requisitos: Node.js 22.

```bash
npm install
cp .env.example .env          # DATABASE_URL="file:./dev.db" (relativa a prisma/)
npm run db:push               # crea la base vacía
npm run dev                   # http://localhost:3000 → asistente de instalación
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (sin CONTROL_URL funciona sin licencia) |
| `npm run build` | Genera Prisma, verifica la versión, crea `prisma/template.db` vacía y compila (salida standalone) |
| `npm run lint` / `npm run typecheck` | ESLint y TypeScript |
| `npm run desktop:build` | Instalador Windows (`desktop/`, requiere Windows o CI) |
| `npm run mobile:build` | APK Android (`mobile/`, requiere Android SDK o CI) |

### Estructura

```
src/app/page.tsx              SPA: licencia → instalación → login → módulos por rol
src/app/descargas/            Página pública de descargas
src/app/api/                  API REST (licencia, setup, auth, y los 24 módulos)
src/proxy.ts                  Bloqueo por licencia (402), sesión (401) y rol (403) en toda la API
src/lib/licencia.ts           Cliente CONTROL (activar, latido, verificación Ed25519, emergencia)
src/lib/permisos.ts           Roles, módulos por rol y permisos de API (fuente única)
src/lib/sesion.ts             Cookie de sesión firmada
src/components/pharmacy/      Vistas (licencia-view, setup-view, login-view y los módulos)
prisma/schema.prisma          26 modelos (SQLite)
scripts/prepare-db.mjs        Genera la plantilla de base vacía en cada build
desktop/                      Electron + electron-builder (NSIS)
mobile/                       Capacitor (Android) con pantalla para elegir servidor
Dockerfile, docker-compose.yml, Caddyfile   Despliegue web con HTTPS automático
.github/workflows/release.yml Compila web, .exe y .apk; publica Release al crear un tag vX.Y.Z
```

---

## Despliegue web

**Docker (recomendado):**

```bash
cp .env.example .env    # define DOMINIO, SESSION_SECRET y opcionalmente CONTROL_URL / CONTROL_LICENCIA
docker compose up -d --build
```

Caddy obtiene el certificado HTTPS para `DOMINIO`; la base de datos y la licencia quedan en el
volumen `farmasys_datos`. Respáldalo.

**Vercel / serverless:** define `SESSION_SECRET`, `CONTROL_URL`, `CONTROL_LICENCIA` y una base
remota en `DATABASE_URL` (SQLite en `/tmp` es efímero y solo sirve para probar). La huella usa el
dominio del proyecto.

## Publicar una versión

1. Sube `version` en `package.json`, `src/lib/version.ts`, `desktop/package.json` y `mobile/package.json`.
2. `git tag v2.0.1 && git push --tags`. El workflow compila y publica `FarmaSys-Setup.exe` y
   `FarmaSys.apk` en el Release; `/descargas` apunta siempre al último.
3. En CONTROL → Catálogo, fija la **versión actual** de FarmaSys para que las instalaciones
   atrasadas reciban el aviso.

Secretos opcionales del repositorio para el APK: `ANDROID_KEYSTORE_BASE64`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (sin ellos se firma con una clave generada en
cada compilación, válida para instalar pero no para actualizar sin desinstalar). Variable opcional
`FARMASYS_URL` para que la app Android abra directamente el servidor de la farmacia.
