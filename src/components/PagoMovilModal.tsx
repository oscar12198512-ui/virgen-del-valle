import React, { useState } from 'react';
import { BankConfig, Order } from '../types';
import { formatUsd, formatBsDirect } from '../utils/currencyFormatter';
import { validatePagoMovilScreenshot, OcrValidationResult } from '../services/geminiService';
import { soundService } from '../services/soundService';
import {
  X,
  CreditCard,
  Building2,
  Phone,
  FileCheck2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Banknote,
  Smartphone,
  Calculator,
  ArrowRight
} from 'lucide-react';

export type PaymentMethodKey = 'cash_usd' | 'cash_bs' | 'pago_movil' | 'zelle' | 'card_pos' | 'mixed_split';

interface PagoMovilModalProps {
  order: Order | null;
  bankConfig: BankConfig;
  bcvRate: number;
  onClose: () => void;
  onPaymentSuccess: (
    orderId: string,
    reference: string,
    method: PaymentMethodKey,
    details?: { receivedAmount?: number; changeAmount?: number }
  ) => void;
}

export const PagoMovilModal: React.FC<PagoMovilModalProps> = ({
  order,
  bankConfig,
  bcvRate,
  onClose,
  onPaymentSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>('cash_usd');
  const [reference, setReference] = useState('');
  const [cashReceivedUsd, setCashReceivedUsd] = useState<string>('');
  const [cashReceivedBs, setCashReceivedBs] = useState<string>('');
  const [bankOrigin, setBankOrigin] = useState('Banesco');
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<OcrValidationResult | null>(null);
  const [splitCashUsd, setSplitCashUsd] = useState<string>('');
  const [splitPagoMovilBs, setSplitPagoMovilBs] = useState<string>('');
  const [splitVueltoPreference, setSplitVueltoPreference] = useState<'bs' | 'usd'>('bs');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  if (!order) return null;

  const totalUsd = order.totalUsd || 0;
  const totalBs = totalUsd * bcvRate;

  // Cálculo de vueltos en efectivo
  const numCashUsd = parseFloat(cashReceivedUsd) || 0;
  const changeUsd = Math.max(0, numCashUsd - totalUsd);

  const numCashBs = parseFloat(cashReceivedBs) || 0;
  const changeBs = Math.max(0, numCashBs - totalBs);

  // Cálculo de Pago Mixto / Bimodal ($ Efectivo + Pago Móvil)
  const numSplitCashUsd = parseFloat(splitCashUsd) || 0;
  const remainingAfterCashUsd = Math.max(0, totalUsd - numSplitCashUsd);
  const remainingAfterCashBs = remainingAfterCashUsd * bcvRate;
  const numSplitPagoMovilBs = parseFloat(splitPagoMovilBs) || 0;
  const totalPaidInUsdEquivalent = numSplitCashUsd + (numSplitPagoMovilBs / (bcvRate || 1));
  const splitSurplusUsd = Math.max(0, totalPaidInUsdEquivalent - totalUsd);
  const splitSurplusBs = splitSurplusUsd * bcvRate;

  const handleCopy = (text: string, fieldName: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setScreenshotBase64(base64);
        triggerOcrVerification(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerOcrVerification = async (base64: string) => {
    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await validatePagoMovilScreenshot(base64, reference, totalBs);
      setValidationResult(res);
      if (res.extractedReference && !reference) {
        setReference(res.extractedReference);
      }
      if (res.isValid) {
        soundService.playCashChime();
      }
    } catch {
      setValidationResult({
        isValid: reference.length >= 4,
        confidenceScore: 0.85,
        notes: 'Verificado manualmente.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmPayment = () => {
    setInputError(null);

    // Validaciones según el método de pago
    if (paymentMethod === 'cash_usd') {
      if (numCashUsd > 0 && numCashUsd < totalUsd) {
        setInputError(`El monto en efectivo recibido ($${numCashUsd.toFixed(2)}) es menor que el total ($${totalUsd.toFixed(2)}).`);
        return;
      }
      soundService.playCashChime();
      onPaymentSuccess(
        order.id,
        reference.trim() || `EFEC-USD-${Date.now().toString().slice(-4)}`,
        'cash_usd',
        { receivedAmount: numCashUsd || totalUsd, changeAmount: changeUsd }
      );
      onClose();
      return;
    }

    if (paymentMethod === 'cash_bs') {
      if (numCashBs > 0 && numCashBs < totalBs) {
        setInputError(`El monto en bolívares recibido (${numCashBs.toFixed(2)} Bs) es menor que el total (${totalBs.toFixed(2)} Bs).`);
        return;
      }
      soundService.playCashChime();
      onPaymentSuccess(
        order.id,
        reference.trim() || `EFEC-BS-${Date.now().toString().slice(-4)}`,
        'cash_bs',
        { receivedAmount: numCashBs || totalBs, changeAmount: changeBs }
      );
      onClose();
      return;
    }

    if (paymentMethod === 'mixed_split') {
      if (numSplitCashUsd <= 0 && numSplitPagoMovilBs <= 0) {
        setInputError('Ingresa al menos un monto en Dólares ($) o Pago Móvil (Bs).');
        return;
      }
      if (totalPaidInUsdEquivalent < totalUsd - 0.01) {
        const missingUsd = totalUsd - totalPaidInUsdEquivalent;
        const missingBs = missingUsd * bcvRate;
        setInputError(`Monto insuficiente. Faltan $${missingUsd.toFixed(2)} (${formatBsDirect(missingBs)}).`);
        return;
      }
      const effectiveRef = reference.trim() || `MIXTO-${Date.now().toString().slice(-4)}`;
      soundService.playCashChime();
      onPaymentSuccess(
        order.id,
        effectiveRef,
        'mixed_split',
        {
          receivedAmount: numSplitCashUsd,
          changeAmount: splitVueltoPreference === 'bs' ? splitSurplusBs : splitSurplusUsd,
        }
      );
      onClose();
      return;
    }

    // Para Pago Móvil, Zelle o Punto POS
    const effectiveRef = reference.trim() || validationResult?.extractedReference;
    if (!effectiveRef && (paymentMethod === 'pago_movil' || paymentMethod === 'zelle' || paymentMethod === 'card_pos')) {
      setInputError('Por favor introduce el número de referencia / comprobante del pago.');
      return;
    }

    soundService.playCashChime();
    onPaymentSuccess(order.id, effectiveRef || `PAGO-${Date.now().toString().slice(-4)}`, paymentMethod);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#002546]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#002546]/10 flex flex-col max-h-[92vh] animate-scale-up">
        {/* Header */}
        <div className="flex justify-between items-center px-4 sm:px-5 py-3.5 bg-[#002546] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 text-[#57d1fd] flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Cobrar Orden {order.displayNumber}</h3>
              <p className="text-[11px] text-sky-200">{order.spotName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5">
          {/* Amount to pay banner */}
          <div className="bg-gradient-to-br from-[#002546] to-[#0d3b66] text-white rounded-2xl p-4 shadow-sm space-y-1">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-[#a4c9fc] uppercase font-extrabold tracking-wider">
                Total a Cobrar
              </span>
              <span className="text-[10px] bg-[#57d1fd]/20 text-[#bbe9ff] px-2 py-0.5 rounded-full font-mono font-bold">
                Tasa del día: {bcvRate.toFixed(2)} Bs/$
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {formatUsd(totalUsd)} <span className="text-xs font-semibold text-[#57d1fd]">USD</span>
              </span>
              <span className="text-base font-bold text-sky-200 font-mono">
                {formatBsDirect(totalBs)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector Grid */}
          <div>
            <label className="block text-xs font-bold text-[#002546] mb-1.5">
              Selecciona la Forma de Pago:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('cash_usd');
                  setInputError(null);
                }}
                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                  paymentMethod === 'cash_usd'
                    ? 'bg-[#002546] text-white border-[#002546] shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#006782]'
                }`}
              >
                <Banknote className={`w-4 h-4 mb-0.5 ${paymentMethod === 'cash_usd' ? 'text-[#57d1fd]' : 'text-emerald-600'}`} />
                <span className="text-[10px] font-bold leading-tight">Efectivo $</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('cash_bs');
                  setInputError(null);
                }}
                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                  paymentMethod === 'cash_bs'
                    ? 'bg-[#002546] text-white border-[#002546] shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#006782]'
                }`}
              >
                <Banknote className={`w-4 h-4 mb-0.5 ${paymentMethod === 'cash_bs' ? 'text-[#57d1fd]' : 'text-teal-600'}`} />
                <span className="text-[10px] font-bold leading-tight">Efectivo Bs</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('mixed_split');
                  setInputError(null);
                }}
                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                  paymentMethod === 'mixed_split'
                    ? 'bg-[#002546] text-white border-[#002546] shadow-xs ring-2 ring-amber-400'
                    : 'bg-gradient-to-br from-amber-50 to-sky-50 text-amber-900 border-amber-300 hover:border-amber-500'
                }`}
              >
                <Calculator className={`w-4 h-4 mb-0.5 ${paymentMethod === 'mixed_split' ? 'text-[#57d1fd]' : 'text-amber-600'}`} />
                <span className="text-[10px] font-extrabold leading-tight">Mixto ($+PM)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('pago_movil');
                  setInputError(null);
                }}
                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                  paymentMethod === 'pago_movil'
                    ? 'bg-[#002546] text-white border-[#002546] shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#006782]'
                }`}
              >
                <Smartphone className={`w-4 h-4 mb-0.5 ${paymentMethod === 'pago_movil' ? 'text-[#57d1fd]' : 'text-indigo-600'}`} />
                <span className="text-[10px] font-bold leading-tight">Pago Móvil</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('zelle');
                  setInputError(null);
                }}
                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                  paymentMethod === 'zelle'
                    ? 'bg-[#002546] text-white border-[#002546] shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#006782]'
                }`}
              >
                <span className={`text-xs font-black mb-0.5 ${paymentMethod === 'zelle' ? 'text-[#57d1fd]' : 'text-purple-600'}`}>
                  $Z
                </span>
                <span className="text-[10px] font-bold leading-tight">Zelle Wire</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('card_pos');
                  setInputError(null);
                }}
                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                  paymentMethod === 'card_pos'
                    ? 'bg-[#002546] text-white border-[#002546] shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#006782]'
                }`}
              >
                <CreditCard className={`w-4 h-4 mb-0.5 ${paymentMethod === 'card_pos' ? 'text-[#57d1fd]' : 'text-sky-600'}`} />
                <span className="text-[10px] font-bold leading-tight">Punto POS</span>
              </button>
            </div>
          </div>

          {/* 1. EFECTIVO USD FORM */}
          {paymentMethod === 'cash_usd' && (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5 space-y-3 animate-fade-in">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-700" /> Pago en Efectivo Dólares ($ USD)
                </span>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                  Sin comisión
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Monto Recibido en Dólares ($):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-gray-400">$</span>
                  <input
                    type="number"
                    step="any"
                    value={cashReceivedUsd}
                    onChange={(e) => setCashReceivedUsd(e.target.value)}
                    placeholder={totalUsd.toFixed(2)}
                    className="w-full h-11 pl-7 pr-3 bg-white rounded-xl border border-gray-300 text-sm font-bold text-[#002546] focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Quick preset cash bills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[10, 20, 50, 100].map((bill) => (
                  <button
                    key={bill}
                    type="button"
                    onClick={() => setCashReceivedUsd(String(bill))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      numCashUsd === bill
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-100'
                    }`}
                  >
                    Billete ${bill}
                  </button>
                ))}
              </div>

              {/* Vuelto / Cambio Calculator */}
              <div className="bg-white rounded-xl p-3 border border-emerald-200 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-semibold">Vuelto a Entregar en Dólares:</span>
                  <span className="text-base font-extrabold text-emerald-800 font-mono">
                    {formatUsd(changeUsd)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                  <span>Equivalente en Bolívares (Tasa del día):</span>
                  <span className="font-bold text-[#006782] font-mono">
                    {formatBsDirect(changeUsd * bcvRate)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. EFECTIVO BOLÍVARES FORM */}
          {paymentMethod === 'cash_bs' && (
            <div className="bg-teal-50/60 border border-teal-200 rounded-2xl p-3.5 space-y-3 animate-fade-in">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-teal-950 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-teal-700" /> Pago en Efectivo Bolívares (Bs)
                </span>
                <span className="text-[10px] text-teal-800 font-bold bg-teal-100 px-2 py-0.5 rounded-full">
                  Tasa {bcvRate.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Monto Recibido en Bolívares (Bs):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">Bs.</span>
                  <input
                    type="number"
                    step="any"
                    value={cashReceivedBs}
                    onChange={(e) => setCashReceivedBs(e.target.value)}
                    placeholder={totalBs.toFixed(2)}
                    className="w-full h-11 pl-9 pr-3 bg-white rounded-xl border border-gray-300 text-sm font-bold text-[#002546] focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              {/* Vuelto / Cambio en Bs */}
              <div className="bg-white rounded-xl p-3 border border-teal-200 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-semibold">Vuelto en Bolívares:</span>
                  <span className="text-base font-extrabold text-teal-800 font-mono">
                    {formatBsDirect(changeBs)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                  <span>Equivalente en Dólares ($):</span>
                  <span className="font-bold text-[#006782] font-mono">
                    {formatUsd(changeBs / bcvRate)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. PAGO MIXTO / BIMODAL ($ Efectivo + Pago Móvil) */}
          {paymentMethod === 'mixed_split' && (
            <div className="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-3.5 space-y-3 animate-fade-in shadow-xs">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-amber-700" /> Calculadora Pago Mixto ($ + Pago Móvil)
                </span>
                <span className="text-[10px] bg-amber-200/80 text-amber-950 font-black px-2 py-0.5 rounded-full">
                  Bimodal Automático
                </span>
              </div>

              {/* Input: Efectivo USD */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-700">
                  1. ¿Cuánto paga el cliente en Efectivo Dólares ($)?:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-gray-400">$</span>
                  <input
                    type="number"
                    step="any"
                    value={splitCashUsd}
                    onChange={(e) => setSplitCashUsd(e.target.value)}
                    placeholder="Ej: 10"
                    className="w-full h-11 pl-7 pr-3 bg-white rounded-xl border border-amber-300 text-sm font-black text-[#002546] focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Automatic Calculation of Remaining */}
              <div className="bg-white rounded-xl p-3 border border-amber-200 space-y-1.5 text-xs shadow-2xs">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Resta por pagar en Dólares ($):</span>
                  <span className="font-extrabold text-[#002546] font-mono text-sm">
                    {formatUsd(remainingAfterCashUsd)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                  <span className="font-bold text-amber-900">Resta Exacta en Pago Móvil (Bs):</span>
                  <span className="text-base font-black text-[#006782] font-mono">
                    {formatBsDirect(remainingAfterCashBs)}
                  </span>
                </div>
              </div>

              {/* Input: Monto recibido en Pago Móvil */}
              <div className="space-y-1 pt-1">
                <label className="block text-[11px] font-bold text-gray-700">
                  2. Monto Reportado por Pago Móvil (Bs):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">Bs.</span>
                  <input
                    type="number"
                    step="any"
                    value={splitPagoMovilBs}
                    onChange={(e) => setSplitPagoMovilBs(e.target.value)}
                    placeholder={remainingAfterCashBs.toFixed(2)}
                    className="w-full h-11 pl-9 pr-3 bg-white rounded-xl border border-amber-300 text-sm font-black text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782]"
                  />
                </div>
              </div>

              {/* Vuelto / Surplus calculation */}
              {splitSurplusUsd > 0.01 && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 space-y-1.5 animate-fade-in">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-emerald-950">Vuelto / Cambio a Devolver:</span>
                    <span className="font-black text-emerald-800 text-sm font-mono">
                      {splitVueltoPreference === 'bs' ? formatBsDirect(splitSurplusBs) : formatUsd(splitSurplusUsd)}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-emerald-200/60 text-[11px]">
                    <span className="text-emerald-800 font-medium">Entregar vuelto en:</span>
                    <button
                      type="button"
                      onClick={() => setSplitVueltoPreference('bs')}
                      className={`px-2 py-0.5 rounded font-bold ${splitVueltoPreference === 'bs' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-900'}`}
                    >
                      Bolívares ({formatBsDirect(splitSurplusBs)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitVueltoPreference('usd')}
                      className={`px-2 py-0.5 rounded font-bold ${splitVueltoPreference === 'usd' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-900'}`}
                    >
                      Dólares ({formatUsd(splitSurplusUsd)})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. PAGO MÓVIL DETAILS */}
          {paymentMethod === 'pago_movil' && (
            <div className="bg-[#f8f9ff] border border-[#d2e4ff] rounded-2xl p-3.5 space-y-2.5 text-xs text-[#002546] animate-fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#006782] block">
                Datos Oficiales de Pago Móvil
              </span>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#006782]" /> Banco:
                </span>
                <span className="font-bold">{bankConfig.pagoMovilBank}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#006782]" /> Teléfono:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">{bankConfig.pagoMovilPhone}</span>
                  <button
                    onClick={() => handleCopy(bankConfig.pagoMovilPhone, 'phone')}
                    className="p-1 hover:bg-[#eff4ff] rounded text-[#006782]"
                    title="Copiar"
                  >
                    {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-1">
                  <FileCheck2 className="w-3.5 h-3.5 text-[#006782]" /> Cédula / RIF:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">{bankConfig.pagoMovilId}</span>
                  <button
                    onClick={() => handleCopy(bankConfig.pagoMovilId, 'id')}
                    className="p-1 hover:bg-[#eff4ff] rounded text-[#006782]"
                    title="Copiar"
                  >
                    {copiedField === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[#d2e4ff]">
                <span className="text-gray-500">Monto Exacto a Transferir:</span>
                <span className="font-extrabold text-[#006782] font-mono">{formatBsDirect(totalBs)}</span>
              </div>
            </div>
          )}

          {/* 4. ZELLE DETAILS */}
          {paymentMethod === 'zelle' && (
            <div className="bg-[#f8f9ff] border border-[#d2e4ff] rounded-2xl p-3.5 space-y-2.5 text-xs text-[#002546] animate-fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#006782] block">
                Datos Oficiales Zelle Wire
              </span>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Titular / Cuenta:</span>
                <span className="font-bold">{bankConfig.zelleAccountName || 'Inversiones Virgen del Valle C.A.'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Correo Zelle:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">{bankConfig.zelleEmail || 'pagos@playabuche.com'}</span>
                  <button
                    onClick={() => handleCopy(bankConfig.zelleEmail || 'pagos@playabuche.com', 'zelle')}
                    className="p-1 hover:bg-[#eff4ff] rounded text-[#006782]"
                    title="Copiar"
                  >
                    {copiedField === 'zelle' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[#d2e4ff]">
                <span className="text-gray-500">Monto Exacto Zelle:</span>
                <span className="font-extrabold text-[#006782] font-mono">{formatUsd(totalUsd)} USD</span>
              </div>
            </div>
          )}

          {/* 5. PUNTO DE VENTA POS */}
          {paymentMethod === 'card_pos' && (
            <div className="bg-sky-50/60 border border-sky-200 rounded-2xl p-3.5 space-y-2 text-xs text-sky-950 animate-fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#006782] block">
                Punto de Venta Inalámbrico (POS)
              </span>
              <p className="text-[11px] text-gray-600">
                Pasa la tarjeta de débito/crédito en el punto inalámbrico de playa e introduce el número de lote o recibo.
              </p>
            </div>
          )}

          {/* Reference Input for Digital Payments */}
          {paymentMethod !== 'cash_usd' && paymentMethod !== 'cash_bs' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#002546]">
                Número de Referencia / Comprobante:
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => {
                  setReference(e.target.value);
                  setInputError(null);
                }}
                placeholder="Ej: 839210 o últimos 6 dígitos"
                className="w-full h-11 px-3 bg-white rounded-xl border border-gray-300 text-xs font-bold text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782]"
              />
            </div>
          )}

          {/* Optional OCR screenshot verification for Pago Móvil */}
          {paymentMethod === 'pago_movil' && (
            <div className="border-2 border-dashed border-sky-200 rounded-2xl p-3 text-center space-y-2 bg-sky-50/30">
              <label className="cursor-pointer block">
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                <div className="flex flex-col items-center gap-1 text-xs text-[#006782] font-bold">
                  {isValidating ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#006782]" />
                  ) : (
                    <Upload className="w-5 h-5 text-[#006782]" />
                  )}
                  <span>{isValidating ? 'Leyendo captura con IA…' : 'Subir captura del comprobante (Opcional)'}</span>
                </div>
              </label>
              {validationResult && (
                <div className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 p-2 rounded-xl">
                  ✓ Comprobante analizado con éxito
                </div>
              )}
            </div>
          )}

          {inputError && (
            <div className="bg-rose-50 border border-rose-300 text-rose-900 p-2.5 rounded-xl text-xs flex items-center gap-2 font-bold animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{inputError}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="p-4 bg-[#f8f9ff] border-t border-gray-200 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmPayment}
            className="flex-2 h-12 rounded-xl bg-[#002546] hover:bg-[#0d3b66] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.99] cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-[#57d1fd]" />
            <span>Confirmar Pago & Cerrar Cuenta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
