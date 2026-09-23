// Port modal "Thêm/Sửa mùa vụ" (season-modal) + phần tương ứng của
// js/nong-trai-chi-tiet.js (openSeasonModal/validateSeason/handleSeasonSubmit).
// Markup/class giữ NGUYÊN (.modal, .modal__form, .form-grid, .input-affix).
//
// ⚠️ CỐ TÌNH KHÔNG so sánh end_date > start_date ở client — đã xác nhận với
// người dùng (2026-09-23): validateSeason() gốc chỉ kiểm tra CÓ NHẬP hay
// không cho từng field, không có bước so sánh khoảng ngày nào — form hoàn
// toàn tin cậy lỗi backend trả về (nếu có) cho ràng buộc này. Giữ đúng hành
// vi gốc, không tự thêm validate ngoài phạm vi port.
import { useEffect, useState, type FormEvent } from 'react';
import type { RefObject } from 'react';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { Season, SeasonPayload } from '../../api';
import { useToast } from '../../components/ToastProvider';
import { SEASON_STATUSES } from './constants';

export type SeasonModalMode = 'create' | 'edit';

interface SeasonFormModalProps {
  dialogRef: RefObject<HTMLDialogElement>;
  mode: SeasonModalMode;
  season: Season | null;
  farmId: string;
  suggestedCode: string;
  openToken: number;
  onClose: () => void;
  onSaved: () => void;
}

interface FieldErrors {
  code?: string;
  name?: string;
  start_date?: string;
  end_date?: string;
  planned_area?: string;
  actual_area?: string;
  expected_yield?: string;
  yield_unit?: string;
  status?: string;
  note?: string;
}

const FIELD_MAP: Record<string, keyof FieldErrors> = {
  code: 'code',
  name: 'name',
  start_date: 'start_date',
  end_date: 'end_date',
  planned_area: 'planned_area',
  actual_area: 'actual_area',
  expected_yield: 'expected_yield',
  yield_unit: 'yield_unit',
  status: 'status',
  note: 'note'
};

export function SeasonFormModal({ dialogRef, mode, season, farmId, suggestedCode, openToken, onClose, onSaved }: SeasonFormModalProps) {
  const { showToast } = useToast();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [plannedArea, setPlannedArea] = useState('0');
  const [actualArea, setActualArea] = useState('0');
  const [expectedYield, setExpectedYield] = useState('');
  const [yieldUnit, setYieldUnit] = useState('');
  const [status, setStatus] = useState(SEASON_STATUSES[0].key);
  const [note, setNote] = useState('');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setErrors({});

    if (season) {
      setCode(season.code);
      setName(season.name);
      setStartDate(season.start_date);
      setEndDate(season.end_date);
      setPlannedArea(season.planned_area != null ? String(season.planned_area) : '');
      setActualArea(season.actual_area != null ? String(season.actual_area) : '');
      setExpectedYield(season.expected_yield != null ? String(season.expected_yield) : '');
      setYieldUnit(season.yield_unit || '');
      setStatus(season.status || SEASON_STATUSES[0].key);
      setNote(season.note || '');
    } else {
      setCode(suggestedCode);
      setName('');
      setStartDate('');
      setEndDate('');
      setPlannedArea('0');
      setActualArea('0');
      setExpectedYield('');
      setYieldUnit('');
      setStatus(SEASON_STATUSES[0].key);
      setNote('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openToken buộc effect chạy lại đúng 1 lần/lần mở thật (cùng lớp bug đã vá ở /nong-trai/CertificationFormModal.tsx), suggestedCode chỉ dùng lúc mount nhánh 'create'
  }, [season, mode, openToken]);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};
    if (!code.trim()) nextErrors.code = 'Nhập mã mùa vụ.';
    if (!name.trim()) nextErrors.name = 'Nhập tên mùa vụ.';
    if (!startDate) nextErrors.start_date = 'Chọn ngày bắt đầu.';
    if (!endDate) nextErrors.end_date = 'Chọn ngày kết thúc.';
    if (!plannedArea.trim()) nextErrors.planned_area = 'Nhập diện tích dự kiến.';
    if (!actualArea.trim()) nextErrors.actual_area = 'Nhập diện tích thực tế.';

    // Sản lượng dự kiến tuỳ chọn, nhưng nếu có thì bắt buộc kèm đơn vị.
    if (expectedYield.trim() && !yieldUnit.trim()) nextErrors.yield_unit = 'Nhập đơn vị sản lượng.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    const record: SeasonPayload = {
      code: code.trim(),
      name: name.trim(),
      start_date: startDate,
      end_date: endDate,
      planned_area: Number(plannedArea) || 0,
      actual_area: Number(actualArea) || 0,
      expected_yield: expectedYield.trim() ? Number(expectedYield) : null,
      yield_unit: expectedYield.trim() ? yieldUnit.trim() : null,
      status,
      note: note.trim() || null
    };

    setSubmitting(true);
    // KHÔNG gửi workflow_template_id/name/steps ở đây trong cả 2 trường hợp
    // — PATCH giữ nguyên quy trình đã áp dụng (nếu có); POST (tạo mới) thì
    // backend tự mặc định cả 3 về null, đúng trạng thái "chưa áp dụng quy
    // trình nào" — khớp handleSeasonSubmit() gốc.
    const request = mode === 'edit' && season ? api.seasons.update(season.id, record) : api.seasons.create({ ...record, farm_id: farmId });

    request
      .then(() => {
        onClose();
        onSaved();
        showToast(mode === 'edit' ? 'Đã lưu thay đổi.' : 'Đã thêm mùa vụ.');
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

  const title = mode === 'edit' ? 'Sửa mùa vụ' : 'Thêm mùa vụ mới';
  const submitLabel = submitting ? 'Đang lưu...' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu mùa vụ';

  return (
    <dialog className="modal" ref={dialogRef} aria-labelledby="season-modal-title">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="modal__header">
          <Icon name="seedling" />
          <h2 className="modal__title" id="season-modal-title">
            {title}
          </h2>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal__body">
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="season-code">
                Mã
              </label>
              <input
                className="input"
                type="text"
                id="season-code"
                value={code}
                aria-invalid={errors.code ? 'true' : undefined}
                onChange={(e) => setCode(e.target.value)}
              />
              {errors.code && <p className="field__error">{errors.code}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="season-name">
                Tên
              </label>
              <input
                className="input"
                type="text"
                id="season-name"
                value={name}
                aria-invalid={errors.name ? 'true' : undefined}
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name && <p className="field__error">{errors.name}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="season-start-date">
                Ngày bắt đầu
              </label>
              <input
                className="input"
                type="date"
                id="season-start-date"
                value={startDate}
                aria-invalid={errors.start_date ? 'true' : undefined}
                onChange={(e) => setStartDate(e.target.value)}
              />
              {errors.start_date && <p className="field__error">{errors.start_date}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="season-end-date">
                Ngày kết thúc
              </label>
              <input
                className="input"
                type="date"
                id="season-end-date"
                value={endDate}
                aria-invalid={errors.end_date ? 'true' : undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
              {errors.end_date && <p className="field__error">{errors.end_date}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="season-planned-area">
                Diện tích dự kiến
              </label>
              <div className="input-affix">
                <input
                  className="input"
                  type="number"
                  id="season-planned-area"
                  min="0"
                  step="0.01"
                  value={plannedArea}
                  aria-invalid={errors.planned_area ? 'true' : undefined}
                  onChange={(e) => setPlannedArea(e.target.value)}
                />
                <span className="input-affix__unit">ha</span>
              </div>
              {errors.planned_area && <p className="field__error">{errors.planned_area}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="season-actual-area">
                Diện tích thực tế
              </label>
              <div className="input-affix">
                <input
                  className="input"
                  type="number"
                  id="season-actual-area"
                  min="0"
                  step="0.01"
                  value={actualArea}
                  aria-invalid={errors.actual_area ? 'true' : undefined}
                  onChange={(e) => setActualArea(e.target.value)}
                />
                <span className="input-affix__unit">ha</span>
              </div>
              {errors.actual_area && <p className="field__error">{errors.actual_area}</p>}
            </div>

            <div className="field">
              <label className="label" htmlFor="season-expected-yield">
                Sản lượng dự kiến (tuỳ chọn)
              </label>
              <input
                className="input"
                type="number"
                id="season-expected-yield"
                min="0"
                step="0.01"
                value={expectedYield}
                onChange={(e) => setExpectedYield(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="season-yield-unit">
                Đơn vị sản lượng
              </label>
              <input
                className="input"
                type="text"
                id="season-yield-unit"
                placeholder="VD: tấn, kg"
                value={yieldUnit}
                aria-invalid={errors.yield_unit ? 'true' : undefined}
                onChange={(e) => setYieldUnit(e.target.value)}
              />
              <p className="field__hint">Bắt buộc nếu có nhập sản lượng dự kiến.</p>
              {errors.yield_unit && <p className="field__error">{errors.yield_unit}</p>}
            </div>

            <div className="field form-grid__full">
              <label className="label" htmlFor="season-status">
                Trạng thái
              </label>
              <select className="select" id="season-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {SEASON_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field form-grid__full">
              <label className="label" htmlFor="season-note">
                Ghi chú
              </label>
              <textarea className="textarea" id="season-note" value={note} onChange={(e) => setNote(e.target.value)} />
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
