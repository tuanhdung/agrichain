/* ==========================================================================
   AgriChain — Trang Hồ sơ (ho-so.html)
   Xem/sửa thông tin cá nhân của tài khoản đang đăng nhập (collection
   "users" — KHÁC "orgUsers" của tai-khoan.html) + đổi mật khẩu. Mở từ menu
   tài khoản (bấm avatar ở topbar), không phải mục sidebar.
   Nạp SAU js/store.js, js/app-shell.js, js/password-field.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var store = global.AgriChain.store;
  var session = store.getSession();

  var ROLE_LABELS = { org: 'Quản trị Đơn vị', customer: 'Khách hàng' };
  var GENDERS = [
    { key: 'male', label: 'Nam' },
    { key: 'female', label: 'Nữ' },
    { key: 'other', label: 'Khác' }
  ];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function formatDob(value) {
    if (!value) return '';
    var parts = value.split('-');
    if (parts.length !== 3) return value;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  var genderSelect = document.getElementById('profile-gender');

  function fillGenders() {
    var placeholder = el('option', null, '— Chọn giới tính —');
    placeholder.value = '';
    genderSelect.appendChild(placeholder);
    GENDERS.forEach(function (gender) {
      var option = el('option', null, gender.label);
      option.value = gender.key;
      genderSelect.appendChild(option);
    });
  }

  /* --- Hiển thị thông tin ------------------------------------------------------ */

  function currentUser() {
    return store.find('users', session.id) || session;
  }

  function renderProfile() {
    var user = currentUser();
    var displayName = user.fullName || user.email;

    document.querySelector('[data-profile-initials]').textContent = global.AgriChain.initials(displayName);
    document.querySelector('[data-profile-name]').textContent = displayName;
    document.querySelector('[data-profile-email]').textContent = '@' + user.email;
    document.querySelector('[data-profile-role]').textContent = ROLE_LABELS[user.type] || 'Người dùng';

    document.querySelector('[data-profile-contact-email]').textContent = user.email;

    var phoneRow = document.querySelector('[data-profile-phone-row]');
    phoneRow.hidden = !user.phone;
    if (user.phone) document.querySelector('[data-profile-contact-phone]').textContent = user.phone;

    var dobRow = document.querySelector('[data-profile-dob-row]');
    dobRow.hidden = !user.dob;
    if (user.dob) document.querySelector('[data-profile-contact-dob]').textContent = formatDob(user.dob);

    document.getElementById('profile-full-name').value = user.fullName || '';
    document.getElementById('profile-phone').value = user.phone || '';
    document.getElementById('profile-dob').value = user.dob || '';
    genderSelect.value = user.gender || '';
    document.getElementById('profile-bio').value = user.bio || '';
  }

  /* --- Tab "Thông tin cá nhân" -------------------------------------------------- */

  function clearInfoErrors() {
    var form = document.getElementById('profile-info-form');
    form.querySelectorAll('.field__error').forEach(function (node) { node.remove(); });
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (node) {
      node.removeAttribute('aria-invalid');
    });
  }

  function handleProfileSubmit(event) {
    event.preventDefault();
    clearInfoErrors();

    var fullNameInput = document.getElementById('profile-full-name');
    if (!fullNameInput.value.trim()) {
      fullNameInput.setAttribute('aria-invalid', 'true');
      fullNameInput.parentNode.appendChild(el('p', 'field__error', 'Nhập họ và tên.'));
      fullNameInput.focus();
      return;
    }

    var data = new FormData(event.target);
    var payload = {
      fullName: String(data.get('fullName') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      dob: String(data.get('dob') || ''),
      gender: String(data.get('gender') || ''),
      bio: String(data.get('bio') || '').trim()
    };

    store.update('users', session.id, payload);
    store.updateSession(payload);
    renderProfile();
    global.AgriChain.toast('Đã cập nhật hồ sơ.');
  }

  /* --- Tab "Bảo mật" -------------------------------------------------------------- */

  function clearPasswordErrors() {
    var form = document.getElementById('profile-security-form');
    form.querySelectorAll('.field__error').forEach(function (node) { node.remove(); });
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (node) {
      node.removeAttribute('aria-invalid');
    });
  }

  function showPasswordError(field, message) {
    field.setAttribute('aria-invalid', 'true');
    field.parentNode.appendChild(el('p', 'field__error', message));
  }

  function handlePasswordSubmit(event) {
    event.preventDefault();
    clearPasswordErrors();

    var passwordInput = document.getElementById('profile-new-password');
    var confirmInput = document.getElementById('profile-confirm-password');

    var problems = global.AgriChain.passwordProblems(passwordInput.value);
    if (problems.length) {
      showPasswordError(passwordInput, 'Mật khẩu cần thêm: ' + problems.join(', ') + '.');
      passwordInput.focus();
      return;
    }
    if (passwordInput.value !== confirmInput.value) {
      showPasswordError(confirmInput, 'Mật khẩu xác nhận không khớp.');
      confirmInput.focus();
      return;
    }

    store.changePassword(session.id, passwordInput.value).then(function () {
      event.target.reset();
      global.AgriChain.toast('Đã đổi mật khẩu.');
    });
  }

  /* --- Khởi động -------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    if (!session) return; // app-shell.js đã tự chuyển hướng về trang đăng nhập

    fillGenders();
    renderProfile();
    global.AgriChain.setupPasswordToggles();
    global.AgriChain.setupPasswordRules();

    document.getElementById('profile-info-form').addEventListener('submit', handleProfileSubmit);
    document.getElementById('profile-security-form').addEventListener('submit', handlePasswordSubmit);
  });
})(window);
