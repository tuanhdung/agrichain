// Port modal "Thêm/sửa nông trại" (farm-modal) trong nong-trai.html +
// js/nong-trai.js (openModal/validate/handleSubmit). Markup/class giữ
// NGUYÊN (.modal.modal--wide, .form-section, .form-grid, .notice, .field...).
import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { Farm, FarmPayload } from '../../api';
import { useCascadingSelect } from '../../hooks/useCascadingSelect';
import { useToast } from '../../components/ToastProvider';
import { loadProvinces, loadWards, type Province } from './locationData';
import { BoundaryEditor, type BoundaryEditorHandle } from './BoundaryEditor';
import './map-layout.css';

export type FarmModalMode = 'create' | 'edit';

interface FarmFormModalProps {
  dialogRef: RefObject<HTMLDialogElement>;
  mode: FarmModalMode;
  farm: Farm | null; // null khi mode === 'create'
  suggestedCode: string; // gợi ý mã khi mode === 'create' — chỉ là gợi ý, backend tự kiểm tra trùng thật
  // Tăng mỗi lần formModal.open() được gọi THẬT (useDialog()'s openCount) —
  // BẮT BUỘC phải nằm trong dependency array của effect bên dưới, KHÔNG chỉ
  // dựa vào farm/mode: bấm "Thêm nông trại" làm đầu tiên trên trang (farm
  // vẫn null, mode vẫn 'create' — trùng hệt giá trị mặc định lúc mount) sẽ
  // giữ nguyên farm/mode/suggestedCode so với lần render trước, khiến React
  // BỎ QUA effect (Object.is coi là không đổi) — ensureMapReady() không bao
  // giờ chạy cho lần mở đó nếu chỉ dựa vào 3 dependency kia. Xem lịch sử bug
  // "bản đồ chỉ tải tile góc trên-trái, toạ độ lệch" trong app/CLAUDE.md.
  openToken: number;
  onClose: () => void;
  onSaved: () => void;
}

interface FieldErrors {
  code?: string;
  name?: string;
  national_puc?: string;
  international_puc?: string;
  province?: string;
  ward?: string;
  address?: string;
  start_date?: string;
  area?: string;
  description?: string;
}

const KNOWN_FIELDS = new Set<keyof FieldErrors>([
  'code',
  'name',
  'national_puc',
  'international_puc',
  'province',
  'ward',
  'address',
  'start_date',
  'area',
  'description'
]);

const WARD_PLACEHOLDER: Record<string, string> = {
  'no-parent': '— Chọn tỉnh/thành phố trước —',
  loading: 'Đang tải...',
  ready: '— Chọn phường/xã —',
  error: '— Không tải được —'
};

export function FarmFormModal({ dialogRef, mode, farm, suggestedCode, openToken, onClose, onSaved }: FarmFormModalProps) {
  const { showToast } = useToast();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nationalPuc, setNationalPuc] = useState('');
  const [internationalPuc, setInternationalPuc] = useState('');
  const [province, setProvince] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [area, setArea] = useState('0');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [boundaryError, setBoundaryError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const wardCascade = useCascadingSelect<{ id: string; name: string; provinceId: string }>({
    loadChildren: (provinceCode) => loadWards(provinceCode),
    getOptionValue: (w) => w.name,
    getOptionLabel: (w) => w.name
  });

  const boundaryRef = useRef<BoundaryEditorHandle>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Tải danh sách tỉnh/thành 1 LẦN lúc trang khởi động (khớp fillProvinces()
  // gốc, gọi trong DOMContentLoaded của trang, không phải mỗi lần mở modal)
  // — modal luôn ở trong DOM (useDialog(), chỉ ẩn/hiện qua showModal()/close()),
  // nên effect [] này CŨNG chỉ chạy đúng 1 lần suốt vòng đời trang, đúng ý.
  useEffect(() => {
    loadProvinces()
      .then(setProvinces)
      .catch(() => {
        // Toast dùng chung không cần thiết ở đây — lỗi hiện trực tiếp qua ô
        // select rỗng, khớp mức độ nghiêm trọng của bản gốc (chỉ toast).
      });
  }, []);

  function provinceCodeOf(provinceName: string): string {
    return provinces.find((p) => p.name === provinceName)?.id ?? '';
  }

  // Nạp lại giá trị mỗi khi mở modal cho đúng bản ghi đang sửa — reset hẳn
  // form, khớp form.reset() + resetShape() gốc.
  useEffect(() => {
    setErrors({});
    setBoundaryError(false);

    if (farm) {
      setCode(farm.code);
      setName(farm.name);
      setNationalPuc(farm.national_puc ?? '');
      setInternationalPuc(farm.international_puc ?? '');
      setProvince(farm.province ?? '');
      setAddress(farm.address ?? '');
      setStartDate(farm.start_date ?? '');
      setArea(farm.area != null ? String(farm.area) : '0');
      setDescription(farm.description ?? '');
      // wardCascade.refresh() cần biết MÃ tỉnh — provinces có thể chưa tải
      // xong tại thời điểm này (race hiếm khi mở modal ngay lúc trang vừa
      // vào) — provinceCodeOf() trả '' nếu chưa có, refresh('') tự set về
      // trạng thái "chưa chọn tỉnh" thay vì gọi API với mã rỗng.
      wardCascade.refresh(provinceCodeOf(farm.province ?? ''), farm.ward ?? undefined);
    } else {
      setCode(suggestedCode);
      setName('');
      setNationalPuc('');
      setInternationalPuc('');
      setProvince('');
      setAddress('');
      setStartDate('');
      setArea('0');
      setDescription('');
      wardCascade.refresh(''); // reset phường/xã về trạng thái "chưa chọn tỉnh"
    }

    const initialPoints = farm?.polygon ? farm.polygon.slice() : [];
    boundaryRef.current?.initialize(initialPoints);

    // Chỉ sau khi <dialog> đã showModal() (do component cha gọi ngay sau khi
    // đổi farm/mode) thì khung bản đồ mới có kích thước thật —
    // requestAnimationFrame đợi trình duyệt vẽ xong khung rồi mới đo, khớp
    // ensureMap()+invalidateSize() gốc.
    //
    // ⚠️ Guard `dialogRef.current?.open` — bug THẬT đã gặp: effect này CŨNG
    // chạy ngay lúc component MOUNT (farm=null/mode='create' mặc định), TRƯỚC
    // KHI người dùng bấm mở modal lần nào — lúc đó <dialog> vẫn đóng
    // (container 0×0). Gọi ensureMapReady() (mountMapIfNeeded() bên trong)
    // với container 0×0 làm Leaflet tính sai lưới tile/pixel origin NGAY LÚC
    // KHỞI TẠO map — vì map chỉ được tạo (new L.Map) ĐÚNG 1 LẦN (guard
    // `mapRef.current` trong mountMapIfNeeded), lỗi này không tự phục hồi ở
    // các lần mở sau dù có gọi lại invalidateSize() (hiện tượng: bản đồ chỉ
    // tải tile ở góc trên-trái, toạ độ bấm quy đổi sai). Bỏ qua hẳn nếu
    // <dialog> chưa thật sự mở.
    if (dialogRef.current?.open) {
      requestAnimationFrame(() => {
        if (!dialogRef.current?.open) return; // modal đã đóng lại trước khi kịp raf (đóng rất nhanh) — khỏi khởi tạo map vô ích
        boundaryRef.current?.ensureMapReady(initialPoints.length > 0);
      });
    }

    nameInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lại khi farm/mode/openToken đổi (mở modal), không phải mỗi lần provinces/wardCascade đổi
  }, [farm, mode, suggestedCode, openToken]);

  function handleProvinceChange(nextProvince: string) {
    setProvince(nextProvince);
    wardCascade.refresh(provinceCodeOf(nextProvince)); // đổi cha bằng tay -> luôn bỏ trống con
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!code.trim()) next.code = 'Nhập mã nông trại.';
    if (!name.trim()) next.name = 'Nhập tên nông trại.';
    if (!province) next.province = 'Chọn tỉnh/thành phố.';
    if (!wardCascade.childValue.trim()) next.ward = 'Nhập phường/xã.';
    if (!address.trim()) next.address = 'Nhập địa chỉ.';
    if (!startDate) next.start_date = 'Chọn ngày bắt đầu.';
    if (!area.trim()) next.area = 'Nhập diện tích.';
    if (!description.trim()) next.description = 'Nhập mô tả.';

    // `polygon` BẮT BUỘC (NOT NULL trong migration backend) — không chỉ cần
    // đủ 3 điểm, phải đã bấm lại điểm đầu tiên để KHÉP KÍN thật sự mới coi
    // là hợp lệ (đường mở dù đủ điểm vẫn chưa phải 1 ranh giới hoàn chỉnh).
    const boundaryValid = boundaryRef.current?.isBoundaryClosed() ?? false;
    setBoundaryError(!boundaryValid);

    setErrors(next);
    return Object.keys(next).length === 0 && boundaryValid;
  }

  function fieldRefFor(fieldName: keyof FieldErrors): HTMLElement | null {
    const map: Record<keyof FieldErrors, string> = {
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
    return document.getElementById(map[fieldName]);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) {
      const firstErrorField = (Object.keys(errors) as (keyof FieldErrors)[])[0];
      if (firstErrorField) fieldRefFor(firstErrorField)?.focus();
      return;
    }

    const payload: FarmPayload = {
      code: code.trim(),
      name: name.trim(),
      national_puc: nationalPuc.trim() || null,
      international_puc: internationalPuc.trim() || null,
      province,
      ward: wardCascade.childValue.trim(),
      address: address.trim(),
      start_date: startDate,
      area: Number(area) || 0,
      description: description.trim(),
      polygon: boundaryRef.current?.getPoints() ?? []
    };

    setSubmitting(true);
    const request = mode === 'edit' && farm ? api.farms.update(farm.id, payload) : api.farms.create(payload);

    request
      .then(() => {
        onClose();
        onSaved();
      })
      .catch((err: unknown) => {
        const apiErr = err instanceof ApiError ? err : null;
        const field = apiErr?.details?.field as keyof FieldErrors | undefined;
        if (field && KNOWN_FIELDS.has(field)) {
          setErrors((prev) => ({ ...prev, [field]: apiErr!.message }));
          fieldRefFor(field)?.focus();
        }
        // toast lỗi chung do App Shell's ToastProvider xử lý qua onSaved()
        // caller — nhưng lỗi field-cụ-thể đã hiện tại chỗ, không cần toast
        // trùng lặp. Lỗi KHÔNG map được field thì vẫn cần báo — dùng window
        // alert-free toast qua showToast ở component cha nếu cần; ở đây giữ
        // Lỗi field-cụ-thể đã hiện tại chỗ (nhánh trên) — lỗi KHÔNG map được
        // field (VD lỗi chung, hoặc field lạ) thì vẫn phải báo, khớp nhánh
        // else global.AgriChain.toast(err.message) của bản gốc.
        if (!field || !KNOWN_FIELDS.has(field)) {
          showToast(apiErr?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
        }
      })
      .finally(() => setSubmitting(false));
  }

  const submitLabel = submitting ? 'Đang lưu...' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu nông trại';
  const title = mode === 'edit' ? 'Cập nhật nông trại' : 'Thêm nông trại mới';

  return (
    <dialog className="modal modal--wide" ref={dialogRef} aria-labelledby="farm-modal-title">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="modal__header">
          <Icon name="seedling" />
          <h2 className="modal__title" id="farm-modal-title">
            {title}
          </h2>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal__body">
          <section className="form-section">
            <h3 className="form-section__title">
              <Icon name="leaf" className="icon--sm" />
              Thông tin cơ bản
            </h3>
            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="farm-code">
                  Mã nông trại
                </label>
                <input className="input" type="text" id="farm-code" value={code} aria-invalid={errors.code ? 'true' : undefined} onChange={(e) => setCode(e.target.value)} />
                <p className="field__hint">Mã ngắn dùng nội bộ, ví dụ NV01.</p>
                {errors.code && <p className="field__error">{errors.code}</p>}
              </div>

              <div className="field">
                <label className="label" htmlFor="farm-name">
                  Tên nông trại
                </label>
                <input
                  className="input"
                  type="text"
                  id="farm-name"
                  ref={nameInputRef}
                  value={name}
                  aria-invalid={errors.name ? 'true' : undefined}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <p className="field__error">{errors.name}</p>}
              </div>

              <div className="field">
                <label className="label" htmlFor="farm-puc-national">
                  Mã vùng trồng quốc gia
                </label>
                <input
                  className="input"
                  type="text"
                  id="farm-puc-national"
                  value={nationalPuc}
                  aria-invalid={errors.national_puc ? 'true' : undefined}
                  onChange={(e) => setNationalPuc(e.target.value)}
                />
                <p className="field__hint">Mã do Cục Bảo vệ thực vật cấp. Để trống nếu chưa có.</p>
                {errors.national_puc && <p className="field__error">{errors.national_puc}</p>}
              </div>

              <div className="field">
                <label className="label" htmlFor="farm-puc-international">
                  Mã vùng trồng quốc tế
                </label>
                <input
                  className="input"
                  type="text"
                  id="farm-puc-international"
                  value={internationalPuc}
                  aria-invalid={errors.international_puc ? 'true' : undefined}
                  onChange={(e) => setInternationalPuc(e.target.value)}
                />
                <p className="field__hint">Dùng khi xuất khẩu sang thị trường yêu cầu mã riêng.</p>
                {errors.international_puc && <p className="field__error">{errors.international_puc}</p>}
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3 className="form-section__title">
              <Icon name="map-pin" className="icon--sm" />
              Vị trí địa lý
            </h3>
            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="farm-province">
                  Tỉnh/Thành phố
                </label>
                <select className="select" id="farm-province" value={province} aria-invalid={errors.province ? 'true' : undefined} onChange={(e) => handleProvinceChange(e.target.value)}>
                  <option value="">— Chọn tỉnh/thành phố —</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {errors.province && <p className="field__error">{errors.province}</p>}
              </div>

              <div className="field">
                <label className="label" htmlFor="farm-ward">
                  Phường/Xã
                </label>
                <select
                  className="select"
                  id="farm-ward"
                  value={wardCascade.childValue}
                  disabled={wardCascade.status !== 'ready'}
                  aria-invalid={errors.ward ? 'true' : undefined}
                  onChange={(e) => wardCascade.setChildValue(e.target.value)}
                >
                  <option value="">{WARD_PLACEHOLDER[wardCascade.status]}</option>
                  {wardCascade.status === 'ready' &&
                    wardCascade.children.map((w) => (
                      <option key={w.id} value={wardCascade.getOptionValue(w)}>
                        {wardCascade.getOptionLabel(w)}
                      </option>
                    ))}
                </select>
                {errors.ward && <p className="field__error">{errors.ward}</p>}
                {wardCascade.status === 'error' && <p className="field__error">Không tải được danh sách phường/xã. Thử chọn lại tỉnh/thành phố.</p>}
              </div>

              <div className="field form-grid__full">
                <label className="label" htmlFor="farm-address">
                  Địa chỉ
                </label>
                <input
                  className="input"
                  type="text"
                  id="farm-address"
                  value={address}
                  aria-invalid={errors.address ? 'true' : undefined}
                  onChange={(e) => setAddress(e.target.value)}
                />
                <p className="field__hint">Thôn, xóm, số thửa — phần chi tiết nằm trước phường/xã.</p>
                {errors.address && <p className="field__error">{errors.address}</p>}
              </div>

              <div className="field">
                <label className="label" htmlFor="farm-start-date">
                  Ngày bắt đầu
                </label>
                <input
                  className="input"
                  type="date"
                  id="farm-start-date"
                  value={startDate}
                  aria-invalid={errors.start_date ? 'true' : undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                {errors.start_date && <p className="field__error">{errors.start_date}</p>}
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3 className="form-section__title">
              <Icon name="chart-bar" className="icon--sm" />
              Mô tả diện tích
            </h3>
            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="farm-area">
                  Diện tích
                </label>
                <div className="input-affix">
                  <input
                    className="input"
                    type="number"
                    id="farm-area"
                    min="0"
                    step="0.01"
                    value={area}
                    aria-invalid={errors.area ? 'true' : undefined}
                    onChange={(e) => setArea(e.target.value)}
                    // Port setupZeroDefaultInputs() (js/app-shell.js gốc) —
                    // input số mặc định "0" (diện tích) thì bấm vào gõ ngay
                    // hay bị dính thành "05"/"012" vì con 0 cũ không tự mất
                    // trước khi gõ; focus vào thì chọn sẵn toàn bộ nội dung,
                    // gõ số là thay thế luôn. Bản gốc là listener TOÀN TRANG
                    // (mọi input[type=number]) — app/ hiện CHỈ có đúng ô này
                    // là input số, nên port cục bộ ngay tại đây thay vì dựng
                    // hook dùng chung cho 1 nơi dùng duy nhất (xem
                    // app/CLAUDE.md mục "Trang /nong-trai").
                    onFocus={(e) => {
                      if (e.target.value === '0') e.target.select();
                    }}
                  />
                  <span className="input-affix__unit">ha</span>
                </div>
                {errors.area && <p className="field__error">{errors.area}</p>}
              </div>

              <div className="field form-grid__full">
                <label className="label" htmlFor="farm-description">
                  Mô tả
                </label>
                <textarea
                  className="textarea"
                  id="farm-description"
                  placeholder="Loại cây trồng, quy mô, đặc điểm thổ nhưỡng..."
                  value={description}
                  aria-invalid={errors.description ? 'true' : undefined}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {errors.description && <p className="field__error">{errors.description}</p>}
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3 className="form-section__title">
              <Icon name="map-pin" className="icon--sm" />
              Ranh giới thửa đất (Polygon)
            </h3>

            <div className="notice notice--info" style={{ marginBottom: 'var(--space-4)' }}>
              <Icon name="map-pin" className="icon--sm" />
              <span>
                Nhấp lên bản đồ để đánh dấu từng góc. Bấm lại vào điểm đầu tiên để khép kín ranh giới và tính diện
                tích — hoặc nhập trực tiếp toạ độ từng điểm vào danh sách bên dưới rồi bấm "Hiển thị".
              </span>
            </div>

            {boundaryError && (
              <p className="field__error" style={{ marginBottom: 'var(--space-4)' }}>
                Vẽ ít nhất 3 điểm rồi bấm lại vào điểm đầu tiên để khép kín ranh giới thửa đất.
              </p>
            )}

            <BoundaryEditor ref={boundaryRef} onApplyArea={setArea} />
          </section>
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
