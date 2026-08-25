/* ==========================================================================
   AgriChain — Trang chi tiết 1 nông trại (nong-trai-chi-tiet.html?ma=...)
   Đọc mã nông trại từ query string (?ma=), tìm trong AgriChain.store rồi vẽ
   lại thông tin — không sửa/xoá dữ liệu ở đây, chỉ xem. Nạp SAU js/store.js,
   js/app-shell.js và js/map-layers.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var store = global.AgriChain.store;

  var notFoundNode = document.querySelector('[data-not-found]');
  var detailNode = document.querySelector('[data-farm-detail]');
  var breadcrumbNode = document.querySelector('[data-farm-breadcrumb]');

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
  }

  document.addEventListener('DOMContentLoaded', function () {
    var code = new URLSearchParams(global.location.search).get('ma') || '';
    var farm = store.list('farms').find(function (item) {
      return item.code.toLowerCase() === code.trim().toLowerCase();
    });

    if (!farm) {
      showNotFound(code);
      return;
    }

    showFarm(farm);
  });
})(window);
