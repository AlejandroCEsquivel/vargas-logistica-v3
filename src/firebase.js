// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDL5SEiBwx6Y1OYIHZTrdFWU5B5YCHaLhA",
  authDomain: "test-transporte-vargas.firebaseapp.com",
  projectId: "test-transporte-vargas",
  storageBucket: "test-transporte-vargas.firebasestorage.app",
  messagingSenderId: "470070126417",
  appId: "1:470070126417:web:607c1db7aa3e6b64719570",
  measurementId: "G-361QC84JFD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);