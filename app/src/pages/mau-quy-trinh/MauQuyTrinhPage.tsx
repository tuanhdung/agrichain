// Port ĐÚNG mau-quy-trinh.html + js/mau-quy-trinh.js — danh sách phân trang
// (lưới .grid.grid--3, KHÔNG phải bảng) + tìm kiếm (debounce) + modal
// thêm/sửa (tên/mô tả + steps[] sắp xếp được) + xoá qua AgriChain.confirm()
// (KHÔNG phải modal xoá riêng như vat-tu) + permission gate
// (workflow_templates.add/edit/delete/view). Chế độ chỉ-xem cho
// platform_admin: api.system.workflowTemplates.list() (không có `q`), cột
// "Đơn vị sở hữu", ô tìm kiếm vô hiệu hoá, nút Sửa đổi icon con mắt LUÔN
// hiện mở modal readOnly. Markup breadcrumb/page-header/async-state/
// empty-state/pagination giữ NGUYÊN class CSS gốc.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { Supply, WorkflowTemplate, WorkflowTemplateSystemRow } from '../../api';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../hooks/useDialog';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { PAGE_SIZE, SEARCH_DEBOUNCE_MS } from './constants';
import { TemplateCard } from './TemplateCard';
import { TemplateFormModal, type TemplateModalMode } from './TemplateFormModal';

type ViewState = 'loading' | 'error' | 'data' | 'empty';

export function MauQuyTrinhPage() {
  const { isPlatformAdmin } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const canAdd = usePermission('workflow_templates.add');
  const canEdit = usePermission('workflow_templates.edit');
  const canDelete = usePermission('workflow_templates.delete');

  const [items, setItems] = useState<(WorkflowTemplate | WorkflowTemplateSystemRow)[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [searchInputValue, setSearchInputValue] = useState('');
  const [view, setView] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Vật tư — tải 1 lần lúc trang khởi động, dùng chung cho dropdown "Chỉ
  // định vật tư cụ thể" của mọi bước mở trong modal (giống bản gốc). Bỏ qua
  // hẳn với platform_admin — GET /supplies đòi quyền supplies.view mà
  // platform_admin không có (403 vô ích nếu gọi, modal cũng đã ở readOnly).
  const [supplies, setSupplies] = useState<Supply[]>([]);
  useEffect(() => {
    if (isPlatformAdmin) return;
    api.supplies
      .list({ page_size: 100 })
      .then((data) => setSupplies(data.items || []))
      .catch((err: unknown) => {
        showToast(`Không tải được danh sách vật tư: ${err instanceof ApiError ? err.message : 'Có lỗi xảy ra.'}`);
      });
  }, [isPlatformAdmin, showToast]);

  const [modalMode, setModalMode] = useState<TemplateModalMode>('create');
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const formModal = useDialog();

  const loadTemplates = useCallback(() => {
    setView('loading');
    // platform_admin: GET /system/workflow-templates không có tham số tìm
    // kiếm `q` — ô tìm kiếm đã vô hiệu hoá bên dưới cho chế độ này.
    const request = isPlatformAdmin
      ? api.system.workflowTemplates.list({ page, page_size: PAGE_SIZE })
      : api.workflowTemplates.list({ q: query || undefined, page, page_size: PAGE_SIZE });

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
    loadTemplates();
  }, [loadTemplates]);

  const handleSearchInput = useDebouncedCallback((value: string) => {
    setQuery(value.trim());
    setPage(1);
  }, SEARCH_DEBOUNCE_MS);

  function openCreate() {
    setModalMode('create');
    setEditingTemplate(null);
    formModal.open();
  }

  function openEdit(template: WorkflowTemplate) {
    setModalMode(isPlatformAdmin ? 'view' : 'edit');
    setEditingTemplate(template);
    formModal.open();
  }

  async function handleDelete(template: WorkflowTemplate) {
    const confirmed = await confirm(`Xoá mẫu quy trình "${template.name}"? Hành động này không thể hoàn tác.`);
    if (!confirmed) return;
    try {
      await api.workflowTemplates.remove(template.id);
      loadTemplates();
      showToast('Đã xoá mẫu quy trình.');
    } catch (err) {
      // Sửa/xoá mẫu KHÔNG ảnh hưởng mùa vụ đã áp dụng nó trước đó (mùa vụ
      // lưu bản chụp riêng ở seasons.workflow_steps[]) — 409 ở đây (nếu có)
      // không phải vì "đang được dùng", hiện đúng message backend trả.
      showToast(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const emptyTitle = query ? 'Không tìm thấy mẫu quy trình nào' : 'Chưa có Mẫu Quy Trình nào';
  const emptyDesc = query
    ? 'Thử lại với từ khoá khác.'
    : 'Tạo mẫu quy trình chuẩn gồm các bước bón phân, tưới tiêu, bón lót, thu hoạch... để nông dân thực hiện theo trên App.';

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
          Mẫu quy trình
        </span>
      </nav>

      <div className="page-header">
        <div className="page-header__icon">
          <Icon name="workflow" className="icon--lg" />
        </div>
        <div className="page-header__text">
          <h1 className="page-header__title">Mẫu Quy Trình Mùa Vụ (Enterprise)</h1>
          <p className="page-header__meta">
            Tự thiết kế quy trình sản xuất chuẩn hoá để áp dụng tự động cho các mùa vụ gieo trồng. Tổng số: <strong>{total}</strong> mẫu.
          </p>
        </div>
        {canAdd && (
          <button type="button" className="btn btn--primary btn--lg btn-shine" onClick={openCreate}>
            <Icon name="plus" className="icon--sm" />
            Tạo quy trình mới
          </button>
        )}
      </div>

      <div className="search-field" style={{ maxWidth: 360, marginBottom: 'var(--space-5)' }}>
        <Icon name="search" className="search-field__icon" />
        <input
          className="input"
          type="search"
          placeholder={isPlatformAdmin ? 'Không hỗ trợ tìm kiếm ở chế độ Quản trị hệ thống' : 'Tìm theo tên mẫu quy trình...'}
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
          <p className="async-state__title">Đang tải danh sách mẫu quy trình...</p>
        </div>
      )}

      {view === 'error' && (
        <div className="async-state async-state--error">
          <Icon name="x-circle" className="icon--lg" />
          <p className="async-state__title">Không tải được danh sách mẫu quy trình</p>
          <p className="async-state__desc">{errorMessage}</p>
          <button type="button" className="btn btn--outline btn--sm" onClick={loadTemplates}>
            Thử lại
          </button>
        </div>
      )}

      {view === 'data' && (
        <>
          <div className="grid grid--3">
            {items.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
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
          <Icon name="workflow" className="icon--lg" />
          <p className="empty-state__title">{emptyTitle}</p>
          <p className="empty-state__desc">{emptyDesc}</p>
          {canAdd && (
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              Tạo ngay quy trình đầu tiên
            </button>
          )}
        </div>
      )}

      <TemplateFormModal
        dialogRef={formModal.ref}
        mode={modalMode}
        template={editingTemplate}
        supplies={supplies}
        onClose={formModal.close}
        onSaved={loadTemplates}
      />
    </>
  );
}
