if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

/* --- Khu vực tài khoản ở .site-header__actions -----------------------------
   Các trang công khai dùng chung .site-header (index.html, blog.html,
   blog-chi-tiet.html, styleguide.html, truy-xuat.html) mặc định luôn hiện 2
   nút "Đăng Nhập"/"Bắt Đầu Ngay" ngay trong HTML, không phân biệt đã đăng
   nhập hay chưa — cùng vấn đề đã sửa cho agriverse-3d.html (B5,
   renderAccountArea()), nhưng làm THEO ĐÚNG hệ .site-header/.btn của trang
   giới thiệu (không dùng Tailwind/avatar dropdown như bên đó).

   headerActionsDefaultHtml chụp lại đúng HTML gốc (2 nút) của
   .site-header__actions ngay LẦN GỌI ĐẦU — dùng để khôi phục lại y nguyên
   khi phát hiện chưa/không còn đăng nhập, khỏi phải chép tay markup 2 nút
   đó thành chuỗi JS (HTML trong trang vẫn là nguồn duy nhất cho trạng thái
   "chưa đăng nhập"). */
var headerActionsDefaultHtml = null;

function renderHeaderAccountArea() {
  var actionsNode = document.querySelector('.site-header__actions');
  if (!actionsNode) return;

  if (headerActionsDefaultHtml === null) {
    headerActionsDefaultHtml = actionsNode.innerHTML;
  }

  var api = window.AgriChain && window.AgriChain.api;
  if (!api || !api.isLoggedIn()) {
    actionsNode.innerHTML = headerActionsDefaultHtml;
    return;
  }

  var isBusiness = api.isBusiness();
  var target = isBusiness ? 'nong-trai.html' : 'agriverse-3d.html';
  var label = isBusiness ? 'Vào Trang Quản Lý' : 'Vào Mua Sắm';

  // target/label đều là chuỗi tĩnh (không có dữ liệu người dùng) nên ghép
  // thẳng vào innerHTML an toàn — khác fullName/email ở agriverse-3d.html,
  // không cần tách qua textContent.
  actionsNode.innerHTML =
    '<a class="btn btn--primary btn--sm" href="' + target + '">' + label + '</a>' +
    '<button type="button" class="btn btn--outline btn--sm" data-header-logout>Đăng Xuất</button>';

  var logoutButton = actionsNode.querySelector('[data-header-logout]');
  if (logoutButton) {
    logoutButton.addEventListener('click', function () {
      api.auth.logout().then(function () {
        window.location.reload();
      });
    });
  }
}

// Bug bfcache (cùng mẫu đã vá ở js/api.js cho requireAuth()/requireBusiness()
// và ở agriverse-3d.html cho renderAccountArea()): đăng xuất xong bấm Back
// có thể khôi phục trang từ bfcache thay vì tải lại thật — JS không chạy
// lại nên header vẫn hiện nút cũ dù access token đã bị xoá thật (bug hiển
// thị thuần tuý, mọi gọi API vẫn bị chặn đúng vì token đã mất). 'pageshow'
// báo lại MỌI lần trang hiển thị, kể cả khôi phục từ bfcache
// (event.persisted === true, không có ở lần tải trang bình thường) — gọi
// lại renderHeaderAccountArea() để vẽ đúng theo trạng thái đăng nhập THẬT.
window.addEventListener('pageshow', function (event) {
  if (event.persisted) renderHeaderAccountArea();
});

document.addEventListener('DOMContentLoaded', function () {
  renderHeaderAccountArea();

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
