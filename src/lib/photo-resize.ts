// Runs in the browser. Re-encoding through a canvas shrinks 5 MB phone photos to a few
// hundred KB and drops EXIF metadata, including the GPS location of the seller's home.
// Everything comes out as JPEG, whatever went in (JPG, PNG, WebP, SVG…).

const FULL_EDGE = 1600;
const THUMB_EDGE = 560;
// SVGs often have no fixed size; draw them at this width.
const SVG_EDGE = 1600;

export type ResizedPhoto = { full: Blob; thumb: Blob; width: number; height: number };

type Source = { image: CanvasImageSource; width: number; height: number; close: () => void };

/** Turns the file into something a canvas can draw. Falls back to <img> for formats createImageBitmap can't read, like SVG. */
async function decode(file: File): Promise<Source> {
  const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
  if (!isSvg) {
    try {
      // imageOrientation honours the EXIF rotation so portrait phone shots stay upright.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Fall through to the <img> route below.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    let { naturalWidth: width, naturalHeight: height } = img;
    if (isSvg) {
      // Scale vector images up to a useful size, keeping their shape.
      const ratio = width && height ? height / width : 3 / 4;
      width = SVG_EDGE;
      height = Math.round(SVG_EDGE * ratio);
    }
    if (!width || !height) throw new Error("empty image");
    return { image: img, width, height, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    const kind = file.name.split(".").pop()?.toUpperCase() || file.type || "this";
    throw new Error(`Can't read ${kind} photos here. Use a JPG or PNG instead.`);
  }
}

async function toBlob(source: Source, maxEdge: number, quality: number) {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  // JPEG has no transparency: without this, see-through PNG/SVG areas turn black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source.image, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Could not encode photo");
  return { blob, width, height };
}

export async function resizePhoto(file: File): Promise<ResizedPhoto> {
  const source = await decode(file);
  try {
    const full = await toBlob(source, FULL_EDGE, 0.82);
    const thumb = await toBlob(source, THUMB_EDGE, 0.78);
    return { full: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
  } finally {
    source.close();
  }
}
