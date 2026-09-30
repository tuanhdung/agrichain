// Test cho js/next-target.js — hàm validate `?next=` ở dang-nhap.html/
// dang-ky.html của SITE TĨNH (KHÔNG phải SPA). File đó nằm NGOÀI app/ (repo
// gốc agrichain/js/), viết dạng ES module thuần đúng để import trực tiếp
// được ở đây bằng vitest, không cần dựng thêm hạ tầng test riêng cho site
// tĩnh (site đó không có build step — xem app/CLAUDE.md mục "Giả định
// host" + comment đầu js/next-target.js).
import { describe, expect, it } from 'vitest';
import { resolveNextTarget } from '../../../js/next-target.js';

const ALLOWED_ORIGIN = 'http://app.agrichain.local:5173';

describe('resolveNextTarget', () => {
  it('next hợp lệ, cùng origin whitelist -> trả về URL đầy đủ', () => {
    const result = resolveNextTarget('http://app.agrichain.local:5173/nong-trai?tab=info', ALLOWED_ORIGIN);
    expect(result).toBe('http://app.agrichain.local:5173/nong-trai?tab=info');
  });

  it('thiếu next -> null', () => {
    expect(resolveNextTarget('', ALLOWED_ORIGIN)).toBeNull();
    expect(resolveNextTarget(null, ALLOWED_ORIGIN)).toBeNull();
  });

  it('protocol-relative "//evil.com" -> null (không có base để suy ra scheme)', () => {
    expect(resolveNextTarget('//evil.com/phishing', ALLOWED_ORIGIN)).toBeNull();
  });

  it('scheme "javascript:" -> null', () => {
    expect(resolveNextTarget('javascript:alert(1)', ALLOWED_ORIGIN)).toBeNull();
  });

  it('scheme "data:" -> null', () => {
    expect(resolveNextTarget('data:text/html,<script>alert(1)</script>', ALLOWED_ORIGIN)).toBeNull();
  });

  it('đúng origin nhưng khác scheme (https thay vì http) -> null', () => {
    expect(resolveNextTarget('https://app.agrichain.local:5173/nong-trai', ALLOWED_ORIGIN)).toBeNull();
  });

  it('origin lạ (domain khác hẳn) -> null', () => {
    expect(resolveNextTarget('http://evil.com/nong-trai', ALLOWED_ORIGIN)).toBeNull();
  });

  it('origin gần giống nhưng KHÔNG khớp (subdomain giả mạo kiểu app.agrichain.local.evil.com) -> null', () => {
    expect(resolveNextTarget('http://app.agrichain.local.evil.com/nong-trai', ALLOWED_ORIGIN)).toBeNull();
  });

  it('đúng domain nhưng khác port -> null', () => {
    expect(resolveNextTarget('http://app.agrichain.local:9999/nong-trai', ALLOWED_ORIGIN)).toBeNull();
  });
});
