// Test cho js/login-redirect.js — hàm quyết định hành vi của dang-nhap.html
// LÚC TẢI TRANG (SITE TĨNH, KHÔNG phải SPA). File đó nằm NGOÀI app/ (repo
// gốc agrichain/js/), viết dạng ES module thuần nhận phụ thuộc qua tham số
// (dependency injection) để import trực tiếp được ở đây bằng vitest, không
// cần dựng thêm hạ tầng test riêng cho site tĩnh — cùng mẫu
// app/src/test/nextTarget.test.ts + comment đầu js/login-redirect.js.
//
// 3 kịch bản cốt lõi (2026-09-30, vá kẽ hở của bản vá vòng lặp trước đó — xem
// CLAUDE.md gốc mục "⚠️ Bug đã vá — nhảy tab liên tục..."):
//   (a) reason=unauth + token "hợp lệ" ở site tĩnh -> vẫn KHÔNG tự redirect
//       sang SPA, xoá token cục bộ, hiện form đăng nhập.
//   (b) không có reason, token hợp lệ (verifySession() thành công) -> vào
//       thẳng SPA.
//   (c) không có reason, verifySession() lỗi mạng -> hiện form đăng nhập,
//       KHÔNG đụng gì tới token (không tự ý xoá 1 phiên có thể vẫn hợp lệ).
import { describe, expect, it, vi } from 'vitest';
import { runLoginPageEntry } from '../../../js/login-redirect.js';

function makeDeps() {
  return {
    verifySession: vi.fn(),
    clearSession: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn()
  };
}

describe('runLoginPageEntry', () => {
  it('reason=unauth + token hợp lệ -> KHÔNG redirect, xoá token cục bộ, hiện form', async () => {
    const deps = makeDeps();

    const result = await runLoginPageEntry({ reason: 'unauth', loggedOut: null, isLoggedIn: true }, deps);

    expect(result).toBe('show-form');
    expect(deps.clearSession).toHaveBeenCalledTimes(1);
    expect(deps.verifySession).not.toHaveBeenCalled();
    expect(deps.navigate).not.toHaveBeenCalled();
  });

  it('reason=unauth + CHƯA từng có token -> vẫn xoá (no-op) + hiện form, không lỗi', async () => {
    const deps = makeDeps();

    const result = await runLoginPageEntry({ reason: 'unauth', loggedOut: null, isLoggedIn: false }, deps);

    expect(result).toBe('show-form');
    expect(deps.clearSession).toHaveBeenCalledTimes(1);
    expect(deps.verifySession).not.toHaveBeenCalled();
  });

  it('không có reason, isLoggedIn=false -> hiện form ngay, không gọi verifySession', async () => {
    const deps = makeDeps();

    const result = await runLoginPageEntry({ reason: null, loggedOut: null, isLoggedIn: false }, deps);

    expect(result).toBe('show-form');
    expect(deps.verifySession).not.toHaveBeenCalled();
    expect(deps.clearSession).not.toHaveBeenCalled();
  });

  it('không có reason, isLoggedIn=true, verifySession() thành công -> vào thẳng SPA', async () => {
    const deps = makeDeps();
    deps.verifySession.mockResolvedValue({ account_type: 'business' });

    const result = await runLoginPageEntry({ reason: null, loggedOut: null, isLoggedIn: true }, deps);

    expect(result).toBe('redirected');
    expect(deps.navigate).toHaveBeenCalledWith('business');
    expect(deps.clearSession).not.toHaveBeenCalled();
  });

  it('không có reason, isLoggedIn=true, verifySession() lỗi mạng -> hiện form, KHÔNG đụng token', async () => {
    const deps = makeDeps();
    deps.verifySession.mockRejectedValue(new Error('NETWORK_ERROR'));

    const result = await runLoginPageEntry({ reason: null, loggedOut: null, isLoggedIn: true }, deps);

    expect(result).toBe('show-form');
    expect(deps.navigate).not.toHaveBeenCalled();
    expect(deps.clearSession).not.toHaveBeenCalled();
  });

  it('loggedOut=1, isLoggedIn=true -> gọi logout() thật rồi hiện form', async () => {
    const deps = makeDeps();

    const result = await runLoginPageEntry({ reason: null, loggedOut: '1', isLoggedIn: true }, deps);

    expect(result).toBe('logged-out');
    expect(deps.logout).toHaveBeenCalledTimes(1);
    expect(deps.verifySession).not.toHaveBeenCalled();
    expect(deps.navigate).not.toHaveBeenCalled();
  });

  it('loggedOut=1, isLoggedIn=false (đã đăng xuất từ trước) -> KHÔNG gọi logout() thừa', async () => {
    const deps = makeDeps();

    const result = await runLoginPageEntry({ reason: null, loggedOut: '1', isLoggedIn: false }, deps);

    expect(result).toBe('logged-out');
    expect(deps.logout).not.toHaveBeenCalled();
  });

  it('loggedOut=1 được ưu tiên hơn reason=unauth nếu cả 2 cùng xuất hiện (không nên xảy ra thật)', async () => {
    const deps = makeDeps();

    const result = await runLoginPageEntry({ reason: 'unauth', loggedOut: '1', isLoggedIn: true }, deps);

    expect(result).toBe('logged-out');
    expect(deps.logout).toHaveBeenCalledTimes(1);
    expect(deps.clearSession).not.toHaveBeenCalled();
  });
});
