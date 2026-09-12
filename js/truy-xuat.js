/* ==========================================================================
   AgriChain — Trang truy xuất nguồn gốc công khai (truy-xuat.html?ma=...)
   Đọc mã lô hàng từ query string (?ma=), tra qua API rồi hiện thông tin lô
   hàng/nông trại/mùa vụ. Trang KHÔNG cần đăng nhập — dành cho người quét mã
   QR từ nong-trai-chi-tiet.js, nên không nạp js/app-shell.js (không có
   requireSession()). Nạp SAU js/api-config.js, js/api.js, js/chain.js và
   js/store.js.

   batches/farms/seasons ĐÃ CHUYỂN SANG API — backend mở public-read riêng
   cho GET /batches/by-code/{code}, GET /farms/{id} và GET /seasons/{id}
   (không cần Authorization header, đúng cho trang công khai này, xem
   CLAUDE.md phía backend). Đây chính là điểm đã sửa (trước đây đọc
   store.list('batches'), chỉ thấy đúng lô hàng do CHÍNH trình duyệt tạo ra
   — khách quét QR bằng máy khác luôn ra "không tìm thấy" dù dữ liệu đã có
   trong database).

   GET /batches (danh sách, có q=<mã>) yêu cầu đăng nhập — KHÔNG dùng được ở
   đây, khác mẫu loadFarmByCode() ở js/nong-trai-chi-tiet.js (trang ĐÃ đăng
   nhập). Vì vậy backend có riêng route công khai GET /batches/by-code/{code}
   tra CHÍNH XÁC theo mã (không phân biệt hoa/thường) — xem
   api.batches.getByCode() trong js/api.js.

   Tra cứu farm/season qua getFarmSafe()/getSeasonSafe() bên dưới, cùng mẫu
   getFarmCached()/getSeasonCached() ở js/lo-hang.js — không cache ở đây vì
   trang chỉ tra đúng 1 lô hàng/1 lượt tải, không lặp lại nhiều lần như danh
   sách. `certifications` VẪN đọc store.js: backend chỉ mở công khai đúng 3
   route batches/farms/seasons kể trên, certifications vẫn yêu cầu đăng nhập
   nên trang khách không gọi được — NGOÀI PHẠM VI lần sửa này.

   Khối "Xác thực blockchain" (trace-verify) đã TẠM ẨN (`hidden` trong HTML):
   response BatchOut thật của backend KHÔNG có field sealed/hash/blockIndex/
   sealedAt (đó là mô phỏng client-side cũ của js/chain.js + store.js), chỉ
   có verification_status (luôn 'pending' — anchoring blockchain thật CHƯA
   code)/tx_hash/anchored_at. Hiện lại khối này khi backend làm xong anchoring
   thật (xem agrichain-api/CLAUDE.md mục "Giai đoạn 3", mục 3).
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

  // Lỗi mạng/máy chủ (khác "không tìm thấy" — batch có thể vẫn tồn tại,
  // chỉ là chưa gọi được API) — dùng chung khối .empty-card nhưng đổi tiêu
  // đề để không đánh lừa người dùng rằng lô hàng không có thật.
  function showLoadError() {
    notFoundNode.hidden = false;
    detailNode.hidden = true;
    notFoundNode.querySelector('[data-not-found-title]').textContent =
      'Không thể tải thông tin lô hàng lúc này';
  }

  function showBatch(batch) {
    notFoundNode.hidden = true;
    detailNode.hidden = false;

    fillField('[data-trace-code]', batch.code);
    fillField('[data-trace-start]', formatDate(batch.start_date));
    fillField('[data-trace-area]', formatArea(batch.area));
    fillField('[data-trace-harvest]', formatDate(batch.harvest_date));
    fillField('[data-trace-actual-harvest]', formatDate(batch.actual_harvest_date));
    fillField('[data-trace-yield]', (batch.expected_yield || 0) + ' ' + (batch.unit || ''));

    document.querySelector('[data-trace-status]').textContent =
      BATCH_STATUS_LABELS[batch.status] || batch.status || '—';

    // Khối "Xác thực blockchain" (.trace-verify) TẠM ẨN — xem ghi chú đầu
    // file: backend chưa có sealed/hash/blockIndex/sealedAt, không có gì
    // thật để hiện.

    Promise.all([getFarmSafe(batch.farm_id), getSeasonSafe(batch.season_id)])
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
    var code = (new URLSearchParams(global.location.search).get('ma') || '').trim();

    if (!code) {
      showNotFound(code);
      return;
    }

    // { auth: false } — trang công khai, không gắn Authorization header dù
    // trình duyệt đang có sẵn token (VD người quản trị tự quét QR bằng máy
    // đã đăng nhập), cùng lý do với getFarmSafe()/getSeasonSafe() ở trên.
    api.batches.getByCode(code, { auth: false }).then(showBatch).catch(function (err) {
      if (err && err.status === 404) {
        showNotFound(code);
      } else {
        showLoadError();
      }
    });
  });
})(window);
