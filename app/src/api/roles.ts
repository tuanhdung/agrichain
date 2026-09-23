// Port api.roles.* của js/api.js — khuôn CRUD chuẩn (list không phân trang,
// đã xác nhận qua dữ liệu thật). Trang tai-khoan.js gốc chỉ thực sự dùng
// list()/update() qua giao diện (không có "Thêm vai trò"/"Xoá vai trò" nào
// trong tai-khoan.html) — vẫn port đủ create/remove ở lớp api/ này để khớp
// 1:1 với js/api.js gốc, KHÔNG có nghĩa Bước sau sẽ thêm UI cho 2 hàm đó.
import { request } from './http';

// role_id là SỐ nguyên (khác UUID của farms/supplies/...) — xác nhận qua
// js/tai-khoan.js gốc, xem ghi chú ở api/types.ts.
export interface Role {
  id: number;
  name: string;
  // is_system=true (VD "Quản trị Đơn vị" tự tạo lúc đăng ký business) —
  // PATCH /roles/{id} sửa `permissions` của vai trò này bị backend chặn,
  // trả 409 CONFLICT (xem CLAUDE.md gốc).
  is_system: boolean;
  // Mảng CHUỖI mã quyền thuần (KHÔNG phải mảng object/id) — đã xác nhận qua
  // /openapi.json + dữ liệu thật.
  permissions: string[];
}

export interface RoleCreatePayload {
  name: string;
  permissions: string[];
}

// PATCH /roles/{id} nhận field "permissions" — THAY THẾ TOÀN BỘ danh sách cũ
// (không merge phía backend) — nơi gọi phải tự ghép các mã quyền hiện có
// KHÔNG hiển thị trên ma trận trước khi gửi, xem
// pages/tai-khoan/PermissionModal.tsx (Bước 3).
export interface RoleUpdatePayload {
  name?: string;
  permissions?: string[];
}

export const roles = {
  list: () => request<Role[]>('GET', '/roles'),
  get: (id: number) => request<Role>('GET', `/roles/${id}`),
  create: (data: RoleCreatePayload) => request<Role>('POST', '/roles', { body: data }),
  update: (id: number, data: RoleUpdatePayload) => request<Role>('PATCH', `/roles/${id}`, { body: data }),
  remove: (id: number) => request<null>('DELETE', `/roles/${id}`)
};
