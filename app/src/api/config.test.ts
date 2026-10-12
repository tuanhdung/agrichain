// Test cho src/api/config.ts — bug thật đã gặp (2026-09-30, xem CLAUDE.md gốc
// mục "Whitelist origin trong js/next-target.js" + commit
// fix(spa): bỏ fallback API về Render cũ): API_BASE_URL từng có fallback
// NGẦM về domain Render cũ (https://agrichain-api-4mhf.onrender.com — backend
// KHÔNG còn dùng cho production từ khi chuyển sang VPS + Nginx) nếu thiếu
// VITE_API_BASE_URL — thiếu biến môi trường bị NUỐT ÂM THẦM, gọi nhầm sang
// backend đã ngừng dùng mà không có dấu hiệu gì lúc code chạy. Giờ throw
// ngay lúc import module, cùng mẫu MAIN_SITE_URL đã có sẵn.
//
// Module đọc `import.meta.env.VITE_API_BASE_URL` ở TOP-LEVEL (chạy đúng 1
// lần lúc import) nên phải `vi.stubEnv()` TRƯỚC khi import, và
// `vi.resetModules()` để ép module registry quên bản đã cache, nếu không
// lần import thứ 2 trở đi sẽ trả lại đúng module đã chạy từ lần đầu (không
// đọc lại env). Không đụng VITE_MAIN_SITE_URL — giữ nguyên giá trị có sẵn từ
// app/.env.test để tránh nhánh throw của MAIN_SITE_URL xen vào, cô lập đúng
// phạm vi test này.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('src/api/config.ts — API_BASE_URL', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('có VITE_API_BASE_URL -> API_BASE_URL dùng đúng giá trị đó', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.agrichain.org.vn');

    const { API_BASE_URL } = await import('./config');

    expect(API_BASE_URL).toBe('https://api.agrichain.org.vn');
  });

  it('thiếu VITE_API_BASE_URL -> throw ngay lúc import, KHÔNG rơi về domain Render cũ', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');

    await expect(import('./config')).rejects.toThrow(/VITE_API_BASE_URL/);
  });
});
