if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.site-header__toggle');
  var panel = document.getElementById('site-header-panel');

  if (toggle && panel) {
    var openPanel = function () {
      panel.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Đóng menu');
    };

    var closePanel = function () {
      panel.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Mở menu');
    };

    toggle.addEventListener('click', function () {
      if (panel.classList.contains('is-open')) {
        closePanel();
      } else {
        openPanel();
      }
    });

    panel.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closePanel);
    });

    document.addEventListener('click', function (event) {
      if (!panel.classList.contains('is-open')) return;
      var clickedInsidePanel = panel.contains(event.target);
      var clickedToggle = toggle.contains(event.target);
      if (!clickedInsidePanel && !clickedToggle) closePanel();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && panel.classList.contains('is-open')) {
        closePanel();
        toggle.focus();
      }
    });

    var desktopQuery = window.matchMedia('(min-width: 960px)');
    desktopQuery.addEventListener('change', function (event) {
      if (event.matches) closePanel();
    });
  }

  // Cuộn tới anchor (#id), để trình duyệt tự căn theo scroll-padding-top
  // (đã khai báo ở base.css, bằng đúng chiều cao header) thay vì tự tính
  // tay bằng window.scrollTo — scrollIntoView() theo chuẩn trình duyệt nên
  // đáng tin cậy hơn khi kết hợp với thời điểm gọi trễ (sau khi font tải xong).
  function scrollToHash(hash) {
    if (!hash || hash.length < 2) return;
    var target = document.querySelector(hash);
    if (!target) return;
    target.scrollIntoView({ block: 'start' });
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var hash = link.getAttribute('href');
    if (!hash || !document.querySelector(hash)) return;
    event.preventDefault();
    scrollToHash(hash);
    history.pushState(null, '', hash);
  });

  if (window.location.hash) {
    var currentHash = window.location.hash;

    // Layout trang có thể còn "phình" thêm một lúc sau khi 'load' bắn (không
    // rõ nguồn chính xác — có thể web font, có thể thứ khác) nên không đoán
    // một mốc thời gian cố định. Thay vào đó: cuộn lại liên tục mỗi 100ms và
    // theo dõi vị trí thật (document-relative) của đích đến; khi vị trí đó
    // đứng yên 3 lần liên tiếp mới coi là layout đã ổn định và dừng lại
    // (tối đa 5 giây để tránh lặp vô hạn nếu có gì bất thường).
    window.addEventListener('load', function () {
      var target = document.querySelector(currentHash);
      if (!target) return;

      var lastPos = null;
      var stableTicks = 0;
      var attempts = 0;
      var maxAttempts = 50;

      var settle = function () {
        scrollToHash(currentHash);

        var pos = target.getBoundingClientRect().top + window.pageYOffset;
        if (lastPos !== null && Math.abs(pos - lastPos) < 1) {
          stableTicks++;
        } else {
          stableTicks = 0;
        }
        lastPos = pos;
        attempts++;

        if (stableTicks < 3 && attempts < maxAttempts) {
          setTimeout(settle, 100);
        }
      };

      settle();
    });
  }
});
