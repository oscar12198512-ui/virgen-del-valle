import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (showReconnected) {
    return (
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-600 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg animate-fade-in border border-emerald-400">
        <Wifi className="w-3.5 h-3.5 text-white" />
        <span>Conexión Satelital Restaurada</span>
      </div>
    );
  }

  if (isOnline) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-amber-500 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg animate-bounce-subtle border border-amber-300">
      <WifiOff className="w-3.5 h-3.5 animate-pulse" />
      <span>Modo Sin Conexión • Guardando en Memoria Local</span>
    </div>
  );
};
