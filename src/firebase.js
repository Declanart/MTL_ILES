// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

// ⬇️ Remplace par la config copiée depuis Firebase (Général > Web app)
const firebaseConfig = {
  apiKey: "XXX",
  authDomain: "XXX.firebaseapp.com",
  projectId: "XXX",
  storageBucket: "XXX.appspot.com",
  messagingSenderId: "XXX",
  appId: "XXX"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// (offline OK : le cache se synchronise dès qu'il y a du réseau)
enableIndexedDbPersistence(db).catch(() => {});

const auth = getAuth(app);
export async function signInAnon() {
  try { await signInAnonymously(auth); } catch (e) { console.error(e); }
}
