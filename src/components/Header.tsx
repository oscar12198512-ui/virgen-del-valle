import React, { useEffect, useState } from 'react';
import { ROLE_LABELS, User, UserRole } from '../types';
import { Ship, UserCheck, Receipt, Search, Calculator, Bell, Sun, LogOut } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentRole: UserRole;
  currentUser: User;
  bcvRate: number;
  onOpenAccount: () => void;
  onLogout: () => void;
  onOpenFiscalInvoice?: () => void;
  onOpenSearch?: () => void;
  onOpenCalculator?: () => void;
  onOpenWeather?: () => void;
  onOpenNotifications?: () => void;
  onOpenInstall?: () => void;
  notificationCount?: number;
  canPreviewRoles?: boolean;
}

const ROLE_TITLES: Record<UserRole, string> = {
  waiter: 'Comandera Móvil',
  excursion: 'Coordinación Muelle',
  kitchen: 'Cocina KDS',
  admin: 'Caja & Auditoría',
  client: 'Carta Digital Playa',
};

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  currentUser,
  bcvRate,
  onOpenAccount,
  onLogout,
  onOpenFiscalInvoice,
  onOpenSearch,
  onOpenCalculator,
  onOpenWeather,
  onOpenNotifications,
  onOpenInstall,
  notificationCount = 0,
  canPreviewRoles = false,
}) => {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const displayTitle = ROLE_TITLES[currentRole] || 'Operación Playa';
  const initials =
    currentUser?.name
      ?.split(' ')
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'PB';

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return (
    <header className="fixed top-0 w-full z-50 pt-[env(safe-area-inset-top,0px)] bg-[#f8f9ff]/90 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,37,70,0.06)] border-b border-[#002546]/5">
      <div className="max-w-7xl mx-auto h-16 px-3 sm:px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#eff4ff] border border-[#d2e4ff] flex items-center justify-center shadow-xs shrink-0">
            <Ship className="w-5 h-5 text-[#006782]" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-[#006782] font-bold truncate">
              VIRGEN DEL VALLE • PLAYA BUCHE
            </span>
            <span className="text-[14px] sm:text-[15px] font-bold text-[#002546] leading-tight truncate">
              {displayTitle}
              {canPreviewRoles && <span className="text-[10px] text-[#006782]"> · {ROLE_LABELS[currentRole]}</span>}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              title="Buscar platos, toldos o atajos (Ctrl+K)"
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-xs font-semibold bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002546] border border-[#d2e4ff] transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-[#006782]" />
              <span className="hidden md:inline text-[11px] font-bold">Buscar</span>
            </button>
          )}

          {onOpenCalculator && (
            <button
              onClick={onOpenCalculator}
              title="Calculadora rápida de divisas y vueltos exactos"
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition-colors"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline text-[11px] font-bold">Vueltos</span>
            </button>
          )}

          <PWAInstallButton onClick={onOpenInstall} />

          {onOpenWeather && (
            <button
              onClick={onOpenWeather}
              title="Ver clima, mareas y condición de playa"
              className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors"
            >
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] font-bold">Clima</span>
            </button>
          )}

          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              title="Centro de notificaciones y alertas de cocina"
              className="relative p-1.5 rounded-full bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002546] transition-colors"
            >
              <Bell className="w-4 h-4 text-[#006782]" />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center animate-pulse">
                  {notificationCount}
                </span>
              )}
            </button>
          )}

          {onOpenFiscalInvoice && (
            <button
              onClick={onOpenFiscalInvoice}
              title="Ver Comprobante Fiscal Digital (SENIAT)"
              className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#eff4ff] hover:bg-[#dce9ff] text-[#006782] border border-[#a4c9fc]/60 transition-colors"
            >
              <Receipt className="w-3.5 h-3.5 text-[#006782]" />
              <span className="text-[11px] font-bold">Factura</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 bg-[#dce9ff]/70 px-2.5 py-1 rounded-full text-xs font-semibold text-[#002546]">
            <span className="text-[10px] text-[#006782] font-bold">BCV</span>
            <span>{bcvRate.toFixed(2)} Bs/$</span>
          </div>

          <span
            title={isOnline ? 'Conectado al servidor' : 'Sin conexión: los cambios quedan pendientes'}
            className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
              isOnline ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-900 border-amber-300'
            }`}
          >
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>

          <button
            onClick={onOpenAccount}
            className="flex items-center gap-1.5 p-1 rounded-full hover:bg-[#eff4ff] transition-colors group"
            title="Mi cuenta"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#002546] to-[#006782] text-white flex items-center justify-center font-bold text-xs ring-2 ring-[#57d1fd]/40 shadow-xs">
              {initials}
            </div>
            <UserCheck className="w-3.5 h-3.5 text-[#006782] opacity-70 group-hover:opacity-100 hidden md:block" />
          </button>

          <button
            onClick={onLogout}
            className="p-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};