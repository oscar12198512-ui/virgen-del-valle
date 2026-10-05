import React from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { APP_STORE_LINKS } from '../constants';

interface AppInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl: string;
}

export const AppInstallModal: React.FC<AppInstallModalProps> = ({ isOpen, onClose, appUrl }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  if (!isOpen) return null;

  const share = async () => {
    const url = appUrl || window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Playa Buche', text: 'Gestión de Playa Buche · Virgen del Valle', url });
        return;
      } catch {
        // El usuario canceló el diálogo nativo.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Sin permiso de portapapeles: la URL ya está visible en pantalla.
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#002546]/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <section onClick={(event) => event.stopPropagation()} className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 bg-[#002546] text-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#57d1fd]">Playa Buche</p>
            <h2 className="text-lg font-black">Instalar la aplicación</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-full bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 space-y-3">
          {isInstalled ? (
            <p className="text-xs text-[#002546] rounded-xl bg-emerald-50 border border-emerald-200 p-3">
              Ya estás usando la aplicación instalada en este dispositivo.
            </p>
          ) : isInstallable ? (
            <button
              onClick={() => void install()}
              className="w-full h-12 rounded-xl bg-[#002546] text-white text-sm font-bold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Instalar ahora
            </button>
          ) : (
            <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-[#002546] space-y-1">
              <p className="font-bold">Instala desde el navegador:</p>
              <p>Android/Chrome: menú ⋮ → “Añadir a la pantalla de inicio”.</p>
              <p>iPhone/Safari: botón Compartir → “Añadir a pantalla de inicio”.</p>
            </div>
          )}

          <button
            onClick={() => void share()}
            className="w-full h-11 rounded-xl bg-[#eff4ff] text-[#006782] border border-[#d2e4ff] text-xs font-bold flex items-center justify-center gap-2"
          >
            <Share className="w-4 h-4" /> Compartir acceso
          </button>

          <p className="text-[11px] text-gray-500">
            La aplicación móvil de Android se distribuye como APK firmado. Puedes descargarlo desde{' '}
            <a href={APP_STORE_LINKS.uptodown} target="_blank" rel="noreferrer" className="font-bold text-[#006782] underline">
              Uptodown
            </a>
            .
          </p>

          <p className="text-[11px] text-gray-500 flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-gray-400 shrink-0" />
            En Android la aplicación se conecta directamente con la API de producción.
          </p>
        </div>
      </section>
    </div>
  );
};