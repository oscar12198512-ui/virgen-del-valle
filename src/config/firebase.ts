import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration for Playa Buche POS
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAnMvY9S2ZCRwaY-rCzMnSUGe6XSY7kl5k",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "playa-buche-pos.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "playa-buche-pos",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "playa-buche-pos.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "637742279156",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:637742279156:web:daa2a086b0b82d6ecc31a1",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-705S44KGDC"
};

// Initialize Firebase
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Configuración para forzar respuestas limpias del servidor y compatibilidad total con documentos
export const db = (() => {
  try {
    return initializeFirestore(firebaseApp, {
      ignoreUndefinedProperties: true,
      localCache: undefined // Obliga a la app a comunicarse de forma estricta y limpia con los servidores de Firebase
    });
  } catch {
    return getFirestore(firebaseApp);
  }
})();

// Initialize Auth
export const auth = getAuth(firebaseApp);

export const isFirebaseConfigured = () => {
  return true;
};
