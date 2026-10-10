import React, { useState } from 'react';
import {
  Clock,
  Flame,
  Satellite,
  Coins,
  Plus,
  Minus,
  Trash2,
  Edit3,
  Utensils,
  CheckCircle2,
  AlertCircle,
  Bell,
  Sparkles,
  Info,
  X
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface OrderSyncEditorProps {
  bcvRate: number;
  onSyncWithKitchen?: (summary: string) => void;
}

interface EditableDishItem {
  id: string;
  name: string;
  desc: string;
  priceUsd: number;
  quantity: number;
  note: string;
  imageUrl: string;
}

export const OrderSyncEditor: React.FC<OrderSyncEditorProps> = ({
  bcvRate,
  onSyncWithKitchen
}) => {
  const [activePerspective, setActivePerspective] = useState<'cliente' | 'mesonero' | 'excursion'>('cliente');
  const [serviceTimingMode, setServiceTimingMode] = useState<'inmediato' | 'programado'>('programado');
  const [selectedTimeChip, setSelectedTimeChip] = useState<string>('01:45 PM');
  const [customTime, setCustomTime] = useState<string>('01:45 PM');
  const [isEditingNoteModalOpen, setIsEditingNoteModalOpen] = useState<boolean>(false);
  const [activeEditingItemId, setActiveEditingItemId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState<string>('');
  const [isSyncingWithKitchen, setIsSyncingWithKitchen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(
    'KDS Bahía Buche Conectado: Comanda #1048 sincronizada con fogón del Chef Domingo'
  );

  // Live modifiable items of comanda #1048
  const [items, setItems] = useState<EditableDishItem[]>([
    {
      id: 'item-pargo',
      name: 'Pargo Rojo Crispy',
      desc: '1.2 kg entero • Tostones con queso blanco y ensalada rallada',
      priceUsd: 22.0,
      quantity: 1,
      note: 'El pargo bien tostado por favor, con limón extra en rodajas',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCQVf842Uf761mXwU661Kk63rU9-Z2E8b4b7p4j8wZ_s8V9k1m0j2N1_c8x_z8'
    },
    {
      id: 'item-fosforera',
      name: 'Fosforera Playera Especial',
      desc: 'Mariscos mixtos • Pulpo, camarón, calamar y caldo concentrado',
      priceUsd: 16.0,
      quantity: 1,
      note: 'Picante al lado, bien caliente en cazuela de barro',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD1AwSsIl_9BviYdzg6xG5GjYqekrtFZGbI10mqk3-6KGbr0ZKjQlh-52I4VtKXMEPmIsNE8F6Q5BLANV4NsTY8b_LXBYmyXjBnKr-0cb8mZFRe8h-ZVlQeEpvTeKO_UvfpR-0wQmJDnhzprtlvaM5Syn_tKfnf-W-Mp_mUkUPwYNmFAb-iOtz9HEjeCspY-0lMX3-RNLw-FIpNV0XsogVmVuXzk5dib71B7rubKTCNcxYeAO5aa_ikSg'
    },
    {
      id: 'item-tobo-polar',
      name: 'Tobo 10 Polarcitas Frías',
      desc: 'Pilsen vestida de novia • Con hielo marino y sal marina',
      priceUsd: 18.0,
      quantity: 1,
      note: 'Bien vestidas de novia con tobo full hielo marino',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBtZhFvNdd6QFEZrUbvX7PohvDmgbf8ncIBdZtupF-xrx4AcV6cNiB4Sb7shtke8z-ydpB5TWvwkt5k85fS7tD-lQjk8X-thVxuFk5Zpwom8uyhGR3qF0n3YtEKwfesgDw18fQDRcjbBV6rl568RO9kFYH-2db0fLjyf544CvpIoIkuaJM1rQov78mAv9sjmXCutXOoGELHFzJnKbzp-wPM2B4Mz4vlAIQGNri2CXTYkB3nYuMxLd6dIw'
    }
  ]);

  // Financial calculations
  const isExcursionPerspective = activePerspective === 'excursion';
  const subtotalUsd = items.reduce((acc, it) => acc + it.priceUsd * it.quantity, 0);
  const tipUsd = isExcursionPerspective ? 0 : subtotalUsd * 0.1;
  const totalUsd = subtotalUsd + tipUsd;
  const totalBs = totalUsd * bcvRate;

  const showToast = (message: string) => {
    setToastMessage(message);
    try {
      soundService.playSuccess();
    } catch {}
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.id === itemId) {
            const newQ = it.quantity + delta;
            return newQ > 0 ? { ...it, quantity: newQ } : null;
          }
          return it;
        })
        .filter(Boolean) as EditableDishItem[]
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    showToast('Plato removido de la comanda');
  };

  const handleOpenEditNote = (item: EditableDishItem) => {
    setActiveEditingItemId(item.id);
    setTempNoteText(item.note);
    setIsEditingNoteModalOpen(true);
  };

  const handleSaveNote = () => {
    if (!activeEditingItemId) return;
    setItems((prev) =>
      prev.map((it) => (it.id === activeEditingItemId ? { ...it, note: tempNoteText } : it))
    );
    setIsEditingNoteModalOpen(false);
    showToast('Nota de cocina actualizada');
  };

  const handleSyncOrderWithKitchen = () => {
    setIsSyncingWithKitchen(true);
    soundService.playFireAlert();
    soundService.buzzSmartBand();

    setTimeout(() => {
      setIsSyncingWithKitchen(false);
      showToast(
        `¡Comanda #1048 reprogramada para las ${selectedTimeChip}! Fogones alertados vía Mesh Local.`
      );
      if (onSyncWithKitchen) {
        onSyncWithKitchen(`Comanda #1048 sincronizada (${selectedTimeChip})`);
      }
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-3.5 text-[#001c37]">
      {/* Toast Notification KDS */}
      {toastMessage && (
        <div className="bg-[#002546] text-white p-3 rounded-2xl shadow-lg border border-[#57d1fd]/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#57d1fd] shrink-0 animate-ping"></span>
            <span className="text-xs font-medium text-white truncate">{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-white/70 hover:text-white shrink-0 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Role / Perspective Pill Switcher */}
      <section className="bg-white rounded-2xl p-2 shadow-sm border border-gray-200">
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => setActivePerspective('cliente')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center ${
              activePerspective === 'cliente'
                ? 'bg-[#002546] text-white shadow-xs'
                : 'text-[#42474f] hover:bg-gray-100'
            }`}
          >
            Toldo #14 (Cliente)
          </button>
          <button
            type="button"
            onClick={() => setActivePerspective('mesonero')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center ${
              activePerspective === 'mesonero'
                ? 'bg-[#002546] text-white shadow-xs'
                : 'text-[#42474f] hover:bg-gray-100'
            }`}
          >
            Yender R. (Mesonero)
          </button>
          <button
            type="button"
            onClick={() => setActivePerspective('excursion')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center ${
              activePerspective === 'excursion'
                ? 'bg-[#002546] text-white shadow-xs'
                : 'text-[#42474f] hover:bg-gray-100'
            }`}
          >
            Costa Azul (Lancha)
          </button>
        </div>
      </section>

      {/* Comanda Header Card */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#002546] tracking-tight">Comanda #1048</h1>
              <span className="bg-[#bbe9ff] text-[#005870] px-2.5 py-0.5 rounded-full text-xs font-bold">
                VIP #14
              </span>
            </div>
            <span className="text-xs text-[#006782] font-semibold mt-0.5">
              En preparación • Enlace Starlink Marino
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase text-gray-500 font-bold">Tasa del día</span>
            <span className="text-sm font-extrabold text-[#002546] font-mono">
              {bcvRate.toFixed(2)} Bs/$
            </span>
          </div>
        </div>

        {/* Cooking progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-[#42474f] mb-1 font-medium">
            <span className="flex items-center gap-1 text-[#ba1a1a] font-bold">
              <Flame className="w-3.5 h-3.5" /> En Fogón de Leña
            </span>
            <span className="font-mono">Pase estimado: {selectedTimeChip}</span>
          </div>
          <div className="w-full bg-[#eff4ff] h-2 rounded-full overflow-hidden border border-[#d2e4ff]">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-700"
              style={{ width: '65%' }}
            ></div>
          </div>
        </div>
      </section>

      {/* Sincronización de Servicio (Hora de Fuego) */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#006782]" />
            <h2 className="text-sm font-bold text-[#002546]">Sincronización de Servicio</h2>
          </div>
          <div className="flex rounded-lg bg-[#eff4ff] p-0.5 border border-[#d2e4ff]">
            <button
              type="button"
              onClick={() => {
                setServiceTimingMode('inmediato');
                setSelectedTimeChip('Ahora (~25 min)');
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                serviceTimingMode === 'inmediato'
                  ? 'bg-white text-[#002546] shadow-xs'
                  : 'text-[#42474f]'
              }`}
            >
              Inmediato
            </button>
            <button
              type="button"
              onClick={() => {
                setServiceTimingMode('programado');
                setSelectedTimeChip('01:45 PM');
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                serviceTimingMode === 'programado'
                  ? 'bg-[#002546] text-white shadow-xs'
                  : 'text-[#42474f]'
              }`}
            >
              Programar Hora
            </button>
          </div>
        </div>

        {/* Timing selector chips + Free time input */}
        <div className="grid grid-cols-4 gap-2">
          {['Ahora (~25 min)', '1:30 PM', '2:00 PM', '2:30 PM'].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedTimeChip(chip);
                if (chip === 'Ahora (~25 min)') {
                  setServiceTimingMode('inmediato');
                } else {
                  setServiceTimingMode('programado');
                }
              }}
              className={`py-2 px-1 rounded-xl text-xs font-bold text-center border transition-all ${
                selectedTimeChip === chip
                  ? 'bg-[#006782] text-white border-[#006782] shadow-xs'
                  : 'bg-[#eff4ff] text-[#002546] border-[#d2e4ff] hover:bg-sky-100'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Free-form Time Input */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="time"
            value={
              selectedTimeChip.includes(':') && !selectedTimeChip.includes('PM') && !selectedTimeChip.includes('AM')
                ? selectedTimeChip
                : ''
            }
            onChange={(e) => {
              if (e.target.value) {
                setSelectedTimeChip(e.target.value);
                setServiceTimingMode('programado');
              }
            }}
            className="bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs text-[#002546] font-bold focus:outline-none focus:ring-2 focus:ring-[#006782]"
          />
          <input
            type="text"
            value={selectedTimeChip}
            onChange={(e) => {
              setSelectedTimeChip(e.target.value);
              setServiceTimingMode('programado');
            }}
            placeholder="O escribe hora libre: ej. 02:15 PM"
            className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-[#002546] font-bold focus:outline-none focus:ring-2 focus:ring-[#006782]"
          />
        </div>

        <div className="bg-[#eff4ff] p-3 rounded-xl flex items-start gap-2.5 border border-[#d2e4ff]">
          <Info className="w-4 h-4 text-[#006782] shrink-0 mt-0.5" />
          <p className="text-xs text-[#42474f] leading-snug">
            La cocina sincronizará el fuego del pargo crispy y la fosforera para que salgan exactamente a las{' '}
            <strong className="text-[#002546] font-bold">{selectedTimeChip}</strong> sin enfriarse en la arena.
          </p>
        </div>
      </section>

      {/* Interactive Order Editor (Live Modifiable Items) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#002546]">Platos en Preparación ({items.length})</h2>
          <button
            type="button"
            onClick={() => {
              const newDish: EditableDishItem = {
                id: 'item-extra-' + Date.now(),
                name: 'Ración Tostones Playeros con Queso',
                desc: '6 tostones fritos dorados con queso palmita rallado y salsa tártara',
                priceUsd: 8.0,
                quantity: 1,
                note: 'Tostones bien crocantes con queso blanco abundante',
                imageUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=150&auto=format&fit=crop&q=80',
              };
              setItems((prev) => [...prev, newDish]);
              showToast('Ración de Tostones anexada a la comanda');
            }}
            className="px-2.5 py-1 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#006782] rounded-xl text-xs font-bold flex items-center gap-1 border border-[#a4c9fc] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Anexar Plato</span>
          </button>
        </div>

        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col gap-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback visual
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=150&auto=format&fit=crop&q=80';
                    }}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-xs font-bold text-[#002546] truncate">{item.name}</h3>
                  <span className="text-[11px] text-[#42474f] truncate">{item.desc}</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xs font-extrabold text-[#002546] font-mono">
                      ${(item.priceUsd * item.quantity).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      ({(item.priceUsd * item.quantity * bcvRate).toFixed(2)} Bs)
                    </span>
                  </div>
                </div>
              </div>

              {/* Stepper buttons */}
              <div className="flex items-center gap-1.5 bg-[#eff4ff] p-1 rounded-xl border border-[#d2e4ff] shrink-0">
                <button
                  type="button"
                  onClick={() => handleUpdateQuantity(item.id, -1)}
                  className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#002546] shadow-xs active:scale-95 font-bold hover:bg-gray-50"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center text-xs font-bold font-mono text-[#002546]">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleUpdateQuantity(item.id, 1)}
                  className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#002546] shadow-xs active:scale-95 font-bold hover:bg-gray-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Note row */}
            <div className="flex items-center justify-between bg-[#eff4ff] px-3 py-2 rounded-xl text-xs border border-[#d2e4ff]">
              <div className="flex items-center gap-2 min-w-0">
                <Utensils className="w-3.5 h-3.5 text-[#006782] shrink-0" />
                <span className="text-[11px] text-[#002546] font-medium truncate italic">
                  "{item.note}"
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditNote(item)}
                  className="text-[11px] text-[#006782] font-bold hover:underline flex items-center gap-0.5"
                >
                  <Edit3 className="w-3 h-3" /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-[11px] text-[#ba1a1a] hover:opacity-80 p-0.5"
                  title="Eliminar plato"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Financial Live Summary */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-[#42474f]">
          <span>Subtotal Platos</span>
          <span className="font-mono font-bold text-[#002546]">${subtotalUsd.toFixed(2)} USD</span>
        </div>
        {!isExcursionPerspective ? (
          <div className="flex items-center justify-between text-xs text-[#42474f]">
            <span>Servicio / Propina Sugerida (10%)</span>
            <span className="font-mono font-bold text-[#002546]">${tipUsd.toFixed(2)} USD</span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg">
            <span>Régimen Excursión Marítima:</span>
            <span className="font-bold text-sky-900">0% (Sin recargo)</span>
          </div>
        )}
        <div className="border-t border-gray-100 pt-2 flex items-baseline justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#002546]">Total a Facturar</span>
            <span className="text-[11px] text-[#006782] font-bold font-mono">
              ≈ {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
            </span>
          </div>
          <span className="text-2xl font-extrabold text-[#002546] font-mono">
            ${totalUsd.toFixed(2)} <span className="text-xs text-gray-500">USD</span>
          </span>
        </div>
      </section>

      {/* Action Button: Sincronizar KDS */}
      <section className="pt-1">
        <button
          type="button"
          onClick={handleSyncOrderWithKitchen}
          disabled={isSyncingWithKitchen || items.length === 0}
          className="w-full bg-[#002546] hover:bg-[#0d3b66] text-white py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all disabled:opacity-50 font-bold text-xs"
        >
          <Flame className="w-4 h-4 text-[#57d1fd]" />
          <span>
            {isSyncingWithKitchen
              ? 'Sincronizando con Fogón del Chef...'
              : `Sincronizar y Notificar a Cocina KDS (${selectedTimeChip})`}
          </span>
        </button>
      </section>

      {/* Note Edit Modal */}
      {isEditingNoteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl border border-gray-200 flex flex-col gap-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-[#002546]">Instrucción Especial para Fogón</h3>
              <button
                type="button"
                onClick={() => setIsEditingNoteModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={3}
              value={tempNoteText}
              onChange={(e) => setTempNoteText(e.target.value)}
              placeholder="Ej: Bien tostado, limón extra, sin cebolla..."
              className="w-full p-2.5 text-xs rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#006782] focus:ring-1 focus:ring-[#006782]"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingNoteModalOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#002546] text-white shadow-xs active:scale-95"
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
