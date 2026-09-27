// Port 1:1 phần "request lõi" + "auth" của js/api.js — GIỮ NGUYÊN hành vi:
//   - Gắn Bearer token từ storage đang active.
//   - Gặp 401 (khi auth + retry) thì tự làm mới token qua 1 refreshPromise
//     DÙNG CHUNG (nhiều request 401 cùng lúc chỉ gọi /auth/refresh đúng 1
//     lần — gọi song song sẽ khiến refresh token bị thu hồi, đăng xuất oan).
//   - Refresh thất bại -> xoá phiên + điều hướng về /login CỦA CHÍNH SPA
//     (xem redirectToLogin() ở session.ts).
import { API_BASE_URL } from './config';
import { ApiError, buildApiError, networkError } from './error';
import {
  clearBothStorages,
  clearSession,
  getAccessToken,
  getRefreshToken,
  redirectToLogin,
  saveSession,
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
  /** Mặc định true — có gắn Authorization: Bearer <token> hay không. */
  auth?: boolean;
  /** Mặc định true — có được tự retry đúng 1 lần sau khi refresh token hay không. */
  retry?: boolean;
}

let refreshPromise: Promise<TokenPair> | null = null;

function performRefresh(): Promise<TokenPair> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return Promise.reject(new ApiError(401, 'UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn.', null));
  }
  return request<TokenPair>('POST', '/auth/refresh', {
    body: { refresh_token: refreshToken },
    auth: false,
    retry: false
  }).then((data) => {
    saveSession(data);
    return data;
  });
}

function refreshTokenOnce(): Promise<TokenPair> {
  if (!refreshPromise) {
    refreshPromise = performRefresh()
      .catch((err) => {
        clearSession();
        redirectToLogin(window.location.pathname, window.location.search);
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
  // sẵn. Header Authorization bên dưới VẪN giữ nguyên làm phương án dự
  // phòng (backend đọc cookie trước, không có mới fallback về header).
  const fetchOptions: RequestInit = { method, headers, credentials: 'include' };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(options.body);
  }
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
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

// `remember` — checkbox "Ghi nhớ đăng nhập" ở dang-nhap.html; quyết định
// token lưu localStorage (sống sót qua đóng/mở trình duyệt) hay sessionStorage
// (mất khi đóng hẳn trình duyệt). App/ pilot hiện chưa có form đăng nhập
// riêng (đăng nhập vẫn qua dang-nhap.html tĩnh) — hàm này port đủ để dùng khi
// cần (VD sau này 1 trang React tự đăng nhập lại ngầm, giống transferAdmin ở
// tai-khoan.html gốc), KHÔNG phải vì app/ đã có UI đăng nhập.
function login(email: string, password: string, remember: boolean): Promise<User> {
  return request<TokenPair>('POST', '/auth/login', {
    body: { email, password },
    auth: false,
    retry: false
  }).then((data) => {
    clearBothStorages();
    setSessionStorageMode(remember);
    saveSession(data);
    return me();
  });
}

function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  const done = refreshToken
    ? request('POST', '/auth/logout', { body: { refresh_token: refreshToken } }).catch(() => undefined)
    : Promise.resolve();
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
// redirectToLogin() — full page reload sang /login cho MỌI khách chưa đăng
// nhập ghé SPA lần đầu, dù đây chỉ là 1 lượt dò thầm lặng. Thất bại (401,
// không có cookie hợp lệ) trả về `null`, KHÔNG ném lỗi — gọi nơi dùng
// (AuthContext) tự coi là "chưa đăng nhập", giống hệt trạng thái ban đầu cũ.
function bootstrapFromCookie(): Promise<User | null> {
  return fetchMe({ auth: false, retry: false }).catch(() => null);
}

// PATCH /auth/me — tự sửa hồ sơ CHÍNH mình. Response là UserOut phẳng, không
// có permissions/organization_is_distributor như me() — giữ nguyên 2 field
// đó từ bản đã lưu trước đó rồi lưu lại NGAY.
function updateMe(payload: { full_name?: string; phone?: string | null }): Promise<User> {
  return request<Omit<User, 'permissions' | 'organization_is_distributor'>>('PATCH', '/auth/me', {
    body: payload
  }).then((partial) => {
    const existing = (JSON.parse(localStorage.getItem('agrichain.user') || 'null') as User | null) || null;
    const user: User = {
      ...partial,
      permissions: existing?.permissions || [],
      organization_is_distributor: existing?.organization_is_distributor ?? null
    };
    saveUser(user);
    return user;
  });
}

// POST /auth/change-password trả về cặp token MỚI (backend thu hồi hết token
// cũ) — PHẢI lưu lại ngay, không thì lần refresh tiếp theo sẽ dùng refresh
// token cũ đã bị thu hồi, tự đăng xuất oan.
function changePassword(oldPassword: string, newPassword: string): Promise<TokenPair> {
  return request<TokenPair>('POST', '/auth/change-password', {
    body: { old_password: oldPassword, new_password: newPassword }
  }).then((data) => {
    saveSession(data);
    return data;
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
