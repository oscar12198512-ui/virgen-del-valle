/**
 * Utilidad de Audio Síntetizado y Respuesta Háptica (Vibración)
 * Utiliza Web Audio API pura (sin dependencias de archivos externos mp3)
 * para garantizar sonido instantáneo y offline en KDS de cocina y Mesoneros.
 */

class AudioAlertService {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Toca una nota senoidal con envolvente suave
   */
  private playTone(freq: number, startTime: number, duration: number, gainValue = 0.15) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Envolvente Attack - Decay
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      console.warn('Audio tone play error:', e);
    }
  }

  /**
   * Alerta de Nuevo Pedido en Cocina (Doble Chime Dinámico D5 -> A5)
   */
  public playNewOrderAlert() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    this.playTone(587.33, now, 0.25, 0.2);        // D5
    this.playTone(880.00, now + 0.15, 0.4, 0.25); // A5

    this.triggerHaptic([150, 80, 200]);
  }

  /**
   * Alerta de Pedido Listo para Retirar (Pase de Cocina / ready_pass) (C5 -> E5 -> G5 -> C6)
   */
  public playOrderReadyAlert() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    this.playTone(523.25, now, 0.18, 0.18);        // C5
    this.playTone(659.25, now + 0.12, 0.18, 0.2);  // E5
    this.playTone(783.99, now + 0.24, 0.18, 0.22); // G5
    this.playTone(1046.50, now + 0.36, 0.5, 0.28); // C6

    this.triggerHaptic([200, 100, 200, 100, 300]);
  }

  /**
   * Alerta de Advertencia o Retraso (Tiempo excedido en cocina)
   */
  public playUrgentWarningAlert() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    this.playTone(440, now, 0.2, 0.25);
    this.playTone(440, now + 0.25, 0.2, 0.25);
    this.playTone(440, now + 0.5, 0.3, 0.3);

    this.triggerHaptic([300, 150, 300]);
  }

  /**
   * Vibración háptica en dispositivos móviles y Android
   */
  public triggerHaptic(pattern: number[] = [150, 100, 150]) {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignorar si el dispositivo no soporta vibración
    }
  }
}

export const audioAlerts = new AudioAlertService();
