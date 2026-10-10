// "Quản lý đánh giá" — xem mọi đánh giá sản phẩm của khách và gỡ đánh giá vi phạm (xoá mềm,
// khách có thể đánh giá lại). Dữ liệu THẬT qua API (`/system/reviews`).
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../../icons';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { api, ApiError } from '../../api';
import type { ReviewAdmin } from '../../api/reviews';
import { EmptyBlock, formatDate, PlatformAdminOnly, TmdtHeader } from './shared';

const PAGE_SIZE = 20;
type View = 'loading' | 'data' | 'error';

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.';
}

function Stars({ value }: { value: number }) {
  return (
    <span className="tmdt-stars" role="img" aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" className={n <= value ? 'icon--sm tmdt-star tmdt-star--on' : 'icon--sm tmdt-star'} />
      ))}
    </span>
  );
}

function DanhGiaPageContent() {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [items, setItems] = useState<ReviewAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState('');
  const [view, setView] = useState<View>('loading');
  const [loadError, setLoadError] = useState('');

  const load = useCallback(() => {
    setView('loading');
    api.system.reviews
      .list({ rating: ratingFilter ? Number(ratingFilter) : undefined, page, page_size: PAGE_SIZE })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setView('data');
      })
      .catch((err: unknown) => {
        setLoadError(errorMessage(err));
        setView('error');
      });
  }, [ratingFilter, page]);

  useEffect(load, [load]);

  async function handleDelete(review: ReviewAdmin) {
    if (!(await confirm(`Gỡ đánh giá của ${review.reviewer_name} về “${review.product_name}”? Khách có thể đánh giá lại sau đó.`))) return;
    try {
      await api.system.reviews.remove(review.id);
      showToast('Đã gỡ đánh giá.');
      // Gỡ bản ghi cuối của trang > 1 thì lùi 1 trang, tránh hiện trang rỗng
      if (items.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch (err) {
      showToast(errorMessage(err));
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <TmdtHeader
        icon="star"
        title="Quản lý đánh giá sản phẩm"
        count={view === 'data' ? `${total} đánh giá` : undefined}
        meta="Chỉ khách đã nhận hàng mới đánh giá được. Gỡ các đánh giá vi phạm (spam, ngôn từ không phù hợp)."
      />

      <div className="tmdt-toolbar">
        <select className="select" value={ratingFilter} aria-label="Lọc theo số sao" onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }}>
          <option value="">Tất cả số sao</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sao</option>)}
        </select>
      </div>

      {view === 'loading' && (
        <div className="async-state">
          <span className="spinner spinner--lg"></span>
          <p className="async-state__title">Đang tải đánh giá...</p>
        </div>
      )}

      {view === 'error' && (
        <div className="async-state async-state--error">
          <Icon name="x-circle" className="icon--lg" />
          <p className="async-state__title">Không tải được đánh giá</p>
          <p className="async-state__desc">{loadError}</p>
          <button type="button" className="btn btn--outline btn--sm" onClick={load}>Thử lại</button>
        </div>
      )}

      {view === 'data' && items.length === 0 && (
        <EmptyBlock
          icon="star"
          title={ratingFilter ? 'Không có đánh giá nào ở mức sao này' : 'Chưa có đánh giá nào'}
          desc={ratingFilter ? 'Thử chọn mức sao khác.' : 'Đánh giá xuất hiện khi khách nhận hàng và nhận xét sản phẩm.'}
        />
      )}

      {view === 'data' && items.length > 0 && (
        <>
          <div className="table-panel">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Người đánh giá</th>
                    <th>Đánh giá</th>
                    <th>Ngày</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td className="table__name">{r.product_name}</td>
                      <td>
                        <div>{r.reviewer_name}</div>
                        <div className="table__muted">{r.reviewer_email}</div>
                      </td>
                      <td>
                        <Stars value={r.rating} />
                        <div className="table__desc">{r.comment || <span className="table__muted">(không có nhận xét)</span>}</div>
                      </td>
                      <td className="table__muted table__nowrap">{formatDate(r.created_at)}</td>
                      <td>
                        <div className="table__actions">
                          <button type="button" className="icon-btn icon-btn--danger" aria-label={`Gỡ đánh giá của ${r.reviewer_name}`} data-tooltip="Gỡ đánh giá" onClick={() => handleDelete(r)}>
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
    </>
  );
}

// Chỉ gắn nội dung (và lời gọi API) SAU khi qua cổng platform_admin — tài khoản khác không gửi request nào tới /system/*.
export function DanhGiaPage() {
  return (
    <PlatformAdminOnly>
      <DanhGiaPageContent />
    </PlatformAdminOnly>
  );
}
