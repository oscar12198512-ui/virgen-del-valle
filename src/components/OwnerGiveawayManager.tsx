import React, { useState } from 'react';
import {
  Trophy,
  Ticket,
  Bus,
  Ship,
  UtensilsCrossed,
  Sparkles,
  Play,
  RotateCcw,
  Download,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  Mail,
  Flame,
  Award
} from 'lucide-react';
import { GiveawayParticipant, GiveawayState } from '../types';
import { soundService } from '../services/soundService';

interface OwnerGiveawayManagerProps {
  giveaway: GiveawayState;
  onUpdateGiveaway: (updated: GiveawayState) => void;
}

export const OwnerGiveawayManager: React.FC<OwnerGiveawayManagerProps> = ({
  giveaway,
  onUpdateGiveaway,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingTicket, setDrawingTicket] = useState<number | null>(null);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [newParticipantPhone, setNewParticipantPhone] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const totalRegistered = giveaway.participants.length;
  const remaining = Math.max(0, giveaway.maxParticipants - totalRegistered);
  const percentFilled = Math.min(100, Math.round((totalRegistered / giveaway.maxParticipants) * 100));

  const filteredParticipants = giveaway.participants.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.phone && p.phone.includes(searchTerm)) ||
      p.ticketNumber.toString().includes(searchTerm)
  );

  const executeDraw = () => {
    if (giveaway.participants.length === 0) {
      alert('No hay participantes registrados para sortear.');
      return;
    }

    if (giveaway.winner) {
      if (!confirm('Ya existe un ganador oficial. ¿Deseas volver a sortear y elegir un nuevo ganador?')) {
        return;
      }
    }

    setIsDrawing(true);
    let counter = 0;
    const durationMs = 3800;
    const intervalMs = 60;
    const totalSteps = durationMs / intervalMs;

    const interval = setInterval(() => {
      counter++;
      // Número aleatorio animado
      const randomIdx = Math.floor(Math.random() * giveaway.participants.length);
      setDrawingTicket(giveaway.participants[randomIdx].ticketNumber);

      if (counter >= totalSteps) {
        clearInterval(interval);
        // Selección criptográfica segura final
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        const winningIndex = array[0] % giveaway.participants.length;
        const winner = giveaway.participants[winningIndex];

        setDrawingTicket(winner.ticketNumber);
        setIsDrawing(false);

        const now = new Date();
        const dateStr = `${now.toLocaleDateString('es-VE')} ${now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`;

        const updated: GiveawayState = {
          ...giveaway,
          winner,
          drawnAt: dateStr,
        };

        onUpdateGiveaway(updated);
        soundService.playCashChime();
      }
    }, intervalMs);
  };

  const handleResetGiveaway = () => {
    if (confirm('¿Estás seguro de reiniciar el sorteo? Se limpiará el ganador actual.')) {
      onUpdateGiveaway({
        ...giveaway,
        winner: null,
        drawnAt: null,
      });
    }
  };

  const handleAddManualParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipantName.trim() || !newParticipantEmail.trim()) {
      alert('Por favor completa el nombre y correo del participante.');
      return;
    }

    if (giveaway.participants.length >= giveaway.maxParticipants) {
      alert('Ya se han completado los 200 cupos disponibles.');
      return;
    }

    const nextTicket = giveaway.participants.length + 1;
    const newParticipant: GiveawayParticipant = {
      ticketNumber: nextTicket,
      userId: `usr-manual-${Date.now()}`,
      name: newParticipantName.trim(),
      email: newParticipantEmail.trim().toLowerCase(),
      phone: newParticipantPhone.trim() || undefined,
      registeredAt: new Date().toLocaleDateString('es-VE'),
    };

    onUpdateGiveaway({
      ...giveaway,
      participants: [...giveaway.participants, newParticipant],
    });

    setNewParticipantName('');
    setNewParticipantEmail('');
    setNewParticipantPhone('');
    setShowAddModal(false);
  };

  const exportCsv = () => {
    const headers = 'Ticket,Nombre,Correo,Telefono,Fecha Registro\n';
    const rows = giveaway.participants
      .map(
        (p) =>
          `"${p.ticketNumber}","${p.name}","${p.email}","${p.phone || ''}","${p.registeredAt}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participantes-sorteo-playa-buche-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Banner Principal */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#002546] via-[#00386b] to-[#001c37] border-2 border-[#57d1fd]/40 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-br from-[#57d1fd]/15 to-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black uppercase tracking-wider">
              <Trophy className="w-4 h-4 text-amber-400" /> Sorteo Oficial · Primeras 200 Personas
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Tour VIP Todo Incluido a Playa Buche
            </h2>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl">
              Premio: Pasaje en bus ida y vuelta gratis + Lancha ida y vuelta a Playa Buche gratis + Almuerzo de la casa gratis + Barra de bebidas gratis.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-colors"
            >
              <Ticket className="w-4 h-4 text-[#57d1fd]" /> + Añadir Manual
            </button>
            <button
              onClick={exportCsv}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Métricas del Sorteo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
          <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10">
            <p className="text-[11px] font-bold text-white/60 uppercase">Registrados</p>
            <p className="text-2xl font-black text-white mt-0.5">
              {totalRegistered} <span className="text-xs font-bold text-white/50">/ {giveaway.maxParticipants}</span>
            </p>
          </div>

          <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10">
            <p className="text-[11px] font-bold text-white/60 uppercase">Cupos Libres</p>
            <p className="text-2xl font-black text-[#57d1fd] mt-0.5">
              {remaining} <span className="text-xs font-bold text-white/50">cupos</span>
            </p>
          </div>

          <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10">
            <p className="text-[11px] font-bold text-white/60 uppercase">Porcentaje</p>
            <p className="text-2xl font-black text-amber-300 mt-0.5">
              {percentFilled}%
            </p>
          </div>

          <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10">
            <p className="text-[11px] font-bold text-white/60 uppercase">Estado Sorteo</p>
            <p className="text-sm font-black text-emerald-300 mt-1 flex items-center gap-1.5">
              {giveaway.winner ? '🏆 Finalizado' : '🟢 Activo en curso'}
            </p>
          </div>
        </div>
      </div>

      {/* Máquina del Sorteo / Tarjeta del Ganador */}
      <div className="p-6 rounded-3xl bg-white border border-[#d2e4ff] shadow-lg space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#fbbf24] to-[#f59e0b] text-[#002546] font-black flex items-center justify-center text-2xl shadow-md">
              🎲
            </div>
            <div>
              <h3 className="text-lg font-black text-[#001c37]">
                Sorteador Aleatorio Transparente
              </h3>
              <p className="text-xs text-gray-500">
                Selecciona al único ganador mediante generador criptográfico seguro entre los primeros 200 registrados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {giveaway.winner && (
              <button
                onClick={handleResetGiveaway}
                className="px-3.5 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Limpiar / Reiniciar
              </button>
            )}
            <button
              onClick={executeDraw}
              disabled={isDrawing || totalRegistered === 0}
              className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl active:scale-95 transition-all ${
                isDrawing
                  ? 'bg-amber-400 text-[#002546] animate-pulse cursor-wait'
                  : 'bg-gradient-to-r from-[#002546] to-[#004b87] hover:from-[#00386b] hover:to-[#005a9e] text-white'
              }`}
            >
              <Play className="w-4 h-4 text-[#57d1fd]" />
              {isDrawing ? 'Sorteando...' : giveaway.winner ? 'Volver a Sortear' : '¡Realizar Sorteo Ahora!'}
            </button>
          </div>
        </div>

        {/* Display del ganador / animación */}
        {isDrawing ? (
          <div className="p-8 rounded-2xl bg-gradient-to-r from-[#002546] to-[#004b87] text-white text-center space-y-3 animate-pulse shadow-inner">
            <p className="text-xs font-black uppercase text-[#57d1fd] tracking-widest">
              🎰 Girando la ruleta digital...
            </p>
            <p className="text-6xl font-black text-amber-300 font-mono tracking-widest">
              #{drawingTicket?.toString().padStart(3, '0')}
            </p>
            <p className="text-xs text-white/70">Seleccionando al afortunado ganador del Tour VIP...</p>
          </div>
        ) : giveaway.winner ? (
          <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/60 border-2 border-amber-400 text-[#001c37] shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#fbbf24] to-[#f59e0b] text-[#002546] font-black text-3xl flex items-center justify-center shadow-lg shrink-0">
                🏆
              </div>
              <div className="space-y-0.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400/30 text-amber-900 border border-amber-400 font-black text-[10px] uppercase">
                  Ganador Oficial Seleccionado
                </span>
                <h4 className="text-xl font-black text-[#001c37]">
                  {giveaway.winner.name}
                </h4>
                <div className="flex items-center gap-3 text-xs text-gray-700 flex-wrap">
                  <span className="font-bold text-[#002546] bg-amber-200/80 px-2 py-0.5 rounded-lg">
                    Ticket #{giveaway.winner.ticketNumber.toString().padStart(3, '0')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-500" /> {giveaway.winner.email}
                  </span>
                  {giveaway.winner.phone && (
                    <span className="flex items-center gap-1 font-semibold text-emerald-800">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" /> {giveaway.winner.phone}
                    </span>
                  )}
                </div>
                {giveaway.drawnAt && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Fecha de sorteo: {giveaway.drawnAt}
                  </p>
                )}
              </div>
            </div>

            <div className="text-center sm:text-right shrink-0">
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-amber-800">Premio Asignado</p>
              <p className="text-sm font-black text-emerald-700">Tour VIP Playa Buche</p>
              <p className="text-[11px] text-gray-600">Bus + Lancha + Almuerzo + Bebidas</p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-[#002546] text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-sky-600 shrink-0" />
            <p>
              El sorteo está esperando tu orden. Cuando estés listo, presiona <strong>"¡Realizar Sorteo Ahora!"</strong> para seleccionar automáticamente y con certificación al ganador del Tour VIP entre los participantes.
            </p>
          </div>
        )}
      </div>

      {/* Lista de Participantes Registrados */}
      <div className="bg-white rounded-3xl border border-[#d2e4ff] shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/70">
          <div>
            <h3 className="font-black text-base text-[#001c37] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#002546]" />
              Participantes del Sorteo ({filteredParticipants.length})
            </h3>
            <p className="text-xs text-gray-500">
              Primeras 200 personas registradas en la aplicación de Playa Buche
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ticket, nombre, correo..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#002546] bg-white"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8f9ff] text-gray-600 uppercase text-[10px] font-black border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Nombre y Apellido</th>
                <th className="py-3 px-4">Correo Electrónico</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4">Fecha Registro</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                    No se encontraron participantes con ese criterio.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  const isThisWinner = giveaway.winner?.ticketNumber === p.ticketNumber;
                  return (
                    <tr
                      key={p.ticketNumber}
                      className={`hover:bg-sky-50/60 transition-colors ${
                        isThisWinner ? 'bg-amber-100/70 font-bold' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-black">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs ${
                          isThisWinner ? 'bg-amber-400 text-[#002546] shadow-sm' : 'bg-gray-100 text-gray-800'
                        }`}>
                          #{p.ticketNumber.toString().padStart(3, '0')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#001c37]">
                        {p.name}
                        {isThisWinner && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-400 text-[#002546] text-[10px] font-black uppercase">
                            🏆 GANADOR
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{p.email}</td>
                      <td className="py-3 px-4 text-gray-600 font-mono">{p.phone || '—'}</td>
                      <td className="py-3 px-4 text-gray-500">{p.registeredAt}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Válido
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Añadir Manualmente */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-base text-[#001c37]">Registrar Participante Manual</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualParticipant} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  placeholder="Ej. Valentina Morales"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#002546]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={newParticipantEmail}
                  onChange={(e) => setNewParticipantEmail(e.target.value)}
                  placeholder="ejemplo@gmail.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#002546]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Teléfono (opcional)</label>
                <input
                  type="tel"
                  value={newParticipantPhone}
                  onChange={(e) => setNewParticipantPhone(e.target.value)}
                  placeholder="0414-1234567"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#002546]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#002546] text-white rounded-xl shadow-md"
                >
                  Asignar Ticket #{giveaway.participants.length + 1}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
