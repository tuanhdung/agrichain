// Port userRow()/renderUsers() (bảng) trong js/tai-khoan.js gốc — markup/
// class giữ NGUYÊN (.table, .table__name, .table__muted, .table__actions,
// .avatar/.avatar--sm, .badge--neutral). Cột "Hành động" đủ 4 nút, đúng thứ
// tự bản gốc: Sửa/Đặt lại mật khẩu (users.edit), Phân quyền (roles.view),
// Vô hiệu hoá (users.delete).
import { Icon } from '../../icons';
import { initials } from './format';
import type { OrgUser } from '../../api';

interface UserTableProps {
  users: OrgUser[];
  canEdit: boolean;
  canDelete: boolean;
  canViewRoles: boolean;
  onOpenEdit: (user: OrgUser) => void;
  onOpenResetPassword: (user: OrgUser) => void;
  onOpenPermission: (user: OrgUser) => void;
  onDeactivate: (user: OrgUser) => void;
}

export function UserTable({
  users,
  canEdit,
  canDelete,
  canViewRoles,
  onOpenEdit,
  onOpenResetPassword,
  onOpenPermission,
  onDeactivate
}: UserTableProps) {
  return (
    <div className="table-panel">
      <div className="table-panel__header">
        <h2 className="table-panel__title">Danh sách người dùng</h2>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Ảnh đại diện</span>#
              </th>
              <th scope="col">Email</th>
              <th scope="col">Họ tên</th>
              <th scope="col">Vai trò</th>
              <th scope="col">
                <span className="sr-only">Hành động</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <span className="avatar avatar--sm">{initials(user.full_name)}</span>
                </td>
                <td>{user.email}</td>
                <td className="table__name">
                  {user.full_name}
                  {user.is_active === false && <span className="badge badge--neutral">Đã vô hiệu hoá</span>}
                </td>
                <td className="table__muted">{user.role_name || '—'}</td>
                <td>
                  <div className="table__actions">
                    {canEdit && (
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Sửa ${user.full_name}`}
                        data-tooltip="Sửa"
                        onClick={() => onOpenEdit(user)}
                      >
                        <Icon name="pencil" />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Đặt lại mật khẩu cho ${user.full_name}`}
                        data-tooltip="Đặt lại mật khẩu"
                        onClick={() => onOpenResetPassword(user)}
                      >
                        <Icon name="key" />
                      </button>
                    )}
                    {canViewRoles && (
                      <button
                        type="button"
                        className="icon-btn icon-btn--info"
                        aria-label={`Phân quyền cho ${user.full_name}`}
                        data-tooltip="Phân quyền"
                        onClick={() => onOpenPermission(user)}
                      >
                        <Icon name="shield-check" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        aria-label={`Vô hiệu hoá ${user.full_name}`}
                        data-tooltip="Vô hiệu hoá"
                        onClick={() => onDeactivate(user)}
                      >
                        <Icon name="trash" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
