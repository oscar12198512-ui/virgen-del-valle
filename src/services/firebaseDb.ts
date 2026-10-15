import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
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

/**
 * Escucha cambios en tiempo real en la colección 'orders'.
 * Garantiza que todo pedido creado por un cliente, mesonero o excursión
 * aparezca de inmediato en la pantalla del dueño y cocina sin condiciones de carrera.
 */
export function subscribeToOrders(
  onUpdate: (orders: Order[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    ORDERS_COLLECTION,
    (snapshot) => {
      const ordersList: Order[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        ordersList.push({ id: docSnap.id, ...data } as Order);
      });
      // Ordenar por fecha de creación descendente (más recientes primero)
      ordersList.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      onUpdate(ordersList);
    },
    (error) => {
      console.error('Error al escuchar colección orders en Firestore:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Guarda o actualiza una orden de forma atómica en Firestore.
 * Notifica de inmediato a todos los dispositivos conectados.
 */
export async function saveOrderToFirestore(order: Order): Promise<void> {
  const orderDocRef = doc(db, 'orders', order.id);
  const cleanOrder = {
    ...order,
    updatedAt: new Date().toISOString()
  };
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
  await setDoc(
    orderDocRef,
    {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      ...(additionalUpdates || {})
    },
    { merge: true }
  );
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
