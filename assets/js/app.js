// ==========================
// FIREBASE
// ==========================

import {
  db, ensureSignedIn,
  collection, onSnapshot, query, orderBy, deleteDoc, doc,
  storage, ref, deleteObject
} from "./firebase-config.js";
import { requireSession, clearSession } from "./auth.js";
const session = requireSession("admin");
// ==========================
// STATE
// ==========================

let currentPage = "album";

let adminPhotos = []; // live list from Firestore

// slideshow state
let slideshowIndex = 0;
let slideshowTimer = null;
let slideshowPlaying = true;

// ==========================
// LIVE DATA LISTENER
// ==========================

ensureSignedIn().then(() => {
  const q = query(collection(db, "photos"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    adminPhotos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    if (currentPage === "album") {
      renderAdminGallery();
    }
  }, (err) => {
    console.error("Failed to load photos:", err);
  });
});

// ==========================
// PAGE
// ==========================

function showPage(page) {

  currentPage = page;

  const content = document.getElementById("page-content");

  // ==========================
  // ALBUM PAGE
  // ==========================

  if (page === "album") {

    content.innerHTML = `
      <div class="p-4">

        <div class="mb-6">
          <h2 class="text-2xl font-script">
            Admin Gallery
          </h2>

          <p class="text-xs tracking-[0.3em] uppercase text-[var(--color-muted)]">
            All Guest Memories
          </p>
        </div>

        <div id="adminGallery" class="space-y-8"></div>

      </div>
    `;

    renderAdminGallery();
  }

  // ==========================
  // PROFILE PAGE
  // ==========================

  if (page === "profile") {

    content.innerHTML = `
      <div class="p-6 flex flex-col items-center text-center min-h-[80vh]">

        <div class="w-24 h-24 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
          <span class="text-2xl font-script text-[var(--color-text)]">
            ADM
          </span>
        </div>

        <h2 class="mt-4 text-2xl font-script">
          Administrator
        </h2>

        <p class="text-xs tracking-[0.25em] uppercase text-[var(--color-muted)] mt-1">
          Wedding Manager
        </p>

        <div class="flex-1"></div>

        <a href="#" onclick="signOut(); return false;"
            class="mt-8 w-full max-w-sm py-3 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium shadow-lg active:scale-95 transition block text-center">
            Sign Out
        </a>

        <!-- FOOTER -->
        <p class="mt-4 text-xs text-[var(--color-muted)]">
            With love & gratitude ❤️
        </p>
      </div>
    `;
  }
}

// ==========================
// GALLERY (FLAT, FROM FIRESTORE)
// ==========================

function renderAdminGallery() {

  const container = document.getElementById("adminGallery");

  if (!container) return;

  if (!adminPhotos.length) {
    container.innerHTML = `
      <p class="text-center text-sm text-[var(--color-muted)] py-10">
        No photos uploaded yet
      </p>
    `;
    return;
  }

  container.innerHTML = `
    <div class="grid grid-cols-3 gap-2">

      ${adminPhotos.map((img, index) => `
        <div class="relative">

          <img src="${img.imageUrl}"
            class="w-full h-28 object-cover rounded-xl cursor-pointer"
            onclick="handleImageClick(${index})">

          <button
            onclick="event.stopPropagation(); deletePhoto('${img.id}', '${img.storagePath || ''}')"
            class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center">
            ✕
          </button>

        </div>
      `).join("")}

    </div>
  `;
}

// ==========================
// IMAGE CLICK
// ==========================

function handleImageClick(index) {
  openImageModal(adminPhotos[index]);
}

// ==========================
// DELETE PHOTO (Firestore + Storage)
// ==========================

async function deletePhoto(photoId, storagePath) {

  if (!confirm("Delete this photo permanently?")) return;

  try {

    await deleteDoc(doc(db, "photos", photoId));

    if (storagePath) {
      await deleteObject(ref(storage, storagePath)).catch(err => {
        // file may already be gone, don't block on it
        console.warn("Storage file delete warning:", err);
      });
    }

  } catch (err) {
    console.error("Delete failed:", err);
    alert("Failed to delete photo.");
  }
}

// ==========================
// IMAGE MODAL
// ==========================

function openImageModal(data) {

  document.getElementById("modalImg").src = data.imageUrl;

  document.getElementById("modalCaption").innerText =
    data.title || "";

  document.getElementById("modalDesc").innerText =
    data.caption || "";

  document.getElementById("imageModal").classList.remove("hidden");
  document.getElementById("imageModal").classList.add("flex");
}

document.getElementById("modalBg").onclick = () => {

  document.getElementById("imageModal").classList.add("hidden");

  document.getElementById("imageModal").classList.remove("flex");
};
// ==========================
// SLIDESHOW (middle button)
// ==========================

const SLIDESHOW_INTERVAL = 3500;
const SLIDESHOW_TRANSITION = 350; // must match CSS transition duration

function openSlideshow() {

  if (!adminPhotos.length) {
    alert("No photos to show yet.");
    return;
  }

  slideshowIndex = 0;
  slideshowPlaying = true;

  const modal = document.getElementById("slideshowModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  renderSlideshowFrame(); // initial render, no animation
  startSlideshowTimer();
}

function renderSlideshowFrame() {

  const photo = adminPhotos[slideshowIndex];
  if (!photo) return;

  document.getElementById("slideshowImg").src = photo.imageUrl;
  document.getElementById("slideshowTitle").innerText = photo.title || "";
  document.getElementById("slideshowCaption").innerText = photo.caption || "";

  document.getElementById("slideshowCounter").innerText =
    `${slideshowIndex + 1} / ${adminPhotos.length}`;

  updatePlayIcon();
}

function updatePlayIcon() {
  const playIcon = document.getElementById("slideshowPlayIcon");
  if (!playIcon) return;

  playIcon.innerHTML = slideshowPlaying
    ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 9v6m4-6v6"/>` // pause bars
    : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-6.518-3.76A1 1 0 007 8.24v7.52a1 1 0 001.234.972l6.518-3.76a1 1 0 000-1.804z"/>`; // play triangle
}

// direction: "next" | "prev" | null (null = no animation, used on open)
function goToSlide(newIndex, direction) {

  const inner = document.getElementById("slideshowCardInner");

  if (!direction) {
    slideshowIndex = newIndex;
    renderSlideshowFrame();
    return;
  }

  const outClass = direction === "next" ? "ss-out-next" : "ss-out-prev";
  inner.classList.add(outClass);

  setTimeout(() => {
    slideshowIndex = newIndex;
    renderSlideshowFrame();

    // swap to the opposite offset (so it enters from the correct side), then animate to center
    inner.classList.remove(outClass);
    const inClass = direction === "next" ? "ss-out-prev" : "ss-out-next";
    inner.classList.add(inClass);

    // force reflow so the browser registers the starting position before transitioning
    void inner.offsetWidth;

    inner.classList.remove(inClass);
  }, SLIDESHOW_TRANSITION);
}

function startSlideshowTimer() {
  clearInterval(slideshowTimer);
  if (!slideshowPlaying) return;

  slideshowTimer = setInterval(() => {
    slideshowNext();
  }, SLIDESHOW_INTERVAL);
}

function slideshowNext() {
  const newIndex = (slideshowIndex + 1) % adminPhotos.length;
  goToSlide(newIndex, "next");
}

function slideshowPrev() {
  const newIndex = (slideshowIndex - 1 + adminPhotos.length) % adminPhotos.length;
  goToSlide(newIndex, "prev");
}

function toggleSlideshowPlay() {
  slideshowPlaying = !slideshowPlaying;
  updatePlayIcon();
  startSlideshowTimer();
}

function closeSlideshow() {
  clearInterval(slideshowTimer);
  const modal = document.getElementById("slideshowModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// ==========================
// EXPOSE TO INLINE onclick HANDLERS
// (required because this file is loaded as a module)
// ==========================

window.showPage = showPage;
window.handleImageClick = handleImageClick;
window.deletePhoto = deletePhoto;
window.openSlideshow = openSlideshow;
window.slideshowNext = slideshowNext;
window.slideshowPrev = slideshowPrev;
window.toggleSlideshowPlay = toggleSlideshowPlay;
window.closeSlideshow = closeSlideshow;

// ==========================
// INIT
// ==========================

showPage("album");

window.signOut = function() {
  clearSession();
  window.location.href = "login.html";
};