import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA5YyTIq7DyrlhdGlUdnMOagPBS99s-Ahs",
  authDomain: "saas-budget-b3c59.firebaseapp.com",
  projectId: "saas-budget-b3c59",
  storageBucket: "saas-budget-b3c59.firebasestorage.app",
  messagingSenderId: "666760831568",
  appId: "1:666760831568:web:3809e899340ab34e2b6755",
  measurementId: "G-DPGX53VN6X"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
