// Tương đương AgriChain.api.hasPermission(code) ở bản .html cũ (đọc mảng
// user.permissions đã lưu, KHÔNG gọi API) — chỉ khác là reactive theo
// AuthContext, tự re-render khi user đổi (VD sau khi refreshFromStorage()).
//
// Lưu ý: platform_admin luôn có permissions = [] (role không gán quyền nào,
// xem CLAUDE.md gốc mục "Quản trị hệ thống (platform_admin)") nên
// usePermission(code) tự động trả về false với platform_admin ở MỌI mã
// quyền — không cần thêm nhánh chặn riêng, hành vi "chặn platform_admin ở
// require_permission" mà yêu cầu ban đầu nhắc tới đã có SẴN nhờ dữ liệu
// backend, không phải logic phải tự viết thêm ở đây.
import { useAuth } from '../context/AuthContext';

export function usePermission(code: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(code);
}
