import React, { useMemo, useState } from 'react';
import { Crown, LogIn, KeyRound, Mail, Lock, UserPlus, Umbrella, Ship, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { User, UserRole } from '../types';

interface LoginScreenProps {
  users: User[];
  onAuthenticated: (user: User) => void;
  onContinueAsClient: () => void;
  onRequestAccess: (role: UserRole, name: string, phone: string, email: string, zone?: string, boatName?: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  onAuthenticated,
  onContinueAsClient,
  onRequestAccess,
}) => {
  const [mode, setMode] = useState<'staff' | 'owner' | 'request'>('staff');
  const [selectedRole, setSelectedRole] = useState<UserRole>('waiter');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [message, setMessage] = useState('');
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get('resetToken') || '');
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestPhone, setRequestPhone] = useState('+58 ');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestZone, setRequestZone] = useState('');
  const [requestBoat, setRequestBoat] = useState('');

  const staffUsers = useMemo(
    () => users.filter((u) => u.role === selectedRole && u.status !== 'pending_approval'),
    [users, selectedRole]
  );

  const selectRole = (role: UserRole) => {
    setSelectedRole(role);
    setSelectedUserId('');
    setEmail('');
    setPin('');
    setMessage('');
  };

  const selectUser = (id: string) => {
    setSelectedUserId(id);
    const user = users.find((u) => u.id === id);
    if (user) setEmail(user.email);
    setPin('');
    setMessage('');
  };

  const loginStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !pin) {
      setMessage('Selecciona tu usuario e introduce el PIN asignado por el dueño.');
      return;
    }
    setBusy(true);
    try {
      const api = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const response = await fetch(api + '/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, pin }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.user) {
        setMessage(data.message || 'No se pudo iniciar sesión.');
        return;
      }
      onAuthenticated(data.user);
    } catch {
      setMessage('No se pudo conectar con el servidor. Revisa la conexión e inténtalo nuevamente.');
    } finally {
      setBusy(false);
    }
  };

  const loginOwner = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !password) {
      setMessage('Escribe el correo del dueño y la clave.');
      return;
    }
    setBusy(true);
    try {
      const api = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const response = await fetch(api + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.user) {
        setMessage(data.message || 'Correo o clave incorrectos.');
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
      setRecoveryMessage('Indica el correo de la cuenta.');
      return;
    }
    try {
      const api = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
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
      const api = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
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

  const submitRequest = (event: React.FormEvent) => {
    event.preventDefault();
    if (!requestName.trim() || !requestPhone.trim() || !requestEmail.trim()) {
      setMessage('Nombre, teléfono y correo son obligatorios.');
      return;
    }
    onRequestAccess(
      selectedRole,
      requestName.trim(),
      requestPhone.trim(),
      requestEmail.trim(),
      requestZone.trim(),
      requestBoat.trim()
    );
    setMessage('Solicitud enviada. El dueño debe aprobarla y asignarte un PIN.');
    setRequestName('');
    setRequestPhone('+58 ');
    setRequestEmail('');
    setRequestZone('');
    setRequestBoat('');
    setMode('staff');
  };

  if (resetToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#002546] via-[#003b5f] to-[#f8f9ff] px-4 py-8 flex items-center justify-center">
        <section className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-white/30 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#006782]">Virgen del Valle</p>
            <h1 className="text-2xl font-black text-[#002546] mt-1">Restablecer clave</h1>
            <p className="text-xs text-gray-500 mt-2">Este enlace es independiente del menú operativo.</p>
          </div>
          <form onSubmit={submitPasswordReset} className="p-6 space-y-3">
            <label className="text-xs font-bold text-[#002546]">Nueva clave</label>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm"
            />
            <button disabled={busy} className="w-full h-11 rounded-xl bg-[#002546] text-white font-bold text-sm disabled:opacity-50">
              {busy ? 'Guardando…' : 'Guardar nueva clave'}
            </button>
            {resetMessage && <p className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-[#002546]">{resetMessage}</p>}
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#002546] via-[#003b5f] to-[#f8f9ff] px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] gap-5 items-stretch">
        <section className="hidden lg:flex rounded-[2rem] bg-white/10 border border-white/20 text-white p-8 flex-col justify-between backdrop-blur-xl">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mb-5">
              <Ship className="w-7 h-7 text-[#57d1fd]" />
            </div>
            <p className="text-xs font-black tracking-[0.2em] text-[#57d1fd] uppercase">Inversiones Virgen del Valle</p>
            <h1 className="text-4xl font-black mt-2 leading-tight">Centro operativo de Playa Buche</h1>
            <p className="mt-4 text-white/75 leading-relaxed">
              Accede a tu módulo con la cuenta asignada. El dueño controla altas, permisos y PIN de cada trabajador.
            </p>
          </div>
          <div className="space-y-3 text-sm text-white/80">
            <div className="flex gap-2 items-center"><ShieldCheck className="w-4 h-4 text-[#57d1fd]" /> Sesiones protegidas por el servidor</div>
            <div className="flex gap-2 items-center"><KeyRound className="w-4 h-4 text-[#57d1fd]" /> PIN individual para personal operativo</div>
            <div className="flex gap-2 items-center"><Umbrella className="w-4 h-4 text-[#57d1fd]" /> Carta pública disponible para clientes</div>
          </div>
        </section>

        <section className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/30">
          <div className="p-5 sm:p-7 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#eff4ff] flex items-center justify-center text-[#006782]">
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#006782]">Virgen del Valle</p>
                <h2 className="text-xl font-black text-[#002546]">Inicio de sesión</h2>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Esta pantalla es independiente del selector de roles interno.</p>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#f8f9ff] rounded-2xl mb-5">
              <button onClick={() => { setMode('staff'); setMessage(''); }} className={`rounded-xl py-2.5 text-xs font-bold ${mode === 'staff' ? 'bg-[#002546] text-white' : 'text-gray-600'}`}>Personal</button>
              <button onClick={() => { setMode('owner'); setMessage(''); }} className={`rounded-xl py-2.5 text-xs font-bold ${mode === 'owner' ? 'bg-[#002546] text-white' : 'text-gray-600'}`}>Dueño</button>
              <button onClick={() => { setMode('request'); setMessage(''); }} className={`rounded-xl py-2.5 text-xs font-bold ${mode === 'request' ? 'bg-[#002546] text-white' : 'text-gray-600'}`}>Solicitar acceso</button>
            </div>

            {mode === 'request' && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(['client','waiter','excursion','kitchen'] as UserRole[]).map((role) => (
                  <button key={role} type="button" onClick={() => { setSelectedRole(role); setMessage(''); }} className={`rounded-xl border p-2 text-center text-[11px] font-bold ${selectedRole === role ? 'border-[#006782] bg-[#eff4ff] text-[#006782]' : 'border-gray-200 text-gray-600'}`}>
                    {role === 'client' ? 'Cliente' : role === 'waiter' ? 'Mesonero' : role === 'excursion' ? 'Excursiones' : 'Cocina'}
                  </button>
                ))}
              </div>
            )}

            {mode !== 'request' && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(['waiter','excursion','kitchen'] as UserRole[]).map((role) => (
                  <button key={role} type="button" onClick={() => selectRole(role)} className={`rounded-xl border p-2 text-center text-[11px] font-bold ${selectedRole === role ? 'border-[#006782] bg-[#eff4ff] text-[#006782]' : 'border-gray-200 text-gray-600'}`}>
                    {role === 'waiter' ? 'Mesonero' : role === 'excursion' ? 'Excursiones' : 'Cocina'}
                  </button>
                ))}
              </div>
            )}

            {mode === 'staff' && (
              <form onSubmit={loginStaff} className="space-y-3">
                <select value={selectedUserId} onChange={(e) => selectUser(e.target.value)} className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm text-[#002546] bg-white">
                  <option value="">Selecciona tu usuario</option>
                  {staffUsers.map((u) => <option key={u.id} value={u.id}>{u.name} • {u.email}</option>)}
                </select>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Correo del usuario" className="w-full h-11 rounded-xl border border-gray-300 pl-10 pr-3 text-sm" />
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g,'').slice(0,6))} type="password" inputMode="numeric" autoComplete="current-password" placeholder="PIN asignado por el dueño" className="w-full h-11 rounded-xl border border-gray-300 pl-10 pr-10 text-sm tracking-[0.3em]" />
                </div>
                <button disabled={busy} className="w-full h-11 rounded-xl bg-[#002546] text-white font-bold text-sm disabled:opacity-50">{busy ? 'Verificando…' : 'Iniciar sesión'}</button>
              </form>
            )}

            {mode === 'owner' && (
              <form onSubmit={loginOwner} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" placeholder="Correo del dueño" className="w-full h-11 rounded-xl border border-gray-300 pl-10 pr-3 text-sm" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <input value={password} onChange={(e) => setPassword(e.target.value)} type={showSecret ? 'text' : 'password'} autoComplete="current-password" placeholder="Clave del dueño" className="w-full h-11 rounded-xl border border-gray-300 pl-10 pr-10 text-sm" />
                  <button type="button" onClick={() => setShowSecret((v) => !v)} className="absolute right-2 top-2.5 w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">{showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
                <button disabled={busy} className="w-full h-11 rounded-xl bg-[#002546] text-white font-bold text-sm disabled:opacity-50">{busy ? 'Verificando…' : 'Entrar como dueño'}</button>
                <button type="button" onClick={() => { setRecoveryOpen((v) => !v); setRecoveryMessage(''); }} className="w-full text-xs text-[#006782] font-bold hover:underline">¿Olvidaste tu clave?</button>
                {recoveryOpen && (
                  <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 space-y-2">
                    <input value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} type="email" placeholder="Correo de recuperación" className="w-full h-10 rounded-xl border border-gray-300 px-3 text-sm" />
                    <button type="button" onClick={() => void requestPasswordRecovery()} className="w-full h-10 rounded-xl bg-[#006782] text-white text-xs font-bold">Enviar instrucciones</button>
                    {recoveryMessage && <p className="text-[11px] text-[#002546]">{recoveryMessage}</p>}
                  </div>
                )}
              </form>
            )}

            {mode === 'request' && (
              <form onSubmit={submitRequest} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {(['waiter','excursion','kitchen'] as UserRole[]).map((role) => (
                    <button key={role} type="button" onClick={() => selectRole(role)} className={`rounded-xl border p-2 text-xs font-bold ${selectedRole === role ? 'border-[#006782] bg-[#eff4ff] text-[#006782]' : 'border-gray-200 text-gray-600'}`}>
                      {role === 'waiter' ? 'Mesonero' : role === 'excursion' ? 'Excursión' : 'Cocina'}
                    </button>
                  ))}
                </div>
                <input value={requestName} onChange={(e) => setRequestName(e.target.value)} placeholder="Nombre completo" className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm" />
                <input value={requestEmail} onChange={(e) => setRequestEmail(e.target.value)} type="email" placeholder="Correo electrónico" className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm" />
                <input value={requestPhone} onChange={(e) => setRequestPhone(e.target.value)} placeholder="Teléfono" className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={requestZone} onChange={(e) => setRequestZone(e.target.value)} placeholder="Zona" className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm" />
                  <input value={requestBoat} onChange={(e) => setRequestBoat(e.target.value)} placeholder="Lancha (si aplica)" className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm" />
                </div>
                <button className="w-full h-11 rounded-xl bg-[#006782] text-white font-bold text-sm flex items-center justify-center gap-2"><UserPlus className="w-4 h-4" /> Enviar solicitud</button>
              </form>
            )}

            {message && <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 p-3 text-xs font-medium">{message}</div>}

            <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
              <button onClick={onContinueAsClient} className="w-full h-10 rounded-xl bg-[#eff4ff] text-[#002546] font-bold text-xs flex items-center justify-center gap-2">
                <Umbrella className="w-4 h-4" /> Continuar como cliente / carta digital
              </button>
              <p className="text-[10px] text-gray-400 text-center">El acceso operativo requiere una cuenta activa. No se muestran PIN de demostración.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
