import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { User, UserRole } from '../types';

interface LoginScreenProps {
  onAuthenticated: (user: User) => void;
  onRequestAccess: (role: UserRole, name: string, phone: string, email: string, zone?: string, boatName?: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onAuthenticated,
  onRequestAccess,
}) => {
  const [mode, setMode] = useState<'owner' | 'staff' | 'register'>('owner');
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get('resetToken') || '');
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [requestName, setRequestName] = useState('');
  const [requestPhone, setRequestPhone] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestZone, setRequestZone] = useState('');
  const [requestBoat, setRequestBoat] = useState('');

  const api = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  const loginOwner = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (!email.trim() || !password) {
      setMessage('Escribe el correo y la clave del dueño.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(api + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.user || data.user.role !== 'admin') {
        setMessage(data.message || 'No se pudo iniciar sesión como dueño.');
        return;
      }
      onAuthenticated(data.user);
    } catch {
      setMessage('No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  };

  const loginStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (!email.trim() || !pin) {
      setMessage('Escribe tu correo y el PIN asignado por el dueño.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(api + '/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), pin }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.user) {
        setMessage(data.message || 'Correo o PIN incorrectos, o la cuenta aún no fue aprobada.');
        return;
      }
      onAuthenticated(data.user);
    } catch {
      setMessage('No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  };

  const requestPasswordRecovery = async () => {
    const target = recoveryEmail.trim().toLowerCase();
    if (!target) {
      setRecoveryMessage('Indica el correo del dueño.');
      return;
    }
    try {
      const response = await fetch(api + '/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target }),
      });
      const data = await response.json().catch(() => ({}));
      setRecoveryMessage(data.message || 'Si la cuenta existe, recibirás instrucciones.');
    } catch {
      setRecoveryMessage('No se pudo conectar con el servicio de recuperación.');
    }
  };

  const submitPasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetMessage('');
    if (newPassword.length < 8) {
      setResetMessage('La nueva clave debe tener al menos 8 caracteres.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(api + '/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      setResetMessage(data.message || (response.ok ? 'Clave actualizada correctamente.' : 'No se pudo actualizar la clave.'));
      if (response.ok) {
        window.history.replaceState({}, document.title, window.location.pathname);
        window.setTimeout(() => window.location.reload(), 700);
      }
    } catch {
      setResetMessage('No se pudo conectar con el servicio de recuperación.');
    } finally {
      setBusy(false);
    }
  };

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (!requestName.trim() || !requestPhone.trim() || !requestEmail.trim()) {
      setMessage('Nombre, teléfono y correo son obligatorios.');
      return;
    }
    setBusy(true);
    try {
      await onRequestAccess(
        selectedRole,
        requestName.trim(),
        requestPhone.trim(),
        requestEmail.trim(),
        requestZone.trim(),
        requestBoat.trim()
      );
      setMessage('Solicitud enviada. El dueño debe aprobarla antes de permitir el acceso.');
      setRequestName('');
      setRequestPhone('');
      setRequestEmail('');
      setRequestZone('');
      setRequestBoat('');
    } catch {
      setMessage('No se pudo enviar la solicitud. Inténtalo nuevamente.');
    } finally {
      setBusy(false);
    }
  };

  if (resetToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#002546] via-[#003b5f] to-[#f8f9ff] px-4 py-8 flex items-center justify-center">
        <section className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#006782]">Virgen del Valle</p>
            <h1 className="text-2xl font-black text-[#002546] mt-1">Restablecer clave</h1>
          </div>
          <form onSubmit={submitPasswordReset} className="p-6 space-y-3">
            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" autoComplete="new-password" minLength={8} placeholder="Nueva clave (mínimo 8 caracteres)" className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm" />
            <button disabled={busy} className="w-full h-11 rounded-xl bg-[#002546] text-white font-bold text-sm disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar nueva clave'}</button>
            {resetMessage && <p className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-[#002546]">{resetMessage}</p>}
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#002546] via-[#003b5f] to-[#f8f9ff] px-4 py-8 flex items-center justify-center">
      <section className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/30">
        <div className="p-6 bg-[#002546] text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#57d1fd]">Inversiones Virgen del Valle</p>
          <h1 className="text-2xl font-black mt-1">Acceso a la aplicación</h1>
          <p className="text-xs text-white/70 mt-2">Cada cuenta debe estar autorizada por el dueño.</p>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#f8f9ff] rounded-2xl mb-5">
            <button onClick={() => { setMode('owner'); setMessage(''); }} className={`rounded-xl py-2.5 text-xs font-bold ${mode === 'owner' ? 'bg-[#002546] text-white' : 'text-gray-600'}`}>Dueño</button>
            <button onClick={() => { setMode('staff'); setMessage(''); }} className={`rounded-xl py-2.5 text-xs font-bold ${mode === 'staff' ? 'bg-[#002546] text-white' : 'text-gray-600'}`}>Personal / Cliente</button>
            <button onClick={() => { setMode('register'); setMessage(''); }} className={`rounded-xl py-2.5 text-xs font-bold ${mode === 'register' ? 'bg-[#002546] text-white' : 'text-gray-600'}`}>Registrarse</button>
          </div>

          {mode === 'owner' && (
            <form onSubmit={loginOwner} className="space-y-3">
              <p className="text-sm font-bold text-[#002546]">Acceso exclusivo del dueño</p>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" placeholder="Correo del dueño" className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm" />
              <div className="relative">
                <input value={password} onChange={(e) => setPassword(e.target.value)} type={showSecret ? 'text' : 'password'} autoComplete="current-password" placeholder="Clave del dueño" className="w-full h-11 rounded-xl border border-gray-300 px-3 pr-12 text-sm" />
                <button type="button" onClick={() => setShowSecret(v => !v)} className="absolute right-2 top-2 w-8 h-7 text-xs font-bold text-[#006782]">{showSecret ? 'Ocultar' : 'Ver'}</button>
              </div>
              <button disabled={busy} className="w-full h-11 rounded-xl bg-[#002546] text-white font-bold text-sm">{busy ? 'Verificando…' : 'Entrar como dueño'}</button>
              <button type="button" onClick={() => setRecoveryOpen(v => !v)} className="w-full text-xs text-[#006782] font-bold hover:underline">¿Olvidaste tu clave?</button>
              {recoveryOpen && (
                <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 space-y-2">
                  <input value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} type="email" placeholder="Correo del dueño" className="w-full h-10 rounded-xl border border-gray-300 px-3 text-sm" />
                  <button type="button" onClick={() => void requestPasswordRecovery()} className="w-full h-10 rounded-xl bg-[#006782] text-white text-xs font-bold">Enviar recuperación</button>
                  {recoveryMessage && <p className="text-[11px] text-[#002546]">{recoveryMessage}</p>}
                </div>
              )}
            </form>
          )}

          {mode === 'staff' && (
            <form onSubmit={loginStaff} className="space-y-3">
              <p className="text-sm font-bold text-[#002546]">Acceso con cuenta autorizada</p>
              <p className="text-xs text-gray-500">Usa el correo y PIN que te entregó el dueño.</p>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" placeholder="Correo electrónico" className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm" />
              <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} type="password" inputMode="numeric" placeholder="PIN de 4 a 6 dígitos" className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm tracking-[0.3em]" />
              <button disabled={busy} className="w-full h-11 rounded-xl bg-[#002546] text-white font-bold text-sm">{busy ? 'Verificando…' : 'Iniciar sesión'}</button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={submitRequest} className="space-y-3">
              <p className="text-sm font-bold text-[#002546]">Crear solicitud de acceso</p>
              <p className="text-xs text-gray-500">Tu cuenta quedará pendiente hasta que el dueño la autorice.</p>
              <div className="grid grid-cols-2 gap-2">
                {(['client','waiter','excursion','kitchen'] as UserRole[]).map(role => (
                  <button key={role} type="button" onClick={() => setSelectedRole(role)} className={`rounded-xl border p-2.5 text-xs font-bold ${selectedRole === role ? 'border-[#006782] bg-[#eff4ff] text-[#006782]' : 'border-gray-200 text-gray-600'}`}>
                    {role === 'client' ? 'Cliente' : role === 'waiter' ? 'Mesonero' : role === 'excursion' ? 'Excursiones' : 'Cocina'}
                  </button>
                ))}
              </div>
              <input value={requestName} onChange={(e) => setRequestName(e.target.value)} placeholder="Nombre completo" className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm" />
              <input value={requestEmail} onChange={(e) => setRequestEmail(e.target.value)} type="email" placeholder="Correo electrónico" className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm" />
              <input value={requestPhone} onChange={(e) => setRequestPhone(e.target.value)} placeholder="Teléfono" className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm" />
              {selectedRole !== 'client' && (
                <div className="grid grid-cols-2 gap-2">
                  <input value={requestZone} onChange={(e) => setRequestZone(e.target.value)} placeholder="Zona" className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm" />
                  <input value={requestBoat} onChange={(e) => setRequestBoat(e.target.value)} placeholder="Lancha (si aplica)" className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm" />
                </div>
              )}
              <button disabled={busy} className="w-full h-11 rounded-xl bg-[#006782] text-white font-bold text-sm flex items-center justify-center gap-2"><UserPlus className="w-4 h-4" /> {busy ? 'Enviando…' : 'Enviar registro'}</button>
            </form>
          )}

          {message && <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 p-3 text-xs font-medium">{message}</div>}
        </div>
      </section>
    </div>
  );
};
