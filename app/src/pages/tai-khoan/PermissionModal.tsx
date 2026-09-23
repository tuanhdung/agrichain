// Port modal "Phân quyền" (permission-modal) + phần tương ứng của
// js/tai-khoan.js (loadPermissionMatrix/permissionRow/syncViewPermission/
// handlePermissionSave). Phân quyền theo VAI TRÒ của người dùng, KHÔNG phải
// theo từng người — lưu ở đây ảnh hưởng MỌI người dùng cùng vai trò, xem
// notice trong modal.
import { useEffect, useMemo, useState, type RefObject } from 'react';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { OrgUser, Role } from '../../api';
import { useToast } from '../../components/ToastProvider';
import { initials } from './format';
import { ACTIONS, computeManagedCodes, groupPermissions, permissionAt, type MatrixGroup } from './permissionMatrix';
import './permission-table.css';

interface PermissionModalProps {
  dialogRef: RefObject<HTMLDialogElement>;
  user: OrgUser | null;
  openToken: number;
  // usePermission('roles.edit') — savePermissionBtn.hidden gốc còn kiểm thêm
  // điều kiện này ngoài is_system, xem setPermissionView().
  canSave: boolean;
  onClose: () => void;
}

type ViewState = 'loading' | 'error' | 'data';

export function PermissionModal({ dialogRef, user, openToken, canSave, onClose }: PermissionModalProps) {
  const { showToast } = useToast();
  const [view, setView] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [groups, setGroups] = useState<MatrixGroup[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  function load() {
    if (!user) return;
    setView('loading');
    // GET /permissions và GET /roles đều trả về mảng trực tiếp, không phân
    // trang (đã xác nhận qua dữ liệu thật) — không cần bóc .items.
    Promise.all([api.permissions.list(), api.roles.list()])
      .then(([permGroups, roleList]) => {
        const currentRole = roleList.find((r) => r.id === user.role_id) || null;
        if (!currentRole) {
          setErrorMessage('Người dùng này chưa được gán vai trò, hoặc vai trò không còn tồn tại.');
          setView('error');
          return;
        }
        setRole(currentRole);
        setGroups(groupPermissions(permGroups));

        const grantedCodes = currentRole.permissions || [];
        const nextChecked: Record<string, boolean> = {};
        grantedCodes.forEach((code) => {
          nextChecked[code] = true;
        });
        setChecked(nextChecked);
        setView('data');
      })
      .catch((err: unknown) => {
        setErrorMessage(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
        setView('error');
      });
  }

  // Tải lại MỖI LẦN modal thật sự mở cho ĐÚNG người dùng đang xem — khớp
  // openPermissionModal() gốc. Guard `dialogRef.current?.open` + dependency
  // `openToken` (KHÔNG chỉ `user` — mở lại đúng người vừa xem trước đó vẫn
  // phải tải lại, xem bug đã vá ở /nong-trai, ghi trong app/CLAUDE.md).
  useEffect(() => {
    if (!dialogRef.current?.open || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lại theo user/openToken (mở modal)
  }, [user, openToken]);

  const managedCodes = useMemo(() => computeManagedCodes(groups), [groups]);
  const isSystemRole = !!role?.is_system;
  const showSaveButton = view === 'data' && canSave && !isSystemRole;

  function handleToggle(group: MatrixGroup, actionKey: string, nextValue: boolean) {
    if (isSystemRole) return;
    const perm = permissionAt(group, actionKey);
    if (!perm) return;

    setChecked((prev) => {
      const next = { ...prev, [perm.code]: nextValue };
      // Cùng quy tắc trước khi chuyển API: Thêm/Sửa/Xoá không có nghĩa nếu
      // không xem được, nên 2 chiều đều khoá theo Xem.
      if (actionKey === 'view') {
        if (!nextValue) {
          ['add', 'edit', 'delete'].forEach((otherKey) => {
            const other = permissionAt(group, otherKey);
            if (other) next[other.code] = false;
          });
        }
      } else if (nextValue) {
        const viewPerm = permissionAt(group, 'view');
        if (viewPerm) next[viewPerm.code] = true;
      }
      return next;
    });
  }

  function handleSave() {
    if (!role) return;

    const checkedCodes = Object.keys(checked).filter((code) => checked[code] && managedCodes.has(code));
    // Giữ nguyên các quyền của vai trò này nằm NGOÀI lưới đang hiển thị (nhóm
    // lạ/hành động lạ mà backend thêm sau này, KHÔNG khớp 1 trong 4 ACTIONS)
    // — không được vô tình xoá mất khi lưu, xem computeManagedCodes().
    const keptCodes = (role.permissions || []).filter((code) => !managedCodes.has(code));
    const finalCodes = [...keptCodes, ...checkedCodes];

    setSubmitting(true);
    // PATCH /roles/{id} nhận field "permissions" (mảng mã quyền, THAY THẾ
    // TOÀN BỘ danh sách cũ) — đã xác nhận qua /openapi.json thật.
    api.roles
      .update(role.id, { permissions: finalCodes })
      .then(() => {
        onClose();
        showToast('Đã lưu phân quyền.');
      })
      .catch((err: unknown) => {
        showToast(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <dialog className="modal" ref={dialogRef} aria-labelledby="permission-modal-title">
      <div className="modal__header modal__header--info">
        <Icon name="shield-check" />
        <h2 className="modal__title" id="permission-modal-title">
          Phân quyền
        </h2>
        <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
          &times;
        </button>
      </div>

      <div className="permission-person">
        <span className="avatar">{user ? initials(user.full_name) : ''}</span>
        <div>
          <p className="permission-person__name">{user?.full_name}</p>
          <p className="permission-person__email">{user?.email}</p>
        </div>
      </div>

      <div className="modal__body">
        <div className="notice notice--info" style={{ marginBottom: 'var(--space-4)' }}>
          <Icon name="shield-check" className="icon--sm" />
          <span>
            Vai trò: <strong>{role?.name || '—'}</strong> — thay đổi bên dưới áp dụng cho MỌI người dùng đang có cùng
            vai trò này, không chỉ riêng người này.
          </span>
        </div>

        {isSystemRole && (
          <div className="notice notice--warning" style={{ marginBottom: 'var(--space-4)' }}>
            <Icon name="shield-check" className="icon--sm" />
            <span>Đây là vai trò hệ thống, không thể chỉnh sửa quyền.</span>
          </div>
        )}

        {view === 'loading' && (
          <div className="async-state">
            <span className="spinner spinner--lg"></span>
            <p className="async-state__title">Đang tải danh sách quyền...</p>
          </div>
        )}

        {view === 'error' && (
          <div className="async-state async-state--error">
            <Icon name="x-circle" className="icon--lg" />
            <p className="async-state__title">{errorMessage}</p>
            <button type="button" className="btn btn--outline btn--sm" onClick={load}>
              Thử lại
            </button>
          </div>
        )}

        {view === 'data' && (
          <div className="table-wrap">
            <table className="table permission-table">
              <thead>
                <tr>
                  <th scope="col">Phân hệ</th>
                  {ACTIONS.map((action) => (
                    <th key={action.key} scope="col" data-tooltip={action.label}>
                      <Icon name={actionIcon(action.key)} className={`icon--sm icon--${action.key}`} />
                      <span className="sr-only">{action.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.prefix}>
                    <td>
                      <div className="permission-table__module">
                        <Icon name={group.icon} />
                        <span>{group.name}</span>
                      </div>
                    </td>
                    {ACTIONS.map((action) => {
                      const perm = permissionAt(group, action.key);
                      return (
                        <td key={action.key}>
                          <input
                            type="checkbox"
                            className="checkbox__input"
                            aria-label={`Quyền ${action.label.toLowerCase()} phân hệ ${group.name}`}
                            disabled={!perm || isSystemRole}
                            checked={!!(perm && checked[perm.code])}
                            onChange={(e) => handleToggle(group, action.key, e.target.checked)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="modal__footer">
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Huỷ
        </button>
        {showSaveButton && (
          <button type="button" className="btn btn--primary" disabled={submitting} onClick={handleSave}>
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </button>
        )}
      </div>
    </dialog>
  );
}

// Icon riêng cho từng cột tiêu đề (Xem/Thêm/Sửa/Xoá) — khớp bản gốc
// (icon-eye/icon-plus/icon-pencil/icon-x), màu tô qua .icon--view/--add/
// --edit/--delete đã có sẵn trong <style> của tai-khoan.html gốc.
function actionIcon(key: string): string {
  switch (key) {
    case 'view':
      return 'eye';
    case 'add':
      return 'plus';
    case 'edit':
      return 'pencil';
    case 'delete':
      return 'x';
    default:
      return 'shield-check';
  }
}
