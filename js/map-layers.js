/* ==========================================================================
   AgriChain — Lớp nền bản đồ dùng chung (vệ tinh / địa hình / mặc định)
   Tách riêng vì cả trang nong-trai.html (bản đồ vẽ ranh giới) lẫn
   nong-trai-chi-tiet.html (bản đồ chỉ xem) đều cần cùng 3 lớp nền này.
   Nạp SAU thư viện Leaflet, TRƯỚC bất kỳ file nào gọi AgriChain.addMapBaseLayers().
   ========================================================================== */

(function (global) {
  'use strict';

  // Cả 3 nguồn đều miễn phí, không cần API key:
  //   - Vệ tinh: Esri World Imagery — thấy rõ thực địa (bờ ruộng, nhà lưới)
  //     nên chọn làm mặc định, dễ khoanh ranh giới chính xác.
  //   - Địa hình: OpenTopoMap — thấy cao độ/đường đồng mức.
  //   - Mặc định: OpenStreetMap — bản đồ đường phố quen thuộc.
  function addMapBaseLayers(targetMap) {
    var satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
      }
    ).addTo(targetMap);

    var terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)'
    });

    var street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    });

    L.control.layers({
      'Vệ tinh': satellite,
      'Địa hình': terrain,
      'Mặc định': street
    }).addTo(targetMap);
  }

  global.AgriChain = global.AgriChain || {};
  global.AgriChain.addMapBaseLayers = addMapBaseLayers;
})(window);
