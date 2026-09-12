/* ==========================================================================
   AgriChain — Trang Quản lý Lô hàng (lo-hang.html)
   Liệt kê lô hàng của mọi nông trại/mùa vụ, lọc theo Nông trại/Mùa vụ (2
   select phụ thuộc nhau, xem js/location-select.js). Trang này CHỈ xem +
   lọc + truy xuất QR — thêm/sửa/xoá lô hàng vẫn làm ở tab "Lô hàng" trong
   modal xem chi tiết mùa vụ (nong-trai-chi-tiet.html), nút sửa/xoá ở đây
   chỉ điều hướng về đúng chỗ đó.

   ĐÃ CHUYỂN SANG BACKEND THẬT (2026-09-12) qua api.batches.list() — lọc
   farm_id/season_id ngay ở server (không tự lọc lại ở client như hồi còn
   store.js). farm_code/farm_name/season_code/season_name đọc THẲNG từ
   BatchOut (join sẵn ở backend) — không còn gọi riêng
   api.farms.get()/api.seasons.get() cho từng lô hàng như trước (batch nào
   cũng có sẵn 2 cặp field này, không còn khái niệm "lô hàng mồ côi": season
   còn batch sống thì backend chặn xoá season, xem batch_repo.count_by_season()
   phía agrichain-api — batch hiện trong danh sách LUÔN có farm/season còn
   tồn tại).

   Khối "Xác thực blockchain" (nút niêm phong + hiển thị hash/khối) đã BỎ
   HẲN — cùng lý do với nong-trai-chi-tiet.js: backend batches không có
   sealed/hash/blockIndex, chỉ có verification_status luôn 'pending' (chưa
   anchoring thật), hiện ra sẽ sai lệch so với dữ liệu cũ đã niêm phong bằng
   cơ chế mô phỏng, tệ hơn là ẩn hẳn. File này không còn gọi js/chain.js hay
   js/store.js ở đâu nữa — 2 thẻ <script> đó vẫn còn nạp trong lo-hang.html
   (cùng cách xử lý các trang khác đã hết phụ thuộc trong dự án — để lại cho
   một đợt dọn dẹp sau, ngoài phạm vi lần sửa này).

   Nạp SAU js/api-config.js, js/api.js, js/app-shell.js và
   js/location-select.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var api = global.AgriChain.api;

  // platform_admin (2026-09-13, xem CLAUDE.md mục "Quản trị hệ thống
  // (platform_admin)") dùng CHUNG trang này với business — chỉ khác nguồn
  // dữ liệu (api.system.batches.list() thay vì api.batches.list(), nhìn
  // xuyên MỌI Đơn vị kèm organization_name) và ẩn hết thao tác ghi. Bộ lọc
  // Nông trại/Mùa vụ CŨNG ẩn ở chế độ này — api.system.batches.list() không
  // hỗ trợ lọc farm_id/season_id (xác nhận qua router thật, chỉ page/
  // page_size), và tự lọc theo Nông trại lại cần gọi api.farms.list()/
  // api.seasons.list() thường (yêu cầu permission platform_admin không có,
  // sẽ 403) nên không tận dụng lại được cơ chế cascading sẵn có.
  var isPlatformAdminMode = api.isPlatformAdmin();

  var BATCH_STATUSES = [
    { key: 'planning',   label: 'Đang lập kế hoạch', badge: 'badge--neutral' },
    { key: 'planted',    label: 'Đang xuống giống',  badge: 'badge--info' },
    { key: 'growing',    label: 'Đang canh tác',     badge: 'badge--info' },
    { key: 'harvested',  label: 'Đã thu hoạch',      badge: 'badge--warning' },
    { key: 'processed',  label: 'Đã sơ chế',         badge: 'badge--warning' },
    { key: 'completed',  label: 'Hoàn thành',        badge: 'badge--success' },
    { key: 'failed',     label: 'Thất bại',          badge: 'badge--danger' }
  ];

  function statusOf(list, key) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].key === key) return list[i];
    }
    return list[0];
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

  var farmFilterSelect = document.getElementById('filter-farm');
  var seasonFilterSelect = document.getElementById('filter-season');
  var batchListNode = document.querySelector('[data-batch-list]');
  var batchEmptyNode = document.querySelector('[data-batch-empty]');
  var batchCountNode = document.querySelector('[data-batch-count]');

  function fillFarmFilter() {
    api.farms.list({ page_size: 100 }).then(function (data) {
      (data.items || []).forEach(function (farm) {
        var option = el('option', null, farm.code + ' — ' + farm.name);
        option.value = farm.id;
        farmFilterSelect.appendChild(option);
      });
    }).catch(function (err) {
      global.AgriChain.toast('Không tải được danh sách nông trại: ' + err.message);
    });
  }

  /* --- Bộ lọc liên động: chọn Nông trại thì Mùa vụ chỉ còn mùa vụ của đúng
     nông trại đó. Rỗng ("Tất cả") cũng phải tải được — allowEmptyParent —
     vì "chưa chọn nông trại" ở đây nghĩa là "mọi nông trại", không phải
     "chưa sẵn sàng" như trường hợp tỉnh/phường. loadChildren() hỗ trợ trả
     Promise sẵn (xem js/location-select.js), nên chuyển sang API chỉ cần
     đổi nguồn dữ liệu, không đụng cơ chế cascading. */
  var seasonCascade = global.AgriChain.setupCascadingSelect({
    parentSelect: farmFilterSelect,
    childSelect: seasonFilterSelect,
    allowEmptyParent: true,
    loadChildren: function () {
      var farmId = farmFilterSelect.value;
      return api.seasons.list({ farm_id: farmId || undefined, page_size: 100 }).then(function (data) {
        return data.items || [];
      });
    },
    getOptionValue: function (season) { return season.id; },
    getOptionLabel: function (season) { return season.code + ' — ' + season.name; },
    placeholderEmpty: 'Tất cả',
    onChange: render
  });

  /* --- Danh sách lô hàng đã lọc ---------------------------------------------
     Component .batch-card dùng chung với tab "Lô hàng" ở
     nong-trai-chi-tiet.html (xem css/components.css) — markup phải khớp y
     hệt, chỉ khác nút sửa/xoá: ở đây điều hướng về đúng mùa vụ đó thay vì mở
     modal (trang này không có form thêm/sửa lô hàng). */
  function filteredBatches() {
    if (isPlatformAdminMode) {
      // Không lọc farm_id/season_id được — bộ lọc đã ẩn hẳn ở chế độ này.
      return api.system.batches.list({ page_size: 100 }).then(function (data) { return data.items || []; });
    }
    var farmId = farmFilterSelect.value;
    var seasonId = seasonFilterSelect.value;
    return api.batches.list({
      farm_id: farmId || undefined,
      season_id: seasonId || undefined,
      page_size: 100
    }).then(function (data) { return data.items || []; });
  }

  function editUrl(batch) {
    return 'nong-trai-chi-tiet.html?ma=' + encodeURIComponent(batch.farm_code) +
      '&season=' + encodeURIComponent(batch.season_code) + '#lo-hang';
  }

  function batchCard(batch) {
    var status = statusOf(BATCH_STATUSES, batch.status);
    var card = el('article', 'card batch-card');

    var header = el('div', 'batch-card__header');
    header.appendChild(el('h2', 'batch-card__code', batch.code));
    header.appendChild(el('span', 'badge ' + status.badge, status.label));
    card.appendChild(header);

    var rows = el('div', 'batch-card__rows');

    // "Đơn vị sở hữu" (organization_name) CHỈ hiện với platform_admin — field
    // PHẲNG riêng của api.system.batches.list(), không có ở api.batches.list()
    // thường (business chỉ thấy đúng 1 Đơn vị của chính mình).
    if (isPlatformAdminMode) {
      var orgRow = el('div', 'batch-card__row');
      orgRow.appendChild(el('span', 'batch-card__row-label', 'Đơn vị sở hữu'));
      orgRow.appendChild(el('span', null, batch.organization_name || '—'));
      rows.appendChild(orgRow);
    }

    var rowDefs = [
      ['Diện tích', formatArea(batch.area)],
      ['Ngày bắt đầu', formatDate(batch.start_date)],
      ['Ngày thu hoạch', formatDate(batch.harvest_date)],
      ['Ngày thu hoạch thực tế', formatDate(batch.actual_harvest_date)]
    ];
    rowDefs.forEach(function (pair) {
      var row = el('div', 'batch-card__row');
      row.appendChild(el('span', 'batch-card__row-label', pair[0]));
      row.appendChild(el('span', null, pair[1]));
      rows.appendChild(row);
    });
    card.appendChild(rows);

    var yieldBox = el('div', 'batch-card__yield');
    yieldBox.appendChild(el('strong', 'batch-card__yield-value',
      (batch.expected_yield || 0) + ' ' + (batch.unit || '')));
    yieldBox.appendChild(el('span', 'batch-card__yield-label', 'Sản lượng dự kiến'));
    card.appendChild(yieldBox);

    if (batch.note) {
      var noteBox = el('div', 'batch-card__note');
      noteBox.appendChild(el('span', 'batch-card__note-label', 'Ghi chú'));
      noteBox.appendChild(el('span', null, batch.note));
      card.appendChild(noteBox);
    }

    // Khối "Xác thực blockchain" đã BỎ HẲN — xem ghi chú đầu file.
    var actions = el('div', 'batch-card__actions');

    var qrButton = el('button', 'icon-btn');
    qrButton.type = 'button';
    qrButton.setAttribute('aria-label', 'Truy xuất nguồn gốc lô hàng ' + batch.code);
    qrButton.setAttribute('data-tooltip', 'Truy xuất nguồn gốc');
    qrButton.appendChild(svgIcon('icon-qr-code'));
    qrButton.addEventListener('click', function () { openQrModal(batch); });
    actions.appendChild(qrButton);

    // farm_code/season_code LUÔN có (BatchOut không cho null) — season còn
    // batch sống thì backend chặn xoá, nên không còn ca "mồ côi" phải xử lý
    // riêng như hồi còn store.js (xem ghi chú đầu file).
    // platform_admin (2026-09-13): ẩn hẳn — KHÔNG chỉ vì read-only, mà vì
    // đích đến (nong-trai-chi-tiet.html) KHÔNG được chuyển đổi ở lần này,
    // gọi api.farms.*/api.seasons.* thường (yêu cầu permission platform_admin
    // không có) sẽ 403 ngay khi mở.
    if (!isPlatformAdminMode) {
      var url = editUrl(batch);
      var edit = el('a', 'icon-btn batch-card__action--edit');
      edit.href = url;
      edit.setAttribute('aria-label', 'Sửa lô hàng ' + batch.code);
      edit.setAttribute('data-tooltip', 'Chỉnh sửa');
      edit.appendChild(svgIcon('icon-pencil'));
      actions.appendChild(edit);

      var del = el('a', 'icon-btn batch-card__action--delete');
      del.href = url;
      del.setAttribute('aria-label', 'Xoá lô hàng ' + batch.code);
      del.setAttribute('data-tooltip', 'Xoá (mở trang mùa vụ)');
      del.appendChild(svgIcon('icon-trash'));
      actions.appendChild(del);
    }

    card.appendChild(actions);

    return card;
  }

  function render() {
    filteredBatches().then(function (batches) {
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
    }).catch(function (err) {
      global.AgriChain.toast('Không tải được danh sách lô hàng: ' + err.message);
    });
  }

  /* --- Truy xuất nguồn gốc (QR) ---------------------------------------------
     Giống hệt openQrModal() ở nong-trai-chi-tiet.js. */
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

  document.addEventListener('DOMContentLoaded', function () {
    if (isPlatformAdminMode) {
      // Bộ lọc Nông trại/Mùa vụ không dùng được ở chế độ này (xem ghi chú
      // đầu file) — ẩn hẳn khối "Bộ lọc" thay vì để 2 select trống trơn/gọi
      // api.farms.list() rồi 403.
      var filterCard = document.querySelector('.filter-card');
      if (filterCard) filterCard.hidden = true;
    } else {
      fillFarmFilter();
      // Điền sẵn select Mùa vụ với TẤT CẢ mùa vụ (allowEmptyParent) — không
      // có dòng này thì nó chỉ có mỗi option "Tất cả" tĩnh trong HTML, đứng
      // im cho tới khi người dùng đụng vào select Nông trại.
      seasonCascade.refresh();
      seasonFilterSelect.addEventListener('change', render);
    }

    render();

    document.querySelectorAll('[data-close-qr]').forEach(function (button) {
      button.addEventListener('click', closeQrModal);
    });
  });
})(window);
