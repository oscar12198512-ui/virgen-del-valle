import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

class NativeNotificationService {
  private hasPermission = false;
  private channelCreated = false;

  async init(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const check = await LocalNotifications.checkPermissions();
        if (check.display === 'granted') {
          this.hasPermission = true;
        } else {
          const req = await LocalNotifications.requestPermissions();
          this.hasPermission = req.display === 'granted';
        }

        if (this.hasPermission && !this.channelCreated) {
          await LocalNotifications.createChannel({
            id: 'playa_buche_alerts',
            name: 'Avisos Playa Buche',
            description: 'Notificaciones operativas de pedidos, cocina y sorteo VIP',
            importance: 5, // High importance
            visibility: 1, // Public
            sound: 'beep.wav',
            vibration: true,
            lights: true,
            lightColor: '#57D1FD',
          });
          this.channelCreated = true;
        }

        return this.hasPermission;
      } catch (err) {
        console.warn('Error al inicializar permisos nativos de notificación:', err);
        return false;
      }
    }

    // Web / PWA browser notification support
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        this.hasPermission = true;
        return true;
      }
      if (Notification.permission !== 'denied') {
        try {
          const perm = await Notification.requestPermission();
          this.hasPermission = perm === 'granted';
          return this.hasPermission;
        } catch {
          return false;
        }
      }
    }

    return false;
  }

  async sendNotification(title: string, body: string, id: number = Math.floor(Math.random() * 100000)) {
    if (!this.hasPermission) {
      await this.init();
    }

    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id,
              title,
              body,
              channelId: 'playa_buche_alerts',
              smallIcon: 'ic_launcher',
              iconColor: '#002546',
              sound: 'beep.wav',
            },
          ],
        });
      } catch (err) {
        console.warn('Fallo al disparar notificación nativa:', err);
      }
      return;
    }

    // Web / PWA fallback
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/logo.png',
          badge: '/logo.png',
        });
      } catch {}
    }
  }
}

export const nativeNotificationService = new NativeNotificationService();
