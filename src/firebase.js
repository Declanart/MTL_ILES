// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// ⚠️ Mets exactement les valeurs affichées dans Firebase (Project settings → General → Your apps → Web)
const firebaseConfig = {
  apiKey: "AIzaSyAjHfI5mm65uLIKanSB_ZyIuj_fYRfYSAM",
  authDomain: "mtliles.firebaseapp.com",
  projectId: "mtliles",
  storageBucket: "mtliles.firebasestorage.app",
  messagingSenderId: "448638960426",
  appId: "1:448638960426:web:66cd2f3d44c9fd0a1fd453",
  measurementId: "G-BY40TZCSXP"
};

const app = initializeApp(firebaseConfig);

// 🔹 exports nommés attendus par App.jsx
export const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(() => {});

const auth = getAuth(app);
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



