const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_RAW_BYTES = 10 * 1024 * 1024;

export async function validateAndPrepareImage(file: File): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Please upload a JPEG, PNG, or WebP photograph.');
  }
  if (file.size > MAX_RAW_BYTES) {
    throw new Error('Selected file exceeds 10 MB. Please choose a smaller photograph.');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.readAsDataURL(file);
  });

  // Resize if oversized so uploads stay crisp, fast, and well below 5 MB
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Image failed to decode. Please select another file.'));
    el.src = rawDataUrl;
  });

  const maxDim = 1280;
  let targetW = img.width;
  let targetH = img.height;
  if (targetW > maxDim || targetH > maxDim) {
    const ratio = Math.min(maxDim / targetW, maxDim / targetH);
    targetW = Math.round(targetW * ratio);
    targetH = Math.round(targetH * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas image processor unavailable in this browser.');
  }
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const compressedUrl = canvas.toDataURL(outputMime, 0.85);
  const approxBytes = Math.round((compressedUrl.length * 3) / 4);

  if (approxBytes > 5 * 1024 * 1024) {
    const jpegUrl = canvas.toDataURL('image/jpeg', 0.72);
    return {
      dataUrl: jpegUrl,
      width: targetW,
      height: targetH,
      sizeBytes: Math.round((jpegUrl.length * 3) / 4),
    };
  }

  return {
    dataUrl: compressedUrl,
    width: targetW,
    height: targetH,
    sizeBytes: approxBytes,
  };
}

export async function urlToDataUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error('Unable to load image for analysis.');
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed converting sample image.'));
    reader.readAsDataURL(blob);
  });
}
