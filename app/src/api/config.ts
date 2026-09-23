// Tương đương js/api-config.js ở các trang tĩnh — tách riêng khỏi http.ts để
// đổi domain backend khi deploy chỉ cần sửa ĐÚNG 1 chỗ. Khác bản .js (hard-code
// 1 dòng), bản React đọc qua biến môi trường Vite (VITE_API_BASE_URL, đặt
// trong app/.env.local — xem app/.env.example) để dev có thể trỏ về backend
// local (http://127.0.0.1:8000) mà không phải sửa code; build production nếu
// không set biến này thì rơi về ĐÚNG domain đang dùng ở js/api-config.js hiện
// tại, không tự bịa domain khác.
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'https://agrichain-api-4mhf.onrender.com';

// Domain của site TĨNH cũ (index.html, dang-nhap.html, agriverse-3d.html, và
// 15 trang app-shell chưa migrate) — kiến trúc đã CHỐT là SUBDOMAIN riêng
// (app/ và site tĩnh ở 2 origin khác nhau, KHÔNG cùng path), xem app/CLAUDE.md
// mục "Giả định host". Đọc qua VITE_MAIN_SITE_URL — Vite tự nạp đúng giá trị
// theo mode: `npm run dev` đọc app/.env (Live Server, http://127.0.0.1:5500),
// `npm run build` đọc THÊM app/.env.production (ghi đè app/.env) ra domain
// thật https://agrichain.org.vn.
//
// ⚠️ CỐ TÌNH KHÔNG có fallback ngầm về domain production như API_BASE_URL ở
// trên — bug THẬT đã gặp (2026-09-22): app/.env thiếu dòng này thì
// mainSiteUrl() âm thầm rơi về https://agrichain.org.vn ngay cả lúc
// `npm run dev`, khiến mọi link ra ngoài SPA (Sidebar, avatar menu, đăng
// xuất...) trỏ nhầm sang domain production CHƯA TỒN TẠI — chỉ lộ ra sau khi
// người dùng bấm thử 1 link và thấy domain lạ, không có dấu hiệu gì lúc
// code chạy. Throw ngay tại đây (module top-level, chạy sớm nhất có thể vì
// hầu hết mọi thứ trong app/ đều import trực tiếp/gián tiếp từ config.ts)
// để lỗi cấu hình lộ ra NGAY lúc khởi động (màn hình lỗi đỏ của Vite), thay
// vì âm thầm điều hướng sai.
const rawMainSiteUrl = import.meta.env.VITE_MAIN_SITE_URL as string | undefined;
if (!rawMainSiteUrl) {
  throw new Error(
    'Thiếu VITE_MAIN_SITE_URL — kiểm tra app/.env (dev) hoặc app/.env.production (build). ' +
      'Xem app/.env.example để biết giá trị mẫu, và app/CLAUDE.md mục "Giả định host" để ' +
      'biết vì sao biến này bắt buộc phải có.'
  );
}
const MAIN_SITE_URL: string = rawMainSiteUrl;

// Dựng URL đầy đủ sang 1 trang/tài nguyên của site tĩnh — tự xử lý dấu "/"
// thừa/thiếu giữa MAIN_SITE_URL và path truyền vào, để chỗ gọi không phải tự
// nhớ quy ước đó. VD mainSiteUrl('dang-nhap.html') -> 'https://agrichain.org.vn/dang-nhap.html'.
export function mainSiteUrl(path: string): string {
  return `${MAIN_SITE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
