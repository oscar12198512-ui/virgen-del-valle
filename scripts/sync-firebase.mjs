/**
 * Script de sincronización de catálogo, toldos y sorteo hacia Firebase Firestore (playa-buche-pos).
 * Ejecución: node scripts/sync-firebase.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import {
  INITIAL_MENU_ITEMS,
  INITIAL_SPOTS,
  INITIAL_GIVEAWAY_STATE,
  INITIAL_EXCURSION,
  INITIAL_BANK_CONFIG
} from './initialData.mjs';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyAnMvY9S2ZCRwaY-rCzMnSUGe6XSY7kl5k",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "playa-buche-pos.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "playa-buche-pos",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "playa-buche-pos.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "637742279156",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:637742279156:web:daa2a086b0b82d6ecc31a1",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function sync() {
  console.log('🚀 Conectando a Firebase Firestore (playa-buche-pos)...');
  
  // 1. Obtener estado actual de app_state/main
  const mainDocRef = doc(db, 'app_state', 'main');
  const mainSnap = await getDoc(mainDocRef);
  const currentData = mainSnap.exists() ? mainSnap.data() : {};

  console.log(`📦 Estado actual en Firestore encontrado. Órdenes existentes preservadas: ${currentData.orders?.length || 0}`);

  // Combinar sorteo si ya tenía participantes registrados en Firestore
  let targetGiveaway = INITIAL_GIVEAWAY_STATE;
  if (currentData.giveaway && Array.isArray(currentData.giveaway.participants)) {
    targetGiveaway = {
      ...INITIAL_GIVEAWAY_STATE,
      ...currentData.giveaway,
      participants: currentData.giveaway.participants.length > 0
        ? currentData.giveaway.participants
        : INITIAL_GIVEAWAY_STATE.participants,
    };
  }

  // 2. Actualizar documento principal app_state/main
  const updatedMain = {
    menuItems: INITIAL_MENU_ITEMS,
    spots: INITIAL_SPOTS,
    excursion: currentData.excursion || INITIAL_EXCURSION,
    bankConfig: currentData.bankConfig || INITIAL_BANK_CONFIG,
    giveaway: targetGiveaway,
    updatedAt: serverTimestamp(),
  };

  await setDoc(mainDocRef, updatedMain, { merge: true });
  console.log(`✅ app_state/main actualizado con ${INITIAL_MENU_ITEMS.length} platos del menú y sorteo activo.`);

  // 3. Sincronizar colección menu_items individual
  for (const item of INITIAL_MENU_ITEMS) {
    await setDoc(doc(db, 'menu_items', item.id), {
      ...item,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
  console.log(`✅ Colección menu_items sincronizada (${INITIAL_MENU_ITEMS.length} documentos).`);

  // 4. Sincronizar colección spots
  for (const spot of INITIAL_SPOTS) {
    await setDoc(doc(db, 'spots', spot.id), {
      ...spot,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
  console.log(`✅ Colección spots sincronizada (${INITIAL_SPOTS.length} ubicaciones).`);

  // 5. Limpiar plato obsoleto si existía (m-paella)
  try {
    await deleteDoc(doc(db, 'menu_items', 'm-paella'));
  } catch {}

  console.log('🎉 ¡Base de datos de Firebase Firestore 100% sincronizada con éxito!');
  process.exit(0);
}

sync().catch(err => {
  console.error('❌ Error sincronizando Firebase:', err);
  process.exit(1);
});
