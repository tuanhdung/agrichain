// Port modal "Thêm/Sửa nhật ký mùa vụ" (season-log-modal) + phần tương ứng
// của js/nong-trai-chi-tiet.js (openSeasonLogModal/validateSeasonLog/
// handleSeasonLogSubmit + phần "Vật tư sử dụng"/"Hình ảnh minh họa"). Markup/
// class giữ NGUYÊN (.form-section, .log-materials__*, .log-material-row,
// .log-images__*, .log-image-thumb*).
//
// `step_id` — luôn `null` khi mở từ tab "Timeline mùa vụ" (thêm nhật ký tự
// do), nhưng khi mở từ nút "Ghi nhật ký & hoàn thành" ở tab "Quy trình mùa
// vụ" (Bước 5, xem SeasonViewModal.tsx's startStepCompletion()) thì
// `prefillActivityType`/`prefillDescription` được điền sẵn từ bước đang hoàn
// thành — khớp startStepCompletion() gốc (`activityTypeSelect.value =
// step.activity_type; ...description...= step.instruction`). `onSaved` trả
// về `Log` vừa lưu để nơi gọi tự quyết định có cần đánh dấu hoàn thành bước
// quy trình hay không (completeWorkflowStep(), xem SeasonViewModal.tsx) —
// bản thân modal này KHÔNG biết gì về khái niệm "quy trình".
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { RefObject } from 'react';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { Log, LogPayload, LogSupply, Supply } from '../../api';
import { useToast } from '../../components/ToastProvider';
import { ACTIVITY_TYPES } from '../../enums';
import { MATERIAL_METHODS, MATERIAL_UNITS, MAX_LOG_IMAGES, MAX_LOG_IMAGE_BYTES } from './constants';
import { toDatetimeLocalValue } from './format';

export type LogModalMode = 'create' | 'edit';

interface LogFormModalProps {
  dialogRef: RefObject<HTMLDialogElement>;
  mode: LogModalMode;
  log: Log | null;
  seasonId: string;
  supplies: Supply[];
  // 3 prop dưới CHỈ áp dụng khi mode === 'create' — mở từ "Ghi nhật ký & hoàn
  // thành" (Bước 5). Bỏ trống = hành vi "thêm nhật ký tự do" như cũ.
  prefillActivityType?: string;
  prefillDescription?: string;
  // Gắn thẳng vào LogPayload.step_id lúc TẠO — khớp
  // `record.step_id = stepToComplete || null` gốc (chỉ áp dụng lúc tạo mới,
  // KHÔNG áp dụng khi sửa nhật ký có sẵn — modal tự bỏ qua giá trị này nếu
  // mode === 'edit').
  completingStepId?: string | null;
  openToken: number;
  onClose: () => void;
  onSaved: (savedLog: Log) => void;
}

interface FieldErrors {
  activity_type?: string;
  performed_at?: string;
  performed_by?: string;
  weather?: string;
  description?: string;
}

const FIELD_MAP: Record<string, keyof FieldErrors> = {
  activity_type: 'activity_type',
  performed_at: 'performed_at',
  performed_by: 'performed_by',
  weather: 'weather',
  description: 'description'
};

interface MaterialRowState {
  _key: string;
  supplyId: string;
  quantity: string;
  unit: string;
  method: string;
  purpose: string;
}

interface SelectedImage {
  name: string;
  dataUrl: string;
}

let materialKeyCounter = 0;
function nextMaterialKey(): string {
  materialKeyCounter += 1;
  return `material-${materialKeyCounter}`;
}

function unitOfSupply(supplies: Supply[], supplyId: string): string {
  const supply = supplies.find((s) => s.id === supplyId);
  return supply ? supply.unit : '';
}

export function LogFormModal({
  dialogRef,
  mode,
  log,
  seasonId,
  supplies,
  prefillActivityType,
  prefillDescription,
  completingStepId,
  openToken,
  onClose,
  onSaved
}: LogFormModalProps) {
  const { showToast } = useToast();

  const [activityType, setActivityType] = useState(ACTIVITY_TYPES[0].key);
  const [performedAt, setPerformedAt] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [weather, setWeather] = useState('');
  const [description, setDescription] = useState('');
  const [materials, setMaterials] = useState<MaterialRowState[]>([]);
  const [images, setImages] = useState<SelectedImage[]>([]);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setErrors({});
    setMaterials([]);
    setImages([]);

    if (log) {
      setActivityType(log.activity_type);
      setPerformedAt(toDatetimeLocalValue(log.performed_at));
      setPerformedBy(log.performed_by);
      setWeather(log.weather || '');
      setDescription(log.description || '');
      setMaterials(
        (log.supplies || []).map((supply) => ({
          _key: nextMaterialKey(),
          supplyId: supply.supply_id,
          quantity: supply.quantity != null ? String(supply.quantity) : '',
          unit: supply.unit || MATERIAL_UNITS[0],
          method: supply.method || '',
          purpose: supply.purpose || ''
        }))
      );

      // Danh sách chỉ có metadata ảnh — tải chi tiết để lấy nội dung thật
      // (url) rồi mới điền vào khung xem trước, khớp openSeasonLogModal() gốc.
      if (log.images && log.images.length) {
        api.logs
          .get(log.id)
          .then((detail) => {
            setImages((detail.images || []).map((image) => ({ name: image.name, dataUrl: image.url })));
          })
          .catch((err: unknown) => {
            showToast(`Không tải được ảnh của nhật ký: ${err instanceof ApiError ? err.message : 'Có lỗi xảy ra.'}`);
          });
      }
    } else {
      setActivityType(prefillActivityType || ACTIVITY_TYPES[0].key);
      setPerformedAt('');
      setPerformedBy('');
      setWeather('');
      setDescription(prefillDescription || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openToken buộc effect chạy lại đúng 1 lần/lần mở thật (cùng lớp bug đã vá ở /nong-trai/CertificationFormModal.tsx), showToast không cần theo dõi
  }, [log, mode, openToken]);

  function addMaterialRow() {
    setMaterials((prev) => [...prev, { _key: nextMaterialKey(), supplyId: '', quantity: '', unit: MATERIAL_UNITS[0], method: '', purpose: '' }]);
  }

  function updateMaterial(key: string, patch: Partial<MaterialRowState>) {
    setMaterials((prev) => prev.map((row) => (row._key === key ? { ...row, ...patch } : row)));
  }

  function removeMaterial(key: string) {
    setMaterials((prev) => prev.filter((row) => row._key !== key));
  }

  // Chọn vật tư thì tự gợi ý đơn vị của đúng vật tư đó — vẫn chọn lại được
  // tay nếu ghi nhận theo đơn vị khác cho lần dùng này, khớp bản gốc.
  function handleSupplyChange(key: string, supplyId: string) {
    const unit = unitOfSupply(supplies, supplyId);
    setMaterials((prev) => prev.map((row) => (row._key === key ? { ...row, supplyId, unit: unit || row.unit } : row)));
  }

  function handleImagesInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || !files.length) return;

    const accepted: File[] = [];
    const rejectedTooLarge: string[] = [];
    Array.from(files).forEach((file) => {
      if (file.size > MAX_LOG_IMAGE_BYTES) rejectedTooLarge.push(file.name);
      else accepted.push(file);
    });

    if (rejectedTooLarge.length) {
      showToast(`Bỏ qua ${rejectedTooLarge.length} ảnh vượt quá 2MB: ${rejectedTooLarge.join(', ')}`);
    }

    const remainingSlots = MAX_LOG_IMAGES - images.length;
    if (remainingSlots <= 0) {
      showToast(`Mỗi nhật ký tối đa ${MAX_LOG_IMAGES} ảnh — xoá bớt ảnh cũ trước khi thêm mới.`);
      event.target.value = '';
      return;
    }

    let toAccept = accepted;
    if (accepted.length > remainingSlots) {
      showToast(`Chỉ thêm được ${remainingSlots} ảnh nữa (tối đa ${MAX_LOG_IMAGES} ảnh/nhật ký).`);
      toAccept = accepted.slice(0, remainingSlots);
    }

    toAccept.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [...prev, { name: file.name, dataUrl: String(reader.result) }]);
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    const nextErrors: FieldErrors = {};
    if (!performedAt) nextErrors.performed_at = 'Chọn thời gian thực hiện.';
    if (!performedBy.trim()) nextErrors.performed_by = 'Nhập người thực hiện.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    const supplyRows: LogSupply[] = materials
      .filter((row) => row.supplyId)
      .map((row) => {
        const supply = supplies.find((s) => s.id === row.supplyId);
        if (!supply) return null;
        const item: LogSupply = {
          supply_id: supply.id,
          code: supply.code,
          name: supply.name,
          quantity: Number(row.quantity) || 0,
          unit: row.unit,
          method: row.method || null,
          purpose: row.purpose.trim() || null
        };
        return item;
      })
      .filter((row): row is LogSupply => row !== null);

    const record: LogPayload = {
      // Chỉ gắn step_id khi TẠO MỚI từ luồng "Ghi nhật ký & hoàn thành" —
      // khớp `!editingLogId ? completingStepId : null` gốc.
      step_id: mode === 'create' ? completingStepId ?? null : null,
      activity_type: activityType,
      // Gửi thẳng giá trị datetime-local ("YYYY-MM-DDTHH:mm"), không tự quy
      // đổi múi giờ — backend hiểu chuỗi không kèm múi giờ là giờ Việt Nam
      // (+07:00), đúng ý người dùng nhập trên form.
      performed_at: performedAt,
      performed_by: performedBy.trim(),
      weather: weather.trim() || null,
      description: description.trim() || null,
      supplies: supplyRows,
      images: images.map((image) => ({ name: image.name, url: image.dataUrl }))
    };

    setSubmitting(true);
    const request = mode === 'edit' && log ? api.logs.update(log.id, record) : api.logs.create({ ...record, season_id: seasonId });

    request
      .then((savedLog) => {
        onClose();
        onSaved(savedLog);
        showToast(mode === 'edit' ? 'Đã lưu thay đổi.' : 'Đã thêm nhật ký.');
      })
      .catch((err: unknown) => {
        const apiErr = err instanceof ApiError ? err : null;
        const backendField = apiErr?.details?.field as string | undefined;
        const mapped = backendField ? FIELD_MAP[backendField] : undefined;
        if (mapped) {
          setErrors((prev) => ({ ...prev, [mapped]: apiErr!.message }));
        } else {
          showToast(apiErr?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
        }
      })
      .finally(() => setSubmitting(false));
  }

  const title = mode === 'edit' ? 'Sửa nhật ký mùa vụ' : 'Thêm mới nhật ký mùa vụ';
  const submitLabel = submitting ? 'Đang lưu...' : 'Xác nhận';

  return (
    <dialog className="modal" ref={dialogRef} aria-labelledby="season-log-modal-title">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="modal__header">
          <Icon name="calendar" />
          <h2 className="modal__title" id="season-log-modal-title">
            {title}
          </h2>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal__body">
          <section className="form-section">
            <h3 className="form-section__title">
              <Icon name="shield-check" className="icon--sm" />
              Thông tin hoạt động
            </h3>

            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="log-activity-type">
                  Loại hoạt động
                </label>
                <select className="select" id="log-activity-type" value={activityType} onChange={(e) => setActivityType(e.target.value)}>
                  {ACTIVITY_TYPES.map((type) => (
                    <option key={type.key} value={type.key}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="label" htmlFor="log-performed-at">
                  Thời gian thực hiện
                </label>
                <input
                  className="input"
                  type="datetime-local"
                  id="log-performed-at"
                  value={performedAt}
                  aria-invalid={errors.performed_at ? 'true' : undefined}
                  onChange={(e) => setPerformedAt(e.target.value)}
                />
                {errors.performed_at && <p className="field__error">{errors.performed_at}</p>}
              </div>

              <div className="field">
                <label className="label" htmlFor="log-performed-by">
                  Người thực hiện
                </label>
                <input
                  className="input"
                  type="text"
                  id="log-performed-by"
                  value={performedBy}
                  aria-invalid={errors.performed_by ? 'true' : undefined}
                  onChange={(e) => setPerformedBy(e.target.value)}
                />
                {errors.performed_by && <p className="field__error">{errors.performed_by}</p>}
              </div>

              <div className="field">
                <label className="label" htmlFor="log-weather">
                  Điều kiện thời tiết
                </label>
                <input className="input" type="text" id="log-weather" value={weather} onChange={(e) => setWeather(e.target.value)} />
              </div>

              <div className="field form-grid__full">
                <label className="label" htmlFor="log-description">
                  Mô tả chi tiết
                </label>
                <textarea className="textarea" id="log-description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3 className="form-section__title">
              <Icon name="box" className="icon--sm" />
              Vật tư sử dụng
              {materials.length > 0 && <span className="badge badge--info log-section-count">{materials.length}</span>}
            </h3>

            <div className="notice notice--info" style={{ marginBottom: 'var(--space-4)' }}>
              <Icon name="box" className="icon--sm" />
              <span>Thêm các vật tư được sử dụng trong hoạt động này.</span>
            </div>

            <div className="log-materials__head">
              <span className="log-materials__title">Danh sách vật tư</span>
              <button type="button" className="btn btn--outline btn--sm" onClick={addMaterialRow}>
                <Icon name="plus" className="icon--sm" />
                Thêm vật tư
              </button>
            </div>

            <div className="log-materials-scroll">
              {materials.length > 0 && (
                <div className="log-material-row log-material-row--header">
                  <span className="label">Vật tư *</span>
                  <span className="label">Số lượng *</span>
                  <span className="label">Đơn vị *</span>
                  <span className="label">Phương pháp</span>
                  <span className="label">Mục đích</span>
                  <span className="sr-only">Thao tác</span>
                </div>
              )}

              {materials.map((row) => (
                <div className="log-material-row" key={row._key}>
                  <select className="select" value={row.supplyId} onChange={(e) => handleSupplyChange(row._key, e.target.value)}>
                    <option value="">— Chọn vật tư —</option>
                    {supplies.map((supply) => (
                      <option key={supply.id} value={supply.id}>
                        {supply.code} — {supply.name}
                      </option>
                    ))}
                  </select>

                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Số lượng"
                    value={row.quantity}
                    onChange={(e) => updateMaterial(row._key, { quantity: e.target.value })}
                  />

                  <select className="select" value={row.unit} onChange={(e) => updateMaterial(row._key, { unit: e.target.value })}>
                    {MATERIAL_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>

                  <select className="select" value={row.method} onChange={(e) => updateMaterial(row._key, { method: e.target.value })}>
                    <option value="">— Chọn —</option>
                    {MATERIAL_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>

                  <input
                    className="input"
                    type="text"
                    placeholder="Mục đích"
                    value={row.purpose}
                    onChange={(e) => updateMaterial(row._key, { purpose: e.target.value })}
                  />

                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label="Xoá vật tư"
                    data-tooltip="Xoá"
                    onClick={() => removeMaterial(row._key)}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              ))}
            </div>

            {materials.length === 0 && <p className="log-materials__empty">Chưa có vật tư nào được thêm.</p>}
          </section>

          <section className="form-section">
            <h3 className="form-section__title">
              <Icon name="paperclip" className="icon--sm" />
              Hình ảnh minh họa
            </h3>

            <div className="log-images__head">
              <span className="log-images__title">Hình ảnh đã tải lên</span>
              <input className="input" type="file" accept="image/*" multiple onChange={handleImagesInputChange} />
            </div>

            {images.length > 0 ? (
              <div className="log-images__grid">
                {images.map((image, index) => (
                  <div className="log-image-thumb" key={index}>
                    <img src={image.dataUrl} alt={image.name} />
                    <button
                      type="button"
                      className="log-image-thumb__remove"
                      aria-label={`Xoá ảnh ${image.name}`}
                      onClick={() => removeImage(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="log-images__empty">Không có dữ liệu.</p>
            )}
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
