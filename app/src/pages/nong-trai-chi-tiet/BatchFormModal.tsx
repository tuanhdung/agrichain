// Port modal "Thêm/Sửa lô hàng" (batch-modal) + phần tương ứng của
// js/nong-trai-chi-tiet.js (openBatchModal/validateBatch/handleBatchSubmit).
// Markup/class giữ NGUYÊN (.modal, .modal__form, .form-grid, .input-affix).
//
// ⚠️ KHÔNG gửi `farm_id` lúc tạo — BatchCreate không nhận field này, backend
// tự điền từ `season_id` (xem CLAUDE.md gốc mục "Kết nối backend"). `onSaved`
// trả về `Batch` vừa lưu để nơi gọi (SeasonViewModal.tsx) tự quyết định có
// cần gắn `batch_id` vào 1 bước quy trình đang chờ hay không
// (linkBatchToStep(), Bước 5) — bản thân modal này KHÔNG biết gì về khái
// niệm "quy trình". Việc TỰ MỞ MODAL QR ngay sau khi lưu (nếu bước yêu cầu)
// CHƯA port, cùng nợ kỹ thuật QR đã ghi ở BatchCard.tsx.
import { useEffect, useState, type FormEvent } from 'react';
import type { RefObject } from 'react';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { Batch, BatchPayload, BatchSystemRow } from '../../api';
import { useToast } from '../../components/ToastProvider';
import { BATCH_STATUSES, BATCH_UNITS } from './constants';

export type BatchModalMode = 'create' | 'edit';

interface BatchFormModalProps {
  dialogRef: RefObject<HTMLDialogElement>;
  mode: BatchModalMode;
  batch: Batch | null;
  seasonId: string;
  seasonCode: string;
  suggestedCode: string;
  // Lô hàng khác CÙNG mùa vụ đang xem — dùng để tự kiểm tra trùng mã ở
  // client, khớp validateBatch() gốc (backend cũng tự kiểm tra lại, đây chỉ
  // là phản hồi sớm cho người dùng).
  existingBatches: (Batch | BatchSystemRow)[];
  openToken: number;
  onClose: () => void;
  onSaved: (savedBatch: Batch) => void;
}

interface FieldErrors {
  code?: string;
  start_date?: string;
  area?: string;
  harvest_date?: string;
  actual_harvest_date?: string;
  expected_yield?: string;
  unit?: string;
  status?: string;
  note?: string;
}

const FIELD_MAP: Record<string, keyof FieldErrors> = {
  code: 'code',
  start_date: 'start_date',
  area: 'area',
  harvest_date: 'harvest_date',
  actual_harvest_date: 'actual_harvest_date',
  expected_yield: 'expected_yield',
  unit: 'unit',
  status: 'status',
  note: 'note'
};

export function BatchFormModal({
  dialogRef,
  mode,
  batch,
  seasonId,
  seasonCode,
  suggestedCode,
  existingBatches,
  openToken,
  onClose,
  onSaved
}: BatchFormModalProps) {
  const { showToast } = useToast();

  const [code, setCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [area, setArea] = useState('0');
  const [harvestDate, setHarvestDate] = useState('');
  const [actualHarvestDate, setActualHarvestDate] = useState('');
  const [expectedYield, setExpectedYield] = useState('0');
  const [unit, setUnit] = useState(BATCH_UNITS[0]);
  const [status, setStatus] = useState(BATCH_STATUSES[0].key);
  const [note, setNote] = useState('');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setErrors({});

    if (batch) {
      setCode(batch.code);
      setStartDate(batch.start_date || '');
      setArea(batch.area != null ? String(batch.area) : '');
      setHarvestDate(batch.harvest_date || '');
      setActualHarvestDate(batch.actual_harvest_date || '');
      setExpectedYield(batch.expected_yield != null ? String(batch.expected_yield) : '');
      setUnit(batch.unit || BATCH_UNITS[0]);
      setStatus(batch.status || BATCH_STATUSES[0].key);
      setNote(batch.note || '');
    } else {
      setCode(suggestedCode);
      setStartDate('');
      setArea('0');
      setHarvestDate('');
      setActualHarvestDate('');
      setExpectedYield('0');
      setUnit(BATCH_UNITS[0]);
      setStatus(BATCH_STATUSES[0].key);
      setNote('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openToken buộc effect chạy lại đúng 1 lần/lần mở thật (cùng lớp bug đã vá ở /nong-trai/CertificationFormModal.tsx), suggestedCode chỉ dùng lúc mount nhánh 'create'
  }, [batch, mode, openToken]);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};

    if (!code.trim()) {
      nextErrors.code = 'Nhập mã lô hàng.';
    } else {
      const duplicate = existingBatches.some(
        (item) => item.id !== batch?.id && item.code.toLowerCase() === code.trim().toLowerCase()
      );
      if (duplicate) nextErrors.code = 'Mã này đã dùng cho lô hàng khác của mùa vụ.';
    }

    if (!startDate) nextErrors.start_date = 'Chọn ngày bắt đầu.';
    if (!area.trim()) nextErrors.area = 'Nhập diện tích.';
    if (!harvestDate) nextErrors.harvest_date = 'Chọn ngày thu hoạch dự kiến.';
    if (!actualHarvestDate) nextErrors.actual_harvest_date = 'Chọn ngày thu hoạch thực tế.';
    if (!expectedYield.trim()) nextErrors.expected_yield = 'Nhập sản lượng dự kiến.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    const record: BatchPayload = {
      code: code.trim(),
      start_date: startDate,
      area: Number(area) || 0,
      harvest_date: harvestDate,
      actual_harvest_date: actualHarvestDate,
      expected_yield: Number(expectedYield) || 0,
      unit,
      status,
      note: note.trim() || null
    };

    setSubmitting(true);
    // season_id BẮT BUỘC lúc tạo (BatchCreate) — farm_id KHÔNG gửi lên,
    // backend tự điền từ season_id, khớp handleBatchSubmit() gốc.
    const request = mode === 'edit' && batch ? api.batches.update(batch.id, record) : api.batches.create({ ...record, season_id: seasonId });

    request
      .then((savedBatch) => {
        onClose();
        onSaved(savedBatch);
        showToast(mode === 'edit' ? 'Đã lưu thay đổi.' : 'Đã thêm lô hàng.');
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

  const title = mode === 'edit' ? 'Sửa lô hàng' : 'Thêm lô hàng mới';
  const submitLabel = submitting ? 'Đang lưu...' : 'Xác nhận';

  return (
    <dialog className="modal" ref={dialogRef} aria-labelledby="batch-modal-title">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="modal__header">
          <Icon name="box" />
          <h2 className="modal__title" id="batch-modal-title">
            {title}
          </h2>
          <span className="badge badge--neutral">Mùa vụ: {seasonCode}</span>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal__body">
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="batch-code">
                Mã
              </label>
              <input
                className="input"
                type="text"
                id="batch-code"
                value={code}
                aria-invalid={errors.code ? 'true' : undefined}
                onChange={(e) => setCode(e.target.value)}
              />
              {errors.code && <p className="field__error">{errors.code}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="batch-start-date">
                Ngày bắt đầu
              </label>
              <input
                className="input"
                type="date"
                id="batch-start-date"
                value={startDate}
                aria-invalid={errors.start_date ? 'true' : undefined}
                onChange={(e) => setStartDate(e.target.value)}
              />
              {errors.start_date && <p className="field__error">{errors.start_date}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="batch-area">
                Diện tích
              </label>
              <div className="input-affix">
                <input
                  className="input"
                  type="number"
                  id="batch-area"
                  min="0"
                  step="0.01"
                  value={area}
                  aria-invalid={errors.area ? 'true' : undefined}
                  onChange={(e) => setArea(e.target.value)}
                />
                <span className="input-affix__unit">ha</span>
              </div>
              {errors.area && <p className="field__error">{errors.area}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="batch-harvest-date">
                Ngày thu hoạch (dự kiến)
              </label>
              <input
                className="input"
                type="date"
                id="batch-harvest-date"
                value={harvestDate}
                aria-invalid={errors.harvest_date ? 'true' : undefined}
                onChange={(e) => setHarvestDate(e.target.value)}
              />
              {errors.harvest_date && <p className="field__error">{errors.harvest_date}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="batch-actual-harvest-date">
                Ngày thu hoạch thực tế
              </label>
              <input
                className="input"
                type="date"
                id="batch-actual-harvest-date"
                value={actualHarvestDate}
                aria-invalid={errors.actual_harvest_date ? 'true' : undefined}
                onChange={(e) => setActualHarvestDate(e.target.value)}
              />
              {errors.actual_harvest_date && <p className="field__error">{errors.actual_harvest_date}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="batch-expected-yield">
                Sản lượng dự kiến
              </label>
              <input
                className="input"
                type="number"
                id="batch-expected-yield"
                min="0"
                step="0.01"
                value={expectedYield}
                aria-invalid={errors.expected_yield ? 'true' : undefined}
                onChange={(e) => setExpectedYield(e.target.value)}
              />
              {errors.expected_yield && <p className="field__error">{errors.expected_yield}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="batch-unit">
                Đơn vị
              </label>
              <select className="select" id="batch-unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
                {BATCH_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="batch-status">
                Trạng thái
              </label>
              <select className="select" id="batch-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {BATCH_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field form-grid__full">
              <label className="label" htmlFor="batch-note">
                Ghi chú
              </label>
              <textarea className="textarea" id="batch-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
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
