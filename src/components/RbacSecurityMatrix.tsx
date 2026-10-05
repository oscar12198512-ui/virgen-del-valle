import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  FileText,
  CheckCircle2,
  Lock,
  Warehouse,
  Utensils,
  Wallet,
  Umbrella,
  History,
  RotateCw,
  Download,
  Award,
  Radio,
  Wifi,
  Coins,
  Ship,
  Sparkles
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { AuditLogItem } from '../types';

export type RbacRoleKey = 'owner' | 'waiter' | 'kitchen' | 'excursion' | 'client';

interface PermissionItem {
  id: string;
  label: string;
  description: string;
  badge?: string;
  hasLock?: boolean;
}

interface PermissionCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: PermissionItem[];
}

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'cat-inventory',
    title: 'Inventario de Arena, Muelle y Lanchas Cargueras',
    subtitle: 'Operaciones logísticas Carenero ⇄ Buche',
    icon: <Warehouse className="w-5 h-5 text-[#006782]" />,
    items: [
      {
        id: 'p1_1',
        label: 'Confirmar recepción y desembarque en muelle',
        description: 'Dueños y Capitanía autorizados. Mesoneros bloqueados.'
      },
      {
        id: 'p1_2',
        label: 'Reportar mermas y botellas rotas en arena',
        description: 'Habilitado para Mesoneros y Cocina KDS.'
      },
      {
        id: 'p1_3',
        label: 'Monitorear lancha carguera Carenero ⇄ Buche',
        description: 'Modo lectura global para todos los roles de playa.'
      },
      {
        id: 'p1_4',
        label: 'Solicitud urgente de hielo marino a proveedor',
        description: 'Generación de orden de compra náutica prioritaria.',
        badge: 'Exclusivo Dueños'
      }
    ]
  },
  {
    id: 'cat-kitchen',
    title: 'Cocina KDS y Alertas Hápticas',
    subtitle: 'Pase de cocina, pargos fritos y brazaletes mesoneros',
    icon: <Utensils className="w-5 h-5 text-[#006782]" />,
    items: [
      {
        id: 'p2_1',
        label: 'Calibrar tiempos de pargo frito y fosforera',
        description: 'Permite reprogramar cronómetros de cocción marina.'
      },
      {
        id: 'p2_2',
        label: 'Disparar vibración de pulsera inteligente (Smart Band)',
        description: "Alerta táctil al mesonero cuando el pedido está 'Montado'."
      },
      {
        id: 'p2_3',
        label: 'Autorizar cortesía de calma al toldo por demora ($0.00)',
        description: 'Chef Ejecutivo o Socios autorizan tostones o rondas de cortesía.'
      }
    ]
  },
  {
    id: 'cat-cash',
    title: 'Caja, Tasa BCV y Paz y Salvo Fiscal',
    subtitle: 'Auditoría cambiaria y liquidación de personal',
    icon: <Wallet className="w-5 h-5 text-[#006782]" />,
    items: [
      {
        id: 'p3_1',
        label: 'Modificar Tasa BCV y cuentas Pago Móvil',
        description: 'Candado exclusivo Dueños y Directores Financieros.',
        hasLock: true
      },
      {
        id: 'p3_2',
        label: 'Validación y conciliación de Pago Móvil / Zelle',
        description: 'Verificación bancaria de transferencias contra extracto.'
      },
      {
        id: 'p3_3',
        label: 'Generar Paz y Salvo individual con hash digital',
        description: 'Emisión de solvencia fiscal de propinas y cuentas diarias.'
      },
      {
        id: 'p3_4',
        label: 'Cierre de comanda y cobro en toldo',
        description: 'Mesoneros autorizados para recibir efectivo y POS satelital.'
      }
    ]
  },
  {
    id: 'cat-clients',
    title: 'Acceso de Clientes y Selección de Toldos',
    subtitle: 'Experiencia auto-servicio desde la arena',
    icon: <Umbrella className="w-5 h-5 text-[#006782]" />,
    items: [
      {
        id: 'p4_1',
        label: 'Registro abierto de clientes sin aprobación previa',
        description: 'Activo por defecto al escanear QR del toldo o mesa.'
      },
      {
        id: 'p4_2',
        label: 'Selección libre de toldo / muelle vía QR',
        description: 'Permite al visitante asociar comanda a su código de lona.'
      },
      {
        id: 'p4_3',
        label: 'Llamado de mesonero y solicitud de hielo desde el toldo',
        description: 'Envío de ping de servicio directo a los brazaletes.'
      }
    ]
  }
];

const INITIAL_ROLE_PERMISSIONS: Record<RbacRoleKey, Record<string, boolean>> = {
  owner: {
    p1_1: true,
    p1_2: true,
    p1_3: true,
    p1_4: true,
    p2_1: true,
    p2_2: true,
    p2_3: true,
    p3_1: true,
    p3_2: true,
    p3_3: true,
    p3_4: true,
    p4_1: true,
    p4_2: true,
    p4_3: true
  },
  waiter: {
    p1_1: false,
    p1_2: true,
    p1_3: true,
    p1_4: false,
    p2_1: false,
    p2_2: false,
    p2_3: false,
    p3_1: false,
    p3_2: false,
    p3_3: false,
    p3_4: true,
    p4_1: true,
    p4_2: true,
    p4_3: true
  },
  kitchen: {
    p1_1: false,
    p1_2: true,
    p1_3: true,
    p1_4: false,
    p2_1: true,
    p2_2: true,
    p2_3: true,
    p3_1: false,
    p3_2: false,
    p3_3: false,
    p3_4: false,
    p4_1: false,
    p4_2: false,
    p4_3: false
  },
  excursion: {
    p1_1: true,
    p1_2: false,
    p1_3: true,
    p1_4: false,
    p2_1: false,
    p2_2: false,
    p2_3: false,
    p3_1: false,
    p3_2: false,
    p3_3: false,
    p3_4: false,
    p4_1: true,
    p4_2: true,
    p4_3: false
  },
  client: {
    p1_1: false,
    p1_2: false,
    p1_3: true,
    p1_4: false,
    p2_1: false,
    p2_2: false,
    p2_3: false,
    p3_1: false,
    p3_2: false,
    p3_3: false,
    p3_4: false,
    p4_1: true,
    p4_2: true,
    p4_3: true
  }
};

const ROLE_METADATA: Record<
  RbacRoleKey,
  {
    title: string;
    subtitle: string;
    descriptionBadge: string;
    icon: string;
    trustLevel: string;
  }
> = {
  owner: {
    title: 'Dueño / Socio',
    subtitle: 'Acceso Total',
    descriptionBadge: 'Dueño / Socio activo',
    icon: 'shield_person',
    trustLevel: 'Nivel de Confianza Máxima (Acceso Universal)'
  },
  waiter: {
    title: 'Mesoneros',
    subtitle: 'PIN 4 Dígitos',
    descriptionBadge: 'Mesoneros (PIN Toldo)',
    icon: 'badge',
    trustLevel: 'Nivel Operativo Arena (Comandera & Toldo)'
  },
  kitchen: {
    title: 'Cocina KDS',
    subtitle: 'Estación',
    descriptionBadge: 'KDS Cocina & Pase',
    icon: 'soup_kitchen',
    trustLevel: 'Nivel Pase KDS & Calibración de Cocción'
  },
  excursion: {
    title: 'Excursiones',
    subtitle: 'Muelle/Capitanes',
    descriptionBadge: 'Excursiones & Muelle',
    icon: 'kayaking',
    trustLevel: 'Nivel Náutico & Manifiestos de Muelle'
  },
  client: {
    title: 'Clientes',
    subtitle: 'Acceso Toldo',
    descriptionBadge: 'Clientes (QR Toldo)',
    icon: 'beach_access',
    trustLevel: 'Nivel Auto-Servicio QR de Playa'
  }
};

interface RbacSecurityMatrixProps {
  bcvRate: number;
  onOpenFiscalInvoice?: () => void;
  auditEntries?: AuditLogItem[];
}

export const RbacSecurityMatrix: React.FC<RbacSecurityMatrixProps> = ({
  bcvRate,
  onOpenFiscalInvoice,
  auditEntries = []
}) => {
  const [activeRole, setActiveRole] = useState<RbacRoleKey>('owner');
  const [rolePermissions, setRolePermissions] = useState<Record<RbacRoleKey, Record<string, boolean>>>(
    INITIAL_ROLE_PERMISSIONS
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSqlPolicies, setShowSqlPolicies] = useState<boolean>(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    try {
      soundService.playSuccess();
    } catch {}
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleTogglePermission = (permId: string) => {
    setRolePermissions((prev) => {
      const currentRolePerms = prev[activeRole] || {};
      const currentVal = currentRolePerms[permId] ?? false;
      return {
        ...prev,
        [activeRole]: {
          ...currentRolePerms,
          [permId]: !currentVal
        }
      };
    });
  };

  const handleSavePolicies = () => {
    showToast('Políticas RBAC sincronizadas en muelle y toldos');
  };

  const handleDownloadPdf = () => {
    if (onOpenFiscalInvoice) {
      onOpenFiscalInvoice();
    } else {
      showToast('Generando reporte PDF con hash fiscal SHA-256...');
    }
  };

  const activeMeta = ROLE_METADATA[activeRole];

  return (
    <div className="flex flex-col gap-4 text-[#001c37]">
      {/* Telemetría en Vivo & Conectividad Marina */}
      <section className="bg-[#eff4ff] rounded-2xl p-3.5 shadow-xs border border-[#d2e4ff]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-[#006782] text-xs font-bold">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#57d1fd] animate-pulse"></span>
            <span>Starlink Enlace Cifrado 98 Mbps</span>
          </div>
          <span className="bg-white text-[#002546] text-[11px] px-2.5 py-0.5 rounded-full shadow-2xs font-semibold border border-gray-100">
            Latencia 28ms
          </span>
        </div>
        <div className="flex items-center justify-between pt-1.5 bg-white/70 rounded-xl px-3 py-1.5 border border-white/80">
          <div className="flex items-center gap-1.5 text-gray-600 text-xs font-medium">
            <Coins className="w-4 h-4 text-[#006782]" />
            <span>Tasa Oficial BCV:</span>
          </div>
          <span className="text-base text-[#002546] font-extrabold tracking-tight font-mono">
            {bcvRate.toFixed(2)} Bs/$
          </span>
        </div>
      </section>

      {/* Encabezado de Matriz */}
      <section className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#006782] shrink-0" />
          <h1 className="text-xl font-bold text-[#002546] tracking-tight">
            Gestión de Permisos & Seguridad RBAC
          </h1>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">
          Matriz de control de acceso para 5 roles operativos y módulos náuticos/playa. Configuración
          en tiempo real sincronizada a terminales.
        </p>
      </section>

      {/* Selector de Roles Operativos */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-[#006782] font-bold">
            Rol en Edición
          </span>
          <span className="text-xs font-semibold text-[#002546] bg-[#bbe9ff] px-2.5 py-0.5 rounded-full">
            {activeMeta.descriptionBadge}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" id="role-tabs">
          {(Object.keys(ROLE_METADATA) as RbacRoleKey[]).map((roleKey) => {
            const meta = ROLE_METADATA[roleKey];
            const isSelected = activeRole === roleKey;
            return (
              <button
                key={roleKey}
                onClick={() => setActiveRole(roleKey)}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-[#002546] text-white shadow-sm ring-2 ring-[#57d1fd]'
                    : 'bg-[#eff4ff] text-[#002546] hover:bg-[#dce9ff] border border-[#d2e4ff]'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={isSelected ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {meta.icon}
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold leading-tight">{meta.title}</span>
                  <span
                    className={`text-[10px] leading-none ${
                      isSelected ? 'text-[#bbe9ff]' : 'text-gray-500'
                    }`}
                  >
                    {meta.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Vista Previa de Roles & Visual Snapshot */}
      <section>
        <div className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-gray-200">
          <img
            className="w-full h-36 object-cover"
            alt="Vista aérea de Playa Buche en Carenero Higuerote Venezuela"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuArrKeWTaNumGt2BEASW8mURg95wdCH0qVREldxRkQuEkLQSsQ4U3iHTRn2is11j0S91TODkZP7egRMDTfr-PNcT6DLJsuD7BF-KPGuNEpJ5q8IvmW7Ngg8Ou-pQLw2QoSkp6BcC4heh9ZzMdLoyTCKPskOYNjcW6WPpHnS8R6tLb1prFjR8znKrecOM25jV1w4hVA2WcDXLjJUDbOoVAmWmN1BhO6kERgE49KgjRJ0dFARj0QxmWFb6Q"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#002546]/95 via-[#002546]/60 to-transparent flex flex-col justify-end p-3.5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#57d1fd]" />
                <span className="text-xs font-bold">{activeMeta.trustLevel}</span>
              </div>
              <span className="bg-[#006782] text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                256-Bit SSL
              </span>
            </div>
            <span className="text-[11px] text-[#bbe9ff] mt-0.5">
              Permisos operativos aplicados instantáneamente en toldos y muelle
            </span>
          </div>
        </div>
      </section>

      {/* Matriz de Permisos por Categorías */}
      <div className="flex flex-col gap-3.5">
        {PERMISSION_CATEGORIES.map((category) => (
          <div
            key={category.id}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col gap-2.5"
          >
            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#006782] shrink-0">
                {category.icon}
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-[#002546] leading-snug">{category.title}</h2>
                <span className="text-[11px] text-gray-500">{category.subtitle}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {category.items.map((item) => {
                const isEnabled = rolePermissions[activeRole]?.[item.id] ?? false;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#f8f9ff] border border-gray-100 hover:border-gray-200 transition-all"
                  >
                    <div className="flex flex-col max-w-[76%]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.hasLock && <Lock className="w-3 h-3 text-[#006782]" />}
                        <span className="text-xs font-semibold text-[#002546] leading-tight">
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="bg-[#0d3b66] text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                        {item.description}
                      </span>
                    </div>

                    {/* Interactive Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleTogglePermission(item.id)}
                      aria-label={`Alternar permiso ${item.label}`}
                      className={`w-12 h-6 rounded-full flex items-center p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#57d1fd] ${
                        isEnabled ? 'bg-[#006782]' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                          isEnabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      ></div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Auditoría de Seguridad en Vivo */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <History className="w-4 h-4 text-[#006782]" />
            <span className="text-xs font-bold text-[#002546]">
              Bitácora Crítica (Últimas Acciones)
            </span>
          </div>
          <span className="bg-[#d2e4ff] text-[#002546] text-[10px] px-2 py-0.5 rounded-md font-bold font-mono">
            Auditoría SHA-256
          </span>
        </div>

        <div className="flex flex-col gap-2 text-xs">
          {auditEntries.length === 0 ? (
            <p className="text-[11px] text-gray-500 p-3 rounded-xl bg-[#f8f9ff] border border-dashed border-gray-300">
              Todav&iacute;a no hay acciones registradas en esta bit&aacute;cora.
            </p>
          ) : (
            auditEntries.slice(0, 6).map((entry) => (
              <div key={entry.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#f8f9ff] border border-gray-100">
                <History className="w-4 h-4 text-[#006782] shrink-0 mt-0.5" />
                <div className="flex flex-col flex-1">
                  <span className="font-semibold text-[#002546]">{entry.action}</span>
                  <span className="text-[10px] text-gray-500">
                    {new Date(entry.timestamp).toLocaleString('es-VE')} &bull; {entry.user}
                  </span>
                </div>
                <span className="text-[#006782] text-[10px] font-bold bg-[#bbe9ff] px-2 py-0.5 rounded-full">
                  {entry.hash ? 'SHA-256' : 'REGISTRADO'}
                </span>
              </div>
            ))
          )}        </div>
      </section>

      {/* Políticas RLS & NestJS Guard Visualizer */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 space-y-2">
        <button
          type="button"
          onClick={() => setShowSqlPolicies(!showSqlPolicies)}
          className="w-full py-2.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002546] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-[#a4c9fc] transition-colors"
        >
          <FileText className="w-3.5 h-3.5 text-[#006782]" />
          <span>
            {showSqlPolicies
              ? 'Ocultar Políticas RLS & NestJS Guard'
              : 'Ver Políticas RLS (PostgreSQL) & NestJS Guard'}
          </span>
        </button>

        {showSqlPolicies && (
          <div className="space-y-2 animate-fade-in pt-1">
            <div className="bg-[#002546] text-[#bbe9ff] p-3 rounded-xl font-mono text-[10px] space-y-1 overflow-x-auto">
              <div className="text-emerald-400 font-bold">
                -- 1. Políticas de Seguridad de Nivel de Fila (RLS)
              </div>
              <div>ALTER TABLE &quot;Order&quot; ENABLE ROW LEVEL SECURITY;</div>
              <div>CREATE POLICY client_orders_policy ON &quot;Order&quot;</div>
              <div>
                &nbsp;&nbsp;FOR ALL USING (auth.role() = &apos;OWNER&apos; OR (auth.role() =
                &apos;CLIENT&apos; AND client_id = auth.uid()) OR (auth.role() = &apos;WAITER&apos;
                AND waiter_id = auth.uid()));
              </div>
              <div className="pt-1 text-emerald-400 font-bold">
                -- 2. Política de Pagos y Caja
              </div>
              <div>ALTER TABLE &quot;PaymentTransaction&quot; ENABLE ROW LEVEL SECURITY;</div>
              <div>
                CREATE POLICY payments_verification_policy ON &quot;PaymentTransaction&quot; FOR
                UPDATE USING (auth.role() = &apos;OWNER&apos;);
              </div>
            </div>

            <div className="bg-[#002546] text-[#bbe9ff] p-3 rounded-xl font-mono text-[10px] space-y-1 overflow-x-auto">
              <div className="text-emerald-400 font-bold">// PermissionsGuard (NestJS / Node.js)</div>
              <div>@Injectable()</div>
              <div>export class PermissionsGuard implements CanActivate &#123;</div>
              <div>
                &nbsp;&nbsp;canActivate(context: ExecutionContext): boolean &#123;
              </div>
              <div>
                &nbsp;&nbsp;&nbsp;&nbsp;if (user.role === &apos;OWNER&apos;) return true; // Acceso
                universal
              </div>
              <div>
                &nbsp;&nbsp;&nbsp;&nbsp;return requiredPermissions.every(p =&gt;
                user.permissions?.includes(p));
              </div>
              <div>&nbsp;&nbsp;&#125;</div>
              <div>&#125;</div>
            </div>
          </div>
        )}
      </section>

      {/* Botones de Acción Principal */}
      <section className="flex flex-col gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleSavePolicies}
          id="save-btn"
          className="w-full h-12 rounded-xl bg-[#002546] hover:bg-[#0d3b66] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
        >
          <RotateCw className="w-4 h-4 text-[#57d1fd]" />
          <span>Guardar y Sincronizar Políticas de Seguridad</span>
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          id="download-btn"
          className="w-full h-12 rounded-xl bg-white hover:bg-gray-50 text-[#002546] font-bold text-xs flex items-center justify-center gap-2 shadow-sm border border-gray-200 active:scale-98 transition-all"
        >
          <Download className="w-4 h-4 text-[#006782]" />
          <span>Descargar Matriz RBAC en PDF Fiscal</span>
        </button>
      </section>

      {/* Tarjeta Legal & Sello Institucional */}
      <footer className="pt-2">
        <div className="bg-[#eff4ff] rounded-2xl p-4 flex flex-col items-center text-center gap-1.5 shadow-xs border border-[#d2e4ff]">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#006782] shadow-2xs mb-1">
            <Award className="w-5 h-5 text-[#006782]" />
          </div>
          <span className="text-xs text-[#002546] font-bold uppercase tracking-wider">
            Inversiones Virgen del Valle C.A.
          </span>
          <span className="text-[11px] text-[#006782] font-semibold font-mono">
            RIF: J-40536768-7
          </span>
          <p className="text-[11px] text-gray-500 max-w-xs mt-1 leading-relaxed">
            Plataforma Administrativa Oficial de Playa Buche, Bahía de Carenero, Edo. Miranda.
            Certificado de Operaciones Náuticas y Gastronómicas.
          </p>
        </div>
      </footer>

      {/* Notificación Toast Dinámica */}
      {toastMessage && (
        <div
          id="toast"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#002546] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 z-50 animate-fade-in border border-[#57d1fd]/40"
        >
          <CheckCircle2 className="w-4 h-4 text-[#57d1fd] shrink-0" />
          <span className="text-xs font-medium" id="toast-text">
            {toastMessage}
          </span>
        </div>
      )}
    </div>
  );
};
