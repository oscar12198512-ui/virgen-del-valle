import React from 'react';
import {
  Sun,
  Wind,
  Waves,
  Compass,
  Thermometer,
  ShieldAlert,
  X,
  Umbrella,
  Ship,
  Info,
  Clock,
  Sparkles
} from 'lucide-react';

interface BeachWeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BeachWeatherModal: React.FC<BeachWeatherModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
      id="beach-weather-modal"
    >
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-[#d2e4ff] animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#006782] to-[#002546] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
              <Sun className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Clima Costero & Mareas
              </h3>
              <p className="text-xs text-[#bbe9ff]">
                Bahía de Playa Buche & El Yaque • Estado Actual
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

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Main Weather Hero Card */}
          <div className="bg-gradient-to-br from-[#eff4ff] to-[#f8f9ff] border border-[#d2e4ff] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#006782] block">
                Temperatura de Playa
              </span>
              <div className="text-4xl font-black text-[#002546] flex items-baseline gap-1 mt-0.5">
                <span>30°C</span>
                <span className="text-sm font-semibold text-gray-500">Sensación 33°C</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Soleado despejado con brisa marina caribeña constante.
              </p>
            </div>

            <div className="text-center p-2 rounded-xl bg-white/80 border border-[#d2e4ff]">
              <Sun className="w-8 h-8 text-amber-500 mx-auto" />
              <span className="text-[10px] font-bold text-[#002546] block mt-0.5">
                Índice UV 11+
              </span>
              <span className="text-[9px] font-bold text-rose-600 uppercase">Extremo</span>
            </div>
          </div>

          {/* Wind & Nautical Conditions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#f8f9ff] border border-gray-200 rounded-2xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#006782]">
                <Wind className="w-4 h-4 text-[#006782]" />
                <span>Viento Alisio</span>
              </div>
              <div className="text-xl font-black text-[#002546]">
                18 Nudos <span className="text-xs font-bold text-gray-500">(33 km/h)</span>
              </div>
              <p className="text-[11px] text-gray-600">
                Dirección ENE • Excelente para navegación y brisa en toldos.
              </p>
            </div>

            <div className="bg-[#f8f9ff] border border-gray-200 rounded-2xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#006782]">
                <Waves className="w-4 h-4 text-[#006782]" />
                <span>Oleaje Costero</span>
              </div>
              <div className="text-xl font-black text-[#002546]">
                0.6 m <span className="text-xs font-bold text-emerald-600 font-semibold">(Calmo)</span>
              </div>
              <p className="text-[11px] text-gray-600">
                Mar tranquilo en bahía • Desembarque en muelle sin riesgo.
              </p>
            </div>
          </div>

          {/* Tides Timeline */}
          <div className="bg-white rounded-2xl border border-gray-200 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#002546]">
                <Clock className="w-4 h-4 text-[#006782]" />
                <span>Ciclo de Mareas de Hoy</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                Marea Subiendo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-sky-50 border border-sky-200">
                <span className="text-[10px] uppercase font-bold text-sky-700 block">
                  Pleamar (Marea Alta)
                </span>
                <span className="text-base font-extrabold text-[#002546] font-mono">02:20 PM</span>
                <span className="text-[10px] text-sky-800 block mt-0.5">+0.45m sobre bajamar</span>
              </div>

              <div className="p-2 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">
                  Bajamar (Marea Baja)
                </span>
                <span className="text-base font-extrabold text-gray-700 font-mono">08:45 PM</span>
                <span className="text-[10px] text-gray-500 block mt-0.5">Playa amplia</span>
              </div>
            </div>
          </div>

          {/* Operational Beach Recommendation */}
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 text-xs text-amber-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Recomendación Operativa para Mesoneros y Toldos</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900">
              Debido a la pleamar de las 2:20 PM y viento constante de 18 nudos, asegurar bien los anclajes de los toldos de primera línea (#1 a #6) y ofrecer sombra adicional a familias con niños por el índice UV alto.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-medium">
            Estación Meteorológica Playa Buche
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#002546] hover:bg-[#0d3b66] text-white text-xs font-bold transition-colors shadow-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
