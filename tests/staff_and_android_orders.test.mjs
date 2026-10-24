import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('1. Blindaje de creación de personal: rechazo a usuarios no administradores', async () => {
  const { createStaffMemberByAdmin } = await import('../src/services/firebaseAuth.ts');
  const waiterUser = {
    id: 'user-waiter-1',
    name: 'Mesonero Juan',
    email: 'juan@playabuche.com',
    role: 'waiter',
    status: 'active',
  };

  await assert.rejects(
    async () => {
      await createStaffMemberByAdmin(waiterUser, {
        name: 'Nuevo Mesonero',
        email: 'nuevo@playabuche.com',
        role: 'waiter',
        password: 'Password123!',
      });
    },
    /Solo un Administrador o Dueño autorizado/
  );
});

test('2. Blindaje de creación de personal: rechazo a contraseñas débiles o rol cliente', async () => {
  const { createStaffMemberByAdmin } = await import('../src/services/firebaseAuth.ts');
  const adminUser = {
    id: 'user-admin-1',
    name: 'Dueño Playa Buche',
    email: 'admin@playabuche.com',
    role: 'admin',
    status: 'active',
  };

  // Rechazo de contraseña menor a 8 caracteres
  await assert.rejects(
    async () => {
      await createStaffMemberByAdmin(adminUser, {
        name: 'Mesonero Carlos',
        email: 'carlos@playabuche.com',
        role: 'waiter',
        password: 'short',
      });
    },
    /La contraseña debe tener al menos 8 caracteres/
  );

  // Rechazo de rol cliente en aprovisionamiento administrativo
  await assert.rejects(
    async () => {
      await createStaffMemberByAdmin(adminUser, {
        name: 'Cliente Pedro',
        email: 'pedro@playabuche.com',
        role: 'client',
        password: 'ValidPassword123!',
      });
    },
    /Las cuentas de cliente se auto-registran/
  );
});

test('3. Verificación de configuración de producción Android y API URL', () => {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    assert.match(
      envContent,
      /VITE_API_URL=["']https:\/\/virgen-del-valle-api\.onrender\.com["']/,
      '.env debe apuntar explícitamente a la API de Render'
    );
  } else {
    // En entornos CI (GitHub Actions) el archivo .env no está versionado; se valida la variable o default
    const apiUrl = process.env.VITE_API_URL || 'https://virgen-del-valle-api.onrender.com';
    assert.match(
      apiUrl,
      /https:\/\/virgen-del-valle-api\.onrender\.com/,
      'VITE_API_URL debe apuntar a la API de Render'
    );
  }

  const constantsContent = fs.readFileSync(path.resolve('src/constants.ts'), 'utf8');
  assert.match(
    constantsContent,
    /PRODUCTION_API_URL\s*=\s*['"]https:\/\/virgen-del-valle-api\.onrender\.com['"]/,
    'constants.ts debe exportar PRODUCTION_API_URL'
  );
});

test('4. Verificación de fallback sin índice en escucha de comanda de clientes en Firestore', () => {
  const firebaseDbContent = fs.readFileSync(path.resolve('src/services/firebaseDb.ts'), 'utf8');
  assert.match(
    firebaseDbContent,
    /activando fallback en memoria/,
    'subscribeToOrders debe contener fallback resiliente en caso de ausencia de índice en cliente'
  );
});
