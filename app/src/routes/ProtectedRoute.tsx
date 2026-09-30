// Thay thế AgriChain.api.requireAuth() + requireBusiness() (js/api.js gốc,
// gọi trong <head> mọi trang app-shell) — giữ ĐÚNG logic chặn:
//   - Chưa đăng nhập (bootstrap qua cookie xác nhận 401) -> full navigation
//     RA NGOÀI, sang trang đăng nhập DUY NHẤT của site tĩnh, kèm `next` để
//     quay lại đúng chỗ (xem redirectToLogin() ở session.ts — SPA không còn
//     trang /login riêng từ 2026-09-29, xem app/CLAUDE.md mục "Giả định host").
//   - Lỗi KHÁC 401 lúc dò phiên (mất mạng, CORS, backend 5xx) -> KHÔNG
//     redirect (tránh vòng lặp redirect khi backend sập tạm thời) — hiện
//     thông báo lỗi + nút "Thử lại" ngay tại chỗ.
//   - Đã đăng nhập nhưng KHÔNG phải 'business' VÀ KHÔNG phải 'platform_admin'
//     (tức là 'customer') -> agriverse-3d.html (site chính — SPA không có gì
//     cho customer, đây VẪN là điều hướng RA NGOÀI SPA thật, full navigation).
//   - 'platform_admin' được coi HỢP LỆ ở đây (dùng CHUNG giao diện với
//     business, chỉ khác nguồn dữ liệu — xem CLAUDE.md gốc mục "Quản trị hệ
//     thống (platform_admin)"), KHÔNG bị chặn bởi ProtectedRoute.
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { redirectToAgriverse, redirectToLogin } from '../api/session';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Mặc định true — khớp requireBusiness() được gọi ở ĐỦ 16 trang app-shell
   *  gốc. Chỉ tắt cho 1 route nào đó CHẮC CHẮN không cần (hiện chưa có route
   *  nào trong app/ cần tắt cờ này). */
  requireBusinessAccount?: boolean;
}

export function ProtectedRoute({ children, requireBusinessAccount = true }: ProtectedRouteProps) {
  const { isLoggedIn, isBootstrapping, bootstrapError, retryBootstrap, isBusiness, isPlatformAdmin } = useAuth();

  const failsBusiness = isLoggedIn && requireBusinessAccount && !isBusiness && !isPlatformAdmin;

  // 'customer' hợp lệ (đã đăng nhập) nhưng SPA không có gì cho họ — đá RA
  // NGOÀI thật sự (site chính), không phải route nội bộ, nên vẫn cần
  // full navigation qua window.location — giữ trong useEffect (side-effect),
  // không gọi thẳng trong render.
  useEffect(() => {
    if (failsBusiness) redirectToAgriverse();
  }, [failsBusiness]);

  // Chỉ redirect ra trang đăng nhập khi ĐÃ dò xong (không còn bootstrapping),
  // KHÔNG có lỗi mạng/CORS/5xx nào (bootstrapError null — có lỗi thì rơi
  // xuống nhánh hiện thông báo bên dưới, KHÔNG redirect), và xác nhận thật
  // sự chưa đăng nhập (401). Gộp cả 3 điều kiện trong effect để chỉ gọi
  // window.location MỘT LẦN, không phải mỗi lần render.
  const shouldRedirectToLogin = !isBootstrapping && !bootstrapError && !isLoggedIn;
  useEffect(() => {
    if (shouldRedirectToLogin) redirectToLogin();
  }, [shouldRedirectToLogin]);

  // Đang dò phiên qua cookie httpOnly (AuthContext, xem CLAUDE.md gốc mục
  // "Kết nối backend") — CHƯA kết luận được gì cả, kể cả "chưa đăng nhập".
  // Hiện trạng thái loading rõ ràng (không phải màn trắng) — tránh nhấp nháy
  // nội dung/form trong lúc chờ request /auth/me trả lời.
  if (isBootstrapping) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Đang tải...</p>
      </div>
    );
  }

  // Lỗi mạng/CORS/backend sập khi dò phiên — KHÔNG kết luận "chưa đăng nhập",
  // KHÔNG redirect (xem comment đầu file: tránh vòng lặp redirect). Người
  // dùng tự quyết định thử lại khi nào (VD sau khi backend/mạng phục hồi).
  if (bootstrapError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
        <div className="card" style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div className="card__body">
            <p className="field__error" style={{ marginBottom: 'var(--space-4)' }}>
              Không kết nối được máy chủ để kiểm tra phiên đăng nhập. Kiểm tra mạng rồi thử lại.
            </p>
            <button type="button" className="btn btn--primary" onClick={retryBootstrap}>
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) return null; // đang điều hướng ra ngoài (trang đăng nhập site tĩnh)

  if (failsBusiness) return null; // đang điều hướng ra ngoài (agriverse-3d.html)

  return <>{children}</>;
}
