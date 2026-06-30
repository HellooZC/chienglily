// ==========================
// FIREBASE INIT (shared by login + admin + user pages)
// ==========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadString,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 🔴 PASTE YOUR CONFIG FROM THE FIREBASE CONSOLE HERE
// Firebase Console > Project Settings > General > "Your apps" > SDK setup and config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Make sure every visitor (guest or admin) has an anonymous identity
// before they try to read/write anything (Storage/Firestore rules require this).
function ensureSignedIn() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve(user);
      } else {
        signInAnonymously(auth)
          .then((cred) => resolve(cred.user))
          .catch((err) => {
            console.error("Anonymous sign-in failed:", err);
            resolve(null);
          });
      }
    });
  });
}

export {
  db, storage, auth, ensureSignedIn,
  collection, addDoc, setDoc, getDoc, getDocs, onSnapshot, query, where, orderBy, serverTimestamp, deleteDoc, doc,
  ref, uploadString, uploadBytes, getDownloadURL, deleteObject
};