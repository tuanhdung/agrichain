/* ==========================================================================
   AgriChain — Danh mục dùng chung (enum) cho "Hoạt động sản xuất"
   Nguồn DUY NHẤT cho các danh mục {key, label, icon, color} dùng ở nhiều
   trang — trước đây js/mau-quy-trinh.js và js/nong-trai-chi-tiet.js mỗi
   file tự khai báo lại ACTIVITY_TYPES riêng, cùng 9 khoá nhưng NHÃN/ICON
   lệch nhau ở 3 khoá (planting/harvesting/inspection/other), dễ gây hiểu
   lầm "loại hoạt động" là 2 khái niệm khác nhau tuỳ trang. Gộp về đây theo
   yêu cầu "không được có hai bản nhãn cho cùng một enum trong dự án" — xem
   bảng đối chiếu bản cũ trong SCHEMA-EXPORT.md.

   Nạp SAU js/store.js, TRƯỚC js/mau-quy-trinh.js và js/nong-trai-chi-tiet.js
   (2 file này đọc global.AgriChain.ACTIVITY_TYPES ngay ở cấp module, không
   đợi DOMContentLoaded — enums.js phải chạy trước đó).
   ========================================================================== */

(function (global) {
  'use strict';

  // color: 1 trong 5 màu ngữ nghĩa sẵn có (success/info/warning/danger/
  // neutral) — dùng cho viền trái/icon dòng nhật ký (.log-item--*) và hàng
  // hoạt động trong checklist quy trình mùa vụ (.workflow-checklist__activity--*).
  // js/mau-quy-trinh.js hiện không dùng tới `color` (thẻ bước mẫu chỉ hiện
  // icon, không tô màu theo loại hoạt động) — vẫn khai báo đủ ở đây để 1
  // nguồn duy nhất mô tả trọn vẹn "loại hoạt động", không phải vì cả 2 nơi
  // dùng đều nó.
  var ACTIVITY_TYPES = [
    { key: 'planting',     label: 'Gieo trồng / Gieo hạt', icon: 'icon-seed',     color: 'success' },
    { key: 'fertilizing',  label: 'Bón phân',              icon: 'icon-flask',    color: 'info' },
    { key: 'watering',     label: 'Tưới nước',             icon: 'icon-droplet',  color: 'info' },
    { key: 'pest_control', label: 'Phòng trừ sâu bệnh',    icon: 'icon-bug',      color: 'danger' },
    { key: 'weeding',      label: 'Làm cỏ',                icon: 'icon-grass',    color: 'warning' },
    { key: 'pruning',      label: 'Cắt tỉa',               icon: 'icon-scissors', color: 'warning' },
    { key: 'harvesting',   label: 'Thu hoạch',             icon: 'icon-wheat',    color: 'success' },
    { key: 'inspection',   label: 'Kiểm tra / Giám sát',   icon: 'icon-eye',      color: 'neutral' },
    { key: 'other',        label: 'Hoạt động khác',        icon: 'icon-box',      color: 'neutral' }
  ];

  global.AgriChain = global.AgriChain || {};
  global.AgriChain.ACTIVITY_TYPES = ACTIVITY_TYPES;
})(window);
