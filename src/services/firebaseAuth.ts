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

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
  const userDocRef = doc(db, 'app_users', cred.user.uid);
  const userDoc = await getDoc(userDocRef);
  
  if (userDoc.exists()) {
    const data = userDoc.data() as User;
    return { ...data, id: cred.user.uid };
  }

  // Fallback si no tiene doc en firestore aún
  const fallbackUser: User = {
    id: cred.user.uid,
    name: cred.user.displayName || email.split('@')[0],
    email: cred.user.email || email,
    role: 'client',
    status: 'active'
  };
  await setDoc(userDocRef, { ...fallbackUser, createdAt: serverTimestamp() }, { merge: true });
  return fallbackUser;
}

export async function registerWithEmail(
  email: string,
  pass: string,
  name: string,
  phone?: string,
  role: UserRole = 'client'
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
  await updateProfile(cred.user, { displayName: name });
  
  const newUser: User = {
    id: cred.user.uid,
    name: name.trim(),
    email: cred.user.email || email.trim().toLowerCase(),
    phone: phone || null,
    role,
    status: 'active'
  };

  const userDocRef = doc(db, 'app_users', cred.user.uid);
  await setDoc(userDocRef, { ...newUser, createdAt: serverTimestamp() });
  return newUser;
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
    try {
      const userDocRef = doc(db, 'app_users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        callback({ id: firebaseUser.uid, ...userDoc.data() } as User);
      } else {
        callback({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
          email: firebaseUser.email || '',
          role: 'client',
          status: 'active'
        });
      }
    } catch (e) {
      console.error('Error fetching user document on auth state change:', e);
      callback({
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'Usuario',
        email: firebaseUser.email || '',
        role: 'client',
        status: 'active'
      });
    }
  });
}
