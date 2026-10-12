// Danh mục sàn TMĐT — `GET /categories` (công khai, chỉ danh mục đang hiện) và
// `/system/categories` (CRUD, chỉ platform_admin, thấy cả danh mục đã ẩn).
// Field snake_case ĐÚNG NHƯ backend trả về (app/schemas/category.py bên agrichain-api).
import { request } from './http';
import type { Page } from './types';

export type CategoryType = 'product' | 'article';

export interface Category {
  id: string;
  type: CategoryType;
  parent_id: string | null;
  code: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  /** Ảnh đại diện thẻ danh mục (URL http(s) hoặc data URL). null = chưa có, sàn dùng nền gradient + emoji. */
  image_url: string | null;
  badge: string | null;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
  /** Số danh mục con chưa xoá. */
  child_count: number;
}

export interface CategoryPayload {
  type: CategoryType;
  name: string;
  slug: string;
  /** Bỏ trống thì backend tự sinh từ tên. */
  code?: string | null;
  parent_id?: string | null;
  description?: string | null;
  icon?: string | null;
  image_url?: string | null;
  badge?: string | null;
  sort_order?: number;
  is_featured?: boolean;
  is_active?: boolean;
}

/** PATCH: không có `type` (không đổi được), mọi trường đều tuỳ chọn. */
export type CategoryUpdatePayload = Partial<Omit<CategoryPayload, 'type'>>;

export interface CategoryListParams {
  type?: CategoryType;
  parent_id?: string;
  root?: boolean;
  featured?: boolean;
  q?: string;
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

export const categories = {
  /** Công khai, không cần đăng nhập. */
  list: (params?: CategoryListParams) => request<Page<Category>>('GET', '/categories', { query: params, auth: false }),
  getBySlug: (slug: string, type: CategoryType = 'product') =>
    request<Category>('GET', `/categories/by-slug/${encodeURIComponent(slug)}`, { query: { type }, auth: false })
};

export const systemCategories = {
  list: (params?: CategoryListParams) => request<Page<Category>>('GET', '/system/categories', { query: params }),
  create: (data: CategoryPayload) => request<Category>('POST', '/system/categories', { body: data }),
  update: (id: string, data: CategoryUpdatePayload) => request<Category>('PATCH', `/system/categories/${id}`, { body: data }),
  remove: (id: string) => request<null>('DELETE', `/system/categories/${id}`)
};
