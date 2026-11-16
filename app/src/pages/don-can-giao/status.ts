import type { FulfillmentStatus } from '../../api';

/** Nhãn + màu badge của trạng thái giao hàng (dùng ở trang Đơn cần giao và chi tiết đơn của quản trị). */
export const FULFILLMENT_STATUS: Record<FulfillmentStatus, { label: string; cls: string }> = {
  pending: { label: 'Chờ giao', cls: 'badge--warning' },
  shipping: { label: 'Đang giao', cls: 'badge--info' },
  delivered: { label: 'Đã giao', cls: 'badge--success' },
  cancelled: { label: 'Đã huỷ', cls: 'badge--neutral' }
};
