// Đề nghị bán hàng — liên kết sản phẩm "truy xuất" ↔ lô hàng (bảng `product_batches` ở agrichain-api).
// Hai phía của cùng một bảng:
//  - `systemProductBatches` (`/system/products/{id}/batches`): platform_admin gắn lô của Đơn vị nào đó vào sản phẩm.
//  - `listings` (`/listings`): tài khoản business của Đơn vị sở hữu lô xem + đồng ý/từ chối (quyền listings.view/edit).
// Chỉ liên kết `confirmed` mới lên sàn. Field snake_case ĐÚNG NHƯ backend (app/schemas/listing.py).
import { request } from './http';
import type { Page } from './types';

export type ListingStatus = 'proposed' | 'confirmed' | 'rejected';

/** Một lô đã gắn vào sản phẩm, nhìn từ phía quản trị hệ thống (có giá thu về). */
export interface ProductBatchLink {
  id: string;
  product_id: string;
  batch_id: string;
  batch_code: string;
  batch_status: string;
  /** Ngày thu hoạch DỰ KIẾN của lô (YYYY-MM-DD). */
  harvest_date: string;
  expected_yield: number;
  batch_unit: string;
  farm_id: string;
  farm_name: string;
  season_id: string;
  season_name: string;
  organization_id: string;
  organization_name: string;
  product_unit: string;
  quantity_proposed: number;
  quantity_confirmed: number | null;
  settlement_price: number | null;
  status: ListingStatus;
  response_note: string | null;
  responded_at: string | null;
  /** Trần có thể giao cho sản phẩm này (đơn vị sản phẩm); null nếu đơn vị lô/sản phẩm không quy đổi được. */
  sellable_cap: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProductBatchCreatePayload {
  batch_id: string;
  quantity: number;
  /** 0/null/bỏ trống = chưa thoả thuận giá. */
  settlement_price?: number | null;
}

export interface ProductBatchUpdatePayload {
  quantity?: number;
  settlement_price?: number | null;
}

export const systemProductBatches = {
  list: (productId: string) => request<ProductBatchLink[]>('GET', `/system/products/${productId}/batches`),
  add: (productId: string, data: ProductBatchCreatePayload) =>
    request<ProductBatchLink>('POST', `/system/products/${productId}/batches`, { body: data }),
  update: (productId: string, linkId: string, data: ProductBatchUpdatePayload) =>
    request<ProductBatchLink>('PATCH', `/system/products/${productId}/batches/${linkId}`, { body: data }),
  remove: (productId: string, linkId: string) =>
    request<null>('DELETE', `/system/products/${productId}/batches/${linkId}`)
};

/** Một đề nghị nhìn từ phía Đơn vị sở hữu lô (giá thu về là của chính Đơn vị này). */
export interface Listing {
  id: string;
  product_id: string;
  product_name: string;
  product_unit: string;
  batch_id: string;
  batch_code: string;
  batch_status: string;
  harvest_date: string;
  expected_yield: number;
  batch_unit: string;
  farm_name: string;
  season_name: string;
  quantity_proposed: number;
  quantity_confirmed: number | null;
  settlement_price: number | null;
  status: ListingStatus;
  response_note: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface ListingRespondPayload {
  action: 'confirm' | 'reject';
  /** Chỉ khi confirm: 1..quantity_proposed; bỏ trống = đủ số đề nghị. */
  quantity?: number;
  note?: string | null;
}

export interface ListingListParams {
  status?: ListingStatus;
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

export const listings = {
  list: (params?: ListingListParams) => request<Page<Listing>>('GET', '/listings', { query: params }),
  pendingCount: () => request<{ pending: number }>('GET', '/listings/pending-count'),
  respond: (id: string, data: ListingRespondPayload) => request<Listing>('POST', `/listings/${id}/respond`, { body: data })
};

// --- Đơn cần giao ---------------------------------------------------------------------------------------------
// Sàn chỉ là cầu nối: đơn sản phẩm "truy xuất" được chia theo lô, Đơn vị TỰ GIAO cho khách. Đơn vị chỉ thấy giá
// thoả thuận (không có giá bán lẻ/tổng tiền/phí ship). Quyền dùng chung listings.view / listings.edit.
export type FulfillmentStatus = 'pending' | 'shipping' | 'delivered' | 'cancelled';

export interface Fulfillment {
  id: string;
  fulfillment_status: FulfillmentStatus;
  order_code: string;
  ordered_at: string;
  product_name: string;
  unit: string;
  quantity: number;
  settlement_price: number | null;
  /** quantity × settlement_price; null nếu chưa thoả thuận giá. */
  amount: number | null;
  batch_code: string;
  /** Ngày thu hoạch dự kiến của lô (YYYY-MM-DD). */
  harvest_date: string | null;
  batch_status: string;
  /** Đơn đặt trước: hàng chưa thu hoạch thì chưa giao được. */
  is_preorder: boolean;
  farm_name: string;
  season_name: string;
  receiver_name: string;
  receiver_phone: string;
  province: string;
  ward: string;
  detail: string;
  note: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}

export interface FulfillmentListParams {
  status?: FulfillmentStatus;
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

export const fulfillments = {
  list: (params?: FulfillmentListParams) => request<Page<Fulfillment>>('GET', '/fulfillments', { query: params }),
  openCount: () => request<{ open: number }>('GET', '/fulfillments/open-count'),
  update: (id: string, status: 'shipping' | 'delivered') =>
    request<Fulfillment>('PATCH', `/fulfillments/${id}`, { body: { status } })
};

/** Phần của một đơn do một Đơn vị giao — Quản trị hệ thống xem trong chi tiết đơn. */
export interface OrderFulfillment {
  id: string;
  order_item_id: string;
  product_name: string;
  unit: string;
  quantity: number;
  settlement_price: number | null;
  fulfillment_status: FulfillmentStatus;
  shipped_at: string | null;
  delivered_at: string | null;
  batch_code: string;
  organization_name: string;
}

export const systemOrderFulfillments = {
  list: (orderId: string) => request<OrderFulfillment[]>('GET', `/system/orders/${orderId}/fulfillments`)
};


// --- Đặt trước & yêu cầu trồng ----------------------------------------------------------------------------------
// Sản phẩm truy xuất cho đặt trước (allow_preorder): phần thiếu tồn chờ nguồn. Quản trị xem nhu cầu đang chờ rồi gửi
// "yêu cầu trồng" (giống, số lượng, cần trước ngày, giá thoả thuận) cho một Đơn vị; Đơn vị nhận, trồng, rồi "gắn lô"
// để thực hiện — đơn đặt trước tự được chia vào lô đó.
export type GrowRequestStatus = 'proposed' | 'accepted' | 'rejected' | 'fulfilled' | 'cancelled';

export interface GrowRequest {
  id: string;
  product_id: string;
  product_name: string;
  product_unit: string;
  organization_id: string;
  organization_name: string;
  variety: string;
  quantity: number;
  need_by: string | null;
  settlement_price: number | null;
  note: string | null;
  status: GrowRequestStatus;
  response_note: string | null;
  responded_at: string | null;
  product_batch_id: string | null;
  created_at: string;
}

export interface GrowRequestCreatePayload {
  organization_id: string;
  variety: string;
  quantity: number;
  need_by?: string | null;
  settlement_price?: number | null;
  note?: string | null;
}

export interface PreorderDemand {
  waiting_quantity: number;
  waiting_orders: number;
}

export interface OrganizationOption {
  id: string;
  name: string;
}

export const systemGrowRequests = {
  organizations: () => request<OrganizationOption[]>('GET', '/system/organizations'),
  demand: (productId: string) => request<PreorderDemand>('GET', `/system/products/${productId}/preorder-demand`),
  list: (productId: string) => request<GrowRequest[]>('GET', `/system/products/${productId}/grow-requests`),
  create: (productId: string, data: GrowRequestCreatePayload) =>
    request<GrowRequest>('POST', `/system/products/${productId}/grow-requests`, { body: data }),
  cancel: (productId: string, requestId: string) =>
    request<GrowRequest>('POST', `/system/products/${productId}/grow-requests/${requestId}/cancel`)
};

export const growRequests = {
  /** Số yêu cầu trồng đang chờ Đơn vị phản hồi (status 'proposed'). */
  pendingCount: () => request<{ pending: number }>('GET', '/grow-requests/pending-count'),
  list: (params?: { status?: GrowRequestStatus; page?: number; page_size?: number; [key: string]: unknown }) =>
    request<Page<GrowRequest>>('GET', '/grow-requests', { query: params }),
  respond: (id: string, action: 'accept' | 'reject', note?: string | null) =>
    request<GrowRequest>('POST', `/grow-requests/${id}/respond`, { body: { action, note: note ?? null } }),
  fulfill: (id: string, batchId: string, quantity?: number) =>
    request<GrowRequest>('POST', `/grow-requests/${id}/fulfill`, {
      body: { batch_id: batchId, ...(quantity ? { quantity } : {}) }
    })
};
