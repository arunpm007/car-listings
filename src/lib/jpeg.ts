/**
 * Returns the JPEG without its metadata blocks (EXIF with GPS location and camera details, XMP,
 * comments), or null if the bytes aren't a JPEG. The picture itself is not touched.
 *
 * Photos from the sell form are re-drawn in the seller's browser, which already drops this,
 * but a tampered upload could skip that step, so it is stripped again before a photo goes public.
 */
export function stripJpegMetadata(input: Uint8Array): Uint8Array | null {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) return null;
  const parts: Uint8Array[] = [input.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= input.length) {
    if (input[i] !== 0xff) return null;
    const marker = input[i + 1];
    // Start of scan: the image data runs from here to the end.
    if (marker === 0xda) {
      parts.push(input.subarray(i));
      return concat(parts);
    }
    const length = (input[i + 2] << 8) | input[i + 3];
    if (length < 2 || i + 2 + length > input.length) return null;
    // APP1–APP15 hold EXIF/XMP and the like; COM is a free-text comment. APP0 (JFIF) stays.
    const drop = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!drop) parts.push(input.subarray(i, i + 2 + length));
    i += 2 + length;
  }
  return null;
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}
