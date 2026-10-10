import React, { useState } from 'react';
import { MenuItem, Order, OrderItem, SpotZone, ToldoSpot } from '../types';
import { formatUsd, formatBsDirect } from '../utils/currencyFormatter';
import { soundService } from '../services/soundService';
import {
  QrCode,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Search,
  Plus,
  Minus,
  Vibrate,
  Coffee,
  Receipt,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  HelpCircle,
  Info,
  Sliders,
  Edit3,
  Heart,
  BellRing
} from 'lucide-react';
import { OrderSyncEditor } from '../components/OrderSyncEditor';
import { ComandaEditorModal } from '../components/ComandaEditorModal';
import { PreCuentaModal } from '../components/PreCuentaModal';

interface ClientsViewProps {
  spots: ToldoSpot[];
  menuItems: MenuItem[];
  activeOrder: Order | null;
  clientName?: string;
  bcvRate: number;
  onSelectSpot: (spotId: string) => void;
  selectedSpotId: string;
  onPlaceOrder: (items: OrderItem[], spot: ToldoSpot, requestedTime?: string) => void;
  onOpenPaymentModal: (order: Order) => void;
  onOpenFiscalInvoice?: () => void;
  onUpdateOrder?: (updatedOrder: Order) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  spots,
  menuItems,
  activeOrder,
  clientName = 'Cliente',
  bcvRate,
  onSelectSpot,
  selectedSpotId,
  onPlaceOrder,
  onOpenPaymentModal,
  onOpenFiscalInvoice,
  onUpdateOrder,
}) => {
  const [activeZone, setActiveZone] = useState<SpotZone>('beach');
  const [activeSubTab, setActiveSubTab] = useState<'spots' | 'menu' | 'tracking'>('menu');
  const [orderDeliveryTime, setOrderDeliveryTime] = useState<string>('Ahora (~20 min)');
  const [isEditingActiveComanda, setIsEditingActiveComanda] = useState<boolean>(false);
  const [cart, setCart] = useState<Record<string, number>>({
    'm-pargo-crispy': 1,
    'm-ceviche': 1,
    'm-coco-loco': 1,
  });
  const [searchMenu, setSearchMenu] = useState('');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [menuCategoryFilter, setMenuCategoryFilter] = useState<string>('all');
  const [preCuentaModalOpen, setPreCuentaModalOpen] = useState<boolean>(false);
  const [buzzerActiveNotice, setBuzzerActiveNotice] = useState(false);
  const [extraNotice, setExtraNotice] = useState<string | null>(null);
  const [showKdsSyncEditor, setShowKdsSyncEditor] = useState<boolean>(false);

  const defaultClientSpot: ToldoSpot = {
    id: 'spot-14',
    number: '14',
    zone: 'beach',
    name: 'Toldo 14',
    typeDesc: 'Toldo Playa Doble',
    status: 'occupied',
    distanceDesc: 'A 15 metros del muelle',
    assignedWaiterId: '',
    assignedWaiterName: '',
    capacity: 4,
  };
  const selectedSpot = (spots && spots.find((s) => s.id === selectedSpotId)) || (spots && spots[0]) || defaultClientSpot;

  const firstName = clientName.split(' ')[0] || 'Cliente';

  const handleAddToCart = (item: MenuItem) => {
    soundService.playFireAlert();
    setCart((prev) => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1,
    }));
  };

  const handleUpdateCartQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const cartTotalUsd = (Object.entries(cart) as [string, number][]).reduce((acc, [id, qty]) => {
    const item = menuItems.find((m) => m.id === id);
    return acc + (item ? item.priceUsd * qty : 0);
  }, 0);

  const cartItemsCount: number = (Object.values(cart) as number[]).reduce((a: number, b: number) => a + b, 0);

  const handleCheckout = () => {
    if (cartItemsCount === 0) {
      setExtraNotice('Tu carrito está vacío. Elige tus platos playeros favoritos.');
      setTimeout(() => setExtraNotice(null), 3500);
      return;
    }

    const items: OrderItem[] = (Object.entries(cart) as [string, number][])
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const m = menuItems.find((item) => item.id === id);
        return {
          id: 'ci-' + Date.now() + Math.random().toString(36).slice(2, 6),
          menuItemId: m ? m.id : id,
          name: m ? m.name : 'Plato Playero',
          quantity: qty,
          unitPriceUsd: m ? m.priceUsd : 0,
        };
      });

    onPlaceOrder(items, selectedSpot, orderDeliveryTime);
    setActiveSubTab('tracking');
  };

  const handleCallWaiterBuzzer = () => {
    soundService.buzzSmartBand();
    setBuzzerActiveNotice(true);
    setTimeout(() => setBuzzerActiveNotice(false), 4500);
  };

  const handleQuickExtra = (extraName: string) => {
    soundService.buzzSmartBand();
    setExtraNotice(`Solicitud de ${extraName} enviada a ${selectedSpot.assignedWaiterName}.`);
    setTimeout(() => setExtraNotice(null), 4000);
  };

  const filteredSpots = spots.filter((s) => s.zone === activeZone);

  const filteredMenu = menuItems.filter((m) => {
    // Exclude excursion-only packages from regular beach clients
    if (m.menuTarget === 'excursions') return false;
    const matchesSearch =
      m.name.toLowerCase().includes(searchMenu.toLowerCase()) ||
      m.description.toLowerCase().includes(searchMenu.toLowerCase());
    if (!matchesSearch) return false;
    if (menuCategoryFilter === 'fav') return Boolean(favorites[m.id]);
    if (menuCategoryFilter !== 'all' && m.category !== menuCategoryFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4 max-w-lg mx-auto pb-28 pt-2 px-3">
      {/* Saludo & Identidad Marina con Medallón */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center gap-3.5 relative overflow-hidden">
        <div className="w-14 h-14 rounded-full p-1 bg-[#eff4ff] border border-[#d2e4ff] flex items-center justify-center shrink-0 shadow-xs">
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#002546] to-[#006782] text-white flex items-center justify-center font-bold text-xs">
            BUCHE
          </div>
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-[#006782] animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#006782]">
              Bahía de Buche • Carenero
            </span>
          </div>
          <h1 className="text-base font-bold text-[#002546] leading-tight">
            ¡Hola, {firstName}!
          </h1>
          <p className="text-xs text-gray-500 line-clamp-1">
            ¿Dónde te llevamos tu servicio hoy?
          </p>
        </div>
      </div>

      {/* Alerta de Pedido Listo para el Cliente */}
      {activeOrder?.status === 'ready_pass' && (
        <div className="bg-emerald-500 text-white p-3.5 rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-bounce-subtle">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-white text-emerald-700 flex items-center justify-center font-black">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <div>
              <span className="font-black text-xs uppercase tracking-wide block">
                🎉 ¡Tu Comanda {activeOrder.displayNumber} está LISTA!
              </span>
              <p className="text-xs text-emerald-100 font-medium leading-snug">
                La cocina terminó tus platos y el mesonero los lleva hacia tu {selectedSpot.name}.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveSubTab('tracking')}
            className="px-2.5 py-1 bg-white text-emerald-800 text-xs font-bold rounded-lg shadow-xs shrink-0 hover:bg-emerald-50"
          >
            Ver Rastreo
          </button>
        </div>
      )}

      {activeOrder?.status === 'delivered' && (
        <div className="bg-[#002546] text-[#57d1fd] p-3 rounded-2xl border border-[#57d1fd]/40 flex items-center gap-2.5 shadow-sm text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            ✨ <strong>¡Pedido entregado en tu mesa!</strong> Buen provecho en Bahía de Buche.
          </span>
        </div>
      )}

      {extraNotice && (
        <div className="bg-sky-50 border border-sky-300 text-sky-900 text-xs p-3 rounded-xl font-bold text-center flex items-center justify-center gap-2 animate-fade-in shadow-xs">
          <Info className="w-4 h-4 text-[#006782] shrink-0" />
          <span>{extraNotice}</span>
        </div>
      )}

      {/* Sub Navigation: Ubicación Toldo vs Menú vs Seguimiento Pedido */}
      <div className="flex bg-[#eff4ff] p-1 rounded-2xl border border-[#d2e4ff]">
        <button
          onClick={() => setActiveSubTab('spots')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'spots'
              ? 'bg-[#002546] text-white shadow-xs'
              : 'text-[#42474f] hover:text-[#002546]'
          }`}
        >
          1. Mi Toldo ({selectedSpot.number})
        </button>
        <button
          onClick={() => setActiveSubTab('menu')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'menu'
              ? 'bg-[#002546] text-white shadow-xs'
              : 'text-[#42474f] hover:text-[#002546]'
          }`}
        >
          2. Menú & Carta ({cartItemsCount})
        </button>
        <button
          onClick={() => setActiveSubTab('tracking')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'tracking'
              ? 'bg-[#002546] text-white shadow-xs'
              : 'text-[#42474f] hover:text-[#002546]'
          }`}
        >
          3. Rastrear Pedido
        </button>
      </div>

      {/* ========== SUBTAB 1: SELECTOR DE TOLDOS & ZONAS ========== */}
      {activeSubTab === 'spots' && (
        <div className="space-y-4">
          {/* Banner Acceso Instantáneo QR */}
          <div className="bg-[#002546] text-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#57d1fd]">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold block">¿Estás en tu toldo?</span>
                <span className="text-[11px] text-gray-300">Escanea la chapa de bronce numerada</span>
              </div>
            </div>
            <button
              onClick={() => {
                soundService.playBell();
                const target = spots.find((s) => s.status !== 'occupied') || spots[0];
                if (target) {
                  onSelectSpot(target.id);
                  setExtraNotice(`Ubicación asignada: ${target.name} (${target.number})`);
                  setTimeout(() => setExtraNotice(null), 4000);
                }
              }}
              className="px-3.5 py-2 bg-[#006782] hover:bg-[#005870] text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
            >
              Escanear
            </button>
          </div>

          {/* Selector de Zonas */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-[#002546] uppercase tracking-wider text-[11px]">
                Selecciona tu Zona
              </span>
              <span className="text-[#006782] font-semibold text-[11px]">
                {spots.filter((s) => s.zone === activeZone && s.status !== 'occupied').length} Libres Ahora
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'beach', label: 'Toldos Playa (Arena)' },
                { id: 'churuata', label: 'Churuata & Bar Central' },
                { id: 'muelle', label: 'Muelle VIP & Yates' },
              ].map((z) => (
                <button
                  key={z.id}
                  onClick={() => setActiveZone(z.id as SpotZone)}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold shrink-0 transition-all ${
                    activeZone === z.id
                      ? 'bg-[#002546] text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </div>

          {/* Spots Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {filteredSpots.map((spot) => {
              const isSelected = spot.id === selectedSpotId;
              const isOccupied = spot.status === 'occupied';
              return (
                <button
                  key={spot.id}
                  disabled={isOccupied}
                  onClick={() => onSelectSpot(spot.id)}
                  className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between h-28 relative ${
                    isSelected
                      ? 'bg-[#002546] text-white border-[#002546] shadow-md'
                      : isOccupied
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-[#002546] border-gray-200 hover:border-[#006782]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                        isSelected ? 'bg-[#006782] text-white' : 'bg-gray-200 text-gray-800'
                      }`}>
                        #{spot.number}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        isSelected ? 'text-[#a4c9fc]' : 'text-gray-500'
                      }`}>
                        {isOccupied ? 'Ocupado' : isSelected ? 'Tu Selección' : 'Disponible'}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#57d1fd] text-[#002546] flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-xs leading-tight">{spot.name}</h3>
                    <p className={`text-[10px] line-clamp-1 mt-0.5 ${isSelected ? 'text-gray-200' : 'text-gray-500'}`}>
                      {spot.typeDesc}
                    </p>
                  </div>

                  <div className={`text-[10px] pt-1 border-t flex justify-between ${
                    isSelected ? 'border-white/15 text-[#57d1fd]' : 'border-gray-100 text-gray-500'
                  }`}>
                    <span>{spot.distanceDesc}</span>
                    <span className="font-bold">{isOccupied ? 'No disponible' : isSelected ? 'Tu Lugar' : 'Elegir'}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected spot confirmation banner */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#006782]">Ubicación Confirmada</span>
                <h4 className="text-sm font-bold text-[#002546]">{selectedSpot.name}</h4>
                <p className="text-xs text-gray-500">{selectedSpot.typeDesc} • {selectedSpot.distanceDesc}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 block">Tu Mesonero Asignado</span>
                <span className="text-xs font-bold text-[#002546]">{selectedSpot.assignedWaiterName}</span>
              </div>
            </div>

            <button
              onClick={() => setActiveSubTab('menu')}
              className="w-full h-11 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <span>Confirmar Ubicación e Ir al Menú</span>
              <ArrowRight className="w-4 h-4 text-[#57d1fd]" />
            </button>
          </div>
        </div>
      )}

      {/* ========== SUBTAB 2: MENÚ DIGITAL & CARRITO ========== */}
      {activeSubTab === 'menu' && (
        <div className="space-y-4">
          {/* Active spot pill */}
          <div className="bg-[#002546] text-white rounded-2xl p-3 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#57d1fd] animate-pulse"></span>
              <span>Ordenando para: <b>{selectedSpot.name}</b></span>
            </div>
            <button
              onClick={() => setActiveSubTab('spots')}
              className="text-[#57d1fd] hover:underline font-bold text-[11px]"
            >
              Cambiar Toldo
            </button>
          </div>

          {/* Quick Beach Assistance Bar */}
          <div className="bg-[#eff4ff] border border-[#d2e4ff] rounded-2xl p-3 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-[#002546] flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-[#006782]" /> Asistencia en Toldo:
              </span>
              <span className="text-[10px] text-gray-500">Mesonero: {selectedSpot.assignedWaiterName}</span>
            </div>
            <div className="grid grid-cols-5 gap-1 text-[10px] font-bold text-center">
              <button
                type="button"
                onClick={handleCallWaiterBuzzer}
                className="p-1.5 bg-white hover:bg-amber-50 rounded-xl border border-gray-200 flex flex-col items-center transition-colors"
              >
                <span className="text-sm">🛎️</span>
                <span className="text-gray-700">Llamar</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickExtra('Balde de Hielo')}
                className="p-1.5 bg-white hover:bg-sky-50 rounded-xl border border-gray-200 flex flex-col items-center transition-colors"
              >
                <span className="text-sm">🧊</span>
                <span className="text-gray-700">Hielo</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickExtra('Limones y Salsa')}
                className="p-1.5 bg-white hover:bg-emerald-50 rounded-xl border border-gray-200 flex flex-col items-center transition-colors"
              >
                <span className="text-sm">🍋</span>
                <span className="text-gray-700">Limones</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickExtra('Limpieza de Mesa')}
                className="p-1.5 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 flex flex-col items-center transition-colors"
              >
                <span className="text-sm">🧹</span>
                <span className="text-gray-700">Limpiar</span>
              </button>
              <button
                type="button"
                onClick={() => setPreCuentaModalOpen(true)}
                className="p-1.5 bg-white hover:bg-indigo-50 rounded-xl border border-gray-200 flex flex-col items-center transition-colors"
              >
                <span className="text-sm">🧾</span>
                <span className="text-gray-700">Cuenta</span>
              </button>
            </div>
          </div>

          {/* Search bar & Category chips */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={searchMenu}
                onChange={(e) => setSearchMenu(e.target.value)}
                placeholder="Busca tu pescado, cóctel, entrada o postre..."
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-300 bg-white text-xs text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782]"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'all', label: 'Todo el Menú' },
                { id: 'fish', label: '🐟 Pescados' },
                { id: 'seafood', label: '🍤 Marisquería' },
                { id: 'drinks', label: '🍹 Cocteles' },
                { id: 'sides', label: '🍟 Para Picar' },
                { id: 'fav', label: `❤️ Favoritos (${Object.values(favorites).filter(Boolean).length})` },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setMenuCategoryFilter(cat.id);
                    soundService.playBell();
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    menuCategoryFilter === cat.id
                      ? 'bg-[#002546] text-white shadow-2xs'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dishes List with rich photographs */}
          <div className="space-y-3.5">
            {filteredMenu.map((item) => {
              const inCartQty = cart[item.id] || 0;
              const isFav = Boolean(favorites[item.id]);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-sm transition-all"
                >
                  <div className="relative h-40 w-full overflow-hidden bg-gray-100">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-[#002546]/80 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      {item.tag || item.category}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFavorites((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                        soundService.playBell();
                      }}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-md transition-transform active:scale-90"
                      title={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'text-rose-500 fill-rose-500' : 'text-gray-400'}`} />
                    </button>

                    <div className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-xs text-[#002546] text-sm font-extrabold px-3 py-1 rounded-xl shadow-md">
                      {formatUsd(item.priceUsd)}
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-sm text-[#002546]">{item.name}</h3>
                      <span className="text-[11px] text-gray-500">{item.servingSize}</span>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#006782]" /> {item.estimatedMinutes}
                      </span>

                      {inCartQty > 0 ? (
                        <div className="flex items-center gap-2 bg-[#eff4ff] rounded-xl border border-[#d2e4ff] px-2 py-1">
                          <button
                            onClick={() => handleUpdateCartQty(item.id, -1)}
                            className="p-1 hover:text-rose-600"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-[#002546] min-w-4 text-center">
                            {inCartQty}
                          </span>
                          <button
                            onClick={() => handleUpdateCartQty(item.id, 1)}
                            className="p-1 hover:text-[#006782]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="px-3.5 py-1.5 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#57d1fd]" />
                          <span>Agregar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Cart CTA Banner */}
          {cartItemsCount > 0 && (
            <div className="sticky bottom-20 z-40 bg-[#002546] text-white rounded-2xl p-3.5 shadow-xl flex flex-col gap-2.5 animate-fade-in">
              {/* Free delivery time selector for Client */}
              <div className="bg-white/10 rounded-xl p-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-sky-200">
                  <Clock className="w-3.5 h-3.5 text-[#57d1fd]" />
                  <span className="text-[11px] font-bold uppercase">Hora de Entrega Libre:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={orderDeliveryTime.includes(':') && !orderDeliveryTime.includes('PM') && !orderDeliveryTime.includes('AM') ? orderDeliveryTime : ''}
                    onChange={(e) => {
                      if (e.target.value) setOrderDeliveryTime(e.target.value);
                    }}
                    className="bg-white text-[#002546] font-bold text-xs rounded-lg px-2 py-0.5 shadow-xs"
                  />
                  <span className="text-xs font-bold text-[#57d1fd]">{orderDeliveryTime}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#57d1fd] text-[#002546] font-extrabold text-sm flex items-center justify-center">
                    {cartItemsCount}
                  </div>
                  <div>
                    <span className="text-[10px] text-sky-200 block uppercase font-bold">
                      Toldo #{selectedSpot.number} • Entrega en playa
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black">{formatUsd(cartTotalUsd)}</span>
                      <span className="text-xs text-sky-200 font-mono">
                        ≈ {formatBsDirect(cartTotalUsd * bcvRate)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="h-11 px-4 bg-[#006782] hover:bg-[#005870] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                >
                  <span>Pedir Ahora</span>
                  <ArrowRight className="w-4 h-4 text-[#57d1fd]" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== SUBTAB 3: RASTREO EN VIVO & CUENTA DIGITAL ========== */}
      {activeSubTab === 'tracking' && (
        <div className="space-y-4">
          {/* Order Live Badge & Location */}
          <div className="bg-[#002546] text-white rounded-2xl p-4 shadow-sm relative overflow-hidden space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-[#a4c9fc] font-bold uppercase tracking-wider">
                  Sector Orilla Este • Carenero
                </span>
                <h2 className="text-xl font-bold mt-0.5">
                  {activeOrder?.spotName || selectedSpot.name}
                </h2>
                <p className="text-xs text-gray-300">{activeOrder?.customerName || clientName}</p>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 border border-amber-300/30 px-2.5 py-1 rounded-full text-xs font-bold">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>En Fuego & Cocina</span>
              </div>
            </div>

            <div className="bg-white/10 rounded-xl p-3 flex justify-between items-center backdrop-blur-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#006782] flex items-center justify-center text-white">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase text-sky-300 font-bold block">
                    Tiempo Estimado Restante
                  </span>
                  <span className="text-base font-extrabold text-white">12 - 15 min</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-300 block">Hora Entrega</span>
                <span className="text-xs font-bold text-[#57d1fd]">1:15 PM</span>
              </div>
            </div>
          </div>

          {/* Toggle between Stepper Tracking and Live Comanda KDS Editor */}
          <div className="flex bg-[#eff4ff] p-1 rounded-xl border border-[#d2e4ff]">
            <button
              onClick={() => setShowKdsSyncEditor(false)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                !showKdsSyncEditor ? 'bg-white text-[#002546] shadow-xs' : 'text-[#42474f] hover:text-[#002546]'
              }`}
            >
              Rastreo & Estado de Entrega
            </button>
            <button
              onClick={() => setShowKdsSyncEditor(true)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                showKdsSyncEditor ? 'bg-[#002546] text-white shadow-xs' : 'text-[#42474f] hover:text-[#002546]'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-[#57d1fd]" />
              <span>Editar Comanda (#1048)</span>
            </button>
          </div>

          {showKdsSyncEditor ? (
            <OrderSyncEditor bcvRate={bcvRate} />
          ) : (
            <>
              {/* Direct Comanda Quick Action Button */}
              <button
                type="button"
                onClick={() => setIsEditingActiveComanda(true)}
                className="w-full py-2.5 px-3.5 bg-white hover:bg-[#eff4ff] border-2 border-[#006782] text-[#006782] rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99]"
              >
                <Edit3 className="w-4 h-4 text-[#006782]" />
                <span>Modificar Mi Comanda (Anexar, quitar platos, cambiar hora o nota)</span>
              </button>

              {/* Stepper Timeline (Vertical) */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-xs font-bold text-[#002546] uppercase tracking-wider">
                Estado de tu Orden
              </h3>
              <span className="text-xs font-bold text-[#006782]">Paso 2 de 4</span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-[#002546]">Comanda Confirmada</span>
                    <span className="text-[11px] text-gray-500">1:32 PM</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Registrado en sistema con caja central</p>
                </div>
              </div>

              {/* Step 2 (Active) */}
              <div className="flex items-start gap-3 bg-[#eff4ff] p-2.5 rounded-xl border border-[#a4c9fc]">
                <div className="w-7 h-7 rounded-full bg-[#002546] text-[#57d1fd] flex items-center justify-center shrink-0 animate-pulse">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-[#002546]">En Cocina & Fuego</span>
                    <span className="text-[11px] font-bold text-[#006782]">En Proceso</span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">Paila #2 y Freidora #1 marchando a fuego vivo</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 opacity-60">
                <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">En Pasaplatos & Control Calidad</span>
                    <span className="text-[11px] text-gray-400">Pendiente</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Toque de limón caribeño y guarniciones crujientes</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 opacity-60">
                <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Mesonero Yender en camino</span>
                    <span className="text-[11px] text-gray-400">Paso final</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Bandeja térmica con servicio directo a la arena</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mesonero Card & Quick Action Buzzer */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#002546] text-white flex items-center justify-center font-bold text-sm">
                  YR
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#006782]">Tu Mesonero de Playa</span>
                  <h4 className="font-bold text-sm text-[#002546]">Yender Rodríguez</h4>
                  <span className="text-[11px] text-gray-500">Atento a tu toldo • Sector Orilla Este</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCallWaiterBuzzer}
                className="h-11 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Vibrate className="w-4 h-4 text-[#57d1fd]" />
                <span>Llamar a Yender</span>
              </button>
              <button
                onClick={() => handleQuickExtra('Hielo y Limón')}
                className="h-11 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002546] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Coffee className="w-4 h-4 text-[#006782]" />
                <span>Pedir Hielo / Limón</span>
              </button>
            </div>

            {buzzerActiveNotice && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs p-2.5 rounded-xl font-bold text-center animate-fade-in">
                ¡Vibración enviada a su Smart Band! Yender viene hacia el Toldo #14.
              </div>
            )}

            {extraNotice && (
              <div className="bg-sky-50 border border-sky-300 text-sky-900 text-xs p-2.5 rounded-xl font-semibold text-center animate-fade-in">
                {extraNotice}
              </div>
            )}
          </div>

          {/* Cuenta & Factura Digital */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3.5">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#006782]" />
                <h3 className="text-xs font-bold text-[#002546] uppercase tracking-wider">
                  Cuenta & Factura Digital
                </h3>
              </div>
              <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold">
                EN MESA
              </span>
            </div>

            <div className="space-y-2 text-xs text-gray-700">
              {(activeOrder?.items || [
                { id: '1', name: 'Pargo Rojo Crispy Buche (~600g)', quantity: 1, unitPriceUsd: 24 },
                { id: '2', name: 'Ceviche Virgen del Valle', quantity: 1, unitPriceUsd: 18.5 },
                { id: '3', name: 'Coco Loco Especial Buche', quantity: 1, unitPriceUsd: 9.5 },
              ]).map((it) => (
                <div key={it.id} className="flex justify-between items-center">
                  <span>{it.quantity}x {it.name}</span>
                  <span className="font-bold">{formatUsd(it.quantity * it.unitPriceUsd)}</span>
                </div>
              ))}
            </div>

            <div className="bg-[#eff4ff] border border-[#a4c9fc] rounded-xl p-3.5 space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold uppercase text-[#006782]">
                  Total a Pagar Bimonetario:
                </span>
                <span className="text-2xl font-extrabold text-[#002546]">
                  {formatUsd(activeOrder?.totalUsd || 57.20)} <span className="text-xs font-semibold text-[#006782]">USD</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-[#d2e4ff]">
                <span className="text-[11px] text-gray-500">Tasa Oficial: {bcvRate.toFixed(2)} Bs/$</span>
                <span className="font-bold text-[#006782]">
                  {formatBsDirect((activeOrder?.totalUsd || 57.20) * bcvRate)}
                </span>
              </div>
            </div>

            {/* Pay Button */}
            <button
              onClick={() => {
                if (activeOrder) {
                  onOpenPaymentModal(activeOrder);
                } else {
                  setExtraNotice('Aún no hay una orden activa por pagar en este toldo.');
                  setTimeout(() => setExtraNotice(null), 4000);
                }
              }}
              className="w-full h-12 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-[#57d1fd]" />
              <span>Pedir la Cuenta / Pagar Pago Móvil o Zelle</span>
            </button>

            {/* View Fiscal Invoice Digital Button */}
            {onOpenFiscalInvoice && (
              <button
                onClick={onOpenFiscalInvoice}
                className="w-full h-10 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002546] border border-[#a4c9fc] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Receipt className="w-4 h-4 text-[#006782]" />
                <span>Ver Comprobante Fiscal Digital (SENIAT)</span>
              </button>
            )}
          </div>
            </>
          )}
        </div>
      )}

      {/* Comanda Editor Modal for Client */}
      {isEditingActiveComanda && (
        <ComandaEditorModal
          isOpen={isEditingActiveComanda}
          order={
            activeOrder || {
              id: 'ord-client-' + Date.now(),
              displayNumber: '#1048',
              origin: 'client_qr',
              spotId: selectedSpot.id,
              spotName: `${selectedSpot.name} • ${selectedSpot.typeDesc}`,
              customerName: 'Comensal ' + selectedSpot.number,
              items: [
                {
                  id: 'ci-1',
                  menuItemId: 'm-pargo-crispy',
                  name: 'Pargo Rojo Crispy Buche (~600g)',
                  quantity: 1,
                  unitPriceUsd: 24,
                  specialNote: 'Bien dorado, limón en rodajas',
                },
                {
                  id: 'ci-2',
                  menuItemId: 'm-ceviche',
                  name: 'Ceviche Virgen del Valle',
                  quantity: 1,
                  unitPriceUsd: 18.5,
                  specialNote: 'Picante moderado',
                },
                {
                  id: 'ci-3',
                  menuItemId: 'm-coco-loco',
                  name: 'Coco Loco Especial Buche',
                  quantity: 1,
                  unitPriceUsd: 9.5,
                  specialNote: 'Con sombrilla playera',
                },
              ],
              subtotalUsd: 52,
              tipPercent: 10,
              tipUsd: 5.2,
              totalUsd: 57.2,
              totalBs: 57.2 * bcvRate,
              status: 'in_fire',
              paymentStatus: 'pending',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              estimatedDeliveryTime: orderDeliveryTime,
              orderNote: 'Servir en toldo frente a la orilla',
              kitchenStep: 2,
              elapsedSeconds: 300,
            }
          }
          menuItems={menuItems}
          bcvRate={bcvRate}
          userRoleTitle="Cliente (Toldo)"
          onClose={() => setIsEditingActiveComanda(false)}
          onSaveOrder={(updated) => {
            if (onUpdateOrder) {
              onUpdateOrder(updated);
            }
            setIsEditingActiveComanda(false);
          }}
        />
      )}

      {/* Pre-Cuenta Digital Modal */}
      {preCuentaModalOpen && (
        <PreCuentaModal
          order={
            activeOrder || {
              id: 'pre-cuenta-' + selectedSpot.id,
              displayNumber: '#' + selectedSpot.number,
              origin: 'client_qr',
              spotId: selectedSpot.id,
              spotName: `${selectedSpot.name} • ${selectedSpot.typeDesc}`,
              customerName: 'Comensal ' + selectedSpot.number,
              items: Object.entries(cart).map(([itemId, qty]) => {
                const count = Number(qty);
                const found = menuItems.find((m) => m.id === itemId);
                return {
                  id: 'item-' + itemId,
                  menuItemId: itemId,
                  name: found ? found.name : 'Plato Playero',
                  quantity: count,
                  unitPriceUsd: found ? found.priceUsd : 10,
                };
              }),
              subtotalUsd: Object.entries(cart).reduce((acc, [itemId, qty]) => {
                const count = Number(qty);
                const found = menuItems.find((m) => m.id === itemId);
                return acc + (found ? found.priceUsd * count : 10 * count);
              }, 0),
              tipPercent: 10,
              tipUsd:
                Object.entries(cart).reduce((acc, [itemId, qty]) => {
                  const count = Number(qty);
                  const found = menuItems.find((m) => m.id === itemId);
                  return acc + (found ? found.priceUsd * count : 10 * count);
                }, 0) * 0.1,
              totalUsd:
                Object.entries(cart).reduce((acc, [itemId, qty]) => {
                  const count = Number(qty);
                  const found = menuItems.find((m) => m.id === itemId);
                  return acc + (found ? found.priceUsd * count : 10 * count);
                }, 0) * 1.1,
              totalBs:
                Object.entries(cart).reduce((acc, [itemId, qty]) => {
                  const count = Number(qty);
                  const found = menuItems.find((m) => m.id === itemId);
                  return acc + (found ? found.priceUsd * count : 10 * count);
                }, 0) *
                1.1 *
                bcvRate,
              status: 'in_fire',
              paymentStatus: 'pending',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          }
          bcvRate={bcvRate}
          onClose={() => setPreCuentaModalOpen(false)}
        />
      )}
    </div>
  );
};
