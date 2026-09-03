/* ==========================================================================
   AgriChain — Trang Quản lý Tài khoản (tai-khoan.html)
   Danh sách người dùng trong Đơn vị + modal thêm người dùng + modal phân
   quyền theo từng phân hệ. Dữ liệu lưu qua AgriChain.store (collection
   "orgUsers", mock localStorage — xem ghi chú bảo mật ở handleUserSubmit()).
   Nạp SAU js/store.js, js/app-shell.js và js/password-field.js (nút hiện/ẩn
   + điều kiện mật khẩu dùng chung).
   ========================================================================== */

(function (global) {
  'use strict';

  var store = global.AgriChain.store;

  var MODULES = [
    { key: 'farms',          label: 'Nông trại',   icon: 'icon-seedling' },
    { key: 'certifications', label: 'Chứng nhận',  icon: 'icon-qr-code' },
    { key: 'seasons',        label: 'Mùa vụ',      icon: 'icon-calendar' },
    { key: 'supplies',       label: 'Vật tư',      icon: 'icon-box' },
    { key: 'logs',           label: 'Nhật ký',     icon: 'icon-file-text' }
  ];

  var ACTIONS = [
    { key: 'view',   label: 'Xem' },
    { key: 'add',    label: 'Thêm' },
    { key: 'edit',   label: 'Sửa' },
    { key: 'delete', label: 'Xoá' }
  ];

  function defaultPermissions() {
    var permissions = {};
    MODULES.forEach(function (module) {
      var actions = {};
      ACTIONS.forEach(function (action) { actions[action.key] = false; });
      permissions[module.key] = actions;
    });
    return permissions;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function svgIcon(name, className) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', className || 'icon icon--sm');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', 'icons/sprite.svg#' + name);
    svg.appendChild(use);
    return svg;
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /* --- Danh sách người dùng -------------------------------------------------- */

  var tablePanel = document.querySelector('[data-user-table-panel]');
  var tableBody = document.querySelector('[data-user-table-body]');
  var emptyNode = document.querySelector('[data-user-empty]');

  function userRow(user) {
    var tr = el('tr');

    var avatarCell = el('td');
    avatarCell.appendChild(el('span', 'avatar avatar--sm', global.AgriChain.initials(user.fullName)));
    tr.appendChild(avatarCell);

    tr.appendChild(el('td', null, user.email));
    tr.appendChild(el('td', 'table__name', user.fullName));

    var actionsCell = el('td');
    var wrap = el('div', 'table__actions');

    var permButton = el('button', 'icon-btn icon-btn--info');
    permButton.type = 'button';
    permButton.setAttribute('aria-label', 'Phân quyền cho ' + user.fullName);
    permButton.setAttribute('data-tooltip', 'Phân quyền');
    permButton.appendChild(svgIcon('icon-shield-check'));
    permButton.addEventListener('click', function () { openPermissionModal(user); });
    wrap.appendChild(permButton);

    var delButton = el('button', 'icon-btn icon-btn--danger');
    delButton.type = 'button';
    delButton.setAttribute('aria-label', 'Xoá ' + user.fullName);
    delButton.setAttribute('data-tooltip', 'Xoá');
    delButton.appendChild(svgIcon('icon-trash'));
    delButton.addEventListener('click', function () { deleteUser(user); });
    wrap.appendChild(delButton);

    actionsCell.appendChild(wrap);
    tr.appendChild(actionsCell);

    return tr;
  }

  function render() {
    var users = store.list('orgUsers');

    tableBody.textContent = '';
    if (!users.length) {
      tablePanel.hidden = true;
      emptyNode.hidden = false;
      return;
    }

    emptyNode.hidden = true;
    tablePanel.hidden = false;
    users.forEach(function (user) {
      tableBody.appendChild(userRow(user));
    });
  }

  function deleteUser(user) {
    global.AgriChain.confirm(
      'Xoá người dùng "' + user.fullName + '" (' + user.email + ')? Hành động này không thể hoàn tác.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      store.remove('orgUsers', user.id);
      render();
      global.AgriChain.toast('Đã xoá người dùng.');
    });
  }

  /* --- Modal: Thêm người dùng ------------------------------------------------ */

  var userModal = document.getElementById('user-modal');
  var userForm = document.getElementById('user-form');

  function openUserModal() {
    userForm.reset();
    clearErrors(userForm);
    userModal.showModal();
    document.getElementById('user-email').focus();
  }

  function closeUserModal() {
    userModal.close();
  }

  function clearErrors(form) {
    form.querySelectorAll('.field__error').forEach(function (node) { node.remove(); });
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (node) {
      node.removeAttribute('aria-invalid');
    });
  }

  function showError(field, message) {
    field.setAttribute('aria-invalid', 'true');
    var error = el('p', 'field__error', message);
    var host = field.closest('.field') || field.parentNode;
    host.appendChild(error);
  }

  function validateUser() {
    clearErrors(userForm);
    var problems = [];

    var email = document.getElementById('user-email');
    var fullName = document.getElementById('user-full-name');
    var password = document.getElementById('user-password');

    if (!isEmail(email.value.trim())) {
      showError(email, 'Nhập email hợp lệ.');
      problems.push(email);
    } else {
      var duplicate = store.list('orgUsers').some(function (user) {
        return user.email.toLowerCase() === email.value.trim().toLowerCase();
      });
      if (duplicate) {
        showError(email, 'Email này đã có trong danh sách người dùng.');
        problems.push(email);
      }
    }

    if (!fullName.value.trim()) {
      showError(fullName, 'Nhập họ tên.');
      problems.push(fullName);
    }

    var missing = global.AgriChain.passwordProblems(password.value);
    if (missing.length) {
      showError(password, 'Mật khẩu còn thiếu: ' + missing.join(', ') + '.');
      problems.push(password);
    }

    if (problems.length) {
      problems[0].focus();
      return false;
    }
    return true;
  }

  function handleUserSubmit(event) {
    event.preventDefault();
    if (!validateUser()) return;

    var data = new FormData(userForm);

    // BẢO MẬT: đây là trang demo tĩnh, không có backend thật đứng sau. Mật
    // khẩu CHỈ dùng để validate định dạng phía trình duyệt (đã xong ở
    // validateUser() qua passwordProblems()) rồi bỏ luôn — KHÔNG lưu xuống
    // localStorage dù ở dạng gì (kể cả "giả vờ" hash bằng chain.js, vì đó
    // vẫn có thể đảo ngược/so khớp được, không phải hashing mật khẩu đúng
    // nghĩa). Xác thực đăng nhập thật cho những người dùng này chờ backend
    // thật đảm nhiệm sau này.
    store.insert('orgUsers', {
      email: String(data.get('email')).trim(),
      fullName: String(data.get('fullName')).trim(),
      permissions: defaultPermissions()
    });

    closeUserModal();
    render();
    global.AgriChain.toast('Đã thêm người dùng.');
  }

  /* --- Modal: Phân quyền ------------------------------------------------------ */

  var permissionModal = document.getElementById('permission-modal');
  var permissionTableBody = document.querySelector('[data-permission-table-body]');
  var permissionAvatar = document.querySelector('[data-permission-avatar]');
  var permissionName = document.querySelector('[data-permission-name]');
  var permissionEmail = document.querySelector('[data-permission-email]');

  var editingPermissionUserId = null;

  function permissionRow(module) {
    var tr = el('tr');

    var moduleCell = el('td');
    var moduleWrap = el('div', 'permission-table__module');
    moduleWrap.appendChild(svgIcon(module.icon));
    moduleWrap.appendChild(el('span', null, module.label));
    moduleCell.appendChild(moduleWrap);
    tr.appendChild(moduleCell);

    ACTIONS.forEach(function (action) {
      var cell = el('td');
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'checkbox__input';
      checkbox.setAttribute('data-module', module.key);
      checkbox.setAttribute('data-action', action.key);
      checkbox.setAttribute('aria-label',
        'Quyền ' + action.label.toLowerCase() + ' phân hệ ' + module.label);
      checkbox.addEventListener('change', function () {
        syncViewPermission(module.key, action.key, checkbox.checked);
      });
      cell.appendChild(checkbox);
      tr.appendChild(cell);
    });

    return tr;
  }

  function permissionCheckbox(moduleKey, actionKey) {
    return permissionTableBody.querySelector(
      'input[data-module="' + moduleKey + '"][data-action="' + actionKey + '"]');
  }

  // Thêm/Sửa/Xoá không có nghĩa nếu không xem được, nên 2 chiều đều khoá
  // theo Xem: tick Thêm/Sửa/Xoá thì tự tick luôn Xem; bỏ Xem thì Thêm/Sửa/
  // Xoá cũng tự bỏ theo — khỏi bao giờ có tổ hợp "sửa được nhưng không xem
  // được" vô lý.
  function syncViewPermission(moduleKey, actionKey, checked) {
    if (actionKey === 'view') {
      if (checked) return;
      ['add', 'edit', 'delete'].forEach(function (otherKey) {
        var other = permissionCheckbox(moduleKey, otherKey);
        if (other) other.checked = false;
      });
    } else if (checked) {
      var view = permissionCheckbox(moduleKey, 'view');
      if (view) view.checked = true;
    }
  }

  function openPermissionModal(user) {
    editingPermissionUserId = user.id;

    permissionAvatar.textContent = global.AgriChain.initials(user.fullName);
    permissionName.textContent = user.fullName;
    permissionEmail.textContent = user.email;

    permissionTableBody.textContent = '';
    MODULES.forEach(function (module) {
      permissionTableBody.appendChild(permissionRow(module));
    });

    var permissions = user.permissions || defaultPermissions();
    permissionTableBody.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox) {
      var moduleKey = checkbox.getAttribute('data-module');
      var actionKey = checkbox.getAttribute('data-action');
      checkbox.checked = Boolean(permissions[moduleKey] && permissions[moduleKey][actionKey]);
    });

    permissionModal.showModal();
  }

  function closePermissionModal() {
    permissionModal.close();
    editingPermissionUserId = null;
  }

  function handlePermissionSave() {
    if (!editingPermissionUserId) return;

    var permissions = defaultPermissions();
    permissionTableBody.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox) {
      var moduleKey = checkbox.getAttribute('data-module');
      var actionKey = checkbox.getAttribute('data-action');
      if (permissions[moduleKey]) permissions[moduleKey][actionKey] = checkbox.checked;
    });

    store.update('orgUsers', editingPermissionUserId, { permissions: permissions });
    closePermissionModal();
    global.AgriChain.toast('Đã lưu phân quyền.');
  }

  /* --- Khởi động -------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    render();

    document.querySelectorAll('[data-open-user-form]').forEach(function (button) {
      button.addEventListener('click', openUserModal);
    });
    document.querySelectorAll('[data-close-user-form]').forEach(function (button) {
      button.addEventListener('click', closeUserModal);
    });
    userForm.addEventListener('submit', handleUserSubmit);

    document.querySelectorAll('[data-close-permission]').forEach(function (button) {
      button.addEventListener('click', closePermissionModal);
    });
    document.querySelector('[data-save-permission]').addEventListener('click', handlePermissionSave);
  });
})(window);
