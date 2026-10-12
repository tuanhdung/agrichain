/* ==========================================================================
   AgriChain — Validate tham số `?next=` ở dang-nhap.html/dang-ky.html
   (2026-09-29, luồng "đăng nhập 1 lần" — xem CLAUDE.md gốc mục "Cookie
   httpOnly chứa access token" và app/CLAUDE.md mục "Giả định host").

   `next` mang URL TUYỆT ĐỐI của trang SPA (app.agrichain.*) mà người dùng
   đang đứng trước khi bị ProtectedRoute đá về đây (SPA không còn trang đăng
   nhập riêng) — KHÁC `?redirect=` cũ ở js/auth.js (chỉ nhận đường dẫn tương
   đối `ten-trang.html` trong CHÍNH site tĩnh này).

   Vì `next` đi thẳng từ query string (tham số người dùng/kẻ tấn công kiểm
   soát được qua URL họ tự gõ hoặc bị dụ bấm), PHẢI validate chặt trước khi
   `window.location.href = next` — đây là ĐIỂM DUY NHẤT trong toàn site tĩnh
   chấp nhận một URL TUYỆT ĐỐI từ query string làm đích điều hướng, nên lỗi ở
   đây là lỗi open-redirect thật, không phải lý thuyết.

   File này CỐ TÌNH tách khỏi js/auth.js và viết dạng ES module thuần
   (`export function`, không có `window`/`document` nào ở phần logic) — để
   unit-test được thẳng bằng vitest của app/ (xem
   app/src/test/nextTarget.test.ts) mà KHÔNG cần dựng thêm hạ tầng test
   riêng cho site tĩnh (site này không có build step, xem CLAUDE.md gốc).
   Nạp vào trang .html qua <script type="module"> (KHÔNG phải <script> cổ
   điển như auth.js) TRƯỚC js/auth.js, rồi tự gắn kết quả vào
   `window.AgriChain.resolveNextTarget` để auth.js (vẫn là IIFE cổ điển, đọc
   biến toàn cục `window.AgriChain`) gọi được — cùng quy ước
   `window.AgriChain.*` đã dùng xuyên suốt site tĩnh, chỉ khác cách file này
   tự nạp (module, không phải IIFE classic).
   ========================================================================== */

/**
 * Validate `next` là URL tuyệt đối, scheme http/https, VÀ origin khớp CHÍNH
 * XÁC `allowedOrigin` (VD `window.AgriChain.APP_SPA_URL`, xem
 * js/app-config.js — origin của SPA theo đúng môi trường dev/prod đang chạy).
 *
 * Trả về URL đầy đủ (string) nếu hợp lệ, `null` nếu không — KHÔNG throw, để
 * chỗ gọi chỉ cần `if (target) ...` mà không phải try/catch lại.
 *
 * Chặn được:
 * - Chuỗi rỗng/thiếu — `null`.
 * - URL scheme-relative (`//evil.com/...`) — `new URL()` không có `base` thì
 *   ném lỗi ngay khi thiếu scheme, rơi vào nhánh catch -> `null`.
 * - Scheme lạ (`javascript:...`, `data:...`) — parse được nhưng
 *   `url.protocol` khác `http:`/`https:` -> `null`.
 * - Origin khác `allowedOrigin` (kể cả cùng domain khác port, VD
 *   `http://app.agrichain.local:9999`) — `url.origin !== allowedOrigin` so
 *   sánh chuỗi, không dùng regex/startsWith (tránh bug kiểu
 *   `startsWith('http://app.agrichain.local')` vô tình khớp luôn
 *   `http://app.agrichain.local.evil.com`).
 */
export function resolveNextTarget(nextParam, allowedOrigin) {
  if (!nextParam || !allowedOrigin) return null;

  var url;
  try {
    url = new URL(nextParam);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.origin !== allowedOrigin) return null;

  return url.href;
}

if (typeof window !== 'undefined') {
  window.AgriChain = window.AgriChain || {};
  window.AgriChain.resolveNextTarget = resolveNextTarget;
}
