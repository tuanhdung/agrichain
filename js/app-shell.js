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

  /* --- Sidebar (dưới 960px) ------------------------------------------------ */
  function setupSidebar() {
    var sidebar = document.querySelector('.app-sidebar');
    var toggle = document.querySelector('.app-topbar__toggle');
    var scrim = document.querySelector('.app-scrim');
    if (!sidebar || !toggle || !scrim) return;

    function open() {
      sidebar.classList.add('is-open');
      scrim.classList.add('is-visible');
      toggle.setAttribute('aria-expanded', 'true');
    }

    function close() {
      sidebar.classList.remove('is-open');
      scrim.classList.remove('is-visible');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function () {
      if (sidebar.classList.contains('is-open')) close();
      else open();
    });

    scrim.addEventListener('click', close);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
        close();
        toggle.focus();
      }
    });

    // Kéo cửa sổ rộng ra thì sidebar thành cố định — dọn luôn trạng thái mở
    // để lớp phủ không kẹt lại che mất nội dung.
    global.matchMedia('(min-width: 960px)').addEventListener('change', function (event) {
      if (event.matches) close();
    });
  }

  /* --- Thu gọn/xổ ra từng nhóm menu trong sidebar ---------------------------
     Mặc định mọi nhóm đều mở (giữ nguyên hành vi cũ); bấm vào tiêu đề nhóm để
     ẩn/hiện .app-nav__list bên dưới nó. Không lưu lại trạng thái qua các lần
     tải trang — mỗi trang admin tự chứa sidebar riêng (không templating) nên
     giữ đơn giản, luôn mở lại từ đầu khi chuyển trang. */
  function setupNavSections() {
    document.querySelectorAll('.app-nav__section-toggle').forEach(function (toggle) {
      var list = document.getElementById(toggle.getAttribute('aria-controls'));
      if (!list) return;

      toggle.addEventListener('click', function () {
        var expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        list.hidden = expanded;
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