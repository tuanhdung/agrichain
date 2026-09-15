/* ==========================================================================
   AgriChain — Cấu hình kết nối backend
   Tách riêng khỏi js/api.js để khi deploy chỉ cần sửa ĐÚNG MỘT DÒNG dưới đây
   (đổi sang domain thật của backend), không phải sửa logic gọi API.
   Nạp TRƯỚC js/api.js, ở mọi trang (kể cả trang chưa dùng API) — xem mục
   "Kết nối backend" trong CLAUDE.md.
   ========================================================================== */

window.AgriChain = window.AgriChain || {};
window.AgriChain.API_BASE_URL = 'https://agrichain-api-4mhf.onrender.com';
