import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  getAuth
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../config/firebase';
import { User, UserRole } from '../types';
import { normalizeUserRole } from '../utils/roleUtils';


function formatFirebaseAuthError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos. Por favor verifica tus datos.';
    case 'auth/invalid-email':
      return 'El formato del correo electrónico no es válido.';
    case 'auth/user-disabled':
      return 'Esta cuenta ha sido inhabilitada. Contacta a la administración.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Por seguridad, espera unos minutos antes de intentar de nuevo.';
    case 'auth/email-already-in-use':
      return 'Este correo ya se encuentra registrado. Inicia sesión con tu clave o recupérala.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 8 caracteres.';
    case 'auth/network-request-failed':
      return 'Error de conexión con el servidor. Verifica tu internet e inténtalo de nuevo.';
    default:
      return error?.message || 'Error durante la autenticación. Verifica tus credenciales.';
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const userDocRef = doc(db, 'app_users', cred.user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data() as User;
      const role: UserRole = normalizeUserRole(data.role);
      return { ...data, role, id: cred.user.uid, sessionToken: `token-${cred.user.uid}` };
    }

    // Buscar si existe un perfil de staff pre-creado por el Dueño para este correo
    let staffData: Partial<User> | null = null;
    let orphanDocRef: any = null;
    try {
      const q = query(collection(db, 'app_users'), where('email', '==', cleanEmail));
      const snaps = await getDocs(q);
      if (!snaps.empty) {
        snaps.forEach((s) => {
          if (s.id !== cred.user.uid) {
            staffData = s.data() as User;
            orphanDocRef = s.ref;
          }
        });
      }
    } catch {}

    // Usuario autenticado por primera vez sin perfil previo en Firestore
    const resolvedRole: UserRole = staffData?.role
      ? normalizeUserRole(staffData.role)
      : 'client';

    const defaultUser: User = {
      id: cred.user.uid,
      name: staffData?.name || cred.user.displayName || cleanEmail.split('@')[0],
      email: cred.user.email || cleanEmail,
      phone: staffData?.phone || null,
      role: resolvedRole,
      zone: staffData?.zone || null,
      boatName: staffData?.boatName || null,
      status: staffData?.status || 'active',
      sessionToken: `token-${cred.user.uid}`
    };
    await setDoc(userDocRef, { ...defaultUser, createdAt: serverTimestamp() }, { merge: true });
    if (orphanDocRef) {
      deleteDoc(orphanDocRef).catch(() => {});
    }
    return defaultUser;
  } catch (err: any) {
    console.error('Firebase Auth login error:', err?.message || err);
    throw new Error(formatFirebaseAuthError(err));
  }
}

export async function registerWithEmail(
  email: string,
  pass: string,
  name: string,
  phone?: string
): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();

  // El registro público es EXCLUSIVAMENTE para clientes.
  // Las cuentas de personal (mesonero, cocina, excursión, admin) son creadas por el Dueño.
  const role: UserRole = 'client';
  const initialStatus = 'active';

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    await updateProfile(cred.user, { displayName: name.trim() });
    
    const newUser: User = {
      id: cred.user.uid,
      name: name.trim(),
      email: cred.user.email || cleanEmail,
      phone: phone?.trim() || null,
      role,
      status: initialStatus,
      sessionToken: `token-${cred.user.uid}`
    };

    const userDocRef = doc(db, 'app_users', cred.user.uid);
    await setDoc(userDocRef, { ...newUser, createdAt: serverTimestamp() });
    return newUser;
  } catch (err: any) {
    console.error('Firebase Auth register error:', err?.message || err);
    throw new Error(formatFirebaseAuthError(err));
  }
}

export async function sendResetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }
    const cleanEmail = (firebaseUser.email || '').trim().toLowerCase();

    try {
      const userDocRef = doc(db, 'app_users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data() as User;
        const role: UserRole = normalizeUserRole(data.role);
        callback({ ...data, role, id: firebaseUser.uid, sessionToken: `token-${firebaseUser.uid}` });
      } else {
        callback({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || cleanEmail.split('@')[0] || 'Usuario',
          email: cleanEmail,
          role: 'client',
          status: 'active',
          sessionToken: `token-${firebaseUser.uid}`
        });
      }
    } catch (e) {
      console.error('Error fetching user document on auth state change:', e);
      callback({
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'Usuario',
        email: cleanEmail,
        role: 'client',
        status: 'active',
        sessionToken: `token-${firebaseUser.uid}`
      });
    }
  });
}

/**
 * Permite al Dueño/Administrador crear una cuenta de personal (mesonero, cocina, excursión, admin)
 * en Firebase Authentication y Cloud Firestore SIN cerrar la sesión del Dueño.
 * Utiliza una instancia secundaria efímera de Firebase Auth para aprovisionar las credenciales.
 */
export async function createStaffMemberByAdmin(
  caller: User,
  staffData: {
    name: string;
    email: string;
    role: UserRole;
    password: string;
    phone?: string;
    zone?: string;
    boatName?: string;
  }
): Promise<User> {
  if (caller.role !== 'admin') {
    throw new Error('Solo un Administrador o Dueño autorizado puede crear cuentas de personal.');
  }

  const cleanEmail = staffData.email.trim().toLowerCase();
  if (!cleanEmail || !staffData.name.trim()) {
    throw new Error('Nombre y correo son obligatorios.');
  }

  if (!staffData.password || staffData.password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres.');
  }

  if (staffData.role === 'client') {
    throw new Error('Las cuentas de cliente se auto-registran desde la pantalla de bienvenida.');
  }

  // 1. Aprovisionar usuario en Firebase Authentication mediante instancia secundaria
  const secondaryAppName = `staff-creator-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  let targetUid: string;
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, staffData.password);
    await updateProfile(cred.user, { displayName: staffData.name.trim() });
    targetUid = cred.user.uid;
    await signOut(secondaryAuth);
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      throw new Error(`El correo "${cleanEmail}" ya está registrado en Firebase. Si ya tiene cuenta, asigna su rol directamente desde la lista de personal.`);
    }
    throw new Error(formatFirebaseAuthError(err));
  } finally {
    await deleteApp(secondaryApp).catch(() => {});
  }

  // 2. Crear documento de perfil en Firestore bajo app_users/{uid}
  const userDocRef = doc(db, 'app_users', targetUid);
  const newStaffUser: User = {
    id: targetUid,
    name: staffData.name.trim(),
    email: cleanEmail,
    phone: staffData.phone?.trim() || null,
    role: staffData.role,
    zone: staffData.zone?.trim() || null,
    boatName: staffData.boatName?.trim() || null,
    status: 'active',
    sessionToken: `token-${targetUid}`
  };

  await setDoc(userDocRef, { ...newStaffUser, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
  return newStaffUser;
}

