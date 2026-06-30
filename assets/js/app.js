
// ==========================
// MOCK DATA
// ==========================

const adminData = [
  {
    user: "Ming Lee",
    images: [
      { src: "assets/login-1.jpeg", caption: "Nice", desc: "Moment" },
      { src: "assets/login-2.jpeg", caption: "Love", desc: "Forever" },
      { src: "assets/login-3.jpeg", caption: "Together", desc: "Wedding Day" }
    ]
  },
  {
    user: "Zong Xuan",
    images: [
      { src: "assets/login-3.jpeg", caption: "Smile", desc: "Happy" },
      { src: "assets/login-4.jpeg", caption: "Party", desc: "Fun Night" }
    ]
  }
];

// ==========================
// STATE
// ==========================

let currentPage = "album";

let isSelectMode = false;

let tempSelection = [];

let collections = [];

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

        <div class="flex justify-between items-center mb-6">

          <div>
            <h2 class="text-2xl font-script">
              Admin Gallery
            </h2>

            <p class="text-xs tracking-[0.3em] uppercase text-[var(--color-muted)]">
              Review & Select Memories
            </p>
          </div>

          <button onclick="toggleSelectMode()"
            class="px-4 py-2 rounded-xl border border-[var(--color-border)] text-xs tracking-[0.2em] uppercase">

            <span id="modeText">
              ${isSelectMode ? "View" : "Select"}
            </span>

          </button>

        </div>

        <div id="adminGallery" class="space-y-8"></div>

      </div>
    `;

    renderAdminGallery();
  }

  // ==========================
  // COLLECTION PAGE
  // ==========================

  if (page === "collections") {

    content.innerHTML = `
      <div class="p-4">

        <div class="text-center mb-6">

          <h2 class="text-3xl font-script">
            Slideshow Collection
          </h2>

          <p class="text-xs uppercase tracking-[0.3em] text-[var(--color-muted)] mt-2">
            Ready For Export
          </p>

        </div>

        <div class="grid grid-cols-2 gap-3">

          ${collections.map((img, index) => `
            
            <div class="relative">

              <img src="${img.src}"
                class="w-full h-44 object-cover rounded-2xl">

              <button
                onclick="removeCollection(${index})"
                class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white text-sm">
                ✕
              </button>

            </div>

          `).join("")}

        </div>

        ${collections.length ? `
          <button onclick="generateSlideshow()"
            class="w-full mt-6 py-4 rounded-2xl bg-[var(--color-primary)] text-white">
            Export Slideshow
          </button>
        ` : `
          <div class="text-center py-20 text-[var(--color-muted)] text-sm">
            No images in collection
          </div>
        `}

      </div>
    `;
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

      </div>
    `;
  }
}

// ==========================
// GALLERY
// ==========================

function renderAdminGallery() {

  const container = document.getElementById("adminGallery");

  container.innerHTML = adminData.map((group, userIndex) => `

    <div>

      <div class="mb-3">

        <h3 class="text-lg font-script text-[var(--color-text)]">
          ${group.user}
        </h3>

        <p class="text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]">
          Guest Collection
        </p>

      </div>

      <div class="grid grid-cols-3 gap-2">

        ${group.images.map((img, imgIndex) => {

          const key = `${userIndex}-${imgIndex}`;

          const active = tempSelection.find(i => i.key === key);

          return `
            <div class="relative">

              <img src="${img.src}"
                class="w-full h-28 object-cover rounded-xl cursor-pointer"
                onclick="handleImageClick(${userIndex}, ${imgIndex}, this)">

              <div class="absolute inset-0
                          ${active ? 'flex' : 'hidden'}
                          items-center justify-center
                          bg-black/40 rounded-xl overlay">

                <span class="text-white text-xl">
                  ✓
                </span>

              </div>

            </div>
          `;
        }).join("")}

      </div>

    </div>

  `).join("");
}

// ==========================
// IMAGE CLICK
// ==========================

function handleImageClick(userIndex, imgIndex, el) {

  const data = adminData[userIndex].images[imgIndex];

  // VIEW MODE
  if (!isSelectMode) {
    openImageModal(data);
    return;
  }

  // SELECT MODE
  toggleTempSelection(userIndex, imgIndex, el);
}

// ==========================
// TEMP SELECTION
// ==========================

function toggleTempSelection(userIndex, imgIndex, el) {

  const overlay = el.parentElement.querySelector(".overlay");

  const key = `${userIndex}-${imgIndex}`;

  const exists = tempSelection.find(i => i.key === key);

  if (exists) {

    tempSelection = tempSelection.filter(i => i.key !== key);

    overlay.classList.add("hidden");

  } else {

    tempSelection.push({
      key,
      ...adminData[userIndex].images[imgIndex]
    });

    overlay.classList.remove("hidden");
    overlay.classList.add("flex");
  }
}

// ==========================
// TOGGLE MODE
// ==========================
function toggleSelectMode() {

  isSelectMode = !isSelectMode;

  // IF SWITCHING BACK TO VIEW MODE
  // CLEAR TEMP SELECTION
  if (!isSelectMode) {
    tempSelection = [];
  }

  // UPDATE BUTTON TEXT
  const modeText = document.getElementById("modeText");

  if (modeText) {
    modeText.innerText = isSelectMode
      ? "View"
      : "Select";
  }

  // RERENDER GALLERY
  renderAdminGallery();

  // UPDATE COLLECTION BUTTON
  updateCollectionButton();
}

// ==========================
// COLLECTION BUTTON
// ==========================

function updateCollectionButton() {

  const icon = document.getElementById("collectionIcon");

  // SELECT MODE
  if (isSelectMode) {

    icon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg"
        class="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor">

        <path stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M12 4v16m8-8H4"/>
      </svg>
    `;

  } else {

    icon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg"
        class="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor">

        <path stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M3 7a2 2 0 012-2h3l2 2h9a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
      </svg>
    `;
  }
}

// ==========================
// COLLECTION BUTTON ACTION
// ==========================

function handleCollectionButton() {

  // ADD TO COLLECTION
  if (isSelectMode) {

    collections.push(...tempSelection);

    tempSelection = [];

    isSelectMode = false;

    renderAdminGallery();

    updateCollectionButton();

    alert("Added to collection");

    return;
  }

  // OPEN COLLECTION PAGE
  showPage("collections");
}

// ==========================
// REMOVE COLLECTION
// ==========================

function removeCollection(index) {

  collections.splice(index, 1);

  showPage("collections");
}

// ==========================
// IMAGE MODAL
// ==========================

function openImageModal(data) {

  document.getElementById("modalImg").src = data.src;

  document.getElementById("modalCaption").innerText =
    data.caption || "";

  document.getElementById("modalDesc").innerText =
    data.desc || "";

  document.getElementById("imageModal").classList.remove("hidden");
  document.getElementById("imageModal").classList.add("flex");
}

document.getElementById("modalBg").onclick = () => {

  document.getElementById("imageModal").classList.add("hidden");

  document.getElementById("imageModal").classList.remove("flex");
};

// ==========================
// GENERATE VIDEO
// ==========================

async function generateSlideshow() {

  if (!collections.length) {
    alert("Collection is empty");
    return;
  }

  document.getElementById("renderLoading").classList.remove("hidden");
  document.getElementById("renderLoading").classList.add("flex");

  const canvas = document.createElement("canvas");

  const ctx = canvas.getContext("2d");

  canvas.width = 1280;
  canvas.height = 720;

  const stream = canvas.captureStream(30);

  const recorder = new MediaRecorder(stream, {
    mimeType: "video/webm; codecs=vp9"
  });

  let chunks = [];

  recorder.ondataavailable = e => chunks.push(e.data);

  recorder.onstop = () => {

    const blob = new Blob(chunks, {
      type: "video/webm"
    });

    const url = URL.createObjectURL(blob);

    document.getElementById("renderLoading").classList.add("hidden");

    showVideoPreview(url);
  };

  recorder.start();

  for (let i = 0; i < collections.length; i++) {

    await renderFrame(
      ctx,
      canvas,
      collections[i]
    );
  }

  recorder.stop();
}

// ==========================
// RENDER FRAME
// ==========================

function renderFrame(ctx, canvas, imgObj) {

  return new Promise(resolve => {

    const img = new Image();

    img.src = imgObj.src;

    img.onload = () => {

      let start = null;

      const duration = 2000;

      function animate(timestamp) {

        if (!start) start = timestamp;

        const progress = timestamp - start;

        // background
        ctx.fillStyle = "#1a0f1f";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // contain full image
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height
        );

        const w = img.width * scale;
        const h = img.height * scale;

        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;

        ctx.drawImage(img, x, y, w, h);

        // overlay
        const gradient = ctx.createLinearGradient(
          0, 0, 0, canvas.height
        );

        gradient.addColorStop(0, "rgba(0,0,0,0.2)");
        gradient.addColorStop(1, "rgba(0,0,0,0.6)");

        ctx.fillStyle = gradient;

        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // caption
        ctx.fillStyle = "#fff";

        ctx.textAlign = "center";

        ctx.font = "bold 50px serif";

        ctx.fillText(
          imgObj.caption || "",
          canvas.width / 2,
          canvas.height - 120
        );

        ctx.font = "28px sans-serif";

        ctx.fillText(
          imgObj.desc || "",
          canvas.width / 2,
          canvas.height - 70
        );

        if (progress < duration) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(animate);
    };
  });
}

// ==========================
// VIDEO PREVIEW
// ==========================

function showVideoPreview(url) {

  const modal = document.getElementById("videoModal");

  const video = document.getElementById("previewVideo");

  const downloadBtn = document.getElementById("downloadBtn");

  video.src = url;

  downloadBtn.href = url;

  downloadBtn.download = "wedding-slideshow.webm";

  modal.classList.remove("hidden");

  modal.classList.add("flex");
}

function closeVideoPreview() {

  document.getElementById("videoModal").classList.add("hidden");

  document.getElementById("videoModal").classList.remove("flex");
}

// ==========================
// INIT
// ==========================

showPage("album");

updateCollectionButton();
