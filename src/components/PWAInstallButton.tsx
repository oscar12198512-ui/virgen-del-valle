import React, { useState } from 'react';
import { Download, Sliders, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AppInstallModal } from './AppInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  onClick?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ className = '', onClick }) => {
  const { isInstalled } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Ajustes y descarga del prototipo (ZIP, Lanzador, QR, Drivers)"
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm border ${
          isInstalled
            ? 'bg-[#eff4ff] text-[#002546] hover:bg-[#dce9ff] border-[#a4c9fc]'
            : 'bg-[#006782] hover:bg-[#00536a] text-white border-[#00536a] shadow-xs'
        } ${className}`}
      >
        <Download className="w-3.5 h-3.5 text-white" />
        <span className="hidden md:inline">Instalar App</span>
        <span className="md:hidden">Instalar</span>
        <span className="hidden sm:inline-block px-1 py-0.2 rounded bg-white/20 text-[9px] font-extrabold uppercase tracking-tight text-white ml-0.5">
          ZIP & QR
        </span>
      </button>

      {!onClick && (
        <AppInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
      )}
    </>
  );
};
