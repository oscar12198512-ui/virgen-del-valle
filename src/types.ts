export type UserRole = 'waiter' | 'excursion' | 'kitchen' | 'admin' | 'client';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Dueño',
  waiter: 'Mesonero',
  kitchen: 'Cocina',
  excursion: 'Excursiones',
  client: 'Cliente',
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel?: string;
  zone?: string | null;
  activeOrdersCount?: number;
  phone?: string | null;
  avatar?: string | null;
  status?: 'active' | 'suspended' | 'pending_approval';
  assignedToldoIds?: string[];
  boatName?: string | null;
  createdAt?: string;
  notes?: string | null;
  lastLogin?: string | null;
  sessionToken?: string;
}

export type SpotZone = 'beach' | 'churuata' | 'muelle';
export type SpotStatus = 'available' | 'selected' | 'occupied';

export interface ToldoSpot {
  id: string;
  number: string;
  zone: SpotZone;
  name: string;
  typeDesc: string;
  status: SpotStatus;
  distanceDesc: string;
  assignedWaiterId: string;
  assignedWaiterName: string;
  boatName?: string;
  capacity: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'pescados' | 'mariscos' | 'entradas' | 'bebidas' | 'postres';
  priceUsd: number; // Precio regular para mesoneros y servicio de toldos en playa
  priceExcursionUsd?: number; // Precio especial / mayorista negociado para excursiones y lanchas
  menuTarget?: 'all' | 'waiters' | 'excursions'; // 'all' (ambos menús), 'waiters' (solo mesoneros), 'excursions' (solo excursiones)
  description: string;
  imageUrl: string;
  estimatedMinutes: string;
  isAvailable: boolean;
  tag?: string;
  servingSize?: string;
  waiterShareUsd?: number; // Monto asignado al mesonero por plato vendido (se debita automáticamente en liquidación)
}

export type OrderStatus = 'pending' | 'in_fire' | 'plated' | 'ready_pass' | 'delivered' | 'cancelled';
export type OrderOrigin = 'client_qr' | 'waiter_pos' | 'excursion';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPriceUsd: number;
  imageUrl?: string;
  waiterShareUsd?: number; // Parte que pertenece al mesonero por unidad
  specialNote?: string;
  status?: 'queue' | 'cooking' | 'plated' | 'ready';
  prepTimerSeconds?: number;
}

export interface Order {
  id: string;
  displayNumber: string; // e.g. #PB-204 or #1048
  origin: OrderOrigin;
  spotId: string;
  spotName: string;
  customerName: string;
  customerPhone?: string;
  waiterId?: string;
  waiterName?: string;
  items: OrderItem[];
  subtotalUsd: number;
  tipPercent: number;
  tipUsd: number;
  totalUsd: number;
  totalBs: number;
  status: OrderStatus;
  paymentStatus: 'pending' | 'verified' | 'cash_waiter';
  paymentMethod?: 'cash_usd' | 'cash_bs' | 'pago_movil' | 'zelle' | 'pos_card' | 'card_pos';
  paymentReference?: string;
  paymentScreenshot?: string;
  isSettled?: boolean;
  createdAt: string; // ISO string
  updatedAt: string;
  estimatedDeliveryTime?: string;
  orderNote?: string;
  kitchenStep: 1 | 2 | 3 | 4;
  elapsedSeconds?: number;
  readyAt?: string; // ISO string when marked ready_pass or delivered
  prepDurationMinutes?: number; // Calculated minutes elapsed from receipt (createdAt) to ready
  clientUserId?: string; // Identificador del usuario cliente que creo el pedido
}

export interface ExcursionPackage {
  id: string;
  tourCode: string;
  boatName: string;
  captainName: string;
  passengersCount: number;
  agencyName?: string;
  braceletsColor: string;
  menuIncluded: string;
  departureTime: string;
  arrivalTime: string;
  estimatedServingTime: string;
  orderNote?: string;
  knotsSpeed: number;
  isApproachingNotified: boolean;
  kdsStatus: string;
  items: OrderItem[];
  subtotalUsd: number;
  tipPercent: number;
  totalUsd: number;
  isSettled: boolean;
  paymentPreference: 'cash_usd' | 'pago_movil' | 'transfer';
  paymentStatus?: 'pending' | 'verified' | 'cash_waiter';
}

export interface WaiterComandaItem {
  id: string;
  toldo: string;
  description: string;
  method: string;
  amountUsd: number;
  isCash: boolean;
}

export interface WaiterClosingSummary {
  id: string;
  waiterId: string;
  waiterName: string;
  waiterZone: string;
  waiterRoleNumber: string;
  avatarInitials: string;
  toldosAttendedCount: number;
  ordersClosedCount: number;
  totalCollectedUsd: number;
  digitalReportedUsd: number; // Total digital reportado (Pago Móvil + Int'l)
  pagoMovilDeductedUsd?: number; // Monto de Pago Móvil descontado por el dueño
  internationalDeductedUsd?: number; // Monto internacional/Zelle descontado por el dueño
  commissionWaiterUsd: number; // Propina / % servicio descontada a favor del mesonero
  dishShareWaiterUsd?: number; // Monto por platos vendidos debitado automáticamente a favor del mesonero
  dishesBreakdown?: Array<{
    name: string;
    quantity: number;
    sharePerUnit: number;
    totalShare: number;
  }>;
  cashToDeliverUsd: number; // Efectivo neto a entregar (o a favor si negativo)
  status: 'pending' | 'settled';
  settledAt?: string;
  settledByOwner?: string;
  pazYSalvoHash?: string;
  pazYSalvoNumber?: string;
  envelopeBills?: BillDenominationCount;
  comandas?: WaiterComandaItem[];
  deductionsNote?: string;
}

export interface BillDenominationCount {
  d100: number;
  d50: number;
  d20: number;
  d10: number;
  d5: number;
  d1: number;
}

export interface BankConfig {
  pagoMovilBank: string;
  pagoMovilPhone: string;
  pagoMovilRif: string;
  pagoMovilHolder: string;
  zelleEmail: string;
  zelleHolder: string;
  zelleMemoInstruction: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
  hash?: string;
}

export interface ArenaSupplyItem {
  id: string;
  name: string;
  category: 'ice' | 'beer' | 'fish' | 'gas' | 'packaging';
  currentLevelPercent: number;
  stockDisplay: string;
  status: 'critical' | 'warning' | 'normal';
  note: string;
  unitCostUsd: number;
  icon: string;
}

export interface CargoBoatManifest {
  guideNumber: string;
  boatName: string;
  captain: string;
  vhfChannel: string;
  origin: string;
  destination: string;
  travelTimeMinutes: number;
  departureTime: string;
  estimatedArrival: string;
  status: 'in_transit' | 'docked' | 'unloaded';
  items: Array<{
    name: string;
    quantityDisplay: string;
    isChecked: boolean;
  }>;
}

export interface WasteReportItem {
  id: string;
  timestamp: string;
  incidenceType: string;
  itemName: string;
  quantity: number;
  costUsd: number;
  costBs: number;
  reportedBy: string;
}

export interface RbacRoleDefinition {
  role: string;
  label: string;
  identifier: string;
  devices: string;
  authMethod: string;
  permissions: string[];
}

