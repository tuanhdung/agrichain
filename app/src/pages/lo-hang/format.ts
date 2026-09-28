// Port formatDate()/formatArea() của js/lo-hang.js gốc nguyên văn.
export function formatDate(value: string | null): string {
  if (!value) return 'Chưa đặt';
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatArea(value: number | null): string {
  const num = Number(value);
  if (!num) return '0 ha';
  return `${num} ha`;
}

// Port shorten() của js/truy-xuat.js — rút gọn chuỗi dài (tx_hash) kiểu
// "0x1a2b...f8e9", giữ đủ ký tự đầu/cuối để còn nhận diện được bằng mắt.
export function shorten(value: string | null, headLength = 10): string {
  if (!value) return '—';
  if (value.length <= headLength * 2 + 3) return value;
  return `${value.slice(0, headLength)}…${value.slice(-6)}`;
}
