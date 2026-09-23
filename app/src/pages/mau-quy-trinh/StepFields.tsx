// Port stepCard() (js/mau-quy-trinh.js gốc) — 1 bước trong "Các bước thực
// hiện". Markup/class giữ NGUYÊN (.workflow-step*, xem workflow-step.css).
// Khác bản gốc (DOM là nguồn dữ liệu): nhận `step` qua props, báo thay đổi
// qua onChange(patch) — component cha (TemplateFormModal) giữ mảng steps
// thật trong state.
import { Icon } from '../../icons';
import { ACTIVITY_TYPES } from '../../enums';
import type { Supply, TemplateStep } from '../../api';
import type { StepFormValue } from './stepForm';

interface StepFieldsProps {
  step: StepFormValue;
  index: number;
  total: number;
  readOnly: boolean;
  supplies: Supply[];
  nameError?: string;
  onChange: (patch: Partial<TemplateStep>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export function StepFields({ step, index, total, readOnly, supplies, nameError, onChange, onMoveUp, onMoveDown, onRemove }: StepFieldsProps) {
  // platform_admin không tải `supplies` (GET /supplies đòi quyền supplies.view
  // mà platform_admin không có, xem MauQuyTrinhPage.tsx) — nếu bước có
  // supply_id thì vẫn phải hiện 1 option riêng, không âm thầm hiện "— Không
  // chỉ định —" sai sự thật (port đúng ghi chú trong stepCard() gốc).
  const supplyKnown = step.supply_id ? supplies.some((s) => s.id === step.supply_id) : true;

  return (
    <div className="workflow-step">
      <div className="workflow-step__side">
        <span className="workflow-step__number">{index + 1}</span>
        {!readOnly && (
          <div className="workflow-step__reorder">
            <button type="button" className="icon-btn" aria-label="Di chuyển bước lên trên" onClick={onMoveUp} disabled={index === 0}>
              <Icon name="chevron-down" className="icon--sm workflow-step__chevron-up" />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Di chuyển bước xuống dưới"
              onClick={onMoveDown}
              disabled={index === total - 1}
            >
              <Icon name="chevron-down" className="icon--sm" />
            </button>
          </div>
        )}
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
                disabled={readOnly}
                aria-invalid={nameError ? 'true' : undefined}
                onChange={(e) => onChange({ name: e.target.value })}
              />
              {nameError && <p className="field__error">{nameError}</p>}
            </div>

            <div className="field">
              <label className="label">Loại hoạt động kỹ thuật</label>
              <select className="select" value={step.activity_type} disabled={readOnly} onChange={(e) => onChange({ activity_type: e.target.value })}>
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!readOnly && (
            <button type="button" className="icon-btn icon-btn--danger workflow-step__remove" aria-label="Xoá bước" onClick={onRemove}>
              <Icon name="x" className="icon--sm" />
            </button>
          )}
        </div>

        <div className="workflow-step__instruction-row">
          <div className="field">
            <label className="label">Hướng dẫn thực hiện cho nông dân</label>
            <input
              className="input"
              type="text"
              value={step.instruction ?? ''}
              disabled={readOnly}
              onChange={(e) => onChange({ instruction: e.target.value })}
            />
          </div>

          <label className="checkbox workflow-step__qr">
            <input
              className="checkbox__input"
              type="checkbox"
              checked={step.require_qr}
              disabled={readOnly}
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
              disabled={readOnly}
              onChange={(e) => onChange({ require_supply: e.target.checked })}
            />
            <span className="checkbox__label">Yêu cầu dùng vật tư</span>
          </label>

          <label className="checkbox">
            <input
              className="checkbox__input"
              type="checkbox"
              checked={step.require_image}
              disabled={readOnly}
              onChange={(e) => onChange({ require_image: e.target.checked })}
            />
            <span className="checkbox__label">Bắt buộc hình ảnh</span>
          </label>
        </div>

        {step.require_supply && (
          <div className="field workflow-step__supply-field">
            <label className="label">Chỉ định vật tư cụ thể (Tuỳ chọn)</label>
            <select
              className="select"
              value={step.supply_id ?? ''}
              disabled={readOnly}
              onChange={(e) => onChange({ supply_id: e.target.value || null })}
            >
              <option value="">— Không chỉ định —</option>
              {supplies.map((supply) => (
                <option key={supply.id} value={supply.id}>
                  {supply.code} — {supply.name}
                </option>
              ))}
              {!supplyKnown && step.supply_id && <option value={step.supply_id}>Vật tư đã chỉ định (không tải được tên)</option>}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
