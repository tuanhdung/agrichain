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
    fs: {
      allow: [__dirname, staticSiteRoot]
    }
  }
});
