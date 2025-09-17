// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// === TA CONFIG (inchangée) ===
const firebaseConfig = {
  apiKey: "AIzaSyAjHfI5mm65uLIKanSB_ZyIuj_fYrRfYSAM",
  authDomain: "mtliles.firebaseapp.com",
  projectId: "mtliles",
  storageBucket: "mtliles.firebasestorage.app",
  messagingSenderId: "448638960426",
  appId: "1:448638960426:web:66cd2f3d44c9fd0a1fd453",
  // measurementId: "G-BY4QTZCSXP" // inutile ici
};

const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(() => {});

// Auth
const auth = getAuth(app);

// ⚡ Bloquant : garantit qu’on a un user (anonyme) avant d’utiliser Firestore
export async function ensureAuth() {
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (user) => { if (user) { unsub(); resolve(user); } },
      (err)  => { unsub(); reject(err); }
    );
    signInAnonymously(auth).catch(reject);
  });
}

// Optionnel (si encore utilisé quelque part)
export async function signInAnon() {
  try { await signInAnonymously(auth); } catch (e) { console.error(e); }
}
