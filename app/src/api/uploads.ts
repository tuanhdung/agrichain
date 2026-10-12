// Tải ảnh lên — `POST /system/uploads/images` (chỉ platform_admin). Thân request là bytes ảnh;
// backend xác định loại bằng chữ ký đầu tệp (chỉ JPEG/PNG/WebP, tối đa 5MB) và trả URL công khai
// để gắn vào `image_url` / `thumbnail_url` / `banner_url` / `cover_url`.
import { request } from './http';

export interface UploadResult {
  url: string;
  size: number;
}

export const systemUploads = {
  image: (blob: Blob) => request<UploadResult>('POST', '/system/uploads/images', { rawBody: blob })
};
