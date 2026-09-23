// Port BATCH_STATUSES/statusOf() của js/lo-hang.js gốc nguyên văn.
export interface BatchStatusDef {
  key: string;
  label: string;
  badge: string;
}

export const BATCH_STATUSES: BatchStatusDef[] = [
  { key: 'planning', label: 'Đang lập kế hoạch', badge: 'badge--neutral' },
  { key: 'planted', label: 'Đang xuống giống', badge: 'badge--info' },
  { key: 'growing', label: 'Đang canh tác', badge: 'badge--info' },
  { key: 'harvested', label: 'Đã thu hoạch', badge: 'badge--warning' },
  { key: 'processed', label: 'Đã sơ chế', badge: 'badge--warning' },
  { key: 'completed', label: 'Hoàn thành', badge: 'badge--success' },
  { key: 'failed', label: 'Thất bại', badge: 'badge--danger' }
];

export function statusOf(key: string): BatchStatusDef {
  return BATCH_STATUSES.find((s) => s.key === key) ?? BATCH_STATUSES[0];
}

// Bản gốc KHÔNG phân trang — chỉ fetch tối đa 100 lô hàng/lần
// (page_size: 100 cố định), "Tổng số" hiển thị là batches.length của lần
// fetch đó, không phải data.total từ API. Giữ đúng hành vi này.
export const FETCH_PAGE_SIZE = 100;
