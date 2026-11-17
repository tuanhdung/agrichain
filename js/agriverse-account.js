/* ==========================================================================
   AgriVerse — khu vực tài khoản ở header, dùng chung cho agriverse-3d.html,
   san-pham.html và tai-khoan-khach-hang.html (3 trang Tailwind tự chứa riêng,
   không dùng chung CSS/markup được, nên phần JS này tách ra 1 file để sửa 1 chỗ).

   Yêu cầu trên trang: có <div id="account-area"> trong header, và đã nạp
   js/api-config.js, js/app-config.js, js/api.js TRƯỚC file này. Trang công khai —
   KHÔNG gọi requireAuth()/requireBusiness(), chỉ ĐỌC trạng thái đăng nhập (nếu có).

   renderAccountArea() LUÔN tự vẽ lại cả 2 trạng thái (đăng nhập / chưa đăng nhập),
   không early-return ở nhánh chưa đăng nhập — vì còn được gọi lại từ 'pageshow' khi
   trình duyệt khôi phục trang từ bfcache (xem CLAUDE.md gốc, mục "Khu vực tài khoản
   ở header agriverse-3d.html").
   ========================================================================== */

(function (global) {
  'use strict';

  var ACCOUNT_PAGE = 'tai-khoan-khach-hang.html';

  var ROLE_LABELS = {
    platform_admin: 'Quản Trị Hệ Thống',
    business: 'Doanh Nghiệp',
    customer: 'Khách Hàng'
  };

  function getApi() {
    return global.AgriChain && global.AgriChain.api;
  }

  function initialsOf(fullName) {
    return fullName.trim().split(/\s+/).map(function (w) { return w[0]; })
      .slice(-2).join('').toUpperCase() || '?';
  }

  function menuItem(href, icon, label) {
    return '<a href="' + href + '" class="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold ' +
      'text-slate-700 hover:bg-emerald-50 hover:text-brand-700 transition">' +
      '<i class="fa-solid ' + icon + ' w-4 text-center text-brand-600"></i><span>' + label + '</span></a>';
  }

  function renderAccountArea() {
    var area = document.getElementById('account-area');
    if (!area) return;
    var api = getApi();

    if (!api || !api.isLoggedIn()) {
      area.innerHTML =
        '<a href="dang-nhap.html" class="flex items-center space-x-2 px-3.5 py-2 rounded-full bg-slate-100 ' +
        'hover:bg-slate-200 text-slate-700 font-semibold text-xs transition">' +
        '<i class="fa-solid fa-user"></i><span class="hidden sm:inline">Đăng Nhập</span></a>';
      return;
    }

    var user = api.getUser() || {};
    var fullName = user.full_name || 'Tài khoản';
    // 2 mục quản trị KHÁC nhau, đừng gộp:
    //  - "Khu Quản Lý" (SPA /nong-trai: nông trại, vật tư, lô hàng...) — business LẪN platform_admin dùng chung.
    //  - "Trang Quản Trị" (quản trị TMĐT: route SPA /tmdt/*) — CHỈ platform_admin, khớp nhóm menu
    //    "Thương mại điện tử" ở khu quản trị (xem CLAUDE.md gốc, mục "Quản trị hệ thống (platform_admin)").
    // Khách hàng (customer) không có mục nào trong 2 mục này.
    var canManage = api.isBusiness() || api.isPlatformAdmin();
    var manageUrl = (global.AgriChain.APP_SPA_URL || '') + '/nong-trai';
    var isSysAdmin = api.isPlatformAdmin();

    // Khung HTML tĩnh (do mình viết, an toàn) — tên/email người dùng gán riêng qua
    // textContent bên dưới, KHÔNG nội suy vào chuỗi HTML, tránh rủi ro XSS.
    area.innerHTML =
      '<button type="button" id="account-menu-trigger" class="relative flex items-center space-x-2 px-2 py-1.5 rounded-full ' +
      'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition">' +
        '<span id="account-notify-badge" hidden class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full ' +
        'bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center border-2 border-white"></span>' +
        '<span id="account-menu-initials" class="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center ' +
        'justify-center font-bold text-[11px] flex-shrink-0"></span>' +
        '<span id="account-menu-name" class="hidden sm:inline max-w-[120px] truncate"></span>' +
        '<i class="fa-solid fa-chevron-down text-[10px] text-slate-400 hidden sm:inline"></i>' +
      '</button>' +
      '<div id="account-menu-panel" class="hidden absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl ' +
      'border border-slate-200 overflow-hidden z-50">' +
        '<div class="flex items-center gap-3 p-4 border-b border-slate-100">' +
          '<span id="account-panel-initials" class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-700 to-emerald-500 ' +
          'text-white flex items-center justify-center font-black flex-shrink-0"></span>' +
          '<div class="min-w-0">' +
            '<p id="account-menu-panel-name" class="text-sm font-black text-slate-900 truncate"></p>' +
            '<p id="account-menu-panel-email" class="text-xs text-slate-400 truncate"></p>' +
            '<span id="account-menu-panel-role" class="inline-block mt-1 px-2 py-0.5 rounded-full bg-brand-900 text-white text-[10px] font-bold"></span>' +
          '</div>' +
        '</div>' +
        '<div id="account-notify-section" hidden class="border-b border-slate-100">' +
          '<div class="flex items-center justify-between px-4 pt-3 pb-1">' +
            '<span class="text-xs font-black uppercase tracking-wide text-slate-500">Thông báo</span>' +
            '<button type="button" id="account-notify-readall" hidden class="text-[11px] font-bold text-brand-700 hover:underline">' +
            'Đánh dấu đã đọc</button>' +
          '</div>' +
          '<ul id="account-notify-list" class="max-h-64 overflow-y-auto pb-1"></ul>' +
        '</div>' +
        '<nav class="py-1">' +
          (isSysAdmin ? menuItem((global.AgriChain.APP_SPA_URL || '') + '/tmdt/tong-quan', 'fa-gear', 'Trang Quản Trị') : '') +
          (canManage ? menuItem(manageUrl, 'fa-seedling', 'Khu Quản Lý') : '') +
          menuItem(ACCOUNT_PAGE + '?tab=profile', 'fa-user', 'Hồ Sơ Của Tôi') +
          menuItem(ACCOUNT_PAGE + '?tab=orders', 'fa-bag-shopping', 'Đơn Mua Của Tôi') +
          menuItem(ACCOUNT_PAGE + '?tab=addresses', 'fa-location-dot', 'Sổ Địa Chỉ Nhận Hàng') +
          menuItem(ACCOUNT_PAGE + '?tab=security', 'fa-shield-halved', 'Mật Khẩu &amp; Bảo Mật') +
          menuItem('truy-xuat.html', 'fa-qrcode', 'Tra Cứu Lô Hàng Nông Sản') +
        '</nav>' +
        '<div class="p-3 border-t border-slate-100">' +
          '<button type="button" id="account-logout-btn" class="w-full flex items-center justify-center gap-2 py-2.5 ' +
          'rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold transition">' +
          '<i class="fa-solid fa-right-from-bracket"></i> Đăng Xuất</button>' +
        '</div>' +
      '</div>';

    var initials = initialsOf(fullName);
    document.getElementById('account-menu-initials').textContent = initials;
    document.getElementById('account-panel-initials').textContent = initials;
    document.getElementById('account-menu-name').textContent = fullName;
    document.getElementById('account-menu-panel-name').textContent = fullName;
    document.getElementById('account-menu-panel-email').textContent = user.email || '';
    document.getElementById('account-menu-panel-role').textContent =
      ROLE_LABELS[user.account_type] || 'Tài khoản';

    document.getElementById('account-menu-trigger').addEventListener('click', toggleAccountMenu);
    document.getElementById('account-logout-btn').addEventListener('click', handleAccountLogout);
    document.getElementById('account-notify-readall').addEventListener('click', handleNotifyReadAll);
    loadNotifications();
  }

  // --- Thông báo trong web ("sản phẩm đã có hàng trở lại"...) ------------------------------
  // Chỉ là phụ trợ: lỗi mạng/403 thì lặng lẽ không hiện gì, không toast, không chặn menu tài khoản.

  // Chỉ chấp nhận link tương đối trong site tĩnh (cùng quy tắc chống open-redirect của ?redirect=):
  // giá trị lạ (http://, //..., javascript:) bị bỏ qua, mục thông báo vẫn hiện nhưng không bấm sang đâu.
  var SAFE_LINK = /^[A-Za-z][\w.-]*\.html(\?.*)?$/;

  function notifyBadge(unread) {
    var badge = document.getElementById('account-notify-badge');
    if (!badge) return;
    badge.hidden = !(unread > 0);
    badge.textContent = unread > 99 ? '99+' : String(unread);
  }

  function relativeTime(iso) {
    var seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' phút trước';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' giờ trước';
    return Math.floor(seconds / 86400) + ' ngày trước';
  }

  function notifyItem(n) {
    var li = document.createElement('li');
    var link = document.createElement('a');
    link.href = n.link && SAFE_LINK.test(n.link) ? n.link : '#';
    link.className = 'block px-4 py-2.5 hover:bg-emerald-50 transition' + (n.read_at ? '' : ' bg-emerald-50/60');

    var title = document.createElement('p');
    title.className = 'text-sm text-slate-900 ' + (n.read_at ? 'font-semibold' : 'font-black');
    title.textContent = n.title;
    link.appendChild(title);

    if (n.body) {
      var body = document.createElement('p');
      body.className = 'text-xs text-slate-500 mt-0.5';
      body.textContent = n.body;
      link.appendChild(body);
    }
    var time = document.createElement('p');
    time.className = 'text-[11px] text-slate-400 mt-0.5';
    time.textContent = relativeTime(n.created_at);
    link.appendChild(time);

    if (!n.read_at) {
      link.addEventListener('click', function () {
        // Fire-and-forget: trang đích sắp mở, không chờ kết quả (đọc lại ở lần tải sau).
        var api = getApi();
        if (api) api.notifications.markRead(n.id).catch(function () {});
      });
    }
    li.appendChild(link);
    return li;
  }

  function loadNotifications() {
    var api = getApi();
    if (!api || !api.isLoggedIn() || !api.notifications) return;
    Promise.all([api.notifications.list({ page_size: 5 }), api.notifications.unreadCount()])
      .then(function (results) {
        // DOM có thể đã bị vẽ lại (đăng xuất/bfcache) trong lúc chờ — thiếu phần tử thì thôi.
        var section = document.getElementById('account-notify-section');
        var list = document.getElementById('account-notify-list');
        var readAll = document.getElementById('account-notify-readall');
        if (!section || !list || !readAll) return;
        var items = (results[0] && results[0].items) || [];
        var unread = (results[1] && results[1].unread) || 0;
        list.innerHTML = '';
        items.forEach(function (n) { list.appendChild(notifyItem(n)); });
        section.hidden = items.length === 0;
        readAll.hidden = unread === 0;
        notifyBadge(unread);
      })
      .catch(function () {});
  }

  function handleNotifyReadAll() {
    var api = getApi();
    if (!api) return;
    api.notifications.markAllRead().then(loadNotifications).catch(function () {});
  }

  function toggleAccountMenu() {
    var panel = document.getElementById('account-menu-panel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    // Mở menu thì làm mới thông báo (có thể có cái mới từ lúc trang tải).
    if (!panel.classList.contains('hidden')) loadNotifications();
  }

  // Đóng menu khi bấm ra ngoài — 1 dropdown nhỏ, không cần thư viện ngoài.
  document.addEventListener('click', function (event) {
    var panel = document.getElementById('account-menu-panel');
    var trigger = document.getElementById('account-menu-trigger');
    if (!panel || panel.classList.contains('hidden')) return;
    if (panel.contains(event.target) || (trigger && trigger.contains(event.target))) return;
    panel.classList.add('hidden');
  });

  function handleAccountLogout() {
    var api = getApi();
    if (!api) return;
    // Xoá giỏ ở máy này trước (giỏ thật vẫn còn trên máy chủ cho lần đăng nhập sau)
    if (global.AgriChain.cart) global.AgriChain.cart.clearLocal();
    api.auth.logout().then(function () {
      // Đăng xuất ở trang công khai không bắt buộc rời trang — trừ trang tài khoản
      // (cần đăng nhập mới xem được) thì về trang chủ AgriVerse.
      var onAccountPage = location.pathname.slice(-ACCOUNT_PAGE.length) === ACCOUNT_PAGE;
      if (onAccountPage) location.href = 'agriverse-3d.html';
      else location.reload();
    });
  }

  // Bug bfcache: đăng xuất xong bấm Back có thể khôi phục DOM cũ (còn avatar/tên cũ)
  global.addEventListener('pageshow', function (event) {
    if (event.persisted) renderAccountArea();
  });
  global.addEventListener('load', renderAccountArea);

  global.AgriVerseAccount = { render: renderAccountArea };
})(window);
