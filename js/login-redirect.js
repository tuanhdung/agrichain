/* ==========================================================================
   AgriChain — Quyết định hành vi của dang-nhap.html LÚC TẢI TRANG
   (2026-09-30, vá kẽ hở còn sót của bản vá "vòng lặp đăng nhập 1 lần"
   2026-09-30 trước đó — xem CLAUDE.md gốc mục "⚠️ Bug đã vá — nhảy tab liên
   tục giữa site tĩnh và SPA lúc đăng nhập 1 lần").

   Site tĩnh (dang-nhap.html) và SPA (app/) xác thực bằng 2 CƠ CHẾ KHÁC NHAU:
   site tĩnh dựa vào access token trong Web Storage của CHÍNH NÓ (api.isLoggedIn()/
   api.auth.me()), SPA dựa vào cookie httpOnly dùng chung qua GET /auth/me
   (ProtectedRoute.tsx). Bản vá trước (gọi api.auth.me() để xác minh token
   trước khi tự động điều hướng sang SPA) xử lý đúng ca "token hết hạn/thu
   hồi", nhưng vẫn có thể loop nếu 2 cơ chế bất đồng vì lý do KHÁC (VD cookie
   Domain không khớp domain thật của SPA, hoặc bị trình duyệt chặn cookie
   cross-subdomain) — lúc đó api.auth.me() ở site tĩnh vẫn thành công (token
   của CHÍNH NÓ vẫn hợp lệ) trong khi SPA vẫn thấy 401 (cookie không tới),
   nên vẫn đá người dùng về đây, và site tĩnh vẫn tin me() rồi bấm ngược lại
   — loop tiếp diễn.

   Chốt chặn cuối: SPA giờ gắn thêm `reason=unauth` vào URL mỗi khi TỰ NÓ xác
   nhận phiên không hợp lệ rồi mới đá về đây (xem app/src/api/session.ts::
   redirectToLogin()). Thấy cờ này, trang ở đây KHÔNG được phép tự động tin
   tưởng bất kỳ điều gì về phiên của CHÍNH NÓ nữa (dù api.auth.me() có thành
   công) — phải xoá token cục bộ và bắt đăng nhập lại THẬT, đảm bảo lần đăng
   nhập kế tiếp tạo ra 1 phiên nhất quán ở CẢ 2 origin.

   File này CỐ TÌNH tách khỏi js/auth.js và viết dạng ES module thuần
   (`export function`, không đụng `document`, nhận toàn bộ phụ thuộc — gọi
   API xác minh, xoá phiên, đăng xuất, điều hướng — qua tham số `deps`) để
   unit-test được thẳng bằng vitest của app/ (xem
   app/src/test/loginRedirect.test.ts), cùng đúng tinh thần js/next-target.js.
   Nạp qua <script type="module"> TRƯỚC js/auth.js (chỉ ở dang-nhap.html —
   hàm này chỉ được setupLogin() gọi, dang-ky.html không có #login-form nên
   không bao giờ chạy tới), tự gắn kết quả vào
   `window.AgriChain.runLoginPageEntry` để auth.js (IIFE cổ điển) gọi được.
   ========================================================================== */

/**
 * @param {Object} params
 * @param {string|null} params.reason    - query string `reason` (VD 'unauth')
 * @param {string|null} params.loggedOut - query string `loggedOut` (VD '1')
 * @param {boolean} params.isLoggedIn    - api.isLoggedIn() (có access token
 *                                         trong storage của CHÍNH site tĩnh)
 * @param {Object} deps
 * @param {() => Promise<{account_type: string}>} deps.verifySession - xác
 *        minh phiên còn dùng được (api.auth.me()) — CHỈ gọi khi thật sự cần.
 * @param {() => void} deps.clearSession - xoá token cục bộ, KHÔNG gọi mạng
 *        (api.clearSession()) — dùng cho ca `reason=unauth`.
 * @param {() => Promise<void>} deps.logout - đăng xuất đầy đủ (api.auth.logout(),
 *        có revoke phía server) — dùng cho ca `loggedOut=1`.
 * @param {(accountType: string|null) => void} deps.navigate - điều hướng đi
 *        tiếp (js/auth.js tự quyết định URL cụ thể qua redirectTarget(), hàm
 *        này KHÔNG biết gì về URL).
 * @returns {Promise<'redirected'|'show-form'|'logged-out'>} — không bao giờ
 *        reject (mọi lỗi xác minh phiên đều rơi về 'show-form').
 */
export function runLoginPageEntry(params, deps) {
  var reason = params.reason;
  var loggedOut = params.loggedOut;
  var isLoggedIn = params.isLoggedIn;

  if (loggedOut === '1') {
    var afterLogout = isLoggedIn ? deps.logout() : Promise.resolve();
    return Promise.resolve(afterLogout).then(function () {
      return 'logged-out';
    });
  }

  if (reason === 'unauth') {
    // KHÔNG gọi verifySession() — dù thành công cũng không được tin, xem
    // giải thích đầu file. Xoá token cục bộ rồi để form đăng nhập hiện ra.
    deps.clearSession();
    return Promise.resolve('show-form');
  }

  if (!isLoggedIn) {
    return Promise.resolve('show-form');
  }

  return deps.verifySession().then(function (user) {
    deps.navigate(user.account_type);
    return 'redirected';
  }).catch(function () {
    // 401 thật -> request()/refreshTokenOnce() (js/api.js) đã tự xoá phiên +
    // điều hướng rồi (xem js/auth.js). Lỗi mạng -> cố tình không đụng gì tới
    // token, chỉ để form đăng nhập hiện ra bình thường.
    return 'show-form';
  });
}

if (typeof window !== 'undefined') {
  window.AgriChain = window.AgriChain || {};
  window.AgriChain.runLoginPageEntry = runLoginPageEntry;
}
