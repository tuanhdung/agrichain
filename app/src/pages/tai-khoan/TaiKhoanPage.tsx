// Port tai-khoan.html + js/tai-khoan.js — trang thứ 4 migrate, PHỨC TẠP HƠN
// 3 trang trước (RBAC + ma trận quyền + transfer-admin). Đang làm THEO BƯỚC,
// xem app/CLAUDE.md mục "Trang /tai-khoan" để biết tiến độ từng bước.
//
// BƯỚC 1 (2026-09-23): API layer + đọc/hiển thị + chặn platform_admin.
// BƯỚC 2 (2026-09-23): CRUD người dùng — Thêm (UserModal.tsx)/Sửa
// (EditUserModal.tsx)/Đặt lại mật khẩu (ResetPasswordModal.tsx)/Vô hiệu hoá
// (qua useConfirm() đã có, KHÔNG phải modal riêng — khớp bản gốc).
// BƯỚC 3 (2026-09-23): Ma trận phân quyền (PermissionModal.tsx +
// permissionMatrix.ts) — RỦI RO BẢO MẬT CAO NHẤT trong SPA, xem app/CLAUDE.md
// mục "Trang /tai-khoan" để biết checklist test tay riêng.
// BƯỚC 4 (2026-09-23): Nhường quyền quản trị (TransferAdminModal.tsx) — nút
// chỉ hiện khi vai trò CHÍNH người đăng nhập là is_system=true, xem effect
// tính `isOrgAdmin` trong TaiKhoanBusinessView() bên dưới.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { OrgUser } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { useDialog } from '../../hooks/useDialog';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { PAGE_SIZE, SEARCH_DEBOUNCE_MS } from './constants';
import { UserTable } from './UserTable';
import { UserModal } from './UserModal';
import { EditUserModal } from './EditUserModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { PermissionModal } from './PermissionModal';
import { TransferAdminModal } from './TransferAdminModal';

type ViewState = 'loading' | 'error' | 'data' | 'empty';

export function TaiKhoanPage() {
  const { isPlatformAdmin } = useAuth();

  // platform_admin không thuộc Đơn vị nào nên không có người dùng "của Đơn vị
  // mình" để quản lý — mục sidebar dẫn tới trang này đã ẩn (Sidebar.tsx), NHƯNG
  // gõ thẳng URL /tai-khoan vẫn phải không vỡ trang: dừng ở đây, KHÔNG chạy
  // loadUsers() (sẽ 403 hàng loạt vì role platform_admin không có permission
  // nào), khớp đúng nhánh đầu DOMContentLoaded của js/tai-khoan.js gốc.
  if (isPlatformAdmin) {
    return (
      <div className="empty-state">
        <Icon name="user" className="icon--lg" />
        <p className="empty-state__title">Không áp dụng cho tài khoản Quản trị hệ thống</p>
        <p className="empty-state__desc">
          Quản lý Tài khoản quản lý người dùng trong PHẠM VI 1 Đơn vị — tài khoản Quản trị hệ thống không thuộc Đơn vị
          nào nên không có gì để quản lý ở đây.
        </p>
      </div>
    );
  }

  return <TaiKhoanBusinessView />;
}

// Tách riêng component con để KHÔNG vi phạm rule-of-hooks — nhánh
// platform_admin ở trên return sớm TRƯỚC khi gọi bất kỳ hook nào của view
// thường (useState/useEffect/useCallback bên dưới), nên toàn bộ hook đó phải
// nằm trong 1 component luôn chạy đủ số hook giống nhau giữa các lần render.
function TaiKhoanBusinessView() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const canAdd = usePermission('users.add');
  const canEdit = usePermission('users.edit');
  const canDelete = usePermission('users.delete');
  const canViewRoles = usePermission('roles.view');
  const canEditRoles = usePermission('roles.edit');

  const [items, setItems] = useState<OrgUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [searchInputValue, setSearchInputValue] = useState('');
  const [view, setView] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const addModal = useDialog();
  const editModal = useDialog();
  const resetModal = useDialog();
  const permissionModal = useDialog();
  const transferModal = useDialog();
  const [editingUser, setEditingUser] = useState<OrgUser | null>(null);
  const [resetTargetUser, setResetTargetUser] = useState<OrgUser | null>(null);
  const [permissionTargetUser, setPermissionTargetUser] = useState<OrgUser | null>(null);

  // Nút "Nhường quyền quản trị" CHỈ hiện khi vai trò CỦA CHÍNH người đang
  // đăng nhập là is_system=true — `User` (phiên đăng nhập) không có field
  // is_system, phải tự đối chiếu role_id với GET /roles, khớp
  // refreshTransferAdminVisibility() gốc. Chạy lại khi `user` đổi (đăng nhập
  // lại sau Bước 4 chẳng hạn).
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  useEffect(() => {
    if (!user) return;
    api.roles
      .list()
      .then((roleList) => {
        const myRole = roleList.find((role) => role.id === user.role_id);
        setIsOrgAdmin(!!(myRole && myRole.is_system));
      })
      .catch(() => {
        // Không tải được vai trò — giữ ẩn (mặc định false), an toàn hơn là
        // lỡ hiện nhầm cho người không phải Quản trị Đơn vị.
      });
  }, [user]);

  const loadUsers = useCallback(() => {
    setView('loading');
    api.users
      .list({ q: query || undefined, page, page_size: PAGE_SIZE })
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setView((data.items || []).length ? 'data' : 'empty');
      })
      .catch((err: unknown) => {
        setErrorMessage(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
        setView('error');
      });
  }, [page, query]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearchInput = useDebouncedCallback((value: string) => {
    setQuery(value.trim());
    setPage(1);
  }, SEARCH_DEBOUNCE_MS);

  function openEditUser(user: OrgUser) {
    setEditingUser(user);
    editModal.open();
  }

  function openResetPassword(user: OrgUser) {
    setResetTargetUser(user);
    resetModal.open();
  }

  function openPermission(user: OrgUser) {
    setPermissionTargetUser(user);
    permissionModal.open();
  }

  async function handleDeactivate(user: OrgUser) {
    const confirmed = await confirm(
      `Vô hiệu hoá người dùng "${user.full_name}" (${user.email})? Người này sẽ không đăng nhập được nữa, nhưng dữ liệu vẫn được giữ lại.`
    );
    if (!confirmed) return;
    try {
      await api.users.deactivate(user.id);
      loadUsers();
      showToast('Đã vô hiệu hoá người dùng.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const emptyTitle = query ? 'Không tìm thấy người dùng nào' : 'Chưa có người dùng nào';
  const emptyDesc = query
    ? 'Thử lại với từ khoá khác.'
    : 'Thêm người dùng để cấp quyền truy cập vào từng phân hệ của Đơn vị bạn.';

  return (
    <>
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link className="breadcrumb__link" to="/tai-khoan">
          <Icon name="shield-check" className="icon--sm" />
          Quản lý đơn vị
        </Link>
        <span className="breadcrumb__sep" aria-hidden="true">
          /
        </span>
        <span className="breadcrumb__current" aria-current="page">
          Quản lý người dùng trong Đơn vị của bạn
        </span>
      </nav>

      <div className="page-header">
        <div className="page-header__icon">
          <Icon name="user" className="icon--lg" />
        </div>
        <div className="page-header__text">
          <h1 className="page-header__title">Quản lý Người dùng</h1>
          <p className="page-header__meta">Quản lý người dùng trong Đơn vị của bạn.</p>
        </div>
        {isOrgAdmin && (
          <button type="button" className="btn btn--outline btn--lg" onClick={transferModal.open}>
            <Icon name="shield-check" className="icon--sm" />
            Nhường quyền quản trị
          </button>
        )}
        {canAdd && (
          <button type="button" className="btn btn--primary btn--lg btn-shine" onClick={addModal.open}>
            <Icon name="plus" className="icon--sm" />
            Thêm người dùng
          </button>
        )}
      </div>

      <div className="search-field" style={{ maxWidth: 360, marginBottom: 'var(--space-5)' }}>
        <Icon name="search" className="search-field__icon" />
        <input
          className="input"
          type="search"
          placeholder="Tìm theo tên hoặc email..."
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
          <p className="async-state__title">Đang tải danh sách người dùng...</p>
        </div>
      )}

      {view === 'error' && (
        <div className="async-state async-state--error">
          <Icon name="x-circle" className="icon--lg" />
          <p className="async-state__title">Không tải được danh sách người dùng</p>
          <p className="async-state__desc">{errorMessage}</p>
          <button type="button" className="btn btn--outline btn--sm" onClick={loadUsers}>
            Thử lại
          </button>
        </div>
      )}

      {view === 'data' && (
        <>
          <UserTable
            users={items}
            canEdit={canEdit}
            canDelete={canDelete}
            canViewRoles={canViewRoles}
            onOpenEdit={openEditUser}
            onOpenResetPassword={openResetPassword}
            onOpenPermission={openPermission}
            onDeactivate={handleDeactivate}
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
          <Icon name="user" className="icon--lg" />
          <p className="empty-state__title">{emptyTitle}</p>
          <p className="empty-state__desc">{emptyDesc}</p>
          {canAdd && (
            <button type="button" className="btn btn--primary" onClick={addModal.open}>
              Thêm người dùng
            </button>
          )}
        </div>
      )}

      <UserModal dialogRef={addModal.ref} openToken={addModal.openCount} onClose={addModal.close} onSaved={loadUsers} />

      <EditUserModal
        dialogRef={editModal.ref}
        user={editingUser}
        openToken={editModal.openCount}
        onClose={editModal.close}
        onSaved={loadUsers}
      />

      <ResetPasswordModal dialogRef={resetModal.ref} user={resetTargetUser} openToken={resetModal.openCount} onClose={resetModal.close} />

      <PermissionModal
        dialogRef={permissionModal.ref}
        user={permissionTargetUser}
        openToken={permissionModal.openCount}
        canSave={canEditRoles}
        onClose={permissionModal.close}
      />

      <TransferAdminModal dialogRef={transferModal.ref} openToken={transferModal.openCount} onClose={transferModal.close} />
    </>
  );
}
