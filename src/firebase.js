import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue } from "firebase/database";

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

export async function saveData(data) {
  try {
    // Save main data WITHOUT coffreAmount to avoid overwriting it
    const { coffreAmount, ...rest } = data;
    await set(ref(db, "mine-data"), rest);
  } catch (e) {
    console.error("Erreur sauvegarde Firebase:", e);
  }
}

// Coffre is saved in its own separate key
export async function saveCoffreFirebase(amount) {
  try {
    await set(ref(db, "mine-coffre"), amount);
  } catch (e) {
    console.error("Erreur sauvegarde coffre:", e);
  }
}

export function listenData(callback) {
  const dataRef = ref(db, "mine-data");
  const coffreRef = ref(db, "mine-coffre");
  
  let currentData = null;
  let currentCoffre = 0;
  
  const unsub1 = onValue(dataRef, (snapshot) => {
    currentData = snapshot.val();
    callback(currentData, currentCoffre);
  });
  
  const unsub2 = onValue(coffreRef, (snapshot) => {
    currentCoffre = snapshot.val() || 0;
    callback(currentData, currentCoffre);
  });
  
  return () => { unsub1(); unsub2(); };
}
