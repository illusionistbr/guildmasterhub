
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
  Timestamp // Import Timestamp here
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

let app: FirebaseApp;
if (!getApps().length) {
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
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  firebaseUpdateProfile // Exporting the renamed updateProfile
};

