import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Command,
  ArrowRight,
  Calculator,
  Receipt,
  Sun,
  Flame,
  ChefHat,
  UtensilsCrossed,
  Ship,
  BarChart3,
  Umbrella,
  Wifi,
  WifiOff,
  Clock,
  Sparkles,
  DollarSign,
  Download
} from 'lucide-react';
import { MenuItem, Order, ToldoSpot, UserRole } from '../types';
import { formatUsd, formatBsDirect } from '../utils/currencyFormatter';
import { soundService } from '../services/soundService';

interface GlobalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  spots: ToldoSpot[];
  orders: Order[];
  bcvRate: number;
  onNavigateToRole: (role: UserRole) => void;
  onOpenCalculator: () => void;
  onOpenWeather: () => void;
  onOpenFiscalInvoice: () => void;
  availableRoles?: UserRole[];
}

export const GlobalCommandPalette: React.FC<GlobalCommandPaletteProps> = ({
  isOpen,
  onClose,
  menuItems,
  spots,
  orders,
  bcvRate,
  onNavigateToRole,
  onOpenCalculator,
  onOpenWeather,
  onOpenFiscalInvoice,
  availableRoles = ['admin', 'waiter', 'kitchen', 'excursion', 'client'],
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard shortcut listener for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Search results
  const matchedActions = [
    {
      id: 'act-calc',
      title: 'Calculadora de Vueltos & Divisas',
      desc: `Calcular cambio exacto o convertir a ${bcvRate.toFixed(2)} Bs/$`,
      icon: Calculator,
      color: 'bg-emerald-50 text-emerald-700',
      action: () => {
        onOpenCalculator();
        onClose();
      },
    },
    {
      id: 'act-weather',
      title: 'Clima Costero, Viento & Mareas',
      desc: '30°C • Viento 18 nudos ENE • Pleamar 2:20 PM',
      icon: Sun,
      color: 'bg-amber-50 text-amber-700',
      action: () => {
        onOpenWeather();
        onClose();
      },
    },
    {
      id: 'act-fiscal',
      title: 'Factura Digital SENIAT',
      desc: 'Comprobante fiscal con QR y desglose de IGTF',
      icon: Receipt,
      color: 'bg-sky-50 text-sky-700',
      action: () => {
        onOpenFiscalInvoice();
        onClose();
      },
    },
    {
      id: 'act-kds',
      title: 'Ir a Cocina KDS',
      desc: 'Ver fogones y órdenes activas por hora de entrega',
      icon: ChefHat,
      color: 'bg-rose-50 text-rose-700',
      role: 'kitchen' as UserRole,
      action: () => {
        onNavigateToRole('kitchen');
        onClose();
      },
    },
    {
      id: 'act-waiter',
      title: 'Ir a Comandera Móvil (Mesoneros)',
      desc: 'Tomar pedido para toldo o mesa de playa',
      icon: UtensilsCrossed,
      color: 'bg-indigo-50 text-indigo-700',
      role: 'waiter' as UserRole,
      action: () => {
        onNavigateToRole('waiter');
        onClose();
      },
    },
    {
      id: 'act-admin',
      title: 'Ir a Panel de Dueños & Cierres',
      desc: 'Arqueo de caja, auditoría fiscal y carta',
      icon: BarChart3,
      color: 'bg-blue-50 text-blue-700',
      role: 'admin' as UserRole,
      action: () => {
        onNavigateToRole('admin');
        onClose();
      },
    },
  ].filter(
    (a) =>
      (!q || a.title.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)) &&
      (!('role' in a) || !a.role || availableRoles.includes(a.role as UserRole))
  );

  // Matched Menu items
  const matchedDishes = menuItems
    .filter((m) => !q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
    .slice(0, 4);

  // Matched Spots
  const matchedSpots = spots
    .filter((s) => !q || s.name.toLowerCase().includes(q) || s.typeDesc.toLowerCase().includes(q))
    .slice(0, 4);

  // Matched Orders
  const matchedOrders = orders
    .filter(
      (o) =>
        !q ||
        o.displayNumber.toLowerCase().includes(q) ||
        o.spotName.toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q)
    )
    .slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-4 pt-16 animate-fade-in"
      onClick={onClose}
      id="global-command-palette"
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#d2e4ff] animate-scale-up flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div className="p-3.5 border-b border-gray-200 flex items-center gap-3 bg-[#f8f9ff]">
          <Search className="w-5 h-5 text-[#006782] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar plato, toldo, comanda o escribir una acción..."
            className="w-full text-sm font-semibold text-[#002546] placeholder:text-gray-400 focus:outline-none bg-transparent"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-gray-200/70 border border-gray-300 text-[10px] font-mono text-gray-600">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="p-3 space-y-3 overflow-y-auto">
          {/* Quick Actions Group */}
          {matchedActions.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2">
                Acciones Operativas Rápidas
              </span>
              <div className="space-y-1">
                {matchedActions.map((act) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.id}
                      onClick={act.action}
                      className="w-full p-2.5 rounded-2xl hover:bg-[#eff4ff] flex items-center justify-between transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${act.color}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-bold text-[#002546] block group-hover:text-[#006782] truncate">
                            {act.title}
                          </span>
                          <span className="text-[11px] text-gray-500 truncate block">
                            {act.desc}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#006782] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Menu Items Group */}
          {matchedDishes.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-gray-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2">
                Platos de la Carta
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {matchedDishes.map((dish) => (
                  <div
                    key={dish.id}
                    onClick={() => {
                      onNavigateToRole('waiter');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-[#eff4ff] hover:border-[#006782]/40 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#002546] block truncate">
                        {dish.name}
                      </span>
                      <span className="text-[10px] text-gray-500 block">
                        {dish.category}
                      </span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs font-extrabold text-[#002546] font-mono block">
                        {formatUsd(dish.priceUsd)}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        {formatBsDirect(dish.priceUsd * bcvRate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spots Group */}
          {matchedSpots.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-gray-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2">
                Toldos & Mesas de Playa
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {matchedSpots.map((spot) => (
                  <div
                    key={spot.id}
                    onClick={() => {
                      onNavigateToRole('waiter');
                      onClose();
                    }}
                    className="p-2 rounded-xl bg-gray-50 hover:bg-[#eff4ff] border border-gray-200 cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-[#002546] block">
                        {spot.name}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {spot.typeDesc}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        spot.status === 'occupied'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {spot.status === 'occupied' ? 'Ocupado' : 'Libre'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders Group */}
          {matchedOrders.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-gray-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2">
                Comandas en Proceso
              </span>
              <div className="space-y-1">
                {matchedOrders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => {
                      onNavigateToRole('kitchen');
                      onClose();
                    }}
                    className="p-2 rounded-xl bg-white border border-gray-200 hover:border-[#006782] cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-extrabold text-[#002546]">
                        {ord.displayNumber}{' '}
                        <span className="font-normal text-gray-500">• {ord.spotName}</span>
                      </span>
                      <span className="text-[10px] text-gray-500 block">
                        Entrega: {ord.estimatedDeliveryTime || 'En preparación'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#006782] font-mono">
                      {formatUsd(ord.totalUsd)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-2">
            <span>Atajo global:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-mono text-[10px]">
              Ctrl+K
            </kbd>
          </div>
          <span>Playa El Yaque • Virgen del Valle</span>
        </div>
      </div>
    </div>
  );
};
