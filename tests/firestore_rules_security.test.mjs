import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query, terminate } from 'firebase/firestore';

// -----------------------------------------------------------------------------
// SIMULADOR MATEMÁTICO DE REGLAS DE SEGURIDAD (RBAC Y CONTROL DE ACCESO)
// Replica con fidelidad el comportamiento de evaluación de Cloud Firestore.
// -----------------------------------------------------------------------------

function evaluateRule({
  user,        // { uid, token: { role }, userDoc: { role } } | null
  action,      // 'read' | 'create' | 'update' | 'delete'
  collectionName,
  resource = {},      // Datos actuales del documento en base de datos
  requestData = {}    // Datos propuestos por la solicitud entrante
}) {
  const isAuthenticated = user != null && user.uid != null;
  const tokenRole = user?.token?.role;
  const docRole = user?.userDoc?.role;

  const isAdmin = isAuthenticated && (tokenRole === 'admin' || docRole === 'admin');
  const isWaiter = isAuthenticated && (tokenRole === 'waiter' || docRole === 'waiter');
  const isKitchen = isAuthenticated && (
    ['kitchen', 'cocina', 'cocinero', 'chef'].includes(tokenRole) ||
    ['kitchen', 'cocina', 'cocinero', 'chef'].includes(docRole)
  );
  const isExcursion = isAuthenticated && (tokenRole === 'excursion' || docRole === 'excursion');
  const isStaff = isAuthenticated && (isAdmin || isWaiter || isKitchen || isExcursion);

  // 1. app_state
  if (collectionName === 'app_state') {
    if (action === 'read') return true;
    if (['create', 'update', 'delete'].includes(action)) return isAdmin;
  }

  // 2. menu_items
  if (collectionName === 'menu_items') {
    if (action === 'read') return true;
    if (['create', 'update', 'delete'].includes(action)) return isAdmin;
  }

  // 3. spots
  if (collectionName === 'spots') {
    if (action === 'read') return true;
    if (['create', 'delete'].includes(action)) return isAdmin;
    if (action === 'update') {
      if (isAdmin) return true;
      if (isWaiter && requestData.id === resource.id) return true;
      return false;
    }
  }

  // 4. excursions
  if (collectionName === 'excursions') {
    if (action === 'read') return true;
    if (['create', 'update', 'delete'].includes(action)) return isAdmin;
  }

  // 5. orders
  if (collectionName === 'orders') {
    if (action === 'read') {
      if (isAdmin || isKitchen) return true;
      if (isWaiter && (!resource.origin || resource.origin !== 'excursion')) return true;
      if (isExcursion && resource.origin === 'excursion') return true;
      if (isAuthenticated && (resource.clientUserId === user.uid || resource.customerId === user.uid)) return true;
      return false;
    }
    if (action === 'create') {
      const requiredKeys = ['id', 'spotId', 'items', 'totalUsd', 'status', 'createdAt', 'origin'];
      const hasAllKeys = requiredKeys.every(k => k in requestData);
      if (!hasAllKeys) return false;
      if (!['pending', 'in_fire'].includes(requestData.status)) return false;
      if (typeof requestData.totalUsd !== 'number' || requestData.totalUsd < 0) return false;
      if (!Array.isArray(requestData.items) || requestData.items.length === 0 || requestData.items.length > 50) return false;
      if (requestData.isSettled === true) return false;

      if (isAdmin) return true;
      if (isWaiter) {
        return ['waiter_pos', 'client_qr'].includes(requestData.origin) &&
          (!requestData.paymentStatus || ['pending', 'cash_waiter', 'pending_verification'].includes(requestData.paymentStatus));
      }
      if (isExcursion) {
        return requestData.origin === 'excursion' &&
          (!requestData.paymentStatus || ['pending', 'pending_verification'].includes(requestData.paymentStatus));
      }
      if (isAuthenticated && (requestData.clientUserId === user.uid || requestData.customerId === user.uid)) {
        return requestData.origin === 'client_qr' &&
          (!requestData.paymentStatus || ['pending', 'pending_verification'].includes(requestData.paymentStatus));
      }
      return false;
    }
    if (action === 'update') {
      if (isAdmin) return true;
      if (resource.isSettled === true) return false;

      // Staff Cocina: solo claves operativas
      if (isKitchen) {
        const allowedKitchenKeys = [
          'status', 'items', 'kitchenStep', 'updatedAt', 'prepTimerSeconds',
          'readyAt', 'prepDurationMinutes', 'elapsedSeconds'
        ];
        const affectedKeys = Object.keys(requestData).filter(k => requestData[k] !== resource[k]);
        const keysAllowed = affectedKeys.every(k => allowedKitchenKeys.includes(k));
        const validStatus = ['pending', 'in_fire', 'plated', 'ready_pass', 'delivered', 'cancelled'].includes(requestData.status);
        return keysAllowed && validStatus;
      }

      // Staff Mesonero: no comandas de excursión, no altera totales ni ítems, no marca verified ni isSettled
      if (isWaiter) {
        if (resource.origin === 'excursion') return false;
        if (requestData.totalUsd !== resource.totalUsd) return false;
        if (requestData.isSettled === true) return false;
        if (requestData.paymentStatus === 'verified' && resource.paymentStatus !== 'verified') return false;
        return true;
      }

      // Staff Excursión: solo comandas de excursión, no marca verified ni isSettled
      if (isExcursion) {
        if (resource.origin !== 'excursion') return false;
        if (requestData.isSettled === true) return false;
        if (requestData.paymentStatus === 'verified' && resource.paymentStatus !== 'verified') return false;
        return true;
      }

      // Cliente: solo comprobante de pago 'pending_verification', no altera precios, ítems ni estado de entrega
      if (
        isAuthenticated &&
        (resource.clientUserId === user.uid || resource.customerId === user.uid)
      ) {
        if (requestData.id !== resource.id || requestData.spotId !== resource.spotId) return false;
        if (requestData.totalUsd !== resource.totalUsd) return false;
        if (requestData.status !== resource.status) return false;
        if (requestData.isSettled === true) return false;
        if (
          (!requestData.paymentStatus || requestData.paymentStatus === resource.paymentStatus) ||
          (resource.paymentStatus !== 'verified' && requestData.paymentStatus === 'pending_verification')
        ) {
          return true;
        }
        return false;
      }
      return false;
    }
    if (action === 'delete') return isAdmin;
  }

  // 6. excursion_settlements
  if (collectionName === 'excursion_settlements') {
    if (action === 'read') {
      if (isAdmin) return true;
      if (isExcursion && (resource.guideId === user?.uid || !resource.guideId)) return true;
      return false;
    }
    if (action === 'create') {
      if (isAdmin) return true;
      if (isExcursion && requestData.status === 'pending' && !requestData.settledAt && !requestData.settledByAdmin) return true;
      return false;
    }
    if (action === 'update') {
      if (isAdmin) return true;
      if (isExcursion && resource.status === 'pending' && requestData.status === 'pending' &&
          requestData.settledAt === resource.settledAt && requestData.settledByAdmin === resource.settledByAdmin) {
        return true;
      }
      return false;
    }
    if (action === 'delete') return isAdmin;
  }

  // 6. app_users
  if (collectionName === 'app_users') {
    if (action === 'read') {
      if (isStaff) return true;
      if (isAuthenticated && (user.uid === resource.id || (resource.email && resource.email === user.token?.email))) return true;
      return false;
    }
    if (action === 'create') {
      if (isAdmin) return true;
      if (
        isAuthenticated &&
        user.uid === resource.id &&
        (!('role' in requestData) || requestData.role === 'client') &&
        (!('status' in requestData) || requestData.status === 'active')
      ) {
        return true;
      }
      return false;
    }
    if (action === 'update') {
      if (isAdmin) return true;
      if (
        isAuthenticated &&
        user.uid === resource.id &&
        requestData.role === resource.role &&
        requestData.status === resource.status
      ) {
        return true;
      }
      return false;
    }
    if (action === 'delete') return isAdmin;
  }

  // 7. waiters_closings
  if (collectionName === 'waiters_closings') {
    if (action === 'read') {
      if (isAdmin) return true;
      if (isWaiter && resource.waiterId === user.uid) return true;
      return false;
    }
    if (action === 'create') {
      if (isAdmin) return true;
      if (
        isWaiter &&
        requestData.waiterId === user.uid &&
        requestData.status === 'pending' &&
        (!requestData.settledAt) &&
        (!requestData.settledByOwner) &&
        (!requestData.pazYSalvoHash) &&
        (!requestData.pazYSalvoNumber)
      ) {
        return true;
      }
      return false;
    }
    if (action === 'update') {
      if (isAdmin) return true;
      if (
        isWaiter &&
        resource.waiterId === user.uid &&
        requestData.waiterId === user.uid &&
        resource.status !== 'settled' &&
        requestData.status !== 'settled' &&
        (!('settledAt' in requestData) || requestData.settledAt === resource.settledAt) &&
        (!('settledByOwner' in requestData) || requestData.settledByOwner === resource.settledByOwner) &&
        (!('pazYSalvoHash' in requestData) || requestData.pazYSalvoHash === resource.pazYSalvoHash) &&
        (!('pazYSalvoNumber' in requestData) || requestData.pazYSalvoNumber === resource.pazYSalvoNumber) &&
        (!('pagoMovilDeductedUsd' in requestData) || requestData.pagoMovilDeductedUsd === resource.pagoMovilDeductedUsd) &&
        (!('internationalDeductedUsd' in requestData) || requestData.internationalDeductedUsd === resource.internationalDeductedUsd)
      ) {
        return true;
      }
      return false;
    }
    if (action === 'delete') return isAdmin;
  }

  // 8. settings
  if (collectionName === 'settings') {
    if (action === 'read') return isAdmin || isWaiter;
    if (['create', 'update', 'delete'].includes(action)) return isAdmin;
  }

  return false;
}

// -----------------------------------------------------------------------------
// DEFINICIÓN DE PERFILES DE PRUEBA
// -----------------------------------------------------------------------------
const adminUser = { uid: 'usr-admin-dueño', token: { role: 'admin' }, userDoc: { role: 'admin' } };
const waiter1 = { uid: 'usr-waiter-carlos', token: { role: 'waiter' }, userDoc: { role: 'waiter' } };
const waiter2 = { uid: 'usr-waiter-jose', token: { role: 'waiter' }, userDoc: { role: 'waiter' } };
const kitchenUser = { uid: 'usr-kitchen-chef', token: { role: 'kitchen' }, userDoc: { role: 'kitchen' } };
const excursionUser = { uid: 'usr-excursion-capt', token: { role: 'excursion' }, userDoc: { role: 'excursion' } };
const clientUser = { uid: 'usr-client-maria', token: { role: 'client' }, userDoc: { role: 'client' } };
const anonymousUser = null;

// =============================================================================
// SUITE 1: PRUEBAS POSITIVAS Y NEGATIVAS DE `waiters_closings`
// =============================================================================

test('waiters_closings: PRUEBAS POSITIVAS', () => {
  const closingDoc = {
    id: 'close-carlos-1',
    waiterId: 'usr-waiter-carlos',
    waiterName: 'Carlos M.',
    status: 'pending',
    totalCollectedUsd: 150,
    cashToDeliverUsd: 120
  };

  // 1. Admin puede leer cualquier cierre
  assert.equal(evaluateRule({ user: adminUser, action: 'read', collectionName: 'waiters_closings', resource: closingDoc }), true);

  // 2. Mesonero puede leer su propio cierre
  assert.equal(evaluateRule({ user: waiter1, action: 'read', collectionName: 'waiters_closings', resource: closingDoc }), true);

  // 3. Admin puede crear cualquier cierre
  assert.equal(evaluateRule({
    user: adminUser,
    action: 'create',
    collectionName: 'waiters_closings',
    requestData: { id: 'c-new', waiterId: 'usr-waiter-carlos', status: 'settled', pazYSalvoHash: 'hash123' }
  }), true);

  // 4. Mesonero puede crear su propio cierre en estado pending sin sellos de liquidación
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'create',
    collectionName: 'waiters_closings',
    requestData: { id: 'c-new', waiterId: 'usr-waiter-carlos', status: 'pending', cashToDeliverUsd: 100 }
  }), true);

  // 5. Admin puede actualizar y liquidar un cierre
  assert.equal(evaluateRule({
    user: adminUser,
    action: 'update',
    collectionName: 'waiters_closings',
    resource: closingDoc,
    requestData: { ...closingDoc, status: 'settled', settledByOwner: 'Admin', pazYSalvoHash: 'abc12345' }
  }), true);

  // 6. Mesonero puede actualizar su propio cierre si sigue pendiente
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'update',
    collectionName: 'waiters_closings',
    resource: closingDoc,
    requestData: { ...closingDoc, cashToDeliverUsd: 130 }
  }), true);

  // 7. Admin puede eliminar un cierre
  assert.equal(evaluateRule({ user: adminUser, action: 'delete', collectionName: 'waiters_closings', resource: closingDoc }), true);
});

test('waiters_closings: PRUEBAS NEGATIVAS (BLOQUEO DE VULNERABILIDADES)', () => {
  const carlosClosing = {
    id: 'close-carlos-1',
    waiterId: 'usr-waiter-carlos',
    waiterName: 'Carlos M.',
    status: 'pending',
    totalCollectedUsd: 150,
    cashToDeliverUsd: 120,
    pagoMovilDeductedUsd: 20
  };

  const settledClosing = {
    ...carlosClosing,
    status: 'settled',
    settledByOwner: 'Dueño',
    pazYSalvoHash: 'FIRMA_DIGITAL_DUEÑO_SEC'
  };

  // N1: Mesonero 2 NO puede leer el cierre de Mesonero 1
  assert.equal(evaluateRule({ user: waiter2, action: 'read', collectionName: 'waiters_closings', resource: carlosClosing }), false, 'Mesonero ajeno no debe poder leer cierres de otro mesonero');

  // N2: Cocina NO puede leer cierres
  assert.equal(evaluateRule({ user: kitchenUser, action: 'read', collectionName: 'waiters_closings', resource: carlosClosing }), false, 'Cocina no debe tener acceso a cierres');

  // N3: Excursiones NO puede leer cierres
  assert.equal(evaluateRule({ user: excursionUser, action: 'read', collectionName: 'waiters_closings', resource: carlosClosing }), false, 'Excursiones no debe tener acceso a cierres');

  // N4: Cliente NO puede leer cierres
  assert.equal(evaluateRule({ user: clientUser, action: 'read', collectionName: 'waiters_closings', resource: carlosClosing }), false, 'Clientes no deben tener acceso a cierres');

  // N5: Anónimo NO puede leer cierres
  assert.equal(evaluateRule({ user: anonymousUser, action: 'read', collectionName: 'waiters_closings', resource: carlosClosing }), false, 'Anónimos no deben tener acceso a cierres');

  // N6: Mesonero NO puede crear un cierre para otro mesonero
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'create',
    collectionName: 'waiters_closings',
    requestData: { id: 'c-fraud', waiterId: 'usr-waiter-jose', status: 'pending' }
  }), false, 'Mesonero no puede crear cierres para otros');

  // N7: Mesonero NO puede auto-declarar su cierre como settled al crearlo
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'create',
    collectionName: 'waiters_closings',
    requestData: { id: 'c-fraud', waiterId: 'usr-waiter-carlos', status: 'settled' }
  }), false, 'Mesonero no puede auto-aprobarse un cierre en la creación');

  // N8: Mesonero NO puede auto-asignar hash de paz y salvo al crear
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'create',
    collectionName: 'waiters_closings',
    requestData: { id: 'c-fraud', waiterId: 'usr-waiter-carlos', status: 'pending', pazYSalvoHash: 'falso-hash' }
  }), false, 'Mesonero no puede falsificar paz y salvo al crear');

  // N9: Mesonero 2 NO puede actualizar el cierre de Mesonero 1
  assert.equal(evaluateRule({
    user: waiter2,
    action: 'update',
    collectionName: 'waiters_closings',
    resource: carlosClosing,
    requestData: { ...carlosClosing, cashToDeliverUsd: 0 }
  }), false, 'Mesonero ajeno no puede modificar arqueos de otros');

  // N10: Mesonero NO puede alterar un cierre que ya fue liquidado (status: settled)
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'update',
    collectionName: 'waiters_closings',
    resource: settledClosing,
    requestData: { ...settledClosing, cashToDeliverUsd: 50 }
  }), false, 'Mesonero no puede modificar cierres ya liquidados');

  // N11: Mesonero NO puede auto-marcarse status settled en un update
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'update',
    collectionName: 'waiters_closings',
    resource: carlosClosing,
    requestData: { ...carlosClosing, status: 'settled' }
  }), false, 'Mesonero no puede auto-liquidarse en una actualización');

  // N12: Mesonero NO puede modificar deducciones aplicadas por el dueño
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'update',
    collectionName: 'waiters_closings',
    resource: carlosClosing,
    requestData: { ...carlosClosing, pagoMovilDeductedUsd: 0 }
  }), false, 'Mesonero no puede alterar deducciones del dueño');

  // N13: Mesonero NO puede falsificar el pazYSalvoHash
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'update',
    collectionName: 'waiters_closings',
    resource: carlosClosing,
    requestData: { ...carlosClosing, pazYSalvoHash: 'hash-falso' }
  }), false, 'Mesonero no puede inventar el hash de paz y salvo');

  // N14: Mesonero NO puede eliminar cierres de caja
  assert.equal(evaluateRule({ user: waiter1, action: 'delete', collectionName: 'waiters_closings', resource: carlosClosing }), false, 'Mesonero no puede eliminar cierres');

  // N15: Cocina / Excursiones / Clientes NO pueden crear ni actualizar cierres
  assert.equal(evaluateRule({ user: kitchenUser, action: 'create', collectionName: 'waiters_closings', requestData: { waiterId: 'k1', status: 'pending' } }), false);
  assert.equal(evaluateRule({ user: excursionUser, action: 'create', collectionName: 'waiters_closings', requestData: { waiterId: 'e1', status: 'pending' } }), false);
  assert.equal(evaluateRule({ user: clientUser, action: 'create', collectionName: 'waiters_closings', requestData: { waiterId: 'c1', status: 'pending' } }), false);
});

// =============================================================================
// SUITE 2: PRUEBAS POSITIVAS Y NEGATIVAS DE `spots`
// =============================================================================

test('spots: PRUEBAS POSITIVAS', () => {
  const spotDoc = { id: 'spot-01', number: 'T-01', zone: 'beach', status: 'available' };

  // 1. Lectura pública permitida para clientes y anónimos (menú QR)
  assert.equal(evaluateRule({ user: anonymousUser, action: 'read', collectionName: 'spots', resource: spotDoc }), true);
  assert.equal(evaluateRule({ user: clientUser, action: 'read', collectionName: 'spots', resource: spotDoc }), true);
  assert.equal(evaluateRule({ user: waiter1, action: 'read', collectionName: 'spots', resource: spotDoc }), true);

  // 2. Admin puede crear y eliminar toldos
  assert.equal(evaluateRule({ user: adminUser, action: 'create', collectionName: 'spots', requestData: spotDoc }), true);
  assert.equal(evaluateRule({ user: adminUser, action: 'delete', collectionName: 'spots', resource: spotDoc }), true);

  // 3. Mesonero puede actualizar disponibilidad/asignación preservando el ID
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'update',
    collectionName: 'spots',
    resource: spotDoc,
    requestData: { ...spotDoc, status: 'occupied', assignedWaiterId: 'usr-waiter-carlos' }
  }), true);
});

test('spots: PRUEBAS NEGATIVAS (BLOQUEO DE CREACIÓN/ELIMINACIÓN INDEBIDA)', () => {
  const spotDoc = { id: 'spot-01', number: 'T-01', zone: 'beach', status: 'available' };

  // N1: Mesonero NO puede crear nuevos toldos
  assert.equal(evaluateRule({ user: waiter1, action: 'create', collectionName: 'spots', requestData: spotDoc }), false, 'Mesonero no debe poder crear toldos');

  // N2: Mesonero NO puede eliminar toldos existentes
  assert.equal(evaluateRule({ user: waiter1, action: 'delete', collectionName: 'spots', resource: spotDoc }), false, 'Mesonero no debe poder eliminar toldos');

  // N3: Cocina NO puede modificar ni eliminar toldos
  assert.equal(evaluateRule({ user: kitchenUser, action: 'update', collectionName: 'spots', resource: spotDoc, requestData: spotDoc }), false);
  assert.equal(evaluateRule({ user: kitchenUser, action: 'delete', collectionName: 'spots', resource: spotDoc }), false);

  // N4: Excursiones NO puede modificar toldos de playa
  assert.equal(evaluateRule({ user: excursionUser, action: 'update', collectionName: 'spots', resource: spotDoc, requestData: spotDoc }), false);

  // N5: Clientes y anónimos NO pueden modificar ni eliminar toldos
  assert.equal(evaluateRule({ user: clientUser, action: 'update', collectionName: 'spots', resource: spotDoc, requestData: spotDoc }), false);
  assert.equal(evaluateRule({ user: anonymousUser, action: 'update', collectionName: 'spots', resource: spotDoc, requestData: spotDoc }), false);
});

// =============================================================================
// SUITE 3: PRUEBAS POSITIVAS Y NEGATIVAS DE DATOS FINANCIEROS (`settings`, `orders`)
// =============================================================================

test('settings (Datos financieros del sistema): PRUEBAS POSITIVAS Y NEGATIVAS', () => {
  const settingsDoc = { bcvRate: 55.40, bankConfig: { pagoMovilPhone: '04141234567' } };

  // Positivo: Admin y Mesonero pueden leer tasas y cuentas bancarias
  assert.equal(evaluateRule({ user: adminUser, action: 'read', collectionName: 'settings', resource: settingsDoc }), true);
  assert.equal(evaluateRule({ user: waiter1, action: 'read', collectionName: 'settings', resource: settingsDoc }), true);

  // Positivo: Admin puede escribir o actualizar configuraciones financieras
  assert.equal(evaluateRule({ user: adminUser, action: 'update', collectionName: 'settings', resource: settingsDoc, requestData: settingsDoc }), true);

  // Negativo: Cocina, Excursiones, Clientes y Anónimos NO pueden leer settings
  assert.equal(evaluateRule({ user: kitchenUser, action: 'read', collectionName: 'settings', resource: settingsDoc }), false);
  assert.equal(evaluateRule({ user: excursionUser, action: 'read', collectionName: 'settings', resource: settingsDoc }), false);
  assert.equal(evaluateRule({ user: clientUser, action: 'read', collectionName: 'settings', resource: settingsDoc }), false);
  assert.equal(evaluateRule({ user: anonymousUser, action: 'read', collectionName: 'settings', resource: settingsDoc }), false);

  // Negativo: Mesonero NO puede escribir o modificar settings
  assert.equal(evaluateRule({ user: waiter1, action: 'update', collectionName: 'settings', resource: settingsDoc, requestData: settingsDoc }), false);
});

test('orders (Protección financiera de órdenes y estado isSettled): PRUEBAS POSITIVAS Y NEGATIVAS', () => {
  const activeOrder = {
    id: 'ord-101',
    spotId: 'spot-01',
    clientUserId: 'usr-client-maria',
    status: 'in_fire',
    totalUsd: 50,
    isSettled: false,
    items: [{ id: 'i1', quantity: 1, unitPriceUsd: 50 }],
    createdAt: '2026-10-24T00:00:00Z'
  };

  const settledOrder = {
    ...activeOrder,
    status: 'delivered',
    isSettled: true
  };

  // Positivo: Admin puede marcar una orden como liquidada (isSettled: true)
  assert.equal(evaluateRule({
    user: adminUser,
    action: 'update',
    collectionName: 'orders',
    resource: activeOrder,
    requestData: { ...activeOrder, isSettled: true }
  }), true);

  // Positivo: Mesonero y Cocina pueden actualizar comanda activa
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'update',
    collectionName: 'orders',
    resource: activeOrder,
    requestData: { ...activeOrder, status: 'plated' }
  }), true);
  assert.equal(evaluateRule({
    user: kitchenUser,
    action: 'update',
    collectionName: 'orders',
    resource: activeOrder,
    requestData: { ...activeOrder, status: 'ready_pass' }
  }), true);

  // Negativo: Mesonero NO puede marcar una orden como liquidada (isSettled: true)
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'update',
    collectionName: 'orders',
    resource: activeOrder,
    requestData: { ...activeOrder, isSettled: true }
  }), false, 'Mesonero no debe poder liquidar financieramente una comanda');

  // Negativo: Cocina NO puede marcar una orden como liquidada
  assert.equal(evaluateRule({
    user: kitchenUser,
    action: 'update',
    collectionName: 'orders',
    resource: activeOrder,
    requestData: { ...activeOrder, isSettled: true }
  }), false, 'Cocina no debe poder liquidar financieramente una comanda');

  // Negativo: Nadie excepto Admin puede alterar una orden ya liquidada
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'update',
    collectionName: 'orders',
    resource: settledOrder,
    requestData: { ...settledOrder, status: 'pending' }
  }), false, 'No se puede reabrir ni modificar una comanda ya liquidada');
  assert.equal(evaluateRule({
    user: kitchenUser,
    action: 'update',
    collectionName: 'orders',
    resource: settledOrder,
    requestData: { ...settledOrder, status: 'pending' }
  }), false, 'Cocina no puede alterar comanda ya liquidada');

  // Negativo: Mesonero y Cocina NO pueden eliminar órdenes
  assert.equal(evaluateRule({ user: waiter1, action: 'delete', collectionName: 'orders', resource: activeOrder }), false);
  assert.equal(evaluateRule({ user: kitchenUser, action: 'delete', collectionName: 'orders', resource: activeOrder }), false);
});

test('orders: RBAC estricto para Cocina, Mesoneros, Excursiones y Clientes', () => {
  const beachOrder = {
    id: 'ord-beach-201',
    spotId: 'spot-05',
    origin: 'waiter_pos',
    clientUserId: 'usr-client-pedro',
    status: 'in_fire',
    totalUsd: 80,
    isSettled: false,
    paymentStatus: 'pending',
    items: [{ id: 'i1', quantity: 2, unitPriceUsd: 40 }],
    createdAt: '2026-10-24T00:00:00Z'
  };

  const excursionOrder = {
    id: 'ord-exc-301',
    spotId: 'lancha-tiburon',
    origin: 'excursion',
    excursionId: 'exc-cayo-sombrero',
    guideId: 'usr-guide-luis',
    status: 'in_fire',
    totalUsd: 150,
    isSettled: false,
    paymentStatus: 'pending',
    items: [{ id: 'i2', quantity: 3, unitPriceUsd: 50 }],
    createdAt: '2026-10-24T00:00:00Z'
  };

  // 1. COCINA:
  // Positivo: Cocina puede actualizar estado operativo, kitchenStep y cronómetros
  assert.equal(evaluateRule({
    user: kitchenUser,
    action: 'update',
    collectionName: 'orders',
    resource: beachOrder,
    requestData: { ...beachOrder, status: 'plated', kitchenStep: 'emplatado' }
  }), true, 'Cocina debe poder avanzar estado a plated con kitchenStep');

  // Negativo: Cocina NO puede alterar precios ni totalUsd
  assert.equal(evaluateRule({
    user: kitchenUser,
    action: 'update',
    collectionName: 'orders',
    resource: beachOrder,
    requestData: { ...beachOrder, totalUsd: 10 }
  }), false, 'Cocina no puede alterar totalUsd');

  // Negativo: Cocina NO puede aprobar pagos (paymentStatus: verified)
  assert.equal(evaluateRule({
    user: kitchenUser,
    action: 'update',
    collectionName: 'orders',
    resource: beachOrder,
    requestData: { ...beachOrder, paymentStatus: 'verified' }
  }), false, 'Cocina no puede auto-aprobar pagos');

  // 2. MESONEROS:
  // Negativo: Mesonero NO puede alterar totalUsd
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'update',
    collectionName: 'orders',
    resource: beachOrder,
    requestData: { ...beachOrder, totalUsd: 20 }
  }), false, 'Mesonero no puede modificar totalUsd');

  // Negativo: Mesonero NO puede auto-marcar pago como verified (solo admin)
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'update',
    collectionName: 'orders',
    resource: beachOrder,
    requestData: { ...beachOrder, paymentStatus: 'verified' }
  }), false, 'Mesonero no puede verificar pagos digitalmente');

  // Negativo: Mesonero NO puede leer ni modificar órdenes de excursión
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'read',
    collectionName: 'orders',
    resource: excursionOrder
  }), false, 'Mesonero no debe leer órdenes de excursiones');
  assert.equal(evaluateRule({
    user: waiter1,
    action: 'update',
    collectionName: 'orders',
    resource: excursionOrder,
    requestData: { ...excursionOrder, status: 'delivered' }
  }), false, 'Mesonero no debe modificar órdenes de excursiones');

  // 3. EXCURSIONES:
  // Positivo: Guía puede leer comanda de excursión
  assert.equal(evaluateRule({
    user: excursionUser,
    action: 'read',
    collectionName: 'orders',
    resource: excursionOrder
  }), true, 'Personal de excursiones debe leer órdenes de excursión');

  // Negativo: Guía NO puede leer ni modificar comandas de playa/toldos
  assert.equal(evaluateRule({
    user: excursionUser,
    action: 'read',
    collectionName: 'orders',
    resource: beachOrder
  }), false, 'Personal de excursiones no debe leer órdenes de playa');
  assert.equal(evaluateRule({
    user: excursionUser,
    action: 'update',
    collectionName: 'orders',
    resource: beachOrder,
    requestData: { ...beachOrder, status: 'delivered' }
  }), false, 'Personal de excursiones no debe modificar órdenes de playa');

  // 4. CLIENTES:
  const clientUserObj = { uid: 'usr-client-pedro', token: { role: 'client' }, userDoc: { role: 'client' } };
  // Positivo: Cliente puede subir comprobante cambiando paymentStatus a 'pending_verification'
  assert.equal(evaluateRule({
    user: clientUserObj,
    action: 'update',
    collectionName: 'orders',
    resource: beachOrder,
    requestData: { ...beachOrder, paymentStatus: 'pending_verification' }
  }), true, 'Cliente debe poder subir comprobante');

  // Negativo: Cliente NO puede alterar totalUsd
  assert.equal(evaluateRule({
    user: clientUserObj,
    action: 'update',
    collectionName: 'orders',
    resource: beachOrder,
    requestData: { ...beachOrder, totalUsd: 5 }
  }), false, 'Cliente no puede alterar totalUsd');

  // Negativo: Cliente NO puede auto-marcarse orden como entregada
  assert.equal(evaluateRule({
    user: clientUserObj,
    action: 'update',
    collectionName: 'orders',
    resource: beachOrder,
    requestData: { ...beachOrder, status: 'delivered' }
  }), false, 'Cliente no puede marcar comanda como entregada');
});

test('excursion_settlements: RBAC y liquidación de servicios de excursión', () => {
  const ownGuideSettlement = {
    id: 'set-exc-01',
    guideId: 'usr-excursion-capt', // Corresponde al UID de excursionUser
    boatName: 'La Perla',
    operatingDate: '2026-10-24',
    status: 'pending',
    totalSalesUsd: 450,
    expectedCashUsd: 200
  };

  const otherGuideSettlement = {
    id: 'set-exc-02',
    guideId: 'usr-other-guide', // Perteneciente a otro guía
    boatName: 'El Bucanero',
    operatingDate: '2026-10-24',
    status: 'pending',
    totalSalesUsd: 300,
    expectedCashUsd: 150
  };

  // Positivo: Guía de excursión puede crear su reporte de liquidación en estado pending
  assert.equal(evaluateRule({
    user: excursionUser,
    action: 'create',
    collectionName: 'excursion_settlements',
    requestData: ownGuideSettlement
  }), true, 'Guía debe poder registrar liquidación pendiente');

  // Positivo: Guía puede leer su propia liquidación
  assert.equal(evaluateRule({
    user: excursionUser,
    action: 'read',
    collectionName: 'excursion_settlements',
    resource: ownGuideSettlement
  }), true, 'Guía debe poder leer su propia liquidación');

  // Negativo: Guía NO puede consultar la liquidación de otro guía
  assert.equal(evaluateRule({
    user: excursionUser,
    action: 'read',
    collectionName: 'excursion_settlements',
    resource: otherGuideSettlement
  }), false, 'Guía no debe acceder a liquidaciones ajenas');

  // Negativo: Guía NO puede auto-liquidar administrativamente
  assert.equal(evaluateRule({
    user: excursionUser,
    action: 'update',
    collectionName: 'excursion_settlements',
    resource: ownGuideSettlement,
    requestData: { ...ownGuideSettlement, status: 'settled', settledByAdmin: 'usr-admin-1' }
  }), false, 'Guía no puede auto-liquidar reporte');

  // Negativo: Guía NO puede eliminar liquidación
  assert.equal(evaluateRule({
    user: excursionUser,
    action: 'delete',
    collectionName: 'excursion_settlements',
    resource: ownGuideSettlement
  }), false);

  // Positivo: Admin puede leer, liquidar y eliminar cualquier reporte
  assert.equal(evaluateRule({
    user: adminUser,
    action: 'read',
    collectionName: 'excursion_settlements',
    resource: ownGuideSettlement
  }), true);
  assert.equal(evaluateRule({
    user: adminUser,
    action: 'update',
    collectionName: 'excursion_settlements',
    resource: ownGuideSettlement,
    requestData: { ...ownGuideSettlement, status: 'settled', settledByAdmin: 'usr-admin-1' }
  }), true, 'Admin debe poder liquidar reporte');
  assert.equal(evaluateRule({
    user: adminUser,
    action: 'delete',
    collectionName: 'excursion_settlements',
    resource: ownGuideSettlement
  }), true);
});

// =============================================================================
// SUITE 4: INSPECCIÓN ESTÁTICA DEL ARCHIVO firestore.rules
// =============================================================================

test('Inspección de texto y sintaxis en firestore.rules', () => {
  const rulesPath = path.resolve('firestore.rules');
  const content = fs.readFileSync(rulesPath, 'utf8');

  // Verificación de funciones de rol
  assert.match(content, /function isAdmin\(\)/);
  assert.match(content, /function isWaiter\(\)/);
  assert.match(content, /function isKitchen\(\)/);
  assert.match(content, /function isExcursion\(\)/);
  assert.match(content, /function isStaff\(\)/);

  // Verificación de blindaje en waiters_closings
  assert.match(content, /match \/waiters_closings\/\{closingId\}/);
  assert.match(content, /isWaiter\(\) && resource\.data\.waiterId == request\.auth\.uid/);
  assert.match(content, /request\.resource\.data\.status == 'pending'/);
  assert.match(content, /request\.resource\.data\.status != 'settled'/);
  assert.match(content, /pazYSalvoHash/);
  assert.match(content, /settledByOwner/);

  // Verificación de blindaje en excursion_settlements
  assert.match(content, /match \/excursion_settlements\/\{settlementId\}/);

  // Verificación de blindaje en spots
  assert.match(content, /match \/spots\/\{spotId\}/);
  assert.match(content, /allow create, delete: if isAdmin\(\);/);
  assert.match(content, /allow update: if isAdmin\(\) \|\| \(\s*isWaiter\(\)/);

  // Verificación de blindaje en settings
  assert.match(content, /match \/settings\/\{settingId\}/);
  assert.match(content, /allow read: if isAdmin\(\) \|\| isWaiter\(\);/);
  assert.match(content, /allow write: if isAdmin\(\);/);
});

// =============================================================================
// SUITE 5: COMPROBACIÓN NO DESTRUCTIVA CONTRA EL ENDPOINT DE PRODUCCIÓN
// Comprueba que las colecciones privadas rechazan lecturas no autorizadas
// =============================================================================

test('Comprobación no destructiva contra el endpoint de Firebase', async () => {
  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyAnMvY9S2ZCRwaY-rCzMnSUGe6XSY7kl5k",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "playa-buche-pos.firebaseapp.com",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "playa-buche-pos",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "playa-buche-pos.firebasestorage.app",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "637742279156",
    appId: process.env.VITE_FIREBASE_APP_ID || "1:637742279156:web:daa2a086b0b82d6ecc31a1",
  };

  const app = initializeApp(firebaseConfig, 'test-prod-eval-' + Date.now());
  const db = getFirestore(app);

  let failedAsExpected = false;
  try {
    const q = query(collection(db, 'waiters_closings'), limit(1));
    await getDocs(q);
  } catch (err) {
    failedAsExpected = true;
    assert.ok(
      /permission-denied|unavailable|failed-precondition/.test(err?.code || err?.message || ''),
      `Error de acceso esperado en Firestore, recibido: ${err?.code}`
    );
  } finally {
    try {
      await terminate(db);
      await deleteApp(app);
    } catch {}
  }
  assert.equal(failedAsExpected, true, 'Lectura anónima sobre /waiters_closings debe ser rechazada');
});
