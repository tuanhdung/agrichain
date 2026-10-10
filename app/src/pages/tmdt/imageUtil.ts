// Chọn ảnh từ máy → thu nhỏ + nén JPEG thành data URL để gửi lên backend (cột TEXT, giới hạn 2MB/ảnh).
// Tệp gốc tới 10MB đều nhận được, kết quả chỉ còn ≲ maxBytes. Muốn giữ nguyên ảnh gốc thì dán URL.
import { api } from '../../api';

export const IMAGE_MAX_SOURCE_BYTES = 10 * 1024 * 1024;

/** Thu nhỏ về cạnh dài tối đa `maxDim` rồi nén JPEG, giảm chất lượng dần tới khi ≤ `maxBytes`. */
export function compressImage(file: File, maxDim: number, maxBytes = 400 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas'));
      ctx.fillStyle = '#fff'; // JPEG không có nền trong suốt
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let quality = 0.85;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      // data URL dài ≈ 4/3 số byte thật
      while (dataUrl.length * 0.75 > maxBytes && quality > 0.4) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? 'image/jpeg';
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type: mime });
}

/** Thu nhỏ + nén ảnh rồi TẢI LÊN máy chủ, trả URL công khai (lưu thẳng vào cột `*_url`). */
export async function uploadImage(file: File, maxDim: number, maxBytes = 400 * 1024): Promise<string> {
  const dataUrl = await compressImage(file, maxDim, maxBytes);
  const result = await api.system.uploads.image(dataUrlToBlob(dataUrl));
  return result.url;
}
