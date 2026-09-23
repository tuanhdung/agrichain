// Port api.workflowTemplates.* của js/api.js — khuôn CRUD chuẩn, chỉ bọc
// mỏng quanh request(). Field/response snake_case ĐÚNG NHƯ backend trả về
// (activity_type, require_qr, require_supply, supply_id, require_image) —
// xem js/mau-quy-trinh.js gốc. `TemplateStep` KHÔNG có `id` riêng (đã xác
// nhận qua backend thật, khác WorkflowStep của seasons — mẫu chỉ là bản
// thiết kế tĩnh, chưa gắn lần thực hiện nào).
import { request } from './http';
import type { Page } from './types';

export interface TemplateStep {
  name: string;
  activity_type: string;
  /** rỗng gửi `null`, không phải chuỗi rỗng — khớp anyOf[string|null] của backend. */
  instruction: string | null;
  require_qr: boolean;
  require_supply: boolean;
  /** rỗng gửi `null`, không phải chuỗi rỗng — khớp anyOf[uuid|null] của backend. */
  supply_id: string | null;
  require_image: boolean;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  steps: TemplateStep[];
  created_at: string;
  updated_at: string | null;
}

export interface WorkflowTemplatePayload {
  name: string;
  description: string | null;
  steps: TemplateStep[];
}

export interface WorkflowTemplateListParams {
  q?: string;
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

export const workflowTemplates = {
  list: (params?: WorkflowTemplateListParams) =>
    request<Page<WorkflowTemplate>>('GET', '/workflow-templates', { query: params }),
  get: (id: string) => request<WorkflowTemplate>('GET', `/workflow-templates/${id}`),
  create: (data: WorkflowTemplatePayload) => request<WorkflowTemplate>('POST', '/workflow-templates', { body: data }),
  update: (id: string, data: WorkflowTemplatePayload) =>
    request<WorkflowTemplate>('PATCH', `/workflow-templates/${id}`, { body: data }),
  remove: (id: string) => request<null>('DELETE', `/workflow-templates/${id}`)
};
