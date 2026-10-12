// Khai báo type cho next-target.js — CHỈ để app/src/test/nextTarget.test.ts
// (viết bằng TypeScript, xem vitest ở app/) import được file .js thuần này
// mà KHÔNG cần bật `allowJs` trong tsconfig.app.json (đổi tsconfig sẽ kéo
// theo mọi file .js khác trong project — không cần thiết, chỉ 1 file này cần
// type). TypeScript tự tìm .d.ts CÙNG TÊN cạnh file .js khi resolve import,
// không cần cấu hình gì thêm. Không có logic ở đây, chỉ khai báo hình dạng —
// nguồn thật của hành vi vẫn là next-target.js.
export function resolveNextTarget(
  nextParam: string | null | undefined,
  allowedOrigin: string | null | undefined
): string | null;
