// Port phần "request lõi" + "auth" của js/api.js:
//   - KHÔNG còn Bearer token: phiên nằm hoàn toàn trong cookie httpOnly, mọi
//     request gửi kèm qua `credentials: 'include'`.
//   - Gặp 401 (khi auth + retry) thì tự làm mới token qua 1 refreshPromise
//     DÙNG CHUNG (nhiều request 401 cùng lúc chỉ gọi /auth/refresh đúng 1
//     lần — gọi song song sẽ khiến refresh token bị thu hồi, đăng xuất oan).
//   - Refresh thất bại -> xoá phiên + điều hướng sang trang đăng nhập của
//     site tĩnh (SPA không còn trang /login riêng, xem redirectToLogin() ở
//     session.ts).
import { API_BASE_URL } from './config';
import { ApiError, buildApiError, networkError } from './error';
import {
  clearBothStorages,
  clearSession,
  getUser,
  redirectToLogin,
  saveUser,
  setSessionStorageMode
} from './session';
import type { MeResponse, TokenPair, User } from './types';

function buildQuery(query?: Record<string, unknown>): string {
  if (!query) return '';
  const parts: string[] = [];
  Object.keys(query).forEach((key) => {
    const value = query[key];
    if (value === undefined || value === null || value === '') return;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  });
  return parts.length ? `?${parts.join('&')}` : '';
}

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, unknown>;
  /** Mặc định true — có tự làm mới token (cookie refresh_token) khi gặp 401 hay không
   *  (cùng `retry`). Không còn ý nghĩa "gắn header" vì không còn Authorization. */
  auth?: boolean;
  /** Mặc định true — có được tự retry đúng 1 lần sau khi refresh token hay không. */
  retry?: boolean;
}

let refreshPromise: Promise<TokenPair> | null = null;

// Không gửi body: backend đọc refresh token từ cookie httpOnly (Path=/auth) và
// tự đặt lại cặp cookie mới trong response.
function performRefresh(): Promise<TokenPair> {
  return request<TokenPair>('POST', '/auth/refresh', { auth: false, retry: false });
}

function refreshTokenOnce(): Promise<TokenPair> {
  if (!refreshPromise) {
    refreshPromise = performRefresh()
      .catch((err) => {
        clearSession();
        redirectToLogin();
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string; details?: Record<string, unknown> | null };
}

export function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const auth = options.auth !== false;
  const retry = options.retry !== false;
  const url = API_BASE_URL + path + buildQuery(options.query);

  const headers: Record<string, string> = {};
  // credentials: 'include' — gửi kèm cookie httpOnly access_token (set bởi
  // /auth/login, /auth/refresh, /auth/change-password, xem CLAUDE.md gốc mục
  // "Kết nối backend") dù gọi CROSS-ORIGIN sang backend (api.*). Bắt buộc
  // phải có để cookie Domain=COOKIE_DOMAIN hoạt động — thiếu dòng này thì
  // trình duyệt coi như request "ẩn danh", không đính kèm cookie dù đã có
  // sẵn. KHÔNG còn header Authorization: phiên chỉ nằm trong cookie httpOnly.
  const fetchOptions: RequestInit = { method, headers, credentials: 'include' };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(options.body);
  }

  return fetch(url, fetchOptions)
    .catch(() => {
      throw networkError();
    })
    .then(async (response) => {
      if (response.status === 204) return null as T;

      const text = await response.text();
      let body: ErrorEnvelope | null = null;
      if (text) {
        try {
          body = JSON.parse(text) as ErrorEnvelope;
        } catch {
          body = null;
        }
      }

      if (response.ok) return body as T;

      if (response.status === 401 && auth && retry) {
        await refreshTokenOnce();
        return request<T>(method, path, { ...options, retry: false });
      }

      throw buildApiError(response.status, body);
    });
}

/* --- auth ------------------------------------------------------------- */

// `remember` — checkbox "Ghi nhớ đăng nhập" ở dang-nhap.html; gửi lên backend
// để chọn cookie sống lâu hay cookie phiên (mất khi đóng hẳn trình duyệt), đồng
// thời quyết định hồ sơ gợi ý nằm localStorage hay sessionStorage. App/ pilot hiện chưa có form đăng nhập
// riêng (đăng nhập vẫn qua dang-nhap.html tĩnh) — hàm này port đủ để dùng khi
// cần (VD sau này 1 trang React tự đăng nhập lại ngầm, giống transferAdmin ở
// tai-khoan.html gốc), KHÔNG phải vì app/ đã có UI đăng nhập.
function login(email: string, password: string, remember: boolean): Promise<User> {
  return request<TokenPair>('POST', '/auth/login', {
    body: { email, password, remember },
    auth: false,
    retry: false
  }).then(() => {
    clearBothStorages();
    setSessionStorageMode(remember);
    // Token trong body bị bỏ qua (cookie httpOnly đã được backend đặt); hồ sơ
    // gợi ý lấy từ GET /auth/me để có đủ quyền.
    return me();
  });
}

// Không gửi body: backend đọc refresh token (thu hồi đúng phiên này, kể cả phiên
// đăng nhập ở site tĩnh vì cookie dùng chung domain) và access token từ cookie
// rồi tự xoá cả hai. Luôn xoá gợi ý phía trình duyệt kể cả khi gọi API lỗi.
function logout(): Promise<void> {
  const done = request('POST', '/auth/logout', { auth: false, retry: false }).catch(() => undefined);
  return done.then(() => {
    clearSession();
  });
}

// GET /auth/me trả về { user, permissions, organization_is_distributor }
// (object BỌC NGOÀI) — PHẢI gắn permissions/organization_is_distributor vào
// user trước khi lưu, xem types.ts.
function fetchMe(options?: RequestOptions): Promise<User> {
  return request<MeResponse>('GET', '/auth/me', options).then((data) => {
    const user: User = {
      ...data.user,
      permissions: data.permissions || [],
      organization_is_distributor: data.organization_is_distributor
    };
    saveUser(user);
    return user;
  });
}

function me(): Promise<User> {
  return fetchMe();
}

// Bootstrap phiên đăng nhập từ cookie httpOnly access_token (không phải từ
// localStorage/sessionStorage của CHÍNH origin app.* — xem CLAUDE.md gốc mục
// "Kết nối backend") — dùng cho ca người dùng đăng nhập ở site tĩnh RỒI MỚI
// bấm sang SPA: localStorage của app.* trống trơn (mỗi origin lưu riêng),
// nhưng cookie (nếu COOKIE_DOMAIN chia sẻ được, VD .agrichain.local) vẫn còn
// hợp lệ và trình duyệt tự gửi kèm nhờ `credentials: 'include'`.
// `auth: false` — không có access token cục bộ để gắn header (đúng lúc cần
// gọi hàm này). `retry: false` — BẮT BUỘC: nếu để mặc định `true`, 401 (ca
// BÌNH THƯỜNG khi chưa đăng nhập ở đâu cả) sẽ kích hoạt refreshTokenOnce()
// của request() (không có refresh_token cục bộ nên tự thất bại) rồi
// redirectToLogin() ngay TRONG hàm này — bỏ lỡ cơ hội để AuthContext tự
// quyết định khi nào mới thực sự redirect (xem dưới).
//
// Access token chỉ sống 15 phút nhưng refresh token (cookie Path=/auth) sống 7
// ngày: gặp 401 ở /auth/me thì thử /auth/refresh ĐÚNG 1 lần rồi dò lại, để
// người dùng quay lại sau > 15 phút không bị buộc đăng nhập lại oan.
//
// ⚠️ PHÂN BIỆT RÕ 2 loại thất bại (2026-09-29, xem ProtectedRoute.tsx):
// - 401 đúng nghĩa "chưa đăng nhập ở đâu cả" (không có cookie hợp lệ, kể cả sau
//   khi thử làm mới) — trả về `null`, KHÔNG ném lỗi, để ProtectedRoute
//   redirect sang trang đăng nhập của site tĩnh.
// - MỌI lỗi khác (status 0 = mất mạng/CORS, 5xx = backend sập...) — NÉM LẠI
//   nguyên trạng, KHÔNG được coi là "chưa đăng nhập". Nuốt lỗi này rồi kết
//   luận null sẽ gây VÒNG LẶP REDIRECT: mỗi lần backend sập, người dùng bị
//   đá ra trang đăng nhập, đăng nhập xong quay lại SPA thì bootstrap lại gọi
//   /auth/me, lại lỗi mạng, lại bị đá ra — không có cách nào thoát nếu không
//   phân biệt 2 ca này.
function bootstrapFromCookie(): Promise<User | null> {
  const unauthorizedToNull = (err: unknown): null => {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  };
  return fetchMe({ auth: false, retry: false }).catch((err: unknown) => {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;
    return performRefresh()
      .then(() => fetchMe({ auth: false, retry: false }))
      .catch(unauthorizedToNull);
  });
}

// PATCH /auth/me — tự sửa hồ sơ CHÍNH mình. Response là UserOut phẳng, không
// có permissions/organization_is_distributor như me() — giữ nguyên 2 field
// đó từ bản đã lưu trước đó rồi lưu lại NGAY.
function updateMe(payload: { full_name?: string; phone?: string | null }): Promise<User> {
  return request<Omit<User, 'permissions' | 'organization_is_distributor'>>('PATCH', '/auth/me', {
    body: payload
  }).then((partial) => {
    const existing = getUser();
    const user: User = {
      ...partial,
      permissions: existing?.permissions || [],
      organization_is_distributor: existing?.organization_is_distributor ?? null
    };
    saveUser(user);
    return user;
  });
}

// POST /auth/change-password: backend thu hồi hết refresh token cũ rồi tự đặt
// lại cặp cookie MỚI trong response — trình duyệt tự áp dụng, JS không phải làm
// gì để phiên hiện tại không bị đăng xuất oan.
function changePassword(oldPassword: string, newPassword: string): Promise<TokenPair> {
  return request<TokenPair>('POST', '/auth/change-password', {
    body: { old_password: oldPassword, new_password: newPassword }
  });
}

interface RegisterCustomerPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
}

function registerCustomer(payload: RegisterCustomerPayload): Promise<User> {
  return request<User>('POST', '/auth/register/customer', { body: payload, auth: false, retry: false });
}

interface RegisterBusinessPayload {
  organization: { name: string; tax_code?: string | null; phone?: string | null; address?: string | null };
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
}

function registerBusiness(payload: RegisterBusinessPayload): Promise<User> {
  return request<User>('POST', '/auth/register/business', { body: payload, auth: false, retry: false });
}

export const auth = {
  login,
  logout,
  me,
  bootstrapFromCookie,
  updateMe,
  changePassword,
  registerCustomer,
  registerBusiness
};

export { ApiError };
