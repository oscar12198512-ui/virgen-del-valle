import React, { useState } from 'react';
import { User, UserRole } from '../types';
import {
  UserCheck,
  UserPlus,
  Shield,
  ShieldCheck,
  Key,
  Smartphone,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Share2,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Ship,
  UtensilsCrossed,
  ChefHat,
  Crown,
  Edit2,
  Trash2,
  Lock,
  MessageCircle,
  Sparkles,
  Check
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface OwnerStaffManagerProps {
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onApproveUser: (userId: string, pin: string, zone?: string, boatName?: string) => void;
  onToggleUserStatus: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}

export const OwnerStaffManager: React.FC<OwnerStaffManagerProps> = ({
  users,
  onAddUser,
  onUpdateUser,
  onApproveUser,
  onToggleUserStatus,
  onDeleteUser,
}) => {
  const [filterRole, setFilterRole] = useState<'all' | 'pending' | 'waiter' | 'excursion' | 'other'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [approvingUser, setApprovingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // New User Form State
  const [newRole, setNewRole] = useState<UserRole>('waiter');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('+58 412 ');
  const [newEmail, setNewEmail] = useState('');
  const [newPin, setNewPin] = useState(generateRandomPin());
  const [newZone, setNewZone] = useState('Zona Orilla Toldos 1 al 10');
  const [newBoatName, setNewBoatName] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Approval Form State
  const [approvePin, setApprovePin] = useState(generateRandomPin());
  const [approveZone, setApproveZone] = useState('Zona Toldos Playa (Orilla)');
  const [approveBoatName, setApproveBoatName] = useState('');

  function generateRandomPin() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  const togglePinVisibility = (userId: string) => {
    setShowPins((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const copyCredentials = (user: User) => {
    const text = `🏖️ *PLAYA BUCHE - INVERSIONES VIRGEN DEL VALLE*\n¡Hola ${user.name}! Tu cuenta operativa ha sido autorizada por el Dueño:\n\n🔑 *Rol:* ${
      user.role === 'waiter' ? 'Mesonero de Playa' : user.role === 'excursion' ? 'Operador de Excursiones' : user.role
    }\n🔢 *PIN de acceso rápido:* ${user.pin || 'PIN pendiente de asignación'}\n📍 *Zona asignada:* ${user.zone || 'Asignada en muelle'}${
      user.boatName ? `\n🚤 *Embarcación:* ${user.boatName}` : ''
    }\n\nIngresa desde tu teléfono a la aplicación: ${window.location.origin}`;

    navigator.clipboard.writeText(text);
    setCopiedId(user.id);
    soundService.playSuccess();
    setTimeout(() => setCopiedId(null), 2500);
  };

  const shareViaWhatsApp = (user: User) => {
    const cleanPhone = (user.phone || '').replace(/\D/g, '');
    const text = encodeURIComponent(
      `🏖️ *PLAYA BUCHE - INVERSIONES VIRGEN DEL VALLE*\n¡Hola ${user.name}! Tu cuenta operativa ha sido creada y autorizada por la Gerencia:\n\n🔑 *Rol:* ${
        user.role === 'waiter' ? 'Mesonero de Playa' : user.role === 'excursion' ? 'Operador de Excursiones' : user.role
      }\n🔢 *PIN de acceso:* ${user.pin || 'PIN pendiente de asignación'}\n📍 *Zona/Puesto:* ${user.zone || 'Buche'}${
        user.boatName ? `\n🚤 *Embarcación:* ${user.boatName}` : ''
      }\n\nIngresa al sistema: ${window.location.origin}`
    );

    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !/^\d{4,6}$/.test(newPin)) return;

    const initials = newName
      .trim()
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('');

    const newUser: User = {
      id: `u-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      pin: newPin,
      phone: newPhone.trim(),
      zone: newRole === 'excursion' ? (newZone || 'Muelle Carenero - Buche') : newZone,
      boatName: newRole === 'excursion' ? newBoatName.trim() : undefined,
      avatar: initials || 'PB',
      status: 'active',
      approvedByOwner: true,
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      notes: newNotes.trim() || 'Cuenta creada directamente por el Dueño.',
      activeOrdersCount: 0,
    };

    onAddUser(newUser);
    soundService.playSuccess();
    setShowNewUserModal(false);
    setActionSuccessMsg(`Cuenta de ${newUser.name} creada y activada con PIN: ${newUser.pin}`);
    setTimeout(() => setActionSuccessMsg(null), 4000);

    // Reset form
    setNewName('');
    setNewPhone('+58 412 ');
    setNewEmail('');
    setNewPin(generateRandomPin());
    setNewNotes('');
  };

  const handleConfirmApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingUser) return;

    onApproveUser(approvingUser.id, approvePin, approveZone, approveBoatName);
    soundService.playSuccess();
    setActionSuccessMsg(`¡Cuenta de ${approvingUser.name} aprobada con éxito! PIN: ${approvePin}`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
    setApprovingUser(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    onUpdateUser(editingUser);
    soundService.playSuccess();
    setEditingUser(null);
    setActionSuccessMsg(`Datos de ${editingUser.name} actualizados.`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Filter users
  const pendingUsers = users.filter((u) => u.status === 'pending_approval' || u.approvedByOwner === false);
  const activeStaff = users.filter((u) => u.status !== 'pending_approval' && u.approvedByOwner !== false);

  const filteredUsers = users.filter((u) => {
    if (u.role === 'client') return false; // clients are handled separately

    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery)) ||
      (u.zone && u.zone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.boatName && u.boatName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterRole === 'pending') {
      return u.status === 'pending_approval' || u.approvedByOwner === false;
    }
    if (filterRole === 'waiter') return u.role === 'waiter';
    if (filterRole === 'excursion') return u.role === 'excursion';
    if (filterRole === 'other') return u.role === 'kitchen' || u.role === 'admin';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Alert / Success Toast */}
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Main Card Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#002546] to-[#006782] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-[#57d1fd]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#002546]">
                  Control de Cuentas & Accesos del Personal
                </h3>
                {pendingUsers.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                    {pendingUsers.length} pendientes
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                El dueño es quien autoriza y asigna PINs de seguridad a mesoneros y lancheros.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewPin(generateRandomPin());
              setShowNewUserModal(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Crear Nueva Cuenta</span>
          </button>
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100">
          <div className="p-2.5 rounded-xl bg-[#f8f9ff] border border-gray-200">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Mesoneros Activos</span>
            <div className="text-lg font-black text-[#002546] flex items-center gap-1.5">
              <UtensilsCrossed className="w-4 h-4 text-[#006782]" />
              {users.filter((u) => u.role === 'waiter' && u.status === 'active').length}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#f8f9ff] border border-gray-200">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Lancheros / Tours</span>
            <div className="text-lg font-black text-[#002546] flex items-center gap-1.5">
              <Ship className="w-4 h-4 text-cyan-600" />
              {users.filter((u) => u.role === 'excursion' && u.status === 'active').length}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#f8f9ff] border border-gray-200">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Cocina KDS</span>
            <div className="text-lg font-black text-[#002546] flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 text-amber-600" />
              {users.filter((u) => u.role === 'kitchen').length}
            </div>
          </div>
          <div className={`p-2.5 rounded-xl border ${pendingUsers.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <span className={`text-[10px] uppercase font-bold block ${pendingUsers.length > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              Por Aprobar
            </span>
            <div className={`text-lg font-black flex items-center gap-1.5 ${pendingUsers.length > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              <Clock className="w-4 h-4" />
              {pendingUsers.length} solicitudes
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setFilterRole('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                filterRole === 'pending'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>Por Aprobar</span>
              {pendingUsers.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${filterRole === 'pending' ? 'bg-white text-rose-600' : 'bg-rose-600 text-white'}`}>
                  {pendingUsers.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('waiter')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                filterRole === 'waiter'
                  ? 'bg-[#002546] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Mesoneros ({users.filter((u) => u.role === 'waiter').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('excursion')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                filterRole === 'excursion'
                  ? 'bg-[#002546] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Ship className="w-3.5 h-3.5" />
              <span>Excursiones ({users.filter((u) => u.role === 'excursion').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('other')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                filterRole === 'other'
                  ? 'bg-[#002546] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Cocina & Socios</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterRole === 'all'
                  ? 'bg-[#002546] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, teléfono, lancha o toldo..."
              className="w-full h-9 pl-8 pr-3 text-xs bg-[#f8f9ff] rounded-xl border border-gray-200 focus:outline-none focus:border-[#006782]"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* SECTION: Solicitudes Pendientes (Si hay) */}
      {filterRole === 'pending' && pendingUsers.length === 0 && (
        <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#002546]">No hay solicitudes pendientes</h4>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Todas las cuentas de mesoneros y operadores de excursión han sido autorizadas por el Dueño.
          </p>
          <button
            type="button"
            onClick={() => setFilterRole('waiter')}
            className="mt-3 px-4 py-2 bg-[#f0f4ff] text-[#002546] rounded-xl text-xs font-bold hover:bg-[#e0ebff]"
          >
            Ver Mesoneros Activos
          </button>
        </div>
      )}

      {/* Cards List */}
      <div className="space-y-2.5">
        {filteredUsers.map((user) => {
          const isPending = user.status === 'pending_approval' || user.approvedByOwner === false;
          const isSuspended = user.status === 'suspended';
          const isPinVisible = showPins[user.id] || false;

          return (
            <div
              key={user.id}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                isPending
                  ? 'bg-amber-50/70 border-amber-300 shadow-xs ring-1 ring-amber-400/30'
                  : isSuspended
                  ? 'bg-gray-50 border-gray-300 opacity-75'
                  : 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left info */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border ${
                      user.role === 'waiter'
                        ? 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]'
                        : user.role === 'excursion'
                        ? 'bg-teal-50 text-teal-700 border-teal-200'
                        : user.role === 'kitchen'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-[#002546] text-[#57d1fd] border-[#002546]'
                    }`}
                  >
                    {user.avatar || user.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-[#002546]">{user.name}</h4>
                      
                      {/* Role Pill */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          user.role === 'waiter'
                            ? 'bg-blue-100 text-blue-800'
                            : user.role === 'excursion'
                            ? 'bg-teal-100 text-teal-800'
                            : user.role === 'kitchen'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {user.role === 'waiter'
                          ? 'Mesonero'
                          : user.role === 'excursion'
                          ? 'Excursión / Lancha'
                          : user.role === 'kitchen'
                          ? 'Cocina KDS'
                          : 'Dueño / Admin'}
                      </span>

                      {/* Status Pill */}
                      {isPending ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Esperando Aprobación
                        </span>
                      ) : isSuspended ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500 text-white">
                          Pausado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Autorizado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      {user.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {user.phone}
                        </span>
                      )}
                      {user.zone && (
                        <span className="flex items-center gap-1 font-medium text-[#006782]">
                          📍 {user.zone}
                        </span>
                      )}
                      {user.boatName && (
                        <span className="flex items-center gap-1 font-medium text-teal-700">
                          🚤 {user.boatName}
                        </span>
                      )}
                    </div>

                    {user.notes && (
                      <p className="text-[11px] text-gray-500 italic bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                        "{user.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right PIN & Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* PIN Display with toggle */}
                  {!isPending && (
                    <div className="flex items-center bg-[#f8f9ff] border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-mono">
                      <Key className="w-3.5 h-3.5 text-[#006782] mr-1.5" />
                      <span className="font-bold text-[#002546]">
                        {isPinVisible ? user.pin || '1234' : '••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePinVisibility(user.id)}
                        className="ml-2 text-gray-400 hover:text-gray-600 p-0.5"
                        title={isPinVisible ? 'Ocultar PIN' : 'Mostrar PIN'}
                      >
                        {isPinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}

                  {/* APPROVE BUTTON for Pending Users */}
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setApprovingUser(user);
                          setApprovePin(user.pin || generateRandomPin());
                          setApproveZone(user.zone || 'Zona Toldos Playa (Orilla)');
                          setApproveBoatName(user.boatName || '');
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Aprobar y Asignar PIN</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteUser(user.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Rechazar solicitud"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    /* ACTIONS for Active Users */
                    <div className="flex items-center gap-1">
                      {/* Copy Credentials */}
                      <button
                        type="button"
                        onClick={() => copyCredentials(user)}
                        className={`p-2 rounded-xl transition-all ${
                          copiedId === user.id
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                        }`}
                        title="Copiar credenciales completas"
                      >
                        {copiedId === user.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {/* WhatsApp Share */}
                      <button
                        type="button"
                        onClick={() => shareViaWhatsApp(user)}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-colors"
                        title="Enviar credenciales por WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => setEditingUser({ ...user })}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
                        title="Editar datos o PIN"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Toggle Active / Suspended */}
                      <button
                        type="button"
                        onClick={() => onToggleUserStatus(user.id)}
                        className={`p-2 rounded-xl transition-colors ${
                          isSuspended
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                        title={isSuspended ? 'Reactivar cuenta' : 'Pausar acceso temporalmente'}
                      >
                        {isSuspended ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: APPROVE PENDING USER */}
      {approvingUser && (
        <div className="fixed inset-0 z-50 bg-[#002546]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 border border-[#002546]/10 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#002546]">Aprobar Acceso de Personal</h3>
                  <span className="text-[11px] text-gray-500">Autorización directa de la Gerencia</span>
                </div>
              </div>
              <button
                onClick={() => setApprovingUser(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <p className="font-bold">Solicitante: {approvingUser.name}</p>
              <p className="text-[11px] text-amber-800">
                Rol solicitado: <b>{approvingUser.role === 'waiter' ? 'Mesonero' : 'Operador de Excursión'}</b> • Tel: {approvingUser.phone}
              </p>
            </div>

            <form onSubmit={handleConfirmApproval} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#002546]">Asignar PIN de Seguridad (4 dígitos)</label>
                  <button
                    type="button"
                    onClick={() => setApprovePin(generateRandomPin())}
                    className="text-[10px] text-[#006782] hover:underline font-bold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Generar PIN
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={approvePin}
                  onChange={(e) => setApprovePin(e.target.value)}
                  className="w-full h-10 px-3 font-mono font-bold text-center tracking-widest text-base rounded-xl border border-gray-300 focus:outline-none focus:border-[#006782] bg-[#f8f9ff]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#002546] block mb-1">
                  Zona de Toldos o Muelle Asignado
                </label>
                <input
                  type="text"
                  value={approveZone}
                  onChange={(e) => setApproveZone(e.target.value)}
                  placeholder="Ej: Zona Toldos 1 al 10 - Orilla"
                  className="w-full h-10 px-3 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#006782]"
                />
              </div>

              {approvingUser.role === 'excursion' && (
                <div>
                  <label className="text-xs font-bold text-[#002546] block mb-1">
                    Nombre de Embarcación / Peñero
                  </label>
                  <input
                    type="text"
                    value={approveBoatName}
                    onChange={(e) => setApproveBoatName(e.target.value)}
                    placeholder="Ej: Lancha Virgen del Valle I"
                    className="w-full h-10 px-3 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#006782]"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setApprovingUser(null)}
                  className="flex-1 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aprobar y Habilitar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW USER */}
      {showNewUserModal && (
        <div className="fixed inset-0 z-50 bg-[#002546]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 border border-[#002546]/10 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#eff4ff] text-[#006782] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#002546]">Crear Nueva Cuenta</h3>
                  <span className="text-[11px] text-gray-500">Asignar credenciales a un nuevo trabajador</span>
                </div>
              </div>
              <button
                onClick={() => setShowNewUserModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              {/* Role Selection */}
              <div>
                <label className="text-xs font-bold text-[#002546] block mb-1">
                  Rol del Colaborador
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewRole('waiter');
                      setNewZone('Zona Toldos Playa (Orilla)');
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${
                      newRole === 'waiter'
                        ? 'bg-[#002546] text-white border-[#002546]'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <UtensilsCrossed className="w-4 h-4" />
                    <span className="text-xs font-bold">Mesonero</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewRole('excursion');
                      setNewZone('Muelle Excursiones & Peñeros');
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${
                      newRole === 'excursion'
                        ? 'bg-[#002546] text-white border-[#002546]'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <Ship className="w-4 h-4" />
                    <span className="text-xs font-bold">Lancha / Tour</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewRole('kitchen');
                      setNewZone('Fogón y Pailas Cocina');
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${
                      newRole === 'kitchen'
                        ? 'bg-[#002546] text-white border-[#002546]'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <ChefHat className="w-4 h-4" />
                    <span className="text-xs font-bold">Cocina KDS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewRole('admin');
                      setNewZone('Gerencia y Caja Central');
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${
                      newRole === 'admin'
                        ? 'bg-[#002546] text-white border-[#002546]'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <Crown className="w-4 h-4" />
                    <span className="text-xs font-bold">Socio / Dueño</span>
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-bold text-[#002546] block mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Mendoza"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#006782]"
                />
              </div>

              {/* Phone (WhatsApp) */}
              <div>
                <label className="text-xs font-bold text-[#002546] block mb-1">
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+58 412 1234567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#006782]"
                />
              </div>

              {/* Security PIN */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#002546]">
                    PIN de Seguridad POS (4 dígitos) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPin(generateRandomPin())}
                    className="text-[10px] text-[#006782] hover:underline font-bold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Generar otro PIN
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full h-10 px-3 font-mono font-bold text-center tracking-widest text-base rounded-xl border border-gray-300 focus:outline-none focus:border-[#006782] bg-[#f8f9ff]"
                />
              </div>

              {/* Zone or Boat Name */}
              {newRole === 'excursion' ? (
                <div>
                  <label className="text-xs font-bold text-[#002546] block mb-1">
                    Nombre del Peñero / Lancha
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Lancha Nelson Express"
                    value={newBoatName}
                    onChange={(e) => setNewBoatName(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#006782]"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-[#002546] block mb-1">
                    Zona Asignada (Toldos / Sector)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Toldos 1 al 10 - Orilla"
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#006782]"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[#002546] block mb-1">
                  Notas u Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Turno completo fines de semana"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#006782]"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewUserModal(false)}
                  className="flex-1 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Crear y Autorizar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-[#002546]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 border border-[#002546]/10 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#002546]">Editar Cuenta</h3>
                  <span className="text-[11px] text-gray-500">{editingUser.name}</span>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#002546] block mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#006782]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#002546] block mb-1">Teléfono</label>
                <input
                  type="text"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#006782]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#002546] block mb-1">PIN POS</label>
                <input
                  type="text"
                  maxLength={6}
                  value={editingUser.pin || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, pin: e.target.value })}
                  className="w-full h-10 px-3 font-mono font-bold text-center tracking-widest text-base rounded-xl border border-gray-300 focus:outline-none focus:border-[#006782] bg-[#f8f9ff]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#002546] block mb-1">Zona / Toldos</label>
                <input
                  type="text"
                  value={editingUser.zone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, zone: e.target.value })}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#006782]"
                />
              </div>

              {editingUser.role === 'excursion' && (
                <div>
                  <label className="text-xs font-bold text-[#002546] block mb-1">Embarcación</label>
                  <input
                    type="text"
                    value={editingUser.boatName || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, boatName: e.target.value })}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#006782]"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-[#002546] hover:bg-[#003666] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#57d1fd]" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
