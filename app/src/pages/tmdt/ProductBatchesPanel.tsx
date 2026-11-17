// Tab "Nguồn gốc & lô hàng" trong form sản phẩm (CHỈ sản phẩm loại "Truy xuất"): platform_admin gắn lô hàng của
// các Đơn vị vào sản phẩm. Mỗi lần gắn là một ĐỀ NGHỊ — lô chưa lên sàn cho tới khi Đơn vị sở hữu lô đồng ý
// (trang /de-nghi-ban-hang). Sửa số lượng/giá sau khi Đơn vị đã đồng ý thì đề nghị quay lại "chờ xác nhận".
// Trần số lượng của một lô = 90% sản lượng dự kiến (quy đổi sang đơn vị sản phẩm), backend kiểm tra — ô nhập chỉ
// gợi ý trần `sellable_cap` để người dùng khỏi đoán.
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Icon } from '../../icons';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { api, ApiError, type BatchSystemRow, type ListingStatus, type ProductBatchLink } from '../../api';
import { fetchAllSystemPages } from '../nong-trai-chi-tiet/systemPaging';
import { formatDate } from '../lo-hang/format';
import { money } from './shared';

// Cùng quy tắc với app/units.py của backend (khối lượng kg↔Tấn; cùng nhóm đếm được). Chỉ để báo sớm trên giao diện,
// backend vẫn là nơi quyết định.
const COUNT_GROUPS = [['cái/trái', 'cái', 'trái', 'quả', 'trái cây'], ['bó/nài', 'bó', 'nài'], ['bao/túi', 'bao', 'túi'], ['két/thùng', 'két', 'thùng']];
const MASS = ['kg', 'kilogram', 'tấn', 'tan'];
function unitsCompatible(batchUnit: string, productUnit: string): boolean {
  const a = batchUnit.trim().toLowerCase();
  const b = productUnit.trim().toLowerCase();
  if (a === b) return true;
  if (MASS.includes(a) && MASS.includes(b)) return true;
  return COUNT_GROUPS.some((g) => g.includes(a) && g.includes(b));
}

export const LISTING_STATUS: Record<ListingStatus, { label: string; cls: string }> = {
  proposed: { label: 'Chờ Đơn vị xác nhận', cls: 'badge--warning' },
  confirmed: { label: 'Đã đồng ý', cls: 'badge--success' },
  rejected: { label: 'Đơn vị từ chối', cls: 'badge--danger' }
};

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.';
}

interface Props {
  productId: string;
  productUnit: string;
  /** Gọi sau mỗi lần thêm/sửa/gỡ lô để trang cha tải lại danh sách (cột "Tình trạng"). */
  onChanged: () => void;
}

export function ProductBatchesPanel({ productId, productUnit, onChanged }: Props) {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [links, setLinks] = useState<ProductBatchLink[]>([]);
  const [batches, setBatches] = useState<BatchSystemRow[]>([]);
  const [view, setView] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  const [batchId, setBatchId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [formError, setFormError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const load = useCallback(() => {
    setView('loading');
    Promise.all([api.system.productBatches.list(productId), fetchAllSystemPages((params) => api.system.batches.list(params))])
      .then(([linkRows, batchRows]) => {
        setLinks(linkRows);
        setBatches(batchRows);
        setView('ready');
      })
      .catch((err: unknown) => {
        setLoadError(errorMessage(err));
        setView('error');
      });
  }, [productId]);

  useEffect(load, [load]);

  // Lô chọn được: chưa thất bại và chưa gắn vào sản phẩm này.
  const options = useMemo(() => {
    const linked = new Set(links.map((l) => l.batch_id));
    return batches.filter((b) => b.status !== 'failed' && !linked.has(b.id));
  }, [batches, links]);

  const selected = options.find((b) => b.id === batchId);

  // KHÔNG dùng <form>: panel nằm TRONG <form> của modal sản phẩm, form lồng nhau là HTML không hợp lệ — trình duyệt bỏ
  // thẻ form bên trong nên nút "Gắn lô" sẽ submit nhầm form sản phẩm (chỉ lưu sản phẩm, không gắn lô).
  async function handleAdd() {
    const qty = Math.floor(Number(quantity));
    if (!batchId) return setFormError('Chọn lô hàng.');
    if (!(qty > 0)) return setFormError('Nhập số lượng đề nghị lớn hơn 0.');
    const settlement = Math.round(Number(price || 0));
    setFormError('');
    setBusy(true);
    try {
      await api.system.productBatches.add(productId, { batch_id: batchId, quantity: qty, settlement_price: settlement > 0 ? settlement : null });
      showToast('Đã gửi đề nghị cho Đơn vị. Lô sẽ lên sàn khi Đơn vị đồng ý.');
      setBatchId('');
      setQuantity('');
      setPrice('');
      load();
      onChanged();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function onAddKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.target as HTMLElement).tagName === 'INPUT') {
      event.preventDefault();
      handleAdd();
    }
  }

  function startEdit(link: ProductBatchLink) {
    setEditingId(link.id);
    setEditQuantity(String(link.quantity_proposed));
    setEditPrice(link.settlement_price ? String(link.settlement_price) : '');
  }

  async function saveEdit(link: ProductBatchLink) {
    const qty = Math.floor(Number(editQuantity));
    if (!(qty > 0)) return showToast('Số lượng phải lớn hơn 0.');
    const settlement = Math.round(Number(editPrice || 0));
    setBusy(true);
    try {
      const updated = await api.system.productBatches.update(productId, link.id, {
        quantity: qty,
        settlement_price: settlement > 0 ? settlement : null
      });
      showToast(updated.status === 'proposed' && link.status !== 'proposed' ? 'Đã lưu. Đơn vị cần xác nhận lại đề nghị này.' : 'Đã lưu thay đổi.');
      setEditingId(null);
      load();
      onChanged();
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(link: ProductBatchLink) {
    if (!(await confirm(`Gỡ lô ${link.batch_code} khỏi sản phẩm?`))) return;
    try {
      await api.system.productBatches.remove(productId, link.id);
      showToast('Đã gỡ lô khỏi sản phẩm.');
      load();
      onChanged();
    } catch (err) {
      showToast(errorMessage(err));
    }
  }

  if (view === 'loading') return <p className="field__hint">Đang tải các lô đã gắn...</p>;
  if (view === 'error') {
    return (
      <div className="async-state async-state--error">
        <p className="async-state__title">Không tải được danh sách lô</p>
        <p>{loadError}</p>
        <button type="button" className="btn btn--primary btn--sm" onClick={load}>Thử lại</button>
      </div>
    );
  }

  return (
    <div className="tmdt-links">
      <div className="tmdt-callout">
        <span className="tmdt-callout__icon" aria-hidden="true">🌱</span>
        <div>
          <strong>Sản phẩm truy xuất — gắn lô hàng thật</strong>
          <p>
            Mỗi lô bạn gắn là một <b>đề nghị</b> gửi cho Đơn vị sở hữu lô. Chỉ khi họ <b>đồng ý</b>, lô mới hiện trên sàn là &ldquo;sắp có hàng&rdquo; kèm ngày thu
            hoạch dự kiến. Mỗi lô chỉ đem bán tối đa <b>90% sản lượng dự kiến</b>. Tồn kho thật (tab &ldquo;Định giá kép &amp; tồn kho&rdquo;) vẫn do bạn nhập khi hàng về.
          </p>
        </div>
      </div>

      {links.length === 0 ? (
        <p className="field__hint">Chưa gắn lô nào.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Lô hàng</th>
                <th>Đơn vị sở hữu</th>
                <th>Thu hoạch dự kiến</th>
                <th>Số lượng ({productUnit})</th>
                <th>Giá thu về</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => {
                const editing = editingId === link.id;
                const status = LISTING_STATUS[link.status];
                return (
                  <tr key={link.id}>
                    <td>
                      <div className="table__name">{link.batch_code}</div>
                      <div className="table__muted">{link.farm_name} • {link.season_name}</div>
                    </td>
                    <td>{link.organization_name}</td>
                    <td className="table__nowrap">
                      {formatDate(link.harvest_date)}
                      {link.batch_status === 'failed' && <div className="table__muted">Lô đã thất bại</div>}
                    </td>
                    <td className="table__nowrap">
                      {editing ? (
                        <input className="input" type="number" min="1" aria-label="Số lượng đề nghị" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
                      ) : (
                        <>
                          {(link.quantity_confirmed ?? link.quantity_proposed).toLocaleString('vi-VN')}
                          {link.status === 'confirmed' && link.quantity_confirmed !== link.quantity_proposed && (
                            <div className="table__muted">Đề nghị {link.quantity_proposed.toLocaleString('vi-VN')}</div>
                          )}
                          {link.sellable_cap != null && <div className="table__muted">Trần lô: {link.sellable_cap.toLocaleString('vi-VN')}</div>}
                        </>
                      )}
                    </td>
                    <td className="table__nowrap">
                      {editing ? (
                        <input className="input" type="number" min="0" aria-label="Giá thu về" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                      ) : link.settlement_price ? (
                        money(link.settlement_price)
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span className={`badge ${status.cls}`}>{status.label}</span>
                      {link.response_note && <div className="table__muted">{link.response_note}</div>}
                    </td>
                    <td>
                      <div className="table__actions">
                        {editing ? (
                          <>
                            <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => saveEdit(link)}>Lưu</button>
                            <button type="button" className="btn btn--outline btn--sm" onClick={() => setEditingId(null)}>Huỷ</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="icon-btn" aria-label={`Sửa đề nghị lô ${link.batch_code}`} data-tooltip="Sửa số lượng/giá" onClick={() => startEdit(link)}>
                              <Icon name="pencil" />
                            </button>
                            <button type="button" className="icon-btn icon-btn--danger" aria-label={`Gỡ lô ${link.batch_code}`} data-tooltip="Gỡ lô" onClick={() => handleRemove(link)}>
                              <Icon name="trash" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="tmdt-links__add" onKeyDown={onAddKeyDown}>
        <h3 className="tmdt-links__title">Gắn thêm lô hàng</h3>
        <div className="form-grid">
          <div className="field form-grid__full">
            <label className="label" htmlFor="link-batch">Lô hàng</label>
            <select className="select" id="link-batch" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <option value="">— Chọn lô hàng của một Đơn vị —</option>
              {options.map((b) => (
                <option key={b.id} value={b.id} disabled={!unitsCompatible(b.unit ?? '', productUnit)}>
                  {b.code} · {b.organization_name} · {b.farm_name} · thu hoạch {formatDate(b.harvest_date)} · {b.expected_yield} {b.unit}
                  {unitsCompatible(b.unit ?? '', productUnit) ? '' : ` — khác đơn vị sản phẩm (${productUnit})`}
                </option>
              ))}
            </select>
            {options.length === 0 && <p className="field__hint">Không còn lô nào để gắn (lô đã thất bại hoặc đã gắn rồi không hiện ở đây).</p>}
            {options.length > 0 && options.every((b) => !unitsCompatible(b.unit ?? '', productUnit)) && (
              <p className="field__error">
                Tất cả lô hiện có đều khác đơn vị với sản phẩm (“{productUnit}”) nên không chọn được. Hãy đổi đơn vị sản phẩm ở tab “Thông tin cơ bản” cho cùng loại với lô (ví dụ kg), hoặc tạo lô có đơn vị “{productUnit}”.
              </p>
            )}
            {selected && (
              <p className="field__hint">
                Sản lượng dự kiến {selected.expected_yield} {selected.unit}, tối đa đem bán 90%. Phải cùng loại đơn vị với sản phẩm ({productUnit}).
              </p>
            )}
          </div>
          <div className="field">
            <label className="label" htmlFor="link-qty">Số lượng đề nghị ({productUnit})</label>
            <input className="input" id="link-qty" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="link-price">Giá thu về cho Đơn vị / {productUnit} — VNĐ <span className="tmdt-opt">(tuỳ chọn)</span></label>
            <input className="input" id="link-price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        {formError && <p className="field__error">{formError}</p>}
        <button type="button" className="btn btn--primary" disabled={busy} onClick={handleAdd}>
          <Icon name="plus" className="icon--sm" />
          Gắn lô &amp; gửi đề nghị
        </button>
      </div>
    </div>
  );
}
