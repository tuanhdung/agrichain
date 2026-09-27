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
   lúc trang tải bằng location.hostname:
   - mở qua domain giả 'agrichain.local' (hosts file, xem CLAUDE.md mục "Kết
     nối backend" — cần để cookie httpOnly chia sẻ phiên đăng nhập với SPA)
     thì trỏ sang SPA dev CŨNG qua domain giả cùng họ (app.agrichain.local:5173).
   - mở qua Live Server 'localhost'/'127.0.0.1' (chưa cấu hình hosts file, xem
     CLAUDE.md gốc mục "Kiểm thử giao diện") thì trỏ sang SPA dev kiểu cũ
     (localhost:5173) — cookie vẫn hoạt động, chỉ không chia sẻ được phiên
     cross-subdomain.
   - mở ở domain khác (production thật) thì trỏ sang subdomain production.

   Nạp SAU js/api-config.js. Ban đầu CHỈ ở 16 trang app-shell có sidebar (xem
   CLAUDE.md gốc mục "AgriChain.api.requireBusiness()") — từ khi 9/16 trang
   nhóm "Hoạt động sản xuất" (nong-trai, nong-trai-chi-tiet, vat-tu,
   mau-quy-trinh, lo-hang, tai-khoan, ho-so, goi-phan-mem, lich-su-mua-goi) bị
   XOÁ HẲN khỏi site tĩnh (đã migrate xong sang SPA), MỞ RỘNG thêm ra các
   trang có redirect/link cứng từng trỏ tới 9 file đó: dang-nhap.html,
   dang-ky.html (js/auth.js's defaultTargetFor()), index.html/blog.html/
   blog-chi-tiet.html/styleguide.html/truy-xuat.html (js/header.js's nút "Vào
   Trang Quản Lý"), và agriverse-3d.html (mục "Khu Quản Lý"). Vẫn TRƯỚC
   js/app-shell.js ở 7 trang thuong-mai-* còn lại (16 trang app-shell cũ giờ
   chỉ còn 7 trang này).
   ========================================================================== */

(function (global) {
  'use strict';

  var hostname = global.location.hostname;

  global.AgriChain = global.AgriChain || {};

  if (hostname === 'agrichain.local') {
    global.AgriChain.APP_SPA_URL = 'http://app.agrichain.local:5173';
  } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    global.AgriChain.APP_SPA_URL = 'http://localhost:5173';
  } else {
    global.AgriChain.APP_SPA_URL = 'https://app.agrichain.org.vn';
  }

  // Gắn href cho MỌI link đánh dấu data-app-link="<route>" (sidebar 7 trang
  // thuong-mai-*, logo topbar của chúng, mục "Khu Quản Lý" ở agriverse-3d.html...)
  // — thêm route mới thì chỉ cần thêm data-app-link tương ứng trong HTML,
  // không phải sửa file này.
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
