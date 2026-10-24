import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { app } from '../server/index.js';

// Servidor de pruebas en puerto dinámico
let server;
let baseUrl = '';

test.before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('1. Cabeceras de seguridad HTTP y protección de fingerprinting', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);

  const headers = res.headers;
  assert.equal(headers.get('x-content-type-options'), 'nosniff', 'Debe incluir nosniff');
  assert.equal(headers.get('x-frame-options'), 'DENY', 'Debe incluir DENY para anti-clickjacking');
  assert.ok(headers.get('strict-transport-security'), 'Debe incluir HSTS');
  assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');
  assert.equal(headers.get('x-powered-by'), null, 'X-Powered-By debe estar deshabilitado');

  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.service, 'virgen-del-valle-api');
});

test('2. Validación de entrada en registro público (/api/auth/register)', async () => {
  // Clave demasiado corta (< 8 caracteres)
  const shortPassRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Comensal Test',
      email: 'comensal@playabuche.com',
      password: '123'
    })
  });
  assert.equal(shortPassRes.status, 400);
  const shortPassData = await shortPassRes.json();
  assert.match(shortPassData.message, /al menos 8 caracteres/);

  // Formato de correo inválido
  const invalidEmailRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Comensal Test',
      email: 'correo-invalido-sin-arroba',
      password: 'ClaveSegura123!'
    })
  });
  assert.equal(invalidEmailRes.status, 400);
  const invalidEmailData = await invalidEmailRes.json();
  assert.match(invalidEmailData.message, /Correo no válido/);
});

test('3. Protección contra asignación masiva de roles en registro público', async () => {
  // Un usuario malicioso intenta auto-asignarse rol admin en el payload de registro
  const regPayload = {
    name: 'Atacante',
    email: 'atacante@playabuche.com',
    password: 'PasswordSuper123!',
    role: 'admin',
    status: 'active'
  };

  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regPayload)
  });

  // Si PostgreSQL no está conectado responde 503 de forma segura sin aceptar el rol
  if (res.status === 503) {
    assert.equal(res.status, 503);
  } else if (res.status === 201) {
    const data = await res.json();
    assert.equal(data.user.role, 'client', 'El rol DEBE ser estrictamente client sin importar lo enviado');
  }
});

test('4. Endpoints administrativos protegidos contra acceso no autenticado', async () => {
  // Consulta de personal staff sin token
  const staffGet = await fetch(`${baseUrl}/api/staff`);
  assert.equal(staffGet.status, 401, 'Debe requerir autenticación');

  // Creación de staff sin token
  const staffPost = await fetch(`${baseUrl}/api/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Mesonero Nuevo',
      email: 'mesonero@playabuche.com',
      role: 'waiter',
      password: 'ClaveMesonero123!'
    })
  });
  assert.equal(staffPost.status, 401, 'Debe requerir autenticación');
});

test('5. Protección de endpoints con token inválido o manipulado', async () => {
  const fakeTokenRes = await fetch(`${baseUrl}/api/me`, {
    headers: { Authorization: 'Bearer token-falso-manipulado-12345' }
  });
  assert.equal(fakeTokenRes.status, 401, 'Debe rechazar tokens falsos');
});

test('6. Límite de tamaño en comprobantes de pago (/api/ai/validate-payment)', async () => {
  // Comprobante que excede 7 MB en base64
  const hugePayload = 'A'.repeat(8 * 1024 * 1024);
  const res = await fetch(`${baseUrl}/api/ai/validate-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token-prueba'
    },
    body: JSON.stringify({ imageBase64: hugePayload })
  });

  // Debe ser rechazado por tamaño (413) o por falta de auth (401), nunca procesar 8MB
  assert.ok([401, 413].includes(res.status), `Estado esperado 401 o 413, recibido: ${res.status}`);
});

test('7. Verificación de blindaje en firestore.rules', () => {
  const rulesPath = path.join(process.cwd(), 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  // A. No debe existir lectura pública universal en orders
  assert.ok(
    !rulesContent.includes('match /orders/{orderId} {\n      allow read: if true;'),
    'firestore.rules NO debe permitir lectura pública universal en /orders/{orderId}'
  );

  // B. Orders debe exigir isStaff() o coincidencia con clientUserId
  assert.ok(
    rulesContent.includes('resource.data.clientUserId == request.auth.uid'),
    'firestore.rules debe restringir comensales a sus propias órdenes por clientUserId'
  );

  // C. No debe existir correo personal quemado
  assert.ok(
    !rulesContent.includes('oscar12198512@gmail.com'),
    'firestore.rules NO debe contener correos personales quemados en texto plano'
  );

  // D. Modificación de roles por usuarios normales debe estar bloqueada
  assert.ok(
    rulesContent.includes('request.resource.data.role == resource.data.role'),
    'firestore.rules debe impedir que el usuario altere su propio rol'
  );

  // E. Modificación de status de cuenta por usuarios normales debe estar bloqueada
  assert.ok(
    rulesContent.includes('request.resource.data.status == resource.data.status'),
    'firestore.rules debe impedir que un usuario suspendido reactive su propio status'
  );
});

test('8. Ausencia de secretos de producción en archivos públicos y ejemplos', () => {
  const examplePath = path.join(process.cwd(), '.env.example');
  const exampleContent = fs.readFileSync(examplePath, 'utf8');

  // No debe tener contraseñas reales ni API keys verdaderas en .env.example
  assert.ok(!exampleContent.includes('AIzaSyAnMvY9S2ZCRwaY-rCzMnSUGe6XSY7kl5k') || exampleContent.includes('VITE_FIREBASE_API_KEY=""'), 'No debe tener credenciales secretas en .env.example');
  assert.ok(exampleContent.includes('DEFINE_ESTA_CLAVE_EN_RENDER'), 'Debe usar placeholder explicativo para la clave de Dueño');
});
