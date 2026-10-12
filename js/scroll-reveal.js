/* ==========================================================================
   AgriChain — Hiện dần khi cuộn tới (dùng chung cho MỌI phần tử đánh dấu
   [data-reveal] trên trang hiện tại). CSS tương ứng ([data-reveal],
   .is-visible) nằm ở css/components.css — file này chỉ lo phần quan sát/gắn
   class, không định nghĩa hiệu ứng.

   Ban đầu (2026-09-29) viết riêng cho index.html, tự chạy 1 lần lúc
   DOMContentLoaded là đủ vì mọi [data-reveal] đều có sẵn trong HTML tĩnh.
   Khi áp dụng thêm cho blog.html/blog-chi-tiet.html — nơi nội dung
   [data-reveal] (thẻ .post-card, bài viết chi tiết) chỉ xuất hiện SAU khi
   fetch() data/blog-posts.json xong, tức là SAU thời điểm DOMContentLoaded —
   phải tách hàm quan sát ra thành AgriChain.initScrollReveal(root) để
   js/blog.js/js/blog-chi-tiet.js tự gọi lại sau khi render xong nội dung.
   Gọi lại nhiều lần an toàn: observer.observe() trên 1 phần tử ĐÃ được theo
   dõi là no-op theo spec (không hiện lại/không lỗi), nên không cần tự theo
   dõi xem phần tử nào đã observe() hay chưa. */

(function (global) {
  'use strict';

  var observer = null;

  function ensureObserver() {
    if (observer) return observer;
    if (!('IntersectionObserver' in window)) return null;

    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -60px 0px' });

    return observer;
  }

  // root tuỳ chọn — chỉ tìm [data-reveal] BÊN TRONG root đó (VD lưới bài
  // viết vừa render xong) thay vì quét lại toàn bộ document mỗi lần gọi.
  function initScrollReveal(root) {
    var scope = root || document;
    var targets = scope.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    var obs = ensureObserver();
    if (!obs) {
      // Trình duyệt không hỗ trợ IntersectionObserver — hiện ngay, không
      // để nội dung kẹt mãi ở trạng thái mờ/ẩn.
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    targets.forEach(function (el) { obs.observe(el); });
  }

  global.AgriChain = global.AgriChain || {};
  global.AgriChain.initScrollReveal = initScrollReveal;

  document.addEventListener('DOMContentLoaded', function () { initScrollReveal(); });
})(window);
