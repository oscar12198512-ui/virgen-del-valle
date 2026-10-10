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
} from './types';
import {
  INITIAL_BANK_CONFIG,
  INITIAL_DRAWER_BILLS,
  INITIAL_EXCURSION,
  INITIAL_MENU_ITEMS,
  INITIAL_SPOTS,
} from './data/initialData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AccountPanel } from './components/AccountPanel';
import { PagoMovilModal } from './components/PagoMovilModal';
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
import { OfflineIndicator } from './components/OfflineIndicator';
import { AppInstallModal } from './components/AppInstallModal';
import { ToldoQrGeneratorModal } from './components/ToldoQrGeneratorModal';
import { LoginScreen } from './components/LoginScreen';
import { isFirebaseConfigured } from './config/firebase';
import {
  subscribeToAppState,
  saveAppState,
  getAppStateOnce,
  pushOrderToFirestore,
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
  const [identityResolved, setIdentityResolved] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('playa_buche_user');
    } catch {
      return false;
    }
  });
  const [isDbHydrated, setIsDbHydrated] = useState(false);
  const dbHydratedRef = useRef(false);

  const [bcvRate, setBcvRate] = useState<number>(54.5);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [spots, setSpots] = useState<ToldoSpot[]>(INITIAL_SPOTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [excursion, setExcursion] = useState<ExcursionPackage>(INITIAL_EXCURSION);
  const [bankConfig, setBankConfig] = useState<BankConfig>(INITIAL_BANK_CONFIG);
  const [waitersClosings, setWaitersClosings] = useState<WaiterClosingSummary[]>([]);
  const [drawerBills, setDrawerBills] = useState<BillDenominationCount>(INITIAL_DRAWER_BILLS);
  const [selectedSpotId, setSelectedSpotId] = useState<string>('');
  const [approachingAlertCount, setApproachingAlertCount] = useState<number>(0);
  const [clientActiveOrder, setClientActiveOrder] = useState<Order | null>(null);

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
  const [viewRole, setViewRole] = useState<UserRole | null>(null);
  const prevOrdersRef = useRef<Order[]>([]);

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

  // Sincronización de datos (Firebase Firestore Real-Time / Fallback REST API)
  useEffect(() => {
    if (isFirebaseConfigured()) {
      // Suscripción en tiempo real con Firestore para estado operativo
      const unsubState = subscribeToAppState(
        (state) => {
          if (Array.isArray(state.menuItems) && state.menuItems.length) setMenuItems(state.menuItems);
          if (Array.isArray(state.spots) && state.spots.length) setSpots(state.spots);
          if (Array.isArray(state.orders)) setOrders(state.orders);
          if (state.excursion && state.excursion.id) setExcursion(state.excursion);
          if (state.bankConfig) setBankConfig(state.bankConfig);
          if (Array.isArray(state.waitersClosings)) setWaitersClosings(state.waitersClosings);
          if (state.drawerBills) setDrawerBills(state.drawerBills);
          if (typeof state.bcvRate === 'number') setBcvRate(state.bcvRate);

          setIsDbHydrated(true);
          dbHydratedRef.current = true;
        },
        (error) => {
          console.warn('Error al sincronizar Firestore en tiempo real:', error);
        }
      );

      // Suscripción a usuarios de Firestore si tiene rol administrativo/staff
      const unsubUsers = subscribeToUsers((firestoreUsers) => {
        if (Array.isArray(firestoreUsers)) setUsers(firestoreUsers);
      });

      return () => {
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
        if (typeof data.state.bcvRate === 'number') setBcvRate(data.state.bcvRate);
      } catch (error) {
        console.warn('Catálogo público no disponible; se usan los valores locales.', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, sessionToken]);

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

  // Persistencia de cambios de personal operativo (Firestore / REST)
  useEffect(() => {
    if (!isDbHydrated || !signedInRole || !STAFF_ROLES.includes(signedInRole)) return;
    const payload = { menuItems, spots, orders, excursion, bankConfig, waitersClosings, drawerBills, bcvRate };
    
    if (isFirebaseConfigured()) {
      const timer = window.setTimeout(async () => {
        try {
          await saveAppState(payload);
        } catch (error) {
          console.warn('No se pudo guardar el estado en Firestore.', error);
        }
      }, 600);
      return () => window.clearTimeout(timer);
    }

    if (!API_BASE || !sessionToken) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(API_BASE + '/api/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ state: payload }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('state save failed');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') console.warn('No se pudo guardar el estado.', error);
      }
    }, 600);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    API_BASE, sessionToken, isDbHydrated, signedInRole, menuItems, spots, orders,
    excursion, bankConfig, waitersClosings, drawerBills, bcvRate, authHeaders,
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

  // Alertas sonoras y hápticas en tiempo real al ingresar órdenes o pasar a ready_pass
  useEffect(() => {
    if (!dbHydratedRef.current || prevOrdersRef.current.length === 0) {
      prevOrdersRef.current = orders;
      return;
    }

    if (orders.length > prevOrdersRef.current.length) {
      const prevIds = new Set(prevOrdersRef.current.map((o) => o.id));
      const hasNew = orders.some((o) => !prevIds.has(o.id));
      if (hasNew) {
        soundService.playNewIncomingOrderAlert();
      }
    }

    orders.forEach((ord) => {
      const prev = prevOrdersRef.current.find((p) => p.id === ord.id);
      if (prev && prev.status !== 'ready_pass' && ord.status === 'ready_pass') {
        soundService.playReadyPassAlert();
      }
    });

    prevOrdersRef.current = orders;
  }, [orders]);

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
    setViewRole(null);
    if (window.location.search) window.history.replaceState({}, document.title, window.location.pathname);
  };

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
  const alertOrdersCount = orders.filter((order) => {
    if (order.status === 'delivered' || order.status === 'cancelled' || order.status === 'ready_pass') return false;
    const timing = getOrderDeliveryTiming(order, now);
    return timing.minutesRemaining <= 30 && timing.minutesRemaining > 0;
  }).length;
  const totalNotificationCount = alertOrdersCount + approachingAlertCount;

  const handleSendOrderToKitchen = (newOrder: Order) => {
    setOrders((previous) => [newOrder, ...previous]);
    soundService.playNewIncomingOrderAlert();
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    if (newStatus === 'ready_pass') {
      soundService.playReadyPassAlert();
    } else if (newStatus === 'in_fire') {
      soundService.playFireAlert();
    }
    setOrders((previous) =>
      previous.map((order) => {
        if (order.id !== orderId) return order;
        const updatedAt = new Date().toISOString();
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
        return { ...order, ...updates };
      })
    );
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders((previous) => previous.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
    if (clientActiveOrder?.id === updatedOrder.id) setClientActiveOrder(updatedOrder);
  };

  const handleClientPlaceOrder = async (items: OrderItem[], spot: ToldoSpot, requestedTime?: string) => {
    const subtotal = items.reduce((total, item) => total + item.quantity * item.unitPriceUsd, 0);
    const nowIso = new Date().toISOString();
    const newOrder: Order = {
      id: `ord-client-${Date.now()}`,
      displayNumber: `#${Math.floor(200 + Math.random() * 800)}`,
      origin: 'client_qr',
      spotId: spot.id,
      spotName: `${spot.name} • ${spot.typeDesc}`,
      customerName: currentUser?.name || 'Cliente',
      items,
      subtotalUsd: subtotal,
      tipPercent: 0,
      tipUsd: 0,
      totalUsd: subtotal,
      totalBs: subtotal * bcvRate,
      status: 'in_fire',
      paymentStatus: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
      estimatedDeliveryTime: requestedTime || 'Ahora',
      kitchenStep: 2,
    };

    setClientActiveOrder(newOrder);
    soundService.playBell();

    if (isFirebaseConfigured()) {
      try {
        await pushOrderToFirestore(newOrder);
      } catch (error) {
        console.warn('No se pudo guardar la orden en Firestore:', error);
      }
      setOrders((previous) => [newOrder, ...previous]);
      return;
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
    } catch (error) {
      console.warn('No se pudo registrar el pedido en el servidor.', error);
      setOrders((previous) => [newOrder, ...previous]);
    }
  };

  const handlePaymentSuccess = (orderId: string, reference: string, method: 'pago_movil' | 'zelle') => {
    const applyPayment = (order: Order) =>
      order.id === orderId
        ? { ...order, paymentStatus: 'verified' as const, paymentMethod: method, paymentReference: reference }
        : order;
    setOrders((previous) => previous.map(applyPayment));
    setClientActiveOrder((previous) => (previous ? applyPayment(previous) : previous));
  };

  if (!API_BASE && !isFirebaseConfigured()) {
    return (
      <Splash label="Falta configurar Firebase o VITE_API_URL con la dirección de la API." />
    );
  }

  if (directLoginRequested || (!sessionToken && !currentUser)) {
    return <LoginScreen onAuthenticated={handleAuthenticated} />;
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
        notificationCount={totalNotificationCount}
        canPreviewRoles={availableRoles.length > 1}
      />

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
            excursion={excursion}
            bcvRate={bcvRate}
            menuItems={menuItems}
            onUpdateExcursion={setExcursion}
            onSendApproachingAlert={() => setApproachingAlertCount((previous) => previous + 1)}
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

        {currentRole === 'admin' && currentUser.role === 'admin' && (
          <AdminView
            apiBase={API_BASE}
            authHeaders={authHeaders}
            currentUserId={currentUser.id}
            onUsersChanged={setUsers}
            bcvRate={bcvRate}
            onUpdateBcvRate={setBcvRate}
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
          />
        )}

        {currentRole === 'client' && currentUser.role === 'client' && (
          <ClientsView
            spots={spots}
            menuItems={menuItems}
            activeOrder={clientActiveOrder}
            clientName={currentUser.name}
            bcvRate={bcvRate}
            selectedSpotId={selectedSpotId}
            onSelectSpot={setSelectedSpotId}
            onPlaceOrder={handleClientPlaceOrder}
            onOpenPaymentModal={setActivePagoMovilOrder}
            onOpenFiscalInvoice={() => setIsFiscalInvoiceOpen(true)}
            onUpdateOrder={handleUpdateOrder}
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
    </div>
  );
};

export default App;