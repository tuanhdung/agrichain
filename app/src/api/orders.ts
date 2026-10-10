// Đơn hàng sàn TMĐT + danh sách người dùng toàn hệ thống — các route `/system/*` của
// agrichain-api (app/routers/orders.py, app/routers/system.py), CHỈ platform_admin.
// Field snake_case ĐÚNG NHƯ backend trả về.
import { request } from './http';
import type { Page } from './types';

export type OrderStatus = 'received' | 'packing' | 'shipping' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';
export type PaymentMethod = 'cod' | 'transfer';

export interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  unit: string;
  unit_price: number;
  quantity: number;
}

export interface OrderEvent {
  status: OrderStatus;
  created_at: string;
}

export interface AdminOrder {
  id: string;
  code: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  shipping_fee: number;
  total: number;
  receiver_name: string;
  receiver_phone: string;
  receiver_email: string | null;
  province: string;
  ward: string;
  detail: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  /** Lịch sử đổi trạng thái, cũ trước mới sau. */
  events: OrderEvent[];
  user_id: string;
  customer_name: string | null;
  customer_email: string | null;
}

export interface OrderListParams {
  q?: string;
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

export interface OrderUpdatePayload {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
}

export interface OrderStats {
  total_orders: number;
  revenue_total: number;
  revenue_delivered: number;
  customers: number;
  by_status: Partial<Record<OrderStatus, number>>;
  by_day: { date: string; revenue: number }[];
}

export const systemOrders = {
  list: (params?: OrderListParams) => request<Page<AdminOrder>>('GET', '/system/orders', { query: params }),
  get: (id: string) => request<AdminOrder>('GET', `/system/orders/${id}`),
  update: (id: string, data: OrderUpdatePayload) => request<AdminOrder>('PATCH', `/system/orders/${id}`, { body: data }),
  stats: () => request<OrderStats>('GET', '/system/orders/stats')
};

// --- Người dùng toàn hệ thống --------------------------------------------------

export type SystemAccountType = 'customer' | 'business' | 'platform_admin';

export interface SystemUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  account_type: SystemAccountType;
  role_name: string;
  organization_id: string | null;
  organization_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface SystemUserListParams {
  q?: string;
  account_type?: SystemAccountType;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

export interface SystemUserSummary {
  total: number;
  by_account_type: Partial<Record<SystemAccountType, number>>;
}

export const systemUsers = {
  list: (params?: SystemUserListParams) => request<Page<SystemUser>>('GET', '/system/users', { query: params }),
  summary: () => request<SystemUserSummary>('GET', '/system/users/summary')
};
