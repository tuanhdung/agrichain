// Port modal "Tuỳ biến bước quy trình" (process-step-modal) + phần tương ứng
// của js/nong-trai-chi-tiet.js (openProcessStepModal/resetProcessSteps/
// collectProcessSteps/handleProcessStepsSubmit). Markup/class giữ NGUYÊN
// (.modal, .steps-header).
//
// ⚠️ MỖI BƯỚC GIỮ NGUYÊN id/done/completed_at/log_id/batch_id — đây là điểm
// dễ sai nhất nếu tái dùng nhầm StepFields.tsx/stepForm.ts của /mau-quy-trinh
// (mỗi bước ở ĐÓ không có 4 field trạng thái này). `ProcessStepFields.tsx`
// CHỈ cho sửa name/activity_type/instruction/3 cờ — 4 field còn lại đi
// nguyên vẹn từ `steps` prop qua state rồi lên payload, không có ô nhập nào
// đụng tới chúng.
import { useEffect, useState, type FormEvent } from 'react';
import type { RefObject } from 'react';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { Season, Supply, WorkflowStep } from '../../api';
import { useToast } from '../../components/ToastProvider';
import { ProcessStepFields } from './ProcessStepFields';
import { emptyProcessStep, stepFromWorkflowStep, toPayloadStep, type StepEditorRow } from './processStepForm';

interface ProcessStepEditorModalProps {
  dialogRef: RefObject<HTMLDialogElement>;
  seasonId: string;
  // Trạng thái bước hiện tại của mùa vụ (currentViewedSeason.workflow_steps
  // || [] gốc) — đọc lúc mở modal (qua openToken), KHÔNG theo dõi thay đổi
  // liên tục của prop này, khớp mẫu openToken đã dùng ở mọi modal khác trong
  // trang này.
  steps: WorkflowStep[];
  supplies: Supply[];
  openToken: number;
  onClose: () => void;
  onSaved: (updated: Season) => void;
}

export function ProcessStepEditorModal({ dialogRef, seasonId, steps, supplies, openToken, onClose, onSaved }: ProcessStepEditorModalProps) {
  const { showToast } = useToast();

  const [rows, setRows] = useState<StepEditorRow[]>([emptyProcessStep()]);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setStepErrors({});
    setRows(steps.length ? steps.map(stepFromWorkflowStep) : [emptyProcessStep()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openToken buộc effect chạy lại đúng 1 lần/lần mở thật (cùng lớp bug đã vá ở /nong-trai), đọc `steps` từ closure lúc mở là đúng ý (khớp openProcessStepModal() gốc chỉ đọc 1 lần lúc mở, không theo dõi liên tục)
  }, [openToken]);

  function updateRow(key: string, patch: Partial<WorkflowStep>) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }

  function addStep() {
    setRows((prev) => [...prev, emptyProcessStep()]);
  }

  // Xoá bước cuối cùng còn lại thì tự thêm ngay 1 bước trống thay thế —
  // khớp removeButton gốc (`if (!processStepsListNode.children.length)
  // addProcessStep();`).
  function removeStep(key: string) {
    setRows((prev) => {
      const next = prev.filter((r) => r._key !== key);
      return next.length ? next : [emptyProcessStep()];
    });
  }

  function moveStep(index: number, direction: 'up' | 'down') {
    setRows((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    rows.forEach((row) => {
      if (!row.name.trim()) nextErrors[row._key] = 'Nhập tên bước.';
    });
    setStepErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      showToast('Nhập đầy đủ tên cho từng bước.');
      return;
    }

    setSubmitting(true);
    api.seasons
      .update(seasonId, { workflow_steps: rows.map(toPayloadStep) })
      .then((updated) => {
        onClose();
        onSaved(updated);
        showToast('Đã lưu quy trình.');
      })
      .catch((err: unknown) => {
        showToast(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <dialog className="modal" ref={dialogRef} aria-labelledby="process-step-modal-title">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="modal__header">
          <Icon name="workflow" />
          <h2 className="modal__title" id="process-step-modal-title">
            Tuỳ biến bước quy trình
          </h2>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal__body">
          <div className="steps-header">
            <span className="steps-header__title">Các bước thực hiện</span>
            <button type="button" className="btn btn--outline btn--sm" onClick={addStep}>
              <Icon name="plus" className="icon--sm" />
              Thêm bước mới
            </button>
          </div>

          <div>
            {rows.map((row, index) => (
              <ProcessStepFields
                key={row._key}
                step={row}
                index={index}
                total={rows.length}
                supplies={supplies}
                nameError={stepErrors[row._key]}
                onChange={(patch) => updateRow(row._key, patch)}
                onMoveUp={() => moveStep(index, 'up')}
                onMoveDown={() => moveStep(index, 'down')}
                onRemove={() => removeStep(row._key)}
              />
            ))}
          </div>
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Huỷ
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            Lưu quy trình
          </button>
        </div>
      </form>
    </dialog>
  );
}
