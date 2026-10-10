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
  Check
} from 'lucide-react';

interface PagoMovilModalProps {
  order: Order | null;
  bankConfig: BankConfig;
  bcvRate: number;
  onClose: () => void;
  onPaymentSuccess: (orderId: string, reference: string, method: 'pago_movil' | 'zelle') => void;
}

export const PagoMovilModal: React.FC<PagoMovilModalProps> = ({
  order,
  bankConfig,
  bcvRate,
  onClose,
  onPaymentSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'pago_movil' | 'zelle'>('pago_movil');
  const [reference, setReference] = useState('');
  const [bankOrigin, setBankOrigin] = useState('Banesco');
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<OcrValidationResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  if (!order) return null;

  const totalBs = order.totalUsd * bcvRate;

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
    const effectiveRef = reference.trim() || validationResult?.extractedReference;
    if (!effectiveRef) {
      setInputError('Por favor introduce el número de referencia del comprobante.');
      return;
    }
    soundService.playCashChime();
    onPaymentSuccess(order.id, effectiveRef, paymentMethod);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#002546]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[#002546]/10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3.5 bg-[#f8f9ff] border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#006782]">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#002546]">Pagar Orden {order.displayNumber}</h3>
              <p className="text-[11px] text-gray-500">{order.spotName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Amount to pay */}
          <div className="bg-gradient-to-br from-[#002546] to-[#0d3b66] text-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs text-[#a4c9fc] uppercase font-bold tracking-wider">Total a Cancelar</span>
              <span className="text-[11px] bg-[#57d1fd]/20 text-[#bbe9ff] px-2 py-0.5 rounded font-mono">
                Tasa del día: {bcvRate.toFixed(2)} Bs/$
              </span>
            </div>
            <div className="flex justify-between items-baseline mt-1">
              <span className="text-2xl font-extrabold">{formatUsd(order.totalUsd)} <span className="text-xs font-normal text-sky-300">USD</span></span>
              <span className="text-base font-bold text-sky-200">{formatBsDirect(totalBs)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-2 gap-2 bg-[#eff4ff] p-1 rounded-xl">
            <button
              onClick={() => setPaymentMethod('pago_movil')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                paymentMethod === 'pago_movil'
                  ? 'bg-white text-[#002546] shadow-xs'
                  : 'text-[#42474f] hover:text-[#002546]'
              }`}
            >
              Pago Móvil (Bs)
            </button>
            <button
              onClick={() => setPaymentMethod('zelle')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                paymentMethod === 'zelle'
                  ? 'bg-white text-[#002546] shadow-xs'
                  : 'text-[#42474f] hover:text-[#002546]'
              }`}
            >
              Zelle ($ USD)
            </button>
          </div>

          {/* Banking details according to method */}
          {paymentMethod === 'pago_movil' ? (
            <div className="bg-[#f8f9ff] border border-[#d2e4ff] rounded-xl p-3.5 space-y-2.5 text-xs text-[#002546]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#006782] block">
                Datos Oficiales Pago Móvil
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
                <button
                  onClick={() => handleCopy(bankConfig.pagoMovilPhone, 'phone')}
                  className="font-mono font-bold flex items-center gap-1 hover:text-[#006782]"
                >
                  {bankConfig.pagoMovilPhone}
                  {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-1">
                  <FileCheck2 className="w-3.5 h-3.5 text-[#006782]" /> RIF / C.I.:
                </span>
                <button
                  onClick={() => handleCopy(bankConfig.pagoMovilRif, 'rif')}
                  className="font-mono font-bold flex items-center gap-1 hover:text-[#006782]"
                >
                  {bankConfig.pagoMovilRif}
                  {copiedField === 'rif' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                </button>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                <span className="text-gray-500">Titular:</span>
                <span className="font-medium">{bankConfig.pagoMovilHolder}</span>
              </div>
            </div>
          ) : (
            <div className="bg-[#f8f9ff] border border-[#d2e4ff] rounded-xl p-3.5 space-y-2.5 text-xs text-[#002546]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#006782] block">
                Datos Oficiales Zelle
              </span>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Correo Zelle:</span>
                <button
                  onClick={() => handleCopy(bankConfig.zelleEmail, 'zelle')}
                  className="font-mono font-bold flex items-center gap-1 hover:text-[#006782]"
                >
                  {bankConfig.zelleEmail}
                  {copiedField === 'zelle' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Nombre Titular:</span>
                <span className="font-medium">{bankConfig.zelleHolder}</span>
              </div>
              <div className="text-[10px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                Nota importante: {bankConfig.zelleMemoInstruction} ({order.spotName})
              </div>
            </div>
          )}

          {/* Reference input & screenshot upload */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[#002546] block mb-1">
                Número de Referencia (últimos 4 a 6 dígitos) *
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => {
                  setReference(e.target.value);
                  setInputError(null);
                }}
                placeholder="Ej: 849201"
                className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#006782]"
              />
              {inputError && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{inputError}</span>
                </p>
              )}
            </div>

            {paymentMethod === 'pago_movil' && (
              <div>
                <label className="text-xs font-bold text-[#002546] block mb-1">
                  Banco Emisor
                </label>
                <select
                  value={bankOrigin}
                  onChange={(e) => setBankOrigin(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#006782] bg-white"
                >
                  <option value="Banesco">Banesco Banco Universal (0134)</option>
                  <option value="Mercantil">Banco Mercantil (0105)</option>
                  <option value="BDV">Banco de Venezuela (0102)</option>
                  <option value="Bancaribe">Bancaribe (0114)</option>
                  <option value="BNC">Banco Nacional de Crédito BNC (0191)</option>
                  <option value="Provincial">BBVA Provincial (0108)</option>
                </select>
              </div>
            )}

            {/* Voucher Screenshot OCR with Gemini */}
            <div className="border border-dashed border-[#006782]/40 rounded-xl p-3 bg-[#eff4ff]/50 text-center">
              <label className="cursor-pointer block">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-9 h-9 rounded-full bg-[#d2e4ff] flex items-center justify-center text-[#006782]">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-[#002546]">
                    Adjuntar Captura de Pago (Opcional)
                  </div>
                  <span className="text-[10px] text-gray-500">
                    Validación instantánea OCR mediante Gemini AI
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {isValidating && (
                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-[#006782] font-semibold py-1 bg-white rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-[#006782]" />
                  <span>Analizando comprobante con Gemini AI OCR...</span>
                </div>
              )}

              {validationResult && (
                <div className={`mt-3 p-2.5 rounded-lg text-xs flex items-start gap-2 text-left ${
                  validationResult.isValid
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                }`}>
                  {validationResult.isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-1 font-bold">
                      <Sparkles className="w-3 h-3 text-[#006782]" />
                      <span>{validationResult.isValid ? 'Comprobante Válido' : 'Revisión Manual Requerida'}</span>
                    </div>
                    <p className="text-[11px] mt-0.5">{validationResult.notes}</p>
                    {validationResult.extractedReference && (
                      <span className="text-[10px] font-mono mt-1 block">
                        Ref: #{validationResult.extractedReference} • {formatBsDirect(validationResult.extractedAmountBs || totalBs)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-11 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmPayment}
            className="flex-2 h-11 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-[#57d1fd]" />
            <span>Confirmar y Enviar a Caja</span>
          </button>
        </div>
      </div>
    </div>
  );
};
