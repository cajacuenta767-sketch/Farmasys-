// Seed del Sistema de Farmacias
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function daysFromNow(d: number) {
  const dt = new Date()
  dt.setDate(dt.getDate() + d)
  return dt
}

async function main() {
  console.log('Limpiando base de datos...')
  await prisma.cashMovement.deleteMany()
  await prisma.cashSession.deleteMany()
  await prisma.inventoryMovement.deleteMany()
  await prisma.controlledLog.deleteMany()
  await prisma.quotationItem.deleteMany()
  await prisma.quotation.deleteMany()
  await prisma.promotion.deleteMany()
  await prisma.return.deleteMany()
  await prisma.prescription.deleteMany()
  await prisma.saleItem.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.purchaseItem.deleteMany()
  await prisma.purchase.deleteMany()
  await prisma.lot.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.user.deleteMany()
  await prisma.setting.deleteMany()

  // ===== USUARIOS =====
  console.log('Creando usuarios...')
  await prisma.user.createMany({
    data: [
      { username: 'admin', password: 'admin123', name: 'Ana Martínez', role: 'ADMIN', email: 'admin@farmacia.com', phone: '3001112233' },
      { username: 'farmacia', password: 'farm123', name: 'Carlos Gómez', role: 'FARMACEUTICO', email: 'carlos@farmacia.com', phone: '3004445566' },
      { username: 'vendedor', password: 'venta123', name: 'Laura Restrepo', role: 'VENDEDOR', email: 'laura@farmacia.com', phone: '3007778899' },
    ],
  })

  // ===== CONFIGURACIÓN =====
  console.log('Creando configuración...')
  const settings = [
    { key: 'pharmacyName', value: 'Farmacia Vida Saludable' },
    { key: 'taxId', value: 'NIT 901.234.567-8' },
    { key: 'address', value: 'Calle 45 #23-14, Centro' },
    { key: 'phone', value: '(601) 555-0123' },
    { key: 'email', value: 'contacto@farmaciavidasaludable.com' },
    { key: 'taxRate', value: '12' }, // IVA %
    { key: 'currency', value: '$' },
    { key: 'invoiceFooter', value: '¡Gracias por su compra! Medicamentos con receta: conserve su factura. Sistema de Farmacias v1.0' },
    { key: 'expiryWarningDays', value: '90' },
  ]
  await prisma.setting.createMany({ data: settings })

  // ===== PROVEEDORES =====
  console.log('Creando proveedores...')
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: 'Distribuciones FarmaExpress S.A.', taxId: '900.111.222-3', contactName: 'Roberto Núñez', phone: '601-2223344', email: 'ventas@farmaexpress.com', address: 'Zona Industrial Norte, Bodega 12' } }),
    prisma.supplier.create({ data: { name: 'Mayorista Genfarmed Ltda.', taxId: '800.333.444-5', contactName: 'Diana Pérez', phone: '604-5556677', email: 'pedidos@genfarmed.com', address: 'Calle 30 #15-20' } }),
    prisma.supplier.create({ data: { name: 'Laboratorios Unipharm', taxId: '901.555.666-7', contactName: 'Julián Ríos', phone: '605-8889900', email: 'contacto@unipharm.com', address: 'Parque Tecnológico, Módulo 4' } }),
    prisma.supplier.create({ data: { name: 'Cosmética y Higiene del Valle', taxId: '830.777.888-9', contactName: 'Marcela Torres', phone: '602-3334455', email: 'ventas@cosmeticavalle.com', address: 'Avenida Siempre Viva 742' } }),
  ])

  // ===== CATEGORÍAS =====
  console.log('Creando categorías...')
  const catNames = ['Analgésicos', 'Antibióticos', 'Antiinflamatorios', 'Antigripales', 'Gastrointestinales', 'Vitaminas y Suplementos', 'Dermatológicos', 'Antialérgicos', 'Cardiovasculares', 'Cuidado Personal']
  const categories: Record<string, string> = {}
  for (const n of catNames) {
    const c = await prisma.category.create({ data: { name: n, description: `Medicamentos y productos: ${n}` } })
    categories[n] = c.id
  }

  // ===== PRODUCTOS (25 medicamentos + 5 cuidado personal) =====
  console.log('Creando productos...')
  const productsData = [
    { code: 'MED-001', name: 'Acetaminofén 500mg x 30 tabletas', lab: 'Genfar', ingredient: 'Acetaminofén', presentation: 'Caja x 30 tabletas', concentration: '500 mg', cat: 'Analgésicos', sup: 0, purchase: 2.2, sale: 4.5, minStock: 30, rx: false, barcode: '7701234000011' },
    { code: 'MED-002', name: 'Ibuprofeno 400mg x 20 tabletas', lab: 'MK', ingredient: 'Ibuprofeno', presentation: 'Caja x 20 tabletas', concentration: '400 mg', cat: 'Antiinflamatorios', sup: 0, purchase: 3.0, sale: 6.0, minStock: 25, rx: false, barcode: '7701234000028' },
    { code: 'MED-003', name: 'Amoxicilina 500mg x 12 cápsulas', lab: 'La Santé', ingredient: 'Amoxicilina', presentation: 'Caja x 12 cápsulas', concentration: '500 mg', cat: 'Antibióticos', sup: 1, purchase: 5.5, sale: 10.0, minStock: 20, rx: true, barcode: '7701234000035' },
    { code: 'MED-004', name: 'Azitromicina 500mg x 3 tabletas', lab: 'Tecnoquímicas', ingredient: 'Azitromicina', presentation: 'Caja x 3 tabletas', concentration: '500 mg', cat: 'Antibióticos', sup: 1, purchase: 6.8, sale: 12.5, minStock: 15, rx: true, barcode: '7701234000042' },
    { code: 'MED-005', name: 'Naproxeno 250mg x 30 tabletas', lab: 'Genfar', ingredient: 'Naproxeno', presentation: 'Caja x 30 tabletas', concentration: '250 mg', cat: 'Antiinflamatorios', sup: 0, purchase: 3.5, sale: 7.0, minStock: 20, rx: false, barcode: '7701234000059' },
    { code: 'MED-006', name: 'Dolex Gripa x 12 cápsulas', lab: 'GSK', ingredient: 'Acetaminofén + Pseudoefedrina', presentation: 'Caja x 12 cápsulas', concentration: '500/30 mg', cat: 'Antigripales', sup: 2, purchase: 4.8, sale: 9.0, minStock: 20, rx: false, barcode: '7701234000066' },
    { code: 'MED-007', name: 'Omeprazol 20mg x 14 cápsulas', lab: 'MK', ingredient: 'Omeprazol', presentation: 'Caja x 14 cápsulas', concentration: '20 mg', cat: 'Gastrointestinales', sup: 0, purchase: 2.8, sale: 5.5, minStock: 25, rx: false, barcode: '7701234000073' },
    { code: 'MED-008', name: 'Loratadina 10mg x 10 tabletas', lab: 'La Santé', ingredient: 'Loratadina', presentation: 'Caja x 10 tabletas', concentration: '10 mg', cat: 'Antialérgicos', sup: 0, purchase: 1.8, sale: 4.0, minStock: 25, rx: false, barcode: '7701234000080' },
    { code: 'MED-009', name: 'Losartán 50mg x 30 tabletas', lab: 'Tecnoquímicas', ingredient: 'Losartán potásico', presentation: 'Caja x 30 tabletas', concentration: '50 mg', cat: 'Cardiovasculares', sup: 1, purchase: 4.2, sale: 8.5, minStock: 20, rx: true, barcode: '7701234000097' },
    { code: 'MED-010', name: 'Metformina 850mg x 30 tabletas', lab: 'Genfar', ingredient: 'Metformina', presentation: 'Caja x 30 tabletas', concentration: '850 mg', cat: 'Cardiovasculares', sup: 1, purchase: 3.6, sale: 7.5, minStock: 20, rx: true, barcode: '7701234000103' },
    { code: 'MED-011', name: 'Salbutamol inhalador 100mcg', lab: 'GSK', ingredient: 'Salbutamol', presentation: 'Inhalador 200 dosis', concentration: '100 mcg/dosis', cat: 'Cardiovasculares', sup: 2, purchase: 9.0, sale: 16.0, minStock: 10, rx: true, barcode: '7701234000110' },
    { code: 'MED-012', name: 'Suero oral rehidratante 500ml', lab: 'Pisa', ingredient: 'Sales de rehidratación', presentation: 'Frasco 500 ml', concentration: 'N/A', cat: 'Gastrointestinales', sup: 3, purchase: 1.5, sale: 3.5, minStock: 30, rx: false, barcode: '7701234000127' },
    { code: 'MED-013', name: 'Vitamina C 1000mg x 10 efervescentes', lab: 'Bayer', ingredient: 'Ácido ascórbico', presentation: 'Tubo x 10 tabletas', concentration: '1000 mg', cat: 'Vitaminas y Suplementos', sup: 2, purchase: 5.0, sale: 9.5, minStock: 20, rx: false, barcode: '7701234000134' },
    { code: 'MED-014', name: 'Multivitamínico Centrum x 30', lab: 'Pfizer', ingredient: 'Multivitamínico', presentation: 'Frasco x 30 tabletas', concentration: 'Complejo B+ADEK', cat: 'Vitaminas y Suplementos', sup: 2, purchase: 12.0, sale: 22.0, minStock: 10, rx: false, barcode: '7701234000141' },
    { code: 'MED-015', name: 'Diclofenaco gel 1% 50g', lab: 'MK', ingredient: 'Diclofenaco sódico', presentation: 'Tubo 50 g', concentration: '1%', cat: 'Antiinflamatorios', sup: 0, purchase: 4.0, sale: 8.0, minStock: 15, rx: false, barcode: '7701234000158' },
    { code: 'MED-016', name: 'Alcohol antiséptico 700ml', lab: 'JGB', ingredient: 'Etanol', presentation: 'Frasco 700 ml', concentration: '70%', cat: 'Cuidado Personal', sup: 3, purchase: 2.0, sale: 4.2, minStock: 25, rx: false, barcode: '7701234000165' },
    { code: 'MED-017', name: 'Tapabocas quirúrgico x 50', lab: 'Medihealth', ingredient: 'N/A', presentation: 'Caja x 50 unidades', concentration: 'N/A', cat: 'Cuidado Personal', sup: 3, purchase: 6.0, sale: 12.0, minStock: 15, rx: false, barcode: '7701234000172' },
    { code: 'MED-018', name: 'Gel antibacterial 500ml', lab: 'JGB', ingredient: 'Etanol + Glicerina', presentation: 'Frasco 500 ml', concentration: '70%', cat: 'Cuidado Personal', sup: 3, purchase: 3.2, sale: 6.5, minStock: 20, rx: false, barcode: '7701234000189' },
    { code: 'MED-019', name: 'Betadine solución 120ml', lab: 'Bayer', ingredient: 'Povidona yodada', presentation: 'Frasco 120 ml', concentration: '10%', cat: 'Dermatológicos', sup: 2, purchase: 4.5, sale: 8.9, minStock: 15, rx: false, barcode: '7701234000196' },
    { code: 'MED-020', name: 'Enalapril 10mg x 30 tabletas', lab: 'La Santé', ingredient: 'Enalapril', presentation: 'Caja x 30 tabletas', concentration: '10 mg', cat: 'Cardiovasculares', sup: 1, purchase: 3.8, sale: 7.8, minStock: 15, rx: true, barcode: '7701234000202' },
    { code: 'MED-021', name: 'Diazepam 5mg x 20 tabletas', lab: 'Pisa', ingredient: 'Diazepam', presentation: 'Caja x 20 tabletas', concentration: '5 mg', cat: 'Analgésicos', sup: 1, purchase: 5.0, sale: 10.5, minStock: 10, rx: true, controlled: true, barcode: '7701234000219' },
    { code: 'MED-022', name: 'Tramadol 50mg x 10 cápsulas', lab: 'Tecnoquímicas', ingredient: 'Tramadol', presentation: 'Caja x 10 cápsulas', concentration: '50 mg', cat: 'Analgésicos', sup: 1, purchase: 6.2, sale: 12.0, minStock: 10, rx: true, controlled: true, barcode: '7701234000226' },
    { code: 'MED-023', name: 'Ranitidina jarabe 120ml', lab: 'Genfar', ingredient: 'Ranitidina', presentation: 'Frasco 120 ml', concentration: '75mg/5ml', cat: 'Gastrointestinales', sup: 0, purchase: 3.4, sale: 6.8, minStock: 15, rx: false, barcode: '7701234000233' },
    { code: 'MED-024', name: 'Crema hidratante Cetaphil 200g', lab: 'Galderma', ingredient: 'Glicerina', presentation: 'Frasco 200 g', concentration: 'N/A', cat: 'Dermatológicos', sup: 3, purchase: 11.0, sale: 19.9, minStock: 10, rx: false, barcode: '7701234000240' },
    { code: 'MED-025', name: 'Aspirina 100mg x 28 tabletas', lab: 'Bayer', ingredient: 'Ácido acetilsalicílico', presentation: 'Caja x 28 tabletas', concentration: '100 mg', cat: 'Cardiovasculares', sup: 2, purchase: 2.5, sale: 5.0, minStock: 20, rx: false, barcode: '7701234000257' },
    { code: 'MED-026', name: 'Fexofenadina 180mg x 10', lab: 'Sanofi', ingredient: 'Fexofenadina', presentation: 'Caja x 10 tabletas', concentration: '180 mg', cat: 'Antialérgicos', sup: 2, purchase: 5.8, sale: 11.0, minStock: 12, rx: false, barcode: '7701234000264' },
    { code: 'MED-027', name: 'Pantoprazol 40mg x 7 tabletas', lab: 'MK', ingredient: 'Pantoprazol', presentation: 'Caja x 7 tabletas', concentration: '40 mg', cat: 'Gastrointestinales', sup: 0, purchase: 3.1, sale: 6.2, minStock: 18, rx: false, barcode: '7701234000271' },
    { code: 'MED-028', name: 'Termómetro digital', lab: 'Berrcom', ingredient: 'N/A', presentation: 'Unidad', concentration: 'N/A', cat: 'Cuidado Personal', sup: 3, purchase: 8.0, sale: 15.0, minStock: 5, rx: false, barcode: '7701234000288' },
    { code: 'MED-029', name: 'Vendas elásticas 10cm x 5m', lab: 'Medihealth', ingredient: 'N/A', presentation: 'Rollo', concentration: 'N/A', cat: 'Cuidado Personal', sup: 3, purchase: 2.4, sale: 5.0, minStock: 15, rx: false, barcode: '7701234000295' },
    { code: 'MED-030', name: 'Nebulizador ultrasónico', lab: 'Omron', ingredient: 'N/A', presentation: 'Unidad', concentration: 'N/A', cat: 'Cuidado Personal', sup: 2, purchase: 45.0, sale: 79.9, minStock: 3, rx: false, barcode: '7701234000301' },
  ]

  const products: Record<string, { id: string; sale: number; purchase: number; name: string }> = {}
  for (const p of productsData) {
    const created = await prisma.product.create({
      data: {
        code: p.code,
        barcode: p.barcode,
        name: p.name,
        description: `${p.name} - ${p.lab}`,
        categoryId: categories[p.cat],
        supplierId: suppliers[p.sup].id,
        lab: p.lab,
        activeIngredient: p.ingredient,
        presentation: p.presentation,
        concentration: p.concentration,
        purchasePrice: p.purchase,
        salePrice: p.sale,
        minStock: p.minStock,
        requiresPrescription: p.rx,
        controlled: p.controlled || false,
        location: `${String.fromCharCode(65 + Math.floor(Math.random() * 6))}${1 + Math.floor(Math.random() * 8)}`,
      },
    })
    products[p.code] = { id: created.id, sale: p.sale, purchase: p.purchase, name: p.name }
  }

  // ===== LOTES =====
  console.log('Creando lotes...')
  const lotPlan: Array<[string, string, number, number, number]> = [
    // [codigo, numeroLote, diasVencimiento, cantidad, precioCompra]
    ['MED-001', 'L-2025-0412', 520, 120, 2.2],
    ['MED-002', 'L-2025-0418', 480, 80, 3.0],
    ['MED-003', 'L-2025-0423', 400, 45, 5.5],
    ['MED-004', 'L-2025-0431', 410, 30, 6.8],
    ['MED-005', 'L-2025-0440', 560, 60, 3.5],
    ['MED-006', 'L-2025-0445', 300, 55, 4.8],
    ['MED-007', 'L-2025-0450', 620, 90, 2.8],
    ['MED-008', 'L-2025-0461', 540, 70, 1.8],
    ['MED-009', 'L-2025-0470', 380, 50, 4.2],
    ['MED-010', 'L-2025-0481', 450, 55, 3.6],
    ['MED-011', 'L-2025-0490', 500, 18, 9.0],
    ['MED-012', 'L-2025-0501', 240, 60, 1.5],
    ['MED-013', 'L-2025-0510', 330, 40, 5.0],
    ['MED-014', 'L-2025-0521', 600, 20, 12.0],
    ['MED-015', 'L-2025-0530', 580, 25, 4.0],
    ['MED-016', 'L-2025-0541', 700, 80, 2.0],
    ['MED-017', 'L-2025-0550', 800, 40, 6.0],
    ['MED-018', 'L-2025-0561', 750, 45, 3.2],
    ['MED-019', 'L-2025-0570', 420, 30, 4.5],
    ['MED-020', 'L-2025-0581', 390, 35, 3.8],
    ['MED-021', 'L-2025-0590', 460, 15, 5.0],
    ['MED-022', 'L-2025-0601', 470, 12, 6.2],
    ['MED-023', 'L-2025-0610', 45, 18, 3.4],   // próximo a vencer
    ['MED-024', 'L-2025-0621', 730, 15, 11.0],
    ['MED-025', 'L-2025-0630', 490, 65, 2.5],
    ['MED-026', 'L-2025-0641', 520, 28, 5.8],
    ['MED-027', 'L-2025-0650', 430, 40, 3.1],
    ['MED-028', 'L-2025-0661', 0, 0, 8.0],     // sin stock (para alerta)
    ['MED-029', 'L-2025-0670', 900, 30, 2.4],
    ['MED-030', 'L-2025-0681', 1000, 4, 45.0], // stock bajo
  ]
  for (const [code, lotNumber, days, qty, price] of lotPlan) {
    const p = products[code]
    if (!p || qty === 0) continue
    await prisma.lot.create({
      data: { productId: p.id, lotNumber, expiryDate: daysFromNow(days), quantity: qty, purchasePrice: price },
    })
  }
  // Lote MUY próximo a vencer (15 días) para el acetaminofén
  const p1 = products['MED-001']
  await prisma.lot.create({
    data: { productId: p1.id, lotNumber: 'L-2024-0901', expiryDate: daysFromNow(15), quantity: 20, purchasePrice: 2.2 },
  })
  // Lote próximo a vencer (60 días) para ibuprofeno
  const p2 = products['MED-002']
  await prisma.lot.create({
    data: { productId: p2.id, lotNumber: 'L-2024-0902', expiryDate: daysFromNow(60), quantity: 15, purchasePrice: 3.0 },
  })

  // ===== CLIENTES =====
  console.log('Creando clientes...')
  const customers = await Promise.all([
    prisma.customer.create({ data: { document: '1023456789', name: 'María Fernanda López', phone: '3112223344', email: 'mflopez@email.com', address: 'Cra 12 #34-56' } }),
    prisma.customer.create({ data: { document: '1098765432', name: 'Jorge Iván Ramírez', phone: '3123334455', email: 'jramirez@email.com', address: 'Calle 8 #45-67' } }),
    prisma.customer.create({ data: { document: '52345678', name: 'Carmen Rosa Díaz', phone: '3134445566', email: 'cdiaz@email.com', address: 'Av 5 #23-12' } }),
    prisma.customer.create({ data: { document: '80123456', name: 'Pedro Pablo Jaramillo', phone: '3145556677', email: 'pjaramillo@email.com', address: 'Cll 70 #12-30' } }),
    prisma.customer.create({ data: { document: '1039485756', name: 'Valentina Cruz', phone: '3156667788', email: 'vcruz@email.com', address: 'Cra 45 #10-20' } }),
    prisma.customer.create({ data: { name: 'Cliente Ocasional' } }),
  ])

  // ===== COMPRAS =====
  console.log('Creando compras...')
  const purchase1 = await prisma.purchase.create({
    data: {
      orderNumber: 'OC-0001', supplierId: suppliers[0].id, userId: (await prisma.user.findUnique({ where: { username: 'admin' } }))!.id,
      status: 'RECIBIDA', notes: 'Pedido mensual de analgésicos y antiinflamatorios',
      createdAt: daysFromNow(-30), receivedAt: daysFromNow(-28),
      items: {
        create: [
          { productId: products['MED-001'].id, quantity: 100, unitCost: 2.2, lotNumber: 'L-2025-0412', expiryDate: daysFromNow(520) },
          { productId: products['MED-002'].id, quantity: 80, unitCost: 3.0, lotNumber: 'L-2025-0418', expiryDate: daysFromNow(480) },
          { productId: products['MED-005'].id, quantity: 60, unitCost: 3.5, lotNumber: 'L-2025-0440', expiryDate: daysFromNow(560) },
        ],
      },
    },
  })
  const t1 = (await prisma.purchaseItem.findMany({ where: { purchaseId: purchase1.id } })).reduce((s, i) => s + i.quantity * i.unitCost, 0)
  await prisma.purchase.update({ where: { id: purchase1.id }, data: { total: t1 } })

  const purchase2 = await prisma.purchase.create({
    data: {
      orderNumber: 'OC-0002', supplierId: suppliers[1].id, userId: (await prisma.user.findUnique({ where: { username: 'admin' } }))!.id,
      status: 'PENDIENTE', notes: 'Antibióticos - pendiente de recepción',
      createdAt: daysFromNow(-2),
      items: {
        create: [
          { productId: products['MED-003'].id, quantity: 50, unitCost: 5.5, lotNumber: 'L-2025-0701', expiryDate: daysFromNow(500) },
          { productId: products['MED-004'].id, quantity: 30, unitCost: 6.8, lotNumber: 'L-2025-0702', expiryDate: daysFromNow(510) },
        ],
      },
    },
  })
  const t2 = (await prisma.purchaseItem.findMany({ where: { purchaseId: purchase2.id } })).reduce((s, i) => s + i.quantity * i.unitCost, 0)
  await prisma.purchase.update({ where: { id: purchase2.id }, data: { total: t2 } })

  // ===== VENTAS HISTÓRICAS (últimos 14 días) =====
  console.log('Creando ventas históricas...')
  const users = {
    admin: (await prisma.user.findUnique({ where: { username: 'admin' } }))!,
    farmacia: (await prisma.user.findUnique({ where: { username: 'farmacia' } }))!,
    vendedor: (await prisma.user.findUnique({ where: { username: 'vendedor' } }))!,
  }
  const salePlans: Array<{ day: number; items: Array<[string, number]>; customerId: number | null; payment: string; user: keyof typeof users }> = [
    { day: -14, items: [['MED-001', 2], ['MED-008', 1]], customerId: 0, payment: 'EFECTIVO', user: 'vendedor' },
    { day: -13, items: [['MED-007', 1], ['MED-016', 2]], customerId: 1, payment: 'TARJETA', user: 'vendedor' },
    { day: -12, items: [['MED-002', 2], ['MED-006', 1], ['MED-013', 1]], customerId: 2, payment: 'EFECTIVO', user: 'farmacia' },
    { day: -11, items: [['MED-003', 1], ['MED-012', 2]], customerId: null, payment: 'EFECTIVO', user: 'vendedor' },
    { day: -10, items: [['MED-001', 3], ['MED-009', 1]], customerId: 3, payment: 'TRANSFERENCIA', user: 'farmacia' },
    { day: -9, items: [['MED-014', 1], ['MED-025', 1]], customerId: 4, payment: 'TARJETA', user: 'vendedor' },
    { day: -8, items: [['MED-002', 1], ['MED-005', 1], ['MED-018', 1]], customerId: null, payment: 'EFECTIVO', user: 'vendedor' },
    { day: -7, items: [['MED-010', 2]], customerId: 0, payment: 'EFECTIVO', user: 'farmacia' },
    { day: -6, items: [['MED-006', 2], ['MED-008', 2]], customerId: 1, payment: 'QR', user: 'vendedor' },
    { day: -5, items: [['MED-020', 1], ['MED-027', 1]], customerId: 2, payment: 'TARJETA', user: 'farmacia' },
    { day: -4, items: [['MED-001', 2], ['MED-002', 2], ['MED-015', 1]], customerId: null, payment: 'EFECTIVO', user: 'vendedor' },
    { day: -3, items: [['MED-019', 1], ['MED-024', 1]], customerId: 3, payment: 'EFECTIVO', user: 'vendedor' },
    { day: -2, items: [['MED-004', 1], ['MED-003', 1]], customerId: 4, payment: 'TRANSFERENCIA', user: 'farmacia' },
    { day: -1, items: [['MED-001', 4], ['MED-006', 1], ['MED-017', 1]], customerId: 0, payment: 'EFECTIVO', user: 'vendedor' },
    { day: -1, items: [['MED-013', 2], ['MED-014', 1]], customerId: 2, payment: 'TARJETA', user: 'farmacia' },
    { day: 0, items: [['MED-001', 2], ['MED-008', 1]], customerId: 1, payment: 'EFECTIVO', user: 'vendedor' },
    { day: 0, items: [['MED-007', 2]], customerId: null, payment: 'TARJETA', user: 'farmacia' },
  ]

  let inv = 1
  for (const sp of salePlans) {
    const date = daysFromNow(sp.day)
    date.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0)
    let subtotal = 0
    const itemsData: Array<{ productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number }> = []
    for (const [code, qty] of sp.items) {
      const p = products[code]
      const st = p.sale * qty
      subtotal += st
      itemsData.push({ productId: p.id, productName: p.name, quantity: qty, unitPrice: p.sale, subtotal: st })
    }
    const tax = Math.round(subtotal * 0.12 * 100) / 100
    const total = Math.round((subtotal + tax) * 100) / 100
    const sale = await prisma.sale.create({
      data: {
        invoiceNumber: `FV-000${inv++}`,
        customerId: sp.customerId !== null ? customers[sp.customerId].id : null,
        customerName: sp.customerId !== null ? undefined : 'Cliente Ocasional',
        userId: users[sp.user].id,
        subtotal: Math.round(subtotal * 100) / 100,
        tax,
        discount: 0,
        total,
        paymentMethod: sp.payment,
        amountPaid: total,
        change: 0,
        status: 'COMPLETADA',
        createdAt: date,
        items: { create: itemsData.map(i => ({ ...i })) },
      },
    })
    // Descontar de lotes FEFO + registrar kardex y controlados
    for (const [code, qty] of sp.items) {
      const p = products[code]
      let remaining = qty
      const lots = await prisma.lot.findMany({ where: { productId: p.id, quantity: { gt: 0 } }, orderBy: { expiryDate: 'asc' } })
      for (const lot of lots) {
        if (remaining <= 0) break
        const take = Math.min(remaining, lot.quantity)
        await prisma.lot.update({ where: { id: lot.id }, data: { quantity: { decrement: take } } })
        await prisma.inventoryMovement.create({
          data: {
            productId: p.id, lotNumber: lot.lotNumber, type: 'SALIDA', quantity: take,
            reason: 'Venta en mostrador', reference: sale.invoiceNumber, userId: users[sp.user].id,
            createdAt: date,
          },
        })
        remaining -= take
      }
    }
    void sale
  }

  // ===== RECETA DE EJEMPLO =====
  const lastSale = await prisma.sale.findFirst({ orderBy: { createdAt: 'desc' } })
  if (lastSale) {
    await prisma.prescription.create({
      data: {
        folio: 'RC-0001', doctorName: 'Dr. Hernando Vélez', doctorLicense: 'RM 12345',
        patientName: 'María Fernanda López', saleId: lastSale.id, notes: 'Antibiótico por 7 días. No automedicar.',
        createdAt: lastSale.createdAt,
      },
    })
  }

  // ===== KARDEX: ENTRADAS DE LA COMPRA RECIBIDA =====
  console.log('Creando entradas de kardex...')
  for (const item of await prisma.purchaseItem.findMany({ where: { purchaseId: purchase1.id }, include: { product: true } })) {
    await prisma.inventoryMovement.create({
      data: {
        productId: item.productId, lotNumber: item.lotNumber, type: 'ENTRADA', quantity: item.quantity,
        reason: 'Compra recibida a proveedor', reference: 'OC-0001', userId: users.admin.id,
        createdAt: daysFromNow(-28),
      },
    })
  }
  // Merma de ejemplo
  await prisma.inventoryMovement.create({
    data: {
      productId: products['MED-012'].id, lotNumber: 'L-2025-0501', type: 'MERMA', quantity: 3,
      reason: 'Frascos rotos en estantería', reference: null, userId: users.farmacia.id,
      createdAt: daysFromNow(-5),
    },
  })
  await prisma.inventoryMovement.create({
    data: {
      productId: products['MED-016'].id, lotNumber: 'L-2025-0541', type: 'AJUSTE', quantity: 2,
      reason: 'Conteo físico: sobrante', reference: null, userId: users.admin.id,
      createdAt: daysFromNow(-3),
    },
  })

  // ===== LIBRO DE CONTROLADOS =====
  console.log('Creando libro de controlados...')
  await prisma.controlledLog.createMany({
    data: [
      { productId: products['MED-021'].id, lotNumber: 'L-2025-0590', operation: 'ENTRADA', quantity: 15, userId: users.admin.id, createdAt: daysFromNow(-20) },
      { productId: products['MED-022'].id, lotNumber: 'L-2025-0601', operation: 'ENTRADA', quantity: 12, userId: users.admin.id, createdAt: daysFromNow(-20) },
      { productId: products['MED-021'].id, lotNumber: 'L-2025-0590', operation: 'SALIDA', quantity: 1, doctorName: 'Dr. Hernando Vélez', patientName: 'Jorge Iván Ramírez', folio: 'RC-0009', userId: users.farmacia.id, createdAt: daysFromNow(-6) },
      { productId: products['MED-022'].id, lotNumber: 'L-2025-0601', operation: 'SALIDA', quantity: 2, doctorName: 'Dra. Sandra Mendoza', patientName: 'Carmen Rosa Díaz', folio: 'RC-0012', userId: users.farmacia.id, createdAt: daysFromNow(-4) },
    ],
  })

  // ===== CAJA =====
  console.log('Creando sesiones de caja...')
  // Turno cerrado de ayer (cuadrado)
  const cs1 = await prisma.cashSession.create({
    data: {
      userId: users.vendedor.id, openingAmount: 50, status: 'CERRADA',
      openedAt: daysFromNow(-1), closedAt: new Date(daysFromNow(-1).getTime() + 9 * 3600 * 1000),
      expectedAmount: 132.4, closingAmount: 132.4, difference: 0,
      notes: 'Turno mañana - sin novedades',
    },
  })
  // Turno cerrado de anteayer (con faltante)
  const cs2 = await prisma.cashSession.create({
    data: {
      userId: users.farmacia.id, openingAmount: 50, status: 'CERRADA',
      openedAt: daysFromNow(-2), closedAt: new Date(daysFromNow(-2).getTime() + 9 * 3600 * 1000),
      expectedAmount: 118.75, closingAmount: 116.75, difference: -2,
      notes: 'Faltante de $2 — revisar con vendedor de turno',
    },
  })
  await prisma.cashMovement.createMany({
    data: [
      { cashSessionId: cs1.id, type: 'VENTA', amount: 68.4, reason: 'Venta FV-00016', userId: users.vendedor.id, createdAt: daysFromNow(-1) },
      { cashSessionId: cs1.id, type: 'VENTA', amount: 14.0, reason: 'Venta FV-00017', userId: users.vendedor.id, createdAt: daysFromNow(-1) },
      { cashSessionId: cs2.id, type: 'VENTA', amount: 52.75, reason: 'Venta FV-00014', userId: users.farmacia.id, createdAt: daysFromNow(-2) },
      { cashSessionId: cs2.id, type: 'RETIRO', amount: 4.0, reason: 'Compra de insumos de papelería', userId: users.farmacia.id, createdAt: daysFromNow(-2) },
      { cashSessionId: cs2.id, type: 'INGRESO', amount: 20.0, reason: 'Adelanto de fondo', userId: users.farmacia.id, createdAt: daysFromNow(-2) },
    ],
  })
  // Caja abierta HOY para operar de inmediato
  await prisma.cashSession.create({
    data: {
      userId: users.vendedor.id, openingAmount: 50, status: 'ABIERTA',
      openedAt: new Date(Date.now() - 2 * 3600 * 1000),
    },
  })

  // ===== COTIZACIONES =====
  console.log('Creando cotizaciones...')
  await prisma.quotation.create({
    data: {
      quoteNumber: 'CT-00001', customerId: customers[1].id, customerName: customers[1].name,
      userId: users.vendedor.id, total: 79.9, status: 'PENDIENTE',
      validUntil: daysFromNow(12), notes: 'Nebulizador para uso domiciliario',
      createdAt: daysFromNow(-3),
      items: { create: [
        { productId: products['MED-030'].id, productName: products['MED-030'].name, quantity: 1, unitPrice: 79.9, subtotal: 79.9 },
      ] },
    },
  })
  await prisma.quotation.create({
    data: {
      quoteNumber: 'CT-00002', customerId: customers[3].id, customerName: customers[3].name,
      userId: users.farmacia.id, total: 55.35, status: 'PENDIENTE',
      validUntil: daysFromNow(8), notes: 'Tratamiento completo 30 días',
      createdAt: daysFromNow(-1),
      items: { create: [
        { productId: products['MED-010'].id, productName: products['MED-010'].name, quantity: 2, unitPrice: 7.5, subtotal: 15.0 },
        { productId: products['MED-014'].id, productName: products['MED-014'].name, quantity: 1, unitPrice: 22.0, subtotal: 22.0 },
        { productId: products['MED-009'].id, productName: products['MED-009'].name, quantity: 2, unitPrice: 8.5, subtotal: 17.0 },
        { productId: products['MED-025'].id, productName: products['MED-025'].name, quantity: 1, unitPrice: 5.0, subtotal: 5.0 },
      ] },
    },
  })

  // ===== PROMOCIONES =====
  console.log('Creando promociones...')
  await prisma.promotion.createMany({
    data: [
      { name: 'Semana de la Vitamina C', description: '20% de descuento en todos los suplementos de vitamina C', type: 'PORCENTAJE', value: 20, productId: products['MED-013'].id, startDate: daysFromNow(-5), endDate: daysFromNow(10), active: true },
      { name: 'Descuento Dermatológico', description: '15% en cremas hidratantes seleccionadas', type: 'PORCENTAJE', value: 15, categoryId: categories['Dermatológicos'], startDate: daysFromNow(-2), endDate: daysFromNow(15), active: true },
      { name: 'Ahorro directo en Gel Antibacterial', description: '1 dólar menos en gel antibacterial 500ml', type: 'MONTO', value: 1.0, productId: products['MED-018'].id, active: true },
      { name: 'Promoción de invierno (finalizada)', description: 'Descuento en antigripales — temporada pasada', type: 'PORCENTAJE', value: 10, categoryId: categories['Antigripales'], startDate: daysFromNow(-60), endDate: daysFromNow(-20), active: false },
    ],
  })

  // ===== DEVOLUCIÓN DE EJEMPLO =====
  console.log('Creando devolución...')
  const saleForReturn = await prisma.sale.findFirst({
    where: { invoiceNumber: 'FV-00010' },
    include: { items: true },
  })
  if (saleForReturn) {
    for (const it of saleForReturn.items) {
      if (it.lotId) {
        await prisma.lot.update({ where: { id: it.lotId }, data: { quantity: { increment: it.quantity } } }).catch(() => {})
      }
      await prisma.inventoryMovement.create({
        data: {
          productId: it.productId, lotNumber: it.lotNumber, type: 'ENTRADA', quantity: it.quantity,
          reason: 'Devolución de cliente — producto sin abrir', reference: saleForReturn.invoiceNumber,
          userId: users.admin.id, createdAt: daysFromNow(-1),
        },
      })
    }
    await prisma.return.create({
      data: {
        returnNumber: 'DEV-00001', saleId: saleForReturn.id, userId: users.admin.id,
        amount: saleForReturn.total, reason: 'Cliente devolvió el producto sin abrir (compra equivocada)',
        restocked: true, createdAt: daysFromNow(-1),
      },
    })
  }

  console.log('✅ Seed completado:')
  console.log(`  - ${await prisma.product.count()} productos`)
  console.log(`  - ${await prisma.lot.count()} lotes`)
  console.log(`  - ${await prisma.sale.count()} ventas`)
  console.log(`  - ${await prisma.customer.count()} clientes`)
  console.log(`  - ${await prisma.supplier.count()} proveedores`)
  console.log(`  - ${await prisma.inventoryMovement.count()} movimientos de kardex`)
  console.log(`  - ${await prisma.controlledLog.count()} registros de controlados`)
  console.log(`  - ${await prisma.cashSession.count()} sesiones de caja`)
  console.log(`  - ${await prisma.quotation.count()} cotizaciones`)
  console.log(`  - ${await prisma.promotion.count()} promociones`)
  console.log(`  - ${await prisma.return.count()} devoluciones`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
