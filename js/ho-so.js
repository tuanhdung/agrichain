/* ==========================================================================
   AgriChain — Trang Hồ sơ (ho-so.html)
   Xem/sửa thông tin cá nhân của tài khoản đang đăng nhập + đổi mật khẩu. Mở
   từ menu tài khoản (bấm avatar ở topbar), không phải mục sidebar.

   ĐÃ CHUYỂN SANG BACKEND THẬT (2026-09-12) — vá bug thật vừa phát hiện:
   trang từng đọc store.getSession() (phiên localStorage GIẢ LẬP, hoàn toàn
   độc lập với phiên API đăng nhập thật) nên có thể hiện đúng dữ liệu rác cũ
   còn sót trong localStorage của MỘT NGƯỜI KHÁC, không phải người đang đăng
   nhập — dù sidebar/topbar (đã dùng API từ trước) vẫn hiện đúng tên thật.
   Giờ đọc/ghi hoàn toàn qua js/api.js:
     - Đọc dữ liệu ban đầu từ AgriChain.api.getUser() (đã có sẵn trong
       storage từ lúc đăng nhập/lúc /auth/me chạy, không gọi lại API).
     - Lưu tên/SĐT qua PATCH /auth/me (api.auth.updateMe()) — KHÁC
       PATCH /users/{id} (api.users.update(), dành cho quản trị sửa NGƯỜI
       KHÁC, yêu cầu quyền users.edit mà không phải vai trò nào cũng có —
       xem CLAUDE.md phía agrichain-api mục "Tự sửa hồ sơ — PATCH /auth/me").
     - Đổi mật khẩu qua POST /auth/change-password (api.auth.changePassword(),
       yêu cầu nhập đúng mật khẩu hiện tại) — KHÁC
       POST /users/{id}/reset-password (dành cho admin đặt lại mật khẩu
       NGƯỜI KHÁC, không cần biết mật khẩu cũ, không dùng nhầm cho ca này).

   3 field dob/gender/bio (Ngày sinh/Giới tính/Giới thiệu) đã BỎ HẲN khỏi cả
   HTML lẫn file này — backend thật (UserOut/MeUpdate) KHÔNG có 3 field này,
   chỉ có full_name/phone. Đây từng là field CHỈ tồn tại ở store.js
   (localStorage giả lập) — không tự bịa ra chỗ lưu nào khác cho chúng.

   Nạp SAU js/app-shell.js, js/api-config.js, js/api.js, js/password-field.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var api = global.AgriChain.api;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  /* --- Hiển thị thông tin ------------------------------------------------------ */

  function renderProfile() {
    var user = api.getUser() || {};
    var displayName = user.full_name || user.email;

    document.querySelector('[data-profile-initials]').textContent = global.AgriChain.initials(displayName);
    document.querySelector('[data-profile-name]').textContent = displayName;
    document.querySelector('[data-profile-email]').textContent = '@' + user.email;
    // role_name đọc thẳng từ UserOut thật (VD "Quản trị viên", "Nông dân")
    // — không cần bảng tra tên riêng như hồi còn store.js (chỉ có 2 giá trị
    // 'org'/'customer' cố định).
    document.querySelector('[data-profile-role]').textContent = user.role_name || 'Người dùng';

    document.querySelector('[data-profile-contact-email]').textContent = user.email;

    var phoneRow = document.querySelector('[data-profile-phone-row]');
    phoneRow.hidden = !user.phone;
    if (user.phone) document.querySelector('[data-profile-contact-phone]').textContent = user.phone;

    document.getElementById('profile-full-name').value = user.full_name || '';
    document.getElementById('profile-phone').value = user.phone || '';
  }

  /* --- Tab "Thông tin cá nhân" -------------------------------------------------- */

  function clearInfoErrors() {
    var form = document.getElementById('profile-info-form');
    form.querySelectorAll('.field__error').forEach(function (node) { node.remove(); });
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (node) {
      node.removeAttribute('aria-invalid');
    });
  }

  function showError(field, message) {
    field.setAttribute('aria-invalid', 'true');
    field.parentNode.appendChild(el('p', 'field__error', message));
  }

  // Ánh xạ tên field backend trả về trong lỗi (details.field) sang đúng
  // input trên form — khớp MeUpdate thật (chỉ full_name/phone).
  function infoFieldNodeFor(fieldName) {
    var map = { full_name: 'profile-full-name', phone: 'profile-phone' };
    var id = map[fieldName];
    return id ? document.getElementById(id) : null;
  }

  function handleProfileSubmit(event) {
    event.preventDefault();
    clearInfoErrors();

    var fullNameInput = document.getElementById('profile-full-name');
    if (!fullNameInput.value.trim()) {
      showError(fullNameInput, 'Nhập họ và tên.');
      fullNameInput.focus();
      return;
    }

    var data = new FormData(event.target);
    var payload = {
      full_name: String(data.get('fullName') || '').trim(),
      phone: String(data.get('phone') || '').trim() || null
    };

    api.auth.updateMe(payload).then(function () {
      renderProfile();
      global.AgriChain.toast('Đã cập nhật hồ sơ.');
    }).catch(function (err) {
      var field = err.details && infoFieldNodeFor(err.details.field);
      if (field) {
        showError(field, err.message);
        field.focus();
      } else {
        global.AgriChain.toast(err.message);
      }
    });
  }

  /* --- Tab "Bảo mật" -------------------------------------------------------------- */

  function clearPasswordErrors() {
    var form = document.getElementById('profile-security-form');
    form.querySelectorAll('.field__error').forEach(function (node) { node.remove(); });
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (node) {
      node.removeAttribute('aria-invalid');
    });
  }

  function handlePasswordSubmit(event) {
    event.preventDefault();
    clearPasswordErrors();

    var currentInput = document.getElementById('profile-current-password');
    var passwordInput = document.getElementById('profile-new-password');
    var confirmInput = document.getElementById('profile-confirm-password');

    if (!currentInput.value) {
      showError(currentInput, 'Nhập mật khẩu hiện tại.');
      currentInput.focus();
      return;
    }

    var problems = global.AgriChain.passwordProblems(passwordInput.value);
    if (problems.length) {
      showError(passwordInput, 'Mật khẩu cần thêm: ' + problems.join(', ') + '.');
      passwordInput.focus();
      return;
    }
    if (passwordInput.value !== confirmInput.value) {
      showError(confirmInput, 'Mật khẩu xác nhận không khớp.');
      confirmInput.focus();
      return;
    }

    api.auth.changePassword(currentInput.value, passwordInput.value).then(function () {
      event.target.reset();
      global.AgriChain.toast('Đã đổi mật khẩu.');
    }).catch(function (err) {
      // details.field: 'old_password' (sai mật khẩu hiện tại) hoặc
      // 'new_password' (không đạt quy tắc độ mạnh) — khớp ChangePasswordRequest.
      if (err.details && err.details.field === 'old_password') {
        showError(currentInput, err.message);
        currentInput.focus();
      } else if (err.details && err.details.field === 'new_password') {
        showError(passwordInput, err.message);
        passwordInput.focus();
      } else {
        global.AgriChain.toast(err.message);
      }
    });
  }

  /* --- Khởi động -------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    renderProfile();
    global.AgriChain.setupPasswordToggles();
    global.AgriChain.setupPasswordRules();

    document.getElementById('profile-info-form').addEventListener('submit', handleProfileSubmit);
    document.getElementById('profile-security-form').addEventListener('submit', handlePasswordSubmit);
  });
})(window);
