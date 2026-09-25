import { Order } from '../types';

export type DeliveryAlertLevel = 'alert_10' | 'alert_30' | 'scheduled' | 'overdue' | 'completed';

export interface OrderDeliveryTimingInfo {
  targetDate: Date;
  minutesRemaining: number;
  formattedTargetTime: string;
  alertLevel: DeliveryAlertLevel;
  badgeLabel: string;
  badgeColorClass: string;
  isUrgent: boolean;
}

/**
 * Format a Date object into a readable 12-hour time string like "01:30 PM"
 */
export function formatClockTimeFromDate(date: Date): string {
  try {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const meridiem = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${meridiem}`;
  }
}

/**
 * Parse an Order's estimated delivery time into a concrete Date and compute minutes remaining
 */
export function getOrderDeliveryTiming(order: Order, now: Date = new Date()): OrderDeliveryTimingInfo {
  const isFinished = order.status === 'ready_pass' || order.status === 'delivered';
  const rawTimeStr = (order.estimatedDeliveryTime || '').trim();

  let targetDate: Date;
  let formattedTargetTime: string;

  // 1. Check if it matches 12-hour clock (e.g. "1:30 PM", "01:15 PM", "12:45 pm")
  const match12h = rawTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i);
  // 2. Check if it matches 24-hour clock (e.g. "13:30", "14:15")
  const match24h = rawTimeStr.match(/^(\d{1,2}):(\d{2})$/);
  // 3. Check if it's relative minutes (e.g. "En 10 min", "25 min", "~20 min")
  const matchRelMin = rawTimeStr.match(/(\d+)\s*min/i);

  if (match12h) {
    let hours = parseInt(match12h[1], 10);
    const minutes = parseInt(match12h[2], 10);
    const meridiem = match12h[3].toUpperCase();

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    targetDate = new Date(now);
    targetDate.setHours(hours, minutes, 0, 0);

    // If target date is more than 8 hours in the past, assume it's for the next day/cycle or recent
    formattedTargetTime = match12h[0].toUpperCase();
  } else if (match24h) {
    const hours = parseInt(match24h[1], 10);
    const minutes = parseInt(match24h[2], 10);

    targetDate = new Date(now);
    targetDate.setHours(hours, minutes, 0, 0);
    formattedTargetTime = formatClockTimeFromDate(targetDate);
  } else if (matchRelMin) {
    const mins = parseInt(matchRelMin[1], 10);
    // If order was created recently (<2h), calculate from createdAt; otherwise calculate from now
    const orderCreatedMs = order.createdAt ? new Date(order.createdAt).getTime() : 0;
    const isRecent = orderCreatedMs > 0 && Math.abs(now.getTime() - orderCreatedMs) < 2 * 3600 * 1000;
    const baseOrigin = isRecent ? new Date(order.createdAt!) : now;
    targetDate = new Date(baseOrigin.getTime() + mins * 60000);
    formattedTargetTime = formatClockTimeFromDate(targetDate);
  } else if (rawTimeStr.toLowerCase().includes('inmediato') || rawTimeStr.toLowerCase().includes('ahora')) {
    // Immediate orders scheduled for 15 minutes after receipt
    const orderCreatedMs = order.createdAt ? new Date(order.createdAt).getTime() : 0;
    const isRecent = orderCreatedMs > 0 && Math.abs(now.getTime() - orderCreatedMs) < 2 * 3600 * 1000;
    const baseOrigin = isRecent ? new Date(order.createdAt!) : now;
    targetDate = new Date(baseOrigin.getTime() + 15 * 60000);
    formattedTargetTime = `${formatClockTimeFromDate(targetDate)} (Inmediato)`;
  } else {
    // Default fallback: 25 minutes after order receipt
    const orderCreatedMs = order.createdAt ? new Date(order.createdAt).getTime() : 0;
    const isRecent = orderCreatedMs > 0 && Math.abs(now.getTime() - orderCreatedMs) < 2 * 3600 * 1000;
    const baseOrigin = isRecent ? new Date(order.createdAt!) : now;
    targetDate = new Date(baseOrigin.getTime() + 25 * 60000);
    formattedTargetTime = formatClockTimeFromDate(targetDate);
  }

  const diffMs = targetDate.getTime() - now.getTime();
  const minutesRemaining = Math.round(diffMs / 60000);

  let alertLevel: DeliveryAlertLevel;
  let badgeLabel: string;
  let badgeColorClass: string;
  let isUrgent = false;

  if (isFinished) {
    alertLevel = 'completed';
    badgeLabel = `Listo para Pase (${formattedTargetTime})`;
    badgeColorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  } else if (minutesRemaining < 0) {
    alertLevel = 'overdue';
    badgeLabel = `🚨 ¡ENTREGA VENCIDA! (${Math.abs(minutesRemaining)} min tarde)`;
    badgeColorClass = 'bg-rose-600 text-white border-rose-700 animate-pulse';
    isUrgent = true;
  } else if (minutesRemaining <= 10) {
    alertLevel = 'alert_10';
    badgeLabel = `🚨 ¡QUEDAN ${minutesRemaining} MIN PARA ENTREGA! (A las ${formattedTargetTime})`;
    badgeColorClass = 'bg-rose-500 text-white border-rose-600 animate-pulse';
    isUrgent = true;
  } else if (minutesRemaining <= 30) {
    alertLevel = 'alert_30';
    badgeLabel = `⏰ FALTAN ${minutesRemaining} MIN • MONTAR PLATO EN COCINA (A las ${formattedTargetTime})`;
    badgeColorClass = 'bg-amber-400 text-amber-950 border-amber-500 font-bold';
    isUrgent = true;
  } else {
    alertLevel = 'scheduled';
    badgeLabel = `🕒 Entrega programada: ${formattedTargetTime} (en ${minutesRemaining} min)`;
    badgeColorClass = 'bg-sky-100 text-sky-900 border-sky-200';
  }

  return {
    targetDate,
    minutesRemaining,
    formattedTargetTime,
    alertLevel,
    badgeLabel,
    badgeColorClass,
    isUrgent,
  };
}

/**
 * Sorts orders primarily by their scheduled delivery time (earliest delivery first)
 */
export function sortOrdersByDeliveryTime(orders: Order[], now: Date = new Date()): Order[] {
  return [...orders].sort((a, b) => {
    // If one is ready and one is still cooking, active cooking orders take priority in in_fire tab
    const timingA = getOrderDeliveryTiming(a, now);
    const timingB = getOrderDeliveryTiming(b, now);

    return timingA.targetDate.getTime() - timingB.targetDate.getTime();
  });
}
