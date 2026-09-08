/* ==========================================================================
   AgriChain — Trang truy xuất nguồn gốc công khai (truy-xuat.html?ma=...)
   Đọc mã lô hàng từ query string (?ma=), tìm trong AgriChain.store rồi hiện
   thông tin lô hàng/nông trại/mùa vụ + trạng thái xác thực blockchain.
   Trang KHÔNG cần đăng nhập — dành cho người quét mã QR từ nong-trai-chi-tiet.js,
   nên không nạp js/app-shell.js (không có requireSession()). Nạp SAU
   js/api-config.js, js/api.js, js/chain.js và js/store.js.

   farms/seasons ĐÃ CHUYỂN SANG API — backend đã mở public-read riêng cho
   GET /farms/{id} và GET /seasons/{id} (không cần Authorization header,
   đúng cho trang công khai này, xem CLAUDE.md phía backend). Tra cứu qua
   getFarmSafe()/getSeasonSafe() bên dưới, cùng mẫu getFarmCached()/
   getSeasonCached() ở js/lo-hang.js — không cache ở đây vì trang chỉ tra
   đúng 1 lô hàng/1 lượt tải, không lặp lại nhiều lần như danh sách.
   `batches` và `certifications` VẪN ở store.js: backend chỉ mở công khai
   đúng 2 route farms/seasons kể trên, certifications vẫn yêu cầu đăng nhập
   nên trang khách không gọi được. VÁ PHẠM VI HẸP: chỉ đổi phần tra cứu
   farm/season, không đụng luồng batch/QR/xác thực blockchain/certifications.
   ========================================================================== */

(function (global) {
  'use strict';

  var api = global.AgriChain.api;
  var store = global.AgriChain.store;

  // Lỗi (VD nông trại/mùa vụ đã bị xoá) trả về null thay vì làm hỏng cả
  // trang — showBatch() đã có sẵn nhánh xử lý "farm/season null".
  function getFarmSafe(id) {
    if (!id) return Promise.resolve(null);
    return api.farms.get(id, { auth: false }).catch(function () { return null; });
  }

  function getSeasonSafe(id) {
    if (!id) return Promise.resolve(null);
    return api.seasons.get(id, { auth: false }).catch(function () { return null; });
  }

  // Nhãn tiếng Việt cho trạng thái lô hàng — trùng với BATCH_STATUSES trong
  // nong-trai-chi-tiet.js, nhưng khai báo lại riêng vì 2 trang độc lập với
  // nhau (trang này không nạp nong-trai-chi-tiet.js).
  var BATCH_STATUS_LABELS = {
    planning: 'Đang lập kế hoạch',
    planted: 'Đang xuống giống',
    growing: 'Đang canh tác',
    harvested: 'Đã thu hoạch',
    processed: 'Đã sơ chế',
    completed: 'Hoàn thành',
    failed: 'Thất bại'
  };

  var notFoundNode = document.querySelector('[data-not-found]');
  var detailNode = document.querySelector('[data-trace-detail]');

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function formatDate(value) {
    if (!value) return 'Chưa đặt';
    var parts = value.split('-');
    if (parts.length !== 3) return value;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
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

  function formatArea(value) {
    var num = Number(value);
    if (!num) return '0 ha';
    return num + ' ha';
  }

  function fillField(selector, value) {
    var node = document.querySelector(selector);
    if (node) node.textContent = value || '—';
  }

  function showNotFound(code) {
    notFoundNode.hidden = false;
    detailNode.hidden = true;
    notFoundNode.querySelector('[data-not-found-title]').textContent =
      'Không tìm thấy lô hàng có mã "' + code + '"';
  }

  function showBatch(batch) {
    notFoundNode.hidden = true;
    detailNode.hidden = false;

    fillField('[data-trace-code]', batch.code);
    fillField('[data-trace-start]', formatDate(batch.startDate));
    fillField('[data-trace-area]', formatArea(batch.area));
    fillField('[data-trace-harvest]', formatDate(batch.harvestDate));
    fillField('[data-trace-actual-harvest]', formatDate(batch.actualHarvestDate));
    fillField('[data-trace-yield]', (batch.expectedYield || 0) + ' ' + (batch.unit || ''));

    document.querySelector('[data-trace-status]').textContent =
      BATCH_STATUS_LABELS[batch.status] || batch.status || '—';

    var verifyNode = document.querySelector('[data-trace-verify]');
    var verifyTitle = document.querySelector('[data-trace-verify-title]');
    var verifyDesc = document.querySelector('[data-trace-verify-desc]');

    if (batch.sealed) {
      verifyNode.classList.add('trace-verify--ok');
      verifyTitle.textContent = 'Đã xác thực trên blockchain';
      verifyDesc.textContent = 'Mã băm: ' + global.AgriChain.chain.shorten(batch.hash, 10) +
        ' · Khối #' + batch.blockIndex + ' · Niêm phong lúc ' + formatDateTime(batch.sealedAt);
    } else {
      verifyNode.classList.add('trace-verify--pending');
      verifyTitle.textContent = 'Chưa xác thực trên blockchain';
      verifyDesc.textContent = 'Dữ liệu lô hàng này chưa được niêm phong lên sổ cái.';
    }

    Promise.all([getFarmSafe(batch.farmId), getSeasonSafe(batch.seasonId)])
      .then(function (results) {
        var farm = results[0];
        var season = results[1];

        if (farm) {
          fillField('[data-trace-farm-name]', farm.name);
          fillField('[data-trace-farm-code]', farm.code);
          fillField('[data-trace-farm-address]',
            [farm.address, farm.ward, farm.province].filter(Boolean).join(', '));

          var certsNode = document.querySelector('[data-trace-certs]');
          certsNode.textContent = '';
          store.list('certifications')
            .filter(function (item) { return item.farmId === farm.id; })
            .forEach(function (cert) {
              certsNode.appendChild(el('span', 'badge badge--success', cert.name));
            });
        }

        fillField('[data-trace-season]', season ? season.name + ' (' + season.code + ')' : '—');
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var code = new URLSearchParams(global.location.search).get('ma') || '';
    var batch = store.list('batches').find(function (item) {
      return item.code.toLowerCase() === code.trim().toLowerCase();
    });

    if (!batch) {
      showNotFound(code);
      return;
    }

    showBatch(batch);
  });
})(window);
