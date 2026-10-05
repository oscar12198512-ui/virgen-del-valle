# Playa Buche · Inversiones Virgen del Valle

Aplicación de gestión para Playa Buche: comandera de mesoneros, cocina KDS, excursiones, caja, personal y menú digital para clientes.

- Frontend: React 19 + Vite + TypeScript + PWA (instalable en móvil)
- Backend: Node + Express
- Base de datos: PostgreSQL
- Android: Capacitor (APK/AAB)
- Despliegue: Render (static site + web service + PostgreSQL)

## Estructura

```
src/                    Frontend React
server/index.js         API REST (autenticación, RBAC, estado, personal, pedidos)
server/db.js            Resolución de la conexión PostgreSQL (DATABASE_URL o PG*)
server/migrate.js       Ejecuta server/migrations/*.sql de forma idempotente
server/migrations/      Esquema canónico
render.yaml             Blueprint de Render (frontend + API + PostgreSQL)
capacitor.config.ts     Empaquetado Android
```

## Roles

| Rol | Acceso |
| --- | --- |
| `admin` (Dueño) | Todas las interfaces: caja, personal, carta, auditoría, RBAC. Crea y suspende cuentas. |
| `waiter` (Mesonero) | Comandera móvil, toma de pedidos, cobros. |
| `kitchen` (Cocina) | Pantalla KDS, estados de preparación y despacho. |
| `excursion` (Excursiones) | Coordinación de muelle y lanchas. |
| `client` (Cliente) | Registro libre, carta digital, pedido y pago de su propia orden. |

La autorización se aplica en la API (`requireAuth` + `requireRole`), no solo ocultando botones. El cliente solo recibe el catálogo público y sus propias órdenes.

## Desarrollo local

```bash
npm ci
cp .env.example .env      # define DATABASE_URL o PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD
npm run db:migrate        # crea el esquema
npm run dev               # frontend en http://localhost:3000
npm start                 # API en el puerto definido por PORT
```

Variables usadas por la API:

- Conexión: `DATABASE_URL` **o** `PGHOST` + `PGPORT` + `PGDATABASE` + `PGUSER` + `PGPASSWORD` (+ `PGSSLMODE` opcional).
- `OWNER_NAME`, `OWNER_EMAIL`, `OWNER_INITIAL_PASSWORD`: crean la cuenta de dueño en el primer arranque. La clave se guarda con bcrypt y nunca se versiona.
- `APP_URL`, `CORS_ORIGIN`, `SESSION_TTL_HOURS`, `PORT`.
- `SMTP_*`: opcionales. Sin SMTP, el enlace de recuperación se registra en los logs del servicio.
- `GEMINI_API_KEY`: opcional. La lectura de comprobantes se ejecuta **en el servidor**; la clave nunca se incrusta en el PWA ni en el APK.

## Producción (Render)

1. Sincroniza el Blueprint de `render.yaml`.
2. En el web service define `OWNER_INITIAL_PASSWORD` (valor secreto). El resto ya está en el blueprint.
3. Opcional: `SMTP_*` para activar la recuperación por correo y `GEMINI_API_KEY` para la lectura de comprobantes.
4. El build de la web service ejecuta `npm ci --omit=dev && npm run db:migrate`.

Variables para el frontend (build del sitio estático): `VITE_API_URL=https://virgen-del-valle-api.onrender.com`.

## Android

```bash
npm run build
npx cap add android          # solo la primera vez
npx capacitor-assets generate --android
npx cap sync android
cd android && ./gradlew assembleDebug     # APK
cd android && ./gradlew bundleRelease     # AAB (requiere clave de firma)
```

El workflow `.github/workflows/verify.yml` compila el APK en cada push. Si existen los secretos `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` y `ANDROID_KEY_PASSWORD`, genera además el APK y el AAB firmados.

`package/application ID`: `com.virgendelvalle.playabuche`

## Publicación

El APK firmado preparado para Uptodown se llama `playa-buche-release.apk` y el bundle de Play es `playa-buche-release.aab`. Ambos se generan en el job `android` de GitHub Actions.