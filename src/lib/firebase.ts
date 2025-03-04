import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDwibENgJ2U1hmQ3JxMVTowA6ywxlUXj_s",
  authDomain: "startups-ad.firebaseapp.com",
  projectId: "startups-ad",
  storageBucket: "startups-ad.appspot.com",
  messagingSenderId: "988591088861",
  appId: "1:988591088861:web:e9e1420edd55cd7e9da734"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable offline persistence
try {
  const { enableIndexedDbPersistence } = require('firebase/firestore');
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support persistence.');
    }
  });
} catch (error) {
  console.warn('Failed to enable offline persistence:', error);
}
