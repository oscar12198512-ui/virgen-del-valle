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
    return onSnapshot(
      clientQuery,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((snap) => list.push({ id: snap.id, ...snap.data() } as Order));
        onUpdate(list);
      },
      (error) => {
        console.warn('Error en query de órdenes del cliente:', error);
        if (onError) onError(error);
      }
    );
  }

  // 3. CASO COCINA (KDS):
  // Solo escucha pedidos activos en fuego o listos para entrega.
  // No descarga pedidos viejos entregados o cancelados hace días.
  if (options.role === 'kitchen') {
    const kitchenQuery = query(
      ORDERS_COLLECTION,
      where('status', 'in', ['pending', 'in_fire', 'plated', 'ready_pass']),
      orderBy('createdAt', 'desc'),
      limit(options.limitCount || 40)
    );

    return onSnapshot(
      kitchenQuery,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((snap) => list.push({ id: snap.id, ...snap.data() } as Order));
        onUpdate(list);
      },
      (error) => {
        console.warn('Advertencia en query filtrada de cocina, usando fallback limitado:', error);
        const fallback = query(ORDERS_COLLECTION, orderBy('createdAt', 'desc'), limit(40));
        return onSnapshot(
          fallback,
          (snap) => {
            const list: Order[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Order));
            onUpdate(list);
          },
          onError
        );
      }
    );
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
 * Guarda o actualiza una orden de forma atómica en Firestore.
 * Notifica de inmediato a todos los dispositivos conectados.
 * Optimiza el tamaño del documento: sanea platos para no duplicar Base64 pesados ni blobs de imágenes.
 */
export async function saveOrderToFirestore(order: Order): Promise<void> {
  const orderDocRef = doc(db, 'orders', order.id);

  // Sanitización de items para mantener documentos ultra livianos (< 2 KB)
  const sanitizedItems: OrderItem[] = (order.items || []).map((item) => {
    const cleaned: OrderItem = {
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: Number(item.quantity) || 1,
      unitPriceUsd: Number(item.unitPriceUsd) || 0,
      waiterShareUsd: item.waiterShareUsd || 0,
      specialNote: item.specialNote || '',
      status: item.status || 'queue',
      prepTimerSeconds: item.prepTimerSeconds || 0
    };
    // Mantener imageUrl solo si es URL corta relativa o HTTP ligera, nunca base64 pesada
    if (item.imageUrl && !item.imageUrl.startsWith('data:')) {
      cleaned.imageUrl = item.imageUrl;
    }
    return cleaned;
  });

  const cleanOrder = sanitizeFirestoreDoc({
    ...order,
    items: sanitizedItems,
    updatedAt: new Date().toISOString()
  });
  await setDoc(orderDocRef, cleanOrder, { merge: true });
}

/**
 * Agrega una nueva comanda atómicamente a Firestore.
 */
export async function pushOrderToFirestore(newOrder: Order, _currentOrders?: Order[]): Promise<void> {
  await saveOrderToFirestore(newOrder);
}

/**
 * Actualiza el estado de una comanda inmediatamente en Firestore.
 */
export async function updateOrderStatusInFirestore(
  orderId: string,
  newStatus: string,
  _allOrders?: Order[],
  additionalUpdates?: Partial<Order>
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
