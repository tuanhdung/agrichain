/* ==========================================================================
   AgriChain — Trang Vật tư
   Thống kê theo loại, bảng danh sách, thêm/sửa/xoá.
   Nạp SAU js/store.js và js/app-shell.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var store = global.AgriChain.store;

  /* --- Danh mục loại vật tư ------------------------------------------------
     `key` là thứ được lưu xuống localStorage — ĐỪNG đổi khi đã có dữ liệu,
     nhãn hiển thị thì sửa thoải mái. */
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
  var typeSelect = document.getElementById('material-type');
  var unitSelect = document.getElementById('material-unit');
  var submitLabel = document.querySelector('[data-submit-label]');
  var modalTitle = document.getElementById('material-modal-title');

  var editingId = null;   // null = đang thêm mới
  var deletingId = null;

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
      formatDateTime(material.updatedAt || material.createdAt)));

    var actions = el('td');
    var wrap = el('div', 'table__actions');

    var edit = el('button', 'icon-btn');
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Sửa ' + material.name);
    edit.setAttribute('data-tooltip', 'Chỉnh sửa');
    edit.appendChild(svgIcon('icon-pencil'));
    edit.addEventListener('click', function () { openEdit(material.id); });

    var del = el('button', 'icon-btn icon-btn--danger');
    del.type = 'button';
    del.setAttribute('aria-label', 'Xoá ' + material.name);
    del.setAttribute('data-tooltip', 'Xoá');
    del.appendChild(svgIcon('icon-trash'));
    del.addEventListener('click', function () { askDelete(material.id); });

    wrap.appendChild(edit);
    wrap.appendChild(del);
    actions.appendChild(wrap);
    tr.appendChild(actions);

    return tr;
  }

  function render() {
    var materials = store.list('supplies');
    renderStats(materials);

    tableBody.textContent = '';
    if (!materials.length) {
      tablePanel.hidden = true;
      emptyNode.hidden = false;
      return;
    }

    emptyNode.hidden = true;
    tablePanel.hidden = false;

    // Mới cập nhật lên đầu — người dùng vừa sửa gì thì thấy ngay.
    materials.slice().sort(function (a, b) {
      var left = a.updatedAt || a.createdAt || '';
      var right = b.updatedAt || b.createdAt || '';
      return right.localeCompare(left);
    }).forEach(function (material) {
      tableBody.appendChild(row(material));
    });
  }

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

  function suggestMaterialCode(typeKey) {
    var prefix = typeCodePrefix(typeOf(typeKey));
    var count = store.list('supplies').filter(function (item) {
      return item.type === typeKey;
    }).length;
    var seq = String(count + 1);
    while (seq.length < 2) seq = '0' + seq;
    return prefix + seq;
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
    var material = store.find('supplies', id);
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
    } else {
      var duplicate = store.list('supplies').some(function (item) {
        return item.id !== editingId &&
          item.code.toLowerCase() === code.value.trim().toLowerCase();
      });
      if (duplicate) {
        showError(code, 'Mã này đã dùng cho vật tư khác.');
        problems.push(code);
      }
    }

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
      description: String(data.get('description') || '').trim()
    };

    if (editingId) {
      store.update('supplies', editingId, record);
      global.AgriChain.toast('Đã lưu thay đổi.');
    } else {
      store.insert('supplies', record);
      global.AgriChain.toast('Đã thêm vật tư.');
    }

    closeModal();
    render();
  }

  /* --- Xoá ------------------------------------------------------------------ */

  function askDelete(id) {
    var material = store.find('supplies', id);
    if (!material) return;
    deletingId = id;
    document.querySelector('[data-delete-name]').textContent = material.name;
    deleteModal.showModal();
  }

  function confirmDelete() {
    if (deletingId) {
      store.remove('supplies', deletingId);
      deletingId = null;
      render();
      global.AgriChain.toast('Đã xoá vật tư.');
    }
    deleteModal.close();
  }

  /* --- Khởi động ------------------------------------------------------------ */

  document.addEventListener('DOMContentLoaded', function () {
    fillSelects();
    render();

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
      document.getElementById('material-code').value = suggestMaterialCode(typeSelect.value);
    });

    form.addEventListener('submit', handleSubmit);
  });

  // Trang Lô hàng sau này cần chọn vật tư — chia sẻ lại danh mục để không phải
  // khai báo hai lần rồi lệch nhau.
  global.AgriChain.materialTypes = TYPES;
  global.AgriChain.materialUnits = UNITS;
})(window);