import React, { useState } from 'react';
import { Order } from '../types';
import { soundService } from '../services/soundService';

interface FiscalInvoiceModalProps {
  order?: Order | null;
  bcvRate: number;
  onClose: () => void;
}

export const FiscalInvoiceModal: React.FC<FiscalInvoiceModalProps> = ({
  order,
  bcvRate,
  onClose,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyInvoiceLink = () => {
    soundService.playBell();
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    showToast('Factura copiada al portapapeles');
  };

  const downloadPdfSim = () => {
    soundService.playCashChime();
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*COMPROBANTE FISCAL DIGITAL - INVERSIONES VIRGEN DEL VALLE C.A.*\n` +
      `RIF: J-40536768-7\n` +
      `Factura: FACT-00018492 | Control: 00-0049281\n` +
      `Cliente: Carlos E. Mendoza (V-14.892.304)\n` +
      `Ubicación: Toldo VIP #14 (Orilla Este - Bahía de Buche)\n` +
      `Total Liquidado: Bs. 3.161,00 ($58.00 USD)\n` +
      `Tasa Oficial BCV: ${bcvRate.toFixed(2)} Bs/$\n` +
      `Pago: Pago Móvil Banesco Ref #849201\n` +
      `Verificación SENIAT: SNAT/2024 Válido Fiscalmente`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    showToast('Enviando comprobante por WhatsApp...');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#002546]/80 backdrop-blur-sm flex flex-col items-center justify-start animate-fade-in print:p-0 print:bg-white">
      {/* Header Bar */}
      <header className="sticky top-0 w-full z-50 pt-[env(safe-area-inset-top,0px)] bg-[#f8f9ff]/90 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,37,70,0.06)] print:hidden">
        <div className="max-w-md mx-auto h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#e5eeff] flex items-center justify-center text-[#002546]">
              <span className="material-symbols-outlined text-[20px]">sailing</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-[#006782] font-bold">
                Virgen del Valle
              </span>
              <span className="text-[15px] font-bold text-[#002546] leading-tight">
                Menú Digital Pedidos
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-full bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002546] text-xs font-bold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#002546] text-white rounded-full shadow-xl text-center text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-[#57d1fd] text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="w-full max-w-md px-4 py-4 flex flex-col gap-4 pb-20 print:p-0">
        {/* Top Action Bar */}
        <div className="w-full flex items-center justify-between print:hidden">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-[#006782] hover:text-[#002546] transition-colors py-1.5 px-3 rounded-full bg-[#eff4ff] text-xs font-bold"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Volver a Mi Cuenta</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={copyInvoiceLink}
              id="btn-copy-link"
              className="w-9 h-9 rounded-full bg-[#eff4ff] text-[#002546] flex items-center justify-center transition-all hover:bg-[#dce9ff] active:scale-95 shadow-xs"
              title="Copiar enlace directo"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
            </button>
            <button
              onClick={downloadPdfSim}
              className="w-9 h-9 rounded-full bg-[#eff4ff] text-[#002546] flex items-center justify-center transition-all hover:bg-[#dce9ff] active:scale-95 shadow-xs"
              title="Descargar Comprobante PDF / Imprimir"
            >
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            </button>
          </div>
        </div>

        {/* Status & Authority Badge Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D1FAE5] text-[#065F46] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              <span className="text-[11px] uppercase tracking-wider font-bold">
                EMITIDA Y CONCILIADA
              </span>
            </div>
            <div className="flex items-center gap-1 text-[#42474f] text-[11px] px-2.5 py-1 rounded-full bg-[#eff4ff]">
              <span className="material-symbols-outlined text-[15px] text-[#e9c176]">verified</span>
              <span className="font-semibold">SNAT/2024 SENIAT</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#002546] tracking-tight">
            Comprobante Fiscal Digital
          </h1>
        </div>

        {/* MAIN FISCAL RECEIPT TICKET (Digital Luxury Seaside Ticket) */}
        <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-[#d2e4ff]/60 print:shadow-none print:border-none">
          {/* Golden Maritime Header Accent Line */}
          <div className="w-full h-2 bg-gradient-to-r from-[#006782] via-[#e9c176] to-[#57d1fd]"></div>

          {/* Legal Watermark & Brand Header */}
          <div className="p-4 bg-gradient-to-b from-[#eff4ff]/60 to-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[#002546] tracking-tight">
                  Inversiones Virgen del Valle C.A.
                </span>
                <span className="text-xs font-bold text-[#006782]">RIF: J-40536768-7</span>
                <p className="text-xs text-[#42474f] leading-snug mt-0.5">
                  Sector Bahía de Buche, Carenero, Municipio Brión, Edo. Miranda, Venezuela.
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#002546] shrink-0 shadow-xs border border-[#d2e4ff]">
                <span className="material-symbols-outlined text-[24px]">anchor</span>
              </div>
            </div>

            {/* Serial Numbers & Control Grid */}
            <div className="mt-3 grid grid-cols-2 gap-2 p-3 bg-[#eff4ff] rounded-xl text-[#002546] border border-[#d2e4ff]/50">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#42474f] uppercase tracking-wider font-semibold">
                  Factura N°
                </span>
                <span className="text-sm font-bold text-[#002546]">FACT-00018492</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#42474f] uppercase tracking-wider font-semibold">
                  N° Control Fiscal
                </span>
                <span className="text-sm font-bold text-[#006782]">00-0049281</span>
              </div>
              <div className="flex flex-col mt-1">
                <span className="text-[10px] text-[#42474f] uppercase tracking-wider font-semibold">
                  Serial Sistema
                </span>
                <span className="text-xs font-medium text-[#002546]">VDV-CLOUD-002984</span>
              </div>
              <div className="flex flex-col mt-1">
                <span className="text-[10px] text-[#42474f] uppercase tracking-wider font-semibold">
                  Fecha & Hora
                </span>
                <span className="text-xs font-medium text-[#002546]">Hoy · 01:58 PM</span>
              </div>
            </div>
          </div>

          {/* Separation Perforated Wave Line */}
          <div className="relative w-full flex items-center justify-between px-2 py-1 bg-white">
            <div className="w-4 h-4 -ml-4 rounded-full bg-[#f8f9ff] border-r border-[#d2e4ff]"></div>
            <div className="flex-1 border-b border-dashed border-gray-300 mx-2"></div>
            <div className="w-4 h-4 -mr-4 rounded-full bg-[#f8f9ff] border-l border-[#d2e4ff]"></div>
          </div>

          {/* Customer & Toldo Location Meta */}
          <div className="px-4 py-2 flex flex-col gap-1.5 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#42474f] uppercase tracking-wider font-bold">
                Datos del Cliente
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#bbe9ff] text-[#001f29] text-[10px] font-bold">
                Toldo Frente al Mar
              </span>
            </div>
            <div className="flex flex-col bg-[#eff4ff]/60 p-3 rounded-xl gap-1 border border-[#d2e4ff]/40">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-[#42474f]">Titular:</span>
                <span className="text-xs font-bold text-[#002546]">Carlos E. Mendoza</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-[#42474f]">C.I. / RIF:</span>
                <span className="text-xs font-semibold text-[#001c37]">V-14.892.304</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-[#42474f]">Teléfono:</span>
                <span className="text-xs font-medium text-[#001c37]">0414-2839910</span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-xs text-[#42474f]">Ubicación Playa:</span>
                <span className="text-xs font-bold text-[#006782] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">beach_access</span>
                  Toldo VIP #14 (Orilla Este)
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-[#42474f]">Atendido por:</span>
                <span className="text-xs text-[#002546] font-medium">
                  Yender Rodríguez (#M-04)
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-[#42474f]">Comanda Asignada:</span>
                <span className="text-[11px] text-[#42474f] font-mono font-bold">#CMD-1048</span>
              </div>
            </div>
          </div>

          {/* Itemized Consumptions */}
          <div className="px-4 py-2 flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <span className="text-[11px] uppercase tracking-wider text-[#42474f] font-bold">
                Detalle de Consumo
              </span>
              <span className="text-[11px] text-[#006782] font-bold">Dual USD / Bs.</span>
            </div>
            <div className="flex flex-col divide-y divide-gray-100">
              {/* Item 1 */}
              <div className="flex items-start justify-between gap-2 py-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#eff4ff] flex items-center justify-center text-[11px] font-bold text-[#002546] shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#002546] leading-tight">
                      Pargo Rojo Frito Crispy
                    </span>
                    <span className="text-[11px] text-[#42474f]">
                      1.2 kg · tostones y ensalada caribeña
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs font-bold text-[#002546]">$32.00</span>
                  <span className="text-[11px] text-[#42474f]">
                    Bs. {(32 * bcvRate).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-start justify-between gap-2 py-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#eff4ff] flex items-center justify-center text-[11px] font-bold text-[#002546] shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#002546] leading-tight">
                      Fosforera Playera Caliente
                    </span>
                    <span className="text-[11px] text-[#42474f]">
                      Ración marinera cazuela fresca
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs font-bold text-[#002546]">$14.00</span>
                  <span className="text-[11px] text-[#42474f]">
                    Bs. {(14 * bcvRate).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-start justify-between gap-2 py-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#eff4ff] flex items-center justify-center text-[11px] font-bold text-[#002546] shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#002546] leading-tight">
                      Empanadas de Cazón
                    </span>
                    <span className="text-[11px] text-[#42474f]">
                      Ración x3 artesanales de la casa
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs font-bold text-[#002546]">$6.00</span>
                  <span className="text-[11px] text-[#42474f]">
                    Bs. {(6 * bcvRate).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Item 4 */}
              <div className="flex items-start justify-between gap-2 py-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#eff4ff] flex items-center justify-center text-[11px] font-bold text-[#002546] shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#002546] leading-tight">
                      Frappé de Coco Caribeño
                    </span>
                    <span className="text-[11px] text-[#42474f]">
                      $2.00 c/u · coco natural Buche
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs font-bold text-[#002546]">$4.00</span>
                  <span className="text-[11px] text-[#42474f]">
                    Bs. {(4 * bcvRate).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Item 5 */}
              <div className="flex items-start justify-between gap-2 py-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#eff4ff] flex items-center justify-center text-[11px] font-bold text-[#002546] shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#002546] leading-tight">
                      Cerveza Polar Pilsen Fría
                    </span>
                    <span className="text-[11px] text-[#42474f]">
                      $1.00 c/u · vestida de novia
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs font-bold text-[#002546]">$2.00</span>
                  <span className="text-[11px] text-[#42474f]">
                    Bs. {(2 * bcvRate).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Separation Perforated Line */}
          <div className="relative w-full flex items-center justify-between px-2 py-1 bg-white">
            <div className="w-4 h-4 -ml-4 rounded-full bg-[#f8f9ff] border-r border-[#d2e4ff]"></div>
            <div className="flex-1 border-b border-dashed border-gray-300 mx-2"></div>
            <div className="w-4 h-4 -mr-4 rounded-full bg-[#f8f9ff] border-l border-[#d2e4ff]"></div>
          </div>

          {/* Fiscal Summary & Dual Currency Liquidation */}
          <div className="p-4 bg-[#eff4ff]/40 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs text-[#42474f]">
              <span>Base Imponible Gravable:</span>
              <span className="font-semibold text-[#002546]">
                $50.00 / Bs. {(50 * bcvRate).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-[#42474f]">
              <span>I.V.A. (16% Fiscal):</span>
              <span className="font-semibold text-[#002546]">
                $8.00 / Bs. {(8 * bcvRate).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-[#42474f]">
              <span>Subtotal Consumo:</span>
              <span className="font-semibold text-[#002546]">
                $58.00 USD / Bs. {(58 * bcvRate).toFixed(2)}
              </span>
            </div>

            {/* IGTF Exemption Highlight */}
            <div className="mt-1 p-2.5 rounded-xl bg-[#d2e4ff]/60 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-[#006782]">
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                <span className="font-medium">Exención IGTF 3% (Pago 100% Bolívares):</span>
              </div>
              <span className="font-bold text-[#006782]">Ahorro: $0.00</span>
            </div>

            {/* Grand Total Hero Card inside Ticket */}
            <div className="mt-2 p-3 rounded-xl bg-[#002546] text-white shadow-md flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#57d1fd] uppercase tracking-wider font-bold">
                  Total Liquidado
                </span>
                <span className="text-xl font-extrabold text-white leading-tight">
                  Bs. {(58 * bcvRate).toFixed(2)}
                </span>
                <span className="text-[11px] text-[#d2e4ff]">
                  Equivalente: $58.00 USD
                </span>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-[10px] text-[#d2e4ff] uppercase tracking-wider">
                  Tasa Oficial BCV
                </span>
                <span className="text-sm font-bold text-[#57d1fd]">
                  {bcvRate.toFixed(2)} Bs/$
                </span>
                <span className="text-[9px] text-[#d2e4ff]/80">Propagada Starlink</span>
              </div>
            </div>

            {/* Payment Method Details */}
            <div className="mt-2 p-3 bg-white rounded-xl border border-gray-200 text-xs flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[#42474f]">Forma de Pago:</span>
                <span className="font-bold text-[#002546] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                  Pago Móvil Interbancario (Banesco)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#42474f]">Referencia Bancaria:</span>
                <span className="font-mono font-bold text-[#006782]">#849201</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#42474f]">Estado de Liquidación:</span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                  CONCILIADO EN CUENTA RECEPTORA
                </span>
              </div>
            </div>

            {/* SENIAT Verification QR & Cryptographic Seal */}
            <div className="mt-2 pt-3 border-t border-dashed border-gray-300 flex items-center gap-3">
              <div className="w-16 h-16 bg-white p-1 rounded-xl border border-gray-300 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[48px] text-[#002546]">qr_code_2</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-[#006782] uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">security</span>
                  Sello Fiscal Electrónico SENIAT
                </span>
                <span className="text-[9px] font-mono text-gray-500 break-all leading-tight">
                  SHA256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                </span>
                <span className="text-[9px] text-gray-400 mt-0.5">
                  Providencia SNAT/2014/0032 · Válido a efectos tributarios
                </span>
              </div>
            </div>

            {/* Nautical Footer Farewell */}
            <div className="mt-3 text-center text-[10px] text-gray-500 italic pb-1">
              "¡Gracias por su grata visita a Playa Buche! Que la Virgen del Valle bendiga su navegación y proteja su regreso."
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 print:hidden">
          <button
            onClick={downloadPdfSim}
            className="w-full h-11 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors active:scale-98"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Imprimir / Guardar Comprobante PDF</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              <span>Enviar por WhatsApp</span>
            </button>
            <button
              onClick={onClose}
              className="h-10 bg-white hover:bg-gray-100 text-[#002546] border border-gray-300 rounded-xl text-xs font-bold flex items-center justify-center transition-colors shadow-xs"
            >
              <span>Regresar al Menú</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
