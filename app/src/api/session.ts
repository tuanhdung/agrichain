// Port phần "Chọn storage" + "Phiên đăng nhập" của js/api.js. KHÔNG còn lưu
// access/refresh token ở bất kỳ đâu phía trình duyệt: backend giữ chúng trong
// cookie httpOnly (access_token Path=/, refresh_token Path=/auth), JS không đọc
// được, mọi request gửi kèm qua `credentials: 'include'`. Web Storage chỉ còn
// giữ `agrichain.user` (hồ sơ + quyền, KHÔNG phải bí mật) làm GỢI Ý để vẽ giao
// diện đồng bộ và cờ "Ghi nhớ đăng nhập" — quyền thật luôn do backend quyết định.
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

const USER_KEY = 'agrichain.user';
const STORAGE_MODE_KEY = 'agrichain.storage_mode';
// Khoá token của các phiên bản CŨ — chỉ còn dùng để DỌN sạch, không bao giờ
// đọc/ghi nữa.
const LEGACY_TOKEN_KEYS = ['agrichain.access_token', 'agrichain.refresh_token'];

// Di trú một lần: xoá token cũ còn sót trong Web Storage của người dùng đã đăng
// nhập từ bản trước (idempotent, chạy lại vô hại).
function purgeLegacyTokens(): void {
  [window.localStorage, window.sessionStorage].forEach((storage) => {
    try {
      LEGACY_TOKEN_KEYS.forEach((key) => storage.removeItem(key));
    } catch {
      /* chế độ ẩn danh có thể chặn storage — bỏ qua */
    }
  });
}
purgeLegacyTokens();

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

// Xoá sạch hồ sơ gợi ý (và token cũ nếu còn) ở CẢ 2 storage — gọi lúc đăng
// nhập, TRƯỚC khi đổi storage mode, tránh sót bản cũ ở storage không active.
export function clearBothStorages(): void {
  [window.localStorage, window.sessionStorage].forEach((storage) => {
    try {
      storage.removeItem(USER_KEY);
    } catch {
      /* im lặng — chế độ ẩn danh có thể chặn cả 2 storage */
    }
  });
  purgeLegacyTokens();
}

export function setSessionStorageMode(remember: boolean): void {
  setStorageMode(remember ? 'local' : 'session');
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
  user?: User;
}

// Chỉ lấy `user` (gợi ý giao diện). access_token/refresh_token trong body của
// /auth/login CỐ TÌNH bị bỏ qua: bản thật nằm trong cookie httpOnly do backend
// đặt, không bao giờ chạm vào JS/Web Storage.
export function saveSession(data: SessionData): void {
  if (data.user) saveUser(data.user);
}

export function clearSession(): void {
  removeStorage(USER_KEY);
  purgeLegacyTokens();
}

// "Có vẻ đã đăng nhập" theo gợi ý đã lưu — JS không đọc được cookie httpOnly
// nên không thể biết chắc. Phiên hết hạn thật lộ ra ở lần gọi API đầu tiên.
export function isLoggedIn(): boolean {
  return !!getUser();
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
