import React, { useState, useEffect, useRef } from 'react';
import {
  Order,
  OrderStatus,
} from '../types';
import {
  getOrderDeliveryTiming,
  formatClockTimeFromDate,
  OrderDeliveryTimingInfo,
} from '../utils/deliveryTiming';
import { soundService } from '../services/soundService';
import { formatUsd, formatBsDirect } from '../utils/currencyFormatter';
import {
  Flame,
  Clock,
  Bell,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Utensils,
  Eye,
  Ship,
  Timer,
  Info,
  Check,
  Play
} from 'lucide-react';

interface OwnerKitchenMonitorProps {
  orders: Order[];
  onUpdateOrderStatus?: (orderId: string, newStatus: OrderStatus) => void;
  onUpdateOrder?: (updated: Order) => void;
  bcvRate: number;
  approachingAlertCount?: number;
}

export interface KitchenActiveAlert {
  id: string;
  orderId: string;
  displayNumber: string;
  spotName: string;
  minutesRemaining: number;
  type: 'alert_10' | 'alert_30' | 'new_order' | 'excursion';
  timestamp: string;
}

export const OwnerKitchenMonitor: React.FC<OwnerKitchenMonitorProps> = ({
  orders,
  onUpdateOrderStatus,
  onUpdateOrder,
  bcvRate,
  approachingAlertCount = 0,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'active' | 'in_fire' | 'ready_pass' | 'all'>('active');
  const [soundMuted, setSoundMuted] = useState(false);
  const [activeAlert, setActiveAlert] = useState<KitchenActiveAlert | null>(null);
  const [editingTimeOrderId, setEditingTimeOrderId] = useState<string | null>(null);
  const [customTimeInput, setCustomTimeInput] = useState('13:30');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Track already-triggered alerts to avoid looping audio on every second ticker
  const notified30MinSet = useRef<Set<string>>(new Set());
  const notified10MinSet = useRef<Set<string>>(new Set());
  const previousOrdersCountRef = useRef<number>(orders.length);

  // Timer ticker every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Monitor for new orders entering the kitchen
  useEffect(() => {
    if (orders.length > previousOrdersCountRef.current) {
      const latestOrder = orders[0];
      if (latestOrder) {
        if (!soundMuted) {
          soundService.playBell();
          soundService.buzzSmartBand();
        }
        setActiveAlert({
          id: 'new-' + Date.now(),
          orderId: latestOrder.id,
          displayNumber: latestOrder.displayNumber,
          spotName: latestOrder.spotName,
          minutesRemaining: 20,
          type: 'new_order',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    }
    previousOrdersCountRef.current = orders.length;
  }, [orders.length, soundMuted]);

  // Monitor active kitchen orders for 30m and 10m delivery countdown alerts
  useEffect(() => {
    const activeKitchenOrders = orders.filter(
      (o) => o.status === 'in_fire' || o.status === 'pending' || o.status === 'plated'
    );

    activeKitchenOrders.forEach((order) => {
      const timing = getOrderDeliveryTiming(order, currentTime);
      const mins = timing.minutesRemaining;

      // Check 10-min urgent alert (10 mins or less remaining)
      if (mins <= 10 && mins > 0) {
        if (!notified10MinSet.current.has(order.id)) {
          notified10MinSet.current.add(order.id);
          notified30MinSet.current.add(order.id); // Mark 30m as covered

          if (!soundMuted) {
            soundService.playUrgent10MinAlert();
            soundService.buzzSmartBand();
          }

          setActiveAlert({
            id: 'alert10-' + order.id + '-' + Date.now(),
            orderId: order.id,
            displayNumber: order.displayNumber,
            spotName: order.spotName,
            minutesRemaining: mins,
            type: 'alert_10',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
      }
      // Check 30-min alert (30 mins or less remaining, but > 10 min)
      else if (mins <= 30 && mins > 10) {
        if (!notified30MinSet.current.has(order.id)) {
          notified30MinSet.current.add(order.id);

          if (!soundMuted) {
            soundService.playMountPlate30MinAlert();
            soundService.buzzSmartBand();
          }

          setActiveAlert({
            id: 'alert30-' + order.id + '-' + Date.now(),
            orderId: order.id,
            displayNumber: order.displayNumber,
            spotName: order.spotName,
            minutesRemaining: mins,
            type: 'alert_30',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
      }
    });
  }, [orders, currentTime, soundMuted]);

  // Sort orders by target delivery time (earliest first for active orders)
  const sortedOrders = [...orders].sort((a, b) => {
    const isAFinished = a.status === 'ready_pass' || a.status === 'delivered';
    const isBFinished = b.status === 'ready_pass' || b.status === 'delivered';

    // Active orders always come first
    if (!isAFinished && isBFinished) return -1;
    if (isAFinished && !isBFinished) return 1;

    const timingA = getOrderDeliveryTiming(a, currentTime);
    const timingB = getOrderDeliveryTiming(b, currentTime);
    return timingA.targetDate.getTime() - timingB.targetDate.getTime();
  });

  // Filter orders by search & category
  const filteredOrders = sortedOrders.filter((ord) => {
    // Status filter
    if (filterCategory === 'active') {
      if (ord.status === 'delivered' || ord.status === 'cancelled') return false;
    } else if (filterCategory === 'in_fire') {
      if (ord.status !== 'in_fire' && ord.status !== 'pending') return false;
    } else if (filterCategory === 'ready_pass') {
      if (ord.status !== 'ready_pass' && ord.status !== 'plated') return false;
    }

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchNumber = ord.displayNumber.toLowerCase().includes(q);
    const matchSpot = ord.spotName.toLowerCase().includes(q);
    const matchCustomer = (ord.customerName || '').toLowerCase().includes(q);
    const matchWaiter = (ord.waiterName || '').toLowerCase().includes(q);
    const matchDish = ord.items.some((i) => i.name.toLowerCase().includes(q));
    return matchNumber || matchSpot || matchCustomer || matchWaiter || matchDish;
  });

  // KPI Calculations for the Owner
  const inFireCount = orders.filter((o) => o.status === 'in_fire' || o.status === 'pending').length;
  const readyPassCount = orders.filter((o) => o.status === 'ready_pass').length;
  const urgent10Count = orders.filter((o) => {
    if (o.status === 'delivered' || o.status === 'ready_pass' || o.status === 'cancelled') return false;
    const t = getOrderDeliveryTiming(o, currentTime);
    return t.minutesRemaining <= 10 && t.minutesRemaining > 0;
  }).length;
  const alert30Count = orders.filter((o) => {
    if (o.status === 'delivered' || o.status === 'ready_pass' || o.status === 'cancelled') return false;
    const t = getOrderDeliveryTiming(o, currentTime);
    return t.minutesRemaining <= 30 && t.minutesRemaining > 10;
  }).length;

  // Manual sound tests for the owner
  const handleTest30MinAlert = (order?: Order) => {
    soundService.playMountPlate30MinAlert();
    soundService.buzzSmartBand();
    setActiveAlert({
      id: 'test-30-' + Date.now(),
      orderId: order?.id || 'test-order',
      displayNumber: order?.displayNumber || '#PB-TEST',
      spotName: order?.spotName || 'Toldo 14 VIP',
      minutesRemaining: 28,
      type: 'alert_30',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  };

  const handleTest10MinAlert = (order?: Order) => {
    soundService.playUrgent10MinAlert();
    soundService.buzzSmartBand();
    setActiveAlert({
      id: 'test-10-' + Date.now(),
      orderId: order?.id || 'test-order',
      displayNumber: order?.displayNumber || '#PB-URGENT',
      spotName: order?.spotName || 'Toldo 12 • Churuata',
      minutesRemaining: 8,
      type: 'alert_10',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  };

  const handleTestKitchenBell = () => {
    soundService.playBell();
    soundService.buzzSmartBand();
    setActiveAlert({
      id: 'test-bell-' + Date.now(),
      orderId: 'new-incoming',
      displayNumber: '#PB-NUEVO',
      spotName: 'Muelle Posto VIP 2',
      minutesRemaining: 20,
      type: 'new_order',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  };

  // Quick delivery time adjustment
  const handleApplyPresetTime = (order: Order, minutesFromNow: number) => {
    const targetDate = new Date(Date.now() + minutesFromNow * 60000);
    const formatted = formatClockTimeFromDate(targetDate);
    if (onUpdateOrder) {
      onUpdateOrder({
        ...order,
        estimatedDeliveryTime: formatted,
        updatedAt: new Date().toISOString(),
      });
    }
    setEditingTimeOrderId(null);
    soundService.playSuccess();
  };

  const handleApplyCustomTime = (order: Order) => {
    if (!customTimeInput) return;
    const parts = customTimeInput.split(':');
    if (parts.length === 2) {
      let h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const meridiem = h >= 12 ? 'PM' : 'AM';
      const displayHours = h % 12 || 12;
      const formatted = `${displayHours.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${meridiem}`;

      if (onUpdateOrder) {
        onUpdateOrder({
          ...order,
          estimatedDeliveryTime: formatted,
          updatedAt: new Date().toISOString(),
        });
      }
      setEditingTimeOrderId(null);
      soundService.playSuccess();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in" id="owner-kitchen-monitor">
      {/* Header & Status Bar */}
      <div className="bg-[#002546] text-white rounded-2xl p-4 shadow-sm border border-[#0d3b66]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0d3b66] border border-[#57d1fd]/30 flex items-center justify-center text-[#57d1fd] shadow-inner">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Monitoreo de Cocina KDS</h2>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              </div>
              <p className="text-xs text-[#bbe9ff]">
                Control en tiempo real de fogones, tiempos de entrega y alertas de pase.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sound Toggle Button */}
            <button
              onClick={() => {
                setSoundMuted(!soundMuted);
                if (soundMuted) soundService.playBell();
              }}
              title={soundMuted ? 'Activar alertas sonoras de cocina' : 'Silenciar alertas sonoras'}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                soundMuted
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-[#57d1fd]/20 text-[#bbe9ff] border border-[#57d1fd]/40 hover:bg-[#57d1fd]/30'
              }`}
            >
              {soundMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Silenciado</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sonido Activo</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Audio Quick Test Strip for Owner */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1 text-[#bbe9ff] text-[11px]">
            <Bell className="w-3.5 h-3.5 text-[#57d1fd]" />
            <span>Probar alertas de cocina:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleTest30MinAlert()}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-400/30 text-[11px] font-bold hover:bg-amber-500/30 transition-colors flex items-center gap-1"
            >
              <span>⏰ Alerta 30m</span>
            </button>
            <button
              onClick={() => handleTest10MinAlert()}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-200 border border-rose-400/30 text-[11px] font-bold hover:bg-rose-500/30 transition-colors flex items-center gap-1"
            >
              <span>🚨 Alerta 10m</span>
            </button>
            <button
              onClick={handleTestKitchenBell}
              className="px-2.5 py-1 rounded-lg bg-[#57d1fd]/20 text-[#bbe9ff] border border-[#57d1fd]/30 text-[11px] font-bold hover:bg-[#57d1fd]/30 transition-colors flex items-center gap-1"
            >
              <span>🔔 Campana</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Alert Banner for the Owner */}
      {activeAlert && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-md animate-bounce-subtle ${
            activeAlert.type === 'alert_10'
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : activeAlert.type === 'alert_30'
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-sky-50 border-sky-300 text-sky-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                activeAlert.type === 'alert_10'
                  ? 'bg-rose-600 text-white animate-pulse'
                  : activeAlert.type === 'alert_30'
                  ? 'bg-amber-500 text-white animate-pulse'
                  : 'bg-sky-600 text-white'
              }`}
            >
              {activeAlert.type === 'alert_10' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : activeAlert.type === 'alert_30' ? (
                <Clock className="w-5 h-5" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs uppercase tracking-wide">
                  {activeAlert.type === 'alert_10'
                    ? '🚨 ¡Alerta 10 Minutos • Pase Inminente!'
                    : activeAlert.type === 'alert_30'
                    ? '⏰ ¡Alerta 30 Minutos • Montar en Cocina!'
                    : '🔔 ¡Nueva Comanda en Cocina!'}
                </span>
                <span className="text-[10px] opacity-75 font-mono">{activeAlert.timestamp}</span>
              </div>
              <p className="text-xs mt-0.5 font-medium">
                Comanda <strong className="font-bold">{activeAlert.displayNumber}</strong> ({activeAlert.spotName})
                {activeAlert.type === 'alert_10' && (
                  <span> — Quedan solo <strong>{activeAlert.minutesRemaining} minutos</strong> para la hora de entrega</span>
                )}
                {activeAlert.type === 'alert_30' && (
                  <span> — Faltan <strong>{activeAlert.minutesRemaining} minutos</strong>. Avisar al chef para montar plato</span>
                )}
                {activeAlert.type === 'new_order' && <span> — Ingresó al fogón y fue recibida por cocina</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                if (activeAlert.type === 'alert_10') soundService.playUrgent10MinAlert();
                else if (activeAlert.type === 'alert_30') soundService.playMountPlate30MinAlert();
                else soundService.playBell();
              }}
              title="Volver a reproducir sonido de alerta"
              className="p-1.5 rounded-lg bg-white/70 hover:bg-white text-gray-700 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveAlert(null)}
              className="px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white text-xs font-bold text-gray-800 shadow-xs transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Maritime excursion approaching alert if active */}
      {approachingAlertCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 text-amber-950 p-3 rounded-2xl flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <Ship className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>
              <strong>Alerta Muelle:</strong> Lancha de excursión a menos de 5 millas náuticas. Cocina debe apresurar comandas marítimas.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px]">
            Prioridad Alta
          </span>
        </div>
      )}

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-2xs text-center">
          <span className="text-[10px] uppercase font-bold text-gray-500 block">En Cocina</span>
          <span className="text-xl font-extrabold text-[#002546]">{inFireCount}</span>
          <span className="text-[10px] text-amber-600 font-bold flex items-center justify-center gap-0.5 mt-0.5">
            <Flame className="w-3 h-3" /> Fuego
          </span>
        </div>

        <div className="bg-rose-50 rounded-xl p-3 border border-rose-200 shadow-2xs text-center">
          <span className="text-[10px] uppercase font-bold text-rose-700 block">Alerta ≤10m</span>
          <span className="text-xl font-extrabold text-rose-950">{urgent10Count}</span>
          <span className="text-[10px] text-rose-600 font-bold flex items-center justify-center gap-0.5 mt-0.5">
            <AlertTriangle className="w-3 h-3" /> Pase Inminente
          </span>
        </div>

        <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 shadow-2xs text-center">
          <span className="text-[10px] uppercase font-bold text-amber-700 block">Alerta ≤30m</span>
          <span className="text-xl font-extrabold text-amber-950">{alert30Count}</span>
          <span className="text-[10px] text-amber-700 font-bold flex items-center justify-center gap-0.5 mt-0.5">
            <Clock className="w-3 h-3" /> Montar Plato
          </span>
        </div>

        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 shadow-2xs text-center">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Listo Pase</span>
          <span className="text-xl font-extrabold text-emerald-950">{readyPassCount}</span>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center justify-center gap-0.5 mt-0.5">
            <CheckCircle2 className="w-3 h-3" /> A Despachar
          </span>
        </div>
      </div>

      {/* Search & Category Filter Navigation */}
      <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-2xs space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por # comanda, plato, mesa o mesonero..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-[#002546] focus:outline-none focus:ring-1 focus:ring-[#006782] focus:bg-white"
          />
        </div>

        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterCategory('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterCategory === 'active'
                  ? 'bg-[#002546] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>Comandas Activas ({orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length})</span>
            </button>
            <button
              onClick={() => setFilterCategory('in_fire')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterCategory === 'in_fire'
                  ? 'bg-[#002546] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>En Fuego ({inFireCount})</span>
            </button>
            <button
              onClick={() => setFilterCategory('ready_pass')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterCategory === 'ready_pass'
                  ? 'bg-[#002546] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>Listos Pase ({readyPassCount})</span>
            </button>
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterCategory === 'all'
                  ? 'bg-[#002546] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>Todos ({orders.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-[#006782] font-semibold shrink-0 pl-2">
            Ordenado por: <strong className="font-bold">Hora de Entrega</strong>
          </div>
        </div>
      </div>

      {/* Orders List Feed */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
            <Utensils className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#002546]">No hay comandas en este criterio</h3>
            <p className="text-xs text-gray-500 mt-1">
              Las comandas que los clientes o mesoneros envíen a cocina aparecerán aquí ordenadas por su hora de entrega.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const timing: OrderDeliveryTimingInfo = getOrderDeliveryTiming(order, currentTime);
            const isFinished = order.status === 'ready_pass' || order.status === 'delivered';
            const isUrgent10 = !isFinished && timing.minutesRemaining <= 10 && timing.minutesRemaining > 0;
            const isAlert30 = !isFinished && timing.minutesRemaining <= 30 && timing.minutesRemaining > 10;
            const isOverdue = !isFinished && timing.minutesRemaining <= 0;
            const isExpanded = expandedOrderId === order.id;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
                  isUrgent10
                    ? 'border-rose-400 ring-2 ring-rose-500/20'
                    : isAlert30
                    ? 'border-amber-400 ring-2 ring-amber-500/20'
                    : order.status === 'ready_pass'
                    ? 'border-emerald-300 bg-emerald-50/10'
                    : 'border-gray-200 hover:border-[#006782]/40'
                }`}
              >
                {/* 10-Min Urgent Alert Banner on the Card */}
                {isUrgent10 && (
                  <div className="bg-rose-600 text-white px-3.5 py-1.5 text-xs font-bold flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-white" />
                      <span>🚨 ¡ALERTA 10 MIN! Pase inminente (Quedan {timing.minutesRemaining} min para entrega)</span>
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-wider bg-rose-800 px-2 py-0.5 rounded">
                      Pase Urgente
                    </span>
                  </div>
                )}

                {/* 30-Min Alert Banner on the Card */}
                {isAlert30 && (
                  <div className="bg-amber-500 text-white px-3.5 py-1.5 text-xs font-bold flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-white" />
                      <span>⏰ ALERTA 30 MIN: Montar plato en cocina (Faltan {timing.minutesRemaining} min)</span>
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-wider bg-amber-700 px-2 py-0.5 rounded">
                      Montar Plato
                    </span>
                  </div>
                )}

                {/* Overdue Alert Banner */}
                {isOverdue && (
                  <div className="bg-rose-700 text-white px-3.5 py-1.5 text-xs font-bold flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Timer className="w-4 h-4 text-white" />
                      <span>⚠️ Comanda sobre el horario de entrega estimado ({Math.abs(timing.minutesRemaining)} min tarde)</span>
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-wider bg-rose-900 px-2 py-0.5 rounded">
                      Demora
                    </span>
                  </div>
                )}

                {/* Card Main Header */}
                <div className="p-3.5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-[#002546]">
                          {order.displayNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#eff4ff] text-[#002546] border border-[#d2e4ff]">
                          {order.spotName}
                        </span>
                        {order.origin === 'client_qr' ? (
                          <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                            QR Cliente
                          </span>
                        ) : order.origin === 'excursion' ? (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                            Excursión
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            Mesonero POS
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                        {order.customerName && (
                          <span>Cliente: <strong className="text-gray-700">{order.customerName}</strong></span>
                        )}
                        {order.waiterName && (
                          <span>• Mesonero: <strong className="text-gray-700">{order.waiterName}</strong></span>
                        )}
                        <span>
                          • Recibido: {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                        </span>
                      </div>
                    </div>

                    {/* Target Delivery Time Badge */}
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#006782]" />
                        <span className="text-xs font-bold text-[#002546]">
                          Entrega: <strong className="text-sm font-mono font-black">{timing.formattedTargetTime}</strong>
                        </span>
                      </div>

                      {/* Countdown badge */}
                      <span
                        className={`mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono tracking-tight flex items-center gap-1 ${
                          isUrgent10
                            ? 'bg-rose-100 text-rose-900 animate-pulse'
                            : isAlert30
                            ? 'bg-amber-100 text-amber-900'
                            : isOverdue
                            ? 'bg-rose-100 text-rose-900 font-black'
                            : order.status === 'ready_pass'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-[#eff4ff] text-[#002546]'
                        }`}
                      >
                        {isFinished ? (
                          'Listo para mesa'
                        ) : isOverdue ? (
                          `Demorado (-${Math.abs(timing.minutesRemaining)} min)`
                        ) : isUrgent10 ? (
                          `🚨 En ${timing.minutesRemaining} min (Pase)`
                        ) : isAlert30 ? (
                          `⏰ En ${timing.minutesRemaining} min (Montar)`
                        ) : (
                          `En ${timing.minutesRemaining} min`
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Dishes and Items List */}
                  <div className="bg-[#f8f9ff] rounded-xl p-2.5 border border-gray-100 space-y-1.5">
                    {order.items.map((item, idx) => (
                      <div key={item.id || idx} className="flex items-start justify-between text-xs gap-2">
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-md bg-[#002546] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {item.quantity}x
                          </span>
                          <div>
                            <span className="font-bold text-[#002546] leading-tight">{item.name}</span>
                            {item.specialNote && (
                              <p className="text-[11px] text-amber-900 font-medium bg-amber-100/60 rounded px-1.5 py-0.5 mt-0.5 border border-amber-200/50">
                                📝 {item.specialNote}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-gray-500 shrink-0">
                          {formatUsd(item.unitPriceUsd * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Quick Controls & Status Modification Bar */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-gray-500">Estado:</span>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          order.status === 'in_fire'
                            ? 'bg-amber-100 text-amber-900'
                            : order.status === 'plated'
                            ? 'bg-sky-100 text-sky-900'
                            : order.status === 'ready_pass'
                            ? 'bg-emerald-100 text-emerald-900'
                            : order.status === 'delivered'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-yellow-100 text-yellow-900'
                        }`}
                      >
                        {order.status === 'in_fire'
                          ? 'En Fuego 🔥'
                          : order.status === 'plated'
                          ? 'Montado 🍽️'
                          : order.status === 'ready_pass'
                          ? 'Listo Pase ✅'
                          : order.status === 'delivered'
                          ? 'Entregado'
                          : 'Pendiente'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Owner quick transition buttons */}
                      {onUpdateOrderStatus && order.status !== 'ready_pass' && order.status !== 'delivered' && (
                        <button
                          onClick={() => onUpdateOrderStatus(order.id, 'ready_pass')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Marcar Listo</span>
                        </button>
                      )}

                      {/* Adjust delivery hour */}
                      <button
                        onClick={() =>
                          setEditingTimeOrderId(editingTimeOrderId === order.id ? null : order.id)
                        }
                        className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Clock className="w-3.5 h-3.5 text-[#006782]" />
                        <span>Ajustar Hora</span>
                      </button>

                      {/* Test alert specifically on this order */}
                      <button
                        onClick={() => handleTest30MinAlert(order)}
                        title="Probar alerta sonora en esta comanda"
                        className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Delivery Time Adjustment Sub-panel */}
                  {editingTimeOrderId === order.id && (
                    <div className="p-3 bg-white rounded-xl border border-[#d2e4ff] space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#002546]">
                          Reprogramar Hora de Entrega para {order.displayNumber}:
                        </span>
                        <button
                          onClick={() => setEditingTimeOrderId(null)}
                          className="text-[11px] text-gray-400 hover:text-gray-600 font-bold"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleApplyPresetTime(order, 10)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold hover:bg-rose-100"
                        >
                          🚨 En 10 min (Alerta)
                        </button>
                        <button
                          onClick={() => handleApplyPresetTime(order, 25)}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold hover:bg-amber-100"
                        >
                          ⏰ En 25 min (Montar)
                        </button>
                        <button
                          onClick={() => handleApplyPresetTime(order, 45)}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold"
                        >
                          En 45 min
                        </button>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="time"
                          value={customTimeInput}
                          onChange={(e) => setCustomTimeInput(e.target.value)}
                          className="h-8 px-2 rounded-lg border border-gray-300 text-xs font-mono font-bold text-[#002546]"
                        />
                        <button
                          onClick={() => handleApplyCustomTime(order)}
                          className="px-3 h-8 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-lg text-xs font-bold"
                        >
                          Fijar Hora
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
