import React, { useState } from 'react';
import {
  Satellite,
  Wifi,
  Router,
  Cloud,
  HardDrive,
  RefreshCw,
  Download,
  ShieldCheck,
  Activity,
  Radio,
  Clock,
  Utensils,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Coins,
  ArrowRight,
  Server
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface SatelliteMeshContingencyProps {
  bcvRate: number;
}

export const SatelliteMeshContingency: React.FC<SatelliteMeshContingencyProps> = ({ bcvRate }) => {
  const [latency, setLatency] = useState<number>(340);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lockRate, setLockRate] = useState<boolean>(true);
  const [priorityKds, setPriorityKds] = useState<boolean>(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(12);
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

  const handleRetryUplink = () => {
    setIsSyncing(true);
    soundService.playBell();
    setTimeout(() => {
      setIsSyncing(false);
      setLatency(42);
      setOfflineQueueCount((prev) => Math.max(0, prev - 4));
      showToast('Sincronización satelital exitosa con la nube (4 comandas enviadas)');
    }, 1400);
  };

  const handleExportJson = () => {
    const backupData = {
      empresa: 'Inversiones Virgen del Valle C.A.',
      rif: 'J-40536768-7',
      ubicacion: 'Playa Buche, Bahía Carenero, Edo. Miranda',
      timestamp: new Date().toISOString(),
      tasaBCV: bcvRate,
      estadoEnlace: 'Starlink Contingencia Offline Activo',
      colaOffline: [
        { id: '1048', toldo: 'VIP 14', item: 'Pargo Frito Criollo', totalUsd: 22.0, estado: 'Espera Uplink' },
        { id: '1049', toldo: '06', item: 'Tobo Polar + Empanadas', totalUsd: 18.0, estado: 'KDS LAN OK' },
        { id: '1050', toldo: '09', tipo: 'Pago Móvil P2P', ref: '894320', totalUsd: 15.0, totalBs: 817.5, estado: 'Por Conciliar' },
        { id: '1051', toldo: 'Cava Central', item: 'Stock Hielo Marino (-4 bolsas térmicas)', estado: 'En Memoria' }
      ]
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Respaldo_Offline_PlayaBuche_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('Respaldo JSON descargado correctamente en el dispositivo');
  };

  return (
    <div className="flex flex-col gap-3.5 text-[#001c37]">
      {/* Status Scrim & Maritime Header Indicator */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              alt="Playa Buche Emblema"
              className="w-12 h-12 rounded-full object-cover shrink-0 shadow-xs ring-2 ring-[#bbe9ff]"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDH7jyRP5MYf5nNgY49KaUNOWlLicJdap-BsQwgc0P1FQRDDBqbfCQC3xuMNWCXlDDyESO2W4O30AssARirHIqqY7GxFkJ5_UUYyrN8Q78UEN52SPvI3_fwBH5-PPuUvwbDfImvs4pUuBKW19MZJrvBIzHNcRqKwvduRMvfoOFTvGwHO99zAFCVOtd5gT7SpP9bLLi3ky8YShBMuz43XjskC81Irzs5cZ0Y9A4HHaI1QHMsqqjWh3EhcjVHAx7_rF4eoDA"
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#002546] text-base truncate">Contingencia Satelital</span>
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
              </div>
              <span className="text-xs text-[#006782] font-semibold truncate">
                Playa Buche • Bahía Carenero
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0 pl-2">
            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">
              Tasa BCV Caché
            </span>
            <span className="text-base text-[#002546] font-extrabold font-mono">
              {bcvRate.toFixed(2)} <span className="text-xs text-[#006782] font-semibold">Bs/$</span>
            </span>
          </div>
        </div>
      </section>

      {/* Live Satellite Link Warning Pill / Banner */}
      <section className="bg-[#dce9ff] rounded-2xl p-4 shadow-sm border border-[#a4c9fc]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ffdea5] flex items-center justify-center text-[#4d3600] shrink-0 shadow-2xs">
            <Satellite className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm text-[#002546] font-bold">Starlink Bahía Buche</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#4d3600] text-[#ffdea5] font-bold tracking-wide">
                Latencia {latency}ms
              </span>
            </div>
            <p className="text-xs text-[#42474f] mt-1 leading-snug">
              Desvanecimiento temporal por nubosidad sobre el canal de Carenero.{' '}
              <strong className="text-[#002546] font-semibold">Modo Offline Activo</strong> garantizando 100% de operatividad en la arena.
            </p>
          </div>
        </div>
      </section>

      {/* Local Island Mesh Network Card */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#bbe9ff] flex items-center justify-center text-[#005870] shrink-0">
            <Router className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#002546] truncate">Mesh Local Wi-Fi 5GHz</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#006782] text-white font-bold">
                LAN Activa
              </span>
            </div>
            <span className="text-xs text-[#006782] font-medium mt-0.5">
              Buche Marina • Churuata Principal
            </span>
          </div>
        </div>
        <p className="text-xs text-[#42474f] mt-2.5 leading-relaxed">
          Las terminales de los mesoneros en los toldos y la pantalla KDS de los fogones siguen comunicándose al instante por la red interna. No se pierde ninguna comanda en la arena.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-3 pt-2">
          <div className="bg-[#eff4ff] rounded-xl p-2.5 flex items-center gap-2.5 border border-[#d2e4ff]">
            <Utensils className="w-4 h-4 text-[#006782]" />
            <div className="flex flex-col">
              <span className="text-[10px] text-[#42474f] uppercase font-semibold">Mesoneros</span>
              <span className="text-sm text-[#002546] font-extrabold">8 En Línea</span>
            </div>
          </div>
          <div className="bg-[#eff4ff] rounded-xl p-2.5 flex items-center gap-2.5 border border-[#d2e4ff]">
            <Flame className="w-4 h-4 text-[#006782]" />
            <div className="flex flex-col">
              <span className="text-[10px] text-[#42474f] uppercase font-semibold">KDS Fogones</span>
              <span className="text-sm text-[#002546] font-extrabold">Conectado</span>
            </div>
          </div>
        </div>
      </section>

      {/* Offline Buffer Queue & Health Counter */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#002546]" />
            <h2 className="text-sm font-bold text-[#002546]">Cola Local en Memoria</h2>
          </div>
          <span className="text-xs font-bold text-[#006782] bg-[#dce9ff] px-2.5 py-0.5 rounded-full">
            {offlineQueueCount} pendientes
          </span>
        </div>
        <div className="flex items-center justify-between text-[#42474f] text-xs mb-1.5">
          <span>Capacidad de Almacenamiento Local (IndexedDB)</span>
          <span className="font-bold text-[#002546]">85% seguro</span>
        </div>
        <div className="w-full h-2 bg-[#e5eeff] rounded-full overflow-hidden mb-3">
          <div className="h-full bg-[#006782] rounded-full transition-all duration-500" style={{ width: '85%' }}></div>
        </div>

        {/* Itemized Queue List */}
        <div className="flex flex-col gap-2 mt-2">
          {/* Item 1 */}
          <div className="bg-[#eff4ff] rounded-xl p-2.5 flex items-center justify-between border border-[#d2e4ff]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#002546] shrink-0 shadow-2xs">
                <span className="text-xs font-bold font-mono">T14</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#002546] truncate">Comanda Toldo #14</span>
                <span className="text-[11px] text-[#42474f] truncate">
                  1x Pargo Frito Criollo ($22.00) • 13:42
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0 pl-2">
              <span className="text-[10px] text-[#4d3600] bg-[#ffdea5] px-2 py-0.5 rounded-md font-bold">
                Espera Uplink
              </span>
            </div>
          </div>

          {/* Item 2 */}
          <div className="bg-[#eff4ff] rounded-xl p-2.5 flex items-center justify-between border border-[#d2e4ff]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#002546] shrink-0 shadow-2xs">
                <span className="text-xs font-bold font-mono">T06</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#002546] truncate">Comanda Toldo #06</span>
                <span className="text-[11px] text-[#42474f] truncate">
                  1x Tobo Polar + Ración Empanadas ($18.00)
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0 pl-2">
              <span className="text-[10px] text-[#005870] bg-[#bbe9ff] px-2 py-0.5 rounded-md font-bold">
                KDS LAN OK
              </span>
            </div>
          </div>

          {/* Item 3 */}
          <div className="bg-[#eff4ff] rounded-xl p-2.5 flex items-center justify-between border border-[#d2e4ff]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#002546] shrink-0 shadow-2xs">
                <Coins className="w-4 h-4 text-[#006782]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#002546] truncate">Pago Móvil Toldo #09</span>
                <span className="text-[11px] text-[#42474f] truncate">
                  Ref: 894320 ($15.00 / 817.50 Bs) • Captura local
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0 pl-2">
              <span className="text-[10px] text-[#002546] bg-[#d2e4ff] px-2 py-0.5 rounded-md font-bold">
                Por Conciliar
              </span>
            </div>
          </div>

          {/* Item 4 */}
          <div className="bg-[#eff4ff] rounded-xl p-2.5 flex items-center justify-between border border-[#d2e4ff]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#002546] shrink-0 shadow-2xs">
                <HardDrive className="w-4 h-4 text-[#006782]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#002546] truncate">Stock Hielo Marino</span>
                <span className="text-[11px] text-[#42474f] truncate">
                  Cava Central (-4 bolsas térmicas)
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0 pl-2">
              <span className="text-[10px] text-[#4d3600] bg-[#ffdea5] px-2 py-0.5 rounded-md font-bold">
                En Memoria
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Actions & Operational Controls */}
      <section className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleRetryUplink}
          disabled={isSyncing}
          className="w-full bg-[#002546] hover:bg-[#0d3b66] text-white py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all disabled:opacity-75 font-bold text-xs"
        >
          <RefreshCw className={`w-4 h-4 text-[#57d1fd] ${isSyncing ? 'animate-spin' : ''}`} />
          <span>
            {isSyncing ? 'Sincronizando con la Nube...' : 'Forzar Sincronización con Nube (Retry Uplink)'}
          </span>
        </button>

        <button
          type="button"
          onClick={handleExportJson}
          className="w-full bg-white hover:bg-gray-50 text-[#002546] py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs border border-gray-200 active:scale-98 transition-all font-bold text-xs"
        >
          <Download className="w-4 h-4 text-[#006782]" />
          <span>Descargar Respaldo JSON al Teléfono</span>
        </button>

        {/* Operational Contingency Toggles */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col pr-3">
              <span className="text-xs font-bold text-[#002546]">Bloqueo Preventivo de Tasa</span>
              <span className="text-[11px] text-[#42474f]">
                Fija la cotización en {bcvRate.toFixed(2)} Bs/$ sin reintentos erróneos
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setLockRate(!lockRate);
                showToast(`Bloqueo de tasa ${!lockRate ? 'activado' : 'desactivado'}`);
              }}
              className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors ${
                lockRate ? 'bg-[#006782]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  lockRate ? 'translate-x-5' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex flex-col pr-3">
              <span className="text-xs font-bold text-[#002546]">Priorizar Pase de Cocina KDS</span>
              <span className="text-[11px] text-[#42474f]">
                Prioriza paquetes en la antena local antes de reportar a la nube
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPriorityKds(!priorityKds);
                showToast(`Prioridad KDS ${!priorityKds ? 'activada' : 'normal'}`);
              }}
              className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors ${
                priorityKds ? 'bg-[#006782]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  priorityKds ? 'translate-x-5' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>
        </div>
      </section>

      {/* Starlink Antenna & Island Telemetry Diagnostic */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#006782]" />
            <h3 className="text-xs font-bold text-[#002546]">Telemetría de Enlace Bahía Buche</h3>
          </div>
          <span className="text-[11px] text-[#006782] font-semibold bg-[#eff4ff] px-2 py-0.5 rounded-full">
            Uptime Hoy: 99.1%
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div className="bg-[#eff4ff] rounded-xl p-2 border border-[#d2e4ff]">
            <span className="text-[10px] text-[#42474f] uppercase block font-semibold">SNR Satelital</span>
            <span className="text-sm text-[#002546] font-bold">11.8 dB</span>
          </div>
          <div className="bg-[#eff4ff] rounded-xl p-2 border border-[#d2e4ff]">
            <span className="text-[10px] text-[#42474f] uppercase block font-semibold">Obstrucción</span>
            <span className="text-sm text-[#002546] font-bold">0.4%</span>
          </div>
          <div className="bg-[#eff4ff] rounded-xl p-2 border border-[#d2e4ff]">
            <span className="text-[10px] text-[#42474f] uppercase block font-semibold">Uplink R/W</span>
            <span className="text-sm text-[#002546] font-bold">18 Mbps</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1 text-xs">
          <div className="flex items-center justify-between bg-[#eff4ff] rounded-xl px-3 py-2 border border-[#d2e4ff]">
            <span className="text-[#42474f]">Router Churuata (MikroTik):</span>
            <span className="text-[#002546] font-bold font-mono">192.168.1.1</span>
          </div>
          <div className="flex items-center justify-between bg-[#eff4ff] rounded-xl px-3 py-2 border border-[#d2e4ff]">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#002546]" />
              <span className="text-[#42474f]">Radio VHF Marina Carenero:</span>
            </div>
            <span className="text-[#002546] font-bold font-mono">Canal 16 / 72</span>
          </div>
        </div>
      </section>

      {/* Sello Institucional */}
      <footer className="pt-1">
        <div className="bg-[#eff4ff] rounded-2xl p-3.5 flex flex-col items-center text-center gap-1 border border-[#d2e4ff]">
          <span className="text-xs text-[#002546] font-bold uppercase tracking-wider">
            Inversiones Virgen del Valle C.A.
          </span>
          <span className="text-[10px] text-[#006782] font-semibold font-mono">
            RIF: J-40536768-7 • Carenero / Bahía Buche
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            Sello Digital Fiscal: a9f830bb214c712e0984dd8194cf3a
          </span>
        </div>
      </footer>

      {/* Toast Notifier */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#002546] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 z-50 animate-fade-in border border-[#57d1fd]/40">
          <CheckCircle2 className="w-4 h-4 text-[#57d1fd] shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
