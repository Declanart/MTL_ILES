// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

// ⬇️ colle ici l’objet montré dans ta capture
const firebaseConfig = {
  apiKey: "AIzaSyAjHfI5mm65uLIKanSB_ZyIuj_fYrRfYSAM",
  authDomain: "mtliles.firebaseapp.com",
  projectId: "mtliles",
  storageBucket: "mtliles.firebasestorage.app",
  messagingSenderId: "448638960426",
  appId: "1:448638960426:web:66cd2f3d44c9fd0a1fd453",
  measurementId: "G-BY4QTZCSXP", // optionnel, on ne l’utilise pas
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Cache offline + sync quand le réseau revient
enableIndexedDbPersistence(db).catch(() => {});

const auth = getAuth(app);
export async function signInAnon() {
  try { await signInAnonymously(auth); } catch (e) { console.error(e); }
}
