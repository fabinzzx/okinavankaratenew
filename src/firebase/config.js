import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyAOMj86zRyCHhFB-Ya0PtqbIXJemdZORm8",
  authDomain: "okinavankarate.firebaseapp.com",
  projectId: "okinavankarate",
  storageBucket: "okinavankarate.firebasestorage.app",
  messagingSenderId: "517463109606",
  appId: "1:517463109606:web:8f85de875dc90f1cd23027",
  measurementId: "G-L9YV85KSRT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
