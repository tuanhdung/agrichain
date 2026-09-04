/* ==========================================================================
   AgriChain — Khung app quản trị
   Đóng/mở sidebar, hiển thị người dùng trên topbar, toast dùng chung.
   Nạp SAU js/store.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var store = global.AgriChain && global.AgriChain.store;

  /* --- Chữ viết tắt cho avatar: "tổ chức tess" -> "TT" --------------------- */
  function initials(text) {
    if (!text) return '?';
    var words = text.trim().split(/\s+/).slice(-2);
    return words.map(function (word) {
      return word.charAt(0).toUpperCase();
    }).join('');
  }

  /* --- Phiên đăng nhập -----------------------------------------------------
     Chưa đăng nhập thì đá về trang đăng nhập, kèm ?redirect= để quay lại đúng
     trang đang muốn vào sau khi đăng nhập xong. */
  function requireSession() {
    var session = store && store.getSession();
    if (session) return session;

    var here = global.location.pathname.split('/').pop() + global.location.search;
    global.location.replace('dang-nhap.html?redirect=' + encodeURIComponent(here));
    return null;
  }

  function fillSession(session) {
    var org = session.type === 'org' && session.orgName
      ? session.orgName
      : (session.fullName || session.email);

    document.querySelectorAll('[data-session-org]').forEach(function (node) {
      node.textContent = org;
    });
    document.querySelectorAll('[data-session-name]').forEach(function (node) {
      node.textContent = session.fullName || session.email;
    });
    document.querySelectorAll('[data-session-initials]').forEach(function (node) {
      node.textContent = initials(org);
    });
  }

  function setupLogout() {
    document.querySelectorAll('[data-logout]').forEach(function (button) {
      button.addEventListener('click', function () {
        store.clearSession();
        global.location.href = 'dang-nhap.html';
      });
    });
  }

  /* --- Nhớ trạng thái sidebar qua localStorage -------------------------------
     Dự án không có router/SPA — mỗi lần bấm 1 mục menu là tải lại trang tĩnh
     khác hoàn toàn, nên trạng thái JS (class, aria-expanded...) không tự
     nhiên còn nguyên. Lưu 2 mẩu trạng thái nhỏ vào localStorage để sidebar
     KHÔNG bị "giật" về mặc định mỗi lần chuyển trang:
       - agrichain:sidebarCollapsed — có thu gọn sidebar (desktop) hay không.
       - agrichain:sidebarSections  — object {id nhóm: đang mở hay đóng}.
     Bọc try/catch giống store.js: localStorage có thể không dùng được (chế
     độ ẩn danh, hết dung lượng...), lúc đó chỉ mất tính năng nhớ trạng thái
     chứ không chặn sidebar hoạt động bình thường. */
  function readUiState(key, fallback) {
    try {
      var text = global.localStorage.getItem(key);
      return text === null ? fallback : JSON.parse(text);
    } catch (err) {
      return fallback;
    }
  }

  function writeUiState(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      // Bỏ qua — xem ghi chú ở trên.
    }
  }

  var SIDEBAR_COLLAPSED_KEY = 'agrichain:sidebarCollapsed';
  var SIDEBAR_SECTIONS_KEY = 'agrichain:sidebarSections';

  /* --- Sidebar --------------------------------------------------------------
     Dưới 960px: nút hamburger trượt sidebar ra đè lên nội dung (overlay +
     lớp phủ .app-scrim, đóng lại bằng cách bấm ra ngoài/Esc).
     Từ 960px: CÙNG nút đó lại thu gọn hẳn sidebar (đẩy nội dung lấp đầy chỗ
     trống, không phải overlay nên không cần lớp phủ) — bật/tắt class
     .is-sidebar-collapsed trên .app-shell, xem css/app-shell.css. Trạng thái
     thu gọn (chỉ có ý nghĩa ở desktop) được nhớ qua localStorage nên không bị
     reset khi bấm sang trang khác — xem ghi chú readUiState()/writeUiState()
     ở trên. */
  function setupSidebar() {
    var shell = document.querySelector('.app-shell');
    var sidebar = document.querySelector('.app-sidebar');
    var toggle = document.querySelector('.app-topbar__toggle');
    var scrim = document.querySelector('.app-scrim');
    if (!shell || !sidebar || !toggle || !scrim) return;

    var desktopQuery = global.matchMedia('(min-width: 960px)');

    function openMobile() {
      sidebar.classList.add('is-open');
      scrim.classList.add('is-visible');
      toggle.setAttribute('aria-expanded', 'true');
    }

    function closeMobile() {
      sidebar.classList.remove('is-open');
      scrim.classList.remove('is-visible');
      toggle.setAttribute('aria-expanded', 'false');
    }

    function toggleDesktop() {
      var collapsed = shell.classList.toggle('is-sidebar-collapsed');
      toggle.setAttribute('aria-expanded', String(!collapsed));
      writeUiState(SIDEBAR_COLLAPSED_KEY, collapsed);
    }

    toggle.addEventListener('click', function () {
      if (desktopQuery.matches) {
        toggleDesktop();
        return;
      }
      if (sidebar.classList.contains('is-open')) closeMobile();
      else openMobile();
    });

    scrim.addEventListener('click', closeMobile);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
        closeMobile();
        toggle.focus();
      }
    });

    // Kéo cửa sổ rộng ra thì sidebar thành cố định — dọn luôn trạng thái mở
    // (overlay mobile) để lớp phủ không kẹt lại che mất nội dung. Không cần
    // xử lý gì khi thu hẹp lại: .is-sidebar-collapsed chỉ có tác dụng trong
    // @media (min-width: 960px), giữ nguyên class lúc ở màn hình hẹp không
    // ảnh hưởng gì và giữ đúng trạng thái đã lưu khi kéo rộng ra lại.
    desktopQuery.addEventListener('change', function (event) {
      if (event.matches) closeMobile();
    });

    // Khôi phục trạng thái thu gọn đã lưu (nếu có) trước khi tính aria-
    // expanded, để nút hamburger phản ánh đúng ngay từ lần vẽ đầu tiên.
    var collapsed = !!readUiState(SIDEBAR_COLLAPSED_KEY, false);
    if (collapsed) shell.classList.add('is-sidebar-collapsed');

    if (desktopQuery.matches) toggle.setAttribute('aria-expanded', String(!collapsed));
  }

  /* --- Menu tài khoản (bấm avatar ở topbar) ---------------------------------
     Mở/đóng .user-menu__panel — đóng lại khi bấm ra ngoài menu, Esc, hoặc
     bấm chính nút mở. Trang Hồ sơ/Đăng xuất nằm trong menu này, không phải
     mục sidebar (xem ho-so.html). */
  function setupUserMenu() {
    var menu = document.querySelector('.user-menu');
    var toggle = document.querySelector('.user-menu__toggle');
    var panel = document.querySelector('.user-menu__panel');
    if (!menu || !toggle || !panel) return;

    function close() {
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }

    function open() {
      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
    }

    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      if (panel.hidden) open();
      else close();
    });

    document.addEventListener('click', function (event) {
      if (!panel.hidden && !menu.contains(event.target)) close();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !panel.hidden) {
        close();
        toggle.focus();
      }
    });
  }

  /* --- Thu gọn/xổ ra từng nhóm menu trong sidebar ---------------------------
     Mặc định mọi nhóm đều mở; bấm vào tiêu đề nhóm để ẩn/hiện .app-nav__list
     bên dưới nó. Trạng thái từng nhóm (khoá theo id .app-nav__list, VD
     "nav-thuong-mai") được nhớ qua localStorage — xem ghi chú readUiState()/
     writeUiState() ở trên — nên không bị mở lại hết mỗi khi chuyển trang. */
  function setupNavSections() {
    var sections = readUiState(SIDEBAR_SECTIONS_KEY, {});

    document.querySelectorAll('.app-nav__section-toggle').forEach(function (toggle) {
      var id = toggle.getAttribute('aria-controls');
      var list = document.getElementById(id);
      if (!list) return;

      // Chỉ áp dụng khi đã lưu rõ ràng là "đóng" — mặc định (chưa lưu gì)
      // vẫn là mở, khớp hành vi gốc.
      if (sections[id] === false) {
        toggle.setAttribute('aria-expanded', 'false');
        list.hidden = true;
      }

      toggle.addEventListener('click', function () {
        var expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        list.hidden = expanded;

        sections[id] = !expanded; // lưu trạng thái MỚI (sau khi bấm), không phải trạng thái cũ
        writeUiState(SIDEBAR_SECTIONS_KEY, sections);
      });
    });
  }

  /* --- Tab dùng chung (data-tab-target / data-tab-panel) --------------------
     Áp dụng cho mọi khối .tabs trên trang (VD tab trong modal xem chi tiết
     nông trại). Panel phải là anh em cùng cấp với .tabs (nằm chung một cha) —
     JS tìm panel trong đúng phạm vi đó nên nhiều khối .tabs trên cùng trang
     không đụng vào nhau. */
  function setupTabs() {
    document.querySelectorAll('.tabs').forEach(function (tabBar) {
      var tabs = tabBar.querySelectorAll('[data-tab-target]');

      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          var targetId = tab.getAttribute('data-tab-target');

          tabs.forEach(function (other) {
            var active = other === tab;
            other.classList.toggle('is-active', active);
            other.setAttribute('aria-selected', String(active));
          });

          tabBar.parentNode.querySelectorAll('[data-tab-panel]').forEach(function (panel) {
            panel.hidden = panel.id !== targetId;
          });
        });
      });
    });
  }

  /* --- Chọn sẵn nội dung khi focus vào ô số đang là "0" ---------------------
     Input số mặc định giá trị 0 (diện tích, sản lượng...) — bấm vào gõ số
     thường bị dính thành "05", "012" vì con 0 cũ không tự mất đi trước khi
     gõ. Focus vào thì chọn sẵn toàn bộ nội dung, gõ số là thay thế luôn.
     Dùng focusin (nổi bọt lên document, không như focus) + kiểm value ngay
     lúc focus nên áp dụng được cho MỌI input[type=number] hiện có lẫn thêm
     sau này, không cần gắn class/data-attribute riêng cho từng ô. */
  function setupZeroDefaultInputs() {
    document.addEventListener('focusin', function (event) {
      var target = event.target;
      if (target.tagName === 'INPUT' && target.type === 'number' && target.value === '0') {
        target.select();
      }
    });
  }

  /* --- Toast ---------------------------------------------------------------
     Một phần tử .toast duy nhất trên mỗi trang, gọi bằng AgriChain.toast(...) */
  var toastTimer = null;

  function toast(message) {
    var node = document.querySelector('.toast');
    if (!node) return;

    var label = node.querySelector('[data-toast-message]');
    if (label) label.textContent = message;

    node.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      node.classList.remove('is-visible');
    }, 4000);
  }

  /* --- Hộp thoại xác nhận ----------------------------------------------------
     Một <dialog id="confirm-dialog"> dùng chung mỗi trang (giống .toast) —
     gọi bằng AgriChain.confirm(message), trả về Promise<boolean>. Trang nào
     chưa gắn markup #confirm-dialog thì rơi về window.confirm() gốc trình
     duyệt để không chặn hẳn tính năng gọi nó. */
  function confirmDialog(message) {
    var dialog = document.getElementById('confirm-dialog');
    if (!dialog) return Promise.resolve(global.confirm(message));

    var messageNode = dialog.querySelector('[data-confirm-message]');
    if (messageNode) messageNode.textContent = message;

    var okButton = dialog.querySelector('[data-confirm-ok]');
    var cancelButton = dialog.querySelector('[data-confirm-cancel]');

    return new Promise(function (resolve) {
      function cleanup(result) {
        okButton.removeEventListener('click', onOk);
        cancelButton.removeEventListener('click', onCancel);
        dialog.removeEventListener('cancel', onCancel);
        dialog.close();
        resolve(result);
      }
      function onOk() { cleanup(true); }
      // <dialog> tự bắn sự kiện 'cancel' khi người dùng nhấn Esc — coi như huỷ.
      function onCancel() { cleanup(false); }

      okButton.addEventListener('click', onOk);
      cancelButton.addEventListener('click', onCancel);
      dialog.addEventListener('cancel', onCancel);

      dialog.showModal();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var session = requireSession();
    if (!session) return; // đang chuyển hướng, khỏi dựng gì thêm
    fillSession(session);
    setupSidebar();
    setupUserMenu();
    setupNavSections();
    setupTabs();
    setupZeroDefaultInputs();
    setupLogout();
  });

  global.AgriChain = global.AgriChain || {};
  global.AgriChain.toast = toast;
  global.AgriChain.initials = initials;
  global.AgriChain.confirm = confirmDialog;
})(window);