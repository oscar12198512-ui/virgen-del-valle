import React, { useState } from 'react';
import {
  Bell,
  X,
  Volume2,
  VolumeX,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Flame,
  Ship,
  Play,
  Check,
  ChevronRight,
  Sparkles,
  Utensils
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { UserRole, Order, User } from '../types';
import { getOrderDeliveryTiming } from '../utils/deliveryTiming';

export interface AppNotification {
  id: string;
  type: 'urgent_10' | 'alert_30' | 'new_order' | 'ready_order' | 'boat_approaching' | 'system';
  title: string;
  message: string;
  timestamp: string;
  orderId?: string;
  isRead: boolean;
  targetRole?: UserRole;
}

interface NotificationCenterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  currentRole: UserRole;
  currentUser?: User | null;
  onSelectOrder?: (orderId: string) => void;
  onNavigateToView?: (role: UserRole) => void;
  approachingAlertCount?: number;
}

export const NotificationCenterDropdown: React.FC<NotificationCenterDropdownProps> = ({
  isOpen,
  onClose,
  orders,
  currentRole,
  currentUser,
  onSelectOrder,
  onNavigateToView,
  approachingAlertCount = 0,
}) => {
  const [soundMuted, setSoundMuted] = useState(false);

  if (!isOpen) return null;

  const now = new Date();
  const isKitchenOrAdmin = currentRole === 'admin' || currentRole === 'kitchen';

  // Generate dynamic live notifications based on actual orders & boat events
  const dynamicNotifications: AppNotification[] = [];

  // 1. Boat approaching alerts (SOLO para Dueño y Cocina)
  if (isKitchenOrAdmin && approachingAlertCount > 0) {
    dynamicNotifications.push({
      id: 'boat-notif',
      type: 'boat_approaching',
      title: 'Lancha de Excursión en Aproximación',
      message: 'Embarcación turística a menos de 5 millas náuticas del muelle. Preparar mesa de bienvenida.',
      timestamp: 'Ahora',
      isRead: false,
      targetRole: 'excursion',
    });
  }

  // 2. Urgent 10 min & 30 min preparation alerts (SOLO para Dueño y Cocina)
  if (isKitchenOrAdmin) {
    orders.forEach((o) => {
      if (o.status !== 'delivered' && o.status !== 'ready_pass' && o.status !== 'cancelled') {
        const timing = getOrderDeliveryTiming(o, now);
        if (timing.minutesRemaining <= 10 && timing.minutesRemaining > 0) {
          dynamicNotifications.push({
            id: 'urgent-10-' + o.id,
            type: 'urgent_10',
            title: `🚨 Pase Inminente: Comanda ${o.displayNumber}`,
            message: `${o.spotName} • Restan solo ${timing.minutesRemaining} min para entrega`,
            timestamp: timing.formattedTargetTime,
            orderId: o.id,
            isRead: false,
            targetRole: 'kitchen',
          });
        } else if (timing.minutesRemaining <= 30 && timing.minutesRemaining > 10) {
          dynamicNotifications.push({
            id: 'alert-30-' + o.id,
            type: 'alert_30',
            title: `⏰ Montar en Cocina: Comanda ${o.displayNumber}`,
            message: `${o.spotName} • Faltan ${timing.minutesRemaining} min. Iniciar montaje de platos`,
            timestamp: timing.formattedTargetTime,
            orderId: o.id,
            isRead: false,
            targetRole: 'kitchen',
          });
        }
      }
    });

    // 3. New / In-fire orders (SOLO para Dueño y Cocina)
    orders.slice(0, 3).forEach((o) => {
      if (o.status === 'in_fire') {
        dynamicNotifications.push({
          id: 'new-ord-' + o.id,
          type: 'new_order',
          title: `🔥 Comanda en Fuego: ${o.displayNumber}`,
          message: `${o.spotName} • ${o.items.length} platos en preparación`,
          timestamp: o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente',
          orderId: o.id,
          isRead: true,
          targetRole: 'kitchen',
        });
      }
    });
  }

  // 4. Ready orders: Filtradas estrictamente por rol destinatario
  orders.forEach((o) => {
    if (o.status === 'ready_pass') {
      const isClientOrder = o.origin === 'client_qr';
      const isExcursionOrder = o.origin === 'excursion';
      const isWaiterOrder = !isClientOrder && !isExcursionOrder;

      // Si es Dueño o Cocina, ve todas las listas
      // Si es Cliente, ve SOLO las listas de clientes
      // Si es Mesonero, ve SOLO las listas de mesoneros
      // Si es Excursión, ve SOLO las listas de excursión
      const shouldInclude =
        isKitchenOrAdmin ||
        (currentRole === 'client' && isClientOrder) ||
        (currentRole === 'waiter' && isWaiterOrder) ||
        (currentRole === 'excursion' && isExcursionOrder);

      if (shouldInclude) {
        dynamicNotifications.push({
          id: 'ready-pass-' + o.id,
          type: 'ready_order',
          title:
            isClientOrder
              ? `🎉 ¡Tu Pedido está LISTO!: ${o.displayNumber}`
              : isExcursionOrder
              ? `⚓ Excursión LISTA en Cocina: ${o.displayNumber}`
              : `🍽️ Comanda LISTA para Retirar: ${o.displayNumber}`,
          message:
            isClientOrder
              ? `Servicio para ${o.spotName} listo en cocina para llevar a tu toldo.`
              : isExcursionOrder
              ? `Raciones listas para despacho en muelle (${o.spotName}).`
              : `${o.spotName} • Mesonero ${o.waiterName || ''}: Retirar plato en pase de cocina.`,
          timestamp: o.readyAt ? new Date(o.readyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Listo',
          orderId: o.id,
          isRead: false,
          targetRole: isClientOrder ? 'client' : isExcursionOrder ? 'excursion' : 'waiter',
        });
      }
    }
  });

  const handlePlaySound = (type: AppNotification['type']) => {
    if (type === 'urgent_10') soundService.playUrgent10MinAlert();
    else if (type === 'alert_30') soundService.playMountPlate30MinAlert();
    else if (type === 'ready_order') soundService.playReadyPassAlert();
    else if (type === 'new_order') soundService.playBell();
    else soundService.playNotification();
    soundService.buzzSmartBand();
  };

  const handleClickNotification = (notif: AppNotification) => {
    if (notif.orderId && onSelectOrder) {
      onSelectOrder(notif.orderId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden mt-14 sm:mt-16 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#002546] text-white flex items-center justify-between border-b border-[#003b5f]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0d3b66] text-[#57d1fd] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                {currentRole === 'client'
                  ? 'Mis Notificaciones'
                  : currentRole === 'waiter'
                  ? 'Avisos de Cocina & Pase'
                  : currentRole === 'excursion'
                  ? 'Avisos de Despacho'
                  : 'Centro de Notificaciones'}
              </h3>
              <span className="text-[10px] text-[#bbe9ff]">
                {dynamicNotifications.length}{' '}
                {dynamicNotifications.length === 1 ? 'aviso disponible' : 'avisos disponibles'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setSoundMuted(!soundMuted);
                if (soundMuted) soundService.playBell();
              }}
              title={soundMuted ? 'Activar sonido' : 'Silenciar sonido'}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                soundMuted ? 'bg-rose-500/20 text-rose-300' : 'bg-white/10 text-[#bbe9ff] hover:bg-white/20'
              }`}
            >
              {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
          {dynamicNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-[#002546]">
                {currentRole === 'client'
                  ? 'Sin avisos pendientes'
                  : currentRole === 'waiter'
                  ? 'Todo entregado'
                  : currentRole === 'excursion'
                  ? 'Sin despachos pendientes'
                  : 'Todo al día en la operación'}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {currentRole === 'client'
                  ? 'Te notificaremos aquí en cuanto tu comanda esté lista en cocina.'
                  : currentRole === 'waiter'
                  ? 'Te avisaremos tan pronto haya platos listos para retirar en el pase.'
                  : currentRole === 'excursion'
                  ? 'Te avisaremos cuando el almuerzo de tu lancha esté listo en muelle.'
                  : 'No hay alertas activas de demora ni emergencias de cocina.'}
              </p>
            </div>
          ) : (
            dynamicNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleClickNotification(notif)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer hover:shadow-xs flex items-start justify-between gap-2 ${
                  notif.type === 'urgent_10'
                    ? 'bg-rose-50/70 border-rose-300 hover:bg-rose-50'
                    : notif.type === 'alert_30'
                    ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-50'
                    : notif.type === 'ready_order'
                    ? 'bg-emerald-50/80 border-emerald-400 hover:bg-emerald-50'
                    : notif.type === 'boat_approaching'
                    ? 'bg-sky-50/70 border-sky-300 hover:bg-sky-50'
                    : 'bg-white border-gray-200 hover:bg-[#eff4ff]/50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      notif.type === 'urgent_10'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : notif.type === 'alert_30'
                        ? 'bg-amber-500 text-white'
                        : notif.type === 'ready_order'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : notif.type === 'boat_approaching'
                        ? 'bg-sky-600 text-white'
                        : 'bg-[#002546] text-white'
                    }`}
                  >
                    {notif.type === 'urgent_10' ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : notif.type === 'alert_30' ? (
                      <Clock className="w-3.5 h-3.5" />
                    ) : notif.type === 'ready_order' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : notif.type === 'boat_approaching' ? (
                      <Ship className="w-3.5 h-3.5" />
                    ) : (
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#002546] leading-tight">{notif.title}</h4>
                    <p className="text-[11px] text-gray-600 mt-0.5">{notif.message}</p>
                    <span className="text-[10px] text-gray-400 block mt-1 font-mono">
                      {notif.timestamp}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {!soundMuted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySound(notif.type);
                      }}
                      title="Probar sonido"
                      className="p-1 rounded-md text-gray-400 hover:text-[#002546] transition-colors"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 mt-1" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#eff4ff] border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
          <span className="text-[11px] text-[#006782] font-semibold">
            {isKitchenOrAdmin
              ? 'Alertas sincronizadas con KDS Fogones'
              : 'Alertas en tiempo real vía Mesh'}
          </span>
          <button
            onClick={onClose}
            className="text-[11px] font-bold text-[#002546] hover:underline"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
