/* ==========================================================================
   AgriChain — Trang Nông trại
   ĐÃ CHUYỂN SANG BACKEND THẬT qua js/api.js (GET/POST/PATCH/DELETE /farms) —
   không còn đọc/ghi qua AgriChain.store/collection "farms" nữa. Payload gửi
   lên đổi tên field sang snake_case khớp cột backend (startDate ->
   start_date, nationalPuc -> national_puc, internationalPuc ->
   international_puc); response trả về giữ nguyên snake_case, đọc thẳng.
   Xem mục "Kết nối backend" trong CLAUDE.md.
   Nạp SAU js/api-config.js, js/api.js, js/app-shell.js và js/map-layers.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var api = global.AgriChain.api;
  var PAGE_SIZE = 12;
  var SEARCH_DEBOUNCE_MS = 300;

  /* --- 34 tỉnh/thành sau sáp nhập đơn vị hành chính 2025 -------------------
     Chỉ còn 2 cấp: Tỉnh/Thành phố -> Phường/Xã (không còn cấp Quận/Huyện).
     API AgriChain định dùng cho việc này (GET /1.0/commons/provinces,
     GET /1.0/commons/provinces/{code}/wards) trả 401 Unauthorized khi gọi
     thẳng từ trình duyệt (xem CLAUDE.md) — chuyển sang dữ liệu tĩnh trong
     data/provinces.json + data/wards/{provinceCode}.json, tách sẵn 1 file/
     tỉnh từ gói dữ liệu MIT "vietnam-address-data" (34 tỉnh, 3321 xã/phường,
     hiệu lực 01/07/2025). Nạp qua fetch() lúc dựng trang, không hard-code
     danh sách nữa. */
  var wardCache = {}; // provinceCode -> Promise<[{id,name,provinceId}]> — khỏi tải lại khi quay lại cùng tỉnh

  function loadProvinces() {
    return fetch('data/provinces.json').then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  function loadWards(provinceCode) {
    if (!wardCache[provinceCode]) {
      wardCache[provinceCode] = fetch('data/wards/' + provinceCode + '.json').then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      });
    }
    return wardCache[provinceCode];
  }

  var modal = document.getElementById('farm-modal');
  var form = document.getElementById('farm-form');
  var listNode = document.querySelector('[data-farm-list]');
  var emptyNode = document.querySelector('[data-farm-empty]');
  var emptyTitleNode = document.querySelector('[data-farm-empty-title]');
  var emptyDescNode = document.querySelector('[data-farm-empty-desc]');
  var countNode = document.querySelector('[data-farm-count]');
  var searchInput = document.querySelector('[data-farm-search]');
  var loadingNode = document.querySelector('[data-farm-loading]');
  var errorNode = document.querySelector('[data-farm-error]');
  var errorMessageNode = document.querySelector('[data-farm-error-message]');
  var paginationNode = document.querySelector('[data-farm-pagination]');
  var pageInfoNode = document.querySelector('[data-farm-page-info]');
  var prevPageBtn = document.querySelector('[data-farm-prev-page]');
  var nextPageBtn = document.querySelector('[data-farm-next-page]');
  var provinceSelect = document.getElementById('farm-province');
  var wardSelect = document.getElementById('farm-ward');

  var listState = { page: 1, q: '', total: 0 };

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      global.clearTimeout(timer);
      timer = global.setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  /* --- Tiện ích ------------------------------------------------------------ */

  // Chèn nội dung người dùng nhập bằng textContent chứ không phải innerHTML,
  // nên không cần escape thủ công — tránh luôn nguy cơ chèn thẻ HTML lạ.
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

  function iconRow(iconName, primary, secondary) {
    var row = el('div', 'data-card__row');
    row.appendChild(svgIcon(iconName));

    var text = el('div');
    text.appendChild(el('div', null, primary));
    if (secondary) text.appendChild(el('div', 'data-card__row-label', secondary));
    row.appendChild(text);

    return row;
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

  /* --- Vẽ danh sách -------------------------------------------------------- */

  function farmCard(farm) {
    // Cả thẻ là 1 liên kết tới trang chi tiết — bấm vào phần thông tin (chỗ
    // nào không phải nút sửa/xoá) sẽ mở nong-trai-chi-tiet.html. 2 nút thao
    // tác bên dưới tự chặn sự kiện nổi bọt lên <a> để không bị điều hướng.
    var card = el('a', 'card card--hover');
    card.href = 'nong-trai-chi-tiet.html?ma=' + encodeURIComponent(farm.code);

    var header = el('div', 'card__header');
    header.appendChild(el('h2', 'data-card__title', farm.name));
    header.appendChild(el('p', 'data-card__code', farm.code));
    card.appendChild(header);

    var rows = el('div', 'data-card__rows');

    var place = [farm.ward, farm.province].filter(Boolean).join(', ');
    rows.appendChild(iconRow('icon-map-pin', farm.address || place, farm.address ? place : ''));
    rows.appendChild(iconRow('icon-chart-bar', 'Diện tích: ' + formatArea(farm.area)));
    rows.appendChild(iconRow('icon-seedling', 'Ngày bắt đầu: ' + formatDate(farm.start_date)));

    if (farm.national_puc) {
      rows.appendChild(iconRow('icon-qr-code', 'Mã vùng trồng: ' + farm.national_puc));
    }

    if (farm.polygon && farm.polygon.length >= 3) {
      rows.appendChild(iconRow('icon-map-pin',
        'Đã khoanh ranh giới (' + farm.polygon.length + ' điểm)'));
    }

    card.appendChild(rows);

    var actions = el('div', 'data-card__actions');

    // Không cần bắt sự kiện riêng: nút này nằm trong <a> nên bấm vào cũng tự
    // điều hướng như bấm vào chỗ khác trên thẻ — chỉ thêm cho quen mắt và có
    // aria-label/tooltip rõ ràng, giống 2 nút sửa/xoá bên cạnh.
    var viewButton = el('button', 'icon-btn');
    viewButton.type = 'button';
    viewButton.setAttribute('aria-label', 'Xem chi tiết ' + farm.name);
    viewButton.setAttribute('data-tooltip', 'Xem chi tiết');
    viewButton.appendChild(svgIcon('icon-eye'));
    actions.appendChild(viewButton);

    var editButton = el('button', 'icon-btn');
    editButton.type = 'button';
    editButton.setAttribute('aria-label', 'Chỉnh sửa ' + farm.name);
    editButton.setAttribute('data-tooltip', 'Chỉnh sửa');
    if (!api.hasPermission('farms.edit')) editButton.hidden = true;
    editButton.appendChild(svgIcon('icon-pencil'));
    editButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      openModal(farm);
    });
    actions.appendChild(editButton);

    var deleteButton = el('button', 'icon-btn icon-btn--danger');
    deleteButton.type = 'button';
    deleteButton.setAttribute('aria-label', 'Xoá ' + farm.name);
    deleteButton.setAttribute('data-tooltip', 'Xoá');
    if (!api.hasPermission('farms.delete')) deleteButton.hidden = true;
    deleteButton.appendChild(svgIcon('icon-trash'));
    deleteButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      handleDelete(farm);
    });
    actions.appendChild(deleteButton);

    card.appendChild(actions);

    return card;
  }

  /* --- Xoá nông trại --------------------------------------------------------
     Luôn hỏi lại qua AgriChain.confirm() trước khi xoá thật — hành động
     không hoàn tác được. Backend xoá MỀM nhưng CHẶN (409) nếu nông trại còn
     mùa vụ chưa xoá — phải hiện đúng lỗi đó, không được báo xoá thành công
     giả như hồi còn dùng store.js (bug đã sửa ở backend, quan trọng nhất
     của lần nối API này). */
  function handleDelete(farm) {
    global.AgriChain.confirm(
      'Xoá nông trại "' + farm.name + '"? Hành động này không thể hoàn tác.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      api.farms.remove(farm.id).then(function () {
        loadFarms();
        global.AgriChain.toast('Đã xoá nông trại.');
      }).catch(function (err) {
        // 409: nông trại còn mùa vụ chưa xoá — message tiếng Việt đã có sẵn
        // từ backend, hiển thị thẳng, KHÔNG coi là đã xoá thành công.
        global.AgriChain.toast(err.message);
      });
    });
  }

  function setListView(view) {
    loadingNode.hidden = view !== 'loading';
    errorNode.hidden = view !== 'error';
    listNode.hidden = view !== 'data';
    emptyNode.hidden = view !== 'empty';
    paginationNode.hidden = view !== 'data';
  }

  function renderFarms(data) {
    var farms = data.items || [];
    listState.total = data.total || 0;
    countNode.textContent = listState.total;

    listNode.textContent = '';

    if (!farms.length) {
      if (listState.q) {
        emptyTitleNode.textContent = 'Không tìm thấy nông trại nào';
        emptyDescNode.textContent = 'Thử lại với từ khoá khác.';
      } else {
        emptyTitleNode.textContent = 'Chưa có nông trại nào';
        emptyDescNode.textContent = 'Nông trại là điểm bắt đầu của mọi lô hàng. Tạo nông trại đầu tiên ' +
          'để bắt đầu ghi nhận mùa vụ và truy xuất nguồn gốc.';
      }
      setListView('empty');
      return;
    }

    farms.forEach(function (farm) {
      listNode.appendChild(farmCard(farm));
    });
    setListView('data');

    var totalPages = Math.max(1, Math.ceil(listState.total / PAGE_SIZE));
    pageInfoNode.textContent = 'Trang ' + listState.page + ' / ' + totalPages;
    prevPageBtn.disabled = listState.page <= 1;
    nextPageBtn.disabled = listState.page >= totalPages;
  }

  function loadFarms() {
    setListView('loading');
    api.farms.list({
      q: listState.q || undefined,
      page: listState.page,
      page_size: PAGE_SIZE
    }).then(function (data) {
      renderFarms(data);
    }).catch(function (err) {
      errorMessageNode.textContent = err.message;
      setListView('error');
    });
  }

  var handleSearchInput = debounce(function () {
    listState.q = searchInput.value.trim();
    listState.page = 1;
    loadFarms();
  }, SEARCH_DEBOUNCE_MS);

  /* ======================================================================
     Ranh giới thửa đất (Leaflet)
     ====================================================================== */

  var map = null;
  var shapeLayer = null;    // đường/đa giác nối các điểm
  var markerLayer = null;   // các chấm đánh số
  var points = [];          // [{ lat, lng }] theo đúng thứ tự người dùng nhấp

  var coordList = document.querySelector('[data-coord-list]');
  var coordEmpty = document.querySelector('[data-coord-empty]');
  var areaBox = document.querySelector('[data-area-box]');
  var areaValue = document.querySelector('[data-area-value]');
  var boundaryError = document.querySelector('[data-boundary-error]');

  /* --- Diện tích trên mặt cầu ----------------------------------------------
     Không dùng công thức phẳng: ở vĩ độ Việt Nam, 1 độ kinh tuyến ngắn hơn
     1 độ vĩ tuyến khoảng 4%, tính phẳng sẽ lệch thấy rõ trên thửa lớn.
     Đây là công thức lượng giác cầu chuẩn, trả về mét vuông. */
  function geodesicArea(list) {
    if (list.length < 3) return 0;

    var R = 6378137; // bán kính Trái Đất theo WGS84, mét
    var rad = Math.PI / 180;
    var sum = 0;

    for (var i = 0; i < list.length; i++) {
      var p1 = list[i];
      var p2 = list[(i + 1) % list.length]; // điểm cuối nối về điểm đầu
      sum += (p2.lng - p1.lng) * rad *
        (2 + Math.sin(p1.lat * rad) + Math.sin(p2.lat * rad));
    }

    return Math.abs(sum * R * R / 2);
  }

  function hectares(squareMeters) {
    return squareMeters / 10000;
  }

  function formatHectares(value) {
    if (value >= 1) return value.toFixed(2) + ' ha';
    // Thửa nhỏ dưới 1 ha thì hiện thêm số mét vuông cho dễ hình dung
    return value.toFixed(4) + ' ha (' + Math.round(value * 10000) + ' m²)';
  }

  /* --- Vẽ lại toàn bộ: chấm, đường nối, danh sách toạ độ, diện tích -------- */
  function refreshShape() {
    if (!map) return;

    markerLayer.clearLayers();
    if (shapeLayer) {
      map.removeLayer(shapeLayer);
      shapeLayer = null;
    }

    points.forEach(function (point, index) {
      L.marker([point.lat, point.lng], {
        icon: L.divIcon({
          className: '',
          html: '<span style="display:flex;align-items:center;justify-content:center;' +
            'width:24px;height:24px;border-radius:9999px;background:#1F8F58;color:#fff;' +
            'font:700 12px/1 sans-serif;border:2px solid #fff;' +
            'box-shadow:0 1px 3px rgba(0,0,0,.3)">' + (index + 1) + '</span>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(markerLayer);
    });

    var latlngs = points.map(function (p) { return [p.lat, p.lng]; });

    if (points.length === 2) {
      shapeLayer = L.polyline(latlngs, { color: '#1F8F58', weight: 3 }).addTo(map);
    } else if (points.length >= 3) {
      shapeLayer = L.polygon(latlngs, {
        color: '#1F8F58', weight: 3, fillColor: '#2EA86B', fillOpacity: 0.25
      }).addTo(map);
    }

    renderCoordList();
    renderArea();
    if (points.length >= 3) boundaryError.hidden = true;
  }

  function renderCoordList() {
    coordList.textContent = '';

    if (!points.length) {
      coordList.hidden = true;
      coordEmpty.hidden = false;
      return;
    }

    coordEmpty.hidden = true;
    coordList.hidden = false;

    points.forEach(function (point, index) {
      var item = el('li', 'coord-item');
      item.appendChild(el('span', 'coord-item__index', String(index + 1)));
      item.appendChild(el('span', 'coord-item__value',
        point.lat.toFixed(5) + ', ' + point.lng.toFixed(5)));

      var remove = el('button', 'icon-btn icon-btn--danger');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Xoá điểm ' + (index + 1));
      remove.setAttribute('data-tooltip', 'Xoá điểm');
      remove.appendChild(svgIcon('icon-trash'));
      remove.addEventListener('click', function () {
        points.splice(index, 1);
        refreshShape();
      });
      item.appendChild(remove);

      coordList.appendChild(item);
    });
  }

  function renderArea() {
    if (points.length < 3) {
      areaBox.hidden = true;
      return;
    }
    areaBox.hidden = false;
    areaValue.textContent = formatHectares(hectares(geodesicArea(points)));
  }

  /* --- Về vị trí của tôi -----------------------------------------------------
     Dùng Geolocation API của trình duyệt để tự căn bản đồ, khỏi phải phóng to
     dò từng tỉnh/phường. Chỉ di chuyển khung nhìn — KHÔNG tự thêm điểm ranh
     giới, người dùng vẫn bấm lên bản đồ như bình thường để đánh dấu. */
  var locateMarker = null;

  function locateMe() {
    if (!map) return;

    if (!global.navigator.geolocation) {
      global.AgriChain.toast('Trình duyệt không hỗ trợ định vị.');
      return;
    }

    global.navigator.geolocation.getCurrentPosition(
      function (position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;

        map.setView([lat, lng], 16);

        if (locateMarker) map.removeLayer(locateMarker);
        locateMarker = L.circleMarker([lat, lng], {
          radius: 8,
          color: '#fff',
          weight: 2,
          fillColor: '#1D4E89',
          fillOpacity: 1
        }).addTo(map);
      },
      function (error) {
        var message = 'Không lấy được vị trí của bạn.';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Bạn chưa cho phép truy cập vị trí — hãy cấp quyền rồi thử lại.';
        }
        global.AgriChain.toast(message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  /* --- Khởi tạo bản đồ -----------------------------------------------------
     Dựng trễ, chỉ khi modal mở lần đầu: Leaflet đo kích thước khung lúc khởi
     tạo, mà khung nằm trong <dialog> đang ẩn nên sẽ đo ra 0 và bản đồ vỡ. */
  function ensureMap() {
    if (map || typeof L === 'undefined') return;

    map = L.map('farm-map', { center: [16.0, 106.0], zoom: 5 });
    global.AgriChain.addMapBaseLayers(map);

    markerLayer = L.layerGroup().addTo(map);

    // Control riêng thêm vào Leaflet, tách bạch với sự kiện click-để-đánh-dấu
    // của bản đồ (disableClickPropagation chặn click trên nút lan xuống map).
    // Định nghĩa TRONG ensureMap() (chứ không phải cấp module) vì lúc này đã
    // chắc chắn `L` tồn tại — đụng vào L.Control ở cấp module sẽ làm vỡ cả
    // file nếu CDN Leaflet lỡ tải lỗi.
    var LocateControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function () {
        var container = L.DomUtil.create('div', 'leaflet-bar map-locate-control');
        L.DomEvent.disableClickPropagation(container);

        var button = L.DomUtil.create('a', '', container);
        button.href = '#';
        button.title = 'Về vị trí của tôi';
        button.setAttribute('aria-label', 'Về vị trí của tôi');
        button.innerHTML = '<svg class="icon icon--sm"><use href="icons/sprite.svg#icon-map-pin"></use></svg>';

        L.DomEvent.on(button, 'click', function (event) {
          L.DomEvent.preventDefault(event);
          locateMe();
        });

        return container;
      }
    });
    map.addControl(new LocateControl());

    map.on('click', function (event) {
      points.push({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6))
      });
      refreshShape();
    });
  }

  function resetShape() {
    points = [];
    if (map) refreshShape();
  }

  function setupShapeControls() {
    document.querySelector('[data-undo-point]').addEventListener('click', function () {
      points.pop();
      refreshShape();
    });

    document.querySelector('[data-clear-points]').addEventListener('click', function () {
      resetShape();
    });

    document.querySelector('[data-apply-area]').addEventListener('click', function () {
      var value = hectares(geodesicArea(points));
      // Làm tròn 4 chữ số: thửa nhỏ vẫn giữ được độ chính xác có nghĩa
      document.getElementById('farm-area').value = value.toFixed(4);
      global.AgriChain.toast('Đã điền diện tích từ ranh giới.');
    });
  }

  /* --- Modal --------------------------------------------------------------- */

  // option.value giữ nguyên TÊN tỉnh (không phải mã) — farm.province vẫn
  // lưu chuỗi tên như trước giờ, khỏi phải sửa lại dữ liệu cũ/chỗ hiển thị.
  // Mã tỉnh (cần để tải đúng file phường/xã) gắn riêng vào data-code.
  function fillProvinces() {
    return loadProvinces().then(function (provinces) {
      provinces.forEach(function (province) {
        var option = el('option', null, province.name);
        option.value = province.name;
        option.dataset.code = province.id;
        provinceSelect.appendChild(option);
      });
    }).catch(function () {
      global.AgriChain.toast('Không tải được danh sách tỉnh/thành phố.');
    });
  }

  function currentProvinceCode() {
    var option = provinceSelect.selectedOptions[0];
    return option ? option.dataset.code : '';
  }

  // Cơ chế "2 select phụ thuộc nhau" dùng chung — xem js/location-select.js.
  // wardCascade.refresh(tênPhườngĐãLưu) gọi lúc sửa nông trại (điền sẵn +
  // chọn đúng phường cũ); refresh() không tham số lúc người dùng tự đổi tỉnh
  // (đã tự gắn sẵn qua sự kiện change của provinceSelect trong helper).
  var wardCascade = global.AgriChain.setupCascadingSelect({
    parentSelect: provinceSelect,
    childSelect: wardSelect,
    loadChildren: function () {
      var code = currentProvinceCode();
      return code ? loadWards(code) : [];
    },
    getOptionValue: function (ward) { return ward.name; },
    getOptionLabel: function (ward) { return ward.name; },
    placeholderEmpty: '— Chọn phường/xã —',
    placeholderNoParent: '— Chọn tỉnh/thành phố trước —',
    onError: function () {
      showError(wardSelect, 'Không tải được danh sách phường/xã. Thử chọn lại tỉnh/thành phố.');
    }
  });

  // null = đang thêm mới, có id = đang sửa nông trại đó (dùng ở handleSubmit
  // để quyết định gọi api.farms.create() hay api.farms.update()).
  var editingFarmId = null;
  var modalTitle = document.getElementById('farm-modal-title');
  var submitButton = form.querySelector('button[type="submit"]');

  // Gọi openModal() (không tham số) để thêm mới, hoặc openModal(farm) để sửa
  // một nông trại đã có — điền sẵn toàn bộ trường và ranh giới của nó.
  function openModal(farm) {
    form.reset();
    clearErrors();
    boundaryError.hidden = true; // clearErrors() cố tình bỏ qua nó — tự ẩn lại ở đây
    editingFarmId = farm ? farm.id : null;
    points = farm && farm.polygon ? farm.polygon.slice() : [];

    if (farm) {
      modalTitle.textContent = 'Cập nhật nông trại';
      submitButton.textContent = 'Lưu thay đổi';

      document.getElementById('farm-code').value = farm.code;
      document.getElementById('farm-name').value = farm.name;
      document.getElementById('farm-puc-national').value = farm.national_puc || '';
      document.getElementById('farm-puc-international').value = farm.international_puc || '';
      provinceSelect.value = farm.province || '';
      wardCascade.refresh(farm.ward); // tải phường/xã đúng tỉnh, chọn sẵn phường/xã đã lưu
      document.getElementById('farm-address').value = farm.address || '';
      document.getElementById('farm-start-date').value = farm.start_date || '';
      document.getElementById('farm-area').value = farm.area != null ? farm.area : 0;
      document.getElementById('farm-description').value = farm.description || '';
    } else {
      modalTitle.textContent = 'Thêm nông trại mới';
      submitButton.textContent = 'Lưu nông trại';
      // Gợi ý mã tiếp theo dựa trên tổng số đã tải (listState.total) — chỉ
      // là gợi ý, backend tự kiểm tra trùng mã thật khi lưu (xem
      // validateUserClientSide()-style xử lý lỗi ở handleSubmit()).
      var seq = String(listState.total + 1);
      document.getElementById('farm-code').value = 'NV' + (seq.length < 2 ? '0' + seq : seq);
      document.getElementById('farm-area').value = '0';
      wardCascade.refresh(); // reset phường/xã về trạng thái "chưa chọn tỉnh"
    }

    modal.showModal();

    // Chỉ sau khi <dialog> mở thì khung bản đồ mới có kích thước thật.
    // requestAnimationFrame đợi trình duyệt vẽ xong khung rồi mới đo.
    global.requestAnimationFrame(function () {
      ensureMap();
      if (map) {
        map.invalidateSize();
        refreshShape(); // vẽ lại ranh giới đã lưu khi sửa, hoặc trống khi thêm mới

        // Sửa nông trại đã có ranh giới: phóng tới đúng vị trí của nó thay
        // vì giữ nguyên khung nhìn còn sót lại từ lần mở modal trước.
        if (farm && points.length) {
          var bounds = L.latLngBounds(points.map(function (p) { return [p.lat, p.lng]; }));
          map.fitBounds(bounds, { padding: [24, 24] });
        }
      }
    });

    document.getElementById('farm-name').focus();
  }

  function closeModal() {
    modal.close();
  }

  /* --- Kiểm tra dữ liệu ----------------------------------------------------
     Dùng validity của trình duyệt nhưng tự hiển thị lỗi, vì bong bóng mặc định
     chỉ hiện được một lỗi tại một thời điểm và biến mất khi bấm ra ngoài. */
  function clearErrors() {
    // :not([data-boundary-error]) — lỗi ranh giới thửa đất là 1 phần tử
    // tĩnh có sẵn trong HTML (ẩn/hiện bằng .hidden), khác với lỗi field
    // thường được showError() tạo mới rồi gắn vào DOM — xoá nhầm nó ở đây
    // sẽ làm mất luôn phần tử, không hiện lại được nữa.
    form.querySelectorAll('.field__error:not([data-boundary-error])').forEach(function (node) {
      node.remove();
    });
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (node) {
      node.removeAttribute('aria-invalid');
    });
  }

  function showError(field, message) {
    field.setAttribute('aria-invalid', 'true');
    var error = el('p', 'field__error', message);
    field.parentNode.appendChild(error);
  }

  function validate() {
    clearErrors();

    var problems = [];
    var code = document.getElementById('farm-code');
    var name = document.getElementById('farm-name');
    var province = document.getElementById('farm-province');
    var ward = document.getElementById('farm-ward');
    var address = document.getElementById('farm-address');
    var startDate = document.getElementById('farm-start-date');
    var area = document.getElementById('farm-area');
    var description = document.getElementById('farm-description');

    if (!code.value.trim()) {
      showError(code, 'Nhập mã nông trại.');
      problems.push(code);
    }
    // Không kiểm tra trùng mã phía client nữa — trang chỉ tải 1 trang dữ
    // liệu tại một thời điểm (phân trang), không đủ để biết TOÀN BỘ mã đã
    // dùng. Backend tự kiểm tra trùng "code" toàn hệ thống và trả lỗi
    // VALIDATION_ERROR kèm details.field="code" — xem fieldNodeFor() trong
    // handleSubmit().

    if (!name.value.trim()) {
      showError(name, 'Nhập tên nông trại.');
      problems.push(name);
    }
    if (!province.value) {
      showError(province, 'Chọn tỉnh/thành phố.');
      problems.push(province);
    }
    if (!ward.value.trim()) {
      showError(ward, 'Nhập phường/xã.');
      problems.push(ward);
    }
    if (!address.value.trim()) {
      showError(address, 'Nhập địa chỉ.');
      problems.push(address);
    }
    if (!startDate.value) {
      showError(startDate, 'Chọn ngày bắt đầu.');
      problems.push(startDate);
    }
    if (!area.value.trim()) {
      showError(area, 'Nhập diện tích.');
      problems.push(area);
    }
    if (!description.value.trim()) {
      showError(description, 'Nhập mô tả.');
      problems.push(description);
    }

    // Ranh giới không phải input nên không đưa vào `problems` (không
    // .focus() được) — kiểm riêng, ưu tiên các lỗi field ở trên trước.
    // `polygon` BẮT BUỘC — tối thiểu 3 điểm mới được lưu (khớp constraint
    // NOT NULL trong migration 003 của backend, không có ngoại lệ).
    var boundaryValid = points.length >= 3;
    boundaryError.hidden = boundaryValid;

    if (problems.length) {
      problems[0].focus();
      return false;
    }
    if (!boundaryValid) {
      boundaryError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }

  // Ánh xạ tên field backend trả về trong lỗi (details.field, snake_case)
  // sang đúng input trên form — khớp FarmCreate/FarmUpdate thật.
  function fieldNodeFor(fieldName) {
    var map = {
      code: 'farm-code',
      name: 'farm-name',
      national_puc: 'farm-puc-national',
      international_puc: 'farm-puc-international',
      province: 'farm-province',
      ward: 'farm-ward',
      address: 'farm-address',
      start_date: 'farm-start-date',
      area: 'farm-area',
      description: 'farm-description'
    };
    var id = map[fieldName];
    return id ? document.getElementById(id) : null;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    var data = new FormData(form);
    // snake_case khớp cột backend thật (FarmCreate/FarmUpdate) — response
    // trả về cũng snake_case, đọc thẳng không qua lớp chuyển đổi nào khác.
    var payload = {
      code: String(data.get('code')).trim(),
      name: String(data.get('name')).trim(),
      national_puc: String(data.get('nationalPuc') || '').trim() || null,
      international_puc: String(data.get('internationalPuc') || '').trim() || null,
      province: String(data.get('province') || ''),
      ward: String(data.get('ward') || '').trim(),
      address: String(data.get('address') || '').trim(),
      start_date: String(data.get('startDate') || ''),
      area: Number(data.get('area')) || 0,
      description: String(data.get('description') || '').trim(),
      polygon: points.slice() // sao chép để lần mở modal sau không sửa vào bản đã lưu — bắt buộc >=3 điểm, đã validate ở trên
    };

    submitButton.disabled = true;
    submitButton.textContent = 'Đang lưu...';

    var request = editingFarmId
      ? api.farms.update(editingFarmId, payload)
      : api.farms.create(payload);

    request.then(function () {
      closeModal();
      loadFarms();
      global.AgriChain.toast(editingFarmId ? 'Đã cập nhật nông trại.' : 'Đã lưu nông trại.');
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
      submitButton.textContent = editingFarmId ? 'Lưu thay đổi' : 'Lưu nông trại';
    });
  }

  // Ẩn nút nào người dùng hiện tại không có quyền — đánh dấu sẵn bằng
  // data-requires-permission="<mã quyền>" trên nút trong HTML.
  function applyPermissionGates() {
    document.querySelectorAll('[data-requires-permission]').forEach(function (node) {
      var code = node.getAttribute('data-requires-permission');
      if (!api.hasPermission(code)) node.hidden = true;
    });
  }

  /* --- Khởi động ----------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    applyPermissionGates();
    fillProvinces();
    setupShapeControls();
    loadFarms();

    searchInput.addEventListener('input', handleSearchInput);
    prevPageBtn.addEventListener('click', function () {
      if (listState.page <= 1) return;
      listState.page -= 1;
      loadFarms();
    });
    nextPageBtn.addEventListener('click', function () {
      listState.page += 1;
      loadFarms();
    });
    document.querySelector('[data-farm-retry]').addEventListener('click', loadFarms);

    // Gọi openModal() không tham số — không truyền thẳng openModal làm
    // handler, vì addEventListener sẽ đưa đối tượng Event vào làm tham số
    // farm, khiến nút "Thêm nông trại" tưởng nhầm đang ở chế độ sửa.
    document.querySelectorAll('[data-open-farm-form]').forEach(function (button) {
      button.addEventListener('click', function () { openModal(); });
    });
    document.querySelectorAll('[data-close-farm-form]').forEach(function (button) {
      button.addEventListener('click', closeModal);
    });

    form.addEventListener('submit', handleSubmit);
  });
})(window);