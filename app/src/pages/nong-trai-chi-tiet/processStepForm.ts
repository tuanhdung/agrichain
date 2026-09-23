// Port cơ chế 1 "bước" trong modal "Tuỳ biến bước quy trình" — bản gốc
// (js/nong-trai-chi-tiet.js) dùng DOM làm nguồn dữ liệu (dataset lưu
// id/done/completedAt/logId/batchId), bản React dùng mảng state thật, cùng
// cách tiếp cận đã dùng ở stepForm.ts của /mau-quy-trinh — CHỈ khác: mỗi
// dòng ở ĐÂY còn giữ 4 field trạng thái riêng (done/completed_at/log_id/
// batch_id) mà TemplateStep (mẫu quy trình gốc) không có, PHẢI giữ nguyên
// khi người dùng chỉ sửa tên/hướng dẫn — KHÔNG BAO GIỜ reset về mặc định khi
// sửa 1 bước khác trong cùng danh sách.
import type { WorkflowStep } from '../../api';
import { ACTIVITY_TYPES } from '../../enums';

export interface StepEditorRow extends WorkflowStep {
  _key: string;
}

let keyCounter = 0;
function nextKey(): string {
  keyCounter += 1;
  return `process-step-${keyCounter}-${Date.now().toString(36)}`;
}

// Bước MỚI thêm tay trong modal này — KHÔNG có `id` (bỏ trống để backend tự
// cấp UUID thật, xem WorkflowStep.id trong api/seasons.ts).
export function emptyProcessStep(): StepEditorRow {
  return {
    _key: nextKey(),
    name: '',
    activity_type: ACTIVITY_TYPES[0].key,
    instruction: '',
    require_qr: false,
    require_supply: false,
    supply_id: null,
    require_image: false,
    done: false,
    completed_at: null,
    log_id: null,
    batch_id: null
  };
}

export function stepFromWorkflowStep(step: WorkflowStep): StepEditorRow {
  return { ...step, _key: nextKey() };
}

export function toPayloadStep(row: StepEditorRow): WorkflowStep {
  const { _key: _omit, ...rest } = row;
  return rest;
}
