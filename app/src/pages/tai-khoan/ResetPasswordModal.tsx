// Port modal "Đặt lại mật khẩu" (reset-password-modal) + phần tương ứng của
// js/tai-khoan.js (openResetPasswordModal/handleResetPasswordSubmit) —
// POST /users/{id}/reset-password, quản trị viên đặt THẲNG mật khẩu mới,
// không cần biết mật khẩu cũ (khác đổi mật khẩu của CHÍNH mình ở ho-so.html).
import { useEffect, useState, type FormEvent, type RefObject } from 'react';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { OrgUser } from '../../api';
import { useToast } from '../../components/ToastProvider';
import { PasswordField, passwordProblems } from '../../components/PasswordField';

interface ResetPasswordModalProps {
  dialogRef: RefObject<HTMLDialogElement>;
  user: OrgUser | null;
  openToken: number;
  onClose: () => void;
}

export function ResetPasswordModal({ dialogRef, user, openToken, onClose }: ResetPasswordModalProps) {
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form mỗi lần modal thật sự mở cho ĐÚNG người đang đặt lại mật khẩu
  // — khớp openResetPasswordModal() gốc.
  useEffect(() => {
    if (!dialogRef.current?.open) return;
    setPassword('');
    setError('');
  }, [openToken]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    const missing = passwordProblems(password);
    if (missing.length) {
      setError(`Mật khẩu còn thiếu: ${missing.join(', ')}.`);
      return;
    }

    setSubmitting(true);
    api.users
      .resetPassword(user.id, password)
      .then(() => {
        onClose();
        showToast('Đã đặt lại mật khẩu.');
      })
      .catch((err: unknown) => {
        showToast(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <dialog className="modal modal--sm" ref={dialogRef} aria-labelledby="reset-password-modal-title">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="modal__header">
          <Icon name="key" />
          <h2 className="modal__title" id="reset-password-modal-title">
            Đặt lại mật khẩu
          </h2>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal__body">
          <p className="field__hint" style={{ marginBottom: 'var(--space-4)' }}>
            Đặt mật khẩu mới cho <strong>{user?.full_name}</strong> — không cần biết mật khẩu cũ. Mọi phiên đăng nhập
            trước đó của người này sẽ bị đăng xuất.
          </p>

          <div className="field">
            <label className="label" htmlFor="reset-password-input">
              Mật khẩu mới
            </label>
            <PasswordField id="reset-password-input" autoComplete="new-password" value={password} invalid={!!error} onChange={setPassword} />
          </div>
          {error && <p className="field__error">{error}</p>}
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
