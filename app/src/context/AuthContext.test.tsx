// Test cho AuthProvider — phần "bootstrap qua cookie" của luồng đăng nhập 1
// lần (2026-09-29): có phiên sẵn (không gọi API thừa), 401 (chưa đăng nhập,
// không lỗi), lỗi mạng/5xx (bootstrapError được set, KHÔNG kết luận nhầm là
// "chưa đăng nhập" — xem app/CLAUDE.md mục "Giả định host").
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { clearSession, saveUser } from '../api/session';

function fakeResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => (body === undefined ? '' : JSON.stringify(body))
  } as Response;
}

function Probe() {
  const { isBootstrapping, isLoggedIn, bootstrapError, user } = useAuth();
  return (
    <dl>
      <dt>bootstrapping</dt>
      <dd data-testid="bootstrapping">{String(isBootstrapping)}</dd>
      <dt>logged-in</dt>
      <dd data-testid="logged-in">{String(isLoggedIn)}</dd>
      <dt>error</dt>
      <dd data-testid="error">{bootstrapError?.message ?? ''}</dd>
      <dt>email</dt>
      <dd data-testid="email">{user?.email ?? ''}</dd>
    </dl>
  );
}

beforeEach(() => {
  clearSession();
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearSession();
});

describe('AuthProvider — đã có phiên sẵn trong storage', () => {
  it('hiện ngay theo gợi ý, rồi đối chiếu ngầm với máy chủ (GET /auth/me)', async () => {
    saveUser({
      id: 'user-1',
      email: 'san-co@agrichain.vn',
      full_name: 'Sẵn Có',
      account_type: 'business',
      organization_id: 'org-1',
      permissions: ['farms.view'],
      organization_is_distributor: true
    });
    const fetchMock = vi.fn().mockResolvedValue(
      fakeResponse(200, {
        user: { id: 'user-1', email: 'san-co@agrichain.vn', full_name: 'Sẵn Có', account_type: 'business', organization_id: 'org-1' },
        permissions: ['farms.view'],
        organization_is_distributor: true
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    // Không chờ máy chủ: giao diện hiện ngay theo gợi ý.
    expect(screen.getByTestId('bootstrapping').textContent).toBe('false');
    expect(screen.getByTestId('logged-in').textContent).toBe('true');
    expect(screen.getByTestId('email').textContent).toBe('san-co@agrichain.vn');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  // Bug thật (2026-11-16): đăng xuất rồi đăng nhập tài khoản KHÁC ở site tĩnh chỉ đổi cookie; gợi ý trong localStorage của SPA
  // vẫn là tài khoản cũ nên giao diện hiện tài khoản cũ còn API chạy bằng tài khoản mới.
  it('gợi ý LỆCH cookie thật (đổi tài khoản ở site tĩnh) -> đổi sang tài khoản thật của máy chủ', async () => {
    saveUser({
      id: 'user-old',
      email: 'cu@agrichain.vn',
      full_name: 'Cũ',
      account_type: 'business',
      organization_id: 'org-1',
      permissions: [],
      organization_is_distributor: false
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        fakeResponse(200, {
          user: { id: 'user-new', email: 'moi@agrichain.vn', full_name: 'Mới', account_type: 'platform_admin', organization_id: null },
          permissions: [],
          organization_is_distributor: null
        })
      )
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByTestId('email').textContent).toBe('cu@agrichain.vn');
    await waitFor(() => expect(screen.getByTestId('email').textContent).toBe('moi@agrichain.vn'));
  });

  it('gợi ý còn nhưng cookie hết hạn thật (401) -> bỏ gợi ý, coi như chưa đăng nhập', async () => {
    saveUser({
      id: 'user-old',
      email: 'cu@agrichain.vn',
      full_name: 'Cũ',
      account_type: 'business',
      organization_id: 'org-1',
      permissions: [],
      organization_is_distributor: false
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập.' } }))
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('logged-in').textContent).toBe('false'));
  });
});

describe('AuthProvider — chưa có phiên trong storage, dò qua cookie', () => {
  it('cookie hợp lệ (200) -> tự đăng nhập được, không cần gõ lại', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        fakeResponse(200, {
          user: {
            id: 'user-2',
            email: 'tu-cookie@agrichain.vn',
            full_name: 'Từ Cookie',
            account_type: 'business',
            organization_id: 'org-1'
          },
          permissions: ['seasons.view'],
          organization_is_distributor: false
        })
      )
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('bootstrapping').textContent).toBe('false'));
    expect(screen.getByTestId('logged-in').textContent).toBe('true');
    expect(screen.getByTestId('email').textContent).toBe('tu-cookie@agrichain.vn');
    expect(screen.getByTestId('error').textContent).toBe('');
  });

  it('không có cookie (401) -> kết luận chưa đăng nhập, KHÔNG có lỗi', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập.' } }))
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('bootstrapping').textContent).toBe('false'));
    expect(screen.getByTestId('logged-in').textContent).toBe('false');
    expect(screen.getByTestId('error').textContent).toBe('');
  });

  it('lỗi mạng -> bootstrapError được set, KHÔNG kết luận là "chưa đăng nhập" thông thường', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('bootstrapping').textContent).toBe('false'));
    expect(screen.getByTestId('logged-in').textContent).toBe('false');
    expect(screen.getByTestId('error').textContent).not.toBe('');
  });

  it('backend 5xx -> bootstrapError được set', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ.' } }))
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('bootstrapping').textContent).toBe('false'));
    expect(screen.getByTestId('error').textContent).not.toBe('');
  });
});

// Bug thật đã gặp (2026-09-29): logout() điều hướng thẳng về dang-nhap.html
// KHÔNG kèm `?loggedOut=1` -> site tĩnh (localStorage của NÓ, origin khác,
// SPA không xoá được) vẫn thấy "còn đăng nhập" nên bấm NGƯỢC lại SPA -> SPA
// dò cookie đã bị xoá (401) -> lại đẩy về dang-nhap.html -> VÒNG LẶP VÔ HẠN
// giữa 2 origin. Test này khoá lại đúng phần SPA chịu trách nhiệm: `next`
// PHẢI có cờ `loggedOut=1` để js/auth.js biết tự đăng xuất thật thay vì bấm
// ngược lại.
describe('AuthProvider — đăng xuất', () => {
  function LogoutProbe() {
    const { logout, isLoggedIn } = useAuth();
    return (
      <div>
        <span data-testid="logged-in">{String(isLoggedIn)}</span>
        <button type="button" onClick={() => void logout()}>
          Đăng xuất
        </button>
      </div>
    );
  }

  it('điều hướng sang dang-nhap.html KÈM ?loggedOut=1 (không phải bấm ngược lại thành vòng lặp)', async () => {
    saveUser({
      id: 'user-1',
      email: 'a@b.com',
      full_name: 'A',
      account_type: 'business',
      organization_id: 'org-1',
      permissions: [],
      organization_is_distributor: false
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(200, { message: 'Đã đăng xuất.' })));

    let hrefSet = '';
    Object.defineProperty(window, 'location', {
      value: {
        get href() {
          return hrefSet;
        },
        set href(value: string) {
          hrefSet = value;
        }
      },
      writable: true,
      configurable: true
    });

    render(
      <AuthProvider>
        <LogoutProbe />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));

    await waitFor(() => expect(hrefSet).not.toBe(''));
    expect(hrefSet).toContain('dang-nhap.html');
    expect(hrefSet).toContain('loggedOut=1');
  });
});
