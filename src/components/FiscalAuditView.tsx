import React, { useState } from 'react';
import {
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Receipt,
  Sparkles,
  Lock,
  PhoneCall,
  CreditCard,
  Building,
  RotateCw,
  Award,
  Calendar,
  UserCheck
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface FiscalAuditViewProps {
  bcvRate: number;
  onOpenFiscalInvoice?: () => void;
}

type AuditCategory = 'todos' | 'pagomovil' | 'efectivo' | 'alertas';

interface AuditRecord {
  id: string;
  category: 'pagomovil' | 'efectivo' | 'alertas';
  ref: string;
  toldo: string;
  mesonero: string;
  amountUsd: number;
  amountBs: number;
  bank?: string;
  clientPhone?: string;
  details?: string;
  serials?: string;
  imageUrl?: string;
  ocrBadge?: string;
  statusText: string;
  shaHash: string;
  syncTime: string;
}

const AUDIT_RECORDS: AuditRecord[] = [];

export const FiscalAuditView: React.FC<FiscalAuditViewProps> = ({
  bcvRate,
  onOpenFiscalInvoice
}) => {
  const [activeFilter, setActiveFilter] = useState<AuditCategory>('todos');
  const [isSealing, setIsSealing] = useState<boolean>(false);
  const [isActaApproved, setIsActaApproved] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    try {
      soundService.playSuccess();
    } catch {}
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const filteredRecords = AUDIT_RECORDS.filter((rec) => {
    if (activeFilter === 'todos') return true;
    return rec.category === activeFilter;
  });

  const handleEmitActaZ = () => {
    setIsSealing(true);
    soundService.playBell();
    setTimeout(() => {
      setIsSealing(false);
      setIsActaApproved(true);
      showToast('Acta Z emitida y sellada con hash digital SHA-256 en bóveda fiscal');
      if (onOpenFiscalInvoice) {
        setTimeout(() => onOpenFiscalInvoice(), 600);
      }
    }, 1200);
  };

  const handleExportCsv = () => {
    const headers = 'ID,Referencia,Toldo,Mesonero,Monto_USD,Monto_Bs,Metodo,Estado,Hash_SHA256\n';
    const rows = AUDIT_RECORDS.map(
      (r) =>
        `"${r.id}","${r.ref}","${r.toldo}","${r.mesonero}",${r.amountUsd},${(r.amountUsd * bcvRate).toFixed(2)},"${r.category}","${r.statusText}","${r.shaHash}"`
    ).join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Libro_Diario_Playa_Buche_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    showToast('Libro Diario y Conciliados CSV exportados con éxito');
  };

  return (
    <div className="flex flex-col gap-4 text-[#001c37]">
      {/* Top Banner: Status & Connectivity Mesh */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 relative overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006782] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#006782]"></span>
            </span>
            <span className="text-xs uppercase tracking-wider text-[#006782] font-bold">
              Starlink Buche Terminal #01
            </span>
          </div>
          <div className="bg-[#eff4ff] px-2.5 py-0.5 rounded-full flex items-center gap-1.5 text-xs text-[#002546] font-semibold border border-[#d2e4ff]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#006782]" />
            <span>Sincronización 100%</span>
          </div>
        </div>

        <div className="mt-2.5 flex flex-col">
          <h1 className="text-xl font-bold text-[#002546] tracking-tight">
            Auditoría de Arqueo Fiscal
          </h1>
          <p className="text-xs text-[#42474f]">
            Bahía Buche • Conciliación de Contingencia Offline en Muelle
          </p>
        </div>

        {/* Key Metas */}
        <div className="grid grid-cols-2 gap-2 pt-3">
          <div className="bg-[#eff4ff] p-2.5 rounded-xl flex items-center gap-2 border border-[#d2e4ff]">
            <div className="w-8 h-8 rounded-lg bg-[#bbe9ff] flex items-center justify-center text-[#006782] shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-[#42474f] font-semibold">Tasa del día Fijada</span>
              <span className="text-xs text-[#002546] font-extrabold font-mono">
                {bcvRate.toFixed(2)} Bs/$
              </span>
            </div>
          </div>

          <div className="bg-[#eff4ff] p-2.5 rounded-xl flex items-center gap-2 border border-[#d2e4ff]">
            <div className="w-8 h-8 rounded-lg bg-[#ffdea5] flex items-center justify-center text-[#4d3600] shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-[10px] text-[#42474f] font-semibold">Auditor en Turno</span>
              <span className="text-xs text-[#002546] font-extrabold truncate">
                Carlos M. (Socio #1)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Big Metric: Arqueo Total Card */}
      <section className="bg-[#002546] text-white rounded-2xl p-4 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs tracking-wider uppercase text-[#bbe9ff] font-semibold">
            Total Facturado de la Jornada
          </span>
          <span className="inline-flex items-center gap-1 bg-white/15 px-2.5 py-0.5 rounded-full text-white text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#57d1fd]" /> Cuadre 100%
          </span>
        </div>

        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-white">
            $0.00
          </span>
          <span className="text-sm text-[#bbe9ff] font-bold">USD</span>
        </div>
        <span className="text-xs text-[#bbe9ff] font-semibold font-mono block mt-0.5">
          ≈ 0.00 Bs (En libros)
        </span>

        {/* Secondary summary badges */}
        <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-white/15">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#bbe9ff]">Comprobantes Offline</span>
            <span className="text-sm font-bold text-white">0 Transacciones</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#bbe9ff]">Discrepancia / Descuadre</span>
            <span className="text-sm font-bold text-emerald-300 font-mono">$0.00 USD</span>
          </div>
        </div>
      </section>

      {/* Breakdown by Payment Instrument */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#002546]">Desglose por Instrumento</h2>
          <span className="text-xs text-[#006782] font-bold">4 Vías de Cobro</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Pago Movil */}
          <div className="bg-white p-3 rounded-2xl shadow-xs border border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#002546]">
                <PhoneCall className="w-4 h-4 text-[#006782]" />
              </div>
              <span className="text-[10px] bg-[#bbe9ff] text-[#005870] px-2 py-0.5 rounded-full font-bold">
                0 ops
              </span>
            </div>
            <div className="mt-2">
              <span className="text-[11px] text-[#42474f] block">Pago Móvil P2P</span>
              <span className="text-sm font-bold text-[#002546] font-mono">$0.00</span>
              <span className="text-[10px] text-[#42474f] block font-mono">
                0.00 Bs
              </span>
            </div>
            <div className="w-full bg-[#eff4ff] h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-[#006782] h-full rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>

          {/* Efectivo Divisas */}
          <div className="bg-white p-3 rounded-2xl shadow-xs border border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#ffdea5] flex items-center justify-center text-[#4d3600]">
                <Coins className="w-4 h-4" />
              </div>
              <span className="text-[10px] bg-[#ffdea5] text-[#4d3600] px-2 py-0.5 rounded-full font-bold">
                0 ops
              </span>
            </div>
            <div className="mt-2">
              <span className="text-[11px] text-[#42474f] block">Efectivo Muelle</span>
              <span className="text-sm font-bold text-[#002546] font-mono">$0.00</span>
              <span className="text-[10px] text-[#42474f] block">Gaveta Churuata</span>
            </div>
            <div className="w-full bg-[#eff4ff] h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>

          {/* Zelle / Transferencias Extranjeras */}
          <div className="bg-white p-3 rounded-2xl shadow-xs border border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#002546]">
                <Building className="w-4 h-4 text-[#006782]" />
              </div>
              <span className="text-[10px] bg-[#eff4ff] text-[#002546] px-2 py-0.5 rounded-full font-bold">
                0 ops
              </span>
            </div>
            <div className="mt-2">
              <span className="text-[11px] text-[#42474f] block">Zelle / Wire</span>
              <span className="text-sm font-bold text-[#002546] font-mono">$0.00</span>
              <span className="text-[10px] text-[#42474f] block">BOA Oficial</span>
            </div>
            <div className="w-full bg-[#eff4ff] h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-[#002546] h-full rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>

          {/* POS Satelital */}
          <div className="bg-white p-3 rounded-2xl shadow-xs border border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#002546]">
                <CreditCard className="w-4 h-4 text-[#006782]" />
              </div>
              <span className="text-[10px] bg-[#eff4ff] text-[#002546] px-2 py-0.5 rounded-full font-bold">
                0 ops
              </span>
            </div>
            <div className="mt-2">
              <span className="text-[11px] text-[#42474f] block">POS Satelital</span>
              <span className="text-sm font-bold text-[#002546] font-mono">$0.00</span>
              <span className="text-[10px] text-[#42474f] block font-mono">
                0.00 Bs (BNC)
              </span>
            </div>
            <div className="w-full bg-[#eff4ff] h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-[#006782] h-full rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Audit Tabs Filter */}
      <section className="pt-1">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" id="audit-filter-tabs">
          <button
            onClick={() => setActiveFilter('todos')}
            className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
              activeFilter === 'todos'
                ? 'bg-[#002546] text-white shadow-xs'
                : 'bg-white text-[#42474f] hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Todos (0)
          </button>
          <button
            onClick={() => setActiveFilter('pagomovil')}
            className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
              activeFilter === 'pagomovil'
                ? 'bg-[#002546] text-white shadow-xs'
                : 'bg-white text-[#42474f] hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Pago Móvil (0)
          </button>
          <button
            onClick={() => setActiveFilter('efectivo')}
            className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
              activeFilter === 'efectivo'
                ? 'bg-[#002546] text-white shadow-xs'
                : 'bg-white text-[#42474f] hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Efectivo Bóveda (0)
          </button>
          <button
            onClick={() => setActiveFilter('alertas')}
            className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
              activeFilter === 'alertas'
                ? 'bg-[#ba1a1a] text-white shadow-xs'
                : 'bg-white text-[#ba1a1a] hover:bg-red-50 border border-gray-200'
            }`}
          >
            Observaciones (0)
          </button>
        </div>
      </section>

      {/* Itemized Synchronized Records */}
      <section className="flex flex-col gap-3">
        {filteredRecords.map((rec) => (
          <div
            key={rec.id}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col gap-2.5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#006782]">
                  {rec.category === 'efectivo' ? (
                    <Lock className="w-4 h-4" />
                  ) : rec.category === 'alertas' ? (
                    <AlertTriangle className="w-4 h-4 text-[#ba1a1a]" />
                  ) : (
                    <Receipt className="w-4 h-4" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#002546]">{rec.ref}</span>
                  <span className="text-[11px] text-[#42474f]">
                    {rec.toldo} • Mesonero: {rec.mesonero}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-bold text-[#002546] font-mono">
                  ${rec.amountUsd.toFixed(2)}
                </span>
                <span className="text-[10px] text-[#42474f] block font-mono">
                  {(rec.amountUsd * bcvRate).toFixed(2)} Bs
                </span>
              </div>
            </div>

            {/* Details box */}
            <div className="grid grid-cols-2 gap-2 bg-[#eff4ff] p-2.5 rounded-xl text-xs border border-[#d2e4ff]">
              {rec.bank && (
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#42474f]">Banco Emisor</span>
                  <span className="font-semibold text-[#002546]">{rec.bank}</span>
                </div>
              )}
              {rec.clientPhone && (
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#42474f]">Teléfono Cliente</span>
                  <span className="font-semibold text-[#002546] font-mono">{rec.clientPhone}</span>
                </div>
              )}
              {rec.details && !rec.bank && (
                <div className="flex flex-col col-span-2">
                  <span className="text-[10px] text-[#42474f]">Detalle Operativo</span>
                  <span className="font-medium text-[#002546] leading-snug">{rec.details}</span>
                </div>
              )}
              {rec.serials && (
                <div className="flex flex-col col-span-2 pt-1 border-t border-[#d2e4ff]">
                  <span className="text-[10px] text-[#42474f]">Seriales Registrados:</span>
                  <span className="font-mono text-[10px] text-[#002546]">{rec.serials}</span>
                </div>
              )}
            </div>

            {/* OCR & sync info */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                {rec.imageUrl && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden relative shadow-2xs border border-gray-200 shrink-0">
                    <img
                      className="w-full h-full object-cover"
                      alt="Captura comprobante digital"
                      src={rec.imageUrl}
                    />
                  </div>
                )}
                <div className="flex flex-col">
                  {rec.ocrBadge && (
                    <span className="text-[11px] text-[#006782] font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#006782]" />
                      <span>{rec.ocrBadge}</span>
                    </span>
                  )}
                  <span className="text-[10px] text-[#42474f]">{rec.syncTime}</span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="bg-[#bbe9ff] text-[#005870] px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {rec.statusText}
                </span>
                <span className="text-[9px] text-gray-500 font-mono mt-0.5">{rec.shaHash}</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Waitstaff Offline Settlement Status (Paz y Salvo) */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#002546]">Liquidación de Mesoneros</h2>
            <span className="text-[11px] text-[#42474f]">Paz y Salvo Operativo de Muelle</span>
          </div>
          <span className="text-xs bg-[#bbe9ff] text-[#005870] px-2.5 py-0.5 rounded-full font-bold">
            0/0 Solventes
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-center py-6 text-sm text-gray-500 italic">
            No hay mesoneros con liquidación pendiente.
          </div>
        </div>
      </section>

      {/* Final Actions & Digital Fiscal Signature */}
      <section className="flex flex-col gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleEmitActaZ}
          disabled={isSealing}
          id="btn-aprobar-arqueo"
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all ${
            isActaApproved
              ? 'bg-[#006782] text-white'
              : 'bg-[#002546] hover:bg-[#0d3b66] text-white'
          }`}
        >
          {isSealing ? (
            <>
              <RotateCw className="w-4 h-4 text-[#57d1fd] animate-spin" />
              <span>Sellando Cierre Fiscal...</span>
            </>
          ) : isActaApproved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-[#57d1fd]" />
              <span>Arqueo Certificado y Cerrado</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-[#57d1fd]" />
              <span>Aprobar Arqueo y Emitir Acta Z (PDF)</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleExportCsv}
          className="w-full bg-white hover:bg-gray-50 text-[#002546] py-3 px-4 rounded-xl font-bold text-xs shadow-xs border border-gray-200 active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          <FileSpreadsheet className="w-4 h-4 text-[#006782]" />
          <span>Exportar Libro Diario y Conciliados (CSV)</span>
        </button>

        {/* Institutional Cryptographic Seal Card */}
        <div className="bg-[#eff4ff] rounded-2xl p-4 flex flex-col items-center text-center gap-2 border border-[#d2e4ff]">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#006782] shadow-xs">
            <Award className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-[#002546]">
              Inversiones Virgen del Valle C.A.
            </span>
            <span className="text-[10px] text-[#006782] font-semibold font-mono">
              RIF: J-40536768-7 • Carenero / Bahía Buche
            </span>
            <span className="text-[10px] text-gray-500 mt-1 font-mono break-all">
              Sello Digital Fiscal: a9f830bb214c712e0984dd8194cf3a
            </span>
          </div>
        </div>
      </section>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#002546] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 z-50 animate-fade-in border border-[#57d1fd]/40">
          <CheckCircle2 className="w-4 h-4 text-[#57d1fd] shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
