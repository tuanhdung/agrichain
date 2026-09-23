// Port cơ chế 1 "bước" trong modal thêm/sửa mẫu quy trình — bản gốc
// (js/mau-quy-trinh.js) dùng DOM làm nguồn dữ liệu (không mảng JS), bản
// React dùng mảng state thật (idiomatic hơn, cùng nghiệp vụ). `TemplateStep`
// (backend) KHÔNG có `id` riêng (xem api/workflowTemplates.ts) nên
// `_key` dưới đây CHỈ dùng làm React key nội bộ, KHÔNG BAO GIỜ gửi lên
// backend — toPayloadStep() tự bóc field này ra trước khi submit.
import type { TemplateStep } from '../../api';
import { ACTIVITY_TYPES } from '../../enums';

export interface StepFormValue extends TemplateStep {
  _key: string;
}

let keyCounter = 0;
function nextKey(): string {
  keyCounter += 1;
  return `step-${keyCounter}-${Date.now().toString(36)}`;
}

export function emptyStep(): StepFormValue {
  return {
    _key: nextKey(),
    name: '',
    activity_type: ACTIVITY_TYPES[0].key,
    instruction: null,
    require_qr: false,
    require_supply: false,
    supply_id: null,
    require_image: false
  };
}

export function stepFromTemplateStep(step: TemplateStep): StepFormValue {
  return { ...step, _key: nextKey() };
}

export function toPayloadStep(step: StepFormValue): TemplateStep {
  const { _key: _omit, ...rest } = step;
  return rest;
}
