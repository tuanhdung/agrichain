// Port modal "Thêm người dùng" (user-modal) + phần tương ứng của
// js/tai-khoan.js (openUserModal/populateRoleSelect/validateUserClientSide/
// handleUserSubmit). Markup/class giữ NGUYÊN (.modal.modal--sm, .field,
// .password-field, .password-rules, .field__hint).
import { useEffect, useState, type FormEvent, type RefObject } from 'react';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { Role } from '../../api';
import { useToast } from '../../components/ToastProvider';
import { PasswordField, passwordProblems } from '../../components/PasswordField';

interface UserModalProps {
  dialogRef: RefObject<HTMLDialogElement>;
  // Tăng mỗi lần dialog THẬT SỰ mở (formModal.openCount, xem useDialog.ts) —
  // dùng làm dependency ép effect nạp lại danh sách vai trò/reset form chạy
  // lại ĐÚNG 1 lần mỗi lần mở, kể cả khi không có prop nào khác đổi giá trị
  // (bài học rút ra từ bug Leaflet ở /nong-trai — xem app/CLAUDE.md).
  openToken: number;
  onClose: () => void;
  onSaved: () => void;
}

interface FormValues {
  email: string;
  fullName: string;
  roleId: string; // '' = chưa chọn — ép người tạo chọn rõ ràng, khớp bản gốc
  phone: string;
  password: string;
}

const EMPTY_VALUES: FormValues = { email: '', fullName: '', roleId: '', phone: '', password: '' };

// Ánh xạ field lỗi backend (details.field, khớp UserCreate thật) sang key
// của FormValues — không cần bảng tra id DOM như bản .js gốc.
const FIELD_MAP: Record<string, keyof FormValues> = {
  email: 'email',
  full_name: 'fullName',
  password: 'password',
  role_id: 'roleId',
  phone: 'phone'
};

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function UserModal({ dialogRef, openToken, onClose, onSaved }: UserModalProps) {
  const { showToast } = useToast();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesStatus, setRolesStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [submitting, setSubmitting] = useState(false);

  // Danh sách vai trò rất nhỏ (không phân trang) nên tải MỚI mỗi lần mở modal
  // thay vì cache — tránh hiện vai trò đã lỗi thời nếu ai đó vừa đổi tên vai
  // trò qua modal Phân quyền, khớp populateRoleSelect() gốc. Chỉ chạy khi
  // dialog THẬT SỰ vừa mở (openToken đổi), không chạy lúc component mount khi
  // <dialog> còn đóng.
  useEffect(() => {
    if (!dialogRef.current?.open) return;
    setValues(EMPTY_VALUES);
    setErrors({});
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lại theo openToken (mở modal), không phải mỗi lần showToast đổi
  }, [openToken]);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormValues, string>> = {};
    if (!isEmail(values.email.trim())) next.email = 'Nhập email hợp lệ.';
    if (!values.fullName.trim()) next.fullName = 'Nhập họ tên.';
    if (!values.roleId) next.roleId = 'Chọn vai trò.';
    const missing = passwordProblems(values.password);
    if (missing.length) next.password = `Mật khẩu còn thiếu: ${missing.join(', ')}.`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    const phone = values.phone.trim();
    const payload = {
      email: values.email.trim(),
      full_name: values.fullName.trim(),
      password: values.password,
      role_id: Number(values.roleId),
      ...(phone ? { phone } : {})
    };

    setSubmitting(true);
    api.users
      .create(payload)
      .then(() => {
        onClose();
        onSaved();
        showToast('Đã thêm người dùng.');
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
    <dialog className="modal modal--sm" ref={dialogRef} aria-labelledby="user-modal-title">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="modal__header">
          <Icon name="user" />
          <h2 className="modal__title" id="user-modal-title">
            Thêm người dùng
          </h2>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal__body">
          <div className="field">
            <label className="label" htmlFor="user-email">
              Email
            </label>
            <input
              className="input"
              type="email"
              id="user-email"
              aria-invalid={errors.email ? 'true' : undefined}
              value={values.email}
              onChange={(e) => setField('email', e.target.value)}
            />
            {errors.email && <p className="field__error">{errors.email}</p>}
          </div>

          <div className="field">
            <label className="label" htmlFor="user-full-name">
              Họ tên
            </label>
            <input
              className="input"
              type="text"
              id="user-full-name"
              aria-invalid={errors.fullName ? 'true' : undefined}
              value={values.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
            />
            {errors.fullName && <p className="field__error">{errors.fullName}</p>}
          </div>

          <div className="field">
            <label className="label" htmlFor="user-role">
              Vai trò
            </label>
            <select
              className="select"
              id="user-role"
              aria-invalid={errors.roleId ? 'true' : undefined}
              disabled={rolesStatus !== 'ready'}
              value={values.roleId}
              onChange={(e) => setField('roleId', e.target.value)}
            >
              {rolesStatus === 'loading' && <option value="">Đang tải vai trò...</option>}
              {rolesStatus === 'error' && <option value="">Không tải được vai trò</option>}
              {rolesStatus === 'ready' && (
                <>
                  <option value="">-- Chọn vai trò --</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            {errors.roleId && <p className="field__error">{errors.roleId}</p>}
          </div>

          <div className="field">
            <label className="label" htmlFor="user-phone">
              Số điện thoại (tuỳ chọn)
            </label>
            <input className="input" type="tel" id="user-phone" value={values.phone} onChange={(e) => setField('phone', e.target.value)} />
          </div>

          <div className="field">
            <label className="label" htmlFor="user-password">
              Mật khẩu
            </label>
            <PasswordField
              id="user-password"
              autoComplete="new-password"
              value={values.password}
              invalid={!!errors.password}
              onChange={(value) => setField('password', value)}
            />
          </div>
          {errors.password && <p className="field__error">{errors.password}</p>}

          <p className="field__hint">
            Mật khẩu này được gửi thẳng tới máy chủ để tạo tài khoản đăng nhập thật cho người dùng — khác với các trang
            chưa chuyển sang backend, ở đây không còn là dữ liệu demo.
          </p>
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Đang lưu...' : 'Thêm người dùng'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
