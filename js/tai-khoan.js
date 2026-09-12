/* ==========================================================================
   AgriChain — Trang Quản lý Tài khoản (tai-khoan.html)
   ĐÃ CHUYỂN SANG BACKEND THẬT (js/api.js) — không còn đọc/ghi qua
   AgriChain.store/collection "orgUsers" nữa. Danh sách người dùng phân
   trang + tìm kiếm qua GET /users; phân quyền theo VAI TRÒ (GET /roles,
   GET /permissions, PATCH /roles/{id}). Khuôn dữ liệu permission/role đã
   được XÁC NHẬN THẬT qua /openapi.json + dữ liệu thật của backend (không
   còn là giả định) — xem mục riêng về trang này trong CLAUDE.md.

   36 mã quyền hiển thị trong ma trận, dạng "<nhóm số nhiều>.<hành động>" (4
   hành động add/edit/view/delete x 9 nhóm nghiệp vụ: batches, certifications,
   farms, logs, roles, seasons, supplies, users, workflow_templates — hàng
   workflow_templates thêm 2026-09-11, hàng batches thêm 2026-09-12 khi
   batches CRUD chuyển sang API) — permission KHÔNG có id số, chỉ có
   `code` (chuỗi) — role.permissions và PATCH /roles/{id} đều làm việc
   trực tiếp trên mảng chuỗi mã quyền này, không phải mảng id.

   Vai trò is_system=true (VD "Quản trị Đơn vị" tự tạo lúc đăng ký business,
   xem POST /auth/register/business) — modal Phân quyền mở READ-ONLY cho vai
   trò này (checkbox disabled, ẩn nút Lưu, xem loadPermissionMatrix()); nút
   "Nhường quyền quản trị" (modal riêng, gọi api.users.transferAdmin()) CHỈ
   hiện khi vai trò của người đang đăng nhập là is_system=true — xem mục
   riêng về trang này trong CLAUDE.md để biết đầy đủ khuôn lỗi 401/403/409.
   Nạp SAU js/api-config.js, js/api.js, js/app-shell.js và js/password-field.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var api = global.AgriChain.api;

  var PAGE_SIZE = 10;
  var SEARCH_DEBOUNCE_MS = 300;

  // Ma trận phân quyền hiển thị theo TIỀN TỐ của mã quyền (phần trước dấu
  // "." đầu tiên: "farms.view" -> "farms"), KHÔNG dùng thẳng group_name mà
  // GET /permissions trả về — backend gộp chung roles.* và users.* vào 1
  // group_name duy nhất ("Quản lý đơn vị", đã xác nhận qua dữ liệu thật),
  // nếu hiển thị theo group_name thì 1 ô (nhóm x hành động) sẽ có 2 mã quyền
  // (VD "roles.view" và "users.view" cùng rơi vào ô "Xem" của "Quản lý đơn
  // vị"), phá vỡ giả định "1 checkbox = 1 mã quyền" của bảng ma trận. Tách
  // theo tiền tố mã quyền cho ra đúng 8 hàng, mỗi hàng 1 mã quyền/hành động.
  //
  // "workflow_templates" thêm 2026-09-11 (mẫu quy trình mùa vụ đã chuyển
  // sang API từ trước — xem mau-quy-trinh.html — nhưng ma trận này chưa có
  // hàng tương ứng, khiến quyền workflow_templates.* của 1 vai trò không sửa
  // được qua giao diện, xem CLAUDE.md).
  //
  // "batches" (nhóm quyền "Lô hàng") thêm 2026-09-12 — batches CRUD vừa
  // chuyển sang API (nong-trai-chi-tiet.html/lo-hang.js), trước đó nhóm này
  // đã có ở backend từ migration 005 nhưng chưa có hàng ở ma trận này vì
  // chưa trang nào thật sự cần gán quyền qua giao diện, xem CLAUDE.md.
  var PREFIX_ORDER = ['batches', 'farms', 'certifications', 'seasons', 'supplies', 'logs', 'workflow_templates', 'roles', 'users'];
  var PREFIX_LABELS = {
    batches: 'Lô hàng',
    farms: 'Nông trại',
    certifications: 'Chứng nhận',
    seasons: 'Mùa vụ',
    supplies: 'Vật tư',
    logs: 'Nhật ký',
    workflow_templates: 'Mẫu quy trình',
    roles: 'Vai trò',
    users: 'Người dùng'
  };
  var PREFIX_ICONS = {
    batches: 'icon-warehouse',
    farms: 'icon-seedling',
    certifications: 'icon-qr-code',
    seasons: 'icon-calendar',
    supplies: 'icon-box',
    logs: 'icon-file-text',
    workflow_templates: 'icon-workflow',
    roles: 'icon-shield-check',
    users: 'icon-user'
  };

  var ACTIONS = [
    { key: 'view',   label: 'Xem' },
    { key: 'add',    label: 'Thêm' },
    { key: 'edit',   label: 'Sửa' },
    { key: 'delete', label: 'Xoá' }
  ];

  function permissionPrefix(code) {
    var text = String(code || '');
    var dot = text.indexOf('.');
    return dot === -1 ? text : text.slice(0, dot);
  }

  // Đã xác nhận qua dữ liệu thật: hậu tố mã quyền luôn đúng 1 trong 4 từ
  // add/edit/view/delete (khớp thẳng key của ACTIONS, không cần bảng alias
  // suy đoán như trước).
  function actionFromCode(code) {
    var text = String(code || '');
    var dot = text.indexOf('.');
    return dot === -1 ? null : text.slice(dot + 1);
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

    tr.appendChild(el('td', 'table__muted', user.role_name || '—'));

    var actionsCell = el('td');
    var wrap = el('div', 'table__actions');

    var editButton = el('button', 'icon-btn');
    editButton.type = 'button';
    editButton.setAttribute('aria-label', 'Sửa ' + user.full_name);
    editButton.setAttribute('data-tooltip', 'Sửa');
    if (!api.hasPermission('users.edit')) editButton.hidden = true;
    editButton.appendChild(svgIcon('icon-pencil'));
    editButton.addEventListener('click', function () { openEditUserModal(user); });
    wrap.appendChild(editButton);

    var resetButton = el('button', 'icon-btn');
    resetButton.type = 'button';
    resetButton.setAttribute('aria-label', 'Đặt lại mật khẩu cho ' + user.full_name);
    resetButton.setAttribute('data-tooltip', 'Đặt lại mật khẩu');
    if (!api.hasPermission('users.edit')) resetButton.hidden = true;
    resetButton.appendChild(svgIcon('icon-key'));
    resetButton.addEventListener('click', function () { openResetPasswordModal(user); });
    wrap.appendChild(resetButton);

    var permButton = el('button', 'icon-btn icon-btn--info');
    permButton.type = 'button';
    permButton.setAttribute('aria-label', 'Phân quyền cho ' + user.full_name);
    permButton.setAttribute('data-tooltip', 'Phân quyền');
    if (!api.hasPermission('roles.view')) permButton.hidden = true;
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

  /* --- Chọn vai trò (dùng chung giữa modal Thêm và Sửa người dùng) --------- */

  // Danh sách vai trò rất nhỏ (không phân trang) nên tải mới mỗi lần mở modal
  // thay vì cache — tránh hiện vai trò đã lỗi thời nếu ai đó vừa đổi tên vai
  // trò qua modal Phân quyền ở tab khác.
  function populateRoleSelect(selectEl, selectedRoleId, includeBlank) {
    selectEl.disabled = true;
    selectEl.textContent = '';
    selectEl.appendChild(el('option', null, 'Đang tải vai trò...'));

    return api.roles.list().then(function (roleList) {
      selectEl.textContent = '';
      if (includeBlank) {
        // Thêm modal: không tự chọn sẵn vai trò nào — buộc người tạo chọn rõ
        // ràng, tránh lỡ tay gán nhầm vai trò đầu tiên trả về (VD "Quản trị
        // viên") cho người dùng mới.
        var blank = el('option', null, '-- Chọn vai trò --');
        blank.value = '';
        selectEl.appendChild(blank);
      }
      roleList.forEach(function (role) {
        var option = el('option', null, role.name);
        option.value = role.id;
        if (selectedRoleId && String(role.id) === String(selectedRoleId)) {
          option.selected = true;
        }
        selectEl.appendChild(option);
      });
      selectEl.disabled = false;
    }).catch(function (err) {
      selectEl.textContent = '';
      selectEl.appendChild(el('option', null, 'Không tải được vai trò'));
      global.AgriChain.toast(err.message);
    });
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

  /* --- Modal: Thêm người dùng ------------------------------------------------ */

  var userModal = document.getElementById('user-modal');
  var userForm = document.getElementById('user-form');
  var userRoleSelect = document.getElementById('user-role');
  var userSubmitButton = userForm.querySelector('button[type="submit"]');
  var userSubmitLabel = userSubmitButton.textContent;

  function openUserModal() {
    userForm.reset();
    clearErrors(userForm);
    populateRoleSelect(userRoleSelect, null, true);
    userModal.showModal();
    document.getElementById('user-email').focus();
  }

  function closeUserModal() {
    userModal.close();
  }

  // Ánh xạ tên field backend trả về trong lỗi (details.field, snake_case)
  // sang đúng input trên form "Thêm người dùng" (khớp UserCreate thật).
  function fieldNodeFor(fieldName) {
    var map = {
      email: 'user-email',
      full_name: 'user-full-name',
      password: 'user-password',
      role_id: 'user-role',
      phone: 'user-phone'
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
    if (!userRoleSelect.value) {
      showError(userRoleSelect, 'Chọn vai trò.');
      problems.push(userRoleSelect);
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
    var phone = String(data.get('phone') || '').trim();
    var payload = {
      email: String(data.get('email')).trim(),
      full_name: String(data.get('fullName')).trim(),
      password: String(data.get('password')),
      role_id: Number(data.get('roleId'))
    };
    if (phone) payload.phone = phone;

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

  /* --- Modal: Sửa người dùng ---------------------------------------------
     UserUpdate KHÔNG có email/password (đổi email chưa hỗ trợ ở giai đoạn
     này; đổi mật khẩu đi qua modal "Đặt lại mật khẩu" riêng, xem bên dưới)
     — vì vậy đây là modal RIÊNG, không dùng chung với modal Thêm. ---------- */

  var editUserModal = document.getElementById('edit-user-modal');
  var editUserForm = document.getElementById('edit-user-form');
  var editUserRoleSelect = document.getElementById('edit-user-role');
  var editUserSubmitButton = editUserForm.querySelector('button[type="submit"]');
  var editUserSubmitLabel = editUserSubmitButton.textContent;
  var currentEditUserId = null;

  function openEditUserModal(user) {
    currentEditUserId = user.id;
    editUserForm.reset();
    clearErrors(editUserForm);
    document.getElementById('edit-user-full-name').value = user.full_name;
    document.getElementById('edit-user-phone').value = user.phone || '';
    document.getElementById('edit-user-active').checked = user.is_active !== false;
    populateRoleSelect(editUserRoleSelect, user.role_id);
    editUserModal.showModal();
    document.getElementById('edit-user-full-name').focus();
  }

  function closeEditUserModal() {
    editUserModal.close();
    currentEditUserId = null;
  }

  function editFieldNodeFor(fieldName) {
    var map = {
      full_name: 'edit-user-full-name',
      role_id: 'edit-user-role',
      phone: 'edit-user-phone'
    };
    var id = map[fieldName];
    return id ? document.getElementById(id) : null;
  }

  function handleEditUserSubmit(event) {
    event.preventDefault();
    clearErrors(editUserForm);

    var fullName = document.getElementById('edit-user-full-name');
    var problems = [];
    if (!fullName.value.trim()) {
      showError(fullName, 'Nhập họ tên.');
      problems.push(fullName);
    }
    if (!editUserRoleSelect.value) {
      showError(editUserRoleSelect, 'Chọn vai trò.');
      problems.push(editUserRoleSelect);
    }
    if (problems.length) {
      problems[0].focus();
      return;
    }

    var phone = document.getElementById('edit-user-phone').value.trim();
    var payload = {
      full_name: fullName.value.trim(),
      role_id: Number(editUserRoleSelect.value),
      phone: phone || null,
      is_active: document.getElementById('edit-user-active').checked
    };

    editUserSubmitButton.disabled = true;
    editUserSubmitButton.textContent = 'Đang lưu...';

    api.users.update(currentEditUserId, payload).then(function () {
      closeEditUserModal();
      loadUsers();
      global.AgriChain.toast('Đã cập nhật người dùng.');
    }).catch(function (err) {
      if (err.details && err.details.field) {
        var field = editFieldNodeFor(err.details.field);
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
      editUserSubmitButton.disabled = false;
      editUserSubmitButton.textContent = editUserSubmitLabel;
    });
  }

  /* --- Modal: Đặt lại mật khẩu --------------------------------------------- */

  var resetPasswordModal = document.getElementById('reset-password-modal');
  var resetPasswordForm = document.getElementById('reset-password-form');
  var resetPasswordSubmitButton = resetPasswordForm.querySelector('button[type="submit"]');
  var resetPasswordSubmitLabel = resetPasswordSubmitButton.textContent;
  var currentResetUser = null;

  function openResetPasswordModal(user) {
    currentResetUser = user;
    resetPasswordForm.reset();
    clearErrors(resetPasswordForm);
    document.querySelector('[data-reset-password-name]').textContent = user.full_name;
    resetPasswordModal.showModal();
    document.getElementById('reset-password-input').focus();
  }

  function closeResetPasswordModal() {
    resetPasswordModal.close();
    currentResetUser = null;
  }

  function handleResetPasswordSubmit(event) {
    event.preventDefault();
    clearErrors(resetPasswordForm);

    var password = document.getElementById('reset-password-input');
    var missing = global.AgriChain.passwordProblems(password.value);
    if (missing.length) {
      showError(password, 'Mật khẩu còn thiếu: ' + missing.join(', ') + '.');
      password.focus();
      return;
    }

    resetPasswordSubmitButton.disabled = true;
    resetPasswordSubmitButton.textContent = 'Đang lưu...';

    api.users.resetPassword(currentResetUser.id, password.value).then(function () {
      closeResetPasswordModal();
      global.AgriChain.toast('Đã đặt lại mật khẩu.');
    }).catch(function (err) {
      global.AgriChain.toast(err.message);
    }).then(function () {
      resetPasswordSubmitButton.disabled = false;
      resetPasswordSubmitButton.textContent = resetPasswordSubmitLabel;
    });
  }

  /* ======================================================================
     Modal: Phân quyền (theo VAI TRÒ của người dùng — xem ghi chú đầu file)
     ====================================================================== */

  var permissionModal = document.getElementById('permission-modal');
  var permissionAvatar = document.querySelector('[data-permission-avatar]');
  var permissionName = document.querySelector('[data-permission-name]');
  var permissionEmail = document.querySelector('[data-permission-email]');
  var permissionRoleName = document.querySelector('[data-permission-role-name]');
  var permissionLoading = document.querySelector('[data-permission-loading]');
  var permissionError = document.querySelector('[data-permission-error]');
  var permissionErrorMessage = document.querySelector('[data-permission-error-message]');
  var permissionTableWrap = document.querySelector('[data-permission-table-wrap]');
  var permissionTableBody = document.querySelector('[data-permission-table-body]');
  var permissionReadonlyNotice = document.querySelector('[data-permission-readonly-notice]');
  var savePermissionBtn = document.querySelector('[data-save-permission]');

  var currentPermissionUser = null;
  var currentRole = null;
  // Mã quyền (code) của MỌI quyền đã render thành checkbox trong bảng — quyền
  // của vai trò hiện tại mà KHÔNG nằm trong tập này (nhóm/hành động lạ ngoài
  // 9 phân hệ x 4 hành động đang hiển thị) sẽ được giữ nguyên khi lưu, xem
  // handlePermissionSave().
  var managedCodes = null;

  // isSystemRole: vai trò is_system=true — backend chặn PATCH /roles/{id}
  // sửa permissions (409 CONFLICT), nên ẩn luôn nút Lưu ở đây thay vì để bấm
  // vào việc chắc chắn thất bại. Mặc định false ở view 'loading'/'error'
  // (chưa biết currentRole) — không sao vì savePermissionBtn cũng ẩn ở 2
  // view đó rồi (view !== 'data').
  function setPermissionView(view, isSystemRole) {
    permissionLoading.hidden = view !== 'loading';
    permissionError.hidden = view !== 'error';
    permissionTableWrap.hidden = view !== 'data';
    savePermissionBtn.hidden = view !== 'data' || !api.hasPermission('roles.edit') || !!isSystemRole;
  }

  // groupsFromApi: PermissionGroupOut[] — GET /permissions ĐÃ nhóm sẵn theo
  // group_name, nhưng ta bỏ qua group_name và tự nhóm lại theo TIỀN TỐ mã
  // quyền (xem ghi chú PREFIX_ORDER ở đầu file) để luôn ra đúng 1 mã quyền
  // cho mỗi ô (nhóm x hành động).
  function groupPermissions(groupsFromApi) {
    var flat = [];
    (groupsFromApi || []).forEach(function (g) {
      flat = flat.concat(g.permissions || []);
    });

    var byPrefix = {};
    flat.forEach(function (perm) {
      var prefix = permissionPrefix(perm.code);
      if (!byPrefix[prefix]) byPrefix[prefix] = [];
      byPrefix[prefix].push(perm);
    });

    var prefixes = Object.keys(byPrefix);
    var known = prefixes.filter(function (p) { return PREFIX_ORDER.indexOf(p) !== -1; })
      .sort(function (a, b) { return PREFIX_ORDER.indexOf(a) - PREFIX_ORDER.indexOf(b); });
    var unknown = prefixes.filter(function (p) { return PREFIX_ORDER.indexOf(p) === -1; }).sort();

    return known.concat(unknown).map(function (prefix) {
      var perms = byPrefix[prefix];
      return {
        name: PREFIX_LABELS[prefix] || (perms[0] && perms[0].group_name) || prefix,
        icon: PREFIX_ICONS[prefix] || 'icon-shield-check',
        permissions: perms
      };
    });
  }

  function permissionRow(group, grantedCodes) {
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
        // Mã quyền là chuỗi (VD "farms.view") nên dùng thẳng dataset — không
        // có nguy cơ ép kiểu sai như khi id là số (đã xác nhận qua dữ liệu
        // thật: permission không có id số, chỉ có code).
        checkbox.dataset.code = permission.code;
        managedCodes[permission.code] = true;
        checkbox.checked = grantedCodes.indexOf(permission.code) !== -1;
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
    managedCodes = {};

    // GET /permissions và GET /roles đều trả về mảng trực tiếp, không phân
    // trang (đã xác nhận qua dữ liệu thật) — không cần bóc .items.
    Promise.all([api.permissions.list(), api.roles.list()]).then(function (results) {
      var groupsFromApi = results[0];
      var roleList = results[1];

      currentRole = roleList.filter(function (role) { return role.id === user.role_id; })[0] || null;

      if (!currentRole) {
        permissionErrorMessage.textContent = 'Người dùng này chưa được gán vai trò, hoặc vai trò không còn tồn tại.';
        setPermissionView('error');
        return;
      }

      permissionRoleName.textContent = currentRole.name;
      // role.permissions luôn là mảng chuỗi mã quyền (đã xác nhận thật).
      var grantedCodes = currentRole.permissions || [];

      permissionTableBody.textContent = '';
      groupPermissions(groupsFromApi).forEach(function (group) {
        permissionTableBody.appendChild(permissionRow(group, grantedCodes));
      });

      // Vai trò hệ thống (is_system=true) — khoá hết checkbox, kể cả những ô
      // đã được permissionRow() gán .checked từ grantedCodes ở trên, để
      // giao diện không hứa hẹn 1 thay đổi mà backend chắc chắn từ chối
      // (409 CONFLICT, xem roles.py:update_role của agrichain-api).
      var isSystemRole = !!currentRole.is_system;
      permissionReadonlyNotice.hidden = !isSystemRole;
      if (isSystemRole) {
        permissionTableBody.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox) {
          checkbox.disabled = true;
        });
      }

      setPermissionView('data', isSystemRole);
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
    // Reset về ẩn mỗi lần mở — tránh còn hiện lại ghi chú chỉ-đọc của lần mở
    // TRƯỚC (VD vừa xem 1 vai trò is_system, đóng lại, mở người khác có vai
    // trò thường) trong lúc loadPermissionMatrix() còn đang tải.
    permissionReadonlyNotice.hidden = true;

    permissionModal.showModal();
    loadPermissionMatrix(user);
  }

  function closePermissionModal() {
    permissionModal.close();
    currentPermissionUser = null;
    currentRole = null;
    managedCodes = null;
  }

  function handlePermissionSave() {
    if (!currentRole) return;

    var checkedCodes = [];
    permissionTableBody.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(function (checkbox) {
      if (checkbox.checked) checkedCodes.push(checkbox.dataset.code);
    });

    // Giữ nguyên các quyền của vai trò này nằm NGOÀI 9 phân hệ x 4 hành
    // động đang hiển thị (nhóm lạ/hành động lạ mà backend thêm sau này, chưa
    // kịp đưa vào PREFIX_ORDER) — không được vô tình xoá mất khi lưu, xem ghi
    // chú ở khai báo managedCodes phía trên.
    var keptCodes = (currentRole.permissions || [])
      .filter(function (code) { return !managedCodes[code]; });

    var finalCodes = keptCodes.concat(checkedCodes);

    // PATCH /roles/{id} nhận field "permissions" (mảng mã quyền, THAY THẾ
    // toàn bộ danh sách cũ) — đã xác nhận qua /openapi.json thật, KHÔNG phải
    // "permission_ids" như suy đoán ban đầu.
    savePermissionBtn.disabled = true;
    api.roles.update(currentRole.id, { permissions: finalCodes }).then(function () {
      closePermissionModal();
      global.AgriChain.toast('Đã lưu phân quyền.');
    }).catch(function (err) {
      global.AgriChain.toast(err.message);
    }).then(function () {
      savePermissionBtn.disabled = false;
    });
  }

  /* ======================================================================
     Nhường quyền quản trị (POST /users/{id}/transfer-admin) — chỉ hiện với
     người đang đăng nhập giữ vai trò is_system=true (Quản trị Đơn vị).
     ====================================================================== */

  // Gọi 1 lần lúc tải trang — hiện/ẩn nút "Nhường quyền quản trị" tuỳ vai
  // trò CỦA CHÍNH NGƯỜI ĐANG ĐĂNG NHẬP có is_system=true hay không.
  // AgriChain.api.getUser() không có field is_system (UserOut chỉ có
  // role_id/role_code/role_name) nên phải tự đối chiếu qua GET /roles.
  function refreshTransferAdminVisibility() {
    var me = api.getUser();
    if (!me) return;
    api.roles.list().then(function (roleList) {
      var myRole = roleList.filter(function (role) { return role.id === me.role_id; })[0];
      var isOrgAdmin = !!(myRole && myRole.is_system);
      document.querySelectorAll('[data-open-transfer-admin]').forEach(function (button) {
        button.hidden = !isOrgAdmin;
      });
    }).catch(function () {
      // Không tải được vai trò — giữ nút ẩn (mặc định trong HTML), an toàn
      // hơn là lỡ hiện nhầm cho người không phải Quản trị Đơn vị.
    });
  }

  var transferAdminModal = document.getElementById('transfer-admin-modal');
  var transferAdminForm = document.getElementById('transfer-admin-form');
  var transferAdminTargetSelect = document.getElementById('transfer-admin-target');
  var transferAdminRoleSelect = document.getElementById('transfer-admin-role');
  var transferAdminPasswordInput = document.getElementById('transfer-admin-password');
  var transferAdminSubmitButton = transferAdminForm.querySelector('button[type="submit"]');
  var transferAdminSubmitLabel = transferAdminSubmitButton.textContent;

  // Danh sách người nhận: user CÙNG Đơn vị (GET /users tự lọc theo Đơn vị
  // của người gọi, không cần tự lọc thêm), đang is_active, KHÔNG gồm chính
  // mình. page_size: 100 (mức tối đa backend cho phép) thay vì phân trang
  // 10/trang như bảng chính — đây là 1 select chọn nhanh, không phải danh
  // sách để duyệt trang.
  function populateTransferAdminTargets() {
    var me = api.getUser();
    transferAdminTargetSelect.disabled = true;
    transferAdminTargetSelect.textContent = '';
    transferAdminTargetSelect.appendChild(el('option', null, 'Đang tải danh sách người dùng...'));

    return api.users.list({ is_active: true, page_size: 100 }).then(function (data) {
      var candidates = (data.items || []).filter(function (u) { return u.id !== me.id; });

      transferAdminTargetSelect.textContent = '';
      if (!candidates.length) {
        transferAdminTargetSelect.appendChild(el('option', null, 'Không có người dùng nào khác để nhường quyền'));
        return;
      }

      var blank = el('option', null, '-- Chọn người nhận --');
      blank.value = '';
      transferAdminTargetSelect.appendChild(blank);
      candidates.forEach(function (u) {
        var option = el('option', null, u.full_name + ' (' + u.email + ')');
        option.value = u.id;
        transferAdminTargetSelect.appendChild(option);
      });
      transferAdminTargetSelect.disabled = false;
    }).catch(function (err) {
      transferAdminTargetSelect.textContent = '';
      transferAdminTargetSelect.appendChild(el('option', null, 'Không tải được danh sách người dùng'));
      global.AgriChain.toast(err.message);
    });
  }

  // Vai trò mới cho CHÍNH người đang nhường — loại bỏ vai trò is_system vì
  // không có ý nghĩa "chuyển sang chính vai trò mình sắp nhường đi" (Đơn vị
  // hiện chỉ có đúng 1 vai trò is_system: "Quản trị Đơn vị", chính là vai
  // trò đang giữ).
  function populateTransferAdminRoles() {
    transferAdminRoleSelect.disabled = true;
    transferAdminRoleSelect.textContent = '';
    transferAdminRoleSelect.appendChild(el('option', null, 'Đang tải vai trò...'));

    return api.roles.list().then(function (roleList) {
      var candidates = roleList.filter(function (role) { return !role.is_system; });

      transferAdminRoleSelect.textContent = '';
      if (!candidates.length) {
        transferAdminRoleSelect.appendChild(el('option', null, 'Chưa có vai trò nào khác — tạo vai trò mới trước'));
        return;
      }

      var blank = el('option', null, '-- Chọn vai trò mới cho bạn --');
      blank.value = '';
      transferAdminRoleSelect.appendChild(blank);
      candidates.forEach(function (role) {
        var option = el('option', null, role.name);
        option.value = role.id;
        transferAdminRoleSelect.appendChild(option);
      });
      transferAdminRoleSelect.disabled = false;
    }).catch(function (err) {
      transferAdminRoleSelect.textContent = '';
      transferAdminRoleSelect.appendChild(el('option', null, 'Không tải được vai trò'));
      global.AgriChain.toast(err.message);
    });
  }

  function openTransferAdminModal() {
    transferAdminForm.reset();
    clearErrors(transferAdminForm);
    transferAdminModal.showModal();
    populateTransferAdminTargets();
    populateTransferAdminRoles();
  }

  function closeTransferAdminModal() {
    transferAdminModal.close();
  }

  // Ánh xạ field lỗi (details.field) của TransferAdminRequest — chỉ 2 field
  // trong body, "password" sai KHÔNG đi qua đường này (backend trả 401 riêng,
  // xem handleTransferAdminSubmit()).
  function transferAdminFieldNodeFor(fieldName) {
    var map = {
      new_role_id_for_current_admin: 'transfer-admin-role',
      password: 'transfer-admin-password'
    };
    var id = map[fieldName];
    return id ? document.getElementById(id) : null;
  }

  function handleTransferAdminSubmit(event) {
    event.preventDefault();
    clearErrors(transferAdminForm);

    var problems = [];
    if (!transferAdminTargetSelect.value) {
      showError(transferAdminTargetSelect, 'Chọn người nhận quyền quản trị.');
      problems.push(transferAdminTargetSelect);
    }
    if (!transferAdminRoleSelect.value) {
      showError(transferAdminRoleSelect, 'Chọn vai trò mới cho bạn.');
      problems.push(transferAdminRoleSelect);
    }
    if (!transferAdminPasswordInput.value) {
      showError(transferAdminPasswordInput, 'Nhập mật khẩu hiện tại để xác nhận.');
      problems.push(transferAdminPasswordInput);
    }
    if (problems.length) {
      problems[0].focus();
      return;
    }

    var targetUserId = transferAdminTargetSelect.value;
    var newRoleId = Number(transferAdminRoleSelect.value);
    var password = transferAdminPasswordInput.value;
    var me = api.getUser();

    transferAdminSubmitButton.disabled = true;
    transferAdminSubmitButton.textContent = 'Đang xử lý...';

    api.users.transferAdmin(targetUserId, {
      new_role_id_for_current_admin: newRoleId,
      password: password
    }).then(function () {
      // QUAN TRỌNG: KHÔNG chỉ gọi api.auth.me() — permissions trong access
      // token hiện tại lấy thẳng từ payload JWT lúc CẤP token (xem
      // CurrentUser.permissions, agrichain-api/app/dependencies.py), me()
      // không cấp lại token nên vẫn trả về mảng quyền CŨ dù role_id/role_name
      // đã đổi (vai trò MỚI chỉ có hiệu lực với token cấp SAU đó). Đăng nhập
      // lại NGAY bằng chính email/mật khẩu vừa xác nhận để lấy token mới —
      // cũng là cách DUY NHẤT, vì backend đã tự thu hồi refresh token của
      // người gọi ngay trong transfer_admin() (agrichain-api/app/routers/
      // users.py), lần /auth/refresh kế tiếp chắc chắn thất bại.
      return api.auth.login(me.email, password, api.isRemembered()).catch(function () {
        // Nhường quyền ĐÃ THÀNH CÔNG dù bước đăng nhập lại tự động này lỗi
        // (mạng chập chờn...) — không được coi đây là lỗi của thao tác
        // nhường quyền (xem nhánh .catch cuối cùng bên dưới, chỉ xử lý lỗi
        // của chính transferAdmin()). Vẫn tải lại trang — requireAuth()/
        // listener pageshow sẽ tự đưa về trang đăng nhập nếu token cũ hết
        // hạn thật.
        global.AgriChain.toast(
          'Đã nhường quyền quản trị, nhưng không tự làm mới được phiên đăng ' +
          'nhập — đăng nhập lại nếu giao diện có gì bất thường.'
        );
      });
    }).then(function () {
      closeTransferAdminModal();
      global.location.reload();
    }).catch(function (err) {
      transferAdminSubmitButton.disabled = false;
      transferAdminSubmitButton.textContent = transferAdminSubmitLabel;

      // Sai mật khẩu xác nhận -> 401 UNAUTHORIZED (KHÔNG phải 403) — xem
      // transfer_admin() trong agrichain-api.
      if (err.status === 401) {
        showError(transferAdminPasswordInput, err.message);
        transferAdminPasswordInput.focus();
        return;
      }
      if (err.details && err.details.field) {
        var field = transferAdminFieldNodeFor(err.details.field);
        if (field) {
          showError(field, err.message);
          field.focus();
          return;
        }
      }
      // 403 (tự thao tác chính mình — không nên xảy ra ở luồng UI này vì đã
      // loại chính mình khỏi danh sách người nhận, xử lý phòng hờ) và 409
      // (VD Đơn vị mất admin cuối cùng...) đều hiện qua toast, dùng đúng
      // message tiếng Việt thật từ backend, không tự bịa thông báo.
      global.AgriChain.toast(err.message);
    });
  }

  /* --- Khởi động -------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    // platform_admin (2026-09-13, xem CLAUDE.md mục "Quản trị hệ thống
    // (platform_admin)") không thuộc Đơn vị nào nên không có người dùng của
    // "Đơn vị mình" để quản lý — mục sidebar dẫn tới trang này đã ẩn (xem
    // js/app-shell.js), nhưng gõ thẳng URL vẫn phải không vỡ trang thay vì
    // chạy tiếp loadUsers()/GET /roles... rồi hứng một loạt lỗi 403 (role
    // platform_admin không có permission nào). Thay hẳn nội dung chính bằng
    // 1 thông báo, KHÔNG chặn cứng bằng redirect (theo đúng yêu cầu, ưu tiên
    // "không vỡ trang" hơn là điều hướng đẹp ở đây).
    if (api.isPlatformAdmin()) {
      var content = document.querySelector('.app-content');
      if (content) {
        content.textContent = '';
        var notice = el('div', 'empty-state');
        notice.appendChild(svgIcon('icon-user', 'icon icon--lg'));
        notice.appendChild(el('p', 'empty-state__title', 'Không áp dụng cho tài khoản Quản trị hệ thống'));
        notice.appendChild(el('p', 'empty-state__desc',
          'Quản lý Tài khoản quản lý người dùng trong PHẠM VI 1 Đơn vị — tài khoản Quản trị hệ ' +
          'thống không thuộc Đơn vị nào nên không có gì để quản lý ở đây.'));
        content.appendChild(notice);
      }
      return;
    }

    // Modal Thêm người dùng và Đặt lại mật khẩu đều có ô mật khẩu dùng
    // js/password-field.js — phải gọi 2 hàm này thì nút hiện/ẩn và danh sách
    // điều kiện mật khẩu mới hoạt động (trang này trước đó thiếu, khiến ô
    // mật khẩu ở modal Thêm người dùng không có tác dụng gì).
    global.AgriChain.setupPasswordToggles();
    global.AgriChain.setupPasswordRules();

    applyPermissionGates();
    loadUsers();
    refreshTransferAdminVisibility();

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

    document.querySelectorAll('[data-close-edit-user-form]').forEach(function (button) {
      button.addEventListener('click', closeEditUserModal);
    });
    editUserForm.addEventListener('submit', handleEditUserSubmit);

    document.querySelectorAll('[data-close-reset-password-form]').forEach(function (button) {
      button.addEventListener('click', closeResetPasswordModal);
    });
    resetPasswordForm.addEventListener('submit', handleResetPasswordSubmit);

    document.querySelectorAll('[data-close-permission]').forEach(function (button) {
      button.addEventListener('click', closePermissionModal);
    });
    document.querySelector('[data-permission-retry]').addEventListener('click', function () {
      if (currentPermissionUser) loadPermissionMatrix(currentPermissionUser);
    });
    savePermissionBtn.addEventListener('click', handlePermissionSave);

    document.querySelectorAll('[data-open-transfer-admin]').forEach(function (button) {
      button.addEventListener('click', openTransferAdminModal);
    });
    document.querySelectorAll('[data-close-transfer-admin]').forEach(function (button) {
      button.addEventListener('click', closeTransferAdminModal);
    });
    transferAdminForm.addEventListener('submit', handleTransferAdminSubmit);
  });
})(window);
