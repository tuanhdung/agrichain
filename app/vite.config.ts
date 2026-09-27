import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Gốc repo tĩnh (chứa css/, icons/, data/, các trang .html cũ) — một cấp
// trên app/. Cần khai báo tường minh trong server.fs.allow vì Vite mặc định
// chỉ cho đọc file bên trong project root (app/); src/main.tsx import CSS
// qua '../../css/...' và src/icons.tsx import sprite/logo qua '?url' đều đọc
// file NGOÀI app/, xem app/CLAUDE.md mục "Vì sao KHÔNG copy css/icons vào app/".
const staticSiteRoot = path.resolve(__dirname, '..');

// ⚠️ KHÔNG còn plugin "serve-legacy-static-site" (sirv fallback phục vụ site
// tĩnh cũ qua CHUNG origin với Vite) như bản trước — kiến trúc đã CHỐT là
// SUBDOMAIN riêng (app.agrichain.org.vn khác agrichain.org.vn), 2 origin
// THẬT SỰ khác nhau ở production, nên dev cũng nên phản ánh đúng sự khác
// origin đó (Vite ở :5173, site tĩnh ở Live Server :5500 — xem app/.env)
// thay vì "gộp tạm" 1 origin lúc dev rồi lộ ra khác biệt khi lên production.
// Xem app/CLAUDE.md mục "Giả định host" + "Chạy thử".
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Không set thì Vite chỉ bind theo cách Node phân giải "localhost" lúc
    // khởi động — trên nhiều máy Windows ra `::1` (IPv6) thay vì `127.0.0.1`
    // (IPv4). Domain giả app.agrichain.local khai báo trong hosts file trỏ
    // THẲNG `127.0.0.1` (địa chỉ IPv4 tường minh, không phải tên "localhost"
    // để hệ điều hành tự chọn) — nếu Vite chỉ lắng nghe `::1`, request tới
    // `127.0.0.1:5173` không có gì nhận, trình duyệt báo ERR_CONNECTION_REFUSED
    // dù hosts file/allowedHosts bên dưới đã đúng (đây là lỗi Ở TẦNG TCP, xảy
    // ra TRƯỚC khi Vite kịp kiểm allowedHosts, khác hẳn lỗi "Blocked request"
    // của allowedHosts). `host: true` ép Vite lắng nghe TRÊN MỌI địa chỉ
    // (0.0.0.0 lẫn ::), khớp được cả 2 domain cùng lúc.
    host: true,
    // Vite 6 mặc định CHẶN request có Host header lạ (chống DNS rebinding) —
    // chỉ tự cho qua 'localhost'/'127.0.0.1'/'[::1]'. Domain giả
    // app.agrichain.local (hosts file trỏ 127.0.0.1, dùng để cookie httpOnly
    // chia sẻ phiên đăng nhập với backend hoạt động — xem CLAUDE.md gốc mục
    // "Kết nối backend") phải khai báo tường minh ở đây, nếu không trình
    // duyệt sẽ nhận lỗi "Blocked request. This host is not allowed" dù
    // domain đã trỏ đúng IP.
    allowedHosts: ['app.agrichain.local'],
    fs: {
      allow: [__dirname, staticSiteRoot]
    }
  }
});
