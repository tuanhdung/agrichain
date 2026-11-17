// Khối "Đặt trước & yêu cầu trồng" trong tab "Nguồn gốc & lô hàng" của form sản phẩm (platform_admin).
// Hiện nhu cầu đặt trước đang chờ nguồn hàng, và cho gửi "yêu cầu trồng" cho một Đơn vị: giống, số lượng, cần trước
// ngày, giá thoả thuận. Đơn vị nhận → trồng → gắn lô; khi gắn lô xong, đơn đặt trước tự được chia vào lô đó.
// KHÔNG dùng <form>: panel nằm trong <form> của modal sản phẩm (form lồng nhau là HTML không hợp lệ).
import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { Icon } from '../../icons';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { api, ApiError, type GrowRequest, type GrowRequestStatus, type OrganizationOption, type PreorderDemand } from '../../api';
import { formatDate } from '../lo-hang/format';
import { money } from './shared';

export const GROW_STATUS: Record<GrowRequestStatus, { label: string; cls: string }> = {
  proposed: { label: 'Chờ Đơn vị nhận', cls: 'badge--warning' },
  accepted: { label: 'Đơn vị đã nhận, đang trồng', cls: 'badge--info' },
  fulfilled: { label: 'Đã gắn lô', cls: 'badge--success' },
  rejected: { label: 'Đơn vị từ chối', cls: 'badge--danger' },
  cancelled: { label: 'Đã huỷ', cls: 'badge--neutral' }
};

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.';
}

interface Props {
  productId: string;
  productUnit: string;
  allowPreorder: boolean;
}

export function GrowRequestsPanel({ productId, productUnit, allowPreorder }: Props) {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [requests, setRequests] = useState<GrowRequest[]>([]);
  const [demand, setDemand] = useState<PreorderDemand | null>(null);
  const [orgs, setOrgs] = useState<OrganizationOption[]>([]);
  const [view, setView] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  const [orgId, setOrgId] = useState('');
  const [variety, setVariety] = useState('');
  const [quantity, setQuantity] = useState('');
  const [needBy, setNeedBy] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    setView('loading');
    Promise.all([api.system.growRequests.list(productId), api.system.growRequests.demand(productId), api.system.growRequests.organizations()])
      .then(([rows, dem, orgRows]) => {
        setRequests(rows);
        setDemand(dem);
        setOrgs(orgRows);
        setView('ready');
      })
      .catch((err: unknown) => {
        setLoadError(errorMessage(err));
        setView('error');
      });
  }, [productId]);

  useEffect(load, [load]);

  async function handleCreate() {
    const qty = Math.floor(Number(quantity));
    if (!orgId) return setFormError('Chọn Đơn vị sẽ trồng.');
    if (!variety.trim()) return setFormError('Nhập giống cần trồng.');
    if (!(qty > 0)) return setFormError('Nhập số lượng lớn hơn 0.');
    const settlement = Math.round(Number(price || 0));
    setFormError('');
    setBusy(true);
    try {
      await api.system.growRequests.create(productId, {
        organization_id: orgId,
        variety: variety.trim(),
        quantity: qty,
        need_by: needBy || null,
        settlement_price: settlement > 0 ? settlement : null,
        note: note.trim() || null
      });
      showToast('Đã gửi yêu cầu trồng cho Đơn vị.');
      setVariety('');
      setQuantity('');
      setNeedBy('');
      setPrice('');
      setNote('');
      load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.target as HTMLElement).tagName === 'INPUT') {
      event.preventDefault();
      handleCreate();
    }
  }

  async function handleCancel(item: GrowRequest) {
    if (!(await confirm(`Huỷ yêu cầu trồng “${item.variety}” gửi ${item.organization_name}?`))) return;
    try {
      await api.system.growRequests.cancel(productId, item.id);
      showToast('Đã huỷ yêu cầu trồng.');
      load();
    } catch (err) {
      showToast(errorMessage(err));
    }
  }

  return (
    <div className="tmdt-links">
      <h3 className="tmdt-links__title">Đặt trước &amp; yêu cầu trồng</h3>
      {!allowPreorder && (
        <p className="field__hint">
          Sản phẩm chưa bật “Cho đặt trước khi hết hàng” (tab “Thông tin cơ bản”) nên khách chưa đặt trước được. Bạn vẫn có thể gửi yêu cầu trồng.
        </p>
      )}
      {view === 'loading' && <p className="field__hint">Đang tải...</p>}
      {view === 'error' && (
        <p className="field__error">
          {loadError} <button type="button" className="btn btn--sm btn--outline" onClick={load}>Thử lại</button>
        </p>
      )}
      {view === 'ready' && (
        <>
          <p className="field__hint">
            <strong>Nhu cầu đặt trước đang chờ nguồn:</strong>{' '}
            {demand && demand.waiting_quantity > 0
              ? `${demand.waiting_quantity.toLocaleString('vi-VN')} ${productUnit} (${demand.waiting_orders} dòng đơn)`
              : 'chưa có'}
            . Khi Đơn vị gắn lô, các đơn này tự được chia vào lô theo thứ tự đặt.
          </p>

          {requests.length === 0 ? (
            <p className="field__hint">Chưa có yêu cầu trồng nào.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Đơn vị</th>
                    <th>Giống</th>
                    <th>Số lượng</th>
                    <th>Cần trước</th>
                    <th>Giá thoả thuận</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td>{r.organization_name}</td>
                      <td>
                        {r.variety}
                        {r.response_note && <div className="table__muted">Phản hồi: {r.response_note}</div>}
                      </td>
                      <td className="table__nowrap">{r.quantity.toLocaleString('vi-VN')} {r.product_unit}</td>
                      <td className="table__nowrap">{r.need_by ? formatDate(r.need_by) : '—'}</td>
                      <td className="table__nowrap">{r.settlement_price ? `${money(r.settlement_price)} / ${r.product_unit}` : 'Chưa thoả thuận'}</td>
                      <td><span className={`badge ${GROW_STATUS[r.status].cls}`}>{GROW_STATUS[r.status].label}</span></td>
                      <td className="table__nowrap">
                        {(r.status === 'proposed' || r.status === 'accepted') && (
                          <button type="button" className="btn btn--sm btn--outline" onClick={() => handleCancel(r)}>Huỷ</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="tmdt-links__add" onKeyDown={onKeyDown}>
            <h3 className="tmdt-links__title">Gửi yêu cầu trồng</h3>
            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="grow-org">Đơn vị trồng</label>
                <select className="select" id="grow-org" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
                  <option value="">— Chọn Đơn vị —</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="grow-variety">Giống</label>
                <input className="input" id="grow-variety" value={variety} placeholder="VD: Dưa lưới Taki" onChange={(e) => setVariety(e.target.value)} />
              </div>
              <div className="field">
                <label className="label" htmlFor="grow-qty">Số lượng ({productUnit})</label>
                <input className="input" id="grow-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="field">
                <label className="label" htmlFor="grow-need">Cần có hàng trước ngày</label>
                <input className="input" id="grow-need" type="date" value={needBy} onChange={(e) => setNeedBy(e.target.value)} />
              </div>
              <div className="field">
                <label className="label" htmlFor="grow-price">Giá thoả thuận (đ / {productUnit})</label>
                <input className="input" id="grow-price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="field">
                <label className="label" htmlFor="grow-note">Ghi chú</label>
                <input className="input" id="grow-note" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
            {formError && <p className="field__error">{formError}</p>}
            <button type="button" className="btn btn--primary" disabled={busy} onClick={handleCreate}>
              <Icon name="plus" className="icon--sm" />
              Gửi yêu cầu trồng
            </button>
          </div>
        </>
      )}
    </div>
  );
}
