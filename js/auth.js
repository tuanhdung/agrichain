/* ==========================================================================
   AgriChain — Đăng nhập / Đăng ký
   Một file dùng cho cả hai trang; tự nhận biết theo id của form có mặt.
   Nạp SAU js/chain.js, js/store.js, js/api-config.js, js/api.js và
   js/password-field.js (nút hiện/ẩn + điều kiện mật khẩu dùng chung, xem
   file đó).

   ĐÃ CHUYỂN SANG BACKEND THẬT qua js/api.js — CẢ setupLogin() (từ trước) VÀ
   setupRegister() (2026-09-11, qua api.auth.registerCustomer()/
   registerBusiness()) — không còn gọi AgriChain.store/AgriChain.chain ở file
   này nữa. js/store.js/js/chain.js vẫn được NẠP ở cả dang-nhap.html và
   dang-ky.html dù không còn dùng tới (cùng tình trạng với
   dang-nhap.html từ lần migrate trước) — việc gỡ 2 thẻ <script> thừa này
   ngoài phạm vi lần migrate đăng ký này, để lại cho một đợt dọn dẹp sau,
   cùng cách xử lý với collection `orgUsers`/`workflowTemplates` mồ côi đã
   ghi trong CLAUDE.md. Xem mục "Đăng nhập/Đăng ký" trong CLAUDE.md.
   ========================================================================== */

(function (global) {
  'use strict';

  var api = global.AgriChain.api;
  var passwordProblems = global.AgriChain.passwordProblems;

  // 7 trang thuong-mai-* CÒN LẠI dùng khung quản trị (app-shell: sidebar +
  // topbar) trên site tĩnh — tài khoản 'customer' không có quyền gì ở đây
  // (RBAC chặn = 403 nếu cố vào), nên KHÔNG được phép là đích ?redirect= cho
  // account_type này, dù link redirect có khớp regex an toàn ở dưới. Xem
  // redirectTarget(). Trước đây mảng này có ĐỦ 16 trang app-shell — 9 trang
  // nhóm "Hoạt động sản xuất" (nong-trai, nong-trai-chi-tiet, vat-tu,
  // mau-quy-trinh, lo-hang, tai-khoan, ho-so, goi-phan-mem, lich-su-mua-goi)
  // đã XOÁ HẲN khỏi site tĩnh (migrate xong sang SPA, xem CLAUDE.md mục "Kết
  // nối backend") nên bỏ khỏi mảng — ?redirect= không còn cách nào trỏ tới
  // chúng nữa (SPA ở origin khác, ngoài phạm vi regex ".html" bên dưới).
  // NGUỒN THAM CHIẾU DUY NHẤT cho danh sách 7 trang này trong toàn dự án —
  // nơi khác cần cùng danh sách phải đối chiếu lại đúng mảng này, không gõ
  // tay lại.
  var ADMIN_SHELL_PAGES = [
    'thuong-mai-tong-quan.html', 'thuong-mai-san-pham.html', 'thuong-mai-don-hang.html',
    'thuong-mai-van-chuyen.html', 'thuong-mai-nhap-hang.html', 'thuong-mai-may-tinh-tien.html',
    'thuong-mai-thiet-lap.html'
  ];

  /* --- Tiện ích chung ------------------------------------------------------ */

  function showAlert(message) {
    var alert = document.querySelector('[data-auth-alert]');
    if (!alert) return;
    alert.querySelector('[data-auth-alert-message]').textContent = message;
    // Xoá rồi ép reflow trước khi thêm lại ".is-visible" — nếu không, báo
    // lỗi 2 lần liên tiếp (VD gõ sai mật khẩu 2 lần) sẽ không rung lại lần
    // thứ 2 (class không đổi giá trị nên trình duyệt không chạy lại
    // @keyframes, cùng lỗi đã gặp với dấu tích thành công ở form Liên Hệ).
    alert.classList.remove('is-visible');
    void alert.offsetWidth;
    alert.classList.add('is-visible');
  }

  function hideAlert() {
    var alert = document.querySelector('[data-auth-alert]');
    if (alert) alert.classList.remove('is-visible');
  }

  function clearErrors(form) {
    form.querySelectorAll('.field__error').forEach(function (node) { node.remove(); });
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (node) {
      node.removeAttribute('aria-invalid');
    });
  }

  function showError(field, message) {
    field.setAttribute('aria-invalid', 'true');
    var error = document.createElement('p');
    error.className = 'field__error';
    error.textContent = message;
    // Ô mật khẩu bọc trong .password-field nên phải leo thêm một cấp mới tới
    // .field, không thì thông báo lỗi rơi vào trong ô nhập.
    var host = field.closest('.field') || field.parentNode;
    host.appendChild(error);
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /* --- Chuyển loại tài khoản ----------------------------------------------- */

  function setupTypeTabs() {
    var radios = document.querySelectorAll('input[name="type"]');
    if (!radios.length) return;

    function apply() {
      var selected = document.querySelector('input[name="type"]:checked').value;
      document.querySelectorAll('[data-when-type]').forEach(function (block) {
        var active = block.getAttribute('data-when-type') === selected;
        block.classList.toggle('is-active', active);
        // Trường đang ẩn thì bỏ required, nếu không form sẽ chặn submit vì
        // một ô người dùng còn không nhìn thấy. KHÔNG phải mọi input trong
        // block đều bắt buộc khi active (VD "business": chỉ tên Đơn vị bắt
        // buộc, mã số thuế/SĐT/địa chỉ tuỳ chọn) — chỉ thêm required cho
        // input có đánh dấu tĩnh [data-required] sẵn trong HTML, còn lại giữ
        // nguyên optional dù block đang hiện.
        block.querySelectorAll('input, select, textarea').forEach(function (input) {
          if (active) {
            if (input.hasAttribute('data-required')) input.setAttribute('required', '');
          } else {
            input.removeAttribute('required');
          }
        });
      });
    }

    radios.forEach(function (radio) {
      radio.addEventListener('change', apply);
    });
    apply();
  }

  /* --- Sau khi đăng nhập: về đâu ---------------------------------------------
     accountType: 'customer' | 'business' | 'platform_admin' | null/undefined
     (chưa biết — coi như 'business' để giữ đúng hành vi mặc định cũ, tránh
     phá vỡ luồng hiện có ở những nơi gọi redirectTarget() mà chưa kịp truyền
     account_type). 'platform_admin' (2026-09-13, đổi hướng thiết kế — xem
     CLAUDE.md mục "Quản trị hệ thống (platform_admin)") dùng CHUNG khu quản
     trị với 'business' thay vì có đích/trang riêng — cố tình KHÔNG liệt kê
     nhánh riêng cho 'platform_admin' ở cả 2 hàm dưới, rơi thẳng vào nhánh
     mặc định giống 'business' hệt nhau. */

  function defaultTargetFor(accountType) {
    // index.html chỉ là trang giới thiệu, không nằm trong app-shell nên
    // không hợp lý làm đích đến sau khi đăng nhập cho bất kỳ loại tài khoản
    // nào. agriverse-3d.html (không phải ecommerce.html) — đúng trang thương
    // mại điện tử ĐANG DÙNG THẬT của dự án từ 2026-09-08 (menu header/footer
    // "E-commerce" đã trỏ sang đây, xem CLAUDE.md); ecommerce.html giờ mồ
    // côi, không còn nơi nào trỏ tới (2026-09-11).
    if (accountType === 'customer') return 'agriverse-3d.html';
    // 'business', 'platform_admin', hoặc chưa rõ accountType — đích cũ
    // 'nong-trai.html' đã XOÁ (migrate sang SPA, xem CLAUDE.md mục "Kết nối
    // backend"), trỏ sang URL TUYỆT ĐỐI của SPA (origin khác hẳn site tĩnh
    // này — AgriChain.APP_SPA_URL, js/app-config.js, tự nhận diện dev/prod).
    // SPA tự nhận ra phiên vừa đăng nhập ở đây qua cookie httpOnly dùng chung
    // (AuthContext bootstrap lúc mount, xem app/CLAUDE.md mục "Giả định
    // host") — KHÔNG cần đăng nhập lại lần 2 nữa kể từ 2026-09-29.
    return (global.AgriChain.APP_SPA_URL || '') + '/nong-trai';
  }

  function redirectTarget(accountType) {
    var params = new URLSearchParams(global.location.search);

    // `next` — đích TUYỆT ĐỐI sang SPA (app.agrichain.*), thêm 2026-09-29 cho
    // luồng "đăng nhập 1 lần": SPA không còn trang đăng nhập riêng,
    // ProtectedRoute đá người dùng về ĐÂY kèm next=<url SPA họ đang đứng>
    // (xem app/CLAUDE.md mục "Giả định host"). Validate qua
    // window.AgriChain.resolveNextTarget() (js/next-target.js — origin phải
    // khớp CHÍNH XÁC AgriChain.APP_SPA_URL, chặn open redirect kiểu
    // //evil.com, javascript:, sai origin). 'customer' KHÔNG có gì trong SPA
    // (cùng lý do ADMIN_SHELL_PAGES chặn ?redirect= bên dưới) nên bỏ qua
    // next, rơi thẳng xuống defaultTargetFor() -> agriverse-3d.html.
    var nextParam = params.get('next');
    if (nextParam && accountType !== 'customer') {
      var nextTarget = global.AgriChain.resolveNextTarget(nextParam, global.AgriChain.APP_SPA_URL);
      if (nextTarget) return nextTarget;
    }

    var target = params.get('redirect');
    // Chỉ chấp nhận đường dẫn nội bộ dạng "ten-trang.html", bắt đầu bằng chữ
    // cái. Không cho URL tuyệt đối ("http://"/"https://") hay "//..." — tránh
    // biến tham số này thành chỗ chuyển hướng ra ngoài site (open redirect).
    if (target && /^[A-Za-z][\w.-]*\.html(\?.*)?$/.test(target)) {
      // Bản vá (2026-09-11): tài khoản 'customer' không có quyền gì ở khu
      // quản trị (RBAC backend trả 403 khi tải dữ liệu — đã thấy tận mắt khi
      // ?redirect= trỏ vào nong-trai.html) — dù link khớp regex an toàn ở
      // trên, vẫn phải bỏ qua nếu trỏ vào 1 trong 16 trang app-shell, dùng
      // mặc định theo account_type thay vào đó. 'platform_admin' KHÔNG bị
      // chặn ở đây (khác 2026-09-13 lúc đầu có 1 trang riêng cho nó, đã đổi
      // hướng) — tài khoản này giờ dùng chung 16 trang app-shell hợp lệ như
      // 'business', ?redirect= trỏ vào đó là bình thường.
      var page = target.split('?')[0];
      if (accountType === 'customer' && ADMIN_SHELL_PAGES.indexOf(page) !== -1) {
        return defaultTargetFor(accountType);
      }
      return target;
    }
    return defaultTargetFor(accountType);
  }

  /* --- Đăng nhập (đã chuyển sang backend thật qua js/api.js) ----------------
     Checkbox "Ghi nhớ đăng nhập" (name="remember", không có id riêng) giờ
     có tác dụng THẬT — đọc lúc submit, truyền vào api.auth.login() để quyết
     định lưu token ở localStorage (tick) hay sessionStorage (bỏ tick, xem
     js/api.js). */

  function setupLogin() {
    var form = document.getElementById('login-form');
    if (!form) return;

    // Quyết định hành vi lúc tải trang (đăng xuất từ SPA qua `?loggedOut=1`,
    // buộc đăng nhập lại vì SPA đã xác nhận phiên không hợp lệ qua
    // `?reason=unauth`, hay tự động vào thẳng SPA nếu phiên còn dùng được)
    // giờ nằm hết trong js/login-redirect.js (hàm THUẦN, test được trực tiếp
    // — xem app/src/test/loginRedirect.test.ts) để tránh lặp lại đúng bug đã
    // gặp 2 lần liên tiếp (loop lúc đăng xuất, rồi loop lúc phiên bất đồng
    // giữa 2 origin) mỗi khi có thêm 1 ca đặc biệt mới. `setupLogin()` chỉ
    // còn việc gom tham số URL + phụ thuộc thật (gọi API, điều hướng) rồi
    // giao cho hàm đó quyết định — xem chi tiết từng nhánh trong file đó.
    //
    // `?loggedOut=1` clear khỏi URL NGAY (đồng bộ, TRƯỚC khi gọi
    // runLoginPageEntry) — tải lại trang (F5) trong lúc logout() còn đang
    // chạy dở không được lặp lại bước đăng xuất này lần nữa.
    var params = new URLSearchParams(global.location.search);
    var loggedOutParam = params.get('loggedOut');
    var reasonParam = params.get('reason');
    if (loggedOutParam === '1') {
      global.history.replaceState(null, '', global.location.pathname);
    }

    global.AgriChain.runLoginPageEntry(
      { reason: reasonParam, loggedOut: loggedOutParam, isLoggedIn: api.isLoggedIn() },
      {
        logout: function () { return api.auth.logout(); },
        clearSession: function () { api.clearSession(); },
        verifySession: function () { return api.auth.me(); },
        navigate: function (accountType) {
          global.location.replace(redirectTarget(accountType));
        }
      }
    );
    // KHÔNG chờ Promise trên rồi mới gắn sự kiện submit — mọi nhánh có thể
    // điều hướng đi (`redirected`) đều chạy bất đồng bộ, trong lúc chờ vẫn
    // cần form đăng nhập dùng được ngay (ca `show-form`/`logged-out`).

    var submitButton = form.querySelector('button[type="submit"]');
    var submitLabel = submitButton.textContent;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      hideAlert();
      clearErrors(form);

      var email = document.getElementById('login-email');
      var password = document.getElementById('login-password');
      var remember = form.querySelector('[name="remember"]');

      var problems = [];
      if (!isEmail(email.value.trim())) {
        showError(email, 'Nhập email hợp lệ.');
        problems.push(email);
      }
      if (!password.value) {
        showError(password, 'Nhập mật khẩu.');
        problems.push(password);
      }
      if (problems.length) {
        problems[0].focus();
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = 'Đang đăng nhập...';

      api.auth.login(email.value.trim(), password.value, remember && remember.checked).then(function (user) {
        global.location.href = redirectTarget(user.account_type);
      }).catch(function (error) {
        submitButton.disabled = false;
        submitButton.textContent = submitLabel;
        showAlert(error.message);
        password.value = '';
        password.focus();
      });
    });
  }

  /* --- Đăng ký ---------------------------------------------------------------
     ĐÃ CHUYỂN SANG BACKEND THẬT (2026-09-11) qua api.auth.registerCustomer()/
     registerBusiness() — xem khuôn RegisterCustomerRequest/
     RegisterBusinessRequest đã xác nhận qua Swagger trong CLAUDE.md. */

  // Ánh xạ tên field backend trả về trong lỗi (details.field) sang đúng input
  // trên form — field lồng trong object "organization" (RegisterBusinessRequest)
  // trả về dạng "organization.name" (Pydantic nối loc bằng '.', xem
  // app/errors.py:_field_path của agrichain-api), không phải "name" trần.
  function registerFieldNodeFor(fieldName) {
    var map = {
      email: 'register-email',
      password: 'register-password',
      full_name: 'register-full-name',
      phone: 'register-phone',
      'organization.name': 'register-org-name',
      'organization.tax_code': 'register-tax-code',
      'organization.phone': 'register-org-phone',
      'organization.address': 'register-org-address'
    };
    var id = map[fieldName];
    return id ? document.getElementById(id) : null;
  }

  function setupRegister() {
    var form = document.getElementById('register-form');
    if (!form) return;

    var submitButton = form.querySelector('button[type="submit"]');
    var submitLabel = submitButton.textContent;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      hideAlert();
      clearErrors(form);

      var type = form.querySelector('input[name="type"]:checked').value; // 'customer' | 'business'
      var isBusinessType = type === 'business';

      var orgName = document.getElementById('register-org-name');
      var fullName = document.getElementById('register-full-name');
      var phone = document.getElementById('register-phone');
      var email = document.getElementById('register-email');
      var password = document.getElementById('register-password');
      var confirm = document.getElementById('register-confirm');

      var problems = [];

      if (isBusinessType && !orgName.value.trim()) {
        showError(orgName, 'Nhập tên đơn vị.');
        problems.push(orgName);
      }
      if (!fullName.value.trim()) {
        showError(fullName, 'Nhập họ tên.');
        problems.push(fullName);
      }
      if (!isEmail(email.value.trim())) {
        showError(email, 'Nhập email hợp lệ.');
        problems.push(email);
      }

      var missing = passwordProblems(password.value);
      if (missing.length) {
        showError(password, 'Mật khẩu còn thiếu: ' + missing.join(', ') + '.');
        problems.push(password);
      }
      if (confirm.value !== password.value) {
        showError(confirm, 'Hai mật khẩu chưa khớp nhau.');
        problems.push(confirm);
      }

      if (problems.length) {
        problems[0].focus();
        return;
      }

      var payload = {
        email: email.value.trim(),
        password: password.value,
        full_name: fullName.value.trim(),
        phone: phone.value.trim() || null
      };

      var registerRequest;
      if (isBusinessType) {
        // 4 field Đơn vị PHẢI gói vào object con "organization" — khuôn thật
        // của RegisterBusinessRequest, không phải field rời ở top-level.
        payload.organization = {
          name: orgName.value.trim(),
          tax_code: document.getElementById('register-tax-code').value.trim() || null,
          phone: document.getElementById('register-org-phone').value.trim() || null,
          address: document.getElementById('register-org-address').value.trim() || null
        };
        registerRequest = api.auth.registerBusiness(payload);
      } else {
        registerRequest = api.auth.registerCustomer(payload);
      }

      submitButton.disabled = true;
      submitButton.textContent = 'Đang tạo tài khoản...';

      registerRequest
        // Đăng ký xong tự đăng nhập luôn — bắt gõ lại email/mật khẩu là thừa
        // một bước. remember=true (không có checkbox "Ghi nhớ đăng nhập" ở
        // form này) để phiên sống sót qua đóng/mở trình duyệt, giống hành vi
        // "vào thẳng app" của luồng giả lập cũ.
        .then(function () {
          return api.auth.login(email.value.trim(), password.value, true);
        })
        .then(function (user) {
          global.location.href = redirectTarget(user.account_type);
        })
        .catch(function (error) {
          submitButton.disabled = false;
          submitButton.textContent = submitLabel;

          if (error.details && error.details.field) {
            var field = registerFieldNodeFor(error.details.field);
            if (field) {
              showError(field, error.message);
              field.focus();
              return;
            }
          }
          showAlert(error.message);
        });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    global.AgriChain.setupPasswordToggles();
    global.AgriChain.setupPasswordRules();
    setupTypeTabs();
    setupLogin();
    setupRegister();
  });
})(window);