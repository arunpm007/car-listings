// Runs in the browser. Stamps a document photo before it's sent to a buyer, so a copy that
// leaks can't be reused as a clean RC for anything else.

export async function watermarkImage(url: string, text: string): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(img, 0, 0);

  // Repeated diagonal text across the whole page, hard to crop out.
  const size = Math.max(18, Math.round(canvas.width / 28));
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(200, 30, 30, 0.28)";
  ctx.textAlign = "center";
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 7);
  const diagonal = Math.hypot(canvas.width, canvas.height);
  for (let y = -diagonal; y < diagonal; y += size * 4) {
    for (let x = -diagonal; x < diagonal; x += ctx.measureText(text).width + size * 3) {
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();

  // A clear strip along the bottom too.
  const strip = Math.round(size * 1.8);
  ctx.fillStyle = "rgba(200, 30, 30, 0.85)";
  ctx.fillRect(0, canvas.height - strip, canvas.width, strip);
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${Math.round(size * 0.8)}px system-ui, sans-serif`;
  ctx.fillText(text, canvas.width / 2, canvas.height - strip / 2 + size * 0.28);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("Could not make the copy");
  return blob;
}
