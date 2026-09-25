import React, { useState } from 'react';
import { Order, OrderItem, MenuItem } from '../types';
import { formatUsd, formatBsDirect } from '../utils/currencyFormatter';
import { soundService } from '../services/soundService';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Clock,
  Flame,
  Search,
  CheckCircle2,
  AlertCircle,
  Utensils,
  Edit3,
  MessageSquarePlus,
  ShoppingBag
} from 'lucide-react';

interface ComandaEditorModalProps {
  isOpen: boolean;
  order: Order;
  menuItems: MenuItem[];
  bcvRate: number;
  userRoleTitle?: string; // e.g. 'Mesonero', 'Cliente (Toldo)', 'Excursión'
  onClose: () => void;
  onSaveOrder: (updatedOrder: Order) => void;
  hideTipPercent?: boolean; // When true or when excursion, no percentage is charged
}

export const ComandaEditorModal: React.FC<ComandaEditorModalProps> = ({
  isOpen,
  order,
  menuItems,
  bcvRate,
  userRoleTitle = 'Mesonero / Cliente',
  onClose,
  onSaveOrder,
  hideTipPercent = false,
}) => {
  if (!isOpen) return null;

  // Check if this order is from an excursion (no percentages charged)
  const isExcursion = order.origin === 'excursion' || hideTipPercent;

  // Local state for items being edited
  const [items, setItems] = useState<OrderItem[]>(() =>
    order.items.map((it) => ({ ...it }))
  );

  // Time state: supports free-form time input
  const initialTime = order.estimatedDeliveryTime || 'Ahora (~20 min)';
  const [deliveryTime, setDeliveryTime] = useState<string>(initialTime);
  const [isCustomTimeMode, setIsCustomTimeMode] = useState<boolean>(
    !['Ahora (~20 min)', '1:30 PM', '2:00 PM', '2:30 PM'].includes(initialTime)
  );

  // Notes state
  const [orderNote, setOrderNote] = useState<string>(order.orderNote || '');
  const [editingItemNoteId, setEditingItemNoteId] = useState<string | null>(null);
  const [tempItemNote, setTempItemNote] = useState<string>('');

  // Annex new dishes state
  const [showAddDishSection, setShowAddDishSection] = useState<boolean>(false);
  const [searchDishQuery, setSearchDishQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todo');

  // Success toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Financial calculations: no percentages for excursions
  const subtotalUsd = items.reduce(
    (acc, it) => acc + (it.quantity || 0) * (it.unitPriceUsd || 0),
    0
  );
  const tipPercent = isExcursion ? 0 : (order.tipPercent || 10);
  const tipUsd = isExcursion ? 0 : (subtotalUsd * tipPercent) / 100;
  const totalUsd = subtotalUsd + tipUsd;
  const totalBs = totalUsd * bcvRate;

  // Handlers for modifying items
  const handleUpdateQty = (itemId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.id === itemId) {
            const nextQty = (it.quantity || 1) + delta;
            return nextQty > 0 ? { ...it, quantity: nextQty } : null;
          }
          return it;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    showToast('Plato eliminado de la comanda');
  };

  // Annex a new item from menu
  const handleAnnexDish = (menuItem: MenuItem) => {
    const finalUnitPrice = isExcursion
      ? (menuItem.priceExcursionUsd ?? menuItem.priceUsd)
      : menuItem.priceUsd;

    const existingIndex = items.findIndex((it) => it.menuItemId === menuItem.id);
    if (existingIndex >= 0) {
      // Increase existing item quantity
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === existingIndex ? { ...it, quantity: (it.quantity || 1) + 1 } : it
        )
      );
      showToast(`+1 ${menuItem.name} agregado`);
    } else {
      // Add new item
      const newItem: OrderItem = {
        id: 'ord-item-' + Date.now() + Math.random().toString(36).slice(2, 6),
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: 1,
        unitPriceUsd: finalUnitPrice,
        imageUrl: menuItem.imageUrl,
        specialNote: isExcursion ? 'Tarifa Especial de Excursión' : 'Anexado post-envío comanda',
      };
      setItems((prev) => [...prev, newItem]);
      showToast(`${menuItem.name} anexado (${formatUsd(finalUnitPrice)})`);
    }
    soundService.playFireAlert();
  };

  const handleOpenItemNoteModal = (item: OrderItem) => {
    setEditingItemNoteId(item.id);
    setTempItemNote(item.specialNote || '');
  };

  const handleSaveItemNote = () => {
    if (!editingItemNoteId) return;
    setItems((prev) =>
      prev.map((it) =>
        it.id === editingItemNoteId ? { ...it, specialNote: tempItemNote } : it
      )
    );
    setEditingItemNoteId(null);
    showToast('Nota de preparación actualizada');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Save changes and sync with Kitchen KDS
  const handleSaveAndSync = () => {
    if (items.length === 0) {
      showToast('La comanda debe contener al menos un plato.');
      return;
    }

    const updatedOrder: Order = {
      ...order,
      items,
      subtotalUsd,
      tipUsd,
      totalUsd,
      totalBs,
      estimatedDeliveryTime: deliveryTime,
      orderNote: orderNote.trim(),
      updatedAt: new Date().toISOString(),
    };

    soundService.playBell();
    soundService.buzzSmartBand();
    onSaveOrder(updatedOrder);
    onClose();
  };

  // Filter menu items for annexing
  const filteredMenuItems = menuItems.filter((m) => {
    // Channel / Menu isolation
    if (isExcursion && m.menuTarget === 'waiters') return false;
    if (!isExcursion && m.menuTarget === 'excursions') return false;

    const matchesCat =
      selectedCategory === 'Todo' ||
      (selectedCategory === 'Pescados' && m.category === 'pescados') ||
      (selectedCategory === 'Mariscos' && m.category === 'mariscos') ||
      (selectedCategory === 'Entradas' && m.category === 'entradas') ||
      (selectedCategory === 'Bebidas' && m.category === 'bebidas');
    const matchesSearch =
      m.name.toLowerCase().includes(searchDishQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchDishQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header Strip */}
        <div className="bg-[#002546] text-white p-4 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-[#57d1fd]">
                EDICIÓN EN VIVO DE COMANDA
              </span>
              <span className="text-[10px] bg-white/20 text-[#bbe9ff] px-2 py-0.5 rounded-full font-bold">
                {userRoleTitle}
              </span>
            </div>
            <h2 className="text-lg font-bold flex items-center gap-2 mt-0.5">
              <span>{order.displayNumber}</span>
              <span className="text-sm font-normal text-sky-200">• {order.spotName}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast alert */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white text-xs px-4 py-2 font-medium flex items-center gap-2 animate-fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-[#002546]">
          {/* Section 1: HORA DEL PEDIDO LIBRE */}
          <div className="bg-[#eff4ff] border border-[#a4c9fc] rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#006782]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#002546]">
                  Hora de Fuego & Entrega (Libre)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-[#006782] bg-white px-2 py-0.5 rounded-full border border-[#d2e4ff]">
                Actual: {deliveryTime}
              </span>
            </div>

            <p className="text-[11px] text-gray-600 leading-snug">
              Puedes fijar libremente la hora exacta en que los fogones deben servir la comanda.
            </p>

            {/* Quick Presets + Free Time Input */}
            <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
              {['Ahora (~20 min)', '1:30 PM', '2:00 PM', '2:30 PM'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setDeliveryTime(preset);
                    setIsCustomTimeMode(false);
                  }}
                  className={`py-1.5 px-1 rounded-xl text-center border transition-all text-[11px] ${
                    deliveryTime === preset && !isCustomTimeMode
                      ? 'bg-[#002546] text-white border-[#002546] shadow-xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Free-form time input */}
            <div className="pt-1">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                    Elegir Hora Exacta Personalizada:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={
                        deliveryTime.includes(':') && !deliveryTime.includes('PM') && !deliveryTime.includes('AM')
                          ? deliveryTime
                          : ''
                      }
                      onChange={(e) => {
                        if (e.target.value) {
                          setDeliveryTime(e.target.value);
                          setIsCustomTimeMode(true);
                        }
                      }}
                      className="bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs text-[#002546] font-bold focus:outline-none focus:ring-2 focus:ring-[#006782] shadow-xs"
                    />
                    <input
                      type="text"
                      value={deliveryTime}
                      onChange={(e) => {
                        setDeliveryTime(e.target.value);
                        setIsCustomTimeMode(true);
                      }}
                      placeholder="Ej: 01:45 PM o 14:15"
                      className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-[#002546] font-bold focus:outline-none focus:ring-2 focus:ring-[#006782] shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: PLATOS DE LA COMANDA (Quitar / Ajustar Cantidad) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-[#006782]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#002546]">
                  Platos en la Comanda ({items.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDishSection((prev) => !prev)}
                className="px-2.5 py-1 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#006782] rounded-xl text-xs font-bold flex items-center gap-1 border border-[#a4c9fc] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddDishSection ? 'Ocultar Catálogo' : '+ Anexar Platos'}</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-4 text-xs text-gray-500">
                Has removido todos los platos. Utiliza el botón "+ Anexar Platos" para agregar nuevos ítems a la comanda.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => {
                  const dish = menuItems.find(
                    (m) => m.id === item.menuItemId || m.name.toLowerCase() === item.name.toLowerCase()
                  );
                  const photo = item.imageUrl || dish?.imageUrl;
                  return (
                    <div
                      key={item.id}
                      className="bg-[#f8f9ff] border border-gray-200 rounded-2xl p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {photo ? (
                            <img
                              src={photo}
                              alt={item.name}
                              className="w-11 h-11 rounded-xl object-cover border border-gray-200 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 shrink-0">
                              🍽️
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-[#002546] truncate">{item.name}</h4>
                            <div className="flex items-baseline gap-1 mt-0.5 text-xs">
                              <span className="font-extrabold text-[#006782]">
                                {formatUsd(item.unitPriceUsd * (item.quantity || 1))}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                ({formatUsd(item.unitPriceUsd)} c/u)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stepper + Remove */}
                        <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-xl p-1 shadow-xs shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.id, -1)}
                            className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold"
                            title="Disminuir"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-[#002546]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.id, 1)}
                            className="w-6 h-6 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#006782] flex items-center justify-center text-xs font-bold"
                            title="Aumentar"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="w-6 h-6 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center justify-center text-xs ml-1"
                            title="Quitar plato"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Per-dish note row */}
                      <div className="flex items-center justify-between text-[11px] bg-white border border-gray-200 rounded-xl px-2.5 py-1.5">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
                          <MessageSquarePlus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-600 italic truncate">
                            {item.specialNote || 'Sin nota de preparación'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenItemNoteModal(item)}
                          className="text-[#006782] font-bold hover:underline shrink-0 text-[11px] flex items-center gap-0.5"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar Nota</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: ANEXAR NUEVOS PLATOS DEL MENÚ */}
          {showAddDishSection && (
            <div className="bg-white border-2 border-[#006782]/30 rounded-2xl p-3.5 space-y-3 animate-fade-in shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#006782]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#002546]">
                    Catálogo de Platos para Anexar
                  </h4>
                </div>
                <span className="text-[10px] text-gray-500">Tasa: {bcvRate.toFixed(2)} Bs/$</span>
              </div>

              {/* Search & Category Filter */}
              <div className="relative">
                <input
                  type="text"
                  value={searchDishQuery}
                  onChange={(e) => setSearchDishQuery(e.target.value)}
                  placeholder="Buscar pescado, tostones, coctel..."
                  className="w-full h-9 pl-8 pr-3 rounded-xl border border-gray-300 text-xs text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782]"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              </div>

              {/* Category pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                {['Todo', 'Pescados', 'Mariscos', 'Entradas', 'Bebidas'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[#002546] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Dishes Grid */}
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {filteredMenuItems.map((dish) => (
                  <div
                    key={dish.id}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 flex items-center justify-between gap-2 hover:border-[#006782] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {dish.imageUrl && (
                        <img
                          src={dish.imageUrl}
                          alt={dish.name}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-[#002546] truncate">{dish.name}</h5>
                        {(() => {
                          const unitPrice = isExcursion
                            ? (dish.priceExcursionUsd ?? dish.priceUsd)
                            : dish.priceUsd;
                          return (
                            <span className="text-[11px] font-extrabold text-[#006782] flex items-center gap-1.5 flex-wrap">
                              <span>{formatUsd(unitPrice)}</span>
                              {isExcursion && (
                                <span className="text-[9px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.2 rounded-md">
                                  Tarifa Excursión
                                </span>
                              )}
                              <span className="text-[10px] text-gray-500 font-normal">
                                ({formatBsDirect(unitPrice * bcvRate)})
                              </span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAnnexDish(dish)}
                      className="px-2.5 py-1.5 bg-[#006782] hover:bg-[#005870] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Anexar</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: NOTA GENERAL DE LA COMANDA */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4 text-[#006782]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#002546]">
                Nota General para Cocina / Fogón
              </h3>
            </div>
            <textarea
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="Ej: Servir todos los platos juntos, cliente tiene prisa, tostones con limón extra..."
              rows={2}
              className="w-full text-xs bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782] resize-none"
            />
          </div>

          {/* Section 5: TOTALES Y FACTURACIÓN EN VIVO */}
          <div className="bg-[#eff4ff] border border-[#a4c9fc] rounded-2xl p-3.5 space-y-1.5">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <span>Subtotal de Platos:</span>
              <span className="font-bold text-[#002546]">{formatUsd(subtotalUsd)}</span>
            </div>
            {!isExcursion ? (
              <div className="flex justify-between items-center text-xs text-gray-600">
                <span>Servicio / Propina ({tipPercent}%):</span>
                <span className="font-bold text-[#002546]">{formatUsd(tipUsd)}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-xs text-sky-800 bg-white/70 px-2.5 py-1 rounded-lg">
                <span>Régimen Excursión Marítima:</span>
                <span className="font-bold text-sky-900">0% (Sin porcentaje de recargo)</span>
              </div>
            )}
            <div className="border-t border-[#a4c9fc] pt-2 flex justify-between items-baseline">
              <div>
                <span className="text-xs font-bold uppercase text-[#006782] tracking-wider block">
                  Nuevo Total:
                </span>
                <span className="text-xs font-bold text-gray-600">
                  {formatBsDirect(totalBs)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-[#002546]">
                  {formatUsd(totalUsd)}
                </span>
                <span className="text-xs font-bold text-[#006782] ml-1">USD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl font-bold text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveAndSync}
            className="flex-2 py-3 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
          >
            <Flame className="w-4 h-4 text-[#57d1fd]" />
            <span>Guardar y Sincronizar KDS</span>
          </button>
        </div>
      </div>

      {/* Sub-modal: Edit Single Item Note */}
      {editingItemNoteId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 space-y-3 shadow-xl border border-gray-200 animate-fade-in">
            <h4 className="text-xs font-bold text-[#002546] uppercase tracking-wider">
              Nota de Preparación Especial
            </h4>
            <textarea
              value={tempItemNote}
              onChange={(e) => setTempItemNote(e.target.value)}
              placeholder="Ej: Bien tostado, salsa tártara aparte, sin sal añadida..."
              rows={3}
              className="w-full text-xs bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782] resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingItemNoteId(null)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveItemNote}
                className="flex-1 py-2 bg-[#006782] hover:bg-[#005870] text-white rounded-xl text-xs font-bold"
              >
                Guardar Nota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
