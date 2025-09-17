// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// === ta config (inchangée) ===
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
export const db = getFirestore(app);

// offline cache (ignore l’erreur si indisponible)
enableIndexedDbPersistence(db).catch(() => {});

const auth = getAuth(app);

// ✅ Bloquant : garantit qu’on a un user (anonyme) avant d’utiliser Firestore
export async function ensureAuth() {
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (user) => { if (user) { unsub(); resolve(user); } },
      (err) => { unsub(); reject(err); }
    );
    // lance la connexio
