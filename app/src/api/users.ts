// Port api.users.* của js/api.js — khuôn CRUD chuẩn + 2 hàm nghiệp vụ riêng
// (resetPassword/transferAdmin) của trang tai-khoan.html. Field/response
// snake_case ĐÚNG NHƯ backend trả về — validate/diễn giải dữ liệu là việc
// của trang gọi, giữ đúng quy ước "api/ chỉ generic".
import { request } from './http';
import type { Page } from './types';

// UserOut thật — CHỈ khai báo field trang tai-khoan.js gốc thật sự dùng tới
// (đúng quy ước đã áp dụng cho Farm/Supply/WorkflowTemplate). Khác `User`
// (api/types.ts) — đó là khuôn phiên đăng nhập (có thêm permissions/
// organization_is_distributor do me() tự gắn), còn đây là 1 bản ghi người
// dùng THƯỜNG trong danh sách GET /users, không có 2 field session-only đó.
export interface OrgUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role_id: number;
  role_name: string;
  is_active: boolean;
}

// UserCreate: email/password/full_name/role_id bắt buộc, phone tuỳ chọn —
// KHÔNG gửi phone rỗng (bỏ hẳn field thay vì chuỗi rỗng, khớp payload gốc).
export interface UserCreatePayload {
  email: string;
  full_name: string;
  password: string;
  role_id: number;
  phone?: string;
}

// UserUpdate KHÔNG có email/password (đổi email chưa hỗ trợ; đổi mật khẩu đi
// qua resetPassword() riêng bên dưới).
export interface UserUpdatePayload {
  full_name: string;
  role_id: number;
  phone: string | null;
  is_active: boolean;
}

export interface UserListParams {
  q?: string;
  page?: number;
  page_size?: number;
  is_active?: boolean;
  [key: string]: unknown;
}

// data: { new_role_id_for_current_admin, password } — password là mật khẩu
// HIỆN TẠI của người gọi (xác thực lại danh tính), KHÔNG phải mật khẩu mới.
export interface TransferAdminPayload {
  new_role_id_for_current_admin: number;
  password: string;
}

export const users = {
  list: (params?: UserListParams) => request<Page<OrgUser>>('GET', '/users', { query: params }),
  get: (id: string) => request<OrgUser>('GET', `/users/${id}`),
  create: (data: UserCreatePayload) => request<OrgUser>('POST', '/users', { body: data }),
  update: (id: string, data: UserUpdatePayload) => request<OrgUser>('PATCH', `/users/${id}`, { body: data }),
  // Xoá mềm — "Vô hiệu hoá" trong giao diện, không phải xoá hẳn bản ghi.
  deactivate: (id: string) => request<null>('DELETE', `/users/${id}`),
  resetPassword: (id: string, newPassword: string) =>
    request<null>('POST', `/users/${id}/reset-password`, { body: { new_password: newPassword } }),
  transferAdmin: (id: string, data: TransferAdminPayload) =>
    request<null>('POST', `/users/${id}/transfer-admin`, { body: data })
};
