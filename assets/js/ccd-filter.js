// ==========================
// CCD FILTER
// A stylized approximation of a late-90s/2000s point-and-shoot digicam
// (CCD sensor) look at low/base ISO: punchy, slightly-inaccurate color,
// crushed blacks with soft blown highlights, in-camera-style oversharpening
// (with halos), edge chromatic aberration from a cheap kit lens, fine
// sensor grain, gentle vignette, and a final low-quality JPEG re-encode
// pass to bake in period-correct compression artifacts.
//
// This is a visual approximation, not a calibrated emulation of one exact
// sensor — real digicam color science varies a lot by brand (Canon/Sony/
// Kodak/Fuji all look different). Tune the constants below to taste.
// ==========================

// ---- Tunable knobs ----------------------------------------------------

const SATURATION_BOOST = 1.28;       // >1 = punchier color (real CCD JPEGs are oversaturated, not muted)
const CONTRAST_AMOUNT = 1.16;        // midtone contrast boost
const SHARPEN_AMOUNT = 0.65;         // unsharp-mask strength -> the "crunchy" in-camera sharpening halo look
const GRAIN_AMOUNT = 7;              // fine grain, kept restrained since this is a LOW-ISO look
const VIGNETTE_STRENGTH = 0.25;      // corner darkening from a cheap lens
const CHROMATIC_ABERRATION_PX = 2.2; // max R/B channel offset at the extreme corners
const JPEG_REENCODE_QUALITY = 0.55;  // low-quality JPEG pass = authentic period compression artifacts
const MAX_PROCESSING_DIMENSION = 1600; // cap long edge for perf; plenty for this app's card-sized display

// CSS approximation for the LIVE viewfinder only (cheap, responsive).
// The real look is baked in for real at capture time via applyCcdEffect().
export const CCD_PREVIEW_FILTER =
  "saturate(1.3) contrast(1.12) brightness(1.03) sepia(0.05) hue-rotate(-3deg)";

// ---- Precomputed tone/color lookup tables (built once at module load) --

function toneCurve(v) {
  // v in 0..1. Midtone contrast boost + soft highlight rolloff + slight
  // shadow crush — mimics a small CCD's limited dynamic range plus the
  // in-camera JPEG engine's contrast punch.
  const mid = 0.45;
  let out = (v - mid) * CONTRAST_AMOUNT + mid;

  if (out > 0.68) {
    const t = Math.min((out - 0.68) / 0.32, 1);
    out = 0.68 + 0.32 * (1 - Math.pow(1 - t, 1.8)); // soft rolloff, not a hard clip
  }
  if (out < 0.1) {
    out *= 0.82; // crushed blacks
  }
  return Math.max(0, Math.min(1, out));
}

function buildLUT(channel) {
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    let v = toneCurve(i / 255);

    // Split-tone color bias — the classic "cheap CCD white balance"
    // fingerprint: slightly cool/cyan shadows, slightly warm/golden highlights.
    if (channel === "r") {
      v += v > 0.5 ? (v - 0.5) * 0.11 : -(0.5 - v) * 0.015;
    } else if (channel === "g") {
      v += (v - 0.5) * 0.02; // faint punch, keeps foliage/greens lively
    } else if (channel === "b") {
      v += v < 0.5 ? (0.5 - v) * 0.09 : -(v - 0.5) * 0.07;
    }

    lut[i] = Math.round(v * 255);
  }
  return lut;
}

const LUT_R = buildLUT("r");
const LUT_G = buildLUT("g");
const LUT_B = buildLUT("b");

// ---- Helpers ------------------------------------------------------------

function clampByte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function clampInt(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

// Figures out a working size that's fast to process but still plenty sharp
// for how photos are actually displayed in this app (small mobile cards).
export function getCcdCanvasSize(sourceWidth, sourceHeight) {
  const longEdge = Math.max(sourceWidth, sourceHeight);
  if (longEdge <= MAX_PROCESSING_DIMENSION) {
    return { width: sourceWidth, height: sourceHeight };
  }
  const scale = MAX_PROCESSING_DIMENSION / longEdge;
  return {
    width: Math.round(sourceWidth * scale),
    height: Math.round(sourceHeight * scale)
  };
}

// ---- Effect passes --------------------------------------------------------

// Cheap blur via downscale + upscale — used as the "blurred" reference for
// unsharp masking. Not a true gaussian blur, which is actually helpful
// here: the slightly blocky resampling produces the kind of ringing/halo a
// real digicam's aggressive in-camera sharpening left behind, rather than
// a clean modern sharpen.
function getBlurredImageData(canvas, scale = 0.3) {
  const { width, height } = canvas;

  const small = document.createElement("canvas");
  small.width = Math.max(1, Math.round(width * scale));
  small.height = Math.max(1, Math.round(height * scale));
  const smallCtx = small.getContext("2d");
  smallCtx.imageSmoothingEnabled = true;
  smallCtx.drawImage(canvas, 0, 0, small.width, small.height);

  const back = document.createElement("canvas");
  back.width = width;
  back.height = height;
  const backCtx = back.getContext("2d");
  backCtx.imageSmoothingEnabled = true;
  backCtx.drawImage(small, 0, 0, width, height);

  return backCtx.getImageData(0, 0, width, height);
}

function applySharpen(ctx, canvas) {
  const original = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const blurred = getBlurredImageData(canvas);
  const data = original.data;
  const blurData = blurred.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i]     = clampByte(data[i]     + (data[i]     - blurData[i])     * SHARPEN_AMOUNT);
    data[i + 1] = clampByte(data[i + 1] + (data[i + 1] - blurData[i + 1]) * SHARPEN_AMOUNT);
    data[i + 2] = clampByte(data[i + 2] + (data[i + 2] - blurData[i + 2]) * SHARPEN_AMOUNT);
  }

  ctx.putImageData(original, 0, 0);
}

// Cheap kit-lens chromatic aberration: red pushed outward, blue pulled
// inward, strongest toward the corners, negligible dead-center.
function applyChromaticAberration(ctx, canvas) {
  const { width, height } = canvas;
  const src = ctx.getImageData(0, 0, width, height);
  const out = ctx.createImageData(width, height);
  const s = src.data;
  const o = out.data;

  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < height; y++) {
    const dy = y - cy;
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const distPx = Math.sqrt(dx * dx + dy * dy) || 1;
      const distNorm = distPx / maxDist;
      const shift = distNorm * distNorm * CHROMATIC_ABERRATION_PX;
      const nx = dx / distPx;
      const ny = dy / distPx;

      const rx = clampInt(Math.round(x + nx * shift), 0, width - 1);
      const ry = clampInt(Math.round(y + ny * shift), 0, height - 1);
      const bx = clampInt(Math.round(x - nx * shift), 0, width - 1);
      const by = clampInt(Math.round(y - ny * shift), 0, height - 1);

      const i  = (y * width + x) * 4;
      const ri = (ry * width + rx) * 4;
      const bi = (by * width + bx) * 4;

      o[i]     = s[ri];       // red sampled from a point shifted outward
      o[i + 1] = s[i + 1];    // green stays put (reference channel)
      o[i + 2] = s[bi + 2];   // blue sampled from a point shifted inward
      o[i + 3] = s[i + 3];
    }
  }

  ctx.putImageData(out, 0, 0);
}

function applyToneAndColor(data) {
  for (let i = 0; i < data.length; i += 4) {
    let r = LUT_R[data[i]];
    let g = LUT_G[data[i + 1]];
    let b = LUT_B[data[i + 2]];

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clampByte(gray + (r - gray) * SATURATION_BOOST);
    g = clampByte(gray + (g - gray) * SATURATION_BOOST);
    b = clampByte(gray + (b - gray) * SATURATION_BOOST);

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

function applyGrainAndVignette(data, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  const pixelCount = width * height;

  for (let idx = 0; idx < pixelCount; idx++) {
    const i = idx * 4;
    const x = idx % width;
    const y = (idx / width) | 0;

    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const shadowBoost = 1 - (lum / 255) * 0.55; // noise reads stronger in shadows, like a real sensor floor
    const n = (Math.random() - 0.5) * GRAIN_AMOUNT * shadowBoost;
    const nChroma = (Math.random() - 0.5) * GRAIN_AMOUNT * 0.3 * shadowBoost;

    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
    const vignette = 1 - VIGNETTE_STRENGTH * Math.pow(dist, 2.3);

    data[i]     = clampByte((data[i]     + n + nChroma) * vignette);
    data[i + 1] = clampByte((data[i + 1] + n)            * vignette);
    data[i + 2] = clampByte((data[i + 2] + n - nChroma)  * vignette);
  }
}

function reencodeAsJPEG(canvas) {
  return new Promise((resolve) => {
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_REENCODE_QUALITY);
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve();
    };
    img.onerror = resolve; // don't hang the pipeline on a decode failure
    img.src = dataUrl;
  });
}

// ---- Main entry point -----------------------------------------------------
// NOTE: now async (does a real JPEG re-encode roundtrip) — callers must await it.
export async function applyCcdEffect(ctx, canvas) {
  applyChromaticAberration(ctx, canvas);

  const toneData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyToneAndColor(toneData.data);
  ctx.putImageData(toneData, 0, 0);

  applySharpen(ctx, canvas);

  const finalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyGrainAndVignette(finalData.data, canvas.width, canvas.height);
  ctx.putImageData(finalData, 0, 0);

  await reencodeAsJPEG(canvas);
}