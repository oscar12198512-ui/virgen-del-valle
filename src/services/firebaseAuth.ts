import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
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
      const isMaster = ['oscar12198512@gmail.com'].includes(cleanEmail);
      const role: UserRole = isMaster ? 'admin' : normalizeUserRole(data.role);
      return { ...data, role, id: cred.user.uid, sessionToken: `token-${cred.user.uid}` };
    }

    // Usuario autenticado por primera vez sin perfil previo en Firestore
    const isMaster = ['oscar12198512@gmail.com'].includes(cleanEmail);
    const defaultUser: User = {
      id: cred.user.uid,
      name: cred.user.displayName || cleanEmail.split('@')[0],
      email: cred.user.email || cleanEmail,
      role: isMaster ? 'admin' : 'client',
      status: 'active',
      sessionToken: `token-${cred.user.uid}`
    };
    await setDoc(userDocRef, { ...defaultUser, createdAt: serverTimestamp() }, { merge: true });
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
  phone?: string,
  role: UserRole = 'client',
  extra?: { zone?: string; boatName?: string; status?: 'active' | 'suspended' | 'pending_approval' }
): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();

  // Prevenir escalación de privilegios desde el cliente: solo admin puede crear staff directo.
  // Los registros públicos quedan restringidos a 'client' o staff sujeto a aprobación previa.
  const safeRole: UserRole = (role === 'waiter' || role === 'excursion') ? role : 'client';
  const initialStatus = extra?.status || (safeRole === 'excursion' || safeRole === 'waiter' ? 'pending_approval' : 'active');

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    await updateProfile(cred.user, { displayName: name.trim() });
    
    const newUser: User = {
      id: cred.user.uid,
      name: name.trim(),
      email: cred.user.email || cleanEmail,
      phone: phone?.trim() || null,
      role: safeRole,
      zone: extra?.zone?.trim() || null,
      boatName: extra?.boatName?.trim() || null,
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
    const isMaster = ['oscar12198512@gmail.com'].includes(cleanEmail);

    try {
      const userDocRef = doc(db, 'app_users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data() as User;
        const role: UserRole = isMaster ? 'admin' : normalizeUserRole(data.role);
        callback({ ...data, role, id: firebaseUser.uid, sessionToken: `token-${firebaseUser.uid}` });
      } else {
        callback({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || cleanEmail.split('@')[0] || 'Usuario',
          email: cleanEmail,
          role: isMaster ? 'admin' : 'client',
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
        role: isMaster ? 'admin' : 'client',
        status: 'active',
        sessionToken: `token-${firebaseUser.uid}`
      });
    }
  });
}
