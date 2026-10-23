import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyAnMvY9S2ZCRwaY-rCzMnSUGe6XSY7kl5k",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "playa-buche-pos.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "playa-buche-pos",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "playa-buche-pos.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "637742279156",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:637742279156:web:daa2a086b0b82d6ecc31a1",
};

async function testConnection() {
  console.log('--- TEST: Verificando conexión real con Firebase Firestore playa-buche-pos ---');
  try {
    const app = initializeApp(firebaseConfig, 'test-probe-' + Date.now());
    const db = getFirestore(app);
    const mainDocRef = doc(db, 'app_state', 'main');
    console.log('Consultando documento app_state/main en Firestore...');
    const snap = await getDoc(mainDocRef);
    if (snap.exists()) {
      const data = snap.data();
      console.log('✅ Firestore CONECTADO Y RESPONDIENDO.');
      console.log('Platos en catálogo (menuItems):', data.menuItems?.length || 0);
      console.log('Toldos registrados (spots):', data.spots?.length || 0);
      console.log('Tasa BCV configurada:', data.bcvRate || 'No definida');
      console.log('Sorteo activo:', Boolean(data.giveaway));
      return { ok: true, exists: true, dataSummary: { menuCount: data.menuItems?.length, spotsCount: data.spots?.length } };
    } else {
      console.log('⚠️ Firestore CONECTADO pero app_state/main no existe.');
      return { ok: true, exists: false };
    }
  } catch (err) {
    console.error('❌ Error al conectar con Firestore:', err?.code, err?.message);
    return { ok: false, error: err?.message };
  }
}

testConnection().then((res) => {
  console.log('Resultado del test:', JSON.stringify(res));
  process.exit(res.ok ? 0 : 1);
});
