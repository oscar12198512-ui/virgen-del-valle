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
