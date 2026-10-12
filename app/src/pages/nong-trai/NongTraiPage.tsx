// Port ĐÚNG nong-trai.html + js/nong-trai.js — danh sách lưới thẻ phân trang
// (PAGE_SIZE=12) + tìm kiếm (debounce) + modal thêm/sửa (form + Tỉnh/Thành→
// Phường/Xã + bản đồ Leaflet vẽ polygon) + xoá qua useConfirm() + permission
// gate (farms.add/edit/delete). Chế độ chỉ-xem cho platform_admin:
// api.system.farms.list() (không có `q`), cột "Đơn vị sở hữu", ô tìm kiếm
// vô hiệu hoá — xem app/CLAUDE.md mục "Trang /nong-trai" về lý do trang này
// KHÔNG có "nút mắt mở modal readonly" như Vật tư/Mẫu quy trình (khác 2
// trang đó, Nông trại có nong-trai-chi-tiet.html RIÊNG để xem — thẻ LUÔN là
// link tới đó, kể cả platform_admin, đúng hành vi gốc).
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { Farm, FarmSystemRow } from '../../api';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { PAGE_SIZE, SEARCH_DEBOUNCE_MS } from './constants';
import { FarmCard } from './FarmCard';
import { FarmFormModal } from './FarmFormModal';

type ViewState = 'loading' | 'error' | 'data' | 'empty';

export function NongTraiPage() {
  const { isPlatformAdmin } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const canAdd = usePermission('farms.add');
  const canEdit = usePermission('farms.edit');
  const canDelete = usePermission('farms.delete');

  const [items, setItems] = useState<(Farm | FarmSystemRow)[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [searchInputValue, setSearchInputValue] = useState('');
  const [view, setView] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const formModal = useDialog<HTMLDialogElement>();

  const loadFarms = useCallback(() => {
    setView('loading');
    // platform_admin: GET /system/farms không có tham số tìm kiếm `q` — ô
    // tìm kiếm đã vô hiệu hoá bên dưới cho chế độ này.
    const request = isPlatformAdmin
      ? api.system.farms.list({ page, page_size: PAGE_SIZE })
      : api.farms.list({ q: query || undefined, page, page_size: PAGE_SIZE });

    request
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setView((data.items || []).length ? 'data' : 'empty');
      })
      .catch((err: unknown) => {
        setErrorMessage(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
        setView('error');
      });
  }, [isPlatformAdmin, page, query]);

  useEffect(() => {
    loadFarms();
  }, [loadFarms]);

  const handleSearchInput = useDebouncedCallback((value: string) => {
    setQuery(value.trim());
    setPage(1);
  }, SEARCH_DEBOUNCE_MS);

  // Gợi ý mã tiếp theo dựa trên tổng số đã tải (listState.total) — chỉ là
  // gợi ý, backend tự kiểm tra trùng mã thật khi lưu, khớp bản gốc.
  function nextSuggestedCode(): string {
    const seq = String(total + 1);
    return `NV${seq.length < 2 ? `0${seq}` : seq}`;
  }

  function openCreate() {
    setModalMode('create');
    setEditingFarm(null);
    formModal.open();
  }

  function openEdit(farm: Farm) {
    setModalMode('edit');
    setEditingFarm(farm);
    formModal.open();
  }

  async function handleDelete(farm: Farm) {
    const confirmed = await confirm(`Xoá nông trại "${farm.name}"? Hành động này không thể hoàn tác.`);
    if (!confirmed) return;
    try {
      await api.farms.remove(farm.id);
      loadFarms();
      showToast('Đã xoá nông trại.');
    } catch (err) {
      // 409: nông trại còn mùa vụ chưa xoá — message tiếng Việt đã có sẵn từ
      // backend, hiển thị thẳng, KHÔNG coi là đã xoá thành công.
      showToast(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const emptyTitle = query ? 'Không tìm thấy nông trại nào' : 'Chưa có nông trại nào';
  const emptyDesc = query
    ? 'Thử lại với từ khoá khác.'
    : 'Nông trại là điểm bắt đầu của mọi lô hàng. Tạo nông trại đầu tiên để bắt đầu ghi nhận mùa vụ và truy xuất nguồn gốc.';

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
          Nông trại
        </span>
      </nav>

      <div className="page-header">
        <div className="page-header__icon">
          <Icon name="seedling" className="icon--lg" />
        </div>
        <div className="page-header__text">
          <h1 className="page-header__title">Danh sách nông trại</h1>
          <p className="page-header__meta">
            Tổng số: <strong>{total}</strong> nông trại
          </p>
        </div>
        {canAdd && (
          <button type="button" className="btn btn--primary btn--lg btn-shine" onClick={openCreate}>
            <Icon name="seedling" className="icon--sm" />
            Thêm nông trại
          </button>
        )}
      </div>

      <div className="search-field" style={{ maxWidth: 360, marginBottom: 'var(--space-5)' }}>
        <Icon name="search" className="search-field__icon" />
        <input
          className="input"
          type="search"
          placeholder={isPlatformAdmin ? 'Không hỗ trợ tìm kiếm ở chế độ Quản trị hệ thống' : 'Tìm theo mã hoặc tên nông trại...'}
          disabled={isPlatformAdmin}
          value={searchInputValue}
          onChange={(e) => {
            setSearchInputValue(e.target.value);
            handleSearchInput(e.target.value);
          }}
        />
      </div>

      {view === 'loading' && (
        <div className="async-state">
          <span className="spinner spinner--lg"></span>
          <p className="async-state__title">Đang tải danh sách nông trại...</p>
        </div>
      )}

      {view === 'error' && (
        <div className="async-state async-state--error">
          <Icon name="x-circle" className="icon--lg" />
          <p className="async-state__title">Không tải được danh sách nông trại</p>
          <p className="async-state__desc">{errorMessage}</p>
          <button type="button" className="btn btn--outline btn--sm" onClick={loadFarms}>
            Thử lại
          </button>
        </div>
      )}

      {view === 'data' && (
        <>
          <div className="grid grid--3">
            {items.map((farm) => (
              <FarmCard
                key={farm.id}
                farm={farm}
                isPlatformAdminMode={isPlatformAdmin}
                canEdit={canEdit}
                canDelete={canDelete}
                onOpenEdit={openEdit}
                onOpenDelete={handleDelete}
              />
            ))}
          </div>

          <div className="pagination">
            <button type="button" className="btn btn--outline btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ‹ Trước
            </button>
            <span className="pagination__info">
              Trang {page} / {totalPages}
            </span>
            <button type="button" className="btn btn--outline btn--sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Sau ›
            </button>
          </div>
        </>
      )}

      {view === 'empty' && (
        <div className="empty-state">
          <Icon name="seedling" className="icon--lg" />
          <p className="empty-state__title">{emptyTitle}</p>
          <p className="empty-state__desc">{emptyDesc}</p>
          {canAdd && (
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              Thêm nông trại
            </button>
          )}
        </div>
      )}

      <FarmFormModal
        dialogRef={formModal.ref}
        mode={modalMode}
        farm={editingFarm}
        suggestedCode={nextSuggestedCode()}
        openToken={formModal.openCount}
        onClose={formModal.close}
        onSaved={loadFarms}
      />
    </>
  );
}
