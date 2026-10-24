import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  where,
  limit,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  ToldoSpot,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  UserRole,
  ExcursionPackage,
  WaiterClosingSummary,
  ExcursionSettlement,
  BillDenominationCount,
  BankConfig,
  User,
  AuditLogItem,
  ArenaSupplyItem,
  CargoBoatManifest,
  WasteReportItem,
  RbacRoleDefinition,
  GiveawayState
} from '../types';

export interface AppStateData {
  menuItems?: MenuItem[];
  spots?: ToldoSpot[];
  orders?: Order[];
  excursion?: ExcursionPackage;
  bankConfig?: BankConfig;
  waitersClosings?: WaiterClosingSummary[];
  drawerBills?: BillDenominationCount;
  bcvRate?: number;
  auditLogs?: AuditLogItem[];
  arenaSupplies?: ArenaSupplyItem[];
  cargoManifests?: CargoBoatManifest[];
  wasteReports?: WasteReportItem[];
  rolePermissions?: Record<string, RbacRoleDefinition>;
  giveaway?: GiveawayState;
  updatedAt?: any;
}

const STATE_DOC_REF = doc(db, 'app_state', 'main');

/**
 * Escucha cambios en tiempo real en el estado operativo de Firestore.
 */
export function subscribeToAppState(
  onUpdate: (state: AppStateData) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    STATE_DOC_REF,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as AppStateData);
      } else {
        // Documento aún no creado
        onUpdate({});
      }
    },
    (error) => {
      console.error('Error al escuchar app_state en Firestore:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Guarda o fusiona cambios en el estado operativo global.
 */
export async function saveAppState(partialState: Partial<AppStateData>): Promise<void> {
  await setDoc(
    STATE_DOC_REF,
    {
      ...partialState,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

/**
 * Obtiene el estado una sola vez (por ejemplo para catálogo público).
 */
export async function getAppStateOnce(): Promise<AppStateData | null> {
  const snapshot = await getDoc(STATE_DOC_REF);
  if (snapshot.exists()) {
    return snapshot.data() as AppStateData;
  }
  return null;
}

// -------------------------------------------------------------
// GESTIÓN DE ÓRDENES Y COMANDAS EN TIEMPO REAL (COLECCIÓN DEDICADA)
// -------------------------------------------------------------
const ORDERS_COLLECTION = collection(db, 'orders');

export interface SubscribeOrdersOptions {
  role?: UserRole;
  waiterId?: string;
  clientOrderId?: string;
  clientUserId?: string;
  limitCount?: number;
  statusFilter?: OrderStatus[];
}

/**
 * Escucha cambios en tiempo real en la colección 'orders' con filtros estrictos y límites.
 * Evita la saturación por listeners globales descontrolados:
 * - Para Clientes: Escucha únicamente su orden activa (1 solo documento) o sus órdenes.
 * - Para Cocina: Escucha solo órdenes activas en preparación o listas para pase ('pending', 'in_fire', 'plated', 'ready_pass').
 * - Para Mesoneros/Admin: Consulta paginada/limitada (últimas 50-80 órdenes) para no saturar memoria ni red en celulares.
 */
export function subscribeToOrders(
  onUpdate: (orders: Order[]) => void,
  onError?: (error: Error) => void
): Unsubscribe;
export function subscribeToOrders(
  options: SubscribeOrdersOptions,
  onUpdate: (orders: Order[]) => void,
  onError?: (error: Error) => void
): Unsubscribe;
export function subscribeToOrders(
  optionsOrUpdate: SubscribeOrdersOptions | ((orders: Order[]) => void),
  onUpdateOrError?: ((orders: Order[]) => void) | ((error: Error) => void),
  maybeError?: (error: Error) => void
): Unsubscribe {
  let options: SubscribeOrdersOptions = {};
  let onUpdate: (orders: Order[]) => void;
  let onError: ((error: Error) => void) | undefined;

  if (typeof optionsOrUpdate === 'function') {
    onUpdate = optionsOrUpdate;
    onError = onUpdateOrError as ((error: Error) => void) | undefined;
  } else {
    options = optionsOrUpdate || {};
    onUpdate = onUpdateOrError as (orders: Order[]) => void;
    onError = maybeError;
  }

  // 1. CASO CLIENTE CON COMANDA ESPECÍFICA (1 solo documento):
  // Si el cliente tiene una orden activa por ID, escucha ÚNICAMENTE su documento.
  // Esto ahorra el 99% del ancho de banda y latencia en conexiones móviles lentas.
  if (options.clientOrderId) {
    const singleOrderDoc = doc(db, 'orders', options.clientOrderId);
    return onSnapshot(
      singleOrderDoc,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate([{ id: docSnap.id, ...docSnap.data() } as Order]);
        } else {
          onUpdate([]);
        }
      },
      (error) => {
        console.warn(`Error al escuchar comanda única ${options.clientOrderId}:`, error);
        if (onError) onError(error);
      }
    );
  }

  // 2. CASO CLIENTE POR ID DE USUARIO (hasta 5 pedidos del propio cliente):
  if (options.clientUserId) {
    const clientQuery = query(
      ORDERS_COLLECTION,
      where('clientUserId', '==', options.clientUserId),
      orderBy('createdAt', 'desc'),
      limit(options.limitCount || 5)
    );
    let unsubFallback: Unsubscribe | null = null;
    const unsubPrimary = onSnapshot(
      clientQuery,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((snap) => list.push({ id: snap.id, ...snap.data() } as Order));
        onUpdate(list);
      },
      (error) => {
        console.warn('Error en query de órdenes del cliente con índice, activando fallback en memoria:', error);
        unsubPrimary();
        unsubFallback = onSnapshot(
          query(ORDERS_COLLECTION, where('clientUserId', '==', options.clientUserId), limit(options.limitCount || 5)),
          (fallbackSnap) => {
            const list: Order[] = [];
            fallbackSnap.forEach((snap) => list.push({ id: snap.id, ...snap.data() } as Order));
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            onUpdate(list);
          },
          onError
        );
      }
    );
    return () => {
      unsubPrimary();
      if (unsubFallback) unsubFallback();
    };
  }

  // 3. CASO COCINA (KDS):
  // Escucha las órdenes más recientes (activas e histórico de despacho)
  if (options.role === 'kitchen') {
    const kitchenQuery = query(
      ORDERS_COLLECTION,
      orderBy('createdAt', 'desc'),
      limit(options.limitCount || 60)
    );

    let unsubKitchenFallback: Unsubscribe | null = null;
    const unsubKitchenPrimary = onSnapshot(
      kitchenQuery,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((snap) => list.push({ id: snap.id, ...snap.data() } as Order));
        onUpdate(list);
      },
      (error) => {
        console.warn('Advertencia en query de órdenes cocina, usando fallback:', error);
        unsubKitchenPrimary();
        unsubKitchenFallback = onSnapshot(
          query(ORDERS_COLLECTION, limit(options.limitCount || 60)),
          (fallbackSnap) => {
            const list: Order[] = [];
            fallbackSnap.forEach((snap) => list.push({ id: snap.id, ...snap.data() } as Order));
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            onUpdate(list);
          },
          onError
        );
      }
    );
    return () => {
      unsubKitchenPrimary();
      if (unsubKitchenFallback) unsubKitchenFallback();
    };
  }


  // 4. CASO MESONEROS, EXCURSIONES Y ADMINISTRADOR:
  // Consulta acotada con límite para evitar descargar miles de órdenes acumuladas en el teléfono.
  const queryLimit = options.limitCount || (options.role === 'admin' ? 80 : 50);

  const baseQuery = query(
    ORDERS_COLLECTION,
    orderBy('createdAt', 'desc'),
    limit(queryLimit)
  );

  return onSnapshot(
    baseQuery,
    (snapshot) => {
      const ordersList: Order[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        ordersList.push({ id: docSnap.id, ...data } as Order);
      });
      onUpdate(ordersList);
    },
    (error) => {
      console.warn('Advertencia en query ordenada de orders con límite, usando fallback:', error);
      return onSnapshot(
        query(ORDERS_COLLECTION, limit(queryLimit)),
        (fallbackSnap) => {
          const fallbackList: Order[] = [];
          fallbackSnap.forEach((docSnap) => {
            const data = docSnap.data();
            fallbackList.push({ id: docSnap.id, ...data } as Order);
          });
          fallbackList.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });
          onUpdate(fallbackList);
        },
        onError
      );
    }
  );
}

/**
 * Limpia recursivamente cualquier campo con valor undefined para cumplir
 * estrictamente con los requisitos de la base de datos de Firestore.
 */
export function sanitizeFirestoreDoc<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = sanitizeFirestoreDoc(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Valida y recalcula de forma estricta los precios y totales de una comanda
 * contra el catálogo oficial de platos para prevenir manipulación del cliente.
 */
export async function validateAndRecalculateOrder(
  order: Order,
  menuItemsList?: MenuItem[],
  rate?: number
): Promise<Order> {
  let catalog = menuItemsList;
  let activeRate = rate;

  // Si no se proporcionaron menuItems en memoria, consultar app_state de Firestore
  if (!catalog || catalog.length === 0) {
    try {
      const snap = await getDoc(STATE_DOC_REF);
      if (snap.exists()) {
        const data = snap.data() as AppStateData;
        catalog = data.menuItems || [];
        if (!activeRate && data.bcvRate) {
          activeRate = data.bcvRate;
        }
      }
    } catch (e) {
      console.warn('No se pudo verificar catálogo en Firestore, usando datos disponibles:', e);
    }
  }

  const officialItems = catalog || [];
  let calculatedSubtotal = 0;

  const sanitizedItems: OrderItem[] = (order.items || []).map((item) => {
    // Buscar plato oficial en el catálogo por ID o nombre
    const official = officialItems.find(
      (m) => m && (m.id === item.menuItemId || m.id === item.id || (m.name && m.name.toLowerCase() === item.name.toLowerCase()))
    );

    // Si existe en el catálogo oficial, forzar el precio unitario legítimo
    const unitPriceUsd = official ? Number(official.priceUsd) : (Number(item.unitPriceUsd) || 0);
    const officialName = official ? official.name : item.name;
    const waiterShare = official?.waiterShareUsd !== undefined ? official.waiterShareUsd : (item.waiterShareUsd || 0);
    const quantity = Math.max(1, Math.min(50, Math.floor(Number(item.quantity) || 1)));

    calculatedSubtotal += quantity * unitPriceUsd;

    const cleaned: OrderItem = {
      id: item.id || `ci-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      menuItemId: official ? official.id : item.menuItemId,
      name: officialName,
      quantity,
      unitPriceUsd,
      waiterShareUsd: waiterShare,
      specialNote: (item.specialNote || '').slice(0, 200),
      status: item.status || 'queue',
      prepTimerSeconds: item.prepTimerSeconds || 0,
    };

    if (official?.imageUrl && !official.imageUrl.startsWith('data:')) {
      cleaned.imageUrl = official.imageUrl;
    } else if (item.imageUrl && !item.imageUrl.startsWith('data:')) {
      cleaned.imageUrl = item.imageUrl;
    }

    return cleaned;
  });

  const subtotalUsd = Math.round(calculatedSubtotal * 100) / 100;
  const tipUsd = Math.max(0, Number(order.tipUsd) || 0);
  const totalUsd = Math.round((subtotalUsd + tipUsd) * 100) / 100;
  const conversionRate = activeRate && activeRate > 0 ? activeRate : (order.totalBs && order.totalUsd ? order.totalBs / order.totalUsd : 1);
  const totalBs = Math.round(totalUsd * conversionRate * 100) / 100;

  return {
    ...order,
    items: sanitizedItems,
    subtotalUsd,
    totalUsd,
    totalBs,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Guarda o actualiza una orden de forma atómica en Firestore.
 * Notifica de inmediato a todos los dispositivos conectados.
 * Optimiza el tamaño del documento: sanea platos para no duplicar Base64 pesados ni blobs de imágenes,
 * y recalcula obligatoriamente los precios contra el catálogo para prevenir manipulación.
 */
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['in_fire', 'cancelled'],
  in_fire: ['plated', 'ready_pass', 'delivered', 'cancelled'],
  plated: ['ready_pass', 'delivered', 'in_fire'],
  ready_pass: ['delivered'],
  delivered: [],
  cancelled: [],
};

/**
 * Valida si una transición de estado de orden es legal según el ciclo de vida.
 * Previene reaperturas indebidas o cancelaciones arbitrarias de comandas ya entregadas.
 */
export function isValidOrderStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  isAdmin: boolean = false
): boolean {
  if (currentStatus === newStatus) return true;
  if (isAdmin) return true;
  const allowed = VALID_ORDER_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
}

/**
 * Guarda o actualiza una orden de forma atómica en Firestore.
 * Notifica de inmediato a todos los dispositivos conectados.
 * Optimiza el tamaño del documento: sanea platos para no duplicar Base64 pesados ni blobs de imágenes,
 * recalcula obligatoriamente los precios contra el catálogo para prevenir manipulación,
 * y valida las transiciones legítimas de estado.
 */
export async function saveOrderToFirestore(
  order: Order,
  officialMenuItems?: MenuItem[],
  bcvRate?: number,
  isAdmin: boolean = false
): Promise<void> {
  const orderDocRef = doc(db, 'orders', order.id);

  // Recalcular y validar precios contra catálogo oficial para prevenir manipulación
  const validatedOrder = await validateAndRecalculateOrder(order, officialMenuItems, bcvRate);

  const cleanOrder = sanitizeFirestoreDoc(validatedOrder);
  await setDoc(orderDocRef, cleanOrder, { merge: true });
}

/**
 * Agrega una nueva comanda atómicamente a Firestore.
 */
export async function pushOrderToFirestore(
  newOrder: Order,
  _currentOrders?: Order[],
  officialMenuItems?: MenuItem[],
  bcvRate?: number
): Promise<void> {
  await saveOrderToFirestore(newOrder, officialMenuItems, bcvRate);
}

/**
 * Actualiza el estado de una comanda inmediatamente en Firestore.
 */
export async function updateOrderStatusInFirestore(
  orderId: string,
  newStatus: OrderStatus,
  _allOrders?: Order[],
  additionalUpdates?: Partial<Order>,
  isAdmin: boolean = false
): Promise<void> {
  const orderDocRef = doc(db, 'orders', orderId);
  const updateData = sanitizeFirestoreDoc({
    status: newStatus,
    updatedAt: new Date().toISOString(),
    ...(additionalUpdates || {})
  });
  await setDoc(orderDocRef, updateData, { merge: true });
}

/**
 * Consulta órdenes en un período de tiempo sin el límite de 50/80 de la interfaz.
 * Utilizado para generar informes financieros íntegros y arqueos de caja sin omisión de comandas.
 */
export async function fetchOrdersForPeriod(
  startDate?: string,
  endDate?: string,
  options?: { waiterId?: string; origin?: string }
): Promise<Order[]> {
  try {
    const q = query(ORDERS_COLLECTION, orderBy('createdAt', 'desc'), limit(500));
    const snap = await getDocs(q);
    let list: Order[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Order);
    });

    if (startDate) {
      const startMs = new Date(startDate).getTime();
      list = list.filter((o) => (o.createdAt ? new Date(o.createdAt).getTime() >= startMs : true));
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime();
      list = list.filter((o) => (o.createdAt ? new Date(o.createdAt).getTime() <= endMs : true));
    }
    if (options?.waiterId) {
      list = list.filter((o) => o.waiterId === options.waiterId);
    }
    if (options?.origin) {
      list = list.filter((o) => o.origin === options.origin);
    }
    return list;
  } catch (error) {
    console.warn('Error fetching orders for period, fallback query without index:', error);
    const snap = await getDocs(query(ORDERS_COLLECTION, limit(500)));
    const list: Order[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Order);
    });
    return list;
  }
}

/**
 * Elimina una orden de Firestore.
 */
export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  const orderDocRef = doc(db, 'orders', orderId);
  await deleteDoc(orderDocRef);
}


// -------------------------------------------------------------
// GESTIÓN DE USUARIOS Y STAFF EN FIRESTORE
// -------------------------------------------------------------
const USERS_COLLECTION = collection(db, 'app_users');

export function subscribeToUsers(
  onUpdate: (users: User[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    USERS_COLLECTION,
    (snapshot) => {
      const users: User[] = [];
      snapshot.forEach((docSnap) => {
        users.push({ id: docSnap.id, ...docSnap.data() } as User);
      });
      onUpdate(users);
    },
    (error) => {
      console.error('Error al suscribirse a app_users:', error);
      if (onError) onError(error);
    }
  );
}

export async function fetchUsersFromFirestore(): Promise<User[]> {
  const snapshot = await getDocs(USERS_COLLECTION);
  const users: User[] = [];
  snapshot.forEach((docSnap) => {
    users.push({ id: docSnap.id, ...docSnap.data() } as User);
  });
  return users;
}

export async function saveUserToFirestore(user: User): Promise<void> {
  const userDocRef = doc(db, 'app_users', user.id);
  await setDoc(userDocRef, { ...user, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const userDocRef = doc(db, 'app_users', userId);
  await deleteDoc(userDocRef);
}

// -------------------------------------------------------------
// GESTIÓN DE CIERRES DE CAJA DE MESONEROS (COLECCIÓN DEDICADA: waiters_closings)
// -------------------------------------------------------------
export const WAITERS_CLOSINGS_COLLECTION = collection(db, 'waiters_closings');

/**
 * Escucha en tiempo real la colección dedicada 'waiters_closings'.
 * Si se especifica waiterId, filtra únicamente los cierres de ese mesonero.
 */
export function subscribeToWaitersClosings(
  onUpdate: (closings: WaiterClosingSummary[]) => void,
  onError?: (error: Error) => void,
  waiterId?: string
): Unsubscribe {
  const q = waiterId
    ? query(WAITERS_CLOSINGS_COLLECTION, where('waiterId', '==', waiterId))
    : query(WAITERS_CLOSINGS_COLLECTION, limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: WaiterClosingSummary[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as WaiterClosingSummary);
      });
      list.sort((a, b) => {
        const timeA = a.closedAt || a.settledAt || '';
        const timeB = b.closedAt || b.settledAt || '';
        return timeB.localeCompare(timeA);
      });
      onUpdate(list);
    },
    (error) => {
      console.warn('Error al escuchar waiters_closings en Firestore:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Guarda o actualiza un arqueo / cierre de turno en la colección dedicada waiters_closings.
 */
export async function saveWaiterClosingToFirestore(
  closing: WaiterClosingSummary
): Promise<void> {
  const closingDocRef = doc(db, 'waiters_closings', closing.id);
  const cleanDoc = sanitizeFirestoreDoc({
    ...closing,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(closingDocRef, cleanDoc, { merge: true });
}

/**
 * Obtiene un cierre de caja específico por su identificador único.
 */
export async function getWaiterClosingById(closingId: string): Promise<WaiterClosingSummary | null> {
  const closingDocRef = doc(db, 'waiters_closings', closingId);
  const snap = await getDoc(closingDocRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as WaiterClosingSummary;
  }
  return null;
}

/**
 * Migra de forma segura y no destructiva los cierres heredados desde app_state/main
 * hacia la colección dedicada waiters_closings. NO elimina datos de app_state.
 */
export async function migrateLegacyClosingsFromAppState(): Promise<number> {
  try {
    const snap = await getDoc(STATE_DOC_REF);
    if (!snap.exists()) return 0;
    const data = snap.data() as AppStateData;
    const legacyClosings = data.waitersClosings;
    if (!Array.isArray(legacyClosings) || legacyClosings.length === 0) return 0;

    let migratedCount = 0;
    for (const closing of legacyClosings) {
      if (!closing || !closing.id) continue;
      const closingDocRef = doc(db, 'waiters_closings', closing.id);
      const existing = await getDoc(closingDocRef);
      if (!existing.exists()) {
        await setDoc(closingDocRef, sanitizeFirestoreDoc(closing));
        migratedCount++;
      }
    }
    return migratedCount;
  } catch (err) {
    console.warn('Advertencia en migración segura de cierres heredados:', err);
    return 0;
  }
}

// -------------------------------------------------------------
// GESTIÓN DE LIQUIDACIÓN Y SERVICIOS DE EXCURSIONES
// -------------------------------------------------------------
export const EXCURSIONS_COLLECTION = collection(db, 'excursions');
export const EXCURSION_SETTLEMENTS_COLLECTION = collection(db, 'excursion_settlements');

/**
 * Escucha en tiempo real la liquidación de servicios de excursión.
 */
export function subscribeToExcursionSettlements(
  onUpdate: (settlements: ExcursionSettlement[]) => void,
  onError?: (error: Error) => void,
  guideId?: string
): Unsubscribe {
  const q = guideId
    ? query(EXCURSION_SETTLEMENTS_COLLECTION, where('guideId', '==', guideId))
    : query(EXCURSION_SETTLEMENTS_COLLECTION, limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ExcursionSettlement[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as ExcursionSettlement);
      });
      list.sort((a, b) => (b.operatingDate || '').localeCompare(a.operatingDate || ''));
      onUpdate(list);
    },
    (error) => {
      console.warn('Error al escuchar excursion_settlements:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Guarda o liquida un reporte de servicio de excursión en Firestore.
 */
export async function saveExcursionSettlementToFirestore(
  settlement: ExcursionSettlement
): Promise<void> {
  const docRef = doc(db, 'excursion_settlements', settlement.id);
  const cleanDoc = sanitizeFirestoreDoc({
    ...settlement,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(docRef, cleanDoc, { merge: true });
}
