// Port modal "Thêm / Sửa vật tư" (material-modal) trong vat-tu.html + phần
// tương ứng của js/vat-tu.js (openCreate/openEdit/setModalReadOnly/validate/
// handleSubmit/suggestMaterialCode). Markup/class giữ NGUYÊN (.modal,
// .modal__form, .form-section, .form-grid, .field, .field__error...).
import { useEffect, useState, type FormEvent } from 'react';
import type { RefObject } from 'react';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { Supply, SupplyPayload } from '../../api';
import { TYPES, UNITS, typeCodePrefix } from './constants';
import { useToast } from '../../components/ToastProvider';

export type SupplyModalMode = 'create' | 'edit' | 'view';

interface SupplyFormModalProps {
  dialogRef: RefObject<HTMLDialogElement>;
  mode: SupplyModalMode;
  supply: Supply | null; // null khi mode === 'create'
  onClose: () => void;
  onSaved: () => void;
}

interface FormValues {
  code: string;
  type: string;
  name: string;
  manufacturer: string;
  unit: string;
  description: string;
}

const EMPTY_VALUES: FormValues = {
  code: '',
  type: TYPES[0].key,
  name: '',
  manufacturer: '',
  unit: UNITS[0],
  description: ''
};

function valuesFromSupply(supply: Supply): FormValues {
  return {
    code: supply.code || '',
    type: supply.type || 'other',
    name: supply.name || '',
    manufacturer: supply.manufacturer || '',
    unit: supply.unit || UNITS[0],
    description: supply.description || ''
  };
}

// Ánh xạ tên field backend trả về trong lỗi (details.field) — khớp thẳng
// key của FormValues nên không cần bảng tra id DOM như bản .js gốc.
const KNOWN_FIELDS = new Set<keyof FormValues>(['code', 'type', 'name', 'manufacturer', 'unit', 'description']);

export function SupplyFormModal({ dialogRef, mode, supply, onClose, onSaved }: SupplyFormModalProps) {
  const { showToast } = useToast();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const readOnly = mode === 'view';

  // Nạp lại giá trị mỗi khi mở modal cho đúng bản ghi đang sửa/xem — reset
  // hẳn form thay vì để sót giá trị của lần mở trước, khớp form.reset() gốc.
  useEffect(() => {
    setErrors({});
    setValues(supply ? valuesFromSupply(supply) : EMPTY_VALUES);
  }, [supply, mode]);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // Chỉ gợi ý mã khi đang THÊM MỚI — sửa vật tư đã có thì đổi loại không
  // được tự ý ghi đè mã đang dùng (khớp bản gốc: `if (editingId) return;`).
  function handleTypeChange(nextType: string) {
    setField('type', nextType);
    if (mode !== 'create') return;
    const prefix = typeCodePrefix(TYPES.find((t) => t.key === nextType) ?? TYPES[TYPES.length - 1]);
    api.supplies
      .list({ type: nextType, page_size: 1 })
      .then((data) => {
        let seq = String((data.total || 0) + 1);
        while (seq.length < 2) seq = '0' + seq;
        setField('code', prefix + seq);
      })
      .catch(() => setField('code', prefix + '01'));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormValues, string>> = {};
    if (!values.code.trim()) next.code = 'Nhập mã vật tư.';
    // Không kiểm tra trùng mã phía client — trang chỉ tải 1 phần dữ liệu
    // (phân trang/tìm kiếm), không đủ để biết TOÀN BỘ mã đã dùng. Backend tự
    // kiểm tra trùng "code" toàn hệ thống, trả lỗi kèm details.field.
    if (!values.name.trim()) next.name = 'Nhập tên vật tư.';
    if (!values.manufacturer.trim()) next.manufacturer = 'Nhập nhà sản xuất.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (readOnly) return;
    if (!validate()) return;

    const payload: SupplyPayload = {
      code: values.code.trim(),
      type: values.type,
      name: values.name.trim(),
      manufacturer: values.manufacturer.trim(),
      unit: values.unit,
      description: values.description.trim() || null
    };

    setSubmitting(true);
    const request = mode === 'edit' && supply ? api.supplies.update(supply.id, payload) : api.supplies.create(payload);

    request
      .then(() => {
        onClose();
        onSaved();
        showToast(mode === 'edit' ? 'Đã lưu thay đổi.' : 'Đã thêm vật tư.');
      })
      .catch((err: unknown) => {
        const apiErr = err instanceof ApiError ? err : null;
        const field = apiErr?.details?.field as keyof FormValues | undefined;
        if (field && KNOWN_FIELDS.has(field)) {
          setErrors((prev) => ({ ...prev, [field]: apiErr!.message }));
        } else {
          showToast(apiErr?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
        }
      })
      .finally(() => setSubmitting(false));
  }

  const title = mode === 'view' ? 'Xem chi tiết vật tư' : mode === 'edit' ? 'Sửa vật tư' : 'Thêm vật tư mới';
  const submitLabel = submitting ? 'Đang lưu...' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu vật tư';

  return (
    <dialog className="modal" ref={dialogRef} aria-labelledby="material-modal-title">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="modal__header">
          <Icon name="box" />
          <h2 className="modal__title" id="material-modal-title">
            {title}
          </h2>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal__body">
          <section className="form-section">
            <h3 className="form-section__title">
              <Icon name="box" className="icon--sm" />
              Thông tin cơ bản
            </h3>

            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="material-code">
                  Mã vật tư
                </label>
                <input
                  className="input"
                  type="text"
                  id="material-code"
                  value={values.code}
                  disabled={readOnly}
                  aria-invalid={errors.code ? 'true' : undefined}
                  onChange={(e) => setField('code', e.target.value)}
                />
                <p className="field__hint">Ví dụ PB06, SH03, VT-BPT.</p>
                {errors.code && <p className="field__error">{errors.code}</p>}
              </div>

              <div className="field">
                <label className="label" htmlFor="material-type">
                  Loại
                </label>
                <select
                  className="select"
                  id="material-type"
                  value={values.type}
                  disabled={readOnly}
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  {TYPES.map((type) => (
                    <option key={type.key} value={type.key}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field form-grid__full">
                <label className="label" htmlFor="material-name">
                  Tên
                </label>
                <input
                  className="input"
                  type="text"
                  id="material-name"
                  value={values.name}
                  disabled={readOnly}
                  aria-invalid={errors.name ? 'true' : undefined}
                  onChange={(e) => setField('name', e.target.value)}
                />
                {errors.name && <p className="field__error">{errors.name}</p>}
              </div>

              <div className="field">
                <label className="label" htmlFor="material-manufacturer">
                  Nhà sản xuất
                </label>
                <input
                  className="input"
                  type="text"
                  id="material-manufacturer"
                  value={values.manufacturer}
                  disabled={readOnly}
                  aria-invalid={errors.manufacturer ? 'true' : undefined}
                  onChange={(e) => setField('manufacturer', e.target.value)}
                />
                {errors.manufacturer && <p className="field__error">{errors.manufacturer}</p>}
              </div>

              <div className="field">
                <label className="label" htmlFor="material-unit">
                  Đơn vị
                </label>
                <select
                  className="select"
                  id="material-unit"
                  value={values.unit}
                  disabled={readOnly}
                  onChange={(e) => setField('unit', e.target.value)}
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3 className="form-section__title">
              <Icon name="leaf" className="icon--sm" />
              Mô tả
            </h3>
            <div className="field">
              <label className="label" htmlFor="material-description">
                Công dụng
              </label>
              <textarea
                className="textarea"
                id="material-description"
                placeholder="Dùng cho cây gì, ở giai đoạn nào, tác dụng chính..."
                value={values.description}
                disabled={readOnly}
                onChange={(e) => setField('description', e.target.value)}
              />
              <p className="field__hint">Phần này hiển thị lại khi truy xuất, nên viết cho người tiêu dùng hiểu được.</p>
            </div>
          </section>
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            {readOnly ? 'Đóng' : 'Hủy'}
          </button>
          {!readOnly && (
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitLabel}
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}
