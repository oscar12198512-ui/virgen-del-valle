import React, { useState } from 'react';
import { OrderItem, MenuItem } from '../types';
import { formatUsd, formatBsDirect } from '../utils/currencyFormatter';
import { soundService } from '../services/soundService';
import {
  X,
  Flame,
  Clock,
  Plus,
  Minus,
  Trash2,
  Utensils,
  Check,
  AlertCircle,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Ship,
  UserCheck
} from 'lucide-react';

export interface OrderBreakdownModalProps {
  isOpen: boolean;
  role: 'client' | 'waiter' | 'excursion';
  spotName: string;
  customerName?: string;
  items: OrderItem[];
  bcvRate: number;
  initialDeliveryTime?: string;
  initialOrderNote?: string;
  tipPercent?: number;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirmOrder: (
    finalItems: OrderItem[],
    deliveryTime: string,
    orderNote: string,
    tipPercent: number
  ) => void;
}

// Opciones rápidas de contornos y preparación habituales en Playa Buche
const COMMON_CONTOUR_TAGS = [
  'Sin tostones',
  'Sin ensalada',
  'Tostones extra',
  'Papas en vez de tostones',
  'Salsa tártara aparte',
  'Sin sal',
  'Sin cebolla',
  'Bien dorado',
  'Poco picante',
  'Limón extra',
  'Para llevar',
];

export const OrderBreakdownModal: React.FC<OrderBreakdownModalProps> = ({
  isOpen,
  role,
  spotName,
  customerName = 'Cliente',
  items: initialItems,
  bcvRate,
  initialDeliveryTime = 'Ahora (~20 min)',
  initialOrderNote = '',
  tipPercent: initialTipPercent = role === 'excursion' ? 0 : 10,
  isSubmitting = false,
  onClose,
  onConfirmOrder,
}) => {
  if (!isOpen) return null;

  const [items, setItems] = useState<OrderItem[]>(() =>
    initialItems.map((item) => ({
      ...item,
      specialNote: item.specialNote || '',
    }))
  );
  const [deliveryTime, setDeliveryTime] = useState<string>(initialDeliveryTime);
  const [orderNote, setOrderNote] = useState<string>(initialOrderNote);
  const [tipPercent, setTipPercent] = useState<number>(
    role === 'excursion' ? 0 : initialTipPercent
  );
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null);

  const subtotalUsd = items.reduce(
    (acc, it) => acc + (it.quantity || 1) * (it.unitPriceUsd || 0),
    0
  );
  const tipUsd = role === 'excursion' ? 0 : (subtotalUsd * tipPercent) / 100;
  const totalUsd = subtotalUsd + tipUsd;
  const totalBs = totalUsd * bcvRate;

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
  };

  // Toggle or append/remove a quick contour tag in an item's specialNote
  const handleToggleContourTag = (itemId: string, tag: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const currentNote = it.specialNote || '';
        const tagPattern = new RegExp(`\\[${tag}\\]`, 'i');

        let nextNote = '';
        if (tagPattern.test(currentNote)) {
          // Si ya lo tiene, removerlo
          nextNote = currentNote.replace(tagPattern, '').replace(/\s{2,}/g, ' ').trim();
        } else {
          // Si no lo tiene, agregarlo con formato claro
          nextNote = currentNote ? `${currentNote} [${tag}]`.trim() : `[${tag}]`;
        }
        return { ...it, specialNote: nextNote };
      })
    );
  };

  const handleCustomNoteChange = (itemId: string, noteText: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, specialNote: noteText } : it))
    );
  };

  const handleConfirm = () => {
    if (items.length === 0) return;
    soundService.playFireAlert();
    onConfirmOrder(items, deliveryTime, orderNote.trim(), tipPercent);
  };

  const roleTitle =
    role === 'client'
      ? 'Desglose de tu Pedido Playero'
      : role === 'waiter'
      ? 'Desglose de Comanda de Mesonero'
      : 'Desglose de Raciones Marítimas';

  const roleSubtitle =
    role === 'client'
      ? 'Revisa cada plato, quita o añade contornos y añade notas antes de enviar a cocina'
      : role === 'waiter'
      ? 'Especifica sin contornos, término o notas especiales antes de entrar al KDS'
      : 'Detalla las raciones y empaque marítimo antes del pase de cocina';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#002546] text-white p-4 flex justify-between items-start shrink-0 relative overflow-hidden">
          <div className="space-y-1 min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#57d1fd] animate-pulse" />
              <span className="text-[10px] uppercase font-black tracking-wider text-[#57d1fd]">
                Paso Pre-Cocina • Revisión y Contornos
              </span>
            </div>
            <h2 className="text-base font-bold text-white leading-tight truncate">
              {roleTitle}
            </h2>
            <p className="text-[11px] text-white/70 line-clamp-1">
              {spotName} {customerName ? `• ${customerName}` : ''}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
            title="Cerrar desglose"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Items Breakdown */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gray-50/50">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-xs flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-[11px] font-medium leading-relaxed">
              {roleSubtitle}
            </p>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">
              No hay platos en la comanda para desglosar.
            </div>
          ) : (
            items.map((item, index) => {
              const itemNote = item.specialNote || '';
              const isNoteBoxOpen = editingNoteItemId === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-2xs space-y-3 transition-all hover:border-[#006782]/40"
                >
                  {/* Top Item Summary: Name, Qty Stepper, Price */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-lg bg-[#eff4ff] text-[#006782] font-black text-xs flex items-center justify-center shrink-0 border border-[#d2e4ff] mt-0.5">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-[#002546] leading-snug">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-black text-[#006782]">
                            {formatUsd(item.unitPriceUsd)} c/u
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Subtotal: {formatUsd((item.quantity || 1) * item.unitPriceUsd)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl border border-gray-200 p-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, -1)}
                        className="w-6 h-6 rounded-lg bg-white hover:bg-gray-100 text-gray-700 flex items-center justify-center shadow-2xs transition-colors"
                        title="Disminuir cantidad"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-black min-w-5 text-center text-[#002546]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="w-6 h-6 rounded-lg bg-white hover:bg-gray-100 text-[#006782] flex items-center justify-center shadow-2xs transition-colors"
                        title="Aumentar cantidad"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors ml-0.5"
                        title="Eliminar plato"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Contornos & Especificaciones Rápidas (Chips) */}
                  <div className="space-y-1.5 pt-2 border-t border-gray-100">
                    <span className="text-[10px] font-black uppercase text-gray-500 block tracking-wider">
                      ¿Deseas personalizar o quitar algún contorno?
                    </span>

                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_CONTOUR_TAGS.map((tag) => {
                        const isSelected = itemNote.toLowerCase().includes(`[${tag.toLowerCase()}]`);

                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleToggleContourTag(item.id, tag)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Campo de Nota personalizada del plato */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setEditingNoteItemId(isNoteBoxOpen ? null : item.id)}
                        className="text-[11px] font-bold text-[#006782] hover:text-[#002546] flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>
                          {itemNote ? 'Editar nota especial de este plato' : '+ Escribir nota adicional al cocinero'}
                        </span>
                      </button>
                      {itemNote && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 truncate max-w-[150px]">
                          Tiene notas
                        </span>
                      )}
                    </div>

                    {(isNoteBoxOpen || itemNote) && (
                      <div className="mt-1.5">
                        <input
                          type="text"
                          value={itemNote}
                          onChange={(e) => handleCustomNoteChange(item.id, e.target.value)}
                          placeholder="Ej: poco picante, aderezo aparte, bien cocido..."
                          className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:border-[#006782] focus:ring-1 focus:ring-[#006782] bg-white text-[#002546] placeholder:text-gray-400"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Entrega y Nota General de la Comanda */}
          <div className="bg-white border border-gray-200 rounded-2xl p-3.5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#002546] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#006782]" />
                <span>Hora deseada de entrega:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  placeholder="Ej: Ahora, 1:30 PM..."
                  className="text-xs font-bold px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-[#002546] w-32 text-center"
                />
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-gray-700 block mb-1">
                Nota general para toda la orden / cocina:
              </span>
              <input
                type="text"
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="Ej: Mesa alérgica a mariscos, traer cubiertos extra..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:border-[#006782] focus:ring-1 focus:ring-[#006782] bg-gray-50/50 text-[#002546] placeholder:text-gray-400"
              />
            </div>

            {/* Propina voluntaria (solo si no es excursión) */}
            {role !== 'excursion' && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                <span className="text-gray-600 font-medium">Propina sugerida de servicio:</span>
                <div className="flex gap-1.5">
                  {[0, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setTipPercent(pct)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                        tipPercent === pct
                          ? 'bg-[#002546] text-white border-[#002546]'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Financial Breakdown & Action Buttons */}
        <div className="bg-white border-t border-gray-200 p-4 space-y-3 shrink-0 shadow-lg">
          <div className="bg-[#eff4ff] border border-[#d2e4ff] rounded-2xl p-3 flex justify-between items-center text-xs">
            <div>
              <span className="text-[10px] text-[#006782] font-black uppercase tracking-wider block">
                Total Comanda ({items.reduce((acc, it) => acc + (it.quantity || 1), 0)} platos)
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-lg font-black text-[#002546]">
                  {formatUsd(totalUsd)}
                </span>
                <span className="text-xs font-mono font-bold text-[#006782]">
                  ≈ {formatBsDirect(totalBs)}
                </span>
              </div>
            </div>

            <span className="text-[10px] text-gray-500 font-mono">
              Tasa: {bcvRate.toFixed(2)} Bs/$
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-12 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl font-bold text-xs transition-colors"
            >
              Volver al Menú
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={items.length === 0 || isSubmitting}
              className="h-12 bg-[#002546] hover:bg-[#0d3b66] disabled:opacity-60 text-white rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enviando a Firebase...</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Confirmar y Enviar a Cocina</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
