# 💊 FarmaSys — Sistema Integral de Gestión de Farmacias

Sistema completo de gestión para farmacias desarrollado con **Next.js 16**, **TypeScript**, **Prisma (SQLite)** y **shadcn/ui**. Cubre todo el ciclo operativo de una farmacia real: punto de venta, inventario por lotes con control de caducidad, compras, dispensación de recetas, medicamentos controlados, caja, reportes y auditoría.

---

## 📋 Módulos (24)

### General
| Módulo | Descripción |
|---|---|
| **Panel principal** | KPIs del día (ventas, ganancias, ticket promedio), comparación vs. ayer, ventas por hora, hora pico, alertas y productos más vendidos |

### Operación
| Módulo | Descripción |
|---|---|
| **Punto de Venta (POS)** | Búsqueda rápida, carrito, descuentos, pagos mixtos (efectivo + tarjeta + transferencia), programa de lealtad con puntos, advertencias de interacciones medicamentosas, folio de receta, recibo imprimible |
| **Caja y Arqueo** | Apertura/cierre de sesión de caja, movimientos de ingreso/egreso, arqueo por método de pago |
| **Ventas y Facturación** | Historial completo, detalle por línea y lote, anulación con reversión automática de inventario y puntos, exportación CSV |
| **Cotizaciones** | Generación de cotizaciones para clientes |
| **Devoluciones** | Gestión de devoluciones con control de stock |
| **Recetas Médicas** | Registro de recetas con médico, paciente y vencimiento; dispensación parcial o total con marcado automático de items |

### Clínica
| Módulo | Descripción |
|---|---|
| **Interacciones medicamentosas** | Base de interacciones con severidad; el POS advierte al vender productos incompatibles |
| **Medicamentos Controlados** | Libro de control con trazabilidad estricta de sustancias controladas |

### Inventario
| Módulo | Descripción |
|---|---|
| **Medicamentos** | CRUD completo: sustancia activa, presentación, categoría, precio compra/venta, stock mínimo, requiere receta, controlado |
| **Categorías** | Organización del catálogo |
| **Promociones** | Promociones automáticas aplicadas en el POS |
| **Inventario y Lotes** | Control por lote con fechas de caducidad, dispensación **FEFO** (primero en expirar, primero en salir) |
| **Conteo Físico** | Tomas de inventario con snapshot, detección de diferencias y ajuste con kardex |
| **Kardex de Movimientos** | Trazabilidad total: entradas, salidas, ajustes, vencimientos, devoluciones |
| **Centro de Alertas** | Stock bajo, agotados, próximos a vencer y vencidos |
| **Compras** | Órdenes de compra con recepción que genera lotes automáticamente |
| **Sugerencias de Compra** | Cálculo automático según stock mínimo, venta promedio 30 días y cobertura en días, agrupado por proveedor |

### Directorio
| Módulo | Descripción |
|---|---|
| **Proveedores** | CRUD con datos de contacto |
| **Clientes** | CRUD con historial de compras y puntos de lealtad |

### Administración
| Módulo | Descripción |
|---|---|
| **Reportes** | Ventas por período, más vendidos, ganancias, valorización de inventario con márgenes, exportación CSV |
| **Bitácora de Auditoría** | Registro automático de acciones (solo ADMIN) |
| **Usuarios y Roles** | 3 roles con permisos diferenciados: `ADMIN` (24 módulos), `FARMACEUTICO` (23), `VENDEDOR` (9) |
| **Configuración** | Datos de la farmacia, IVA, moneda, respaldo JSON completo |

---

## 🛠 Stack Tecnológico

- **Framework:** Next.js 16 (App Router) + TypeScript 5
- **Base de datos:** SQLite + Prisma ORM (26 modelos)
- **UI:** Tailwind CSS 4 + shadcn/ui + Lucide Icons
- **Estado:** React hooks + Zustand-ready
- **Seguridad:** Contraseñas con SHA-256 + salt, sesión validada en servidor, bitácora de auditoría

## 🚀 Instalación

```bash
# 1. Clonar
git clone https://github.com/TU_USUARIO/farmasys.git
cd farmasys

# 2. Instalar dependencias
bun install   # o npm install

# 3. Configurar variables de entorno
echo 'DATABASE_URL="file:/ruta/absoluta/db/custom.db"' > .env

# 4. Crear la base de datos
bun run db:push

# 5. (Opcional) Cargar datos de demostración
bunx tsx scripts/seed.ts

# 6. Iniciar
bun run dev    # http://localhost:3000
```

## 🔑 Credenciales de demostración

| Usuario | Contraseña | Rol | Acceso |
|---|---|---|---|
| `admin` | `admin123` | ADMIN | 24 módulos |
| `farmacia` | `farm123` | FARMACEUTICO | 23 módulos |
| `vendedor` | `venta123` | VENDEDOR | 9 módulos |

> ⚠️ Cambia las contraseñas antes de usar en producción.

## 📁 Estructura

```
src/
├── app/
│   ├── page.tsx            # SPA principal (login + navegación de 24 módulos)
│   └── api/                # 27 grupos de endpoints REST
├── components/
│   ├── pharmacy/           # 25 vistas del sistema
│   └── ui/                 # Componentes shadcn/ui
├── lib/
│   ├── db.ts               # Cliente Prisma
│   ├── security.ts         # Hash de contraseñas + salt
│   └── utils.ts
prisma/schema.prisma        # 26 modelos
scripts/seed.ts             # Datos de demostración
```

## ✅ Trazabilidad garantizada

Cada venta recorre: **POS → descuento FEFO por lote → kardex → caja → puntos de lealtad → bitácora de auditoría**, con reversiones automáticas al anular.
