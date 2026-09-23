// Port formatDate()/formatArea()/formatDateTimeLocal()/toDatetimeLocalValue()
// của js/nong-trai-chi-tiet.js gốc nguyên văn — bản riêng cho trang này (đúng
// quy ước "mỗi trang tự chứa JS riêng" đã áp dụng cho /nong-trai, /lo-hang...
// dù nội dung formatDate/formatArea trùng nhau).

// "2026-08-12" -> "12/08/2026"
export function formatDate(value?: string | null): string {
  if (!value) return 'Chưa đặt';
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatArea(value: number | null | undefined): string {
  const num = Number(value);
  if (!num) return '0 ha';
  return `${num} ha`;
}

// input[type=datetime-local] trả về "2026-08-28T15:10" (không giây, không múi
// giờ) — tách theo "T" rồi tái dùng formatDate() cho phần ngày. Chấp nhận cả
// "YYYY-MM-DDTHH:mm" (input datetime-local) lẫn ISO đầy đủ backend trả về
// ("...T07:30:00+07:00"/"...Z") — luôn cắt về đúng 16 ký tự đầu trước khi
// tách, bỏ qua giây/múi giờ.
export function formatDateTimeLocal(value?: string | null): string {
  if (!value) return 'Chưa đặt';
  const parts = String(value).slice(0, 16).split('T');
  if (parts.length !== 2) return value;
  return `${formatDate(parts[0])} ${parts[1]}`;
}

// "2026-02-01T07:30:00+07:00" -> "2026-02-01T07:30" (khớp giá trị input
// datetime-local mong đợi).
export function toDatetimeLocalValue(value?: string | null): string {
  return value ? String(value).slice(0, 16) : '';
}
