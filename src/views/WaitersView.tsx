import React, { useState } from 'react';
import { MenuItem, Order, OrderItem, ToldoSpot, User } from '../types';
import { formatUsd, formatBsDirect } from '../utils/currencyFormatter';
import { soundService } from '../services/soundService';
import {
  Utensils,
  Send,
  Plus,
  Minus,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  Flame,
  CheckCircle,
  CreditCard,
  Banknote,
  Smartphone,
  AlertCircle,
  Edit3,
  Calculator,
  Users,
  Sparkles,
  Filter,
  Receipt,
  Share2,
  Copy,
  Zap,
  QrCode
} from 'lucide-react';
import { ComandaEditorModal } from '../components/ComandaEditorModal';
import { PreCuentaModal } from '../components/PreCuentaModal';

interface WaitersViewProps {
  waiterUser: User;
  menuItems: MenuItem[];
  spots: ToldoSpot[];
  orders: Order[];
  bcvRate: number;
  onSendOrderToKitchen: (newOrder: Order) => void;
  onOpenPaymentModal: (order: Order) => void;
  onUpdateOrder?: (updatedOrder: Order) => void;
  onOpenCalculator?: (initialTotal?: number) => void;
  onOpenToldoQrModal?: () => void;
}

export const WaitersView: React.FC<WaitersViewProps> = ({
  waiterUser,
  menuItems,
  spots,
  orders,
  bcvRate,
  onSendOrderToKitchen,
  onOpenPaymentModal,
  onUpdateOrder,
  onOpenCalculator,
  onOpenToldoQrModal,
}) => {
  const [selectedSpotId, setSelectedSpotId] = useState<string>(spots[0]?.id || 'spot-14');
  const [spotFilter, setSpotFilter] = useState<'all' | 'occupied' | 'free'>('all');
  const [splitCount, setSplitCount] = useState<number>(1);
  const [selectedTiming, setSelectedTiming] = useState<string>('Ahora (~15 min)');
  const [customTimeInput, setCustomTimeInput] = useState<string>('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Todo');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [allergyNote, setAllergyNote] = useState('');
  const [tipPercent, setTipPercent] = useState<number>(10);
  const [sendSuccessNotice, setSendSuccessNotice] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [preCuentaModalOrder, setPreCuentaModalOrder] = useState<any | null>(null);
  const [zoomedDish, setZoomedDish] = useState<MenuItem | null>(null);
  const [showAllDishes, setShowAllDishes] = useState<boolean>(false);
  const QUICK_MODIFIERS = [
    'Bien dorado',
    'Sin cebolla',
    'Tostones extra',
    'Salsa tártara aparte',
    'Poco picante',
    'Sin sal',
    'Limón extra',
    'Para llevar'
  ];

  const defaultSpot: ToldoSpot = {
    id: 'spot-14',
    number: '14',
    zone: 'beach',
    name: 'Toldo 14',
    typeDesc: 'Toldo Playa Doble',
    status: 'occupied',
    distanceDesc: 'A 15 metros del muelle',
    assignedWaiterId: 'user-carlos',
    assignedWaiterName: 'Carlos Gómez',
    capacity: 4,
  };
  const selectedSpot = spots.find((s) => s.id === selectedSpotId) || spots[0] || defaultSpot;

  const handleAddItem = (item: MenuItem) => {
    soundService.playFireAlert();
    setValidationError(null);
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: 'item-' + Date.now() + Math.random().toString(36).slice(2, 6),
          menuItemId: item.id,
          name: item.name,
          quantity: 1,
          unitPriceUsd: item.priceUsd,
          imageUrl: item.imageUrl,
          waiterShareUsd: item.waiterShareUsd || 0,
          specialNote: '',
        },
      ];
    });
  };

  const handleQuickPresetOrder = (presetName: string, defaultPrice: number, category: string) => {
    soundService.playBell();
    const existing = menuItems.find((m) => m.name.toLowerCase().includes(presetName.toLowerCase().slice(0, 5))) || {
      id: 'custom-' + presetName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: presetName,
      priceUsd: defaultPrice,
      category: category,
      imageUrl: '',
      isAvailable: true,
      description: 'Pedido frecuente en toldos',
      estimatedMinutes: '10-15 min',
    };
    handleAddItem(existing as any);
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setOrderItems((prev) =>
      prev
        .map((i) => (i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handleUpdateNote = (itemId: string, note: string) => {
    setOrderItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, specialNote: note } : i))
    );
  };

  const subtotalUsd = orderItems.reduce((acc, i) => acc + i.quantity * i.unitPriceUsd, 0);
  const tipUsd = (subtotalUsd * tipPercent) / 100;
  const totalUsd = subtotalUsd + tipUsd;
  const totalBs = totalUsd * bcvRate;

  const handleSubmitOrder = () => {
    if (orderItems.length === 0) {
      setValidationError('Agrega al menos un plato a la comanda antes de enviar a cocina.');
      setTimeout(() => setValidationError(null), 3500);
      return;
    }

    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      displayNumber: '#' + Math.floor(100 + Math.random() * 900),
      origin: 'waiter_pos',
      spotId: selectedSpot.id,
      spotName: `${selectedSpot.name} • ${selectedSpot.typeDesc}`,
      customerName: 'Comensal ' + selectedSpot.number,
      waiterId: waiterUser.id,
      waiterName: waiterUser.name,
      items: orderItems,
      subtotalUsd,
      tipPercent,
      tipUsd,
      totalUsd,
      totalBs,
      status: 'in_fire',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedDeliveryTime: selectedTiming,
      orderNote: allergyNote ? `Alergias/Req: ${allergyNote}` : undefined,
      kitchenStep: 2,
      elapsedSeconds: 15,
    };

    soundService.playBell();
    onSendOrderToKitchen(newOrder);

    // Reset drafting
    setOrderItems([]);
    setSendSuccessNotice(true);
    setTimeout(() => setSendSuccessNotice(false), 4000);
  };

  // Filtered menu: only dishes available for beach waiters (excludes dishes exclusive to excursions)
  const waiterEligibleMenuItems = menuItems.filter(
    (m) => m.menuTarget !== 'excursions' && m.isAvailable
  );

  const filteredMenu = waiterEligibleMenuItems.filter((m) => {
    const matchesCat =
      activeCategory === 'Todo' ||
      (activeCategory === 'Pescados & Mariscos' && (m.category === 'pescados' || m.category === 'mariscos')) ||
      (activeCategory === 'Entradas Playeras' && m.category === 'entradas') ||
      (activeCategory === 'Bebidas' && m.category === 'bebidas');
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Waiter recent orders
  const recentOrders = orders.filter((o) => o.waiterId === waiterUser.id || o.origin === 'waiter_pos').slice(0, 4);

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto pb-28 pt-2 px-3 overflow-x-hidden">
      {/* Waiter Profile & Shift Strip */}
      <div className="bg-[#002546] text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#eff4ff]/20 text-[#57d1fd] flex items-center justify-center font-bold text-base border border-white/20">
              {waiterUser?.name ? waiterUser.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'MO' : 'MO'}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#57d1fd] block">
                SERVICIO ACTIVO • {waiterUser?.zone || 'Zona Toldos Playa'}
              </span>
              <h2 className="text-base font-bold leading-tight">
                {waiterUser?.name || 'Mesonero'} • Turno Tarde
              </h2>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-1 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>En Línea</span>
          </div>
        </div>
      </div>

      {/* Alerta de Comandas Listas para Retirar en Cocina (Mesonero) */}
      {orders.filter((o) => o.status === 'ready_pass').length > 0 && (
        <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-950 p-3.5 rounded-2xl shadow-md space-y-2 animate-bounce-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <CheckCircle className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-emerald-900">
                  ¡Comanda Lista en Pase de Cocina!
                </h4>
                <p className="text-[11px] text-emerald-800">
                  {orders.filter((o) => o.status === 'ready_pass').length} comanda(s) listas para retirar y servir.
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase animate-pulse">
              Pase Activo
            </span>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-emerald-200/60">
            {orders
              .filter((o) => o.status === 'ready_pass')
              .map((readyOrd) => (
                <div
                  key={readyOrd.id}
                  className="bg-white/90 p-2.5 rounded-xl border border-emerald-300 flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-[#002546]">
                        {readyOrd.displayNumber}
                      </span>
                      <span className="text-xs font-bold text-emerald-800">
                        • {readyOrd.spotName}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {readyOrd.items.map((i) => `${i.quantity}x ${i.name}`).slice(0, 2).join(', ')}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (onUpdateOrder) {
                        onUpdateOrder({
                          ...readyOrd,
                          status: 'delivered',
                          updatedAt: new Date().toISOString(),
                        });
                        soundService.playSuccess();
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors shrink-0"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Entregar a Mesa</span>
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Selector Toldo / Mesa */}
      <div className="bg-white rounded-2xl p-3.5 border border-gray-200 shadow-xs space-y-2.5">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#002546] uppercase tracking-wider text-[11px]">
              Mesa / Toldo de Asignación
            </span>
            <span className="text-gray-400">•</span>
            <div className="flex items-center gap-1">
              {(['all', 'occupied', 'free'] as const).map((filterMode) => (
                <button
                  key={filterMode}
                  onClick={() => setSpotFilter(filterMode)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                    spotFilter === filterMode
                      ? 'bg-[#002546] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filterMode === 'all' ? 'Todos' : filterMode === 'occupied' ? 'Ocupados' : 'Libres'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#006782] font-semibold text-[11px]">
              {spots.filter(s => s.status !== 'occupied').length} Libres
            </span>
            {onOpenToldoQrModal && (
              <button
                onClick={onOpenToldoQrModal}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 border border-amber-500/40 text-[10px] font-bold transition-all cursor-pointer"
                title="Generar e imprimir QRs para los toldos"
              >
                <QrCode className="w-3 h-3 text-amber-700" />
                <span>QRs</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {spots
            .filter((s) => {
              if (spotFilter === 'occupied') return s.status === 'occupied';
              if (spotFilter === 'free') return s.status !== 'occupied';
              return true;
            })
            .map((spot) => (
            <button
              key={spot.id}
              onClick={() => setSelectedSpotId(spot.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center gap-1.5 ${
                selectedSpotId === spot.id
                  ? 'bg-[#002546] text-white border-[#002546] shadow-xs'
                  : 'bg-[#f8f9ff] text-[#002546] border-gray-200 hover:border-[#006782]'
              }`}
            >
              <span>{spot.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                selectedSpotId === spot.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {(spot.typeDesc || '').split('•')[0]?.trim() || spot.name}
              </span>
              {spot.status === 'occupied' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Ocupado" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Hora de Comida / Marcha */}
      <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-xs flex items-center justify-between gap-2 text-xs">
        <span className="text-gray-500 flex items-center gap-1 shrink-0 font-medium">
          <Clock className="w-3.5 h-3.5 text-[#006782]" /> Marcha:
        </span>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {['Inmediato', '1:30 PM', '2:00 PM', 'Por Turno'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTiming(t)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                selectedTiming === t
                  ? 'bg-[#006782] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Categories */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar pargo, tostones, coctel, ración..."
            className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-300 bg-white text-xs text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782]"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {['Todo', 'Pescados & Mariscos', 'Entradas Playeras', 'Bebidas'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                activeCategory === cat
                  ? 'bg-[#002546] text-white'
                  : 'bg-[#eff4ff] text-[#002546] hover:bg-[#dce9ff]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 1-Tap Quick Reorder Presets for Fast Beach Service */}
      <div className="bg-[#eff4ff] border border-[#d2e4ff] rounded-2xl p-3 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-[#002546] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Atajos 1-Toque (Combos Populares Playa):
          </span>
          <span className="text-[10px] text-gray-500">Carga directa a comanda</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickPresetOrder('Balde 6 Polar Pilsen', 12, 'bebidas')}
            className="p-2 bg-white hover:bg-[#dce9ff] border border-gray-200 rounded-xl text-left shadow-2xs transition-all active:scale-95"
          >
            <span className="text-xs font-bold text-[#002546] block">🍺 Balde 6 Polar</span>
            <span className="text-[10px] font-semibold text-[#006782]">$12.00</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickPresetOrder('Pargo Rojo Crispy Buche (~600g)', 24, 'pescados')}
            className="p-2 bg-white hover:bg-[#dce9ff] border border-gray-200 rounded-xl text-left shadow-2xs transition-all active:scale-95"
          >
            <span className="text-xs font-bold text-[#002546] block">🐟 Pargo Crispy</span>
            <span className="text-[10px] font-semibold text-[#006782]">$24.00</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickPresetOrder('Coco Loco Especial Buche', 9.5, 'bebidas')}
            className="p-2 bg-white hover:bg-[#dce9ff] border border-gray-200 rounded-xl text-left shadow-2xs transition-all active:scale-95"
          >
            <span className="text-xs font-bold text-[#002546] block">🥥 Coco Loco</span>
            <span className="text-[10px] font-semibold text-[#006782]">$9.50</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickPresetOrder('Tostones Playeros con Queso', 8, 'entradas')}
            className="p-2 bg-white hover:bg-[#dce9ff] border border-gray-200 rounded-xl text-left shadow-2xs transition-all active:scale-95"
          >
            <span className="text-xs font-bold text-[#002546] block">🍤 Tostones Buche</span>
            <span className="text-[10px] font-semibold text-[#006782]">$8.00</span>
          </button>
        </div>
      </div>

      {/* Platos Frecuentes / Catálogo con Fotos Playa Buche */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="text-xs font-bold text-[#002546] uppercase tracking-wider flex items-center gap-1.5">
              <span>🍽️</span> Catálogo de Platos con Fotos
            </h3>
            <span className="text-[10px] text-gray-500">
              {filteredMenu.length} platos disponibles • Toca la foto para ampliarla o el botón para agregar
            </span>
          </div>
          {filteredMenu.length > 6 && !searchTerm && activeCategory === 'Todo' && (
            <button
              onClick={() => setShowAllDishes((prev) => !prev)}
              className="text-[11px] font-bold text-[#006782] hover:underline bg-[#eff4ff] px-2.5 py-1 rounded-lg"
            >
              {showAllDishes ? 'Mostrar menos' : `Ver todos (${filteredMenu.length})`}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {(showAllDishes || searchTerm.trim() || activeCategory !== 'Todo'
            ? filteredMenu
            : filteredMenu.slice(0, 6)
          ).map((item) => (
            <div
              key={item.id}
              className="bg-white border border-gray-200 hover:border-[#006782] rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between group hover:shadow-md transition-all"
            >
              {/* Dish Photo with Overlays */}
              <div
                onClick={() => setZoomedDish(item)}
                className="relative h-28 sm:h-32 w-full bg-gray-100 overflow-hidden cursor-pointer"
                title="Toca para ver foto en grande"
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
                    Sin foto
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1">
                  <span className="text-[9px] font-bold uppercase bg-black/60 backdrop-blur-xs text-white px-1.5 py-0.5 rounded-md truncate">
                    {item.tag || item.category}
                  </span>
                  {item.waiterShareUsd && item.waiterShareUsd > 0 ? (
                    <span className="text-[9px] font-black text-amber-950 bg-amber-300/95 backdrop-blur-xs px-1.5 py-0.5 rounded-md shadow-xs shrink-0">
                      🤝 +${item.waiterShareUsd.toFixed(2)}
                    </span>
                  ) : null}
                </div>
                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-baseline justify-between text-white">
                  <span className="text-sm font-black drop-shadow-md">
                    {formatUsd(item.priceUsd)}
                  </span>
                  <span className="text-[10px] text-white/90 font-mono drop-shadow-xs">
                    {(item.priceUsd * bcvRate).toFixed(0)} Bs.
                  </span>
                </div>
              </div>

              {/* Dish Info */}
              <div className="p-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#002546] line-clamp-1 group-hover:text-[#006782]">
                    {item.name}
                  </h4>
                  <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                    {item.servingSize || item.description}
                  </p>
                </div>
                <div className="pt-2 mt-1.5 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => handleAddItem(item)}
                    className="w-full py-1.5 bg-[#eff4ff] hover:bg-[#002546] text-[#006782] hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors active:scale-95 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comanda en Proceso (Drafting) */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3.5">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#006782] flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#002546]">Comanda en Proceso</h3>
              <p className="text-[11px] text-[#006782] font-semibold">
                Destino: {selectedSpot.name} • {selectedSpot.typeDesc}
              </p>
            </div>
          </div>
          {orderItems.length > 0 && (
            <button
              onClick={() => setOrderItems([])}
              className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>

        {/* Estimated Kitchen Timer & Free Time Selector */}
        <div className="bg-[#eff4ff] border border-[#a4c9fc] rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between text-[#002546]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#006782]" />
              <div>
                <span className="font-bold block">Hora de Servicio / Fuego (Libre)</span>
                <span className="text-[10px] text-gray-500">Programa la hora exacta para la mesa</span>
              </div>
            </div>
            <span className="bg-[#002546] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
              {selectedTiming}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 font-bold text-[11px]">
            {['Ahora (~15 min)', '1:30 PM', '2:00 PM'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setSelectedTiming(preset);
                  setCustomTimeInput('');
                }}
                className={`py-1 rounded-lg border transition-all text-center ${
                  selectedTiming === preset && !customTimeInput
                    ? 'bg-[#006782] text-white border-[#006782] shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <input
              type="time"
              value={customTimeInput.includes(':') && !customTimeInput.includes('PM') && !customTimeInput.includes('AM') ? customTimeInput : ''}
              onChange={(e) => {
                if (e.target.value) {
                  setCustomTimeInput(e.target.value);
                  setSelectedTiming(e.target.value);
                }
              }}
              className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-[#002546] font-bold focus:outline-none focus:ring-1 focus:ring-[#006782]"
            />
            <input
              type="text"
              value={customTimeInput}
              onChange={(e) => {
                setCustomTimeInput(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedTiming(e.target.value.trim());
                }
              }}
              placeholder="O escribe hora libre: ej. 02:15 PM"
              className="flex-1 bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs text-[#002546] font-medium focus:outline-none focus:ring-1 focus:ring-[#006782]"
            />
          </div>
        </div>

        {/* Item Rows */}
        {orderItems.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs">
            No has agregado platos a esta comanda. Selecciona arriba para comenzar.
          </div>
        ) : (
          <div className="space-y-3">
            {orderItems.map((item) => {
              const dishInfo = menuItems.find(
                (m) => m.id === item.menuItemId || m.name.toLowerCase() === item.name.toLowerCase()
              );
              const photo = item.imageUrl || dishInfo?.imageUrl;
              return (
                <div key={item.id} className="bg-[#f8f9ff] border border-gray-200 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {photo ? (
                        <img
                          src={photo}
                          alt={item.name}
                          onClick={() => dishInfo && setZoomedDish(dishInfo)}
                          className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0 shadow-2xs cursor-pointer hover:opacity-90 transition-opacity"
                          title="Toca para ver foto ampliada"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 shrink-0">
                          🍽️
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-[#002546] truncate">{item.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-extrabold text-[#006782]">
                            {formatUsd(item.unitPriceUsd)} c/u
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            ({(item.unitPriceUsd * bcvRate).toFixed(0)} Bs.)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 px-1.5 py-0.5 shrink-0">
                      <button
                        onClick={() => handleUpdateQty(item.id, -1)}
                        className="p-1 hover:text-rose-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold min-w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="p-1 hover:text-[#006782]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                <input
                  type="text"
                  value={item.specialNote || ''}
                  onChange={(e) => handleUpdateNote(item.id, e.target.value)}
                  placeholder="Nota especial cocina: ej: bien dorado, salsa aparte..."
                  className="w-full text-[11px] bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#006782]"
                />

                {/* Quick 1-tap preset chips for beach waiters */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                  <span className="text-[9px] font-bold uppercase text-gray-400 shrink-0">Tags:</span>
                  {QUICK_MODIFIERS.map((mod) => {
                    const isApplied = (item.specialNote || '').includes(mod);
                    return (
                      <button
                        key={mod}
                        type="button"
                        onClick={() => {
                          const current = item.specialNote || '';
                          if (isApplied) {
                            const updated = current
                              .replace(mod, '')
                              .replace(/,\s*,/g, ',')
                              .replace(/^,\s*|\s*,\s*$/g, '')
                              .trim();
                            handleUpdateNote(item.id, updated);
                          } else {
                            const updated = current.trim() ? `${current}, ${mod}` : mod;
                            handleUpdateNote(item.id, updated);
                          }
                          soundService.playBell();
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-semibold whitespace-nowrap transition-colors ${
                          isApplied
                            ? 'bg-[#002546] text-white'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {mod}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Allergy Alert */}
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex items-center gap-2 text-rose-800 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <input
            type="text"
            value={allergyNote}
            onChange={(e) => setAllergyNote(e.target.value)}
            placeholder="Alergias o requerimientos especiales..."
            className="w-full bg-transparent text-xs text-rose-900 font-medium focus:outline-none"
          />
        </div>

        {/* Tip Selector */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-600 font-medium">Propina sugerida de servicio:</span>
          <div className="flex gap-1.5">
            {[10, 15, 20].map((pct) => (
              <button
                key={pct}
                onClick={() => setTipPercent(pct)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  tipPercent === pct
                    ? 'bg-[#002546] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {pct}% (${((subtotalUsd * pct) / 100).toFixed(2)})
              </button>
            ))}
          </div>
        </div>

        {/* Dual Currency Totals */}
        <div className="bg-[#eff4ff] border border-[#a4c9fc] rounded-xl p-3.5 space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-bold uppercase text-[#006782] tracking-wider">
              Total a Cobrar:
            </span>
            <span className="text-2xl font-extrabold text-[#002546]">
              {formatUsd(totalUsd)} <span className="text-xs font-semibold text-[#006782]">USD</span>
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-700 pt-0.5">
            <span className="text-[11px] text-gray-500">Tasa del día: {bcvRate.toFixed(2)} Bs/$</span>
            <span className="font-bold text-[#006782]">{formatBsDirect(totalBs)}</span>
          </div>

          {/* Quick Bill Splitter for Beach Groups */}
          <div className="pt-2 border-t border-[#d2e4ff] flex items-center justify-between text-xs">
            <span className="text-[#006782] font-bold text-[11px] flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Dividir cuenta:
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => setSplitCount(cnt)}
                  className={`w-6 h-6 rounded-md text-[11px] font-bold transition-all ${
                    splitCount === cnt
                      ? 'bg-[#002546] text-white shadow-2xs'
                      : 'bg-white text-gray-600 hover:bg-[#dce9ff]'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          </div>

          {splitCount > 1 && totalUsd > 0 && (
            <div className="bg-white/80 rounded-lg p-2 text-xs flex justify-between items-center text-[#002546]">
              <span className="text-[11px] font-semibold text-gray-600">
                Por persona ({splitCount}):
              </span>
              <div className="text-right">
                <span className="font-extrabold text-[#002546] font-mono">
                  {formatUsd(totalUsd / splitCount)}
                </span>
                <span className="text-[10px] text-gray-500 block font-mono">
                  ≈ {formatBsDirect((totalUsd / splitCount) * bcvRate)}
                </span>
              </div>
            </div>
          )}

          {/* Button to open Currency Calculator with this amount */}
          {onOpenCalculator && (
            <button
              onClick={() => onOpenCalculator(totalUsd)}
              className="w-full py-1.5 px-2.5 rounded-lg bg-white/90 hover:bg-white border border-[#a4c9fc] text-[#006782] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <Calculator className="w-3.5 h-3.5 text-[#006782]" />
              <span>Calcular Vuelto en Efectivo / Pago Móvil</span>
            </button>
          )}
        </div>

        {/* Quick payment options badges */}
        <div className="grid grid-cols-4 gap-1.5 text-[10px] text-center font-semibold text-gray-700">
          <div className="p-1.5 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center">
            <Banknote className="w-3.5 h-3.5 text-emerald-600 mb-0.5" />
            <span>Efectivo $</span>
          </div>
          <div className="p-1.5 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center">
            <Smartphone className="w-3.5 h-3.5 text-indigo-600 mb-0.5" />
            <span>Pago Móvil</span>
          </div>
          <div className="p-1.5 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center">
            <CreditCard className="w-3.5 h-3.5 text-sky-600 mb-0.5" />
            <span>Punto POS</span>
          </div>
          <div className="p-1.5 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center">
            <span className="font-extrabold text-[#002546] mb-0.5 text-xs">$</span>
            <span>Zelle Wire</span>
          </div>
        </div>

        {validationError && (
          <div className="bg-rose-50 border border-rose-300 text-rose-800 p-2.5 rounded-xl text-xs flex items-center gap-2 font-bold animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {sendSuccessNotice && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-2.5 rounded-xl text-xs flex items-center gap-2 font-bold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>¡Comanda enviada a Cocina KDS con campana sonora!</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              if (orderItems.length === 0) {
                setValidationError('Agrega al menos un plato para generar la pre-cuenta.');
                setTimeout(() => setValidationError(null), 3000);
                return;
              }
              setPreCuentaModalOrder({
                displayNumber: 'Borrador Toldo',
                spotName: selectedSpot.name,
                waiterName: waiterUser.name,
                items: orderItems,
                subtotalUsd,
                tipPercent,
                totalUsd,
              });
            }}
            className="h-12 bg-white hover:bg-gray-50 border-2 border-[#002546] text-[#002546] rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
          >
            <Receipt className="w-4 h-4 text-[#006782]" />
            <span>Pre-Cuenta Mesa</span>
          </button>

          <button
            onClick={handleSubmitOrder}
            disabled={orderItems.length === 0}
            className="h-12 bg-[#002546] hover:bg-[#0d3b66] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
          >
            <Send className="w-4 h-4 text-[#57d1fd]" />
            <span>Enviar a Cocina</span>
          </button>
        </div>
      </div>

      {/* Mis Comandas Recientes */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-[#002546] uppercase tracking-wider">
            Mis Comandas Recientes
          </h3>
          <span className="text-[11px] text-[#006782] font-semibold">
            {recentOrders.length} activas en playa
          </span>
        </div>

        <div className="space-y-2.5">
          {recentOrders.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-4 bg-white rounded-2xl border border-gray-200">
              No hay comandas recientes registradas en tu turno.
            </p>
          ) : (
            recentOrders.map((ord) => {
              const isPaid = ord.paymentStatus === 'verified' || ord.paymentStatus === 'paid';
              return (
                <div
                  key={ord.id}
                  className={`bg-white border rounded-2xl p-3.5 space-y-2.5 shadow-xs transition-all ${
                    isPaid ? 'border-emerald-300 bg-emerald-50/20' : 'border-gray-200 hover:border-[#006782]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-[#002546] text-[#57d1fd] font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {ord.displayNumber}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-[#002546] truncate">{ord.spotName}</span>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'ready_pass'
                                ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                                : ord.status === 'in_fire'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {isPaid
                              ? '✓ Cobrada (Pagada)'
                              : ord.status === 'ready_pass'
                              ? 'Listo en Pase'
                              : ord.status === 'in_fire'
                              ? 'En Fuego'
                              : 'En Proceso'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                          {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-[#002546] block font-mono">
                        {formatUsd(ord.totalUsd)}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {formatBsDirect(ord.totalUsd * bcvRate)}
                      </span>
                    </div>
                  </div>

                  {/* Actions Grid full-width */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setPreCuentaModalOrder(ord)}
                      className="h-9 px-2 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#006782] rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5 text-[#006782]" />
                      <span>Pre-Cuenta</span>
                    </button>

                    {!isPaid ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingOrder(ord)}
                          className="h-9 px-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#006782]" />
                          <span>Editar</span>
                        </button>

                        {ord.status === 'ready_pass' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateOrder) {
                                onUpdateOrder({
                                  ...ord,
                                  status: 'delivered',
                                  updatedAt: new Date().toISOString(),
                                });
                                soundService.playSuccess();
                              }
                            }}
                            className="h-9 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs animate-pulse transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Entregar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onOpenPaymentModal(ord)}
                          className={`h-9 px-2 bg-[#006782] hover:bg-[#005870] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer ${
                            ord.status === 'ready_pass' ? 'col-span-1' : 'col-span-1'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#57d1fd]" />
                          <span>Cobrar</span>
                        </button>
                      </>
                    ) : (
                      <div className="col-span-3 flex items-center justify-end">
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Cuenta Cerrada & Paz y Salvo
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal for editing sent comanda */}
      {editingOrder && (
        <ComandaEditorModal
          isOpen={Boolean(editingOrder)}
          order={editingOrder}
          menuItems={waiterEligibleMenuItems}
          bcvRate={bcvRate}
          userRoleTitle={`Mesonero (${waiterUser?.name || 'Turno'})`}
          onClose={() => setEditingOrder(null)}
          onSaveOrder={(updated) => {
            if (onUpdateOrder) {
              onUpdateOrder(updated);
            }
            setEditingOrder(null);
          }}
        />
      )}

      {/* Pre-cuenta / Ticket Preview Modal */}
      {preCuentaModalOrder && (
        <PreCuentaModal
          isOpen={Boolean(preCuentaModalOrder)}
          onClose={() => setPreCuentaModalOrder(null)}
          order={preCuentaModalOrder}
          bcvRate={bcvRate}
        />
      )}

      {/* Modal Foto de Alta Resolución del Plato */}
      {zoomedDish && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-200">
            <div className="relative h-64 w-full bg-gray-900">
              {zoomedDish.imageUrl ? (
                <img
                  src={zoomedDish.imageUrl}
                  alt={zoomedDish.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
                  Sin foto disponible
                </div>
              )}
              <button
                onClick={() => setZoomedDish(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center font-bold hover:bg-black/80 backdrop-blur-xs transition-colors"
              >
                ✕
              </button>
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase bg-black/70 text-white px-2.5 py-1 rounded-lg backdrop-blur-xs">
                  {zoomedDish.tag || zoomedDish.category}
                </span>
                <span className="text-base font-black text-white bg-black/70 px-3 py-1 rounded-lg backdrop-blur-xs drop-shadow-md">
                  {formatUsd(zoomedDish.priceUsd)}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <h3 className="text-base font-extrabold text-[#002546]">{zoomedDish.name}</h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{zoomedDish.description}</p>
                {zoomedDish.servingSize && (
                  <p className="text-[11px] text-gray-500 mt-1">🍽️ Porción: <b>{zoomedDish.servingSize}</b></p>
                )}
                {zoomedDish.waiterShareUsd && zoomedDish.waiterShareUsd > 0 ? (
                  <div className="mt-2 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 p-2 rounded-xl flex items-center gap-1.5">
                    <span>🤝</span>
                    <span>Comisión para el mesonero: +${zoomedDish.waiterShareUsd.toFixed(2)}</span>
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setZoomedDish(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAddItem(zoomedDish);
                    setZoomedDish(null);
                  }}
                  className="flex-1 py-2.5 bg-[#002546] hover:bg-[#0d3b66] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4 text-[#57d1fd]" />
                  <span>Agregar a Comanda</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
