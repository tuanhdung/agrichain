// Dùng lại NGUYÊN js/enums.js — nguồn DUY NHẤT cho ACTIVITY_TYPES (9 loại
// hoạt động, xem file đó + CLAUDE.md gốc mục liên quan) — KHÔNG hard-code
// lại danh sách này trong TypeScript (đúng lý do enums.js tồn tại: trước đây
// mau-quy-trinh.js và nong-trai-chi-tiet.js mỗi file tự khai báo lại, lệch
// nhãn/icon nhau).
//
// js/enums.js viết cho site TĨNH (IIFE gán vào window.AgriChain.ACTIVITY_TYPES
// khi nạp qua <script>), không phải ES module nên không `import` thẳng được.
// Nạp SOURCE THẬT của file qua hậu tố Vite `?raw` (chuỗi text, không copy
// tay 1 ký tự nào) rồi THỰC THI đúng IIFE đó — file tự gán kết quả vào
// window.AgriChain.ACTIVITY_TYPES y hệt lúc chạy trên site tĩnh (không có gì
// khác trong SPA đọc/ghi `window.AgriChain` nên không xung đột) — đọc lại
// ngay sau đó. enums.js đổi cấu trúc/thêm loại hoạt động mới thì file này tự
// động theo kịp, không cần sửa gì ở đây.
import enumsSource from '../../js/enums.js?raw';

export interface ActivityType {
  key: string;
  label: string;
  /** GIỮ NGUYÊN tiền tố "icon-" như enums.js gốc — KHÁC quy ước các hằng số
   *  icon tự khai báo riêng trong app/ (VD pages/vat-tu/constants.ts không
   *  có tiền tố, vì <Icon name=.../> tự thêm). Dùng activity type ở đây thì
   *  phải tự strip tiền tố, xem activityIconName() bên dưới. */
  icon: string;
  color: 'success' | 'info' | 'warning' | 'danger' | 'neutral';
}

declare global {
  interface Window {
    AgriChain?: { ACTIVITY_TYPES?: ActivityType[] };
  }
}

// eslint-disable-next-line no-new-func -- xem comment đầu file: chạy NGUYÊN
// VĂN enums.js thật, không phải eval mã không tin cậy.
new Function(enumsSource)();

const loadedActivityTypes = window.AgriChain?.ACTIVITY_TYPES;
if (!loadedActivityTypes) {
  throw new Error(
    'Không đọc được ACTIVITY_TYPES từ js/enums.js — kiểm tra file đó có đổi cấu trúc (IIFE, tên biến global.AgriChain.ACTIVITY_TYPES) không.'
  );
}

export const ACTIVITY_TYPES: ActivityType[] = loadedActivityTypes;

export function activityTypeOf(key: string): ActivityType {
  return ACTIVITY_TYPES.find((t) => t.key === key) ?? ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1];
}

/** "icon-seed" -> "seed" — dùng khi truyền vào <Icon name=.../> (tự thêm lại tiền tố). */
export function activityIconName(type: ActivityType): string {
  return type.icon.replace(/^icon-/, '');
}
