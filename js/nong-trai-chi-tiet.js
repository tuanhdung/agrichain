/* ==========================================================================
   AgriChain — Trang chi tiết 1 nông trại (nong-trai-chi-tiet.html?ma=...)
   Đọc mã nông trại từ query string (?ma=), tìm trong AgriChain.store rồi vẽ
   lại thông tin, cùng 2 danh sách con gắn theo farmId: chứng nhận nông trại
   và lịch sử mùa vụ (thêm/sửa/xoá ngay tại đây). Nạp SAU js/store.js,
   js/app-shell.js và js/map-layers.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var store = global.AgriChain.store;

  var CERT_STATUSES = [
    { key: 'active',    label: 'Hoạt động',    badge: 'badge--success' },
    { key: 'expired',   label: 'Hết hạn',      badge: 'badge--danger' },
    { key: 'suspended', label: 'Tạm đình chỉ', badge: 'badge--warning' },
    { key: 'revoked',   label: 'Đã thu hồi',   badge: 'badge--neutral' }
  ];

  var SEASON_STATUSES = [
    { key: 'planned',     label: 'Kế hoạch',       badge: 'badge--neutral' },
    { key: 'in_progress', label: 'Đang thực hiện', badge: 'badge--info' },
    { key: 'harvested',   label: 'Đã thu hoạch',   badge: 'badge--warning' },
    { key: 'completed',   label: 'Hoàn thành',     badge: 'badge--success' },
    { key: 'failed',      label: 'Thất bại',       badge: 'badge--danger' }
  ];

  // `color` chọn trong 5 màu ngữ nghĩa sẵn có (success/info/warning/danger/
  // neutral) — tô icon + viền trái của từng dòng nhật ký (xem .log-item--*).
  var ACTIVITY_TYPES = [
    { key: 'planting',     label: 'Đang xuống giống',   icon: 'icon-seed',    color: 'success' },
    { key: 'fertilizing',  label: 'Bón phân',           icon: 'icon-flask',   color: 'info' },
    { key: 'watering',     label: 'Tưới nước',          icon: 'icon-droplet', color: 'info' },
    { key: 'pest_control', label: 'Phòng trừ sâu bệnh', icon: 'icon-bug',     color: 'danger' },
    { key: 'weeding',      label: 'Làm cỏ',             icon: 'icon-grass',   color: 'warning' },
    { key: 'pruning',      label: 'Cắt tỉa',            icon: 'icon-scissors', color: 'warning' },
    { key: 'harvesting',   label: 'Thu hoạch',          icon: 'icon-wheat',   color: 'success' },
    { key: 'inspection',   label: 'Kiểm tra',           icon: 'icon-eye',     color: 'neutral' },
    { key: 'other',        label: 'Khác',               icon: 'icon-box',     color: 'neutral' }
  ];

  var BATCH_UNITS = ['kg', 'Tấn', 'Bó/Nài', 'Cái/Trái', 'Bao/Túi', 'Két/Thùng', 'Khác'];

  // Đơn vị dùng riêng cho dòng "Vật tư sử dụng" trong form nhật ký — trùng
  // nội dung với UNITS ở vat-tu.js nhưng khai báo lại vì 2 trang không nạp
  // chéo JS của nhau (mỗi trang chỉ tự nạp file riêng của nó).
  var MATERIAL_UNITS = ['kg', 'g', 'Lít', 'ml', 'Gói', 'Chai', 'Thùng/Hộp', 'Bao', 'Cái'];

  var MATERIAL_METHODS = [
    'Phun thuốc', 'Tưới nước', 'Bón vãi', 'Bón lá', 'Bón đất',
    'Xử lý hạt giống', 'Bón phân qua hệ thống tưới', 'Tưới nhỏ giọt',
    'Xông hơi', 'Khác'
  ];

  var BATCH_STATUSES = [
    { key: 'planning',   label: 'Đang lập kế hoạch', badge: 'badge--neutral', icon: 'icon-file-text' },
    { key: 'planted',    label: 'Đang xuống giống',  badge: 'badge--info',    icon: 'icon-seedling' },
    { key: 'growing',    label: 'Đang canh tác',     badge: 'badge--info',    icon: 'icon-leaf' },
    { key: 'harvested',  label: 'Đã thu hoạch',      badge: 'badge--warning', icon: 'icon-wheat' },
    { key: 'processed',  label: 'Đã sơ chế',         badge: 'badge--warning', icon: 'icon-factory' },
    { key: 'completed',  label: 'Hoàn thành',        badge: 'badge--success', icon: 'icon-check-circle' },
    { key: 'failed',     label: 'Thất bại',          badge: 'badge--danger',  icon: 'icon-x-circle' }
  ];

  // Dùng chung cho mọi danh mục { key, label, ... } — trạng thái chứng nhận/
  // mùa vụ/lô hàng và loại hoạt động nhật ký đều tra cứu qua đây.
  function statusOf(list, key) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].key === key) return list[i];
    }
    return list[0];
  }

  var notFoundNode = document.querySelector('[data-not-found]');
  var detailNode = document.querySelector('[data-farm-detail]');
  var breadcrumbNode = document.querySelector('[data-farm-breadcrumb]');

  // Nông trại đang xem — chứng nhận/mùa vụ đều gắn theo farmId của nó.
  var currentFarm = null;

  /* --- Tiện ích -------------------------------------------------------------- */

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

  function formatDate(value) {
    if (!value) return 'Chưa đặt';
    var parts = value.split('-');
    if (parts.length !== 3) return value;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function formatArea(value) {
    var num = Number(value);
    if (!num) return '0 ha';
    return num + ' ha';
  }

  // input[type=datetime-local] trả về "2026-08-28T15:10" (không giây, không
  // múi giờ) — tách theo "T" rồi tái dùng formatDate() cho phần ngày.
  function formatDateTimeLocal(value) {
    if (!value) return 'Chưa đặt';
    var parts = value.split('T');
    if (parts.length !== 2) return value;
    return formatDate(parts[0]) + ' ' + parts[1];
  }

  function fillField(selector, value) {
    var node = detailNode.querySelector(selector);
    if (node) node.textContent = value || '—';
  }

  function clearErrors(form) {
    form.querySelectorAll('.field__error').forEach(function (node) { node.remove(); });
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (node) {
      node.removeAttribute('aria-invalid');
    });
  }

  function showError(field, message) {
    field.setAttribute('aria-invalid', 'true');
    field.parentNode.appendChild(el('p', 'field__error', message));
  }

  // Một hàng trong thẻ dữ liệu: icon, rồi nhãn nhỏ (mờ) phía trên + giá trị
  // bên dưới. `value` có thể là chuỗi hoặc 1 Node dựng sẵn (VD nhóm badge).
  function fieldRow(iconName, label, value) {
    var row = el('div', 'data-card__row');
    row.appendChild(svgIcon(iconName));

    var text = el('div');
    text.appendChild(el('div', 'data-card__row-label', label));
    if (value instanceof Node) {
      text.appendChild(value);
    } else {
      text.appendChild(el('div', null, value));
    }
    row.appendChild(text);

    return row;
  }

  /* --- Bản đồ chỉ xem, không cho click-để-đánh-dấu -------------------------
     Dùng chung addMapBaseLayers() (js/map-layers.js) với bản đồ vẽ ranh giới
     ở nong-trai.html để có cùng 3 lớp nền vệ tinh/địa hình/mặc định. */
  function showFarmOnMap(farm) {
    if (typeof L === 'undefined') return;

    var map = L.map('farm-view-map', { center: [16.0, 106.0], zoom: 5 });
    global.AgriChain.addMapBaseLayers(map);

    var polygon = farm.polygon || [];
    if (polygon.length >= 3) {
      var latlngs = polygon.map(function (p) { return [p.lat, p.lng]; });
      L.polygon(latlngs, {
        color: '#1F8F58', weight: 3, fillColor: '#2EA86B', fillOpacity: 0.25
      }).addTo(map);
      map.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24] });
    }

    // Khung bản đồ chỉ có kích thước thật sau khi trình duyệt vẽ xong khối
    // cha (vừa được bỏ [hidden]) — đợi 1 khung hình rồi mới đo lại.
    global.requestAnimationFrame(function () {
      map.invalidateSize();
    });
  }

  function showNotFound(code) {
    notFoundNode.hidden = false;
    detailNode.hidden = true;
    breadcrumbNode.textContent = 'Không tìm thấy';
    notFoundNode.querySelector('[data-not-found-title]').textContent =
      'Không tìm thấy nông trại có mã "' + code + '"';
  }

  function showFarm(farm) {
    currentFarm = farm;
    notFoundNode.hidden = true;
    detailNode.hidden = false;

    breadcrumbNode.textContent = farm.name;
    fillField('[data-view-name]', farm.name);
    fillField('[data-view-code]', farm.code);
    fillField('[data-view-area]', formatArea(farm.area));
    fillField('[data-view-address]', farm.address);
    fillField('[data-view-ward]', farm.ward);
    fillField('[data-view-province]', farm.province);
    fillField('[data-view-start-date]', formatDate(farm.startDate));
    fillField('[data-view-national-puc]', farm.nationalPuc);
    fillField('[data-view-international-puc]', farm.internationalPuc);
    fillField('[data-view-desc]', farm.description);

    showFarmOnMap(farm);
    renderCertifications();
    renderSeasons();
  }

  /* ======================================================================
     Chứng nhận nông trại
     ====================================================================== */

  var certModal = document.getElementById('cert-modal');
  var certForm = document.getElementById('cert-form');
  var certStatusSelect = document.getElementById('cert-status');
  var certModalTitle = document.getElementById('cert-modal-title');
  var certSubmitLabel = document.querySelector('[data-cert-submit-label]');
  var certListNode = document.querySelector('[data-cert-list]');
  var certEmptyNode = document.querySelector('[data-cert-empty]');
  var certCountNode = document.querySelector('[data-cert-count]');
  var certFileInput = document.getElementById('cert-file');
  var certFileCurrent = document.querySelector('[data-cert-file-current]');
  var certFileLink = document.querySelector('[data-cert-file-link]');

  var editingCertId = null;
  var certFile = null;        // { name, type, dataUrl } — tệp MỚI vừa chọn, null nếu chưa đổi
  var certFileRemoved = false; // true khi bấm "Gỡ tệp" — bỏ tệp cũ đi, không thay bằng tệp mới

  function fillCertStatuses() {
    CERT_STATUSES.forEach(function (status) {
      var option = el('option', null, status.label);
      option.value = status.key;
      certStatusSelect.appendChild(option);
    });
  }

  function certsOfFarm() {
    if (!currentFarm) return [];
    return store.list('certifications').filter(function (item) {
      return item.farmId === currentFarm.id;
    });
  }

  function certCard(cert) {
    var status = statusOf(CERT_STATUSES, cert.status);
    var card = el('article', 'card card--hover');

    var header = el('div', 'card__header data-card__header');
    header.appendChild(el('h2', 'data-card__title', cert.name));
    header.appendChild(el('span', 'badge ' + status.badge, status.label));
    card.appendChild(header);

    var rows = el('div', 'data-card__rows');
    rows.appendChild(fieldRow('icon-qr-code', 'Mã', cert.code));
    if (cert.issuer) rows.appendChild(fieldRow('icon-factory', 'Cơ quan cấp', cert.issuer));
    rows.appendChild(fieldRow('icon-calendar', 'Ngày cấp', formatDate(cert.issueDate)));
    rows.appendChild(fieldRow('icon-calendar', 'Ngày hết hạn', formatDate(cert.expiryDate)));

    var fileValue;
    if (cert.fileDataUrl) {
      fileValue = el('a', 'badge badge--info', cert.fileName || 'Tệp đính kèm');
      fileValue.href = cert.fileDataUrl;
      fileValue.target = '_blank';
      fileValue.rel = 'noopener';
    } else {
      fileValue = '—';
    }
    rows.appendChild(fieldRow('icon-paperclip', 'Tệp tin', fileValue));

    if (cert.note) rows.appendChild(fieldRow('icon-file-text', 'Ghi chú', cert.note));

    card.appendChild(rows);

    var actions = el('div', 'data-card__actions');

    var edit = el('button', 'icon-btn');
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Sửa ' + cert.name);
    edit.setAttribute('data-tooltip', 'Chỉnh sửa');
    edit.appendChild(svgIcon('icon-pencil'));
    edit.addEventListener('click', function () { openCertModal(cert); });

    var del = el('button', 'icon-btn icon-btn--danger');
    del.type = 'button';
    del.setAttribute('aria-label', 'Xoá ' + cert.name);
    del.setAttribute('data-tooltip', 'Xoá');
    del.appendChild(svgIcon('icon-trash'));
    del.addEventListener('click', function () { deleteCert(cert); });

    actions.appendChild(edit);
    actions.appendChild(del);
    card.appendChild(actions);

    return card;
  }

  function renderCertifications() {
    var certs = certsOfFarm();
    certCountNode.textContent = certs.length;

    certListNode.textContent = '';
    if (!certs.length) {
      certListNode.hidden = true;
      certEmptyNode.hidden = false;
      return;
    }

    certEmptyNode.hidden = true;
    certListNode.hidden = false;
    certs.forEach(function (cert) {
      certListNode.appendChild(certCard(cert));
    });
  }

  function resetCertFileField() {
    certFile = null;
    certFileRemoved = false;
    certFileInput.value = '';
    certFileCurrent.hidden = true;
  }

  function openCertModal(cert) {
    certForm.reset();
    clearErrors(certForm);
    resetCertFileField();
    editingCertId = cert ? cert.id : null;

    if (cert) {
      certModalTitle.textContent = 'Sửa chứng nhận';
      certSubmitLabel.textContent = 'Lưu thay đổi';
      document.getElementById('cert-name').value = cert.name || '';
      document.getElementById('cert-code').value = cert.code || '';
      document.getElementById('cert-issuer').value = cert.issuer || '';
      certStatusSelect.value = cert.status || CERT_STATUSES[0].key;
      document.getElementById('cert-issue-date').value = cert.issueDate || '';
      document.getElementById('cert-expiry-date').value = cert.expiryDate || '';
      document.getElementById('cert-note').value = cert.note || '';

      if (cert.fileDataUrl) {
        certFileLink.textContent = cert.fileName || 'Xem tệp';
        certFileLink.href = cert.fileDataUrl;
        certFileCurrent.hidden = false;
      }
    } else {
      certModalTitle.textContent = 'Thêm chứng nhận mới';
      certSubmitLabel.textContent = 'Lưu chứng nhận';
      certStatusSelect.value = CERT_STATUSES[0].key;
    }

    certModal.showModal();
    document.getElementById('cert-name').focus();
  }

  function closeCertModal() {
    certModal.close();
    editingCertId = null;
  }

  function handleCertFileChange() {
    var file = certFileInput.files && certFileInput.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function () {
      certFile = { name: file.name, type: file.type, dataUrl: reader.result };
      certFileRemoved = false;
      certFileCurrent.hidden = true; // tệp mới thay cho tệp cũ, khỏi hiện link cũ gây nhầm
    };
    reader.readAsDataURL(file);
  }

  function removeCertFile() {
    certFile = null;
    certFileRemoved = true;
    certFileInput.value = '';
    certFileCurrent.hidden = true;
  }

  function validateCert() {
    clearErrors(certForm);
    var problems = [];
    var name = document.getElementById('cert-name');
    var code = document.getElementById('cert-code');
    var issuer = document.getElementById('cert-issuer');
    var issueDate = document.getElementById('cert-issue-date');
    var expiryDate = document.getElementById('cert-expiry-date');

    if (!name.value.trim()) {
      showError(name, 'Nhập tên chứng nhận.');
      problems.push(name);
    }

    if (!code.value.trim()) {
      showError(code, 'Nhập mã chứng nhận.');
      problems.push(code);
    } else {
      var duplicate = certsOfFarm().some(function (item) {
        return item.id !== editingCertId &&
          item.code.toLowerCase() === code.value.trim().toLowerCase();
      });
      if (duplicate) {
        showError(code, 'Mã này đã dùng cho chứng nhận khác của nông trại.');
        problems.push(code);
      }
    }

    if (!issuer.value.trim()) {
      showError(issuer, 'Nhập cơ quan cấp.');
      problems.push(issuer);
    }
    if (!issueDate.value) {
      showError(issueDate, 'Chọn ngày cấp.');
      problems.push(issueDate);
    }
    if (!expiryDate.value) {
      showError(expiryDate, 'Chọn ngày hết hạn.');
      problems.push(expiryDate);
    }

    // Lúc sửa, tệp cũ vẫn còn hiệu lực nếu chưa bấm "Gỡ tệp" — không bắt
    // chọn lại tệp mới mỗi lần sửa, chỉ bắt buộc lúc chưa có tệp nào cả.
    var hasFile = !!certFile || (!certFileRemoved && !certFileCurrent.hidden);
    if (!hasFile) {
      showError(certFileInput, 'Chọn tệp đính kèm.');
      problems.push(certFileInput);
    }

    if (problems.length) {
      problems[0].focus();
      return false;
    }
    return true;
  }

  function handleCertSubmit(event) {
    event.preventDefault();
    if (!validateCert()) return;

    var data = new FormData(certForm);
    var existing = editingCertId ? store.find('certifications', editingCertId) : null;

    var record = {
      farmId: currentFarm.id,
      name: String(data.get('name')).trim(),
      code: String(data.get('code')).trim(),
      issuer: String(data.get('issuer') || '').trim(),
      status: String(data.get('status')),
      issueDate: String(data.get('issueDate') || ''),
      expiryDate: String(data.get('expiryDate') || ''),
      note: String(data.get('note') || '').trim(),
      fileName: certFile ? certFile.name : (certFileRemoved ? '' : (existing ? existing.fileName : '')),
      fileDataUrl: certFile ? certFile.dataUrl : (certFileRemoved ? '' : (existing ? existing.fileDataUrl : ''))
    };

    if (editingCertId) {
      store.update('certifications', editingCertId, record);
      global.AgriChain.toast('Đã lưu thay đổi.');
    } else {
      store.insert('certifications', record);
      global.AgriChain.toast('Đã thêm chứng nhận.');
    }

    closeCertModal();
    renderCertifications();
  }

  function deleteCert(cert) {
    global.AgriChain.confirm(
      'Xoá chứng nhận "' + cert.name + '"? Hành động này không thể hoàn tác.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      store.remove('certifications', cert.id);
      renderCertifications();
      global.AgriChain.toast('Đã xoá chứng nhận.');
    });
  }

  /* ======================================================================
     Lịch sử mùa vụ
     ====================================================================== */

  var seasonModal = document.getElementById('season-modal');
  var seasonForm = document.getElementById('season-form');
  var seasonStatusSelect = document.getElementById('season-status');
  var seasonModalTitle = document.getElementById('season-modal-title');
  var seasonSubmitLabel = document.querySelector('[data-season-submit-label]');
  var seasonListNode = document.querySelector('[data-season-list]');
  var seasonEmptyNode = document.querySelector('[data-season-empty]');
  var seasonCountNode = document.querySelector('[data-season-count]');

  var editingSeasonId = null;

  function fillSeasonStatuses() {
    SEASON_STATUSES.forEach(function (status) {
      var option = el('option', null, status.label);
      option.value = status.key;
      seasonStatusSelect.appendChild(option);
    });
  }

  function seasonsOfFarm() {
    if (!currentFarm) return [];
    return store.list('seasons').filter(function (item) {
      return item.farmId === currentFarm.id;
    });
  }

  function seasonCard(season) {
    var status = statusOf(SEASON_STATUSES, season.status);
    var card = el('article', 'card card--hover');

    var header = el('div', 'card__header data-card__header');
    header.appendChild(el('h2', 'data-card__title', season.name));
    header.appendChild(el('span', 'badge ' + status.badge, status.label));
    card.appendChild(header);

    var rows = el('div', 'data-card__rows');
    rows.appendChild(fieldRow('icon-qr-code', 'Mã', season.code));
    rows.appendChild(fieldRow('icon-calendar', 'Ngày bắt đầu', formatDate(season.startDate)));
    rows.appendChild(fieldRow('icon-calendar', 'Ngày kết thúc', formatDate(season.endDate)));

    var chips = el('div', 'data-card__chip-group');
    chips.appendChild(el('span', 'badge badge--info', 'Dự kiến: ' + formatArea(season.plannedArea)));
    chips.appendChild(el('span', 'badge badge--warning', 'Thực tế: ' + formatArea(season.actualArea)));
    rows.appendChild(fieldRow('icon-chart-bar', 'Diện tích', chips));

    if (season.note) rows.appendChild(fieldRow('icon-file-text', 'Ghi chú', season.note));

    card.appendChild(rows);

    var actions = el('div', 'data-card__actions');

    var view = el('button', 'icon-btn');
    view.type = 'button';
    view.setAttribute('aria-label', 'Xem chi tiết ' + season.name);
    view.setAttribute('data-tooltip', 'Xem chi tiết');
    view.appendChild(svgIcon('icon-eye'));
    view.addEventListener('click', function () { openSeasonViewModal(season); });

    var edit = el('button', 'icon-btn');
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Sửa ' + season.name);
    edit.setAttribute('data-tooltip', 'Chỉnh sửa');
    edit.appendChild(svgIcon('icon-pencil'));
    edit.addEventListener('click', function () { openSeasonModal(season); });

    var del = el('button', 'icon-btn icon-btn--danger');
    del.type = 'button';
    del.setAttribute('aria-label', 'Xoá ' + season.name);
    del.setAttribute('data-tooltip', 'Xoá');
    del.appendChild(svgIcon('icon-trash'));
    del.addEventListener('click', function () { deleteSeason(season); });

    actions.appendChild(view);
    actions.appendChild(edit);
    actions.appendChild(del);
    card.appendChild(actions);

    return card;
  }

  function renderSeasons() {
    var seasons = seasonsOfFarm();
    seasonCountNode.textContent = seasons.length;

    seasonListNode.textContent = '';
    if (!seasons.length) {
      seasonListNode.hidden = true;
      seasonEmptyNode.hidden = false;
      return;
    }

    seasonEmptyNode.hidden = true;
    seasonListNode.hidden = false;
    seasons.forEach(function (season) {
      seasonListNode.appendChild(seasonCard(season));
    });
  }

  // Gợi ý mã mùa vụ tiếp theo của CHÍNH nông trại đang xem — MV01, MV02...
  // giống cách farm-code gợi ý ở nong-trai.js, chỉ là gợi ý, sửa được.
  function suggestSeasonCode() {
    var seq = String(seasonsOfFarm().length + 1);
    while (seq.length < 2) seq = '0' + seq;
    return 'MV' + seq;
  }

  function openSeasonModal(season) {
    seasonForm.reset();
    clearErrors(seasonForm);
    editingSeasonId = season ? season.id : null;

    if (season) {
      seasonModalTitle.textContent = 'Sửa mùa vụ';
      seasonSubmitLabel.textContent = 'Lưu thay đổi';
      document.getElementById('season-code').value = season.code || '';
      document.getElementById('season-name').value = season.name || '';
      document.getElementById('season-start-date').value = season.startDate || '';
      document.getElementById('season-end-date').value = season.endDate || '';
      document.getElementById('season-planned-area').value =
        season.plannedArea != null ? season.plannedArea : '';
      document.getElementById('season-actual-area').value =
        season.actualArea != null ? season.actualArea : '';
      seasonStatusSelect.value = season.status || SEASON_STATUSES[0].key;
      document.getElementById('season-note').value = season.note || '';
    } else {
      seasonModalTitle.textContent = 'Thêm mùa vụ mới';
      seasonSubmitLabel.textContent = 'Lưu mùa vụ';
      document.getElementById('season-code').value = suggestSeasonCode();
      seasonStatusSelect.value = SEASON_STATUSES[0].key;
    }

    seasonModal.showModal();
    document.getElementById('season-code').focus();
  }

  function closeSeasonModal() {
    seasonModal.close();
    editingSeasonId = null;
  }

  function validateSeason() {
    clearErrors(seasonForm);
    var problems = [];
    var code = document.getElementById('season-code');
    var name = document.getElementById('season-name');
    var startDate = document.getElementById('season-start-date');
    var endDate = document.getElementById('season-end-date');
    var plannedArea = document.getElementById('season-planned-area');
    var actualArea = document.getElementById('season-actual-area');

    if (!code.value.trim()) {
      showError(code, 'Nhập mã mùa vụ.');
      problems.push(code);
    } else {
      var duplicate = seasonsOfFarm().some(function (item) {
        return item.id !== editingSeasonId &&
          item.code.toLowerCase() === code.value.trim().toLowerCase();
      });
      if (duplicate) {
        showError(code, 'Mã này đã dùng cho mùa vụ khác của nông trại.');
        problems.push(code);
      }
    }

    if (!name.value.trim()) {
      showError(name, 'Nhập tên mùa vụ.');
      problems.push(name);
    }
    if (!startDate.value) {
      showError(startDate, 'Chọn ngày bắt đầu.');
      problems.push(startDate);
    }
    if (!endDate.value) {
      showError(endDate, 'Chọn ngày kết thúc.');
      problems.push(endDate);
    }
    if (!plannedArea.value.trim()) {
      showError(plannedArea, 'Nhập diện tích dự kiến.');
      problems.push(plannedArea);
    }
    if (!actualArea.value.trim()) {
      showError(actualArea, 'Nhập diện tích thực tế.');
      problems.push(actualArea);
    }

    if (problems.length) {
      problems[0].focus();
      return false;
    }
    return true;
  }

  function handleSeasonSubmit(event) {
    event.preventDefault();
    if (!validateSeason()) return;

    var data = new FormData(seasonForm);
    var record = {
      farmId: currentFarm.id,
      code: String(data.get('code')).trim(),
      name: String(data.get('name')).trim(),
      startDate: String(data.get('startDate') || ''),
      endDate: String(data.get('endDate') || ''),
      plannedArea: Number(data.get('plannedArea')) || 0,
      actualArea: Number(data.get('actualArea')) || 0,
      status: String(data.get('status')),
      note: String(data.get('note') || '').trim()
    };

    if (editingSeasonId) {
      store.update('seasons', editingSeasonId, record);
      global.AgriChain.toast('Đã lưu thay đổi.');
    } else {
      store.insert('seasons', record);
      global.AgriChain.toast('Đã thêm mùa vụ.');
    }

    closeSeasonModal();
    renderSeasons();
  }

  function deleteSeason(season) {
    global.AgriChain.confirm(
      'Xoá mùa vụ "' + season.name + '"? Hành động này không thể hoàn tác.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      store.remove('seasons', season.id);
      renderSeasons();
      global.AgriChain.toast('Đã xoá mùa vụ.');
    });
  }

  /* --- Xem chi tiết mùa vụ ---------------------------------------------------
     Modal riêng, có 4 tab: "Thông tin", "Timeline mùa vụ" (nhật ký),
     "Lô hàng" và "Quy trình mùa vụ" (checklist áp dụng từ workflowTemplates
     — xem mục "Quy trình mùa vụ" phía dưới) đều hiện dữ liệu thật. */
  var seasonViewModal = document.getElementById('season-view-modal');

  // Mùa vụ đang mở ở modal xem chi tiết — nhật ký (seasonLogs) gắn theo
  // seasonId của nó, nên cần biết đang xem mùa vụ nào để lọc/thêm đúng chỗ.
  var currentViewedSeason = null;

  function fillSeasonView(selector, value) {
    var node = document.querySelector(selector);
    if (node) node.textContent = value || '—';
  }

  function resetSeasonViewTabs() {
    var tabs = seasonViewModal.querySelectorAll('[data-tab-target]');
    tabs.forEach(function (tab, index) {
      var active = index === 0;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    seasonViewModal.querySelectorAll('[data-tab-panel]').forEach(function (panel, index) {
      panel.hidden = index !== 0;
    });
  }

  function openSeasonViewModal(season) {
    resetSeasonViewTabs(); // luôn mở lại ở tab "Thông tin", khỏi giữ tab của lần xem trước
    currentViewedSeason = season;
    var status = statusOf(SEASON_STATUSES, season.status);

    fillSeasonView('[data-season-view-name]', season.name);
    fillSeasonView('[data-season-view-code]', 'Mã: ' + season.code);

    var headerBadge = document.querySelector('[data-season-view-badge]');
    headerBadge.className = 'badge ' + status.badge;
    headerBadge.textContent = status.label;

    fillSeasonView('[data-season-view-stat-start]', formatDate(season.startDate));
    fillSeasonView('[data-season-view-stat-end]', formatDate(season.endDate));
    fillSeasonView('[data-season-view-stat-planned]', formatArea(season.plannedArea));
    fillSeasonView('[data-season-view-stat-actual]', formatArea(season.actualArea));

    fillSeasonView('[data-season-view-start]', formatDate(season.startDate));
    fillSeasonView('[data-season-view-end]', formatDate(season.endDate));
    fillSeasonView('[data-season-view-planned]', formatArea(season.plannedArea));
    fillSeasonView('[data-season-view-actual]', formatArea(season.actualArea));
    fillSeasonView('[data-season-view-note]', season.note);

    var statusNode = document.querySelector('[data-season-view-status]');
    statusNode.textContent = '';
    statusNode.appendChild(el('span', 'badge ' + status.badge, status.label));

    renderSeasonLogs();
    renderBatches();
    renderSeasonProcess();
    seasonViewModal.showModal();
  }

  function closeSeasonViewModal() {
    seasonViewModal.close();
  }

  /* ======================================================================
     Nhật ký mùa vụ (tab "Timeline mùa vụ" trong modal xem chi tiết mùa vụ)
     ====================================================================== */

  var seasonLogModal = document.getElementById('season-log-modal');
  var seasonLogForm = document.getElementById('season-log-form');
  var activityTypeSelect = document.getElementById('log-activity-type');
  var seasonLogModalTitle = document.getElementById('season-log-modal-title');
  var seasonLogSubmitLabel = document.querySelector('[data-season-log-submit-label]');
  var logListNode = document.querySelector('[data-log-list]');
  var logEmptyNode = document.querySelector('[data-log-empty]');
  var logCountNode = document.querySelector('[data-log-count]');
  var materialRowsContainer = document.querySelector('[data-material-rows]');
  var materialEmptyNode = document.querySelector('[data-material-empty]');
  var materialHeaderNode = document.querySelector('[data-material-header]');
  var materialCountNode = document.querySelector('[data-material-count]');
  var imagesInput = document.getElementById('log-images-input');
  var imagesGrid = document.querySelector('[data-image-grid]');
  var imagesEmptyNode = document.querySelector('[data-image-empty]');

  var editingLogId = null;
  var logImages = []; // { name, dataUrl } — ảnh của nhật ký đang mở trong modal

  function fillActivityTypes() {
    ACTIVITY_TYPES.forEach(function (type) {
      var option = el('option', null, type.label);
      option.value = type.key;
      activityTypeSelect.appendChild(option);
    });
  }

  /* --- Vật tư sử dụng: từng dòng thêm/xoá được, chọn từ kho vật tư thật --- */

  function unitOfSupply(supplyId) {
    if (!supplyId) return '';
    var supply = store.find('supplies', supplyId);
    return supply ? supply.unit : '';
  }

  function fillMaterialSelect(select) {
    var placeholder = el('option', null, '— Chọn vật tư —');
    placeholder.value = '';
    select.appendChild(placeholder);

    store.list('supplies').forEach(function (supply) {
      var option = el('option', null, supply.code + ' — ' + supply.name);
      option.value = supply.id;
      select.appendChild(option);
    });
  }

  function updateMaterialEmptyState() {
    var count = materialRowsContainer.children.length;
    materialEmptyNode.hidden = count > 0;
    materialHeaderNode.hidden = count === 0;
    materialCountNode.hidden = count === 0;
    materialCountNode.textContent = String(count);
  }

  function addMaterialRow(prefill) {
    var row = el('div', 'log-material-row');

    var select = document.createElement('select');
    select.className = 'select';
    fillMaterialSelect(select);
    if (prefill && prefill.supplyId) select.value = prefill.supplyId;

    var qtyInput = document.createElement('input');
    qtyInput.className = 'input';
    qtyInput.type = 'number';
    qtyInput.min = '0';
    qtyInput.step = '0.01';
    qtyInput.placeholder = 'Số lượng';
    if (prefill && prefill.quantity != null) qtyInput.value = prefill.quantity;

    var unitSelect = document.createElement('select');
    unitSelect.className = 'select';
    MATERIAL_UNITS.forEach(function (unit) {
      var option = el('option', null, unit);
      option.value = unit;
      unitSelect.appendChild(option);
    });
    unitSelect.value = (prefill && prefill.unit) || unitOfSupply(select.value) || MATERIAL_UNITS[0];

    // Chọn vật tư thì tự gợi ý đơn vị của đúng vật tư đó — vẫn chọn lại
    // được tay nếu ghi nhận theo đơn vị khác cho lần dùng này.
    select.addEventListener('change', function () {
      var unit = unitOfSupply(select.value);
      if (unit) unitSelect.value = unit;
    });

    var methodSelect = document.createElement('select');
    methodSelect.className = 'select';
    var methodPlaceholder = el('option', null, '— Chọn —');
    methodPlaceholder.value = '';
    methodSelect.appendChild(methodPlaceholder);
    MATERIAL_METHODS.forEach(function (method) {
      var option = el('option', null, method);
      option.value = method;
      methodSelect.appendChild(option);
    });
    if (prefill && prefill.method) methodSelect.value = prefill.method;

    var purposeInput = document.createElement('input');
    purposeInput.className = 'input';
    purposeInput.type = 'text';
    purposeInput.placeholder = 'Mục đích';
    if (prefill && prefill.purpose) purposeInput.value = prefill.purpose;

    var remove = el('button', 'icon-btn icon-btn--danger');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Xoá vật tư');
    remove.setAttribute('data-tooltip', 'Xoá');
    remove.appendChild(svgIcon('icon-trash'));
    remove.addEventListener('click', function () {
      row.remove();
      updateMaterialEmptyState();
    });

    row.appendChild(select);
    row.appendChild(qtyInput);
    row.appendChild(unitSelect);
    row.appendChild(methodSelect);
    row.appendChild(purposeInput);
    row.appendChild(remove);

    materialRowsContainer.appendChild(row);
    updateMaterialEmptyState();
  }

  function clearMaterialRows() {
    materialRowsContainer.textContent = '';
    updateMaterialEmptyState();
  }

  function getMaterialRowsData() {
    var result = [];
    materialRowsContainer.querySelectorAll('.log-material-row').forEach(function (row) {
      var selects = row.querySelectorAll('select');
      var materialSelect = selects[0];
      var unitSelect = selects[1];
      var methodSelect = selects[2];
      var qtyInput = row.querySelector('input[type="number"]');
      var purposeInput = row.querySelector('input[type="text"]');

      if (!materialSelect.value) return;
      var supply = store.find('supplies', materialSelect.value);
      if (!supply) return;

      result.push({
        supplyId: supply.id,
        name: supply.name,
        quantity: Number(qtyInput.value) || 0,
        unit: unitSelect.value,
        method: methodSelect.value,
        purpose: purposeInput.value.trim()
      });
    });
    return result;
  }

  /* --- Hình ảnh minh hoạ: đọc qua FileReader, lưu base64 như tệp chứng nhận */

  function renderImages() {
    imagesGrid.textContent = '';
    if (!logImages.length) {
      imagesGrid.hidden = true;
      imagesEmptyNode.hidden = false;
      return;
    }

    imagesEmptyNode.hidden = true;
    imagesGrid.hidden = false;

    logImages.forEach(function (image, index) {
      var thumb = el('div', 'log-image-thumb');

      var img = document.createElement('img');
      img.src = image.dataUrl;
      img.alt = image.name || '';
      thumb.appendChild(img);

      var remove = el('button', 'log-image-thumb__remove', '×');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Xoá ảnh ' + (image.name || ''));
      remove.addEventListener('click', function () {
        logImages.splice(index, 1);
        renderImages();
      });
      thumb.appendChild(remove);

      imagesGrid.appendChild(thumb);
    });
  }

  function resetImages(initial) {
    logImages = initial ? initial.slice() : [];
    renderImages();
  }

  function handleImagesInputChange() {
    var files = imagesInput.files;
    if (!files || !files.length) return;

    Array.prototype.forEach.call(files, function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        logImages.push({ name: file.name, dataUrl: reader.result });
        renderImages();
      };
      reader.readAsDataURL(file);
    });

    imagesInput.value = '';
  }

  /* --- Danh sách + modal thêm/sửa nhật ký ----------------------------------- */

  function seasonLogsOfSeason(seasonId) {
    return store.list('seasonLogs').filter(function (item) {
      return item.seasonId === seasonId;
    }).sort(function (a, b) {
      // Mới thực hiện gần đây nhất lên đầu
      return String(b.performedAt).localeCompare(String(a.performedAt));
    });
  }

  // Một dòng thông tin đơn (icon + text) trong thân thẻ nhật ký.
  function logField(iconName, text) {
    var row = el('div', 'log-item__field');
    row.appendChild(svgIcon(iconName));
    row.appendChild(el('span', null, text));
    return row;
  }

  // Nhãn mở đầu 1 khối con (VD "Sử dụng vật tư") — đậm hơn logField().
  function logSectionLabel(iconName, text) {
    var row = el('div', 'log-item__section-label');
    row.appendChild(svgIcon(iconName));
    row.appendChild(el('span', null, text));
    return row;
  }

  function logItem(log) {
    var activity = statusOf(ACTIVITY_TYPES, log.activityType);
    var item = el('div', 'log-item log-item--' + activity.color);

    var iconWrap = el('div', 'log-item__icon');
    iconWrap.appendChild(svgIcon(activity.icon));
    item.appendChild(iconWrap);

    var body = el('div', 'log-item__body');

    var head = el('div', 'log-item__head');
    head.appendChild(el('span', 'log-item__title', activity.label));
    head.appendChild(el('span', 'log-item__time', formatDateTimeLocal(log.performedAt)));
    body.appendChild(head);

    body.appendChild(logField('icon-user', 'Thực hiện bởi: ' + (log.performedBy || '—')));
    if (log.weather) body.appendChild(logField('icon-sun', 'Điều kiện thời tiết: ' + log.weather));
    if (log.description) body.appendChild(logField('icon-file-text', 'Mô tả: ' + log.description));

    if (log.supplies && log.supplies.length) {
      body.appendChild(logSectionLabel('icon-box', 'Sử dụng vật tư'));
      var supplies = el('div', 'log-item__supplies');
      log.supplies.forEach(function (supply) {
        var label = supply.name + ' - ' + supply.quantity + ' ' + supply.unit;
        if (supply.method) label += ' (' + supply.method + ')';
        supplies.appendChild(el('span', 'badge badge--neutral', label));
      });
      body.appendChild(supplies);
    }

    if (log.images && log.images.length) {
      body.appendChild(logSectionLabel('icon-image', 'Hình ảnh hiện trường (' + log.images.length + ')'));
      var images = el('div', 'log-item__images');
      log.images.forEach(function (image) {
        var img = document.createElement('img');
        img.src = image.dataUrl;
        img.alt = image.name || '';
        images.appendChild(img);
      });
      body.appendChild(images);
    }

    var actions = el('div', 'log-item__actions');

    var edit = el('button', 'icon-btn');
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Sửa nhật ký');
    edit.setAttribute('data-tooltip', 'Chỉnh sửa');
    edit.appendChild(svgIcon('icon-pencil'));
    edit.addEventListener('click', function () { openSeasonLogModal(log); });

    var del = el('button', 'icon-btn icon-btn--danger');
    del.type = 'button';
    del.setAttribute('aria-label', 'Xoá nhật ký');
    del.setAttribute('data-tooltip', 'Xoá');
    del.appendChild(svgIcon('icon-trash'));
    del.addEventListener('click', function () { deleteSeasonLog(log); });

    actions.appendChild(edit);
    actions.appendChild(del);
    body.appendChild(actions);

    item.appendChild(body);
    return item;
  }

  function renderSeasonLogs() {
    if (!currentViewedSeason) return;

    var logs = seasonLogsOfSeason(currentViewedSeason.id);
    logCountNode.textContent = logs.length;

    logListNode.textContent = '';
    if (!logs.length) {
      logListNode.hidden = true;
      logEmptyNode.hidden = false;
      return;
    }

    logEmptyNode.hidden = true;
    logListNode.hidden = false;
    logs.forEach(function (log) {
      logListNode.appendChild(logItem(log));
    });
  }

  function openSeasonLogModal(log) {
    seasonLogForm.reset();
    clearErrors(seasonLogForm);
    clearMaterialRows();
    editingLogId = log ? log.id : null;

    if (log) {
      seasonLogModalTitle.textContent = 'Sửa nhật ký mùa vụ';
      seasonLogSubmitLabel.textContent = 'Lưu thay đổi';
      activityTypeSelect.value = log.activityType || ACTIVITY_TYPES[0].key;
      document.getElementById('log-performed-at').value = log.performedAt || '';
      document.getElementById('log-performed-by').value = log.performedBy || '';
      document.getElementById('log-weather').value = log.weather || '';
      document.getElementById('log-description').value = log.description || '';

      (log.supplies || []).forEach(function (supply) {
        addMaterialRow({
          supplyId: supply.supplyId,
          quantity: supply.quantity,
          unit: supply.unit,
          method: supply.method,
          purpose: supply.purpose
        });
      });

      resetImages(log.images);
    } else {
      seasonLogModalTitle.textContent = 'Thêm mới nhật ký mùa vụ';
      seasonLogSubmitLabel.textContent = 'Xác nhận';
      activityTypeSelect.value = ACTIVITY_TYPES[0].key;
      resetImages();
    }

    seasonLogModal.showModal();
    document.getElementById('log-activity-type').focus();
  }

  function closeSeasonLogModal() {
    seasonLogModal.close();
    editingLogId = null;
    // Nhật ký có thể đã được mở để hoàn tất 1 bước quy trình (xem
    // startStepCompletion()) — huỷ modal thì cũng huỷ luôn ý định đó, khỏi
    // lỡ hoàn thành nhầm bước ở lần thêm nhật ký kế tiếp (không liên quan).
    completingStepId = null;
  }

  function validateSeasonLog() {
    clearErrors(seasonLogForm);
    var problems = [];
    var performedAt = document.getElementById('log-performed-at');
    var performedBy = document.getElementById('log-performed-by');

    if (!performedAt.value) {
      showError(performedAt, 'Chọn thời gian thực hiện.');
      problems.push(performedAt);
    }
    if (!performedBy.value.trim()) {
      showError(performedBy, 'Nhập người thực hiện.');
      problems.push(performedBy);
    }

    if (problems.length) {
      problems[0].focus();
      return false;
    }
    return true;
  }

  function handleSeasonLogSubmit(event) {
    event.preventDefault();
    if (!validateSeasonLog() || !currentViewedSeason) return;

    var data = new FormData(seasonLogForm);
    var record = {
      seasonId: currentViewedSeason.id,
      farmId: currentFarm.id,
      activityType: String(data.get('activityType')),
      performedAt: String(data.get('performedAt') || ''),
      performedBy: String(data.get('performedBy')).trim(),
      weather: String(data.get('weather') || '').trim(),
      description: String(data.get('description') || '').trim(),
      supplies: getMaterialRowsData(),
      images: logImages.slice()
    };

    // Chụp lại TRƯỚC khi đóng modal (closeSeasonLogModal() xoá biến này) —
    // chỉ hoàn thành bước quy trình khi đây là nhật ký MỚI, không áp dụng
    // lúc sửa nhật ký có sẵn.
    var stepToComplete = !editingLogId ? completingStepId : null;
    var savedLog;

    if (editingLogId) {
      store.update('seasonLogs', editingLogId, record);
      global.AgriChain.toast('Đã lưu thay đổi.');
    } else {
      savedLog = store.insert('seasonLogs', record);
      global.AgriChain.toast('Đã thêm nhật ký.');
    }

    closeSeasonLogModal(); // đóng trước khi completeWorkflowStep() có thể mở tiếp modal lô hàng
    renderSeasonLogs();

    if (stepToComplete) {
      completeWorkflowStep(stepToComplete, savedLog.id);
    }
  }

  function deleteSeasonLog(log) {
    var activity = statusOf(ACTIVITY_TYPES, log.activityType);
    global.AgriChain.confirm(
      'Xoá nhật ký "' + activity.label + '" ngày ' + formatDateTimeLocal(log.performedAt) +
      '? Hành động này không thể hoàn tác.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      store.remove('seasonLogs', log.id);
      renderSeasonLogs();
      global.AgriChain.toast('Đã xoá nhật ký.');
    });
  }

  /* ======================================================================
     Lô hàng (tab "Lô hàng" trong modal xem chi tiết mùa vụ)
     ====================================================================== */

  var batchModal = document.getElementById('batch-modal');
  var batchForm = document.getElementById('batch-form');
  var batchUnitSelect = document.getElementById('batch-unit');
  var batchStatusSelect = document.getElementById('batch-status');
  var batchModalTitle = document.getElementById('batch-modal-title');
  var batchModalSeasonTag = document.querySelector('[data-batch-modal-season]');
  var batchSubmitLabel = document.querySelector('[data-batch-submit-label]');
  var batchListNode = document.querySelector('[data-batch-list]');
  var batchEmptyNode = document.querySelector('[data-batch-empty]');
  var batchCountNode = document.querySelector('[data-batch-count]');

  var editingBatchId = null;

  function fillBatchUnits() {
    BATCH_UNITS.forEach(function (unit) {
      var option = el('option', null, unit);
      option.value = unit;
      batchUnitSelect.appendChild(option);
    });
  }

  function fillBatchStatuses() {
    BATCH_STATUSES.forEach(function (status) {
      var option = el('option', null, status.label);
      option.value = status.key;
      batchStatusSelect.appendChild(option);
    });
  }

  function batchesOfSeason(seasonId) {
    return store.list('batches').filter(function (item) {
      return item.seasonId === seasonId;
    });
  }

  // Component .batch-card dùng chung với lo-hang.js (xem css/components.css)
  // — markup phải khớp y hệt giữa 2 trang, chỉ khác hành vi nút sửa/xoá:
  // ở đây mở thẳng modal, còn ở trang Quản lý Lô hàng thì điều hướng về đây.
  function batchCard(batch) {
    var status = statusOf(BATCH_STATUSES, batch.status);
    var card = el('article', 'card card--hover batch-card');

    var header = el('div', 'batch-card__header');
    header.appendChild(el('h2', 'batch-card__code', batch.code));
    header.appendChild(el('span', 'badge ' + status.badge, status.label));
    card.appendChild(header);

    var rows = el('div', 'batch-card__rows');
    var rowDefs = [
      ['Diện tích', formatArea(batch.area)],
      ['Ngày bắt đầu', formatDate(batch.startDate)],
      ['Ngày thu hoạch', formatDate(batch.harvestDate)],
      ['Ngày thu hoạch thực tế', formatDate(batch.actualHarvestDate)]
    ];
    rowDefs.forEach(function (pair) {
      var row = el('div', 'batch-card__row');
      row.appendChild(el('span', 'batch-card__row-label', pair[0]));
      row.appendChild(el('span', null, pair[1]));
      rows.appendChild(row);
    });
    if (batch.sealed) {
      var sealedRow = el('div', 'batch-card__row');
      sealedRow.appendChild(el('span', 'batch-card__row-label', 'Đã xác thực blockchain'));
      sealedRow.appendChild(el('span', null,
        global.AgriChain.chain.shorten(batch.hash) + ' · khối #' + batch.blockIndex));
      rows.appendChild(sealedRow);
    }
    card.appendChild(rows);

    var yieldBox = el('div', 'batch-card__yield');
    yieldBox.appendChild(el('strong', 'batch-card__yield-value',
      (batch.expectedYield || 0) + ' ' + (batch.unit || '')));
    yieldBox.appendChild(el('span', 'batch-card__yield-label', 'Sản lượng dự kiến'));
    card.appendChild(yieldBox);

    if (batch.note) {
      var noteBox = el('div', 'batch-card__note');
      noteBox.appendChild(el('span', 'batch-card__note-label', 'Ghi chú'));
      noteBox.appendChild(el('span', null, batch.note));
      card.appendChild(noteBox);
    }

    var actions = el('div', 'batch-card__actions');

    var qrButton = el('button', 'icon-btn');
    qrButton.type = 'button';
    qrButton.setAttribute('aria-label', 'Truy xuất nguồn gốc lô hàng ' + batch.code);
    qrButton.setAttribute('data-tooltip', 'Truy xuất nguồn gốc');
    qrButton.appendChild(svgIcon('icon-qr-code'));
    qrButton.addEventListener('click', function () { openQrModal(batch); });
    actions.appendChild(qrButton);

    if (batch.sealed) {
      // Đã niêm phong thì không sửa/xoá được nữa (dữ liệu đã băm lên sổ
      // cái) — chỉ còn nút QR ở trên và icon báo trạng thái tĩnh này.
      var sealedIndicator = el('span', 'icon-btn batch-sealed-indicator');
      sealedIndicator.setAttribute('aria-label', 'Đã xác thực blockchain');
      sealedIndicator.setAttribute('data-tooltip', 'Đã xác thực blockchain');
      sealedIndicator.appendChild(svgIcon('icon-check-circle'));
      actions.appendChild(sealedIndicator);
    } else {
      var sealButton = el('button', 'icon-btn');
      sealButton.type = 'button';
      sealButton.setAttribute('aria-label', 'Xác thực blockchain lô hàng ' + batch.code);
      sealButton.setAttribute('data-tooltip', 'Xác thực blockchain');
      sealButton.appendChild(svgIcon('icon-blockchain'));
      sealButton.addEventListener('click', function () { sealBatchRecord(batch); });
      actions.appendChild(sealButton);

      var edit = el('button', 'icon-btn batch-card__action--edit');
      edit.type = 'button';
      edit.setAttribute('aria-label', 'Sửa lô hàng ' + batch.code);
      edit.setAttribute('data-tooltip', 'Chỉnh sửa');
      edit.appendChild(svgIcon('icon-pencil'));
      edit.addEventListener('click', function () { openBatchModal(batch); });
      actions.appendChild(edit);

      var del = el('button', 'icon-btn batch-card__action--delete');
      del.type = 'button';
      del.setAttribute('aria-label', 'Xoá lô hàng ' + batch.code);
      del.setAttribute('data-tooltip', 'Xoá');
      del.appendChild(svgIcon('icon-trash'));
      del.addEventListener('click', function () { deleteBatch(batch); });
      actions.appendChild(del);
    }

    card.appendChild(actions);

    return card;
  }

  /* --- Xác thực blockchain --------------------------------------------------
     Băm thẳng dữ liệu lô hàng (store.sealBatch) — khác event, lô hàng không
     bắt buộc phải có sự kiện canh tác gắn kèm trước khi niêm phong. */
  function sealBatchRecord(batch) {
    global.AgriChain.confirm(
      'Xác thực dữ liệu lô hàng "' + batch.code + '" lên blockchain? ' +
      'Sau khi xác thực, lô hàng này sẽ không thể sửa hoặc xoá nữa.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      store.sealBatch(batch.id).then(function () {
        renderBatches();
        global.AgriChain.toast('Đã xác thực lô hàng lên blockchain.');
      }).catch(function (err) {
        global.AgriChain.toast(err.message || 'Không xác thực được — thử lại sau.');
      });
    });
  }

  /* --- Truy xuất nguồn gốc (QR) ----------------------------------------------
     Mã QR trỏ tới truy-xuat.html?ma=<mã lô> — trang tĩnh công khai, không
     cần đăng nhập, đọc thẳng từ localStorage. Dùng QRCode.js (nạp qua CDN,
     giống Leaflet) để vẽ mã ngay trong trình duyệt. */
  var qrModal = document.getElementById('qr-modal');
  var qrCanvas = document.querySelector('[data-qr-canvas]');
  var qrBatchCode = document.querySelector('[data-qr-batch-code]');
  var qrLink = document.querySelector('[data-qr-link]');

  function traceabilityUrl(batch) {
    return global.location.origin + '/truy-xuat.html?ma=' + encodeURIComponent(batch.code);
  }

  function openQrModal(batch) {
    var url = traceabilityUrl(batch);
    qrBatchCode.textContent = 'Mã lô hàng: ' + batch.code;
    qrLink.href = url;

    qrCanvas.textContent = '';
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrCanvas, {
        text: url,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff'
      });
    } else {
      qrCanvas.textContent = 'Không tải được thư viện tạo mã QR.';
    }

    qrModal.showModal();
  }

  function closeQrModal() {
    qrModal.close();
  }

  function renderBatches() {
    if (!currentViewedSeason) return;

    var batches = batchesOfSeason(currentViewedSeason.id);
    batchCountNode.textContent = batches.length;

    batchListNode.textContent = '';
    if (!batches.length) {
      batchListNode.hidden = true;
      batchEmptyNode.hidden = false;
      return;
    }

    batchEmptyNode.hidden = true;
    batchListNode.hidden = false;
    batches.forEach(function (batch) {
      batchListNode.appendChild(batchCard(batch));
    });
  }

  // Gợi ý mã lô hàng tiếp theo của CHÍNH mùa vụ đang xem — dạng
  // <mã nông trại>-<mã mùa vụ>-001, ví dụ NV01-MV02-001. Chỉ gợi ý, sửa
  // được, giống suggestSeasonCode()/store.nextFarmCode().
  function suggestBatchCode() {
    if (!currentFarm || !currentViewedSeason) return '';
    var seq = String(batchesOfSeason(currentViewedSeason.id).length + 1);
    while (seq.length < 3) seq = '0' + seq;
    return currentFarm.code + '-' + currentViewedSeason.code + '-' + seq;
  }

  function openBatchModal(batch) {
    batchForm.reset();
    clearErrors(batchForm);
    editingBatchId = batch ? batch.id : null;
    batchModalSeasonTag.textContent = 'Mùa vụ: ' + (currentViewedSeason ? currentViewedSeason.code : '—');

    if (batch) {
      batchModalTitle.textContent = 'Sửa lô hàng';
      batchSubmitLabel.textContent = 'Lưu thay đổi';
      document.getElementById('batch-code').value = batch.code || '';
      document.getElementById('batch-start-date').value = batch.startDate || '';
      document.getElementById('batch-area').value = batch.area != null ? batch.area : '';
      document.getElementById('batch-harvest-date').value = batch.harvestDate || '';
      document.getElementById('batch-actual-harvest-date').value = batch.actualHarvestDate || '';
      document.getElementById('batch-expected-yield').value =
        batch.expectedYield != null ? batch.expectedYield : '';
      batchUnitSelect.value = batch.unit || BATCH_UNITS[0];
      batchStatusSelect.value = batch.status || BATCH_STATUSES[0].key;
      document.getElementById('batch-note').value = batch.note || '';
    } else {
      batchModalTitle.textContent = 'Thêm lô hàng mới';
      batchSubmitLabel.textContent = 'Xác nhận';
      document.getElementById('batch-code').value = suggestBatchCode();
      batchUnitSelect.value = BATCH_UNITS[0];
      batchStatusSelect.value = BATCH_STATUSES[0].key;
    }

    batchModal.showModal();
    document.getElementById('batch-code').focus();
  }

  function closeBatchModal() {
    batchModal.close();
    editingBatchId = null;
    // Modal có thể đã được mở tự động để hoàn tất 1 bước quy trình yêu cầu
    // QR (xem completeWorkflowStep()) — huỷ modal thì cũng huỷ luôn việc
    // gắn lô hàng sắp tạo vào bước đó.
    pendingQrStepId = null;
  }

  function validateBatch() {
    clearErrors(batchForm);
    var problems = [];
    var code = document.getElementById('batch-code');
    var startDate = document.getElementById('batch-start-date');
    var area = document.getElementById('batch-area');
    var harvestDate = document.getElementById('batch-harvest-date');
    var actualHarvestDate = document.getElementById('batch-actual-harvest-date');
    var expectedYield = document.getElementById('batch-expected-yield');

    if (!code.value.trim()) {
      showError(code, 'Nhập mã lô hàng.');
      problems.push(code);
    } else {
      var duplicate = batchesOfSeason(currentViewedSeason.id).some(function (item) {
        return item.id !== editingBatchId &&
          item.code.toLowerCase() === code.value.trim().toLowerCase();
      });
      if (duplicate) {
        showError(code, 'Mã này đã dùng cho lô hàng khác của mùa vụ.');
        problems.push(code);
      }
    }

    if (!startDate.value) {
      showError(startDate, 'Chọn ngày bắt đầu.');
      problems.push(startDate);
    }
    if (!area.value.trim()) {
      showError(area, 'Nhập diện tích.');
      problems.push(area);
    }
    if (!harvestDate.value) {
      showError(harvestDate, 'Chọn ngày thu hoạch dự kiến.');
      problems.push(harvestDate);
    }
    if (!actualHarvestDate.value) {
      showError(actualHarvestDate, 'Chọn ngày thu hoạch thực tế.');
      problems.push(actualHarvestDate);
    }
    if (!expectedYield.value.trim()) {
      showError(expectedYield, 'Nhập sản lượng dự kiến.');
      problems.push(expectedYield);
    }

    if (problems.length) {
      problems[0].focus();
      return false;
    }
    return true;
  }

  function handleBatchSubmit(event) {
    event.preventDefault();
    if (!validateBatch() || !currentViewedSeason) return;

    var data = new FormData(batchForm);
    var record = {
      seasonId: currentViewedSeason.id,
      farmId: currentFarm.id,
      code: String(data.get('code')).trim(),
      startDate: String(data.get('startDate') || ''),
      area: Number(data.get('area')) || 0,
      harvestDate: String(data.get('harvestDate') || ''),
      actualHarvestDate: String(data.get('actualHarvestDate') || ''),
      expectedYield: Number(data.get('expectedYield')) || 0,
      unit: String(data.get('unit') || ''),
      status: String(data.get('status')),
      note: String(data.get('note') || '').trim()
    };

    // Chụp lại TRƯỚC khi đóng modal (closeBatchModal() xoá biến này) — lô
    // hàng vừa tạo có thể cần gắn ngay vào 1 bước quy trình yêu cầu QR (xem
    // completeWorkflowStep()), chỉ áp dụng khi TẠO MỚI, không áp dụng lúc
    // sửa lô hàng có sẵn.
    var stepForQr = !editingBatchId ? pendingQrStepId : null;
    var savedBatch;

    if (editingBatchId) {
      store.update('batches', editingBatchId, record);
      global.AgriChain.toast('Đã lưu thay đổi.');
    } else {
      savedBatch = store.insert('batches', record);
      global.AgriChain.toast('Đã thêm lô hàng.');
    }

    closeBatchModal();
    renderBatches();

    if (stepForQr) {
      linkBatchToStep(stepForQr, savedBatch.id);
      openQrModal(savedBatch);
    }
  }

  function deleteBatch(batch) {
    global.AgriChain.confirm(
      'Xoá lô hàng "' + batch.code + '"? Hành động này không thể hoàn tác.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      store.remove('batches', batch.id);
      renderBatches();
      global.AgriChain.toast('Đã xoá lô hàng.');
    });
  }

  /* ======================================================================
     Quy trình mùa vụ (tab "Quy trình mùa vụ" trong modal xem chi tiết mùa vụ)
     ======================================================================
     Áp dụng 1 Mẫu Quy Trình (workflowTemplates, xem js/mau-quy-trinh.js) cho
     1 mùa vụ cụ thể — KHÔNG tham chiếu ngược tới mẫu gốc mà CHỤP (snapshot)
     nguyên bản steps[] vào season.workflowSteps tại thời điểm áp dụng, mỗi
     bước được gắn thêm id riêng + trạng thái thực hiện (status/completedAt/
     logId/batchId). Nhờ vậy mẫu gốc có bị sửa/xoá sau đó cũng không ảnh
     hưởng tới checklist đã áp dụng cho mùa vụ này, và "Tuỳ biến bước quy
     trình" có thể sửa thoải mái riêng cho mùa vụ mà không đụng tới mẫu.

     season.workflowSteps === null/undefined → CHƯA áp dụng quy trình nào.
     season.workflowSteps === [] hoặc có phần tử → ĐÃ áp dụng (kể cả rỗng,
     trường hợp "Tạo quy trình rỗng" rồi chưa kịp thêm bước nào). */

  var processEmptyNode = document.querySelector('[data-process-empty]');
  var processDetailNode = document.querySelector('[data-process-detail]');
  var processTemplateSelect = document.querySelector('[data-process-template-select]');
  var processApplyBtn = document.querySelector('[data-process-apply-btn]');
  var processTemplateNameNode = document.querySelector('[data-process-template-name]');
  var processStepsNode = document.querySelector('[data-process-steps]');

  // Nhật ký/lô hàng đang được mở để HOÀN TẤT 1 bước quy trình cụ thể (khác
  // null khi người dùng bấm "Ghi nhật ký & hoàn thành") — dùng ở
  // handleSeasonLogSubmit()/handleBatchSubmit() (mục "Nhật ký mùa vụ"/
  // "Lô hàng" phía trên) để biết có cần đánh dấu hoàn thành bước không.
  var completingStepId = null;
  var pendingQrStepId = null;

  function cloneTemplateSteps(template) {
    return (template.steps || []).map(function (step) {
      return {
        id: store.newId(),
        name: step.name || '',
        activityType: step.activityType || ACTIVITY_TYPES[0].key,
        instruction: step.instruction || '',
        requireQr: !!step.requireQr,
        requireSupply: !!step.requireSupply,
        supplyId: step.supplyId || '',
        requireImage: !!step.requireImage,
        status: 'pending',
        completedAt: null,
        logId: null,
        batchId: null
      };
    });
  }

  function fillProcessTemplateSelect() {
    processTemplateSelect.textContent = '';
    var placeholder = el('option', null, 'Chọn mẫu quy trình áp dụng');
    placeholder.value = '';
    processTemplateSelect.appendChild(placeholder);

    store.list('workflowTemplates').forEach(function (template) {
      var option = el('option', null, template.name);
      option.value = template.id;
      processTemplateSelect.appendChild(option);
    });
  }

  function applyWorkflowTemplate(templateId) {
    var template = store.find('workflowTemplates', templateId);
    if (!template || !currentViewedSeason) return;

    var changes = {
      workflowTemplateId: template.id,
      workflowTemplateName: template.name,
      workflowSteps: cloneTemplateSteps(template)
    };
    store.update('seasons', currentViewedSeason.id, changes);
    currentViewedSeason = store.find('seasons', currentViewedSeason.id);
    renderSeasonProcess();
    global.AgriChain.toast('Đã áp dụng mẫu quy trình.');
  }

  function createEmptyWorkflow() {
    if (!currentViewedSeason) return;
    var changes = {
      workflowTemplateId: null,
      workflowTemplateName: 'Quy trình tự tạo',
      workflowSteps: []
    };
    store.update('seasons', currentViewedSeason.id, changes);
    currentViewedSeason = store.find('seasons', currentViewedSeason.id);
    renderSeasonProcess();
    openProcessStepModal(); // danh sách đang rỗng — mở luôn để tự thêm bước
  }

  // Bước "tới lượt" duy nhất trong checklist: bước CHƯA hoàn thành ĐẦU
  // TIÊN theo đúng thứ tự mảng — mọi bước chưa hoàn thành phía sau nó đều
  // phải "chờ đến lượt", chỉ bước này mới hiện nút "Ghi nhật ký & hoàn thành".
  function currentActionableStepId(steps) {
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].status !== 'completed') return steps[i].id;
    }
    return null;
  }

  function processStepViewCard(step, index, isCurrent) {
    var item = el('div', 'workflow-checklist__item');

    var rail = el('div', 'workflow-checklist__rail');
    rail.appendChild(el('span', 'workflow-checklist__dot' +
      (step.status === 'completed' ? ' workflow-checklist__dot--done' : '')));
    rail.appendChild(el('div', 'workflow-checklist__line'));
    item.appendChild(rail);

    var card = el('div', 'workflow-checklist__card');

    var head = el('div', 'workflow-checklist__head');
    head.appendChild(el('strong', 'workflow-checklist__step-title', 'Bước ' + (index + 1) + ': ' + step.name));
    if (step.requireQr) head.appendChild(el('span', 'badge badge--success', 'Yêu cầu sinh QR'));
    head.appendChild(el('span', 'badge ' + (step.status === 'completed' ? 'badge--success' : 'badge--warning'),
      step.status === 'completed' ? 'Hoàn thành' : 'Đang chờ'));
    card.appendChild(head);

    var activity = statusOf(ACTIVITY_TYPES, step.activityType);
    var activityRow = el('div', 'workflow-checklist__activity workflow-checklist__activity--' + activity.color);
    activityRow.appendChild(svgIcon(activity.icon));
    activityRow.appendChild(el('span', null, activity.label));
    card.appendChild(activityRow);

    if (step.instruction) {
      card.appendChild(el('p', 'workflow-checklist__instruction', step.instruction));
    }

    if (step.status === 'completed') {
      var doneNote = el('div', 'workflow-checklist__done-note');
      doneNote.appendChild(svgIcon('icon-check-circle'));
      doneNote.appendChild(el('span', null, 'Đã ghi nhật ký & hoàn thành'));
      card.appendChild(doneNote);
    } else if (isCurrent) {
      var completeBtn = el('button', 'btn btn--primary btn--sm');
      completeBtn.type = 'button';
      completeBtn.appendChild(svgIcon('icon-check-circle'));
      completeBtn.appendChild(document.createTextNode(' Ghi nhật ký & hoàn thành'));
      completeBtn.addEventListener('click', function () { startStepCompletion(step); });
      card.appendChild(completeBtn);
    } else {
      var waiting = el('div', 'workflow-checklist__waiting');
      waiting.appendChild(svgIcon('icon-clock'));
      waiting.appendChild(el('span', null, 'Chờ đến lượt thực hiện'));
      card.appendChild(waiting);
    }

    item.appendChild(card);
    return item;
  }

  function renderProcessSteps() {
    var steps = currentViewedSeason.workflowSteps || [];
    processStepsNode.textContent = '';

    if (!steps.length) {
      processStepsNode.appendChild(el('p', 'workflow-checklist__empty',
        'Quy trình này chưa có bước nào — bấm "Tuỳ biến bước quy trình" để thêm.'));
      return;
    }

    var currentId = currentActionableStepId(steps);
    steps.forEach(function (step, index) {
      processStepsNode.appendChild(processStepViewCard(step, index, step.id === currentId));
    });
  }

  function renderSeasonProcess() {
    if (!currentViewedSeason) return;

    if (!currentViewedSeason.workflowSteps) {
      processEmptyNode.hidden = false;
      processDetailNode.hidden = true;
      fillProcessTemplateSelect();
      processApplyBtn.disabled = true;
      return;
    }

    processEmptyNode.hidden = true;
    processDetailNode.hidden = false;
    processTemplateNameNode.textContent = currentViewedSeason.workflowTemplateName || 'Quy trình tự tạo';
    renderProcessSteps();
  }

  /* --- Hoàn tất 1 bước: mở modal nhật ký (điền sẵn loại hoạt động), rồi
     nếu bước yêu cầu QR thì mở tiếp modal tạo lô hàng sau khi ghi xong --- */

  function startStepCompletion(step) {
    completingStepId = step.id;
    openSeasonLogModal();
    activityTypeSelect.value = step.activityType || ACTIVITY_TYPES[0].key;
    document.getElementById('log-description').value = step.instruction || '';
  }

  function completeWorkflowStep(stepId, logId) {
    if (!currentViewedSeason) return;
    var steps = (currentViewedSeason.workflowSteps || []).slice();
    var step = null;
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].id === stepId) { step = steps[i]; break; }
    }
    if (!step) return;

    step.status = 'completed';
    step.completedAt = new Date().toISOString();
    step.logId = logId;

    store.update('seasons', currentViewedSeason.id, { workflowSteps: steps });
    currentViewedSeason = store.find('seasons', currentViewedSeason.id);
    renderSeasonProcess();
    global.AgriChain.toast('Đã hoàn thành bước "' + step.name + '".');

    if (step.requireQr) {
      pendingQrStepId = step.id;
      openBatchModal();
    }
  }

  function linkBatchToStep(stepId, batchId) {
    if (!currentViewedSeason) return;
    var steps = (currentViewedSeason.workflowSteps || []).slice();
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].id === stepId) { steps[i].batchId = batchId; break; }
    }
    store.update('seasons', currentViewedSeason.id, { workflowSteps: steps });
    currentViewedSeason = store.find('seasons', currentViewedSeason.id);
    renderSeasonProcess();
  }

  /* --- Modal "Tuỳ biến bước quy trình": cùng cơ chế "DOM là nguồn dữ liệu"
     của mau-quy-trinh.js (collectSteps()/moveStep()/renumberSteps()) — chỉ
     khác là mỗi thẻ bước còn giữ thêm id/status/completedAt/logId/batchId
     qua dataset để KHÔNG mất tiến độ đã hoàn thành khi người dùng chỉ sửa
     tên/hướng dẫn của MỘT bước khác trong cùng danh sách. */

  var processStepModal = document.getElementById('process-step-modal');
  var processStepForm = document.getElementById('process-step-form');
  var processStepsListNode = document.querySelector('[data-process-steps-list]');
  var processStepCount = 0;

  function renumberProcessSteps() {
    Array.prototype.forEach.call(processStepsListNode.children, function (card, index) {
      card.querySelector('[data-step-number]').textContent = String(index + 1);
    });
  }

  function moveProcessStep(card, direction) {
    var sibling = direction === 'up' ? card.previousElementSibling : card.nextElementSibling;
    if (!sibling) return;
    if (direction === 'up') {
      processStepsListNode.insertBefore(card, sibling);
    } else {
      processStepsListNode.insertBefore(sibling, card);
    }
    renumberProcessSteps();
  }

  function processStepEditorCard(data) {
    processStepCount++;
    var card = el('div', 'workflow-step');
    card.dataset.stepCard = '';
    // Giữ nguyên trạng thái thực hiện của bước (nếu có) qua dataset —
    // collectProcessSteps() đọc lại đúng các giá trị này lúc lưu, không
    // phải input người dùng chỉnh sửa được trong modal này.
    card.dataset.stepId = data.id || store.newId();
    card.dataset.stepStatus = data.status || 'pending';
    card.dataset.stepCompletedAt = data.completedAt || '';
    card.dataset.stepLogId = data.logId || '';
    card.dataset.stepBatchId = data.batchId || '';

    var side = el('div', 'workflow-step__side');
    var numberNode = el('span', 'workflow-step__number', String(processStepCount));
    numberNode.setAttribute('data-step-number', '');
    side.appendChild(numberNode);

    var reorder = el('div', 'workflow-step__reorder');
    var upButton = el('button', 'icon-btn');
    upButton.type = 'button';
    upButton.setAttribute('aria-label', 'Di chuyển bước lên trên');
    upButton.appendChild(svgIcon('icon-chevron-down', 'icon icon--sm workflow-step__chevron-up'));
    upButton.addEventListener('click', function () { moveProcessStep(card, 'up'); });
    var downButton = el('button', 'icon-btn');
    downButton.type = 'button';
    downButton.setAttribute('aria-label', 'Di chuyển bước xuống dưới');
    downButton.appendChild(svgIcon('icon-chevron-down'));
    downButton.addEventListener('click', function () { moveProcessStep(card, 'down'); });
    reorder.appendChild(upButton);
    reorder.appendChild(downButton);
    side.appendChild(reorder);
    card.appendChild(side);

    var body = el('div', 'workflow-step__body');

    var topRow = el('div', 'workflow-step__top');
    var grid1 = el('div', 'form-grid');

    var nameField = el('div', 'field');
    nameField.appendChild(el('label', 'label', 'Tên bước'));
    var nameInput = el('input', 'input step-name');
    nameInput.type = 'text';
    if (data.name) nameInput.value = data.name;
    nameField.appendChild(nameInput);
    grid1.appendChild(nameField);

    var typeField = el('div', 'field');
    typeField.appendChild(el('label', 'label', 'Loại hoạt động'));
    var typeSelect = el('select', 'select step-type');
    ACTIVITY_TYPES.forEach(function (type) {
      var option = el('option', null, type.label);
      option.value = type.key;
      if (type.key === (data.activityType || ACTIVITY_TYPES[0].key)) option.selected = true;
      typeSelect.appendChild(option);
    });
    typeField.appendChild(typeSelect);
    grid1.appendChild(typeField);

    topRow.appendChild(grid1);

    var removeButton = el('button', 'icon-btn icon-btn--danger workflow-step__remove');
    removeButton.type = 'button';
    removeButton.setAttribute('aria-label', 'Xoá bước');
    removeButton.appendChild(svgIcon('icon-x'));
    removeButton.addEventListener('click', function () {
      card.remove();
      renumberProcessSteps();
      if (!processStepsListNode.children.length) addProcessStep();
    });
    topRow.appendChild(removeButton);
    body.appendChild(topRow);

    var instructionRow = el('div', 'workflow-step__instruction-row');
    var instructionField = el('div', 'field');
    instructionField.appendChild(el('label', 'label', 'Hướng dẫn thực hiện'));
    var instructionInput = el('input', 'input step-instruction');
    instructionInput.type = 'text';
    if (data.instruction) instructionInput.value = data.instruction;
    instructionField.appendChild(instructionInput);
    instructionRow.appendChild(instructionField);

    var qrLabel = el('label', 'checkbox workflow-step__qr');
    var qrInput = el('input', 'checkbox__input step-require-qr');
    qrInput.type = 'checkbox';
    qrInput.checked = !!data.requireQr;
    qrLabel.appendChild(qrInput);
    qrLabel.appendChild(el('span', 'checkbox__label', 'Yêu cầu tạo QR truy xuất'));
    instructionRow.appendChild(qrLabel);
    body.appendChild(instructionRow);

    var flagsRow = el('div', 'workflow-step__flags');

    var supplyLabel = el('label', 'checkbox');
    var supplyInput = el('input', 'checkbox__input step-require-supply');
    supplyInput.type = 'checkbox';
    supplyInput.checked = !!data.requireSupply;
    supplyLabel.appendChild(supplyInput);
    supplyLabel.appendChild(el('span', 'checkbox__label', 'Yêu cầu dùng vật tư'));
    flagsRow.appendChild(supplyLabel);

    var imageLabel = el('label', 'checkbox');
    var imageInput = el('input', 'checkbox__input step-require-image');
    imageInput.type = 'checkbox';
    imageInput.checked = !!data.requireImage;
    imageLabel.appendChild(imageInput);
    imageLabel.appendChild(el('span', 'checkbox__label', 'Bắt buộc hình ảnh'));
    flagsRow.appendChild(imageLabel);

    body.appendChild(flagsRow);

    var supplyField = el('div', 'field workflow-step__supply-field');
    supplyField.hidden = !data.requireSupply;
    supplyField.appendChild(el('label', 'label', 'Chỉ định vật tư cụ thể (Tuỳ chọn)'));
    var supplySelect = el('select', 'select step-supply-id');
    var emptyOption = el('option', null, '— Không chỉ định —');
    emptyOption.value = '';
    supplySelect.appendChild(emptyOption);
    store.list('supplies').forEach(function (supply) {
      var option = el('option', null, supply.code + ' — ' + supply.name);
      option.value = supply.id;
      if (supply.id === data.supplyId) option.selected = true;
      supplySelect.appendChild(option);
    });
    supplyField.appendChild(supplySelect);
    body.appendChild(supplyField);

    supplyInput.addEventListener('change', function () {
      supplyField.hidden = !supplyInput.checked;
    });

    card.appendChild(body);
    return card;
  }

  function addProcessStep(data) {
    processStepsListNode.appendChild(processStepEditorCard(data || {}));
    renumberProcessSteps();
  }

  function resetProcessSteps() {
    processStepCount = 0;
    processStepsListNode.textContent = '';
    var steps = (currentViewedSeason && currentViewedSeason.workflowSteps) || [];
    if (steps.length) {
      steps.forEach(function (step) { addProcessStep(step); });
    } else {
      addProcessStep();
    }
  }

  function collectProcessSteps() {
    return Array.prototype.map.call(processStepsListNode.querySelectorAll('[data-step-card]'), function (card) {
      var requireSupply = card.querySelector('.step-require-supply').checked;
      return {
        id: card.dataset.stepId,
        name: card.querySelector('.step-name').value.trim(),
        activityType: card.querySelector('.step-type').value,
        instruction: card.querySelector('.step-instruction').value.trim(),
        requireQr: card.querySelector('.step-require-qr').checked,
        requireSupply: requireSupply,
        supplyId: requireSupply ? card.querySelector('.step-supply-id').value : '',
        requireImage: card.querySelector('.step-require-image').checked,
        status: card.dataset.stepStatus || 'pending',
        completedAt: card.dataset.stepCompletedAt || null,
        logId: card.dataset.stepLogId || null,
        batchId: card.dataset.stepBatchId || null
      };
    });
  }

  function openProcessStepModal() {
    processStepForm.reset();
    resetProcessSteps();
    processStepModal.showModal();
  }

  function closeProcessStepModal() {
    processStepModal.close();
  }

  function validateProcessSteps() {
    var problems = [];
    processStepsListNode.querySelectorAll('.step-name').forEach(function (input) {
      if (!input.value.trim()) problems.push(input);
    });
    if (problems.length) {
      problems[0].focus();
      global.AgriChain.toast('Nhập đầy đủ tên cho từng bước.');
      return false;
    }
    return true;
  }

  function handleProcessStepsSubmit(event) {
    event.preventDefault();
    if (!validateProcessSteps() || !currentViewedSeason) return;

    store.update('seasons', currentViewedSeason.id, { workflowSteps: collectProcessSteps() });
    currentViewedSeason = store.find('seasons', currentViewedSeason.id);
    closeProcessStepModal();
    renderSeasonProcess();
    global.AgriChain.toast('Đã lưu quy trình.');
  }

  /* --- Khởi động ----------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    fillCertStatuses();
    fillSeasonStatuses();
    fillActivityTypes();
    fillBatchUnits();
    fillBatchStatuses();

    var code = new URLSearchParams(global.location.search).get('ma') || '';
    var farm = store.list('farms').find(function (item) {
      return item.code.toLowerCase() === code.trim().toLowerCase();
    });

    if (!farm) {
      showNotFound(code);
      return;
    }

    showFarm(farm);

    // Điều hướng thẳng tới đúng mùa vụ + tab "Lô hàng" — dùng khi bấm nút
    // sửa/xoá ở trang lo-hang.html, ví dụ
    // nong-trai-chi-tiet.html?ma=NV01&season=MV01-2026#lo-hang.
    var seasonCode = new URLSearchParams(global.location.search).get('season');
    if (seasonCode) {
      var targetSeason = store.list('seasons').find(function (item) {
        return item.farmId === farm.id &&
          item.code.toLowerCase() === seasonCode.trim().toLowerCase();
      });
      if (targetSeason) {
        openSeasonViewModal(targetSeason);
        if (global.location.hash === '#lo-hang') {
          var batchesTab = seasonViewModal.querySelector('[data-tab-target="season-view-tab-batches"]');
          if (batchesTab) batchesTab.click();
        }
      }
    }

    document.querySelectorAll('[data-open-cert-form]').forEach(function (button) {
      button.addEventListener('click', function () { openCertModal(); });
    });
    document.querySelectorAll('[data-close-cert-form]').forEach(function (button) {
      button.addEventListener('click', closeCertModal);
    });
    certFileInput.addEventListener('change', handleCertFileChange);
    document.querySelector('[data-cert-file-remove]').addEventListener('click', removeCertFile);
    certForm.addEventListener('submit', handleCertSubmit);

    document.querySelectorAll('[data-open-season-form]').forEach(function (button) {
      button.addEventListener('click', function () { openSeasonModal(); });
    });
    document.querySelectorAll('[data-close-season-form]').forEach(function (button) {
      button.addEventListener('click', closeSeasonModal);
    });
    seasonForm.addEventListener('submit', handleSeasonSubmit);

    document.querySelectorAll('[data-close-season-view]').forEach(function (button) {
      button.addEventListener('click', closeSeasonViewModal);
    });

    document.querySelectorAll('[data-open-season-log-form]').forEach(function (button) {
      button.addEventListener('click', function () { openSeasonLogModal(); });
    });
    document.querySelectorAll('[data-close-season-log-form]').forEach(function (button) {
      button.addEventListener('click', closeSeasonLogModal);
    });
    document.querySelector('[data-add-material-row]').addEventListener('click', function () {
      addMaterialRow();
    });
    imagesInput.addEventListener('change', handleImagesInputChange);
    seasonLogForm.addEventListener('submit', handleSeasonLogSubmit);

    document.querySelectorAll('[data-open-batch-form]').forEach(function (button) {
      button.addEventListener('click', function () { openBatchModal(); });
    });
    document.querySelectorAll('[data-close-batch-form]').forEach(function (button) {
      button.addEventListener('click', closeBatchModal);
    });
    batchForm.addEventListener('submit', handleBatchSubmit);

    document.querySelectorAll('[data-close-qr]').forEach(function (button) {
      button.addEventListener('click', closeQrModal);
    });

    processTemplateSelect.addEventListener('change', function () {
      processApplyBtn.disabled = !processTemplateSelect.value;
    });
    processApplyBtn.addEventListener('click', function () {
      applyWorkflowTemplate(processTemplateSelect.value);
    });
    document.querySelector('[data-process-create-empty]').addEventListener('click', function () {
      createEmptyWorkflow();
    });
    document.querySelector('[data-process-customize-btn]').addEventListener('click', function () {
      openProcessStepModal();
    });
    document.querySelectorAll('[data-close-process-step-form]').forEach(function (button) {
      button.addEventListener('click', closeProcessStepModal);
    });
    document.querySelector('[data-process-add-step]').addEventListener('click', function () {
      addProcessStep();
    });
    processStepForm.addEventListener('submit', handleProcessStepsSubmit);
  });
})(window);
