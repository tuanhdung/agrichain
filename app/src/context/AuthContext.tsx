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
   *  đăng nhập", nếu không sẽ đá nhầm người dùng ra /login trong lúc lượt dò
   *  còn đang chạy (race condition, xem ProtectedRoute.tsx). */
  isBootstrapping: boolean;
  /** Đăng nhập NGAY TRONG SPA (LoginPage.tsx) — bọc api.auth.login(), tự cập
   *  nhật state sau khi thành công. Trả về User để nơi gọi tự tính điều
   *  hướng tiếp theo (xem src/routes/postLogin.ts). */
  login: (email: string, password: string, remember: boolean) => Promise<User>;
  logout: () => Promise<void>;
  /** Đọc lại user từ storage — dùng sau khi 1 trang khác (VD form đổi hồ sơ
   *  sau này) tự cập nhật agrichain.user mà không qua Context này. */
  refreshFromStorage: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => api.getUser());
  // Chỉ cần bootstrap (gọi /auth/me dựa vào cookie) khi origin NÀY chưa có
  // sẵn user trong storage — có rồi (đăng nhập thẳng trong SPA qua /login,
  // hoặc lần bootstrap trước đã lưu) thì khỏi gọi thêm 1 request thừa.
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(() => !api.getUser());

  const refreshFromStorage = useCallback(() => {
    setUser(api.getUser());
  }, []);

  // Bootstrap phiên đăng nhập từ cookie httpOnly access_token (xem CLAUDE.md
  // gốc mục "Kết nối backend") — ca người dùng đăng nhập ở SITE TĨNH rồi mới
  // bấm sang SPA: localStorage của app.* (origin RIÊNG) trống trơn, nhưng
  // cookie Domain=COOKIE_DOMAIN (nếu đã cấu hình, VD .agrichain.local) vẫn
  // còn hợp lệ. Chạy ĐÚNG 1 LẦN lúc mount, không phụ thuộc gì khác — nếu
  // origin này VỐN ĐÃ có user (đăng nhập thẳng qua SPA), bỏ qua hẳn, không
  // gọi API thừa.
  useEffect(() => {
    if (api.getUser()) return;
    let cancelled = false;
    api.auth.bootstrapFromCookie().then((bootstrapped) => {
      if (cancelled) return;
      if (bootstrapped) setUser(bootstrapped);
      setIsBootstrapping(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const loggedInUser = await api.auth.login(email, password, remember);
    setUser(loggedInUser);
    // Phòng hờ: nếu login() xảy ra trong lúc lượt bootstrap-từ-cookie ở trên
    // còn đang chạy (hiếm, chỉ khi người dùng gõ xong form đăng nhập cực
    // nhanh), kết luận NGAY user vừa đăng nhập, không chờ bootstrap nữa.
    setIsBootstrapping(false);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
    // dang-nhap.html là trang TĨNH cũ, ở SUBDOMAIN KHÁC (agrichain.org.vn,
    // app/ ở app.agrichain.org.vn) — phải full navigation tuyệt đối qua
    // mainSiteUrl(), không dùng react-router, không dùng đường dẫn tương đối
    // — xem app/CLAUDE.md mục "Giả định host".
    window.location.href = mainSiteUrl('dang-nhap.html');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoggedIn: !!user,
      isBootstrapping,
      isBusiness: user?.account_type === 'business',
      isPlatformAdmin: user?.account_type === 'platform_admin',
      hasPermission: (code: string) => (user?.permissions ?? []).includes(code),
      login,
      logout,
      refreshFromStorage
    }),
    [user, isBootstrapping, login, logout, refreshFromStorage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() phải gọi bên trong <AuthProvider>');
  return ctx;
}
