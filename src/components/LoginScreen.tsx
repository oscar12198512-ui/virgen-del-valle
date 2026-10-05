import React, { useState } from 'react';
import { LogIn, UserPlus, KeyRound, Ship } from 'lucide-react';
import { User } from '../types';

interface LoginScreenProps {
  onAuthenticated: (user: User) => void;
}

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function postJson(path: string, body: unknown) {
  const response = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
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

  if (!API) {
    return (
      <Shell>
        <p className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
          Falta configurar <code>VITE_API_URL</code> para apuntar a la API de producción.
        </p>
      </Shell>
    );
  }

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (!email.trim() || !password) {
      setMessage('Escribe tu correo y tu clave.');
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await postJson('/api/auth/login', { email: email.trim().toLowerCase(), password });
      if (!ok || !data.user) {
        setMessage(data.message || 'No se pudo iniciar sesión.');
        return;
      }
      onAuthenticated(data.user);
    } catch {
      setMessage('No se pudo conectar con el servidor.');
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
      const { ok, data } = await postJson('/api/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });
      if (!ok || !data.user) {
        setMessage(data.message || 'No se pudo crear la cuenta.');
        return;
      }
      onAuthenticated(data.user);
    } catch {
      setMessage('No se pudo conectar con el servidor.');
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
      const { data } = await postJson('/api/auth/request-reset', { email: target });
      setRecoveryMessage(data.message || 'Si la cuenta existe, se envió el enlace de recuperación.');
    } catch {
      setRecoveryMessage('No se pudo conectar con el servicio de recuperación.');
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
      const { ok, data } = await postJson('/api/auth/reset-password', { token: resetToken, password: newPassword });
      setResetMessage(data.message || (ok ? 'Clave actualizada correctamente.' : 'No se pudo actualizar la clave.'));
      if (ok) {
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
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#f8f9ff] rounded-2xl mb-5">
        <button
          onClick={() => {
            setMode('login');
            setMessage('');
          }}
          className={`rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 ${mode === 'login' ? 'bg-[#002546] text-white' : 'text-gray-600'}`}
        >
          <LogIn className="w-3.5 h-3.5" /> Iniciar sesión
        </button>
        <button
          onClick={() => {
            setMode('register');
            setMessage('');
          }}
          className={`rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 ${mode === 'register' ? 'bg-[#002546] text-white' : 'text-gray-600'}`}
        >
          <UserPlus className="w-3.5 h-3.5" /> Registrarse
        </button>
      </div>

      {mode === 'login' && (
        <form onSubmit={submitLogin} className="space-y-3">
          <p className="text-sm font-bold text-[#002546]">Acceso a Playa Buche</p>
          <p className="text-xs text-gray-500">Dueño, personal autorizado y clientes usan esta misma pantalla.</p>
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
            <KeyRound className="w-3.5 h-3.5" /> ¿Olvidaste tu clave o tu usuario?
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

      {mode === 'register' && (
        <form onSubmit={submitRegister} className="space-y-3">
          <p className="text-sm font-bold text-[#002546]">Crear cuenta de cliente</p>
          <p className="text-xs text-gray-500">
            Tu cuenta queda activa de inmediato. Las cuentas de mesonero, cocina, excursiones y otros dueños las crea el dueño desde su panel.
          </p>
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
const PRIMARY = 'w-full h-11 rounded-xl bg-[#002546] text-white font-bold text-sm disabled:opacity-50';
const SECONDARY = 'w-full h-10 rounded-xl bg-[#006782] text-white text-xs font-bold';
const NOTE = 'rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-[#002546]';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-b from-[#002546] via-[#003b5f] to-[#f8f9ff] px-4 py-8 flex items-center justify-center">
    <section className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/30">
      <div className="p-6 bg-[#002546] text-white flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
          <Ship className="w-5 h-5 text-[#57d1fd]" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#57d1fd]">Inversiones Virgen del Valle</p>
          <h1 className="text-2xl font-black mt-0.5">Playa Buche</h1>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  </div>
);