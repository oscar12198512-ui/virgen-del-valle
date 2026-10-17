import { UserRole } from '../types';

/**
 * Normaliza cualquier variante de rol (por ejemplo en español, con mayúsculas o espacios)
 * a uno de los UserRole oficiales del sistema POS: 'admin' | 'waiter' | 'kitchen' | 'excursion' | 'client'
 * 
 * Sin otorgar permisos administrativos a roles desconocidos.
 */
export function normalizeUserRole(rawRole: unknown): UserRole {
  if (!rawRole) return 'client';
  const roleStr = String(rawRole).trim().toLowerCase();

  // 1. Dueño / Administrador
  if (
    roleStr === 'admin' ||
    roleStr === 'dueño' ||
    roleStr === 'dueno' ||
    roleStr === 'administrador' ||
    roleStr === 'owner' ||
    roleStr === 'gerente'
  ) {
    return 'admin';
  }

  // 2. Cocinero / Cocina / Chef
  if (
    roleStr === 'kitchen' ||
    roleStr === 'cocina' ||
    roleStr === 'cocinero' ||
    roleStr === 'cocinera' ||
    roleStr === 'chef' ||
    roleStr === 'kds' ||
    roleStr === 'cook'
  ) {
    return 'kitchen';
  }

  // 3. Mesonero
  if (
    roleStr === 'waiter' ||
    roleStr === 'mesonero' ||
    roleStr === 'mesero' ||
    roleStr === 'salon' ||
    roleStr === 'salón'
  ) {
    return 'waiter';
  }

  // 4. Excursiones / Lanchas
  if (
    roleStr === 'excursion' ||
    roleStr === 'excursiones' ||
    roleStr === 'lancha' ||
    roleStr === 'embarcacion' ||
    roleStr === 'embarcación' ||
    roleStr === 'capitan' ||
    roleStr === 'capitán' ||
    roleStr === 'boat'
  ) {
    return 'excursion';
  }

  // 5. Cliente comensal (por defecto)
  return 'client';
}

/**
 * Comprueba si un rol es del equipo de personal (staff operativo)
 */
export function isStaffRole(role: UserRole | string | null | undefined): boolean {
  const normalized = normalizeUserRole(role);
  return normalized === 'admin' || normalized === 'waiter' || normalized === 'kitchen' || normalized === 'excursion';
}
