// Port api.permissions.* của js/api.js — CHỈ có list(), không phân trang
// (đã xác nhận qua dữ liệu thật, xem CLAUDE.md gốc mục "Trang tai-khoan.html").
//
// ⚠️ Permission KHÔNG có id số — chỉ có `code` (chuỗi, VD "farms.view"), `name`
// (chuỗi hiển thị), `group_name`. GET /permissions trả về ĐÃ NHÓM SẴN theo
// group_name (PermissionGroupOut[]), NHƯNG backend gộp chung `roles.*` và
// `users.*` vào 1 group_name duy nhất ("Quản lý đơn vị") — nơi GỌI (không
// phải lớp api/ này) phải tự nhóm lại theo TIỀN TỐ mã quyền (phần trước dấu
// "." đầu tiên), KHÔNG dùng group_name trực tiếp để hiển thị ma trận, xem
// pages/tai-khoan/permissionMatrix.ts (Bước 3).
import { request } from './http';

export interface Permission {
  code: string;
  name: string;
  group_name: string;
}

export interface PermissionGroup {
  group_name: string;
  permissions: Permission[];
}

export const permissions = {
  list: () => request<PermissionGroup[]>('GET', '/permissions')
};
