// "Quản lý đơn hàng & chuỗi lạnh" — đơn hàng THẬT qua API (`/system/orders`, backend agrichain-api).
// Khách đặt ở trang thanh toán của AgriVerse → hiện ở đây; đổi trạng thái đơn/thanh toán lưu về máy chủ.
// Huỷ đơn tự hoàn lại tồn kho (backend lo).
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Icon } from '../../icons';
import { useDialog } from '../../hooks/useDialog';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { useToast } from '../../components/ToastProvider';
import { api, ApiError, type AdminOrder, type OrderStats, type OrderStatus, type PaymentStatus } from '../../api';
import { EmptyBlock, formatDate, money, ORDER_STATUS, PAYMENT_STATUS, PlatformAdminOnly, StatCard, TmdtHeader } from './shared';

const PAGE_SIZE = 20;
type View = 'loading' | 'data' | 'error';

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.';
}

function DonHangPageContent() {
  const { showToast } = useToast();
  const modal = useDialog();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | ''>('');
  const [view, setView] = useState<View>('loading');
  const [loadError, setLoadError] = useState('');

  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [status, setStatus] = useState<OrderStatus>('received');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setView('loading');
    Promise.all([
      api.system.orders.list({
        q: query || undefined,
        status: statusFilter || undefined,
        payment_status: paymentFilter || undefined,
        page,
        page_size: PAGE_SIZE
      }),
      api.system.orders.stats()
    ])
      .then(([list, summary]) => {
        setOrders(list.items);
        setTotal(list.total);
        setStats(summary);
        setView('data');
      })
      .catch((err: unknown) => {
        setLoadError(errorMessage(err));
        setView('error');
      });
  }, [query, statusFilter, paymentFilter, page]);

  useEffect(load, [load]);

  const onSearch = useDebouncedCallback((value: string) => {
    setQuery(value.trim());
    setPage(1);
  }, 300);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtering = Boolean(query || statusFilter || paymentFilter);

  function openDetail(order: AdminOrder) {
    setSelected(order);
    setStatus(order.status);
    setPaymentStatus(order.payment_status);
    modal.open();
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await api.system.orders.update(selected.id, { status, payment_status: paymentStatus });
      modal.close();
      showToast('Đã cập nhật đơn hàng.');
      load();
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // Trạng thái đã kết thúc thì khoá ô đổi trạng thái (backend cũng chặn, 409).
  const statusLocked = selected ? selected.status === 'delivered' || selected.status === 'cancelled' : false;

  return (
    <>
      <TmdtHeader
        icon="shopping-cart"
        title="Quản trị đơn hàng & chuỗi lạnh"
        count={stats ? `${stats.total_orders} đơn hàng` : undefined}
        meta="Giám sát đơn hàng, điều phối đóng gói xuất kho và kiểm soát thanh toán."
      />

      <div className="stat-grid">
        <StatCard icon="file-text" value={stats?.total_orders ?? '—'} label="Tổng đơn hàng" total />
        <StatCard icon="clock" value={stats ? (stats.by_status.received ?? 0) + (stats.by_status.packing ?? 0) : '—'} label="Chờ xử lý / đóng gói" />
        <StatCard icon="truck" value={stats?.by_status.shipping ?? '—'} label="Xe lạnh đang giao" />
        <StatCard icon="credit-card" value={stats ? money(stats.revenue_delivered) : '—'} label="Doanh thu đã giao" />
      </div>

      <div className="tmdt-toolbar">
        <div className="search-field">
          <Icon name="search" className="search-field__icon" />
          <input
            className="input" type="search" placeholder="Tìm mã đơn (AGR-...), tên khách, số ĐT..."
            value={searchInput} onChange={(e) => { setSearchInput(e.target.value); onSearch(e.target.value); }}
          />
        </div>
        <select className="select" value={statusFilter} aria-label="Lọc trạng thái" onChange={(e) => { setStatusFilter(e.target.value as OrderStatus | ''); setPage(1); }}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(ORDER_STATUS).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}
        </select>
        <select className="select" value={paymentFilter} aria-label="Lọc thanh toán" onChange={(e) => { setPaymentFilter(e.target.value as PaymentStatus | ''); setPage(1); }}>
          <option value="">Tất cả thanh toán</option>
          {Object.entries(PAYMENT_STATUS).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}
        </select>
        {filtering && (
          <button type="button" className="btn btn--outline btn--sm" onClick={() => { setSearchInput(''); setQuery(''); setStatusFilter(''); setPaymentFilter(''); setPage(1); }}>
            Xoá lọc
          </button>
        )}
      </div>

      {view === 'loading' && (
        <div className="async-state">
          <span className="spinner spinner--lg"></span>
          <p className="async-state__title">Đang tải đơn hàng...</p>
        </div>
      )}

      {view === 'error' && (
        <div className="async-state async-state--error">
          <Icon name="x-circle" className="icon--lg" />
          <p className="async-state__title">Không tải được đơn hàng</p>
          <p className="async-state__desc">{loadError}</p>
          <button type="button" className="btn btn--outline btn--sm" onClick={load}>Thử lại</button>
        </div>
      )}

      {view === 'data' && orders.length === 0 && (
        <EmptyBlock
          icon="shopping-cart"
          title="Không có đơn hàng"
          desc={filtering ? 'Thử đổi bộ lọc.' : 'Chưa có khách nào đặt hàng. Đơn đặt từ trang thanh toán của AgriVerse sẽ hiện ở đây.'}
        />
      )}

      {view === 'data' && orders.length > 0 && (
        <>
          <div className="table-panel">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>Nông sản</th>
                    <th>Tổng tiền</th>
                    <th>Thanh toán</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <div className="table__code">#{o.code}</div>
                        <div className="table__muted">{formatDate(o.created_at)}</div>
                      </td>
                      <td>
                        <div className="table__name">{o.receiver_name}</div>
                        <div className="table__muted">{o.receiver_phone}</div>
                      </td>
                      <td>{o.items.length} nông sản</td>
                      <td className="table__nowrap">{money(o.total)}</td>
                      <td>
                        <span className={`badge ${PAYMENT_STATUS[o.payment_status].cls}`}>{PAYMENT_STATUS[o.payment_status].label}</span>
                        <div className="table__muted">{o.payment_method === 'cod' ? 'COD' : 'Chuyển khoản'}</div>
                      </td>
                      <td>
                        <span className={`badge ${ORDER_STATUS[o.status].cls}`}>{ORDER_STATUS[o.status].label}</span>
                      </td>
                      <td>
                        <button type="button" className="btn btn--outline btn--sm" onClick={() => openDetail(o)}>
                          Xử lý & chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pagination">
            <button type="button" className="btn btn--outline btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Trước</button>
            <span className="pagination__info">Trang {page} / {totalPages} ({total} đơn)</span>
            <button type="button" className="btn btn--outline btn--sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau ›</button>
          </div>
        </>
      )}

      <dialog className="modal" ref={modal.ref} aria-labelledby="order-modal-title">
        <form className="modal__form" onSubmit={handleSave}>
          <div className="modal__header">
            <Icon name="shopping-cart" />
            <h2 className="modal__title" id="order-modal-title">Đơn hàng {selected?.code}</h2>
            <button type="button" className="modal__close" aria-label="Đóng" onClick={modal.close}>&times;</button>
          </div>
          <div className="modal__body">
            {selected && (
              <>
                <section className="form-section">
                  <h3 className="form-section__title">Giao hàng</h3>
                  <p><strong>{selected.receiver_name}</strong> • {selected.receiver_phone}</p>
                  {selected.receiver_email && <p className="table__muted">{selected.receiver_email}</p>}
                  <p>{[selected.detail, selected.ward, selected.province].filter(Boolean).join(', ')}</p>
                  {selected.note && <p className="table__muted">Ghi chú: {selected.note}</p>}
                  <p className="table__muted">
                    Đặt lúc {formatDate(selected.created_at)}
                    {selected.customer_email && ` • Tài khoản: ${selected.customer_email}`}
                  </p>
                </section>
                <section className="form-section">
                  <h3 className="form-section__title">Nông sản</h3>
                  <div className="tmdt-lines">
                    {selected.items.map((it) => (
                      <div className="tmdt-lines__row" key={it.id}>
                        <span>{it.product_name} × {it.quantity} {it.unit}</span>
                        <strong>{money(it.quantity * it.unit_price)}</strong>
                      </div>
                    ))}
                    <div className="tmdt-lines__row"><span>Phí giao xe lạnh</span><span>{selected.shipping_fee ? money(selected.shipping_fee) : 'Miễn phí'}</span></div>
                    <div className="tmdt-lines__row"><strong>Tổng cộng</strong><strong>{money(selected.total)}</strong></div>
                  </div>
                </section>
                {selected.events.length > 0 && (
                  <section className="form-section">
                    <h3 className="form-section__title">Lịch sử trạng thái</h3>
                    <div className="tmdt-lines">
                      {selected.events.map((e, i) => (
                        <div className="tmdt-lines__row" key={`${e.status}-${i}`}>
                          <span className={`badge ${ORDER_STATUS[e.status].cls}`}>{ORDER_STATUS[e.status].label}</span>
                          <span className="table__muted">{formatDate(e.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                <section className="form-section">
                  <h3 className="form-section__title">Xử lý đơn</h3>
                  <div className="form-grid">
                    <div className="field">
                      <label className="label" htmlFor="order-status">Trạng thái đơn</label>
                      <select className="select" id="order-status" value={status} disabled={statusLocked} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                        {Object.entries(ORDER_STATUS).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}
                      </select>
                      {statusLocked && <p className="field__hint">Đơn đã giao hoặc đã huỷ — không đổi trạng thái được nữa.</p>}
                      {!statusLocked && status === 'cancelled' && <p className="field__hint">Huỷ đơn sẽ hoàn lại tồn kho các sản phẩm.</p>}
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="order-payment">Thanh toán</label>
                      <select className="select" id="order-payment" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}>
                        {Object.entries(PAYMENT_STATUS).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
          <div className="modal__footer">
            <button type="button" className="btn btn--secondary" onClick={modal.close}>Đóng</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

// Chỉ gắn nội dung (và các lời gọi API trong đó) SAU khi đã qua cổng platform_admin — tài khoản khác không
// gửi request nào tới /system/* (vốn chỉ trả 403).
export function DonHangPage() {
  return (
    <PlatformAdminOnly>
      <DonHangPageContent />
    </PlatformAdminOnly>
  );
}
