# Virgen del Valle

Aplicación React/Vite/PWA para operación de Playa Buche / Inversiones Virgen del Valle.

## Producción

- Frontend: Render Static Site
- API: Render Web Service
- Base de datos: Render PostgreSQL
- Android: Capacitor
- Health check: `/health`

## Variables obligatorias

Configura en Render los secretos definidos en `.env.example`, especialmente `OWNER_INITIAL_PASSWORD`, `DATABASE_URL`, `CORS_ORIGIN` y las credenciales SMTP si se habilita correo de recuperación.

Nunca commits `.env` ni contraseñas.

## Desarrollo

```bash
npm install
npm run dev
```

API:

```bash
npm start
```
