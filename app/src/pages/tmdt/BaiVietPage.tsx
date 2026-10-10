// "Quản lý bài viết" (cẩm nang kỹ thuật canh tác) — dữ liệu THẬT qua API (`/system/articles`).
// Bài ĐÃ XUẤT BẢN hiện ở trang Blog công khai (blog.html) cùng nguồn `GET /articles`.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Icon } from '../../icons';
import { useDialog } from '../../hooks/useDialog';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { api, ApiError, type Category } from '../../api';
import type { ArticleListItem, ArticleStatus } from '../../api/articles';
import { slugify } from './store';
import { uploadImage, IMAGE_MAX_SOURCE_BYTES } from './imageUtil';
import { EmptyBlock, formatDate, PlatformAdminOnly, TmdtHeader } from './shared';

const PAGE_SIZE = 20;
type View = 'loading' | 'data' | 'error';

interface FormValues {
  title: string;
  slug: string;
  slugEdited: boolean;
  categoryId: string;
  author: string;
  status: ArticleStatus;
  tags: string;
  summary: string;
  content: string;
  cover: string;
}

type FieldKey = 'title' | 'slug' | 'categoryId' | 'summary' | 'content' | 'cover';
const FIELD_MAP: Record<string, FieldKey> = {
  title: 'title', slug: 'slug', category_id: 'categoryId', summary: 'summary', content: 'content', cover_url: 'cover'
};

const EMPTY: FormValues = {
  title: '', slug: '', slugEdited: false, categoryId: '', author: '', status: 'draft', tags: '', summary: '', content: '', cover: ''
};

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.';
}

function BaiVietPageContent() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const modal = useDialog();

  const [items, setItems] = useState<ArticleListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | ''>('');
  const [view, setView] = useState<View>('loading');
  const [loadError, setLoadError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.categories.list({ type: 'article', page_size: 100 }).then((p) => setCategories(p.items), () => setCategories([]));
  }, []);

  const load = useCallback(() => {
    setView('loading');
    api.system.articles
      .list({ q: query || undefined, category_id: categoryFilter || undefined, status: statusFilter || undefined, page, page_size: PAGE_SIZE })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setView('data');
      })
      .catch((err: unknown) => {
        setLoadError(errorMessage(err));
        setView('error');
      });
  }, [query, categoryFilter, statusFilter, page]);

  useEffect(load, [load]);

  const onSearch = useDebouncedCallback((value: string) => {
    setQuery(value.trim());
    setPage(1);
  }, 300);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtering = Boolean(query || categoryFilter || statusFilter);

  function openCreate() {
    setEditingId(null);
    setErrors({});
    setValues(EMPTY);
    modal.open();
  }

  async function openEdit(item: ArticleListItem) {
    // Danh sách không kèm nội dung → lấy chi tiết trước khi mở form.
    try {
      const a = await api.system.articles.get(item.id);
      setEditingId(a.id);
      setErrors({});
      setValues({
        title: a.title, slug: a.slug, slugEdited: true, categoryId: a.category_id ?? '', author: a.author ?? '',
        status: a.status, tags: a.tags ?? '', summary: a.summary ?? '', content: a.content, cover: a.cover_url ?? ''
      });
      modal.open();
    } catch (err) {
      showToast(errorMessage(err));
    }
  }

  function changeTitle(title: string) {
    setValues((v) => ({ ...v, title, slug: v.slugEdited ? v.slug : slugify(title) }));
  }

  function pickCover(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((p) => ({ ...p, cover: 'Chỉ chấp nhận tệp ảnh.' }));
      return;
    }
    if (file.size > IMAGE_MAX_SOURCE_BYTES) {
      setErrors((p) => ({ ...p, cover: `Ảnh quá lớn (tối đa ${IMAGE_MAX_SOURCE_BYTES / 1024 / 1024}MB). Hãy dán URL ảnh thay vì chọn tệp.` }));
      return;
    }
    uploadImage(file, 1200).then(
      (url) => {
        setErrors((p) => ({ ...p, cover: undefined }));
        setValues((v) => ({ ...v, cover: url }));
      },
      (err: unknown) => setErrors((p) => ({ ...p, cover: err instanceof ApiError ? err.message : 'Không tải được ảnh này, hãy thử tệp khác.' }))
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Partial<Record<FieldKey, string>> = {};
    if (!values.title.trim()) next.title = 'Nhập tiêu đề bài viết.';
    const slug = values.slug.trim() || slugify(values.title);
    if (values.title.trim() && !slug) next.slug = 'Nhập đường dẫn (tiêu đề không có chữ hoặc số để tự tạo).';
    if (!values.content.trim()) next.content = 'Nhập nội dung bài viết.';
    if (values.summary.length > 300) next.summary = 'Tóm tắt tối đa 300 ký tự.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const body = {
      title: values.title.trim(),
      slug,
      category_id: values.categoryId || null,
      author: values.author.trim() || null,
      status: values.status,
      tags: values.tags.trim() || null,
      summary: values.summary.trim() || null,
      content: values.content.trim(),
      cover_url: values.cover.trim() || null
    };

    setBusy(true);
    try {
      if (editingId) await api.system.articles.update(editingId, body);
      else await api.system.articles.create(body);
      modal.close();
      showToast(editingId ? 'Đã lưu bài viết.' : 'Đã thêm bài viết.');
      load();
    } catch (err) {
      const field = err instanceof ApiError ? (err.details?.field as string | undefined) : undefined;
      const target = field ? FIELD_MAP[field] : undefined;
      if (target) setErrors({ [target]: errorMessage(err) });
      else showToast(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item: ArticleListItem) {
    if (!(await confirm(`Xoá bài viết “${item.title}”?`))) return;
    try {
      await api.system.articles.remove(item.id);
      showToast('Đã xoá bài viết.');
      load();
    } catch (err) {
      showToast(errorMessage(err));
    }
  }

  return (
    <>
      <TmdtHeader
        icon="file-text"
        title="Cẩm nang kỹ thuật canh tác 4.0"
        count={view === 'data' ? `${total} bài viết` : undefined}
        meta="Hệ thống quản trị nội dung (CMS) cẩm nang nông nghiệp công nghệ cao. Bài đã xuất bản hiện ở trang Blog."
        actions={
          <button type="button" className="btn btn--primary btn-shine" onClick={openCreate}>
            <Icon name="plus" className="icon--sm" />
            Soạn thảo bài viết mới
          </button>
        }
      />

      <div className="tmdt-toolbar">
        <div className="search-field">
          <Icon name="search" className="search-field__icon" />
          <input
            className="input" type="search" placeholder="Tìm theo tiêu đề, tác giả, tag..."
            value={searchInput} onChange={(e) => { setSearchInput(e.target.value); onSearch(e.target.value); }}
          />
        </div>
        <select className="select" value={categoryFilter} aria-label="Lọc chuyên mục" onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
          <option value="">Tất cả chuyên mục</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select" value={statusFilter} aria-label="Lọc trạng thái" onChange={(e) => { setStatusFilter(e.target.value as ArticleStatus | ''); setPage(1); }}>
          <option value="">Tất cả trạng thái</option>
          <option value="published">Đã xuất bản</option>
          <option value="draft">Bản nháp</option>
        </select>
      </div>

      {view === 'loading' && (
        <div className="async-state">
          <span className="spinner spinner--lg"></span>
          <p className="async-state__title">Đang tải bài viết...</p>
        </div>
      )}

      {view === 'error' && (
        <div className="async-state async-state--error">
          <Icon name="x-circle" className="icon--lg" />
          <p className="async-state__title">Không tải được bài viết</p>
          <p className="async-state__desc">{loadError}</p>
          <button type="button" className="btn btn--outline btn--sm" onClick={load}>Thử lại</button>
        </div>
      )}

      {view === 'data' && items.length === 0 && (
        <EmptyBlock
          icon="file-text"
          title={filtering ? 'Không tìm thấy bài viết nào phù hợp' : 'Chưa có bài viết nào'}
          desc={filtering ? 'Thử thay đổi bộ lọc tìm kiếm.' : 'Tạo bài viết cẩm nang nông nghiệp số đầu tiên của bạn.'}
        >
          <button type="button" className="btn btn--primary" onClick={openCreate}>+ Soạn thảo bài viết ngay</button>
        </EmptyBlock>
      )}

      {view === 'data' && items.length > 0 && (
        <>
          <div className="table-panel">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Bài viết</th>
                    <th>Chuyên mục</th>
                    <th>Tác giả</th>
                    <th>Xuất bản / tạo</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="tmdt-prod-cell">
                          {a.cover_url ? <img className="tmdt-prod-thumb" src={a.cover_url} alt="" loading="lazy" /> : <span className="tmdt-prod-thumb tmdt-prod-thumb--empty">📰</span>}
                          <div>
                            <div className="table__name">{a.title}</div>
                            {a.tags && <div className="table__muted">{a.tags}</div>}
                          </div>
                        </div>
                      </td>
                      <td>{a.category_name ? <span className="badge badge--success">{a.category_name}</span> : '—'}</td>
                      <td>{a.author || '—'}</td>
                      <td className="table__muted table__nowrap">{formatDate(a.published_at ?? a.created_at)}</td>
                      <td>
                        <span className={`badge ${a.status === 'published' ? 'badge--success' : 'badge--neutral'}`}>
                          {a.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                        </span>
                      </td>
                      <td>
                        <div className="table__actions">
                          <button type="button" className="icon-btn" aria-label={`Sửa ${a.title}`} data-tooltip="Chỉnh sửa" onClick={() => openEdit(a)}>
                            <Icon name="pencil" />
                          </button>
                          <button type="button" className="icon-btn icon-btn--danger" aria-label={`Xoá ${a.title}`} data-tooltip="Xoá" onClick={() => handleDelete(a)}>
                            <Icon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pagination">
            <button type="button" className="btn btn--outline btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Trước</button>
            <span className="pagination__info">Trang {page} / {totalPages}</span>
            <button type="button" className="btn btn--outline btn--sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau ›</button>
          </div>
        </>
      )}

      <dialog className="modal" ref={modal.ref} aria-labelledby="article-modal-title">
        <form className="modal__form" onSubmit={handleSubmit} noValidate>
          <div className="modal__header">
            <Icon name="file-text" />
            <h2 className="modal__title" id="article-modal-title">{editingId ? 'Sửa bài viết' : 'Soạn thảo bài viết mới'}</h2>
            <button type="button" className="modal__close" aria-label="Đóng" onClick={modal.close}>&times;</button>
          </div>
          <div className="modal__body">
            <section className="form-section">
              <div className="form-grid">
                <div className="field form-grid__full">
                  <label className="label" htmlFor="art-title">Tiêu đề</label>
                  <input className="input" id="art-title" value={values.title} aria-invalid={errors.title ? 'true' : undefined} onChange={(e) => changeTitle(e.target.value)} />
                  {errors.title && <p className="field__error">{errors.title}</p>}
                </div>
                <div className="field form-grid__full">
                  <label className="label" htmlFor="art-slug">Đường dẫn (slug)</label>
                  <input
                    className="input" id="art-slug" placeholder={slugify(values.title) || 'tu-dong-tu-tieu-de'} value={values.slug}
                    aria-invalid={errors.slug ? 'true' : undefined} onChange={(e) => setValues({ ...values, slug: e.target.value, slugEdited: true })}
                  />
                  <p className="field__hint">Trang Blog mở bài qua blog-chi-tiet.html?slug=…</p>
                  {errors.slug && <p className="field__error">{errors.slug}</p>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="art-category">Chuyên mục</label>
                  <select className="select" id="art-category" value={values.categoryId} aria-invalid={errors.categoryId ? 'true' : undefined} onChange={(e) => setValues({ ...values, categoryId: e.target.value })}>
                    <option value="">— Không chọn —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {categories.length === 0 && <p className="field__hint">Chưa có chuyên mục — tạo ở “Cây danh mục đa cấp” (tab cẩm nang).</p>}
                  {errors.categoryId && <p className="field__error">{errors.categoryId}</p>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="art-author">Tác giả</label>
                  <input className="input" id="art-author" placeholder="Ban biên tập AgriChain" value={values.author} onChange={(e) => setValues({ ...values, author: e.target.value })} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="art-status">Trạng thái</label>
                  <select className="select" id="art-status" value={values.status} onChange={(e) => setValues({ ...values, status: e.target.value as ArticleStatus })}>
                    <option value="draft">Bản nháp</option>
                    <option value="published">Đã xuất bản</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="art-tags">Tag (cách nhau bằng dấu phẩy)</label>
                  <input className="input" id="art-tags" value={values.tags} onChange={(e) => setValues({ ...values, tags: e.target.value })} />
                </div>
                <div className="field form-grid__full">
                  <label className="label" htmlFor="art-summary">Tóm tắt <span className="tmdt-opt">({values.summary.length}/300)</span></label>
                  <textarea className="textarea" id="art-summary" rows={2} value={values.summary} aria-invalid={errors.summary ? 'true' : undefined} onChange={(e) => setValues({ ...values, summary: e.target.value })} />
                  {errors.summary && <p className="field__error">{errors.summary}</p>}
                </div>
                <div className="field form-grid__full tmdt-image-field">
                  <span className="label">Ảnh bìa</span>
                  <div className="tmdt-image-field__preview" aria-hidden={values.cover ? undefined : 'true'}>
                    {values.cover ? <img src={values.cover} alt="" /> : <span>Chưa có ảnh bìa</span>}
                  </div>
                  <div className="tmdt-image-field__row">
                    <label className="btn btn--outline btn--sm tmdt-image-field__pick">
                      Chọn tệp
                      <input type="file" accept="image/*" hidden onChange={(e) => { pickCover(e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                    <input
                      className="input" aria-label="URL ảnh bìa" placeholder="Hoặc dán URL ảnh (https://...)"
                      value={values.cover} onChange={(e) => setValues({ ...values, cover: e.target.value })}
                    />
                    {values.cover && <button type="button" className="btn btn--sm btn--outline" onClick={() => setValues({ ...values, cover: '' })}>Xoá</button>}
                  </div>
                  {errors.cover && <p className="field__error">{errors.cover}</p>}
                </div>
                <div className="field form-grid__full">
                  <label className="label" htmlFor="art-content">Nội dung</label>
                  <textarea className="textarea" id="art-content" rows={10} value={values.content} aria-invalid={errors.content ? 'true' : undefined} onChange={(e) => setValues({ ...values, content: e.target.value })} />
                  <p className="field__hint">Mỗi đoạn cách nhau một dòng trống. Dòng bắt đầu bằng “## ” là tiêu đề phụ; dòng bắt đầu bằng “- ” là gạch đầu dòng.</p>
                  {errors.content && <p className="field__error">{errors.content}</p>}
                </div>
              </div>
            </section>
          </div>
          <div className="modal__footer">
            <button type="button" className="btn btn--secondary" onClick={modal.close}>Hủy</button>
            <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Lưu bài viết'}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

// Chỉ gắn nội dung (và các lời gọi API trong đó) SAU khi đã qua cổng platform_admin — tài khoản khác không
// gửi request nào tới /system/* (vốn chỉ trả 403).
export function BaiVietPage() {
  return (
    <PlatformAdminOnly>
      <BaiVietPageContent />
    </PlatformAdminOnly>
  );
}
