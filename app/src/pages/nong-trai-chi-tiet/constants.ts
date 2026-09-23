// Port CERT_STATUSES/SEASON_STATUSES + statusOf() của js/nong-trai-chi-tiet.js
// gốc nguyên văn — BATCH_STATUSES sẽ thêm vào đây ở Bước 4 khi tới lượt.
export interface StatusDef {
  key: string;
  label: string;
  badge: string;
}

export const CERT_STATUSES: StatusDef[] = [
  { key: 'active', label: 'Hoạt động', badge: 'badge--success' },
  { key: 'expired', label: 'Hết hạn', badge: 'badge--danger' },
  { key: 'suspended', label: 'Tạm đình chỉ', badge: 'badge--warning' },
  { key: 'revoked', label: 'Đã thu hồi', badge: 'badge--neutral' }
];

export function certStatusOf(key: string): StatusDef {
  return CERT_STATUSES.find((s) => s.key === key) ?? CERT_STATUSES[0];
}

export const SEASON_STATUSES: StatusDef[] = [
  { key: 'planned', label: 'Kế hoạch', badge: 'badge--neutral' },
  { key: 'in_progress', label: 'Đang thực hiện', badge: 'badge--info' },
  { key: 'harvested', label: 'Đã thu hoạch', badge: 'badge--warning' },
  { key: 'completed', label: 'Hoàn thành', badge: 'badge--success' },
  { key: 'failed', label: 'Thất bại', badge: 'badge--danger' }
];

export function seasonStatusOf(key: string): StatusDef {
  return SEASON_STATUSES.find((s) => s.key === key) ?? SEASON_STATUSES[0];
}

// Đơn vị dùng riêng cho dòng "Vật tư sử dụng" trong form nhật ký — trùng nội
// dung với UNITS ở pages/vat-tu nhưng khai báo lại vì 2 trang không dùng
// chung file (đúng quy ước "mỗi trang tự chứa JS riêng" của dự án, khớp
// js/nong-trai-chi-tiet.js gốc cũng khai báo lại thay vì import từ vat-tu.js).
export const MATERIAL_UNITS = ['kg', 'g', 'Lít', 'ml', 'Gói', 'Chai', 'Thùng/Hộp', 'Bao', 'Cái'];

export const MATERIAL_METHODS = [
  'Phun thuốc',
  'Tưới nước',
  'Bón vãi',
  'Bón lá',
  'Bón đất',
  'Xử lý hạt giống',
  'Bón phân qua hệ thống tưới',
  'Tưới nhỏ giọt',
  'Xông hơi',
  'Khác'
];

// Backend chặn nếu vượt (LogImageIn: "Tối đa 5 ảnh mỗi bản ghi", "Tối đa 2MB
// mỗi ảnh") — kiểm trước ở client cho trải nghiệm tốt hơn, khớp
// MAX_LOG_IMAGES/MAX_LOG_IMAGE_BYTES gốc. ⚠️ Giới hạn dung lượng này CHỈ áp
// dụng cho ẢNH NHẬT KÝ — KHÔNG áp dụng cho tệp chứng nhận (CertificationFormModal.tsx),
// xem ghi chú đã xác nhận với người dùng ở mục "Bước 2" trong app/CLAUDE.md.
export const MAX_LOG_IMAGES = 5;
export const MAX_LOG_IMAGE_BYTES = 2 * 1024 * 1024;

// Port BATCH_UNITS/BATCH_STATUSES của js/nong-trai-chi-tiet.js gốc — trùng
// nội dung với bản đã port ở pages/lo-hang/constants.ts nhưng khai báo lại
// (2 trang không dùng chung file, đúng quy ước "mỗi trang tự chứa JS riêng"
// — bản gốc cũng khai báo 2 lần trong js/lo-hang.js VÀ js/nong-trai-chi-tiet.js).
export const BATCH_UNITS = ['kg', 'Tấn', 'Bó/Nài', 'Cái/Trái', 'Bao/Túi', 'Két/Thùng', 'Khác'];

export const BATCH_STATUSES: StatusDef[] = [
  { key: 'planning', label: 'Đang lập kế hoạch', badge: 'badge--neutral' },
  { key: 'planted', label: 'Đang xuống giống', badge: 'badge--info' },
  { key: 'growing', label: 'Đang canh tác', badge: 'badge--info' },
  { key: 'harvested', label: 'Đã thu hoạch', badge: 'badge--warning' },
  { key: 'processed', label: 'Đã sơ chế', badge: 'badge--warning' },
  { key: 'completed', label: 'Hoàn thành', badge: 'badge--success' },
  { key: 'failed', label: 'Thất bại', badge: 'badge--danger' }
];

export function batchStatusOf(key: string): StatusDef {
  return BATCH_STATUSES.find((s) => s.key === key) ?? BATCH_STATUSES[0];
}
