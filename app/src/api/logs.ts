// Port api.logs.* của js/api.js — khuôn CRUD chuẩn, chỉ bọc mỏng quanh
// request(). Field/response snake_case ĐÚNG NHƯ backend trả về — xem
// js/nong-trai-chi-tiet.js gốc.
//
// ⚠️ Danh sách (GET /logs) CHỈ trả METADATA ảnh (LogImage: name/mime/size,
// KHÔNG có url) — xem nội dung ảnh thật phải gọi get(id) riêng (LogDetail,
// images có url), và CHỈ gọi khi người dùng thật sự bấm "Xem ảnh", không tải
// trước cho toàn bộ danh sách (khớp CLAUDE.md gốc mục "Trang Hoạt động sản
// xuất").
import { request } from './http';
import type { Page } from './types';

// LogSupply — ĐÚNG 7 trường (đã xác nhận qua /openapi.json trước khi code,
// khác SCHEMA-EXPORT.md bản cũ chỉ 6 trường — xem CLAUDE.md gốc). code/name
// là BẢN CHỤP tại thời điểm ghi, không đồng bộ lại nếu vật tư gốc đổi tên/mã
// sau đó.
export interface LogSupply {
  supply_id: string;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  method: string | null;
  purpose: string | null;
}

// Metadata ảnh trong bản LIST — không có nội dung thật.
export interface LogImage {
  name: string;
  mime?: string;
  size?: number;
}

// Ảnh có nội dung thật — CHỈ có trong bản DETAIL (get(id)).
export interface LogImageDetail {
  name: string;
  url: string;
}

// Khuôn LogOut (bản LIST) — CHỈ field trang nong-trai-chi-tiet thật sự dùng
// tới (đúng quy ước đã áp dụng cho Farm/Supply/Certification...).
export interface Log {
  id: string;
  season_id: string;
  // Gắn với 1 bước quy trình mùa vụ khi hoàn thành qua "Ghi nhật ký & hoàn
  // thành" (xem Bước 5) — luôn null với nhật ký tạo thủ công bình thường.
  step_id: string | null;
  activity_type: string;
  performed_at: string;
  performed_by: string;
  weather: string | null;
  description: string | null;
  supplies: LogSupply[];
  images: LogImage[];
}

// GET /logs/{id} — bản DETAIL, images có url thật.
export interface LogDetail extends Omit<Log, 'images'> {
  images: LogImageDetail[];
}

export interface LogPayload {
  // Chỉ gửi lúc TẠO (POST) — PATCH không đổi season_id của 1 nhật ký.
  season_id?: string;
  step_id: string | null;
  activity_type: string;
  performed_at: string;
  performed_by: string;
  weather: string | null;
  description: string | null;
  supplies: LogSupply[];
  images: { name: string; url: string }[];
}

export interface LogListParams {
  season_id?: string;
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

export const logs = {
  list: (params?: LogListParams) => request<Page<Log>>('GET', '/logs', { query: params }),
  get: (id: string) => request<LogDetail>('GET', `/logs/${id}`),
  create: (data: LogPayload) => request<Log>('POST', '/logs', { body: data }),
  update: (id: string, data: Partial<LogPayload>) => request<Log>('PATCH', `/logs/${id}`, { body: data }),
  remove: (id: string) => request<null>('DELETE', `/logs/${id}`)
};
