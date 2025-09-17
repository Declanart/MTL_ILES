// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAjHfI5mm65uLIKanSB_ZyIuj_fYRfYSAM",
  authDomain: "mtliles.firebaseapp.com",
  projectId: "mtliles",
  storageBucket: "mtliles.firebasestorage.app",
  messagingSenderId: "448638960426",
  appId: "1:448638960426:web:66cd2f3d44c9fd0a1fd453",
  measurementId: "G-BY40TZCSXP"
    
const app = initializeApp(firebaseConfig);

// ✅ EXPORT NOMMÉ de db
export const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(() => {});

// Auth anonyme
const auth = getAuth(app);

// ✅ EXPORT NOMMÉ d'ensureAuth
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
