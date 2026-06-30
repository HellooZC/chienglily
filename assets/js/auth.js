// ==========================
// SESSION HELPERS (app-level login on top of Firebase anonymous auth)
// ==========================
// We use Firebase Anonymous Auth purely so Firestore/Storage rules have a
// request.auth to check (every visitor gets a uid). The actual "who is this
// guest / are they admin" identity lives in sessionStorage, set after a
// successful name+password check against the `users` collection.

const SESSION_KEY = "wedding_session";

export function saveSession(userDoc) {
  // userDoc: { id, name, role }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(userDoc));
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// Call at the top of any protected page.
// requiredRole: "admin" | "guest" | null (null = any logged-in user allowed)
export function requireSession(requiredRole = null) {
  const session = getSession();

  if (!session) {
    window.location.href = "login.html";
    return null;
  }

  if (requiredRole && session.role !== requiredRole) {
    // Logged in, but wrong role for this page — send to their correct home.
    window.location.href = session.role === "admin" ? "index.html" : "user-index.html";
    return null;
  }

  return session;
}