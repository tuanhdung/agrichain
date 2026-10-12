/* ==========================================================================
   AgriChain — Trang truy xuất nguồn gốc công khai (truy-xuat.html?ma=...)
   Đọc mã lô hàng từ query string (?ma=, GIỮ NGUYÊN tên tham số dùng thống
   nhất cho mọi trang "chi tiết 1 bản ghi" trong dự án — xem CLAUDE.md gốc,
   quy ước "trang chi tiết dùng query string"; KHÔNG đổi sang ?code= dù bản
   mô tả thiết kế ban đầu có nhắc tới, xem PUBLIC-BATCH-SCHEMA.md mục "Sai
   khác so với mô tả thiết kế ban đầu"). Trang KHÔNG cần đăng nhập.

   GIAI ĐOẠN B (route backend GET /batches/by-code/{code}/public) ĐÃ XONG
   (xác nhận qua agrichain-api/app/routers/batches.py + schemas/public_batch.py
   — khuôn PublicBatchTraceabilityOut khớp đúng PUBLIC-BATCH-SCHEMA.md và
   đúng những gì showBatch() bên dưới cần) — trang này ĐÃ ĐỔI sang gọi API
   thật. Route chỉ trả 200 cho lô hàng ở trạng thái harvested/processed/
   completed (BatchStatus khác → 404 "Không tìm thấy", không tiết lộ lô hàng
   đó tồn tại — quyết định đã chốt phía backend), nên quét QR/mở link 1 lô
   hàng đang planning/planted/growing sẽ ra "Không tìm thấy lô hàng" dù lô đó
   có thật — ĐÚNG Ý ĐỒ, không phải lỗi.

   data/public-batch-mock.json vẫn giữ lại (KHÔNG xoá) — hữu ích để demo/dev
   giao diện khi backend chưa chạy. Cờ bật/tắt (AgriChain.USE_MOCK_TRACE_DATA)
   nằm ở js/api-config.js — CHỈ sửa ở ĐÓ khi cần demo, KHÔNG hard-code trực
   tiếp trong file này, cùng nguyên tắc "1 nơi cấu hình duy nhất" đã áp dụng
   cho AgriChain.API_BASE_URL trong chính file đó.
   ========================================================================== */

(function (global) {
  'use strict';

  // Đọc từ js/api-config.js (nạp TRƯỚC file này, xem thẻ <script> trong
  // truy-xuat.html) — KHÔNG hard-code true/false thẳng ở đây. `!!` ép về
  // boolean thật, phòng trường hợp js/api-config.js lỡ chưa nạp kịp (cờ
  // undefined -> coi như false, ưu tiên gọi API thật hơn là âm thầm hiện dữ
  // liệu giả).
  var USE_MOCK_DATA = !!(global.AgriChain && global.AgriChain.USE_MOCK_TRACE_DATA);

  var ACTIVITY_TYPES = global.AgriChain.ACTIVITY_TYPES || [];

  function activityTypeOf(key) {
    return (
      ACTIVITY_TYPES.filter(function (item) { return item.key === key; })[0] ||
      { label: key, icon: 'icon-box', color: 'neutral' }
    );
  }

  var loadingNode = document.querySelector('[data-loading]');
  var notFoundNode = document.querySelector('[data-not-found]');
  var detailNode = document.querySelector('[data-trace-detail]');

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function fillField(selector, value) {
    var node = document.querySelector(selector);
    if (node) node.textContent = value || '—';
  }

  function formatDate(value) {
    if (!value) return 'Chưa đặt';
    var datePart = String(value).split('T')[0];
    var parts = datePart.split('-');
    if (parts.length !== 3) return value;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  // Rút gọn chuỗi dài (địa chỉ ví/hash) kiểu "0x1a2b...f8e9" — dùng cho các ô
  // trong card VERIFIED, giữ đủ ký tự đầu/cuối để còn nhận diện được bằng mắt.
  function shorten(value, headLength) {
    if (!value) return '—';
    headLength = headLength || 10;
    if (value.length <= headLength * 2 + 3) return value;
    return value.slice(0, headLength) + '…' + value.slice(-6);
  }

  function showLoading() {
    loadingNode.hidden = false;
    notFoundNode.hidden = true;
    detailNode.hidden = true;
  }

  function showNotFound(code) {
    loadingNode.hidden = true;
    notFoundNode.hidden = false;
    detailNode.hidden = true;
    // Thiếu hẳn ?ma= trên URL (code rỗng) là 1 tình huống KHÁC "có mã nhưng
    // không tìm thấy" — thông báo cũ ghép chuỗi vô điều kiện từng hiện
    // 'Không tìm thấy lô hàng có mã ""' (cặp ngoặc kép rỗng) cho ca này, dễ
    // gây hiểu lầm là đã tra cứu 1 mã rỗng thay vì báo đúng lý do "thiếu mã".
    notFoundNode.querySelector('[data-not-found-title]').textContent = code
      ? 'Không tìm thấy lô hàng có mã "' + code + '"'
      : 'Thiếu mã lô hàng trên đường dẫn';
    // Điền sẵn mã cũ vào ô tra cứu (nếu có) — tiện sửa lại đúng mã thay vì
    // phải gõ lại từ đầu, VD gõ nhầm 1 ký tự trong link/QR.
    var lookupInput = document.querySelector('[data-lookup-input]');
    if (lookupInput) lookupInput.value = code || '';
  }

  function showLoadError() {
    loadingNode.hidden = true;
    notFoundNode.hidden = false;
    detailNode.hidden = true;
    notFoundNode.querySelector('[data-not-found-title]').textContent =
      'Không thể tải thông tin lô hàng lúc này';
  }

  /* --- Lấy dữ liệu: mock (fetch file JSON tĩnh) hoặc API thật --------------
     Cùng 1 khuôn response ở cả 2 nhánh (xem PUBLIC-BATCH-SCHEMA.md) nên phần
     render() bên dưới không cần biết nguồn dữ liệu tới từ đâu. */
  function fetchPublicBatch(code) {
    if (USE_MOCK_DATA) {
      // Bỏ qua "code" thật — file mock chỉ có đúng 1 lô hàng mẫu, dùng để
      // demo giao diện. Vẫn kiểm tra khớp mã trên URL để không lừa dối
      // người dùng rằng bất kỳ mã nào cũng "tìm thấy".
      return fetch('data/public-batch-mock.json').then(function (response) {
        if (!response.ok) throw new Error('Không tải được data/public-batch-mock.json');
        return response.json();
      });
    }

    // Route thật CHƯA implement (xem ghi chú đầu file) — giữ sẵn đúng URL
    // theo khuôn public-read đã có (api.js's API_BASE_URL, KHÔNG gắn
    // Authorization header vì đây là trang công khai).
    var url = global.AgriChain.API_BASE_URL + '/batches/by-code/' + encodeURIComponent(code) + '/public';
    return fetch(url).then(function (response) {
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Lỗi tải dữ liệu công khai lô hàng.');
      return response.json();
    });
  }

  /* --- Dựng từng phần giao diện -------------------------------------------- */

  function renderProducer(organization) {
    var name = (organization && organization.name) || 'AgriChain';
    var initials = name
      .trim()
      .split(/\s+/)
      .map(function (word) { return word.charAt(0); })
      .slice(-2)
      .join('')
      .toUpperCase();

    // Logo thật (organization.logo_url) khi Đơn vị đã tải lên — chỉ rơi về
    // chữ cái viết tắt khi CHƯA có logo hoặc ảnh lỗi (onerror, VD URL cũ đã
    // gỡ) — không để ảnh vỡ hiện ra giữa trang.
    var logoNode = document.querySelector('[data-org-logo]');
    var initialsNode = document.querySelector('[data-org-initials]');
    if (organization && organization.logo_url) {
      logoNode.src = organization.logo_url;
      logoNode.alt = name;
      logoNode.hidden = false;
      initialsNode.hidden = true;
      logoNode.onerror = function () {
        logoNode.hidden = true;
        initialsNode.hidden = false;
      };
    } else {
      logoNode.hidden = true;
      initialsNode.hidden = false;
    }
    initialsNode.textContent = initials || 'A';

    fillField('[data-org-name]', name);

    var taglineNode = document.querySelector('[data-org-tagline]');
    if (organization && organization.tagline) {
      taglineNode.textContent = organization.tagline;
      taglineNode.hidden = false;
    } else {
      taglineNode.hidden = true;
    }
  }

  function renderSeason(season, batch) {
    fillField('[data-season-name]', season ? season.name + ' (' + season.code + ')' : '—');
    fillField('[data-season-start]', season ? formatDate(season.start_date) : '—');
    fillField('[data-season-end]', season ? formatDate(season.end_date) : '—');
    fillField('[data-batch-yield]', (batch.expected_yield || 0).toLocaleString('vi-VN') + ' ' + (batch.unit || ''));
  }

  function renderFarm(farm) {
    if (!farm) return;
    fillField('[data-farm-name]', farm.name);
    fillField(
      '[data-farm-address]',
      [farm.address, farm.ward, farm.province].filter(Boolean).join(', ')
    );

    var pucNode = document.querySelector('[data-farm-puc]');
    if (farm.national_puc) {
      pucNode.textContent = 'Mã vùng trồng: ' + farm.national_puc;
      pucNode.hidden = false;
    } else {
      pucNode.hidden = true;
    }

    renderFarmMap(farm);
  }

  /* --- Bản đồ ranh giới thửa đất (Leaflet, chỉ xem — không cho click để vẽ
     như form Thêm nông trại) --------------------------------------------
     Cùng công thức showFarmOnMap() từng có ở js/nong-trai-chi-tiet.js (đã
     mồ côi khỏi HTML, trang đó đã chuyển sang SPA) — dùng lại
     AgriChain.addMapBaseLayers() (js/map-layers.js) cho 3 lớp nền vệ tinh/
     địa hình/mặc định. Khác 1 điểm: tắt scrollWheelZoom — trang này là 1
     trang cuộn dài, để mặc định (cuộn chuột trên bản đồ = zoom) sẽ khiến
     người dùng bị "kẹt" zoom bản đồ giữa chừng khi lướt qua, một lỗi UX quen
     thuộc với bản đồ nhúng trong trang nội dung dài — form vẽ ranh giới ở
     admin không gặp vấn đề này vì luôn nằm trong modal/khung cố định, không
     phải 1 trang cuộn dài. */
  function renderFarmMap(farm) {
    var canvasNode = document.querySelector('[data-farm-map-canvas]');
    var placeholderNode = document.querySelector('[data-farm-map]');
    var polygon = (farm && farm.polygon) || [];

    if (typeof L === 'undefined' || polygon.length < 3) {
      // Không đủ dữ liệu ranh giới (hoặc Leaflet lỡ tải lỗi, VD mất mạng
      // ngoài CDN) — giữ nguyên placeholder, chỉ đổi lại chữ cho đúng thực
      // trạng (bản đồ ĐÃ tích hợp xong, chỉ là nông trại này chưa có toạ độ).
      var noteNode = document.querySelector('[data-farm-map-note]');
      if (noteNode) {
        noteNode.textContent = 'Nông trại này chưa có dữ liệu ranh giới thửa đất.';
      }
      return;
    }

    canvasNode.hidden = false;
    placeholderNode.hidden = true;

    var latlngs = polygon.map(function (p) { return [p.lat, p.lng]; });
    var map = L.map(canvasNode, { center: latlngs[0], zoom: 15, scrollWheelZoom: false });
    global.AgriChain.addMapBaseLayers(map);
    L.polygon(latlngs, {
      color: '#1F8F58', weight: 3, fillColor: '#2EA86B', fillOpacity: 0.25
    }).addTo(map);
    map.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24] });

    // Khung bản đồ chỉ có kích thước thật sau khi trình duyệt vẽ xong khối
    // cha (vừa được bỏ [hidden] trên [data-trace-detail]) — đợi 1 khung
    // hình rồi đo lại, cùng kỹ thuật đã dùng ở js/nong-trai-chi-tiet.js cũ.
    global.requestAnimationFrame(function () {
      map.invalidateSize();
    });
  }

  function renderCertifications(certifications) {
    var node = document.querySelector('[data-farm-certs]');
    node.textContent = '';
    (certifications || []).forEach(function (cert) {
      node.appendChild(el('span', 'badge badge--success', cert.name));
    });

    // Nhãn "Chứng nhận" chỉ hiện khi CÓ ít nhất 1 chứng nhận active — ẩn hẳn
    // (thay vì hiện nhãn trơ trên 1 khu vực trống) khi nông trại chưa có
    // chứng nhận nào, cùng cách xử lý field-tuỳ-chọn khác trên trang (VD
    // data-farm-puc).
    var labelNode = document.querySelector('[data-farm-certs-label]');
    if (labelNode) labelNode.hidden = !certifications || certifications.length === 0;
  }

  function renderBatchId(batch) {
    fillField('[data-batch-code]', batch.code);
    fillField('[data-batch-harvest]', formatDate(batch.actual_harvest_date || batch.harvest_date));

    var statusNode = document.querySelector('[data-batch-status]');
    statusNode.textContent = BATCH_STATUS_LABELS[batch.status] || batch.status || '—';
    // Đổi màu badge theo ý nghĩa trạng thái thay vì luôn xám (--neutral) —
    // route công khai này chỉ trả 3 trạng thái harvested/processed/completed
    // (xem _PUBLIC_TRACEABLE_STATUSES phía backend, mọi trạng thái khác 404
    // trước khi tới được đây), nhưng vẫn khai báo đủ cả bảng cho rõ ràng nếu
    // sau này route nới lỏng điều kiện.
    statusNode.className = 'badge ' + (BATCH_STATUS_BADGES[batch.status] || 'badge--neutral');
  }

  var BATCH_STATUS_LABELS = {
    planning: 'Đang lập kế hoạch',
    planted: 'Đang xuống giống',
    growing: 'Đang canh tác',
    harvested: 'Đã thu hoạch',
    processed: 'Đã sơ chế',
    completed: 'Hoàn thành',
    failed: 'Thất bại'
  };

  var BATCH_STATUS_BADGES = {
    planning: 'badge--neutral',
    planted: 'badge--neutral',
    growing: 'badge--info',
    harvested: 'badge--success',
    processed: 'badge--info',
    completed: 'badge--success',
    failed: 'badge--danger'
  };

  function renderVerification(batch) {
    var verifiedNode = document.querySelector('[data-verified]');
    var pendingNode = document.querySelector('[data-pending]');

    if (batch.verification_status !== 'anchored') {
      verifiedNode.hidden = true;
      pendingNode.hidden = false;
      return;
    }

    pendingNode.hidden = true;
    verifiedNode.hidden = false;

    fillField('[data-verified-network]', batch.network);
    fillField('[data-verified-block]', batch.block_number ? '#' + batch.block_number.toLocaleString('vi-VN') : '—');
    fillField('[data-verified-contract]', shorten(batch.contract_address));
    fillField('[data-verified-tx]', shorten(batch.tx_hash));
    fillField('[data-verified-signer]', shorten(batch.signer_address));
    fillField('[data-verified-datahash]', shorten(batch.data_hash));

    var explorerLink = document.querySelector('[data-verified-explorer]');
    if (batch.explorer_url) {
      explorerLink.href = batch.explorer_url;
      explorerLink.hidden = false;
    } else {
      explorerLink.hidden = true;
    }
  }

  function renderTimeline(logs) {
    var node = document.querySelector('[data-timeline]');
    node.textContent = '';

    (logs || []).forEach(function (log) {
      var type = activityTypeOf(log.activity_type);

      var item = el('div', 'qr-timeline__item');

      var icon = el('div', 'qr-timeline__icon qr-timeline__icon--' + type.color);
      var iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      iconSvg.setAttribute('class', 'icon icon--sm');
      var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'icons/sprite.svg#' + type.icon);
      use.setAttribute('href', 'icons/sprite.svg#' + type.icon);
      iconSvg.appendChild(use);
      icon.appendChild(iconSvg);
      item.appendChild(icon);

      var card = el('div', 'card');

      var head = el('div', 'qr-timeline__head');
      head.appendChild(el('span', 'qr-timeline__type', type.label));
      head.appendChild(el('span', 'qr-timeline__date', formatDate(log.performed_at)));
      card.appendChild(head);

      var meta = el('div', 'qr-timeline__meta');
      var byWrap = el('span');
      byWrap.textContent = 'Thực hiện bởi: ';
      byWrap.appendChild(el('strong', null, log.performed_by || '—'));
      meta.appendChild(byWrap);
      if (log.weather) {
        var weatherWrap = el('span');
        weatherWrap.textContent = 'Thời tiết: ';
        weatherWrap.appendChild(el('strong', null, log.weather));
        meta.appendChild(weatherWrap);
      }
      card.appendChild(meta);

      if (log.description) {
        card.appendChild(el('p', 'qr-timeline__desc', log.description));
      }

      if (log.images && log.images.length) {
        var imagesWrap = el('div', 'qr-timeline__images');
        log.images.forEach(function (image) {
          // Bọc trong <button> (thay vì <img> trần) — bấm mở lightbox phóng
          // to, có sẵn hành vi bàn phím Enter/Space của <button>, không cần
          // tự bắt keydown như 1 <img tabindex="0"> tự chế. Xem
          // setupLightbox() (uỷ quyền sự kiện qua document, bắt được cả nút
          // tạo sau thời điểm nó chạy).
          var imgBtn = document.createElement('button');
          imgBtn.type = 'button';
          imgBtn.className = 'qr-timeline__image-btn';
          imgBtn.setAttribute('data-lightbox-trigger', '');
          imgBtn.setAttribute('aria-label', 'Xem lớn ảnh ' + (image.name || 'hiện trường'));
          var img = document.createElement('img');
          img.src = image.url;
          img.alt = image.name || '';
          img.loading = 'lazy';
          imgBtn.appendChild(img);
          imagesWrap.appendChild(imgBtn);
        });
        card.appendChild(imagesWrap);
      }

      item.appendChild(card);
      node.appendChild(item);
    });
  }

  /* --- Sao chép vào clipboard (uỷ quyền sự kiện, dùng chung cho mọi nút
     [data-copy]/[data-copy-batch-code] — kể cả các nút dựng động sau này) --- */
  function setupCopyButtons(data) {
    var copyTargets = {
      contract: data.batch.contract_address,
      tx: data.batch.tx_hash,
      datahash: data.batch.data_hash
    };

    document.addEventListener('click', function (event) {
      var batchCodeBtn = event.target.closest('[data-copy-batch-code]');
      var copyBtn = event.target.closest('[data-copy]');
      var button = batchCodeBtn || copyBtn;
      if (!button) return;

      var value = batchCodeBtn ? data.batch.code : copyTargets[copyBtn.getAttribute('data-copy')];
      if (!value || !global.navigator.clipboard) return;

      global.navigator.clipboard.writeText(value).then(function () {
        button.classList.add('is-copied');
        var icon = button.querySelector('use');
        var original = icon.getAttribute('href');
        icon.setAttribute('href', 'icons/sprite.svg#icon-check-circle');
        setTimeout(function () {
          button.classList.remove('is-copied');
          icon.setAttribute('href', original);
        }, 1500);
      });
    });
  }

  /* --- Tra cứu mã lô hàng thủ công (khối "Không tìm thấy") -----------------
     Điều hướng lại chính trang này với ?ma= mới — KHÔNG tự fetch() ngầm rồi
     đổi DOM tại chỗ, để URL luôn phản ánh đúng mã đang xem (bấm Back/chia sẻ
     link vẫn đúng), cùng nguyên tắc "trang chi tiết dùng query string" đã
     ghi trong CLAUDE.md gốc. Gọi 1 LẦN lúc DOMContentLoaded, không phụ
     thuộc data — form luôn có sẵn trong DOM tĩnh (chỉ ẩn/hiện qua [hidden]
     trên khối cha .empty-card, không tạo/huỷ động). */
  function setupLookupForm() {
    var form = document.querySelector('[data-lookup-form]');
    if (!form) return;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var input = document.querySelector('[data-lookup-input]');
      var code = (input.value || '').trim();
      if (!code) return;
      global.location.href = 'truy-xuat.html?ma=' + encodeURIComponent(code);
    });
  }

  /* --- Lightbox phóng to ảnh hiện trường (timeline) -------------------------
     1 overlay DÙNG CHUNG cho mọi ảnh (luôn có sẵn trong DOM tĩnh) — uỷ quyền
     sự kiện qua document, cùng mẫu setupCopyButtons() bên dưới, vì
     .qr-timeline__image-btn được TẠO SAU bởi renderTimeline() (chưa tồn tại
     lúc setupLightbox() chạy) nên không gắn listener trực tiếp lên từng nút
     được — gắn 1 lần trên document là đủ, bắt được cả nút tạo sau này. Gọi 1
     LẦN lúc DOMContentLoaded, không phụ thuộc data. */
  function setupLightbox() {
    var overlay = document.querySelector('[data-lightbox]');
    var imgNode = document.querySelector('[data-lightbox-img]');
    if (!overlay || !imgNode) return;

    function close() {
      overlay.hidden = true;
      imgNode.src = '';
    }

    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-lightbox-trigger]');
      if (trigger) {
        var triggerImg = trigger.querySelector('img');
        imgNode.src = triggerImg.src;
        imgNode.alt = triggerImg.alt;
        overlay.hidden = false;
        return;
      }
      // Bấm ra ngoài ảnh (chính lớp phủ overlay) hoặc bấm nút Đóng đều đóng —
      // KHÔNG đóng khi bấm thẳng vào <img> (event.target lúc đó là chính
      // .lightbox img, không phải overlay).
      if (!overlay.hidden && (event.target === overlay || event.target.closest('[data-lightbox-close]'))) {
        close();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !overlay.hidden) close();
    });
  }

  /* --- Chia sẻ trang truy xuất (Facebook/Twitter/sao chép liên kết) --------
     Cùng công thức đã dùng ở blog-chi-tiet.html (js/blog-chi-tiet.js) — khác
     1 điểm: nội dung chia sẻ lấy từ MÃ LÔ HÀNG (không phải tiêu đề bài viết),
     vì trang này không có "tiêu đề" theo nghĩa content, chỉ có mã lô hàng
     làm định danh dễ nhận biết nhất khi chia sẻ. Gọi SAU khi có `data` (cần
     batch.code), khác setupLookupForm()/setupLightbox() ở trên. */
  function setupShareButtons(data) {
    var url = global.location.href;
    var shareText = 'Xem nguồn gốc lô hàng ' + data.batch.code + ' trên AgriChain';

    var fbLink = document.querySelector('[data-share-facebook]');
    fbLink.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);

    var twLink = document.querySelector('[data-share-twitter]');
    twLink.href = 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) +
      '&text=' + encodeURIComponent(shareText);

    var copyBtn = document.querySelector('[data-copy-link]');
    copyBtn.addEventListener('click', function () {
      var iconUse = copyBtn.querySelector('use');
      var originalHref = iconUse.getAttribute('href');
      if (!global.navigator.clipboard) return;
      global.navigator.clipboard.writeText(url).then(function () {
        iconUse.setAttribute('href', 'icons/sprite.svg#icon-check-circle');
        setTimeout(function () {
          iconUse.setAttribute('href', originalHref);
        }, 1500);
      });
    });
  }

  function showBatch(data) {
    loadingNode.hidden = true;
    notFoundNode.hidden = true;
    detailNode.hidden = false;

    renderProducer(data.organization);
    renderSeason(data.season, data.batch);
    renderFarm(data.farm);
    renderCertifications(data.certifications);
    renderBatchId(data.batch);
    renderVerification(data.batch);
    renderTimeline(data.logs);
    setupCopyButtons(data);
    setupShareButtons(data);
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupLookupForm();
    setupLightbox();

    var code = (new URLSearchParams(global.location.search).get('ma') || '').trim();

    if (!code) {
      showNotFound(code);
      return;
    }

    showLoading();
    fetchPublicBatch(code)
      .then(function (data) {
        if (!data) {
          showNotFound(code);
          return;
        }
        showBatch(data);
      })
      .catch(function () {
        showLoadError();
      });
  });
})(window);
