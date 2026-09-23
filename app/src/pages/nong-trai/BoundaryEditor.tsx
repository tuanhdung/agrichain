// Port khối "Ranh giới thửa đất (Polygon)" của nong-trai.html +
// js/nong-trai.js gốc (map/shapeLayer/markerLayer/points/pendingRows/
// guideLine/boundaryClosed/firstMarker...) — Leaflet THUẦN (KHÔNG dùng
// react-leaflet, xem quyết định trong app/CLAUDE.md mục "Trang /nong-trai"),
// bọc trong component dùng useEffect để mount/unmount thủ công + useRef giữ
// các đối tượng Leaflet (map, layer, marker) — chúng KHÔNG phải state React,
// mutate trực tiếp giống hệt bản .js gốc, chỉ 2 biến thật sự cần re-render
// (points, boundaryClosed) mới là React state.
//
// Đường nét đứt gợi ý (guideLine) + làm nổi bật điểm đầu tiên khi chuột lại
// gần — CỐ TÌNH không đưa vào state React (chỉ là gợi ý trực quan bám theo
// mousemove tần suất cao, KHÔNG tính vào points/diện tích, y hệt ghi chú
// trong bản gốc) — mutate DOM/Leaflet trực tiếp qua ref, tránh re-render
// thừa mỗi lần di chuột.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from '../../icons';
import { useToast } from '../../components/ToastProvider';
import type { FarmPoint } from '../../api';
import { geodesicArea, hectares, formatHectares } from './geo';
import { addMapBaseLayers } from '../../mapLayers';
import { CLOSE_HIT_RADIUS_PX } from './constants';

interface BoundaryEditorProps {
  /** Nút "Điền vào ô diện tích" — báo lên form cha giá trị tính được (chuỗi
   *  đã toFixed(4)) để điền vào ô "Diện tích" của form chính, khớp
   *  data-apply-area gốc (ghi thẳng vào #farm-area). */
  onApplyArea: (value: string) => void;
}

export interface BoundaryEditorHandle {
  getPoints(): FarmPoint[];
  isBoundaryClosed(): boolean;
  /** Reset về trạng thái ban đầu cho 1 lần mở modal — mảng rỗng (thêm mới)
   *  hoặc polygon đã lưu (sửa, coi như đã khép kín sẵn, khớp openModal() gốc). */
  initialize(points: FarmPoint[]): void;
  /** Mount map lần đầu (nếu chưa) + invalidateSize() + vẽ lại + fitBounds
   *  nếu có sẵn điểm — gọi SAU khi <dialog> đã showModal() (Leaflet cần
   *  kích thước khung thật, xem ensureMap() gốc). */
  ensureMapReady(hasInitialPoints: boolean): void;
}

interface ManualRow {
  lat: string;
  lng: string;
}

function numberedMarkerIcon(index: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html:
      '<span style="display:flex;align-items:center;justify-content:center;' +
      'width:24px;height:24px;border-radius:9999px;background:#1F8F58;color:#fff;' +
      'font:700 12px/1 sans-serif;border:2px solid #fff;' +
      `box-shadow:0 1px 3px rgba(0,0,0,.3)">${index + 1}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

export const BoundaryEditor = forwardRef<BoundaryEditorHandle, BoundaryEditorProps>(function BoundaryEditor({ onApplyArea }, ref) {
  const { showToast } = useToast();

  const [points, setPoints] = useState<FarmPoint[]>([]);
  const [boundaryClosed, setBoundaryClosed] = useState(false);
  const [pendingRows, setPendingRows] = useState<ManualRow[]>([]);
  const [manualError, setManualError] = useState('');

  // points/boundaryClosed mới cần re-render (coordinate list, area box) —
  // đọc giá trị MỚI NHẤT trong handler Leaflet (closure cũ) qua ref son
  // song song, tránh phải setup lại toàn bộ event listener mỗi lần đổi.
  const pointsRef = useRef<FarmPoint[]>([]);
  const boundaryClosedRef = useRef(false);
  useEffect(() => {
    pointsRef.current = points;
    boundaryClosedRef.current = boundaryClosed;
  }, [points, boundaryClosed]);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const shapeLayerRef = useRef<L.Polygon | L.Polyline | null>(null);
  const guideLineRef = useRef<L.Polyline | null>(null);
  const firstMarkerRef = useRef<L.Marker | null>(null);
  const locateMarkerRef = useRef<L.CircleMarker | null>(null);

  const clearGuideLine = useCallback(() => {
    if (guideLineRef.current && mapRef.current) {
      mapRef.current.removeLayer(guideLineRef.current);
      guideLineRef.current = null;
    }
  }, []);

  const setFirstMarkerHighlight = useCallback((active: boolean) => {
    const marker = firstMarkerRef.current;
    if (!marker) return;
    const el = marker.getElement();
    const dot = el?.querySelector('span');
    if (!dot) return;
    (dot as HTMLElement).style.background = active ? '#F59E0B' : '#1F8F58';
    (dot as HTMLElement).style.boxShadow = active
      ? '0 0 0 5px rgba(245,158,11,.35), 0 1px 3px rgba(0,0,0,.3)'
      : '0 1px 3px rgba(0,0,0,.3)';
    (dot as HTMLElement).style.transform = active ? 'scale(1.3)' : '';
  }, []);

  const isNearFirstPoint = useCallback((latlng: L.LatLng) => {
    const map = mapRef.current;
    const current = pointsRef.current;
    if (!map || boundaryClosedRef.current || current.length < 3) return false;
    const a = map.latLngToContainerPoint([current[0].lat, current[0].lng]);
    const b = map.latLngToContainerPoint(latlng);
    return a.distanceTo(b) <= CLOSE_HIT_RADIUS_PX;
  }, []);

  /* --- Vẽ lại toàn bộ: chấm, đường nối — chỉ phần LEAFLET, danh sách toạ độ
     và ô diện tích tự vẽ lại qua JSX (React) vì đã là state. */
  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();
    if (shapeLayerRef.current) {
      map.removeLayer(shapeLayerRef.current);
      shapeLayerRef.current = null;
    }

    firstMarkerRef.current = null;
    points.forEach((point, index) => {
      const marker = L.marker([point.lat, point.lng], { icon: numberedMarkerIcon(index) }).addTo(markerLayer);
      if (index === 0) firstMarkerRef.current = marker;
    });

    const latlngs: L.LatLngExpression[] = points.map((p) => [p.lat, p.lng]);

    // Đang vẽ (chưa khép kín) -> đường MỞ, không tô nền. Chỉ khi đã bấm lại
    // điểm đầu tiên (boundaryClosed) mới tô thành vùng khép kín thật.
    if (boundaryClosed && points.length >= 3) {
      shapeLayerRef.current = L.polygon(latlngs, { color: '#1F8F58', weight: 3, fillColor: '#2EA86B', fillOpacity: 0.25 }).addTo(map);
    } else if (points.length >= 2) {
      shapeLayerRef.current = L.polyline(latlngs, { color: '#1F8F58', weight: 3 }).addTo(map);
    }

    if (boundaryClosed) clearGuideLine();
  }, [points, boundaryClosed, clearGuideLine]);

  function closeBoundary() {
    setBoundaryClosed(true);
    clearGuideLine();
  }

  /* --- Khởi tạo map (1 LẦN) — gắn click/mousemove + control "Về vị trí của
     tôi". KHÔNG mount ở đây lúc component mount (dialog vẫn đang ẩn, kích
     thước đo ra 0) — chỉ mount khi ensureMapReady() được gọi từ ref, sau khi
     <dialog> đã showModal(), khớp ensureMap() gốc. */
  function mountMapIfNeeded() {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, { center: [16.0, 106.0], zoom: 5 });
    mapRef.current = map;
    addMapBaseLayers(map, L);

    const markerLayer = L.layerGroup().addTo(map);
    markerLayerRef.current = markerLayer;

    const LocateControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-bar map-locate-control');
        L.DomEvent.disableClickPropagation(container);

        const button = L.DomUtil.create('a', '', container);
        button.href = '#';
        button.title = 'Về vị trí của tôi';
        button.setAttribute('aria-label', 'Về vị trí của tôi');
        button.innerHTML = '<svg class="icon icon--sm"><use href="icons/sprite.svg#icon-map-pin"></use></svg>';

        L.DomEvent.on(button, 'click', (event: Event) => {
          L.DomEvent.preventDefault(event);
          locateMe();
        });

        return container;
      }
    });
    map.addControl(new LocateControl());

    map.on('click', (event: L.LeafletMouseEvent) => {
      if (boundaryClosedRef.current) return; // đã khép kín — sửa qua "Lùi 1 điểm" hoặc xoá điểm trong danh sách

      if (isNearFirstPoint(event.latlng)) {
        closeBoundary();
        return;
      }

      setPoints((prev) => [...prev, { lat: Number(event.latlng.lat.toFixed(6)), lng: Number(event.latlng.lng.toFixed(6)) }]);
    });

    // Đường nét đứt gợi ý + làm nổi bật điểm đầu tiên khi chuột lại gần — cả
    // 2 chỉ có ý nghĩa lúc đang vẽ (chưa khép kín). Mutate Leaflet trực tiếp,
    // KHÔNG qua setState (tần suất cao, chỉ là hiệu ứng trực quan).
    map.on('mousemove', (event: L.LeafletMouseEvent) => {
      if (boundaryClosedRef.current) return;

      const current = pointsRef.current;
      if (!current.length) {
        clearGuideLine();
      } else {
        const last = current[current.length - 1];
        const latlngs: L.LatLngExpression[] = [
          [last.lat, last.lng],
          [event.latlng.lat, event.latlng.lng]
        ];
        if (guideLineRef.current) {
          guideLineRef.current.setLatLngs(latlngs);
        } else {
          guideLineRef.current = L.polyline(latlngs, { color: '#1F8F58', weight: 2, dashArray: '6, 6', interactive: false }).addTo(map);
        }
      }

      setFirstMarkerHighlight(isNearFirstPoint(event.latlng));
    });
  }

  function locateMe() {
    const map = mapRef.current;
    if (!map) return;

    if (!navigator.geolocation) {
      showToast('Trình duyệt không hỗ trợ định vị.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        map.setView([lat, lng], 16);

        if (locateMarkerRef.current) map.removeLayer(locateMarkerRef.current);
        locateMarkerRef.current = L.circleMarker([lat, lng], { radius: 8, color: '#fff', weight: 2, fillColor: '#1D4E89', fillOpacity: 1 }).addTo(
          map
        );
      },
      (error) => {
        let message = 'Không lấy được vị trí của bạn.';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Bạn chưa cho phép truy cập vị trí — hãy cấp quyền rồi thử lại.';
        }
        showToast(message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleUndoPoint() {
    // Đã khép kín thì lần bấm "Lùi 1 điểm" đầu tiên chỉ mở lại ranh giới
    // (không xoá điểm nào) — khớp đúng cách hiểu "lùi lại thao tác vừa làm".
    if (boundaryClosed) {
      setBoundaryClosed(false);
    } else {
      setPoints((prev) => prev.slice(0, -1));
    }
  }

  function handleClearPoints() {
    setPoints([]);
    setBoundaryClosed(false);
    setPendingRows([]);
    setManualError('');
    clearGuideLine();
  }

  function handleRemovePoint(index: number) {
    // Xoá bất kỳ điểm nào (kể cả điểm đầu tiên) làm mất căn cứ đã khép kín
    // trước đó — mở lại về trạng thái đang vẽ, giống "Lùi 1 điểm".
    setPoints((prev) => prev.filter((_, i) => i !== index));
    setBoundaryClosed(false);
  }

  function handleApplyArea() {
    // Làm tròn 4 chữ số: thửa nhỏ vẫn giữ được độ chính xác có nghĩa.
    const value = hectares(geodesicArea(points)).toFixed(4);
    onApplyArea(value);
    showToast('Đã điền diện tích từ ranh giới.');
  }

  function handleAddManualPoint() {
    setPendingRows((prev) => [...prev, { lat: '', lng: '' }]);
  }

  function handleRemovePendingRow(index: number) {
    setPendingRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePendingRow(index: number, patch: Partial<ManualRow>) {
    setPendingRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  /* --- Nhập ranh giới bằng toạ độ thủ công (cách 2, song song với bấm bản
     đồ) — validate rồi thay thế hẳn `points` + khép kín NGAY (khác luồng
     bấm bản đồ phải bấm lại điểm đầu): người dùng gõ tay nghĩa là đã biết đủ
     toàn bộ ranh giới, không cần thao tác khép thêm. */
  function handleApplyManualCoordinates() {
    const parsed: FarmPoint[] = [];
    let errorMessage = '';

    for (const row of pendingRows) {
      const latText = row.lat.trim();
      const lngText = row.lng.trim();
      if (!latText && !lngText) continue; // dòng bỏ trống hoàn toàn -> bỏ qua, không tính là lỗi

      const lat = Number(latText);
      const lng = Number(lngText);

      if (!latText || !lngText) {
        errorMessage = 'Nhập đủ cả vĩ độ và kinh độ.';
        break;
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        errorMessage = 'Toạ độ phải là số hợp lệ.';
        break;
      }
      if (lat < -90 || lat > 90) {
        errorMessage = 'Vĩ độ phải trong khoảng -90 đến 90.';
        break;
      }
      if (lng < -180 || lng > 180) {
        errorMessage = 'Kinh độ phải trong khoảng -180 đến 180.';
        break;
      }
      parsed.push({ lat, lng });
    }

    if (errorMessage) {
      setManualError(errorMessage);
      return;
    }
    if (parsed.length < 3) {
      setManualError('Cần ít nhất 3 điểm có đủ toạ độ để hiển thị ranh giới.');
      return;
    }

    setManualError('');
    setPoints(parsed);
    setPendingRows([]);
    setBoundaryClosed(true);

    const map = mapRef.current;
    if (map) {
      const bounds = L.latLngBounds(parsed.map((p): L.LatLngTuple => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [24, 24] });
    }

    showToast('Đã hiển thị ranh giới từ toạ độ đã nhập.');
  }

  useImperativeHandle(ref, () => ({
    getPoints: () => pointsRef.current,
    isBoundaryClosed: () => boundaryClosedRef.current,
    initialize(initialPoints: FarmPoint[]) {
      setPoints(initialPoints);
      // Ranh giới đã lưu từ trước (sửa nông trại có sẵn) coi như đã khép
      // kín — hiện luôn dạng vùng tô nền + diện tích, không bắt vẽ/khép lại
      // từ đầu, khớp openModal() gốc.
      setBoundaryClosed(initialPoints.length >= 3);
      setPendingRows([]);
      setManualError('');
      clearGuideLine();
    },
    ensureMapReady(hasInitialPoints: boolean) {
      mountMapIfNeeded();
      const map = mapRef.current;
      if (!map) return;
      map.invalidateSize();
      // Sửa nông trại đã có ranh giới: phóng tới đúng vị trí của nó thay vì
      // giữ nguyên khung nhìn còn sót lại từ lần mở modal trước.
      if (hasInitialPoints && pointsRef.current.length) {
        const bounds = L.latLngBounds(pointsRef.current.map((p): L.LatLngTuple => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [24, 24] });
      }
    }
  }));

  // Dọn đường nét đứt gợi ý khi component unmount (tương đương sự kiện
  // 'close' của <dialog> gốc — ở đây modal luôn mounted, nhưng vẫn dọn sạch
  // Leaflet map lúc rời hẳn trang để tránh rò rỉ bộ nhớ).
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const hasArea = points.length >= 3;

  return (
    <div className="map-layout">
      <div className="map-side">
        <div className="map-side__head">
          <span className="map-side__title">Danh sách toạ độ</span>
          <div className="map-side__actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={handleUndoPoint}>
              Lùi 1 điểm
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={handleClearPoints}>
              Xoá hết
            </button>
          </div>
        </div>

        {!points.length && !pendingRows.length ? (
          <p className="coord-empty">Chưa đánh dấu điểm nào.</p>
        ) : (
          <ol className="coord-list">
            {points.map((point, index) => (
              <li className="coord-item" key={`point-${index}`}>
                <span className="coord-item__index">{index + 1}</span>
                {/* Chỉ đọc — port đúng hành vi gốc: ô toạ độ của điểm ĐÃ đặt
                    hiện giá trị nhưng không có xử lý sửa trực tiếp (chỉ
                    xoá + đặt lại qua bản đồ/nhập thủ công). */}
                <input className="input coord-item__input" type="number" step="any" aria-label={`Vĩ độ điểm ${index + 1}`} value={point.lat} readOnly />
                <input className="input coord-item__input" type="number" step="any" aria-label={`Kinh độ điểm ${index + 1}`} value={point.lng} readOnly />
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  aria-label={`Xoá điểm ${index + 1}`}
                  data-tooltip="Xoá điểm"
                  onClick={() => handleRemovePoint(index)}
                >
                  <Icon name="trash" />
                </button>
              </li>
            ))}
            {pendingRows.map((row, pendingIndex) => (
              <li className="coord-item coord-item--pending" key={`pending-${pendingIndex}`}>
                <span className="coord-item__index">{points.length + pendingIndex + 1}</span>
                <input
                  className="input coord-item__input"
                  type="number"
                  step="any"
                  placeholder="Vĩ độ"
                  aria-label={`Vĩ độ điểm ${points.length + pendingIndex + 1}`}
                  value={row.lat}
                  onChange={(e) => updatePendingRow(pendingIndex, { lat: e.target.value })}
                />
                <input
                  className="input coord-item__input"
                  type="number"
                  step="any"
                  placeholder="Kinh độ"
                  aria-label={`Kinh độ điểm ${points.length + pendingIndex + 1}`}
                  value={row.lng}
                  onChange={(e) => updatePendingRow(pendingIndex, { lng: e.target.value })}
                />
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  aria-label={`Xoá điểm ${points.length + pendingIndex + 1}`}
                  data-tooltip="Xoá điểm"
                  onClick={() => handleRemovePendingRow(pendingIndex)}
                >
                  <Icon name="trash" />
                </button>
              </li>
            ))}
          </ol>
        )}

        {manualError && <p className="field__error">{manualError}</p>}

        <div className="map-side__actions">
          <button type="button" className="btn btn--outline btn--sm" onClick={handleAddManualPoint}>
            <Icon name="plus" className="icon--sm" />
            Thêm điểm
          </button>
          <button type="button" className="btn btn--secondary btn--sm" onClick={handleApplyManualCoordinates}>
            Hiển thị
          </button>
        </div>

        {hasArea && (
          <div className={`map-area${boundaryClosed ? '' : ' map-area--pending'}`}>
            <span className="map-area__label">Diện tích tính từ ranh giới</span>
            <strong className="map-area__value">{boundaryClosed ? formatHectares(hectares(geodesicArea(points))) : 'Chưa khép kín'}</strong>
            <button type="button" className="btn btn--outline btn--sm" disabled={!boundaryClosed} onClick={handleApplyArea}>
              Điền vào ô diện tích
            </button>
          </div>
        )}
      </div>

      <div className="map-canvas" ref={containerRef} />
    </div>
  );
});
