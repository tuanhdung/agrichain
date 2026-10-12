// "Quản lý sản phẩm & định giá kép" — giá bán lẻ (B2C) và giá bán sỉ (B2B/MOQ), thêm/sửa/xoá sản phẩm.
// Dữ liệu THẬT qua API (`/system/products` + `/system/categories`, backend agrichain-api) — trang bán hàng
// đọc cùng nguồn này qua `GET /products`, nên thêm/sửa ở đây là thấy ngay ở sàn.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Icon } from '../../icons';
import { useDialog } from '../../hooks/useDialog';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { api, ApiError, type Category, type ProductListItem, type ProductPayload, type ProductStatus } from '../../api';
import { sampleProducts, slugify } from './store';
import { uploadImage } from './imageUtil';
import { EmptyBlock, money, PlatformAdminOnly, TmdtHeader } from './shared';

interface FormValues {
  name: string;
  slug: string;
  /** true khi người dùng đã tự sửa slug — ngừng tự điền theo tên. */
  slugEdited: boolean;
  sku: string;
  barcode: string;
  categoryId: string;
  origin: string;
  stock: string;
  unit: string;
  retailPrice: string;
  wholesalePrice: string;
  moq: string;
  standards: string;
  summary: string;
  description: string;
  thumbnail: string;
  banner: string;
  featured: boolean;
  status: ProductStatus;
}

const EMPTY: FormValues = {
  name: '', slug: '', slugEdited: false, sku: '', barcode: '', categoryId: '', origin: 'Việt Nam', stock: '0', unit: 'Gói',
  retailPrice: '', wholesalePrice: '', moq: '10', standards: '', summary: '', description: '', thumbnail: '', banner: '',
  featured: false, status: 'selling'
};

const TABS = ['Thông tin cơ bản', 'Định giá kép & tồn kho', 'Mô tả & hình ảnh'] as const;
const UNITS = ['kg', 'g', 'Gói', 'Hộp', 'Chai', 'Túi', 'Bó', 'Trái', 'Quả', 'Bao', 'Thùng'];
const STANDARDS = ['VietGAP', 'GlobalGAP', 'OCOP', 'Hữu cơ (Organic)', 'USDA Organic', 'HACCP'];
const SUMMARY_MAX = 100;
// localStorage chỉ ~5MB cho cả trình duyệt nên ảnh chọn từ máy được thu nhỏ + nén JPEG trước khi lưu:
// tệp gốc tới 10MB đều nhận được, kết quả lưu chỉ còn ≲ 400KB. Muốn giữ nguyên ảnh gốc thì dán URL.
const IMAGE_MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const IMAGE_MAX_DIMENSION = { thumbnail: 1000, banner: 1920 } as const;

/** Tab chứa từng trường có thể báo lỗi — để nhảy tới tab đầu tiên có lỗi khi lưu. */
const FIELD_TAB: Partial<Record<keyof FormValues, number>> = {
  name: 0, slug: 0, sku: 0, categoryId: 0, retailPrice: 1, wholesalePrice: 1, moq: 1, thumbnail: 2, banner: 2
};

// Trường lỗi backend (details.field) → ô trong form.
const FIELD_MAP: Record<string, keyof FormValues> = {
  name: 'name', slug: 'slug', sku: 'sku', category_id: 'categoryId', retail_price: 'retailPrice',
  wholesale_price: 'wholesalePrice', moq: 'moq', thumbnail_url: 'thumbnail', banner_url: 'banner'
};

// Danh sách lấy 1 trang tối đa 100 sản phẩm rồi lọc ở client (như trước khi nối API).
const LIST_PAGE_SIZE = 100;

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.';
}

function SanPhamPageContent() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const modal = useDialog();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [view, setView] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [editing, setEditing] = useState<ProductListItem | null>(null);
  const [editingBanner, setEditingBanner] = useState('');
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [tab, setTab] = useState(0);

  const load = useCallback(() => {
    setView('loading');
    Promise.all([
      api.system.products.list({ page_size: LIST_PAGE_SIZE }),
      api.system.categories.list({ type: 'product', page_size: 500 })
    ])
      .then(([productPage, categoryPage]) => {
        setProducts(productPage.items);
        setTotal(productPage.total);
        setCategories(categoryPage.items);
        setView('ready');
      })
      .catch((err: unknown) => {
        setLoadError(errorMessage(err));
        setView('error');
      });
  }, []);

  useEffect(load, [load]);

  // Danh mục xếp theo cây: cha trước, con thụt vào ngay dưới.
  const categoryOptions = useMemo(() => {
    const byOrder = (a: Category, b: Category) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'vi');
    const roots = categories.filter((c) => !c.parent_id).sort(byOrder);
    return roots.flatMap((root) => [
      { id: root.id, label: `${root.icon ? root.icon + ' ' : ''}${root.name}` },
      ...categories.filter((c) => c.parent_id === root.id).sort(byOrder).map((c) => ({ id: c.id, label: `\u00a0\u00a0\u00a0↳ ${c.name}` }))
    ]);
  }, [categories]);

  useEffect(() => {
    setErrors({});
    setTab(0);
    setValues(
      editing
        ? {
            name: editing.name, slug: editing.slug, slugEdited: true, sku: editing.sku, barcode: editing.barcode ?? '',
            categoryId: editing.category_id ?? '', origin: editing.origin ?? '', stock: String(editing.stock), unit: editing.unit,
            retailPrice: String(editing.retail_price), wholesalePrice: editing.wholesale_price ? String(editing.wholesale_price) : '',
            moq: String(editing.moq), standards: editing.standards ?? '', summary: editing.summary ?? '',
            description: editing.description ?? '', thumbnail: editing.thumbnail_url ?? '', banner: editingBanner,
            featured: editing.is_featured, status: editing.status
          }
        : { ...EMPTY, sku: 'SP-' + String(total + 1).padStart(3, '0') }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, modal.openCount]);

  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    return (
      (!q || (p.name + p.sku + (p.origin ?? '')).toLowerCase().includes(q)) &&
      (!categoryFilter || p.category_id === categoryFilter) &&
      (!statusFilter || p.status === statusFilter) &&
      (!featuredOnly || p.is_featured)
    );
  });

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function changeName(name: string) {
    setValues((prev) => ({ ...prev, name, slug: prev.slugEdited ? prev.slug : slugify(name) }));
  }

  function pickImage(key: 'thumbnail' | 'banner', file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, [key]: 'Chỉ chấp nhận tệp ảnh.' }));
      return;
    }
    if (file.size > IMAGE_MAX_SOURCE_BYTES) {
      setErrors((prev) => ({ ...prev, [key]: `Ảnh quá lớn (tối đa ${IMAGE_MAX_SOURCE_BYTES / 1024 / 1024}MB). Hãy dán URL ảnh thay vì chọn tệp.` }));
      return;
    }
    uploadImage(file, IMAGE_MAX_DIMENSION[key]).then(
      (url) => {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
        setField(key, url);
      },
      (err: unknown) => setErrors((prev) => ({ ...prev, [key]: err instanceof ApiError ? err.message : 'Không tải được ảnh này, hãy thử tệp khác.' }))
    );
  }

  async function openForm(product: ProductListItem | null) {
    // Danh sách không kèm ảnh banner → sửa thì lấy chi tiết trước để không làm mất banner khi lưu.
    setEditingBanner('');
    if (product) {
      try {
        const detail = await api.system.products.get(product.id);
        setEditingBanner(detail.banner_url ?? '');
      } catch (err) {
        showToast(errorMessage(err));
        return;
      }
    }
    setEditing(product);
    modal.open();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Partial<Record<keyof FormValues, string>> = {};
    if (!values.name.trim()) next.name = 'Nhập tên sản phẩm.';
    if (!values.sku.trim()) next.sku = 'Nhập mã SKU.';
    const retail = Number(values.retailPrice);
    const wholesale = Number(values.wholesalePrice || 0);
    if (!(retail > 0)) next.retailPrice = 'Giá bán lẻ phải lớn hơn 0.';
    if (wholesale < 0 || (wholesale > 0 && wholesale >= retail)) next.wholesalePrice = 'Giá sỉ phải nhỏ hơn giá bán lẻ.';
    if (wholesale > 0 && Number(values.moq) < 2) next.moq = 'MOQ phải từ 2 trở lên khi có giá sỉ.';
    const slug = values.slug.trim() || slugify(values.name);
    if (values.name.trim() && !slug) next.slug = 'Nhập đường dẫn (tên không có chữ hoặc số để tự tạo).';
    setErrors(next);
    const badTabs = (Object.keys(next) as (keyof FormValues)[]).map((k) => FIELD_TAB[k] ?? 0);
    if (badTabs.length) {
      setTab(Math.min(...badTabs));
      return;
    }

    const payload: ProductPayload = {
      name: values.name.trim(), slug, sku: values.sku.trim(), barcode: values.barcode.trim() || null,
      category_id: values.categoryId || null, unit: values.unit.trim() || 'Gói', origin: values.origin.trim() || null,
      standards: values.standards.trim() || null, status: values.status, is_featured: values.featured,
      stock: Math.max(0, Math.floor(Number(values.stock) || 0)), retail_price: Math.round(retail),
      wholesale_price: wholesale > 0 ? Math.round(wholesale) : null, moq: Math.max(1, Math.floor(Number(values.moq) || 1)),
      summary: values.summary.trim() || null, description: values.description.trim() || null,
      thumbnail_url: values.thumbnail.trim() || null, banner_url: values.banner.trim() || null
    };

    setBusy(true);
    try {
      if (editing) await api.system.products.update(editing.id, payload);
      else await api.system.products.create(payload);
      modal.close();
      showToast(editing ? 'Đã lưu thay đổi.' : 'Đã thêm sản phẩm.');
      load();
    } catch (err) {
      const field = err instanceof ApiError ? (err.details?.field as string | undefined) : undefined;
      const target = field ? FIELD_MAP[field] : undefined;
      if (target) {
        setErrors({ [target]: errorMessage(err) });
        setTab(FIELD_TAB[target] ?? 0);
      } else {
        showToast(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(product: ProductListItem) {
    if (!(await confirm(`Xoá sản phẩm “${product.name}”?`))) return;
    try {
      await api.system.products.remove(product.id);
      showToast('Đã xoá sản phẩm.');
      load();
    } catch (err) {
      showToast(errorMessage(err));
    }
  }

  async function loadSample() {
    setBusy(true);
    let created = 0;
    try {
      const rootByName = new Map(categories.filter((c) => !c.parent_id).map((c) => [c.name, c.id]));
      const existingSlugs = new Set(products.map((p) => p.slug));
      const existingSkus = new Set(products.map((p) => p.sku.toLowerCase()));
      for (const sample of sampleProducts()) {
        const slug = slugify(sample.name);
        if (existingSlugs.has(slug) || existingSkus.has(sample.sku.toLowerCase())) continue;
        let categoryId = rootByName.get(sample.category);
        if (!categoryId && sample.category) {
          const made = await api.system.categories.create({ type: 'product', name: sample.category, slug: slugify(sample.category) });
          categoryId = made.id;
          rootByName.set(sample.category, categoryId);
        }
        await api.system.products.create({
          name: sample.name, slug, sku: sample.sku, category_id: categoryId ?? null, unit: sample.unit, origin: sample.origin,
          standards: sample.standards || null, status: 'selling', is_featured: sample.featured, stock: sample.stock,
          retail_price: sample.retailPrice, wholesale_price: sample.wholesalePrice || null, moq: sample.moq
        });
        created += 1;
      }
      showToast(created ? `Đã nạp ${created} nông sản mẫu.` : 'Nông sản mẫu đã có đủ.');
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setBusy(false);
      load();
    }
  }

  return (
    <>
      <TmdtHeader
        icon="box"
        title="Quản trị kho nông sản & định giá kép"
        count={`${total} sản phẩm`}
        meta="Quản lý kho hàng, tiêu chuẩn chứng nhận VietGAP/GlobalGAP và cấu hình giá bán lẻ so với giá bán buôn (MOQ)."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {view === 'ready' && total === 0 && (
              <button type="button" className="btn btn--outline" onClick={loadSample} disabled={busy}>
                Nạp nông sản mẫu
              </button>
            )}
            <button type="button" className="btn btn--primary btn-shine" onClick={() => openForm(null)} disabled={view !== 'ready'}>
              <Icon name="plus" className="icon--sm" />
              Thêm nông sản mới
            </button>
          </div>
        }
      />

      <div className="tmdt-toolbar">
        <div className="search-field">
          <Icon name="search" className="search-field__icon" />
          <input className="input" type="search" placeholder="Tìm theo tên sản phẩm, mã SKU, xuất xứ..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Lọc danh mục">
          <option value="">Tất cả danh mục</option>
          {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Lọc trạng thái">
          <option value="">Tất cả trạng thái</option>
          <option value="selling">Đang mở bán</option>
          <option value="hidden">Đang ẩn</option>
        </select>
        <label className="tmdt-checkline">
          <input type="checkbox" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} /> Sản phẩm nổi bật
        </label>
      </div>

      {view === 'loading' && <EmptyBlock icon="box" title="Đang tải sản phẩm..." desc="Vui lòng chờ trong giây lát." />}
      {view === 'error' && (
        <EmptyBlock icon="box" title="Không tải được sản phẩm" desc={loadError}>
          <button type="button" className="btn btn--primary" onClick={load}>Thử lại</button>
        </EmptyBlock>
      )}
      {view === 'ready' && filtered.length === 0 && (
        <EmptyBlock icon="box" title="Không có sản phẩm" desc={products.length ? 'Thử đổi bộ lọc.' : 'Chưa có sản phẩm — thêm mới hoặc nạp nông sản mẫu.'} />
      )}
      {view === 'ready' && total > LIST_PAGE_SIZE && (
        <p className="field__hint">Đang hiển thị {LIST_PAGE_SIZE} sản phẩm mới nhất trong tổng {total}.</p>
      )}
      {view === 'ready' && filtered.length > 0 && (
        <div className="table-panel">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sản phẩm & nguồn gốc</th>
                  <th>Danh mục</th>
                  <th>Tồn kho</th>
                  <th>Tiêu chuẩn</th>
                  <th>Giá bán lẻ (B2C)</th>
                  <th>Giá bán sỉ (B2B / MOQ)</th>
                  <th>Nổi bật</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="tmdt-prod-cell">
                        {p.thumbnail_url ? (
                          <img className="tmdt-prod-thumb" src={p.thumbnail_url} alt="" loading="lazy" />
                        ) : (
                          <span className="tmdt-prod-thumb tmdt-prod-thumb--empty" aria-hidden="true">🌱</span>
                        )}
                        <div>
                          <div className="table__name">{p.name}</div>
                          <div className="table__muted">SKU: {p.sku} • {p.origin || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.category_name ? <span className="badge badge--success">{p.category_name}</span> : '—'}</td>
                    <td className="table__nowrap">{p.stock.toLocaleString('vi-VN')} <span className="table__muted">{p.unit}</span></td>
                    <td>{p.standards || '—'}</td>
                    <td className="table__nowrap">{money(p.retail_price)}<div className="table__muted">/ {p.unit}</div></td>
                    <td className="table__nowrap">
                      {p.wholesale_price ? <>{money(p.wholesale_price)}<div className="table__muted">Từ {p.moq} {p.unit}</div></> : '—'}
                    </td>
                    <td>{p.is_featured ? <Icon name="star" className="icon--sm" /> : '—'}</td>
                    <td>
                      <span className={`badge ${p.status === 'selling' ? 'badge--success' : 'badge--neutral'}`}>
                        {p.status === 'selling' ? 'Đang mở bán' : 'Đang ẩn'}
                      </span>
                    </td>
                    <td>
                      <div className="table__actions">
                        <button type="button" className="icon-btn" aria-label={`Sửa ${p.name}`} data-tooltip="Chỉnh sửa" onClick={() => openForm(p)}>
                          <Icon name="pencil" />
                        </button>
                        <button type="button" className="icon-btn icon-btn--danger" aria-label={`Xoá ${p.name}`} data-tooltip="Xoá" onClick={() => handleDelete(p)}>
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
      )}

      <dialog className="modal modal--wide" ref={modal.ref} aria-labelledby="product-modal-title">
        <form className="modal__form" onSubmit={handleSubmit} noValidate>
          <div className="modal__header">
            <Icon name="box" />
            <div>
              <h2 className="modal__title" id="product-modal-title">{editing ? 'Sửa nông sản' : 'Thêm nông sản mới vào kho'}</h2>
              <p className="tmdt-modal-sub">Khai báo thông số kỹ thuật, xuất xứ và cơ chế giá bán sỉ/lẻ.</p>
            </div>
            <button type="button" className="modal__close" aria-label="Đóng" onClick={modal.close}>&times;</button>
          </div>

          <div className="tmdt-steps" role="tablist" aria-label="Các bước khai báo sản phẩm">
            {TABS.map((label, index) => {
              const hasError = (Object.keys(errors) as (keyof FormValues)[]).some((k) => errors[k] && (FIELD_TAB[k] ?? 0) === index);
              return (
                <button
                  type="button" role="tab" key={label} id={`prod-tab-${index}`} aria-selected={tab === index} aria-controls={`prod-panel-${index}`}
                  className={`tmdt-steps__tab${tab === index ? ' is-active' : ''}${hasError ? ' has-error' : ''}`}
                  onClick={() => setTab(index)}
                >
                  <span className="tmdt-steps__num">{index + 1}</span>
                  {label}
                </button>
              );
            })}
          </div>

          <div className="modal__body">
            {/* Tab 1 — Thông tin cơ bản */}
            <section className="form-section" role="tabpanel" id="prod-panel-0" aria-labelledby="prod-tab-0" hidden={tab !== 0}>
              <div className="form-grid">
                <div className="field form-grid__full">
                  <label className="label" htmlFor="prod-name">Tên nông sản <span className="tmdt-req">*</span></label>
                  <input className="input" id="prod-name" placeholder="VD: Dâu Tây Hữu Cơ VietGAP Đà Lạt" value={values.name} aria-invalid={errors.name ? 'true' : undefined} onChange={(e) => changeName(e.target.value)} />
                  {errors.name && <p className="field__error">{errors.name}</p>}
                </div>
                <div className="field form-grid__full">
                  <label className="label" htmlFor="prod-slug">Đường dẫn tĩnh (slug)</label>
                  <div className="tmdt-slug">
                    <span className="tmdt-slug__prefix">/products/</span>
                    <input
                      className="input tmdt-slug__input" id="prod-slug" placeholder="tu-dong-sinh-theo-ten" value={values.slug} aria-invalid={errors.slug ? 'true' : undefined}
                      onChange={(e) => setValues({ ...values, slug: e.target.value, slugEdited: true })}
                    />
                    <button type="button" className="btn btn--outline tmdt-slug__btn" onClick={() => setValues({ ...values, slug: slugify(values.name), slugEdited: false })}>Tự tạo</button>
                  </div>
                  {errors.slug ? <p className="field__error">{errors.slug}</p> : <p className="field__hint">Tự điền theo tên, vẫn sửa tay được.</p>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="prod-sku">Mã SKU <span className="tmdt-req">*</span></label>
                  <input className="input" id="prod-sku" placeholder="VD: AGRI-STRAW-001" value={values.sku} aria-invalid={errors.sku ? 'true' : undefined} onChange={(e) => setField('sku', e.target.value)} />
                  {errors.sku && <p className="field__error">{errors.sku}</p>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="prod-barcode">Mã vạch (EAN)</label>
                  <input className="input" id="prod-barcode" inputMode="numeric" placeholder="VD: 8938501234561" value={values.barcode} onChange={(e) => setField('barcode', e.target.value)} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="prod-category">Thuộc danh mục</label>
                  <select className="select" id="prod-category" value={values.categoryId} aria-invalid={errors.categoryId ? 'true' : undefined} onChange={(e) => setField('categoryId', e.target.value)}>
                    <option value="">— Chưa phân loại —</option>
                    {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  {errors.categoryId && <p className="field__error">{errors.categoryId}</p>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="prod-unit">Đơn vị tính</label>
                  <select className="select" id="prod-unit" value={values.unit} onChange={(e) => setField('unit', e.target.value)}>
                    {(UNITS.includes(values.unit) ? UNITS : [...UNITS, values.unit]).map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="prod-origin">Xuất xứ / vùng trồng</label>
                  <input className="input" id="prod-origin" placeholder="VD: Đà Lạt, Lâm Đồng" value={values.origin} onChange={(e) => setField('origin', e.target.value)} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="prod-standards">Chứng nhận chất lượng</label>
                  <select className="select" id="prod-standards" value={values.standards} onChange={(e) => setField('standards', e.target.value)}>
                    <option value="">— Không có —</option>
                    {(values.standards && !STANDARDS.includes(values.standards) ? [...STANDARDS, values.standards] : STANDARDS).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="prod-status">Trạng thái vận hành</label>
                  <select className="select" id="prod-status" value={values.status} onChange={(e) => setField('status', e.target.value as ProductStatus)}>
                    <option value="selling">Mở bán</option>
                    <option value="hidden">Đang ẩn</option>
                  </select>
                </div>
                <label className="tmdt-switch">
                  <input type="checkbox" role="switch" checked={values.featured} onChange={(e) => setField('featured', e.target.checked)} />
                  <span className="tmdt-switch__track" aria-hidden="true" />
                  <span className="tmdt-switch__text"><strong>Nổi bật trên trang chủ</strong><small>Hiện ở khối sản phẩm nổi bật</small></span>
                </label>
              </div>
            </section>

            {/* Tab 2 — Định giá kép & tồn kho */}
            <section className="form-section" role="tabpanel" id="prod-panel-1" aria-labelledby="prod-tab-1" hidden={tab !== 1}>
              <div className="tmdt-callout">
                <span className="tmdt-callout__icon" aria-hidden="true">💡</span>
                <div>
                  <strong>Động cơ định giá kép B2C &amp; B2B tự động</strong>
                  <p>
                    Giá bán sỉ (B2B) tự kích hoạt khi số lượng đơn hàng đạt hoặc vượt ngưỡng <b>MOQ</b> (số lượng sỉ tối thiểu).
                    Ràng buộc: <em>giá bán sỉ phải nhỏ hơn giá bán lẻ</em> và <em>MOQ từ 2 trở lên</em>.
                  </p>
                </div>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label className="label" htmlFor="prod-retail">Giá bán lẻ (B2C) — VNĐ <span className="tmdt-req">*</span></label>
                  <input className="input" id="prod-retail" type="number" min="0" placeholder="VD: 120000" value={values.retailPrice} aria-invalid={errors.retailPrice ? 'true' : undefined} onChange={(e) => setField('retailPrice', e.target.value)} />
                  {errors.retailPrice && <p className="field__error">{errors.retailPrice}</p>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="prod-wholesale">Giá bán sỉ (B2B) — VNĐ <span className="tmdt-opt">(tuỳ chọn)</span></label>
                  <input className="input" id="prod-wholesale" type="number" min="0" placeholder="VD: 95000" value={values.wholesalePrice} aria-invalid={errors.wholesalePrice ? 'true' : undefined} onChange={(e) => setField('wholesalePrice', e.target.value)} />
                  {errors.wholesalePrice && <p className="field__error">{errors.wholesalePrice}</p>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="prod-moq">Số lượng sỉ tối thiểu (MOQ)</label>
                  <div className="tmdt-suffix">
                    <input className="input" id="prod-moq" type="number" min="1" placeholder="VD: 10" value={values.moq} aria-invalid={errors.moq ? 'true' : undefined} onChange={(e) => setField('moq', e.target.value)} />
                    <span>{values.unit}</span>
                  </div>
                  {errors.moq && <p className="field__error">{errors.moq}</p>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="prod-stock">Số lượng tồn kho <span className="tmdt-req">*</span></label>
                  <div className="tmdt-suffix">
                    <input className="input" id="prod-stock" type="number" min="0" value={values.stock} onChange={(e) => setField('stock', e.target.value)} />
                    <span>{values.unit}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Tab 3 — Mô tả & hình ảnh */}
            <section className="form-section" role="tabpanel" id="prod-panel-2" aria-labelledby="prod-tab-2" hidden={tab !== 2}>
              <div className="form-grid">
                <div className="field form-grid__full">
                  <label className="label" htmlFor="prod-summary">Tóm tắt ngắn (hiển thị trên thẻ sản phẩm)</label>
                  <input
                    className="input" id="prod-summary" maxLength={SUMMARY_MAX} placeholder="VD: Dâu tây giống New Zealand tươi ngon, hái sáng sớm tại Đà Lạt."
                    value={values.summary} onChange={(e) => setField('summary', e.target.value)}
                  />
                  <p className="field__hint">{values.summary.length}/{SUMMARY_MAX} ký tự</p>
                </div>
                <div className="field form-grid__full">
                  <label className="label" htmlFor="prod-description">Mô tả chi tiết</label>
                  <textarea
                    className="textarea" id="prod-description" rows={6} placeholder="Quy trình canh tác, tiêu chuẩn an toàn, hướng dẫn bảo quản..."
                    value={values.description} onChange={(e) => setField('description', e.target.value)}
                  />
                </div>
                {(['thumbnail', 'banner'] as const).map((key) => (
                  <div className="field tmdt-image-field" key={key}>
                    <span className="label">{key === 'thumbnail' ? 'Ảnh đại diện (thumbnail)' : 'Ảnh banner nổi bật'}</span>
                    <div className="tmdt-image-field__preview" aria-hidden={values[key] ? undefined : 'true'}>
                      {values[key] ? <img src={values[key]} alt="" /> : <span>Chưa có ảnh</span>}
                    </div>
                    <div className="tmdt-image-field__row">
                      <label className="btn btn--outline btn--sm tmdt-image-field__pick">
                        Chọn tệp
                        <input type="file" accept="image/*" hidden onChange={(e) => { pickImage(key, e.target.files?.[0]); e.target.value = ''; }} />
                      </label>
                      <input
                        className="input" aria-label={`URL ${key === 'thumbnail' ? 'ảnh đại diện' : 'ảnh banner'}`} placeholder="Hoặc dán URL ảnh (https://...)"
                        value={values[key]} onChange={(e) => setField(key, e.target.value)}
                      />
                      {values[key] && <button type="button" className="btn btn--sm btn--outline" onClick={() => setField(key, '')}>Xoá</button>}
                    </div>
                    {errors[key] && <p className="field__error">{errors[key]}</p>}
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className="modal__footer">
            <button type="button" className="btn btn--secondary" onClick={modal.close}>Hủy</button>
            {tab < TABS.length - 1 && (
              <button type="button" className="btn btn--outline" onClick={() => setTab(tab + 1)}>Tiếp theo</button>
            )}
            <button type="submit" className="btn btn--primary" disabled={busy}>{editing ? 'Lưu thay đổi' : 'Tạo nông sản mới'}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

// Chỉ gắn nội dung (và các lời gọi API trong đó) SAU khi đã qua cổng platform_admin — tài khoản khác không
// gửi request nào tới /system/* (vốn chỉ trả 403).
export function SanPhamPage() {
  return (
    <PlatformAdminOnly>
      <SanPhamPageContent />
    </PlatformAdminOnly>
  );
}
