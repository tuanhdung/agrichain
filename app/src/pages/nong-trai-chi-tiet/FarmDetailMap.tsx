// Port showFarmOnMap() (js/nong-trai-chi-tiet.js gốc) — bản đồ CHỈ XEM, vẽ
// tĩnh polygon đã lưu + fitBounds, KHÔNG cho click-để-đánh-dấu như modal
// Thêm/Sửa ở /nong-trai (BoundaryEditor.tsx) — không cần cơ chế vẽ tương tác
// đầy đủ (guideLine, closeBoundary(), Leaflet Control tự chế...) cho 1 bản đồ
// chỉ-đọc.
//
// Effect khoá theo farm.id (KHÔNG chỉ chạy 1 lần lúc mount như BoundaryEditor)
// — khác hẳn modal (mở/đóng theo dialog, farm cố định trong 1 lần mở): trang
// này có thể giữ nguyên mounted khi người dùng điều hướng sang 1 ?ma=/?id=
// KHÁC (cùng route /nong-trai-chi-tiet, chỉ đổi query string) — nếu chỉ tạo
// map 1 lần (guard mapRef như BoundaryEditor) thì bản đồ sẽ ĐỨNG YÊN với
// polygon của nông trại CŨ khi farm đổi. Dọn map cũ + tạo lại map mới mỗi khi
// farm.id đổi mới đúng ý "mỗi lần vào trang chi tiết là 1 bản đồ mới" của bản
// .html gốc (ở đó MỌI lần đổi ?ma= là 1 lần tải lại trang thật).
import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { addMapBaseLayers } from '../../mapLayers';
import type { Farm } from '../../api';

export function FarmDetailMap({ farm }: { farm: Farm }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, { center: [16.0, 106.0], zoom: 5 });
    addMapBaseLayers(map, L);

    const polygon = farm.polygon || [];
    if (polygon.length >= 3) {
      const latlngs = polygon.map((p): L.LatLngTuple => [p.lat, p.lng]);
      const bounds = L.latLngBounds(latlngs);
      L.polygon(latlngs, { color: '#1F8F58', weight: 3, fillColor: '#2EA86B', fillOpacity: 0.25 }).addTo(map);
      map.fitBounds(bounds, { padding: [24, 24] });
    }

    // Khung bản đồ chỉ có kích thước thật sau khi trình duyệt vẽ xong khối
    // cha — đợi 1 khung hình rồi mới đo lại, khớp showFarmOnMap() gốc.
    const frame = requestAnimationFrame(() => map.invalidateSize());

    return () => {
      cancelAnimationFrame(frame);
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ tạo lại map khi đổi SANG nông trại khác (farm.id), không phải mỗi lần object farm đổi tham chiếu
  }, [farm.id]);

  return <div className="view-map" id="farm-view-map" ref={containerRef}></div>;
}
