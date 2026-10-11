import QRCode from "qrcode";
import { PUBLIC_MENU_URL } from "./env";

export function tableUrl(token) {
  return `${PUBLIC_MENU_URL}/?t=${token}`;
}

export async function qrDataUrl(token, size = 400) {
  return QRCode.toDataURL(tableUrl(token), {
    errorCorrectionLevel: "M",
    margin: 4,
    width: size,
    color: { dark: "#1B1A2E", light: "#FFFFFF" },
  });
}

export async function qrSvgString(token) {
  return QRCode.toString(tableUrl(token), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 4,
    color: { dark: "#1B1A2E", light: "#FFFFFF" },
  });
}

export async function tableCardPng(token, label, logoUrl) {
  const W = 1200, H = 1600;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFF8E7";
  ctx.fillRect(0, 0, W, H);

  await document.fonts.load('48px "Bagel Fat One"');
  await document.fonts.load('32px "Nunito"');

  if (logoUrl) {
    try {
      const img = await loadImage(logoUrl);
      const lw = 200, lh = (img.height / img.width) * lw;
      ctx.drawImage(img, (W - lw) / 2, 60, lw, lh);
    } catch {}
  }

  const displayLabel = /^\d+$/.test(label) ? `TABLE ${label}` : label.toUpperCase();
  ctx.fillStyle = "#1B1A2E";
  ctx.textAlign = "center";
  ctx.font = '72px "Bagel Fat One"';
  ctx.fillText(displayLabel, W / 2, 340);

  const qrImg = await loadImage(await qrDataUrl(token, 600));
  ctx.drawImage(qrImg, (W - 600) / 2, 400, 600, 600);

  ctx.fillStyle = "#1B1A2E";
  ctx.font = '600 36px "Nunito"';
  ctx.fillText("Scan to order · 주문하기", W / 2, 1120);

  ctx.font = '400 28px "Nunito"';
  ctx.fillStyle = "#666";
  ctx.fillText("맛있게 드세요!", W / 2, 1180);

  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/png"),
  );
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
