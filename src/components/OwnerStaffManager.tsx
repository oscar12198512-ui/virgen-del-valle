import React, { useMemo, useState } from 'react';
import { RefreshCw, ShieldCheck, UserPlus, Trash2, KeyRound, Ban, CheckCircle2 } from 'lucide-react';
import { ROLE_LABELS, User, UserRole } from '../types';

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

  const roster = useMemo(
    () => users.filter((user) => user.role !== 'client').sort((a, b) => a.role.localeCompare(b.role)),
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
    const data = await request('GET', '/api/staff');
    onUsersChanged(data.users || []);
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
      await request('PATCH', `/api/staff/${user.id}`, { status: nextStatus });
      setMessage(`${user.name} quedó ${nextStatus === 'active' ? 'activo' : 'suspendido'}.`);
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
      await request('DELETE', `/api/staff/${user.id}`);
      setMessage(`Cuenta de ${user.name} eliminada.`);
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
          <h2 className="text-xl font-bold text-[#002546]">Cuentas autorizadas</h2>
          <p className="text-xs text-gray-500">
            Las claves se guardan cifradas en PostgreSQL. Los clientes se registran solos desde la pantalla de acceso.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="p-2 rounded-xl bg-[#eff4ff] text-[#006782] border border-[#d2e4ff]"
          title="Recargar cuentas"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3 p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-[#002546]">
          <UserPlus className="w-4 h-4 text-[#006782]" />
          {form.id ? 'Editar cuenta' : 'Crear cuenta de personal'}
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
          <button type="submit" disabled={busy} className="h-11 px-4 rounded-xl bg-[#002546] text-white text-xs font-bold disabled:opacity-50">
            {busy ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear cuenta'}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(emptyForm())}
              className="h-11 px-4 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold"
            >
              Cancelar
            </button>
          )}
        </div>

        {error && <p className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">{error}</p>}
        {message && <p className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-900">{message}</p>}
      </form>

      <div className="space-y-2">
        {roster.length === 0 && (
          <p className="text-xs text-gray-500 p-4 rounded-2xl bg-white border border-dashed border-gray-300">
            Todavía no hay cuentas de personal registradas.
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
              className="p-2 rounded-xl bg-[#eff4ff] text-[#006782] border border-[#d2e4ff]"
              title="Editar cuenta"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void toggleStatus(user)}
              className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200"
              title={user.status === 'suspended' ? 'Reactivar' : 'Suspender'}
            >
              {user.status === 'suspended' ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
            </button>
            {user.id !== currentUserId && (
              <button
                type="button"
                onClick={() => void remove(user)}
                className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200"
                title="Eliminar cuenta"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-gray-400" data-reload-key={reloadKey}>
        Contraseñas cifradas con bcrypt. Nunca se guardan ni se muestran en texto plano.
      </p>
    </div>
  );
};

const INPUT = 'w-full h-11 rounded-xl border border-gray-300 px-3 text-sm';