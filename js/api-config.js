/* ==========================================================================
   AgriChain — Cấu hình kết nối backend
   Tách riêng khỏi js/api.js để khi deploy chỉ cần sửa file này, không phải
   sửa logic gọi API. Nạp TRƯỚC js/api.js, ở mọi trang (kể cả trang chưa dùng
   API) — xem mục "Kết nối backend" trong CLAUDE.md.

   Tự nhận diện qua location.hostname (site tĩnh này không có build step nên
   không "build ra 2 bản" theo môi trường được, cùng cơ chế js/app-config.js):
   - hostname 'agrichain.local' (domain giả qua hosts file, xem CLAUDE.md mục
     "Kết nối backend") -> backend cũng phải qua domain giả cùng họ
     (api.agrichain.local) để cookie httpOnly Set-Cookie Domain=.agrichain.local
     được trình duyệt chấp nhận — KHÔNG chấp nhận được nếu backend vẫn ở
     127.0.0.1 (địa chỉ IP, không phải domain). Cần cấu hình hosts file trỏ cả
     3 domain (agrichain.local, app.agrichain.local, api.agrichain.local) về
     127.0.0.1 trước — xem hướng dẫn đầy đủ trong CLAUDE.md.
   - hostname 'localhost'/'127.0.0.1' (Live Server mặc định, CHƯA cấu hình
     hosts file) -> backend local qua IP như cũ — cookie vẫn hoạt động
     same-origin, chỉ không chia sẻ được sang SPA (app.*) qua cookie, phiên
     đăng nhập vẫn tách rời như trước khi có cookie httpOnly.
   - domain khác (production thật) -> backend production.
   ========================================================================== */

(function (global) {
  'use strict';

  var hostname = global.location.hostname;

  global.AgriChain = global.AgriChain || {};

  if (hostname === 'agrichain.local') {
    global.AgriChain.API_BASE_URL = 'http://api.agrichain.local:8000';
  } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    global.AgriChain.API_BASE_URL = 'http://127.0.0.1:8000';
  } else {
    global.AgriChain.API_BASE_URL = 'https://agrichain-api-4mhf.onrender.com';
  }
})(window);
