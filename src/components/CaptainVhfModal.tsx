import React, { useState } from 'react';
import { ExcursionPackage } from '../types';
import { formatUsd, formatBsDirect } from '../utils/currencyFormatter';
import { soundService } from '../services/soundService';
import {
  X,
  Radio,
  Share2,
  Copy,
  Check,
  Ship,
  Anchor,
  Clock,
  Volume2,
  Users
} from 'lucide-react';

interface CaptainVhfModalProps {
  isOpen: boolean;
  onClose: () => void;
  excursion: ExcursionPackage;
  bcvRate: number;
  onAdjustTime?: (newTimeStr: string) => void;
}

export const CaptainVhfModal: React.FC<CaptainVhfModalProps> = ({
  isOpen,
  onClose,
  excursion,
  bcvRate,
  onAdjustTime,
}) => {
  const [copied, setCopied] = useState(false);
  const [playedRadioChime, setPlayedRadioChime] = useState(false);

  if (!isOpen) return null;

  const safeBoat = excursion?.boatName || 'Lancha Virgen del Valle';
  const safeCaptain = excursion?.captainName || 'Capitán Manuel Díaz';
  const safeItems = Array.isArray(excursion?.items) ? excursion.items : [];
  const safePax = excursion?.passengersCount || 18;
  const safeColor = excursion?.braceletsColor || 'Verde Neón VIP';
  const safeServing = excursion?.estimatedServingTime || '01:45 PM';
  const safeArrival = excursion?.arrivalTime || '01:15 PM';
  const safeCode = excursion?.tourCode || 'TOUR-BUCHE-882';
  const safeKds = excursion?.kdsStatus || 'En Fuego (Cocina)';

  const totalUsd = safeItems.reduce((acc, i) => acc + (i.quantity || 0) * (i.unitPriceUsd || 0), 0);
  const totalBs = totalUsd * bcvRate;

  // Radio call phonetic script
  const vhfTranscript = `🎙️ [CANAL 72 MARINO / PUERTO CARENERO]\n` +
    `"Aquí Capitanía Buche Central llamando a lancha ${safeBoat.toUpperCase()}... ¿Me copia, Capitán ${safeCaptain.toUpperCase()}? Cambio.\n\n` +
    `Le confirmamos comanda en fogones para sus ${safePax} pasajeros (Pulseras ${safeColor}).\n` +
    `Hora estimada de servicio a mesa: ${safeServing}.\n` +
    `Muelle Central libre y despejado para su atraque a ${safeArrival}. Cambio y fuera."`;

  const whatsappMessage = `🛥️ *RESTAURANTE BAHÍA DE BUCHE • COORDINACIÓN MARÍTIMA*\n` +
    `⚓ *Tour:* ${safeCode} | Lancha: *${safeBoat}*\n` +
    `👨‍✈️ *Capitán:* ${safeCaptain}\n` +
    `👥 *Pasajeros:* ${safePax} pax (Pulseras: ${safeColor})\n` +
    `⏱️ *Arribo a Muelle:* ${safeArrival}\n` +
    `🍽️ *Hora de Almuerzo/Servicio:* ${safeServing}\n` +
    `🔥 *Estado en Cocina:* ${safeKds}\n` +
    `---------------------------------\n` +
    `💰 *Total Comanda:* ${formatUsd(totalUsd)} (${formatBsDirect(totalBs)} - Tasa del día: ${bcvRate.toFixed(2)})\n` +
    `---------------------------------\n` +
    `Muelle Buche listo para el desembarque y mesas asignadas. ¡Buen viento y buena mar! 🌊☀️`;

  const handleCopyWhatsapp = () => {
    soundService.playBell();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(whatsappMessage);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSimulateVhfSquelch = () => {
    soundService.buzzSmartBand();
    setPlayedRadioChime(true);
    setTimeout(() => setPlayedRadioChime(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#002546] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#57d1fd]/20 text-[#57d1fd] flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Canal VHF / WhatsApp Capitán</h2>
              <p className="text-[11px] text-sky-200">
                {excursion.boatName} • {excursion.captainName}
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

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Radio VHF simulation box */}
          <div className="bg-[#00172c] text-emerald-400 font-mono text-xs p-3.5 rounded-xl border border-emerald-500/30 space-y-2">
            <div className="flex justify-between items-center text-[10px] text-gray-400 font-sans uppercase">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                VHF CH-72 • 156.625 MHz
              </span>
              <button
                onClick={handleSimulateVhfSquelch}
                className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 hover:bg-emerald-900 text-[10px] flex items-center gap-1"
              >
                <Volume2 className="w-3 h-3" /> Dictado Radio
              </button>
            </div>
            <p className="leading-relaxed whitespace-pre-line text-[11px] text-emerald-300/90">
              {vhfTranscript}
            </p>
          </div>

          {playedRadioChime && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-2 rounded-xl text-xs font-bold text-center animate-fade-in">
              🔊 Señal de Roger / Squelch transmitida a Capitanía Buche.
            </div>
          )}

          {/* Quick ETA adjustments */}
          {onAdjustTime && (
            <div className="bg-[#eff4ff] border border-[#d2e4ff] rounded-xl p-3 space-y-2">
              <span className="text-xs font-bold text-[#002546] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#006782]" />
                Ajuste de Arribo por Marejada / Viento:
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                {['-15 min', '+10 min', '+20 min', '+30 min'].map((delta) => (
                  <button
                    key={delta}
                    onClick={() => {
                      soundService.playBell();
                      onAdjustTime(delta);
                    }}
                    className="py-1.5 rounded-lg bg-white hover:bg-white/80 border border-[#a4c9fc] text-[#002546] text-center shadow-2xs transition-all"
                  >
                    {delta}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summary Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-1.5 text-xs text-gray-700">
            <div className="flex justify-between">
              <span className="text-gray-500">Grupo & Pulseras:</span>
              <span className="font-bold text-[#002546]">{excursion.passengersCount} pax ({excursion.braceletsColor})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Hora de Entrega en Mesa:</span>
              <span className="font-extrabold text-[#006782]">{excursion.estimatedServingTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Monto Total de Almuerzos:</span>
              <span className="font-extrabold text-[#002546]">{formatUsd(totalUsd)}</span>
            </div>
          </div>

          {copied && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-2.5 rounded-xl text-xs flex items-center gap-2 font-bold animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>¡Mensaje copiado para WhatsApp! Pégalo en el chat con el Capitán {excursion.captainName}.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <button
            onClick={handleCopyWhatsapp}
            className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Copiar Mensaje WhatsApp para el Capitán</span>
          </button>
        </div>
      </div>
    </div>
  );
};
