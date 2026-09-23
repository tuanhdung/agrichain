// Thay thế AgriChain.api.requireAuth() + requireBusiness() (js/api.js gốc,
// gọi trong <head> mọi trang app-shell) — giữ ĐÚNG logic chặn:
//   - Chưa đăng nhập -> route NỘI BỘ /login?redirect=<đường dẫn hiện tại>
//     (react-router, KHÔNG còn full navigation ra dang-nhap.html tĩnh nữa —
//     xem app/CLAUDE.md mục "Nợ kỹ thuật": 2 origin khác nhau không chia sẻ
//     được localStorage, nên SPA giờ có trang đăng nhập RIÊNG).
//   - Đã đăng nhập nhưng KHÔNG phải 'business' VÀ KHÔNG phải 'platform_admin'
//     (tức là 'customer') -> agriverse-3d.html (site chính — SPA không có gì
//     cho customer, đây VẪN là điều hướng RA NGOÀI SPA thật, full navigation).
//   - 'platform_admin' được coi HỢP LỆ ở đây (dùng CHUNG giao diện với
//     business, chỉ khác nguồn dữ liệu — xem CLAUDE.md gốc mục "Quản trị hệ
//     thống (platform_admin)"), KHÔNG bị chặn bởi ProtectedRoute.
import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { redirectToAgriverse } from '../api/session';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Mặc định true — khớp requireBusiness() được gọi ở ĐỦ 16 trang app-shell
   *  gốc. Chỉ tắt cho 1 route nào đó CHẮC CHẮN không cần (hiện chưa có route
   *  nào trong app/ cần tắt cờ này). */
  requireBusinessAccount?: boolean;
}

export function ProtectedRoute({ children, requireBusinessAccount = true }: ProtectedRouteProps) {
  const { isLoggedIn, isBusiness, isPlatformAdmin } = useAuth();
  const location = useLocation();

  const failsBusiness = isLoggedIn && requireBusinessAccount && !isBusiness && !isPlatformAdmin;

  // 'customer' hợp lệ (đã đăng nhập) nhưng SPA không có gì cho họ — đá RA
  // NGOÀI thật sự (site chính), không phải route nội bộ, nên vẫn cần
  // full navigation qua window.location — giữ trong useEffect (side-effect),
  // không gọi thẳng trong render.
  useEffect(() => {
    if (failsBusiness) redirectToAgriverse();
  }, [failsBusiness]);

  if (!isLoggedIn) {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTo)}`} replace />;
  }

  if (failsBusiness) return null; // đang điều hướng ra ngoài (agriverse-3d.html)

  return <>{children}</>;
}
