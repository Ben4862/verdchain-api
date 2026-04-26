import QRCode from "qrcode";

export async function generateVerifyQR(hexHash) {
  const baseUrl = process.env.VERIFY_PORTAL_URL || "https://verify.verdchain.com";
  const url     = `${baseUrl}/${hexHash}`;

  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: "H",
    type:   "image/png",
    margin: 2,
    width:  300,
  });

  return { url, qrDataUrl: dataUrl };
}
