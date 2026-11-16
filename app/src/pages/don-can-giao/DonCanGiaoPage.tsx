// "Đơn cần giao" — dành cho tài khoản business của Đơn vị có lô đã đồng ý bán trên sàn. Sàn chỉ là cầu nối:
// khách đặt sản phẩm "truy xuất" thì phần thuộc lô của Đơn vị hiện ở đây, Đơn vị TỰ GIAO cho khách rồi cập nhật
// trạng thái. Đơn vị chỉ thấy giá thoả thuận (backend không trả giá bán lẻ/tổng tiền/phí ship). Quyền: dùng chung
// listings.view (xem) / listings.edit (cập nhật) — API lọc cứng theo Đơn vị nên không thấy đơn của Đơn vị khác.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../icons';
import { api, ApiError, type Fulfillment, type FulfillmentStatus } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ToastProvider';
import { formatDate } from '../lo-hang/format';
import { money } from '../tmdt/shared';
import { FULFILLMENT_STATUS } from './status';
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

function DonCanGiaoContent() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canUpdate = hasPermission('listings.edit');

  const [items, setItems] = useState<Fulfillment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<FulfillmentStatus | ''>('');
  const [open, setOpen] = useState(0);
  const [view, setView] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setView('loading');
    Promise.all([
      api.fulfillments.list({ status: status || undefined, page, page_size: PAGE_SIZE }),
      api.fulfillments.openCount()
    ])
      .then(([data, count]) => {
        setItems(data.items);
        setTotal(data.total);
        setOpen(count.open);
        setView('ready');
      })
      .catch((err: unknown) => {
        setLoadError(errorMessage(err));
        setView('error');
      });
  }, [status, page]);

  useEffect(load, [load]);

  async function advance(item: Fulfillment, next: 'shipping' | 'delivered') {
    setBusyId(item.id);
    try {
      await api.fulfillments.update(item.id, next);
      showToast(next === 'shipping' ? 'Đã chuyển sang "Đang giao".' : 'Đã đánh dấu giao xong.');
      load();
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="page-header">
        <div className="page-header__icon">
          <Icon name="truck" className="icon--lg" />
        </div>
        <div className="page-header__text">
          <h1 className="page-header__title">
            Đơn cần giao
            {open > 0 && <span className="badge badge--warning tmdt-count">{open} chưa giao xong</span>}
          </h1>
          <p className="page-header__meta">
            Khách đặt nông sản từ lô của Đơn vị bạn trên sàn. Bạn tự giao hàng cho khách rồi cập nhật trạng thái — sàn chỉ làm cầu nối.
          </p>
        </div>
      </div>

      <div className="tmdt-toolbar">
        <select
          className="select"
          aria-label="Lọc theo trạng thái giao"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as FulfillmentStatus | '');
            setPage(1);
          }}
        >
          <option value="">Tất cả đơn</option>
          <option value="pending">Chờ giao</option>
          <option value="shipping">Đang giao</option>
          <option value="delivered">Đã giao</option>
          <option value="cancelled">Đã huỷ</option>
        </select>
      </div>

      {view === 'loading' && (
        <div className="async-state">
          <p className="async-state__title">Đang tải đơn cần giao...</p>
        </div>
      )}
      {view === 'error' && (
        <div className="async-state async-state--error">
          <p className="async-state__title">Không tải được đơn cần giao</p>
          <p>{loadError}</p>
          <button type="button" className="btn btn--primary" onClick={load}>
            Thử lại
          </button>
        </div>
      )}
      {view === 'ready' && items.length === 0 && (
        <div className="empty-state">
          <Icon name="box" className="icon--lg" />
          <p className="empty-state__title">Chưa có đơn nào</p>
          <p className="empty-state__desc">Khi khách mua sản phẩm từ lô bạn đã đồng ý bán, đơn sẽ hiện ở đây.</p>
        </div>
      )}

      {view === 'ready' && items.length > 0 && (
        <div className="table-panel">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Đơn</th>
                  <th>Hàng cần giao</th>
                  <th>Người nhận</th>
                  <th>Giá thoả thuận</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((f) => {
                  const st = FULFILLMENT_STATUS[f.fulfillment_status];
                  const finished = f.fulfillment_status === 'delivered' || f.fulfillment_status === 'cancelled';
                  return (
                    <tr key={f.id}>
                      <td className="table__nowrap">
                        <div className="table__name">{f.order_code}</div>
                        <div className="table__muted">{formatDate(f.ordered_at)}</div>
                      </td>
                      <td>
                        <div className="table__name">
                          {f.product_name} × {f.quantity.toLocaleString('vi-VN')} {f.unit}
                        </div>
                        <div className="table__muted">Lô {f.batch_code} • {f.farm_name}</div>
                        {f.is_preorder && (
                          <div>
                            <span className="badge badge--info">Đặt trước</span>
                            {f.harvest_date && !['harvested', 'processed', 'completed'].includes(f.batch_status) && (
                              <span className="table__muted"> Dự kiến thu hoạch {formatDate(f.harvest_date)}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="table__name">{f.receiver_name} • {f.receiver_phone}</div>
                        <div className="table__muted">{[f.detail, f.ward, f.province].filter(Boolean).join(', ')}</div>
                        {f.note && <div className="table__muted">Ghi chú: {f.note}</div>}
                      </td>
                      <td className="table__nowrap">
                        {f.amount !== null && f.settlement_price !== null ? (
                          <>
                            <div className="table__name">{money(f.amount)}</div>
                            <div className="table__muted">{money(f.settlement_price)} / {f.unit}</div>
                          </>
                        ) : (
                          'Chưa thoả thuận'
                        )}
                      </td>
                      <td>
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                        {f.delivered_at && <div className="table__muted">{formatDate(f.delivered_at)}</div>}
                      </td>
                      <td className="table__nowrap">
                        {canUpdate && f.fulfillment_status === 'pending' && (
                          <button type="button" className="btn btn--sm btn--outline" disabled={busyId === f.id} onClick={() => advance(f, 'shipping')}>
                            Bắt đầu giao
                          </button>
                        )}{' '}
                        {canUpdate && !finished && (
                          <button type="button" className="btn btn--sm btn--primary" disabled={busyId === f.id} onClick={() => advance(f, 'delivered')}>
                            Đã giao xong
                          </button>
                        )}
                        {(!canUpdate || finished) && '—'}
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
    </>
  );
}

export function DonCanGiaoPage() {
  const { isPlatformAdmin, hasPermission } = useAuth();
  if (isPlatformAdmin) {
    return <NoAccess title="Không áp dụng cho Quản trị hệ thống" desc="Trang này dành cho Đơn vị sở hữu lô hàng. Xem phần giao của từng đơn ở Thương mại điện tử › Đơn hàng." />;
  }
  if (!hasPermission('listings.view')) {
    return <NoAccess title="Bạn chưa có quyền xem đơn cần giao" desc="Hãy nhờ Quản trị Đơn vị cấp quyền “Xem đề nghị bán hàng”." />;
  }
  return <DonCanGiaoContent />;
}
