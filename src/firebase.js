import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDL5SEiBwx6Y10YIHZTrdFWU5B5YCHaLhA",
  authDomain: "test-transporte-vargas.firebaseapp.com",
  projectId: "test-transporte-vargas",
  storageBucket: "test-transporte-vargas.firebasestorage.app",
  messagingSenderId: "470070126417",
  appId: "1:470070126417:web:607c1db7aa3e6b64719570",
  measurementId: "G-361QC84JFD"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);