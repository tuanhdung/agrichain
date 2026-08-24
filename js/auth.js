/* ==========================================================================
   AgriChain — Đăng nhập / Đăng ký
   Một file dùng cho cả hai trang; tự nhận biết theo id của form có mặt.
   Nạp SAU js/chain.js và js/store.js.

   NHẮC LẠI: đây không phải xác thực thật. Toàn bộ tài khoản nằm trong
   localStorage của chính trình duyệt này. Không dùng cho dữ liệu thật.
   ========================================================================== */

(function (global) {
  'use strict';

  var store = global.AgriChain.store;

  var PASSWORD_RULES = {
    length:  function (value) { return value.length >= 8; },
    upper:   function (value) { return /[A-Z]/.test(value); },
    digit:   function (value) { return /[0-9]/.test(value); },
    special: function (value) { return /[^A-Za-z0-9]/.test(value); }
  };

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

  /* --- Nút hiện/ẩn mật khẩu ------------------------------------------------ */

  function setupPasswordToggles() {
    document.querySelectorAll('[data-password-toggle]').forEach(function (button) {
      var input = document.getElementById(button.getAttribute('data-password-toggle'));
      if (!input) return;

      button.addEventListener('click', function () {
        var showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        button.setAttribute('aria-label', showing ? 'Hiện mật khẩu' : 'Ẩn mật khẩu');
        button.querySelector('use').setAttribute(
          'href',
          'icons/sprite.svg#' + (showing ? 'icon-eye' : 'icon-eye-off')
        );
        input.focus();
      });
    });
  }

  /* --- Danh sách điều kiện mật khẩu ---------------------------------------- */

  function setupPasswordRules() {
    var input = document.getElementById('register-password');
    var list = document.querySelector('[data-password-rules]');
    if (!input || !list) return;

    input.addEventListener('input', function () {
      var value = input.value;
      list.querySelectorAll('[data-rule]').forEach(function (item) {
        var rule = PASSWORD_RULES[item.getAttribute('data-rule')];
        item.classList.toggle('is-met', Boolean(rule && rule(value)));
      });
    });
  }

  function passwordProblems(value) {
    var missing = [];
    if (!PASSWORD_RULES.length(value)) missing.push('ít nhất 8 ký tự');
    if (!PASSWORD_RULES.upper(value)) missing.push('1 chữ hoa');
    if (!PASSWORD_RULES.digit(value)) missing.push('1 chữ số');
    if (!PASSWORD_RULES.special(value)) missing.push('1 ký tự đặc biệt');
    return missing;
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
    return 'nong-trai.html';
  }

  /* --- Đăng nhập ------------------------------------------------------------ */

  function setupLogin() {
    var form = document.getElementById('login-form');
    if (!form) return;

    // Đã đăng nhập rồi thì vào thẳng, khỏi bắt đăng nhập lại.
    if (store.getSession()) {
      global.location.replace(redirectTarget());
      return;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      hideAlert();
      clearErrors(form);

      var email = document.getElementById('login-email');
      var password = document.getElementById('login-password');
      var remember = form.querySelector('input[name="remember"]').checked;

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

      store.login(email.value.trim(), password.value).then(function (user) {
        store.setSession({
          id: user.id,
          type: user.type,
          fullName: user.fullName,
          orgName: user.orgName,
          email: user.email
        }, remember);
        global.location.href = redirectTarget();
      }).catch(function (error) {
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
    setupPasswordToggles();
    setupPasswordRules();
    setupTypeTabs();
    setupLogin();
    setupRegister();
  });
})(window);