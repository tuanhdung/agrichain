// Port api.seasons.* của js/api.js — khuôn CRUD chuẩn. Ban đầu (migrate
// /lo-hang) CHỈ có list() (đủ cho dropdown lọc); mở rộng đầy đủ get/create/
// update/remove ở Bước 3 của /nong-trai-chi-tiet — nơi CRUD mùa vụ thật sự
// diễn ra (xem app/CLAUDE.md mục "Trang /nong-trai-chi-tiet").
import { request } from './http';
import type { Page } from './types';

// 1 bước trong workflow_steps của MỘT mùa vụ cụ thể (khác TemplateStep của
// mẫu quy trình gốc — xem api/workflowTemplates.ts) — có thêm state riêng
// theo dõi tiến độ thực hiện (done/completed_at/log_id/batch_id). Dùng đầy đủ
// từ Bước 5 (Quy trình mùa vụ), khai báo SẴN ở đây vì `Season.workflow_steps`
// cần kiểu dữ liệu đúng ngay từ Bước 3, tránh dùng `any`.
//
// ⚠️ `id` optional — WorkflowStep.id backend yêu cầu đúng format uuid; khi
// TẠO MỚI 1 bước (chụp từ mẫu, hoặc thêm tay ở modal "Tuỳ biến bước quy
// trình"), KHÔNG tự sinh id giả — để trống thì backend tự cấp UUID thật, xem
// CLAUDE.md gốc mục "Quy trình mùa vụ".
export interface WorkflowStep {
  id?: string;
  name: string;
  activity_type: string;
  instruction: string | null;
  require_qr: boolean;
  require_supply: boolean;
  supply_id: string | null;
  require_image: boolean;
  done: boolean;
  completed_at: string | null;
  log_id: string | null;
  batch_id: string | null;
}

// Khuôn SeasonOut thật — CHỈ field trang nong-trai-chi-tiet thật sự dùng tới.
export interface Season {
  id: string;
  farm_id: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  planned_area: number;
  actual_area: number;
  expected_yield: number | null;
  yield_unit: string | null;
  status: string;
  note: string | null;
  // null = CHƯA áp dụng quy trình nào; mảng (kể cả rỗng) = ĐÃ áp dụng — xem
  // CLAUDE.md gốc mục "Quy trình mùa vụ". Chưa thao tác ở Bước 3, chỉ cần
  // đọc đúng kiểu.
  workflow_template_id: string | null;
  workflow_template_name: string | null;
  workflow_steps: WorkflowStep[] | null;
}

// Field gửi lên CHO CẢ TẠO MỚI LẪN SỬA — KHÔNG có workflow_template_id/
// _name/_steps ở đây: bản gốc CỐ TÌNH không gửi 3 field này trong
// handleSeasonSubmit() (PATCH giữ nguyên quy trình đã áp dụng nếu không gửi;
// POST thì backend tự mặc định cả 3 về null) — xem SeasonWorkflowFields bên
// dưới, dùng RIÊNG cho các lần PATCH chỉ-đổi-quy-trình ở Bước 5.
export interface SeasonPayload {
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  planned_area: number;
  actual_area: number;
  expected_yield: number | null;
  yield_unit: string | null;
  status: string;
  note: string | null;
}

// Dùng cho các lần PATCH RIÊNG chỉ đổi quy trình (áp dụng mẫu/hoàn thành
// bước/tuỳ biến bước — Bước 5), KHÔNG đụng tới field nghiệp vụ khác của
// SeasonPayload.
export interface SeasonWorkflowFields {
  workflow_template_id: string | null;
  workflow_template_name: string | null;
  workflow_steps: WorkflowStep[] | null;
}

export interface SeasonListParams {
  farm_id?: string;
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

export const seasons = {
  list: (params?: SeasonListParams) => request<Page<Season>>('GET', '/seasons', { query: params }),
  get: (id: string, options?: { auth?: boolean }) => request<Season>('GET', `/seasons/${id}`, options),
  create: (data: SeasonPayload & { farm_id: string }) => request<Season>('POST', '/seasons', { body: data }),
  update: (id: string, data: Partial<SeasonPayload & SeasonWorkflowFields>) =>
    request<Season>('PATCH', `/seasons/${id}`, { body: data }),
  remove: (id: string) => request<null>('DELETE', `/seasons/${id}`)
};
