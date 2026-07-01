// ==========================
// CCD FILTER
// Emulates the look of a low-ISO CCD point-and-shoot: soft tonal curve,
// gentle desaturation, slight green/cyan bias, film-like grain, mild
// vignette, and a touch of softness (CCDs were never razor sharp).
// ==========================

// Cheap CSS filter used ONLY for the live video preview, so framing the
// shot feels responsive. Not pixel-accurate — the real effect is baked
// into the photo at capture time via applyCcdEffect().
export const CCD_PREVIEW_FILTER =
  "saturate(0.85) contrast(1.05) brightness(1.02) sepia(0.08) hue-rotate(-4deg)";

// Applies the CCD look permanently onto a canvas's pixel data.
// Call this AFTER drawImage() and BEFORE canvas.toDataURL().
export function applyCcdEffect(ctx, canvas) {
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const grainAmount = 10;        // luminance noise strength (0-255 scale)
  const vignetteStrength = 0.35; // 0 = none, 1 = strong
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Low-ISO CCD tonal curve: softened highlights, lifted shadows —
    // mimics the limited dynamic range of small CCD sensors.
    r = ccdCurve(r);
    g = ccdCurve(g);
    b = ccdCurve(b);

    // Classic CCD white balance bias (slightly green/cyan)
    g = clamp(g * 1.04);
    b = clamp(b * 0.97);

    // Flatter color response — reduce saturation a touch
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const satMix = 0.85;
    r = clamp(gray + (r - gray) * satMix);
    g = clamp(gray + (g - gray) * satMix);
    b = clamp(gray + (b - gray) * satMix);

    // Film-like grain — luminance noise only (real low-ISO CCD noise is
    // mostly monochrome, not colored speckling)
    const noise = (Math.random() - 0.5) * grainAmount;
    r = clamp(r + noise);
    g = clamp(g + noise);
    b = clamp(b + noise);

    // Vignette
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2) / maxDist;
    const vignette = 1 - vignetteStrength * Math.pow(dist, 2.2);

    r = clamp(r * vignette);
    g = clamp(g * vignette);
    b = clamp(b * vignette);

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);

  // Subtle soften pass — cheap downscale/upscale trick instead of a heavy
  // convolution loop, enough to kill sensor-sharp edges.
  softenCanvas(ctx, canvas);
}

function ccdCurve(value) {
  const v = value / 255;
  const curved = Math.pow(v, 1.08) * 0.96 + 0.02;
  return clamp(curved * 255);
}

function clamp(v) {
  return Math.max(0, Math.min(255, v));
}

function softenCanvas(ctx, canvas) {
  const { width, height } = canvas;
  const scale = 0.6;

  const temp = document.createElement("canvas");
  temp.width = Math.max(1, Math.round(width * scale));
  temp.height = Math.max(1, Math.round(height * scale));
  const tempCtx = temp.getContext("2d");

  tempCtx.imageSmoothingEnabled = true;
  tempCtx.drawImage(canvas, 0, 0, temp.width, temp.height);

  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(temp, 0, 0, width, height);
}