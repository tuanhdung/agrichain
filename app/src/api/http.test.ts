// Test cho auth.bootstrapFromCookie()/auth.logout() — phần LÕI của luồng
// "đăng nhập 1 lần" (2026-09-29): phân biệt "chưa đăng nhập" (401, không
// throw) với lỗi thật (mất mạng/5xx, PHẢI throw để ProtectedRoute không
// redirect nhầm, xem app/src/routes/ProtectedRoute.tsx + comment trong
// bootstrapFromCookie() ở ./http.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './error';
import { auth } from './http';
import { clearSession, getUser } from './session';
import type { User } from './types';

function fakeResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => (body === undefined ? '' : JSON.stringify(body))
  } as Response;
}

const FAKE_USER: Omit<User, 'permissions' | 'organization_is_distributor'> = {
  id: 'user-1',
  email: 'nguoidung@agrichain.vn',
  full_name: 'Người Dùng Test',
  account_type: 'business',
  organization_id: 'org-1'
};

beforeEach(() => {
  clearSession();
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearSession();
});

describe('auth.bootstrapFromCookie', () => {
  it('co phien hop le (200) -> tra ve user, luu lai storage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        fakeResponse(200, { user: FAKE_USER, permissions: ['farms.view'], organization_is_distributor: true })
      )
    );

    const user = await auth.bootstrapFromCookie();

    expect(user?.email).toBe(FAKE_USER.email);
    expect(user?.permissions).toEqual(['farms.view']);
    expect(getUser()?.email).toBe(FAKE_USER.email);
  });

  it('khong co phien (401) -> tra ve null, KHONG throw', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Phiên đăng nhập đã hết hạn.' } }))
    );

    await expect(auth.bootstrapFromCookie()).resolves.toBeNull();
    expect(getUser()).toBeNull();
  });

  it('loi mang (fetch reject) -> NEM LAI loi, KHONG duoc coi la "chua dang nhap"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const error = await auth.bootstrapFromCookie().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
  });

  it('backend loi 500 -> NEM LAI loi, KHONG duoc coi la "chua dang nhap"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ.' } }))
    );

    const error = await auth.bootstrapFromCookie().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
  });
});

describe('auth.logout', () => {
  it('goi /auth/logout KHONG kem body, gui cookie (credentials include), va xoa goi y phia client', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, { message: 'Đã đăng xuất.' }));
    vi.stubGlobal('fetch', fetchMock);

    await auth.logout();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/auth/logout');
    expect(init.body).toBeUndefined();
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(getUser()).toBeNull();
  });

  it('sau khi dang xuat, goi lai bootstrap (do phien) tra ve 401/null', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(200, { message: 'Đã đăng xuất.' })) // POST /auth/logout
      .mockResolvedValue(
        fakeResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Phiên đăng nhập đã hết hạn.' } })
      ); // GET /auth/me rồi POST /auth/refresh (cookie đã xoá) đều 401
    vi.stubGlobal('fetch', fetchMock);

    await auth.logout();
    const user = await auth.bootstrapFromCookie();

    expect(user).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('auth.bootstrapFromCookie — làm mới bằng cookie refresh_token', () => {
  it('/auth/me 401 nhung /auth/refresh thanh cong -> do lai /auth/me va tra ve user (khong ep dang nhap lai)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Hết hạn.' } })) // GET /auth/me
      .mockResolvedValueOnce(fakeResponse(200, { access_token: 'x', refresh_token: 'y' })) // POST /auth/refresh
      .mockResolvedValueOnce(
        fakeResponse(200, { user: FAKE_USER, permissions: ['farms.view'], organization_is_distributor: null })
      ); // GET /auth/me lan 2
    vi.stubGlobal('fetch', fetchMock);

    const user = await auth.bootstrapFromCookie();

    expect(user?.email).toBe(FAKE_USER.email);
    const [refreshUrl, refreshInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(refreshUrl).toContain('/auth/refresh');
    expect(refreshInit.body).toBeUndefined(); // refresh token nằm trong cookie, không trong body
  });

  it('refresh gap loi mang -> NEM LAI, khong coi la chua dang nhap', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(fakeResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Hết hạn.' } }))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    );

    const error = await auth.bootstrapFromCookie().catch((err: unknown) => err);
    expect((error as ApiError).status).toBe(0);
  });
});

describe('khong luu token trong Web Storage', () => {
  it('dang nhap xong storage KHONG chua access/refresh token, chi co ho so goi y', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(fakeResponse(200, { access_token: 'AAA', refresh_token: 'RRR', user: FAKE_USER }))
        .mockResolvedValueOnce(
          fakeResponse(200, { user: FAKE_USER, permissions: [], organization_is_distributor: null })
        )
    );

    await auth.login('nguoidung@agrichain.vn', 'MatKhau1!', true);

    const dump = JSON.stringify({ ...window.localStorage }) + JSON.stringify({ ...window.sessionStorage });
    expect(dump).not.toContain('AAA');
    expect(dump).not.toContain('RRR');
    expect(window.localStorage.getItem('agrichain.access_token')).toBeNull();
    expect(window.localStorage.getItem('agrichain.refresh_token')).toBeNull();
    expect(getUser()?.email).toBe(FAKE_USER.email);
  });

  it('gui remember len backend va khong gan header Authorization', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(200, { access_token: 'A', refresh_token: 'R', user: FAKE_USER }))
      .mockResolvedValueOnce(fakeResponse(200, { user: FAKE_USER, permissions: [], organization_is_distributor: null }));
    vi.stubGlobal('fetch', fetchMock);

    await auth.login('nguoidung@agrichain.vn', 'MatKhau1!', false);

    const [, loginInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(loginInit.body as string)).toMatchObject({ remember: false });
    const [, meInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((meInit.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
