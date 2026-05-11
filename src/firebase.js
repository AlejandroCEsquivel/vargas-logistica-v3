import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Credenciales de tu nuevo proyecto de prueba: test-transporte-vargas
const firebaseConfig = {
  apiKey: "AIzaSyDL5SEiBwx6Y10YIHZTrdFWU5B5YCHaLhA",
  authDomain: "test-transporte-vargas.firebaseapp.com",
  projectId: "test-transporte-vargas",
  storageBucket: "test-transporte-vargas.firebasestorage.app",
  messagingSenderId: "470070126417",
  appId: "1:470070126417:web:607c1db7aa3e6b64719570",
  measurementId: "G-361QC84JFD"
};

// Inicializamos la conexión con Firebase
const app = initializeApp(firebaseConfig);

// Exportamos la base de datos (db) para que App.js la pueda usar
export const db = getFirestore(app);