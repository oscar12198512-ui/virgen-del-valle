import React, { useState } from 'react';
import { WaiterClosingSummary } from '../types';
import { formatUsd, formatBs } from '../utils/currencyFormatter';
import { X, CheckCircle2, QrCode, Share2, Printer, ShieldCheck } from 'lucide-react';
import { soundService } from '../services/soundService';

interface PazYSalvoModalProps {
  closing: WaiterClosingSummary | null;
  bcvRate: number;
  onClose: () => void;
}

export const PazYSalvoModal: React.FC<PazYSalvoModalProps> = ({ closing, bcvRate, onClose }) => {
  const [copiedNotification, setCopiedNotification] = useState(false);

  if (!closing) return null;

  const handleShareWhatsApp = () => {
    const text = `*COMPROBANTE DE PAZ Y SALVO - INVERSIONES VIRGEN DEL VALLE C.A.*\n` +
      `Recibo: ${closing.pazYSalvoNumber || '#PYS-2026-0843'}\n` +
      `Mesonero: ${closing.waiterName} (${closing.waiterRoleNumber})\n` +
      `Venta Total: ${formatUsd(closing.totalCollectedUsd)}\n` +
      `Descuento Pago Móvil (Dueño): -${formatUsd(closing.pagoMovilDeductedUsd || 0)}\n` +
      `Descuento Plataforma Int'l / Zelle (Dueño): -${formatUsd(closing.internationalDeductedUsd || 0)}\n` +
      `Débito Automático Platos Menú: -${formatUsd(closing.dishShareWaiterUsd || 0)}\n` +
      `Débito Automático Propina: -${formatUsd(closing.commissionWaiterUsd)}\n` +
      `----------------------------------------\n` +
      `💵 EFECTIVO FÍSICO ENTREGADO EN SOBRE: ${formatUsd(closing.cashToDeliverUsd)} USD\n` +
      `Equivalente BCV: ${formatBs(closing.cashToDeliverUsd, bcvRate)}\n` +
      `Estado: LIQUIDADO Y EN PAZ Y SALVO\n` +
      `Sello Hash SHA-256: ${closing.pazYSalvoHash?.slice(0, 16)}...\n` +
      `¡Cuentas claras y propinas/platos debitados con éxito!`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePrint = () => {
    soundService.playCashChime();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#002546]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-[#002546]/10 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-5 pt-4 pb-2 border-b border-gray-100">
          <span className="text-[11px] font-bold tracking-wider uppercase text-[#006782]">
            Auditoría Fiscal & Arqueo
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thermal Ticket Content */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4 text-[#002546]" id="thermal-receipt">
          {/* Logo & Company */}
          <div className="text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-[#eff4ff] border border-[#d2e4ff] flex items-center justify-center text-[#002546] mb-1">
              <ShieldCheck className="w-6 h-6 text-[#006782]" />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#006782]">
              INVERSIONES VIRGEN DEL VALLE C.A.
            </span>
            <h3 className="text-lg font-bold leading-tight">
              Comprobante de Paz y Salvo
            </h3>
            <div className="inline-flex items-center gap-1 mt-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>LIQUIDACIÓN EXITOSA • EN PAZ Y SALVO</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {closing.pazYSalvoNumber || '#PYS-2026-0843'} • Hoy • Turno Tarde / Ocaso
            </p>
          </div>

          {/* Waiter Card Profile */}
          <div className="bg-[#f8f9ff] border border-[#d2e4ff] rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#002546] text-white flex items-center justify-center font-bold text-sm">
              {closing.avatarInitials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-[#002546] truncate">
                {closing.waiterName}
              </span>
              <span className="text-xs text-[#006782] font-medium">
                {closing.waiterRoleNumber} • {closing.waiterZone}
              </span>
              <span className="text-[11px] text-gray-500">
                {closing.toldosAttendedCount} toldos atendidos • {closing.ordersClosedCount} comandas cobradas
              </span>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="space-y-2 text-xs border-t border-b border-dashed border-gray-300 py-3">
            <div className="flex justify-between items-center text-gray-700">
              <span className="font-semibold">Venta Bruta Total:</span>
              <span className="font-bold text-sm text-[#002546]">
                {formatUsd(closing.totalCollectedUsd)}
              </span>
            </div>

            {/* Descuentos del Dueño */}
            <div className="pt-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Deducciones aplicadas por Dueño:
            </div>
            <div className="flex justify-between items-center text-rose-700 pl-2">
              <span className="flex items-center gap-1">
                <span>📱</span>
                <span>Pago Móvil descontado:</span>
              </span>
              <span className="font-semibold">
                -{formatUsd(closing.pagoMovilDeductedUsd || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center text-indigo-700 pl-2">
              <span className="flex items-center gap-1">
                <span>🌐</span>
                <span>Plataforma Int'l / Zelle descontado:</span>
              </span>
              <span className="font-semibold">
                -{formatUsd(closing.internationalDeductedUsd || 0)}
              </span>
            </div>

            {/* Débitos Automáticos */}
            <div className="pt-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Débitos Automáticos para el Mesonero:
            </div>
            <div className="flex justify-between items-center text-amber-800 pl-2">
              <span className="flex items-center gap-1">
                <span>🍽️</span>
                <span>Parte por Platos del Menú (débito auto):</span>
              </span>
              <span className="font-semibold">
                -{formatUsd(closing.dishShareWaiterUsd || 0)}
              </span>
            </div>
            {closing.dishesBreakdown && closing.dishesBreakdown.length > 0 && (
              <div className="bg-amber-50/70 rounded-lg p-1.5 ml-2 text-[10px] text-amber-900 space-y-0.5 border border-amber-200/60">
                {closing.dishesBreakdown.map((d, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{d.quantity}x {d.name} (${d.sharePerUnit.toFixed(2)} c/u)</span>
                    <span className="font-bold font-mono">+{formatUsd(d.totalShare)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between items-center text-amber-700 pl-2">
              <span className="flex items-center gap-1">
                <span>🤝</span>
                <span>Propina acumulada (débito auto):</span>
              </span>
              <span className="font-semibold">
                -{formatUsd(closing.commissionWaiterUsd)}
              </span>
            </div>
          </div>

          {/* Highlight Received Box */}
          <div className="bg-[#eff4ff] border border-[#a4c9fc] rounded-xl p-3.5 flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-[#006782] tracking-wider">
              Efectivo Físico Recibido en Gaveta
            </span>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-extrabold text-[#002546]">
                {formatUsd(closing.cashToDeliverUsd)} <span className="text-xs font-semibold text-[#006782]">USD</span>
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                $0.00 CUADRE EXACTO
              </span>
            </div>
            <div className="text-[11px] text-gray-600 pt-0.5 flex justify-between">
              <span>≈ {formatBs(closing.cashToDeliverUsd, bcvRate)} @ {bcvRate.toFixed(2)} Bs/$</span>
            </div>
          </div>

          {/* Audit Verification Stamp with SHA-256 & QR */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex flex-col text-[10px] text-gray-600">
              <span className="font-bold text-gray-800 uppercase">Recibido y Certificado Por:</span>
              <span className="font-medium text-[#002546]">
                {closing.settledByOwner || 'Socio Administrador • Caja Central Buche'}
              </span>
              <span className="font-mono text-[9px] text-gray-500 mt-1 break-all">
                SHA-256: {closing.pazYSalvoHash ? closing.pazYSalvoHash.slice(0, 24) + '...' : '7f83b165...9d12'}
              </span>
            </div>
            <div className="w-12 h-12 bg-white border border-gray-300 rounded-lg p-1 flex flex-col items-center justify-center shrink-0">
              <QrCode className="w-8 h-8 text-[#002546]" />
              <span className="text-[7px] font-bold text-gray-500 uppercase">AUDITORÍA</span>
            </div>
          </div>
        </div>

        {/* Modal CTAs */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
          {copiedNotification && (
            <div className="text-xs text-center py-1 bg-emerald-100 text-emerald-800 rounded-md font-semibold animate-fade-in">
              ¡Comprobante copiado al portapapeles!
            </div>
          )}
          <button
            onClick={handleShareWhatsApp}
            className="w-full h-11 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Share2 className="w-4 h-4 text-[#57d1fd]" />
            <span>Compartir por WhatsApp al Mesonero</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrint}
              className="h-10 bg-white hover:bg-gray-100 text-[#002546] border border-gray-300 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              <span>Imprimir 80mm</span>
            </button>
            <button
              onClick={onClose}
              className="h-10 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-medium text-xs transition-colors"
            >
              Volver a Cierre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
