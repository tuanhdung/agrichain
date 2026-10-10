// "Cây danh mục đa cấp" — 2 cây (Nông sản / Cẩm nang), mỗi cây danh mục cha → con, thêm/sửa/xoá.
// Dữ liệu THẬT qua API (`/system/categories`, backend agrichain-api) — trang bán hàng đọc cùng nguồn
// này qua `GET /categories`, nên sửa ở đây là thấy ngay ở sàn.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Icon } from '../../icons';
import { useDialog } from '../../hooks/useDialog';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { api, ApiError, type Category, type CategoryType } from '../../api';
import { slugify } from './store';
import { uploadImage, IMAGE_MAX_SOURCE_BYTES } from './imageUtil';
import { EmptyBlock, PlatformAdminOnly, TmdtHeader } from './shared';

interface FormState {
  name: string;
  slug: string;
  /** true khi người dùng đã tự sửa slug — ngừng tự điền theo tên. */
  slugEdited: boolean;
  code: string;
  parentId: string;
  icon: string;
  /** Ảnh đại diện: URL hoặc data URL ('' = không có). */
  image: string;
  badge: string;
  description: string;
  featured: boolean;
  active: boolean;
  order: string;
}

type FieldErrors = Partial<Record<'name' | 'slug' | 'code' | 'parentId' | 'badge' | 'image', string>>;

const EMPTY: FormState = {
  name: '', slug: '', slugEdited: false, code: '', parentId: '', icon: '', image: '', badge: '', description: '',
  featured: false, active: true, order: '1'
};

const ICON_SUGGESTIONS = ['🥬', '🍎', '🌽', '🍚', '🍓', '🥕', '🍈', '🥭', '🍯', '☕', '🍵', '🌿', '🌱', '🍄', '🐟', '🫙', '📘', '🏅', '🔗', '🧪'];

// Trường lỗi backend (details.field) → ô trong form.
const FIELD_MAP: Record<string, keyof FieldErrors> = { name: 'name', slug: 'slug', code: 'code', parent_id: 'parentId', badge: 'badge', image_url: 'image' };

// Cây mẫu cho nút "Nạp dữ liệu mẫu": [tên cha, emoji, nhãn, [con...]].
const SAMPLE_TREE: Record<CategoryType, [string, string, string, string[]][]> = {
  product: [
    ['Rau Củ Quả Hữu Cơ', '🥬', 'Hữu cơ', ['Rau Ăn Lá Khí Canh', 'Củ Quả Đà Lạt Tuyển Chọn']],
    ['Trái Cây Đặc Sản', '🍎', 'Đặc sản', ['Sầu Riêng & Trái Cây Nhiệt Đới', 'Dâu Tây & Dưa Lưới Ichiba']],
    ['Gạo & Ngũ Cốc CNC', '🍚', '', ['Gạo ST25', 'Ngũ Cốc Dinh Dưỡng']],
    ['Dược Liệu & Trà Shan Tuyết', '🍵', '', ['Trà Shan Tuyết', 'Nấm Đông Trùng Hạ Thảo']],
    ['Giống Cây Trồng', '🌱', '', []],
    ['Đồ Uống Đặc Sản', '☕', '', []],
    ['Nước Mắm & Gia Vị', '🫙', '', []]
  ],
  article: [
    ['Kỹ Thuật Canh Tác', '🌿', '', ['Nhà Màng & Thủy Canh']],
    ['Tiêu Chuẩn & Chứng Nhận', '🏅', '', ['VietGAP', 'GlobalGAP']],
    ['Blockchain & Truy Xuất', '🔗', '', []]
  ]
};

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.';
}

function DanhMucPageContent() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const modal = useDialog();

  const [items, setItems] = useState<Category[]>([]);
  const [view, setView] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState<CategoryType>('product');
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});

  const load = useCallback(() => {
    setView('loading');
    api.system.categories
      .list({ page_size: 500 })
      .then((page) => {
        setItems(page.items);
        setView('ready');
      })
      .catch((err: unknown) => {
        setLoadError(errorMessage(err));
        setView('error');
      });
  }, []);

  useEffect(load, [load]);

  const inTab = useMemo(() => items.filter((c) => c.type === tab), [items, tab]);
  const counts = {
    product: items.filter((c) => c.type === 'product').length,
    article: items.filter((c) => c.type === 'article').length
  };
  const q = filter.trim().toLowerCase();
  const byOrder = (a: Category, b: Category) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'vi');
  const roots = inTab.filter((c) => !c.parent_id).sort(byOrder);
  const childrenOf = (id: string) => inTab.filter((c) => c.parent_id === id).sort(byOrder);
  const matches = (c: Category) => !q || (c.name + c.slug + c.code).toLowerCase().includes(q);
  const visibleRoots = roots.filter((r) => matches(r) || childrenOf(r.id).some(matches));

  useEffect(() => {
    setErrors({});
    setForm(
      editing
        ? {
            name: editing.name, slug: editing.slug, slugEdited: true, code: editing.code, parentId: editing.parent_id ?? '',
            icon: editing.icon ?? '', image: editing.image_url ?? '', badge: editing.badge ?? '', description: editing.description ?? '',
            featured: editing.is_featured, active: editing.is_active, order: String(editing.sort_order)
          }
        : { ...EMPTY, parentId: parentId ?? '', order: String(inTab.filter((c) => (c.parent_id ?? null) === parentId).length + 1) }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, parentId, modal.openCount]);

  // Giao diện chỉ hỗ trợ 2 cấp: danh mục cha phải là danh mục gốc, và danh mục
  // gốc đang có con thì không được chuyển thành con của danh mục khác.
  const parentOptions = roots.filter((r) => r.id !== editing?.id);
  const hasChildren = editing ? childrenOf(editing.id).length > 0 : false;

  function changeName(name: string) {
    setForm((f) => ({ ...f, name, slug: f.slugEdited ? f.slug : slugify(name) }));
  }

  function pickImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image: 'Chỉ chấp nhận tệp ảnh.' }));
      return;
    }
    if (file.size > IMAGE_MAX_SOURCE_BYTES) {
      setErrors((prev) => ({ ...prev, image: `Ảnh quá lớn (tối đa ${IMAGE_MAX_SOURCE_BYTES / 1024 / 1024}MB). Hãy dán URL ảnh thay vì chọn tệp.` }));
      return;
    }
    // Thẻ danh mục hiển thị ~360px nên 900px là dư cho màn hình retina.
    uploadImage(file, 900).then(
      (url) => {
        setErrors((prev) => ({ ...prev, image: undefined }));
        setForm((f) => ({ ...f, image: url }));
      },
      (err: unknown) => setErrors((prev) => ({ ...prev, image: err instanceof ApiError ? err.message : 'Không tải được ảnh này, hãy thử tệp khác.' }))
    );
  }

  function openForm(category: Category | null, parent: string | null) {
    setEditing(category);
    setParentId(category ? category.parent_id : parent);
    modal.open();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next: FieldErrors = {};
    if (!form.name.trim()) next.name = 'Nhập tên danh mục.';
    const slug = form.slug.trim() || slugify(form.name);
    if (form.name.trim() && !slug) next.slug = 'Nhập đường dẫn (tên không có chữ hoặc số để tự tạo).';
    setErrors(next);
    if (Object.keys(next).length) return;

    const body = {
      name: form.name.trim(),
      slug,
      parent_id: form.parentId || null,
      icon: form.icon.trim() || null,
      image_url: form.image.trim() || null,
      badge: form.badge.trim() || null,
      description: form.description.trim() || null,
      sort_order: Math.max(0, Number(form.order) || 0),
      is_featured: form.featured,
      is_active: form.active
    };
    const code = form.code.trim();

    setBusy(true);
    try {
      if (editing) {
        await api.system.categories.update(editing.id, { ...body, ...(code ? { code } : {}) });
      } else {
        await api.system.categories.create({ ...body, type: tab, code: code || null });
      }
      modal.close();
      showToast(editing ? 'Đã lưu danh mục.' : 'Đã thêm danh mục.');
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

  async function handleDelete(category: Category) {
    // Backend chặn xoá danh mục còn con/còn sản phẩm (409) — hỏi xác nhận rồi hiện đúng lý do nếu bị chặn.
    if (!(await confirm(`Xoá danh mục “${category.name}”?`))) return;
    try {
      await api.system.categories.remove(category.id);
      showToast('Đã xoá danh mục.');
      load();
    } catch (err) {
      showToast(errorMessage(err));
    }
  }

  async function loadSample() {
    setBusy(true);
    const existing = new Set(inTab.map((c) => c.slug));
    let created = 0;
    try {
      let order = 0;
      for (const [name, icon, badge, children] of SAMPLE_TREE[tab]) {
        order += 1;
        const slug = slugify(name);
        let parent = inTab.find((c) => c.slug === slug);
        if (!existing.has(slug)) {
          parent = await api.system.categories.create({
            type: tab, name, slug, icon, badge: badge || null, sort_order: order, is_featured: order <= 2
          });
          existing.add(slug);
          created += 1;
        }
        if (!parent) continue;
        let childOrder = 0;
        for (const childName of children) {
          childOrder += 1;
          const childSlug = slugify(childName);
          if (existing.has(childSlug)) continue;
          await api.system.categories.create({
            type: tab, name: childName, slug: childSlug, parent_id: parent.id, icon, sort_order: childOrder
          });
          existing.add(childSlug);
          created += 1;
        }
      }
      showToast(created ? `Đã nạp ${created} danh mục mẫu.` : 'Dữ liệu mẫu đã có đủ.');
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setBusy(false);
      load();
    }
  }

  function Row({ c, child }: { c: Category; child?: boolean }) {
    return (
      <div className={`tmdt-tree__row${child ? ' tmdt-tree__row--child' : ''}`}>
        {c.image_url ? (
          <img className="tmdt-prod-thumb" src={c.image_url} alt="" loading="lazy" />
        ) : (
          <span className="tmdt-tree__icon" aria-hidden="true">{c.icon || '🗂️'}</span>
        )}
        <span className="tmdt-tree__name">{c.name}</span>
        <span className="tmdt-tree__slug">/{c.slug}</span>
        {c.badge && <span className="badge badge--info">{c.badge}</span>}
        {c.is_featured && <span className="badge badge--warning">★ Nổi bật</span>}
        <span className="tmdt-tree__spacer" />
        {!child && <span className="badge badge--neutral">{c.child_count} danh mục con</span>}
        <span className={`badge ${c.is_active ? 'badge--success' : 'badge--neutral'}`}>{c.is_active ? 'Hoạt động' : 'Đang ẩn'}</span>
        {!child && (
          <button type="button" className="icon-btn" aria-label={`Thêm danh mục con cho ${c.name}`} data-tooltip="Thêm danh mục con" onClick={() => openForm(null, c.id)}>
            <Icon name="plus" />
          </button>
        )}
        <button type="button" className="icon-btn" aria-label={`Sửa ${c.name}`} data-tooltip="Chỉnh sửa" onClick={() => openForm(c, null)}>
          <Icon name="pencil" />
        </button>
        <button type="button" className="icon-btn icon-btn--danger" aria-label={`Xoá ${c.name}`} data-tooltip="Xoá" onClick={() => handleDelete(c)}>
          <Icon name="trash" />
        </button>
      </div>
    );
  }

  return (
    <>
      <TmdtHeader
        icon="layers"
        title="Cây danh mục đa cấp"
        count={`${counts.product + counts.article} nhóm phân loại`}
        meta="Tổ chức cấu trúc danh mục cha - con cho sản phẩm nông sản và cẩm nang kỹ thuật canh tác."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--outline" onClick={loadSample} disabled={busy || view !== 'ready'}>
              Nạp dữ liệu mẫu
            </button>
            <button type="button" className="btn btn--primary btn-shine" onClick={() => openForm(null, null)} disabled={view !== 'ready'}>
              <Icon name="plus" className="icon--sm" />
              Thêm danh mục mới
            </button>
          </div>
        }
      />

      <div className="tmdt-toolbar">
        <div className="tmdt-tabs" style={{ margin: 0 }}>
          <button type="button" className={`btn btn--sm ${tab === 'product' ? 'btn--primary' : 'btn--outline'}`} onClick={() => setTab('product')}>
            Danh mục nông sản ({counts.product})
          </button>
          <button type="button" className={`btn btn--sm ${tab === 'article' ? 'btn--primary' : 'btn--outline'}`} onClick={() => setTab('article')}>
            Danh mục cẩm nang & kỹ thuật ({counts.article})
          </button>
        </div>
        <div className="search-field">
          <Icon name="search" className="search-field__icon" />
          <input className="input" type="search" placeholder="Lọc danh mục..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
      </div>

      {view === 'loading' && <EmptyBlock icon="layers" title="Đang tải danh mục..." desc="Vui lòng chờ trong giây lát." />}
      {view === 'error' && (
        <EmptyBlock icon="layers" title="Không tải được danh mục" desc={loadError}>
          <button type="button" className="btn btn--primary" onClick={load}>Thử lại</button>
        </EmptyBlock>
      )}
      {view === 'ready' &&
        (visibleRoots.length === 0 ? (
          <EmptyBlock icon="layers" title="Chưa có danh mục" desc="Thêm danh mục mới hoặc nạp dữ liệu mẫu để xem thử cây danh mục." />
        ) : (
          <div className="tmdt-tree">
            {visibleRoots.map((root) => (
              <div className="tmdt-tree__node" key={root.id}>
                <Row c={root} />
                {childrenOf(root.id).map((child) => (
                  <Row c={child} child key={child.id} />
                ))}
              </div>
            ))}
          </div>
        ))}

      <dialog className="modal" ref={modal.ref} aria-labelledby="category-modal-title">
        <form className="modal__form" onSubmit={handleSubmit} noValidate>
          <div className="modal__header">
            <Icon name="layers" />
            <h2 className="modal__title" id="category-modal-title">
              {editing ? 'Sửa danh mục' : form.parentId ? 'Thêm danh mục con' : 'Thêm danh mục mới'}
            </h2>
            <span className="badge badge--success">{tab === 'product' ? 'Nông sản' : 'Cẩm nang'}</span>
            <button type="button" className="modal__close" aria-label="Đóng" onClick={modal.close}>&times;</button>
          </div>
          <div className="modal__body">
            <section className="form-section">
              <div className="form-grid">
                <div className="field form-grid__full">
                  <label className="label" htmlFor="cat-name">Tên danh mục <span className="tmdt-req">*</span></label>
                  <input className="input" id="cat-name" placeholder="VD: Rau Củ Quả Hữu Cơ" value={form.name} aria-invalid={errors.name ? 'true' : undefined} onChange={(e) => changeName(e.target.value)} />
                  {errors.name && <p className="field__error">{errors.name}</p>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="cat-code">Mã phân loại</label>
                  <input
                    className="input" id="cat-code" placeholder="VD: RAU_CU_HUU_CO" value={form.code} aria-invalid={errors.code ? 'true' : undefined}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  />
                  {errors.code ? <p className="field__error">{errors.code}</p> : <p className="field__hint">Bỏ trống để hệ thống tự sinh từ tên.</p>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="cat-slug">Đường dẫn (slug)</label>
                  <div className="tmdt-slug">
                    <span className="tmdt-slug__prefix">/</span>
                    <input
                      className="input tmdt-slug__input" id="cat-slug" placeholder="rau-cu-qua-huu-co" value={form.slug} aria-invalid={errors.slug ? 'true' : undefined}
                      onChange={(e) => setForm({ ...form, slug: e.target.value, slugEdited: true })}
                    />
                  </div>
                  {errors.slug ? <p className="field__error">{errors.slug}</p> : <p className="field__hint">Tự điền theo tên, vẫn sửa tay được.</p>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="cat-parent">Danh mục cấp cha</label>
                  <select
                    className="select" id="cat-parent" value={form.parentId} disabled={hasChildren}
                    onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  >
                    <option value="">— Là danh mục gốc (cấp 1) —</option>
                    {parentOptions.map((r) => (
                      <option key={r.id} value={r.id}>{r.icon ? `${r.icon} ` : ''}{r.name}</option>
                    ))}
                  </select>
                  {errors.parentId ? (
                    <p className="field__error">{errors.parentId}</p>
                  ) : (
                    <p className="field__hint">
                      {hasChildren ? 'Danh mục đang có danh mục con nên không thể chuyển thành danh mục con.' : 'Để trống nếu là danh mục cấp 1.'}
                    </p>
                  )}
                </div>
                <div className="field">
                  <label className="label" htmlFor="cat-badge">Nhãn nhỏ trên thẻ</label>
                  <input
                    className="input" id="cat-badge" maxLength={40} placeholder="VD: Nhà màng CNC, OCOP" value={form.badge}
                    aria-invalid={errors.badge ? 'true' : undefined} onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  />
                  {errors.badge && <p className="field__error">{errors.badge}</p>}
                </div>
                <div className="field form-grid__full tmdt-image-field">
                  <span className="label">Ảnh đại diện (hiện trên thẻ danh mục ở trang sàn)</span>
                  <div className="tmdt-image-field__preview" aria-hidden={form.image ? undefined : 'true'}>
                    {form.image ? <img src={form.image} alt="" /> : <span>Chưa có ảnh — sàn dùng nền màu + biểu tượng</span>}
                  </div>
                  <div className="tmdt-image-field__row">
                    <label className="btn btn--outline btn--sm tmdt-image-field__pick">
                      Chọn tệp
                      <input type="file" accept="image/*" hidden onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                    <input
                      className="input" aria-label="URL ảnh danh mục" placeholder="Hoặc dán URL ảnh (https://...)"
                      value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}
                    />
                    {form.image && <button type="button" className="btn btn--sm btn--outline" onClick={() => setForm({ ...form, image: '' })}>Xoá</button>}
                  </div>
                  {errors.image && <p className="field__error">{errors.image}</p>}
                </div>
                <div className="field form-grid__full">
                  <label className="label" htmlFor="cat-icon">Biểu tượng (emoji)</label>
                  <div className="tmdt-icon-picker">
                    <span className="tmdt-icon-picker__preview" aria-hidden="true">{form.icon || '🗂️'}</span>
                    <input
                      className="input tmdt-icon-picker__input" id="cat-icon" maxLength={8} placeholder="Chọn bên dưới hoặc dán emoji"
                      value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    />
                    {form.icon && (
                      <button type="button" className="btn btn--sm btn--outline" onClick={() => setForm({ ...form, icon: '' })}>Xoá</button>
                    )}
                  </div>
                  <div className="tmdt-icon-picker__grid" role="group" aria-label="Gợi ý biểu tượng">
                    {ICON_SUGGESTIONS.map((emoji) => (
                      <button
                        type="button" key={emoji} aria-pressed={form.icon === emoji}
                        className={`tmdt-icon-picker__chip${form.icon === emoji ? ' is-active' : ''}`}
                        onClick={() => setForm({ ...form, icon: emoji })}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="label" htmlFor="cat-order">Thứ tự hiển thị</label>
                  <input className="input" id="cat-order" type="number" min="0" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
                </div>
                <div className="field form-grid__full">
                  <label className="label" htmlFor="cat-desc">Mô tả danh mục</label>
                  <textarea className="textarea" id="cat-desc" placeholder="Tiêu chuẩn chất lượng, nguồn gốc và xuất xứ nông sản thuộc danh mục này..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <label className="tmdt-switch">
                  <input type="checkbox" role="switch" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                  <span className="tmdt-switch__track" aria-hidden="true" />
                  <span className="tmdt-switch__text"><strong>Nổi bật</strong><small>Hiện ở khối nổi bật trang chủ sàn</small></span>
                </label>
                <label className="tmdt-switch">
                  <input type="checkbox" role="switch" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                  <span className="tmdt-switch__track" aria-hidden="true" />
                  <span className="tmdt-switch__text"><strong>Đang hoạt động</strong><small>Tắt để ẩn khỏi sàn</small></span>
                </label>
              </div>
            </section>
          </div>
          <div className="modal__footer">
            <button type="button" className="btn btn--secondary" onClick={modal.close}>Hủy</button>
            <button type="submit" className="btn btn--primary" disabled={busy}>{editing ? 'Lưu thay đổi' : 'Lưu danh mục'}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

// Chỉ gắn nội dung (và các lời gọi API trong đó) SAU khi đã qua cổng platform_admin — tài khoản khác không
// gửi request nào tới /system/* (vốn chỉ trả 403).
export function DanhMucPage() {
  return (
    <PlatformAdminOnly>
      <DanhMucPageContent />
    </PlatformAdminOnly>
  );
}
