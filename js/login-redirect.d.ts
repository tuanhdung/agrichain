// Khai báo type cho login-redirect.js — CHỈ để app/src/test/loginRedirect.test.ts
// (viết bằng TypeScript, xem vitest ở app/) import được file .js thuần này mà
// KHÔNG cần bật `allowJs` trong tsconfig.app.json, cùng mẫu next-target.d.ts.
// Không có logic ở đây, chỉ khai báo hình dạng — nguồn thật của hành vi vẫn
// là login-redirect.js.
export interface LoginPageEntryParams {
  reason: string | null;
  loggedOut: string | null;
  isLoggedIn: boolean;
}

export interface LoginPageEntryDeps {
  verifySession: () => Promise<{ account_type: string | null }>;
  clearSession: () => void;
  logout: () => Promise<void>;
  navigate: (accountType: string | null) => void;
}

export function runLoginPageEntry(
  params: LoginPageEntryParams,
  deps: LoginPageEntryDeps
): Promise<'redirected' | 'show-form' | 'logged-out'>;
