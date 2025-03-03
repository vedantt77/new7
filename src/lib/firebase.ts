import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDwibENgJ2U1hmQ3JxMVTowA6ywxlUXj_s",
  authDomain: "startups-ad.firebaseapp.com",
  projectId: "startups-ad",
  storageBucket: "startups-ad.firebasestorage.app",
  messagingSenderId: "988591088861",
  appId: "1:988591088861:web:e9e1420edd55cd7e9da734"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
