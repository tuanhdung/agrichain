// "Đề nghị bán hàng" — dành cho tài khoản business của Đơn vị sở hữu lô hàng. Quản trị hệ thống chọn lô của Đơn vị
// mình để bán trên sàn (sản phẩm "truy xuất"); lô CHỈ lên sàn khi Đơn vị ở đây bấm đồng ý. Được giảm số lượng khi
// đồng ý (không được tăng quá số đề nghị), hoặc từ chối; đổi ý sau đó được. Quyền: listings.view (xem) /
// listings.edit (phản hồi) — API lọc cứng theo Đơn vị của người gọi nên không thấy đề nghị của Đơn vị khác.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../icons';
import { api, ApiError, type Listing, type ListingStatus } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';
import { useToast } from '../../components/ToastProvider';
import { formatDate } from '../lo-hang/format';
import { GrowRequestsSection } from './GrowRequestsSection';
import { LISTING_STATUS } from '../tmdt/ProductBatchesPanel';
import { money } from '../tmdt/shared';
import '../tmdt/tmdt.css';

const PAGE_SIZE = 20;

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.';
}

function NoAccess({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="empty-state">
      <Icon name="shield-check" className="icon--lg" />
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__desc">{desc}</p>
      <Link className="btn btn--primary" to="/nong-trai">
        Về khu quản lý
      </Link>
    </div>
  );
}

function DeNghiBanHangContent() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const modal = useDialog();
  const canRespond = hasPermission('listings.edit');

  const [items, setItems] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ListingStatus | ''>('');
  const [pending, setPending] = useState(0);
  const [view, setView] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');

  const [target, setTarget] = useState<Listing | null>(null);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setView('loading');
    Promise.all([
      api.listings.list({ status: status || undefined, page, page_size: PAGE_SIZE }),
      api.listings.pendingCount()
    ])
      .then(([data, count]) => {
        setItems(data.items);
        setTotal(data.total);
        setPending(count.pending);
        setView('ready');
      })
      .catch((err: unknown) => {
        setLoadError(errorMessage(err));
        setView('error');
      });
  }, [status, page]);

  useEffect(load, [load]);

  function openRespond(listing: Listing) {
    setTarget(listing);
    setQuantity(String(listing.quantity_confirmed ?? listing.quantity_proposed));
    setNote(listing.response_note ?? '');
    setFormError('');
    modal.open();
  }

  async function respond(action: 'confirm' | 'reject') {
    if (!target) return;
    let qty: number | undefined;
    if (action === 'confirm') {
      qty = Math.floor(Number(quantity));
      if (!(qty > 0) || qty > target.quantity_proposed) {
        setFormError(`Số lượng phải từ 1 đến ${target.quantity_proposed.toLocaleString('vi-VN')} ${target.product_unit}.`);
        return;
      }
    }
    setBusy(true);
    try {
      await api.listings.respond(target.id, { action, quantity: qty, note: note.trim() || null });
      modal.close();
      showToast(action === 'confirm' ? 'Đã đồng ý bán. Lô sẽ hiện trên sàn là "sắp có hàng".' : 'Đã từ chối đề nghị.');
      load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="page-header">
        <div className="page-header__icon">
          <Icon name="shopping-cart" className="icon--lg" />
        </div>
        <div className="page-header__text">
          <h1 className="page-header__title">
            Đề nghị bán hàng
            {pending > 0 && <span className="badge badge--warning tmdt-count">{pending} đang chờ bạn</span>}
          </h1>
          <p className="page-header__meta">
            Quản trị hệ thống muốn đưa lô hàng của Đơn vị bạn lên sàn. Lô chỉ được bán khi bạn đồng ý — bạn có thể giảm số lượng cho bán.
          </p>
        </div>
      </div>

      <div className="tmdt-toolbar">
        <select
          className="select"
          aria-label="Lọc theo trạng thái"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ListingStatus | '');
            setPage(1);
          }}
        >
          <option value="">Tất cả đề nghị</option>
          <option value="proposed">Chờ tôi xác nhận</option>
          <option value="confirmed">Đã đồng ý</option>
          <option value="rejected">Đã từ chối</option>
        </select>
      </div>

      {view === 'loading' && (
        <div className="async-state">
          <p className="async-state__title">Đang tải đề nghị bán hàng...</p>
        </div>
      )}
      {view === 'error' && (
        <div className="async-state async-state--error">
          <p className="async-state__title">Không tải được đề nghị</p>
          <p>{loadError}</p>
          <button type="button" className="btn btn--primary" onClick={load}>
            Thử lại
          </button>
        </div>
      )}
      {view === 'ready' && items.length === 0 && (
        <div className="empty-state">
          <Icon name="box" className="icon--lg" />
          <p className="empty-state__title">Chưa có đề nghị nào</p>
          <p className="empty-state__desc">Khi Quản trị hệ thống chọn lô hàng của Đơn vị bạn để bán trên sàn, đề nghị sẽ hiện ở đây.</p>
        </div>
      )}

      {view === 'ready' && items.length > 0 && (
        <div className="table-panel">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sản phẩm trên sàn</th>
                  <th>Lô hàng</th>
                  <th>Thu hoạch dự kiến</th>
                  <th>Số lượng</th>
                  <th>Giá thu về</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((l) => {
                  const st = LISTING_STATUS[l.status];
                  return (
                    <tr key={l.id}>
                      <td className="table__name">{l.product_name}</td>
                      <td>
                        <div className="table__name">{l.batch_code}</div>
                        <div className="table__muted">{l.farm_name} • {l.season_name}</div>
                      </td>
                      <td className="table__nowrap">
                        {formatDate(l.harvest_date)}
                        {l.batch_status === 'failed' && <div className="table__muted">Lô đã thất bại</div>}
                      </td>
                      <td className="table__nowrap">
                        {(l.quantity_confirmed ?? l.quantity_proposed).toLocaleString('vi-VN')} {l.product_unit}
                        {l.status === 'confirmed' && l.quantity_confirmed !== l.quantity_proposed && (
                          <div className="table__muted">Đề nghị {l.quantity_proposed.toLocaleString('vi-VN')}</div>
                        )}
                      </td>
                      <td className="table__nowrap">{l.settlement_price ? `${money(l.settlement_price)} / ${l.product_unit}` : 'Chưa thoả thuận'}</td>
                      <td>
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                        {l.response_note && <div className="table__muted">{l.response_note}</div>}
                      </td>
                      <td>
                        {canRespond && l.batch_status !== 'failed' ? (
                          <button type="button" className={`btn btn--sm ${l.status === 'proposed' ? 'btn--primary' : 'btn--outline'}`} onClick={() => openRespond(l)}>
                            {l.status === 'proposed' ? 'Phản hồi' : 'Đổi quyết định'}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'ready' && total > PAGE_SIZE && (
        <div className="tmdt-toolbar" style={{ justifyContent: 'center', marginTop: 'var(--space-4)' }}>
          <button type="button" className="btn btn--outline btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Trang trước
          </button>
          <span className="table__muted">Trang {page}/{pageCount}</span>
          <button type="button" className="btn btn--outline btn--sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
            Trang sau
          </button>
        </div>
      )}

      <dialog className="modal" ref={modal.ref} aria-labelledby="listing-modal-title">
        <div className="modal__form">
          <div className="modal__header">
            <Icon name="shopping-cart" />
            <div>
              <h2 className="modal__title" id="listing-modal-title">Phản hồi đề nghị bán hàng</h2>
              {target && <p className="tmdt-modal-sub">{target.product_name} — lô {target.batch_code}</p>}
            </div>
            <button type="button" className="modal__close" aria-label="Đóng" onClick={modal.close}>&times;</button>
          </div>
          <div className="modal__body">
            {target && (
              <div className="form-grid">
                <p className="field__hint form-grid__full">
                  Thu hoạch dự kiến {formatDate(target.harvest_date)}. Sản lượng dự kiến của lô {target.expected_yield} {target.batch_unit}. Quản trị đề nghị{' '}
                  <b>{target.quantity_proposed.toLocaleString('vi-VN')} {target.product_unit}</b>.
                </p>
                <div className="field">
                  <label className="label" htmlFor="listing-qty">Số lượng đồng ý bán ({target.product_unit})</label>
                  <input className="input" id="listing-qty" type="number" min="1" max={target.quantity_proposed} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  <p className="field__hint">Được giảm, không được vượt số đề nghị.</p>
                </div>
                <div className="field form-grid__full">
                  <label className="label" htmlFor="listing-note">Ghi chú (tuỳ chọn)</label>
                  <textarea className="textarea" id="listing-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                {formError && <p className="field__error form-grid__full">{formError}</p>}
              </div>
            )}
          </div>
          <div className="modal__footer">
            <button type="button" className="btn btn--secondary" onClick={modal.close}>Đóng</button>
            <button type="button" className="btn btn--outline" disabled={busy} onClick={() => respond('reject')}>Từ chối</button>
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => respond('confirm')}>Đồng ý bán</button>
          </div>
        </div>
      </dialog>

      <GrowRequestsSection />
    </>
  );
}

export function DeNghiBanHangPage() {
  const { isPlatformAdmin, hasPermission } = useAuth();
  if (isPlatformAdmin) {
    return <NoAccess title="Không áp dụng cho Quản trị hệ thống" desc="Trang này dành cho Đơn vị sở hữu lô hàng. Gắn lô vào sản phẩm ở Thương mại điện tử › Quản lý sản phẩm." />;
  }
  if (!hasPermission('listings.view')) {
    return <NoAccess title="Bạn chưa có quyền xem đề nghị bán hàng" desc="Hãy nhờ Quản trị Đơn vị cấp quyền “Xem đề nghị bán hàng”." />;
  }
  return <DeNghiBanHangContent />;
}
