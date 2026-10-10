import React, { useMemo, useState } from 'react';
import {
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Trash2,
  KeyRound,
  Ban,
  CheckCircle2,
  Clock,
  Check,
  X,
  Ship,
  Utensils,
  Sparkles,
  Phone
} from 'lucide-react';
import { ROLE_LABELS, User, UserRole } from '../types';
import { isFirebaseConfigured } from '../config/firebase';
import {
  saveUserToFirestore,
  deleteUserFromFirestore,
  fetchUsersFromFirestore
} from '../services/firebaseDb';

interface OwnerStaffManagerProps {
  users: User[];
  apiBase: string;
  authHeaders: () => Record<string, string>;
  onUsersChanged: (users: User[]) => void;
  currentUserId: string;
}

const STAFF_ROLES: UserRole[] = ['waiter', 'kitchen', 'excursion', 'admin'];

const emptyForm = () => ({
  id: '',
  name: '',
  email: '',
  phone: '',
  role: 'waiter' as UserRole,
  zone: '',
  boatName: '',
  password: '',
});

export const OwnerStaffManager: React.FC<OwnerStaffManagerProps> = ({
  users,
  apiBase,
  authHeaders,
  onUsersChanged,
  currentUserId,
}) => {
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Solicitudes pendientes de aprobación (Excursión, Mesoneros, etc.)
  const pendingUsers = useMemo(
    () => users.filter((user) => user.status === 'pending_approval'),
    [users]
  );

  // Cuentas activas o suspendidas de staff
  const roster = useMemo(
    () =>
      users
        .filter((user) => user.role !== 'client' && user.status !== 'pending_approval')
        .sort((a, b) => a.role.localeCompare(b.role)),
    [users]
  );

  const request = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(apiBase + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo completar la operación.');
    return data;
  };

  const reload = async () => {
    setReloadKey((value) => value + 1);
    if (isFirebaseConfigured()) {
      const firestoreUsers = await fetchUsersFromFirestore();
      onUsersChanged(firestoreUsers);
      return;
    }
    const data = await request('GET', '/api/staff');
    onUsersChanged(data.users || []);
  };

  const approveUser = async (user: User) => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      if (isFirebaseConfigured()) {
        await saveUserToFirestore({ ...user, status: 'active' });
        setMessage(`¡Cuenta de ${user.name} (${ROLE_LABELS[user.role]}) aprobada exitosamente! Ya puede iniciar sesión.`);
      } else {
        await request('PATCH', `/api/staff/${user.id}`, { status: 'active' });
        setMessage(`¡Cuenta de ${user.name} (${ROLE_LABELS[user.role]}) aprobada exitosamente!`);
      }
      await reload();
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!form.name.trim() || !form.email.trim()) {
      setError('Nombre y correo son obligatorios.');
      return;
    }
    if (form.password.length < 8) {
      setError('La clave debe tener al menos 8 caracteres.');
      return;
    }
    setBusy(true);
    try {
      if (isFirebaseConfigured()) {
        const userId = form.id || `staff-${Date.now()}`;
        const userData: User = {
          id: userId,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          role: form.role,
          zone: form.zone.trim() || null,
          boatName: form.boatName.trim() || null,
          status: 'active',
        };
        await saveUserToFirestore(userData);
        setMessage(`Cuenta de ${form.name} guardada en Firebase Firestore.`);
      } else {
        if (form.id) {
          await request('PATCH', `/api/staff/${form.id}`, {
            name: form.name.trim(),
            email: undefined,
            phone: form.phone.trim(),
            role: form.role,
            zone: form.zone.trim(),
            boatName: form.boatName.trim(),
          });
          await request('POST', `/api/staff/${form.id}/password`, { password: form.password });
          setMessage(`Cuenta de ${form.name} actualizada. Se cerró su sesión para aplicar la nueva clave.`);
        } else {
          await request('POST', '/api/staff', {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            role: form.role,
            zone: form.zone.trim(),
            boatName: form.boatName.trim(),
            password: form.password,
          });
          setMessage(`Cuenta de ${form.name} creada. Entrega la clave de forma segura.`);
        }
      }
      setForm(emptyForm());
      await reload();
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (user: User) => {
    setError('');
    setMessage('');
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    try {
      if (isFirebaseConfigured()) {
        await saveUserToFirestore({ ...user, status: nextStatus });
        setMessage(`${user.name} quedó ${nextStatus === 'active' ? 'activo' : 'suspendido'}.`);
      } else {
        await request('PATCH', `/api/staff/${user.id}`, { status: nextStatus });
        setMessage(`${user.name} quedó ${nextStatus === 'active' ? 'activo' : 'suspendido'}.`);
      }
      await reload();
    } catch (requestError) {
      setError((requestError as Error).message);
    }
  };

  const remove = async (user: User) => {
    setError('');
    setMessage('');
    if (!window.confirm(`¿Eliminar la cuenta de ${user.name}? La acción no se puede deshacer.`)) return;
    try {
      if (isFirebaseConfigured()) {
        await deleteUserFromFirestore(user.id);
        setMessage(`Cuenta de ${user.name} eliminada.`);
      } else {
        await request('DELETE', `/api/staff/${user.id}`);
        setMessage(`Cuenta de ${user.name} eliminada.`);
      }
      await reload();
    } catch (requestError) {
      setError((requestError as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#006782]">Acceso y personal</span>
          <h2 className="text-xl font-bold text-[#002546]">Cuentas y Aprobaciones</h2>
          <p className="text-xs text-gray-500">
            Gestiona los accesos del equipo de playa, capitanes de excursión y aprueba nuevas solicitudes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="p-2 rounded-xl bg-[#eff4ff] text-[#006782] border border-[#d2e4ff] hover:bg-[#dce9ff] transition-colors"
          title="Recargar cuentas"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && <p className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800 font-semibold">{error}</p>}
      {message && <p className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-900 font-semibold">{message}</p>}

      {/* SOLICITUDES PENDIENTES DE APROBACIÓN */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-3 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
              <div>
                <h3 className="text-xs font-bold text-[#002546] uppercase tracking-wider">
                  Solicitudes Pendientes de Aprobación ({pendingUsers.length})
                </h3>
                <p className="text-[11px] text-amber-900">
                  Nuevas cuentas registradas que esperan tu autorización para ingresar.
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">
              Requiere Acción
            </span>
          </div>

          <div className="space-y-2.5">
            {pendingUsers.map((pending) => (
              <div
                key={pending.id}
                className="p-3.5 rounded-xl bg-white border border-amber-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {pending.role === 'excursion' ? (
                      <Ship className="w-4 h-4 text-teal-600 shrink-0" />
                    ) : (
                      <Utensils className="w-4 h-4 text-sky-600 shrink-0" />
                    )}
                    <h4 className="text-sm font-bold text-[#002546]">{pending.name}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#006782]">
                      {ROLE_LABELS[pending.role]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <p><b>Correo:</b> {pending.email}</p>
                    {pending.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" /> {pending.phone}</p>}
                    {pending.boatName && <p><b>Lancha / Agencia:</b> <span className="text-teal-700 font-bold">{pending.boatName}</span></p>}
                    {pending.zone && <p><b>Sector sugerido:</b> {pending.zone}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void approveUser(pending)}
                    disabled={busy}
                    className="flex-1 sm:flex-initial h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aprobar Acceso</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(pending)}
                    disabled={busy}
                    className="h-9 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Rechazar y eliminar solicitud"
                  >
                    <X className="w-4 h-4" />
                    <span>Rechazar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FORMULARIO DE CREACIÓN MANUAL */}
      <form onSubmit={submit} className="space-y-3 p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-[#002546]">
          <UserPlus className="w-4 h-4 text-[#006782]" />
          {form.id ? 'Editar cuenta' : 'Crear cuenta de personal manualmente'}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Nombre y apellido"
            className={INPUT}
          />
          <input
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            type="email"
            placeholder="Correo de acceso"
            disabled={Boolean(form.id)}
            className={`${INPUT} disabled:bg-gray-100 disabled:text-gray-500`}
          />
          <input
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            type="tel"
            placeholder="Teléfono"
            className={INPUT}
          />
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
            className={INPUT}
          >
            {STAFF_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <input
            value={form.zone}
            onChange={(event) => setForm({ ...form, zone: event.target.value })}
            placeholder="Zona asignada"
            className={INPUT}
          />
          <input
            value={form.boatName}
            onChange={(event) => setForm({ ...form, boatName: event.target.value })}
            placeholder="Lancha (opcional)"
            className={INPUT}
          />
        </div>

        <div className="relative">
          <input
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            type="password"
            autoComplete="new-password"
            placeholder={form.id ? 'Nueva clave (mínimo 8 caracteres)' : 'Clave inicial (mínimo 8 caracteres)'}
            className={`${INPUT} pr-24`}
          />
          <KeyRound className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="h-11 px-4 rounded-xl bg-[#002546] hover:bg-[#0d3b66] text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs transition-colors">
            {busy ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear cuenta'}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(emptyForm())}
              className="h-11 px-4 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* LISTA DE CUENTAS DE PERSONAL AUTORIZADAS */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-[#002546] uppercase tracking-wider pt-2">
          Personal y Capitanes Autorizados ({roster.length})
        </h3>
        {roster.length === 0 && (
          <p className="text-xs text-gray-500 p-4 rounded-2xl bg-white border border-dashed border-gray-300">
            Todavía no hay cuentas de personal autorizadas.
          </p>
        )}
        {roster.map((user) => (
          <div key={user.id} className="p-3 rounded-2xl bg-white border border-gray-200 flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#002546] truncate">{user.name}</p>
              <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
              <p className="text-[11px] text-[#006782] font-semibold">
                {ROLE_LABELS[user.role]}
                {user.zone ? ` • ${user.zone}` : ''}
                {user.boatName ? ` • ${user.boatName}` : ''}
              </p>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                user.status === 'suspended' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {user.status === 'suspended' ? 'Suspendido' : 'Activo'}
            </span>
            <button
              type="button"
              onClick={() =>
                setForm({
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  phone: user.phone || '',
                  role: user.role,
                  zone: user.zone || '',
                  boatName: user.boatName || '',
                  password: '',
                })
              }
              className="p-2 rounded-xl bg-[#eff4ff] text-[#006782] border border-[#d2e4ff] hover:bg-[#dce9ff] transition-colors"
              title="Editar cuenta"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void toggleStatus(user)}
              className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
              title={user.status === 'suspended' ? 'Reactivar' : 'Suspender'}
            >
              {user.status === 'suspended' ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
            </button>
            {user.id !== currentUserId && (
              <button
                type="button"
                onClick={() => void remove(user)}
                className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                title="Eliminar cuenta"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-gray-400" data-reload-key={reloadKey}>
        Las credenciales se validan con autenticación segura en la nube.
      </p>
    </div>
  );
};

const INPUT = 'w-full h-11 rounded-xl border border-gray-300 px-3 text-xs text-[#002546] bg-white focus:outline-none focus:ring-2 focus:ring-[#006782]';