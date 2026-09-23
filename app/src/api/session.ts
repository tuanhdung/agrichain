// Port 1:1 phần "Chọn storage" + "Phiên đăng nhập" của js/api.js — GIỮ
// NGUYÊN tên key localStorage/sessionStorage ('agrichain.access_token'...).
//
// ⚠️ Kiến trúc ĐÃ CHỐT là SUBDOMAIN riêng (app.agrichain.org.vn khác hẳn
// agrichain.org.vn) — 2 domain này là 2 ORIGIN KHÁC NHAU, nên Web Storage
// (localStorage/sessionStorage) KHÔNG còn dùng chung được giữa site tĩnh cũ
// và app/ nữa (khác giả định "cùng origin" ở bản trước của comment này).
// Nghĩa là: đăng nhập ở dang-nhap.html (agrichain.org.vn) rồi bấm sang SPA
// (app.agrichain.org.vn) qua link sidebar sẽ KHÔNG thấy phiên đã đăng nhập —
// ProtectedRoute sẽ coi là "chưa đăng nhập" và đá ngược lại dang-nhap.html.
// Đây là NỢ KỸ THUẬT CHƯA GIẢI QUYẾT trong lần đổi kiến trúc này (giải pháp
// đúng là chuyển sang cookie có `Domain=.agrichain.org.vn` — đã ghi nhận sẵn
// trong CLAUDE.md gốc mục "Nợ kỹ thuật đã biết", cần backend hợp tác, NGOÀI
// PHẠM VI lần sửa env var này) — xem thêm app/CLAUDE.md mục "Giả định host".
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

/* --- Mất phiên GIỮA CHỪNG (refresh token hết hạn/bị thu hồi) --------------
   Khác ProtectedRoute (chặn TRƯỚC khi vẽ trang, dùng <Navigate> nội bộ của
   react-router) — hàm này gọi từ src/api/http.ts, một module JS thuần
   KHÔNG có quyền truy cập router (không phải component), nên phải điều
   hướng bằng window.location. Từ khi SPA có trang /login RIÊNG (xem
   app/CLAUDE.md mục "Nợ kỹ thuật"), đích đến giờ là **route NỘI BỘ** của
   chính SPA (`/login`, CÙNG origin) — KHÔNG còn ra site chính
   (dang-nhap.html) nữa, vì phiên của SPA và site chính là 2 phiên ĐỘC LẬP
   (2 origin khác nhau, xem mục "Giả định host"): đá người dùng sang trang
   đăng nhập của site chính lúc này chẳng giải quyết được gì cho phiên bên
   SPA cả. */
export function redirectToLogin(pathname: string, search = ''): void {
  window.location.href = `/login?redirect=${encodeURIComponent(pathname + search)}`;
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
