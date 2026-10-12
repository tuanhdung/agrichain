// Đánh giá sản phẩm — chỉ phần quản trị `/system/reviews` (platform_admin xem + gỡ đánh giá vi phạm).
// Field snake_case ĐÚNG NHƯ backend (app/schemas/cart_review.py::ReviewAdminOut bên agrichain-api).
import { request } from './http';
import type { Page } from './types';

export interface ReviewAdmin {
  id: string;
  product_id: string;
  product_name: string;
  user_id: string;
  reviewer_name: string;
  reviewer_email: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewListParams {
  product_id?: string;
  rating?: number;
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

export const systemReviews = {
  list: (params?: ReviewListParams) => request<Page<ReviewAdmin>>('GET', '/system/reviews', { query: params }),
  remove: (id: string) => request<null>('DELETE', `/system/reviews/${id}`)
};
