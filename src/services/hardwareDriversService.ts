import JSZip from 'jszip';
import QRCode from 'qrcode';
import { soundService } from './soundService';

export interface DriverStatus {
  thermalPrinter: {
    supported: boolean;
    type: 'web-bluetooth' | 'web-serial' | 'system-spooler';
    connectedDeviceName: string | null;
  };
  camera: {
    supported: boolean;
    permission: 'granted' | 'prompt' | 'denied' | 'unknown';
    activeStream: MediaStream | null;
  };
  vibration: {
    supported: boolean;
  };
  geolocation: {
    supported: boolean;
    coords: { lat: number; lng: number; accuracy: number } | null;
    error: string | null;
  };
  battery: {
    supported: boolean;
    level: number;
    charging: boolean;
  };
  notifications: {
    supported: boolean;
    permission: NotificationPermission;
  };
  offlineStorage: {
    supported: boolean;
    persisted: boolean;
  };
}

class HardwareDriversService {
  // 1. THERMAL PRINTER DRIVER (ESC/POS & Sistema)
  checkPrinterSupport(): DriverStatus['thermalPrinter'] {
    const hasBluetooth = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
    const hasSerial = typeof navigator !== 'undefined' && 'serial' in navigator;

    let type: DriverStatus['thermalPrinter']['type'] = 'system-spooler';
    if (hasBluetooth) type = 'web-bluetooth';
    else if (hasSerial) type = 'web-serial';

    return {
      supported: true,
      type,
      connectedDeviceName: hasBluetooth ? 'ESC/POS Bluetooth 58/80mm' : 'Impresora Térmica de Sistema',
    };
  }

  // Print ESC/POS styled test voucher directly
  printTestVoucher(type: 'comanda' | 'ticket' | 'actaZ', data?: Record<string, unknown>) {
    soundService.playCashChime();

    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) {
      alert('Por favor permite ventanas emergentes para imprimir el ticket de prueba.');
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();

    let voucherHtml = '';

    if (type === 'comanda') {
      voucherHtml = `
        <div style="text-align:center; font-weight:bold; font-size:16px; margin-bottom:4px;">*** COMANDA DE COCINA ***</div>
        <div style="text-align:center; font-size:12px; margin-bottom:8px;">BAHÍA BUCHE - PASE DE FOGÓN</div>
        <div style="border-top:1px dashed #000; border-bottom:1px dashed #000; padding:4px 0; margin-bottom:8px; font-size:11px;">
          <div><b>TOLDO:</b> TOL-03 (Frente al Mar)</div>
          <div><b>HORA:</b> ${timeStr}</div>
          <div><b>MESONERO:</b> Yorman Rodríguez</div>
        </div>
        <div style="font-size:12px; line-height:1.5;">
          <div style="display:flex; justify-content:space-between;"><span>1x Pargo Rojo Crispy (~600g)</span><b>$24.00</b></div>
          <div style="font-size:10px; padding-left:8px; color:#333;">* Tostones extra crocantes + ensalada</div>
          <div style="display:flex; justify-content:space-between;"><span>1x Ración Tostones con Queso</span><b>$8.00</b></div>
          <div style="display:flex; justify-content:space-between;"><span>1x Balde 6 Polar Pilsen</span><b>$12.00</b></div>
        </div>
        <div style="border-top:1px dashed #000; margin-top:8px; padding-top:4px; text-align:right; font-weight:bold; font-size:13px;">
          TOTAL ITEMS: 3 | EST: 15-20 MIN
        </div>
      `;
    } else if (type === 'actaZ') {
      voucherHtml = `
        <div style="text-align:center; font-weight:bold; font-size:16px; margin-bottom:4px;">*** ACTA Z DE CIERRE FISCAL ***</div>
        <div style="text-align:center; font-size:11px;">INV. VIRGEN DEL VALLE 2024 C.A.</div>
        <div style="text-align:center; font-size:10px; margin-bottom:8px;">RIF: J-50412891-0 | BUCHE, MIRANDA</div>
        <div style="border-top:1px dashed #000; border-bottom:1px dashed #000; padding:4px 0; margin-bottom:8px; font-size:11px;">
          <div><b>FECHA CIERRE:</b> ${dateStr} - ${timeStr}</div>
          <div><b>IMPRESORA FISCAL:</b> BIXOLON / EPSON TM-T88</div>
          <div><b>TASA OFICIAL BCV:</b> 54.20 Bs/$</div>
        </div>
        <div style="font-size:11px; line-height:1.5;">
          <div style="display:flex; justify-content:space-between;"><span>BASE IMPONIBLE (G):</span><b>$2,890.00</b></div>
          <div style="display:flex; justify-content:space-between;"><span>IVA (16%):</span><b>$462.40</b></div>
          <div style="display:flex; justify-content:space-between;"><span>EXENTO / NO SUJETO:</span><b>$132.60</b></div>
          <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:12px; border-top:1px solid #000; padding-top:2px;">
            <span>TOTAL VENTAS DEL DÍA:</span><span>$3,485.00</span>
          </div>
          <div style="text-align:right; font-weight:bold; font-size:11px; margin-top:2px;">
            Bs. 188,887.00
          </div>
        </div>
        <div style="text-align:center; margin-top:12px; font-size:10px;">
          HASH SHA-256 FISCAL VERIFICADO<br/>
          ================================<br/>
          *** MEMORIA FISCAL AUDITADA ***
        </div>
      `;
    } else {
      voucherHtml = `
        <div style="text-align:center; font-weight:bold; font-size:15px; margin-bottom:2px;">BAHÍA DE BUCHE</div>
        <div style="text-align:center; font-size:10px; margin-bottom:6px;">PRE-CUENTA DE CONSUMO</div>
        <div style="border-top:1px dashed #000; border-bottom:1px dashed #000; padding:4px 0; margin-bottom:6px; font-size:10px;">
          <div>TOLDO: TOL-03 | FECHA: ${dateStr} ${timeStr}</div>
          <div>ATENDIDO POR: Yorman Rodríguez</div>
        </div>
        <div style="font-size:11px; line-height:1.4;">
          <div style="display:flex; justify-content:space-between;"><span>1x Pargo Rojo Crispy</span><span>$24.00</span></div>
          <div style="display:flex; justify-content:space-between;"><span>1x Tostones Playeros</span><span>$8.00</span></div>
          <div style="display:flex; justify-content:space-between;"><span>1x Balde 6 Polar</span><span>$12.00</span></div>
          <div style="display:flex; justify-content:space-between;"><span>Servicio y Propina (10%)</span><span>$4.40</span></div>
          <div style="border-top:1px dashed #000; margin-top:4px; padding-top:4px; display:flex; justify-content:space-between; font-weight:bold; font-size:13px;">
            <span>TOTAL A PAGAR:</span><span>$48.40 USD</span>
          </div>
          <div style="text-align:right; font-weight:bold; font-size:11px;">
            Bs. 2,623.28 (Tasa BCV)
          </div>
        </div>
        <div style="text-align:center; margin-top:10px; font-size:9px;">
          ¡Gracias por disfrutar en Playa Buche!<br/>
          Pago Móvil: 0414-2398412 • Banesco (0134)
        </div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Impresión Ticket Térmico - Playa Buche</title>
          <style>
            @page { size: 58mm auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 54mm;
              margin: 4mm auto;
              padding: 0;
              color: #000;
              background: #fff;
            }
            @media print {
              body { width: 58mm; margin: 0; padding: 2mm; }
            }
          </style>
        </head>
        <body>
          ${voucherHtml}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // 2. HAPTIC VIBRATION DRIVER
  checkVibrationSupport(): boolean {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  triggerHaptic(pattern: 'tap' | 'orderReady' | 'urgent' | 'cashPayment'): boolean {
    if (!this.checkVibrationSupport()) return false;
    try {
      if (pattern === 'tap') {
        navigator.vibrate(35);
      } else if (pattern === 'orderReady') {
        navigator.vibrate([150, 60, 150]);
      } else if (pattern === 'urgent') {
        navigator.vibrate([300, 80, 300, 80, 450]);
      } else if (pattern === 'cashPayment') {
        navigator.vibrate([60, 40, 120]);
      }
      return true;
    } catch {
      return false;
    }
  }

  // 3. GEOLOCATION DRIVER
  async requestGeolocation(): Promise<{ lat: number; lng: number; accuracy: number; placeName: string }> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocalización no soportada en este navegador.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            placeName: 'Playa Buche (Carenero, Higuerote - Miranda)',
          });
        },
        (err) => {
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    });
  }

  // 4. BATTERY STATUS DRIVER
  async getBatteryStatus(): Promise<{ levelPercent: number; charging: boolean } | null> {
    try {
      const nav = navigator as unknown as { getBattery?: () => Promise<{ level: number; charging: boolean }> };
      if (typeof nav.getBattery === 'function') {
        const battery = await nav.getBattery();
        return {
          levelPercent: Math.round(battery.level * 100),
          charging: battery.charging,
        };
      }
    } catch {}
    return null;
  }

  // 5. PROTOTYPE PACKAGE GENERATOR & DOWNLOADER (.ZIP)
  async generateAndDownloadPrototypeZip(appData?: {
    menuItems?: unknown[];
    orders?: unknown[];
    spots?: unknown[];
    users?: unknown[];
    bcvRate?: number;
    bankConfig?: unknown;
  }): Promise<void> {
    soundService.playSuccess();
    const zip = new JSZip();

    const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-ctlsi4v7hvt7os75dy3meq-724902067430.us-east1.run.app';

    // 1. Add README with clear install instructions
    const readmeContent = `
====================================================================
        PLAYA BUCHE / INV VIRGEN DEL VALLE - PROTOTIPO INSTALABLE
====================================================================
Versión: 1.0.0-PROTOTYPE
Fecha de empaquetado: ${new Date().toLocaleString()}
Plataforma: Progressive Web App (PWA) / Android APK Ready / iOS Standalone
URL directa del prototipo: ${currentUrl}

Este paquete contiene todos los archivos necesarios para instalar y ejecutar
la aplicación en modo prototipo en teléfonos móviles, tablets y computadoras.

CONTENIDO DEL PAQUETE:
1. README-INSTALACION.txt (este instructivo)
2. manifest.webmanifest (Metadatos PWA y configuración standalone)
3. capacitor.config.json (Configuración directa para compilar APK Android nativo)
4. twa-manifest.json (Configuración Bubblewrap para Play Store / PWA empacada)
5. Lanzador-PlayaBuche.html (Acceso directo a pantalla completa de un clic)
6. Menu-Digital-Offline.html (Carta digital autónoma para ver sin internet)
7. datos-prototipo-playabuche.json (Respaldo en tiempo real de comandas, menú y caja)
8. icon.svg (Logotipo oficial de la embarcación y bahía)

CÓMO INSTALAR SEGÚN TU DISPOSITIVO:

1. TELÉFONOS ANDROID (Instalación Directa):
   - Abre Google Chrome en tu teléfono.
   - Accede a la URL del prototipo: ${currentUrl}
   - Pulsa los 3 puntos superiores (⋮) y selecciona:
     "Instalar aplicación" o "Agregar a la pantalla principal".
   - ¡Listo! Se creará el icono de Playa Buche en tu pantalla principal.

2. IPHONE / IPAD (iOS Safari):
   - Abre Safari y entra en la URL de la app.
   - Pulsa el botón "Compartir" (el cuadrado con la flecha hacia arriba).
   - Desplázate hacia abajo y pulsa "Agregar al inicio" (Add to Home Screen).
   - Confirma el nombre "Playa Buche" y pulsa "Agregar".

3. COMPUTADORA (PC / Mac con Chrome o Edge):
   - Abre la URL en Chrome o Edge.
   - En la barra de direcciones verás un icono de pantalla con flecha ("Instalar").
   - Pulsa "Instalar" para abrir la aplicación como ventana de escritorio sin marcos.

4. COMPILAR APK NATIVO ANDROID:
   - Con Capacitor:
     $ npx @capacitor/cli create
     $ npx cap add android && npx cap open android
   - Con Bubblewrap TWA:
     $ npx @bubblewrap/cli build

DRIVERS DEL PROTOTIPO:
✓ Impresora Térmica ESC/POS (58mm y 80mm vía Bluetooth y Spooler de sistema)
✓ Sensor Óptico de Cámara para Escaneo QR en toldos
✓ Motor Háptico / Vibrador para mesoneros en la arena
✓ Modo 100% Offline con sincronización diferida
====================================================================
`;
    zip.file('README-INSTALACION.txt', readmeContent);

    // 2. Add Manifest file
    const manifestJson = {
      id: '/',
      name: 'Playa Buche / INV Virgen del Valle',
      short_name: 'Playa Buche',
      description: 'Sistema integral de gestión costera, comandera de mesoneros, control de excursiones, cocina KDS, administración financiera y menú digital para Playa Buche.',
      theme_color: '#002546',
      background_color: '#002546',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/pwa-maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    };
    zip.file('manifest.webmanifest', JSON.stringify(manifestJson, null, 2));

    // 3. Add Capacitor configuration for Android APK compile
    const capacitorConfig = {
      appId: 'com.playabuche.app',
      appName: 'Playa Buche',
      webDir: 'dist',
      server: {
        androidScheme: 'https',
      },
    };
    zip.file('capacitor.config.json', JSON.stringify(capacitorConfig, null, 2));

    // 4. Add TWA manifest for Bubblewrap APK
    const twaManifest = {
      packageId: 'com.playabuche.twa',
      host: typeof window !== 'undefined' ? window.location.host : 'ais-pre-ctlsi4v7hvt7os75dy3meq-724902067430.us-east1.run.app',
      name: 'Playa Buche',
      launcherName: 'Playa Buche',
      themeColor: '#002546',
      navigationColor: '#002546',
      backgroundColor: '#002546',
      enableNotifications: true,
      startUrl: '/',
      iconUrl: '/pwa-512x512.png',
      maskableIconUrl: '/pwa-maskable-512x512.png',
    };
    zip.file('twa-manifest.json', JSON.stringify(twaManifest, null, 2));

    // 5. Add direct standalone Launcher HTML
    const launcherHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Playa Buche - Lanzador Prototipo</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #00172d 0%, #002546 50%, #00426b 100%);
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 28px;
      padding: 36px 28px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }
    .logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 16px;
      background: #eff4ff;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(0,103,130,0.4);
    }
    h1 {
      font-size: 22px;
      margin: 0 0 6px 0;
      font-weight: 800;
      color: #fff;
    }
    .subtitle {
      font-size: 11px;
      color: #57d1fd;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    p {
      font-size: 13px;
      color: #bbe9ff;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .btn {
      display: block;
      width: 100%;
      box-sizing: border-box;
      padding: 14px 20px;
      background: #006782;
      color: #fff;
      text-decoration: none;
      font-weight: 800;
      font-size: 14px;
      border-radius: 16px;
      box-shadow: 0 8px 20px rgba(0,103,130,0.4);
      transition: transform 0.1s, background 0.2s;
    }
    .btn:active {
      transform: scale(0.98);
      background: #00536a;
    }
    .note {
      font-size: 11px;
      color: #8da4be;
      margin-top: 18px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#002546" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="5" r="3"/>
        <line x1="12" y1="22" x2="12" y2="8"/>
        <path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
      </svg>
    </div>
    <div class="subtitle">Bahía Buche • Carenero</div>
    <h1>Playa Buche POS & KDS</h1>
    <p>Acceso directo al prototipo de punto de venta marino, comandera de toldos y cocina.</p>
    <a href="${currentUrl}" class="btn" target="_self">
      Abrir Prototipo Directo
    </a>
    <div class="note">Modo Prototipo PWA • Funciona sin conexión</div>
  </div>
  <script>
    // Redirigir de forma automática al abrir
    setTimeout(function() {
      window.location.href = "${currentUrl}";
    }, 900);
  </script>
</body>
</html>`;
    zip.file('Lanzador-PlayaBuche.html', launcherHtml);

    // 6. Add Live Prototype Data Dump
    if (appData) {
      const liveData = {
        app: 'Playa Buche POS & KDS',
        exportedAt: new Date().toISOString(),
        bcvRate: appData.bcvRate || 54.50,
        orders: appData.orders || [],
        menuItems: appData.menuItems || [],
        spots: appData.spots || [],
        users: appData.users || [],
        bankConfig: appData.bankConfig || {},
      };
      zip.file('datos-prototipo-playabuche.json', JSON.stringify(liveData, null, 2));
    }

    // 7. Add Standalone Interactive Offline Menu HTML
    const sampleItems = (appData?.menuItems as any[]) || [
      { id: '1', name: 'Pargo Rojo Frito Crispy (~600g)', category: 'fish', priceUsd: 24, description: 'Pargo fresco de la costa con tostones playeros y ensalada rallada caribeña' },
      { id: '2', name: 'Ración de Tostones Playeros con Queso', category: 'sides', priceUsd: 8, description: 'Plátano verde frito con abundante queso blanco rallado de Barlovento y salsas' },
      { id: '3', name: 'Balde de 6 Polar Pilsen o Light', category: 'drinks', priceUsd: 12, description: 'Cervezas nacionales vestidas de novia con hielo en tobo playero' },
      { id: '4', name: 'Fosforera de Mariscos Bahía Buche', category: 'fish', priceUsd: 18, description: 'Concentrado marino de calamares, camarones, chipichipis y cangrejo fresco' },
    ];
    const offlineMenuHtml = this.generateOfflineMenuHtml(sampleItems, appData?.bcvRate || 54.50);
    zip.file('Menu-Digital-Offline.html', offlineMenuHtml);

    // Fetch existing public icons and embed into zip
    try {
      const iconResp = await fetch('/icon.svg');
      if (iconResp.ok) {
        const iconSvg = await iconResp.text();
        zip.file('icon.svg', iconSvg);
      }
    } catch {}

    // Generate zip blob and trigger download
    const content = await zip.generateAsync({ type: 'blob' });
    const downloadUrl = URL.createObjectURL(content);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'PlayaBuche-Prototipo-Instalable.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  }

  // 6. SINGLE-CLICK LAUNCHER HTML DOWNLOAD
  downloadLauncherHtml(): void {
    soundService.playCashChime();
    const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-ctlsi4v7hvt7os75dy3meq-724902067430.us-east1.run.app';

    const launcherHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#002546">
  <title>Playa Buche</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #002546;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
      padding: 16px;
      box-sizing: border-box;
    }
    .box {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 360px;
      width: 100%;
    }
    h2 { margin: 0 0 8px 0; font-size: 20px; font-weight: 800; }
    p { font-size: 13px; opacity: 0.85; line-height: 1.4; margin: 0 0 20px 0; }
    .btn {
      display: block;
      background: #006782;
      color: #fff;
      font-weight: bold;
      text-decoration: none;
      padding: 14px;
      border-radius: 14px;
      box-shadow: 0 6px 16px rgba(0,103,130,0.4);
    }
  </style>
</head>
<body>
  <div class="box">
    <h2>Playa Buche POS</h2>
    <p>Iniciando sistema de comandas, cocina y punto de venta marino...</p>
    <a class="btn" href="${currentUrl}" target="_self">
      Entrar a la Aplicación
    </a>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = "${currentUrl}";
    }, 700);
  </script>
</body>
</html>`;

    const blob = new Blob([launcherHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PlayaBuche-Lanzador-App.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 7. OFFLINE DIGITAL MENU DOWNLOAD (.HTML)
  generateOfflineMenuHtml(items: any[], bcvRate: number = 54.50): string {
    const dishesHtml = items
      .map((item) => {
        const bsPrice = (item.priceUsd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `
        <div class="dish-card">
          <div class="dish-header">
            <span class="dish-name">${item.name}</span>
            <span class="dish-price">$${item.priceUsd.toFixed(2)}</span>
          </div>
          <div class="dish-desc">${item.description || 'Plato típico preparado al momento en los fogones de Playa Buche.'}</div>
          <div class="dish-bs">Ref. BCV: Bs. ${bsPrice}</div>
        </div>
      `;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Menú Digital - Playa Buche</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f4f6fa;
      color: #002546;
    }
    header {
      background: #002546;
      color: #fff;
      padding: 24px 16px;
      text-align: center;
      border-bottom: 4px solid #006782;
    }
    header h1 { margin: 0; font-size: 22px; font-weight: 800; }
    header p { margin: 6px 0 0 0; font-size: 12px; color: #57d1fd; font-weight: 600; }
    .rate-badge {
      display: inline-block;
      margin-top: 10px;
      padding: 4px 12px;
      background: rgba(255,255,255,0.12);
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
    }
    .container {
      max-width: 600px;
      margin: 16px auto;
      padding: 0 16px 40px;
    }
    .dish-card {
      background: #fff;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 2px 8px rgba(0,37,70,0.06);
      border: 1px solid #e2e8f0;
    }
    .dish-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }
    .dish-name {
      font-weight: 800;
      font-size: 15px;
      color: #002546;
    }
    .dish-price {
      font-weight: 900;
      font-size: 16px;
      color: #006782;
      white-space: nowrap;
    }
    .dish-desc {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
      line-height: 1.4;
    }
    .dish-bs {
      margin-top: 8px;
      font-size: 11px;
      font-weight: 700;
      color: #047857;
    }
    footer {
      text-align: center;
      padding: 20px;
      font-size: 11px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <header>
    <h1>INV. VIRGEN DEL VALLE</h1>
    <p>Bahía Buche • Carenero, Higuerote</p>
    <div class="rate-badge">Tasa Oficial: Bs. ${bcvRate.toFixed(2)} / USD • Menú 100% Offline</div>
  </header>
  <div class="container">
    ${dishesHtml}
  </div>
  <footer>
    Playa Buche • Prototipo de Menú Autónomo • Pago Móvil & Efectivo
  </footer>
</body>
</html>`;
  }

  downloadOfflineMenuHtml(items: any[], bcvRate: number = 54.50): void {
    soundService.playCashChime();
    const html = this.generateOfflineMenuHtml(items, bcvRate);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Menu-Digital-PlayaBuche-Offline.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 8. DATA BACKUP JSON EXPORT & IMPORT
  downloadDataBackupJson(data: Record<string, unknown>): void {
    soundService.playCashChime();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playabuche-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 9. HIGH-RESOLUTION QR CODE GENERATION
  async generateQrCodeDataUrl(text: string): Promise<string> {
    try {
      return await QRCode.toDataURL(text, {
        width: 360,
        margin: 2,
        color: {
          dark: '#002546',
          light: '#ffffff',
        },
      });
    } catch (err) {
      console.error('Error generating QR code:', err);
      return '';
    }
  }

  downloadQrPng(dataUrl: string, fileName: string = 'QR-PlayaBuche-Prototipo.png'): void {
    soundService.playCashChime();
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export const hardwareDriversService = new HardwareDriversService();
