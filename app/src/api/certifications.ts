// Port api.certifications.* của js/api.js — khuôn CRUD chuẩn, chỉ bọc mỏng
// quanh request(). Field/response snake_case ĐÚNG NHƯ backend trả về
// (issue_date, expiry_date, file_name, file_url) — xem js/nong-trai-chi-tiet.js
// gốc.
//
// ⚠️ Danh sách (GET /certifications) CHỈ trả METADATA tệp (file_name), KHÔNG
// có file_url — xem nội dung tệp thật phải gọi get(id) riêng (CertificationDetail),
// và CHỈ gọi khi người dùng thật sự bấm xem/sửa, không tải trước cho toàn bộ
// danh sách (khớp CLAUDE.md gốc mục "Trang Hoạt động sản xuất").
import { request } from './http';
import type { Page } from './types';

// Khuôn CertificationOut (bản LIST) — CHỈ field trang nong-trai-chi-tiet thật
// sự dùng tới (đúng quy ước đã áp dụng cho Farm/Supply/WorkflowTemplate).
export interface Certification {
  id: string;
  farm_id: string;
  name: string;
  code: string;
  issuer: string;
  status: string;
  issue_date: string;
  expiry_date: string;
  note: string | null;
  file_name: string | null;
}

// GET /certifications/{id} — bản DETAIL, có thêm file_url thật.
export interface CertificationDetail extends Certification {
  file_url: string | null;
}

export interface CertificationPayload {
  // Chỉ gửi lúc TẠO (POST) — PATCH không đổi farm_id của 1 chứng nhận.
  farm_id?: string;
  name: string;
  code: string;
  issuer: string;
  status: string;
  issue_date: string;
  expiry_date: string;
  note: string | null;
  // Không gửi (undefined) = giữ nguyên tệp cũ lúc PATCH; gửi null = gỡ tệp;
  // gửi {name,url} = thay tệp mới — khớp handleCertSubmit() gốc.
  file_name?: string | null;
  file_url?: string | null;
}

export interface CertificationListParams {
  farm_id?: string;
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

export const certifications = {
  list: (params?: CertificationListParams) => request<Page<Certification>>('GET', '/certifications', { query: params }),
  get: (id: string) => request<CertificationDetail>('GET', `/certifications/${id}`),
  create: (data: CertificationPayload) => request<Certification>('POST', '/certifications', { body: data }),
  update: (id: string, data: Partial<CertificationPayload>) =>
    request<Certification>('PATCH', `/certifications/${id}`, { body: data }),
  remove: (id: string) => request<null>('DELETE', `/certifications/${id}`)
};
