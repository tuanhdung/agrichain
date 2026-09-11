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

  // 16 trang dùng khung quản trị (app-shell: sidebar + topbar) — tài khoản
  // 'customer' không có quyền gì ở đây (RBAC chặn = 403 nếu cố vào), nên
  // KHÔNG được phép là đích ?redirect= cho account_type này, dù link redirect
  // có khớp regex an toàn ở dưới. Xem redirectTarget(). NGUỒN THAM CHIẾU DUY
  // NHẤT cho danh sách 16 trang này trong toàn dự án — nơi khác cần cùng
  // danh sách (VD gắn AgriChain.api.requireBusiness() vào <head> từng trang,
  // xem CLAUDE.md) phải đối chiếu lại đúng mảng này, không gõ tay lại.
  var ADMIN_SHELL_PAGES = [
    'nong-trai.html', 'nong-trai-chi-tiet.html', 'vat-tu.html', 'mau-quy-trinh.html',
    'lo-hang.html', 'tai-khoan.html', 'ho-so.html', 'goi-phan-mem.html', 'lich-su-mua-goi.html',
    'thuong-mai-tong-quan.html', 'thuong-mai-san-pham.html', 'thuong-mai-don-hang.html',
    'thuong-mai-van-chuyen.html', 'thuong-mai-nhap-hang.html', 'thuong-mai-may-tinh-tien.html',
    'thuong-mai-thiet-lap.html'
  ];

  /* --- Tiện ích chung ------------------------------------------------------ */

  function showAlert(message) {
    var alert = document.querySelector('[data-auth-alert]');
    if (!alert) return;
    alert.querySelector('[data-auth-alert-message]').textContent = message;
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
     accountType: 'customer' | 'business' | null/undefined (chưa biết — coi
     như 'business' để giữ đúng hành vi mặc định cũ, tránh phá vỡ luồng hiện
     có ở những nơi gọi redirectTarget() mà chưa kịp truyền account_type). */

  function defaultTargetFor(accountType) {
    // index.html chỉ là trang giới thiệu, không nằm trong app-shell nên
    // không hợp lý làm đích đến sau khi đăng nhập cho CẢ 2 loại tài khoản.
    // agriverse-3d.html (không phải ecommerce.html) — đúng trang thương mại
    // điện tử ĐANG DÙNG THẬT của dự án từ 2026-09-08 (menu header/footer
    // "E-commerce" đã trỏ sang đây, xem CLAUDE.md); ecommerce.html giờ mồ
    // côi, không còn nơi nào trỏ tới (2026-09-11).
    return accountType === 'customer' ? 'agriverse-3d.html' : 'nong-trai.html';
  }

  function redirectTarget(accountType) {
    var params = new URLSearchParams(global.location.search);
    var target = params.get('redirect');
    // Chỉ chấp nhận đường dẫn nội bộ dạng "ten-trang.html", bắt đầu bằng chữ
    // cái. Không cho URL tuyệt đối ("http://"/"https://") hay "//..." — tránh
    // biến tham số này thành chỗ chuyển hướng ra ngoài site (open redirect).
    if (target && /^[A-Za-z][\w.-]*\.html(\?.*)?$/.test(target)) {
      // Bản vá (2026-09-11): tài khoản 'customer' không có quyền gì ở khu
      // quản trị (RBAC backend trả 403 khi tải dữ liệu — đã thấy tận mắt khi
      // ?redirect= trỏ vào nong-trai.html) — dù link khớp regex an toàn ở
      // trên, vẫn phải bỏ qua nếu trỏ vào 1 trong 15 trang app-shell, dùng
      // mặc định theo account_type thay vào đó.
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

    // Đã đăng nhập rồi (còn access token) thì vào thẳng, khỏi bắt đăng nhập lại.
    if (api.isLoggedIn()) {
      global.location.replace(redirectTarget(api.getAccountType()));
      return;
    }

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