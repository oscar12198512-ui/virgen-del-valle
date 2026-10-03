import React, { useState } from 'react';
import { User, UserRole } from '../types';
import {
  X,
  Shield,
  UtensilsCrossed,
  Ship,
  ChefHat,
  Crown,
  Umbrella,
  CheckCircle2,
  Lock,
  ArrowRight,
  QrCode,
  KeyRound,
  UserPlus,
  Clock,
  Smartphone,
  Phone,
  HelpCircle,
  Delete,
  Sparkles,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface AuthModalProps {
  users: User[];
  currentRole: UserRole;
  currentUser: User | null;
  onSelectRole: (role: UserRole, user?: User) => void;
  onClose: () => void;
  onRequestAccess?: (role: UserRole, name: string, phone: string, zone?: string, boatName?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  users,
  currentRole,
  currentUser,
  onSelectRole,
  onClose,
  onRequestAccess,
}) => {
  const [activeTab, setActiveTab] = useState<UserRole>(currentRole || 'waiter');
  const [selectedUser, setSelectedUser] = useState<User | null>(() => {
    return users.find((u) => u.role === currentRole && (u.status !== 'pending_approval')) || null;
  });
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showHelperPins, setShowHelperPins] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestSuccessMsg, setRequestSuccessMsg] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMsg, setRecoveryMsg] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get('resetToken') || '');
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  // Quick Request Form state
  const [reqName, setReqName] = useState('');
  const [reqPhone, setReqPhone] = useState('+58 412 ');
  const [reqZone, setReqZone] = useState('');
  const [reqBoatName, setReqBoatName] = useState('');

  // Toldo quick select for clients
  const [selectedToldoNum, setSelectedToldoNum] = useState('14');

  const handleTabChange = (role: UserRole) => {
    setActiveTab(role);
    setErrorMsg('');
    setPinInput('');
    setShowRequestForm(false);

    if (role === 'client') {
      setSelectedUser(null);
    } else {
      const match = users.find((u) => u.role === role && u.status !== 'pending_approval');
      setSelectedUser(match || null);
    }
  };

  const handleSelectSpecificUser = (user: User) => {
    setSelectedUser(user);
    setPinInput('');
    setErrorMsg('');
  };

  const handleKeypadPress = (val: string) => {
    if (pinInput.length < 6) {
      setPinInput((prev) => prev + val);
      setErrorMsg('');
      soundService.playClick();
    }
  };

  const handleKeypadBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    soundService.playClick();
  };

  const handleKeypadClear = () => {
    setPinInput('');
    setErrorMsg('');
  };

  const handleAdminPasswordLogin = async () => {
    const email = adminEmail.trim().toLowerCase();
    if (!email || !adminPassword) { setErrorMsg('Correo y clave son obligatorios.'); return; }
    try {
      const api = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const response = await fetch(api + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: adminPassword }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.user) { setErrorMsg(data.message || 'No se pudo iniciar sesión.'); return; }
      onSelectRole('admin', data.user); soundService.playSuccess(); onClose();
    } catch { setErrorMsg('No se pudo conectar con el servidor.'); }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) { setResetMsg('La nueva clave debe tener al menos 8 caracteres.'); return; }
    try {
      const api = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const response = await fetch(api + '/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: resetToken, password: newPassword }) });
      const data = await response.json().catch(() => ({}));
      setResetMsg(data.message || 'Clave actualizada.');
      if (response.ok) { window.history.replaceState({}, document.title, window.location.pathname); setTimeout(() => window.location.reload(), 700); }
    } catch { setResetMsg('No se pudo conectar con el servicio de recuperación.'); }
  };

  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (activeTab === 'admin') { void handleAdminPasswordLogin(); return; }

    if (activeTab === 'client') {
      const clientUser = users.find((u) => u.role === 'client') || {
        id: 'u-client',
        name: `Comensal Toldo #${selectedToldoNum}`,
        email: 'cliente@playabuche.com',
        role: 'client',
        zone: `Toldo VIP #${selectedToldoNum}`,
      };
      onSelectRole('client', {
        ...clientUser,
        zone: `Toldo #${selectedToldoNum}`,
      });
      soundService.playSuccess();
      onClose();
      return;
    }

    if (!selectedUser) {
      const fallbackUser = users.find((u) => u.role === activeTab);
      if (fallbackUser) {
        setSelectedUser(fallbackUser);
      } else {
        setErrorMsg('Selecciona un usuario de la lista');
        return;
      }
    }

    const targetUser = selectedUser!;

    // Check if pending
    if (targetUser.status === 'pending_approval' || targetUser.approvedByOwner === false) {
      setErrorMsg('Esta cuenta aún no ha sido aprobada por el Dueño. Solicita la activación al administrador.');
      soundService.playWarning();
      return;
    }

    // Production PIN validation happens on the API.
    if (!pinInput) {
      setErrorMsg('Introduce el PIN.');
      return;
    }
    try {
      const api = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      if (!api) throw new Error('API URL not configured');
      const response = await fetch(api + '/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetUser.email, pin: pinInput }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.user) {
        setErrorMsg(data.message || 'PIN incorrecto.');
        soundService.playWarning();
        return;
      }
      onSelectRole(activeTab, data.user);
      soundService.playSuccess();
      onClose();
    } catch {
      setErrorMsg('No se pudo conectar con el servidor de autenticación.');
      soundService.playWarning();
    }
  };

  const handlePasswordRecovery = async () => {
    const email = recoveryEmail.trim();
    if (!email) { setRecoveryMsg('Indica tu correo electrónico.'); return; }
    try {
      const api = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const response = await fetch(api + '/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      setRecoveryMsg(data.message || 'Si la cuenta existe, recibirás instrucciones de recuperación.');
    } catch {
      setRecoveryMsg('No se pudo conectar con el servicio de recuperación.');
    }
  };

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqName.trim()) return;

    if (onRequestAccess) {
      onRequestAccess(activeTab, reqName.trim(), reqPhone.trim(), reqZone.trim(), reqBoatName.trim());
    }

    soundService.playSuccess();
    setRequestSuccessMsg(
      `¡Solicitud enviada al Dueño! El socio administrador revisará tu cuenta (${reqName}) y te asignará el PIN de seguridad.`
    );
    setShowRequestForm(false);
    setReqName('');
  };

  // Filter users by tab
  const roleUsers = users.filter((u) => u.role === activeTab);

  return (
    <div className="fixed inset-0 z-50 bg-[#002546]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-[#002546]/10 flex flex-col max-h-[95vh] animate-scale-up my-auto">
        {/* Top Header */}
        <div className="relative px-5 pt-4 pb-3 bg-gradient-to-r from-[#002546] to-[#003666] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#57d1fd] shadow-xs">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#57d1fd] block">
                  INVERSIONES VIRGEN DEL VALLE
                </span>
                <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded font-mono text-white">
                  J-40536768-7
                </span>
              </div>
              <h2 className="text-base font-black tracking-tight text-white">
                Inicio de Sesión & Selector de Rol
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active Session Indicator */}
        {currentUser && (
          <div className="bg-[#eff4ff] px-5 py-2 border-b border-[#d2e4ff] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-gray-500">Sesión en uso:</span>
              <span className="font-bold text-[#002546]">{currentUser.name}</span>
              <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-gray-200 font-semibold text-[#006782] uppercase">
                {currentUser.role}
              </span>
            </div>
            <span className="text-[11px] text-gray-400">Terminal Playa</span>
          </div>
        )}

        {/* 5-Role Tabs */}
        <div className="p-3 bg-[#f8f9ff] border-b border-gray-200">
          <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
            {/* Dueño / Admin */}
            <button
              type="button"
              onClick={() => handleTabChange('admin')}
              className={`p-2 rounded-2xl text-center flex flex-col items-center justify-center transition-all ${
                activeTab === 'admin'
                  ? 'bg-[#002546] text-white shadow-md'
                  : 'bg-white text-[#002546] border border-gray-200 hover:border-[#006782]'
              }`}
            >
              <Crown className={`w-4 h-4 ${activeTab === 'admin' ? 'text-[#57d1fd]' : 'text-amber-500'}`} />
              <span className="text-[10px] font-bold mt-1 block leading-tight">Dueño</span>
            </button>

            {/* Mesonero */}
            <button
              type="button"
              onClick={() => handleTabChange('waiter')}
              className={`p-2 rounded-2xl text-center flex flex-col items-center justify-center transition-all ${
                activeTab === 'waiter'
                  ? 'bg-[#002546] text-white shadow-md'
                  : 'bg-white text-[#002546] border border-gray-200 hover:border-[#006782]'
              }`}
            >
              <UtensilsCrossed className={`w-4 h-4 ${activeTab === 'waiter' ? 'text-[#57d1fd]' : 'text-blue-600'}`} />
              <span className="text-[10px] font-bold mt-1 block leading-tight">Mesonero</span>
            </button>

            {/* Excursión */}
            <button
              type="button"
              onClick={() => handleTabChange('excursion')}
              className={`p-2 rounded-2xl text-center flex flex-col items-center justify-center transition-all ${
                activeTab === 'excursion'
                  ? 'bg-[#002546] text-white shadow-md'
                  : 'bg-white text-[#002546] border border-gray-200 hover:border-[#006782]'
              }`}
            >
              <Ship className={`w-4 h-4 ${activeTab === 'excursion' ? 'text-[#57d1fd]' : 'text-teal-600'}`} />
              <span className="text-[10px] font-bold mt-1 block leading-tight">Lanchas</span>
            </button>

            {/* Cocina */}
            <button
              type="button"
              onClick={() => handleTabChange('kitchen')}
              className={`p-2 rounded-2xl text-center flex flex-col items-center justify-center transition-all ${
                activeTab === 'kitchen'
                  ? 'bg-[#002546] text-white shadow-md'
                  : 'bg-white text-[#002546] border border-gray-200 hover:border-[#006782]'
              }`}
            >
              <ChefHat className={`w-4 h-4 ${activeTab === 'kitchen' ? 'text-[#57d1fd]' : 'text-amber-600'}`} />
              <span className="text-[10px] font-bold mt-1 block leading-tight">Cocina</span>
            </button>

            {/* Cliente */}
            <button
              type="button"
              onClick={() => handleTabChange('client')}
              className={`p-2 rounded-2xl text-center flex flex-col items-center justify-center transition-all ${
                activeTab === 'client'
                  ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md'
                  : 'bg-white text-[#002546] border border-gray-200 hover:border-emerald-500'
              }`}
            >
              <Umbrella className={`w-4 h-4 ${activeTab === 'client' ? 'text-white' : 'text-emerald-600'}`} />
              <span className="text-[10px] font-bold mt-1 block leading-tight">Cliente</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {resetToken && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-3">
              <h3 className="font-bold text-[#002546]">Restablecer clave</h3>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nueva clave (mínimo 8 caracteres)" autoComplete="new-password" className="w-full h-11 px-3 rounded-xl border border-gray-300 bg-white text-sm" />
              <button type="button" onClick={() => void handleResetPassword()} className="w-full h-11 bg-[#002546] text-white rounded-xl text-xs font-bold">Guardar nueva clave</button>
              {resetMsg && <p className="text-[11px] text-[#002546]">{resetMsg}</p>}
            </div>
          )}
          {/* Toast / Success Message */}
          {requestSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-medium flex items-start gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{requestSuccessMsg}</span>
            </div>
          )}

          {/* ================= VIEW: DUEÑO / ADMINISTRADOR ================= */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#002546] to-[#0a4275] text-white space-y-2.5 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <span className="text-xs uppercase font-bold tracking-wider text-sky-200">
                      Acceso Maestro Gerencia
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-900">
                    Socio Dueño
                  </span>
                </div>
                <h3 className="text-base font-bold">Control Total Playa Buche</h3>
                <p className="text-xs text-sky-100 leading-relaxed">
                  Autorización de nuevos mesoneros y lanchas, cierres de caja Z, facturación SENIAT, tasa BCV y auditoría de comandas.
                </p>
              </div>

              {/* Owner PIN input + Keypad */}
              <div className="bg-[#f8f9ff] p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-[#002546] flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-[#006782]" />
                    <span>Acceso del Dueño</span>
                  </label>
                  <span className="text-[10px] font-mono text-gray-400">Correo + clave</span>
                </div>

                <div className="space-y-2">
                  <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Correo del dueño" autoComplete="username" className="w-full h-11 px-3 rounded-xl border border-gray-300 bg-white text-sm" />
                  <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Clave maestra" autoComplete="current-password" className="w-full h-11 px-3 rounded-xl border border-gray-300 bg-white text-sm" />
                </div>

                {/* Keypad */}
                <NumericKeypad
                  onPress={handleKeypadPress}
                  onBackspace={handleKeypadBackspace}
                  onClear={handleKeypadClear}
                />

                {errorMsg && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { setShowRecovery((v) => !v); setRecoveryMsg(''); }}
                  className="w-full text-xs text-[#006782] font-bold hover:underline"
                >
                  ¿Olvidaste tu clave? Recuperar acceso
                </button>

                {showRecovery && (
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-[#002546]">Correo de recuperación</label>
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full h-10 px-3 rounded-xl border border-gray-300 bg-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={handlePasswordRecovery}
                      className="w-full h-10 bg-[#006782] text-white rounded-xl text-xs font-bold"
                    >
                      Enviar instrucciones
                    </button>
                    {recoveryMsg && <p className="text-[11px] text-[#002546]">{recoveryMsg}</p>}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleAdminPasswordLogin()}
                  className="w-full h-12 bg-[#002546] hover:bg-[#003666] text-white rounded-xl text-xs font-bold shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-[#57d1fd]" />
                  <span>Ingresar a Administración y Caja</span>
                  <ArrowRight className="w-4 h-4 text-[#57d1fd]" />
                </button>
              </div>
            </div>
          )}

          {/* ================= VIEW: MESONERO ================= */}
          {activeTab === 'waiter' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#002546]">
                    Selecciona tu Cuenta de Mesonero
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    Las cuentas y PINs son dados de alta exclusivamente por el Dueño.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRequestForm(!showRequestForm)}
                  className="text-xs text-[#006782] font-bold hover:underline flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>¿Nuevo mesonero?</span>
                </button>
              </div>

              {/* Formulario de Solicitud Rápida */}
              {showRequestForm && (
                <form onSubmit={handleSendRequest} className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-2xl space-y-2.5 animate-scale-up text-xs">
                  <div className="flex items-center justify-between font-bold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      Solicitar Nueva Cuenta al Dueño
                    </span>
                    <button type="button" onClick={() => setShowRequestForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-tight">
                    Ingresa tus datos. El dueño recibirá tu solicitud en su panel y te asignará tu PIN de 4 dígitos y zona de toldos.
                  </p>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Nombre y Apellido</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Daniel Sánchez"
                      value={reqName}
                      onChange={(e) => setReqName(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-gray-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      required
                      placeholder="+58 412 0000000"
                      value={reqPhone}
                      onChange={(e) => setReqPhone(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-gray-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Zona sugerida o turno</label>
                    <input
                      type="text"
                      placeholder="Ej: Toldos Orilla Playa / Refuerzo"
                      value={reqZone}
                      onChange={(e) => setReqZone(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-gray-300 bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full h-9 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Enviar Solicitud a Gerencia</span>
                  </button>
                </form>
              )}

              {/* Lista de Mesoneros */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {roleUsers.map((user) => {
                  const isSelected = selectedUser?.id === user.id;
                  const isPending = user.status === 'pending_approval' || user.approvedByOwner === false;

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectSpecificUser(user)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        isSelected
                          ? 'bg-[#002546] text-white border-[#002546] shadow-sm'
                          : isPending
                          ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                          : 'bg-[#f8f9ff] text-[#002546] border-gray-200 hover:border-[#006782]'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? 'bg-white/10 text-white'
                            : isPending
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-[#eff4ff] text-[#006782]'
                        }`}
                      >
                        {user.avatar || user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold truncate block">{user.name}</span>
                          {isPending && (
                            <Clock className="w-3 h-3 text-amber-500 shrink-0" title="Pendiente de aprobación" />
                          )}
                        </div>
                        <span className={`text-[10px] truncate block ${isSelected ? 'text-sky-200' : 'text-gray-500'}`}>
                          {isPending ? '⏳ Esperando Aprobación' : user.zone || 'Zona Buche'}
                        </span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#57d1fd] shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* PIN input & Keypad for selected waiter */}
              {selectedUser && (
                <div className="bg-[#f8f9ff] p-3.5 rounded-2xl border border-gray-200 space-y-3">
                  {selectedUser.status === 'pending_approval' ? (
                    <div className="p-3 bg-amber-100 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-700" />
                        Cuenta en espera de aprobación del Dueño
                      </p>
                      <p className="text-[11px] text-amber-800">
                        El dueño debe ingresar a su pestaña de <b>"Personal & Accesos"</b> y presionar <b>"Aprobar y Asignar PIN"</b> para habilitar este usuario.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-[#002546] flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-[#006782]" />
                          <span>PIN de {selectedUser.name} (4 dígitos)</span>
                        </label>
                        <span className="text-[10px] text-gray-400 font-mono">Demo: {selectedUser.pin || '1234'}</span>
                      </div>

                      <div className="relative">
                        <input
                          type="password"
                          maxLength={6}
                          value={pinInput}
                          onChange={(e) => {
                            setPinInput(e.target.value);
                            setErrorMsg('');
                          }}
                          placeholder="••••"
                          className="w-full h-11 text-center text-lg font-mono tracking-widest rounded-xl border border-gray-300 bg-white font-black focus:outline-none focus:border-[#006782]"
                        />
                      </div>

                      <NumericKeypad
                        onPress={handleKeypadPress}
                        onBackspace={handleKeypadBackspace}
                        onClear={handleKeypadClear}
                      />

                      {errorMsg && (
                        <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold">
                          {errorMsg}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleLoginSubmit()}
                        className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
                      >
                        <UtensilsCrossed className="w-4 h-4" />
                        <span>Ingresar como {selectedUser.name.split(' ')[0]}</span>
                        <ArrowRight className="w-4 h-4 text-sky-200" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= VIEW: EXCURSIÓN / LANCHAS ================= */}
          {activeTab === 'excursion' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#002546]">
                    Operadores de Lanchas & Excursiones
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    Control de cupos, paquetes prepagados y aviso náutico por GPS.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRequestForm(!showRequestForm)}
                  className="text-xs text-teal-700 font-bold hover:underline flex items-center gap-1"
                >
                  <Ship className="w-3.5 h-3.5" />
                  <span>¿Nueva Lancha?</span>
                </button>
              </div>

              {/* Formulario de Solicitud de Lancha */}
              {showRequestForm && (
                <form onSubmit={handleSendRequest} className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl space-y-2.5 text-xs animate-scale-up">
                  <div className="flex items-center justify-between font-bold text-teal-900">
                    <span className="flex items-center gap-1.5">
                      <Ship className="w-4 h-4 text-teal-600" />
                      Registrar Nueva Lancha o Capitán
                    </span>
                    <button type="button" onClick={() => setShowRequestForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Nombre del Capitán</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Cap. Pedro Méndez"
                      value={reqName}
                      onChange={(e) => setReqName(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-gray-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Nombre de Embarcación</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Lancha Buche Express"
                      value={reqBoatName}
                      onChange={(e) => setReqBoatName(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-gray-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      required
                      placeholder="+58 414 0000000"
                      value={reqPhone}
                      onChange={(e) => setReqPhone(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-gray-300 bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full h-9 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Ship className="w-3.5 h-3.5" />
                    <span>Enviar Solicitud a la Gerencia</span>
                  </button>
                </form>
              )}

              {/* Lista de Capitanes / Lanchas */}
              <div className="space-y-2">
                {roleUsers.map((user) => {
                  const isSelected = selectedUser?.id === user.id;
                  const isPending = user.status === 'pending_approval' || user.approvedByOwner === false;

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectSpecificUser(user)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-[#002546] text-white border-[#002546] shadow-sm'
                          : isPending
                          ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                          : 'bg-[#f8f9ff] text-[#002546] border-gray-200 hover:border-teal-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-white/10 text-white' : 'bg-teal-100 text-teal-800'}`}>
                          <Ship className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold block">{user.name}</span>
                            {isPending && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500 text-white font-bold">
                                Por Aprobar
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] block ${isSelected ? 'text-teal-200' : 'text-gray-500'}`}>
                            {user.boatName ? `🚤 ${user.boatName}` : user.zone || 'Muelle Buche'}
                          </span>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#57d1fd]" />}
                    </button>
                  );
                })}
              </div>

              {/* PIN input for Excursions */}
              {selectedUser && (
                <div className="bg-[#f8f9ff] p-3.5 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#002546] flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-teal-700" />
                      <span>PIN Náutico (4 dígitos)</span>
                    </label>
                    <span className="text-[10px] text-gray-400 font-mono">Demo: {selectedUser.pin || '5678'}</span>
                  </div>

                  <input
                    type="password"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="••••"
                    className="w-full h-11 text-center text-lg font-mono tracking-widest rounded-xl border border-gray-300 bg-white font-black focus:outline-none focus:border-teal-700"
                  />

                  <NumericKeypad
                    onPress={handleKeypadPress}
                    onBackspace={handleKeypadBackspace}
                    onClear={handleKeypadClear}
                  />

                  {errorMsg && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold">
                      {errorMsg}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleLoginSubmit()}
                    className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
                  >
                    <Ship className="w-4 h-4" />
                    <span>Ingresar a Coordinación de Muelle</span>
                    <ArrowRight className="w-4 h-4 text-teal-200" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= VIEW: COCINA KDS ================= */}
          {activeTab === 'kitchen' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500 text-slate-950 space-y-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-slate-900" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Pantalla KDS de Cocina & Fogones
                  </span>
                </div>
                <h3 className="text-base font-black">Turno de Cocina Central</h3>
                <p className="text-xs text-amber-950 font-medium">
                  Monitoreo de comandas en tiempo real, tiempos de cocción, frituras de pargo y aviso a mesoneros.
                </p>
              </div>

              <div className="bg-[#f8f9ff] p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#002546]">PIN de Fogón / KDS</span>
                  <span className="font-mono text-gray-400">PIN: 0000</span>
                </div>

                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="0000"
                  className="w-full h-11 text-center text-lg font-mono tracking-widest rounded-xl border border-gray-300 bg-white font-black"
                />

                <NumericKeypad
                  onPress={handleKeypadPress}
                  onBackspace={handleKeypadBackspace}
                  onClear={handleKeypadClear}
                />

                {errorMsg && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleLoginSubmit()}
                  className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>Entrar a Pantalla de Cocina KDS</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= VIEW: CLIENTE / TURISTA ================= */}
          {activeTab === 'client' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#006782] to-[#002546] text-white space-y-2 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Umbrella className="w-5 h-5 text-[#57d1fd]" />
                    <span className="text-xs uppercase font-bold tracking-wider text-sky-200">
                      Turista / Comensal
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                    Sin Clave • Acceso Directo
                  </span>
                </div>
                <h3 className="text-base font-bold">Carta Digital Playa Buche</h3>
                <p className="text-xs text-sky-100">
                  Pide directamente desde tu toldo a la cocina, calcula en Bolívares o Dólares y paga con Pago Móvil o Zelle.
                </p>
              </div>

              {/* Selector de Toldo */}
              <div className="bg-[#f8f9ff] p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-[#002546] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#006782]" />
                    <span>Selecciona tu Toldo o Ubicación en Playa</span>
                  </label>
                  <span className="text-[10px] text-gray-500">Toldo #{selectedToldoNum}</span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {['01', '04', '07', '10', '14', '18', '22', '26', 'VIP-A', 'Muelle'].map((toldo) => {
                    const isSelected = selectedToldoNum === toldo;
                    return (
                      <button
                        key={toldo}
                        type="button"
                        onClick={() => setSelectedToldoNum(toldo)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-[#002546] text-white border-[#002546] shadow-xs'
                            : 'bg-white text-[#002546] border-gray-200 hover:border-[#006782]'
                        }`}
                      >
                        {toldo.startsWith('VIP') || toldo === 'Muelle' ? toldo : `#${toldo}`}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handleLoginSubmit()}
                  className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all mt-2"
                >
                  <QrCode className="w-4 h-4 text-[#57d1fd]" />
                  <span>Ingresar como Cliente en Toldo #{selectedToldoNum}</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info & PIN hint toggle */}
        <div className="px-5 py-3 bg-[#f8f9ff] border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
          <button
            type="button"
            onClick={() => setShowHelperPins(!showHelperPins)}
            className="text-[#006782] font-semibold hover:underline flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showHelperPins ? 'Ocultar PINs Demo' : 'Ver PINs de prueba'}</span>
          </button>
          <div className="flex items-center gap-3">
            <a href="/privacy.html" target="_blank" rel="noreferrer" className="text-[10px] text-[#006782] hover:underline">Privacidad</a>
            <a href="/delete-account.html" target="_blank" rel="noreferrer" className="text-[10px] text-[#006782] hover:underline">Eliminar cuenta</a>
          </div>
          <span className="text-[10px] text-gray-400">Bahía de Buche • Conexión Cifrada</span>
        </div>

        {/* Floating helper pins banner */}
        {showHelperPins && (
          <div className="bg-amber-50 border-t border-amber-200 p-3 text-[11px] text-amber-900 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>👑 Dueño: <b>9999</b></div>
            <div>🍽️ Mesoneros: <b>1234</b></div>
            <div>🚤 Excursiones: <b>5678</b></div>
            <div>🍳 Cocina: <b>0000</b></div>
          </div>
        )}
      </div>
    </div>
  );
};

// Numeric touch keypad component for sand/touch devices
interface KeypadProps {
  onPress: (val: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

const NumericKeypad: React.FC<KeypadProps> = ({ onPress, onBackspace, onClear }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="grid grid-cols-3 gap-1.5 pt-1">
      {keys.map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onPress(num)}
          className="h-10 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-sm font-black text-[#002546] shadow-2xs active:scale-95 transition-all"
        >
          {num}
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-600 shadow-2xs active:scale-95 transition-all"
      >
        C
      </button>
      <button
        type="button"
        onClick={() => onPress('0')}
        className="h-10 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-sm font-black text-[#002546] shadow-2xs active:scale-95 transition-all"
      >
        0
      </button>
      <button
        type="button"
        onClick={onBackspace}
        className="h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shadow-2xs active:scale-95 transition-all"
        title="Borrar dígito"
      >
        <Delete className="w-4 h-4" />
      </button>
    </div>
  );
};
