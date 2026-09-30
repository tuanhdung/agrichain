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
  it('khong co refresh_token cuc bo (phien thuan cookie) van goi duoc /auth/logout voi placeholder khong rong', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, { message: 'Đã đăng xuất.' }));
    vi.stubGlobal('fetch', fetchMock);

    await auth.logout();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/auth/logout');
    const sentBody = JSON.parse(init.body as string) as { refresh_token: string };
    expect(sentBody.refresh_token.length).toBeGreaterThan(0);
    expect(getUser()).toBeNull();
  });

  it('sau khi dang xuat, goi lai bootstrap (do phien) tra ve 401/null', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(200, { message: 'Đã đăng xuất.' })) // POST /auth/logout
      .mockResolvedValueOnce(
        fakeResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Phiên đăng nhập đã hết hạn.' } })
      ); // GET /auth/me
    vi.stubGlobal('fetch', fetchMock);

    await auth.logout();
    const user = await auth.bootstrapFromCookie();

    expect(user).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
