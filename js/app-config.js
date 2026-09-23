/* ==========================================================================
   AgriChain — Cấu hình liên kết sang app/ (SPA React + Vite)
   Chỉ khai báo AgriChain.APP_SPA_URL + tự gắn href cho các link sidebar trỏ
   sang app/ (đánh dấu bằng data-app-link="<route>") — xem app/CLAUDE.md mục
   "Giả định host": kiến trúc đã CHỐT là SUBDOMAIN riêng
   (app.agrichain.org.vn khác hẳn agrichain.org.vn), không phải subpath như
   dự tính ban đầu.

   Site tĩnh này KHÔNG có build step (xem CLAUDE.md gốc — HTML/CSS/JS thuần,
   không Webpack/Vite build) nên KHÔNG "build ra 2 bản" theo môi trường như
   app/ (app/.env vs app/.env.production) được — tự nhận diện dev/prod ngay
   lúc trang tải bằng location.hostname: mở qua Live Server (127.0.0.1 hoặc
   localhost, xem CLAUDE.md gốc mục "Kiểm thử giao diện") thì trỏ sang SPA
   dev (localhost:5173, cổng mặc định `npm run dev` trong app/); mở ở domain
   thật thì trỏ sang subdomain production.

   Nạp SAU js/api-config.js, TRƯỚC js/app-shell.js — CHỈ ở 16 trang app-shell
   có sidebar (nong-trai, vat-tu, nong-trai-chi-tiet, mau-quy-trinh, lo-hang,
   tai-khoan, ho-so, goi-phan-mem, lich-su-mua-goi, 7 trang thuong-mai-*, xem
   CLAUDE.md gốc mục "AgriChain.api.requireBusiness()") — không nạp ở trang
   công khai vì chưa trang nào khác cần link sang app/.
   ========================================================================== */

(function (global) {
  'use strict';

  var isLocalDev = global.location.hostname === 'localhost' || global.location.hostname === '127.0.0.1';

  global.AgriChain = global.AgriChain || {};
  global.AgriChain.APP_SPA_URL = isLocalDev
    ? 'http://localhost:5173'
    : 'https://app.agrichain.org.vn';

  // Gắn href cho MỌI link đánh dấu data-app-link="<route>" (hiện chỉ có
  // 1 mục sidebar "Vật tư", data-app-link="vat-tu") — thêm route mới thì chỉ
  // cần thêm data-app-link tương ứng trong HTML, không phải sửa file này.
  // href="#" tĩnh trong HTML chỉ là fallback phòng script này chưa kịp chạy
  // hoặc lỗi — không nên bấm được vào lúc đó, nhưng vẫn có chỗ bấm thay vì
  // trắng hẳn.
  function wireAppLinks() {
    var links = document.querySelectorAll('[data-app-link]');
    for (var i = 0; i < links.length; i++) {
      var route = links[i].getAttribute('data-app-link');
      links[i].href = global.AgriChain.APP_SPA_URL + '/' + route;
    }
  }

  document.addEventListener('DOMContentLoaded', wireAppLinks);
})(window);
