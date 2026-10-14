import React, { useState } from 'react';
import {
  Trophy,
  Ticket,
  Bus,
  Ship,
  UtensilsCrossed,
  Sparkles,
  CheckCircle2,
  Share2,
  Users,
  X,
  Flame,
  Award,
  ShieldCheck,
  Calendar,
  Gift,
  ExternalLink
} from 'lucide-react';
import { GiveawayState, User } from '../types';

interface GiveawayModalProps {
  isOpen: boolean;
  onClose: () => void;
  giveaway: GiveawayState;
  currentUser: User | null;
  onOpenRegister?: () => void;
}

export const GiveawayModal: React.FC<GiveawayModalProps> = ({
  isOpen,
  onClose,
  giveaway,
  currentUser,
  onOpenRegister,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const userTicket = giveaway.participants.find(
    (p) => p.userId === currentUser?.id || (currentUser?.email && p.email.toLowerCase() === currentUser.email.toLowerCase())
  ) || (currentUser?.giveawayTicket ? {
    ticketNumber: currentUser.giveawayTicket,
    name: currentUser.name,
    email: currentUser.email,
    registeredAt: 'Registrado',
    userId: currentUser.id
  } : null);

  const totalRegistered = giveaway.participants.length;
  const remainingSlots = Math.max(0, giveaway.maxParticipants - totalRegistered);
  const percentFilled = Math.min(100, Math.round((totalRegistered / giveaway.maxParticipants) * 100));

  const isUserWinner = giveaway.winner && (
    giveaway.winner.userId === currentUser?.id ||
    (currentUser?.email && giveaway.winner.email.toLowerCase() === currentUser.email.toLowerCase()) ||
    (userTicket && giveaway.winner.ticketNumber === userTicket.ticketNumber)
  );

  const handleShare = async () => {
    const text = userTicket
      ? `🎉 ¡Tengo el Ticket #${userTicket.ticketNumber.toString().padStart(3, '0')} para el Gran Sorteo de Playa Buche! Participando por un Tour VIP Todo Incluido (Bus + Lancha + Almuerzo + Bebidas gratis). ¡Descarga la app y regístrate!`
      : `🏖️ ¡Participa en el Gran Sorteo de las primeras 200 personas de Playa Buche! Tour VIP Todo Incluido (Bus, Lancha, Almuerzo y Bebidas gratis). ¡Solo 1 ganador!`;
    const url = 'https://virgen-del-valle-web.onrender.com';

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Sorteo VIP Playa Buche', text, url });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-[#001c37]/75 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-gradient-to-b from-[#002546] via-[#00335e] to-[#001c37] text-white rounded-3xl shadow-2xl border border-white/20 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header con temática caribeña VIP */}
        <div className="relative px-5 py-4 bg-gradient-to-r from-[#002546] to-[#004b87] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#fbbf24] to-[#f59e0b] text-[#002546] flex items-center justify-center shadow-lg shadow-amber-500/20 font-black text-xl">
              🎁
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#57d1fd]/20 text-[#57d1fd] border border-[#57d1fd]/30">
                  Exclusivo 200 Personas
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  1 Solo Ganador
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight mt-0.5">
                Gran Sorteo Inauguración Playa Buche
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Anuncio si hay ganador */}
          {giveaway.winner ? (
            <div className={`p-4 rounded-2xl border-2 ${isUserWinner ? 'bg-gradient-to-r from-amber-500/25 to-emerald-500/25 border-amber-400' : 'bg-amber-400/10 border-amber-400/50'} text-center space-y-2 shadow-xl`}>
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-[#002546] font-black text-2xl flex items-center justify-center mx-auto shadow-lg">
                🏆
              </div>
              <h3 className="text-base font-black text-amber-300 uppercase tracking-wide">
                {isUserWinner ? '🎉 ¡ERES EL GANADOR DEL TOUR VIP!' : '¡TENEMOS UN GANADOR OFICIAL!'}
              </h3>
              <div className="bg-black/30 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <p className="text-xs text-white/70 uppercase font-bold">Ticket Ganador</p>
                <p className="text-2xl font-black text-amber-400">
                  #{giveaway.winner.ticketNumber.toString().padStart(3, '0')}
                </p>
                <p className="text-sm font-black text-white mt-0.5">{giveaway.winner.name}</p>
                {giveaway.drawnAt && (
                  <p className="text-[11px] text-white/60 mt-1">Sorteado el: {giveaway.drawnAt}</p>
                )}
              </div>
              {isUserWinner && (
                <p className="text-xs text-emerald-300 font-bold bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-400/30">
                  ¡Comunícate con la administración de Playa Buche para coordinar la fecha de tu tour soñado todo incluido!
                </p>
              )}
            </div>
          ) : null}

          {/* Estado de participación del usuario actual */}
          {userTicket ? (
            <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-[#0f406e] to-[#092949] border-2 border-[#57d1fd] shadow-xl">
              <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-[#57d1fd]/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Estás Participando
                  </div>
                  <h4 className="text-xs font-bold text-white/80">Tu Boleto Oficial Registrado:</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-[#57d1fd] tracking-wider">
                      #{userTicket.ticketNumber.toString().padStart(3, '0')}
                    </span>
                    <span className="text-xs font-extrabold text-white/50">/ {giveaway.maxParticipants}</span>
                  </div>
                  <p className="text-[11px] text-white/70">
                    Titular: <span className="font-bold text-white">{userTicket.name}</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#57d1fd] text-[#002546] font-black flex items-center justify-center shrink-0 shadow-lg">
                  <Ticket className="w-6 h-6" />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <span className="text-[11px] text-emerald-200/90 font-medium">
                  ✨ Válido para el sorteo del Tour VIP Todo Incluido
                </span>
                <button
                  onClick={handleShare}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" /> {copied ? '¡Copiado!' : 'Compartir'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-sky-500/20 border border-amber-400/30 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-black text-amber-300 uppercase tracking-wide">
                  ¿Aún no tienes tu boleto?
                </p>
                <p className="text-xs text-white/80 leading-snug">
                  Regístrate gratis como cliente y asegura tu ticket automático entre los primeros 200.
                </p>
              </div>
              {onOpenRegister && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenRegister();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-[#002546] font-black text-xs shrink-0 shadow-lg active:scale-95 transition-transform"
                >
                  Registrarme
                </button>
              )}
            </div>
          )}

          {/* Barra de progreso de cupos */}
          <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-white/80 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#57d1fd]" /> Cupos registrados:
              </span>
              <span className="text-white font-black">
                <span className="text-[#57d1fd] text-sm">{totalRegistered}</span> / {giveaway.maxParticipants}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#57d1fd] via-sky-400 to-[#fbbf24] transition-all duration-500 shadow-sm"
                style={{ width: `${Math.max(5, percentFilled)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-white/70">
              <span>{percentFilled}% completado</span>
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                {remainingSlots > 0 ? `¡Quedan solo ${remainingSlots} cupos!` : '¡Cupos agotados, sorteo inminente!'}
              </span>
            </div>
          </div>

          {/* Lo que incluye el premio */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
                ¿Qué incluye el Tour VIP para el ganador?
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-[#57d1fd] flex items-center justify-center shrink-0">
                  <Bus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-xs">Pasaje en Bus Gratis</h4>
                  <p className="text-[11px] text-white/70 mt-0.5">
                    Transporte terrestre ida y vuelta 100% cubierto hasta el embarcadero.
                  </p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                  <Ship className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-xs">Lancha a Playa Buche</h4>
                  <p className="text-[11px] text-white/70 mt-0.5">
                    Traslado marítimo muelle ↔ Playa Buche ida y vuelta en lancha rápida.
                  </p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-xs">Almuerzo Playero Completo</h4>
                  <p className="text-[11px] text-white/70 mt-0.5">
                    Pargo frito o especialidad de la casa con tostones playeros y ensalada.
                  </p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-xs">Bebidas del Día Gratis</h4>
                  <p className="text-[11px] text-white/70 mt-0.5">
                    Refrescos y bebidas refrescantes sin costo durante toda tu estancia en la playa.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bases del sorteo */}
          <div className="p-3 bg-black/25 rounded-xl border border-white/5 text-[11px] text-white/70 space-y-1 leading-relaxed">
            <p className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Bases y Condiciones Oficiales:
            </p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Exclusivo para los primeros 200 usuarios registrados en la app oficial de Playa Buche.</li>
              <li>Habrá un único ganador seleccionado de manera aleatoria y verificable por el sistema.</li>
              <li>El premio es personal e intransferible. La fecha se acordará con la administración del establecimiento.</li>
              <li>Organizado y avalado por Inversiones Virgen del Valle · Playa Buche.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleShare}
            className="flex-1 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Share2 className="w-4 h-4" /> {copied ? '¡Enlace copiado!' : 'Compartir con amigos'}
          </button>
          <button
            onClick={onClose}
            className="px-6 h-11 rounded-xl bg-gradient-to-r from-[#57d1fd] to-[#0ea5e9] text-[#002546] font-black text-xs shadow-lg active:scale-95 transition-transform"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
