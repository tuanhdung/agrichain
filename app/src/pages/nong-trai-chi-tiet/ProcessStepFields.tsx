// Port processStepEditorCard() (js/nong-trai-chi-tiet.js gốc) — 1 bước trong
// modal "Tuỳ biến bước quy trình". Markup/class giữ NGUYÊN (.workflow-step*,
// xem view-detail.css — chép lại y hệt .workflow-step của /mau-quy-trinh,
// khớp bản gốc cũng chép lại CSS này thay vì dùng chung). CHỈ sửa
// name/activity_type/instruction/require_qr/require_supply/supply_id/
// require_image qua onChange — id/done/completed_at/log_id/batch_id của
// `step` giữ nguyên trong state cha, KHÔNG đụng tới ở component này.
import { Icon } from '../../icons';
import { ACTIVITY_TYPES } from '../../enums';
import type { Supply, WorkflowStep } from '../../api';
import type { StepEditorRow } from './processStepForm';

interface ProcessStepFieldsProps {
  step: StepEditorRow;
  index: number;
  total: number;
  supplies: Supply[];
  nameError?: string;
  onChange: (patch: Partial<WorkflowStep>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export function ProcessStepFields({ step, index, total, supplies, nameError, onChange, onMoveUp, onMoveDown, onRemove }: ProcessStepFieldsProps) {
  const supplyKnown = step.supply_id ? supplies.some((s) => s.id === step.supply_id) : true;

  return (
    <div className="workflow-step">
      <div className="workflow-step__side">
        <span className="workflow-step__number">{index + 1}</span>
        <div className="workflow-step__reorder">
          <button type="button" className="icon-btn" aria-label="Di chuyển bước lên trên" onClick={onMoveUp} disabled={index === 0}>
            <Icon name="chevron-down" className="icon--sm workflow-step__chevron-up" />
          </button>
          <button type="button" className="icon-btn" aria-label="Di chuyển bước xuống dưới" onClick={onMoveDown} disabled={index === total - 1}>
            <Icon name="chevron-down" className="icon--sm" />
          </button>
        </div>
      </div>

      <div className="workflow-step__body">
        <div className="workflow-step__top">
          <div className="form-grid">
            <div className="field">
              <label className="label">Tên bước</label>
              <input
                className="input"
                type="text"
                value={step.name}
                aria-invalid={nameError ? 'true' : undefined}
                onChange={(e) => onChange({ name: e.target.value })}
              />
              {nameError && <p className="field__error">{nameError}</p>}
            </div>

            <div className="field">
              <label className="label">Loại hoạt động</label>
              <select className="select" value={step.activity_type} onChange={(e) => onChange({ activity_type: e.target.value })}>
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="button" className="icon-btn icon-btn--danger workflow-step__remove" aria-label="Xoá bước" onClick={onRemove}>
            <Icon name="x" />
          </button>
        </div>

        <div className="workflow-step__instruction-row">
          <div className="field">
            <label className="label">Hướng dẫn thực hiện</label>
            <input className="input" type="text" value={step.instruction ?? ''} onChange={(e) => onChange({ instruction: e.target.value })} />
          </div>

          <label className="checkbox workflow-step__qr">
            <input
              className="checkbox__input"
              type="checkbox"
              checked={step.require_qr}
              onChange={(e) => onChange({ require_qr: e.target.checked })}
            />
            <span className="checkbox__label">Yêu cầu tạo QR truy xuất</span>
          </label>
        </div>

        <div className="workflow-step__flags">
          <label className="checkbox">
            <input
              className="checkbox__input"
              type="checkbox"
              checked={step.require_supply}
              onChange={(e) => onChange({ require_supply: e.target.checked })}
            />
            <span className="checkbox__label">Yêu cầu dùng vật tư</span>
          </label>

          <label className="checkbox">
            <input
              className="checkbox__input"
              type="checkbox"
              checked={step.require_image}
              onChange={(e) => onChange({ require_image: e.target.checked })}
            />
            <span className="checkbox__label">Bắt buộc hình ảnh</span>
          </label>
        </div>

        {step.require_supply && (
          <div className="field workflow-step__supply-field">
            <label className="label">Chỉ định vật tư cụ thể (Tuỳ chọn)</label>
            <select className="select" value={step.supply_id ?? ''} onChange={(e) => onChange({ supply_id: e.target.value || null })}>
              <option value="">— Không chỉ định —</option>
              {supplies.map((supply) => (
                <option key={supply.id} value={supply.id}>
                  {supply.code} — {supply.name}
                </option>
              ))}
              {/* Vật tư đã chỉ định nhưng không tải được tên (VD đã bị xoá) —
                  hiện 1 option dự phòng thay vì âm thầm hiện "— Không chỉ
                  định —" sai sự thật, khớp stepCard() gốc. */}
              {!supplyKnown && step.supply_id && <option value={step.supply_id}>Vật tư đã chỉ định (không tải được tên)</option>}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
