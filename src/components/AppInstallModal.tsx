import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Smartphone,
  CheckCircle2,
  Camera,
  Bell,
  HardDrive,
  ExternalLink,
  X,
  Share2,
  PlusSquare,
  Sparkles,
  ShieldCheck,
  Printer,
  Vibrate,
  MapPin,
  BatteryCharging,
  Battery,
  FolderArchive,
  FileCode,
  Check,
  AlertCircle,
  Volume2,
  QrCode,
  Copy,
  RotateCcw,
  Settings,
  Database,
  Monitor,
  Wifi,
  WifiOff,
  Upload,
  Eye,
  Sliders,
  Maximize,
  Minimize
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundService } from '../services/soundService';
import { hardwareDriversService } from '../services/hardwareDriversService';
import { UserRole, Order, MenuItem, ToldoSpot, User, BankConfig } from '../types';

interface AppInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Prototype Settings & Data
  bcvRate?: number;
  onUpdateBcvRate?: (newRate: number) => void;
  isOffline?: boolean;
  onToggleOffline?: () => void;
  currentRole?: UserRole;
  onSelectRole?: (role: UserRole) => void;
  orders?: Order[];
  menuItems?: MenuItem[];
  spots?: ToldoSpot[];
  users?: User[];
  bankConfig?: BankConfig;
  onResetFactoryData?: () => void;
}

export const AppInstallModal: React.FC<AppInstallModalProps> = ({
  isOpen,
  onClose,
  bcvRate = 54.50,
  onUpdateBcvRate,
  isOffline = false,
  onToggleOffline,
  currentRole = 'waiter',
  onSelectRole,
  orders = [],
  menuItems = [],
  spots = [],
  users = [],
  bankConfig,
  onResetFactoryData,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'download' | 'settings' | 'data' | 'drivers'>('download');

  // QR Code State
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Rate input state
  const [tempRate, setTempRate] = useState<string>(bcvRate.toString());

  // Camera driver state
  const [cameraStatus, setCameraStatus] = useState<'granted' | 'prompt' | 'denied' | 'unknown'>('unknown');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Notification driver state
  const [notificationStatus, setNotificationStatus] = useState<'granted' | 'default' | 'denied'>('default');

  // GPS driver state
  const [gpsData, setGpsData] = useState<{ lat: number; lng: number; accuracy: number; placeName: string } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Battery driver state
  const [batteryData, setBatteryData] = useState<{ levelPercent: number; charging: boolean } | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Status notices
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTempRate(bcvRate.toString());
  }, [bcvRate]);

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      return;
    }

    // Generate QR code for the current URL
    const appUrl = typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-ctlsi4v7hvt7os75dy3meq-724902067430.us-east1.run.app';
    hardwareDriversService.generateQrCodeDataUrl(appUrl).then((url) => {
      if (url) setQrDataUrl(url);
    });

    // Check notifications
    if ('Notification' in window) {
      setNotificationStatus(Notification.permission);
    }

    // Check camera permission
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((p) => setCameraStatus(p.state))
        .catch(() => setCameraStatus('unknown'));
    }

    // Query battery
    hardwareDriversService.getBatteryStatus().then((b) => {
      if (b) setBatteryData(b);
    });

    // Check fullscreen
    setIsFullscreen(Boolean(document.fullscreenElement));

    return () => {
      stopCameraStream();
    };
  }, [isOpen]);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleToggleCameraTest = async () => {
    soundService.playTap();
    if (isCameraActive) {
      stopCameraStream();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      setCameraStatus('granted');
      soundService.playSuccess();
      setActionNotice('Driver de Cámara Activo: Transmisión óptica en vivo iniciada.');
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      console.warn('Camera error:', err);
      setCameraStatus('denied');
      setActionNotice('⚠️ Error al iniciar sensor de cámara o permiso rechazado.');
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  const handleTestVibration = (pattern: 'tap' | 'orderReady' | 'urgent') => {
    soundService.playTap();
    const ok = hardwareDriversService.triggerHaptic(pattern);
    if (ok) {
      setActionNotice(`📳 Driver Háptico ejecutado: Patrón [${pattern}] emitido.`);
    } else {
      setActionNotice('Dispositivo sin motor de vibración háptico o en navegador no móvil.');
    }
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleTestPrint = (type: 'comanda' | 'actaZ' | 'ticket') => {
    soundService.playTap();
    hardwareDriversService.printTestVoucher(type);
    setActionNotice(`🖨️ Driver Térmico: Generado voucher ${type.toUpperCase()} para impresión ESC/POS.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleRequestGps = async () => {
    soundService.playTap();
    setGpsLoading(true);
    try {
      const coords = await hardwareDriversService.requestGeolocation();
      setGpsData(coords);
      soundService.playSuccess();
      setActionNotice(`📍 Driver GPS Sincronizado: Precisión ±${coords.accuracy}m en Bahía Buche.`);
    } catch {
      setActionNotice('⚠️ No se pudo obtener ubicación GPS (verifique permisos de localización).');
    } finally {
      setGpsLoading(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleRequestNotification = async () => {
    soundService.playTap();
    if (!('Notification' in window)) {
      setActionNotice('Este navegador no soporta Notificaciones Push Web.');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotificationStatus(perm);
    if (perm === 'granted') {
      soundService.playCashChime();
      setActionNotice('✅ Driver de Notificaciones Activado: Alertas de cocina y pedidos habilitadas.');
      new Notification('Playa Buche', {
        body: 'Driver de avisos operativos listo. Notificaciones autorizadas.',
        icon: '/pwa-192x192.png',
      });
    } else {
      setActionNotice('⚠️ Permiso de notificaciones no concedido.');
    }
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleDownloadZip = async () => {
    soundService.playTap();
    setIsZipping(true);
    try {
      await hardwareDriversService.generateAndDownloadPrototypeZip({
        orders,
        menuItems,
        spots,
        users,
        bcvRate,
        bankConfig,
      });
      setActionNotice('📦 Paquete Prototipo descargado exitosamente (.ZIP con PWA, APK configs, Menú Offline y Launcher).');
    } catch (err) {
      console.error(err);
      setActionNotice('Error al empaquetar prototipo.');
    } finally {
      setIsZipping(false);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleDownloadLauncher = () => {
    soundService.playTap();
    hardwareDriversService.downloadLauncherHtml();
    setActionNotice('📱 Archivo Lanzador Directo descargado (.html listo para guardar y abrir).');
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleDownloadOfflineMenu = () => {
    soundService.playTap();
    hardwareDriversService.downloadOfflineMenuHtml(menuItems, bcvRate);
    setActionNotice('📋 Menú Digital Autónomo descargado (.html interactivo sin conexión).');
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleDownloadDataBackup = () => {
    soundService.playTap();
    const backupData = {
      app: 'Playa Buche POS & KDS',
      exportedAt: new Date().toISOString(),
      bcvRate,
      orders,
      menuItems,
      spots,
      users,
      bankConfig,
    };
    hardwareDriversService.downloadDataBackupJson(backupData);
    setActionNotice('💾 Respaldo JSON descargado con todas las órdenes y datos del prototipo.');
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleDownloadQrImage = () => {
    soundService.playTap();
    if (qrDataUrl) {
      hardwareDriversService.downloadQrPng(qrDataUrl, 'QR-Prototipo-PlayaBuche.png');
      setActionNotice('🖼️ Imagen de Código QR descargada (.PNG listo para imprimir en toldos).');
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleCopyDirectLink = () => {
    soundService.playTap();
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.clipboard && url) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setActionNotice('🔗 Enlace directo copiado al portapapeles.');
      setTimeout(() => {
        setCopiedLink(false);
        setActionNotice(null);
      }, 3500);
    }
  };

  const handleOpenDirectWindow = () => {
    soundService.playTap();
    window.open(window.location.href, '_blank');
  };

  const handleNativeInstall = async () => {
    soundService.playTap();
    const ok = await install();
    if (ok) {
      soundService.playCashChime();
      onClose();
    }
  };

  const handleToggleFullscreen = () => {
    soundService.playTap();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleSaveRate = () => {
    const val = parseFloat(tempRate);
    if (!isNaN(val) && val > 0 && onUpdateBcvRate) {
      onUpdateBcvRate(val);
      soundService.playSuccess();
      setActionNotice(`💵 Tasa BCV actualizada a Bs. ${val.toFixed(2)} por USD.`);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const handleRateQuickStep = (step: number) => {
    const val = parseFloat(tempRate) || bcvRate;
    const newVal = Math.max(1, Math.round((val + step) * 100) / 100);
    setTempRate(newVal.toFixed(2));
    if (onUpdateBcvRate) {
      onUpdateBcvRate(newVal);
      soundService.playSuccess();
    }
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          soundService.playCashChime();
          setActionNotice('📥 Datos importados correctamente al prototipo.');
          setTimeout(() => setActionNotice(null), 4000);
        }
      } catch (err) {
        console.error('Error importing JSON', err);
        setActionNotice('⚠️ Error: el archivo no es un JSON de datos válido.');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-[#002546] text-white p-4 relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#eff4ff]/15 border border-white/20 flex items-center justify-center p-2 shrink-0">
              <img src="/icon.svg" alt="Playa Buche" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold text-[#57d1fd] uppercase tracking-wider block">
                  CONSOLA DE PROTOTIPO & DESCARGA DIRECTA
                </span>
                <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                  V1.0
                </span>
              </div>
              <h3 className="text-base font-extrabold leading-tight text-white">
                Playa Buche • Virgen del Valle
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            title="Cerrar ajustes"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-3 pt-2 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              soundService.playTap();
              setActiveTab('download');
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'download'
                ? 'border-[#002546] text-[#002546]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descarga Directa</span>
          </button>

          <button
            onClick={() => {
              soundService.playTap();
              setActiveTab('settings');
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'settings'
                ? 'border-[#002546] text-[#002546]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Ajustes del Prototipo</span>
          </button>

          <button
            onClick={() => {
              soundService.playTap();
              setActiveTab('data');
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'data'
                ? 'border-[#002546] text-[#002546]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Datos & Respaldo</span>
          </button>

          <button
            onClick={() => {
              soundService.playTap();
              setActiveTab('drivers');
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'drivers'
                ? 'border-[#002546] text-[#002546]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Drivers de Hardware</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-gray-700">
          {/* Action notice toast */}
          {actionNotice && (
            <div className="p-3 bg-[#eff4ff] border border-[#a4c9fc] text-[#002546] rounded-xl font-bold text-xs flex items-center gap-2 animate-fade-in shadow-xs">
              <Sparkles className="w-4 h-4 text-[#006782] shrink-0" />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* TAB 1: DESCARGA DIRECTA */}
          {activeTab === 'download' && (
            <div className="space-y-3.5">
              {/* Primary Instant Download Card */}
              <div className="bg-[#eff4ff] border border-[#d2e4ff] rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-[#002546] text-sm flex items-center gap-1.5">
                    <FolderArchive className="w-4 h-4 text-[#006782]" /> Paquete Prototipo Completo
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                    ZIP LISTO
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Descarga instantánea del paquete de la aplicación con manifiesto PWA, configs para compilar en 
                  <strong> Android APK (Capacitor / TWA)</strong>, carta digital offline, respaldo JSON de datos y lanzador directo.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={isZipping}
                    className="py-2.5 px-3 bg-[#006782] hover:bg-[#005870] disabled:bg-gray-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isZipping ? 'Empaquetando...' : 'Descargar Paquete ZIP'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadLauncher}
                    className="py-2.5 px-3 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-98"
                  >
                    <FileCode className="w-4 h-4 text-[#57d1fd]" />
                    <span>Descargar Lanzador .HTML</span>
                  </button>
                </div>
              </div>

              {/* QR Code & Direct Mobile Access */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-[#002546] flex items-center gap-1.5 text-xs">
                    <QrCode className="w-4 h-4 text-[#006782]" /> Escanear en Celular o Tablet
                  </span>
                  <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded-full">
                    Instalación en 3 segundos
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                  {qrDataUrl ? (
                    <div className="p-2 bg-white rounded-xl border border-gray-200 shadow-2xs shrink-0 flex flex-col items-center">
                      <img src={qrDataUrl} alt="QR Playa Buche" className="w-28 h-28 object-contain" />
                      <button
                        type="button"
                        onClick={handleDownloadQrImage}
                        className="mt-1.5 text-[10px] text-[#006782] hover:underline font-bold flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Descargar PNG
                      </button>
                    </div>
                  ) : (
                    <div className="w-28 h-28 bg-gray-200 animate-pulse rounded-xl shrink-0" />
                  )}

                  <div className="space-y-2 text-[11px] text-gray-600 flex-1">
                    <p>
                      Apunta la cámara de tu teléfono al código para abrir el prototipo directamente en tu navegador móvil sin pasar por el editor.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCopyDirectLink}
                        className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-[#002546] border border-gray-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copiado' : 'Copiar Enlace'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenDirectWindow}
                        className="px-2.5 py-1.5 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#57d1fd]" />
                        <span>Abrir en Pestaña Directa</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Standalone Offline Menu Download */}
              <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#002546] text-xs">Menú Digital Autónomo (.HTML)</h4>
                    <span className="text-[10px] text-gray-500">Carta con precios en $ y Bs para compartir a turistas</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadOfflineMenu}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>
              </div>

              {/* Native PWA One-Click Install */}
              {isInstallable && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Instalación Nativa Detectada</span>
                    <span className="text-[10px] text-emerald-800">Tu explorador soporta instalar Playa Buche en 1 clic</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Instalar Ahora</span>
                  </button>
                </div>
              )}

              {/* Installation Guide */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-2 text-[11px]">
                <span className="font-bold text-[#002546] block">Guía de Instalación en Dispositivos de Playa:</span>
                <div className="space-y-1.5 text-gray-600">
                  <div>
                    <strong className="text-gray-800">📱 Android (Chrome):</strong> Al abrir la app en ventana directa, pulsa los 3 puntos (⋮) ➔ <em>"Instalar aplicación"</em>.
                  </div>
                  <div>
                    <strong className="text-gray-800">🍏 iPhone (Safari):</strong> Pulsa el botón <em>Compartir</em> <Share2 className="w-3 h-3 inline text-sky-600 mx-0.5" /> ➔ <em>"Agregar al inicio"</em> <PlusSquare className="w-3 h-3 inline text-gray-700 mx-0.5" />.
                  </div>
                  <div>
                    <strong className="text-gray-800">💻 PC / Mac (Chrome / Edge):</strong> Haz clic en el icono de instalación en la barra de direcciones superior.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AJUSTES DEL PROTOTIPO */}
          {activeTab === 'settings' && (
            <div className="space-y-3.5">
              {/* 1. Modo de Conectividad Simulado */}
              <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#002546] text-xs flex items-center gap-1.5">
                    {isOffline ? <WifiOff className="w-4 h-4 text-rose-600" /> : <Wifi className="w-4 h-4 text-emerald-600" />}
                    Simulador de Conectividad en Bahía Buche
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isOffline ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isOffline ? '100% OFFLINE' : 'STARLINK ONLINE'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600">
                  Prueba cómo se comporta el prototipo cuando cae la señal 3G/LTE en la costa.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isOffline && onToggleOffline) onToggleOffline();
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                      !isOffline
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    🟢 Modo Conectado
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isOffline && onToggleOffline) onToggleOffline();
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                      isOffline
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    🔴 Modo 100% Offline
                  </button>
                </div>
              </div>

              {/* 2. Ajuste Rápido de Tasa Oficial BCV */}
              <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#002546] text-xs flex items-center gap-1.5">
                    💵 Tasa Oficial BCV del Prototipo
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-700">
                    Bs. {bcvRate.toFixed(2)} / USD
                  </span>
                </div>
                <p className="text-[11px] text-gray-600">
                  Ajusta la tasa de cambio en vivo para ver cómo se recalculan los precios de platos y pre-cuentas.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRateQuickStep(-1)}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-mono font-bold text-xs"
                  >
                    -1.00
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRateQuickStep(-0.1)}
                    className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-mono font-bold text-xs"
                  >
                    -0.10
                  </button>
                  <input
                    type="number"
                    step="0.01"
                    value={tempRate}
                    onChange={(e) => setTempRate(e.target.value)}
                    onBlur={handleSaveRate}
                    className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-mono font-bold text-center text-xs focus:outline-hidden focus:border-[#006782]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRateQuickStep(0.1)}
                    className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-mono font-bold text-xs"
                  >
                    +0.10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRateQuickStep(1)}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-mono font-bold text-xs"
                  >
                    +1.00
                  </button>
                </div>
              </div>

              {/* 3. Selector de Rol de Inicio */}
              {onSelectRole && (
                <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-2xs space-y-2">
                  <span className="font-bold text-[#002546] text-xs block">
                    👤 Rol Activo del Prototipo
                  </span>
                  <p className="text-[11px] text-gray-600">
                    Cambia la perspectiva del prototipo para probar los diferentes módulos de trabajo:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                    {[
                      { role: 'waiter' as UserRole, label: '🏖️ Mesoneros' },
                      { role: 'kitchen' as UserRole, label: '🍳 Cocina KDS' },
                      { role: 'excursion' as UserRole, label: '🚤 Lanchas / Excursión' },
                      { role: 'admin' as UserRole, label: '💼 Dueños / Finanzas' },
                      { role: 'client' as UserRole, label: '🌴 Menú Clientes' },
                    ].map((item) => (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => {
                          soundService.playTap();
                          onSelectRole(item.role);
                        }}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-colors border ${
                          currentRole === item.role
                            ? 'bg-[#002546] text-white border-[#002546]'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Modo Kiosco / Pantalla Completa & Audio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-[#006782]" />
                    <div>
                      <span className="font-bold text-[#002546] text-xs block">Modo Pantalla Completa</span>
                      <span className="text-[10px] text-gray-500">Simulador de Tablet POS</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-[#002546] rounded-xl transition-colors"
                    title="Alternar pantalla completa"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-amber-600" />
                    <div>
                      <span className="font-bold text-[#002546] text-xs block">Efectos de Audio</span>
                      <span className="text-[10px] text-gray-500">Campana de cocina y caja</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => soundService.playCashChime()}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-[11px] font-bold border border-amber-200 transition-colors"
                  >
                    Probar Timbre
                  </button>
                </div>
              </div>

              {/* 5. Restablecer Datos de Fábrica */}
              {onResetFactoryData && (
                <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-rose-950 text-xs block">Restablecer Prototipo a Fábrica</span>
                    <span className="text-[10px] text-rose-700">Limpia pedidos de prueba y restaura datos limpios</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('¿Deseas reiniciar todos los datos del prototipo a los valores iniciales de demostración?')) {
                        soundService.playTap();
                        onResetFactoryData();
                        setActionNotice('🔄 Prototipo reiniciado a valores iniciales de fábrica.');
                        setTimeout(() => setActionNotice(null), 3500);
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DATOS & RESPALDO */}
          {activeTab === 'data' && (
            <div className="space-y-3.5">
              {/* Data Backup Download */}
              <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#002546] text-xs flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[#006782]" /> Respaldo en Vivo del Prototipo (.JSON)
                  </span>
                  <span className="text-[10px] bg-sky-100 text-[#006782] font-bold px-2 py-0.5 rounded-full">
                    {orders.length} pedidos • {menuItems.length} platos
                  </span>
                </div>
                <p className="text-[11px] text-gray-600">
                  Exporta un archivo JSON con todas las órdenes activas, comandas de toldo, carta de platos, personal autorizado y cierres de caja.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadDataBackup}
                    className="flex-1 py-2 bg-[#006782] hover:bg-[#005870] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Backup JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-[#002546] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-gray-200"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Cargar Archivo JSON</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportJsonFile}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Developer Configuration Files */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 space-y-2">
                <span className="font-bold text-[#002546] text-xs block">
                  Archivos de Configuración para Compilación Móvil:
                </span>
                <div className="space-y-2 text-[11px] text-gray-600">
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-200">
                    <div>
                      <strong className="text-gray-800 block">manifest.webmanifest</strong>
                      <span className="text-[10px] text-gray-500">Configuración PWA Standalone y accesos directos</span>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      Incluido en ZIP
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-200">
                    <div>
                      <strong className="text-gray-800 block">capacitor.config.json</strong>
                      <span className="text-[10px] text-gray-500">Listo para compilación Android APK con Capacitor CLI</span>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      Incluido en ZIP
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-200">
                    <div>
                      <strong className="text-gray-800 block">twa-manifest.json</strong>
                      <span className="text-[10px] text-gray-500">Trusted Web Activity para Google Play Store</span>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      Incluido en ZIP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DRIVERS & HARDWARE */}
          {activeTab === 'drivers' && (
            <div className="space-y-3">
              {/* 1. Driver de Impresora Térmica */}
              <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#006782] flex items-center justify-center">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#002546] text-xs">Driver Impresora Térmica ESC/POS</h4>
                      <span className="text-[10px] text-gray-500">Bluetooth / USB / Red (58mm y 80mm)</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Conectado
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleTestPrint('comanda')}
                    className="flex-1 py-1.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002546] border border-[#d2e4ff] rounded-lg text-[10px] font-bold transition-colors"
                  >
                    Test Comanda Cocina
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestPrint('actaZ')}
                    className="flex-1 py-1.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002546] border border-[#d2e4ff] rounded-lg text-[10px] font-bold transition-colors"
                  >
                    Test Acta Z Fiscal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestPrint('ticket')}
                    className="flex-1 py-1.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002546] border border-[#d2e4ff] rounded-lg text-[10px] font-bold transition-colors"
                  >
                    Test Pre-Cuenta
                  </button>
                </div>
              </div>

              {/* 2. Driver Óptico & Cámara QR */}
              <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#002546] text-xs">Driver Sensor Óptico & Cámara QR</h4>
                      <span className="text-[10px] text-gray-500">Escaneo de toldos y comprobantes bancarios</span>
                    </div>
                  </div>
                  <div>
                    {cameraStatus === 'granted' ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Permiso Activo
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                        Requiere Prueba
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleToggleCameraTest}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                      isCameraActive
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-[#002546] hover:bg-[#0d3b66] text-white'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isCameraActive ? 'Apagar Prueba de Cámara' : 'Probar Cámara en Vivo (Sensor QR)'}</span>
                  </button>

                  {isCameraActive && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-gray-300 bg-black aspect-video relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-40 h-40 border-2 border-emerald-400 border-dashed rounded-2xl animate-pulse"></div>
                      </div>
                      <span className="absolute bottom-2 left-2 bg-black/70 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-mono">
                        SCANNER QR ACTIVO • 30 FPS
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Driver Motor Háptico / Vibrador */}
              <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <Vibrate className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#002546] text-xs">Driver Motor Háptico & Vibración</h4>
                      <span className="text-[10px] text-gray-500">Alertas táctiles para mesoneros en la arena</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Soportado
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleTestVibration('tap')}
                    className="py-1.5 px-2 bg-gray-100 hover:bg-gray-200 text-[#002546] rounded-lg text-[10px] font-bold transition-colors"
                  >
                    Vibración Toque
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestVibration('orderReady')}
                    className="py-1.5 px-2 bg-gray-100 hover:bg-gray-200 text-[#002546] rounded-lg text-[10px] font-bold transition-colors"
                  >
                    Plato Listo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestVibration('urgent')}
                    className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg text-[10px] font-bold transition-colors"
                  >
                    Alerta Crítica
                  </button>
                </div>
              </div>

              {/* 4. Driver Geolocalización Marina (Toldo & Muelle) */}
              <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#002546] text-xs">Driver GPS & Telemetría de Playa</h4>
                      <span className="text-[10px] text-gray-500">Ubicación de toldos y aproximación de lanchas</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestGps}
                    disabled={gpsLoading}
                    className="px-2.5 py-1 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-lg text-[10px] font-bold transition-colors"
                  >
                    {gpsLoading ? 'Localizando...' : 'Probar GPS'}
                  </button>
                </div>
                {gpsData && (
                  <div className="bg-teal-50/70 border border-teal-200 p-2 rounded-xl text-[11px] text-teal-950 font-mono space-y-0.5">
                    <div><strong>Coordenadas:</strong> {gpsData.lat.toFixed(5)}, {gpsData.lng.toFixed(5)}</div>
                    <div><strong>Precisión:</strong> ±{gpsData.accuracy} metros ({gpsData.placeName})</div>
                  </div>
                )}
              </div>

              {/* 5. Driver Batería de Terminales & Memoria Offline */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-[#006782]">
                    {batteryData?.charging ? (
                      <BatteryCharging className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Battery className="w-4 h-4" />
                    )}
                    <span className="font-bold text-xs text-[#002546]">Driver Batería</span>
                  </div>
                  <div className="text-lg font-extrabold text-[#002546]">
                    {batteryData ? `${batteryData.levelPercent}%` : 'Sensor OK'}
                  </div>
                  <span className="text-[10px] text-gray-500 block">
                    {batteryData?.charging ? 'Cargando en Base POS' : 'Autonomía en Toldo'}
                  </span>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <HardDrive className="w-4 h-4" />
                    <span className="font-bold text-xs text-[#002546]">Memoria Offline</span>
                  </div>
                  <div className="text-lg font-extrabold text-[#002546]">Persistente</div>
                  <span className="text-[10px] text-gray-500 block">LocalStorage + ServiceWorker</span>
                </div>
              </div>

              {/* 6. Driver Notificaciones */}
              <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#002546] text-xs">Driver Notificaciones Push</h4>
                    <span className="text-[10px] text-gray-500">Alertas sonoras y avisos de cocina</span>
                  </div>
                </div>
                {notificationStatus === 'granted' ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Activo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestNotification}
                    className="px-2.5 py-1 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-lg text-[10px] font-bold transition-colors"
                  >
                    Activar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">Playa Buche • Prototipo Autónomo Listo para Descargar</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-colors"
          >
            Cerrar Consola
          </button>
        </div>
      </div>
    </div>
  );
};
