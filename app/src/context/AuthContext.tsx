// Thay thế phần "phiên đăng nhập" của js/app-shell.js (requireSession(),
// fillSession(), setupLogout()) bằng React Context — 1 nguồn state DUY NHẤT
// cho toàn SPA thay vì mỗi trang .html tự đọc lại DOM lúc DOMContentLoaded.
//
// ⚠️ Khác biệt CỐ Ý so với bản .js gốc (cần thiết CHO RIÊNG SPA, không phải
// thiếu sót): bản .js gốc mỗi lần chuyển trang là tải lại HTML thật, nên
// luôn tự đọc lại storage mới nhất. SPA thì KHÔNG — nếu người dùng đăng
// xuất/đăng nhập lại ở MỘT TAB KHÁC (cùng origin) hoặc bấm Back sau khi rời
// SPA (bfcache khôi phục lại y nguyên JS heap cũ, không chỉ DOM — xem
// js/api.js gốc mục "Bug bảo mật đã vá — bfcache"), state trong Context sẽ
// LỆCH với storage thật nếu không tự đồng bộ lại. 2 listener dưới đây
// (`storage`, `pageshow`) giải quyết đúng 2 ca đó — port TINH THẦN của cơ
// chế pageshow/bfcache gốc, áp dụng cho state React thay vì DOM.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api';
import { mainSiteUrl } from '../api/config';
import type { User } from '../api';

interface AuthContextValue {
  user: User | null;
  isLoggedIn: boolean;
  isBusiness: boolean;
  isPlatformAdmin: boolean;
  hasPermission: (code: string) => boolean;
  /** true trong lúc đang dò phiên qua cookie httpOnly (xem bootstrap ở dưới)
   *  — ProtectedRoute PHẢI chờ giá trị này về false trước khi kết luận "chưa
   *  đăng nhập", nếu không sẽ đá nhầm người dùng ra trang đăng nhập trong lúc
   *  lượt dò còn đang chạy (race condition, xem ProtectedRoute.tsx). */
  isBootstrapping: boolean;
  /** Lỗi KHÔNG PHẢI 401 gặp lúc dò phiên (mất mạng, CORS, backend 5xx...) —
   *  KHÁC "chưa đăng nhập" (401), ProtectedRoute PHẢI hiện thông báo lỗi +
   *  nút "Thử lại" thay vì redirect, nếu không sẽ tạo vòng lặp redirect mỗi
   *  khi backend sập tạm thời (xem bootstrapFromCookie() ở http.ts). `null`
   *  nghĩa là lượt dò gần nhất không có lỗi (thành công hoặc 401 bình
   *  thường). */
  bootstrapError: Error | null;
  /** Chạy lại lượt dò phiên qua cookie — dùng bởi nút "Thử lại" ở
   *  ProtectedRoute khi bootstrapError khác null. */
  retryBootstrap: () => void;
  logout: () => Promise<void>;
  /** Đọc lại user từ storage — dùng sau khi 1 trang khác (VD form đổi hồ sơ
   *  sau này) tự cập nhật agrichain.user mà không qua Context này. */
  refreshFromStorage: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => api.getUser());
  // Chỉ cần bootstrap (gọi /auth/me dựa vào cookie) khi origin NÀY chưa có
  // sẵn user trong storage — có rồi (lần bootstrap trước đã lưu, hoặc phiên
  // vừa được TransferAdminModal.tsx làm mới ngầm) thì khỏi gọi thêm 1
  // request thừa.
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(() => !api.getUser());
  const [bootstrapError, setBootstrapError] = useState<Error | null>(null);
  // Đổi mỗi lần retryBootstrap() được gọi — đưa vào dependency array của
  // effect bootstrap bên dưới để CHỦ ĐỘNG chạy lại đúng 1 lần, không cần
  // tách logic bootstrap ra khỏi effect.
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  const refreshFromStorage = useCallback(() => {
    setUser(api.getUser());
  }, []);

  const retryBootstrap = useCallback(() => {
    setIsBootstrapping(true);
    setBootstrapError(null);
    setBootstrapAttempt((n) => n + 1);
  }, []);

  // Bootstrap phiên đăng nhập từ cookie httpOnly access_token (xem CLAUDE.md
  // gốc mục "Kết nối backend") — ca người dùng đăng nhập ở SITE TĨNH rồi mới
  // bấm sang SPA: localStorage của app.* (origin RIÊNG) trống trơn, nhưng
  // cookie Domain=COOKIE_DOMAIN (nếu đã cấu hình, VD .agrichain.local) vẫn
  // còn hợp lệ. Chạy lúc mount VÀ mỗi lần retryBootstrap() tăng
  // bootstrapAttempt — nếu origin này VỐN ĐÃ có user, bỏ qua hẳn lượt đầu
  // tiên, không gọi API thừa (nhưng retryBootstrap() vẫn chạy lại được nếu
  // người dùng chủ động bấm "Thử lại" sau 1 lỗi mạng).
  useEffect(() => {
    if (bootstrapAttempt === 0 && api.getUser()) return;
    let cancelled = false;
    api.auth
      .bootstrapFromCookie()
      .then((bootstrapped) => {
        if (cancelled) return;
        setUser(bootstrapped);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setBootstrapError(err instanceof Error ? err : new Error('Không dò được phiên đăng nhập.'));
      })
      .finally(() => {
        if (cancelled) return;
        setIsBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapAttempt]);

  useEffect(() => {
    // Tab khác (cùng origin) đăng nhập/đăng xuất — 'storage' KHÔNG bắn ở
    // chính tab vừa ghi, chỉ bắn ở các tab KHÁC, đúng ý dùng ở đây.
    function onStorage(event: StorageEvent) {
      if (event.key === 'agrichain.user' || event.key === 'agrichain.access_token') {
        refreshFromStorage();
      }
    }
    // bfcache khôi phục lại nguyên JS heap cũ (kể cả state React) — đọc lại
    // storage THẬT để không hiện nhầm phiên đã hết hạn/đã đổi, cùng mẫu
    // 'pageshow' đã áp dụng nhiều lần trong dự án gốc (xem js/api.js).
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) refreshFromStorage();
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [refreshFromStorage]);

  const logout = useCallback(async () => {
    // best-effort: SPA thường KHÔNG có refresh_token thật cục bộ (phiên
    // thuần bootstrap-qua-cookie, xem http.ts::logout()) nên chỉ gửi được
    // placeholder — vẫn xoá được cookie dùng chung, nhưng KHÔNG revoke được
    // refresh_token THẬT (nằm trong localStorage của SITE TĨNH, origin
    // khác, SPA không đọc được). Việc revoke thật + xoá localStorage của
    // site tĩnh do CHÍNH site tĩnh tự làm khi nhận `?loggedOut=1` bên dưới —
    // xem js/auth.js. Ngoại lệ: sau khi TransferAdminModal.tsx tự đăng nhập
    // lại ngầm, SPA CÓ giữ refresh_token thật — lúc đó lời gọi này mới thật
    // sự revoke được token đó.
    await api.auth.logout().catch(() => undefined);
    // dang-nhap.html là trang TĨNH, ở SUBDOMAIN KHÁC (agrichain.org.vn, app/
    // ở app.agrichain.org.vn) — phải full navigation tuyệt đối qua
    // mainSiteUrl(), không dùng react-router, không dùng đường dẫn tương đối
    // — xem app/CLAUDE.md mục "Giả định host".
    //
    // ⚠️ `?loggedOut=1` BẮT BUỘC, không phải trang trí (bug thật đã gặp,
    // 2026-09-29): thiếu cờ này, `dang-nhap.html` thấy localStorage CỦA NÓ
    // (site tĩnh, chưa từng bị đụng tới — 2 origin khác nhau) vẫn còn phiên
    // cũ nên tự bấm NGƯỢC lại SPA, SPA dò cookie thấy đã bị xoá (401) nên lại
    // đẩy về đây — VÒNG LẶP VÔ HẠN giữa 2 origin. Cờ này báo cho auth.js biết
    // đây là một lượt ĐĂNG XUẤT (không phải "ghé thăm bình thường"), phải tự
    // đăng xuất thật (xoá localStorage + revoke refresh_token thật của chính
    // nó) trước khi hiện lại form, xem js/auth.js::setupLogin().
    //
    // ⚠️ CỐ TÌNH KHÔNG gọi setUser(null) trước dòng điều hướng này (bug thật
    // KHÁC đã gặp, cùng ngày, sau khi thêm ?loggedOut=1 ở trên rồi vẫn còn
    // vòng lặp): setUser(null) đổi state -> AuthProvider re-render ->
    // isLoggedIn thành false -> ProtectedRoute's effect (shouldRedirectToLogin)
    // TỰ gọi redirectToLogin() (session.ts) NGAY TRONG CÙNG khung xử lý sự
    // kiện — và vì effect + việc gán window.location.href ở ProtectedRoute
    // hoàn toàn có thể chạy TRƯỚC khi trình duyệt thật sự bắt đầu điều hướng
    // (window.location.href chỉ LÊN LỊCH điều hướng, không dừng JS ngay lập
    // tức), redirectToLogin() ghi ĐÈ href này bằng
    // `dang-nhap.html?next=<url SPA hiện tại>` — mất hẳn `?loggedOut=1`.
    // Hậu quả: js/auth.js không nhận diện được đây là lượt đăng xuất, thấy
    // phiên site tĩnh vẫn còn nên tự đẩy NGƯỢC lại đúng URL SPA vừa rời đi
    // (qua chính `next` đó) — quay lại y hệt vòng lặp cũ. Component sắp bị
    // huỷ hoàn toàn ngay sau dòng này (full navigation) nên không cần cập
    // nhật `user` state cho bất kỳ mục đích hiển thị nào — chỉ cần KHÔNG đổi
    // state để ProtectedRoute không có cớ tự điều hướng chồng lên.
    window.location.href = `${mainSiteUrl('dang-nhap.html')}?loggedOut=1`;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoggedIn: !!user,
      isBootstrapping,
      bootstrapError,
      retryBootstrap,
      isBusiness: user?.account_type === 'business',
      isPlatformAdmin: user?.account_type === 'platform_admin',
      hasPermission: (code: string) => (user?.permissions ?? []).includes(code),
      logout,
      refreshFromStorage
    }),
    [user, isBootstrapping, bootstrapError, retryBootstrap, logout, refreshFromStorage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() phải gọi bên trong <AuthProvider>');
  return ctx;
}
