// Port api.farms.* của js/api.js — khuôn CRUD chuẩn, chỉ bọc mỏng quanh
// request(). Field/response snake_case ĐÚNG NHƯ backend trả về (national_puc,
// international_puc, start_date, polygon: [{lat,lng}]) — xem js/nong-trai.js
// gốc. `polygon` NOT NULL, tối thiểu 3 điểm (FarmCreate/FarmUpdate,
// minItems: 3, xác nhận qua /openapi.json — xem CLAUDE.md gốc).
import { request } from './http';
import type { Page } from './types';

export interface FarmPoint {
  lat: number;
  lng: number;
}

// Khuôn FarmOut thật — KHÔNG suy đoán thêm field ngoài những gì
// FarmsPage.tsx/FarmFormModal.tsx thật sự dùng tới (đúng quy ước đã áp dụng
// cho Supply/WorkflowTemplate).
export interface Farm {
  id: string;
  code: string;
  name: string;
  national_puc: string | null;
  international_puc: string | null;
  province: string;
  ward: string;
  address: string;
  start_date: string;
  area: number;
  description: string;
  polygon: FarmPoint[];
}

export interface FarmPayload {
  code: string;
  name: string;
  national_puc: string | null;
  international_puc: string | null;
  province: string;
  ward: string;
  address: string;
  start_date: string;
  area: number;
  description: string;
  polygon: FarmPoint[];
}

export interface FarmListParams {
  q?: string;
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

export const farms = {
  list: (params?: FarmListParams) => request<Page<Farm>>('GET', '/farms', { query: params }),
  // options tuỳ chọn { auth: false } — route này đã mở public-read ở backend
  // (dùng cho truy-xuat.html/nong-trai-chi-tiet.html khi platform_admin xem
  // ?id=), app/ hiện chưa cần tới nhánh auth:false nhưng khai báo sẵn cho
  // đúng khuôn gốc.
  get: (id: string, options?: { auth?: boolean }) => request<Farm>('GET', `/farms/${id}`, options),
  create: (data: FarmPayload) => request<Farm>('POST', '/farms', { body: data }),
  update: (id: string, data: FarmPayload) => request<Farm>('PATCH', `/farms/${id}`, { body: data }),
  remove: (id: string) => request<null>('DELETE', `/farms/${id}`)
};
