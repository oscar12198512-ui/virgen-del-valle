import React, { useState } from 'react';
import { ExcursionPackage, MenuItem, Order } from '../types';
import { formatUsd, formatBsDirect } from '../utils/currencyFormatter';
import { soundService } from '../services/soundService';
import {
  Anchor,
  Compass,
  Ship,
  Clock,
  Flame,
  Bell,
  Plus,
  Minus,
  CheckCircle2,
  Share2,
  Search,
  Users,
  Edit3
} from 'lucide-react';
import { ComandaEditorModal } from '../components/ComandaEditorModal';
import { CaptainVhfModal } from '../components/CaptainVhfModal';

interface ExcursionsViewProps {
  excursion: ExcursionPackage;
  bcvRate: number;
  menuItems: MenuItem[];
  onUpdateExcursion: (updated: ExcursionPackage) => void;
  onSendApproachingAlert: () => void;
}

export const ExcursionsView: React.FC<ExcursionsViewProps> = ({
  excursion,
  bcvRate,
  menuItems,
  onUpdateExcursion,
  onSendApproachingAlert,
}) => {
  const safeExcursion: ExcursionPackage = {
    id: excursion?.id || 'exc-morrocoy-01',
    tourCode: excursion?.tourCode || 'TOUR-BUCHE-882',
    boatName: excursion?.boatName || 'Doña Delia VIP',
    captainName: excursion?.captainName || 'Capitán Manuel Díaz',
    passengersCount: excursion?.passengersCount || 18,
    agencyName: excursion?.agencyName || 'Morrocoy & Buche Tours C.A.',
    braceletsColor: excursion?.braceletsColor || 'Verde Neón VIP',
    menuIncluded: excursion?.menuIncluded || 'Almuerzo Marinero Pargo + Bebida + Toldo',
    departureTime: excursion?.departureTime || '10:30 AM',
    arrivalTime: excursion?.arrivalTime || '01:15 PM',
    estimatedServingTime: excursion?.estimatedServingTime || '01:45 PM',
    orderNote: excursion?.orderNote || 'Atraque en Muelle Central Buche',
    knotsSpeed: excursion?.knotsSpeed || 22,
    isApproachingNotified: Boolean(excursion?.isApproachingNotified),
    kdsStatus: excursion?.kdsStatus || 'En Fuego (Cocción Iniciada)',
    items: Array.isArray(excursion?.items) && excursion.items.length > 0 ? excursion.items : [],
    subtotalUsd: excursion?.subtotalUsd || 0,
    tipPercent: 0,
    totalUsd: excursion?.totalUsd || 0,
    isSettled: Boolean(excursion?.isSettled),
    paymentPreference: excursion?.paymentPreference || 'cash_usd',
    paymentStatus: excursion?.paymentStatus || 'pending',
  };

  const [paymentOption, setPaymentOption] = useState<'cash_usd' | 'pago_movil' | 'transfer'>(safeExcursion.paymentPreference || 'cash_usd');
  const [alertSent, setAlertSent] = useState(safeExcursion.isApproachingNotified);
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [isEditingComandaModalOpen, setIsEditingComandaModalOpen] = useState(false);
  const [isCaptainVhfOpen, setIsCaptainVhfOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [zoomedDish, setZoomedDish] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Todo');
  const [showVisualCatalog, setShowVisualCatalog] = useState<boolean>(true);

  const safeItems = safeExcursion.items;
  const subtotal = safeItems.reduce((acc, i) => acc + (i.quantity || 0) * (i.unitPriceUsd || 0), 0);
  // Las facturas de excursiones no cobran ningún porcentaje (0% propina / recargo)
  const totalUsd = subtotal;
  const totalBs = totalUsd * bcvRate;

  // Convert excursion to Order for ComandaEditorModal (sin porcentajes)
  const excursionAsOrder: Order = {
    id: safeExcursion.id,
    displayNumber: safeExcursion.tourCode,
    origin: 'excursion',
    spotId: 'dock-buche-central',
    spotName: `Muelle Central • ${safeExcursion.boatName} (${safeExcursion.passengersCount} pax)`,
    customerName: `${safeExcursion.captainName} (${safeExcursion.braceletsColor})`,
    waiterId: 'coord-maritima',
    waiterName: 'Capitanía Buche',
    items: safeItems,
    subtotalUsd: subtotal,
    tipPercent: 0,
    tipUsd: 0,
    totalUsd: totalUsd,
    totalBs: totalBs,
    status: 'in_fire',
    paymentStatus: safeExcursion.paymentStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    estimatedDeliveryTime: safeExcursion.estimatedServingTime,
    orderNote: safeExcursion.orderNote || 'Coordinar con atraque de lancha en muelle central',
    kitchenStep: 2,
    elapsedSeconds: 300,
  };

  const handleSaveFromEditor = (updatedOrder: Order) => {
    const updatedExcursion: ExcursionPackage = {
      ...safeExcursion,
      items: updatedOrder.items,
      subtotalUsd: updatedOrder.subtotalUsd,
      estimatedServingTime: updatedOrder.estimatedDeliveryTime || safeExcursion.estimatedServingTime,
      orderNote: updatedOrder.orderNote,
      tipPercent: 0,
    };
    onUpdateExcursion(updatedExcursion);
    setIsEditingComandaModalOpen(false);
    setNoticeMessage('Comanda de excursión y hora de entrega sincronizadas con la cocina.');
    setTimeout(() => setNoticeMessage(null), 4000);
  };

  const handleApproachingAlert = () => {
    soundService.buzzSmartBand();
    soundService.playBell();
    setAlertSent(true);
    onSendApproachingAlert();
    onUpdateExcursion({
      ...safeExcursion,
      isApproachingNotified: true,
      kdsStatus: '¡APROXIMACIÓN ACTIVADA! A 10 minutos de muelle',
    });
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    const updatedItems = safeExcursion.items
      .map((item) => (item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
      .filter((item) => item.quantity > 0);

    onUpdateExcursion({
      ...safeExcursion,
      items: updatedItems,
      subtotalUsd: updatedItems.reduce((acc, i) => acc + i.quantity * i.unitPriceUsd, 0),
    });
  };

  // Menú exclusivo filtrado para Excursiones (excluye platos exclusivos de mesoneros)
  const excursionEligibleMenuItems = (menuItems || []).filter(
    (item) => item.menuTarget !== 'waiters' && item.isAvailable
  );

  const handleAddDish = (menuItem: MenuItem) => {
    const finalPrice = menuItem.priceExcursionUsd ?? menuItem.priceUsd;
    const newItem = {
      id: 'exc-item-' + Date.now(),
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity: 1,
      unitPriceUsd: finalPrice,
      imageUrl: menuItem.imageUrl,
      specialNote: 'Tarifa Excursión • Agregado en aproximación marítima',
    };
    const updated = [...safeExcursion.items, newItem];
    onUpdateExcursion({
      ...safeExcursion,
      items: updated,
      subtotalUsd: updated.reduce((acc, i) => acc + i.quantity * i.unitPriceUsd, 0),
    });
    setShowAddDishModal(false);
    soundService.playFireAlert();
  };

  return (
    <div className="flex flex-col gap-4 max-w-lg mx-auto pb-28 pt-2 px-3">
      {/* Top Maritime Strip */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#006782] flex items-center justify-center">
            <Anchor className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#006782] block">
              COORDINACIÓN MARÍTIMA
            </span>
            <span className="text-xs font-bold text-[#002546]">Muelle Buche Central</span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Bahía Activa</span>
        </div>
      </div>

      {/* Main Tour Card */}
      <div className="bg-[#002546] text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{safeExcursion.tourCode}</h2>
              <span className="bg-[#57d1fd]/20 text-[#bbe9ff] text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Users className="w-3 h-3" /> {safeExcursion.passengersCount} pax
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300 mt-1">
              <Ship className="w-3.5 h-3.5 text-[#57d1fd]" />
              <span>Lancha: <b>{safeExcursion.boatName}</b></span>
              <span>• {safeExcursion.captainName}</span>
            </div>
            <div className="text-[11px] text-sky-200 mt-0.5">
              Pulseras: <b>{safeExcursion.braceletsColor}</b>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-[#57d1fd]">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
        </div>

        {/* Times & Speed Grid */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
            <div className="flex justify-between items-center text-[10px] text-sky-300 font-bold uppercase">
              <span>Arribo a Muelle</span>
              <span className="bg-[#57d1fd]/20 text-[#bbe9ff] px-1.5 py-0.2 rounded">
                {safeExcursion.knotsSpeed} nudos
              </span>
            </div>
            <div className="text-base font-extrabold mt-0.5">{safeExcursion.arrivalTime}</div>
            <span className="text-[10px] text-gray-300 block">Aproximándose a Muelle Buche</span>
          </div>

          <div className="bg-amber-400/15 backdrop-blur-xs rounded-xl p-2.5 border border-amber-400/30">
            <div className="flex justify-between items-center text-[10px] text-amber-300 font-bold uppercase">
              <span>Entrega Estimada</span>
              <span className="bg-amber-300/30 text-amber-100 px-1.5 py-0.2 rounded">
                22 min
              </span>
            </div>
            <div className="text-base font-extrabold text-amber-100 mt-0.5">{safeExcursion.estimatedServingTime}</div>
            <span className="text-[10px] text-amber-200 block">Faltan aprox. 22 min para servir</span>
          </div>
        </div>

        {/* Free Service Time Selector for Excursion */}
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-sky-200 font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#57d1fd]" /> Hora de Servicio / Almuerzo (Libre):
            </span>
            <span className="text-[#57d1fd] font-extrabold bg-white/10 px-2.5 py-0.5 rounded-full">
              {safeExcursion.estimatedServingTime}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-[11px] font-bold">
            {['1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  onUpdateExcursion({
                    ...safeExcursion,
                    estimatedServingTime: preset,
                  });
                  setNoticeMessage(`Hora de servicio actualizada a ${preset}`);
                  setTimeout(() => setNoticeMessage(null), 3500);
                }}
                className={`py-1 rounded-lg border text-center transition-all ${
                  safeExcursion.estimatedServingTime === preset
                    ? 'bg-[#57d1fd] text-[#002546] border-[#57d1fd] font-black'
                    : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="time"
              value={
                safeExcursion.estimatedServingTime.includes(':') &&
                !safeExcursion.estimatedServingTime.includes('PM') &&
                !safeExcursion.estimatedServingTime.includes('AM')
                  ? safeExcursion.estimatedServingTime
                  : ''
              }
              onChange={(e) => {
                if (e.target.value) {
                  onUpdateExcursion({
                    ...safeExcursion,
                    estimatedServingTime: e.target.value,
                  });
                }
              }}
              className="bg-white text-[#002546] font-bold text-xs rounded-lg px-2 py-1 shadow-xs"
            />
            <input
              type="text"
              value={safeExcursion.estimatedServingTime}
              onChange={(e) => {
                onUpdateExcursion({
                  ...safeExcursion,
                  estimatedServingTime: e.target.value,
                });
              }}
              placeholder="O escribe hora libre: ej. 02:45 PM"
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-gray-400 font-medium focus:outline-none focus:ring-1 focus:ring-[#57d1fd]"
            />
          </div>

          {/* Quick Button to Open Full Comanda Editor Modal */}
          <button
            type="button"
            onClick={() => setIsEditingComandaModalOpen(true)}
            className="w-full mt-1 py-2 bg-[#57d1fd] hover:bg-[#80deea] text-[#002546] rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.99]"
          >
            <Edit3 className="w-4 h-4 text-[#002546]" />
            <span>Editar Comanda Completa (Anexar, quitar platos, hora o nota)</span>
          </button>
        </div>

        {/* KDS Progress Bar */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-gray-300 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Estado en Cocina KDS:
            </span>
            <span className="font-bold text-[#57d1fd]">{safeExcursion.kdsStatus}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-400 to-[#57d1fd] h-full rounded-full w-2/3 transition-all duration-500"></div>
          </div>
        </div>
      </div>

      {/* Search Input for Platos */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar pargos, fosforeras, raciones, rones..."
          className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-300 bg-white text-xs text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782]"
        />
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
      </div>

      {/* Visual Menu Catalog for Excursion & Captains with Photos */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-[#002546] uppercase tracking-wider flex items-center gap-1.5">
              <span>🚤</span> Catálogo & Combos de Excursión con Fotos
            </h3>
            <span className="text-[10px] text-gray-500">
              Tarifas mayoristas de lancha • Toca foto para ampliar o botón para añadir
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowVisualCatalog((prev) => !prev)}
            className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg hover:bg-sky-100 transition-colors"
          >
            {showVisualCatalog ? 'Ocultar' : 'Ver Catálogo'}
          </button>
        </div>

        {showVisualCatalog && (
          <div className="space-y-3 pt-1">
            {/* Category pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {['Todo', 'Pescados & Mariscos', 'Entradas Playeras', 'Bebidas'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                    activeCategory === cat
                      ? 'bg-[#002546] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Photo cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {excursionEligibleMenuItems
                .filter((item) => {
                  if (activeCategory === 'Pescados & Mariscos') {
                    if (item.category !== 'pescados' && item.category !== 'mariscos') return false;
                  } else if (activeCategory === 'Entradas Playeras') {
                    if (item.category !== 'entradas') return false;
                  } else if (activeCategory === 'Bebidas') {
                    if (item.category !== 'bebidas') return false;
                  }
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    item.name.toLowerCase().includes(q) ||
                    item.description.toLowerCase().includes(q)
                  );
                })
                .map((item) => {
                  const excursionPrice = item.priceExcursionUsd ?? item.priceUsd;
                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-gray-200 hover:border-sky-500 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between group hover:shadow-md transition-all"
                    >
                      {/* Photo banner */}
                      <div
                        onClick={() => setZoomedDish(item)}
                        className="relative h-28 sm:h-32 w-full bg-gray-100 overflow-hidden cursor-pointer"
                        title="Toca para ampliar foto"
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
                          <span className="text-[9px] font-bold uppercase bg-sky-950/80 backdrop-blur-xs text-sky-200 px-1.5 py-0.5 rounded-md truncate">
                            {item.menuTarget === 'excursions' ? 'Exclusivo Tour' : item.category}
                          </span>
                          <span className="text-[9px] font-black text-white bg-sky-600/90 backdrop-blur-xs px-1.5 py-0.5 rounded-md">
                            Tarifa Tour
                          </span>
                        </div>
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-baseline justify-between text-white">
                          <span className="text-sm font-black drop-shadow-md text-sky-100">
                            {formatUsd(excursionPrice)}
                          </span>
                          <span className="text-[10px] text-white/90 font-mono drop-shadow-xs">
                            {(excursionPrice * bcvRate).toFixed(0)} Bs.
                          </span>
                        </div>
                      </div>

                      {/* Info & Add */}
                      <div className="p-2.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-[#002546] line-clamp-1 group-hover:text-sky-700">
                            {item.name}
                          </h4>
                          <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                            {item.servingSize || item.description}
                          </p>
                        </div>
                        <div className="pt-2 mt-1.5 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => handleAddDish(item)}
                            className="w-full py-1.5 bg-sky-50 hover:bg-[#002546] text-sky-800 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors active:scale-95 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Añadir al Tour</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Platos Confirmados List */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-xs font-bold text-[#002546] uppercase tracking-wider">
              Platos Confirmados
            </h3>
            <span className="text-[11px] text-[#006782] font-semibold">
              Grupo Morrocoy & Mochima
            </span>
          </div>
          <button
            onClick={() => setShowAddDishModal(true)}
            className="px-2.5 py-1.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#006782] rounded-lg text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Añadir Plato
          </button>
        </div>

        <div className="space-y-3">
          {safeExcursion.items.map((item) => {
            const menuItem = menuItems.find(
              (m) => m.id === item.menuItemId || m.name.toLowerCase() === item.name.toLowerCase()
            );
            const photoUrl = item.imageUrl || menuItem?.imageUrl;
            return (
              <div
                key={item.id}
                className="bg-[#f8f9ff] border border-gray-200 rounded-xl p-3 flex flex-col gap-2"
              >
                <div className="flex justify-between items-center gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={item.name}
                        onClick={() => menuItem && setZoomedDish(menuItem)}
                        className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0 shadow-2xs cursor-pointer hover:opacity-90 transition-opacity"
                        title="Toca para ver foto ampliada"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 shrink-0">
                        🚤
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-[#002546] truncate">{item.name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-extrabold text-sky-800">
                          {formatUsd(item.unitPriceUsd)} c/u
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          ({(item.unitPriceUsd * bcvRate).toFixed(0)} Bs.)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 px-2 py-0.5 shrink-0">
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

                {item.specialNote && (
                  <div className="text-[11px] bg-white border border-gray-200 rounded-lg p-2 text-gray-700">
                    <span className="font-bold text-[#006782]">Instrucción Capitán: </span>
                    {item.specialNote}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Facturación y Liquidación del Grupo */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3.5">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-xs font-bold text-[#002546] uppercase tracking-wider">
              Facturación & Liquidación del Grupo
            </h3>
            <p className="text-[11px] text-gray-500">
              {safeExcursion.tourCode} • {safeExcursion.passengersCount} Pasajeros
            </p>
          </div>
          <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
            Pre-liquidación
          </span>
        </div>

        <div className="space-y-2 text-xs text-gray-700">
          <div className="flex justify-between">
            <span>Subtotal consumo ({safeExcursion.items.reduce((a, b) => a + (b.quantity || 0), 0)} platos/bebidas):</span>
            <span className="font-bold">{formatUsd(subtotal)}</span>
          </div>
          <div className="flex justify-between text-emerald-700">
            <span>Toldo & Mesas Reservadas (Muelle Buche):</span>
            <span className="font-bold">Cortesía Tour</span>
          </div>
        </div>

        {/* Régimen Excursiones: Sin Porcentajes de Recargo ni Propinas */}
        <div className="pt-2 border-t border-gray-100">
          <div className="bg-[#eff4ff] border border-[#a4c9fc] rounded-xl p-2.5 flex items-center justify-between text-xs">
            <span className="text-[#002546] font-semibold">Recargo / Porcentaje de Servicio:</span>
            <span className="font-bold text-[#006782] bg-white px-2 py-0.5 rounded-lg border border-[#a4c9fc]">
              0% (Exento de porcentajes)
            </span>
          </div>
        </div>

        {/* Big Dual Total Box */}
        <div className="bg-[#eff4ff] border border-[#a4c9fc] rounded-xl p-3.5 space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-bold uppercase text-[#006782] tracking-wider">
              TOTAL A LIQUIDAR (USD)
            </span>
            <span className="text-2xl font-extrabold text-[#002546]">
              {formatUsd(totalUsd)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs pt-1 border-t border-[#d2e4ff]">
            <span className="text-[11px] text-gray-500">
              Tasa Oficial: {bcvRate.toFixed(2)} Bs/$
            </span>
            <span className="font-bold text-[#006782]">
              {formatBsDirect(totalBs)}
            </span>
          </div>
        </div>

        {/* Payment Preferences Radio */}
        <div>
          <span className="text-xs font-bold text-[#002546] block mb-1.5">
            Modalidad de Pago para desembarque:
          </span>
          <div className="grid grid-cols-3 gap-2 text-xs font-medium">
            {[
              { id: 'cash_usd', label: 'Efectivo $ Muelle' },
              { id: 'pago_movil', label: 'Pago Móvil (Bs)' },
              { id: 'transfer', label: 'Transferencia' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setPaymentOption(m.id as typeof paymentOption)}
                className={`p-2 rounded-xl border text-center transition-all ${
                  paymentOption === m.id
                    ? 'bg-[#006782] text-white border-[#006782] font-bold shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Approaching Alert Button (10 min) */}
        <button
          onClick={handleApproachingAlert}
          className={`w-full h-12 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] ${
            alertSent
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-[#002546] text-white hover:bg-[#0d3b66]'
          }`}
        >
          <Bell className="w-4 h-4 text-[#57d1fd]" />
          <span>
            {alertSent
              ? '¡Alerta de 10 min Enviada a Cocina & Mesonero!'
              : 'Avisar Aproximación (10 min para llegada)'}
          </span>
        </button>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => setShowAddDishModal(true)}
            className="h-10 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#006782] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Plato de Último Minuto
          </button>
          <button
            onClick={() => {
              setNoticeMessage(`Comanda digital enviada al Capitán ${safeExcursion.captainName || 'de la embarcación'}.`);
              setTimeout(() => setNoticeMessage(null), 3500);
            }}
            className="h-10 bg-white hover:bg-gray-100 text-[#002546] border border-gray-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" /> Comanda Digital
          </button>
          <button
            onClick={() => setIsCaptainVhfOpen(true)}
            className="h-10 bg-[#002546] hover:bg-[#003b5f] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <span aria-hidden="true">📻</span> VHF / Capitán
          </button>
        </div>

        {noticeMessage && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-2.5 rounded-xl text-xs flex items-center gap-2 font-bold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{noticeMessage}</span>
          </div>
        )}
      </div>

      {isCaptainVhfOpen && (
        <CaptainVhfModal
          isOpen={isCaptainVhfOpen}
          onClose={() => setIsCaptainVhfOpen(false)}
          excursion={safeExcursion}
          bcvRate={bcvRate}
          onAdjustTime={(delta) => {
            const match = delta.match(/^([+-])(\d+)\s*min$/i);
            if (!match) return;
            const amount = Number(match[2]) * (match[1] === '-' ? -1 : 1);
            const timeMatch = (safeExcursion.arrivalTime || '01:15 PM').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
            if (!timeMatch) {
              setNoticeMessage(`Ajuste solicitado: ${delta}. La hora actual no tiene formato ajustable.`);
              return;
            }
            let totalMinutes = (Number(timeMatch[1]) % 12) * 60 + Number(timeMatch[2]) + amount;
            totalMinutes = ((totalMinutes % 720) + 720) % 720;
            const hour = Math.floor(totalMinutes / 60) || 12;
            const minute = totalMinutes % 60;
            const nextTime = `${hour}:${String(minute).padStart(2, '0')} ${timeMatch[3].toUpperCase()}`;
            onUpdateExcursion({ ...safeExcursion, arrivalTime: nextTime });
            setNoticeMessage(`Hora de arribo ajustada a ${nextTime}.`);
            setTimeout(() => setNoticeMessage(null), 3500);
          }}
        />
      )}

      {/* Add Dish Modal for Excursion */}
      {showAddDishModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl border border-gray-200 animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#002546] flex items-center gap-1.5">
                  <span>🚤</span> Menú Especial Excursiones
                </h3>
                <span className="text-[10px] text-sky-700 font-semibold">Tarifas grupales acordadas</span>
              </div>
              <button
                onClick={() => setShowAddDishModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {excursionEligibleMenuItems.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">
                  No hay platos habilitados para excursiones en este momento.
                </div>
              ) : (
                excursionEligibleMenuItems.map((item) => {
                  const excursionPrice = item.priceExcursionUsd ?? item.priceUsd;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleAddDish(item)}
                      className="w-full p-2 rounded-xl border border-gray-200 hover:border-sky-500 hover:bg-sky-50/50 text-left flex items-center justify-between gap-2.5 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 shrink-0">
                            🚤
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-[#002546] block truncate">{item.name}</span>
                          <span className="text-[10px] text-gray-500 line-clamp-1">{item.description}</span>
                          {item.menuTarget === 'excursions' && (
                            <span className="inline-block mt-0.5 text-[9px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.2 rounded">
                              Exclusivo Excursión
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-sky-700 text-xs block">
                          {formatUsd(excursionPrice)}
                        </span>
                        {item.priceExcursionUsd && item.priceExcursionUsd !== item.priceUsd && (
                          <span className="text-[9px] text-gray-400 line-through block">
                            {formatUsd(item.priceUsd)}
                          </span>
                        )}
                        <span className="text-[9px] text-gray-400 font-mono block">
                          {(excursionPrice * bcvRate).toFixed(0)} Bs.
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Dish Photo Zoom Modal for Captain & Tour Passengers */}
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
                <span className="text-xs font-bold uppercase bg-sky-950/80 text-sky-200 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                  {zoomedDish.menuTarget === 'excursions' ? 'Combo Excursión' : zoomedDish.category}
                </span>
                <span className="text-base font-black text-sky-100 bg-sky-950/80 px-3 py-1 rounded-lg backdrop-blur-xs drop-shadow-md">
                  {formatUsd(zoomedDish.priceExcursionUsd ?? zoomedDish.priceUsd)}
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
                <div className="mt-2 text-xs font-bold text-sky-900 bg-sky-50 border border-sky-200 p-2 rounded-xl flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>🚤</span>
                    <span>Tarifa Grupal Excursión:</span>
                  </span>
                  <span className="font-extrabold text-sky-700">
                    {formatUsd(zoomedDish.priceExcursionUsd ?? zoomedDish.priceUsd)}
                  </span>
                </div>
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
                    handleAddDish(zoomedDish);
                    setZoomedDish(null);
                  }}
                  className="flex-1 py-2.5 bg-[#002546] hover:bg-[#0d3b66] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4 text-[#57d1fd]" />
                  <span>Añadir al Tour</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Full Comanda Editor Modal for Excursion (sin porcentajes) */}
      {isEditingComandaModalOpen && (
        <ComandaEditorModal
          isOpen={isEditingComandaModalOpen}
          order={excursionAsOrder}
          menuItems={excursionEligibleMenuItems}
          bcvRate={bcvRate}
          userRoleTitle="Operador Marítimo / Excursión"
          onClose={() => setIsEditingComandaModalOpen(false)}
          onSaveOrder={handleSaveFromEditor}
          hideTipPercent={true}
        />
      )}
    </div>
  );
};
