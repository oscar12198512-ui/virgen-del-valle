import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { ToldoSpot } from '../types';
import { X, Printer, Download, Copy, Check, QrCode as QrIcon, Sparkles, Layers, RefreshCw } from 'lucide-react';

interface ToldoQrGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  spots: ToldoSpot[];
}

export const ToldoQrGeneratorModal: React.FC<ToldoQrGeneratorModalProps> = ({
  isOpen,
  onClose,
  spots,
}) => {
  const [selectedSpotId, setSelectedSpotId] = useState<string>('all');
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const getSpotUrl = (spot: ToldoSpot) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://playabuche.com';
    return `${origin}/?spot=${encodeURIComponent(spot.number || spot.id)}&spotId=${encodeURIComponent(spot.id)}`;
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);

    const generateAll = async () => {
      const urls: Record<string, string> = {};
      for (const spot of spots) {
        try {
          const targetUrl = getSpotUrl(spot);
          const dataUrl = await QRCode.toDataURL(targetUrl, {
            width: 512,
            margin: 2,
            color: {
              dark: '#002546', // Azul marino corporativo
              light: '#FFFFFF',
            },
            errorCorrectionLevel: 'H',
          });
          urls[spot.id] = dataUrl;
        } catch (err) {
          console.error(`Error generando QR para ${spot.number}:`, err);
        }
      }
      if (isMounted) {
        setQrDataUrls(urls);
        setIsGenerating(false);
      }
    };

    generateAll();

    return () => {
      isMounted = false;
    };
  }, [isOpen, spots]);

  if (!isOpen) return null;

  const handleCopy = (spot: ToldoSpot) => {
    const url = getSpotUrl(spot);
    navigator.clipboard.writeText(url);
    setCopiedId(spot.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSingle = (spot: ToldoSpot) => {
    const dataUrl = qrDataUrls[spot.id];
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = `QR-Toldo-${spot.number || spot.id}-VirgenDelValle.png`;
    link.href = dataUrl;
    link.click();
  };

  const spotsToDisplay = selectedSpotId === 'all' ? spots : spots.filter((s) => s.id === selectedSpotId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:bg-white text-slate-100 print:text-black">
        
        {/* Modal Header (Oculto en Impresión) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <QrIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Generador de QRs para Toldos & Mesas
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-normal border border-amber-500/30">
                  Playa Buche
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Imprime o descarga tarjetas físicas para que los clientes pidan directamente desde su toldo.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filters (Oculto en Impresión) */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Ver Toldo:
            </label>
            <select
              value={selectedSpotId}
              onChange={(e) => setSelectedSpotId(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">⭐ Todos los Toldos y Puntos ({spots.length})</option>
              {spots.map((spot) => (
                <option key={spot.id} value={spot.id}>
                  {spot.number} — {spot.name} ({spot.zone})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir Fichas / Guardar PDF
            </button>
          </div>
        </div>

        {/* Printable QR Cards Container */}
        <div
          ref={printRef}
          className="p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4 print:p-0 print:overflow-visible"
        >
          {isGenerating ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm">Generando códigos QR de alta resolución...</p>
            </div>
          ) : (
            spotsToDisplay.map((spot) => {
              const dataUrl = qrDataUrls[spot.id];
              const spotUrl = getSpotUrl(spot);
              const isCopied = copiedId === spot.id;

              return (
                <div
                  key={spot.id}
                  className="relative group bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-5 shadow-xl flex flex-col items-center text-center print:border-2 print:border-slate-800 print:bg-white print:text-slate-900 print:break-inside-avoid print:shadow-none print:mb-4"
                >
                  {/* Decorative Brand Header */}
                  <div className="w-full flex items-center justify-between pb-3 border-b border-amber-500/20 mb-3 print:border-slate-300">
                    <div className="flex items-center gap-2">
                      <img
                        src="/logo.png"
                        alt="Virgen del Valle"
                        className="w-8 h-8 object-contain rounded-full bg-white/10 p-0.5 border border-amber-400/40"
                      />
                      <div className="text-left">
                        <h4 className="text-xs font-black text-amber-400 tracking-wider uppercase print:text-amber-700">
                          Virgen del Valle
                        </h4>
                        <p className="text-[10px] text-slate-400 print:text-slate-600">
                          Playa Buche • J-40536768-7
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 print:bg-slate-100 print:text-slate-800">
                      {spot.zone.toUpperCase()}
                    </span>
                  </div>

                  {/* Spot Badge */}
                  <div className="my-1 px-4 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-2xl tracking-tight shadow-md">
                    {spot.number || 'T-XX'}
                  </div>
                  <h3 className="text-sm font-bold text-slate-200 print:text-slate-900 mt-1">
                    {spot.name}
                  </h3>
                  <p className="text-xs text-slate-400 print:text-slate-600 mb-3">
                    {spot.typeDesc}
                  </p>

                  {/* QR Image Box */}
                  <div className="relative p-3 bg-white rounded-xl shadow-inner border border-slate-200">
                    {dataUrl ? (
                      <img
                        src={dataUrl}
                        alt={`QR Toldo ${spot.number}`}
                        className="w-44 h-44 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                        Cargando...
                      </div>
                    )}
                  </div>

                  {/* Scanning instructions */}
                  <div className="mt-3 text-center">
                    <p className="text-xs font-bold text-amber-300 print:text-amber-800">
                      📱 Escanea para Ver Menú & Pedir
                    </p>
                    <p className="text-[11px] text-slate-400 print:text-slate-600">
                      Sin descargas • Atención directa al toldo
                    </p>
                  </div>

                  {/* Quick action buttons (Hidden on Print) */}
                  <div className="mt-4 pt-3 border-t border-slate-800 w-full flex items-center justify-center gap-2 print:hidden">
                    <button
                      onClick={() => handleDownloadSingle(spot)}
                      title="Descargar imagen PNG"
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 text-xs font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      PNG
                    </button>
                    <button
                      onClick={() => handleCopy(spot)}
                      title="Copiar enlace"
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-medium"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Note (Hidden on Print) */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 print:hidden">
          <span>
            💡 Tip: Imprime estas tarjetas en papel laminado o acrílico para protegerlas de la brisa marina.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
