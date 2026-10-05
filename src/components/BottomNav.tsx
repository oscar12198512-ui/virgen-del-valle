import React from 'react';
import { ROLE_LABELS, UserRole } from '../types';
import { UtensilsCrossed, Ship, ChefHat, BarChart3, Umbrella } from 'lucide-react';

interface BottomNavProps {
  currentRole: UserRole;
  onSelectRole: (view: UserRole) => void;
  activeOrdersCount?: number;
  availableRoles: UserRole[];
}

const NAV_ITEMS: { role: UserRole; icon: React.FC<{ className?: string }> }[] = [
  { role: 'waiter', icon: UtensilsCrossed },
  { role: 'excursion', icon: Ship },
  { role: 'kitchen', icon: ChefHat },
  { role: 'admin', icon: BarChart3 },
  { role: 'client', icon: Umbrella },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentRole, onSelectRole, activeOrdersCount = 0, availableRoles }) => {
  // Cada rol solo ve su propia barra de navegacion: no se renderizan mod ajenos.
  const navItems = NAV_ITEMS.filter((item) => availableRoles.includes(item.role));

  if (navItems.length <= 1) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom,0px)] bg-[#f8f9ff]/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,37,70,0.08)] border-t border-[#002546]/10">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRole === item.role;
          return (
            <button
              key={item.role}
              onClick={() => onSelectRole(item.role)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 min-w-[58px] h-12 rounded-lg transition-all relative ${
                isActive ? 'text-[#006782] font-bold scale-105' : 'text-[#42474f] hover:text-[#002546] font-medium'
              }`}
            >
              <div className={`p-1 rounded-md transition-colors relative ${isActive ? 'bg-[#57d1fd]/20' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {item.role === 'kitchen' && activeOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center animate-pulse">
                    {activeOrdersCount}
                  </span>
                )}
              </div>
              <span className={`text-[11px] tracking-tight ${isActive ? 'font-bold' : ''}`}>{ROLE_LABELS[item.role]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};