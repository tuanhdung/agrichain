/* ==========================================================================
   AgriChain — Đăng nhập / Đăng ký
   Một file dùng cho cả hai trang; tự nhận biết theo id của form có mặt.
   Nạp SAU js/chain.js, js/store.js và js/password-field.js (nút hiện/ẩn +
   điều kiện mật khẩu dùng chung, xem file đó).

   NHẮC LẠI: đây không phải xác thực thật. Toàn bộ tài khoản nằm trong
   localStorage của chính trình duyệt này. Không dùng cho dữ liệu thật.
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
    // Chỉ chấp nhận đường dẫn nội bộ dạng "ten-trang.html". Không cho URL tuyệt
    // đối hay "//..." — tránh biến tham số này thành chỗ chuyển hướng ra ngoài.
    if (target && /^[\w.-]+\.html(\?.*)?$/.test(target)) return target;
    return 'index.html';
  }

  /* --- Đăng nhập (đã chuyển sang backend thật qua js/api.js) ----------------
     Giữ nguyên "remember" trên giao diện dù API hiện chưa dùng tới (token
     luôn lưu localStorage — xem ghi chú nợ kỹ thuật ở js/api.js) — bỏ tuỳ
     chọn này đi sẽ là một thay đổi UX không cần thiết ở giai đoạn này. */

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

      api.auth.login(email.value.trim(), password.value).then(function () {
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