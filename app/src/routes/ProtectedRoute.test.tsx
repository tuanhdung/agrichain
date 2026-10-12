// Test cho ProtectedRoute — 3 nhánh cốt lõi của luồng "đăng nhập 1 lần"
// (2026-09-29): có phiên (render children), không có phiên/401 (full
// navigation ra trang đăng nhập site tĩnh kèm `next`), lỗi mạng/5xx (KHÔNG
// redirect, hiện lỗi + nút "Thử lại" — xem app/CLAUDE.md mục "Giả định
// host").
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { clearSession, saveUser } from '../api/session';

function fakeResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => (body === undefined ? '' : JSON.stringify(body))
  } as Response;
}

const SPA_URL = 'http://app.agrichain.local:5173/nong-trai';

function setLocation(href: string): void {
  // jsdom không cho defineProperty đè trực tiếp lên `window.location` đang có
  // sẵn — xoá rồi gán lại 1 object thường, chỉ cần đủ field `href` mà
  // session.ts::redirectToLogin() đọc/ghi.
  // @ts-expect-error - xoá location mặc định của jsdom để thay bằng mock đơn giản
  delete window.location;
  // @ts-expect-error - chỉ cần field href, đủ dùng cho test này
  window.location = { href };
}

function renderProtected() {
  return render(
    <AuthProvider>
      <ProtectedRoute>
        <p>Nội dung được bảo vệ</p>
      </ProtectedRoute>
    </AuthProvider>
  );
}

beforeEach(() => {
  clearSession();
  setLocation(SPA_URL);
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearSession();
});

describe('ProtectedRoute — có phiên', () => {
  it('user đã có sẵn trong storage -> render children ngay, không redirect', async () => {
    saveUser({
      id: 'user-1',
      email: 'a@b.com',
      full_name: 'A',
      account_type: 'business',
      organization_id: 'org-1',
      permissions: [],
      organization_is_distributor: false
    });
    vi.stubGlobal('fetch', vi.fn());

    renderProtected();

    expect(await screen.findByText('Nội dung được bảo vệ')).toBeInTheDocument();
    expect(window.location.href).toBe(SPA_URL);
  });
});

describe('ProtectedRoute — không có phiên (401)', () => {
  it('redirect sang trang đăng nhập site tĩnh kèm next=<url SPA hiện tại>', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập.' } }))
    );

    renderProtected();

    await waitFor(() => expect(window.location.href).not.toBe(SPA_URL));

    const expected = `http://agrichain.local:5500/dang-nhap.html?reason=unauth&next=${encodeURIComponent(SPA_URL)}`;
    expect(window.location.href).toBe(expected);
    expect(screen.queryByText('Nội dung được bảo vệ')).not.toBeInTheDocument();
  });
});

describe('ProtectedRoute — lỗi mạng/5xx lúc dò phiên', () => {
  it('lỗi mạng: KHÔNG redirect, hiện thông báo lỗi + nút Thử lại', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    renderProtected();

    expect(await screen.findByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(window.location.href).toBe(SPA_URL); // không bị đổi, không redirect
    expect(screen.queryByText('Nội dung được bảo vệ')).not.toBeInTheDocument();
  });

  it('backend 5xx: KHÔNG redirect, hiện thông báo lỗi + nút Thử lại', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ.' } }))
    );

    renderProtected();

    expect(await screen.findByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(window.location.href).toBe(SPA_URL);
  });

  it('bấm "Thử lại" sau khi mạng phục hồi -> render được nội dung, không còn lỗi', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(
        fakeResponse(200, {
          user: { id: 'user-1', email: 'a@b.com', full_name: 'A', account_type: 'business', organization_id: 'org-1' },
          permissions: [],
          organization_is_distributor: false
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    renderProtected();
    const retryButton = await screen.findByRole('button', { name: 'Thử lại' });

    fireEvent.click(retryButton);

    expect(await screen.findByText('Nội dung được bảo vệ')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(window.location.href).toBe(SPA_URL); // vẫn không redirect ở nhánh này
  });
});

// Bug thật đã gặp (2026-09-29, PHÁT HIỆN SAU khi ?loggedOut=1 đã có mặt —
// describe "AuthProvider — đăng xuất" ở AuthContext.test.tsx KHÔNG bọc
// ProtectedRoute nên không bao giờ bắt được ca này): logout() gọi
// setUser(null) NGAY TRƯỚC dòng điều hướng — setUser(null) khiến
// AuthProvider re-render, isLoggedIn thành false, kích hoạt effect
// shouldRedirectToLogin CỦA CHÍNH ProtectedRoute đang bọc trang gọi logout,
// và effect đó tự gọi redirectToLogin() (session.ts) — GHI ĐÈ
// window.location.href (`?next=<url SPA>`) lên trên giá trị vừa gán
// (`?loggedOut=1`) từ logout(), vì cả 2 đều chỉ là phép gán thường, còn
// window.location.href= chỉ LÊN LỊCH điều hướng chứ không dừng JS ngay lập
// tức — effect của ProtectedRoute kịp chạy chen vào giữa. Hậu quả: URL cuối
// cùng thực sự điều hướng tới KHÔNG còn `loggedOut=1`, js/auth.js không
// nhận diện được đây là lượt đăng xuất, lại đẩy ngược người dùng về đúng
// URL SPA vừa rời đi — vòng lặp. Test này PHẢI render ProtectedRoute bọc
// NGOÀI nút đăng xuất (giống hệt cách dùng thật trong app/src/App.tsx) để
// tái hiện đúng tương tác đó — nếu chỉ test AuthProvider trơn (không
// ProtectedRoute) sẽ luôn pass dù bug còn nguyên.
describe('ProtectedRoute — đăng xuất từ bên trong (race condition đã gặp thật)', () => {
  function LogoutButton() {
    const { logout } = useAuth();
    return (
      <button type="button" onClick={() => void logout()}>
        Đăng xuất
      </button>
    );
  }

  it('điều hướng đúng ?loggedOut=1, KHÔNG bị ProtectedRoute ghi đè thành ?next=', async () => {
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

    render(
      <AuthProvider>
        <ProtectedRoute>
          <LogoutButton />
        </ProtectedRoute>
      </AuthProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Đăng xuất' }));

    await waitFor(() => expect(window.location.href).not.toBe(SPA_URL));

    expect(window.location.href).toContain('dang-nhap.html');
    expect(window.location.href).toContain('loggedOut=1');
    expect(window.location.href).not.toContain('next=');
  });
});
