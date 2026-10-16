import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BankConfig,
  BillDenominationCount,
  ExcursionPackage,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  ToldoSpot,
  User,
  UserRole,
  WaiterClosingSummary,
  GiveawayState,
  GiveawayParticipant,
} from './types';
import {
  INITIAL_BANK_CONFIG,
  INITIAL_DRAWER_BILLS,
  INITIAL_EXCURSION,
  INITIAL_MENU_ITEMS,
  INITIAL_SPOTS,
  INITIAL_GIVEAWAY_STATE,
} from './data/initialData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AccountPanel } from './components/AccountPanel';
import { PagoMovilModal, PaymentMethodKey } from './components/PagoMovilModal';
import { GiveawayModal } from './components/GiveawayModal';
import { PazYSalvoModal } from './components/PazYSalvoModal';
import { FiscalInvoiceModal } from './components/FiscalInvoiceModal';
import { CurrencyCalculatorModal } from './components/CurrencyCalculatorModal';
import { BeachWeatherModal } from './components/BeachWeatherModal';
import { NotificationCenterDropdown } from './components/NotificationCenterDropdown';
import { GlobalCommandPalette } from './components/GlobalCommandPalette';
import { getOrderDeliveryTiming } from './utils/deliveryTiming';
import { WaitersView } from './views/WaitersView';
import { ExcursionsView } from './views/ExcursionsView';
import { KitchenKdsView } from './views/KitchenKdsView';
import { AdminView } from './views/AdminView';
import { ClientsView } from './views/ClientsView';
import { soundService } from './services/soundService';
import { nativeNotificationService } from './services/nativeNotificationService';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AppInstallModal } from './components/AppInstallModal';
import { ToldoQrGeneratorModal } from './components/ToldoQrGeneratorModal';
import { LoginScreen } from './components/LoginScreen';
import { CheckCircle2, X } from 'lucide-react';
import { isFirebaseConfigured } from './config/firebase';
import {
  subscribeToAppState,
  saveAppState,
  getAppStateOnce,
  pushOrderToFirestore,
  saveOrderToFirestore,
  updateOrderStatusInFirestore,
  subscribeToOrders,
  SubscribeOrdersOptions,
  subscribeToUsers,
  fetchUsersFromFirestore
} from './services/firebaseDb';
import { subscribeToAuthState, logoutFirebase } from './services/firebaseAuth';

const SESSION_KEY = 'virgen_del_valle_session';
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const STAFF_ROLES: UserRole[] = ['admin', 'waiter', 'kitchen', 'excursion'];
const ALL_ROLES: UserRole[] = ['admin', 'waiter', 'kitchen', 'excursion', 'client'];

const Splash: React.FC<{ label?: string }> = ({ label = 'Verificando sesión…' }) => (
  <div className="min-h-screen bg-[#002546] flex flex-col items-center justify-center gap-3 text-white">
    <div className="w-10 h-10 rounded-full border-2 border-white/25 border-t-[#57d1fd] animate-spin" />
    <p className="text-xs font-bold tracking-widest uppercase text-white/70">{label}</p>
  </div>
);

// Funciones de aislamiento de cuenta: Cada usuario ve exclusivamente sus propios pedidos
export const isOrderOwnedByClient = (
  order: Order | null | undefined,
  user: User | null,
  localStoredOrderId?: string | null
): boolean => {
  if (!order) return false;
  const userEmail = (user?.email || '').toLowerCase().trim();
  const userId = user?.id || '';

  // 1. Si la orden tiene un email registrado:
  if (order.customerEmail) {
    const orderEmail = order.customerEmail.toLowerCase().trim();
    // Solo pertenece si el usuario actual está logueado con ese MISMO email
    return !!userEmail && userEmail === orderEmail;
  }

  // 2. Si la orden tiene un customerId o clientUserId registrado:
  if (order.customerId || order.clientUserId) {
    const orderOwnerId = order.customerId || order.clientUserId;
    // Solo pertenece si el usuario actual tiene ese MISMO ID
    return !!userId && userId === orderOwnerId;
  }

  // 3. Si la orden NO tiene ni email ni ID (pedido anónimo / invitado):
  // Solo pertenece si coincide con el ID guardado específicamente en este dispositivo para invitado
  if (localStoredOrderId && order.id === localStoredOrderId) {
    return true;
  }

  return false;
};

export const getClientOrderStorageKey = (user: User | null): string => {
  if (user?.email) {
    return `playa_buche_client_active_order_id_${user.email.toLowerCase().trim()}`;
  }
  if (user?.id) {
    return `playa_buche_client_active_order_id_${user.id}`;
  }
  return 'playa_buche_client_active_order_id_guest';
};

export const getClientOrderDataStorageKey = (user: User | null): string => {
  if (user?.email) {
    return `playa_buche_client_active_order_${user.email.toLowerCase().trim()}`;
  }
  if (user?.id) {
    return `playa_buche_client_active_order_${user.id}`;
  }
  return 'playa_buche_client_active_order_guest';
};

// Aislamiento estricto de comandas para Mesoneros: cada mesonero solo ve sus propias comandas
export const isOrderOwnedByWaiter = (
  order: Order | null | undefined,
  user: User | null,
  spots?: ToldoSpot[]
): boolean => {
  if (!order || !user) return false;
  const userId = user.id || '';
  const userEmail = (user.email || '').toLowerCase().trim();
  const userName = (user.name || '').toLowerCase().trim();

  // 1. Si la orden fue tomada directamente por este mesonero (por ID o email)
  if (order.waiterId) {
    if (userId && order.waiterId === userId) return true;
    if (userEmail && order.waiterId.toLowerCase().trim() === userEmail) return true;
  }

  // 2. Si la orden tiene el nombre exacto de este mesonero
  if (order.waiterName && userName && order.waiterName.toLowerCase().trim() === userName) {
    return true;
  }

  // 3. Si es comanda de cliente (QR) en un toldo asignado a este mesonero
  if (order.origin === 'client_qr' && spots && spots.length > 0) {
    const spot = spots.find((s) => s.id === order.spotId);
    if (spot) {
      if (spot.assignedWaiterId && userId && spot.assignedWaiterId === userId) return true;
      if (spot.assignedWaiterName && userName && spot.assignedWaiterName.toLowerCase().trim() === userName) return true;
    }
  }

  return false;
};

// Aislamiento estricto de paquetes y comandas de Excursión: cada agencia o lancha solo ve la suya
export const isOrderOwnedByExcursion = (
  order: Order | null | undefined,
  user: User | null,
  excursion?: ExcursionPackage | null
): boolean => {
  if (!order) return false;
  if (order.origin !== 'excursion') return false;

  // Si el usuario es administrador / dueño, tiene visibilidad total de todas las comandas de excursión
  if (user?.role === 'admin') return true;
  if (!user) return false;

  const userId = user.id || '';
  const userEmail = (user.email || '').toLowerCase().trim();
  const userBoat = (user.boatName || '').toLowerCase().trim();
  const userName = (user.name || '').toLowerCase().trim();

  // 1. Coincidencia por ID de usuario / cliente
  if (userId && (order.customerId === userId || order.clientUserId === userId)) return true;

  // 2. Coincidencia por email
  if (userEmail && order.customerEmail && order.customerEmail.toLowerCase().trim() === userEmail) return true;

  // 3. Coincidencia por paquete de excursión específico
  if (excursion) {
    if (order.id === excursion.id) return true;
    if (excursion.tourCode && order.displayNumber === excursion.tourCode) return true;
  }

  // 4. Coincidencia por nombre de embarcación o agencia
  if (userBoat && order.spotName && order.spotName.toLowerCase().includes(userBoat)) return true;
  if (userName && order.customerName && order.customerName.toLowerCase().includes(userName)) return true;

  return false;
};

export const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [sessionToken, setSessionToken] = useState<string>(
    () => sessionStorage.getItem(SESSION_KEY) || localStorage.getItem('playa_buche_token') || ''
  );
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('playa_buche_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const currentUserRef = useRef<User | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  const [identityResolved, setIdentityResolved] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('playa_buche_user');
    } catch {
      return false;
    }
  });
  const [isDbHydrated, setIsDbHydrated] = useState(false);
  const dbHydratedRef = useRef(false);
  const lastReceivedStateHashRef = useRef<string>('');

  const [bcvRate, setBcvRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('playa_buche_bcv_rate');
      const parsed = saved ? parseFloat(saved) : NaN;
      return !isNaN(parsed) && parsed > 0 ? parsed : 54.5;
    } catch {
      return 54.5;
    }
  });
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [spots, setSpots] = useState<ToldoSpot[]>(INITIAL_SPOTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [excursion, setExcursion] = useState<ExcursionPackage>(INITIAL_EXCURSION);
  const [bankConfig, setBankConfig] = useState<BankConfig>(INITIAL_BANK_CONFIG);
  const [waitersClosings, setWaitersClosings] = useState<WaiterClosingSummary[]>([]);
  const [drawerBills, setDrawerBills] = useState<BillDenominationCount>(INITIAL_DRAWER_BILLS);
  const [selectedSpotId, setSelectedSpotId] = useState<string>('');
  const [approachingAlertCount, setApproachingAlertCount] = useState<number>(0);
  const [clientActiveOrder, setClientActiveOrder] = useState<Order | null>(() => {
    try {
      const initialUser = (() => {
        try {
          const s = localStorage.getItem('playa_buche_user');
          return s ? JSON.parse(s) : null;
        } catch {
          return null;
        }
      })();
      const key = getClientOrderDataStorageKey(initialUser);
      const saved = localStorage.getItem(key);
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && isOrderOwnedByClient(parsed, initialUser, parsed.id)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [giveaway, setGiveaway] = useState<GiveawayState>(() => {
    try {
      const saved = localStorage.getItem('playa_buche_giveaway');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.participants)) return parsed;
      }
    } catch {}
    return INITIAL_GIVEAWAY_STATE;
  });
  const [isGiveawayModalOpen, setIsGiveawayModalOpen] = useState(false);

  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [activePagoMovilOrder, setActivePagoMovilOrder] = useState<Order | null>(null);
  const [activePazYSalvoClosing, setActivePazYSalvoClosing] = useState<WaiterClosingSummary | null>(null);
  const [isFiscalInvoiceOpen, setIsFiscalInvoiceOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorInitialTotal, setCalculatorInitialTotal] = useState<number>(0);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isToldoQrModalOpen, setIsToldoQrModalOpen] = useState(false);
  const [realtimeToast, setRealtimeToast] = useState<{
    id: string;
    title: string;
    message: string;
    targetRole: UserRole;
    spotName: string;
    displayNumber: string;
  } | null>(null);
  const [viewRole, setViewRole] = useState<UserRole | null>(null);
  const prevOrdersRef = useRef<Order[]>([]);
  const ordersHydratedRef = useRef<boolean>(false);

  const directLoginRequested = new URLSearchParams(window.location.search).get('login') === '1';

  const authHeaders = useCallback(
    () => (sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    [sessionToken]
  );

  const signedInRole: UserRole | null = currentUser?.role ?? null;
  const effectiveRole: UserRole = signedInRole ?? 'client';
  // El dueño puede inspeccionar cualquier módulo; el resto solo el suyo.
  const availableRoles = useMemo(
    () => (signedInRole === 'admin' ? ALL_ROLES : signedInRole ? [signedInRole] : []),
    [signedInRole]
  );
  const currentRole: UserRole = availableRoles.includes(viewRole ?? effectiveRole) ? (viewRole ?? effectiveRole) : effectiveRole;
  const isClient = effectiveRole === 'client';

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    try {
      localStorage.removeItem('playa_buche_user');
      localStorage.removeItem('playa_buche_token');
    } catch {}
    setSessionToken('');
    setCurrentUser(null);
    setIdentityResolved(true);
    setIsDbHydrated(false);
    dbHydratedRef.current = false;
    setViewRole(null);
    setOrders([]);
    setClientActiveOrder(null);
  }, []);

  // Identidad: Firebase Auth en tiempo real o resolución contra la API REST
  useEffect(() => {
    if (isFirebaseConfigured()) {
      const unsubscribe = subscribeToAuthState((user) => {
        if (user) {
          setCurrentUser(user);
          try {
            localStorage.setItem('playa_buche_user', JSON.stringify(user));
          } catch {}
        }
        setIdentityResolved(true);
      });
      return () => unsubscribe();
    }

    if (!API_BASE) {
      setIdentityResolved(true);
      return;
    }
    if (!sessionToken) {
      setCurrentUser(null);
      setIdentityResolved(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(API_BASE + '/api/me', { headers: authHeaders() });
        if (response.status === 401) {
          clearSession();
          return;
        }
        if (!response.ok) throw new Error('identity request failed');
        const data = await response.json();
        if (cancelled || !data.user) return;
        setCurrentUser(data.user);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIdentityResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, sessionToken, authHeaders, clearSession]);

  // Solicitud y activación de permisos de notificación (Android 13+ y Web PWA)
  useEffect(() => {
    nativeNotificationService.init().catch((error) => {
      console.warn('Permisos de notificaciones no activados:', error);
    });
  }, []);

  // Sincronización de datos (Firebase Firestore Real-Time / Fallback REST API)
  useEffect(() => {
    if (isFirebaseConfigured()) {
      // Suscripción en tiempo real con Firestore para colección orders con filtros por rol (Evita saturación de red en Venezuela)
      const userNow = currentUser;
      const roleNow = effectiveRole;
      const clientTargetOrderId = clientActiveOrder?.id || (() => {
        try {
          return localStorage.getItem(getClientOrderStorageKey(userNow)) || undefined;
        } catch {
          return undefined;
        }
      })();

      const subOptions: SubscribeOrdersOptions = {
        role: roleNow,
        waiterId: roleNow === 'waiter' ? userNow?.id : undefined,
        clientOrderId: roleNow === 'client' ? clientTargetOrderId : undefined,
        clientUserId: roleNow === 'client' && userNow?.id ? userNow.id : undefined,
        limitCount: roleNow === 'admin' ? 80 : (roleNow === 'waiter' ? 60 : 40)
      };

      const unsubOrders = subscribeToOrders(
        subOptions,
        (firestoreOrders) => {
          if (Array.isArray(firestoreOrders)) {
            setOrders(firestoreOrders);
            const userCurrent = currentUserRef.current;
            setClientActiveOrder((prev) => {
              const idKey = getClientOrderStorageKey(userCurrent);
              const dataKey = getClientOrderDataStorageKey(userCurrent);
              const targetId = prev?.id || localStorage.getItem(idKey);
              if (targetId) {
                const match = firestoreOrders.find((o) => o.id === targetId && isOrderOwnedByClient(o, userCurrent, targetId));
                if (match) {
                  try {
                    localStorage.setItem(dataKey, JSON.stringify(match));
                  } catch {}
                  return match;
                }
              }
              // Si el usuario actual tiene una orden abierta pero prev no la tenía
              if (userCurrent?.email || userCurrent?.id) {
                const ownedOpenOrder = firestoreOrders.find(
                  (o) => isOrderOwnedByClient(o, userCurrent, null) && o.paymentStatus !== 'verified' && !o.isSettled && o.status !== 'cancelled'
                );
                if (ownedOpenOrder) {
                  try {
                    localStorage.setItem(dataKey, JSON.stringify(ownedOpenOrder));
                  } catch {}
                  return ownedOpenOrder;
                }
              }
              // Si la comanda previa ya no pertenece a este usuario, descartarla
              if (prev && !isOrderOwnedByClient(prev, userCurrent, targetId)) {
                return null;
              }
              return prev;
            });
          }
        },
        (error) => {
          console.warn('Error al sincronizar colección orders:', error);
        }
      );

      // Suscripción en tiempo real con Firestore para estado operativo (menú, mesas, tasas)
      const unsubState = subscribeToAppState(
        (state) => {
          // Registrar hash entrante para evitar bucles ping-pong de re-escritura
          const incomingHash = JSON.stringify({
            menuItems: state.menuItems?.length || 0,
            spots: state.spots?.length || 0,
            bcvRate: state.bcvRate || 0,
            excursion: state.excursion?.id || '',
            bankConfig: state.bankConfig?.pagoMovilPhone || '',
            giveaway: state.giveaway ? `${state.giveaway.id}_${state.giveaway.isActive}_${state.giveaway.participants?.length || 0}` : ''
          });
          lastReceivedStateHashRef.current = incomingHash;

          if (Array.isArray(state.menuItems) && state.menuItems.length) setMenuItems(state.menuItems);
          if (Array.isArray(state.spots) && state.spots.length) setSpots(state.spots);
          if (state.excursion && state.excursion.id) setExcursion(state.excursion);
          if (state.bankConfig) setBankConfig(state.bankConfig);
          if (Array.isArray(state.waitersClosings)) setWaitersClosings(state.waitersClosings);
          if (state.drawerBills) setDrawerBills(state.drawerBills);
          if (state.giveaway) {
            setGiveaway(state.giveaway);
            try {
              localStorage.setItem('playa_buche_giveaway', JSON.stringify(state.giveaway));
            } catch {}
          }
          if (typeof state.bcvRate === 'number' && !isNaN(state.bcvRate) && state.bcvRate > 0) {
            setBcvRate(state.bcvRate);
            try {
              localStorage.setItem('playa_buche_bcv_rate', String(state.bcvRate));
            } catch {}
          }

          setIsDbHydrated(true);
          dbHydratedRef.current = true;
        },
        (error) => {
          console.warn('Error al sincronizar Firestore en tiempo real:', error);
        }
      );

      // Suscripción a usuarios de Firestore solo si tiene rol administrativo/staff
      let unsubUsers = () => {};
      if (signedInRole && STAFF_ROLES.includes(signedInRole)) {
        unsubUsers = subscribeToUsers((firestoreUsers) => {
          if (Array.isArray(firestoreUsers)) setUsers(firestoreUsers);
        });
      }

      return () => {
        unsubOrders();
        unsubState();
        unsubUsers();
      };
    }

    // Fallback público para API REST
    if (!API_BASE || sessionToken) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(API_BASE + '/api/state');
        if (!response.ok) throw new Error('public state fetch failed');
        const data = await response.json();
        if (cancelled || !data.state) return;
        if (Array.isArray(data.state.menuItems)) setMenuItems(data.state.menuItems);
        if (Array.isArray(data.state.spots)) setSpots(data.state.spots);
        if (data.state.excursion && data.state.excursion.id) setExcursion(data.state.excursion);
        if (data.state.giveaway) setGiveaway(data.state.giveaway);
        if (typeof data.state.bcvRate === 'number' && !isNaN(data.state.bcvRate) && data.state.bcvRate > 0) {
          setBcvRate(data.state.bcvRate);
          try {
            localStorage.setItem('playa_buche_bcv_rate', String(data.state.bcvRate));
          } catch {}
        }
      } catch (error) {
        console.warn('Catálogo público no disponible; se usan los valores locales.', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, sessionToken, signedInRole, effectiveRole, currentUser?.id, clientActiveOrder?.id]);

  // Estado operativo autenticado para API REST (cuando no se usa Firebase)
  useEffect(() => {
    if (isFirebaseConfigured() || !API_BASE || !sessionToken || !signedInRole) {
      if (!isFirebaseConfigured()) {
        setIsDbHydrated(false);
        dbHydratedRef.current = false;
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(API_BASE + '/api/state', { headers: authHeaders() });
        if (response.status === 401) {
          clearSession();
          return;
        }
        if (!response.ok) throw new Error('authenticated state fetch failed');
        const data = await response.json();
        if (cancelled) return;
        if (Array.isArray(data.users)) setUsers(data.users);
        if (data.state) {
          if (Array.isArray(data.state.menuItems)) setMenuItems(data.state.menuItems);
          if (Array.isArray(data.state.spots)) setSpots(data.state.spots);
          if (Array.isArray(data.state.orders)) setOrders(data.state.orders);
          if (data.state.excursion && data.state.excursion.id) setExcursion(data.state.excursion);
          if (data.state.bankConfig) setBankConfig(data.state.bankConfig);
          if (Array.isArray(data.state.waitersClosings)) setWaitersClosings(data.state.waitersClosings);
          if (data.state.drawerBills) setDrawerBills(data.state.drawerBills);
          if (data.state.giveaway) setGiveaway(data.state.giveaway);
          if (typeof data.state.bcvRate === 'number') setBcvRate(data.state.bcvRate);
        }
        setIsDbHydrated(true);
        dbHydratedRef.current = true;
      } catch (error) {
        if (!cancelled) {
          setIsDbHydrated(false);
          dbHydratedRef.current = false;
          console.warn('Estado de la base de datos no disponible.', error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, sessionToken, signedInRole, authHeaders, clearSession]);

  // Persistencia de cambios de estado operativo global (Firestore)
  // SEGURIDAD CRÍTICA: Restringido estrictamente a administradores (Dueño / Admin).
  // Previene que comensales, mesoneros o cocina sobreescriban precios, cuentas de pago o tasas.
  useEffect(() => {
    if (!isDbHydrated || signedInRole !== 'admin') return;
    const currentHash = JSON.stringify({
      menuItems: menuItems.length,
      spots: spots.length,
      bcvRate,
      excursion: excursion.id,
      bankConfig: bankConfig.pagoMovilPhone,
      giveaway: giveaway?.status || ''
    });

    // Si el estado local es idéntico al recién recibido de Firestore, no re-escribir
    if (currentHash === lastReceivedStateHashRef.current) return;

    const payload = { menuItems, spots, excursion, bankConfig, waitersClosings, drawerBills, bcvRate, giveaway };
    
    if (isFirebaseConfigured()) {
      const timer = window.setTimeout(async () => {
        try {
          lastReceivedStateHashRef.current = currentHash;
          await saveAppState(payload);
        } catch (error) {
          console.warn('No se pudo guardar el estado en Firestore.', error);
        }
      }, 800);
      return () => window.clearTimeout(timer);
    }
  }, [
    isDbHydrated, signedInRole, menuItems, spots,
    excursion, bankConfig, waitersClosings, drawerBills, bcvRate, giveaway
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen((previous) => !previous);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Alertas sonoras, hápticas y notificaciones dirigidas al ingresar órdenes o pasar a ready_pass
  useEffect(() => {
    if (!ordersHydratedRef.current) {
      ordersHydratedRef.current = true;
      prevOrdersRef.current = orders;
      return;
    }

    const prevIds = new Set(prevOrdersRef.current.map((o) => o.id));
    const newOrders = orders.filter((o) => !prevIds.has(o.id));
    if (newOrders.length > 0) {
      if (currentRole === 'admin' || currentRole === 'kitchen' || currentRole === 'waiter') {
        soundService.playNewIncomingOrderAlert();
        soundService.buzzSmartBand();
        newOrders.forEach((newOrd) => {
          const title = `🔔 ¡Nueva Comanda ${newOrd.displayNumber}!`;
          const message = `Llegó comanda en ${newOrd.spotName} • Total: $${newOrd.totalUsd.toFixed(2)}`;
          setRealtimeToast({
            id: 'toast-new-' + newOrd.id + '-' + Date.now(),
            title,
            message,
            targetRole: currentRole,
            spotName: newOrd.spotName,
            displayNumber: newOrd.displayNumber,
          });
          nativeNotificationService.sendNotification(title, message);
        });
      }
    }

    orders.forEach((ord) => {
      const prev = prevOrdersRef.current.find((p) => p.id === ord.id);
      if (prev && prev.status !== 'ready_pass' && ord.status === 'ready_pass') {
        const targetRole: UserRole =
          ord.origin === 'client_qr'
            ? 'client'
            : ord.origin === 'excursion'
            ? 'excursion'
            : 'waiter';

        const isClientOwner =
          currentRole === 'client' &&
          isOrderOwnedByClient(ord, currentUser, clientActiveOrder?.id);

        const isWaiterOwner =
          currentRole === 'waiter' &&
          isOrderOwnedByWaiter(ord, currentUser, spots);

        const isExcursionOwner =
          currentRole === 'excursion' &&
          isOrderOwnedByExcursion(ord, currentUser, excursion);

        const isStaff =
          currentRole === 'admin' ||
          currentRole === 'kitchen';

        if (isClientOwner || isWaiterOwner || isExcursionOwner || isStaff) {
          soundService.playReadyPassAlert();
          soundService.buzzSmartBand();

          const title =
            ord.origin === 'client_qr'
              ? '🎉 ¡Tu Pedido está LISTO!'
              : ord.origin === 'excursion'
              ? '⚓ ¡Excursión LISTA en Cocina!'
              : '🍽️ ¡Comanda LISTA para Retirar!';

          const message =
            ord.origin === 'client_qr'
              ? `Tu comanda ${ord.displayNumber} en ${ord.spotName} está lista en cocina para servir en tu toldo.`
              : ord.origin === 'excursion'
              ? `Comanda marítima ${ord.displayNumber} (${ord.spotName}) lista para despacho a lancha.`
              : `Mesonero ${ord.waiterName || ''}: Retirar comanda ${ord.displayNumber} para ${ord.spotName}.`;

          setRealtimeToast({
            id: 'toast-' + ord.id + '-' + Date.now(),
            title,
            message,
            targetRole,
            spotName: ord.spotName,
            displayNumber: ord.displayNumber,
          });

          nativeNotificationService.sendNotification(title, message);
        }
      }

      if (prev && prev.status !== 'delivered' && ord.status === 'delivered') {
        const isClientOwner =
          currentRole === 'client' &&
          isOrderOwnedByClient(ord, currentUser, clientActiveOrder?.id);

        const isWaiterOwner =
          currentRole === 'waiter' &&
          isOrderOwnedByWaiter(ord, currentUser, spots);

        const isStaff =
          currentRole === 'admin' || currentRole === 'kitchen';

        if (isClientOwner || isWaiterOwner || isStaff) {
          soundService.playSuccess();
          soundService.buzzSmartBand();

          const title = isClientOwner ? '✨ ¡Comanda Servida en tu Toldo!' : `✅ ¡Comanda ${ord.displayNumber} Entregada!`;
          const message = isClientOwner
            ? `¡Buen provecho! Tu pedido ${ord.displayNumber} ha sido servido en ${ord.spotName}.`
            : `Mesonero entregó la comanda ${ord.displayNumber} para ${ord.spotName}.`;

          setRealtimeToast({
            id: 'toast-deliv-' + ord.id + '-' + Date.now(),
            title,
            message,
            targetRole: currentRole,
            spotName: ord.spotName,
            displayNumber: ord.displayNumber,
          });

          nativeNotificationService.sendNotification(title, message);
        }
      }
    });

    prevOrdersRef.current = orders;
  }, [orders, currentRole, clientActiveOrder, currentUser]);

  // Sincronizar comanda activa del comensal estrictamente por cuenta de usuario (email / id)
  useEffect(() => {
    const idKey = getClientOrderStorageKey(currentUser);
    const dataKey = getClientOrderDataStorageKey(currentUser);
    const storedId = localStorage.getItem(idKey);

    setClientActiveOrder((prev) => {
      // 1. Si hay un pedido previo pero no le pertenece al usuario actual, descartarlo
      if (prev && !isOrderOwnedByClient(prev, currentUser, storedId)) {
        return null;
      }

      // 2. Si hay un ID guardado en este dispositivo para este usuario, buscarlo
      if (storedId) {
        const match = orders.find((o) => o.id === storedId && isOrderOwnedByClient(o, currentUser, storedId));
        if (match) {
          try {
            localStorage.setItem(dataKey, JSON.stringify(match));
          } catch {}
          return match;
        }
      }

      // 3. Si el usuario tiene email o ID registrado, buscar su orden activa en orders
      if (currentUser?.email || currentUser?.id) {
        const ownedOrder = orders.find(
          (o) => isOrderOwnedByClient(o, currentUser, null) && o.paymentStatus !== 'verified' && !o.isSettled && o.status !== 'cancelled'
        );
        if (ownedOrder) {
          try {
            localStorage.setItem(dataKey, JSON.stringify(ownedOrder));
          } catch {}
          return ownedOrder;
        }
      }

      // 4. Si el previo sigue siendo válido para este usuario, mantenerlo
      if (prev && isOrderOwnedByClient(prev, currentUser, storedId)) {
        return prev;
      }

      return null;
    });
  }, [currentUser, orders]);

  const handleAuthenticated = (user: User) => {
    const token = (user as User & { sessionToken?: string }).sessionToken || `token-${user.id}-${Date.now()}`;
    sessionStorage.setItem(SESSION_KEY, token);
    try {
      localStorage.setItem('playa_buche_user', JSON.stringify(user));
      localStorage.setItem('playa_buche_token', token);
    } catch {}
    setSessionToken(token);
    setCurrentUser(user);
    setIdentityResolved(true);
    setIsDbHydrated(true);
    dbHydratedRef.current = true;
    if (window.location.search && !window.location.search.includes('spot')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  // Manejo de parámetros de URL para comensales QR (?spot=14, ?spotId=spot-14, ?role=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const paramSpot = params.get('spot');
      const paramSpotId = params.get('spotId');
      const paramRole = params.get('role');

      if (paramSpotId) {
        setSelectedSpotId(paramSpotId);
      } else if (paramSpot && spots.length > 0) {
        const found = spots.find(
          (s) => s.id === paramSpot || s.number === paramSpot || s.name.toLowerCase().includes(paramSpot.toLowerCase())
        );
        if (found) setSelectedSpotId(found.id);
      }

      if ((paramSpot || paramSpotId) && !currentUser && !sessionToken) {
        const spotNum = paramSpot || paramSpotId?.replace('spot-', '') || '14';
        const guestComensal: User = {
          id: `usr-client-spot-${spotNum}`,
          name: `Comensal Toldo #${spotNum}`,
          email: `toldo${spotNum}@playabuche.com`,
          role: 'client',
          status: 'active',
          sessionToken: `token-guest-${Date.now()}`
        };
        handleAuthenticated(guestComensal);
        setViewRole('client');
      } else if (paramRole && ALL_ROLES.includes(paramRole as UserRole)) {
        if (!currentUser && !sessionToken) {
          const testUser: User = {
            id: `usr-${paramRole}-demo`,
            name: paramRole === 'admin' ? 'Dueño Playa Buche' : paramRole === 'kitchen' ? 'Cocina KDS' : 'Mesonero Playa',
            email: `${paramRole}@playabuche.com`,
            role: paramRole as UserRole,
            status: 'active',
            sessionToken: `token-${paramRole}-demo`
          };
          handleAuthenticated(testUser);
        }
        setViewRole(paramRole as UserRole);
      }
    } catch (e) {
      console.warn('Error procesando parámetros de URL:', e);
    }
  }, [spots, currentUser, sessionToken]);

  const handleLogout = async () => {
    const token = sessionToken;
    setIsAccountPanelOpen(false);
    try {
      if (isFirebaseConfigured()) {
        await logoutFirebase();
      } else if (API_BASE && token) {
        await fetch(API_BASE + '/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      }
    } catch {
      // El cierre de sesión local se completa aunque la red falle.
    } finally {
      clearSession();
    }
  };

  // Un rol nunca puede abrir un módulo ajeno, aunque se manipule la interfaz.
  const handleSelectRole = (role: UserRole) => {
    if (!availableRoles.includes(role)) return;
    setViewRole(role === effectiveRole ? null : role);
  };

  const handleOpenCalculator = (initialTotal?: number) => {
    setCalculatorInitialTotal(initialTotal || 0);
    setIsCalculatorOpen(true);
  };

  const now = new Date();
  const isKitchenOrAdmin = currentRole === 'admin' || currentRole === 'kitchen';
  const alertOrdersCount = orders.filter((order) => {
    if (isKitchenOrAdmin) {
      if (order.status === 'delivered' || order.status === 'cancelled') return false;
      if (order.status === 'ready_pass') return true;
      const timing = getOrderDeliveryTiming(order, now);
      return timing.minutesRemaining <= 30 && timing.minutesRemaining > 0;
    }
    // Clientes solo reciben notificación si su orden propia está lista
    if (currentRole === 'client') {
      return order.status === 'ready_pass' && isOrderOwnedByClient(order, currentUser, clientActiveOrder?.id);
    }
    // Mesoneros solo reciben notificación si la comanda está lista en cocina
    if (currentRole === 'waiter') {
      return order.status === 'ready_pass' && isOrderOwnedByWaiter(order, currentUser, spots);
    }
    // Excursiones solo reciben notificación si su orden marítima está lista
    if (currentRole === 'excursion') {
      return order.status === 'ready_pass' && isOrderOwnedByExcursion(order, currentUser, excursion);
    }
    return false;
  }).length;
  const totalNotificationCount = alertOrdersCount + (isKitchenOrAdmin ? approachingAlertCount : 0);

  const handleSendOrderToKitchen = async (newOrder: Order) => {
    soundService.playNewIncomingOrderAlert();
    if (isFirebaseConfigured()) {
      try {
        await saveOrderToFirestore(newOrder);
        setOrders((previous) => [newOrder, ...previous]);
      } catch (error: any) {
        console.error('Error al enviar comanda a Firestore:', error);
        alert('Error al enviar comanda a Firebase: ' + (error?.message || error));
        throw error;
      }
    } else {
      setOrders((previous) => [newOrder, ...previous]);
    }
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    if (newStatus === 'ready_pass') {
      soundService.playReadyPassAlert();
    } else if (newStatus === 'in_fire') {
      soundService.playFireAlert();
    } else if (newStatus === 'delivered') {
      soundService.playSuccess();
    }
    const updatedAt = new Date().toISOString();
    let updatedOrderObj: Order | undefined;
    const nextOrders = orders.map((order) => {
      if (order.id !== orderId) return order;
      const updates: Partial<Order> = { status: newStatus, updatedAt };
      if ((newStatus === 'ready_pass' || newStatus === 'delivered') && !order.readyAt) {
        const createdMs = order.createdAt ? new Date(order.createdAt).getTime() : 0;
        const elapsedMs = createdMs ? Date.now() - createdMs : 0;
        updates.readyAt = updatedAt;
        updates.prepDurationMinutes =
          elapsedMs > 0 && elapsedMs < 12 * 60 * 60 * 1000
            ? Math.max(1, Math.round(elapsedMs / 60000))
            : order.elapsedSeconds
              ? Math.max(1, Math.round(order.elapsedSeconds / 60))
              : 1;
      }
      updatedOrderObj = { ...order, ...updates };
      return updatedOrderObj;
    });
    setOrders(nextOrders);

    setClientActiveOrder((prev) => {
      if (prev?.id === orderId) {
        const updated = nextOrders.find((o) => o.id === orderId) || prev;
        try {
          const dataKey = getClientOrderDataStorageKey(currentUser);
          localStorage.setItem(dataKey, JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return prev;
    });

    if (isFirebaseConfigured() && updatedOrderObj) {
      saveOrderToFirestore(updatedOrderObj).catch((error) => {
        console.warn('Error al actualizar estado en Firestore:', error);
      });
    }
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    const nextOrders = orders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order));
    setOrders(nextOrders);
    if (clientActiveOrder?.id === updatedOrder.id) {
      setClientActiveOrder(updatedOrder);
      try {
        const dataKey = getClientOrderDataStorageKey(currentUser);
        localStorage.setItem(dataKey, JSON.stringify(updatedOrder));
      } catch {}
    }
    if (isFirebaseConfigured()) {
      saveOrderToFirestore(updatedOrder).catch((error) => {
        console.warn('Error al actualizar orden en Firestore:', error);
      });
    }
  };

  const handleUpdateBcvRate = useCallback((newRate: number) => {
    const validRate = Number(newRate);
    if (isNaN(validRate) || validRate <= 0) return;
    setBcvRate(validRate);
    try {
      localStorage.setItem('playa_buche_bcv_rate', String(validRate));
    } catch {}
    if (isFirebaseConfigured() && currentUser?.role === 'admin') {
      saveAppState({ bcvRate: validRate }).catch((error) => {
        console.warn('Error al guardar tasa en Firestore:', error);
      });
    }
  }, [currentUser]);

  const handleClientPlaceOrder = async (
    items: OrderItem[],
    spot: ToldoSpot,
    requestedTime?: string,
    orderNote?: string
  ) => {
    // Recalcular y validar estrictamente contra el catálogo oficial en memoria
    let calculatedSubtotal = 0;
    const validatedItems: OrderItem[] = items.map((item) => {
      const official = menuItems.find((m) => m.id === item.menuItemId || m.id === item.id);
      const unitPriceUsd = official ? Number(official.priceUsd) : (Number(item.unitPriceUsd) || 0);
      const qty = Math.max(1, Math.min(50, Math.floor(Number(item.quantity) || 1)));
      calculatedSubtotal += qty * unitPriceUsd;

      return {
        ...item,
        id: item.id || `ci-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        menuItemId: official ? official.id : item.menuItemId,
        name: official ? official.name : item.name,
        quantity: qty,
        unitPriceUsd,
        waiterShareUsd: official?.waiterShareUsd || 0,
        specialNote: (item.specialNote || '').slice(0, 200),
      };
    });

    const subtotal = Math.round(calculatedSubtotal * 100) / 100;
    const nowIso = new Date().toISOString();
    const customerEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : undefined;
    const customerId = currentUser?.id || `client-${Date.now()}`;

    const newOrder: Order = {
      id: `ord-client-${Date.now()}`,
      displayNumber: `#${Math.floor(200 + Math.random() * 800)}`,
      origin: 'client_qr',
      spotId: spot.id,
      spotName: `${spot.name} • ${spot.typeDesc}`,
      customerName: currentUser?.name || 'Cliente',
      customerId,
      customerEmail,
      clientUserId: currentUser?.id,
      items: validatedItems,
      subtotalUsd: subtotal,
      tipPercent: 0,
      tipUsd: 0,
      totalUsd: subtotal,
      totalBs: Math.round(subtotal * bcvRate * 100) / 100,
      status: 'in_fire',
      paymentStatus: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
      estimatedDeliveryTime: requestedTime || 'Ahora',
      orderNote: orderNote?.trim() || undefined,
      kitchenStep: 2,
    };

    if (isFirebaseConfigured()) {
      try {
        await saveOrderToFirestore(newOrder, menuItems, bcvRate);
        setOrders((previous) => [newOrder, ...previous]);
        setClientActiveOrder(newOrder);
        try {
          const idKey = getClientOrderStorageKey(currentUser);
          const dataKey = getClientOrderDataStorageKey(currentUser);
          localStorage.setItem(idKey, newOrder.id);
          localStorage.setItem(dataKey, JSON.stringify(newOrder));
        } catch {}
        soundService.playBell();
        return;
      } catch (error: any) {
        console.error('Error al registrar pedido en Firebase:', error);
        alert('Error al enviar la comanda a Firebase: ' + (error?.message || error));
        throw error;
      }
    }

    // Fallback REST API
    try {
      const response = await fetch(API_BASE + '/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ order: newOrder }),
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.orders) && data.orders.length) {
          setOrders(data.orders);
        } else {
          setOrders((previous) => [newOrder, ...previous]);
        }
      } else {
        setOrders((previous) => [newOrder, ...previous]);
      }
      setClientActiveOrder(newOrder);
      try {
        const idKey = getClientOrderStorageKey(currentUser);
        const dataKey = getClientOrderDataStorageKey(currentUser);
        localStorage.setItem(idKey, newOrder.id);
        localStorage.setItem(dataKey, JSON.stringify(newOrder));
      } catch {}
      soundService.playBell();
    } catch (error) {
      console.warn('No se pudo registrar el pedido en el servidor.', error);
      setOrders((previous) => [newOrder, ...previous]);
      setClientActiveOrder(newOrder);
      soundService.playBell();
    }
  };

  const handlePaymentSuccess = (
    orderId: string,
    reference: string,
    method: PaymentMethodKey,
    details?: { receivedAmount?: number; changeAmount?: number }
  ) => {
    let paidOrderObj: Order | undefined;
    const applyPayment = (order: Order): Order => {
      if (order.id !== orderId) return order;
      paidOrderObj = {
        ...order,
        paymentStatus: 'verified' as const,
        paymentMethod: method,
        paymentReference: reference,
        isSettled: true,
      };
      return paidOrderObj;
    };

    setOrders((previous) => {
      const nextOrders = previous.map(applyPayment);
      if (paidOrderObj && isFirebaseConfigured()) {
        saveOrderToFirestore(paidOrderObj).catch((error) => {
          console.warn('Error al sincronizar orden cobrada en Firestore:', error);
        });
      }
      return nextOrders;
    });

    setClientActiveOrder((previous) => (previous ? applyPayment(previous) : previous));
    soundService.playCashChime();
  };

  const handleOpenGiveaway = useCallback(() => {
    setIsGiveawayModalOpen(true);
  }, []);

  const handleCloseGiveaway = useCallback(() => {
    setIsGiveawayModalOpen(false);
  }, []);

  const handleUpdateGiveaway = useCallback((nextGiveaway: GiveawayState) => {
    setGiveaway(nextGiveaway);
    try {
      localStorage.setItem('playa_buche_giveaway', JSON.stringify(nextGiveaway));
    } catch {}
    if (isFirebaseConfigured() && currentUser?.role === 'admin') {
      saveAppState({ giveaway: nextGiveaway }).catch((err) => {
        console.warn('Error al guardar sorteo en Firestore:', err);
      });
    }
  }, [currentUser]);

  const handleRegisterGiveawayParticipant = useCallback(
    (info: { fullName: string; email: string; phone?: string; userId?: string }) => {
      let assignedTicket: number | null = null;
      setGiveaway((prev) => {
        const cleanEmail = info.email.trim().toLowerCase();
        const existing = prev.participants.find(
          (p) => (p.email && p.email.toLowerCase() === cleanEmail) || (info.userId && p.userId === info.userId)
        );
        if (existing) {
          assignedTicket = existing.ticketNumber;
          return prev;
        }
        if (prev.participants.length >= prev.maxParticipants) {
          return prev;
        }
        const ticketNumber = prev.participants.length + 1;
        assignedTicket = ticketNumber;
        const newParticipant: GiveawayParticipant = {
          id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ticketNumber,
          userId: info.userId || `usr-${Date.now()}`,
          name: info.fullName.trim(),
          email: cleanEmail,
          phone: info.phone?.trim() || null,
          registeredAt: new Date().toISOString()
        };
        const next = {
          ...prev,
          participants: [...prev.participants, newParticipant]
        };
        try {
          localStorage.setItem('playa_buche_giveaway', JSON.stringify(next));
        } catch {}
        if (isFirebaseConfigured() && currentUser?.role === 'admin') {
          saveAppState({ giveaway: next }).catch((err) => {
            console.warn('Error al registrar participante en Firestore:', err);
          });
        }
        return next;
      });

      if (assignedTicket && currentUser) {
        setCurrentUser((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, giveawayTicket: assignedTicket! };
          try {
            localStorage.setItem('playa_buche_user', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }

      return assignedTicket;
    },
    [currentUser]
  );

  if (!API_BASE && !isFirebaseConfigured()) {
    return (
      <Splash label="Falta configurar Firebase o VITE_API_URL con la dirección de la API." />
    );
  }

  if (directLoginRequested || (!sessionToken && !currentUser)) {
    return (
      <>
        <LoginScreen
          onAuthenticated={handleAuthenticated}
          giveaway={giveaway}
          onOpenGiveaway={handleOpenGiveaway}
          onRegisterGiveawayParticipant={handleRegisterGiveawayParticipant}
        />
        <GiveawayModal
          isOpen={isGiveawayModalOpen}
          onClose={handleCloseGiveaway}
          giveaway={giveaway}
          currentUser={currentUser}
        />
      </>
    );
  }

  if (!identityResolved || !currentUser) {
    return <Splash />;
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#002546] flex flex-col antialiased selection:bg-[#57d1fd] selection:text-[#002546]">
      <OfflineIndicator />

      <Header
        currentRole={currentRole}
        currentUser={currentUser}
        bcvRate={bcvRate}
        onOpenAccount={() => setIsAccountPanelOpen(true)}
        onLogout={handleLogout}
        onOpenFiscalInvoice={() => setIsFiscalInvoiceOpen(true)}
        onOpenSearch={() => setIsCommandPaletteOpen(true)}
        onOpenCalculator={() => handleOpenCalculator()}
        onOpenWeather={() => setIsWeatherModalOpen(true)}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        onOpenGiveaway={handleOpenGiveaway}
        notificationCount={totalNotificationCount}
        canPreviewRoles={availableRoles.length > 1}
      />

      {/* Floating Targeted Real-time Notification Banner (Client / Waiter / Excursion) */}
      {realtimeToast && (
        <div className="fixed top-18 right-3 sm:right-6 z-50 max-w-md w-[calc(100%-1.5rem)] animate-bounce-subtle">
          <div className="bg-[#002546] text-white p-3.5 rounded-2xl border-2 border-[#57d1fd] shadow-2xl flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#57d1fd] text-[#002546] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                <CheckCircle2 className="w-5 h-5 text-[#002546]" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase text-[#57d1fd] tracking-wide">
                    {realtimeToast.title}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white uppercase">
                    {realtimeToast.targetRole === 'client'
                      ? '👤 Para Cliente'
                      : realtimeToast.targetRole === 'excursion'
                      ? '⚓ Para Excursión'
                      : '🧑‍🍳 Para Mesonero'}
                  </span>
                </div>
                <p className="text-xs text-white/90 leading-snug font-medium">
                  {realtimeToast.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => setRealtimeToast(null)}
              className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-2xl mx-auto px-2 sm:px-4 pt-20 pb-24">
        {currentRole === 'waiter' && (
          <WaitersView
            waiterUser={currentUser}
            menuItems={menuItems}
            spots={spots}
            orders={orders}
            bcvRate={bcvRate}
            onSendOrderToKitchen={handleSendOrderToKitchen}
            onOpenPaymentModal={setActivePagoMovilOrder}
            onUpdateOrder={handleUpdateOrder}
            onOpenCalculator={handleOpenCalculator}
            onOpenToldoQrModal={() => setIsToldoQrModalOpen(true)}
          />
        )}

        {currentRole === 'excursion' && (
          <ExcursionsView
            currentUser={currentUser}
            excursion={excursion}
            bcvRate={bcvRate}
            menuItems={menuItems}
            onUpdateExcursion={setExcursion}
            onSendApproachingAlert={() => setApproachingAlertCount((previous) => previous + 1)}
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onSendOrderToKitchen={handleSendOrderToKitchen}
            onUpdateOrder={handleUpdateOrder}
          />
        )}

        {currentRole === 'kitchen' && (
          <KitchenKdsView
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateOrder={handleUpdateOrder}
            approachingAlertCount={approachingAlertCount}
          />
        )}

        {currentRole === 'admin' && (currentUser?.role === 'admin' || !currentUser) && (
          <AdminView
            apiBase={API_BASE}
            authHeaders={authHeaders}
            currentUserId={currentUser?.id || 'admin-master'}
            onUsersChanged={setUsers}
            bcvRate={bcvRate}
            onUpdateBcvRate={handleUpdateBcvRate}
            bankConfig={bankConfig}
            onUpdateBankConfig={setBankConfig}
            menuItems={menuItems}
            onToggleMenuAvailability={(itemId) =>
              setMenuItems((previous) => previous.map((item) => (item.id === itemId ? { ...item, isAvailable: !item.isAvailable } : item)))
            }
            onAddMenuItem={(item) => setMenuItems((previous) => [item, ...previous])}
            onUpdateMenuItem={(item) => setMenuItems((previous) => previous.map((entry) => (entry.id === item.id ? item : entry)))}
            onDeleteMenuItem={(itemId) => setMenuItems((previous) => previous.filter((item) => item.id !== itemId))}
            waitersClosings={waitersClosings}
            onSettleWaiter={(closing) => setWaitersClosings((previous) => previous.map((entry) => (entry.id === closing.id ? closing : entry)))}
            onUpdateWaiterClosing={(closing) => setWaitersClosings((previous) => previous.map((entry) => (entry.id === closing.id ? closing : entry)))}
            onOpenPazYSalvo={setActivePazYSalvoClosing}
            drawerBills={drawerBills}
            onUpdateDrawerBills={setDrawerBills}
            staffUsers={users}
            onOpenFiscalInvoice={() => setIsFiscalInvoiceOpen(true)}
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateOrder={handleUpdateOrder}
            approachingAlertCount={approachingAlertCount}
            spots={spots}
            onOpenToldoQrModal={() => setIsToldoQrModalOpen(true)}
            giveaway={giveaway}
            onUpdateGiveaway={handleUpdateGiveaway}
          />
        )}

        {currentRole === 'client' && (
          <ClientsView
            spots={spots}
            menuItems={menuItems}
            activeOrder={clientActiveOrder}
            clientName={currentUser?.name || 'Cliente'}
            bcvRate={bcvRate}
            selectedSpotId={selectedSpotId}
            onSelectSpot={setSelectedSpotId}
            onPlaceOrder={handleClientPlaceOrder}
            onOpenPaymentModal={setActivePagoMovilOrder}
            onOpenFiscalInvoice={() => setIsFiscalInvoiceOpen(true)}
            onUpdateOrder={handleUpdateOrder}
            giveaway={giveaway}
            giveawayTicket={currentUser?.giveawayTicket}
            onOpenGiveaway={handleOpenGiveaway}
          />
        )}
      </main>

      <BottomNav
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
        activeOrdersCount={orders.filter((order) => order.status === 'in_fire').length}
        availableRoles={availableRoles}
      />

      {isAccountPanelOpen && (
        <AccountPanel
          currentUser={currentUser}
          availableRoles={availableRoles}
          currentRole={currentRole}
          onSelectRole={handleSelectRole}
          onLogout={handleLogout}
          onClose={() => setIsAccountPanelOpen(false)}
          onOpenInstall={() => {
            setIsAccountPanelOpen(false);
            setIsInstallModalOpen(true);
          }}
        />
      )}

      {activePagoMovilOrder && (
        <PagoMovilModal
          order={activePagoMovilOrder}
          bankConfig={bankConfig}
          bcvRate={bcvRate}
          onClose={() => setActivePagoMovilOrder(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {activePazYSalvoClosing && (
        <PazYSalvoModal
          closing={activePazYSalvoClosing}
          bcvRate={bcvRate}
          onClose={() => setActivePazYSalvoClosing(null)}
        />
      )}

      {isFiscalInvoiceOpen && (
        <FiscalInvoiceModal
          order={clientActiveOrder}
          bcvRate={bcvRate}
          onClose={() => setIsFiscalInvoiceOpen(false)}
        />
      )}

      <CurrencyCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        bcvRate={bcvRate}
        initialTotalUsd={calculatorInitialTotal}
      />

      <BeachWeatherModal isOpen={isWeatherModalOpen} onClose={() => setIsWeatherModalOpen(false)} />

      <NotificationCenterDropdown
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        orders={orders}
        currentRole={currentRole}
        currentUser={currentUser}
        approachingAlertCount={approachingAlertCount}
        onNavigateToView={(role) => {
          setIsNotificationCenterOpen(false);
          handleSelectRole(role);
        }}
        onSelectOrder={(orderId) => {
          const order = orders.find((entry) => entry.id === orderId);
          setIsNotificationCenterOpen(false);
          if (!order) return;
          handleSelectRole(order.origin === 'waiter_pos' ? 'waiter' : 'kitchen');
        }}
      />

      {availableRoles.length > 1 && (
        <GlobalCommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          menuItems={menuItems}
          spots={spots}
          orders={orders}
          bcvRate={bcvRate}
          availableRoles={availableRoles}
          onNavigateToRole={(role) => {
            setIsCommandPaletteOpen(false);
            handleSelectRole(role);
          }}
          onOpenCalculator={() => handleOpenCalculator()}
          onOpenWeather={() => setIsWeatherModalOpen(true)}
          onOpenFiscalInvoice={() => setIsFiscalInvoiceOpen(true)}
        />
      )}

      <AppInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        appUrl={typeof window !== 'undefined' ? window.location.origin : ''}
      />

      <ToldoQrGeneratorModal
        isOpen={isToldoQrModalOpen}
        onClose={() => setIsToldoQrModalOpen(false)}
        spots={spots}
      />

      <GiveawayModal
        isOpen={isGiveawayModalOpen}
        onClose={handleCloseGiveaway}
        giveaway={giveaway}
        currentUser={currentUser}
      />
    </div>
  );
};

export default App;