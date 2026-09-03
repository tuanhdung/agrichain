/* ==========================================================================
   AgriChain — Ô mật khẩu dùng chung: nút hiện/ẩn (data-password-toggle) và
   danh sách điều kiện mật khẩu (data-password-rules). Tách ra khỏi
   js/auth.js để dùng lại được ở nơi khác (VD modal "Thêm người dùng" ở
   tai-khoan.html) mà không phải chép lại 2 hàm này — sửa 1 chỗ, mọi trang
   dùng chung đều cập nhật theo.
   Nạp TRƯỚC js/auth.js (dang-nhap.html/dang-ky.html) và trước js/tai-khoan.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var PASSWORD_RULES = {
    length:  function (value) { return value.length >= 8; },
    upper:   function (value) { return /[A-Z]/.test(value); },
    digit:   function (value) { return /[0-9]/.test(value); },
    special: function (value) { return /[^A-Za-z0-9]/.test(value); }
  };

  function passwordProblems(value) {
    var missing = [];
    if (!PASSWORD_RULES.length(value)) missing.push('ít nhất 8 ký tự');
    if (!PASSWORD_RULES.upper(value)) missing.push('1 chữ hoa');
    if (!PASSWORD_RULES.digit(value)) missing.push('1 chữ số');
    if (!PASSWORD_RULES.special(value)) missing.push('1 ký tự đặc biệt');
    return missing;
  }

  /* --- Nút hiện/ẩn mật khẩu --------------------------------------------------
     data-password-toggle="<id ô mật khẩu>" trên nút bấm. */
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

  /* --- Danh sách điều kiện mật khẩu ------------------------------------------
     data-password-rules="<id ô mật khẩu>" trên khối <ul> — mỗi khối tự trỏ
     tới đúng ô mật khẩu của nó qua id, nên nhiều khối trên cùng 1 trang (hoặc
     nhiều modal khác nhau) không đụng nhau. */
  function setupPasswordRules() {
    document.querySelectorAll('[data-password-rules]').forEach(function (list) {
      var input = document.getElementById(list.getAttribute('data-password-rules'));
      if (!input) return;

      input.addEventListener('input', function () {
        var value = input.value;
        list.querySelectorAll('[data-rule]').forEach(function (item) {
          var rule = PASSWORD_RULES[item.getAttribute('data-rule')];
          item.classList.toggle('is-met', Boolean(rule && rule(value)));
        });
      });
    });
  }

  global.AgriChain = global.AgriChain || {};
  global.AgriChain.passwordProblems = passwordProblems;
  global.AgriChain.setupPasswordToggles = setupPasswordToggles;
  global.AgriChain.setupPasswordRules = setupPasswordRules;
})(window);
