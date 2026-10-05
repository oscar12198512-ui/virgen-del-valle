import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderStatus } from '../types';
import { soundService } from '../services/soundService';
import {
  getOrderDeliveryTiming,
  OrderDeliveryTimingInfo,
} from '../utils/deliveryTiming';
import {
  Flame,
  CheckCircle,
  Clock,
  Search,
  Bell,
  ChefHat,
  Volume2,
  Utensils,
  AlertCircle,
  Activity,
  TrendingUp,
  X,
  Info,
  Timer,
  AlertTriangle,
  ArrowUpDown,
  Sparkles,
  Layers,
  ListChecks,
  CheckSquare,
} from 'lucide-react';

interface KitchenKdsViewProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onUpdateOrder?: (updated: Order) => void;
  approachingAlertCount: number;
}

interface ActiveKitchenAlert {
  type: '10m' | '30m';
  orderId: string;
  displayNumber: string;
  spotName: string;
  minutesRemaining: number;
  formattedTime: string;
}

export const KitchenKdsView: React.FC<KitchenKdsViewProps> = ({
  orders,
  onUpdateOrderStatus,
  onUpdateOrder,
  approachingAlertCount,
}) => {
  const [filterTab, setFilterTab] = useState<'in_fire' | 'ready_pass' | 'history'>('in_fire');
  const [zoneFilter, setZoneFilter] = useState<'all' | 'beach' | 'excursion' | 'qr'>('all');
  const [showPrepAggregator, setShowPrepAggregator] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [timerTicks, setTimerTicks] = useState(0);
  const [showPrepStatsModal, setShowPrepStatsModal] = useState(false);
  const [activeBannerNotice, setActiveBannerNotice] = useState<string | null>(null);

  // Delivery alerts tracking: keep track of which orders have triggered the 30m and 10m alerts
  const [notified30m, setNotified30m] = useState<Record<string, boolean>>({});
  const [notified10m, setNotified10m] = useState<Record<string, boolean>>({});
  const [activeKitchenAlert, setActiveKitchenAlert] = useState<ActiveKitchenAlert | null>(null);

  // Quick delivery time editor state
  const [editingDeliveryOrderId, setEditingDeliveryOrderId] = useState<string | null>(null);
  const [customTimeInput, setCustomTimeInput] = useState('');

  // Total items in fire aggregator for station chefs (Fritura, Plancha, etc.)
  const itemsInFireSummary = useMemo(() => {
    const map: Record<string, number> = {};
    orders
      .filter((o) => o.status === 'in_fire' || o.status === 'pending')
      .forEach((o) => {
        o.items.forEach((item) => {
          map[item.name] = (map[item.name] || 0) + item.quantity;
        });
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  const handleToggleAllItems = (order: Order) => {
    const allChecked = order.items.every((i) => checkedItems[i.id]);
    const nextState = { ...checkedItems };
    order.items.forEach((i) => {
      nextState[i.id] = !allChecked;
    });
    setCheckedItems(nextState);
    soundService.playBell();
  };

  // Live seconds ticker for KDS elapsed timers and delivery countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTicks((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check active orders for 30m and 10m delivery alerts
  useEffect(() => {
    const now = new Date();
    orders.forEach((order) => {
      // Only monitor active kitchen orders
      if (order.status !== 'in_fire' && order.status !== 'pending' && order.status !== 'plated') {
        return;
      }

      const timing = getOrderDeliveryTiming(order, now);

      // 1. Alert when 10 minutes or less remain for delivery (Priority alert)
      if (timing.minutesRemaining <= 10 && timing.minutesRemaining > 0) {
        if (!notified10m[order.id]) {
          setNotified10m((prev) => ({ ...prev, [order.id]: true }));
          soundService.playUrgent10MinAlert();
          soundService.buzzSmartBand();
          setActiveKitchenAlert({
            type: '10m',
            orderId: order.id,
            displayNumber: order.displayNumber,
            spotName: order.spotName,
            minutesRemaining: timing.minutesRemaining,
            formattedTime: timing.formattedTargetTime,
          });
        }
      }
      // 2. Alert when 30 minutes or less remain for delivery (Mount plate in kitchen)
      else if (timing.minutesRemaining <= 30 && timing.minutesRemaining > 10) {
        if (!notified30m[order.id]) {
          setNotified30m((prev) => ({ ...prev, [order.id]: true }));
          soundService.playMountPlate30MinAlert();
          soundService.buzzSmartBand();
          setActiveKitchenAlert({
            type: '30m',
            orderId: order.id,
            displayNumber: order.displayNumber,
            spotName: order.spotName,
            minutesRemaining: timing.minutesRemaining,
            formattedTime: timing.formattedTargetTime,
          });
        }
      }
    });
  }, [timerTicks, orders, notified10m, notified30m]);

  const handleToggleItem = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Helper to extract or calculate preparation time (minutes) for a completed order
  const getOrderPrepDurationMinutes = (order: Order): number | null => {
    if (order.prepDurationMinutes && order.prepDurationMinutes > 0) {
      return order.prepDurationMinutes;
    }
    if (order.readyAt && order.createdAt) {
      const diffMs = new Date(order.readyAt).getTime() - new Date(order.createdAt).getTime();
      const mins = Math.round(diffMs / 60000);
      if (mins > 0 && mins < 1440) return mins;
    }
    // If order is ready_pass or delivered but readyAt was not stored yet
    if (order.status === 'ready_pass' || order.status === 'delivered') {
      if (order.createdAt) {
        const diffMs = Date.now() - new Date(order.createdAt).getTime();
        const mins = Math.round(diffMs / 60000);
        if (mins > 0 && mins < 1440) return mins;
      }
      if (order.elapsedSeconds) {
        return Math.max(1, Math.round(order.elapsedSeconds / 60));
      }
      return 12;
    }
    return null;
  };

  // List of all completed orders that have reached ready_pass or delivered
  const completedOrdersList = orders
    .map((o) => ({
      order: o,
      durationMinutes: getOrderPrepDurationMinutes(o),
    }))
    .filter((entry): entry is { order: Order; durationMinutes: number } => entry.durationMinutes !== null);

  const completedCount = completedOrdersList.length;
  const totalMinutes = completedOrdersList.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const rawAverage = completedCount > 0 ? totalMinutes / completedCount : 12;
  const averagePrepMinutes = completedCount > 0 ? Math.round(rawAverage * 10) / 10 : 12;
  const roundedAverage = Math.round(averagePrepMinutes);

  // Fastest & slowest orders
  const fastestOrder = completedOrdersList.length > 0
    ? completedOrdersList.reduce((min, cur) => cur.durationMinutes < min.durationMinutes ? cur : min, completedOrdersList[0])
    : null;
  const slowestOrder = completedOrdersList.length > 0
    ? completedOrdersList.reduce((max, cur) => cur.durationMinutes > max.durationMinutes ? cur : max, completedOrdersList[0])
    : null;

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (status === 'ready_pass') {
      soundService.playBell();
      soundService.buzzSmartBand();
      
      // Calculate how long it took from receipt to ready
      let prepTime = 12;
      if (targetOrder?.createdAt) {
        const diffMs = Date.now() - new Date(targetOrder.createdAt).getTime();
        if (diffMs > 0 && diffMs < 1440 * 60000) {
          prepTime = Math.max(1, Math.round(diffMs / 60000));
        } else if (targetOrder?.elapsedSeconds) {
          prepTime = Math.max(1, Math.round((targetOrder.elapsedSeconds + timerTicks) / 60));
        }
      } else if (targetOrder?.elapsedSeconds) {
        prepTime = Math.max(1, Math.round((targetOrder.elapsedSeconds + timerTicks) / 60));
      }

      setActiveBannerNotice(
        `¡Comanda ${targetOrder?.displayNumber || ''} LISTA para pase en ${prepTime} min! Tiempo promedio KDS actualizado.`
      );
      setTimeout(() => setActiveBannerNotice(null), 6000);
    } else if (status === 'in_fire') {
      soundService.playFireAlert();
    }
    onUpdateOrderStatus(orderId, status);
  };

  // Adjust order delivery time (and allow testing alerts instantly)
  const handleUpdateDeliveryTime = (orderId: string, newTimingStr: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    const updated: Order = {
      ...target,
      estimatedDeliveryTime: newTimingStr,
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateOrder) {
      onUpdateOrder(updated);
    }

    // Reset alert flags for this order so the new time triggers appropriately
    setNotified30m((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setNotified10m((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });

    setEditingDeliveryOrderId(null);
    setCustomTimeInput('');

    // Trigger test sound if setting 10m or 30m
    if (newTimingStr.includes('8 min') || newTimingStr.includes('10 min')) {
      soundService.playUrgent10MinAlert();
      setActiveKitchenAlert({
        type: '10m',
        orderId: target.id,
        displayNumber: target.displayNumber,
        spotName: target.spotName,
        minutesRemaining: 8,
        formattedTime: 'En 8 min',
      });
    } else if (newTimingStr.includes('25 min') || newTimingStr.includes('30 min')) {
      soundService.playMountPlate30MinAlert();
      setActiveKitchenAlert({
        type: '30m',
        orderId: target.id,
        displayNumber: target.displayNumber,
        spotName: target.spotName,
        minutesRemaining: 25,
        formattedTime: 'En 25 min',
      });
    }
  };

  const inFireCount = orders.filter((o) => o.status === 'in_fire' || o.status === 'pending').length;
  const readyCount = orders.filter((o) => o.status === 'ready_pass' || o.status === 'plated').length;

  const now = new Date();

  // Active orders with delivery timing calculated
  const activeOrdersWithTiming = orders
    .filter((o) => o.status === 'in_fire' || o.status === 'pending' || o.status === 'plated')
    .map((o) => ({ order: o, timing: getOrderDeliveryTiming(o, now) }));

  const countAlert10m = activeOrdersWithTiming.filter(
    (t) => t.timing.minutesRemaining <= 10 && t.timing.minutesRemaining > 0
  ).length;

  const countAlert30m = activeOrdersWithTiming.filter(
    (t) => t.timing.minutesRemaining <= 30 && t.timing.minutesRemaining > 10
  ).length;

  // STRICT USER INTENT: Organize orders by scheduled delivery time (earliest delivery time FIRST)
  const filteredOrders = orders
    .filter((o) => {
      const matchesSearch =
        o.displayNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.spotName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (zoneFilter === 'beach' && (o.origin === 'excursion' || o.spotName.toLowerCase().includes('lancha') || o.spotName.toLowerCase().includes('muelle'))) return false;
      if (zoneFilter === 'excursion' && o.origin !== 'excursion') return false;
      if (zoneFilter === 'qr' && (o.origin === 'excursion' || o.waiterName)) return false;

      if (filterTab === 'in_fire') {
        return o.status === 'in_fire' || o.status === 'pending';
      }
      if (filterTab === 'ready_pass') {
        return o.status === 'ready_pass' || o.status === 'plated';
      }
      return o.status === 'delivered';
    })
    .sort((a, b) => {
      // Primary sort: scheduled delivery time ascending (earliest to be served first)
      const timingA = getOrderDeliveryTiming(a, now);
      const timingB = getOrderDeliveryTiming(b, now);
      return timingA.targetDate.getTime() - timingB.targetDate.getTime();
    });

  const formatElapsed = (baseSeconds: number = 600) => {
    const total = baseSeconds + timerTicks;
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatClockTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col gap-3.5 max-w-xl mx-auto pb-28 pt-2 px-3">
      {/* Metrics & Average Time Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#eff4ff] border border-[#d2e4ff] rounded-2xl p-3 text-center shadow-2xs">
          <div className="text-2xl font-extrabold text-[#002546]">{inFireCount}</div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#006782]">
            En Fuego
          </span>
        </div>

        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 text-center shadow-2xs">
          <div className="text-2xl font-extrabold text-[#006782]">{readyCount}</div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#006782]">
            Para Pase
          </span>
        </div>

        {/* Dynamic Average Prep Time Card (Interactive) */}
        <button
          onClick={() => setShowPrepStatsModal(true)}
          className="bg-[#f8f9ff] hover:bg-[#eff4ff] border border-gray-200 hover:border-[#a4c9fc] rounded-2xl p-3 text-center shadow-2xs transition-all cursor-pointer group flex flex-col justify-between items-center"
          title="Ver cálculo detallado del Tiempo Promedio de Preparación"
        >
          <div className="flex items-center justify-center gap-1">
            <span
              className={`text-2xl font-extrabold ${
                roundedAverage <= 15
                  ? 'text-emerald-700'
                  : roundedAverage <= 22
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }`}
            >
              {averagePrepMinutes}m
            </span>
            <Activity className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#006782] transition-colors" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#006782] flex items-center gap-0.5">
            <span>T. Promedio</span>
            <Info className="w-2.5 h-2.5 text-gray-400 group-hover:text-[#006782]" />
          </span>
          <span className="text-[9px] text-gray-500 font-medium">
            {completedCount} {completedCount === 1 ? 'pedido listo' : 'pedidos listos'}
          </span>
        </button>
      </div>

      {/* 30-MIN & 10-MIN KITCHEN DELIVERY NOTIFICATION BANNERS */}
      {activeKitchenAlert && (
        <div
          className={`rounded-2xl p-3.5 border shadow-md flex items-start justify-between gap-3 transition-all ${
            activeKitchenAlert.type === '10m'
              ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
              : 'bg-amber-400 text-amber-950 border-amber-500'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {activeKitchenAlert.type === '10m' ? (
              <div className="p-2 rounded-xl bg-white/20 text-white shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-amber-950/15 text-amber-950 shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
            )}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider">
                  {activeKitchenAlert.type === '10m'
                    ? '🚨 ¡ALERTA 10 MINUTOS: PASE INMINENTE!'
                    : '⏰ ¡ALERTA 30 MINUTOS: MONTAR PLATO EN COCINA!'}
                </span>
              </div>
              <p className="text-xs leading-snug font-medium">
                Comanda <strong>{activeKitchenAlert.displayNumber}</strong> ({activeKitchenAlert.spotName}) •
                {activeKitchenAlert.type === '10m'
                  ? ` Quedan solo ${activeKitchenAlert.minutesRemaining} min para entrega (${activeKitchenAlert.formattedTime}). Preparar pase.`
                  : ` Faltan ${activeKitchenAlert.minutesRemaining} min para entrega (${activeKitchenAlert.formattedTime}). Montar plato ahora.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                if (activeKitchenAlert.type === '10m') {
                  soundService.playUrgent10MinAlert();
                } else {
                  soundService.playMountPlate30MinAlert();
                }
              }}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                activeKitchenAlert.type === '10m'
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-amber-950/15 hover:bg-amber-950/25 text-amber-950'
              }`}
              title="Volver a reproducir sonido de alerta"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveKitchenAlert(null)}
              className={`p-1.5 rounded-lg text-xs font-bold ${
                activeKitchenAlert.type === '10m'
                  ? 'hover:bg-white/20 text-white/80 hover:text-white'
                  : 'hover:bg-amber-950/15 text-amber-950/80 hover:text-amber-950'
              }`}
              title="Descartar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delivery Schedule Summary Bar */}
      <div className="bg-[#f0f5fa] border border-[#d2e4ff] rounded-2xl p-2.5 flex items-center justify-between text-xs text-[#002546]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#006782] shrink-0" />
          <span className="font-semibold text-[11px] sm:text-xs">
            Organizado por <strong>Hora de Entrega</strong> (Próximos primero)
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-bold text-[10px]">
          {countAlert10m > 0 && (
            <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              {countAlert10m} con &le;10m
            </span>
          )}
          {countAlert30m > 0 && (
            <span className="bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-900"></span>
              {countAlert30m} con &le;30m
            </span>
          )}
          {countAlert10m === 0 && countAlert30m === 0 && (
            <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              ✓ Ritmo a tiempo
            </span>
          )}
        </div>
      </div>

      {/* Maritime approaching alert if triggered */}
      {approachingAlertCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
            <Bell className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>¡Lancha en aproximación! Servir en 10 min en muelle.</span>
          </div>
          <button
            onClick={() => soundService.playBell()}
            className="p-1 rounded-md bg-amber-200 text-amber-900"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar Pargo, Mesa 4, Excursión 12, Toldo..."
          className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-300 bg-white text-xs text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782]"
        />
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterTab('in_fire')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            filterTab === 'in_fire'
              ? 'bg-[#002546] text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>En Fuego</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
            {inFireCount}
          </span>
        </button>

        <button
          onClick={() => setFilterTab('ready_pass')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            filterTab === 'ready_pass'
              ? 'bg-[#006782] text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
          <span>Listos ({readyCount})</span>
        </button>

        <button
          onClick={() => setFilterTab('history')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
            filterTab === 'history'
              ? 'bg-gray-800 text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Historial</span>
        </button>
      </div>

      {/* Quick Zone Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Todas las Zonas' },
          { id: 'beach', label: '🏖️ Toldos Playa' },
          { id: 'excursion', label: '⚓ Lanchas & Muelle' },
          { id: 'qr', label: '📱 Clientes QR' },
        ].map((z) => (
          <button
            key={z.id}
            onClick={() => {
              setZoneFilter(z.id as any);
              soundService.playBell();
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              zoneFilter === z.id
                ? 'bg-[#002546] text-white shadow-2xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {z.label}
          </button>
        ))}
      </div>

      {/* Live Prep Item Aggregator (Station Chef Summary) */}
      {itemsInFireSummary.length > 0 && (
        <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-xl p-2.5 space-y-2">
          <button
            onClick={() => setShowPrepAggregator(!showPrepAggregator)}
            className="w-full flex items-center justify-between text-xs font-bold text-[#006782]"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#006782]" />
              <span>
                Fogones Activos: {itemsInFireSummary.reduce((acc, c) => acc + c[1], 0)} platos en proceso
              </span>
            </div>
            <span className="text-[10px] font-semibold text-[#002546] bg-sky-100 hover:bg-sky-200 px-2 py-0.5 rounded">
              {showPrepAggregator ? 'Ocultar Resumen' : 'Ver Totales por Plato'}
            </span>
          </button>

          {showPrepAggregator && (
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[#bae6fd]/50">
              {itemsInFireSummary.map(([name, qty]) => (
                <span
                  key={name}
                  className="px-2.5 py-1 bg-white border border-[#bae6fd] rounded-lg text-xs font-bold text-[#002546] flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="w-5 h-5 rounded-full bg-[#002546] text-white text-[10px] flex items-center justify-center">
                    {qty}
                  </span>
                  <span>{name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Dispatch Notice */}
      {activeBannerNotice && (
        <div className="bg-[#57d1fd]/15 border border-[#57d1fd]/40 rounded-xl p-2.5 flex items-center justify-between text-xs text-[#002546]">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[#006782]" />
            <span className="font-semibold">{activeBannerNotice}</span>
          </div>
          <button
            onClick={() => setActiveBannerNotice(null)}
            className="text-gray-400 hover:text-gray-600 text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* KDS Cards List - Ordered by Scheduled Delivery Time */}
      <div className="space-y-3.5">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 p-6">
            <ChefHat className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-gray-700">Sin comandas en este estado</h4>
            <p className="text-xs text-gray-500 mt-1">
              Los pedidos entrantes aparecerán organizados por su hora de entrega programada.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isExcursion = order.origin === 'excursion';
            const isReadyOrDelivered = order.status === 'ready_pass' || order.status === 'delivered';
            const prepDuration = getOrderPrepDurationMinutes(order);

            // Calculate timing against delivery schedule
            const timing = getOrderDeliveryTiming(order, now);

            // Elapsed time calculation for active orders
            const currentElapsedMinutes = Math.floor(((order.elapsedSeconds || 420) + timerTicks) / 60);
            const isOverAverage = !isReadyOrDelivered && currentElapsedMinutes > roundedAverage;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md ${
                  timing.alertLevel === 'alert_10' && !isReadyOrDelivered
                    ? 'border-rose-400 ring-2 ring-rose-200'
                    : timing.alertLevel === 'alert_30' && !isReadyOrDelivered
                    ? 'border-amber-400 ring-1 ring-amber-200'
                    : 'border-gray-200'
                }`}
              >
                {/* Top Delivery Time Header (Prominent Scheduled Hour) */}
                <div
                  className={`px-3.5 py-2 flex justify-between items-center text-xs font-bold border-b ${
                    isReadyOrDelivered
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-100'
                      : timing.alertLevel === 'alert_10'
                      ? 'bg-rose-50 text-rose-950 border-rose-200'
                      : timing.alertLevel === 'alert_30'
                      ? 'bg-amber-50 text-amber-950 border-amber-200'
                      : 'bg-[#eff4ff] text-[#002546] border-[#d2e4ff]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] bg-white border border-gray-300 font-extrabold text-[#002546] uppercase">
                      {(order.spotName || '').split('•')[0]?.trim() || order.spotName || 'Mesa'}
                    </span>
                    <span className="text-[11px] text-gray-600 truncate max-w-[140px]">
                      {order.customerName}
                    </span>
                  </div>

                  {/* Scheduled Delivery Time Display */}
                  <div className="flex items-center gap-1.5">
                    <Clock className={`w-3.5 h-3.5 ${
                      timing.alertLevel === 'alert_10' ? 'text-rose-600' : 'text-[#006782]'
                    }`} />
                    <span className="font-extrabold text-xs">
                      Entrega: {timing.formattedTargetTime}
                    </span>
                    {!isReadyOrDelivered && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                          timing.minutesRemaining <= 10
                            ? 'bg-rose-600 text-white animate-pulse'
                            : timing.minutesRemaining <= 30
                            ? 'bg-amber-300 text-amber-950'
                            : 'bg-sky-100 text-[#006782]'
                        }`}
                      >
                        {timing.minutesRemaining <= 0
                          ? '¡Ahora!'
                          : `en ${timing.minutesRemaining}m`}
                      </span>
                    )}
                  </div>
                </div>

                {/* 30-Min or 10-Min Kitchen Action Banner on Card */}
                {!isReadyOrDelivered && timing.alertLevel === 'alert_10' && (
                  <div className="bg-rose-600 text-white px-3 py-1.5 text-xs font-black flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
                      <span>🚨 ¡QUEDAN {timing.minutesRemaining} MIN PARA ENTREGA! • PASE INMINENTE</span>
                    </div>
                    <button
                      onClick={() => soundService.playUrgent10MinAlert()}
                      className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px] font-bold flex items-center gap-1"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Sonido</span>
                    </button>
                  </div>
                )}

                {!isReadyOrDelivered && timing.alertLevel === 'alert_30' && (
                  <div className="bg-amber-400 text-amber-950 px-3 py-1.5 text-xs font-black flex items-center justify-between border-b border-amber-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-900" />
                      <span>⏰ FALTAN {timing.minutesRemaining} MIN • ALERTA PARA MONTAR EN COCINA</span>
                    </div>
                    <button
                      onClick={() => soundService.playMountPlate30MinAlert()}
                      className="px-2 py-0.5 bg-amber-950/20 hover:bg-amber-950/30 rounded text-[10px] font-bold flex items-center gap-1"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Sonido</span>
                    </button>
                  </div>
                )}

                {!isReadyOrDelivered && timing.alertLevel === 'overdue' && (
                  <div className="bg-rose-700 text-white px-3 py-1.5 text-xs font-black flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-300" />
                      <span>⚠️ HORA DE ENTREGA VENCIDA ({Math.abs(timing.minutesRemaining)} min atraso) • DESPACHAR YA</span>
                    </div>
                  </div>
                )}

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-base font-extrabold text-[#002546]">
                        {order.displayNumber}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {order.waiterName || 'Mesonero'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          order.status === 'in_fire'
                            ? 'bg-amber-100 text-amber-800'
                            : order.status === 'plated'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {order.status === 'in_fire'
                          ? 'En Fuego'
                          : order.status === 'plated'
                          ? 'Montado'
                          : 'Listo Pase'}
                      </span>
                    </div>
                  </div>

                  {/* Prep Duration Badge for Ready / Completed Orders */}
                  {isReadyOrDelivered && prepDuration !== null && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-emerald-900">
                        <Timer className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Tiempo total preparación:{' '}
                          <strong className="font-extrabold text-emerald-800">
                            {prepDuration} minutos
                          </strong>
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          prepDuration <= roundedAverage
                            ? 'bg-emerald-200/80 text-emerald-900'
                            : 'bg-amber-200/80 text-amber-900'
                        }`}
                      >
                        {prepDuration <= roundedAverage ? '✓ En Meta' : 'Demora Leve'}
                      </span>
                    </div>
                  )}

                  {/* Order Items Header & Batch Action */}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Platos de la Comanda:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleAllItems(order)}
                      className="text-[10px] font-bold text-[#006782] hover:text-[#002546] bg-[#eff4ff] hover:bg-[#dce9ff] px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                    >
                      <CheckSquare className="w-3 h-3 text-[#006782]" />
                      <span>{order.items.every((i) => checkedItems[i.id]) ? 'Desmarcar todos' : 'Marcar todos listos'}</span>
                    </button>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2">
                    {order.items.map((item) => {
                      const isChecked = Boolean(checkedItems[item.id]);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleItem(item.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                            isChecked
                              ? 'bg-gray-50 border-gray-200 opacity-60 line-through'
                              : 'bg-[#f8f9ff] border-gray-200 hover:border-[#006782]'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                              isChecked
                                ? 'bg-gray-300 text-gray-600'
                                : 'bg-[#002546] text-white'
                            }`}
                          >
                            {item.quantity}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-xs text-[#002546] block">
                              {item.name}
                            </span>
                            {item.specialNote && (
                              <div className="text-[11px] font-bold text-amber-800 mt-0.5 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>{item.specialNote}</span>
                              </div>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleItem(item.id)}
                            aria-label={`Marcar ${item.name} como listo`}
                            className="w-4 h-4 rounded text-[#006782] focus:ring-[#006782] shrink-0 mt-1 cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Delivery Schedule Control & Testing */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-gray-700 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-[#006782]" />
                        <span>Entrega Programada:</span>
                        <strong className="text-[#002546] font-bold ml-1">
                          {order.estimatedDeliveryTime || timing.formattedTargetTime}
                        </strong>
                      </div>
                      <button
                        onClick={() =>
                          setEditingDeliveryOrderId(
                            editingDeliveryOrderId === order.id ? null : order.id
                          )
                        }
                        className="text-[10px] font-bold text-[#006782] hover:text-[#002546] bg-white border border-gray-200 hover:border-[#006782] px-2 py-0.5 rounded-md transition-colors flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3" />
                        <span>{editingDeliveryOrderId === order.id ? 'Cerrar' : 'Cambiar / Probar'}</span>
                      </button>
                    </div>

                    {/* Expandable Timing Adjuster / Test Trigger */}
                    {editingDeliveryOrderId === order.id && (
                      <div className="pt-2 border-t border-gray-200 space-y-2 bg-white p-2.5 rounded-lg border">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                          Ajustar hora o probar alertas inmediatas:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          <button
                            onClick={() => handleUpdateDeliveryTime(order.id, 'En 8 min')}
                            className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-[10px] font-bold text-center transition-colors"
                          >
                            🚨 En 8 min (Alerta 10m)
                          </button>
                          <button
                            onClick={() => handleUpdateDeliveryTime(order.id, 'En 25 min')}
                            className="px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-bold text-center transition-colors"
                          >
                            ⏰ En 25 min (Alerta 30m)
                          </button>
                          <button
                            onClick={() => handleUpdateDeliveryTime(order.id, 'En 50 min')}
                            className="px-2 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-[10px] font-bold text-center transition-colors"
                          >
                            🕒 En 50 min
                          </button>
                          <button
                            onClick={() => handleUpdateDeliveryTime(order.id, 'Inmediato (~15 min)')}
                            className="px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 text-[10px] font-bold text-center transition-colors"
                          >
                            🚀 Inmediato
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="time"
                            value={customTimeInput}
                            onChange={(e) => setCustomTimeInput(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-xs text-[#002546] bg-white flex-1"
                          />
                          <button
                            onClick={() => {
                              if (customTimeInput) {
                                handleUpdateDeliveryTime(order.id, customTimeInput);
                              }
                            }}
                            className="px-3 py-1 bg-[#002546] text-white rounded text-xs font-bold hover:bg-[#0d3b66]"
                          >
                            Guardar Hora
                          </button>
                        </div>
                      </div>
                    )}

                    {order.orderNote && (
                      <div className="text-amber-900 text-[11px] pt-1 border-t border-gray-200 font-medium">
                        <span className="font-bold text-amber-950">Nota General: </span>
                        {order.orderNote}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Controls */}
                <div className="grid grid-cols-3 gap-1.5 p-3 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => handleStatusChange(order.id, 'in_fire')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      order.status === 'in_fire'
                        ? 'bg-[#eff4ff] text-[#002546] border border-[#a4c9fc]'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    <span>En Fuego</span>
                  </button>

                  <button
                    onClick={() => handleStatusChange(order.id, 'plated')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      order.status === 'plated'
                        ? 'bg-sky-100 text-[#006782] border border-[#57d1fd]'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Utensils className="w-3.5 h-3.5 text-sky-600" />
                    <span>Montado</span>
                  </button>

                  <button
                    onClick={() => handleStatusChange(order.id, 'ready_pass')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      order.status === 'ready_pass'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-[#002546] hover:bg-[#0d3b66] text-white shadow-xs'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Listo Pase</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Prep Time Analytics Modal */}
      {showPrepStatsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#006782] flex items-center justify-center font-bold">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#002546]">
                    Tiempo de Preparación KDS
                  </h3>
                  <p className="text-xs text-gray-500">
                    Métricas en tiempo real desde la recepción hasta 'Listo Pase'
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPrepStatsModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main KPI Highlight */}
            <div className="bg-gradient-to-br from-[#eff4ff] to-[#f8f9ff] border border-[#d2e4ff] rounded-2xl p-4 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[#006782] block mb-1">
                Tiempo Promedio Actual del Turno
              </span>
              <div className="text-4xl font-black text-[#002546] flex items-center justify-center gap-1.5">
                <span>{averagePrepMinutes}</span>
                <span className="text-xl font-bold text-gray-600">minutos</span>
              </div>
              <p className="text-xs text-gray-600 mt-2 max-w-sm mx-auto">
                Calculado a partir de {completedCount} {completedCount === 1 ? 'pedido completado' : 'pedidos completados'} hoy.
              </p>
            </div>

            {/* Fast and Slowest Benchmarks */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Más Rápido</span>
                </div>
                <div className="text-xl font-extrabold text-emerald-950">
                  {fastestOrder ? `${fastestOrder.durationMinutes} min` : '--'}
                </div>
                <span className="text-[11px] text-emerald-700 font-medium">
                  {fastestOrder ? `${fastestOrder.order.displayNumber} (${fastestOrder.order.spotName})` : 'Sin registros'}
                </span>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Mayor Demora</span>
                </div>
                <div className="text-xl font-extrabold text-amber-950">
                  {slowestOrder ? `${slowestOrder.durationMinutes} min` : '--'}
                </div>
                <span className="text-[11px] text-amber-800 font-medium">
                  {slowestOrder ? `${slowestOrder.order.displayNumber} (${slowestOrder.order.spotName})` : 'Sin registros'}
                </span>
              </div>
            </div>

            {/* Calculation Formula Explanation */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs text-gray-700 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[#002546]">
                <Info className="w-4 h-4 text-[#006782]" />
                <span>¿Cómo se calcula este tiempo?</span>
              </div>
              <p className="text-[11px] leading-relaxed text-gray-600">
                1. El cronómetro inicia automáticamente en cuanto la comanda entra al sistema (creada por mesonero, cliente QR o excursión).
              </p>
              <p className="text-[11px] leading-relaxed text-gray-600">
                2. Se detiene exactamente en el instante en que el cocinero o jefe de partida presiona el botón <strong>'Listo Pase'</strong>.
              </p>
              <p className="text-[11px] leading-relaxed text-gray-600">
                3. El promedio refleja la media de todas las comandas despachadas durante el turno actual.
              </p>
            </div>

            {/* List of Analyzed Completed Orders */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#002546]">
                Detalle de Pedidos Completados ({completedCount})
              </h4>
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {completedOrdersList.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">
                    Aún no hay comandas marcadas como listas en esta sesión.
                  </p>
                ) : (
                  completedOrdersList.map(({ order, durationMinutes }) => (
                    <div
                      key={order.id}
                      className="bg-white border border-gray-200 rounded-xl p-2.5 flex items-center justify-between text-xs hover:border-[#006782] transition-colors"
                    >
                      <div>
                        <div className="font-extrabold text-[#002546]">
                          {order.displayNumber}{' '}
                          <span className="font-normal text-gray-500">
                            • {order.spotName}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Recibido: {formatClockTime(order.createdAt) || '12:00 PM'}
                          {order.readyAt && ` ➔ Listo: ${formatClockTime(order.readyAt)}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-1 rounded-lg font-bold text-xs font-mono inline-block ${
                            durationMinutes <= roundedAverage
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {durationMinutes} min
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => setShowPrepStatsModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#002546] text-white text-xs font-bold hover:bg-[#0d3b66] transition-colors"
            >
              Cerrar Panel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


