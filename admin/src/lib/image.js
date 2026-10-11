import { supabase } from "./supabase";
import { SUPABASE_URL } from "./env";

const MAX_INPUT = 15 * 1024 * 1024;
const MAX_OUTPUT = 2 * 1024 * 1024;
const MAX_EDGE = 1000;
const ALLOWED = ["image/webp", "image/jpeg", "image/png"];
const BUCKET = "menu-images";

export function imageUrl(path) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function toWebp(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  for (const q of [0.85, 0.7, 0.5]) {
    const blob = await new Promise((res) => canvas.toBlob(res, "image/webp", q));
    if (blob && blob.size <= MAX_OUTPUT) return blob;
  }
  throw new Error("That image is too large even after shrinking. Try a smaller one.");
}

export async function uploadMenuImage(file, folder) {
  if (!ALLOWED.includes(file.type)) throw new Error("Use a JPEG, PNG or WebP image.");
  if (file.size > MAX_INPUT) throw new Error("That image is over 15 MB.");
  const blob = await toWebp(file);
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw error;
  return path;
}

export async function deleteMenuImage(path) {
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
