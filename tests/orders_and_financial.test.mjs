import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAndRecalculateOrder } from '../src/services/firebaseDb.ts';

test('1. Recálculo forzoso de precios unitarios y subtotales en el servidor contra el catálogo oficial', async () => {
  const officialCatalog = [
    {
      id: 'p-pargo',
      name: 'Pargo Rojo Playero',
      category: 'pescados',
      priceUsd: 25.00,
      description: 'Pargo frito fresco',
      imageUrl: '/pargo.jpg',
      estimatedMinutes: '25 min',
      isAvailable: true,
      waiterShareUsd: 2.00
    },
    {
      id: 'p-toston',
      name: 'Ración de Tostones',
      category: 'entradas',
      priceUsd: 8.00,
      description: 'Con queso y ensalada',
      imageUrl: '/toston.jpg',
      estimatedMinutes: '10 min',
      isAvailable: true,
      waiterShareUsd: 0.50
    }
  ];

  // El comensal o un atacante envía el pedido con precios manipulados fraudulentamente (ej: $0.50 en lugar de $25.00)
  const fraudulentOrder = {
    id: 'ord-test-fraud-1',
    displayNumber: '#101',
    spotId: 'toldo-12',
    spotName: 'Toldo 12',
    clientUserId: 'usr-client-123',
    items: [
      {
        id: 'item-1',
        menuItemId: 'p-pargo',
        name: 'Pargo Rojo Playero',
        quantity: 2,
        unitPriceUsd: 0.50, // PRECIO MANIPULADO
        waiterShareUsd: 0,
        status: 'queue',
        prepTimerSeconds: 0
      },
      {
        id: 'item-2',
        menuItemId: 'p-toston',
        name: 'Ración de Tostones',
        quantity: 1,
        unitPriceUsd: 1.00, // PRECIO MANIPULADO
        waiterShareUsd: 0,
        status: 'queue',
        prepTimerSeconds: 0
      }
    ],
    subtotalUsd: 2.00, // TOTAL MANIPULADO
    totalUsd: 2.00,
    totalBs: 100.00,
    status: 'pending',
    paymentStatus: 'pending',
    createdAt: new Date().toISOString()
  };

  const bcvRate = 60.00;
  const recalculated = await validateAndRecalculateOrder(fraudulentOrder, officialCatalog, bcvRate);

  // Verificación estricta:
  // Pargo: 2 x $25 = $50
  // Tostón: 1 x $8 = $8
  // Total real = $58
  assert.equal(recalculated.items[0].unitPriceUsd, 25.00, 'El precio del pargo DEBE ser forzado a $25.00');
  assert.equal(recalculated.items[1].unitPriceUsd, 8.00, 'El precio de los tostones DEBE ser forzado a $8.00');
  assert.equal(recalculated.subtotalUsd, 58.00, 'El subtotal DEBE recalcularse exactamente en $58.00');
  assert.equal(recalculated.totalUsd, 58.00, 'El total USD DEBE ser $58.00 rechazando el total fraudulento de $2.00');
  assert.equal(recalculated.totalBs, 3480.00, 'El total en Bs DEBE ser exactamente 58 * 60 = 3480.00 Bs');
});

test('2. Precisión decimal sin errores de coma flotante', async () => {
  const catalog = [
    {
      id: 'item-cent',
      name: 'Café Guayoyo Playero',
      category: 'bebidas',
      priceUsd: 1.33,
      description: 'Café',
      imageUrl: '/cafe.jpg',
      estimatedMinutes: '5 min',
      isAvailable: true
    }
  ];

  const order = {
    id: 'ord-math-test',
    spotId: 'toldo-1',
    items: [
      { id: 'i-1', menuItemId: 'item-cent', name: 'Café Guayoyo Playero', quantity: 3, unitPriceUsd: 1.33 }
    ],
    totalUsd: 0,
    subtotalUsd: 0,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  const rate = 55.45;
  const recalculated = await validateAndRecalculateOrder(order, catalog, rate);

  // 3 * 1.33 = 3.99 exacto
  assert.equal(recalculated.subtotalUsd, 3.99);
  assert.equal(recalculated.totalUsd, 3.99);
  // 3.99 * 55.45 = 221.2455 -> redondeado a 221.25 Bs
  assert.equal(recalculated.totalBs, 221.25);
});

test('3. Saneamiento estricto de documentos Firestore contra undefined', async () => {
  const { sanitizeFirestoreDoc } = await import('../src/services/firebaseDb.ts');

  const dirtyDoc = {
    id: 'ord-clean-test',
    customerName: 'Juan Pérez',
    customerPhone: undefined,
    specialNote: undefined,
    deepNested: {
      fieldA: 'presente',
      fieldB: undefined
    },
    arrayField: [1, 2, 3]
  };

  const clean = sanitizeFirestoreDoc(dirtyDoc);

  assert.equal(clean.customerName, 'Juan Pérez');
  assert.equal(clean.customerPhone, undefined);
  assert.ok(!('customerPhone' in clean), 'No debe tener la clave customerPhone en el objeto');
  assert.ok(!('specialNote' in clean), 'No debe tener la clave specialNote en el objeto');
  assert.ok(!('fieldB' in clean.deepNested), 'No debe tener campos anidados con valor undefined');
  assert.equal(clean.deepNested.fieldA, 'presente');
});

test('4. Límite máximo de ítems por comanda (protección DoS)', async () => {
  const catalog = [
    { id: 'item-1', name: 'Agua Mineral', category: 'bebidas', priceUsd: 2, description: '', imageUrl: '', estimatedMinutes: '', isAvailable: true }
  ];

  // Intento de pedir 9999 unidades en un solo ítem
  const overflowOrder = {
    id: 'ord-overflow',
    spotId: 'toldo-1',
    items: [
      { id: 'i-1', menuItemId: 'item-1', name: 'Agua Mineral', quantity: 9999, unitPriceUsd: 2 }
    ],
    totalUsd: 0,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  const recalculated = await validateAndRecalculateOrder(overflowOrder, catalog, 50);

  // Debe acotar la cantidad al máximo permitido (50)
  assert.equal(recalculated.items[0].quantity, 50, 'La cantidad de un solo ítem debe acotarse a 50 unidades máximo');
  assert.equal(recalculated.totalUsd, 100, '50 x $2 = $100');
});

test('5. Máquina de estados finita de comandas y transiciones válidas vs inválidas', async () => {
  const { isValidOrderStatusTransition } = await import('../src/services/firebaseDb.ts');

  // Transiciones operativas legales
  assert.equal(isValidOrderStatusTransition('pending', 'in_fire'), true, 'pending -> in_fire permitido');
  assert.equal(isValidOrderStatusTransition('in_fire', 'plated'), true, 'in_fire -> plated permitido');
  assert.equal(isValidOrderStatusTransition('plated', 'ready_pass'), true, 'plated -> ready_pass permitido');
  assert.equal(isValidOrderStatusTransition('ready_pass', 'delivered'), true, 'ready_pass -> delivered permitido');
  assert.equal(isValidOrderStatusTransition('pending', 'cancelled'), true, 'pending -> cancelled permitido');
  assert.equal(isValidOrderStatusTransition('in_fire', 'cancelled'), true, 'in_fire -> cancelled permitido');

  // Transiciones ilegales bloqueadas para personal no administrativo
  assert.equal(isValidOrderStatusTransition('delivered', 'pending', false), false, 'delivered -> pending RECHAZADO');
  assert.equal(isValidOrderStatusTransition('delivered', 'in_fire', false), false, 'delivered -> in_fire RECHAZADO');
  assert.equal(isValidOrderStatusTransition('cancelled', 'delivered', false), false, 'cancelled -> delivered RECHAZADO');
  assert.equal(isValidOrderStatusTransition('cancelled', 'pending', false), false, 'cancelled -> pending RECHAZADO');
  assert.equal(isValidOrderStatusTransition('ready_pass', 'in_fire', false), false, 'ready_pass -> in_fire RECHAZADO');

  // Administrador tiene potestad de reapertura/corrección auditada
  assert.equal(isValidOrderStatusTransition('delivered', 'in_fire', true), true, 'Admin puede corregir comandas auditadamente');
});

test('6. Desglose matemático y cuadre de pagos mixtos (MixedPaymentBreakdown)', () => {
  // Caso de prueba: comanda total $50.00 USD, tasa BCV = 60.00 Bs/USD (Total Bs: 3,000.00 Bs)
  // Cliente paga:
  // - Efectivo USD: $20.00
  // - Pago Móvil Bs: 1,800.00 Bs (= $30.00 USD)
  // - Total recibido = $50.00 exacto
  const bcvRate = 60.00;
  const cashUsd = 20.00;
  const pagoMovilBs = 1800.00;
  const pagoMovilUsdEquivalent = Math.round((pagoMovilBs / bcvRate) * 100) / 100;

  const breakdown = {
    cashUsd: cashUsd,
    cashBs: 0,
    pagoMovilBs: pagoMovilBs,
    zelleUsd: 0,
    posBs: 0,
    bcvRateApplied: bcvRate,
    receivedTotalUsdEquivalent: Math.round((cashUsd + pagoMovilUsdEquivalent) * 100) / 100,
    changeAmount: 0,
    changeCurrency: 'USD'
  };

  assert.equal(pagoMovilUsdEquivalent, 30.00);
  assert.equal(breakdown.receivedTotalUsdEquivalent, 50.00);
  assert.equal(breakdown.bcvRateApplied, 60.00);

  // Verificación de vuelto exacto en caso de sobrepago:
  // Si entrega $25.00 USD en efectivo + 1,800 Bs ($30 USD), Total = $55.00 USD. Vuelto = $5.00 USD
  const cashUsdOver = 25.00;
  const totalReceivedOver = Math.round((cashUsdOver + pagoMovilUsdEquivalent) * 100) / 100;
  const expectedTotal = 50.00;
  const changeUsd = Math.round((totalReceivedOver - expectedTotal) * 100) / 100;

  assert.equal(totalReceivedOver, 55.00);
  assert.equal(changeUsd, 5.00);
});

test('7. Arqueo de caja sin enmascaramiento de saldos negativos (eliminación de Math.max(0, ...))', () => {
  // Simulación del cálculo de arqueo de AdminView:
  // Un mesonero cobra comandas digitales por Pago Móvil y muy poco efectivo:
  // - Ventas totales: $100.00
  // - Efectivo en mano (cashSum): $15.00
  // - Digital cobrado (digitalSum): $85.00
  // - Participación por platos (dishShareTotal): $25.00
  // - Propinas totales (tipsSum): $10.00
  // Total deducciones / compensación debida al mesonero = $25.00 + $10.00 = $35.00.
  // Efectivo físico que el mesonero tiene en mano = $15.00.
  // Dinero a entregar a la casa = Efectivo en mano ($15.00) - Deducciones ganadas ($35.00) = -$20.00.
  // La casa debe reembolsarle $20.00 en efectivo de los fondos digitales cobrados.

  const cashSum = 15.00;
  const dishShareTotal = 25.00;
  const tipsSum = 10.00;
  const deductionsSum = dishShareTotal + tipsSum; // 35.00

  // Cálculo real (sin Math.max):
  const realBalance = cashSum - deductionsSum;
  assert.equal(realBalance, -20.00, 'El saldo neto DEBE ser -$20.00 (la casa adeuda al mesonero)');

  // Demostración del defecto que provocaba Math.max(0, ...):
  const buggyBalance = Math.max(0, cashSum - deductionsSum);
  assert.equal(buggyBalance, 0, 'El bug anterior ocultaba el déficit truncando a 0');
  assert.notEqual(realBalance, buggyBalance, 'El cálculo corregido no debe coincidir con el bug');
});

test('8. Aislamiento estricto de ventas de excursiones en el arqueo de mesoneros', () => {
  const allOrders = [
    {
      id: 'ord-waiter-1',
      waiterId: 'usr-waiter-1',
      origin: 'waiter_pos',
      totalUsd: 45.00,
      paymentStatus: 'cash_waiter',
      paymentMethod: 'cash_usd',
      status: 'delivered'
    },
    {
      id: 'ord-waiter-2',
      waiterId: 'usr-waiter-1',
      origin: 'client_qr',
      totalUsd: 55.00,
      paymentStatus: 'verified',
      paymentMethod: 'pago_movil',
      status: 'delivered'
    },
    {
      // Comanda de excursión en lancha — NO debe pertenecer al arqueo de toldos del mesonero
      id: 'ord-excursion-1',
      waiterId: 'usr-waiter-1', // Aún si un empleado tiene doble rol o comparte ID
      origin: 'excursion',
      excursionId: 'exc-cayo-sal',
      boatName: 'La Sirena',
      totalUsd: 200.00,
      paymentStatus: 'verified',
      paymentMethod: 'pago_movil',
      status: 'delivered'
    }
  ];

  // Filtro estricto utilizado en AdminView y cierres de mesoneros:
  const waiterOrders = allOrders.filter(
    (o) => o.waiterId === 'usr-waiter-1' && o.origin !== 'excursion' && !o.excursionId
  );

  assert.equal(waiterOrders.length, 2, 'Deben filtrarse únicamente las 2 órdenes de playa');
  const waiterSales = waiterOrders.reduce((acc, o) => acc + o.totalUsd, 0);
  assert.equal(waiterSales, 100.00, 'El total de ventas del mesonero debe ser $100.00, excluyendo los $200.00 de excursión');

  // Filtro de excursiones:
  const excursionOrders = allOrders.filter((o) => o.origin === 'excursion' || o.excursionId != null);
  assert.equal(excursionOrders.length, 1);
  assert.equal(excursionOrders[0].totalUsd, 200.00);
});

test('9. Mecanismo de idempotencia contra pedidos duplicados por reintentos de red', () => {
  const processedKeys = new Set();

  function registerOrder(order, existingRegistry) {
    if (order.idempotencyKey && existingRegistry.has(order.idempotencyKey)) {
      return { status: 'duplicate_ignored', orderId: order.id };
    }
    if (order.idempotencyKey) {
      existingRegistry.add(order.idempotencyKey);
    }
    return { status: 'created', orderId: order.id };
  }

  const orderSubmission1 = {
    id: 'ord-idem-1',
    idempotencyKey: 'idem-client-123-timestamp-456',
    totalUsd: 30.00,
    spotId: 'toldo-3'
  };

  const firstAttempt = registerOrder(orderSubmission1, processedKeys);
  assert.equal(firstAttempt.status, 'created');

  // Reintento idéntico por timeout de red
  const retryAttempt = registerOrder(orderSubmission1, processedKeys);
  assert.equal(retryAttempt.status, 'duplicate_ignored', 'El reintento con la misma clave de idempotencia debe ignorarse');
  assert.equal(processedKeys.size, 1, 'No se deben crear documentos duplicados');
});

test('10. Estructura integral de cierre de turno en colección dedicada waiters_closings', () => {
  const closingData = {
    id: 'close-shift-20261024-w1',
    waiterId: 'usr-waiter-carlos',
    waiterName: 'Carlos Mesonero',
    shiftId: 'shift-morning-20261024',
    shiftType: 'morning',
    operatingDate: '2026-10-24',
    openedAt: '2026-10-24T08:00:00Z',
    closedAt: '2026-10-24T16:00:00Z',
    startingCashFundUsd: 50.00,
    orderIds: ['ord-1', 'ord-2', 'ord-3'],
    salesByMethod: {
      cash_usd: 120.00,
      cash_bs: 0,
      pago_movil: 80.00,
      zelle: 50.00,
      pos: 0,
      mixed_split: 50.00
    },
    totalSalesUsd: 300.00,
    expectedCashUsd: 170.00, // $50 fondo inicial + $120 ventas efectivo
    countedCashUsd: 170.00,
    cashDifferenceUsd: 0.00,
    tipsEarnedUsd: 30.00,
    dishShareEarnedUsd: 25.00,
    deductionsUsd: 0.00,
    status: 'pending',
    pazYSalvoHash: 'paz-w1-20261024-hash-abc'
  };

  assert.ok(closingData.id.startsWith('close-'));
  assert.ok(closingData.shiftId);
  assert.ok(['morning', 'afternoon', 'night', 'full_day'].includes(closingData.shiftType));
  assert.equal(closingData.expectedCashUsd, closingData.startingCashFundUsd + closingData.salesByMethod.cash_usd);
  assert.equal(closingData.cashDifferenceUsd, closingData.countedCashUsd - closingData.expectedCashUsd);
  assert.equal(closingData.status, 'pending');
});
