import React, { useEffect, useState, useMemo } from 'react';
import {
  BankConfig,
  BillDenominationCount,
  MenuItem,
  User,
  WaiterClosingSummary,
  ArenaSupplyItem,
  AuditLogItem,
  CargoBoatManifest,
  WasteReportItem,
  RbacRoleDefinition,
  Order,
  OrderStatus,
  ToldoSpot,
  WaiterComandaItem,
  GiveawayState,
} from '../types';
import {
  INITIAL_ARENA_SUPPLIES,
  INITIAL_AUDIT_LOGS,
  INITIAL_CARGO_BOAT,
  INITIAL_WASTE_REPORTS,
  RBAC_ROLE_DEFINITIONS,
  INITIAL_ORDERS,
} from '../data/initialData';
import { formatUsd, formatBsDirect } from '../utils/currencyFormatter';
import { soundService } from '../services/soundService';
import { hardwareDriversService } from '../services/hardwareDriversService';
import { generatePazYSalvoHash } from '../utils/cryptoHash';
import { RbacSecurityMatrix } from '../components/RbacSecurityMatrix';
import { SatelliteMeshContingency } from '../components/SatelliteMeshContingency';
import { FiscalAuditView } from '../components/FiscalAuditView';
import { OrderSyncEditor } from '../components/OrderSyncEditor';
import { OwnerMenuManager } from '../components/OwnerMenuManager';
import { OwnerKitchenMonitor } from '../components/OwnerKitchenMonitor';
import { OwnerStaffManager } from '../components/OwnerStaffManager';
import { OwnerGiveawayManager } from '../components/OwnerGiveawayManager';
import { getOrderDeliveryTiming } from '../utils/deliveryTiming';
import {
  Wallet,
  TrendingUp,
  RefreshCw,
  Building2,
  DollarSign,
  Users,
  UserCheck,
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle2,
  Printer,
  ChevronRight,
  PieChart,
  Lock,
  Plus,
  Minus,
  AlertCircle,
  FileText,
  Receipt,
  Anchor,
  Ship,
  Radio,
  Package,
  Flame,
  ShieldAlert,
  Key,
  Save,
  LifeBuoy,
  Utensils,
  Clock,
  Edit3,
  Volume2,
  Share2,
  Zap,
  Download,
  QrCode
} from 'lucide-react';

interface AdminViewProps {
  bcvRate: number;
  onUpdateBcvRate: (newRate: number) => void;
  bankConfig: BankConfig;
  onUpdateBankConfig: (newConfig: BankConfig) => void;
  menuItems: MenuItem[];
  onToggleMenuAvailability: (itemId: string) => void;
  onAddMenuItem?: (newItem: MenuItem) => void;
  onUpdateMenuItem?: (updatedItem: MenuItem) => void;
  onDeleteMenuItem?: (itemId: string) => void;
  waitersClosings: WaiterClosingSummary[];
  onSettleWaiter: (settledClosing: WaiterClosingSummary) => void;
  onUpdateWaiterClosing?: (updatedClosing: WaiterClosingSummary) => void;
  onOpenPazYSalvo: (closing: WaiterClosingSummary) => void;
  drawerBills: BillDenominationCount;
  onUpdateDrawerBills: (bills: BillDenominationCount) => void;
  staffUsers: User[];
  apiBase: string;
  authHeaders: () => Record<string, string>;
  currentUserId: string;
  onUsersChanged: (users: User[]) => void;
  onOpenFiscalInvoice?: () => void;
  orders?: Order[];
  onUpdateOrderStatus?: (orderId: string, newStatus: OrderStatus) => void;
  onUpdateOrder?: (updated: Order) => void;
  onOpenPagoMovil?: (order: Order) => void;
  approachingAlertCount?: number;
  spots?: ToldoSpot[];
  onOpenToldoQrModal?: () => void;
  giveaway: GiveawayState;
  onUpdateGiveaway: (updated: GiveawayState) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  bcvRate,
  onUpdateBcvRate,
  bankConfig,
  onUpdateBankConfig,
  menuItems,
  onToggleMenuAvailability,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  waitersClosings,
  onSettleWaiter,
  onUpdateWaiterClosing,
  onOpenPazYSalvo,
  drawerBills,
  onUpdateDrawerBills,
  staffUsers,
  apiBase,
  authHeaders,
  currentUserId,
  onUsersChanged,
  onOpenFiscalInvoice,
  orders = INITIAL_ORDERS,
  onUpdateOrderStatus,
  onUpdateOrder,
  onOpenPagoMovil,
  approachingAlertCount = 0,
  spots = [],
  onOpenToldoQrModal,
  giveaway,
  onUpdateGiveaway,
}) => {
  const [adminTab, setAdminTab] = useState<
    'closings' | 'staff_access' | 'menu' | 'fiscal_audit' | 'contingency' | 'order_sync' | 'logistics' | 'rbac' | 'dashboard' | 'giveaway'
  >('closings');
  const [kdsSubView, setKdsSubView] = useState<'monitor' | 'editor'>('monitor');
  const [rateInput, setRateInput] = useState<string>(bcvRate.toString());
  const [financialPeriod, setFinancialPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    setRateInput(bcvRate.toString());
  }, [bcvRate]);
  const [closingsFilter, setClosingsFilter] = useState<'pending' | 'settled' | 'all'>('pending');
  const [showActaZSuccess, setShowActaZSuccess] = useState(false);
  const [rateNotice, setRateNotice] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [selectedMesoneroId, setSelectedMesoneroId] = useState<string>('');
  const [envelopeBillsState, setEnvelopeBillsState] = useState<Record<string, BillDenominationCount>>(() => {
    const map: Record<string, BillDenominationCount> = {};
    waitersClosings.forEach((w) => {
      if (w.envelopeBills) {
        map[w.id] = { ...w.envelopeBills };
      }
    });
    return map;
  });

  // Logística Marina & Inventario de Arena
  const [arenaSupplies, setArenaSupplies] = useState<ArenaSupplyItem[]>(INITIAL_ARENA_SUPPLIES);
  const [cargoBoat, setCargoBoat] = useState<CargoBoatManifest>(INITIAL_CARGO_BOAT);
  const [wasteReports, setWasteReports] = useState<WasteReportItem[]>(INITIAL_WASTE_REPORTS);
  const [wasteIncidence, setWasteIncidence] = useState('Botella rota en arena');
  const [wasteUnitCost, setWasteUnitCost] = useState<number>(1.5);
  const [wasteItemName, setWasteItemName] = useState('Polar Light (1 Tercio)');
  const [wasteQuantity, setWasteQuantity] = useState(1);
  const [boatReceivedNotice, setBoatReceivedNotice] = useState<string | null>(null);
  const [wasteNotice, setWasteNotice] = useState<string | null>(null);
  const [selectedRbacRole, setSelectedRbacRole] = useState<string>('OWNER');
  const [showSqlPolicies, setShowSqlPolicies] = useState<boolean>(false);
  const [adminStateHydrated, setAdminStateHydrated] = useState(false);
  const [isReachable, setIsReachable] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!apiBase) {
      setAdminStateHydrated(true);
      return;
    }
    fetch(apiBase + '/api/state', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.state) return;
        if (Array.isArray(data.state.arenaSupplies)) setArenaSupplies(data.state.arenaSupplies);
        if (data.state.cargoBoat) setCargoBoat(data.state.cargoBoat);
        if (Array.isArray(data.state.wasteReports)) setWasteReports(data.state.wasteReports);
      })
      .catch(() => {
        if (!cancelled) setIsReachable(false);
      })
      .finally(() => {
        if (!cancelled) setAdminStateHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, authHeaders]);

  useEffect(() => {
    if (!adminStateHydrated || !apiBase) return;
    const timer = window.setTimeout(() => {
      fetch(apiBase + '/api/state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ state: { arenaSupplies, cargoBoat, wasteReports } }),
      }).catch(() => undefined);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [adminStateHydrated, apiBase, authHeaders, arenaSupplies, cargoBoat, wasteReports]);


  const handleConfirmBoatArrival = () => {
    soundService.playSuccess();
    setCargoBoat((prev) => ({
      ...prev,
      status: 'unloaded',
    }));
    setArenaSupplies((prev) =>
      prev.map((item) => {
        if (item.category === 'ice') {
          return {
            ...item,
            currentLevelPercent: 95,
            stockDisplay: '48/50 bolsas',
            status: 'normal',
            note: 'Reabastecido por Lancha El Morro II',
          };
        }
        if (item.category === 'beer') {
          return {
            ...item,
            currentLevelPercent: 85,
            stockDisplay: '39 cajas',
            status: 'normal',
            note: 'Reabastecido por Lancha El Morro II',
          };
        }
        if (item.category === 'fish') {
          return {
            ...item,
            currentLevelPercent: 80,
            stockDisplay: '40 u.',
            status: 'normal',
            note: 'Pescado fresco desembarcado en muelle',
          };
        }
        if (item.category === 'gas') {
          return {
            ...item,
            currentLevelPercent: 88,
            stockDisplay: '3 Activas | 2 Res.',
            status: 'normal',
            note: 'Bombonas 43kg conectadas a K-01',
          };
        }
        return item;
      })
    );
    setBoatReceivedNotice('¡Carga desembarcada e ingresada con éxito al inventario disponible de Playa Buche!');
    setTimeout(() => setBoatReceivedNotice(null), 5000);
  };

  const handleAddWasteReport = () => {
    soundService.playCashChime();
    const costUsd = parseFloat((wasteUnitCost * wasteQuantity).toFixed(2));
    const costBs = parseFloat((costUsd * bcvRate).toFixed(2));
    const newReport: WasteReportItem = {
      id: 'waste-' + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' hrs',
      incidenceType: wasteIncidence,
      itemName: wasteItemName,
      quantity: wasteQuantity,
      costUsd,
      costBs,
      reportedBy: 'Socio Admin (Libro Diario)',
    };
    setWasteReports([newReport, ...wasteReports]);
    setWasteQuantity(1);
    setWasteNotice(`Asentado: ${wasteQuantity}x ${wasteItemName} registrado con éxito en el balance de inventario.`);
    setTimeout(() => setWasteNotice(null), 4000);
  };

  const handleEnvelopeBillDelta = (closingId: string, denom: keyof BillDenominationCount, delta: number) => {
    setEnvelopeBillsState((prev) => {
      const current = prev[closingId] || { d100: 0, d50: 0, d20: 0, d10: 0, d5: 0, d1: 0 };
      return {
        ...prev,
        [closingId]: {
          ...current,
          [denom]: Math.max(0, current[denom] + delta),
        },
      };
    });
  };

  const getEnvelopeTotal = (closingId: string, fallbackTotal: number) => {
    const bills = envelopeBillsState[closingId];
    if (!bills) return fallbackTotal;
    return (
      bills.d100 * 100 +
      bills.d50 * 50 +
      bills.d20 * 20 +
      bills.d10 * 10 +
      bills.d5 * 5 +
      bills.d1 * 1
    );
  };

  // Deducciones controladas por el dueño y visualización de platos
  const [waiterDeductions, setWaiterDeductions] = useState<
    Record<string, { pagoMovil: number; international: number; showDishes?: boolean }>
  >(() => {
    const map: Record<string, { pagoMovil: number; international: number; showDishes?: boolean }> = {};
    waitersClosings.forEach((w) => {
      const pm = w.pagoMovilDeductedUsd ?? (w.digitalReportedUsd * 0.6);
      const intl = w.internationalDeductedUsd ?? (w.digitalReportedUsd * 0.4);
      map[w.id] = {
        pagoMovil: Math.round(pm * 100) / 100,
        international: Math.round(intl * 100) / 100,
        showDishes: false,
      };
    });
    return map;
  });

  const getClosingDeduction = (w: WaiterClosingSummary) => {
    const entry = waiterDeductions[w.id];
    const defaultPm = w.pagoMovilDeductedUsd ?? (w.digitalReportedUsd * 0.6);
    const defaultIntl = w.internationalDeductedUsd ?? (w.digitalReportedUsd * 0.4);
    const pm = entry !== undefined ? entry.pagoMovil : defaultPm;
    const intl = entry !== undefined ? entry.international : defaultIntl;
    const dishShare = w.dishShareWaiterUsd ?? 0;
    const tip = w.commissionWaiterUsd ?? 0;
    // Cálculo de efectivo neto real: no ocultar diferencias negativas con Math.max(0, ...)
    const netCash = Math.round((w.totalCollectedUsd - pm - intl - dishShare - tip) * 100) / 100;

    return {
      pagoMovil: pm,
      international: intl,
      dishShare,
      tip,
      netCash,
      showDishes: entry?.showDishes ?? false,
    };
  };

  const handleUpdateDeduction = (closingId: string, type: 'pagoMovil' | 'international', val: number) => {
    const cleanVal = isNaN(val) ? 0 : Math.max(0, Math.round(val * 100) / 100);
    setWaiterDeductions((prev) => {
      const existing = prev[closingId] || { pagoMovil: 0, international: 0, showDishes: false };
      const nextPm = type === 'pagoMovil' ? cleanVal : existing.pagoMovil;
      const nextIntl = type === 'international' ? cleanVal : existing.international;

      const target = waitersClosings.find((x) => x.id === closingId);
      if (target && onUpdateWaiterClosing) {
        const dishShare = target.dishShareWaiterUsd ?? 0;
        const tip = target.commissionWaiterUsd ?? 0;
        // Preserva el signo real de la diferencia
        const netCash = Math.round((target.totalCollectedUsd - nextPm - nextIntl - dishShare - tip) * 100) / 100;
        onUpdateWaiterClosing({
          ...target,
          pagoMovilDeductedUsd: nextPm,
          internationalDeductedUsd: nextIntl,
          digitalReportedUsd: nextPm + nextIntl,
          cashToDeliverUsd: netCash,
        });
      }

      return {
        ...prev,
        [closingId]: {
          ...existing,
          pagoMovil: nextPm,
          international: nextIntl,
        },
      };
    });
  };

  const handleToggleDishes = (closingId: string) => {
    setWaiterDeductions((prev) => {
      const existing = prev[closingId] || { pagoMovil: 0, international: 0, showDishes: false };
      return {
        ...prev,
        [closingId]: {
          ...existing,
          showDishes: !existing.showDishes,
        },
      };
    });
  };

  // Editable bank form state
  const [pagoPhone, setPagoPhone] = useState(bankConfig.pagoMovilPhone);
  const [pagoRif, setPagoRif] = useState(bankConfig.pagoMovilRif);
  const [pagoBank, setPagoBank] = useState(bankConfig.pagoMovilBank);
  const [zelleEmail, setZelleEmail] = useState(bankConfig.zelleEmail);
  const [bankSavedNotice, setBankSavedNotice] = useState(false);

  const handleRateUpdate = () => {
    const val = parseFloat(rateInput);
    if (!isNaN(val) && val > 0) {
      onUpdateBcvRate(val);
      soundService.playCashChime();
      setRateNotice(`Tasa del día actualizada a ${val.toFixed(2)} Bs/$ y propagada a toda la playa.`);
      setTimeout(() => setRateNotice(null), 4000);
    }
  };

  const handleQuickRateDelta = (delta: number) => {
    const next = Math.max(1, Math.round((bcvRate + delta) * 100) / 100);
    setRateInput(next.toString());
    onUpdateBcvRate(next);
    soundService.playCashChime();
    setRateNotice(`Tasa del día ajustada a ${next.toFixed(2)} Bs/$`);
    setTimeout(() => setRateNotice(null), 3500);
  };

  const handleShareWhatsAppClosure = () => {
    soundService.playCashChime();
    const text =
      `📊 *RESUMEN DE OPERACIÓN & CIERRE - BAHÍA BUCHE*\n` +
      `📅 Fecha: ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n` +
      `💵 Tasa del día: ${bcvRate.toFixed(2)} Bs/$\n\n` +
      `💰 *Total Recaudado:* $${totalGlobalGross.toFixed(2)} (${formatBsDirect(totalGlobalGross * bcvRate)})\n` +
      `💵 Efectivo Físico en Caja: $${totalPhysicalCash.toFixed(2)}\n` +
      `📱 Pagos Digitales: $${totalDigitalVerified.toFixed(2)}\n` +
      `🤝 Propinas Mesoneros: $${totalTips.toFixed(2)}\n\n` +
      `🏖️ *Estado:* Operación marina activa y sincronizada vía Satélite Starlink.`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setActionNotice('¡Resumen de Cierre copiado al portapapeles para WhatsApp!');
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleSaveBankConfig = () => {
    onUpdateBankConfig({
      ...bankConfig,
      pagoMovilPhone: pagoPhone,
      pagoMovilRif: pagoRif,
      pagoMovilBank: pagoBank,
      zelleEmail,
    });
    setBankSavedNotice(true);
    setTimeout(() => setBankSavedNotice(false), 3000);
  };

  // Bill drawer calculation
  const totalPhysicalCash =
    drawerBills.d100 * 100 +
    drawerBills.d50 * 50 +
    drawerBills.d20 * 20 +
    drawerBills.d10 * 10 +
    drawerBills.d5 * 5 +
    drawerBills.d1 * 1;

  // Dynamic aggregation of waiters closings from orders & staffUsers
  const effectiveWaitersClosings = React.useMemo(() => {
    const waiterStaff = (staffUsers || []).filter((u) => u.role === 'waiter' && (u.status as string) !== 'rejected' && u.status !== 'suspended');
    const waiterMap = new Map<string, WaiterClosingSummary>();

    // Seed from waitersClosings prop
    (waitersClosings || []).forEach((wc) => {
      waiterMap.set(wc.waiterId || wc.id, {
        ...wc,
        dishesBreakdown: wc.dishesBreakdown || [],
        comandas: wc.comandas || []
      });
    });

    // Ensure all active waiter staff users exist
    waiterStaff.forEach((ws, idx) => {
      const id = ws.id || `waiter-${idx}`;
      if (!waiterMap.has(id)) {
        const initials = ws.name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'M';
        waiterMap.set(id, {
          id: `close-${id}`,
          waiterId: id,
          waiterName: ws.name,
          waiterZone: ws.zone || 'Playa Buche • Toldos',
          waiterRoleNumber: `M-${String(idx + 1).padStart(2, '0')}`,
          avatarInitials: initials,
          toldosAttendedCount: 0,
          ordersClosedCount: 0,
          totalCollectedUsd: 0,
          digitalReportedUsd: 0,
          commissionWaiterUsd: 0,
          cashToDeliverUsd: 0,
          status: 'pending',
          comandas: [],
        });
      }
    });

    // If still empty or additional waiters exist in orders
    (orders || []).forEach((o) => {
      const wId = o.waiterId || (o.waiterName ? `waiter-${String(o.waiterName).toLowerCase().replace(/\s+/g, '-')}` : null);
      if (wId && !waiterMap.has(wId)) {
        const wName = o.waiterName || 'Mesonero';
        const initials = String(wName).split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'M';
        waiterMap.set(wId, {
          id: `close-${wId}`,
          waiterId: wId,
          waiterName: wName,
          waiterZone: 'Playa Buche • Toldos',
          waiterRoleNumber: 'M-01',
          avatarInitials: initials,
          toldosAttendedCount: 0,
          ordersClosedCount: 0,
          totalCollectedUsd: 0,
          digitalReportedUsd: 0,
          commissionWaiterUsd: 0,
          cashToDeliverUsd: 0,
          status: 'pending',
          comandas: [],
        });
      }
    });

    // Recalculate live order totals for each closing
    const result: WaiterClosingSummary[] = [];
    waiterMap.forEach((wc) => {
      if (wc.status === 'settled') {
        result.push({
          ...wc,
          dishesBreakdown: wc.dishesBreakdown || [],
          comandas: wc.comandas || []
        });
        return;
      }

      const waiterOrders = (orders || []).filter((o) =>
        o && o.origin !== 'excursion' && (
          o.waiterId === wc.waiterId ||
          (o.waiterName && o.waiterName.toLowerCase() === wc.waiterName.toLowerCase())
        )
      );

      // Comandas cobradas: verificadas o cobradas en efectivo por mesonero, excluyendo órdenes canceladas
      const closedOrders = waiterOrders.filter((o) => {
        if (wc.orderIds && wc.orderIds.length > 0) {
          return wc.orderIds.includes(o.id);
        }
        const isPaid = o.paymentStatus === 'verified' || o.paymentStatus === 'cash_waiter';
        return isPaid && !o.isSettled && o.status !== 'cancelled';
      });

      const spotsSet = new Set(waiterOrders.map((o) => o.spotName || o.spotId).filter(Boolean));

      const totalGross = closedOrders.reduce((sum, o) => sum + (o.totalUsd || 0), 0);

      // Desglose riguroso por método de pago incluyendo pagos mixtos (mixed_split)
      let cashSum = 0;
      let digitalSum = 0;
      let cashUsdSum = 0;
      let cashBsSum = 0;
      let pagoMovilSum = 0;
      let zelleSum = 0;
      let cardPosSum = 0;
      let mixedSum = 0;

      closedOrders.forEach((o) => {
        const amt = o.totalUsd || 0;
        if (o.paymentMethod === 'cash_usd') {
          cashSum += amt;
          cashUsdSum += amt;
        } else if (o.paymentMethod === 'cash_bs') {
          cashSum += amt;
          cashBsSum += amt;
        } else if (o.paymentMethod === 'pago_movil') {
          digitalSum += amt;
          pagoMovilSum += amt;
        } else if (o.paymentMethod === 'zelle') {
          digitalSum += amt;
          zelleSum += amt;
        } else if (o.paymentMethod === 'card_pos' || o.paymentMethod === 'pos_card') {
          digitalSum += amt;
          cardPosSum += amt;
        } else if (o.paymentMethod === 'mixed_split') {
          mixedSum += amt;
          if (o.mixedPaymentBreakdown) {
            cashSum += o.mixedPaymentBreakdown.cashUsd || 0;
            cashUsdSum += o.mixedPaymentBreakdown.cashUsd || 0;
            digitalSum += o.mixedPaymentBreakdown.pagoMovilUsd || 0;
            pagoMovilSum += o.mixedPaymentBreakdown.pagoMovilUsd || 0;
          } else if (o.paymentDetails?.receivedAmount !== undefined) {
            const cashPart = o.paymentDetails.receivedAmount;
            const digitalPart = Math.max(0, amt - cashPart);
            cashSum += cashPart;
            cashUsdSum += cashPart;
            digitalSum += digitalPart;
            pagoMovilSum += digitalPart;
          } else {
            cashSum += amt / 2;
            cashUsdSum += amt / 2;
            digitalSum += amt / 2;
            pagoMovilSum += amt / 2;
          }
        }
      });

      const tipSum = closedOrders.reduce(
        (sum, o) => sum + (o.tipUsd || ((o.totalUsd || 0) * (o.tipPercent || 0)) / 100),
        0
      );

      // Comprobación de comandas del mesonero y sus platos
      const dishesMap = new Map<string, { quantity: number; sharePerUnit: number }>();
      closedOrders.forEach((o) => {
        (o.items || []).forEach((item) => {
          const share = item.waiterShareUsd || 0;
          if (share > 0) {
            const existing = dishesMap.get(item.name) || { quantity: 0, sharePerUnit: share };
            dishesMap.set(item.name, {
              quantity: existing.quantity + (item.quantity || 1),
              sharePerUnit: share,
            });
          }
        });
      });

      const dishesBreakdown = Array.from(dishesMap.entries()).map(([name, data]) => ({
        name,
        quantity: data.quantity,
        sharePerUnit: data.sharePerUnit,
        totalShare: data.quantity * data.sharePerUnit,
      }));
      const totalDishShare = dishesBreakdown.reduce((sum, d) => sum + d.totalShare, 0);

      const comandas: WaiterComandaItem[] = closedOrders.map((o) => ({
        id: o.id,
        toldo: o.spotName || 'Toldo',
        description: (o.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ') || 'Consumo',
        method: o.paymentMethod
          ? o.paymentMethod === 'cash_usd'
            ? 'Efectivo $'
            : o.paymentMethod === 'cash_bs'
            ? 'Efectivo Bs'
            : o.paymentMethod === 'pago_movil'
            ? 'Pago Móvil'
            : o.paymentMethod === 'zelle'
            ? 'Zelle'
            : o.paymentMethod === 'mixed_split'
            ? 'Pago Mixto'
            : 'Punto POS'
          : o.paymentStatus === 'verified'
          ? 'Pagado'
          : 'Por Cobrar',
        amountUsd: o.totalUsd,
        isCash: o.paymentMethod === 'cash_usd' || o.paymentMethod === 'cash_bs' || o.paymentMethod === 'mixed_split',
      }));

      // Efectivo real a entregar: Dinero recibido en efectivo menos deducciones de platos y comisión/propina
      // PRESERVA DIFERENCIAS REALES (sin Math.max(0, ...)) para reflejar faltantes o saldo a favor
      const finalGross = closedOrders.length > 0 ? totalGross : wc.totalCollectedUsd;
      const finalDigital = closedOrders.length > 0 ? digitalSum : wc.digitalReportedUsd;
      const finalTip = closedOrders.length > 0 ? tipSum : wc.commissionWaiterUsd;
      const finalDishShare = totalDishShare > 0 ? totalDishShare : (wc.dishShareWaiterUsd || 0);
      const computedCashToDeliver = Math.round(
        ((closedOrders.length > 0 ? cashSum : (finalGross - finalDigital)) - finalDishShare - finalTip) * 100
      ) / 100;

      result.push({
        ...wc,
        toldosAttendedCount: Math.max(wc.toldosAttendedCount, spotsSet.size),
        ordersClosedCount: closedOrders.length > 0 ? closedOrders.length : wc.ordersClosedCount,
        totalCollectedUsd: finalGross,
        digitalReportedUsd: finalDigital,
        commissionWaiterUsd: finalTip,
        dishShareWaiterUsd: finalDishShare,
        dishesBreakdown: dishesBreakdown.length > 0 ? dishesBreakdown : (wc.dishesBreakdown || []),
        cashToDeliverUsd: computedCashToDeliver,
        comandas: comandas.length > 0 ? comandas : (wc.comandas || []),
        orderIds: closedOrders.map((o) => o.id),
        salesByMethod: {
          cashUsd: cashUsdSum,
          cashBs: cashBsSum,
          pagoMovilUsd: pagoMovilSum,
          zelleUsd: zelleSum,
          cardPosUsd: cardPosSum,
          mixedUsd: mixedSum,
        },
        expectedCashUsd: cashSum,
        cashDifferenceUsd: computedCashToDeliver,
      });
    });

    return result;
  }, [waitersClosings, staffUsers, orders]);

  // Cuentas por cobrar directamente a clientes que pidieron desde la app (QR comensal)
  const clientPendingOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.origin === 'client_qr' &&
        o.paymentStatus !== 'verified' &&
        o.status !== 'cancelled'
    );
  }, [orders]);

  const totalClientPendingUsd = useMemo(() => {
    return clientPendingOrders.reduce((sum, o) => sum + (o.totalUsd || 0), 0);
  }, [clientPendingOrders]);

  // Cuentas por cobrar de excursiones y lanchas turísticas
  const excursionPendingOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.origin === 'excursion' &&
        o.paymentStatus !== 'verified' &&
        o.status !== 'cancelled'
    );
  }, [orders]);

  const totalExcursionPendingUsd = useMemo(() => {
    return excursionPendingOrders.reduce((sum, o) => sum + (o.totalUsd || 0), 0);
  }, [excursionPendingOrders]);

  const totalCollectedPending = effectiveWaitersClosings.reduce(
    (acc, w) => acc + (w.status === 'pending' ? w.cashToDeliverUsd : 0),
    0
  );

  const totalGlobalGross = useMemo(() => {
    const fromOrders = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.totalUsd || 0), 0);
    const fromWaiters = effectiveWaitersClosings.reduce((acc, w) => acc + w.totalCollectedUsd, 0);
    return Math.max(fromOrders, fromWaiters);
  }, [orders, effectiveWaitersClosings]);

  const paidOrders = orders.filter((order) => order.paymentStatus === 'verified' || order.isSettled);
  const totalVerified = paidOrders.reduce((acc, order) => acc + (order.totalUsd || 0), 0);
  const averageTicket = paidOrders.length ? totalVerified / paidOrders.length : 0;
  const dispatchedCount = orders.filter((order) =>
    ['ready_pass', 'delivered'].includes(order.status)
  ).length;

  // Filtrado de métricas ejecutivas por período (Diario, Semanal, Mensual)
  const periodFilteredOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return orders.filter((o) => {
      if (!o.createdAt) return true;
      const orderDate = new Date(o.createdAt);
      if (isNaN(orderDate.getTime())) return true;
      if (financialPeriod === 'daily') {
        return orderDate.toISOString().slice(0, 10) === todayStr;
      }
      if (financialPeriod === 'weekly') {
        return orderDate >= sevenDaysAgo;
      }
      if (financialPeriod === 'monthly') {
        return orderDate >= thirtyDaysAgo;
      }
      return true;
    });
  }, [orders, financialPeriod]);

  const periodPaidOrders = useMemo(() => {
    return periodFilteredOrders.filter((o) => o.paymentStatus === 'verified' || o.isSettled);
  }, [periodFilteredOrders]);

  const periodGrossTotal = useMemo(() => {
    return periodFilteredOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.totalUsd || 0), 0);
  }, [periodFilteredOrders]);

  const periodVerifiedTotal = useMemo(() => {
    return periodPaidOrders.reduce((sum, o) => sum + (o.totalUsd || 0), 0);
  }, [periodPaidOrders]);

  const periodAverageTicket = useMemo(() => {
    return periodPaidOrders.length ? periodVerifiedTotal / periodPaidOrders.length : 0;
  }, [periodPaidOrders, periodVerifiedTotal]);

  const periodDispatchedCount = useMemo(() => {
    return periodFilteredOrders.filter((o) => ['ready_pass', 'delivered'].includes(o.status)).length;
  }, [periodFilteredOrders]);

  // Ingresos reales por canal calculados de las órdenes
  const excursionChannelTotal = useMemo(() => {
    return periodPaidOrders
      .filter((o) => o.origin === 'excursion')
      .reduce((sum, o) => sum + (o.totalUsd || 0), 0);
  }, [periodPaidOrders]);

  const clientQrChannelTotal = useMemo(() => {
    return periodPaidOrders
      .filter((o) => o.origin === 'client_qr')
      .reduce((sum, o) => sum + (o.totalUsd || 0), 0);
  }, [periodPaidOrders]);

  const waiterPosChannelTotal = useMemo(() => {
    return periodPaidOrders
      .filter((o) => o.origin === 'waiter_pos' || (!o.origin && (o.waiterName || o.waiterId)))
      .reduce((sum, o) => sum + (o.totalUsd || 0), 0);
  }, [periodPaidOrders]);

  const totalChannelsSum = excursionChannelTotal + clientQrChannelTotal + waiterPosChannelTotal;
  const excPct = totalChannelsSum > 0 ? Math.round((excursionChannelTotal / totalChannelsSum) * 100) : 0;
  const qrPct = totalChannelsSum > 0 ? Math.round((clientQrChannelTotal / totalChannelsSum) * 100) : 0;
  const waiterPct = totalChannelsSum > 0 ? 100 - excPct - qrPct : 0;

  const totalWasteUsd = wasteReports.reduce((acc, report) => acc + (report.costUsd || 0), 0);
  const totalWasteBs = wasteReports.reduce((acc, report) => acc + (report.costBs || 0), 0);
  const [auditEntries, setAuditEntries] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);

  useEffect(() => {
    if (!adminStateHydrated || !apiBase) return;
    fetch(apiBase + '/api/state', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.state?.auditLogs)) setAuditEntries(data.state.auditLogs);
      })
      .catch(() => undefined);
  }, [adminStateHydrated, apiBase, authHeaders]);
  const totalDigitalVerified = effectiveWaitersClosings.reduce((acc, w) => acc + w.digitalReportedUsd, 0);
  const totalTips = effectiveWaitersClosings.reduce((acc, w) => acc + w.commissionWaiterUsd, 0);
  const diffCash = totalPhysicalCash - totalCollectedPending;

  const handleBillDelta = (denom: keyof BillDenominationCount, delta: number) => {
    onUpdateDrawerBills({
      ...drawerBills,
      [denom]: Math.max(0, drawerBills[denom] + delta),
    });
  };

  const handleSettleSingleWaiter = async (closing: WaiterClosingSummary) => {
    const ded = getClosingDeduction(closing);
    const hash = await generatePazYSalvoHash({
      receiptNumber: closing.pazYSalvoNumber || '#PYS-' + Math.floor(1000 + Math.random() * 9000),
      waiterName: closing.waiterName,
      amountUsd: ded.netCash,
      dateStr: new Date().toLocaleTimeString(),
      ownerName: 'Socio Administrador',
    });

    const settled: WaiterClosingSummary = {
      ...closing,
      pagoMovilDeductedUsd: ded.pagoMovil,
      internationalDeductedUsd: ded.international,
      digitalReportedUsd: ded.pagoMovil + ded.international,
      dishShareWaiterUsd: ded.dishShare,
      commissionWaiterUsd: ded.tip,
      cashToDeliverUsd: ded.netCash,
      status: 'settled',
      settledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' hrs',
      settledByOwner: 'Socio Admin (Caja Central)',
      pazYSalvoHash: hash,
      pazYSalvoNumber: closing.pazYSalvoNumber || '#PYS-' + Math.floor(1000 + Math.random() * 9000),
    };

    soundService.playCashChime();
    onSettleWaiter(settled);
    onOpenPazYSalvo(settled);
  };

  const handleGenerateActaZ = async () => {
    soundService.playCashChime();
    setShowActaZSuccess(true);
    // Liquidar y consolidar a todos los mesoneros activos
    for (const w of effectiveWaitersClosings) {
      if (w.status !== 'settled') {
        const hash = await generatePazYSalvoHash({
          receiptNumber: w.pazYSalvoNumber || '#PYS-' + Math.floor(1000 + Math.random() * 9000),
          waiterName: w.waiterName,
          amountUsd: w.cashToDeliverUsd,
          dateStr: new Date().toISOString(),
          ownerName: 'Socio Admin (Cierre Diario)',
        });
        onSettleWaiter({
          ...w,
          status: 'settled',
          pazYSalvoHash: hash,
          pazYSalvoNumber: w.pazYSalvoNumber || '#PYS-' + Math.floor(1000 + Math.random() * 9000),
          settledAt: new Date().toISOString(),
          settledByOwner: 'Socio Admin (Cierre Diario)',
        });
      }
    }

    try {
      hardwareDriversService.printTestVoucher('actaZ');
    } catch {}

    setActionNotice('¡Cierre diario finalizado con éxito! Acta Z generada y cuentas consolidadas.');
    setTimeout(() => {
      setShowActaZSuccess(false);
      setActionNotice(null);
    }, 6000);
  };

  const filteredClosings = effectiveWaitersClosings.filter((w) => {
    if (closingsFilter === 'pending') return w.status === 'pending';
    if (closingsFilter === 'settled') return w.status === 'settled';
    return true;
  });

  // Calculate live kitchen orders & alerts for the Owner
  const now = new Date();
  const activeKitchenOrders = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  );
  const urgentOrders = activeKitchenOrders.filter((o) => {
    if (o.status === 'ready_pass') return false;
    const t = getOrderDeliveryTiming(o, now);
    return t.minutesRemaining <= 10 && t.minutesRemaining > 0;
  });
  const alert30Orders = activeKitchenOrders.filter((o) => {
    if (o.status === 'ready_pass') return false;
    const t = getOrderDeliveryTiming(o, now);
    return t.minutesRemaining <= 30 && t.minutesRemaining > 10;
  });

  const topKitchenAlert =
    urgentOrders.length > 0
      ? {
          isUrgent: true,
          title: `🚨 Alerta Pase Inminente (≤10 min): Comanda ${urgentOrders[0].displayNumber} (${urgentOrders[0].spotName})`,
          subtitle: `Quedan solo ${getOrderDeliveryTiming(urgentOrders[0], now).minutesRemaining} min para la hora de entrega fijada`,
        }
      : alert30Orders.length > 0
      ? {
          isUrgent: false,
          title: `⏰ Alerta Cocina (≤30 min): Montar plato Comanda ${alert30Orders[0].displayNumber} (${alert30Orders[0].spotName})`,
          subtitle: `Faltan ${getOrderDeliveryTiming(alert30Orders[0], now).minutesRemaining} min para entrega programada`,
        }
      : null;

  return (
    <div className="flex flex-col gap-4 max-w-lg mx-auto pb-28 pt-2 px-3">
      {/* Estado real de la operación: conexión y tasa vigente */}
      <div className="bg-[#002546] text-white rounded-2xl p-3 shadow-sm flex flex-col gap-2 border border-[#0d3b66]">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-[#bbe9ff]">
            <span className={`w-2 h-2 rounded-full ${isReachable ? 'animate-pulse' : ''}`} style={{ backgroundColor: isReachable ? '#57d1fd' : '#f87171' }} />
            <span>
              {isReachable ? 'API de producción conectada' : 'API sin respuesta'}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-[#0d3b66] px-2.5 py-0.5 rounded-full text-[#bbe9ff]">
            <span className="font-bold text-[10px]">Tasa del día:</span>
            <span className="text-white font-mono font-bold text-xs">{bcvRate.toFixed(2)} Bs/$</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[#81a6d7] text-[10px] pt-1.5 border-t border-white/10">
          <div className="flex items-center gap-1">
            <Anchor className="w-3.5 h-3.5 text-[#57d1fd]" />
            <span>{orders.length} órdenes cargadas del servidor</span>
          </div>
          <div className="flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-[#57d1fd]" />
            <span>Actualizado {new Date().toLocaleTimeString('es-VE')}</span>
          </div>
        </div>
      </div>

      {/* Feed en Vivo de Comandas Recibidas (Visible en Cualquier Pestaña para el Dueño) */}
      {activeKitchenOrders.length > 0 && (
        <div className="bg-white rounded-2xl p-3 border-2 border-orange-400 shadow-md flex flex-col gap-2.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
              </span>
              <span className="text-xs font-black text-[#002546] uppercase tracking-wide">
                🔥 {activeKitchenOrders.length} {activeKitchenOrders.length === 1 ? 'Comanda Activa' : 'Comandas Activas'} en Vivo
              </span>
            </div>
            <button
              onClick={() => {
                setAdminTab('order_sync');
                setKdsSubView('monitor');
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-[#002546] text-white hover:bg-[#00386b] transition-colors cursor-pointer"
            >
              Abrir Monitor KDS →
            </button>
          </div>

          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
            {activeKitchenOrders.slice(0, 5).map((ord) => {
              const isQr = ord.origin === 'client_qr';
              const isReady = ord.status === 'ready_pass';
              return (
                <div
                  key={ord.id}
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
                    isReady
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : isQr
                      ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                      : 'bg-amber-50/70 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-black text-xs text-[#002546]">
                        {ord.displayNumber}
                      </span>
                      <span className="font-bold text-[11px] text-[#006782]">
                        {ord.spotName}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase bg-white/80 border">
                        {isQr ? '📱 QR Cliente' : ord.origin === 'excursion' ? '⚓ Excursión' : '🧑‍🍳 Mesonero'}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                        isReady ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white'
                      }`}>
                        {isReady ? 'Listo para servir' : 'En cocina'}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-600 truncate mt-0.5">
                      {ord.customerName} • {(ord.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <div className="text-right">
                      <div className="font-mono font-bold text-xs text-[#002546]">
                        ${ord.totalUsd.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-gray-500 font-mono">
                        {(ord.totalUsd * bcvRate).toFixed(0)} Bs
                      </div>
                    </div>
                    {onUpdateOrderStatus && !isReady && (
                      <button
                        onClick={() => {
                          onUpdateOrderStatus(ord.id, 'ready_pass');
                          soundService.playReadyPassAlert();
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer"
                        title="Marcar como lista para servir"
                      >
                        ✓ Listo
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Global Kitchen Urgent Alert Banner for the Owner (Visible across all tabs) */}
      {topKitchenAlert && (
        <div
          className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 text-xs shadow-sm transition-all animate-bounce-subtle ${
            topKitchenAlert.isUrgent
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                topKitchenAlert.isUrgent ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-500 text-white'
              }`}
            >
              {topKitchenAlert.isUrgent ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            </div>
            <div className="truncate">
              <span className="font-extrabold block truncate">
                {topKitchenAlert.title}
              </span>
              <span className="text-[11px] opacity-85 truncate block">
                {topKitchenAlert.subtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                if (topKitchenAlert.isUrgent) soundService.playUrgent10MinAlert();
                else soundService.playMountPlate30MinAlert();
              }}
              title="Reproducir sonido de alerta"
              className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-gray-700 shadow-2xs"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setAdminTab('order_sync');
                setKdsSubView('monitor');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs transition-colors ${
                topKitchenAlert.isUrgent
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-amber-600 text-white hover:bg-amber-700'
              }`}
            >
              Ver KDS
            </button>
          </div>
        </div>
      )}

      {/* Top Toggle Navigation Bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none bg-[#eff4ff] p-1.5 rounded-2xl border border-[#d2e4ff]">
        <button
          onClick={() => {
            setAdminTab('order_sync');
            setKdsSubView('monitor');
          }}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
            adminTab === 'order_sync'
              ? 'bg-[#002546] text-white shadow-xs ring-2 ring-orange-400'
              : 'text-[#42474f] hover:text-[#002546] hover:bg-white/60 bg-orange-100/60'
          }`}
        >
          <Flame
            className={`w-3.5 h-3.5 shrink-0 ${
              activeKitchenOrders.length > 0 ? 'text-orange-500 animate-pulse' : 'text-[#57d1fd]'
            }`}
          />
          <span>Comandas KDS</span>
          {activeKitchenOrders.length > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
                urgentOrders.length > 0
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-orange-500 text-white'
              }`}
            >
              {activeKitchenOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('giveaway')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
            adminTab === 'giveaway'
              ? 'bg-[#002546] text-white shadow-xs ring-1 ring-amber-400'
              : 'text-[#42474f] hover:text-[#002546] hover:bg-white/60'
          }`}
        >
          <span className="text-amber-400">🎁</span>
          <span>Sorteo VIP (200)</span>
          {giveaway.participants.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-amber-400 text-[#002546]">
              {giveaway.participants.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('closings')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
            adminTab === 'closings'
              ? 'bg-[#002546] text-white shadow-xs'
              : 'text-[#42474f] hover:text-[#002546] hover:bg-white/60'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#57d1fd] shrink-0" />
          <span>Cierres</span>
        </button>
        <button
          onClick={() => setAdminTab('staff_access')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
            adminTab === 'staff_access'
              ? 'bg-[#002546] text-white shadow-xs ring-1 ring-[#57d1fd]'
              : 'text-[#42474f] hover:text-[#002546] hover:bg-white/60'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-[#57d1fd] shrink-0" />
          <span>Personal & Accesos</span>
        </button>
        <button
          onClick={() => setAdminTab('menu')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
            adminTab === 'menu'
              ? 'bg-[#002546] text-white shadow-xs ring-1 ring-[#57d1fd]'
              : 'text-[#42474f] hover:text-[#002546] hover:bg-white/60'
          }`}
        >
          <Utensils className="w-3.5 h-3.5 text-[#57d1fd] shrink-0" />
          <span>Menú & Carta</span>
        </button>
        <button
          onClick={() => setAdminTab('fiscal_audit')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
            adminTab === 'fiscal_audit'
              ? 'bg-[#002546] text-white shadow-xs ring-1 ring-[#57d1fd]'
              : 'text-[#42474f] hover:text-[#002546] hover:bg-white/60'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-[#57d1fd] shrink-0" />
          <span>Arqueo Fiscal</span>
        </button>
        <button
          onClick={() => setAdminTab('contingency')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
            adminTab === 'contingency'
              ? 'bg-[#002546] text-white shadow-xs ring-1 ring-[#57d1fd]'
              : 'text-[#42474f] hover:text-[#002546] hover:bg-white/60'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-[#57d1fd] shrink-0" />
          <span>Contingencia Mesh</span>
        </button>
        <button
          onClick={() => setAdminTab('logistics')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
            adminTab === 'logistics'
              ? 'bg-[#002546] text-white shadow-xs'
              : 'text-[#42474f] hover:text-[#002546] hover:bg-white/60'
          }`}
        >
          <Ship className="w-3.5 h-3.5 text-[#57d1fd] shrink-0" />
          <span>Lanchas</span>
        </button>
        <button
          onClick={() => setAdminTab('rbac')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
            adminTab === 'rbac'
              ? 'bg-[#002546] text-white shadow-xs ring-1 ring-[#57d1fd]'
              : 'text-[#42474f] hover:text-[#002546] hover:bg-white/60'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-[#57d1fd] shrink-0" />
          <span>RBAC</span>
        </button>
        <button
          onClick={() => setAdminTab('dashboard')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
            adminTab === 'dashboard'
              ? 'bg-[#002546] text-white shadow-xs'
              : 'text-[#42474f] hover:text-[#002546] hover:bg-white/60'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-[#57d1fd] shrink-0" />
          <span>Finanzas</span>
        </button>
        {onOpenToldoQrModal && (
          <button
            onClick={onOpenToldoQrModal}
            className="py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all bg-amber-500/20 text-amber-900 border border-amber-500/40 hover:bg-amber-500/30"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>QRs Toldos ({spots.length})</span>
          </button>
        )}
      </div>

      {adminTab === 'staff_access' ? (
        <OwnerStaffManager
          users={staffUsers}
          apiBase={apiBase}
          authHeaders={authHeaders}
          onUsersChanged={onUsersChanged}
          currentUserId={currentUserId}
        />
      ) : adminTab === 'closings' ? (
        /* ========== VIEW 1: CIERRE DE CAJA Y LIQUIDACIÓN DIARIA ========== */
        <div className="space-y-4">
          {/* Header Title */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#006782]">
                MÓDULO SOCIOS • AUDITORÍA
              </span>
              <span className="text-xs font-bold bg-[#dce9ff] text-[#002546] px-2.5 py-0.5 rounded-full">
                Tasa del día: {bcvRate.toFixed(2)} Bs/$
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#002546] mt-0.5">
              Cierre de Caja y Liquidación
            </h1>
            <p className="text-xs text-gray-500">
              Rendición de cuentas por mesonero • Turno Playa Buche & Churuatas
            </p>
            <div className="text-[11px] text-[#006782] font-semibold mt-0.5">
              Corte en vivo: Hoy • Turno Tarde/Ocaso
            </div>
          </div>

          {/* Venta Global Bruta Registrada Card */}
          <div className="bg-gradient-to-br from-[#002546] via-[#0d3b66] to-[#002546] text-white rounded-2xl p-4 shadow-md space-y-3.5 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#a4c9fc] font-bold">
                  VENTA GLOBAL BRUTA REGISTRADA
                </span>
                <div className="text-3xl font-black mt-0.5">
                  {formatUsd(totalGlobalGross)}
                </div>
                <span className="text-xs text-sky-200">
                  ≈ {formatBsDirect(totalGlobalGross * bcvRate)}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#57d1fd]">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
              <div className="bg-white/10 rounded-xl p-2.5">
                <span className="text-[10px] text-sky-300 font-bold uppercase block">
                  Efectivo ($) en Mano
                </span>
                <span className="text-base font-extrabold">{formatUsd(totalCollectedPending)}</span>
                <span className="text-[10px] text-gray-300 block">Por recibir de mesoneros</span>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5">
                <span className="text-[10px] text-sky-300 font-bold uppercase block">
                  Digital Verificado
                </span>
                <span className="text-base font-extrabold">{formatUsd(totalDigitalVerified)}</span>
                <span className="text-[10px] text-gray-300 block">PagoMóvil + Zelle bancos</span>
              </div>
            </div>

            <div className="bg-[#57d1fd]/15 border border-[#57d1fd]/30 rounded-xl p-2.5 flex justify-between items-center text-xs">
              <span className="text-sky-200 font-medium">
                Propinas Acumuladas Personal:
              </span>
              <span className="text-sm font-extrabold text-[#57d1fd]">
                {formatUsd(totalTips)}
              </span>
            </div>
          </div>

          {/* Cuentas por Cobrar a Clientes (Pedidos Directos desde la App / QR) */}
          <div className="bg-white rounded-2xl border border-sky-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📱</span>
                <div>
                  <h3 className="text-xs font-bold text-[#002546] uppercase tracking-wider">
                    Cuentas por Cobrar • Clientes Directos (App / QR)
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    {clientPendingOrders.length} pedido(s) pendientes de cobro sin pasar por caja
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold text-[#006782] block">
                  {formatUsd(totalClientPendingUsd)}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  ≈ {formatBsDirect(totalClientPendingUsd * bcvRate)}
                </span>
              </div>
            </div>

            {clientPendingOrders.length === 0 ? (
              <p className="text-xs text-gray-400 italic bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                ✅ No hay pedidos de clientes directos pendientes de cobro en este momento.
              </p>
            ) : (
              <div className="space-y-2">
                {clientPendingOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3 rounded-xl bg-sky-50/50 border border-sky-100 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-[#002546] text-[#57d1fd] font-bold text-xs flex items-center justify-center shrink-0">
                        {ord.displayNumber}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[#002546] truncate">{ord.spotName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                            {ord.customerName || 'Cliente QR'}
                          </span>
                          {ord.paymentStatus === 'pending_verification' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                              🟡 Pago Reportado: {ord.paymentMethod?.toUpperCase()} {ord.paymentReference ? `(#${ord.paymentReference})` : ''}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-500 truncate block mt-0.5">
                          {(ord.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="font-extrabold text-[#002546] text-xs font-mono block">
                          {formatUsd(ord.totalUsd)}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {formatBsDirect(ord.totalBs || ord.totalUsd * bcvRate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {onOpenPagoMovil && (
                          <button
                            type="button"
                            onClick={() => onOpenPagoMovil(ord)}
                            className="px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#002546] font-bold text-[11px] transition-colors"
                            title="Revisar detalles de pago o captura"
                          >
                            Detalles
                          </button>
                        )}
                        {onUpdateOrder && (
                          <button
                            type="button"
                            onClick={() => {
                              soundService.playCashChime();
                              onUpdateOrder({
                                ...ord,
                                paymentStatus: 'verified',
                                isSettled: true,
                                status: ord.status === 'delivered' ? 'delivered' : ord.status,
                              });
                              setActionNotice(`Cuenta #${ord.displayNumber} (${ord.spotName}) verificada y cerrada.`);
                              setTimeout(() => setActionNotice(null), 3500);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verificar & Cerrar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cuentas por Cobrar & Liquidación • Excursiones y Paquetes de Lanchas */}
          <div className="bg-white rounded-2xl border border-sky-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚓</span>
                <div>
                  <h3 className="text-xs font-bold text-[#002546] uppercase tracking-wider">
                    Cuentas por Cobrar • Excursiones y Lanchas
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    {excursionPendingOrders.length} comanda(s) turísticas pendientes de liquidación
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold text-[#006782] block">
                  {formatUsd(totalExcursionPendingUsd)}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  ≈ {formatBsDirect(totalExcursionPendingUsd * bcvRate)}
                </span>
              </div>
            </div>

            {excursionPendingOrders.length === 0 ? (
              <p className="text-xs text-gray-400 italic bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                ✅ No hay cuentas de excursiones pendientes de cobro en este momento.
              </p>
            ) : (
              <div className="space-y-2">
                {excursionPendingOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3 rounded-xl bg-sky-50/50 border border-sky-100 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-[#002546] text-[#57d1fd] font-bold text-xs flex items-center justify-center shrink-0">
                        {ord.displayNumber}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[#002546] truncate">{ord.spotName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 font-bold">
                            {ord.customerName || 'Excursión'}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 truncate block mt-0.5">
                          {(ord.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="font-extrabold text-[#002546] text-xs font-mono block">
                          {formatUsd(ord.totalUsd)}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {formatBsDirect(ord.totalBs || ord.totalUsd * bcvRate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {onOpenPagoMovil && (
                          <button
                            type="button"
                            onClick={() => onOpenPagoMovil(ord)}
                            className="px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#002546] font-bold text-[11px] transition-colors"
                          >
                            Detalles
                          </button>
                        )}
                        {onUpdateOrder && (
                          <button
                            type="button"
                            onClick={() => {
                              soundService.playCashChime();
                              onUpdateOrder({
                                ...ord,
                                paymentStatus: 'verified',
                                isSettled: true,
                                status: ord.status === 'delivered' ? 'delivered' : ord.status,
                              });
                              setActionNotice(`Excursión #${ord.displayNumber} liquidada con éxito.`);
                              setTimeout(() => setActionNotice(null), 3500);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Liquidar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pestañas de Rendición / Liquidación Individual por Mesonero */}
          <div className="flex flex-col space-y-2 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] uppercase tracking-wider text-[#006782] font-bold flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Liquidación Individual por Mesonero
              </span>
              <span className="text-[11px] font-medium text-gray-500">
                {effectiveWaitersClosings.length} activos hoy
              </span>
            </div>

            {effectiveWaitersClosings.length === 0 ? (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center text-xs text-gray-500">
                ✅ No hay comandas de mesoneros activas en este momento. Cuando un mesonero registre pedidos o cobre en toldos, su arqueo y entrega de efectivo aparecerán aquí.
              </div>
            ) : (
              /* Mesonero Navigation Tabs Bar */
              <div className="flex gap-2 overflow-x-auto pb-1.5 px-0.5 no-scrollbar" id="mesonero-nav-tabs">
                {effectiveWaitersClosings.map((closing) => {
                  const isSelected = (selectedMesoneroId || effectiveWaitersClosings[0]?.id) === closing.id;
                  const isPending = closing.status === 'pending';
                  return (
                  <button
                    key={closing.id}
                    id={`tab-btn-${closing.id.replace('close-', '')}`}
                    onClick={() => setSelectedMesoneroId(closing.id)}
                    type="button"
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl flex-shrink-0 text-left transition-all ${
                      isSelected
                        ? 'bg-white ring-2 ring-[#002546] shadow-sm'
                        : 'bg-[#eff4ff] hover:bg-[#dce9ff]'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full font-bold text-[13px] flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#002546] text-white'
                          : isPending
                          ? 'bg-[#bbe9ff] text-[#001f29]'
                          : 'bg-[#d2e4ff] text-[#002546]'
                      }`}
                    >
                      {closing.avatarInitials}
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`text-[13px] font-bold leading-tight ${
                          isSelected ? 'text-[#002546]' : 'text-gray-800'
                        }`}
                      >
                        {closing.waiterName.split(' ')[0]} {closing.waiterName.split(' ')[1]?.[0] || ''}.
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-[#006782] font-medium truncate max-w-[80px]">
                          {closing.waiterZone.split('•')[0]}
                        </span>
                        <span className="text-[11px] font-extrabold font-mono text-[#002546] bg-white/80 px-1 rounded">
                          {formatUsd(closing.cashToDeliverUsd)}
                        </span>
                      </div>
                    </div>
                    {isPending ? (
                      <span className="w-2 h-2 rounded-full bg-amber-500 ml-0.5 animate-pulse" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
            )}
          </div>

          {/* ACTIVE MESONERO DETAILED LIQUIDATION CARD */}
          {(() => {
            const active =
              effectiveWaitersClosings.find((w) => w.id === selectedMesoneroId) ||
              effectiveWaitersClosings[0];
            if (!active) {
              return (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-500 text-xs">
                  No hay comandas ni mesoneros asignados para liquidar en este momento.
                </div>
              );
            }
            const ded = getClosingDeduction(active);
            const isPending = active.status === 'pending';
            const envelopeTotal = getEnvelopeTotal(active.id, ded.netCash);
            const envelopeBills = envelopeBillsState[active.id] || active.envelopeBills || {
              d100: 0,
              d50: 0,
              d20: 0,
              d10: 0,
              d5: 0,
              d1: 0,
            };
            const diffEnvelope = envelopeTotal - ded.netCash;

            return (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3.5 animate-fade-in">
                {/* Mesonero Card Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#bbe9ff] text-[#001f29] font-bold text-lg flex items-center justify-center shadow-xs">
                      {active.avatarInitials}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-base font-bold text-[#002546] leading-tight">
                          {active.waiterName}
                        </h2>
                        <span className="px-2 py-0.5 rounded bg-[#eff4ff] text-[#002546] text-[11px] font-bold">
                          {active.waiterRoleNumber}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 mt-0.5">
                        {active.waiterZone}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      isPending
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isPending ? 'bg-amber-600 animate-pulse' : 'bg-emerald-600'
                      }`}
                    />
                    {isPending ? 'Cobro Pendiente' : 'Paz y Salvo'}
                  </span>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 gap-2 bg-[#eff4ff]/70 px-3 py-2 rounded-xl text-gray-700 text-xs">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="text-[#006782] font-bold">⛱️</span>
                    <span>{active.toldosAttendedCount} Toldos atendidos</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Receipt className="w-3.5 h-3.5 text-[#006782]" />
                    <span>{active.ordersClosedCount} comandas cobradas</span>
                  </div>
                </div>

                {/* Desglose Financiero & Panel de Control de Cierre del Dueño */}
                <div className="bg-white rounded-2xl p-3.5 space-y-3 border border-[#d2e4ff]/70 shadow-xs">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">⚖️</span>
                      <span className="text-xs font-bold text-[#002546]">
                        Liquidación de Venta & Deducciones del Dueño
                      </span>
                    </div>
                    <span className="text-[10px] font-bold bg-[#eff4ff] text-[#006782] px-2.5 py-0.5 rounded-full border border-[#d2e4ff]">
                      Control Directo del Dueño
                    </span>
                  </div>

                  {/* Venta Total */}
                  <div className="flex justify-between items-center bg-gray-50/90 px-3 py-2 rounded-xl">
                    <span className="text-xs font-semibold text-gray-700">Venta Total Comandada en Playa:</span>
                    <span className="font-extrabold text-[#002546] text-sm font-mono">
                      {formatUsd(active.totalCollectedUsd)}
                    </span>
                  </div>

                  {/* SECCIÓN 1: DEDUCCIONES QUE APLICA EL DUEÑO */}
                  <div className="bg-gradient-to-br from-rose-50/80 to-orange-50/50 rounded-xl p-3 border border-rose-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-rose-950 flex items-center gap-1">
                        <span>📱</span>
                        <span>Deducciones por Transferencias (Descontadas por el Dueño):</span>
                      </span>
                      <span className="text-[10px] font-bold text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded">
                        Total: -{formatUsd(ded.pagoMovil + ded.international)}
                      </span>
                    </div>

                    {/* Pago Móvil */}
                    <div className="bg-white rounded-xl p-2.5 border border-rose-200/60 shadow-2xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>Pasado por Pago Móvil (Bs / BCV)</span>
                        </label>
                        <span className="text-[11px] text-gray-600 font-mono">
                          ≈ {(ded.pagoMovil * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-2 text-xs font-bold text-gray-400">$</span>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            disabled={!isPending}
                            value={ded.pagoMovil}
                            onChange={(e) => handleUpdateDeduction(active.id, 'pagoMovil', parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 h-8 rounded-lg border border-gray-300 text-xs font-bold text-[#002546] focus:ring-2 focus:ring-rose-400 focus:border-rose-400 disabled:bg-gray-100 font-mono"
                          />
                        </div>
                        {isPending && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateDeduction(active.id, 'pagoMovil', Math.max(0, ded.pagoMovil - 10))}
                              className="px-2 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold"
                            >
                              -$10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateDeduction(active.id, 'pagoMovil', ded.pagoMovil + 10)}
                              className="px-2 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold"
                            >
                              +$10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateDeduction(active.id, 'pagoMovil', ded.pagoMovil + 20)}
                              className="px-2 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold"
                            >
                              +$20
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Plataforma Internacional / Zelle */}
                    <div className="bg-white rounded-xl p-2.5 border border-rose-200/60 shadow-2xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span>Pagado por Plataforma Internacional (Zelle / Tarjeta)</span>
                        </label>
                        <span className="text-[11px] font-mono text-indigo-700 font-bold">
                          USD Directo
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-2 text-xs font-bold text-gray-400">$</span>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            disabled={!isPending}
                            value={ded.international}
                            onChange={(e) => handleUpdateDeduction(active.id, 'international', parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 h-8 rounded-lg border border-gray-300 text-xs font-bold text-[#002546] focus:ring-2 focus:ring-rose-400 focus:border-rose-400 disabled:bg-gray-100 font-mono"
                          />
                        </div>
                        {isPending && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateDeduction(active.id, 'international', Math.max(0, ded.international - 10))}
                              className="px-2 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold"
                            >
                              -$10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateDeduction(active.id, 'international', ded.international + 10)}
                              className="px-2 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold"
                            >
                              +$10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateDeduction(active.id, 'international', ded.international + 20)}
                              className="px-2 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold"
                            >
                              +$20
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 2: DÉBITOS AUTOMÁTICOS A FAVOR DEL MESONERO */}
                  <div className="bg-gradient-to-br from-amber-50/80 to-emerald-50/40 rounded-xl p-3 border border-amber-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
                        <span>✨</span>
                        <span>Débitos Automáticos para el Mesonero (se debitan en cuenta):</span>
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                        Total: -{formatUsd(ded.dishShare + ded.tip)}
                      </span>
                    </div>

                    {/* Débito por Platos Vendidos */}
                    <div className="bg-white rounded-xl p-2.5 border border-amber-200/60 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                            <span>🍽️</span>
                            <span>Parte de Dinero por Platos Vendidos</span>
                          </span>
                          <span className="text-[10px] text-gray-500">
                            Comisión configurada en el menú por el dueño (débito automático a favor del mesonero)
                          </span>
                        </div>
                        <span className="font-extrabold text-amber-900 text-sm font-mono">
                          -{formatUsd(ded.dishShare)}
                        </span>
                      </div>

                      {/* Botón para ver desglose de platos */}
                      {active.dishesBreakdown && active.dishesBreakdown.length > 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() => handleToggleDishes(active.id)}
                            className="text-[11px] font-bold text-amber-800 bg-amber-100/70 hover:bg-amber-200/70 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <span>{ded.showDishes ? '▲ Ocultar' : '▼ Ver'} Desglose de Platos ({(active.dishesBreakdown || []).length})</span>
                          </button>

                          {ded.showDishes && (
                            <div className="mt-2 space-y-1 bg-amber-50/80 border border-amber-200/80 rounded-xl p-2 text-xs">
                              <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1 flex justify-between">
                                <span>Plato y Cantidad Vendida</span>
                                <span>Débito Auto</span>
                              </div>
                              {(active.dishesBreakdown || []).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center py-1 border-b border-amber-200/40 last:border-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[#002546]">{item.quantity}x</span>
                                    <span className="text-gray-800">{item.name}</span>
                                    <span className="text-[10px] text-gray-500 font-mono">(${item.sharePerUnit.toFixed(2)} c/u)</span>
                                  </div>
                                  <span className="font-bold font-mono text-amber-950">
                                    +{formatUsd(item.totalShare)}
                                  </span>
                                </div>
                              ))}
                              <div className="pt-1.5 flex justify-between text-xs font-bold text-amber-950 border-t border-amber-300/60">
                                <span>Total debitado por platos:</span>
                                <span className="font-mono">{formatUsd(ded.dishShare)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Débito por Propina / Servicio */}
                    <div className="bg-white rounded-xl p-2.5 border border-amber-200/60 shadow-2xs flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                          <span>🤝</span>
                          <span>Porcentaje de Propina / Servicio (10%)</span>
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Acreditado automáticamente al mesonero
                        </span>
                      </div>
                      <span className="font-extrabold text-amber-900 text-sm font-mono">
                        -{formatUsd(ded.tip)}
                      </span>
                    </div>
                  </div>

                  {/* EFECTIVO NETO A ENTREGAR EN MANO (SOBRE) */}
                  <div className={`pt-3 pb-2.5 px-3.5 rounded-xl flex items-center justify-between shadow-sm ${
                    ded.netCash >= 0
                      ? 'bg-gradient-to-r from-[#002546] to-[#003966] text-white'
                      : 'bg-gradient-to-r from-rose-900 to-amber-900 text-white border-2 border-rose-400'
                  }`}>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-[#57d1fd] font-extrabold">
                        {ded.netCash >= 0 ? 'Efectivo Neto Físico a Entregar en Mano' : '⚠️ Saldo a Favor del Mesonero (La Caja Paga)'}
                      </span>
                      <span className="text-[11px] text-gray-300">
                        {ded.netCash >= 0 ? 'Total - PM - Zelle - Platos - Propina' : 'Ventas digitales y platos superan el efectivo físico'}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xl font-extrabold text-white bg-white/15 px-3 py-0.5 rounded-lg font-mono">
                        {ded.netCash >= 0 ? formatUsd(ded.netCash) : `-${formatUsd(Math.abs(ded.netCash))}`}
                      </span>
                      <span className="text-[11px] text-[#57d1fd] font-bold mt-0.5 font-mono">
                        ≈ {(ded.netCash * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Comandas Detalladas Individuales */}
                <div className="flex flex-col space-y-1.5 pt-1">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-xs font-bold text-[#002546] flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-[#006782]" />
                      Comandas Cobradas por {active.waiterName.split(' ')[0]} ({active.ordersClosedCount})
                    </span>
                    <span className="text-[11px] text-[#006782] font-semibold">Turno Tarde</span>
                  </div>

                  <div className="space-y-1.5">
                    {(active.comandas || []).map((cmd) => (
                      <div
                        key={cmd.id}
                        className="p-2.5 rounded-xl bg-[#eff4ff]/60 flex items-center justify-between text-xs border border-gray-100"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-[#002546]">
                            {cmd.toldo} • {cmd.description}
                          </span>
                          <span className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                cmd.isCash ? 'bg-[#006782]' : 'bg-[#57d1fd]'
                              }`}
                            />
                            {cmd.method}
                          </span>
                        </div>
                        <span className="font-extrabold text-[#002546] text-sm shrink-0">
                          {formatUsd(cmd.amountUsd)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conteo de Billetes en Sobre Físico del Mesonero */}
                <div className="bg-[#eff4ff]/60 rounded-xl p-3 space-y-2 border border-[#d2e4ff]/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-[#006782]" />
                      <span className="text-xs font-bold text-[#002546]">
                        Conteo de Billetes en Sobre Físico
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        diffEnvelope === 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Total Sobre: {formatUsd(envelopeTotal)}
                    </span>
                  </div>

                  {/* Cuadrícula interactiva de denominaciones */}
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    {[
                      { denom: 'd100', val: 100, count: envelopeBills.d100 },
                      { denom: 'd50', val: 50, count: envelopeBills.d50 },
                      { denom: 'd20', val: 20, count: envelopeBills.d20 },
                      { denom: 'd10', val: 10, count: envelopeBills.d10 },
                      { denom: 'd5', val: 5, count: envelopeBills.d5 },
                      { denom: 'd1', val: 1, count: envelopeBills.d1 },
                    ].map((b) => (
                      <div
                        key={b.denom}
                        className="bg-white p-2 rounded-lg border border-gray-200 flex flex-col justify-between shadow-2xs"
                      >
                        <span className="text-[11px] text-[#006782] font-bold">
                          ${b.val} USD
                        </span>
                        <div className="flex items-center justify-center gap-1 my-1">
                          <button
                            onClick={() =>
                              handleEnvelopeBillDelta(
                                active.id,
                                b.denom as keyof BillDenominationCount,
                                -1
                              )
                            }
                            className="w-5 h-5 rounded bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 active:scale-95"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-xs font-bold text-[#002546] min-w-4">
                            {b.count}
                          </span>
                          <button
                            onClick={() =>
                              handleEnvelopeBillDelta(
                                active.id,
                                b.denom as keyof BillDenominationCount,
                                1
                              )
                            }
                            className="w-5 h-5 rounded bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 active:scale-95"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">
                          ${b.count * b.val}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Estado de conciliación del sobre */}
                  <div className="flex justify-between items-center text-[11px] pt-1">
                    <span className="text-gray-500">
                      Esperado en sistema: <b>{formatUsd(ded.netCash)}</b>
                    </span>
                    <span
                      className={`font-bold ${
                        diffEnvelope === 0
                          ? 'text-emerald-700'
                          : diffEnvelope > 0
                          ? 'text-sky-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {diffEnvelope === 0
                        ? '✓ Coincidencia exacta'
                        : diffEnvelope > 0
                        ? `+$${diffEnvelope.toFixed(2)} Sobrante`
                        : `-$${Math.abs(diffEnvelope).toFixed(2)} Faltante`}
                    </span>
                  </div>
                </div>

                {/* Action button: Liquidar / Emitir Paz y Salvo */}
                {isPending ? (
                  <button
                    onClick={() => handleSettleSingleWaiter(active)}
                    className="w-full h-12 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#57d1fd]" />
                    <span>Recibir {formatUsd(ded.netCash)} y Emitir Paz y Salvo</span>
                  </button>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex flex-col">
                      <span className="text-emerald-900 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Paz y Salvo Emitido {active.pazYSalvoNumber}
                      </span>
                      <span className="text-[10px] text-emerald-700">
                        Entregado a {active.settledByOwner} • {active.settledAt}
                      </span>
                    </div>
                    <button
                      onClick={() => onOpenPazYSalvo(active)}
                      className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                    >
                      Ver Recibo
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Resumen y Selección de Todo el Personal */}
          <div className="bg-[#eff4ff]/60 border border-[#d2e4ff] rounded-2xl p-3 space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-[#002546]">
                Personal en Turno ({filteredClosings.length})
              </span>
              <div className="flex gap-1">
                {(['pending', 'settled', 'all'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setClosingsFilter(filter)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                      closingsFilter === filter
                        ? 'bg-[#002546] text-white shadow-2xs'
                        : 'bg-white/80 text-gray-600 hover:bg-white'
                    }`}
                  >
                    {filter === 'pending' ? 'Pendientes' : filter === 'settled' ? 'Paz y Salvo' : 'Todos'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {filteredClosings.map((closing) => {
                const isSelected = selectedMesoneroId === closing.id;
                const isPending = closing.status === 'pending';
                return (
                  <button
                    key={closing.id}
                    onClick={() => setSelectedMesoneroId(closing.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-white border-[#002546] ring-1 ring-[#002546] shadow-xs'
                        : 'bg-white/90 border-gray-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#002546]">
                        {closing.waiterName.split(' ')[0]} {closing.waiterName.split(' ')[1]?.[0] || ''}.
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isPending ? 'Pendiente' : 'Listo'}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline mt-1 text-[11px]">
                      <span className="text-gray-500">Sobre Físico:</span>
                      <span className="font-extrabold text-[#002546]">
                        {formatUsd(closing.cashToDeliverUsd)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Arqueo de Billetaje Físico General (Gaveta Caja Central) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#006782] flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#002546]">Arqueo de Billetaje Físico</h3>
                  <p className="text-[11px] text-gray-500">Conteo de divisas recibidas en gaveta</p>
                </div>
              </div>
              <span className="bg-[#eff4ff] text-[#006782] text-[10px] font-bold px-2 py-0.5 rounded">
                $ USD
              </span>
            </div>

            {/* Bill counter grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { denom: 'd100', val: 100, count: drawerBills.d100 },
                { denom: 'd50', val: 50, count: drawerBills.d50 },
                { denom: 'd20', val: 20, count: drawerBills.d20 },
                { denom: 'd10', val: 10, count: drawerBills.d10 },
                { denom: 'd5', val: 5, count: drawerBills.d5 },
                { denom: 'd1', val: 1, count: drawerBills.d1 },
              ].map((b) => (
                <div
                  key={b.denom}
                  className="bg-[#f8f9ff] border border-gray-200 rounded-xl p-2.5 flex flex-col justify-between text-center"
                >
                  <span className="text-xs font-extrabold text-[#006782]">${b.val} USD</span>
                  <div className="flex items-center justify-center gap-1.5 my-1">
                    <button
                      onClick={() => handleBillDelta(b.denom as keyof BillDenominationCount, -1)}
                      className="w-5 h-5 rounded-md bg-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-300"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-[#002546] min-w-5">{b.count} unid.</span>
                    <button
                      onClick={() => handleBillDelta(b.denom as keyof BillDenominationCount, 1)}
                      className="w-5 h-5 rounded-md bg-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-300"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {formatUsd(b.count * b.val)}
                  </span>
                </div>
              ))}
            </div>

            {/* Difference indicator */}
            <div className="bg-[#eff4ff] border border-[#a4c9fc] rounded-xl p-3 flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-[#002546] block">Diferencia de Arqueo</span>
                <span className="text-[11px] text-gray-500">Físico en gaveta vs. Sistema</span>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold text-[#002546]">
                  {formatUsd(diffCash)}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold block">
                  {diffCash === 0 ? 'EXACTO / SIN FALTANTE' : diffCash > 0 ? 'SOBRANTE' : 'FALTANTE'}
                </span>
              </div>
            </div>

            {showActaZSuccess && (
              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-bold animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>¡Acta Z generada y sellada con hash SHA-256 en Starlink!</span>
              </div>
            )}

            <button
              onClick={handleGenerateActaZ}
              className="w-full h-12 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Lock className="w-4 h-4 text-[#57d1fd]" />
              <span>Finalizar Cierre Diario y Generar Acta Z</span>
            </button>

            <button
              onClick={() => {
                const firstSettled = waitersClosings.find((w) => w.status === 'settled');
                if (firstSettled) {
                  onOpenPazYSalvo(firstSettled);
                } else {
                  setActionNotice('No hay comprobantes liquidados aún. Liquida primero la entrega de efectivo de un mesonero.');
                  setTimeout(() => setActionNotice(null), 4000);
                }
              }}
              className="w-full h-10 bg-white hover:bg-gray-100 text-[#002546] border border-gray-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              <span>Reimprimir Comprobantes de Paz y Salvo</span>
            </button>

            {onOpenFiscalInvoice && (
              <button
                onClick={onOpenFiscalInvoice}
                className="w-full h-10 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002546] border border-[#a4c9fc] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileText className="w-4 h-4 text-[#006782]" />
                <span>Ver Comprobante Fiscal Digital (SENIAT FACT-00018492)</span>
              </button>
            )}

            {actionNotice && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 p-2.5 rounded-xl text-xs flex items-center gap-2 font-medium animate-fade-in">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{actionNotice}</span>
              </div>
            )}
          </div>
        </div>
      ) : adminTab === 'menu' ? (
        /* ========== VIEW: GESTIÓN DE CARTA Y PLATOS (PANEL DEL DUEÑO) ========== */
        <OwnerMenuManager
          menuItems={menuItems}
          bcvRate={bcvRate}
          onToggleMenuAvailability={onToggleMenuAvailability}
          onAddMenuItem={onAddMenuItem || (() => {})}
          onUpdateMenuItem={onUpdateMenuItem || (() => {})}
          onDeleteMenuItem={onDeleteMenuItem || (() => {})}
        />
      ) : adminTab === 'fiscal_audit' ? (
        /* ========== VIEW: AUDITORÍA DE ARQUEO FISCAL & ACTA Z ========== */
        <div className="space-y-4">
          <FiscalAuditView
            bcvRate={bcvRate}
            onOpenFiscalInvoice={onOpenFiscalInvoice}
          />
        </div>
      ) : adminTab === 'contingency' ? (
        /* ========== VIEW: CONTINGENCIA SATELITAL & MESH LOCAL ========== */
        <div className="space-y-4">
          <SatelliteMeshContingency
            bcvRate={bcvRate}
          />
        </div>
      ) : adminTab === 'order_sync' ? (
        /* ========== VIEW: MONITOR DE COCINA KDS EN VIVO & SINCRONIZACIÓN ========== */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#eff4ff] p-1.5 rounded-2xl border border-[#d2e4ff]">
            <button
              onClick={() => setKdsSubView('monitor')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                kdsSubView === 'monitor'
                  ? 'bg-[#002546] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#002546]'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-[#57d1fd]" />
              <span>Pedidos en Cocina en Vivo ({activeKitchenOrders.length})</span>
            </button>
            <button
              onClick={() => setKdsSubView('editor')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                kdsSubView === 'editor'
                  ? 'bg-[#002546] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#002546]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-[#006782]" />
              <span>Editor Comanda #1048</span>
            </button>
          </div>

          {kdsSubView === 'monitor' ? (
            <OwnerKitchenMonitor
              orders={orders}
              onUpdateOrderStatus={onUpdateOrderStatus}
              onUpdateOrder={onUpdateOrder}
              bcvRate={bcvRate}
              approachingAlertCount={approachingAlertCount}
            />
          ) : (
            <OrderSyncEditor bcvRate={bcvRate} />
          )}
        </div>
      ) : adminTab === 'logistics' ? (
        /* ========== VIEW 2: INVENTARIO DE ARENA, HIELO MARINO Y LANCHAS ========== */
        <div className="space-y-4">
          {/* Header de Módulo */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-1 text-[#006782] text-[11px] font-bold uppercase tracking-wider">
                <Package className="w-4 h-4" />
                <span>Logística Costera & Muelle</span>
              </div>
              <h1 className="text-xl font-bold text-[#002546] tracking-tight mt-0.5">
                Inventario de Arena & Reabastecimiento
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Insumos críticos, rotación térmica (33°C) y enlace náutico con Carenero.
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#002546] shadow-xs shrink-0">
              <LifeBuoy className="w-5 h-5 text-[#006782]" />
            </div>
          </div>

          {/* Indicador de Alerta Roja / Reorden Crítica */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col gap-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600"></div>
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <span className="text-sm font-bold text-[#002546]">Nivel de Reposición en Playa</span>
              </div>
              <span className="bg-rose-100 text-rose-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase">
                {arenaSupplies.filter((s) => s.status === 'critical').length} Crítico
              </span>
            </div>

            {/* Insumos */}
            <div className="space-y-2.5">
              {arenaSupplies.slice(0, 3).map((item) => (
                <div key={item.id} className="bg-[#f8f9ff] p-3 rounded-xl flex flex-col gap-1.5 border border-gray-100">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[#002546] font-bold">
                      {item.category === 'ice' ? (
                        <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
                      ) : item.category === 'beer' ? (
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      )}
                      <span>{item.name}</span>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        item.status === 'critical'
                          ? 'text-rose-600'
                          : item.status === 'warning'
                          ? 'text-amber-700'
                          : 'text-[#002546]'
                      }`}
                    >
                      {item.currentLevelPercent}% ({item.stockDisplay})
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        item.status === 'critical'
                          ? 'bg-rose-600'
                          : item.status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-[#57d1fd]'
                      }`}
                      style={{ width: `${item.currentLevelPercent}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-gray-500">
                    <span>{item.note}</span>
                    <span
                      className={`font-bold tracking-wide text-[10px] uppercase ${
                        item.status === 'critical'
                          ? 'text-rose-600'
                          : item.status === 'warning'
                          ? 'text-amber-700'
                          : 'text-[#006782]'
                      }`}
                    >
                      {item.status === 'critical'
                        ? 'REORDEN URGENTE'
                        : item.status === 'warning'
                        ? 'ALERTA PREVENTIVA'
                        : 'NIVEL MEDIO'}
                    </span>
                  </div>
                </div>
              ))}

              {/* Insumos 4 & 5 Mini-Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {arenaSupplies.slice(3).map((item) => (
                  <div key={item.id} className="bg-[#f8f9ff] p-3 rounded-xl flex flex-col justify-between border border-gray-100">
                    <div className="flex items-center gap-1 text-[#002546] text-xs font-bold truncate">
                      <Flame className="w-3.5 h-3.5 text-[#006782] shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span
                        className={`text-base font-bold font-mono ${
                          item.status === 'critical' ? 'text-rose-600' : 'text-[#006782]'
                        }`}
                      >
                        {item.currentLevelPercent}%
                      </span>
                      <span className="text-[10px] text-gray-500 truncate">{item.stockDisplay}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coordinación Lancha Carguera en Tiempo Real */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col gap-3 relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#002546] text-white flex items-center justify-center shadow-xs">
                  <Ship className="w-5 h-5 text-[#57d1fd]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wide text-[#006782] font-bold">
                    Travesía Marítima En Vivo
                  </span>
                  <h2 className="text-sm font-bold text-[#002546] leading-tight">
                    {cargoBoat.boatName}
                  </h2>
                </div>
              </div>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  cargoBoat.status === 'unloaded'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-[#bbe9ff] text-[#002546]'
                }`}
              >
                {cargoBoat.status === 'unloaded' ? 'Desembarcado' : 'En Tránsito'}
              </span>
            </div>

            {/* Imagen Representativa Barco / Muelle */}
            <div className="relative w-full h-36 rounded-xl overflow-hidden shadow-xs border border-gray-100">
              <img
                className="w-full h-full object-cover"
                alt="Lancha Carguera El Morro II navegando y atracando en muelle de Buche"
                src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#002546]/90 via-[#002546]/30 to-transparent flex items-end p-3">
                <div className="flex items-center justify-between w-full text-white">
                  <span className="text-xs flex items-center gap-1 font-semibold">
                    <Anchor className="w-3.5 h-3.5 text-[#57d1fd]" />
                    {cargoBoat.origin} ➔ {cargoBoat.destination}
                  </span>
                  <span className="text-[10px] font-mono bg-[#002546]/80 px-2 py-0.5 rounded border border-white/20">
                    {cargoBoat.travelTimeMinutes} min travesía
                  </span>
                </div>
              </div>
            </div>

            {/* Detalles del Capitán y Horario */}
            <div className="grid grid-cols-2 gap-2 bg-[#f8f9ff] p-3 rounded-xl border border-gray-100">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500">Capitán al Mando</span>
                <span className="text-xs text-[#002546] font-bold">{cargoBoat.captain}</span>
                <span className="text-[10px] text-[#006782] font-mono flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#57d1fd] inline-block animate-pulse"></span>
                  VHF: {cargoBoat.vhfChannel}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-gray-500">Estimado de Arribo</span>
                <span className="text-xs text-[#002546] font-bold font-mono">{cargoBoat.estimatedArrival}</span>
                <span className="text-[10px] text-gray-500 font-mono">Zarpe: {cargoBoat.departureTime}</span>
              </div>
            </div>

            {/* Manifiesto de Carga */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#002546] font-bold uppercase tracking-wider">
                  Manifiesto Despachado:
                </span>
                <span className="text-[11px] text-[#006782] font-mono font-bold">
                  Guía #{cargoBoat.guideNumber}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs text-[#002546]">
                {(cargoBoat?.items || []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-[#eff4ff] px-2.5 py-1.5 rounded-lg border border-[#d2e4ff]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#006782] shrink-0" />
                    <span className="truncate font-medium">
                      {item.quantityDisplay} {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notificación de recepción */}
            {boatReceivedNotice && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-2.5 rounded-xl text-xs flex items-center gap-2 font-medium animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{boatReceivedNotice}</span>
              </div>
            )}

            {/* Acciones Rápidas Operativas */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleConfirmBoatArrival}
                disabled={cargoBoat.status === 'unloaded'}
                className={`w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors ${
                  cargoBoat.status === 'unloaded'
                    ? 'bg-emerald-700 text-white cursor-default'
                    : 'bg-[#002546] hover:bg-[#0d3b66] text-white active:scale-98'
                }`}
              >
                <Package className="w-4 h-4 text-[#57d1fd]" />
                <span>
                  {cargoBoat.status === 'unloaded'
                    ? '¡Carga Desembarcada e Ingresada a Cavas!'
                    : 'Confirmar Recepción y Desembarque en Muelle'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setActionNotice('Llamando por Radio VHF Marina (Canal 72)... Enlace activo con Chucho Marval.');
                    setTimeout(() => setActionNotice(null), 4000);
                  }}
                  className="h-10 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002546] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#a4c9fc] transition-colors"
                >
                  <Radio className="w-3.5 h-3.5 text-[#006782]" />
                  <span>VHF / Satelital</span>
                </button>
                <button
                  onClick={() => {
                    setActionNotice('Orden de reabastecimiento enviada a Distribuidora Carenero vía WhatsApp Satelital.');
                    setTimeout(() => setActionNotice(null), 4000);
                  }}
                  className="h-10 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002546] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#a4c9fc] transition-colors"
                >
                  <Ship className="w-3.5 h-3.5 text-[#006782]" />
                  <span>Pedir a Proveedor</span>
                </button>
              </div>
            </div>
          </div>

          {/* Registro Rápido de Merma / Consumo en Arena */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#bbe9ff] flex items-center justify-center text-[#002546]">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#002546]">Reporte Rápido de Merma</h3>
              </div>
              <span className="text-[10px] text-gray-500 font-bold uppercase">Barra & Mesoneros</span>
            </div>
            <p className="text-xs text-gray-500">
              Registre botellas rotas en arena, derretimiento o devoluciones para ajuste contable inmediato.
            </p>

            <div className="flex flex-col gap-3 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase">Tipo de Incidencia</label>
                  <select
                    value={wasteIncidence}
                    onChange={(e) => setWasteIncidence(e.target.value)}
                    className="h-10 px-2.5 bg-[#f8f9ff] text-[#002546] rounded-xl text-xs font-medium border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#006782]"
                  >
                    <option value="Botella rota en arena">Botella rota en arena</option>
                    <option value="Hielo derretido (Sol)">Hielo derretido (Sol 33°C)</option>
                    <option value="Plato devuelto (Cocina)">Plato devuelto (Cocina)</option>
                    <option value="Cortesía de Capitán">Cortesía de Capitán</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase">Insumo Afectado</label>
                  <select
                    value={wasteUnitCost}
                    onChange={(e) => {
                      const cost = parseFloat(e.target.value);
                      setWasteUnitCost(cost);
                      const name = e.target.options[e.target.selectedIndex].text.split('(')[0].trim();
                      setWasteItemName(name);
                    }}
                    className="h-10 px-2.5 bg-[#f8f9ff] text-[#002546] rounded-xl text-xs font-medium border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#006782]"
                  >
                    <option value={1.5}>Polar Light ($1.50)</option>
                    <option value={4.0}>Bolsa Hielo Escamas ($4.00)</option>
                    <option value={22.0}>Pargo Rojo 1kg ($22.00)</option>
                    <option value={3.5}>Refresco / Agua ($3.50)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 items-center bg-[#f8f9ff] p-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 font-bold">Cantidad:</span>
                  <div className="flex items-center bg-white rounded-lg border border-gray-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setWasteQuantity((q) => Math.max(1, q - 1))}
                      className="w-7 h-7 flex items-center justify-center text-[#002546] font-bold text-sm hover:bg-gray-100 rounded-l-lg"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-xs text-[#002546]">
                      {wasteQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setWasteQuantity((q) => Math.min(20, q + 1))}
                      className="w-7 h-7 flex items-center justify-center text-[#002546] font-bold text-sm hover:bg-gray-100 rounded-r-lg"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-right flex flex-col">
                  <span className="text-[10px] text-gray-500">Valor Estimado:</span>
                  <span className="text-xs text-[#002546] font-mono font-extrabold">
                    {formatUsd(wasteUnitCost * wasteQuantity)}
                  </span>
                  <span className="text-[10px] text-[#006782] font-mono font-semibold">
                    {formatBsDirect(wasteUnitCost * wasteQuantity * bcvRate)}
                  </span>
                </div>
              </div>

              {wasteNotice && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-2.5 rounded-xl text-xs flex items-center gap-2 font-medium animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{wasteNotice}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddWasteReport}
                className="h-11 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002546] border border-[#a4c9fc] font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-98"
              >
                <Save className="w-4 h-4 text-[#006782]" />
                <span>Asentar Registro en Libro Diario</span>
              </button>

              {/* Historial rápido de mermas registradas */}
              {wasteReports.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">
                    Mermas Asentadas Hoy ({wasteReports.length})
                  </span>
                  <div className="space-y-1">
                    {wasteReports.slice(0, 3).map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#f8f9ff] border border-gray-100"
                      >
                        <div>
                          <span className="font-bold text-[#002546] block">
                            {w.quantity}x {w.itemName}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {w.incidenceType} • {w.timestamp}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-rose-700 block">
                            -{formatUsd(w.costUsd)}
                          </span>
                          <span className="text-[10px] text-gray-500">{formatBsDirect(w.costBs)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Merma registrada y sello de empresa */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#006782] uppercase font-bold tracking-wider">
                Merma Registrada
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                {new Date().toLocaleDateString('es-VE')}
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <div className="flex flex-col">
                <span className="text-lg text-[#002546] font-mono font-bold">
                  {formatUsd(totalWasteUsd)}
                </span>
                <span className="text-xs text-[#006782] font-mono font-semibold">
                  {formatBsDirect(totalWasteBs)} (Tasa {bcvRate.toFixed(2)})
                </span>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 text-[#002546] text-[10px] font-bold bg-[#bbe9ff] px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-[#006782]" />
                  <span>{wasteReports.length} reportes</span>
                </div>
                <span className="text-[9px] text-gray-400 mt-0.5">
                  {wasteReports.length === 0 ? 'Sin mermas registradas' : 'Registrado por el dueño'}
                </span>
              </div>
            </div>

            {/* Sello Corporativo Medallón Virgen del Valle & Buche */}
            <div className="mt-2 pt-2 bg-[#f8f9ff] p-3 rounded-xl flex items-center gap-3 border border-gray-100">
              <div className="relative w-12 h-12 rounded-full shrink-0 flex items-center justify-center overflow-hidden">
                <img src="./logo.png" alt="Playa Buche" className="w-12 h-12 object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#002546]">Inversiones Virgen del Valle C.A.</span>
                <span className="text-[10px] text-gray-500 font-mono">
                  RIF: J-40536768-7 • Bahía Buche
                </span>
                <span className="text-[10px] text-[#006782] font-medium">
                  Autorizado para despacho marítimo Carenero
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : adminTab === 'rbac' ? (
        /* ========== VIEW 3: GESTIÓN DE PERMISOS & SEGURIDAD RBAC ========== */
        <div className="space-y-4">
          <RbacSecurityMatrix
            bcvRate={bcvRate}
            onOpenFiscalInvoice={onOpenFiscalInvoice}
            auditEntries={auditEntries}
          />
        </div>
      ) : (
        /* ========== VIEW 4: PANEL EJECUTIVO & FINANZAS & TASA ========== */
        <div className="space-y-4">
          {/* Tasa del día Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#006782] flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#002546]">Tasa del día</h3>
                  <p className="text-[11px] text-gray-500">Control monetario y conversión de turno</p>
                </div>
              </div>
              <span className="bg-[#002546] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                TASA DEL DÍA
              </span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-3 text-xs font-bold text-gray-500">Bs.</span>
                <input
                  type="number"
                  step="0.01"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-300 text-sm font-bold text-[#002546] focus:ring-2 focus:ring-[#006782]"
                />
              </div>
              <button
                onClick={handleRateUpdate}
                className="px-4 h-11 bg-[#006782] hover:bg-[#005870] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Actualizar
              </button>
            </div>

            {/* Quick Adjust Delta Buttons */}
            <div className="flex items-center gap-1 pt-0.5">
              <span className="text-[10px] text-gray-500 font-semibold mr-1">Ajuste rápido:</span>
              {[-1.0, -0.5, 0.5, 1.0].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => handleQuickRateDelta(delta)}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-[#dce9ff] text-[#002546] rounded text-[10px] font-bold transition-colors"
                >
                  {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                </button>
              ))}
            </div>

            {rateNotice && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-2.5 rounded-xl text-xs flex items-center gap-2 font-bold animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{rateNotice}</span>
              </div>
            )}

            {/* Quick Conversions */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#f8f9ff] p-2 rounded-xl border border-gray-200">
                <span className="text-[10px] text-gray-500 block">Consumo $10</span>
                <span className="font-bold text-[#002546]">{formatBsDirect(10 * bcvRate)}</span>
              </div>
              <div className="bg-[#f8f9ff] p-2 rounded-xl border border-gray-200">
                <span className="text-[10px] text-gray-500 block">Comanda $25</span>
                <span className="font-bold text-[#002546]">{formatBsDirect(25 * bcvRate)}</span>
              </div>
              <div className="bg-[#f8f9ff] p-2 rounded-xl border border-gray-200">
                <span className="text-[10px] text-gray-500 block">Tour / Lancha $50</span>
                <span className="font-bold text-[#002546]">{formatBsDirect(50 * bcvRate)}</span>
              </div>
            </div>
          </div>

          {/* Cuentas Receptoras de Pago */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#006782]" />
                <h3 className="text-sm font-bold text-[#002546]">Datos Bancarios de Cobro</h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                EN VIVO
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Banco Receptor Pago Móvil</label>
                <input
                  type="text"
                  value={pagoBank}
                  onChange={(e) => setPagoBank(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Teléfono Afiliado</label>
                  <input
                    type="text"
                    value={pagoPhone}
                    onChange={(e) => setPagoPhone(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">RIF / Titular</label>
                  <input
                    type="text"
                    value={pagoRif}
                    onChange={(e) => setPagoRif(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Correo Electrónico Zelle</label>
                <input
                  type="text"
                  value={zelleEmail}
                  onChange={(e) => setZelleEmail(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs font-mono"
                />
              </div>
            </div>

            {bankSavedNotice && (
              <div className="text-xs text-emerald-800 bg-emerald-50 p-2 rounded-lg font-bold">
                ¡Datos bancarios guardados y sincronizados!
              </div>
            )}

            <button
              onClick={handleSaveBankConfig}
              className="w-full h-10 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl text-xs font-bold transition-colors"
            >
              Guardar Cuentas Bancarias
            </button>
          </div>

          {/* Selector de Período Financiero */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#006782]" />
                <h3 className="text-sm font-bold text-[#002546]">Cierre & Reporte Financiero</h3>
              </div>
              <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full uppercase">
                {financialPeriod === 'daily' ? 'Diario' : financialPeriod === 'weekly' ? 'Semanal' : 'Mensual'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setFinancialPeriod('daily')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  financialPeriod === 'daily'
                    ? 'bg-white text-[#002546] shadow-xs'
                    : 'text-gray-600 hover:text-[#002546]'
                }`}
              >
                Diario (Hoy)
              </button>
              <button
                type="button"
                onClick={() => setFinancialPeriod('weekly')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  financialPeriod === 'weekly'
                    ? 'bg-white text-[#002546] shadow-xs'
                    : 'text-gray-600 hover:text-[#002546]'
                }`}
              >
                Semanal (7d)
              </button>
              <button
                type="button"
                onClick={() => setFinancialPeriod('monthly')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  financialPeriod === 'monthly'
                    ? 'bg-white text-[#002546] shadow-xs'
                    : 'text-gray-600 hover:text-[#002546]'
                }`}
              >
                Mensual (30d)
              </button>
            </div>
          </div>

          {/* Executive Metrics — calculados con las órdenes reales del período */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-gray-500 block">Ventas Brutas ({financialPeriod === 'daily' ? 'Hoy' : financialPeriod === 'weekly' ? '7 días' : 'Mes'})</span>
              <span className="text-xl font-extrabold text-[#002546]">{formatUsd(periodGrossTotal)}</span>
              <span className="text-[10px] text-gray-500 font-bold block mt-0.5">
                {periodFilteredOrders.length} {periodFilteredOrders.length === 1 ? 'comanda' : 'comandas'}
              </span>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-gray-500 block">Total Cobrado</span>
              <span className="text-xl font-extrabold text-[#002546]">{formatUsd(periodVerifiedTotal)}</span>
              <span className="text-[10px] text-[#006782] font-bold block mt-0.5">{periodPaidOrders.length} órdenes liquidadas</span>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-gray-500 block">Ticket Promedio</span>
              <span className="text-xl font-extrabold text-[#002546]">{formatUsd(periodAverageTicket)}</span>
              <span className="text-[10px] text-gray-500 block mt-0.5">Por cuenta cobrada</span>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-gray-500 block">Despachos & Pax</span>
              <span className="text-xl font-extrabold text-[#002546]">{periodFilteredOrders.length} ord.</span>
              <span className="text-[10px] text-gray-500 block mt-0.5">{periodDispatchedCount} despachadas</span>
            </div>
          </div>

          {/* Quick Share to WhatsApp Button */}
          <button
            type="button"
            onClick={handleShareWhatsAppClosure}
            className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Exportar Resumen Financiero y Cierre a WhatsApp</span>
          </button>

          {/* Ingresos por Canal Reales */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-[#006782]" />
                <h3 className="text-sm font-bold text-[#002546]">Ingresos por Canal</h3>
              </div>
              <span className="text-[11px] text-gray-500">
                {financialPeriod === 'daily' ? 'Turno de hoy' : financialPeriod === 'weekly' ? 'Últimos 7 días' : 'Mes actual'}
              </span>
            </div>

            {totalChannelsSum === 0 ? (
              <p className="text-xs text-gray-400 italic bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                Aún no hay cobros liquidados registrados en este período.
              </p>
            ) : (
              <>
                {/* Distribution bar */}
                <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-gray-100">
                  {excPct > 0 && <div className="bg-sky-400 h-full" style={{ width: `${excPct}%` }} title={`Excursiones ${excPct}%`}></div>}
                  {qrPct > 0 && <div className="bg-[#002546] h-full" style={{ width: `${qrPct}%` }} title={`Clientes App ${qrPct}%`}></div>}
                  {waiterPct > 0 && <div className="bg-amber-400 h-full" style={{ width: `${waiterPct}%` }} title={`Mesoneros ${waiterPct}%`}></div>}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                      <span>Excursiones y Lanchas (Bahía Buche)</span>
                    </span>
                    <span className="font-bold text-[#002546]">
                      {formatUsd(excursionChannelTotal)} ({excPct}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#002546]"></span>
                      <span>Clientes App Directa (QR Toldos & Muelle)</span>
                    </span>
                    <span className="font-bold text-[#002546]">
                      {formatUsd(clientQrChannelTotal)} ({qrPct}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <span>Mesoneros Salón & Playa (Comandera POS)</span>
                    </span>
                    <span className="font-bold text-[#002546]">
                      {formatUsd(waiterPosChannelTotal)} ({waiterPct}%)
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Control Rápido de Menú (Availability Toggles) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[#002546]">Control Rápido de Menú</h3>
                <p className="text-[11px] text-gray-500">Disponibilidad y ajuste instantáneo</p>
              </div>
              <span className="text-[10px] bg-[#eff4ff] text-[#006782] px-2 py-0.5 rounded font-bold">
                4 Ítems Clave
              </span>
            </div>

            <div className="space-y-2.5">
              {menuItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-[#f8f9ff]"
                >
                    <div>
                      <h4 className="text-xs font-bold text-[#002546]">{item.name}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                        <span className="text-amber-800 font-semibold">
                          🍽️ Mesoneros: {formatUsd(item.priceUsd)}
                        </span>
                        <span className="text-sky-800 font-semibold">
                          🚤 Excursión: {formatUsd(item.priceExcursionUsd ?? item.priceUsd)}
                        </span>
                      </div>
                    </div>
                  <button
                    onClick={() => onToggleMenuAvailability(item.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      item.isAvailable
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.isAvailable ? 'Disponible' : 'Agotado'}
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setAdminTab('menu')}
              className="w-full py-2.5 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Utensils className="w-3.5 h-3.5 text-[#57d1fd]" />
              <span>Gestionar Carta Completa y Subir Fotos desde Teléfono</span>
            </button>
          </div>

          {/* Gestión de Accesos PIN POS */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[#002546]">Cuentas de Mesoneros y Excursiones</h3>
                <p className="text-[11px] text-gray-500">Acceso por correo y clave cifrada</p>
              </div>
              <Users className="w-4 h-4 text-[#006782]" />
            </div>

            <div className="space-y-2">
              {(staffUsers || []).filter(u => u.role === 'waiter' || u.role === 'excursion').map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-[#f8f9ff] text-xs"
                >
                  <div>
                    <span className="font-bold text-[#002546] block">{staff.name}</span>
                    <span className="text-[10px] text-gray-500">{staff.email}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${
                      staff.status === 'suspended'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-white text-[#006782] border-gray-200'
                    }`}
                  >
                    {staff.zone || 'Sin zona'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Matriz Completa de Roles, Permisos RBAC y Políticas de Seguridad */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#006782] flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#002546]">Matriz de Roles & Seguridad RBAC</h3>
                  <p className="text-[11px] text-gray-500">Permisos granulares, RLS y guardias de acceso</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-[#002546] text-white px-2 py-0.5 rounded">
                5 ROLES
              </span>
            </div>

            {/* Selector de Roles */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {RBAC_ROLE_DEFINITIONS.map((def) => {
                const isSelected = selectedRbacRole === def.role;
                return (
                  <button
                    key={def.role}
                    onClick={() => setSelectedRbacRole(def.role)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#002546] text-white shadow-xs'
                        : 'bg-[#eff4ff] text-[#002546] hover:bg-[#dce9ff]'
                    }`}
                  >
                    <Key className="w-3 h-3 text-[#57d1fd]" />
                    <span>{def.role}</span>
                  </button>
                );
              })}
            </div>

            {/* Detalle del Rol Seleccionado */}
            {(() => {
              const activeRole = RBAC_ROLE_DEFINITIONS.find((r) => r.role === selectedRbacRole) || RBAC_ROLE_DEFINITIONS[0];
              return (
                <div className="bg-[#f8f9ff] p-3 rounded-xl border border-gray-200 space-y-2.5 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-[#002546] block">{activeRole.label}</span>
                      <span className="text-[10px] text-[#006782] font-mono">ID: {activeRole.identifier}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-[#bbe9ff] text-[#002546] px-2 py-0.5 rounded-full">
                      Autenticado
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-gray-200">
                    <div>
                      <span className="text-gray-500 block text-[10px]">Dispositivos:</span>
                      <span className="font-semibold text-[#002546]">{activeRole.devices}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Mecanismo de Acceso:</span>
                      <span className="font-semibold text-[#002546]">{activeRole.authMethod}</span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-gray-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#006782] block">
                      Permisos Operativos Asignados:
                    </span>
                    <div className="space-y-1">
                      {(activeRole?.permissions || []).map((perm, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[#002546] text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{perm}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Toggle de Código de Seguridad: RLS PostgreSQL & NestJS Guard */}
            <button
              onClick={() => setShowSqlPolicies(!showSqlPolicies)}
              className="w-full py-2 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002546] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-[#a4c9fc] transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-[#006782]" />
              <span>{showSqlPolicies ? 'Ocultar Políticas RLS & NestJS Guard' : 'Ver Políticas RLS (PostgreSQL) & NestJS Guard'}</span>
            </button>

            {showSqlPolicies && (
              <div className="space-y-2 animate-fade-in">
                <div className="bg-[#002546] text-[#bbe9ff] p-3 rounded-xl font-mono text-[10px] space-y-1 overflow-x-auto">
                  <div className="text-emerald-400 font-bold">-- 1. Políticas de Seguridad de Nivel de Fila (RLS)</div>
                  <div>ALTER TABLE &quot;Order&quot; ENABLE ROW LEVEL SECURITY;</div>
                  <div>CREATE POLICY client_orders_policy ON &quot;Order&quot;</div>
                  <div>&nbsp;&nbsp;FOR ALL USING (auth.role() = &apos;OWNER&apos; OR (auth.role() = &apos;CLIENT&apos; AND client_id = auth.uid()) OR (auth.role() = &apos;WAITER&apos; AND waiter_id = auth.uid()));</div>
                  <div className="pt-1 text-emerald-400 font-bold">-- 2. Política de Pagos y Caja</div>
                  <div>ALTER TABLE &quot;PaymentTransaction&quot; ENABLE ROW LEVEL SECURITY;</div>
                  <div>CREATE POLICY payments_verification_policy ON &quot;PaymentTransaction&quot; FOR UPDATE USING (auth.role() = &apos;OWNER&apos;);</div>
                </div>

                <div className="bg-[#002546] text-[#bbe9ff] p-3 rounded-xl font-mono text-[10px] space-y-1 overflow-x-auto">
                  <div className="text-emerald-400 font-bold">// PermissionsGuard (NestJS / Node.js)</div>
                  <div>@Injectable()</div>
                  <div>export class PermissionsGuard implements CanActivate &#123;</div>
                  <div>&nbsp;&nbsp;canActivate(context: ExecutionContext): boolean &#123;</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;if (user.role === &apos;OWNER&apos;) return true; // Acceso universal</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;return requiredPermissions.every(p =&gt; user.permissions?.includes(p));</div>
                  <div>&nbsp;&nbsp;&#125;</div>
                  <div>&#125;</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA: SORTEO OFICIAL 200 PERSONAS */}
      {adminTab === 'giveaway' && (
        <OwnerGiveawayManager
          giveaway={giveaway}
          onUpdateGiveaway={onUpdateGiveaway}
        />
      )}

      {/* Footer Branding */}
      <div className="text-center pt-2 pb-4 text-[10px] text-gray-500 space-y-1">
        <div className="font-bold text-[#002546]">INVERSIONES VIRGEN DEL VALLE C.A.</div>
        <div>RIF J-40536768-7 • Playa Buche, Parque Nacional Mochima</div>
        <div>Acta electrónica sellada con hash SHA-256 • Conexión Satelital Activa</div>
      </div>
    </div>
  );
};
