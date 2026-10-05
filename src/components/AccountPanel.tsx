import React from 'react';
import { LogOut, Smartphone, X } from 'lucide-react';
import { ROLE_LABELS, User, UserRole } from '../types';

interface AccountPanelProps {
  currentUser: User;
  currentRole: UserRole;
  availableRoles: UserRole[];
  onSelectRole: (role: UserRole) => void;
  onLogout: () => void;
  onClose: () => void;
  onOpenInstall: () => void;
}

export const AccountPanel: React.FC<AccountPanelProps> = ({
  currentUser,
  currentRole,
  availableRoles,
  onSelectRole,
  onLogout,
  onClose,
  onOpenInstall,
}) => (
  <div className="fixed inset-0 z-[60] bg-[#002546]/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
    <section
      onClick={(event) => event.stopPropagation()}
      className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
    >
      <header className="flex items-center justify-between px-5 py-4 bg-[#002546] text-white">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#57d1fd]">Sesión activa</p>
          <h2 className="text-lg font-black">{currentUser.name}</h2>
          <p className="text-[11px] text-white/70">{currentUser.email}</p>
        </div>
        <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-full bg-white/10">
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Tu rol</span>
          <span className="font-bold text-[#002546]">{ROLE_LABELS[currentUser.role]}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Zona asignada</span>
          <span className="font-bold text-[#002546]">{currentUser.zone || 'Sin asignar'}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Último acceso</span>
          <span className="font-bold text-[#002546]">
            {currentUser.lastLogin ? new Date(currentUser.lastLogin).toLocaleString('es-VE') : 'Este dispositivo'}
          </span>
        </div>

        {availableRoles.length > 1 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#006782]">Ver módulo</p>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#f8f9ff] rounded-2xl">
              {availableRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    onSelectRole(role);
                    onClose();
                  }}
                  className={`rounded-xl py-2 text-[11px] font-bold ${currentRole === role ? 'bg-[#002546] text-white' : 'text-gray-600'}`}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onOpenInstall}
          className="w-full h-11 rounded-xl bg-[#eff4ff] text-[#006782] border border-[#d2e4ff] text-xs font-bold flex items-center justify-center gap-2"
        >
          <Smartphone className="w-4 h-4" /> Instalar la aplicación
        </button>

        <button
          onClick={onLogout}
          className="w-full h-11 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>

        <p className="text-[10px] text-gray-400 text-center">
          ¿Olvidaste la clave? Cierra sesión y usa “¿Olvidaste tu clave?” en la pantalla de acceso.
        </p>
      </div>
    </section>
  </div>
);