import React, { useState, useEffect, useRef } from 'react';
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
  WaiterClosingSummary
} from './types';
import {
  INITIAL_BANK_CONFIG,
  INITIAL_DRAWER_BILLS,
  INITIAL_EXCURSION,
  INITIAL_MENU_ITEMS,
  INITIAL_ORDERS,
  INITIAL_SPOTS,
  INITIAL_USERS,
  INITIAL_WAITERS_CLOSINGS
} from './data/initialData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AuthModal } from './components/AuthModal';
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

export const App: React.FC = () => {
  // Production state is persisted in PostgreSQL through the Render API.
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [isDbHydrated, setIsDbHydrated] = useState(false);
  const dbHydratedRef = useRef(false);
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!apiBase) {
        setIsDbHydrated(true);
        dbHydratedRef.current = true;
        return;
      }
      try {
        const response = await fetch(apiBase + '/api/state');
        if (!response.ok) throw new Error('state fetch failed');
        const data = await response.json();
        if (cancelled) return;
        if (Array.isArray(data.users) && data.users.length) {
          if (data.users.length < INITIAL_USERS.length) {
            const syncResponse = await fetch(apiBase + '/api/users/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ users: INITIAL_USERS }),
            });
            const syncData = await syncResponse.json().catch(() => ({}));
            if (syncResponse.ok && Array.isArray(syncData.users) && syncData.users.length) {
              setUsers(syncData.users);
              const owner = syncData.users.find((u: User) => u.role === 'admin' && u.status === 'active');
              if (owner) setCurrentUser(owner);
            } else {
              setUsers(data.users);
            }
          } else {
            setUsers(data.users);
            const owner = data.users.find((u: User) => u.role === 'admin' && u.status === 'active');
            if (owner) setCurrentUser(owner);
          }
        } else if (apiBase) {
          const syncResponse = await fetch(apiBase + '/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: INITIAL_USERS }),
          });
          const syncData = await syncResponse.json().catch(() => ({}));
          if (syncResponse.ok && Array.isArray(syncData.users)) setUsers(syncData.users);
        }
        if (data.state) {
          if (Array.isArray(data.state.menuItems)) setMenuItems(data.state.menuItems);
          if (Array.isArray(data.state.spots)) setSpots(data.state.spots);
          if (Array.isArray(data.state.orders)) setOrders(data.state.orders);
          if (data.state.excursion) setExcursion(data.state.excursion);
          if (data.state.bankConfig) setBankConfig(data.state.bankConfig);
          if (Array.isArray(data.state.waitersClosings)) setWaitersClosings(data.state.waitersClosings);
          if (data.state.drawerBills) setDrawerBills(data.state.drawerBills);
          if (typeof data.state.bcvRate === 'number') setBcvRate(data.state.bcvRate);
        }
      } catch (error) {
        console.warn('PostgreSQL state unavailable; using factory defaults.', error);
      } finally {
        if (!cancelled) {
          setIsDbHydrated(true);
          dbHydratedRef.current = true;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [apiBase]);

  const [currentRole, setCurrentRole] = useState<UserRole>('waiter');
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]); // Carlos Rodríguez (waiter)
  const [bcvRate, setBcvRate] = useState<number>(54.50);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Entities state
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [spots, setSpots] = useState<ToldoSpot[]>(INITIAL_SPOTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [excursion, setExcursion] = useState<ExcursionPackage>(INITIAL_EXCURSION);
  const [bankConfig, setBankConfig] = useState<BankConfig>(INITIAL_BANK_CONFIG);
  const [waitersClosings, setWaitersClosings] = useState<WaiterClosingSummary[]>(INITIAL_WAITERS_CLOSINGS);
  const [drawerBills, setDrawerBills] = useState<BillDenominationCount>(INITIAL_DRAWER_BILLS);
  const [selectedSpotId, setSelectedSpotId] = useState<string>('spot-14');
  const [approachingAlertCount, setApproachingAlertCount] = useState<number>(0);

  // Modal controls
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [activePagoMovilOrder, setActivePagoMovilOrder] = useState<Order | null>(null);
  const [activePazYSalvoClosing, setActivePazYSalvoClosing] = useState<WaiterClosingSummary | null>(null);
  const [isFiscalInvoiceOpen, setIsFiscalInvoiceOpen] = useState<boolean>(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [calculatorInitialTotal, setCalculatorInitialTotal] = useState<number>(0);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState<boolean>(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isPrototypeModalOpen, setIsPrototypeModalOpen] = useState<boolean>(false);

  // Reset demo data to factory defaults
  const handleResetFactoryData = () => {
    setUsers(INITIAL_USERS);
    setOrders(INITIAL_ORDERS);
    setMenuItems(INITIAL_MENU_ITEMS);
    setSpots(INITIAL_SPOTS);
    setBcvRate(54.50);
    setIsOffline(false);
    soundService.playSuccess();
  };

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute live notifications count
  const now = new Date();
  const alertOrdersCount = orders.filter((o) => {
    if (o.status === 'delivered' || o.status === 'cancelled' || o.status === 'ready_pass') return false;
    const t = getOrderDeliveryTiming(o, now);
    return t.minutesRemaining <= 30 && t.minutesRemaining > 0;
  }).length;
  const totalNotificationCount = alertOrdersCount + approachingAlertCount;

  // Active client order
  const [clientActiveOrder, setClientActiveOrder] = useState<Order | null>(orders[2] || null);

  // Switch role handler
  const handleSelectRole = (role: UserRole, user?: User) => {
    setCurrentRole(role);
    if (user) {
      setCurrentUser(user);
    } else {
      const match = users.find((u) => u.role === role && u.status !== 'pending_approval');
      if (match) setCurrentUser(match);
    }
  };

  // Staff Account & Access Management by Owner
  const handleAddUser = (newUser: User) => {
    setUsers((prev) => [newUser, ...prev]);
    soundService.playSuccess();
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    soundService.playSuccess();
  };

  const handleApproveUser = (userId: string, pin: string, zone?: string, boatName?: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        return {
          ...u,
          status: 'active',
          approvedByOwner: true,
          approvedAt: new Date().toISOString(),
          pin: pin || u.pin || '1234',
          zone: zone || u.zone,
          boatName: boatName || u.boatName,
        };
      })
    );
    soundService.playSuccess();
  };

  const handleToggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const newStatus = u.status === 'suspended' ? 'active' : 'suspended';
        return { ...u, status: newStatus };
      })
    );
    soundService.playClick();
  };

  const handleDeleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    soundService.playClick();
  };

  const handleRequestAccess = (
    role: UserRole,
    name: string,
    phone: string,
    zone?: string,
    boatName?: string
  ) => {
    const initials = name
      .trim()
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('');

    const newRequestUser: User = {
      id: `u-req-${Date.now()}`,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, '.')}.pos@playabuche.com`,
      role,
      phone,
      zone: zone || (role === 'waiter' ? 'Pendiente Asignación' : 'Muelle Bahía'),
      boatName,
      avatar: initials || 'PB',
      status: 'pending_approval',
      approvedByOwner: false,
      createdAt: new Date().toISOString(),
      notes: `Solicitó acceso desde pantalla de inicio. Requiere aprobación y asignación de PIN por el dueño.`,
    };

    setUsers((prev) => [newRequestUser, ...prev]);
  };

  // Waiter sends new order to kitchen
  const handleSendOrderToKitchen = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
    soundService.playBell();
  };

  // Kitchen KDS update order status with prep duration tracking
  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const now = new Date();
        const updates: Partial<Order> = {
          status: newStatus,
          updatedAt: now.toISOString(),
        };

        // When marked as ready_pass or delivered, compute prep time from receipt to ready
        if ((newStatus === 'ready_pass' || newStatus === 'delivered') && !o.readyAt) {
          const readyIso = now.toISOString();
          let durationMinutes = 12;
          if (o.createdAt) {
            const createdMs = new Date(o.createdAt).getTime();
            const elapsedMs = now.getTime() - createdMs;
            if (elapsedMs > 0 && elapsedMs < 12 * 60 * 60 * 1000) {
              durationMinutes = Math.max(1, Math.round(elapsedMs / 60000));
            } else if (o.elapsedSeconds) {
              durationMinutes = Math.max(1, Math.round(o.elapsedSeconds / 60));
            }
          } else if (o.elapsedSeconds) {
            durationMinutes = Math.max(1, Math.round(o.elapsedSeconds / 60));
          }
          updates.readyAt = readyIso;
          updates.prepDurationMinutes = durationMinutes;
        }

        return {
          ...o,
          ...updates,
        };
      })
    );
  };

  // Excursion approaching alert
  const handleSendApproachingAlert = () => {
    setApproachingAlertCount((prev) => prev + 1);
  };

  // Client creates direct order
  const handleClientPlaceOrder = (items: OrderItem[], spot: ToldoSpot, requestedTime?: string) => {
    const subtotal = items.reduce((acc, i) => acc + i.quantity * i.unitPriceUsd, 0);
    const newOrd: Order = {
      id: 'ord-client-' + Date.now(),
      displayNumber: '#' + Math.floor(200 + Math.random() * 800),
      origin: 'client_qr',
      spotId: spot.id,
      spotName: `${spot.name} • ${spot.typeDesc}`,
      customerName: 'Carlos Mendoza',
      items,
      subtotalUsd: subtotal,
      tipPercent: 10,
      tipUsd: subtotal * 0.1,
      totalUsd: subtotal * 1.1,
      totalBs: subtotal * 1.1 * bcvRate,
      status: 'in_fire',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedDeliveryTime: requestedTime || 'Ahora (~20 min)',
      kitchenStep: 2,
      elapsedSeconds: 30,
    };

    setOrders((prev) => [newOrd, ...prev]);
    setClientActiveOrder(newOrd);
    soundService.playBell();
  };

  // Update an existing comanda (items added/removed, time modified, notes changed)
  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );
    if (clientActiveOrder && (clientActiveOrder.id === updatedOrder.id || clientActiveOrder.spotId === updatedOrder.spotId)) {
      setClientActiveOrder(updatedOrder);
    }
    soundService.playFireAlert();
  };

  // Settle waiter in closing view
  const handleSettleWaiter = (settledClosing: WaiterClosingSummary) => {
    setWaitersClosings((prev) =>
      prev.map((w) => (w.id === settledClosing.id ? settledClosing : w))
    );
  };

  const handleUpdateWaiterClosing = (updatedClosing: WaiterClosingSummary) => {
    setWaitersClosings((prev) =>
      prev.map((w) => (w.id === updatedClosing.id ? updatedClosing : w))
    );
  };

  // Payment completed
  const handlePaymentSuccess = (orderId: string, reference: string, method: 'pago_movil' | 'zelle') => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              paymentStatus: 'verified',
              paymentMethod: method,
              paymentReference: reference,
            }
          : o
      )
    );
    if (clientActiveOrder && clientActiveOrder.id === orderId) {
      setClientActiveOrder((prev) => (prev ? { ...prev, paymentStatus: 'verified' } : null));
    }
  };

  // Toggle menu item availability (quitar y colocar platos)
  const handleToggleMenuAvailability = (itemId: string) => {
    setMenuItems((prev) =>
      prev.map((m) => (m.id === itemId ? { ...m, isAvailable: !m.isAvailable } : m))
    );
  };

  // Add new menu item from owner panel
  const handleAddMenuItem = (newItem: MenuItem) => {
    setMenuItems((prev) => [newItem, ...prev]);
  };

  // Update existing menu item
  const handleUpdateMenuItem = (updatedItem: MenuItem) => {
    setMenuItems((prev) =>
      prev.map((m) => (m.id === updatedItem.id ? updatedItem : m))
    );
  };

  // Delete menu item from menu
  const handleDeleteMenuItem = (itemId: string) => {
    setMenuItems((prev) => prev.filter((m) => m.id !== itemId));
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#002546] flex flex-col antialiased selection:bg-[#57d1fd] selection:text-[#002546]">
      {/* Offline Status Tracker & Auto Reconnect Alert */}
      <OfflineIndicator />

      {/* Universal Responsive Header */}
      <Header
        currentRole={currentRole}
        currentUser={currentUser}
        bcvRate={bcvRate}
        isOffline={isOffline}
        onToggleOffline={() => setIsOffline(!isOffline)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenFiscalInvoice={() => setIsFiscalInvoiceOpen(true)}
        onOpenSearch={() => setIsCommandPaletteOpen(true)}
        onOpenCalculator={() => {
          setCalculatorInitialTotal(0);
          setIsCalculatorOpen(true);
        }}
        onOpenWeather={() => setIsWeatherModalOpen(true)}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        onOpenPrototypeConsole={() => setIsPrototypeModalOpen(true)}
        notificationCount={totalNotificationCount}
      />

      {/* Main Role-Based Content Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-2 sm:px-4 pt-20 pb-24">
        {currentRole === 'waiter' && (
          <WaitersView
            waiterUser={currentUser}
            menuItems={menuItems}
            spots={spots}
            orders={orders}
            bcvRate={bcvRate}
            onSendOrderToKitchen={handleSendOrderToKitchen}
            onOpenPaymentModal={(ord) => setActivePagoMovilOrder(ord)}
            onUpdateOrder={handleUpdateOrder}
            onOpenCalculator={(initialTotal) => {
              setCalculatorInitialTotal(initialTotal || 0);
              setIsCalculatorOpen(true);
            }}
          />
        )}

        {currentRole === 'excursion' && (
          <ExcursionsView
            excursion={excursion}
            bcvRate={bcvRate}
            menuItems={menuItems}
            onUpdateExcursion={(updated) => setExcursion(updated)}
            onSendApproachingAlert={handleSendApproachingAlert}
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

        {currentRole === 'admin' && (
          <AdminView
            bcvRate={bcvRate}
            onUpdateBcvRate={(r) => setBcvRate(r)}
            bankConfig={bankConfig}
            onUpdateBankConfig={(c) => setBankConfig(c)}
            menuItems={menuItems}
            onToggleMenuAvailability={handleToggleMenuAvailability}
            onAddMenuItem={handleAddMenuItem}
            onUpdateMenuItem={handleUpdateMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
            waitersClosings={waitersClosings}
            onSettleWaiter={handleSettleWaiter}
            onUpdateWaiterClosing={handleUpdateWaiterClosing}
            onOpenPazYSalvo={(closing) => setActivePazYSalvoClosing(closing)}
            drawerBills={drawerBills}
            onUpdateDrawerBills={(bills) => setDrawerBills(bills)}
            staffUsers={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onApproveUser={handleApproveUser}
            onToggleUserStatus={handleToggleUserStatus}
            onDeleteUser={handleDeleteUser}
            onOpenFiscalInvoice={() => setIsFiscalInvoiceOpen(true)}
            onOpenPrototypeConsole={() => setIsPrototypeModalOpen(true)}
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateOrder={handleUpdateOrder}
            approachingAlertCount={approachingAlertCount}
          />
        )}

        {currentRole === 'client' && (
          <ClientsView
            spots={spots}
            menuItems={menuItems}
            activeOrder={clientActiveOrder}
            bcvRate={bcvRate}
            selectedSpotId={selectedSpotId}
            onSelectSpot={(sId) => setSelectedSpotId(sId)}
            onPlaceOrder={handleClientPlaceOrder}
            onOpenPaymentModal={(ord) => setActivePagoMovilOrder(ord)}
            onOpenFiscalInvoice={() => setIsFiscalInvoiceOpen(true)}
            onUpdateOrder={handleUpdateOrder}
          />
        )}
      </main>

      {/* Persistent 5-Role Bottom Navigation */}
      <BottomNav
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
        activeOrdersCount={orders.filter((o) => o.status === 'in_fire').length}
      />

      {/* Role Selection & PIN Security Modal */}
      {isAuthModalOpen && (
        <AuthModal
          users={users}
          currentRole={currentRole}
          currentUser={currentUser}
          onSelectRole={handleSelectRole}
          onClose={() => setIsAuthModalOpen(false)}
          onRequestAccess={handleRequestAccess}
        />
      )}

      {/* Pago Móvil & Zelle Modal with Gemini OCR */}
      {activePagoMovilOrder && (
        <PagoMovilModal
          order={activePagoMovilOrder}
          bankConfig={bankConfig}
          bcvRate={bcvRate}
          onClose={() => setActivePagoMovilOrder(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Paz y Salvo Thermal Modal with SHA-256 and QR */}
      {activePazYSalvoClosing && (
        <PazYSalvoModal
          closing={activePazYSalvoClosing}
          bcvRate={bcvRate}
          onClose={() => setActivePazYSalvoClosing(null)}
        />
      )}

      {/* Comprobante Fiscal Digital Modal (SENIAT Inversiones Virgen del Valle) */}
      {isFiscalInvoiceOpen && (
        <FiscalInvoiceModal
          order={clientActiveOrder}
          bcvRate={bcvRate}
          onClose={() => setIsFiscalInvoiceOpen(false)}
        />
      )}

      {/* Quick Currency & Vueltos Calculator Modal */}
      <CurrencyCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        bcvRate={bcvRate}
        initialTotalUsd={calculatorInitialTotal}
      />

      {/* Beach & Maritime Weather Modal */}
      <BeachWeatherModal
        isOpen={isWeatherModalOpen}
        onClose={() => setIsWeatherModalOpen(false)}
      />

      {/* Live Notification Center Dropdown */}
      <NotificationCenterDropdown
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        orders={orders}
        approachingAlertCount={approachingAlertCount}
        onNavigateToView={(role) => handleSelectRole(role)}
        onSelectOrder={(orderId) => {
          const ord = orders.find((o) => o.id === orderId);
          if (ord) {
            handleSelectRole(ord.origin === 'waiter_pos' ? 'waiter' : 'kitchen');
          }
        }}
      />

      {/* Universal Command Palette (Ctrl+K) */}
      <GlobalCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        menuItems={menuItems}
        spots={spots}
        orders={orders}
        bcvRate={bcvRate}
        onNavigateToRole={(role) => handleSelectRole(role)}
        onOpenCalculator={() => {
          setCalculatorInitialTotal(0);
          setIsCalculatorOpen(true);
        }}
        onOpenWeather={() => setIsWeatherModalOpen(true)}
        onOpenFiscalInvoice={() => setIsFiscalInvoiceOpen(true)}
        onOpenPrototypeConsole={() => setIsPrototypeModalOpen(true)}
        onToggleOffline={() => setIsOffline(!isOffline)}
        isOffline={isOffline}
      />

      {/* Prototype Settings, Hardware Console & Direct Download Suite */}
      <AppInstallModal
        isOpen={isPrototypeModalOpen}
        onClose={() => setIsPrototypeModalOpen(false)}
        bcvRate={bcvRate}
        onUpdateBcvRate={(rate) => setBcvRate(rate)}
        isOffline={isOffline}
        onToggleOffline={() => setIsOffline(!isOffline)}
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
        orders={orders}
        menuItems={menuItems}
        spots={spots}
        users={users}
        bankConfig={bankConfig}
        onResetFactoryData={handleResetFactoryData}
      />
    </div>
  );
};

export default App;
