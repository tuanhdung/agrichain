// Khuôn dữ liệu dùng chung cho lớp api/ — port từ ghi chú trong CLAUDE.md gốc
// (mục "Kết nối backend", "Trang tai-khoan.html") + response THẬT đã xác nhận
// qua /openapi.json, KHÔNG suy đoán thêm field nào ngoài những gì tài liệu đó
// đã ghi. Khai báo type ở đây là lý do chính để chọn TypeScript cho app/ —
// xem app/CLAUDE.md.

export type AccountType = 'customer' | 'business' | 'platform_admin';

// UserOut thật có nhiều field hơn — chỉ khai báo những field lớp api/ hoặc
// trang pilot (vat-tu) THẬT SỰ dùng tới. Thêm field mới khi trang sau cần,
// đừng khai báo khống trước.
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  account_type: AccountType;
  organization_id: string | null;
  // role_id là SỐ nguyên (khác id UUID của farms/supplies/...) — xác nhận
  // qua js/tai-khoan.js gốc (Number(data.get('roleId')), role.id === user.role_id
  // so sánh chặt không ép kiểu) — xem app/src/api/roles.ts.
  role_id?: number;
  role_name?: string;
  is_active?: boolean;
  // 2 field dưới đây KHÔNG có sẵn trong UserOut gốc — do me()/updateMe() tự
  // gắn thêm trước khi lưu (xem js/api.js gốc, hàm me()). Luôn có mặt sau khi
  // đăng nhập thành công qua auth.login()/auth.me() của module này.
  permissions: string[];
  organization_is_distributor: boolean | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

// GET /auth/me — { user, permissions, organization_is_distributor } (object
// BỌC NGOÀI, KHÔNG phải User phẳng — bug thật đã gặp ở bản .js gốc nếu quên
// bóc tách, xem js/api.js#me()).
export interface MeResponse {
  user: Omit<User, 'permissions' | 'organization_is_distributor'>;
  permissions: string[];
  organization_is_distributor: boolean | null;
}

// Khuôn Page[T] chung cho mọi danh sách phân trang (farms/seasons/supplies/...
// và cả api.system.*) — { items, total, page, page_size }.
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ApiErrorDetails {
  field?: string;
  [key: string]: unknown;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | string;
