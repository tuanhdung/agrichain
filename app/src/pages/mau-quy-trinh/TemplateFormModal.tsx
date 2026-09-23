// Port modal "Thêm/sửa mẫu quy trình" (template-modal) trong mau-quy-trinh.html
// + phần tương ứng của js/mau-quy-trinh.js (openModal/setTemplateModalReadOnly/
// validate/handleSubmit/collectSteps). Markup/class giữ NGUYÊN (.modal,
// .modal__form, .form-grid, .steps-header, .field, .field__error...).
import { useEffect, useState, type FormEvent } from 'react';
import type { RefObject } from 'react';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { Supply, WorkflowTemplate, WorkflowTemplatePayload } from '../../api';
import { useToast } from '../../components/ToastProvider';
import { StepFields } from './StepFields';
import { emptyStep, stepFromTemplateStep, toPayloadStep, type StepFormValue } from './stepForm';
import './workflow-step.css';

export type TemplateModalMode = 'create' | 'edit' | 'view';

interface TemplateFormModalProps {
  dialogRef: RefObject<HTMLDialogElement>;
  mode: TemplateModalMode;
  template: WorkflowTemplate | null; // null khi mode === 'create'
  supplies: Supply[];
  onClose: () => void;
  onSaved: () => void;
}

interface FieldErrors {
  name?: string;
  description?: string;
}

const KNOWN_FIELDS = new Set<keyof FieldErrors>(['name', 'description']);

export function TemplateFormModal({ dialogRef, mode, template, supplies, onClose, onSaved }: TemplateFormModalProps) {
  const { showToast } = useToast();
  const readOnly = mode === 'view';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<StepFormValue[]>([emptyStep()]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Nạp lại giá trị mỗi khi mở modal cho đúng bản ghi đang sửa/xem — reset
  // hẳn form, khớp form.reset() + resetSteps() gốc. Mẫu LUÔN có ít nhất 1
  // bước — mẫu chưa có bước nào (hiếm, dữ liệu cũ) cũng khởi tạo 1 bước rỗng.
  useEffect(() => {
    setErrors({});
    setStepErrors({});
    setName(template?.name ?? '');
    setDescription(template?.description ?? '');
    setSteps(template?.steps?.length ? template.steps.map(stepFromTemplateStep) : [emptyStep()]);
  }, [template, mode]);

  function updateStep(key: string, patch: Partial<StepFormValue>) {
    setSteps((prev) => prev.map((s) => (s._key === key ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, emptyStep()]);
  }

  // Xoá bước cuối cùng còn lại thì tự thêm ngay 1 bước trống thay thế —
  // modal không bao giờ để danh sách bước rỗng hoàn toàn (khớp bản gốc).
  function removeStep(key: string) {
    setSteps((prev) => {
      const next = prev.filter((s) => s._key !== key);
      return next.length ? next : [emptyStep()];
    });
  }

  function moveStep(index: number, direction: 'up' | 'down') {
    setSteps((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev; // ở biên thì không làm gì, khớp moveStep() gốc
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function validate(): boolean {
    const nextErrors: FieldErrors = {};
    if (!name.trim()) nextErrors.name = 'Nhập tên quy trình mẫu.';

    const nextStepErrors: Record<string, string> = {};
    steps.forEach((step) => {
      if (!step.name.trim()) nextStepErrors[step._key] = 'Nhập tên bước.';
    });

    setErrors(nextErrors);
    setStepErrors(nextStepErrors);
    return Object.keys(nextErrors).length === 0 && Object.keys(nextStepErrors).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (readOnly) return;
    if (!validate()) return;

    const payload: WorkflowTemplatePayload = {
      name: name.trim(),
      description: description.trim() || null,
      steps: steps.map(toPayloadStep)
    };

    setSubmitting(true);
    const request = mode === 'edit' && template ? api.workflowTemplates.update(template.id, payload) : api.workflowTemplates.create(payload);

    request
      .then(() => {
        onClose();
        onSaved();
        showToast(mode === 'edit' ? 'Đã lưu thay đổi.' : 'Đã tạo mẫu quy trình.');
      })
      .catch((err: unknown) => {
        const apiErr = err instanceof ApiError ? err : null;
        const field = apiErr?.details?.field as keyof FieldErrors | undefined;
        // Lỗi ở field "steps" (mảng, VD 1 bước thiếu activity_type hợp lệ)
        // không map được về 1 input cụ thể — rơi về toast chung, khớp
        // fieldNodeFor() gốc (chỉ map name/description).
        if (field && KNOWN_FIELDS.has(field)) {
          setErrors((prev) => ({ ...prev, [field]: apiErr!.message }));
        } else {
          showToast(apiErr?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
        }
      })
      .finally(() => setSubmitting(false));
  }

  const title = mode === 'view' ? 'Xem chi tiết mẫu quy trình' : mode === 'edit' ? 'Sửa mẫu quy trình' : 'Thiết Kế Mẫu Quy Trình Mới';
  const submitLabel = submitting ? 'Đang lưu...' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu quy trình';

  return (
    <dialog className="modal" ref={dialogRef} aria-labelledby="template-modal-title">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="modal__header">
          <Icon name="workflow" />
          <h2 className="modal__title" id="template-modal-title">
            {title}
          </h2>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal__body">
          <div className="form-grid" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="field">
              <label className="label" htmlFor="template-name">
                Tên quy trình mẫu
              </label>
              <input
                className="input"
                type="text"
                id="template-name"
                value={name}
                disabled={readOnly}
                aria-invalid={errors.name ? 'true' : undefined}
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name && <p className="field__error">{errors.name}</p>}
            </div>
            <div className="field">
              <label className="label" htmlFor="template-description">
                Mô tả ngắn
              </label>
              <input
                className="input"
                type="text"
                id="template-description"
                value={description}
                disabled={readOnly}
                aria-invalid={errors.description ? 'true' : undefined}
                onChange={(e) => setDescription(e.target.value)}
              />
              {errors.description && <p className="field__error">{errors.description}</p>}
            </div>
          </div>

          <div className="steps-header">
            <span className="steps-header__title">Các bước thực hiện</span>
            {!readOnly && (
              <button type="button" className="btn btn--outline btn--sm" onClick={addStep}>
                <Icon name="plus" className="icon--sm" />
                Thêm bước mới
              </button>
            )}
          </div>

          <div>
            {steps.map((step, index) => (
              <StepFields
                key={step._key}
                step={step}
                index={index}
                total={steps.length}
                readOnly={readOnly}
                supplies={supplies}
                nameError={stepErrors[step._key]}
                onChange={(patch) => updateStep(step._key, patch)}
                onMoveUp={() => moveStep(index, 'up')}
                onMoveDown={() => moveStep(index, 'down')}
                onRemove={() => removeStep(step._key)}
              />
            ))}
          </div>
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            {readOnly ? 'Đóng' : 'Huỷ'}
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
