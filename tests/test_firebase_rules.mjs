import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyAnMvY9S2ZCRwaY-rCzMnSUGe6XSY7kl5k",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "playa-buche-pos.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "playa-buche-pos",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "playa-buche-pos.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "637742279156",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:637742279156:web:daa2a086b0b82d6ecc31a1",
};

async function testSecurityRules() {
  console.log('--- TEST: Verificando reglas de seguridad en vivo sobre playa-buche-pos ---');
  const app = initializeApp(firebaseConfig, 'test-sec-' + Date.now());
  const db = getFirestore(app);

  // 1. Intento de lectura no autenticada en /orders
  try {
    console.log('1. Probando lectura no autenticada de /orders...');
    const q = query(collection(db, 'orders'), limit(1));
    await getDocs(q);
    console.error('❌ VULNERABILIDAD: /orders es legible sin autenticación.');
  } catch (err) {
    console.log('✅ REGLA CONFIRMADA: Lectura no autenticada de /orders fue bloqueada:', err?.code);
  }

  // 2. Intento de escritura no autenticada en /orders
  try {
    console.log('2. Probando escritura no autenticada en /orders...');
    const fakeDoc = doc(db, 'orders', 'fake-unauth-' + Date.now());
    await setDoc(fakeDoc, { id: 'fake', test: true });
    console.error('❌ VULNERABILIDAD: Escritura no autenticada en /orders fue permitida.');
  } catch (err) {
    console.log('✅ REGLA CONFIRMADA: Escritura no autenticada en /orders fue bloqueada:', err?.code);
  }

  // 3. Intento de lectura no autenticada en /app_users
  try {
    console.log('3. Probando lectura no autenticada de /app_users...');
    const qUsers = query(collection(db, 'app_users'), limit(1));
    await getDocs(qUsers);
    console.error('❌ VULNERABILIDAD: /app_users es legible sin autenticación.');
  } catch (err) {
    console.log('✅ REGLA CONFIRMADA: Lectura no autenticada de /app_users fue bloqueada:', err?.code);
  }
}

testSecurityRules().then(() => {
  process.exit(0);
});
