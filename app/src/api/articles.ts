// Bài viết (cẩm nang) — `GET /articles` (công khai, chỉ bài đã xuất bản) và `/system/articles`
// (CRUD, chỉ platform_admin, thấy cả bản nháp). Field snake_case ĐÚNG NHƯ backend trả về
// (app/schemas/article.py bên agrichain-api).
import { request } from './http';
import type { Page } from './types';

export type ArticleStatus = 'draft' | 'published';

export interface ArticleListItem {
  id: string;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  title: string;
  slug: string;
  author: string | null;
  status: ArticleStatus;
  tags: string | null;
  summary: string | null;
  cover_url: string | null;
  published_at: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

/** Chi tiết — thêm `content` (danh sách không trả nội dung dài). */
export interface Article extends ArticleListItem {
  content: string;
}

export interface ArticlePayload {
  title: string;
  slug: string;
  category_id?: string | null;
  author?: string | null;
  status?: ArticleStatus;
  tags?: string | null;
  summary?: string | null;
  content: string;
  cover_url?: string | null;
}

export type ArticleUpdatePayload = Partial<ArticlePayload>;

export interface ArticleListParams {
  q?: string;
  category_id?: string;
  status?: ArticleStatus;
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

export const systemArticles = {
  list: (params?: ArticleListParams) => request<Page<ArticleListItem>>('GET', '/system/articles', { query: params }),
  get: (id: string) => request<Article>('GET', `/system/articles/${id}`),
  create: (data: ArticlePayload) => request<Article>('POST', '/system/articles', { body: data }),
  update: (id: string, data: ArticleUpdatePayload) => request<Article>('PATCH', `/system/articles/${id}`, { body: data }),
  remove: (id: string) => request<null>('DELETE', `/system/articles/${id}`)
};
