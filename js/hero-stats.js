/* ==========================================================================
   AgriChain — Đếm số chạy lên cho khối thống kê ở Hero (index.html).

   Đánh dấu bằng data-count-to="<số đích>" (+ data-count-suffix tuỳ chọn, VD
   "+") ngay trên .hero__stat-value — nội dung chữ CÓ SẴN trong HTML vẫn là
   giá trị đúng cuối cùng (VD "1.247+"), để nếu JS lỗi/tắt thì trang vẫn hiện
   đúng số liệu tĩnh, không phụ thuộc hoàn toàn vào script này chạy được.
   Chạy ngay lúc tải trang (không cần IntersectionObserver) vì Hero luôn nằm
   ngay đầu trang, đã hiển thị sẵn trong khung nhìn đầu tiên.

   Tôn trọng prefers-reduced-motion: bỏ qua hẳn hoạt ảnh đếm, giữ nguyên số
   tĩnh đã có sẵn trong HTML — không đụng DOM nếu người dùng không muốn hiệu
   ứng chuyển động.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  var targets = document.querySelectorAll('.hero__stat-value[data-count-to]');
  if (!targets.length) return;

  var prefersReducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  var duration = 1200;

  targets.forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count-to'), 10);
    if (!isFinite(target)) return;
    var suffix = el.getAttribute('data-count-suffix') || '';
    var start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      // ease-out cubic — chạy nhanh lúc đầu, chậm dần khi tới đích, giống
      // cảm giác "đồng hồ đếm số" quen thuộc hơn là chạy đều tuyến tính.
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(target * eased);
      el.textContent = current.toLocaleString('vi-VN') + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }

    // Bắt đầu đếm sau 1 nhịp ngắn — khớp gần đúng lúc khối .hero__stats (có
    // data-reveal riêng, xem index.html) vừa hiện xong, để số "chạy lên"
    // đúng lúc người dùng nhìn thấy nó thay vì đếm xong trước khi kịp hiện.
    setTimeout(function () { requestAnimationFrame(step); }, 400);
  });
});
