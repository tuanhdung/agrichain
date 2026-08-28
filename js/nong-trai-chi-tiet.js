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

  /* --- Khởi động ----------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    fillCertStatuses();
    fillSeasonStatuses();

    var code = new URLSearchParams(global.location.search).get('ma') || '';
    var farm = store.list('farms').find(function (item) {
      return item.code.toLowerCase() === code.trim().toLowerCase();
    });

    if (!farm) {
      showNotFound(code);
      return;
    }

    showFarm(farm);

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
  });
})(window);
