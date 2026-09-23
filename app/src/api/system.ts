// Port api.system.* của js/api.js — route CHỈ ĐỌC dành riêng platform_admin,
// nhìn xuyên MỌI Đơn vị (xem CLAUDE.md gốc mục "Quản trị hệ thống
// (platform_admin)"). Response mỗi bản ghi kèm field PHẲNG `organization_name`
// (không có ở *Out thường). KHÔNG có tham số tìm kiếm `q` — chỉ page/page_size,
// đúng như router thật (app/routers/system.py phía agrichain-api).
//
// Domain đã port: `supplies` (vat-tu), `workflowTemplates` (mau-quy-trinh),
// `farms` (nong-trai), `batches` (lo-hang) — thêm domain khác (seasons/...)
// khi trang tương ứng được migrate, theo ĐÚNG mẫu dưới đây (xem
// app/CLAUDE.md mục "Thêm 1 trang mới").
import { request } from './http';
import type { Page } from './types';
import type { Supply } from './supplies';
import type { WorkflowTemplate } from './workflowTemplates';
import type { Farm } from './farms';
import type { Batch } from './batches';
import type { Certification } from './certifications';
import type { Season } from './seasons';
import type { Log } from './logs';

export type SupplySystemRow = Supply & { organization_name: string };
export type WorkflowTemplateSystemRow = WorkflowTemplate & { organization_name: string };
export type FarmSystemRow = Farm & { organization_name: string };
export type BatchSystemRow = Batch & { organization_name: string };
export type CertificationSystemRow = Certification & { organization_name: string };
export type SeasonSystemRow = Season & { organization_name: string };
export type LogSystemRow = Log & { organization_name: string };

export interface SystemListParams {
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

export const system = {
  supplies: {
    list: (params?: SystemListParams) =>
      request<Page<SupplySystemRow>>('GET', '/system/supplies', { query: params })
  },
  workflowTemplates: {
    list: (params?: SystemListParams) =>
      request<Page<WorkflowTemplateSystemRow>>('GET', '/system/workflow-templates', { query: params })
  },
  farms: {
    list: (params?: SystemListParams) => request<Page<FarmSystemRow>>('GET', '/system/farms', { query: params })
  },
  // KHÔNG có tham số lọc farm_id/season_id/q — route /system/batches chỉ
  // nhận page/page_size, đã xác nhận qua CLAUDE.md gốc (mục "Quản trị hệ
  // thống (platform_admin)": "GET /system/* không có tham số lọc theo
  // farm_id/season_id"). Bộ lọc Nông trại/Mùa vụ vì vậy ẩn hẳn ở chế độ
  // platform_admin (xem pages/lo-hang/LoHangPage.tsx), không phải chỉ vô
  // hiệu hoá.
  batches: {
    list: (params?: SystemListParams) => request<Page<BatchSystemRow>>('GET', '/system/batches', { query: params })
  },
  // KHÔNG có tham số lọc farm_id — cùng hạn chế "chỉ page/page_size" như
  // batches ở trên, xem nong-trai-chi-tiet/systemPaging.ts (fetchAllSystemPages())
  // và cách dùng ở NongTraiChiTietPage.tsx (tự lọc lại theo farm_id ở client).
  certifications: {
    list: (params?: SystemListParams) =>
      request<Page<CertificationSystemRow>>('GET', '/system/certifications', { query: params })
  },
  // KHÔNG có tham số lọc farm_id — cùng hạn chế "chỉ page/page_size" như các
  // route /system/* khác, xem nong-trai-chi-tiet/systemPaging.ts.
  seasons: {
    list: (params?: SystemListParams) => request<Page<SeasonSystemRow>>('GET', '/system/seasons', { query: params })
  },
  // KHÔNG có tham số lọc season_id — cùng hạn chế trên.
  logs: {
    list: (params?: SystemListParams) => request<Page<LogSystemRow>>('GET', '/system/logs', { query: params })
  }
};
