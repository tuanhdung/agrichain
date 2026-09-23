// Port modal "Sửa người dùng" (edit-user-modal) + phần tương ứng của
// js/tai-khoan.js (openEditUserModal/handleEditUserSubmit). Modal RIÊNG với
// UserModal.tsx (Thêm) — UserUpdate KHÔNG có email/password (đổi email chưa
// hỗ trợ; đổi mật khẩu đi qua ResetPasswordModal.tsx riêng).
import { useEffect, useState, type FormEvent, type RefObject } from 'react';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { OrgUser, Role } from '../../api';
import { useToast } from '../../components/ToastProvider';

interface EditUserModalProps {
  dialogRef: RefObject<HTMLDialogElement>;
  user: OrgUser | null; // null khi chưa mở lần nào — modal chỉ thật sự mở khi có user
  openToken: number;
  onClose: () => void;
  onSaved: () => void;
}

interface FormValues {
  fullName: string;
  roleId: string;
  phone: string;
  isActive: boolean;
}

const FIELD_MAP: Record<string, keyof FormValues> = {
  full_name: 'fullName',
  role_id: 'roleId',
  phone: 'phone'
};

export function EditUserModal({ dialogRef, user, openToken, onClose, onSaved }: EditUserModalProps) {
  const { showToast } = useToast();
  const [values, setValues] = useState<FormValues>({ fullName: '', roleId: '', phone: '', isActive: true });
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesStatus, setRolesStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [submitting, setSubmitting] = useState(false);

  // Nạp lại giá trị + danh sách vai trò MỚI mỗi lần modal thật sự mở cho ĐÚNG
  // người đang sửa — khớp openEditUserModal() gốc. Guard `dialogRef.current
  // ?.open` + dependency `openToken`: cùng lý do đã ghi ở UserModal.tsx.
  useEffect(() => {
    if (!dialogRef.current?.open || !user) return;
    setErrors({});
    setValues({ fullName: user.full_name, roleId: String(user.role_id), phone: user.phone || '', isActive: user.is_active !== false });
    setRolesStatus('loading');
    api.roles
      .list()
      .then((list) => {
        setRoles(list);
        setRolesStatus('ready');
      })
      .catch((err: unknown) => {
        setRolesStatus('error');
        showToast(err instanceof ApiError ? err.message : 'Không tải được vai trò.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lại theo user/openToken (mở modal), không phải mỗi lần showToast đổi
  }, [user, openToken]);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormValues, string>> = {};
    if (!values.fullName.trim()) next.fullName = 'Nhập họ tên.';
    if (!values.roleId) next.roleId = 'Chọn vai trò.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !validate()) return;

    const payload = {
      full_name: values.fullName.trim(),
      role_id: Number(values.roleId),
      phone: values.phone.trim() || null,
      is_active: values.isActive
    };

    setSubmitting(true);
    api.users
      .update(user.id, payload)
      .then(() => {
        onClose();
        onSaved();
        showToast('Đã cập nhật người dùng.');
      })
      .catch((err: unknown) => {
        const apiErr = err instanceof ApiError ? err : null;
        const rawField = apiErr?.details?.field as string | undefined;
        const field = rawField ? FIELD_MAP[rawField] : undefined;
        if (field) {
          setErrors((prev) => ({ ...prev, [field]: apiErr!.message }));
        } else {
          showToast(apiErr?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
        }
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <dialog className="modal modal--sm" ref={dialogRef} aria-labelledby="edit-user-modal-title">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="modal__header">
          <Icon name="pencil" />
          <h2 className="modal__title" id="edit-user-modal-title">
            Sửa người dùng
          </h2>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal__body">
          <div className="field">
            <label className="label" htmlFor="edit-user-full-name">
              Họ tên
            </label>
            <input
              className="input"
              type="text"
              id="edit-user-full-name"
              aria-invalid={errors.fullName ? 'true' : undefined}
              value={values.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
            />
            {errors.fullName && <p className="field__error">{errors.fullName}</p>}
          </div>

          <div className="field">
            <label className="label" htmlFor="edit-user-role">
              Vai trò
            </label>
            <select
              className="select"
              id="edit-user-role"
              aria-invalid={errors.roleId ? 'true' : undefined}
              disabled={rolesStatus !== 'ready'}
              value={values.roleId}
              onChange={(e) => setField('roleId', e.target.value)}
            >
              {rolesStatus === 'loading' && <option value="">Đang tải vai trò...</option>}
              {rolesStatus === 'error' && <option value="">Không tải được vai trò</option>}
              {rolesStatus === 'ready' &&
                roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
            </select>
            {errors.roleId && <p className="field__error">{errors.roleId}</p>}
          </div>

          <div className="field">
            <label className="label" htmlFor="edit-user-phone">
              Số điện thoại (tuỳ chọn)
            </label>
            <input
              className="input"
              type="tel"
              id="edit-user-phone"
              value={values.phone}
              onChange={(e) => setField('phone', e.target.value)}
            />
          </div>

          <label className="checkbox">
            <input
              className="checkbox__input"
              type="checkbox"
              checked={values.isActive}
              onChange={(e) => setField('isActive', e.target.checked)}
            />
            <span className="checkbox__label">Tài khoản đang hoạt động</span>
          </label>
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
