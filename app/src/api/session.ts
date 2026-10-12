// Port 1:1 phần "Chọn storage" + "Phiên đăng nhập" của js/api.js — GIỮ
// NGUYÊN tên key localStorage/sessionStorage ('agrichain.access_token'...).
//
// Kiến trúc ĐÃ CHỐT là SUBDOMAIN riêng (app.agrichain.org.vn khác hẳn
// agrichain.org.vn) — 2 domain này là 2 ORIGIN KHÁC NHAU, nên Web Storage
// (localStorage/sessionStorage) KHÔNG dùng chung được giữa site tĩnh và
// app/. Việc "thấy phiên đã đăng nhập" giữa 2 origin giờ đi qua cookie
// httpOnly `access_token` (Domain=COOKIE_DOMAIN, backend agrichain-api) +
// bước bootstrap chủ động của AuthContext (gọi GET /auth/me lúc SPA mount) —
// xem app/CLAUDE.md mục "Giả định host". SPA (2026-09-29) không còn trang
// đăng nhập riêng — mọi lượt đăng nhập đều qua dang-nhap.html của site
// tĩnh, xem redirectToLogin() bên dưới.
import { mainSiteUrl } from './config';
import type { User } from './types';

const ACCESS_TOKEN_KEY = 'agrichain.access_token';
const REFRESH_TOKEN_KEY = 'agrichain.refresh_token';
const USER_KEY = 'agrichain.user';
const STORAGE_MODE_KEY = 'agrichain.storage_mode';

type StorageMode = 'local' | 'session';

function getStorageMode(): StorageMode {
  try {
    return window.localStorage.getItem(STORAGE_MODE_KEY) === 'session' ? 'session' : 'local';
  } catch {
    return 'local';
  }
}

function setStorageMode(mode: StorageMode): void {
  try {
    window.localStorage.setItem(STORAGE_MODE_KEY, mode);
  } catch (err) {
    console.warn('[api] Không ghi được chế độ lưu phiên:', err);
  }
}

// Đọc lại chế độ "Ghi nhớ đăng nhập" hiện tại (không đổi gì) — dùng khi cần tự
// đăng nhập lại ngầm (VD sau đổi vai trò) để giữ đúng lựa chọn ban đầu.
export function isRemembered(): boolean {
  return getStorageMode() === 'local';
}

function activeStorage(): Storage {
  return getStorageMode() === 'session' ? window.sessionStorage : window.localStorage;
}

function readStorage(key: string): string | null {
  try {
    return activeStorage().getItem(key);
  } catch (err) {
    console.warn(`[api] Không đọc được "${key}":`, err);
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    activeStorage().setItem(key, value);
  } catch (err) {
    console.error(`[api] Không ghi được "${key}":`, err);
  }
}

function removeStorage(key: string): void {
  try {
    activeStorage().removeItem(key);
  } catch (err) {
    console.warn(`[api] Không xoá được "${key}":`, err);
  }
}

// Xoá sạch token/user còn sót ở CẢ 2 storage — gọi lúc đăng nhập, TRƯỚC khi
// đổi storage mode, tránh sót phiên cũ ở storage không active.
export function clearBothStorages(): void {
  [window.localStorage, window.sessionStorage].forEach((storage) => {
    try {
      storage.removeItem(ACCESS_TOKEN_KEY);
      storage.removeItem(REFRESH_TOKEN_KEY);
      storage.removeItem(USER_KEY);
    } catch {
      /* im lặng — chế độ ẩn danh có thể chặn cả 2 storage */
    }
  });
}

export function setSessionStorageMode(remember: boolean): void {
  setStorageMode(remember ? 'local' : 'session');
}

export function getAccessToken(): string | null {
  return readStorage(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return readStorage(REFRESH_TOKEN_KEY);
}

export function saveUser(user: User): void {
  if (!user) return;
  writeStorage(USER_KEY, JSON.stringify(user));
}

export function getUser(): User | null {
  const text = readStorage(USER_KEY);
  if (!text) return null;
  try {
    return JSON.parse(text) as User;
  } catch {
    return null;
  }
}

export interface SessionData {
  access_token?: string;
  refresh_token?: string;
  user?: User;
}

export function saveSession(data: SessionData): void {
  if (data.access_token) writeStorage(ACCESS_TOKEN_KEY, data.access_token);
  if (data.refresh_token) writeStorage(REFRESH_TOKEN_KEY, data.refresh_token);
  if (data.user) saveUser(data.user);
}

export function clearSession(): void {
  removeStorage(ACCESS_TOKEN_KEY);
  removeStorage(REFRESH_TOKEN_KEY);
  removeStorage(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

export function getAccountType(): User['account_type'] | null {
  const user = getUser();
  return user ? user.account_type || null : null;
}

export function isBusiness(): boolean {
  return getAccountType() === 'business';
}

export function isPlatformAdmin(): boolean {
  return getAccountType() === 'platform_admin';
}

export function getOrganizationId(): string | null {
  const user = getUser();
  return user ? user.organization_id || null : null;
}

// MỒ CÔI kể từ 2026-09-14 ở bản .js gốc (xem CLAUDE.md gốc mục "Quản trị hệ
// thống (platform_admin)") — giữ lại đúng như bản gốc, không xoá, không gọi
// ở đâu trong app/ hiện tại.
export function isDistributor(): boolean {
  const user = getUser();
  return !!(user && user.organization_is_distributor === true);
}

export function hasPermission(code: string): boolean {
  const user = getUser();
  if (!user?.permissions) return false;
  return user.permissions.indexOf(code) !== -1;
}

/* --- Chưa đăng nhập / mất phiên GIỮA CHỪNG (bootstrap qua cookie xác nhận
   401, hoặc refresh token hết hạn/bị thu hồi) ---------------------------
   Gọi từ 2 nơi KHÔNG có quyền dùng react-router: ProtectedRoute.tsx (side
   effect, không phải lúc render) và src/api/http.ts (module JS thuần, không
   phải component) — cả 2 đều cần full navigation bằng window.location.
   SPA (2026-09-29) KHÔNG còn trang /login riêng nữa (xem app/CLAUDE.md mục
   "Giả định host") — đích đến là trang đăng nhập DUY NHẤT của site tĩnh
   (`dang-nhap.html`, qua mainSiteUrl()), kèm `next` = URL tuyệt đối của
   chính trang SPA đang đứng, để auth.js's redirectTarget() đưa người dùng
   quay lại ĐÚNG chỗ sau khi đăng nhập xong. `next` không dùng đường dẫn
   tương đối như `redirect` cũ (2 origin khác nhau, tương đối vô nghĩa) —
   xem js/next-target.js phía site tĩnh để biết cách `next` được validate
   (whitelist origin, chặn open redirect). */
// `reason=unauth` (2026-09-30, vá kẽ hở của bản vá vòng lặp trước đó — xem
// CLAUDE.md gốc mục "⚠️ Bug đã vá — nhảy tab liên tục..."): đánh dấu rõ ràng
// "SPA đã TỰ XÁC NHẬN qua cookie/GET /auth/me rằng phiên không hợp lệ, mới
// đá về đây" — để js/login-redirect.js (site tĩnh) KHÔNG được tự tin tưởng
// phiên của CHÍNH NÓ (dù api.auth.me() ở đó có thành công) mà phải buộc đăng
// nhập lại thật. Thiếu cờ này thì 2 cơ chế xác thực khác nhau (site tĩnh:
// Web Storage; SPA: cookie httpOnly) có thể bất đồng vì lý do KHÁC "token hết
// hạn" (VD cookie Domain không khớp domain thật của SPA) và vẫn loop vô hạn
// dù mỗi bên tự kiểm tra đúng phần của mình.
export function redirectToLogin(): void {
  const next = window.location.href;
  window.location.href = `${mainSiteUrl('dang-nhap.html')}?reason=unauth&next=${encodeURIComponent(next)}`;
}

/* --- Điều hướng ra ngoài SPA THẬT SỰ, sang site chính ----------------------
   agriverse-3d.html KHÔNG nằm trong app/ (vẫn là trang .html tĩnh, xem
   CLAUDE.md gốc) — mọi điều hướng tới đó PHẢI là full navigation
   (window.location), KHÔNG dùng react-router navigate(). Kiến trúc ĐÃ CHỐT
   là SUBDOMAIN riêng (app.agrichain.org.vn khác origin với agrichain.org.vn
   — xem app/CLAUDE.md mục "Giả định host") nên KHÔNG dùng đường dẫn tương
   đối được nữa — dựng URL tuyệt đối qua mainSiteUrl() (đọc
   VITE_MAIN_SITE_URL, xem ./config.ts). */
export function redirectToAgriverse(): void {
  window.location.href = mainSiteUrl('agriverse-3d.html');
}
