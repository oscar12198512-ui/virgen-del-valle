import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration for Playa Buche POS
const metaEnv: Record<string, string | undefined> = 
  typeof import.meta !== 'undefined' && (import.meta as any).env 
    ? (import.meta as any).env 
    : (typeof process !== 'undefined' ? (process.env as any) : {});

export const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || metaEnv.FIREBASE_API_KEY || "AIzaSyAnMvY9S2ZCRwaY-rCzMnSUGe6XSY7kl5k",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || metaEnv.FIREBASE_AUTH_DOMAIN || "playa-buche-pos.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || metaEnv.FIREBASE_PROJECT_ID || "playa-buche-pos",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || metaEnv.FIREBASE_STORAGE_BUCKET || "playa-buche-pos.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || metaEnv.FIREBASE_MESSAGING_SENDER_ID || "637742279156",
  appId: metaEnv.VITE_FIREBASE_APP_ID || metaEnv.FIREBASE_APP_ID || "1:637742279156:web:daa2a086b0b82d6ecc31a1",
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || metaEnv.FIREBASE_MEASUREMENT_ID || "G-705S44KGDC"
};

// Initialize Firebase
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Configuración de Firestore con persistencia local resistente a caídas de red en playa
export const db = (() => {
  try {
    return initializeFirestore(firebaseApp, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
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

