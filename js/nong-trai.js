/* ==========================================================================
   AgriChain — Trang Nông trại
   Đọc/ghi qua AgriChain.store. Nạp SAU js/store.js, js/app-shell.js và
   js/map-layers.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var store = global.AgriChain.store;

  /* --- 34 tỉnh/thành sau sáp nhập đơn vị hành chính 2025 -------------------
     Chỉ còn 2 cấp: Tỉnh/Thành phố -> Phường/Xã (không còn cấp Quận/Huyện).
     Danh sách xã rất dài nên tạm để người dùng tự nhập; khi cần chuẩn hoá thì
     thay ô nhập "Phường/Xã" bằng <select> nạp từ file JSON riêng.

     TODO (2026-08-28): dự định đổi "Phường/Xã" thành <select> phụ thuộc vào
     "Tỉnh/Thành phố", nạp qua API AgriChain
     (GET /1.0/commons/provinces, GET /1.0/commons/provinces/{code}/wards).
     Đã thử gọi thẳng từ trình duyệt (không kèm gì) — cả 2 endpoint đều trả
     401 Unauthorized, có vẻ cần đăng nhập/token mà phía backend chưa xác
     nhận cách truyền. Tạm dừng ở đây, đang chờ hỏi lại backend xem có mở
     /1.0/commons/* thành public được không. Ward vẫn là ô nhập tay như cũ. */
  var PROVINCES = [
    'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng', 'Cần Thơ',
    'Đà Nẵng', 'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp',
    'Gia Lai', 'Hà Nội', 'Hà Tĩnh', 'Hải Phòng', 'Huế',
    'Hưng Yên', 'Khánh Hòa', 'Lai Châu', 'Lâm Đồng', 'Lạng Sơn',
    'Lào Cai', 'Nghệ An', 'Ninh Bình', 'Phú Thọ', 'Quảng Ngãi',
    'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh', 'Thái Nguyên',
    'Thanh Hóa', 'TP. Hồ Chí Minh', 'Tuyên Quang', 'Vĩnh Long'
  ];

  var modal = document.getElementById('farm-modal');
  var form = document.getElementById('farm-form');
  var listNode = document.querySelector('[data-farm-list]');
  var emptyNode = document.querySelector('[data-farm-empty]');
  var countNode = document.querySelector('[data-farm-count]');
  var provinceSelect = document.getElementById('farm-province');

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
    rows.appendChild(iconRow('icon-seedling', 'Ngày bắt đầu: ' + formatDate(farm.startDate)));

    if (farm.nationalPuc) {
      rows.appendChild(iconRow('icon-qr-code', 'Mã vùng trồng: ' + farm.nationalPuc));
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
     Luôn hỏi lại qua AgriChain.confirm() trước khi xoá thật — hành động không
     hoàn tác được vì store.remove() xoá thẳng khỏi localStorage. */
  function handleDelete(farm) {
    global.AgriChain.confirm(
      'Xoá nông trại "' + farm.name + '"? Hành động này không thể hoàn tác.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      store.remove('farms', farm.id);
      render();
      global.AgriChain.toast('Đã xoá nông trại.');
    });
  }

  function render() {
    var farms = store.list('farms');

    countNode.textContent = farms.length;

    listNode.textContent = '';
    if (!farms.length) {
      listNode.hidden = true;
      emptyNode.hidden = false;
      return;
    }

    emptyNode.hidden = true;
    listNode.hidden = false;
    farms.forEach(function (farm) {
      listNode.appendChild(farmCard(farm));
    });
  }

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

  function fillProvinces() {
    PROVINCES.forEach(function (name) {
      var option = el('option', null, name);
      option.value = name;
      provinceSelect.appendChild(option);
    });
  }

  // null = đang thêm mới, có id = đang sửa nông trại đó (dùng ở handleSubmit
  // để quyết định gọi store.insert hay store.update).
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
      document.getElementById('farm-puc-national').value = farm.nationalPuc || '';
      document.getElementById('farm-puc-international').value = farm.internationalPuc || '';
      provinceSelect.value = farm.province || '';
      document.getElementById('farm-ward').value = farm.ward || '';
      document.getElementById('farm-address').value = farm.address || '';
      document.getElementById('farm-start-date').value = farm.startDate || '';
      document.getElementById('farm-area').value = farm.area != null ? farm.area : 0;
      document.getElementById('farm-description').value = farm.description || '';
    } else {
      modalTitle.textContent = 'Thêm nông trại mới';
      submitButton.textContent = 'Lưu nông trại';
      // Gợi ý mã tiếp theo nhưng vẫn cho sửa — bản gốc để người dùng tự đặt mã.
      document.getElementById('farm-code').value = store.nextFarmCode();
      document.getElementById('farm-area').value = '0';
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
    } else {
      // Khi đang sửa, bỏ qua chính nông trại đang sửa — không thì giữ
      // nguyên mã cũ cũng bị báo trùng với chính nó.
      var duplicate = store.list('farms').some(function (farm) {
        return farm.id !== editingFarmId &&
          farm.code.toLowerCase() === code.value.trim().toLowerCase();
      });
      if (duplicate) {
        showError(code, 'Mã này đã dùng cho nông trại khác.');
        problems.push(code);
      }
    }

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

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    var data = new FormData(form);
    var payload = {
      code: String(data.get('code')).trim(),
      name: String(data.get('name')).trim(),
      nationalPuc: String(data.get('nationalPuc') || '').trim(),
      internationalPuc: String(data.get('internationalPuc') || '').trim(),
      province: String(data.get('province') || ''),
      ward: String(data.get('ward') || '').trim(),
      address: String(data.get('address') || '').trim(),
      startDate: String(data.get('startDate') || ''),
      area: Number(data.get('area')) || 0,
      description: String(data.get('description') || '').trim(),
      polygon: points.slice() // sao chép để lần mở modal sau không sửa vào bản đã lưu
    };

    if (editingFarmId) {
      store.update('farms', editingFarmId, payload);
    } else {
      store.insert('farms', payload);
    }

    closeModal();
    render();
    global.AgriChain.toast(editingFarmId ? 'Đã cập nhật nông trại.' : 'Đã lưu nông trại.');
  }

  /* --- Khởi động ----------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    fillProvinces();
    setupShapeControls();
    render();

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