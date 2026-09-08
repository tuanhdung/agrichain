/* ==========================================================================
   AgriChain — Trang Quản lý Lô hàng (lo-hang.html)
   Liệt kê TẤT CẢ lô hàng của mọi nông trại/mùa vụ, lọc theo Nông trại/Mùa
   vụ (2 select phụ thuộc nhau, xem js/location-select.js). Trang này CHỈ
   xem + lọc + truy xuất QR + xác thực blockchain — thêm/sửa/xoá lô hàng vẫn
   làm ở tab "Lô hàng" trong modal xem chi tiết mùa vụ
   (nong-trai-chi-tiet.html), nút sửa/xoá ở đây chỉ điều hướng về đúng chỗ
   đó. `batches` VẪN ở store.js (giai đoạn 3, không đổi trong lần vá này).

   farms/seasons ĐÃ CHUYỂN SANG API (nong-trai.js/nong-trai-chi-tiet.js
   không còn ghi vào store.js nữa) — mọi chỗ tra cứu tên nông trại/mùa vụ
   cho batch hoặc điền bộ lọc đều phải qua api.farms.get()/api.seasons.get(), xem
   getFarmCached()/getSeasonCached() bên dưới. VÁ PHẠM VI HẸP: chỉ đổi phần
   tra cứu farms/seasons, không đụng luồng batches/QR/xác thực blockchain.

   Nạp SAU js/api-config.js, js/api.js, js/store.js, js/app-shell.js và
   js/location-select.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var api = global.AgriChain.api;
  var store = global.AgriChain.store;

  // Cache theo id — nhiều lô hàng thường trỏ tới CÙNG 1 nông trại/mùa vụ,
  // tránh gọi lại api.farms.get()/api.seasons.get() nhiều lần cho cùng 1 id
  // trong cùng 1 lượt render(). Lỗi (VD đã bị xoá) trả về null thay vì làm
  // hỏng cả danh sách — batchCard() đã có sẵn nhánh xử lý "farm/season null"
  // (lô hàng mồ côi).
  var farmCache = {};
  function getFarmCached(id) {
    if (!id) return Promise.resolve(null);
    if (!farmCache[id]) {
      farmCache[id] = api.farms.get(id).catch(function () { return null; });
    }
    return farmCache[id];
  }

  var seasonCache = {};
  function getSeasonCached(id) {
    if (!id) return Promise.resolve(null);
    if (!seasonCache[id]) {
      seasonCache[id] = api.seasons.get(id).catch(function () { return null; });
    }
    return seasonCache[id];
  }

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
    var farmId = farmFilterSelect.value;
    var seasonId = seasonFilterSelect.value;
    return store.list('batches').filter(function (batch) {
      if (farmId && batch.farmId !== farmId) return false;
      if (seasonId && batch.seasonId !== seasonId) return false;
      return true;
    });
  }

  function editUrl(farm, season) {
    if (!farm || !season) return null;
    return 'nong-trai-chi-tiet.html?ma=' + encodeURIComponent(farm.code) +
      '&season=' + encodeURIComponent(season.code) + '#lo-hang';
  }

  // farm/season: đã resolve sẵn qua getFarmCached()/getSeasonCached() TRƯỚC
  // khi gọi hàm này (xem render()) — batchCard() không tự gọi API, chỉ vẽ.
  function batchCard(batch, farm, season) {
    var status = statusOf(BATCH_STATUSES, batch.status);
    var card = el('article', 'card batch-card');

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

      var url = editUrl(farm, season);
      if (url) {
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
      } else {
        // Nông trại hoặc mùa vụ của lô hàng này đã bị xoá — không còn trang
        // nào để điều hướng tới (không sửa được nữa), nhưng vẫn phải xoá
        // được để dọn rác dữ liệu mồ côi, nên xoá thẳng tại đây thay vì
        // điều hướng đi đâu cả.
        var orphanDelete = el('button', 'icon-btn batch-card__action--delete');
        orphanDelete.type = 'button';
        orphanDelete.setAttribute('aria-label', 'Xoá lô hàng ' + batch.code);
        orphanDelete.setAttribute('data-tooltip', 'Xoá (nông trại/mùa vụ đã bị xoá)');
        orphanDelete.appendChild(svgIcon('icon-trash'));
        orphanDelete.addEventListener('click', function () { deleteOrphanBatch(batch); });
        actions.appendChild(orphanDelete);
      }
    }

    card.appendChild(actions);

    return card;
  }

  function render() {
    var batches = filteredBatches();
    batchCountNode.textContent = batches.length;

    batchListNode.textContent = '';
    if (!batches.length) {
      batchListNode.hidden = true;
      batchEmptyNode.hidden = false;
      return;
    }

    // Resolve TRƯỚC farm/season của từng lô hàng (qua cache, xem
    // getFarmCached()/getSeasonCached()) rồi mới vẽ 1 lượt — tránh vẽ
    // xong rồi phải quay lại sửa link sửa/xoá khi promise trả về sau.
    Promise.all(batches.map(function (batch) {
      return Promise.all([getFarmCached(batch.farmId), getSeasonCached(batch.seasonId)])
        .then(function (results) {
          return { batch: batch, farm: results[0], season: results[1] };
        });
    })).then(function (rows) {
      batchEmptyNode.hidden = true;
      batchListNode.hidden = false;
      rows.forEach(function (row) {
        batchListNode.appendChild(batchCard(row.batch, row.farm, row.season));
      });
    });
  }

  function deleteOrphanBatch(batch) {
    global.AgriChain.confirm(
      'Nông trại/mùa vụ của lô hàng "' + batch.code + '" không còn tồn tại. ' +
      'Xoá lô hàng mồ côi này? Hành động này không thể hoàn tác.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      store.remove('batches', batch.id);
      render();
      global.AgriChain.toast('Đã xoá lô hàng.');
    });
  }

  /* --- Xác thực blockchain --------------------------------------------------
     Giống hệt sealBatchRecord() ở nong-trai-chi-tiet.js — 2 trang không nạp
     chéo JS của nhau nên khai báo lại. */
  function sealBatchRecord(batch) {
    global.AgriChain.confirm(
      'Xác thực dữ liệu lô hàng "' + batch.code + '" lên blockchain? ' +
      'Sau khi xác thực, lô hàng này sẽ không thể sửa hoặc xoá nữa.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      store.sealBatch(batch.id).then(function () {
        render();
        global.AgriChain.toast('Đã xác thực lô hàng lên blockchain.');
      }).catch(function (err) {
        global.AgriChain.toast(err.message || 'Không xác thực được — thử lại sau.');
      });
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
    fillFarmFilter();
    render();
    // Điền sẵn select Mùa vụ với TẤT CẢ mùa vụ (allowEmptyParent) — không có
    // dòng này thì nó chỉ có mỗi option "Tất cả" tĩnh trong HTML, đứng im
    // cho tới khi người dùng đụng vào select Nông trại.
    seasonCascade.refresh();

    seasonFilterSelect.addEventListener('change', render);

    document.querySelectorAll('[data-close-qr]').forEach(function (button) {
      button.addEventListener('click', closeQrModal);
    });
  });
})(window);
