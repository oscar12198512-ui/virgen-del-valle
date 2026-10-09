# Guía Maestra de Publicación — Playa Buche / Virgen del Valle

Este documento recopila las instrucciones, requisitos y artefactos para publicar **Playa Buche** en las principales tiendas de aplicaciones móviles Android.

---

## 1. Google Play Store

- **Formato requerido**: Android App Bundle (`.aab`) firmado con clave de producción.
- **Identificador de paquete**: `com.virgendelvalle.playabuche`
- **Target SDK**: Android 15 (API 35+) / minSdk 22 (Android 5.1+).
- **Consola**: [Google Play Console](https://play.google.com/console)
- **Materiales preparados**:
  - Ícono oficial: `public/pwa-512x512.png` / `assets/icon-only.png` (1024x1024)
  - Gráfico de funciones: `assets/play-store-graphic.png` (1024x500)
  - Política de privacidad: `https://virgen-del-valle-web.onrender.com/privacy.html`
  - Solicitud de eliminación de datos: `https://virgen-del-valle-web.onrender.com/delete-account.html`
  - Ficha detallada: Ver `STORE_LISTING_GOOGLE_PLAY.md`.

---

## 2. Uptodown App Store

- **Formato requerido**: Archivo `.apk` universal standalone (firmado en modo release o debug funcional).
- **Consola**: [Uptodown Developers Console](https://developer.uptodown.com/)
- **Ventajas**: Aprobación rápida, no requiere Google Play Services obligatorios, permite distribución libre en países de Latinoamérica.
- **Artefactos a subir**:
  - Archivo APK: `android/app/build/outputs/apk/release/app-release.apk` o `signing/playa-buche-release.apk`.
  - Capturas de pantalla: Resolución mínima 1080x1920 (mínimo 3 capturas).

---

## 3. Amazon Appstore

- **Formato requerido**: Archivo `.apk` o `.aab` compatible con Fire OS / Android.
- **Consola**: [Amazon Developer Console](https://developer.amazon.com/)
- **Requisitos específicos**:
  - No depender exclusivamente de Google Play Billing o Google Maps nativo (la app utiliza webview estándar y Firebase Firestore, compatible al 100%).
  - Imágenes promocionales: 1024x500 (banner) y 512x512 (ícono en formato PNG transparente o sólido).

---

## 4. Samsung Galaxy Store

- **Formato requerido**: Archivo `.apk` o `.aab` firmado.
- **Consola**: [Samsung Galaxy Store Developer Portal](https://seller.samsungapps.com/)
- **Requisitos específicos**:
  - Certificado de firma digital (Keystore).
  - Ícono oficial de 512x512 sin esquinas redondeadas (Galaxy Store aplica la máscara automáticamente).

---

## 5. Procedimiento de Generación de Binarios Firmados

Para generar los binarios firmados en GitHub Actions sin exponer claves privadas:
1. En GitHub: `Settings` ➔ `Secrets and variables` ➔ `Actions`.
2. Configurar los secretos:
   - `ANDROID_KEYSTORE_BASE64`: Contenido en Base64 de tu archivo `.keystore` o `.jks`.
   - `ANDROID_KEYSTORE_PASSWORD`: Clave del almacén.
   - `ANDROID_KEY_ALIAS`: Alias de la clave.
   - `ANDROID_KEY_PASSWORD`: Clave del alias.
3. El pipeline `verify.yml` compilará y empaquetará automáticamente el `.apk` y `.aab` listos para descargar desde la pestaña **Actions** de GitHub.
