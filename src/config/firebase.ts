import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAuAuIQ-P9Uvm5ermKXJe6mUYassDzsSi4Mk",
  authDomain: "work-2f17c.firebaseapp.com",
  projectId: "work-2f17c",
  storageBucket: "work-2f17c.firebasestorage.app",
  messagingSenderId: "368042465802",
  appId: "1:368042465802:web:5c26a6e7461202790f5df3"
};

let appInitialized = false;
let app: FirebaseApp | null = null;
let db: Firestore | null = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  appInitialized = true;
} catch (e) {
  console.warn('Firebase 未初始化，仅使用本地存储', e);
}

export { appInitialized };
export const getFirestoreDB = (): Firestore | null => db;
