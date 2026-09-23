// Port api.supplies.* của js/api.js — khuôn CRUD chuẩn, chỉ bọc mỏng quanh
// request(). Field/response snake_case ĐÚNG NHƯ backend trả về, không đổi
// tên — validate/diễn giải dữ liệu là việc của trang gọi (xem
// pages/vat-tu/VatTuPage.tsx), giữ đúng quy ước "api/ chỉ generic" của
// js/api.js gốc.
import { request } from './http';
import type { Page } from './types';

// Khuôn SupplyOut thật (đã xác nhận qua js/vat-tu.js gốc + CLAUDE.md) —
// KHÔNG suy đoán thêm field ngoài những gì trang pilot này dùng tới.
export interface Supply {
  id: string;
  code: string;
  type: string;
  name: string;
  manufacturer: string | null;
  unit: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface SupplyPayload {
  code: string;
  type: string;
  name: string;
  manufacturer: string;
  unit: string;
  description: string | null;
}

export interface SupplyListParams {
  q?: string;
  type?: string;
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

export const supplies = {
  list: (params?: SupplyListParams) => request<Page<Supply>>('GET', '/supplies', { query: params }),
  get: (id: string) => request<Supply>('GET', `/supplies/${id}`),
  create: (data: SupplyPayload) => request<Supply>('POST', '/supplies', { body: data }),
  update: (id: string, data: SupplyPayload) => request<Supply>('PATCH', `/supplies/${id}`, { body: data }),
  remove: (id: string) => request<null>('DELETE', `/supplies/${id}`)
};
