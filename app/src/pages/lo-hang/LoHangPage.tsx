// Port ĐÚNG lo-hang.html + js/lo-hang.js — danh sách TẤT CẢ lô hàng (KHÔNG
// phân trang, page_size: 100 cố định, xem constants.ts) + bộ lọc Nông trại
// -> Mùa vụ (2 select phụ thuộc, useCascadingSelect với allowEmptyParent —
// "chưa chọn nông trại" = "mọi nông trại", KHÁC hẳn Tỉnh/Thành -> Phường/Xã
// ở /nong-trai). KHÔNG có modal thêm/sửa lô hàng ở trang này — CRUD thật vẫn
// ở nong-trai-chi-tiet.html (CHƯA migrate), nút Sửa/Xoá trên mỗi thẻ chỉ
// ĐIỀU HƯỚNG sang đó qua mainSiteUrl(). Chế độ chỉ-xem cho platform_admin:
// api.system.batches.list() (không lọc được farm_id/season_id) — ẨN HẲN bộ
// lọc (không phải disable), cột "Đơn vị sở hữu" trên mỗi thẻ, ẨN nút Sửa/Xoá.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { Batch, BatchSystemRow, Farm, Season } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useCascadingSelect } from '../../hooks/useCascadingSelect';
import { useToast } from '../../components/ToastProvider';
import { FETCH_PAGE_SIZE } from './constants';
import { BatchCard } from './BatchCard';
import './filter-card.css';

type ViewState = 'loading' | 'error' | 'data' | 'empty';

export function LoHangPage() {
  const { isPlatformAdmin } = useAuth();
  const { showToast } = useToast();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState('');

  // "Chưa chọn nông trại" (farmId === '') nghĩa là "mọi nông trại" (tải TẤT
  // CẢ mùa vụ), không phải "chưa sẵn sàng" — allowEmptyParent: true, KHÁC
  // cascading Tỉnh/Thành -> Phường/Xã ở /nong-trai (allowEmptyParent mặc
  // định false ở đó).
  const seasonCascade = useCascadingSelect<Season>({
    loadChildren: (parentFarmId) => api.seasons.list({ farm_id: parentFarmId || undefined, page_size: FETCH_PAGE_SIZE }).then((data) => data.items || []),
    getOptionValue: (season) => season.id,
    getOptionLabel: (season) => `${season.code} — ${season.name}`,
    allowEmptyParent: true
  });

  const [items, setItems] = useState<(Batch | BatchSystemRow)[]>([]);
  const [view, setView] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Bộ lọc Nông trại/Mùa vụ ẨN HẲN ở chế độ platform_admin (không phải
  // disable) — api.system.batches.list() không lọc được farm_id/season_id,
  // và tự dựng lại cascading (gọi api.farms.list()/api.seasons.list() thường)
  // sẽ 403 ngay từ bước đổ dữ liệu cho chính bộ lọc đó, xem js/lo-hang.js gốc.
  useEffect(() => {
    if (isPlatformAdmin) return;
    api.farms
      .list({ page_size: FETCH_PAGE_SIZE })
      .then((data) => setFarms(data.items || []))
      .catch((err: unknown) => {
        showToast(`Không tải được danh sách nông trại: ${err instanceof ApiError ? err.message : 'Có lỗi xảy ra.'}`);
      });
    // Điền sẵn select Mùa vụ với TẤT CẢ mùa vụ ngay lúc vào trang — không có
    // dòng này thì select Mùa vụ đứng im (rỗng) cho tới khi người dùng đụng
    // vào select Nông trại, khớp seasonCascade.refresh() gốc gọi trong
    // DOMContentLoaded.
    seasonCascade.refresh('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lại theo isPlatformAdmin, không phải mỗi lần seasonCascade/showToast đổi tham chiếu
  }, [isPlatformAdmin]);

  const loadBatches = useCallback(() => {
    setView('loading');
    const request = isPlatformAdmin
      ? api.system.batches.list({ page_size: FETCH_PAGE_SIZE })
      : api.batches.list({ farm_id: farmId || undefined, season_id: seasonCascade.childValue || undefined, page_size: FETCH_PAGE_SIZE });

    request
      .then((data) => {
        const list = data.items || [];
        setItems(list);
        setView(list.length ? 'data' : 'empty');
      })
      .catch((err: unknown) => {
        setErrorMessage(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
        setView('error');
      });
  }, [isPlatformAdmin, farmId, seasonCascade.childValue]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  function handleFarmChange(nextFarmId: string) {
    setFarmId(nextFarmId);
    // Đổi nông trại bằng tay thì luôn bỏ trống mùa vụ, không giữ nhầm lựa
    // chọn cũ — khớp parentSelect 'change' listener gốc.
    seasonCascade.refresh(nextFarmId);
  }

  return (
    <>
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link className="breadcrumb__link" to="/nong-trai">
          <Icon name="chart-bar" className="icon--sm" />
          Vận hành
        </Link>
        <span className="breadcrumb__sep" aria-hidden="true">
          /
        </span>
        <span className="breadcrumb__current" aria-current="page">
          Lô hàng
        </span>
      </nav>

      <div className="page-header">
        <div className="page-header__icon">
          <Icon name="warehouse" className="icon--lg" />
        </div>
        <div className="page-header__text">
          <h1 className="page-header__title">Quản lý Lô hàng</h1>
          <p className="page-header__meta">
            Tổng số: <strong>{items.length}</strong> lô hàng
          </p>
        </div>
      </div>

      {!isPlatformAdmin && (
        <div className="card filter-card">
          <h2 className="filter-card__title">Bộ lọc</h2>
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="filter-farm">
                Nông trại
              </label>
              <select className="select" id="filter-farm" value={farmId} onChange={(e) => handleFarmChange(e.target.value)}>
                <option value="">Tất cả</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.code} — {farm.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="filter-season">
                Mùa vụ
              </label>
              <select
                className="select"
                id="filter-season"
                disabled={seasonCascade.status === 'loading'}
                value={seasonCascade.childValue}
                onChange={(e) => seasonCascade.setChildValue(e.target.value)}
              >
                <option value="">Tất cả</option>
                {seasonCascade.children.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.code} — {season.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {view === 'loading' && (
        <div className="async-state">
          <span className="spinner spinner--lg"></span>
          <p className="async-state__title">Đang tải danh sách lô hàng...</p>
        </div>
      )}

      {view === 'error' && (
        <div className="async-state async-state--error">
          <Icon name="x-circle" className="icon--lg" />
          <p className="async-state__title">Không tải được danh sách lô hàng</p>
          <p className="async-state__desc">{errorMessage}</p>
          <button type="button" className="btn btn--outline btn--sm" onClick={loadBatches}>
            Thử lại
          </button>
        </div>
      )}

      {view === 'data' && (
        <div className="grid grid--3">
          {items.map((batch) => (
            <BatchCard key={batch.id} batch={batch} isPlatformAdminMode={isPlatformAdmin} />
          ))}
        </div>
      )}

      {view === 'empty' && (
        <div className="empty-state">
          <Icon name="warehouse" className="icon--lg" />
          <p className="empty-state__title">Chưa có lô hàng nào phù hợp</p>
          <p className="empty-state__desc">Đổi lại bộ lọc, hoặc vào trang chi tiết nông trại để thêm lô hàng mới cho một mùa vụ.</p>
        </div>
      )}
    </>
  );
}
