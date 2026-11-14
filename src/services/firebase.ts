// ============================================================================
// INTEGRAÇÃO REAL COM FIREBASE AUTHENTICATION, CLOUD FIRESTORE & STORAGE
// ============================================================================
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  Auth,
} from 'firebase/auth';
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  FirebaseStorage,
} from 'firebase/storage';
import { DatabaseState, WorkspaceSettings } from '../types/schema';

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;
let firebaseStorage: FirebaseStorage | null = null;

export function initFirebaseClient(config?: WorkspaceSettings['firebaseConfig']) {
  const apiKey = config?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = config?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    return { connected: false, mode: 'local_firestore_engine' as const };
  }

  try {
    const firebaseConfig = {
      apiKey,
      authDomain: config?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: config?.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      messagingSenderId: config?.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: config?.appId || import.meta.env.VITE_FIREBASE_APP_ID || '',
    };

    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    firestoreDb = getFirestore(firebaseApp);
    firebaseAuth = getAuth(firebaseApp);
    firebaseStorage = getStorage(firebaseApp);
    return { connected: true, mode: 'cloud_firestore' as const };
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
    return { connected: false, mode: 'local_firestore_engine' as const, error };
  }
}

export async function syncStateToCloudFirestore(state: DatabaseState): Promise<boolean> {
  if (!firestoreDb) return false;
  try {
    const workspaceRef = doc(firestoreDb, 'workspaces', 'main_workspace');
    await setDoc(workspaceRef, {
      ...state,
      lastSyncedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error('Erro ao sincronizar com Cloud Firestore:', err);
    return false;
  }
}

export async function fetchStateFromCloudFirestore(): Promise<DatabaseState | null> {
  if (!firestoreDb) return null;
  try {
    const workspaceRef = doc(firestoreDb, 'workspaces', 'main_workspace');
    const snap = await getDoc(workspaceRef);
    if (snap.exists()) {
      return snap.data() as DatabaseState;
    }
    return null;
  } catch (err) {
    console.error('Erro ao buscar dados do Cloud Firestore:', err);
    return null;
  }
}

export async function uploadAttachmentToFirebaseStorage(
  taskId: string,
  fileName: string,
  dataUrl: string
): Promise<string> {
  if (!firebaseStorage) return dataUrl;
  try {
    const storageRef = ref(firebaseStorage, `tasks/${taskId}/${Date.now()}_${fileName}`);
    await uploadString(storageRef, dataUrl, 'data_url');
    return await getDownloadURL(storageRef);
  } catch (err) {
    console.warn('Fallback para armazenamento embutido DataURL:', err);
    return dataUrl;
  }
}

export { firebaseAuth, signInWithEmailAndPassword, signOut };
