// Port TYPES/UNITS của js/vat-tu.js gốc — `key` khớp enum `type` của backend
// thật (SupplyCreate/SupplyOut), ĐỪNG đổi khi đã có dữ liệu. Tên icon ở đây
// KHÔNG có tiền tố "icon-" (khác biến gốc) vì <Icon name="..."/> (app/src/icons.tsx)
// tự thêm tiền tố đó — xem icons.tsx.
export interface SupplyTypeDef {
  key: string;
  label: string;
  icon: string;
}

export const TYPES: SupplyTypeDef[] = [
  { key: 'fertilizer', label: 'Phân bón', icon: 'seedling' },
  { key: 'pesticide', label: 'Thuốc trừ sâu', icon: 'bug' },
  { key: 'herbicide', label: 'Thuốc diệt cỏ', icon: 'grass' },
  { key: 'fungicide', label: 'Thuốc trị nấm', icon: 'mushroom' },
  { key: 'seed', label: 'Hạt giống', icon: 'seed' },
  { key: 'bio', label: 'Chế phẩm sinh học', icon: 'flask' },
  { key: 'other', label: 'Khác', icon: 'box' }
];

export const UNITS = ['kg', 'g', 'Lít', 'ml', 'Gói', 'Chai', 'Thùng/Hộp', 'Bao', 'Cái'];

export function typeOf(key: string): SupplyTypeDef {
  return TYPES.find((t) => t.key === key) ?? TYPES[TYPES.length - 1]; // rơi về "Khác" nếu gặp key lạ
}

export const PAGE_SIZE = 50;
export const SEARCH_DEBOUNCE_MS = 300;

/* --- Gợi ý mã vật tư theo loại (port nguyên văn js/vat-tu.js) --------------
   "Thuốc trị nấm" -> chữ cái đầu mỗi từ (bỏ dấu) -> "TTN" + số thứ tự 2 chữ
   số trong đúng loại đó, ví dụ TTN01. Chỉ gợi ý — người dùng vẫn sửa được. */
function stripDiacritics(text: string): string {
  // NFD tách mỗi chữ có dấu thành chữ cái gốc + dấu kết hợp riêng đứng liền
  // sau — regex xoá đúng dải combining mark (U+0300-U+036F), chỉ còn lại chữ
  // cái gốc không dấu. "đ/Đ" không tách được qua NFD nên xử lý tay.
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd');
}

export function typeCodePrefix(type: SupplyTypeDef): string {
  return stripDiacritics(type.label)
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}
