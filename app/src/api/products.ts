// Sản phẩm (nông sản) sàn TMĐT — `GET /products` (công khai, chỉ sản phẩm đang
// mở bán) và `/system/products` (CRUD, chỉ platform_admin, thấy cả sản phẩm đang ẩn).
// Field snake_case ĐÚNG NHƯ backend trả về (app/schemas/product.py bên agrichain-api).
import { request } from './http';
import type { Page } from './types';

export type ProductStatus = 'selling' | 'hidden';

/** Một dòng trong danh sách — KHÔNG có `banner_url` (chỉ endpoint chi tiết mới có). */
export interface ProductListItem {
  id: string;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  name: string;
  slug: string;
  sku: string;
  barcode: string | null;
  unit: string;
  origin: string | null;
  standards: string | null;
  status: ProductStatus;
  is_featured: boolean;
  stock: number;
  retail_price: number;
  wholesale_price: number | null;
  moq: number;
  summary: string | null;
  description: string | null;
  thumbnail_url: string | null;
  // Chỉ có ở /system/products:
  created_at?: string;
  updated_at?: string;
}

export interface Product extends ProductListItem {
  banner_url: string | null;
}

export interface ProductPayload {
  name: string;
  slug: string;
  sku: string;
  barcode?: string | null;
  category_id?: string | null;
  unit: string;
  origin?: string | null;
  standards?: string | null;
  status?: ProductStatus;
  is_featured?: boolean;
  stock?: number;
  retail_price: number;
  /** 0/null/bỏ trống = không bán sỉ. Có thì phải < retail_price và moq ≥ 2. */
  wholesale_price?: number | null;
  moq?: number;
  summary?: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
  banner_url?: string | null;
}

export type ProductUpdatePayload = Partial<ProductPayload>;

export interface ProductListParams {
  q?: string;
  /** Slug danh mục (route công khai) — gồm cả sản phẩm của danh mục con. */
  category?: string;
  category_id?: string;
  status?: ProductStatus;
  featured?: boolean;
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

export const products = {
  /** Công khai, không cần đăng nhập. */
  list: (params?: ProductListParams) => request<Page<ProductListItem>>('GET', '/products', { query: params, auth: false }),
  getBySlug: (slug: string) => request<Product>('GET', `/products/by-slug/${encodeURIComponent(slug)}`, { auth: false })
};

export const systemProducts = {
  list: (params?: ProductListParams) => request<Page<ProductListItem>>('GET', '/system/products', { query: params }),
  get: (id: string) => request<Product>('GET', `/system/products/${id}`),
  create: (data: ProductPayload) => request<Product>('POST', '/system/products', { body: data }),
  update: (id: string, data: ProductUpdatePayload) => request<Product>('PATCH', `/system/products/${id}`, { body: data }),
  remove: (id: string) => request<null>('DELETE', `/system/products/${id}`)
};
