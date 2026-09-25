import React, { useState } from 'react';
import { formatUsd, formatBsDirect } from '../utils/currencyFormatter';
import { soundService } from '../services/soundService';
import {
  X,
  Wallet,
  DollarSign,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Tag,
  UserCheck,
  FileText
} from 'lucide-react';

export interface QuickExpenseRecord {
  id: string;
  concept: string;
  category: string;
  amountUsd: number;
  amountBs: number;
  paidTo: string;
  timestamp: string;
  authorizedBy: string;
}

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  bcvRate: number;
  onAddExpense: (expense: QuickExpenseRecord) => void;
}

const PRESET_CONCEPTS = [
  { concept: '10 Bolsas de Hielo Emergencia (Lancha Peñero)', category: 'Hielo & Frío', amount: 15.0 },
  { concept: 'Recarga 20L Gasolina 2 Tiempos Lancha Auxilio', category: 'Combustible', amount: 10.0 },
  { concept: 'Propina/Pago Pescador Orilla (Pargo Fresco)', category: 'Materia Prima', amount: 20.0 },
  { concept: 'Reparación de Cabos y Varillas Toldos de Playa', category: 'Mantenimiento', amount: 8.0 },
  { concept: 'Botellones de Agua Mineral Cocina K-01', category: 'Insumos', amount: 6.0 },
];

export const QuickExpenseModal: React.FC<QuickExpenseModalProps> = ({
  isOpen,
  onClose,
  bcvRate,
  onAddExpense,
}) => {
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState('Hielo & Frío');
  const [amountUsd, setAmountUsd] = useState<number>(10);
  const [paidTo, setPaidTo] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('Socio Administrador');
  const [successNotice, setSuccessNotice] = useState(false);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESET_CONCEPTS[0]) => {
    setConcept(preset.concept);
    setCategory(preset.category);
    setAmountUsd(preset.amount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim() || amountUsd <= 0) return;

    const record: QuickExpenseRecord = {
      id: 'exp-' + Date.now(),
      concept: concept.trim(),
      category,
      amountUsd,
      amountBs: amountUsd * bcvRate,
      paidTo: paidTo.trim() || 'Proveedor Local',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' hrs',
      authorizedBy,
    };

    soundService.playCashChime();
    onAddExpense(record);
    setSuccessNotice(true);
    setTimeout(() => {
      setSuccessNotice(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#002546] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Egreso Rápido de Caja Chica</h2>
              <p className="text-[11px] text-sky-200">Gasto o compra de emergencia en arena</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {/* Presets */}
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Gastos Frecuentes en Playa:
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {PRESET_CONCEPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#eff4ff] hover:text-[#002546] border border-gray-200 text-[11px] font-semibold text-gray-700 whitespace-nowrap transition-colors"
                >
                  {p.category} (${p.amount})
                </button>
              ))}
            </div>
          </div>

          {/* Concept input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Concepto / Justificación:</label>
            <input
              type="text"
              required
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej: Compra de 5 bolsas de hielo a peñero vecino"
              className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782]"
            />
          </div>

          {/* Category & Amount row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Categoría:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-2.5 rounded-xl border border-gray-300 text-xs text-[#002546] bg-white focus:outline-none focus:ring-2 focus:ring-[#006782]"
              >
                <option value="Hielo & Frío">Hielo & Frío</option>
                <option value="Combustible">Combustible</option>
                <option value="Materia Prima">Materia Prima / Pescado</option>
                <option value="Insumos">Insumos & Desechables</option>
                <option value="Mantenimiento">Mantenimiento & Toldos</option>
                <option value="Otros">Otros</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Monto USD ($):</label>
              <div className="relative">
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(parseFloat(e.target.value) || 0)}
                  className="w-full h-10 pl-7 pr-2 rounded-xl border border-gray-300 text-xs font-bold text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782]"
                />
                <DollarSign className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-3.5" />
              </div>
            </div>
          </div>

          {/* Dual currency indicator */}
          <div className="bg-[#eff4ff] border border-[#d2e4ff] rounded-xl p-2.5 flex justify-between items-center text-xs">
            <span className="text-[#006782] font-semibold">Equivalente en Bolívares (BCV):</span>
            <span className="font-extrabold text-[#002546] font-mono">
              {formatBsDirect(amountUsd * bcvRate)}
            </span>
          </div>

          {/* Recipient & Authorized */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Entregado a (Proveedor):</label>
              <input
                type="text"
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                placeholder="Ej: Lanchero Juan"
                className="w-full h-9 px-2.5 rounded-xl border border-gray-300 text-xs text-[#002546] focus:outline-none focus:ring-1 focus:ring-[#006782]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Autorizado por:</label>
              <input
                type="text"
                value={authorizedBy}
                onChange={(e) => setAuthorizedBy(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl border border-gray-300 text-xs text-[#002546] focus:outline-none focus:ring-1 focus:ring-[#006782]"
              />
            </div>
          </div>

          {successNotice && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-2.5 rounded-xl text-xs flex items-center gap-2 font-bold animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Egreso registrado con éxito y deducido del efectivo físico.</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-11 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <Receipt className="w-4 h-4 text-[#57d1fd]" />
              <span>Registrar y Deducir de Caja Chica</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
