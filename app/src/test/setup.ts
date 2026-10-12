// Chạy 1 lần trước MỌI test (vite.config.ts's test.setupFiles).
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// @testing-library/react không tự đăng ký afterEach(cleanup()) khi vitest
// chạy KHÔNG bật `globals: true` (không có global afterEach nó tự dò được) —
// tự làm tay ở đây, một lần duy nhất, để mỗi test render vào DOM sạch.
afterEach(() => {
  cleanup();
});
