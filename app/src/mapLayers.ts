// Port NGUYÊN VĂN js/map-layers.js's addMapBaseLayers() — 3 lớp nền Leaflet
// dùng chung (vệ tinh/địa hình/mặc định), y hệt URL/attribution gốc.
//
// Đặt ở TOP-LEVEL src/ (không phải trong pages/nong-trai/) vì bản gốc
// js/map-layers.js CHÍNH LÀ 1 file dùng chung giữa js/nong-trai.js VÀ
// js/nong-trai-chi-tiet.js (xem CLAUDE.md gốc: "Dùng chung addMapBaseLayers()
// ... với bản đồ vẽ ranh giới ở nong-trai.html") — cùng lý do useCascadingSelect
// được đặt trong hooks/ thay vì pages/nong-trai/ (dùng lại được khi trang thứ
// 2 cần tới), file này đã được chuyển ra khỏi pages/nong-trai/ đúng lúc
// pages/nong-trai-chi-tiet/ (FarmDetailMap.tsx) bắt đầu cần dùng lại.
//
// Khác `enums.ts` (nạp source qua `?raw` rồi thực thi thật): file này CHỈ
// gán 3 URL tile tĩnh + attribution (không phải danh mục dữ liệu có thể mở
// rộng theo thời gian như ACTIVITY_TYPES) — transcribe trực tiếp sang
// TypeScript đơn giản, ít rủi ro lệch nguồn hơn so với phải "threading" biến
// toàn cục `L` (Leaflet) qua cơ chế thực thi IIFE giả lập. Không có thuật
// toán nào ở đây để "viết lại" — chỉ là dữ liệu cấu hình tĩnh chép nguyên
// văn. Nếu js/map-layers.js đổi URL/thêm lớp nền mới, sửa đồng thời cả 2 nơi.
import type * as L from 'leaflet';

export function addMapBaseLayers(targetMap: L.Map, leaflet: typeof L): void {
  const satellite = leaflet
    .tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
    })
    .addTo(targetMap);

  const terrain = leaflet.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)'
  });

  const street = leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  });

  leaflet.control
    .layers({
      'Vệ tinh': satellite,
      'Địa hình': terrain,
      'Mặc định': street
    })
    .addTo(targetMap);
}
