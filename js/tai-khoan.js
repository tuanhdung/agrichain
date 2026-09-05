/* ==========================================================================
   AgriChain — Trang Quản lý Tài khoản (tai-khoan.html)
   ĐÃ CHUYỂN SANG BACKEND THẬT (js/api.js) — không còn đọc/ghi qua
   AgriChain.store/collection "orgUsers" nữa. Danh sách người dùng phân
   trang + tìm kiếm qua GET /users; phân quyền theo VAI TRÒ (GET /roles,
   GET /permissions, PATCH /roles/{id}) — xem mục "Kết nối backend" và mục
   riêng về trang này trong CLAUDE.md, đặc biệt phần ghi chú "giả định cần
   xác nhận lại với /docs backend thật" (khuôn dữ liệu permission/role chưa
   được đặc tả chi tiết khi viết file này).
   Nạp SAU js/api-config.js, js/api.js, js/app-shell.js và js/password-field.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var api = global.AgriChain.api;

  var PAGE_SIZE = 10;
  var SEARCH_DEBOUNCE_MS = 300;

  // Thứ tự nhóm quyền hiển thị — trùng tên 5 phân hệ đã có trước khi chuyển
  // sang backend. GIẢ ĐỊNH group_name backend trả về khớp đúng các chuỗi
  // này (cần xác nhận lại với /docs) — nhóm nào backend trả về mà không có
  // trong mảng này vẫn được hiển thị, chỉ xếp xuống cuối theo alphabet.
  var GROUP_ORDER = ['Nông trại', 'Chứng nhận', 'Mùa vụ', 'Vật tư', 'Nhật ký'];
  var GROUP_ICONS = {
    'Nông trại': 'icon-seedling',
    'Chứng nhận': 'icon-qr-code',
    'Mùa vụ': 'icon-calendar',
    'Vật tư': 'icon-box',
    'Nhật ký': 'icon-file-text'
  };

  var ACTIONS = [
    { key: 'view',   label: 'Xem' },
    { key: 'add',    label: 'Thêm' },
    { key: 'edit',   label: 'Sửa' },
    { key: 'delete', label: 'Xoá' }
  ];

  // GIẢ ĐỊNH: mã quyền (permission.code) có dạng "<nhóm>.<hành động>", hành
  // động là hậu tố sau dấu "." cuối cùng — chấp nhận vài cách viết REST phổ
  // biến khác (create/update/read/remove) phòng khi backend không dùng
  // đúng 4 từ add/edit/view/delete đang có sẵn trên giao diện. Cần xác nhận
  // lại với /docs backend thật.
  var ACTION_ALIASES = {
    view: 'view', read: 'view',
    add: 'add', create: 'add',
    edit: 'edit', update: 'edit',
    delete: 'delete', remove: 'delete'
  };

  function actionFromCode(code) {
    var suffix = String(code || '').split('.').pop().toLowerCase();
    return ACTION_ALIASES[suffix] || null;
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

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      global.clearTimeout(timer);
      timer = global.setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  // Ẩn nút nào người dùng hiện tại không có quyền — đánh dấu sẵn bằng
  // data-requires-permission="<mã quyền>" trên nút trong HTML.
  function applyPermissionGates() {
    document.querySelectorAll('[data-requires-permission]').forEach(function (node) {
      var code = node.getAttribute('data-requires-permission');
      if (!api.hasPermission(code)) node.hidden = true;
    });
  }

  /* ======================================================================
     Danh sách người dùng
     ====================================================================== */

  var searchInput = document.querySelector('[data-user-search]');
  var loadingNode = document.querySelector('[data-user-loading]');
  var errorNode = document.querySelector('[data-user-error]');
  var errorMessageNode = document.querySelector('[data-user-error-message]');
  var tablePanel = document.querySelector('[data-user-table-panel]');
  var tableBody = document.querySelector('[data-user-table-body]');
  var emptyNode = document.querySelector('[data-user-empty]');
  var emptyTitleNode = document.querySelector('[data-user-empty-title]');
  var emptyDescNode = document.querySelector('[data-user-empty-desc]');
  var paginationNode = document.querySelector('[data-user-pagination]');
  var pageInfoNode = document.querySelector('[data-user-page-info]');
  var prevPageBtn = document.querySelector('[data-user-prev-page]');
  var nextPageBtn = document.querySelector('[data-user-next-page]');

  var listState = { page: 1, q: '', total: 0 };

  function setListView(view) {
    loadingNode.hidden = view !== 'loading';
    errorNode.hidden = view !== 'error';
    tablePanel.hidden = view !== 'data';
    emptyNode.hidden = view !== 'empty';
    paginationNode.hidden = view !== 'data';
  }

  function userRow(user) {
    var tr = el('tr');

    var avatarCell = el('td');
    avatarCell.appendChild(el('span', 'avatar avatar--sm', global.AgriChain.initials(user.full_name)));
    tr.appendChild(avatarCell);

    tr.appendChild(el('td', null, user.email));
    var nameCell = el('td', 'table__name', user.full_name);
    if (user.is_active === false) {
      nameCell.appendChild(el('span', 'badge badge--neutral', 'Đã vô hiệu hoá'));
    }
    tr.appendChild(nameCell);

    var actionsCell = el('td');
    var wrap = el('div', 'table__actions');

    var permButton = el('button', 'icon-btn icon-btn--info');
    permButton.type = 'button';
    permButton.setAttribute('aria-label', 'Phân quyền cho ' + user.full_name);
    permButton.setAttribute('data-tooltip', 'Phân quyền');
    if (!api.hasPermission('roles.update')) permButton.hidden = true;
    permButton.appendChild(svgIcon('icon-shield-check'));
    permButton.addEventListener('click', function () { openPermissionModal(user); });
    wrap.appendChild(permButton);

    var delButton = el('button', 'icon-btn icon-btn--danger');
    delButton.type = 'button';
    delButton.setAttribute('aria-label', 'Vô hiệu hoá ' + user.full_name);
    delButton.setAttribute('data-tooltip', 'Vô hiệu hoá');
    if (!api.hasPermission('users.delete')) delButton.hidden = true;
    delButton.appendChild(svgIcon('icon-trash'));
    delButton.addEventListener('click', function () { deactivateUser(user); });
    wrap.appendChild(delButton);

    actionsCell.appendChild(wrap);
    tr.appendChild(actionsCell);

    return tr;
  }

  function renderUsers(data) {
    var users = data.items || [];
    listState.total = data.total || 0;

    tableBody.textContent = '';

    if (!users.length) {
      if (listState.q) {
        emptyTitleNode.textContent = 'Không tìm thấy người dùng nào';
        emptyDescNode.textContent = 'Thử lại với từ khoá khác.';
      } else {
        emptyTitleNode.textContent = 'Chưa có người dùng nào';
        emptyDescNode.textContent = 'Thêm người dùng để cấp quyền truy cập vào từng phân hệ của Đơn vị bạn.';
      }
      setListView('empty');
      return;
    }

    users.forEach(function (user) {
      tableBody.appendChild(userRow(user));
    });
    setListView('data');

    var totalPages = Math.max(1, Math.ceil(listState.total / PAGE_SIZE));
    pageInfoNode.textContent = 'Trang ' + listState.page + ' / ' + totalPages;
    prevPageBtn.disabled = listState.page <= 1;
    nextPageBtn.disabled = listState.page >= totalPages;
  }

  function loadUsers() {
    setListView('loading');
    api.users.list({
      q: listState.q || undefined,
      page: listState.page,
      page_size: PAGE_SIZE
    }).then(function (data) {
      renderUsers(data);
    }).catch(function (err) {
      errorMessageNode.textContent = err.message;
      setListView('error');
    });
  }

  var handleSearchInput = debounce(function () {
    listState.q = searchInput.value.trim();
    listState.page = 1;
    loadUsers();
  }, SEARCH_DEBOUNCE_MS);

  function deactivateUser(user) {
    global.AgriChain.confirm(
      'Vô hiệu hoá người dùng "' + user.full_name + '" (' + user.email + ')? ' +
      'Người này sẽ không đăng nhập được nữa, nhưng dữ liệu vẫn được giữ lại.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      api.users.deactivate(user.id).then(function () {
        loadUsers();
        global.AgriChain.toast('Đã vô hiệu hoá người dùng.');
      }).catch(function (err) {
        global.AgriChain.toast(err.message);
      });
    });
  }

  /* --- Modal: Thêm người dùng ------------------------------------------------ */

  var userModal = document.getElementById('user-modal');
  var userForm = document.getElementById('user-form');
  var userSubmitButton = userForm.querySelector('button[type="submit"]');
  var userSubmitLabel = userSubmitButton.textContent;

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

  // Ánh xạ tên field backend trả về trong lỗi (details.field, snake_case)
  // sang đúng input trên form — GIẢ ĐỊNH tên field khớp key gửi lên
  // (email/full_name/password), cần xác nhận lại với /docs backend thật.
  function fieldNodeFor(fieldName) {
    var map = {
      email: 'user-email',
      full_name: 'user-full-name',
      password: 'user-password'
    };
    var id = map[fieldName];
    return id ? document.getElementById(id) : null;
  }

  function validateUserClientSide() {
    clearErrors(userForm);
    var problems = [];

    var email = document.getElementById('user-email');
    var fullName = document.getElementById('user-full-name');
    var password = document.getElementById('user-password');

    if (!isEmail(email.value.trim())) {
      showError(email, 'Nhập email hợp lệ.');
      problems.push(email);
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
    if (!validateUserClientSide()) return;

    var data = new FormData(userForm);
    var payload = {
      email: String(data.get('email')).trim(),
      full_name: String(data.get('fullName')).trim(),
      password: String(data.get('password'))
    };

    userSubmitButton.disabled = true;
    userSubmitButton.textContent = 'Đang lưu...';

    api.users.create(payload).then(function () {
      closeUserModal();
      listState.page = 1;
      loadUsers();
      global.AgriChain.toast('Đã thêm người dùng.');
    }).catch(function (err) {
      if (err.details && err.details.field) {
        var field = fieldNodeFor(err.details.field);
        if (field) {
          showError(field, err.message);
          field.focus();
        } else {
          global.AgriChain.toast(err.message);
        }
      } else {
        global.AgriChain.toast(err.message);
      }
    }).then(function () {
      userSubmitButton.disabled = false;
      userSubmitButton.textContent = userSubmitLabel;
    });
  }

  /* ======================================================================
     Modal: Phân quyền (theo VAI TRÒ của người dùng — xem ghi chú đầu file)
     ====================================================================== */

  var permissionModal = document.getElementById('permission-modal');
  var permissionAvatar = document.querySelector('[data-permission-avatar]');
  var permissionName = document.querySelector('[data-permission-name]');
  var permissionEmail = document.querySelector('[data-permission-email]');
  var permissionRoleNotice = document.querySelector('[data-permission-role-notice]');
  var permissionRoleName = document.querySelector('[data-permission-role-name]');
  var permissionLoading = document.querySelector('[data-permission-loading]');
  var permissionError = document.querySelector('[data-permission-error]');
  var permissionErrorMessage = document.querySelector('[data-permission-error-message]');
  var permissionTableWrap = document.querySelector('[data-permission-table-wrap]');
  var permissionTableBody = document.querySelector('[data-permission-table-body]');
  var savePermissionBtn = document.querySelector('[data-save-permission]');

  var currentPermissionUser = null;
  var currentRole = null;
  // id của MỌI quyền đã render thành checkbox trong bảng — id quyền của vai
  // trò hiện tại mà KHÔNG nằm trong tập này sẽ được giữ nguyên khi lưu (xem
  // handlePermissionSave()), tránh vô tình xoá mất quyền nằm ngoài 5 phân
  // hệ x 4 hành động đang hiển thị trên giao diện.
  var managedPermissionIds = null;

  function setPermissionView(view) {
    permissionLoading.hidden = view !== 'loading';
    permissionError.hidden = view !== 'error';
    permissionTableWrap.hidden = view !== 'data';
    savePermissionBtn.hidden = view !== 'data' || !api.hasPermission('roles.update');
  }

  function groupPermissions(permissionList) {
    var byGroup = {};
    permissionList.forEach(function (perm) {
      var group = perm.group_name || 'Khác';
      if (!byGroup[group]) byGroup[group] = [];
      byGroup[group].push(perm);
    });

    var names = Object.keys(byGroup);
    var known = names.filter(function (name) { return GROUP_ORDER.indexOf(name) !== -1; })
      .sort(function (a, b) { return GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b); });
    var unknown = names.filter(function (name) { return GROUP_ORDER.indexOf(name) === -1; }).sort();

    return known.concat(unknown).map(function (name) {
      return { name: name, icon: GROUP_ICONS[name] || 'icon-shield-check', permissions: byGroup[name] };
    });
  }

  function permissionRow(group, grantedIds) {
    var tr = el('tr');

    var moduleCell = el('td');
    var moduleWrap = el('div', 'permission-table__module');
    moduleWrap.appendChild(svgIcon(group.icon));
    moduleWrap.appendChild(el('span', null, group.name));
    moduleCell.appendChild(moduleWrap);
    tr.appendChild(moduleCell);

    ACTIONS.forEach(function (action) {
      var cell = el('td');
      var permission = group.permissions.filter(function (p) {
        return actionFromCode(p.code) === action.key;
      })[0];

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'checkbox__input';
      checkbox.setAttribute('data-group', group.name);
      checkbox.setAttribute('data-action', action.key);
      checkbox.setAttribute('aria-label',
        'Quyền ' + action.label.toLowerCase() + ' phân hệ ' + group.name);

      if (permission) {
        checkbox.dataset.permissionId = permission.id;
        managedPermissionIds[permission.id] = true;
        checkbox.checked = grantedIds.indexOf(permission.id) !== -1;
        checkbox.addEventListener('change', function () {
          syncViewPermission(group.name, action.key, checkbox.checked);
        });
      } else {
        // Không có quyền tương ứng cho ô này — vô hiệu hoá thay vì cho bấm
        // vào một checkbox không có gì để lưu.
        checkbox.disabled = true;
      }

      cell.appendChild(checkbox);
      tr.appendChild(cell);
    });

    return tr;
  }

  function permissionCheckbox(groupName, actionKey) {
    return permissionTableBody.querySelector(
      'input[data-group="' + groupName + '"][data-action="' + actionKey + '"]');
  }

  // Cùng quy tắc trước khi chuyển API: Thêm/Sửa/Xoá không có nghĩa nếu
  // không xem được, nên 2 chiều đều khoá theo Xem.
  function syncViewPermission(groupName, actionKey, checked) {
    if (actionKey === 'view') {
      if (checked) return;
      ['add', 'edit', 'delete'].forEach(function (otherKey) {
        var other = permissionCheckbox(groupName, otherKey);
        if (other && !other.disabled) other.checked = false;
      });
    } else if (checked) {
      var view = permissionCheckbox(groupName, 'view');
      if (view && !view.disabled) view.checked = true;
    }
  }

  function loadPermissionMatrix(user) {
    setPermissionView('loading');
    managedPermissionIds = {};

    Promise.all([api.permissions.list(), api.roles.list()]).then(function (results) {
      var permissionList = results[0].items || results[0];
      var roleList = results[1].items || results[1];

      currentRole = roleList.filter(function (role) { return role.id === user.role_id; })[0] || null;

      if (!currentRole) {
        permissionErrorMessage.textContent = 'Người dùng này chưa được gán vai trò, hoặc vai trò không còn tồn tại.';
        setPermissionView('error');
        return;
      }

      permissionRoleName.textContent = currentRole.name;
      var grantedIds = (currentRole.permissions || []).map(function (p) {
        return typeof p === 'string' ? p : p.id;
      });

      permissionTableBody.textContent = '';
      groupPermissions(permissionList).forEach(function (group) {
        permissionTableBody.appendChild(permissionRow(group, grantedIds));
      });

      setPermissionView('data');
    }).catch(function (err) {
      permissionErrorMessage.textContent = err.message;
      setPermissionView('error');
    });
  }

  function openPermissionModal(user) {
    currentPermissionUser = user;
    currentRole = null;

    permissionAvatar.textContent = global.AgriChain.initials(user.full_name);
    permissionName.textContent = user.full_name;
    permissionEmail.textContent = user.email;
    permissionRoleName.textContent = '—';

    permissionModal.showModal();
    loadPermissionMatrix(user);
  }

  function closePermissionModal() {
    permissionModal.close();
    currentPermissionUser = null;
    currentRole = null;
    managedPermissionIds = null;
  }

  function handlePermissionSave() {
    if (!currentRole) return;

    var checkedIds = [];
    permissionTableBody.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(function (checkbox) {
      if (checkbox.checked) checkedIds.push(checkbox.dataset.permissionId);
    });

    // Giữ nguyên các quyền của vai trò này nằm NGOÀI 5 phân hệ x 4 hành
    // động đang hiển thị (nhóm lạ/hành động lạ) — không được vô tình xoá
    // mất khi lưu, xem ghi chú ở khai báo managedPermissionIds phía trên.
    var keptIds = (currentRole.permissions || [])
      .map(function (p) { return typeof p === 'string' ? p : p.id; })
      .filter(function (id) { return !managedPermissionIds[id]; });

    var finalIds = keptIds.concat(checkedIds);

    savePermissionBtn.disabled = true;
    api.roles.update(currentRole.id, { permission_ids: finalIds }).then(function () {
      closePermissionModal();
      global.AgriChain.toast('Đã lưu phân quyền.');
    }).catch(function (err) {
      global.AgriChain.toast(err.message);
    }).then(function () {
      savePermissionBtn.disabled = false;
    });
  }

  /* --- Khởi động -------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    applyPermissionGates();
    loadUsers();

    searchInput.addEventListener('input', handleSearchInput);

    prevPageBtn.addEventListener('click', function () {
      if (listState.page <= 1) return;
      listState.page -= 1;
      loadUsers();
    });
    nextPageBtn.addEventListener('click', function () {
      listState.page += 1;
      loadUsers();
    });

    document.querySelector('[data-user-retry]').addEventListener('click', loadUsers);

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
    document.querySelector('[data-permission-retry]').addEventListener('click', function () {
      if (currentPermissionUser) loadPermissionMatrix(currentPermissionUser);
    });
    savePermissionBtn.addEventListener('click', handlePermissionSave);
  });
})(window);
