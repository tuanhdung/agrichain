// Port ĐÚNG vat-tu.html + js/vat-tu.js — danh sách phân trang + tìm kiếm
// (debounce) + modal thêm/sửa/xoá, đủ ràng buộc nghiệp vụ gốc: permission
// gate (supplies.add/edit/delete), chế độ chỉ-xem cho platform_admin
// (api.system.supplies.list(), cột "Đơn vị sở hữu", ô tìm kiếm vô hiệu hoá),
// thông báo lỗi tiếng Việt LẤY THẲNG từ backend (err.message), field
// snake_case đúng SupplyCreate/SupplyUpdate thật. Markup breadcrumb/
// page-header/async-state/empty-state/pagination giữ NGUYÊN class CSS gốc.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { Supply, SupplySystemRow } from '../../api';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { PAGE_SIZE, SEARCH_DEBOUNCE_MS } from './constants';
import { SupplyStats } from './SupplyStats';
import { SupplyTable } from './SupplyTable';
import { SupplyFormModal, type SupplyModalMode } from './SupplyFormModal';
import { DeleteSupplyModal } from './DeleteSupplyModal';

type ViewState = 'loading' | 'error' | 'data' | 'empty';

// Mới cập nhật lên đầu — người dùng vừa sửa gì thì thấy ngay (port nguyên
// văn thứ tự sort trong renderList() gốc).
function sortByRecent<T extends { updated_at: string | null; created_at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''));
}

export function VatTuPage() {
  const { isPlatformAdmin } = useAuth();
  const canAdd = usePermission('supplies.add');
  const canEdit = usePermission('supplies.edit');
  const canDelete = usePermission('supplies.delete');

  const [items, setItems] = useState<(Supply | SupplySystemRow)[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(''); // giá trị đã debounce, dùng để gọi API
  const [searchInputValue, setSearchInputValue] = useState(''); // giá trị gõ tức thời
  const [view, setView] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const [modalMode, setModalMode] = useState<SupplyModalMode>('create');
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const formModal = useDialog();

  const [deletingSupply, setDeletingSupply] = useState<Supply | null>(null);
  const deleteModal = useDialog();

  const loadSupplies = useCallback(() => {
    setView('loading');
    // platform_admin: GET /system/supplies không có tham số tìm kiếm `q` —
    // ô tìm kiếm đã vô hiệu hoá bên dưới cho chế độ này.
    const request = isPlatformAdmin
      ? api.system.supplies.list({ page, page_size: PAGE_SIZE })
      : api.supplies.list({ q: query || undefined, page, page_size: PAGE_SIZE });

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
    loadSupplies();
  }, [loadSupplies]);

  const handleSearchInput = useDebouncedCallback((value: string) => {
    setQuery(value.trim());
    setPage(1);
  }, SEARCH_DEBOUNCE_MS);

  function openCreate() {
    setModalMode('create');
    setEditingSupply(null);
    formModal.open();
  }

  function openEdit(supply: Supply) {
    setModalMode(isPlatformAdmin ? 'view' : 'edit');
    setEditingSupply(supply);
    formModal.open();
  }

  function openDelete(supply: Supply) {
    setDeletingSupply(supply);
    deleteModal.open();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const emptyTitle = query ? 'Không tìm thấy vật tư nào' : 'Chưa có vật tư nào';
  const emptyDesc = query
    ? 'Thử lại với từ khoá khác.'
    : 'Vật tư là những gì được dùng trong từng giai đoạn canh tác. Khai báo ở đây để sau này chọn nhanh khi ghi nhận sự kiện cho lô hàng.';

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
          Vật tư
        </span>
      </nav>

      <div className="page-header">
        <div className="page-header__icon">
          <Icon name="box" className="icon--lg" />
        </div>
        <div className="page-header__text">
          <h1 className="page-header__title">Vật tư</h1>
          <p className="page-header__meta">Quản lý danh sách vật tư nông nghiệp của bạn.</p>
        </div>
        {canAdd && (
          <button type="button" className="btn btn--primary btn--lg btn-shine" onClick={openCreate}>
            <Icon name="plus" className="icon--sm" />
            Thêm vật tư
          </button>
        )}
      </div>

      {(view === 'data' || view === 'empty') && <SupplyStats supplies={items as Supply[]} />}

      <div className="search-field" style={{ maxWidth: 360, marginBottom: 'var(--space-5)' }}>
        <Icon name="search" className="search-field__icon" />
        <input
          className="input"
          type="search"
          placeholder={isPlatformAdmin ? 'Không hỗ trợ tìm kiếm ở chế độ Quản trị hệ thống' : 'Tìm theo mã hoặc tên vật tư...'}
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
          <p className="async-state__title">Đang tải danh sách vật tư...</p>
        </div>
      )}

      {view === 'error' && (
        <div className="async-state async-state--error">
          <Icon name="x-circle" className="icon--lg" />
          <p className="async-state__title">Không tải được danh sách vật tư</p>
          <p className="async-state__desc">{errorMessage}</p>
          <button type="button" className="btn btn--outline btn--sm" onClick={loadSupplies}>
            Thử lại
          </button>
        </div>
      )}

      {view === 'data' && (
        <>
          <SupplyTable
            supplies={sortByRecent(items)}
            isPlatformAdminMode={isPlatformAdmin}
            canEdit={canEdit}
            canDelete={canDelete}
            onOpenEdit={openEdit}
            onOpenDelete={openDelete}
          />

          <div className="pagination">
            <button type="button" className="btn btn--outline btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ‹ Trước
            </button>
            <span className="pagination__info">
              Trang {page} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau ›
            </button>
          </div>
        </>
      )}

      {view === 'empty' && (
        <div className="empty-state">
          <Icon name="box" className="icon--lg" />
          <p className="empty-state__title">{emptyTitle}</p>
          <p className="empty-state__desc">{emptyDesc}</p>
          {canAdd && (
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              Thêm vật tư
            </button>
          )}
        </div>
      )}

      <SupplyFormModal
        dialogRef={formModal.ref}
        mode={modalMode}
        supply={editingSupply}
        onClose={formModal.close}
        onSaved={loadSupplies}
      />

      <DeleteSupplyModal dialogRef={deleteModal.ref} supply={deletingSupply} onClose={deleteModal.close} onDeleted={loadSupplies} />
    </>
  );
}
