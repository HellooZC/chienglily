// ==========================
// USER MODULE
// Simple guestbook-style login: guest types their name, we look it up
// in the Firestore "guests" collection. If found, they're "logged in".
// No passwords — this just identifies who is uploading/commenting.
// ==========================

import {
  db, ensureSignedIn,
  collection, query, where, getDocs
} from "./firebase-config.js";

const SESSION_KEY = "cl_currentGuest"; // sessionStorage key

/**
 * Look up a guest by name (case-insensitive) in the "guests" collection
 * and log them in if found.
 * @param {string} rawName
 * @returns {Promise<{ok:boolean, guest?:object, error?:string}>}
 */
async function loginUser(rawName) {
  const name = (rawName || "").trim();

  if (!name) {
    return { ok: false, error: "Please enter your name." };
  }

  await ensureSignedIn(); // need an auth session before reading Firestore

  // Names are stored with a lowercase "nameKey" field for matching,
  // so "Chieng Lim", "chieng lim", "CHIENG LIM" all match the same guest.
  const nameKey = name.toLowerCase();

  const guestsRef = collection(db, "guests");
  const q = query(guestsRef, where("nameKey", "==", nameKey));
  const snap = await getDocs(q);

  if (snap.empty) {
    return { ok: false, error: "We couldn't find that name on the guest list. Check the spelling, or ask the couple to add you." };
  }

  const docSnap = snap.docs[0];
  const guest = { id: docSnap.id, ...docSnap.data() };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(guest));

  return { ok: true, guest };
}

/** Returns the currently logged-in guest object, or null. */
function getCurrentUser() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Clears the session and sends the visitor back to login. */
function logout(redirectTo = "login.html") {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = redirectTo;
}

/**
 * Call this at the top of any protected page (e.g. user-index.html).
 * If nobody is logged in, redirects to login.html and returns null.
 * Otherwise returns the guest object.
 */
function requireAuth(redirectTo = "login.html") {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  return user;
}

export { loginUser, getCurrentUser, logout, requireAuth };
