// "Yêu cầu trồng" — phía Đơn vị. Sàn gom nhu cầu đặt trước rồi đề nghị Đơn vị trồng theo giống. Đơn vị nhận hoặc từ
// chối; sau khi trồng (tạo mùa vụ + lô như thường) thì "Gắn lô" để thực hiện yêu cầu — lô được đồng ý bán ngay với
// giá thoả thuận của yêu cầu và các đơn đặt trước đang chờ tự được chia vào lô đó. Quyền: listings.view / listings.edit.
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Batch, type GrowRequest } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';
import { useToast } from '../../components/ToastProvider';
import { formatDate } from '../lo-hang/format';
import { GROW_STATUS } from '../tmdt/GrowRequestsPanel';
import { money } from '../tmdt/shared';

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.';
}

export function GrowRequestsSection() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canRespond = hasPermission('listings.edit');
  const modal = useDialog();

  const [items, setItems] = useState<GrowRequest[]>([]);
  const [view, setView] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [target, setTarget] = useState<GrowRequest | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setView('loading');
    api.growRequests
      .list({ page_size: 50 })
      .then((data) => {
        setItems(data.items);
        setView('ready');
      })
      .catch((err: unknown) => {
        setLoadError(errorMessage(err));
        setView('error');
      });
  }, []);

  useEffect(load, [load]);

  async function respond(item: GrowRequest, action: 'accept' | 'reject') {
    setBusyId(item.id);
    try {
      await api.growRequests.respond(item.id, action);
      showToast(action === 'accept' ? 'Đã nhận yêu cầu. Trồng xong hãy gắn lô.' : 'Đã từ chối yêu cầu.');
      load();
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function openFulfill(item: GrowRequest) {
    setTarget(item);
    setBatchId('');
    setQuantity(String(item.quantity));
    setFormError('');
    modal.open();
    try {
      const data = await api.batches.list({ page_size: 100 });
      setBatches(data.items.filter((b) => b.status !== 'failed'));
    } catch (err) {
      setFormError(errorMessage(err));
    }
  }

  async function fulfill() {
    if (!target) return;
    const qty = Math.floor(Number(quantity));
    if (!batchId) return setFormError('Chọn lô đã trồng.');
    if (!(qty > 0)) return setFormError('Nhập số lượng lớn hơn 0.');
    setSaving(true);
    try {
      await api.growRequests.fulfill(target.id, batchId, qty);
      modal.close();
      showToast('Đã gắn lô. Các đơn đặt trước đang chờ đã được chia vào lô này.');
      load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (view === 'ready' && items.length === 0) return null;

  return (
    <section style={{ marginTop: 'var(--space-8)' }}>
      <h2 className="page-header__title" style={{ fontSize: 'var(--text-lg)' }}>Yêu cầu trồng</h2>
      <p className="page-header__meta">
        Khách đã đặt trước nông sản. Sàn đề nghị Đơn vị bạn trồng đúng giống và số lượng bên dưới; trồng xong hãy gắn lô để giao cho khách.
      </p>
      {view === 'loading' && <p className="field__hint">Đang tải yêu cầu trồng...</p>}
      {view === 'error' && (
        <p className="field__error">
          {loadError} <button type="button" className="btn btn--sm btn--outline" onClick={load}>Thử lại</button>
        </p>
      )}
      {view === 'ready' && (
        <div className="table-panel">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sản phẩm / giống</th>
                  <th>Số lượng</th>
                  <th>Cần trước</th>
                  <th>Giá thoả thuận</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="table__name">{r.product_name}</div>
                      <div className="table__muted">Giống: {r.variety}</div>
                      {r.note && <div className="table__muted">Ghi chú: {r.note}</div>}
                    </td>
                    <td className="table__nowrap">{r.quantity.toLocaleString('vi-VN')} {r.product_unit}</td>
                    <td className="table__nowrap">{r.need_by ? formatDate(r.need_by) : '—'}</td>
                    <td className="table__nowrap">{r.settlement_price ? `${money(r.settlement_price)} / ${r.product_unit}` : 'Chưa thoả thuận'}</td>
                    <td><span className={`badge ${GROW_STATUS[r.status].cls}`}>{GROW_STATUS[r.status].label}</span></td>
                    <td className="table__nowrap">
                      {canRespond && r.status === 'proposed' && (
                        <>
                          <button type="button" className="btn btn--sm btn--primary" disabled={busyId === r.id} onClick={() => respond(r, 'accept')}>Nhận trồng</button>{' '}
                          <button type="button" className="btn btn--sm btn--outline" disabled={busyId === r.id} onClick={() => respond(r, 'reject')}>Từ chối</button>
                        </>
                      )}
                      {canRespond && r.status === 'accepted' && (
                        <>
                          <button type="button" className="btn btn--sm btn--primary" onClick={() => openFulfill(r)}>Gắn lô đã trồng</button>{' '}
                          <button type="button" className="btn btn--sm btn--outline" disabled={busyId === r.id} onClick={() => respond(r, 'reject')}>Không trồng nữa</button>
                        </>
                      )}
                      {(!canRespond || (r.status !== 'proposed' && r.status !== 'accepted')) && '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <dialog className="modal" ref={modal.ref} aria-labelledby="grow-fulfill-title">
        <div className="modal__form">
        <div className="modal__header">
          <h2 className="modal__title" id="grow-fulfill-title">Gắn lô đã trồng</h2>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={modal.close}>&times;</button>
        </div>
        <div className="modal__body">
          {target && (
            <p className="field__hint">
              Yêu cầu: {target.product_name} — giống {target.variety}, {target.quantity.toLocaleString('vi-VN')} {target.product_unit}.
              Lô phải cùng loại đơn vị với sản phẩm và không vượt 90% sản lượng dự kiến.
            </p>
          )}
          <div className="field">
            <label className="label" htmlFor="grow-fulfill-batch">Lô hàng</label>
            <select className="select" id="grow-fulfill-batch" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <option value="">— Chọn lô —</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} · thu hoạch {formatDate(b.harvest_date)} · {b.expected_yield} {b.unit}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="grow-fulfill-qty">Số lượng cung cấp ({target?.product_unit})</label>
            <input className="input" id="grow-fulfill-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          {formError && <p className="field__error">{formError}</p>}
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={modal.close}>Huỷ</button>
          <button type="button" className="btn btn--primary" disabled={saving} onClick={fulfill}>Gắn lô</button>
        </div>
        </div>
      </dialog>
    </section>
  );
}
