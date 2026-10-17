/**
 * Servicio de almacenamiento y persistencia para notificaciones y alertas
 * Evita que las notificaciones vuelvan a aparecer al recargar la página o recibir snapshots de Firestore.
 */

const STORAGE_PREFIX = 'playa_buche_notif_';

export interface NotificationPersistenceState {
  readIds: Set<string>;
  dismissedIds: Set<string>;
  acknowledgedOrderAlerts: Set<string>; // formato: 'orderId_10m' o 'orderId_30m'
}

function getStorageKey(type: string, userId?: string | null): string {
  const userSegment = userId ? `_${userId.trim().toLowerCase()}` : '_global';
  return `${STORAGE_PREFIX}${type}${userSegment}`;
}

export function loadReadNotificationIds(userId?: string | null): Set<string> {
  try {
    const raw = localStorage.getItem(getStorageKey('read', userId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

export function saveReadNotificationIds(ids: Set<string>, userId?: string | null): void {
  try {
    // Mantener los últimos 300 IDs para evitar saturación de almacenamiento local
    const arr = Array.from(ids).slice(-300);
    localStorage.setItem(getStorageKey('read', userId), JSON.stringify(arr));
  } catch {}
}

export function loadDismissedNotificationIds(userId?: string | null): Set<string> {
  try {
    const raw = localStorage.getItem(getStorageKey('dismissed', userId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

export function saveDismissedNotificationIds(ids: Set<string>, userId?: string | null): void {
  try {
    const arr = Array.from(ids).slice(-300);
    localStorage.setItem(getStorageKey('dismissed', userId), JSON.stringify(arr));
  } catch {}
}

export function loadKitchenAcknowledgedAlerts(): Set<string> {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}kds_acknowledged`) || localStorage.getItem(`${STORAGE_PREFIX}kds_acknowledged`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

export function saveKitchenAcknowledgedAlert(alertKey: string): void {
  try {
    const current = loadKitchenAcknowledgedAlerts();
    current.add(alertKey);
    const arr = Array.from(current).slice(-100);
    const serialized = JSON.stringify(arr);
    sessionStorage.setItem(`${STORAGE_PREFIX}kds_acknowledged`, serialized);
    localStorage.setItem(`${STORAGE_PREFIX}kds_acknowledged`, serialized);
  } catch {}
}
