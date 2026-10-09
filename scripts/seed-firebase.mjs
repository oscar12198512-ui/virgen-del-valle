/**
 * Script para sembrar / migrar los datos iniciales de Playa Buche a Firebase Firestore.
 * Ejecución: node scripts/seed-firebase.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Error: Falta configurar VITE_FIREBASE_API_KEY y VITE_FIREBASE_PROJECT_ID en el archivo .env');
  console.log('Por favor agrega tus credenciales en el archivo .env y vuelve a ejecutar este script.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Importar datos iniciales
const INITIAL_BCV_RATE = 54.50;

const INITIAL_MENU_ITEMS = [
  {
    id: 'm-pargo-crispy',
    name: 'Pargo Rojo Crispy Buche',
    category: 'pescados',
    priceUsd: 24.00,
    priceExcursionUsd: 20.00,
    menuTarget: 'all',
    waiterShareUsd: 2.00,
    description: 'Pescado entero fresco marinado con limón criollo y sal marina de Araya. Acompañado de tostones playeros y ensalada rallada.',
    imageUrl: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: '20-25 min',
    isAvailable: true,
    tag: 'Pesca del Día',
    servingSize: '~600g',
  },
  {
    id: 'm-ceviche',
    name: 'Ceviche Virgen del Valle',
    category: 'mariscos',
    priceUsd: 18.50,
    priceExcursionUsd: 15.00,
    menuTarget: 'all',
    waiterShareUsd: 1.50,
    description: 'Camarones caribeños y curvina macerados en zumo de parchita y lima, cebolla morada, ají dulce margariteño y batata dulce.',
    imageUrl: 'https://images.unsplash.com/photo-1535400255456-984241443b29?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: '10-12 min',
    isAvailable: true,
    tag: 'Cítrico & Fresco',
    servingSize: 'Favorito de la Casa',
  },
  {
    id: 'm-paella',
    name: 'Paella Marinera de Buche',
    category: 'mariscos',
    priceUsd: 36.00,
    priceExcursionUsd: 29.00,
    menuTarget: 'all',
    waiterShareUsd: 3.00,
    description: 'Arroz infusionado con azafrán y fumet de langostinos, calamares tiernos, mejillones del golfo y pimentón asado a la brasa.',
    imageUrl: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: '30-35 min',
    isAvailable: true,
    tag: 'Para Compartir',
    servingSize: '2-3 Personas',
  },
  {
    id: 'm-fosforera',
    name: 'Fosforera Especial de Playa Buche',
    category: 'mariscos',
    priceUsd: 16.00,
    priceExcursionUsd: 13.50,
    menuTarget: 'all',
    waiterShareUsd: 1.50,
    description: 'Caldo concentrado marino de 7 mariscos: chipichipi, camarón, calamar, pulpo y cangrejo, con toque de ají misterioso y culantro.',
    imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: '15 min',
    isAvailable: true,
    tag: 'Levanta Muertos',
    servingSize: 'Tazón Térmico',
  },
  {
    id: 'm-tostones',
    name: 'Tostones Playeros Virgen del Valle',
    category: 'entradas',
    priceUsd: 12.00,
    priceExcursionUsd: 9.00,
    menuTarget: 'all',
    waiterShareUsd: 1.00,
    description: 'Rueda de tostones dorados crujientes con abundante queso blanco llanero rallado, salsa tártara casera y ensaladilla fresca.',
    imageUrl: 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: '8-10 min',
    isAvailable: true,
    tag: 'Crujientes',
    servingSize: 'Bandeja Compartir',
  },
  {
    id: 'm-empanadas',
    name: 'Empanadas de Cazón Crujientes (x3)',
    category: 'entradas',
    priceUsd: 6.00,
    priceExcursionUsd: 4.50,
    menuTarget: 'all',
    waiterShareUsd: 0.50,
    description: 'Masa de maíz crujiente con toque de azúcar morena, rellenas de guiso tradicional oriental de cazón y salsa guasacaca.',
    imageUrl: 'https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: '6 min',
    isAvailable: true,
    tag: 'Desayuno / Picoteo',
    servingSize: '3 Unidades',
  },
  {
    id: 'm-coco-loco',
    name: 'Coco Loco Playa Buche',
    category: 'bebidas',
    priceUsd: 9.50,
    priceExcursionUsd: 7.50,
    menuTarget: 'all',
    waiterShareUsd: 1.00,
    description: 'Agua de coco natural batida con crema de coco, ron blanco venezolano, ron oscuro añejo y un toque de canela fresca.',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: '5 min',
    isAvailable: true,
    tag: 'Con Ron Añejo',
    servingSize: 'En Coco Natural',
  },
  {
    id: 'm-papelon',
    name: 'Papelón con Limón Playero',
    category: 'bebidas',
    priceUsd: 3.00,
    priceExcursionUsd: 2.00,
    menuTarget: 'all',
    waiterShareUsd: 0.25,
    description: 'Infusión artesanal de panela de caña pura con abundante zumo de limones criollos recién exprimidos y hielo frappé.',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: '3 min',
    isAvailable: true,
    tag: 'Refrescante',
    servingSize: 'Vaso 500ml',
  },
  {
    id: 'm-balde-polar',
    name: 'Balde Polar Negra / Pilsen (x6)',
    category: 'bebidas',
    priceUsd: 15.00,
    priceExcursionUsd: 12.00,
    menuTarget: 'all',
    waiterShareUsd: 0.50,
    description: 'Cubeta galvanizada playera cargada de hielo y sal marina con 6 botellas de Polar Negra o Pilsen vestidas de novia.',
    imageUrl: 'https://images.unsplash.com/photo-1608270546103-9756b5de2e81?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: '2 min',
    isAvailable: true,
    tag: 'Vestidas de Novia',
    servingSize: 'Cubeta 6 Und.',
  },
];

const INITIAL_SPOTS = [
  { id: 'spot-01', number: 'T-01', zone: 'beach', name: 'Toldo Caribe 01', typeDesc: 'Toldo Doble + 2 Tumbonas', status: 'available', distanceDesc: 'Frente al Mar • Zona VIP', assignedWaiterId: 'u-carlos', assignedWaiterName: 'Carlos M.', capacity: 4 },
  { id: 'spot-02', number: 'T-02', zone: 'beach', name: 'Toldo Caribe 02', typeDesc: 'Toldo Doble + 2 Tumbonas', status: 'occupied', distanceDesc: 'Frente al Mar', assignedWaiterId: 'u-carlos', assignedWaiterName: 'Carlos M.', capacity: 4 },
  { id: 'spot-03', number: 'T-03', zone: 'beach', name: 'Toldo Familiar 03', typeDesc: 'Churuata Mediana + Mesa 6 Pax', status: 'available', distanceDesc: 'Sombra de Palmeras', assignedWaiterId: 'u-jose', assignedWaiterName: 'José R.', capacity: 6 },
  { id: 'spot-04', number: 'T-04', zone: 'beach', name: 'Toldo Palmeras 04', typeDesc: 'Toldo Doble + Tumbonas', status: 'available', distanceDesc: 'Zona Central', assignedWaiterId: 'u-jose', assignedWaiterName: 'José R.', capacity: 4 },
  { id: 'spot-05', number: 'C-01', zone: 'churuata', name: 'Gran Churuata Virgen del Valle', typeDesc: 'Área Lounge Exclusiva', status: 'occupied', distanceDesc: 'Centro Gastronómico', assignedWaiterId: 'u-carlos', assignedWaiterName: 'Carlos M.', capacity: 12 },
  { id: 'spot-06', number: 'M-01', zone: 'muelle', name: 'Lancha Don Ramón II', typeDesc: 'Embarcación Deportiva 32ft', status: 'available', distanceDesc: 'Muelle Principal • Atraque 1', assignedWaiterId: 'u-jose', assignedWaiterName: 'José R.', boatName: 'Don Ramón II', capacity: 10 },
  { id: 'spot-07', number: 'M-02', zone: 'muelle', name: 'Yate Bahía Azul', typeDesc: 'Catamarán Privado 45ft', status: 'occupied', distanceDesc: 'Muelle Principal • Atraque 2', assignedWaiterId: 'u-carlos', assignedWaiterName: 'Carlos M.', boatName: 'Bahía Azul', capacity: 18 },
];

const INITIAL_EXCURSION = {
  id: 'exc-full-day-buche',
  title: 'Full Day Exclusivo Buche Paradise',
  agencyName: 'Agencia Buche Tours Oriente',
  guideName: 'Capitán Manuel Díaz (VHF Ch. 16)',
  paxCount: 24,
  boatName: 'El Gran Delfín III',
  menuPackageSelected: 'Almuerzo Pargo o Paella + 2 Bebidas + Toldo VIP',
  specialObservations: '8 comensales requieren ceviche sin mariscos (solo pescado blanco). Grupo con niños.',
  arrivalEstTime: '11:30 AM',
  departureEstTime: '05:00 PM',
  braceletColor: '#006782',
  status: 'docking',
};

const INITIAL_BANK_CONFIG = {
  pagoMovil: {
    bankName: 'Banesco Banco Universal (0134)',
    phone: '0414-1234567',
    idNumber: 'J-40536768-7',
    accountHolder: 'Inversiones Virgen del Valle C.A.',
  },
  zelle: {
    email: 'pagos@playabuche.com',
    accountHolder: 'Playa Buche Beach Club LLC',
  },
};

const INITIAL_DRAWER_BILLS = {
  bill1: 25,
  bill5: 18,
  bill10: 12,
  bill20: 8,
  bill50: 4,
  bill100: 2,
};

async function seed() {
  console.log('🚀 Iniciando migración de datos hacia Firebase Firestore...');
  
  try {
    console.log('🔑 Intentando autenticación...');
    await signInAnonymously(auth).catch(() => null);
  } catch {}

  const statePayload = {
    menuItems: INITIAL_MENU_ITEMS,
    spots: INITIAL_SPOTS,
    orders: [],
    excursion: INITIAL_EXCURSION,
    bankConfig: INITIAL_BANK_CONFIG,
    waitersClosings: [],
    drawerBills: INITIAL_DRAWER_BILLS,
    bcvRate: INITIAL_BCV_RATE,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'app_state', 'main'), statePayload, { merge: true });
  console.log('✅ Documento `app_state/main` guardado exitosamente en Firestore.');

  // Guardar usuario administrador por defecto
  const adminUser = {
    name: 'Administrador Playa Buche',
    email: 'admin@playabuche.com',
    role: 'admin',
    status: 'active',
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'app_users', 'admin-default'), adminUser, { merge: true });
  console.log('✅ Usuario Administrador inicial registrado en `app_users`.');

  console.log('🎉 ¡Migración a Firebase Firestore completada con éxito!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Error durante la migración a Firestore:', err);
  process.exit(1);
});
