import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAOMj86zRyCHhFB-Ya0PtqbIXJemdZORm8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "okinavankarate.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "okinavankarate",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "okinavankarate.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "517463109606",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:517463109606:web:8f85de875dc90f1cd23027",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-L9YV85KSRT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;