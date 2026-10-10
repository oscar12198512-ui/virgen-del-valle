import React, { useState } from 'react';
import { LogIn, UserPlus, KeyRound, Shield, Utensils, Flame, Ship, UserCheck, Sparkles, ArrowRight } from 'lucide-react';
import { User, UserRole } from '../types';
import { isFirebaseConfigured } from '../config/firebase';
import { loginWithEmail, registerWithEmail, sendResetPassword } from '../services/firebaseAuth';

interface LoginScreenProps {
  onAuthenticated: (user: User) => void;
}

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const PRECONFIGURED_STAFF: Array<{
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  roleTitle: string;
  badgeColor: string;
  icon: React.ElementType;
}> = [
  {
    id: 'admin-emmanuel',
    name: 'Emmanuel Mejías',
    email: 'emmanuelmejias2616@gmail.com',
    phone: '04127939128',
    role: 'admin',
    roleTitle: 'Dueño / Administrador General',
    badgeColor: 'from-amber-500 to-amber-600 text-slate-950',
    icon: Shield,
  },
  {
    id: 'waiter-carlos',
    name: 'Carlos Mendoza',
    email: 'carlos.mesonero@playabuche.com',
    phone: '04141112233',
    role: 'waiter',
    roleTitle: 'Mesonero • Playa VIP & Muelle',
    badgeColor: 'from-sky-500 to-blue-600 text-white',
    icon: Utensils,
  },
  {
    id: 'kitchen-chef',
    name: 'Chef Principal Buche',
    email: 'cocina@playabuche.com',
    phone: '04123334455',
    role: 'kitchen',
    roleTitle: 'Jefe de Cocina • KDS & Fuego',
    badgeColor: 'from-rose-500 to-red-600 text-white',
    icon: Flame,
  },
  {
    id: 'excursion-capitan',
    name: 'Capitán Manuel Díaz',
    email: 'excursiones@playabuche.com',
    phone: '04169998877',
    role: 'excursion',
    roleTitle: 'Capitán • Lancha & Full Day',
    badgeColor: 'from-teal-500 to-emerald-600 text-white',
    icon: Ship,
  },
  {
    id: 'client-guest',
    name: 'Cliente Playero',
    email: 'cliente@playabuche.com',
    phone: '04140000000',
    role: 'client',
    roleTitle: 'Turista • Menú Digital & Pedidos',
    badgeColor: 'from-indigo-500 to-purple-600 text-white',
    icon: Sparkles,
  },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'quick' | 'login' | 'register'>('quick');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');

  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get('resetToken') || '');
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleQuickLogin = (staff: (typeof PRECONFIGURED_STAFF)[0]) => {
    const user: User = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      status: 'active',
      sessionToken: `token-${staff.id}-${Date.now()}`,
    };
    onAuthenticated(user);
  };

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (!email.trim() || !password) {
      setMessage('Escribe tu correo y tu clave.');
      return;
    }
    setBusy(true);
    try {
      if (isFirebaseConfigured()) {
        const user = await loginWithEmail(email, password);
        onAuthenticated(user);
        return;
      }
      if (!API) {
        setMessage('Configura las credenciales de Firebase en el archivo .env');
        return;
      }
      const response = await fetch(API + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.user) {
        setMessage(data.message || 'No se pudo iniciar sesión.');
        return;
      }
      onAuthenticated(data.user);
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || 'No se pudo conectar con el servicio de autenticación.');
    } finally {
      setBusy(false);
    }
  };

  const submitRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setMessage('Nombre, teléfono y correo son obligatorios.');
      return;
    }
    if (password.length < 8) {
      setMessage('La clave debe tener al menos 8 caracteres.');
      return;
    }
    setBusy(true);
    try {
      if (isFirebaseConfigured()) {
        const user = await registerWithEmail(email, password, name, phone, 'client');
        onAuthenticated(user);
        return;
      }
      if (!API) {
        setMessage('Configura las credenciales de Firebase en el archivo .env');
        return;
      }
      const response = await fetch(API + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.user) {
        setMessage(data.message || 'No se pudo crear la cuenta.');
        return;
      }
      onAuthenticated(data.user);
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || 'No se pudo conectar con el servidor.');
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

  return (
    <Shell>
      {/* Navigation tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-[#eff4ff] rounded-2xl mb-4 border border-[#d2e4ff]">
        <button
          onClick={() => {
            setMode('quick');
            setMessage('');
          }}
          className={`rounded-xl py-2 text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
            mode === 'quick' ? 'bg-[#002546] text-white shadow-xs' : 'text-gray-600 hover:text-[#002546]'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" /> Acceso Rápido
        </button>
        <button
          onClick={() => {
            setMode('login');
            setMessage('');
          }}
          className={`rounded-xl py-2 text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
            mode === 'login' ? 'bg-[#002546] text-white shadow-xs' : 'text-gray-600 hover:text-[#002546]'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" /> Con Clave
        </button>
        <button
          onClick={() => {
            setMode('register');
            setMessage('');
          }}
          className={`rounded-xl py-2 text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
            mode === 'register' ? 'bg-[#002546] text-white shadow-xs' : 'text-gray-600 hover:text-[#002546]'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" /> Registro
        </button>
      </div>

      {/* QUICK ACCESS PROFILES */}
      {mode === 'quick' && (
        <div className="space-y-2.5">
          <div className="text-left mb-2">
            <h3 className="text-sm font-extrabold text-[#002546]">Selecciona tu Perfil de Operación</h3>
            <p className="text-[11px] text-gray-500">
              Ingreso directo optimizado para el equipo en playa y turistas.
            </p>
          </div>

          <div className="space-y-2">
            {PRECONFIGURED_STAFF.map((staff) => {
              const IconComp = staff.icon;
              return (
                <button
                  key={staff.id}
                  onClick={() => handleQuickLogin(staff)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-white border border-gray-200 hover:border-[#006782] shadow-xs hover:shadow-md transition-all group text-left cursor-pointer active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${staff.badgeColor} flex items-center justify-center shadow-xs`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#002546] group-hover:text-[#006782]">
                        {staff.name}
                      </h4>
                      <p className="text-[10px] text-gray-500">{staff.roleTitle}</p>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-gray-50 group-hover:bg-[#eff4ff] flex items-center justify-center text-gray-400 group-hover:text-[#006782] transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* EMAIL / PASSWORD LOGIN */}
      {mode === 'login' && (
        <form onSubmit={submitLogin} className="space-y-3">
          <p className="text-sm font-bold text-[#002546]">Acceso con Correo & Clave</p>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="username"
            placeholder="Correo electrónico"
            className={INPUT}
          />
          <div className="relative">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showSecret ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Tu clave"
              className={`${INPUT} pr-20`}
            />
            <button type="button" onClick={() => setShowSecret((value) => !value)} className="absolute right-2 top-2.5 text-xs font-bold text-[#006782]">
              {showSecret ? 'Ocultar' : 'Ver'}
            </button>
          </div>
          <button disabled={busy} className={PRIMARY}>
            {busy ? 'Verificando…' : 'Entrar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setRecoveryOpen((value) => !value);
              setRecoveryMessage('');
            }}
            className="w-full text-xs text-[#006782] font-bold hover:underline flex items-center justify-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" /> ¿Olvidaste tu clave?
          </button>
          {recoveryOpen && (
            <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 space-y-2">
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
              {recoveryMessage && <p className="text-[11px] text-[#002546]">{recoveryMessage}</p>}
            </div>
          )}
        </form>
      )}

      {/* REGISTRATION */}
      {mode === 'register' && (
        <form onSubmit={submitRegister} className="space-y-3">
          <p className="text-sm font-bold text-[#002546]">Crear cuenta de cliente</p>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre completo" className={INPUT} />
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" placeholder="Correo electrónico" className={INPUT} />
          <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" placeholder="Teléfono" className={INPUT} />
          <div className="relative">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showSecret ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Crea tu clave (mínimo 8 caracteres)"
              className={`${INPUT} pr-20`}
            />
            <button type="button" onClick={() => setShowSecret((value) => !value)} className="absolute right-2 top-2.5 text-xs font-bold text-[#006782]">
              {showSecret ? 'Ocultar' : 'Ver'}
            </button>
          </div>
          <button disabled={busy} className={PRIMARY}>
            {busy ? 'Creando cuenta…' : 'Crear cuenta y entrar'}
          </button>
        </form>
      )}

      {message && <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 p-3 text-xs font-medium">{message}</div>}
    </Shell>
  );
};

const INPUT = 'w-full h-11 rounded-xl border border-gray-300 px-3 text-sm';
const PRIMARY = 'w-full h-11 rounded-xl bg-[#002546] text-white font-bold text-sm disabled:opacity-50 cursor-pointer';
const SECONDARY = 'w-full h-10 rounded-xl bg-[#006782] text-white text-xs font-bold cursor-pointer';
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