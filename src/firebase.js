// ══════════════════════════════════════════════════════
// CONFIGURATION FIREBASE
// Remplacez les valeurs ci-dessous par celles de votre
// projet Firebase (voir le guide DEPLOY.md)
// ══════════════════════════════════════════════════════

import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCSz1lXQB0MJao7PEn5MfmJiv61hNAaWu4",
  authDomain: "mine-aigle.firebaseapp.com",
  databaseURL: "https://mine-aigle-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mine-aigle",
  storageBucket: "mine-aigle.firebasestorage.app",
  messagingSenderId: "626540351704",
  appId: "1:626540351704:web:38b6388df528f55a0f07ad"
};


const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ── Sauvegarde des données dans Firebase ──
export async function saveData(data) {
  try {
    await set(ref(db, "mine-data"), data);
  } catch (e) {
    console.error("Erreur sauvegarde Firebase:", e);
  }
}

// ── Écoute en temps réel des données ──
// Appelle le callback à chaque changement dans la base
export function listenData(callback) {
  const dataRef = ref(db, "mine-data");
  return onValue(dataRef, (snapshot) => {
    const val = snapshot.val();
    callback(val);
  });
}
