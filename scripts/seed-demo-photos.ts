// Gives the demo cars real photos from Wikimedia Commons, with credits.
//   pnpm seed:photos
// Reads scripts/demo-photos.json, replaces the photos of every car it lists, and can be re-run.
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

type Entry = {
  car: string; // car code, e.g. CAR-0002
  file: string; // Commons title, e.g. "File:Something.jpg"
  license: string;
  author: string;
  color?: string; // set the car's colour to match the photo
};

const BUCKET = "car-photos";
const UA = "car-listings-demo-seed/0.1 (local development)";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(url, secret, { auth: { persistSession: false } });

const manifest: Entry[] = JSON.parse(readFileSync(new URL("./demo-photos.json", import.meta.url), "utf8"));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Commons rate-limits bursts; back off and retry instead of failing. */
async function fetchWithRetry(url: URL | string, tries = 6): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res;
    if (attempt >= tries || (res.status !== 429 && res.status < 500)) throw new Error(`HTTP ${res.status} for ${url}`);
    await sleep(1500 * attempt);
  }
}

async function thumb(file: string, width: number) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.search = new URLSearchParams({
    action: "query",
    prop: "imageinfo",
    iiprop: "url|size|mime",
    iiurlwidth: String(width),
    titles: file,
    format: "json",
    formatversion: "2",
  }).toString();
  const info = (await (await fetchWithRetry(api)).json()).query?.pages?.[0]?.imageinfo?.[0];
  if (!info) throw new Error(`Not found on Commons: ${file}`);
  if (info.mime !== "image/jpeg") throw new Error(`${file} is ${info.mime}, only JPEG is allowed`);
  const src: string = info.thumburl ?? info.url;
  const img = await fetchWithRetry(src);
  return {
    bytes: new Uint8Array(await img.arrayBuffer()),
    width: (info.thumbwidth ?? info.width) as number,
    height: (info.thumbheight ?? info.height) as number,
  };
}

const byCar = new Map<string, Entry[]>();
for (const entry of manifest) byCar.set(entry.car, [...(byCar.get(entry.car) ?? []), entry]);

for (const [code, entries] of byCar) {
  const { data: car } = await supabase.from("cars").select("id").eq("code", code).maybeSingle();
  if (!car) {
    console.warn(`skip ${code}: no such car`);
    continue;
  }

  // Download everything first, so a failed run leaves the car's current photos alone.
  const downloads = [];
  for (const entry of entries) {
    try {
      const full = await thumb(entry.file, 1600);
      const small = await thumb(entry.file, 560);
      downloads.push({ entry, full, small });
    } catch (e) {
      console.warn(`  ${code}: ${entry.file} failed — ${e instanceof Error ? e.message : e}`);
    }
    await sleep(400);
  }
  if (!downloads.length) {
    console.warn(`${code}: nothing downloaded, photos left as they were`);
    continue;
  }

  const { data: old } = await supabase.from("car_photos").select("full_path, thumb_path").eq("car_id", car.id);
  const oldPaths = (old ?? []).flatMap((p) => [p.full_path, p.thumb_path]);
  await supabase.from("car_photos").delete().eq("car_id", car.id);
  if (oldPaths.length) await supabase.storage.from(BUCKET).remove(oldPaths);

  let position = 0;
  for (const { entry, full, small } of downloads) {
    const base = `demo/${code}/${position}`;
    const opts = { contentType: "image/jpeg", cacheControl: "31536000", upsert: true };
    const up = await Promise.all([
      supabase.storage.from(BUCKET).upload(`${base}-full.jpg`, full.bytes, opts),
      supabase.storage.from(BUCKET).upload(`${base}-thumb.jpg`, small.bytes, opts),
    ]);
    const failed = up.find((u) => u.error);
    if (failed) {
      console.warn(`  ${code}: upload failed — ${failed.error?.message}`);
      continue;
    }
    const credit = `${entry.author}, ${entry.license}, via Wikimedia Commons (${entry.file.replace(/^File:/, "")})`;
    const { error } = await supabase.from("car_photos").insert({
      car_id: car.id,
      full_path: `${base}-full.jpg`,
      thumb_path: `${base}-thumb.jpg`,
      width: full.width,
      height: full.height,
      position,
      credit,
    });
    if (error) console.warn(`  ${code}: ${error.message}`);
    else position++;
  }

  const color = entries.find((e) => e.color)?.color;
  if (color) await supabase.from("cars").update({ color }).eq("id", car.id);
  console.log(`${code}: ${position} photo${position === 1 ? "" : "s"}`);
}
