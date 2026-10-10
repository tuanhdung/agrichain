// "Tổng quan bảng điều khiển" — số liệu THẬT: đơn hàng/doanh thu từ `/system/orders`, sản phẩm từ `/system/products`.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../icons';
import { api, ApiError, type AdminOrder, type OrderStats, type ProductListItem } from '../../api';
import { EmptyBlock, formatDate, money, ORDER_STATUS, PlatformAdminOnly, StatCard, TmdtHeader } from './shared';

const CHART_W = 640;
const CHART_H = 180;

function RevenueChart({ points }: { points: { date: string; revenue: number }[] }) {
  const values = points.map((p) => p.revenue);
  const max = Math.max(...values, 1);
  const step = CHART_W / Math.max(values.length - 1, 1);
  const coords = values.map((v, i) => [i * step, CHART_H - 28 - (v / max) * (CHART_H - 50)] as const);
  const line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${CHART_W},${CHART_H - 28} L0,${CHART_H - 28} Z`;
  return (
    <svg className="tmdt-chart" viewBox={`0 0 ${CHART_W} ${CHART_H}`} role="img" aria-label="Doanh thu 7 ngày gần nhất">
      <path className="tmdt-chart__area" d={area} />
      <path className="tmdt-chart__line" d={line} />
      {points.map((p, i) => {
        const [, month, day] = p.date.split('-');
        return (
          <text key={p.date} className="tmdt-chart__label" x={Math.min(Math.max(i * step, 22), CHART_W - 22)} y={CHART_H - 8}>
            {`${day}/${month}`}
          </text>
        );
      })}
    </svg>
  );
}

interface Overview {
  stats: OrderStats;
  recent: AdminOrder[];
  fleet: AdminOrder[];
  products: ProductListItem[];
  productTotal: number;
}

function TongQuanPageContent() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    Promise.all([
      api.system.orders.stats(),
      api.system.orders.list({ page_size: 5 }),
      api.system.orders.list({ status: 'shipping', page_size: 3 }),
      api.system.orders.list({ status: 'packing', page_size: 3 }),
      api.system.products.list({ page_size: 100 })
    ])
      .then(([stats, recent, shipping, packing, products]) =>
        setData({
          stats,
          recent: recent.items,
          fleet: [...shipping.items, ...packing.items].slice(0, 3),
          products: products.items,
          productTotal: products.total
        })
      )
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.'));
  }, []);

  useEffect(load, [load]);

  const selling = data?.products.filter((p) => p.status === 'selling') ?? [];
  const stock = selling.reduce((sum, p) => sum + p.stock, 0);

  return (
    <>
      <TmdtHeader
        icon="monitor"
        title="Bảng điều hành nông nghiệp số"
        meta="Giám sát kinh doanh nông sản, định giá kép B2B/B2C và vận chuyển chuỗi lạnh."
      />

      {error && (
        <div className="async-state async-state--error">
          <Icon name="x-circle" className="icon--lg" />
          <p className="async-state__title">Không tải được số liệu</p>
          <p className="async-state__desc">{error}</p>
          <button type="button" className="btn btn--outline btn--sm" onClick={load}>Thử lại</button>
        </div>
      )}

      {!error && !data && (
        <div className="async-state">
          <span className="spinner spinner--lg"></span>
          <p className="async-state__title">Đang tải số liệu...</p>
        </div>
      )}

      {data && (
        <>
          <div className="stat-grid">
            <StatCard icon="credit-card" value={money(data.stats.revenue_total)} label="Tổng doanh thu (đơn chưa huỷ)" total />
            <StatCard
              icon="box"
              value={`${data.productTotal > 100 ? data.productTotal : selling.length} SKU`}
              label={`Nông sản • ${stock.toLocaleString('vi-VN')} tồn kho${data.productTotal > 100 ? ' (100 SP đầu)' : ''}`}
            />
            <StatCard
              icon="truck"
              value={`${data.stats.by_status.shipping ?? 0} lô hàng`}
              label={`Vận chuyển chuỗi lạnh • ${data.stats.by_status.packing ?? 0} chờ đóng gói`}
            />
            <StatCard icon="user" value={data.stats.customers} label="Khách hàng đã mua" />
          </div>

          <div className="tmdt-grid-2">
            <div className="table-panel">
              <div className="table-panel__header">
                <h2 className="table-panel__title">Doanh thu 7 ngày gần nhất</h2>
              </div>
              <div style={{ padding: 'var(--space-4)' }}>
                <RevenueChart points={data.stats.by_day} />
              </div>
            </div>

            <div className="table-panel">
              <div className="table-panel__header">
                <h2 className="table-panel__title">Vận chuyển chuỗi lạnh</h2>
              </div>
              <div className="tmdt-fleet">
                {data.fleet.length === 0 && <p className="table__muted">Chưa có lô hàng nào đang xử lý.</p>}
                {data.fleet.map((o) => (
                  <div className="tmdt-fleet__item" key={o.id}>
                    <div className="tmdt-fleet__title">
                      <span>{o.code}</span>
                      <span className={`badge ${ORDER_STATUS[o.status].cls}`}>{ORDER_STATUS[o.status].label}</span>
                    </div>
                    <div className="tmdt-fleet__meta">
                      {o.receiver_name} • {money(o.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="table-panel">
            <div className="table-panel__header">
              <h2 className="table-panel__title">Giao dịch nông sản gần nhất</h2>
              <Link className="btn btn--outline btn--sm" to="/tmdt/don-hang">
                Xem tất cả đơn hàng →
              </Link>
            </div>
            {data.recent.length === 0 ? (
              <EmptyBlock icon="shopping-cart" title="Chưa có đơn hàng" desc="Đơn khách đặt trên AgriVerse sẽ hiện ở đây." />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Khách hàng</th>
                      <th>Sản phẩm</th>
                      <th>Giá trị</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((o) => (
                      <tr key={o.id}>
                        <td className="table__code">{o.code}</td>
                        <td className="table__name">{o.receiver_name}</td>
                        <td>{o.items.length === 1 ? o.items[0].product_name : `${o.items.length} nông sản`}</td>
                        <td className="table__nowrap">{money(o.total)}</td>
                        <td className="table__muted table__nowrap">{formatDate(o.created_at)}</td>
                        <td>
                          <span className={`badge ${ORDER_STATUS[o.status].cls}`}>{ORDER_STATUS[o.status].label}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

// Chỉ gắn nội dung (và các lời gọi API trong đó) SAU khi đã qua cổng platform_admin — tài khoản khác không
// gửi request nào tới /system/* (vốn chỉ trả 403).
export function TongQuanPage() {
  return (
    <PlatformAdminOnly>
      <TongQuanPageContent />
    </PlatformAdminOnly>
  );
}
