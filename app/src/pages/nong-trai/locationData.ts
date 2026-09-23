// Port loadProvinces()/loadWards() của js/nong-trai.js gốc — 34 tỉnh, 3321
// xã/phường. ĐÃ ĐỔI NGUỒN (2026-09-23): trước đây fetch() 2 file tĩnh
// data/provinces.json + data/wards/{provinceCode}.json ở origin site chính
// qua mainSiteUrl() — gặp lỗi CORS thật (Live Server không tự gửi
// Access-Control-Allow-Origin cho origin của Vite dev server), giờ đổi sang
// gọi 2 route static MỚI của chính backend (`agrichain-api`):
// `${API_BASE_URL}/static/locations/provinces.json` và
// `${API_BASE_URL}/static/locations/wards/{code}.json` — dùng `API_BASE_URL`
// (không phải `mainSiteUrl()`, vì dữ liệu này giờ đến từ BACKEND, không phải
// "site chính") — tận dụng `CORS_ORIGINS` đã cấu hình sẵn cho API, đúng cho
// CẢ dev lẫn prod mà không cần sửa gì thêm ở phía SPA khi đổi môi trường. Xem
// app/CLAUDE.md mục "Trang /nong-trai" để biết đầy đủ lý do đổi hướng + tình
// trạng "2 nguồn dữ liệu song song" tạm thời với site tĩnh cũ.
import { API_BASE_URL } from '../../api/config';

export interface Province {
  id: string;
  name: string;
}

export interface Ward {
  id: string;
  name: string;
  provinceId: string;
}

export function loadProvinces(): Promise<Province[]> {
  return fetch(`${API_BASE_URL}/static/locations/provinces.json`).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<Province[]>;
  });
}

// wardCache: provinceCode -> Promise<Ward[]> — khỏi tải lại khi quay lại
// cùng tỉnh (khớp bản gốc). Ở module scope (không phải state trong
// component) vì đúng tinh thần cache DÙNG CHUNG xuyên suốt phiên làm việc
// trên trang, không cần reset theo vòng đời 1 component cụ thể.
const wardCache = new Map<string, Promise<Ward[]>>();

export function loadWards(provinceCode: string): Promise<Ward[]> {
  let cached = wardCache.get(provinceCode);
  if (!cached) {
    cached = fetch(`${API_BASE_URL}/static/locations/wards/${provinceCode}.json`).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<Ward[]>;
    });
    wardCache.set(provinceCode, cached);
  }
  return cached;
}
