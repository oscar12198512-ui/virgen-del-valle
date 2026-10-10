import React, { useState } from 'react';
import {
  Calculator,
  X,
  ArrowRightLeft,
  DollarSign,
  Coins,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Smartphone,
  Wallet
} from 'lucide-react';
import { formatUsd, formatBsDirect } from '../utils/currencyFormatter';
import { soundService } from '../services/soundService';

interface CurrencyCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  bcvRate: number;
  initialTotalUsd?: number;
}

export const CurrencyCalculatorModal: React.FC<CurrencyCalculatorModalProps> = ({
  isOpen,
  onClose,
  bcvRate,
  initialTotalUsd = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'change' | 'converter'>('change');

  // Change / Vuelto Calculator States
  const [billTotalUsd, setBillTotalUsd] = useState<string>(
    initialTotalUsd > 0 ? initialTotalUsd.toFixed(2) : '35.00'
  );
  const [paidUsd, setPaidUsd] = useState<string>('50');
  const [paidBs, setPaidBs] = useState<string>('0');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Converter States
  const [convertUsd, setConvertUsd] = useState<string>('20');
  const [convertBs, setConvertBs] = useState<string>(
    (20 * bcvRate).toFixed(2)
  );

  if (!isOpen) return null;

  // Change Calculations
  const billUsdNum = parseFloat(billTotalUsd) || 0;
  const billBsNum = billUsdNum * bcvRate;

  const paidUsdNum = parseFloat(paidUsd) || 0;
  const paidBsNum = parseFloat(paidBs) || 0;
  const totalPaidInUsd = paidUsdNum + (paidBsNum / (bcvRate || 1));

  const changeUsd = Math.max(0, totalPaidInUsd - billUsdNum);
  const changeBs = changeUsd * bcvRate;
  const missingUsd = Math.max(0, billUsdNum - totalPaidInUsd);
  const missingBs = missingUsd * bcvRate;

  const handleQuickPaidUsd = (amount: number) => {
    setPaidUsd(amount.toString());
    setPaidBs('0');
    soundService.playSuccess();
  };

  const handleQuickBillPreset = (amount: number) => {
    setBillTotalUsd(amount.toString());
    soundService.playSuccess();
  };

  const handleConvertUsdChange = (val: string) => {
    setConvertUsd(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setConvertBs((num * bcvRate).toFixed(2));
    } else {
      setConvertBs('');
    }
  };

  const handleConvertBsChange = (val: string) => {
    setConvertBs(val);
    const num = parseFloat(val);
    if (!isNaN(num) && bcvRate > 0) {
      setConvertUsd((num / bcvRate).toFixed(2));
    } else {
      setConvertUsd('');
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    soundService.playSuccess();
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
      id="currency-calculator-modal"
    >
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-[#d2e4ff] animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#002546] to-[#006782] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#57d1fd] shadow-inner">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Calculadora Playa & Divisas
              </h3>
              <p className="text-xs text-[#bbe9ff]">
                Tasa del día: <strong className="text-white font-mono">{bcvRate.toFixed(2)} Bs/$</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="p-3 bg-[#eff4ff] border-b border-[#d2e4ff] flex items-center gap-2">
          <button
            onClick={() => setActiveTab('change')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'change'
                ? 'bg-[#002546] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#002546] bg-white/60'
            }`}
          >
            <Coins className="w-4 h-4 text-[#57d1fd]" />
            <span>Cálculo de Vueltos</span>
          </button>
          <button
            onClick={() => setActiveTab('converter')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'converter'
                ? 'bg-[#002546] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#002546] bg-white/60'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-[#006782]" />
            <span>Conversor USD ↔ Bs</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {activeTab === 'change' ? (
            <div className="space-y-4">
              {/* Bill Total Section */}
              <div className="bg-[#f8f9ff] p-3.5 rounded-2xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Total de la Comanda
                  </label>
                  <span className="text-[11px] text-gray-500 font-mono">
                    ≈ {formatBsDirect(billBsNum)}
                  </span>
                </div>

                <div className="relative">
                  <DollarSign className="w-5 h-5 text-[#006782] absolute left-3 top-2.5" />
                  <input
                    type="number"
                    step="any"
                    value={billTotalUsd}
                    onChange={(e) => setBillTotalUsd(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-300 text-lg font-mono font-extrabold text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782]"
                  />
                </div>

                {/* Quick Presets for Total */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-gray-400 font-semibold">Preajustes:</span>
                  {[15, 25, 35, 50, 80].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handleQuickBillPreset(amt)}
                      className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-xs font-mono font-bold text-gray-700 hover:bg-[#eff4ff] hover:border-[#006782]"
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Pays Section */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#d2e4ff] space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#002546] block">
                  Cliente Paga Con:
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[11px] font-bold text-gray-600 block mb-1 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      Efectivo USD:
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={paidUsd}
                      onChange={(e) => setPaidUsd(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-10 px-3 rounded-xl border border-gray-300 text-sm font-mono font-extrabold text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782]"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-gray-600 block mb-1 flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                      Bolívares / Pago Móvil:
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={paidBs}
                      onChange={(e) => setPaidBs(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-10 px-3 rounded-xl border border-gray-300 text-sm font-mono font-extrabold text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782]"
                    />
                  </div>
                </div>

                {/* Common Bills Quick Select */}
                <div>
                  <span className="text-[10px] text-gray-500 font-semibold block mb-1">
                    Billetes comunes de dólares:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[10, 20, 50, 100].map((bill) => (
                      <button
                        key={bill}
                        onClick={() => handleQuickPaidUsd(bill)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold transition-all border ${
                          paidUsd === bill.toString()
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-emerald-50'
                        }`}
                      >
                        Billete ${bill}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setPaidUsd(billTotalUsd);
                        setPaidBs('0');
                        soundService.playSuccess();
                      }}
                      className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200"
                    >
                      Monto Exacto
                    </button>
                  </div>
                </div>
              </div>

              {/* Result: Change to Return or Missing Amount */}
              {missingUsd > 0.01 ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                      Monto Faltante por Cobrar
                    </span>
                    <span className="text-xs font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                      Incompleto
                    </span>
                  </div>
                  <div className="text-2xl font-black text-amber-950 font-mono">
                    {formatUsd(missingUsd)}
                  </div>
                  <p className="text-xs text-amber-800">
                    O en Bolívares (Pago Móvil / Punto): <strong>{formatBsDirect(missingBs)}</strong>
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300 text-emerald-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Vuelto a Entregar al Cliente
                    </span>
                    <span className="text-xs font-black bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                      Vuelto Listo
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div className="text-3xl font-black text-emerald-950 font-mono">
                      {formatUsd(changeUsd)}
                    </div>
                    <button
                      onClick={() => copyToClipboard(changeUsd.toFixed(2), 'usd')}
                      className="text-xs font-bold text-emerald-700 flex items-center gap-1 hover:underline"
                    >
                      {copiedField === 'usd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'usd' ? 'Copiado' : 'Copiar $'}</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-xs">
                    <span className="text-emerald-800 font-semibold">
                      Equivalente en Bolívares (Efectivo/Pago Móvil):
                    </span>
                    <div className="flex items-center gap-2">
                      <strong className="text-emerald-950 font-mono text-sm">
                        {formatBsDirect(changeBs)}
                      </strong>
                      <button
                        onClick={() => copyToClipboard(changeBs.toFixed(2), 'bs')}
                        className="p-1 rounded bg-white/80 hover:bg-white text-emerald-700 transition-colors"
                        title="Copiar Bolívares"
                      >
                        {copiedField === 'bs' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Smart suggestion if no small dollar bills are available */}
                  {changeUsd > 0 && (
                    <div className="bg-white/80 rounded-xl p-2.5 text-[11px] text-emerald-900 border border-emerald-200/60 mt-1">
                      💡 <strong>Sugerencia de Caja:</strong> Si no hay billetes chicos de ${Math.floor(changeUsd)}, puedes dar el cambio completo vía Pago Móvil ({formatBsDirect(changeBs)}) o en billetes de Bs.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* CONVERTER TAB */
            <div className="space-y-4">
              <div className="bg-[#f8f9ff] p-3.5 rounded-2xl border border-gray-200 space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-1">
                    Dólares Americanos (USD $)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-5 h-5 text-emerald-600 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      step="any"
                      value={convertUsd}
                      onChange={(e) => handleConvertUsdChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-300 text-lg font-mono font-extrabold text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-center py-1">
                  <div className="w-8 h-8 rounded-full bg-[#eff4ff] border border-[#d2e4ff] flex items-center justify-center text-[#006782]">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-1">
                    Bolívares Digitales (Bs.)
                  </label>
                  <div className="relative">
                    <span className="text-xs font-bold text-[#006782] absolute left-3 top-3">Bs.</span>
                    <input
                      type="number"
                      step="any"
                      value={convertBs}
                      onChange={(e) => handleConvertBsChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-300 text-lg font-mono font-extrabold text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782]"
                    />
                  </div>
                </div>
              </div>

              {/* Conversion Reference Table */}
              <div className="bg-white rounded-2xl border border-gray-200 p-3 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                  Tabla Rápida a Tasa {bcvRate.toFixed(2)} Bs/$
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[5, 10, 20, 50, 100, 200].map((usd) => (
                    <button
                      key={usd}
                      onClick={() => handleConvertUsdChange(usd.toString())}
                      className="flex items-center justify-between p-2 rounded-xl bg-gray-50 hover:bg-[#eff4ff] border border-gray-200 transition-colors"
                    >
                      <span className="font-extrabold text-[#002546]">${usd} USD</span>
                      <span className="font-mono text-gray-600">{formatBsDirect(usd * bcvRate)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-medium">
            Calculadora Oficial Virgen del Valle
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#002546] hover:bg-[#0d3b66] text-white text-xs font-bold transition-colors shadow-xs"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
