/* ==========================================================================
   AgriChain — Trang Vật tư
   ĐÃ CHUYỂN SANG BACKEND THẬT qua js/api.js (GET/POST/PATCH/DELETE
   /supplies) — không còn đọc/ghi qua AgriChain.store/collection "supplies"
   nữa. Thống kê theo loại chỉ tính trên TRANG dữ liệu đang tải (page_size
   lớn), không phải toàn bộ hệ thống nếu vượt quá page_size — xem
   loadSupplies(). Nạp SAU js/api-config.js, js/api.js, js/app-shell.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var api = global.AgriChain.api;
  var PAGE_SIZE = 50;
  var SEARCH_DEBOUNCE_MS = 300;

  /* --- Danh mục loại vật tư ------------------------------------------------
     `key` khớp enum `type` của backend thật (SupplyCreate/SupplyOut) — ĐỪNG
     đổi khi đã có dữ liệu, nhãn hiển thị thì sửa thoải mái. */
  var TYPES = [
    { key: 'fertilizer', label: 'Phân bón',           icon: 'icon-seedling' },
    { key: 'pesticide',  label: 'Thuốc trừ sâu',      icon: 'icon-bug' },
    { key: 'herbicide',  label: 'Thuốc diệt cỏ',      icon: 'icon-grass' },
    { key: 'fungicide',  label: 'Thuốc trị nấm',      icon: 'icon-mushroom' },
    { key: 'seed',       label: 'Hạt giống',          icon: 'icon-seed' },
    { key: 'bio',        label: 'Chế phẩm sinh học',  icon: 'icon-flask' },
    { key: 'other',      label: 'Khác',               icon: 'icon-box' }
  ];

  var UNITS = ['kg', 'g', 'Lít', 'ml', 'Gói', 'Chai', 'Thùng/Hộp', 'Bao', 'Cái'];

  function typeOf(key) {
    for (var i = 0; i < TYPES.length; i++) {
      if (TYPES[i].key === key) return TYPES[i];
    }
    return TYPES[TYPES.length - 1]; // rơi về "Khác" nếu gặp key lạ
  }

  var modal = document.getElementById('material-modal');
  var form = document.getElementById('material-form');
  var deleteModal = document.getElementById('delete-modal');
  var statsNode = document.querySelector('[data-stats]');
  var tablePanel = document.querySelector('[data-table-panel]');
  var tableBody = document.querySelector('[data-table-body]');
  var emptyNode = document.querySelector('[data-empty]');
  var emptyTitleNode = document.querySelector('[data-supply-empty-title]');
  var emptyDescNode = document.querySelector('[data-supply-empty-desc]');
  var searchInput = document.querySelector('[data-supply-search]');
  var loadingNode = document.querySelector('[data-supply-loading]');
  var errorNode = document.querySelector('[data-supply-error]');
  var errorMessageNode = document.querySelector('[data-supply-error-message]');
  var paginationNode = document.querySelector('[data-supply-pagination]');
  var pageInfoNode = document.querySelector('[data-supply-page-info]');
  var prevPageBtn = document.querySelector('[data-supply-prev-page]');
  var nextPageBtn = document.querySelector('[data-supply-next-page]');
  var typeSelect = document.getElementById('material-type');
  var unitSelect = document.getElementById('material-unit');
  var submitLabel = document.querySelector('[data-submit-label]');
  var modalTitle = document.getElementById('material-modal-title');

  var editingId = null;   // null = đang thêm mới
  var deletingId = null;
  var listState = { page: 1, q: '', total: 0 };
  // Bản ghi của trang hiện đang hiển thị — openEdit()/askDelete() tra cứu
  // từ đây thay vì gọi lại API, vì dữ liệu vừa tải và chắc chắn còn mới.
  var loadedSupplies = [];

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      global.clearTimeout(timer);
      timer = global.setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  function findLoaded(id) {
    for (var i = 0; i < loadedSupplies.length; i++) {
      if (loadedSupplies[i].id === id) return loadedSupplies[i];
    }
    return null;
  }

  /* --- Tiện ích ------------------------------------------------------------ */

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

  // "2026-08-12T08:15:53.000Z" -> "12/08/2026 15:15" (giờ địa phương)
  function formatDateTime(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    function pad(n) { return n < 10 ? '0' + n : String(n); }
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /* --- Thống kê ------------------------------------------------------------ */

  function renderStats(materials) {
    statsNode.textContent = '';

    var total = el('div', 'stat-card stat-card--total');
    var totalIcon = el('div', 'stat-card__icon');
    totalIcon.appendChild(svgIcon('icon-box', 'icon icon--lg'));
    var totalText = el('div');
    totalText.appendChild(el('div', 'stat-card__value', String(materials.length)));
    totalText.appendChild(el('div', 'stat-card__label', 'Tổng số vật tư'));
    total.appendChild(totalIcon);
    total.appendChild(totalText);
    statsNode.appendChild(total);

    TYPES.forEach(function (type) {
      var count = materials.filter(function (item) {
        return item.type === type.key;
      }).length;

      var card = el('div', 'stat-card');
      var icon = el('div', 'stat-card__icon badge--cat-' + type.key);
      icon.appendChild(svgIcon(type.icon));
      var text = el('div');
      text.appendChild(el('div', 'stat-card__value', String(count)));
      text.appendChild(el('div', 'stat-card__label', type.label));
      card.appendChild(icon);
      card.appendChild(text);
      statsNode.appendChild(card);
    });
  }

  /* --- Bảng ---------------------------------------------------------------- */

  function row(material) {
    var type = typeOf(material.type);
    var tr = el('tr');

    tr.appendChild(el('td', 'table__code', material.code));

    var typeCell = el('td');
    var badge = el('span', 'badge badge--cat-' + type.key);
    badge.appendChild(svgIcon(type.icon));
    badge.appendChild(el('span', null, type.label));
    typeCell.appendChild(badge);
    tr.appendChild(typeCell);

    tr.appendChild(el('td', 'table__name', material.name));
    tr.appendChild(el('td', 'table__desc', material.description || '—'));
    tr.appendChild(el('td', null, material.manufacturer || '—'));

    var unitCell = el('td');
    unitCell.appendChild(el('span', 'badge badge--neutral', material.unit));
    tr.appendChild(unitCell);

    tr.appendChild(el('td', 'table__muted table__nowrap',
      formatDateTime(material.updated_at || material.created_at)));

    var actions = el('td');
    var wrap = el('div', 'table__actions');

    var edit = el('button', 'icon-btn');
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Sửa ' + material.name);
    edit.setAttribute('data-tooltip', 'Chỉnh sửa');
    if (!api.hasPermission('supplies.edit')) edit.hidden = true;
    edit.appendChild(svgIcon('icon-pencil'));
    edit.addEventListener('click', function () { openEdit(material.id); });

    var del = el('button', 'icon-btn icon-btn--danger');
    del.type = 'button';
    del.setAttribute('aria-label', 'Xoá ' + material.name);
    del.setAttribute('data-tooltip', 'Xoá');
    if (!api.hasPermission('supplies.delete')) del.hidden = true;
    del.appendChild(svgIcon('icon-trash'));
    del.addEventListener('click', function () { askDelete(material.id); });

    wrap.appendChild(edit);
    wrap.appendChild(del);
    actions.appendChild(wrap);
    tr.appendChild(actions);

    return tr;
  }

  function setListView(view) {
    loadingNode.hidden = view !== 'loading';
    errorNode.hidden = view !== 'error';
    tablePanel.hidden = view !== 'data';
    emptyNode.hidden = view !== 'empty';
    paginationNode.hidden = view !== 'data';
    statsNode.hidden = view !== 'data' && view !== 'empty';
  }

  function renderList(data) {
    var materials = data.items || [];
    loadedSupplies = materials;
    listState.total = data.total || 0;

    renderStats(materials);
    tableBody.textContent = '';

    if (!materials.length) {
      if (listState.q) {
        emptyTitleNode.textContent = 'Không tìm thấy vật tư nào';
        emptyDescNode.textContent = 'Thử lại với từ khoá khác.';
      } else {
        emptyTitleNode.textContent = 'Chưa có vật tư nào';
        emptyDescNode.textContent = 'Vật tư là những gì được dùng trong từng giai đoạn canh tác. ' +
          'Khai báo ở đây để sau này chọn nhanh khi ghi nhận sự kiện cho lô hàng.';
      }
      setListView('empty');
      return;
    }

    // Mới cập nhật lên đầu — người dùng vừa sửa gì thì thấy ngay.
    materials.slice().sort(function (a, b) {
      var left = a.updated_at || a.created_at || '';
      var right = b.updated_at || b.created_at || '';
      return right.localeCompare(left);
    }).forEach(function (material) {
      tableBody.appendChild(row(material));
    });
    setListView('data');

    var totalPages = Math.max(1, Math.ceil(listState.total / PAGE_SIZE));
    pageInfoNode.textContent = 'Trang ' + listState.page + ' / ' + totalPages;
    prevPageBtn.disabled = listState.page <= 1;
    nextPageBtn.disabled = listState.page >= totalPages;
  }

  function loadSupplies() {
    setListView('loading');
    api.supplies.list({
      q: listState.q || undefined,
      page: listState.page,
      page_size: PAGE_SIZE
    }).then(function (data) {
      renderList(data);
    }).catch(function (err) {
      errorMessageNode.textContent = err.message;
      setListView('error');
    });
  }

  var handleSearchInput = debounce(function () {
    listState.q = searchInput.value.trim();
    listState.page = 1;
    loadSupplies();
  }, SEARCH_DEBOUNCE_MS);

  /* --- Gợi ý mã vật tư theo loại --------------------------------------------
     "Thuốc trị nấm" -> chữ cái đầu mỗi từ (bỏ dấu) -> "TTN" + số thứ tự 2 chữ
     số trong đúng loại đó, ví dụ TTN01. Chỉ gợi ý — người dùng vẫn sửa được. */
  function stripDiacritics(text) {
    // NFD tách mỗi chữ có dấu thành chữ cái gốc + dấu kết hợp riêng (combining
    // mark, U+0300-U+036F) đứng liền sau — lớp regex dưới đây xoá đúng dải đó,
    // chỉ còn lại chữ cái gốc không dấu. Riêng "đ/Đ" không tách được qua NFD
    // (là chữ cái riêng trong bảng Unicode, không phải d+dấu) nên xử lý tay.
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd');
  }

  function typeCodePrefix(type) {
    return stripDiacritics(type.label)
      .split(/\s+/)
      .map(function (word) { return word.charAt(0).toUpperCase(); })
      .join('');
  }

  // Bất đồng bộ: cần hỏi backend tổng số vật tư CÙNG LOẠI (page_size=1, chỉ
  // cần đọc `.total`) — trang đang tải có thể không chứa đủ để đếm chính
  // xác (đã lọc theo từ khoá tìm kiếm, hoặc còn trang khác). Chỉ là gợi ý,
  // người dùng luôn sửa được nên sai lệch nhỏ không phải vấn đề nghiêm trọng.
  function suggestMaterialCode(typeKey, callback) {
    var prefix = typeCodePrefix(typeOf(typeKey));
    api.supplies.list({ type: typeKey, page_size: 1 }).then(function (data) {
      var seq = String((data.total || 0) + 1);
      while (seq.length < 2) seq = '0' + seq;
      callback(prefix + seq);
    }).catch(function () {
      callback(prefix + '01');
    });
  }

  /* --- Modal thêm/sửa ------------------------------------------------------ */

  function fillSelects() {
    TYPES.forEach(function (type) {
      var option = el('option', null, type.label);
      option.value = type.key;
      typeSelect.appendChild(option);
    });
    UNITS.forEach(function (unit) {
      var option = el('option', null, unit);
      option.value = unit;
      unitSelect.appendChild(option);
    });
  }

  function openCreate() {
    editingId = null;
    form.reset();
    clearErrors();
    modalTitle.textContent = 'Thêm vật tư mới';
    submitLabel.textContent = 'Lưu vật tư';
    modal.showModal();
    document.getElementById('material-code').focus();
  }

  function openEdit(id) {
    var material = findLoaded(id);
    if (!material) return;

    editingId = id;
    form.reset();
    clearErrors();
    modalTitle.textContent = 'Sửa vật tư';
    submitLabel.textContent = 'Lưu thay đổi';

    document.getElementById('material-code').value = material.code || '';
    document.getElementById('material-type').value = material.type || 'other';
    document.getElementById('material-name').value = material.name || '';
    document.getElementById('material-manufacturer').value = material.manufacturer || '';
    document.getElementById('material-unit').value = material.unit || UNITS[0];
    document.getElementById('material-description').value = material.description || '';

    modal.showModal();
    document.getElementById('material-name').focus();
  }

  function closeModal() {
    modal.close();
    editingId = null;
  }

  /* --- Kiểm tra dữ liệu ---------------------------------------------------- */

  function clearErrors() {
    form.querySelectorAll('.field__error').forEach(function (node) { node.remove(); });
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (node) {
      node.removeAttribute('aria-invalid');
    });
  }

  function showError(field, message) {
    field.setAttribute('aria-invalid', 'true');
    field.parentNode.appendChild(el('p', 'field__error', message));
  }

  function validate() {
    clearErrors();
    var problems = [];

    var code = document.getElementById('material-code');
    var name = document.getElementById('material-name');
    var manufacturer = document.getElementById('material-manufacturer');

    if (!code.value.trim()) {
      showError(code, 'Nhập mã vật tư.');
      problems.push(code);
    }
    // Không kiểm tra trùng mã phía client — trang chỉ tải 1 phần dữ liệu
    // (phân trang/tìm kiếm), không đủ để biết TOÀN BỘ mã đã dùng. Backend
    // tự kiểm tra trùng "code" toàn hệ thống, trả lỗi kèm details.field.

    if (!name.value.trim()) {
      showError(name, 'Nhập tên vật tư.');
      problems.push(name);
    }
    if (!manufacturer.value.trim()) {
      showError(manufacturer, 'Nhập nhà sản xuất.');
      problems.push(manufacturer);
    }

    if (problems.length) {
      problems[0].focus();
      return false;
    }
    return true;
  }

  // Ánh xạ tên field backend trả về trong lỗi (details.field) sang đúng
  // input trên form — khớp SupplyCreate/SupplyUpdate thật.
  function fieldNodeFor(fieldName) {
    var map = {
      code: 'material-code',
      type: 'material-type',
      name: 'material-name',
      manufacturer: 'material-manufacturer',
      unit: 'material-unit',
      description: 'material-description'
    };
    var id = map[fieldName];
    return id ? document.getElementById(id) : null;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    var data = new FormData(form);
    var record = {
      code: String(data.get('code')).trim(),
      type: String(data.get('type')),
      name: String(data.get('name')).trim(),
      manufacturer: String(data.get('manufacturer')).trim(),
      unit: String(data.get('unit')),
      description: String(data.get('description') || '').trim() || null
    };

    var submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitLabel.textContent = 'Đang lưu...';

    var request = editingId
      ? api.supplies.update(editingId, record)
      : api.supplies.create(record);

    request.then(function () {
      closeModal();
      loadSupplies();
      global.AgriChain.toast(editingId ? 'Đã lưu thay đổi.' : 'Đã thêm vật tư.');
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
      submitButton.disabled = false;
      submitLabel.textContent = editingId ? 'Lưu thay đổi' : 'Lưu vật tư';
    });
  }

  /* --- Xoá ------------------------------------------------------------------ */

  function askDelete(id) {
    var material = findLoaded(id);
    if (!material) return;
    deletingId = id;
    document.querySelector('[data-delete-name]').textContent = material.name;
    deleteModal.showModal();
  }

  function confirmDelete() {
    if (!deletingId) {
      deleteModal.close();
      return;
    }
    var id = deletingId;
    deletingId = null;
    api.supplies.remove(id).then(function () {
      loadSupplies();
      global.AgriChain.toast('Đã xoá vật tư.');
    }).catch(function (err) {
      // VD 409 nếu backend chặn xoá vật tư còn được tham chiếu ở nhật ký/
      // bước quy trình — hiện đúng lỗi, không giả vờ đã xoá thành công.
      global.AgriChain.toast(err.message);
    });
    deleteModal.close();
  }

  // Ẩn nút nào người dùng hiện tại không có quyền — đánh dấu sẵn bằng
  // data-requires-permission="<mã quyền>" trên nút trong HTML.
  function applyPermissionGates() {
    document.querySelectorAll('[data-requires-permission]').forEach(function (node) {
      var code = node.getAttribute('data-requires-permission');
      if (!api.hasPermission(code)) node.hidden = true;
    });
  }

  /* --- Khởi động ------------------------------------------------------------ */

  document.addEventListener('DOMContentLoaded', function () {
    applyPermissionGates();
    fillSelects();
    loadSupplies();

    searchInput.addEventListener('input', handleSearchInput);
    prevPageBtn.addEventListener('click', function () {
      if (listState.page <= 1) return;
      listState.page -= 1;
      loadSupplies();
    });
    nextPageBtn.addEventListener('click', function () {
      listState.page += 1;
      loadSupplies();
    });
    document.querySelector('[data-supply-retry]').addEventListener('click', loadSupplies);

    document.querySelectorAll('[data-open-form]').forEach(function (button) {
      button.addEventListener('click', openCreate);
    });
    document.querySelectorAll('[data-close-form]').forEach(function (button) {
      button.addEventListener('click', closeModal);
    });
    document.querySelectorAll('[data-close-delete]').forEach(function (button) {
      button.addEventListener('click', function () { deleteModal.close(); });
    });
    document.querySelector('[data-confirm-delete]').addEventListener('click', confirmDelete);

    // Chỉ gợi ý mã khi đang thêm mới — sửa vật tư đã có thì đổi loại không
    // được tự ý ghi đè mã đang dùng.
    typeSelect.addEventListener('change', function () {
      if (editingId) return;
      suggestMaterialCode(typeSelect.value, function (code) {
        document.getElementById('material-code').value = code;
      });
    });

    form.addEventListener('submit', handleSubmit);
  });

  // Trang Lô hàng sau này cần chọn vật tư — chia sẻ lại danh mục để không phải
  // khai báo hai lần rồi lệch nhau.
  global.AgriChain.materialTypes = TYPES;
  global.AgriChain.materialUnits = UNITS;
})(window);