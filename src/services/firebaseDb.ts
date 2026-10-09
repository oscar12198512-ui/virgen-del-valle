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
  RbacRoleDefinition
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

/**
 * Agrega o actualiza una orden directamente en Firestore.
 */
export async function pushOrderToFirestore(newOrder: Order): Promise<void> {
  const snapshot = await getDoc(STATE_DOC_REF);
  let currentOrders: Order[] = [];
  if (snapshot.exists()) {
    const data = snapshot.data() as AppStateData;
    currentOrders = data.orders || [];
  }
  const existingIdx = currentOrders.findIndex((o) => o.id === newOrder.id);
  let updatedOrders: Order[];
  if (existingIdx >= 0) {
    updatedOrders = [...currentOrders];
    updatedOrders[existingIdx] = newOrder;
  } else {
    updatedOrders = [newOrder, ...currentOrders];
  }
  await saveAppState({ orders: updatedOrders });
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
