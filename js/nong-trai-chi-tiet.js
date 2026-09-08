/* ==========================================================================
   AgriChain — Trang chi tiết 1 nông trại (nong-trai-chi-tiet.html?ma=...)
   Đọc mã nông trại từ query string (?ma=), tìm qua js/api.js rồi vẽ lại
   thông tin, cùng 2 danh sách con gắn theo farm_id: chứng nhận nông trại và
   lịch sử mùa vụ (thêm/sửa/xoá ngay tại đây) — farms/seasons/logs/
   certifications ĐÃ CHUYỂN SANG BACKEND THẬT, KHÔNG còn dùng AgriChain.store
   nữa cho 4 collection này.

   NGOẠI LỆ — vẫn dùng store.js: mẫu quy trình (workflowTemplates, chưa có
   ở backend, giai đoạn 3) và lô hàng (batches, cũng giai đoạn 3) — xem mục
   "Quy trình mùa vụ"/"Lô hàng" bên dưới. Vật tư (supplies) đã chuyển API
   nên MỌI chỗ chọn vật tư trên trang này (dropdown trong form nhật ký, form
   tuỳ biến bước quy trình) đọc qua api.supplies.list(), không đọc store.js
   nữa — nếu không id vật tư chọn được sẽ không khớp bản ghi thật trong DB.

   Nạp SAU js/api-config.js, js/api.js, js/store.js, js/app-shell.js,
   js/map-layers.js và js/enums.js (ACTIVITY_TYPES dùng chung).
   ========================================================================== */

(function (global) {
  'use strict';

  var api = global.AgriChain.api;
  // store.js CHỈ còn dùng cho workflowTemplates + batches (giai đoạn 3,
  // xem ghi chú đầu file) — mọi farms/seasons/logs/certifications đã qua api.*.
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

  // Nguồn duy nhất cho danh mục "loại hoạt động" — js/enums.js, nạp trước
  // file này (xem thứ tự script trong nong-trai-chi-tiet.html). Trước đây
  // khai báo riêng ở đây, lệch nhãn/icon với bản ở js/mau-quy-trinh.js.
  var ACTIVITY_TYPES = global.AgriChain.ACTIVITY_TYPES;

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

  var farmLoadingNode = document.querySelector('[data-farm-loading]');
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
  // Chấp nhận cả "YYYY-MM-DDTHH:mm" (input datetime-local) lẫn ISO đầy đủ
  // backend trả về ("...T07:30:00+07:00"/"...Z") — luôn cắt về đúng 16 ký
  // tự đầu ("YYYY-MM-DDTHH:mm") trước khi tách, bỏ qua giây/múi giờ.
  function formatDateTimeLocal(value) {
    if (!value) return 'Chưa đặt';
    var parts = String(value).slice(0, 16).split('T');
    if (parts.length !== 2) return value;
    return formatDate(parts[0]) + ' ' + parts[1];
  }

  // "2026-02-01T07:30:00+07:00" -> "2026-02-01T07:30" (khớp giá trị input
  // datetime-local mong đợi).
  function toDatetimeLocalValue(value) {
    return value ? String(value).slice(0, 16) : '';
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
    farmLoadingNode.hidden = true;
    notFoundNode.hidden = false;
    detailNode.hidden = true;
    breadcrumbNode.textContent = 'Không tìm thấy';
    notFoundNode.querySelector('[data-not-found-title]').textContent =
      'Không tìm thấy nông trại có mã "' + code + '"';
  }

  function showFarm(farm) {
    currentFarm = farm;
    farmLoadingNode.hidden = true;
    notFoundNode.hidden = true;
    detailNode.hidden = false;

    breadcrumbNode.textContent = farm.name;
    fillField('[data-view-name]', farm.name);
    fillField('[data-view-code]', farm.code);
    fillField('[data-view-area]', formatArea(farm.area));
    fillField('[data-view-address]', farm.address);
    fillField('[data-view-ward]', farm.ward);
    fillField('[data-view-province]', farm.province);
    fillField('[data-view-start-date]', formatDate(farm.start_date));
    fillField('[data-view-national-puc]', farm.national_puc);
    fillField('[data-view-international-puc]', farm.international_puc);
    fillField('[data-view-desc]', farm.description);

    showFarmOnMap(farm);
    renderCertifications();
    renderSeasons();
  }

  // Ẩn nút nào người dùng hiện tại không có quyền — đánh dấu sẵn bằng
  // data-requires-permission="<mã quyền>" trên nút trong HTML.
  function applyPermissionGates() {
    document.querySelectorAll('[data-requires-permission]').forEach(function (node) {
      var code = node.getAttribute('data-requires-permission');
      if (!api.hasPermission(code)) node.hidden = true;
    });
  }

  // GET /farms không có endpoint "tìm theo code", chỉ có `q` (tìm kiếm tự
  // do) — tải kèm lọc gần đúng rồi tự so khớp CHÍNH XÁC (không phân biệt
  // hoa/thường) ở client, giống cách nong-trai.js kiểm tra trùng mã trước
  // đây (nhưng giờ chỉ để TÌM, không phải để validate).
  function loadFarmByCode(code) {
    api.farms.list({ q: code, page_size: 100 }).then(function (data) {
      var farm = (data.items || []).filter(function (item) {
        return item.code.toLowerCase() === code.trim().toLowerCase();
      })[0];

      if (!farm) {
        showNotFound(code);
        return;
      }

      showFarm(farm);
      maybeOpenSeasonFromQuery(farm);
    }).catch(function (err) {
      showNotFound(code);
      notFoundNode.querySelector('[data-not-found-title]').textContent =
        'Không tải được thông tin nông trại: ' + err.message;
    });
  }

  // Điều hướng thẳng tới đúng mùa vụ + tab "Lô hàng" — dùng khi bấm nút
  // sửa/xoá ở trang lo-hang.html, ví dụ
  // nong-trai-chi-tiet.html?ma=NV01&season=MV01-2026#lo-hang.
  function maybeOpenSeasonFromQuery(farm) {
    var seasonCode = new URLSearchParams(global.location.search).get('season');
    if (!seasonCode) return;

    api.seasons.list({ farm_id: farm.id, q: seasonCode, page_size: 100 }).then(function (data) {
      var targetSeason = (data.items || []).filter(function (item) {
        return item.code.toLowerCase() === seasonCode.trim().toLowerCase();
      })[0];
      if (!targetSeason) return;

      openSeasonViewModal(targetSeason);
      if (global.location.hash === '#lo-hang') {
        var batchesTab = seasonViewModal.querySelector('[data-tab-target="season-view-tab-batches"]');
        if (batchesTab) batchesTab.click();
      }
    }).catch(function (err) {
      global.AgriChain.toast(err.message);
    });
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
    rows.appendChild(fieldRow('icon-calendar', 'Ngày cấp', formatDate(cert.issue_date)));
    rows.appendChild(fieldRow('icon-calendar', 'Ngày hết hạn', formatDate(cert.expiry_date)));

    var fileValue;
    if (cert.file_name) {
      // Danh sách chỉ có metadata tệp, không có nội dung — bấm mới tải chi
      // tiết (api.certifications.get()) rồi mở file_url, không tải trước
      // cho toàn bộ danh sách (tốn băng thông vô ích).
      var fileButton = el('button', 'badge badge--info', cert.file_name);
      fileButton.type = 'button';
      fileButton.addEventListener('click', function () { openCertFile(cert.id); });
      fileValue = fileButton;
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
    if (!api.hasPermission('certifications.edit')) edit.hidden = true;
    edit.appendChild(svgIcon('icon-pencil'));
    edit.addEventListener('click', function () { openCertModal(cert); });

    var del = el('button', 'icon-btn icon-btn--danger');
    del.type = 'button';
    del.setAttribute('aria-label', 'Xoá ' + cert.name);
    del.setAttribute('data-tooltip', 'Xoá');
    if (!api.hasPermission('certifications.delete')) del.hidden = true;
    del.appendChild(svgIcon('icon-trash'));
    del.addEventListener('click', function () { deleteCert(cert); });

    actions.appendChild(edit);
    actions.appendChild(del);
    card.appendChild(actions);

    return card;
  }

  // Tải chi tiết (kèm nội dung tệp) rồi mở tab mới — dùng chung cho nút
  // "Xem tệp" trong thẻ danh sách và (gián tiếp) khi mở modal Sửa.
  function openCertFile(certId) {
    api.certifications.get(certId).then(function (detail) {
      if (!detail.file_url) {
        global.AgriChain.toast('Chứng nhận này chưa có tệp đính kèm.');
        return;
      }
      global.open(detail.file_url, '_blank', 'noopener');
    }).catch(function (err) {
      global.AgriChain.toast(err.message);
    });
  }

  function renderCertifications() {
    if (!currentFarm) return;
    certListNode.textContent = '';
    api.certifications.list({ farm_id: currentFarm.id, page_size: 100 }).then(function (data) {
      var certs = data.items || [];
      certCountNode.textContent = data.total || certs.length;

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
    }).catch(function (err) {
      global.AgriChain.toast(err.message);
    });
  }

  function resetCertFileField() {
    certFile = null;
    certFileRemoved = false;
    certFileInput.value = '';
    certFileCurrent.hidden = true;
  }

  // existingCertFileUrl: nội dung tệp hiện có (file_url thật, từ
  // api.certifications.get()) — handleCertSubmit() cần giá trị này để biết
  // "giữ nguyên tệp cũ" nghĩa là gì khi người dùng không đổi/không gỡ tệp.
  var existingCertFileUrl = null;
  var certDetailLoading = false;

  function openCertModal(cert) {
    certForm.reset();
    clearErrors(certForm);
    resetCertFileField();
    existingCertFileUrl = null;
    certDetailLoading = false;
    editingCertId = cert ? cert.id : null;

    if (cert) {
      certModalTitle.textContent = 'Sửa chứng nhận';
      certSubmitLabel.textContent = 'Lưu thay đổi';
      document.getElementById('cert-name').value = cert.name || '';
      document.getElementById('cert-code').value = cert.code || '';
      document.getElementById('cert-issuer').value = cert.issuer || '';
      certStatusSelect.value = cert.status || CERT_STATUSES[0].key;
      document.getElementById('cert-issue-date').value = cert.issue_date || '';
      document.getElementById('cert-expiry-date').value = cert.expiry_date || '';
      document.getElementById('cert-note').value = cert.note || '';

      // Danh sách không có nội dung tệp — tải riêng chi tiết để biết tệp
      // hiện có thật sự tồn tại (file_url), dùng cho cả link "Xem tệp" lẫn
      // logic "giữ nguyên tệp cũ" khi lưu. certDetailLoading chặn submit
      // sớm trước khi biết chắc tệp cũ có tồn tại hay không (validateCert()).
      if (cert.file_name) {
        certDetailLoading = true;
        api.certifications.get(cert.id).then(function (detail) {
          existingCertFileUrl = detail.file_url || null;
          certFileLink.textContent = detail.file_name || 'Xem tệp';
          certFileLink.href = detail.file_url || '#';
          certFileCurrent.hidden = !detail.file_url;
        }).catch(function (err) {
          global.AgriChain.toast(err.message);
        }).then(function () {
          certDetailLoading = false;
        });
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
    }
    // Không kiểm tra trùng mã phía client — backend tự kiểm tra trùng
    // "code" trong phạm vi 1 nông trại, trả lỗi kèm details.field="code".

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
    var hasFile = !!certFile || (!certFileRemoved && !!existingCertFileUrl);
    if (!hasFile) {
      showError(certFileInput, 'Chọn tệp đính kèm.');
      problems.push(certFileInput);
    }

    if (certDetailLoading) {
      global.AgriChain.toast('Đang tải thông tin tệp đính kèm, thử lại sau giây lát.');
      return false;
    }

    if (problems.length) {
      problems[0].focus();
      return false;
    }
    return true;
  }

  // Ánh xạ tên field backend trả về trong lỗi (details.field) sang đúng
  // input trên form — khớp CertificationCreate/CertificationUpdate thật.
  function certFieldNodeFor(fieldName) {
    var map = {
      name: 'cert-name',
      code: 'cert-code',
      issuer: 'cert-issuer',
      status: 'cert-status',
      issue_date: 'cert-issue-date',
      expiry_date: 'cert-expiry-date',
      note: 'cert-note',
      file_url: 'cert-file',
      file_name: 'cert-file'
    };
    var id = map[fieldName];
    return id ? document.getElementById(id) : null;
  }

  function handleCertSubmit(event) {
    event.preventDefault();
    if (!validateCert()) return;

    var data = new FormData(certForm);
    var record = {
      name: String(data.get('name')).trim(),
      code: String(data.get('code')).trim(),
      issuer: String(data.get('issuer') || '').trim(),
      status: String(data.get('status')),
      issue_date: String(data.get('issueDate') || ''),
      expiry_date: String(data.get('expiryDate') || ''),
      note: String(data.get('note') || '').trim() || null
    };

    if (certFile) {
      // Chọn tệp mới — thay thế tệp cũ (nếu có).
      record.file_name = certFile.name;
      record.file_url = certFile.dataUrl;
    } else if (certFileRemoved) {
      // Bấm "Gỡ tệp" — CertificationUpdate: gửi null để gỡ tệp đính kèm.
      record.file_name = null;
      record.file_url = null;
    }
    // Không đổi/không gỡ: không gửi file_name/file_url — PATCH giữ nguyên
    // tệp cũ. POST (tạo mới) thì đơn giản là không có tệp nào cả.

    var submitButton = certForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    certSubmitLabel.textContent = 'Đang lưu...';

    var request;
    if (editingCertId) {
      request = api.certifications.update(editingCertId, record);
    } else {
      record.farm_id = currentFarm.id;
      request = api.certifications.create(record);
    }

    request.then(function () {
      closeCertModal();
      renderCertifications();
      global.AgriChain.toast(editingCertId ? 'Đã lưu thay đổi.' : 'Đã thêm chứng nhận.');
    }).catch(function (err) {
      if (err.details && err.details.field) {
        var field = certFieldNodeFor(err.details.field);
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
      certSubmitLabel.textContent = editingCertId ? 'Lưu thay đổi' : 'Lưu chứng nhận';
    });
  }

  function deleteCert(cert) {
    global.AgriChain.confirm(
      'Xoá chứng nhận "' + cert.name + '"? Hành động này không thể hoàn tác.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      api.certifications.remove(cert.id).then(function () {
        renderCertifications();
        global.AgriChain.toast('Đã xoá chứng nhận.');
      }).catch(function (err) {
        global.AgriChain.toast(err.message);
      });
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
  // Tổng số mùa vụ của nông trại đang xem, cập nhật mỗi lần renderSeasons()
  // tải xong — chỉ dùng để GỢI Ý mã mùa vụ tiếp theo (suggestSeasonCode()),
  // không dùng để kiểm tra trùng mã (backend tự làm việc đó).
  var seasonsTotal = 0;

  function fillSeasonStatuses() {
    SEASON_STATUSES.forEach(function (status) {
      var option = el('option', null, status.label);
      option.value = status.key;
      seasonStatusSelect.appendChild(option);
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
    rows.appendChild(fieldRow('icon-calendar', 'Ngày bắt đầu', formatDate(season.start_date)));
    rows.appendChild(fieldRow('icon-calendar', 'Ngày kết thúc', formatDate(season.end_date)));

    var chips = el('div', 'data-card__chip-group');
    chips.appendChild(el('span', 'badge badge--info', 'Dự kiến: ' + formatArea(season.planned_area)));
    chips.appendChild(el('span', 'badge badge--warning', 'Thực tế: ' + formatArea(season.actual_area)));
    rows.appendChild(fieldRow('icon-chart-bar', 'Diện tích', chips));

    if (season.expected_yield != null) {
      rows.appendChild(fieldRow('icon-wheat', 'Sản lượng dự kiến',
        season.expected_yield + ' ' + (season.yield_unit || '')));
    }

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
    if (!api.hasPermission('seasons.edit')) edit.hidden = true;
    edit.appendChild(svgIcon('icon-pencil'));
    edit.addEventListener('click', function () { openSeasonModal(season); });

    var del = el('button', 'icon-btn icon-btn--danger');
    del.type = 'button';
    del.setAttribute('aria-label', 'Xoá ' + season.name);
    del.setAttribute('data-tooltip', 'Xoá');
    if (!api.hasPermission('seasons.delete')) del.hidden = true;
    del.appendChild(svgIcon('icon-trash'));
    del.addEventListener('click', function () { deleteSeason(season); });

    actions.appendChild(view);
    actions.appendChild(edit);
    actions.appendChild(del);
    card.appendChild(actions);

    return card;
  }

  function renderSeasons() {
    if (!currentFarm) return;
    api.seasons.list({ farm_id: currentFarm.id, page_size: 100 }).then(function (data) {
      var seasons = data.items || [];
      seasonsTotal = data.total || seasons.length;
      seasonCountNode.textContent = seasonsTotal;

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
    }).catch(function (err) {
      global.AgriChain.toast(err.message);
    });
  }

  // Gợi ý mã mùa vụ tiếp theo của CHÍNH nông trại đang xem — MV01, MV02...
  // giống cách farm-code gợi ý ở nong-trai.js, chỉ là gợi ý, sửa được.
  function suggestSeasonCode() {
    var seq = String(seasonsTotal + 1);
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
      document.getElementById('season-start-date').value = season.start_date || '';
      document.getElementById('season-end-date').value = season.end_date || '';
      document.getElementById('season-planned-area').value =
        season.planned_area != null ? season.planned_area : '';
      document.getElementById('season-actual-area').value =
        season.actual_area != null ? season.actual_area : '';
      document.getElementById('season-expected-yield').value =
        season.expected_yield != null ? season.expected_yield : '';
      document.getElementById('season-yield-unit').value = season.yield_unit || '';
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
    }
    // Không kiểm tra trùng mã phía client — backend tự kiểm tra trùng
    // "code" trong phạm vi 1 nông trại, trả lỗi kèm details.field="code".

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

    // Sản lượng dự kiến tuỳ chọn, nhưng nếu có thì bắt buộc kèm đơn vị
    // (khớp yêu cầu backend: "Bắt buộc khi có sản lượng dự kiến").
    var expectedYield = document.getElementById('season-expected-yield');
    var yieldUnit = document.getElementById('season-yield-unit');
    if (expectedYield.value.trim() && !yieldUnit.value.trim()) {
      showError(yieldUnit, 'Nhập đơn vị sản lượng.');
      problems.push(yieldUnit);
    }

    if (problems.length) {
      problems[0].focus();
      return false;
    }
    return true;
  }

  // Ánh xạ tên field backend trả về trong lỗi (details.field) sang đúng
  // input trên form — khớp SeasonCreate/SeasonUpdate thật.
  function seasonFieldNodeFor(fieldName) {
    var map = {
      code: 'season-code',
      name: 'season-name',
      start_date: 'season-start-date',
      end_date: 'season-end-date',
      planned_area: 'season-planned-area',
      actual_area: 'season-actual-area',
      expected_yield: 'season-expected-yield',
      yield_unit: 'season-yield-unit',
      status: 'season-status',
      note: 'season-note'
    };
    var id = map[fieldName];
    return id ? document.getElementById(id) : null;
  }

  function handleSeasonSubmit(event) {
    event.preventDefault();
    if (!validateSeason()) return;

    var data = new FormData(seasonForm);
    var expectedYieldRaw = String(data.get('expectedYield') || '').trim();
    var record = {
      code: String(data.get('code')).trim(),
      name: String(data.get('name')).trim(),
      start_date: String(data.get('startDate') || ''),
      end_date: String(data.get('endDate') || ''),
      planned_area: Number(data.get('plannedArea')) || 0,
      actual_area: Number(data.get('actualArea')) || 0,
      expected_yield: expectedYieldRaw ? Number(expectedYieldRaw) : null,
      yield_unit: expectedYieldRaw ? String(data.get('yieldUnit') || '').trim() : null,
      status: String(data.get('status')),
      note: String(data.get('note') || '').trim() || null
    };

    var submitButton = seasonForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    seasonSubmitLabel.textContent = 'Đang lưu...';

    // KHÔNG gửi workflow_template_id/name/steps ở đây trong cả 2 trường hợp
    // — PATCH giữ nguyên quy trình đã áp dụng (nếu có, xem SeasonUpdate:
    // "trường nào không gửi thì giữ nguyên"); POST (tạo mới) thì backend tự
    // mặc định cả 3 về null, đúng trạng thái "chưa áp dụng quy trình nào".
    var request;
    if (editingSeasonId) {
      request = api.seasons.update(editingSeasonId, record);
    } else {
      record.farm_id = currentFarm.id;
      request = api.seasons.create(record);
    }

    request.then(function () {
      closeSeasonModal();
      renderSeasons();
      global.AgriChain.toast(editingSeasonId ? 'Đã lưu thay đổi.' : 'Đã thêm mùa vụ.');
    }).catch(function (err) {
      if (err.details && err.details.field) {
        var field = seasonFieldNodeFor(err.details.field);
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
      seasonSubmitLabel.textContent = editingSeasonId ? 'Lưu thay đổi' : 'Lưu mùa vụ';
    });
  }

  function deleteSeason(season) {
    global.AgriChain.confirm(
      'Xoá mùa vụ "' + season.name + '"? Hành động này không thể hoàn tác.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      // Backend chặn (409) nếu mùa vụ đã có nhật ký hoạt động — hiện đúng
      // lỗi đó, không giả vờ đã xoá thành công.
      api.seasons.remove(season.id).then(function () {
        renderSeasons();
        global.AgriChain.toast('Đã xoá mùa vụ.');
      }).catch(function (err) {
        global.AgriChain.toast(err.message);
      });
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

    fillSeasonView('[data-season-view-stat-start]', formatDate(season.start_date));
    fillSeasonView('[data-season-view-stat-end]', formatDate(season.end_date));
    fillSeasonView('[data-season-view-stat-planned]', formatArea(season.planned_area));
    fillSeasonView('[data-season-view-stat-actual]', formatArea(season.actual_area));

    fillSeasonView('[data-season-view-start]', formatDate(season.start_date));
    fillSeasonView('[data-season-view-end]', formatDate(season.end_date));
    fillSeasonView('[data-season-view-planned]', formatArea(season.planned_area));
    fillSeasonView('[data-season-view-actual]', formatArea(season.actual_area));
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

  /* --- Vật tư sử dụng: từng dòng thêm/xoá được, chọn từ kho vật tư thật ---
     Vật tư ĐÃ CHUYỂN SANG API — tải 1 lần lúc trang khởi động (loadSupplyOptions(),
     xem cuối file) thay vì đọc store.js, nếu không id chọn được sẽ không
     khớp bản ghi thật trong DB. Không tải lại mỗi lần mở modal — danh sách
     vật tư hiếm khi đổi trong 1 phiên làm việc. */
  var availableSupplies = [];

  function loadSupplyOptions() {
    return api.supplies.list({ page_size: 100 }).then(function (data) {
      availableSupplies = data.items || [];
    }).catch(function (err) {
      global.AgriChain.toast('Không tải được danh sách vật tư: ' + err.message);
    });
  }

  function findSupply(id) {
    for (var i = 0; i < availableSupplies.length; i++) {
      if (availableSupplies[i].id === id) return availableSupplies[i];
    }
    return null;
  }

  function unitOfSupply(supplyId) {
    if (!supplyId) return '';
    var supply = findSupply(supplyId);
    return supply ? supply.unit : '';
  }

  function fillMaterialSelect(select) {
    var placeholder = el('option', null, '— Chọn vật tư —');
    placeholder.value = '';
    select.appendChild(placeholder);

    availableSupplies.forEach(function (supply) {
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
    if (prefill && prefill.supply_id) select.value = prefill.supply_id;

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
      var supply = findSupply(materialSelect.value);
      if (!supply) return;

      // Khớp khuôn LogSupply thật của backend (7 trường, xác nhận qua
      // /openapi.json trước khi code — có `code`, khác SCHEMA-EXPORT.md
      // bản cũ chỉ 6 trường). code/name là BẢN CHỤP tại thời điểm ghi,
      // không đồng bộ lại nếu vật tư gốc đổi tên/mã sau đó.
      result.push({
        supply_id: supply.id,
        code: supply.code,
        name: supply.name,
        quantity: Number(qtyInput.value) || 0,
        unit: unitSelect.value,
        method: methodSelect.value || null,
        purpose: purposeInput.value.trim() || null
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

  // Backend chặn nếu vượt (LogImageIn: "Tối đa 5 ảnh mỗi bản ghi", "Tối đa
  // 2MB mỗi ảnh") — kiểm trước ở client cho trải nghiệm tốt hơn, khỏi phải
  // đợi gọi API mới biết bị từ chối.
  var MAX_LOG_IMAGES = 5;
  var MAX_LOG_IMAGE_BYTES = 2 * 1024 * 1024;

  function handleImagesInputChange() {
    var files = imagesInput.files;
    if (!files || !files.length) return;

    var accepted = [];
    var rejectedTooLarge = [];
    Array.prototype.forEach.call(files, function (file) {
      if (file.size > MAX_LOG_IMAGE_BYTES) {
        rejectedTooLarge.push(file.name);
        return;
      }
      accepted.push(file);
    });

    if (rejectedTooLarge.length) {
      global.AgriChain.toast('Bỏ qua ' + rejectedTooLarge.length + ' ảnh vượt quá 2MB: ' +
        rejectedTooLarge.join(', '));
    }

    var remainingSlots = MAX_LOG_IMAGES - logImages.length;
    if (remainingSlots <= 0) {
      global.AgriChain.toast('Mỗi nhật ký tối đa ' + MAX_LOG_IMAGES + ' ảnh — xoá bớt ảnh cũ trước khi thêm mới.');
      imagesInput.value = '';
      return;
    }
    if (accepted.length > remainingSlots) {
      global.AgriChain.toast('Chỉ thêm được ' + remainingSlots + ' ảnh nữa (tối đa ' + MAX_LOG_IMAGES + ' ảnh/nhật ký).');
      accepted = accepted.slice(0, remainingSlots);
    }

    accepted.forEach(function (file) {
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
    var activity = statusOf(ACTIVITY_TYPES, log.activity_type);
    var item = el('div', 'log-item log-item--' + activity.color);

    var iconWrap = el('div', 'log-item__icon');
    iconWrap.appendChild(svgIcon(activity.icon));
    item.appendChild(iconWrap);

    var body = el('div', 'log-item__body');

    var head = el('div', 'log-item__head');
    head.appendChild(el('span', 'log-item__title', activity.label));
    head.appendChild(el('span', 'log-item__time', formatDateTimeLocal(log.performed_at)));
    body.appendChild(head);

    body.appendChild(logField('icon-user', 'Thực hiện bởi: ' + (log.performed_by || '—')));
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

    // Danh sách chỉ trả METADATA ảnh (không có nội dung) — hiện nút "Xem
    // ảnh", chỉ gọi api.logs.get() khi người dùng thật sự bấm xem, không
    // tải trước cho toàn bộ danh sách (tốn băng thông vô ích).
    if (log.images && log.images.length) {
      body.appendChild(logSectionLabel('icon-image', 'Hình ảnh hiện trường (' + log.images.length + ')'));
      var imagesHost = el('div', 'log-item__images');
      var viewImagesBtn = el('button', 'btn btn--outline btn--sm', 'Xem ảnh');
      viewImagesBtn.type = 'button';
      viewImagesBtn.addEventListener('click', function () {
        viewImagesBtn.disabled = true;
        viewImagesBtn.textContent = 'Đang tải...';
        api.logs.get(log.id).then(function (detail) {
          imagesHost.textContent = '';
          (detail.images || []).forEach(function (image) {
            var img = document.createElement('img');
            img.src = image.url;
            img.alt = image.name || '';
            imagesHost.appendChild(img);
          });
        }).catch(function (err) {
          global.AgriChain.toast(err.message);
          viewImagesBtn.disabled = false;
          viewImagesBtn.textContent = 'Xem ảnh';
        });
      });
      imagesHost.appendChild(viewImagesBtn);
      body.appendChild(imagesHost);
    }

    var actions = el('div', 'log-item__actions');

    var edit = el('button', 'icon-btn');
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Sửa nhật ký');
    edit.setAttribute('data-tooltip', 'Chỉnh sửa');
    if (!api.hasPermission('logs.edit')) edit.hidden = true;
    edit.appendChild(svgIcon('icon-pencil'));
    edit.addEventListener('click', function () { openSeasonLogModal(log); });

    var del = el('button', 'icon-btn icon-btn--danger');
    del.type = 'button';
    del.setAttribute('aria-label', 'Xoá nhật ký');
    del.setAttribute('data-tooltip', 'Xoá');
    if (!api.hasPermission('logs.delete')) del.hidden = true;
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

    logListNode.textContent = '';
    api.logs.list({ season_id: currentViewedSeason.id, page_size: 100 }).then(function (data) {
      var logs = (data.items || []).sort(function (a, b) {
        // Mới thực hiện gần đây nhất lên đầu
        return String(b.performed_at).localeCompare(String(a.performed_at));
      });
      logCountNode.textContent = data.total || logs.length;

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
    }).catch(function (err) {
      global.AgriChain.toast(err.message);
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
      activityTypeSelect.value = log.activity_type || ACTIVITY_TYPES[0].key;
      document.getElementById('log-performed-at').value = toDatetimeLocalValue(log.performed_at);
      document.getElementById('log-performed-by').value = log.performed_by || '';
      document.getElementById('log-weather').value = log.weather || '';
      document.getElementById('log-description').value = log.description || '';

      (log.supplies || []).forEach(function (supply) {
        addMaterialRow({
          supply_id: supply.supply_id,
          quantity: supply.quantity,
          unit: supply.unit,
          method: supply.method,
          purpose: supply.purpose
        });
      });

      // Danh sách chỉ có metadata ảnh — tải chi tiết để lấy nội dung thật
      // (url) rồi mới điền vào khung xem trước, khớp cấu trúc {name,dataUrl}
      // mà resetImages()/renderImages() đang dùng.
      resetImages();
      if (log.images && log.images.length) {
        api.logs.get(log.id).then(function (detail) {
          resetImages((detail.images || []).map(function (image) {
            return { name: image.name, dataUrl: image.url };
          }));
        }).catch(function (err) {
          global.AgriChain.toast('Không tải được ảnh của nhật ký: ' + err.message);
        });
      }
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

  // Ánh xạ tên field backend trả về trong lỗi (details.field) sang đúng
  // input trên form — khớp LogCreate/LogUpdate thật. supplies/images là
  // mảng composite, không gắn được vào 1 input cụ thể — toast thẳng.
  function logFieldNodeFor(fieldName) {
    var map = {
      activity_type: 'log-activity-type',
      performed_at: 'log-performed-at',
      performed_by: 'log-performed-by',
      weather: 'log-weather',
      description: 'log-description'
    };
    var id = map[fieldName];
    return id ? document.getElementById(id) : null;
  }

  function handleSeasonLogSubmit(event) {
    event.preventDefault();
    if (!validateSeasonLog() || !currentViewedSeason) return;

    var data = new FormData(seasonLogForm);
    // Chụp lại TRƯỚC khi đóng modal (closeSeasonLogModal() xoá biến này) —
    // chỉ hoàn thành bước quy trình khi đây là nhật ký MỚI, không áp dụng
    // lúc sửa nhật ký có sẵn. Cũng dùng để gắn step_id ngay lúc tạo log
    // (LogCreate hỗ trợ thẳng field này).
    var stepToComplete = !editingLogId ? completingStepId : null;

    var record = {
      step_id: stepToComplete || null,
      activity_type: String(data.get('activityType')),
      // Gửi thẳng giá trị datetime-local ("YYYY-MM-DDTHH:mm"), không tự quy
      // đổi múi giờ — backend hiểu chuỗi không kèm múi giờ là giờ Việt Nam
      // (+07:00), đúng ý người dùng nhập trên form.
      performed_at: String(data.get('performedAt') || ''),
      performed_by: String(data.get('performedBy')).trim(),
      weather: String(data.get('weather') || '').trim() || null,
      description: String(data.get('description') || '').trim() || null,
      supplies: getMaterialRowsData(),
      images: logImages.map(function (image) {
        return { name: image.name, url: image.dataUrl };
      })
    };

    var submitButton = seasonLogForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    seasonLogSubmitLabel.textContent = 'Đang lưu...';

    var request;
    if (editingLogId) {
      request = api.logs.update(editingLogId, record);
    } else {
      record.season_id = currentViewedSeason.id;
      request = api.logs.create(record);
    }

    request.then(function (savedLog) {
      closeSeasonLogModal(); // đóng trước khi completeWorkflowStep() có thể mở tiếp modal lô hàng
      renderSeasonLogs();
      global.AgriChain.toast(editingLogId ? 'Đã lưu thay đổi.' : 'Đã thêm nhật ký.');

      if (stepToComplete) {
        completeWorkflowStep(stepToComplete, savedLog.id);
      }
    }).catch(function (err) {
      if (err.details && err.details.field) {
        var field = logFieldNodeFor(err.details.field);
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
      seasonLogSubmitLabel.textContent = editingLogId ? 'Lưu thay đổi' : 'Xác nhận';
    });
  }

  function deleteSeasonLog(log) {
    var activity = statusOf(ACTIVITY_TYPES, log.activity_type);
    global.AgriChain.confirm(
      'Xoá nhật ký "' + activity.label + '" ngày ' + formatDateTimeLocal(log.performed_at) +
      '? Hành động này không thể hoàn tác.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      api.logs.remove(log.id).then(function () {
        renderSeasonLogs();
        global.AgriChain.toast('Đã xoá nhật ký.');
      }).catch(function (err) {
        global.AgriChain.toast(err.message);
      });
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
     Áp dụng 1 Mẫu Quy Trình (workflowTemplates, vẫn ở store.js, xem
     js/mau-quy-trinh.js — giai đoạn 3 mới có ở backend) cho 1 mùa vụ cụ
     thể — KHÔNG tham chiếu ngược tới mẫu gốc mà CHỤP (snapshot) nguyên bản
     steps[] vào season.workflow_steps (đã qua API thật) tại thời điểm áp
     dụng, mỗi bước được gắn thêm id riêng + trạng thái thực hiện
     (done/completed_at/log_id/batch_id). Nhờ vậy mẫu gốc có bị sửa/xoá sau
     đó cũng không ảnh hưởng tới checklist đã áp dụng cho mùa vụ này, và
     "Tuỳ biến bước quy trình" có thể sửa thoải mái riêng cho mùa vụ mà
     không đụng tới mẫu.

     season.workflow_steps === null → CHƯA áp dụng quy trình nào.
     season.workflow_steps === [] hoặc có phần tử → ĐÃ áp dụng (kể cả rỗng,
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

  // Chụp bước từ MẪU (workflowTemplates, vẫn ở store.js — camelCase) sang
  // bước của MÙA VỤ (seasons.workflow_steps, đã qua API thật — snake_case,
  // khớp WorkflowStep của backend) — đây CHÍNH LÀ điểm nối 2 hệ khác nhau,
  // không phải lớp chuyển đổi thừa.
  //
  // ⚠️ `done` (boolean) là tên field phía DỰ ÁN đã quyết định dùng (tránh
  // trùng "status" với seasons.status) — backend hiện VẪN CÒN dùng `status`
  // ('pending'/'completed') ở WorkflowStep, đây là BUG backend đang chờ sửa
  // (xem CLAUDE.md). Cho tới khi backend đổi field, gửi `done` lên sẽ bị
  // Pydantic ÂM THẦM BỎ QUA — bước sẽ không thực sự đánh dấu hoàn thành phía
  // server dù giao diện tưởng đã xong. Cứ viết đúng theo `done` như kế
  // hoạch đã chốt, không tự ý đổi lại thành `status`.
  function cloneTemplateSteps(template) {
    return (template.steps || []).map(function (step) {
      return {
        // KHÔNG tự sinh `id` — store.newId() ("m8x2k1-a9f3") không phải
        // UUID hợp lệ, trong khi WorkflowStep.id backend yêu cầu đúng
        // format: uuid. Bỏ trống thì backend tự sinh UUID thật (đã xác
        // nhận qua /openapi.json: "Client không gửi id thì backend sinh
        // mới") — currentViewedSeason được gán lại từ response ngay sau
        // khi PATCH thành công (xem applyWorkflowTemplate()), nên phía
        // client luôn hiển thị đúng id thật, không có bước nào render với
        // id giả trước đó.
        name: step.name || '',
        activity_type: step.activityType || ACTIVITY_TYPES[0].key,
        instruction: step.instruction || '',
        require_qr: !!step.requireQr,
        require_supply: !!step.requireSupply,
        supply_id: step.supplyId || null,
        require_image: !!step.requireImage,
        done: false,
        completed_at: null,
        log_id: null,
        batch_id: null
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
      workflow_template_id: template.id,
      workflow_template_name: template.name,
      workflow_steps: cloneTemplateSteps(template)
    };
    processApplyBtn.disabled = true;
    api.seasons.update(currentViewedSeason.id, changes).then(function (updated) {
      currentViewedSeason = updated;
      renderSeasonProcess();
      global.AgriChain.toast('Đã áp dụng mẫu quy trình.');
    }).catch(function (err) {
      global.AgriChain.toast(err.message);
    }).then(function () {
      processApplyBtn.disabled = !processTemplateSelect.value;
    });
  }

  function createEmptyWorkflow() {
    if (!currentViewedSeason) return;
    var changes = {
      workflow_template_id: null,
      workflow_template_name: 'Quy trình tự tạo',
      workflow_steps: []
    };
    api.seasons.update(currentViewedSeason.id, changes).then(function (updated) {
      currentViewedSeason = updated;
      renderSeasonProcess();
      openProcessStepModal(); // danh sách đang rỗng — mở luôn để tự thêm bước
    }).catch(function (err) {
      global.AgriChain.toast(err.message);
    });
  }

  // Bước "tới lượt" duy nhất trong checklist: bước CHƯA hoàn thành ĐẦU
  // TIÊN theo đúng thứ tự mảng — mọi bước chưa hoàn thành phía sau nó đều
  // phải "chờ đến lượt", chỉ bước này mới hiện nút "Ghi nhật ký & hoàn thành".
  function currentActionableStepId(steps) {
    for (var i = 0; i < steps.length; i++) {
      if (!steps[i].done) return steps[i].id;
    }
    return null;
  }

  function processStepViewCard(step, index, isCurrent) {
    var item = el('div', 'workflow-checklist__item');

    var rail = el('div', 'workflow-checklist__rail');
    rail.appendChild(el('span', 'workflow-checklist__dot' +
      (step.done ? ' workflow-checklist__dot--done' : '')));
    rail.appendChild(el('div', 'workflow-checklist__line'));
    item.appendChild(rail);

    var card = el('div', 'workflow-checklist__card');

    var head = el('div', 'workflow-checklist__head');
    head.appendChild(el('strong', 'workflow-checklist__step-title', 'Bước ' + (index + 1) + ': ' + step.name));
    if (step.require_qr) head.appendChild(el('span', 'badge badge--success', 'Yêu cầu sinh QR'));
    head.appendChild(el('span', 'badge ' + (step.done ? 'badge--success' : 'badge--warning'),
      step.done ? 'Hoàn thành' : 'Đang chờ'));
    card.appendChild(head);

    var activity = statusOf(ACTIVITY_TYPES, step.activity_type);
    var activityRow = el('div', 'workflow-checklist__activity workflow-checklist__activity--' + activity.color);
    activityRow.appendChild(svgIcon(activity.icon));
    activityRow.appendChild(el('span', null, activity.label));
    card.appendChild(activityRow);

    if (step.instruction) {
      card.appendChild(el('p', 'workflow-checklist__instruction', step.instruction));
    }

    if (step.done) {
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
    var steps = currentViewedSeason.workflow_steps || [];
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

    if (!currentViewedSeason.workflow_steps) {
      processEmptyNode.hidden = false;
      processDetailNode.hidden = true;
      fillProcessTemplateSelect();
      processApplyBtn.disabled = true;
      return;
    }

    processEmptyNode.hidden = true;
    processDetailNode.hidden = false;
    processTemplateNameNode.textContent = currentViewedSeason.workflow_template_name || 'Quy trình tự tạo';
    renderProcessSteps();
  }

  /* --- Hoàn tất 1 bước: mở modal nhật ký (điền sẵn loại hoạt động), rồi
     nếu bước yêu cầu QR thì mở tiếp modal tạo lô hàng sau khi ghi xong --- */

  // Banner "log đã tạo nhưng chưa cập nhật được trạng thái bước" — xem ghi
  // chú ở completeWorkflowStep() bên dưới. KHÔNG dùng .toast (biến mất sau
  // 4s, không đủ thời gian cho người dùng bấm thử lại).
  var processRetryNotice = document.querySelector('[data-process-retry-notice]');
  var processRetryMessage = document.querySelector('[data-process-retry-message]');
  var processRetryBtn = document.querySelector('[data-process-retry-btn]');
  var retryStepId = null;
  var retryLogId = null;

  function showProcessRetryNotice(message, stepId, logId) {
    retryStepId = stepId;
    retryLogId = logId;
    processRetryMessage.textContent = message;
    processRetryNotice.hidden = false;
  }

  function hideProcessRetryNotice() {
    retryStepId = null;
    retryLogId = null;
    processRetryNotice.hidden = true;
  }

  function startStepCompletion(step) {
    completingStepId = step.id;
    openSeasonLogModal();
    activityTypeSelect.value = step.activity_type || ACTIVITY_TYPES[0].key;
    document.getElementById('log-description').value = step.instruction || '';
  }

  // ⚠️ Gửi `workflow_steps[].done` — backend hiện vẫn dùng `status`
  // ('pending'/'completed'), đây là BUG backend đang chờ sửa (xem ghi chú ở
  // cloneTemplateSteps() và CLAUDE.md). Cho tới khi backend sửa xong, PATCH
  // này có thể "thành công" (204/200) nhưng KHÔNG thực sự đổi trạng thái
  // bước phía server (Pydantic bỏ qua field lạ `done`) — chưa kiểm chứng
  // được đầu-cuối, chỉ mới đúng theo hợp đồng dữ liệu đã chốt.
  function completeWorkflowStep(stepId, logId) {
    if (!currentViewedSeason) return;
    var steps = (currentViewedSeason.workflow_steps || []).slice();
    var step = null;
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].id === stepId) { step = steps[i]; break; }
    }
    if (!step) return;

    step.done = true;
    step.completed_at = new Date().toISOString();
    step.log_id = logId;

    hideProcessRetryNotice();
    api.seasons.update(currentViewedSeason.id, { workflow_steps: steps }).then(function (updated) {
      currentViewedSeason = updated;
      renderSeasonProcess();
      global.AgriChain.toast('Đã hoàn thành bước "' + step.name + '".');

      if (step.require_qr) {
        pendingQrStepId = step.id;
        openBatchModal();
      }
    }).catch(function (err) {
      // Nhật ký ĐÃ tạo thành công trước khi gọi hàm này (xem
      // handleSeasonLogSubmit()) — không được để trạng thái nửa vời trong
      // im lặng: log tồn tại thật nhưng bước chưa được đánh dấu hoàn
      // thành. Hiện banner có nút thử lại ĐÚNG lệnh PATCH này, không phải
      // toast tự biến mất.
      showProcessRetryNotice(err.message, stepId, logId);
    });
  }

  function linkBatchToStep(stepId, batchId) {
    if (!currentViewedSeason) return;
    var steps = (currentViewedSeason.workflow_steps || []).slice();
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].id === stepId) { steps[i].batch_id = batchId; break; }
    }
    api.seasons.update(currentViewedSeason.id, { workflow_steps: steps }).then(function (updated) {
      currentViewedSeason = updated;
      renderSeasonProcess();
    }).catch(function (err) {
      global.AgriChain.toast('Không lưu được liên kết lô hàng vào bước quy trình: ' + err.message);
    });
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
    // Bước MỚI (chưa có data.id) thì KHÔNG gán dataset.stepId — không tự
    // sinh id giả (store.newId() không phải UUID hợp lệ), để trống thì
    // collectProcessSteps() bỏ qua field `id`, backend tự cấp UUID thật.
    if (data.id) card.dataset.stepId = data.id;
    // dataset luôn ép giá trị về chuỗi — ghi tường minh 'true'/'false' thay
    // vì gán thẳng boolean (sẽ tự thành chuỗi "true"/"false" nhưng đọc lại
    // qua so sánh === 'true' cho rõ ý, tránh hiểu nhầm là boolean thật).
    card.dataset.stepDone = data.done ? 'true' : 'false';
    card.dataset.stepCompletedAt = data.completed_at || '';
    card.dataset.stepLogId = data.log_id || '';
    card.dataset.stepBatchId = data.batch_id || '';

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
      if (type.key === (data.activity_type || ACTIVITY_TYPES[0].key)) option.selected = true;
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
    qrInput.checked = !!data.require_qr;
    qrLabel.appendChild(qrInput);
    qrLabel.appendChild(el('span', 'checkbox__label', 'Yêu cầu tạo QR truy xuất'));
    instructionRow.appendChild(qrLabel);
    body.appendChild(instructionRow);

    var flagsRow = el('div', 'workflow-step__flags');

    var supplyLabel = el('label', 'checkbox');
    var supplyInput = el('input', 'checkbox__input step-require-supply');
    supplyInput.type = 'checkbox';
    supplyInput.checked = !!data.require_supply;
    supplyLabel.appendChild(supplyInput);
    supplyLabel.appendChild(el('span', 'checkbox__label', 'Yêu cầu dùng vật tư'));
    flagsRow.appendChild(supplyLabel);

    var imageLabel = el('label', 'checkbox');
    var imageInput = el('input', 'checkbox__input step-require-image');
    imageInput.type = 'checkbox';
    imageInput.checked = !!data.require_image;
    imageLabel.appendChild(imageInput);
    imageLabel.appendChild(el('span', 'checkbox__label', 'Bắt buộc hình ảnh'));
    flagsRow.appendChild(imageLabel);

    body.appendChild(flagsRow);

    var supplyField = el('div', 'field workflow-step__supply-field');
    supplyField.hidden = !data.require_supply;
    supplyField.appendChild(el('label', 'label', 'Chỉ định vật tư cụ thể (Tuỳ chọn)'));
    var supplySelect = el('select', 'select step-supply-id');
    var emptyOption = el('option', null, '— Không chỉ định —');
    emptyOption.value = '';
    supplySelect.appendChild(emptyOption);
    // Vật tư đã chuyển sang API — dùng chung danh sách đã tải sẵn
    // (availableSupplies, xem loadSupplyOptions() ở mục "Nhật ký mùa vụ"),
    // không đọc store.js nữa.
    availableSupplies.forEach(function (supply) {
      var option = el('option', null, supply.code + ' — ' + supply.name);
      option.value = supply.id;
      if (supply.id === data.supply_id) option.selected = true;
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
    var steps = (currentViewedSeason && currentViewedSeason.workflow_steps) || [];
    if (steps.length) {
      steps.forEach(function (step) { addProcessStep(step); });
    } else {
      addProcessStep();
    }
  }

  function collectProcessSteps() {
    return Array.prototype.map.call(processStepsListNode.querySelectorAll('[data-step-card]'), function (card) {
      var requireSupply = card.querySelector('.step-require-supply').checked;
      var step = {
        name: card.querySelector('.step-name').value.trim(),
        activity_type: card.querySelector('.step-type').value,
        instruction: card.querySelector('.step-instruction').value.trim(),
        require_qr: card.querySelector('.step-require-qr').checked,
        require_supply: requireSupply,
        supply_id: requireSupply ? (card.querySelector('.step-supply-id').value || null) : null,
        require_image: card.querySelector('.step-require-image').checked,
        done: card.dataset.stepDone === 'true',
        completed_at: card.dataset.stepCompletedAt || null,
        log_id: card.dataset.stepLogId || null,
        batch_id: card.dataset.stepBatchId || null
      };
      // Chỉ gửi `id` cho bước ĐÃ có (đang sửa) — bước mới thêm trong modal
      // này chưa có dataset.stepId (xem processStepEditorCard()), bỏ trống
      // để backend tự cấp UUID thật thay vì gửi chuỗi rỗng không hợp lệ.
      if (card.dataset.stepId) step.id = card.dataset.stepId;
      return step;
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

    var submitButton = processStepForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    api.seasons.update(currentViewedSeason.id, { workflow_steps: collectProcessSteps() }).then(function (updated) {
      currentViewedSeason = updated;
      closeProcessStepModal();
      renderSeasonProcess();
      global.AgriChain.toast('Đã lưu quy trình.');
    }).catch(function (err) {
      global.AgriChain.toast(err.message);
    }).then(function () {
      submitButton.disabled = false;
    });
  }

  /* --- Khởi động ----------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    applyPermissionGates();
    fillCertStatuses();
    fillSeasonStatuses();
    fillActivityTypes();
    fillBatchUnits();
    fillBatchStatuses();
    loadSupplyOptions(); // dùng chung cho dropdown vật tư ở form nhật ký + form tuỳ biến bước quy trình

    var code = new URLSearchParams(global.location.search).get('ma') || '';
    loadFarmByCode(code);

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

    processRetryBtn.addEventListener('click', function () {
      if (retryStepId) completeWorkflowStep(retryStepId, retryLogId);
    });
  });
})(window);
