import React, { useState } from 'react';
import { Order, OrderItem } from '../types';
import { formatUsd, formatBsDirect } from '../utils/currencyFormatter';
import { soundService } from '../services/soundService';
import {
  X,
  Receipt,
  Share2,
  Printer,
  Copy,
  Check,
  Users,
  DollarSign,
  Clock,
  MapPin,
  Utensils
} from 'lucide-react';

interface PreCuentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    displayNumber: string;
    spotName: string;
    customerName?: string;
    waiterName?: string;
    items: OrderItem[];
    subtotalUsd: number;
    tipPercent?: number;
    totalUsd: number;
    createdAt?: string;
  } | null;
  bcvRate: number;
}

export const PreCuentaModal: React.FC<PreCuentaModalProps> = ({
  isOpen,
  onClose,
  order,
  bcvRate,
}) => {
  const [selectedTip, setSelectedTip] = useState<number>(order?.tipPercent ?? 10);
  const [splitCount, setSplitCount] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [printed, setPrinted] = useState<boolean>(false);

  if (!isOpen || !order) return null;

  const subtotal = order.subtotalUsd || order.items.reduce((acc, i) => acc + i.quantity * i.unitPriceUsd, 0);
  const tipUsd = (subtotal * selectedTip) / 100;
  const totalUsd = subtotal + tipUsd;
  const totalBs = totalUsd * bcvRate;
  const perPersonUsd = totalUsd / splitCount;
  const perPersonBs = totalBs / splitCount;

  const handleCopyWhatsApp = () => {
    soundService.playBell();
    const itemsText = order.items
      .map((i) => `• ${i.quantity}x ${i.name} - ${formatUsd(i.quantity * i.unitPriceUsd)}`)
      .join('\n');

    const message = `🏖️ *BAHÍA DE BUCHE • CARENERO*\n` +
      `🧾 *Pre-Cuenta Comanda:* ${order.displayNumber}\n` +
      `📍 *Ubicación:* ${order.spotName}\n` +
      `👤 *Mesonero:* ${order.waiterName || 'Servicio de Playa'}\n` +
      `---------------------------------\n` +
      `${itemsText}\n` +
      `---------------------------------\n` +
      `Subtotal: ${formatUsd(subtotal)}\n` +
      `Propina sugerida (${selectedTip}%): ${formatUsd(tipUsd)}\n` +
      `*TOTAL USD: ${formatUsd(totalUsd)}*\n` +
      `*TOTAL BS (Tasa BCV ${bcvRate.toFixed(2)}): ${formatBsDirect(totalBs)}*\n` +
      (splitCount > 1 ? `👥 *Dividido entre ${splitCount} personas:* ${formatUsd(perPersonUsd)} (${formatBsDirect(perPersonBs)}) c/u\n` : '') +
      `\n💳 Métodos de Pago: Efectivo $, Pago Móvil, Punto POS o Zelle.\n` +
      `¡Gracias por visitarnos en Bahía de Buche! ☀️🌊`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(message);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    soundService.playCashChime();
    setPrinted(true);
    setTimeout(() => setPrinted(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#002546] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#57d1fd]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Pre-Cuenta / Estado de Mesa</h2>
              <p className="text-[11px] text-sky-200">Revisión previa para comensales</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Ticket Header Simulator */}
          <div className="text-center pb-3 border-b border-dashed border-gray-300">
            <h3 className="font-extrabold text-[#002546] text-sm uppercase tracking-wider">
              Restaurante & Club Bahía de Buche
            </h3>
            <p className="text-[11px] text-gray-500">Cayo Buche • Carenero, Higuerote</p>
            <div className="flex items-center justify-center gap-3 text-[10px] text-gray-600 mt-1 font-mono">
              <span>Mesa: <b>{order.spotName}</b></span>
              <span>•</span>
              <span>Ticket: <b>{order.displayNumber}</b></span>
            </div>
            <div className="text-[10px] text-gray-500 font-mono mt-0.5">
              Atendido por: {order.waiterName || 'Mesonero de Arena'}
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1">
              <span>Cant. / Plato</span>
              <span>Importe ($)</span>
            </div>
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs py-1 border-b border-gray-100">
                <div className="pr-2">
                  <span className="font-bold text-[#002546]">{item.quantity}x </span>
                  <span className="text-gray-800">{item.name}</span>
                  {item.specialNote && (
                    <p className="text-[10px] text-gray-500 italic pl-4">↳ {item.specialNote}</p>
                  )}
                </div>
                <div className="font-mono font-bold text-[#002546] shrink-0 text-right">
                  {formatUsd(item.quantity * item.unitPriceUsd)}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Tip Selector */}
          <div className="bg-[#f8f9ff] border border-gray-200 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600 font-semibold">Propina de Servicio:</span>
              <div className="flex gap-1">
                {[0, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      setSelectedTip(pct);
                      soundService.playBell();
                    }}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                      selectedTip === pct
                        ? 'bg-[#002546] text-white shadow-2xs'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-2 border-t border-gray-200 space-y-1 text-xs text-gray-700">
              <div className="flex justify-between">
                <span>Subtotal Platos:</span>
                <span className="font-mono font-bold">{formatUsd(subtotal)}</span>
              </div>
              {selectedTip > 0 && (
                <div className="flex justify-between text-[#006782]">
                  <span>Propina ({selectedTip}%):</span>
                  <span className="font-mono font-bold">+{formatUsd(tipUsd)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1 border-t border-gray-200 font-extrabold text-sm text-[#002546]">
                <span>TOTAL A PAGAR:</span>
                <div className="text-right font-mono">
                  <span className="text-base">{formatUsd(totalUsd)}</span>
                  <span className="text-xs text-[#006782] block font-sans font-bold">
                    {formatBsDirect(totalBs)}
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 text-right">
                Tasa Oficial BCV: {bcvRate.toFixed(2)} Bs/$
              </div>
            </div>
          </div>

          {/* Split Bill Calculator */}
          <div className="bg-[#eff4ff] border border-[#d2e4ff] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#006782] font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Dividir cuenta:
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5, 6].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setSplitCount(cnt)}
                    className={`w-6 h-6 rounded-md text-xs font-bold transition-all ${
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
            {splitCount > 1 && (
              <div className="bg-white rounded-lg p-2 text-xs flex justify-between items-center text-[#002546]">
                <span className="font-semibold text-gray-600">Por persona ({splitCount}):</span>
                <div className="text-right font-mono">
                  <span className="font-extrabold text-[#002546]">{formatUsd(perPersonUsd)}</span>
                  <span className="text-[10px] text-gray-500 block">≈ {formatBsDirect(perPersonBs)}</span>
                </div>
              </div>
            )}
          </div>

          {copied && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-2.5 rounded-xl text-xs flex items-center gap-2 font-bold animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>¡Resumen copiado para WhatsApp! Pégalo en el chat del cliente.</span>
            </div>
          )}

          {printed && (
            <div className="bg-sky-50 border border-sky-300 text-sky-800 p-2.5 rounded-xl text-xs flex items-center gap-2 font-bold animate-fade-in">
              <Check className="w-4 h-4 text-[#006782]" />
              <span>Comprobante digital enviado a la impresora térmica de playa.</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 grid grid-cols-2 gap-2">
          <button
            onClick={handleCopyWhatsApp}
            className="py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartir WhatsApp</span>
          </button>
          <button
            onClick={handlePrint}
            className="py-2.5 px-3 rounded-xl bg-[#002546] hover:bg-[#0d3b66] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-[#57d1fd]" />
            <span>Imprimir Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
};
