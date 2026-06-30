// ==========================
// FIREBASE INIT (shared by login + admin + user pages)
// ==========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  onSnapshot,
  query,
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
  apiKey: "AIzaSyCkIc46cTB07iK3nOav6V-RzHxTHpmDKZM",
  authDomain: "chieng-and-lily.firebaseapp.com",
  projectId: "chieng-and-lily",
  storageBucket: "chieng-and-lily.firebasestorage.app",
  messagingSenderId: "712601273441",
  appId: "1:712601273441:web:dc5f7e38dcc7f9e9309620",
  measurementId: "G-MGY2DBTK0P"
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
  collection, addDoc, setDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc,
  ref, uploadString, uploadBytes, getDownloadURL, deleteObject
};