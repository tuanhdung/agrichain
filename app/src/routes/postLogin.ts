// Port ĐÚNG logic redirectTarget()/defaultTargetFor() của js/auth.js gốc
// (dang-nhap.html) — áp dụng NGAY TRONG SPA sau khi LoginPage.tsx đăng nhập
// thành công, thay vì trang .html tĩnh như trước (xem app/CLAUDE.md mục
// "Nợ kỹ thuật" — 2 vùng tạm có phiên đăng nhập ĐỘC LẬP cho tới khi chuyển
// sang cookie dùng chung Domain=.agrichain.org.vn).
import { mainSiteUrl } from '../api/config';
import type { AccountType } from '../api';

// Route SPA THẬT hiện có — PHẢI khớp các <Route> khai báo trong App.tsx
// (chưa có cơ chế tự đồng bộ 2 nơi này) — thêm route mới thì thêm vào đây,
// xem app/CLAUDE.md mục "Thêm 1 trang mới".
const KNOWN_ROUTES = [
  '/nong-trai',
  '/nong-trai-chi-tiet',
  '/vat-tu',
  '/mau-quy-trinh',
  '/tai-khoan',
  '/lo-hang',
  '/ho-so',
  '/goi-phan-mem',
  '/lich-su-mua-goi'
];
// '/nong-trai' — ĐÚNG 'nong-trai.html' của bản gốc (đã migrate, xem
// app/CLAUDE.md mục "Trang /nong-trai"), không còn là "tương đương" tạm nữa.
const DEFAULT_ROUTE = '/nong-trai';

export type PostLoginTarget = { type: 'internal'; path: string } | { type: 'external'; url: string };

function defaultTargetFor(accountType: AccountType | null | undefined): PostLoginTarget {
  // 'customer' không có gì trong SPA (16 trang app-shell chỉ dành cho
  // business/platform_admin) — đá RA NGOÀI sang agriverse-3d.html (site
  // chính), giống đúng defaultTargetFor() gốc — KHÔNG phải index.html (chỉ
  // là trang giới thiệu, không hợp lý làm đích sau đăng nhập).
  if (accountType === 'customer') {
    return { type: 'external', url: mainSiteUrl('agriverse-3d.html') };
  }
  // 'business'/'platform_admin'/chưa rõ accountType -> route mặc định trong
  // SPA. 'platform_admin' CỐ TÌNH không có nhánh riêng, rơi vào đây giống
  // 'business' hệt nhau — khớp đúng ghi chú trong js/auth.js gốc.
  return { type: 'internal', path: DEFAULT_ROUTE };
}

// `redirectParam` là giá trị thô của ?redirect= trên URL /login — CHỈ chấp
// nhận route SPA nội bộ đã biết (bắt đầu bằng "/", nằm trong KNOWN_ROUTES).
// Khác quy ước cũ (bắt buộc đuôi ".html" qua regex) vì đây là route
// react-router, không phải trang .html tĩnh — nhưng cùng TINH THẦN "whitelist
// đích đến", không tin bất kỳ chuỗi nào đi thẳng qua.
export function resolvePostLoginTarget(
  accountType: AccountType | null | undefined,
  redirectParam: string | null
): PostLoginTarget {
  if (redirectParam) {
    const pathOnly = redirectParam.split('?')[0];
    if (KNOWN_ROUTES.includes(pathOnly)) {
      // 'customer' không được vào BẤT KỲ route nào trong SPA (toàn bộ đều
      // thuộc khu quản trị), dù redirect khớp whitelist — cùng bản vá "chặn
      // customer ở 16 trang app-shell" của redirectTarget() gốc.
      if (accountType === 'customer') return defaultTargetFor(accountType);
      return { type: 'internal', path: redirectParam };
    }
  }
  return defaultTargetFor(accountType);
}
