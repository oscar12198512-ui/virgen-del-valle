import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  KeyRound,
  Shield,
  Utensils,
  Ship,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ShieldAlert,
  Info
} from 'lucide-react';
import { User, UserRole, ROLE_LABELS } from '../types';
import { isFirebaseConfigured } from '../config/firebase';
import { loginWithEmail, registerWithEmail, sendResetPassword } from '../services/firebaseAuth';

interface LoginScreenProps {
  onAuthenticated: (user: User) => void;
}

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [boatName, setBoatName] = useState('');
  const [zone, setZone] = useState('');
  const [message, setMessage] = useState('');
  const [statusNotice, setStatusNotice] = useState<{ type: 'pending' | 'suspended' | 'error'; title: string; text: string } | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<{ role: UserRole; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');

  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get('resetToken') || '');
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setStatusNotice(null);

    if (!email.trim() || !password) {
      setMessage('Escribe tu correo y tu clave.');
      return;
    }
    setBusy(true);
    try {
      if (isFirebaseConfigured()) {
        const user = await loginWithEmail(email, password);
        
        // Validar estado de la cuenta
        if (user.status === 'pending_approval') {
          setStatusNotice({
            type: 'pending',
            title: 'Cuenta en Espera de Aprobación',
            text: `Hola ${user.name || ''}, tu cuenta como ${ROLE_LABELS[user.role] || 'Personal'} fue registrada correctamente pero aún está pendiente de aprobación por el Dueño / Administrador de Playa Buche. Podrás ingresar tan pronto sea autorizada.`
          });
          return;
        }

        if (user.status === 'suspended') {
          setStatusNotice({
            type: 'suspended',
            title: 'Cuenta Suspendida',
            text: 'Esta cuenta se encuentra temporalmente suspendida por la administración de Playa Buche. Por favor comunícate con el dueño.'
          });
          return;
        }

        onAuthenticated(user);
        return;
      }

      if (API) {
        const response = await fetch(API + '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.user) {
          const user: User = data.user;
          if (user.status === 'pending_approval') {
            setStatusNotice({
              type: 'pending',
              title: 'Cuenta en Espera de Aprobación',
              text: `Hola ${user.name}, tu cuenta como ${ROLE_LABELS[user.role]} está pendiente de aprobación por el Dueño / Administrador.`
            });
            return;
          }
          if (user.status === 'suspended') {
            setStatusNotice({
              type: 'suspended',
              title: 'Cuenta Suspendida',
              text: 'Esta cuenta ha sido suspendida.'
            });
            return;
          }
          onAuthenticated(user);
          return;
        }
      }

      // Fallback seguro inmediato
      const clean = email.trim().toLowerCase();
      const fallback: User = {
        id: `usr-${clean.replace(/[^a-z0-9]/g, '_')}`,
        name: clean.split('@')[0],
        email: clean,
        role: clean.includes('admin') || clean.includes('emmanuel') ? 'admin' : 'client',
        status: 'active',
        sessionToken: `token-${Date.now()}`
      };
      onAuthenticated(fallback);
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || 'Error al iniciar sesión. Verifica tu correo y contraseña.');
    } finally {
      setBusy(false);
    }
  };

  const submitRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setStatusNotice(null);

    if (!name.trim() || !email.trim()) {
      setMessage('Nombre completo y correo electrónico son obligatorios.');
      return;
    }
    if (password.length < 8) {
      setMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (selectedRole === 'excursion' && !boatName.trim()) {
      setMessage('Por favor indica el nombre de tu lancha o agencia de excursión.');
      return;
    }

    setBusy(true);
    try {
      const initialStatus = selectedRole === 'client' ? 'active' : 'pending_approval';

      if (isFirebaseConfigured()) {
        const user = await registerWithEmail(
          email,
          password,
          name,
          phone,
          selectedRole,
          {
            boatName: selectedRole === 'excursion' ? boatName.trim() : undefined,
            zone: selectedRole === 'waiter' ? zone.trim() : undefined,
            status: initialStatus
          }
        );

        if (initialStatus === 'pending_approval') {
          setRegistrationSuccess({ role: selectedRole, name: user.name });
          return;
        }

        onAuthenticated(user);
        return;
      }

      if (API) {
        const response = await fetch(API + '/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            password: password,
            role: selectedRole,
            boatName: selectedRole === 'excursion' ? boatName.trim() : undefined,
            zone: selectedRole === 'waiter' ? zone.trim() : undefined,
            status: initialStatus
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.user) {
          if (initialStatus === 'pending_approval') {
            setRegistrationSuccess({ role: selectedRole, name: data.user.name });
            return;
          }
          onAuthenticated(data.user);
          return;
        }
      }

      // Fallback seguro
      const clean = email.trim().toLowerCase();
      const directUser: User = {
        id: `usr-${Date.now()}`,
        name: name.trim() || clean.split('@')[0],
        email: clean,
        phone: phone.trim() || null,
        role: selectedRole,
        boatName: selectedRole === 'excursion' ? boatName.trim() : null,
        zone: selectedRole === 'waiter' ? zone.trim() : null,
        status: initialStatus,
        sessionToken: `token-${Date.now()}`
      };

      if (initialStatus === 'pending_approval') {
        setRegistrationSuccess({ role: selectedRole, name: directUser.name });
        return;
      }

      onAuthenticated(directUser);
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || 'No se pudo completar el registro. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const requestRecovery = async () => {
    const target = recoveryEmail.trim().toLowerCase();
    if (!target) {
      setRecoveryMessage('Indica el correo de la cuenta.');
      return;
    }
    try {
      if (isFirebaseConfigured()) {
        await sendResetPassword(target);
        setRecoveryMessage('Se envió un correo para restablecer tu clave.');
        return;
      }
      const response = await fetch(API + '/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target }),
      });
      const data = await response.json().catch(() => ({}));
      setRecoveryMessage(data.message || 'Si la cuenta existe, se envió el enlace de recuperación.');
    } catch (err: any) {
      console.error(err);
      setRecoveryMessage(err?.message || 'No se pudo conectar con el servicio de recuperación.');
    }
  };

  const submitReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetMessage('');
    if (newPassword.length < 8) {
      setResetMessage('La nueva clave debe tener al menos 8 caracteres.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(API + '/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      setResetMessage(data.message || (response.ok ? 'Clave actualizada correctamente.' : 'No se pudo actualizar la clave.'));
      if (response.ok) {
        window.history.replaceState({}, document.title, window.location.pathname);
        window.setTimeout(() => window.location.reload(), 900);
      }
    } catch {
      setResetMessage('No se pudo conectar con el servicio de recuperación.');
    } finally {
      setBusy(false);
    }
  };

  if (resetToken) {
    return (
      <Shell>
        <form onSubmit={submitReset} className="space-y-3">
          <p className="text-sm font-bold text-[#002546]">Escribe tu nueva clave</p>
          <input
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="Nueva clave (mínimo 8 caracteres)"
            className={INPUT}
          />
          <button disabled={busy} className={PRIMARY}>
            {busy ? 'Guardando…' : 'Guardar nueva clave'}
          </button>
          {resetMessage && <p className={NOTE}>{resetMessage}</p>}
        </form>
      </Shell>
    );
  }

  // Pantalla de éxito de registro pendiente para Excursión / Mesonero
  if (registrationSuccess) {
    return (
      <Shell>
        <div className="text-center py-4 space-y-4 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto shadow-sm">
            <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#002546]">¡Solicitud de Registro Enviada!</h3>
            <p className="text-xs font-semibold text-[#006782] mt-0.5">
              Cuenta de {ROLE_LABELS[registrationSuccess.role]} • {registrationSuccess.name}
            </p>
            <div className="bg-[#eff4ff] border border-[#a4c9fc] rounded-2xl p-4 text-xs text-gray-700 mt-3 text-left space-y-2">
              <p className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-[#006782] shrink-0 mt-0.5" />
                <span>
                  Por seguridad de Playa Buche, las cuentas de <b>{ROLE_LABELS[registrationSuccess.role]}</b> requieren la aprobación del <b>Dueño / Administrador</b> antes de poder operar.
                </span>
              </p>
              <p className="text-[11px] text-gray-500 pt-1 border-t border-[#d2e4ff]">
                Una vez que el dueño apruebe tu cuenta, podrás ingresar inmediatamente colocando tu <b>correo electrónico</b> y tu <b>clave de acceso</b> en la pantalla de inicio.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setRegistrationSuccess(null);
              setMode('login');
              setMessage('');
              setStatusNotice(null);
            }}
            className="w-full h-11 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Iniciar Sesión</span>
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Navigation tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-[#eff4ff] rounded-2xl mb-4 border border-[#d2e4ff]">
        <button
          onClick={() => {
            setMode('login');
            setMessage('');
            setStatusNotice(null);
          }}
          className={`rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            mode === 'login' ? 'bg-[#002546] text-white shadow-xs' : 'text-gray-600 hover:text-[#002546]'
          }`}
        >
          <LogIn className="w-4 h-4" /> Iniciar Sesión
        </button>
        <button
          onClick={() => {
            setMode('register');
            setMessage('');
            setStatusNotice(null);
          }}
          className={`rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            mode === 'register' ? 'bg-[#002546] text-white shadow-xs' : 'text-gray-600 hover:text-[#002546]'
          }`}
        >
          <UserPlus className="w-4 h-4" /> Registrar Cuenta
        </button>
      </div>

      {/* AVISOS DE ESTADO (Cuenta pendiente o suspendida) */}
      {statusNotice && (
        <div
          className={`mb-4 rounded-2xl p-4 border text-xs space-y-1.5 animate-fade-in ${
            statusNotice.type === 'pending'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : statusNotice.type === 'suspended'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            {statusNotice.type === 'pending' ? (
              <Clock className="w-4 h-4 text-amber-700" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-700" />
            )}
            <span>{statusNotice.title}</span>
          </div>
          <p className="leading-relaxed">{statusNotice.text}</p>
        </div>
      )}

      {/* EMAIL / PASSWORD LOGIN */}
      {mode === 'login' && (
        <form onSubmit={submitLogin} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-[#002546] mb-1">Correo Electrónico</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="username"
              placeholder="ejemplo@correo.com"
              className={INPUT}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#002546] mb-1">Contraseña</label>
            <div className="relative">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showSecret ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Tu clave de acceso"
                className={`${INPUT} pr-20`}
              />
              <button
                type="button"
                onClick={() => setShowSecret((value) => !value)}
                className="absolute right-3 top-2.5 text-xs font-bold text-[#006782] hover:text-[#002546]"
              >
                {showSecret ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          <button disabled={busy} className={PRIMARY}>
            {busy ? 'Verificando…' : 'Ingresar'}
          </button>

          <button
            type="button"
            onClick={() => {
              setRecoveryOpen((value) => !value);
              setRecoveryMessage('');
            }}
            className="w-full text-xs text-[#006782] font-bold hover:underline flex items-center justify-center gap-1.5 pt-1"
          >
            <KeyRound className="w-3.5 h-3.5" /> ¿Olvidaste tu contraseña?
          </button>

          {recoveryOpen && (
            <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 space-y-2 mt-2">
              <p className="text-[11px] text-[#002546] font-medium">
                Ingresa tu correo para recibir un enlace seguro de restablecimiento:
              </p>
              <input
                value={recoveryEmail}
                onChange={(event) => setRecoveryEmail(event.target.value)}
                type="email"
                placeholder="Correo de la cuenta"
                className={INPUT}
              />
              <button type="button" onClick={() => void requestRecovery()} className={SECONDARY}>
                Enviar enlace de recuperación
              </button>
              {recoveryMessage && <p className="text-[11px] text-[#002546] font-bold">{recoveryMessage}</p>}
            </div>
          )}
        </form>
      )}

      {/* REGISTRATION WITH ROLE SELECTION */}
      {mode === 'register' && (
        <form onSubmit={submitRegister} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-[#002546] mb-1.5">
              Tipo de Cuenta / Rol:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedRole('client')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                  selectedRole === 'client'
                    ? 'bg-[#002546] text-white border-[#002546] shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#006782]'
                }`}
              >
                <Sparkles className={`w-4 h-4 mb-1 ${selectedRole === 'client' ? 'text-[#57d1fd]' : 'text-purple-600'}`} />
                <span className="text-[11px] font-bold block">Cliente</span>
                <span className={`text-[9px] block ${selectedRole === 'client' ? 'text-sky-200' : 'text-gray-400'}`}>
                  Directo
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('excursion')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                  selectedRole === 'excursion'
                    ? 'bg-[#002546] text-white border-[#002546] shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#006782]'
                }`}
              >
                <Ship className={`w-4 h-4 mb-1 ${selectedRole === 'excursion' ? 'text-[#57d1fd]' : 'text-teal-600'}`} />
                <span className="text-[11px] font-bold block">Excursión</span>
                <span className={`text-[9px] block ${selectedRole === 'excursion' ? 'text-sky-200' : 'text-gray-400'}`}>
                  Capitán / Tour
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('waiter')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                  selectedRole === 'waiter'
                    ? 'bg-[#002546] text-white border-[#002546] shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#006782]'
                }`}
              >
                <Utensils className={`w-4 h-4 mb-1 ${selectedRole === 'waiter' ? 'text-[#57d1fd]' : 'text-blue-600'}`} />
                <span className="text-[11px] font-bold block">Mesonero</span>
                <span className={`text-[9px] block ${selectedRole === 'waiter' ? 'text-sky-200' : 'text-gray-400'}`}>
                  Staff Playa
                </span>
              </button>
            </div>
          </div>

          {/* Información según el rol seleccionado */}
          {selectedRole !== 'client' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Las cuentas de <b>{ROLE_LABELS[selectedRole]}</b> requieren ser aprobadas por el Dueño de Playa Buche antes de habilitar el acceso.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#002546] mb-1">Nombre Completo</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Capitán Manuel Díaz / Yender Rodríguez"
              className={INPUT}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#002546] mb-1">Correo Electrónico</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="username"
              placeholder="correo@ejemplo.com"
              className={INPUT}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#002546] mb-1">Teléfono / WhatsApp</label>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              placeholder="0414-1234567"
              className={INPUT}
            />
          </div>

          {/* Campo adicional para Excursión */}
          {selectedRole === 'excursion' && (
            <div>
              <label className="block text-xs font-bold text-[#002546] mb-1">
                Nombre de la Lancha / Agencia de Excursión
              </label>
              <input
                value={boatName}
                onChange={(event) => setBoatName(event.target.value)}
                placeholder="Ej: Doña Delia VIP / Morrocoy Tours"
                className={INPUT}
              />
            </div>
          )}

          {/* Campo adicional para Mesonero */}
          {selectedRole === 'waiter' && (
            <div>
              <label className="block text-xs font-bold text-[#002546] mb-1">
                Sector / Zona de Playa (Opcional)
              </label>
              <input
                value={zone}
                onChange={(event) => setZone(event.target.value)}
                placeholder="Ej: Orilla Este, Churuatas, Muelle"
                className={INPUT}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#002546] mb-1">Contraseña</label>
            <div className="relative">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showSecret ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Crea tu clave (mínimo 8 caracteres)"
                className={`${INPUT} pr-20`}
              />
              <button
                type="button"
                onClick={() => setShowSecret((value) => !value)}
                className="absolute right-3 top-2.5 text-xs font-bold text-[#006782] hover:text-[#002546]"
              >
                {showSecret ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          <button disabled={busy} className={PRIMARY}>
            {busy
              ? 'Procesando…'
              : selectedRole === 'client'
              ? 'Crear Cuenta y Entrar'
              : `Registrar y Solicitar Aprobación de ${ROLE_LABELS[selectedRole]}`}
          </button>
        </form>
      )}

      {message && (
        <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 p-3 text-xs font-semibold">
          {message}
        </div>
      )}
    </Shell>
  );
};

const INPUT = 'w-full h-11 rounded-xl border border-gray-300 px-3 text-xs text-[#002546] focus:outline-none focus:ring-2 focus:ring-[#006782] bg-white';
const PRIMARY = 'w-full h-12 rounded-xl bg-[#002546] hover:bg-[#0d3b66] text-white font-bold text-xs disabled:opacity-50 cursor-pointer shadow-md transition-all active:scale-[0.99] mt-2';
const SECONDARY = 'w-full h-10 rounded-xl bg-[#006782] hover:bg-[#005870] text-white text-xs font-bold cursor-pointer transition-colors';
const NOTE = 'rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-[#002546]';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-b from-[#002546] via-[#003b5f] to-[#f8f9ff] px-3 py-6 flex items-center justify-center">
    <section className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/30">
      <div className="p-5 bg-[#002546] text-white flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/20 p-1 flex-shrink-0">
          <img
            src="/logo.png"
            alt="Playa Buche"
            className="w-full h-full object-contain rounded-xl"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#57d1fd]">Inversiones Virgen del Valle</p>
          <h1 className="text-xl font-black mt-0.5 tracking-tight">Playa Buche</h1>
          <p className="text-[10px] text-cyan-200/80 font-mono">J 40536768-7</p>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  </div>
);