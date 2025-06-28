
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  addDoc, 
  where, 
  orderBy, 
  limit, 
  query, 
  getDocs,
  writeBatch,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  deleteField,
  Timestamp, // Import Timestamp here
  onSnapshot // Import onSnapshot here
} from "firebase/firestore";
import { getAuth, updateProfile as firebaseUpdateProfile } from "firebase/auth"; // Renamed to avoid conflict
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Removed the initial check for placeholder API keys.
// The Firebase SDK will handle invalid key errors during its operations.
// Ensure your .env file is correctly populated with your actual Firebase project keys.

let app: FirebaseApp;
if (!getApps().length) {
  // Check if config values are placeholders before initializing
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("YOUR_")) {
    console.error("Firebase API Key is missing or a placeholder. The app will not function correctly until it's set in your .env file.");
  }
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Export firebaseUpdateProfile under a different name if needed, or ensure it's clear which updateProfile is being used.
// For direct use from firebase/auth, it's fine. If re-exporting, be mindful of naming.
export { 
  app, 
  db, 
  auth, 
  storage, 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  addDoc, 
  where, 
  orderBy, 
  limit, 
  query, 
  getDocs,
  writeBatch,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  deleteField,
  Timestamp, // Export Timestamp here
  onSnapshot, // Export onSnapshot here
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  firebaseUpdateProfile // Exporting the renamed updateProfile
};
