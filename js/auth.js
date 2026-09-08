/* ==========================================================================
   AgriChain — Đăng nhập / Đăng ký
   Một file dùng cho cả hai trang; tự nhận biết theo id của form có mặt.
   Nạp SAU js/chain.js, js/store.js, js/api-config.js, js/api.js và
   js/password-field.js (nút hiện/ẩn + điều kiện mật khẩu dùng chung, xem
   file đó).

   Đăng nhập (setupLogin) ĐÃ CHUYỂN sang backend thật qua js/api.js — xem
   mục "Kết nối backend" trong CLAUDE.md. Đăng ký (setupRegister) VẪN CÒN
   giả lập: toàn bộ tài khoản đăng ký qua đây nằm trong localStorage của
   chính trình duyệt này, không có máy chủ nào kiểm tra — không dùng cho
   dữ liệu thật cho tới khi luồng đăng ký cũng được chuyển sang API.
   ========================================================================== */

(function (global) {
  'use strict';

  var store = global.AgriChain.store;
  var api = global.AgriChain.api;
  var passwordProblems = global.AgriChain.passwordProblems;

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
        // một ô người dùng còn không nhìn thấy.
        block.querySelectorAll('input, select, textarea').forEach(function (input) {
          if (active) input.setAttribute('required', '');
          else input.removeAttribute('required');
        });
      });
    }

    radios.forEach(function (radio) {
      radio.addEventListener('change', apply);
    });
    apply();
  }

  /* --- Sau khi đăng nhập: về đâu ------------------------------------------- */

  function redirectTarget() {
    var params = new URLSearchParams(global.location.search);
    var target = params.get('redirect');
    // Chỉ chấp nhận đường dẫn nội bộ dạng "ten-trang.html", bắt đầu bằng chữ
    // cái. Không cho URL tuyệt đối ("http://"/"https://") hay "//..." — tránh
    // biến tham số này thành chỗ chuyển hướng ra ngoài site (open redirect).
    if (target && /^[A-Za-z][\w.-]*\.html(\?.*)?$/.test(target)) return target;
    // Mặc định vào thẳng trang đầu tiên của khu quản trị — index.html chỉ là
    // trang giới thiệu, không nằm trong app-shell nên không hợp lý làm đích
    // đến sau khi đăng nhập.
    return 'nong-trai.html';
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
      global.location.replace(redirectTarget());
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

      api.auth.login(email.value.trim(), password.value, remember && remember.checked).then(function () {
        global.location.href = redirectTarget();
      }).catch(function (error) {
        submitButton.disabled = false;
        submitButton.textContent = submitLabel;
        showAlert(error.message);
        password.value = '';
        password.focus();
      });
    });
  }

  /* --- Đăng ký -------------------------------------------------------------- */

  function setupRegister() {
    var form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      hideAlert();
      clearErrors(form);

      var type = form.querySelector('input[name="type"]:checked').value;
      var orgName = document.getElementById('register-org-name');
      var taxCode = document.getElementById('register-tax-code');
      var fullName = document.getElementById('register-full-name');
      var email = document.getElementById('register-email');
      var password = document.getElementById('register-password');
      var confirm = document.getElementById('register-confirm');

      var problems = [];

      if (type === 'org') {
        if (!orgName.value.trim()) {
          showError(orgName, 'Nhập tên đơn vị.');
          problems.push(orgName);
        }
        if (!taxCode.value.trim()) {
          showError(taxCode, 'Nhập mã doanh nghiệp.');
          problems.push(taxCode);
        }
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

      store.registerUser({
        type: type,
        orgName: orgName.value,
        taxCode: taxCode.value,
        fullName: fullName.value,
        email: email.value,
        password: password.value
      }).then(function (user) {
        // Đăng ký xong vào thẳng app — bắt đăng nhập lại ngay là thừa một bước.
        store.setSession({
          id: user.id,
          type: user.type,
          fullName: user.fullName,
          orgName: user.orgName,
          email: user.email
        }, true);
        global.location.href = 'nong-trai.html';
      }).catch(function (error) {
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