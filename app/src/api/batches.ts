// Port api.batches.* của js/api.js. Ban đầu (migrate /lo-hang) CHỈ có
// list/get/getByCode (trang đó chỉ xem/lọc) — mở rộng đầy đủ create/update/
// remove ở Bước 4 của /nong-trai-chi-tiet, nơi CRUD lô hàng thật sự diễn ra
// (xem app/CLAUDE.md mục "Trang /nong-trai-chi-tiet"), đúng kế hoạch đã ghi
// sẵn từ lúc port /lo-hang ("CRUD lô hàng thuộc phạm vi nong-trai-chi-tiet.html
// khi trang đó migrate sau này").
//
// farm_code/farm_name/season_code/season_name là join sống có sẵn từ backend
// (BatchOut), đọc THẲNG — không tự gọi thêm api.farms.get()/api.seasons.get()
// cho từng lô hàng như hồi còn store.js, xem js/lo-hang.js gốc.
import { request } from './http';
import type { Page } from './types';

// Khuôn BatchOut thật — CHỈ khai báo field trang /lo-hang thật sự dùng tới
// (đúng quy ước đã áp dụng cho Farm/Supply/WorkflowTemplate/OrgUser).
export interface Batch {
  id: string;
  code: string;
  farm_id: string;
  farm_code: string;
  farm_name: string;
  season_id: string;
  season_code: string;
  season_name: string;
  status: string;
  area: number | null;
  start_date: string | null;
  harvest_date: string | null;
  actual_harvest_date: string | null;
  expected_yield: number | null;
  unit: string | null;
  note: string | null;
}

export interface BatchListParams {
  farm_id?: string;
  season_id?: string;
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

// Field gửi lên khi TẠO/SỬA — KHÔNG có farm_id (BatchCreate không nhận field
// này, backend tự điền từ season_id, xem create_batch() phía agrichain-api)
// — season_id chỉ gửi lúc TẠO (create()), PATCH không đổi mùa vụ của 1 lô
// hàng đã có. Bản gốc dùng CHUNG 1 `record` cho cả tạo/sửa (không có field
// nào chỉ-sửa-mới-có), khớp handleBatchSubmit() trong js/nong-trai-chi-tiet.js.
export interface BatchPayload {
  code: string;
  start_date: string;
  area: number;
  harvest_date: string;
  actual_harvest_date: string;
  expected_yield: number;
  unit: string;
  status: string;
  note: string | null;
}

export const batches = {
  list: (params?: BatchListParams) => request<Page<Batch>>('GET', '/batches', { query: params }),
  // options tuỳ chọn { auth: false } — dùng ở truy-xuat.html (site tĩnh,
  // CHƯA migrate), khai báo sẵn cho đúng khuôn gốc, app/ hiện chưa cần tới.
  get: (id: string, options?: { auth?: boolean }) => request<Batch>('GET', `/batches/${id}`, options),
  getByCode: (code: string, options?: { auth?: boolean }) => request<Batch>('GET', `/batches/by-code/${encodeURIComponent(code)}`, options),
  create: (data: BatchPayload & { season_id: string }) => request<Batch>('POST', '/batches', { body: data }),
  update: (id: string, data: BatchPayload) => request<Batch>('PATCH', `/batches/${id}`, { body: data }),
  remove: (id: string) => request<null>('DELETE', `/batches/${id}`)
};
