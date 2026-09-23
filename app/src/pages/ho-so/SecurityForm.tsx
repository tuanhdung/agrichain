// Port tab "Bảo mật" (#profile-security-form) + handlePasswordSubmit() của
// js/ho-so.js gốc — POST /auth/change-password qua api.auth.changePassword()
// (ĐÃ có sẵn trong src/api/http.ts từ trước, TỰ lưu lại TokenPair mới trả về
// — backend thu hồi hết refresh token cũ khi đổi mật khẩu, không lưu cặp
// token mới thì lần refresh tiếp theo của phiên hiện tại sẽ thất bại, tự
// đăng xuất oan ngay sau khi vừa đổi mật khẩu thành công). KHÁC
// api.users.resetPassword() (dành cho admin đặt lại mật khẩu NGƯỜI KHÁC,
// không cần mật khẩu cũ) — không dùng nhầm cho ca tự đổi mật khẩu này.
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api';
import { useToast } from '../../components/ToastProvider';
import { PasswordField, passwordProblems } from '../../components/PasswordField';

interface FormErrors {
  old?: string;
  new?: string;
  confirm?: string;
}

export function SecurityForm() {
  const { showToast } = useToast();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});

    if (!oldPassword) {
      setErrors({ old: 'Nhập mật khẩu hiện tại.' });
      return;
    }
    const missing = passwordProblems(newPassword);
    if (missing.length) {
      setErrors({ new: `Mật khẩu cần thêm: ${missing.join(', ')}.` });
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrors({ confirm: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    setSubmitting(true);
    api.auth
      .changePassword(oldPassword, newPassword)
      .then(() => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Đã đổi mật khẩu.');
      })
      .catch((err: unknown) => {
        const apiErr = err instanceof ApiError ? err : null;
        // details.field: 'old_password' (sai mật khẩu hiện tại) hoặc
        // 'new_password' (không đạt quy tắc độ mạnh) — khớp
        // ChangePasswordRequest thật.
        if (apiErr?.details?.field === 'old_password') {
          setErrors({ old: apiErr.message });
        } else if (apiErr?.details?.field === 'new_password') {
          setErrors({ new: apiErr.message });
        } else {
          showToast(apiErr?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
        }
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-grid" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="field form-grid__full">
          <label className="label" htmlFor="profile-current-password">
            Mật khẩu hiện tại
          </label>
          {/* KHÔNG có danh sách điều kiện mật khẩu — xác nhận mật khẩu ĐÃ
              CÓ, không phải đặt mật khẩu mới, khớp HTML gốc. */}
          <PasswordField
            id="profile-current-password"
            autoComplete="current-password"
            showRules={false}
            value={oldPassword}
            invalid={!!errors.old}
            onChange={setOldPassword}
          />
          {errors.old && <p className="field__error">{errors.old}</p>}
        </div>

        <div className="field">
          <label className="label" htmlFor="profile-new-password">
            Mật khẩu mới
          </label>
          {/* Đây LÀ đặt mật khẩu mới — showRules mặc định true, khác ca
              transfer-admin (xác nhận mật khẩu cũ). */}
          <PasswordField
            id="profile-new-password"
            autoComplete="new-password"
            value={newPassword}
            invalid={!!errors.new}
            onChange={setNewPassword}
          />
          {errors.new && <p className="field__error">{errors.new}</p>}
        </div>

        <div className="field">
          <label className="label" htmlFor="profile-confirm-password">
            Xác nhận mật khẩu mới
          </label>
          <PasswordField
            id="profile-confirm-password"
            autoComplete="new-password"
            showRules={false}
            value={confirmPassword}
            invalid={!!errors.confirm}
            onChange={setConfirmPassword}
          />
          {errors.confirm && <p className="field__error">{errors.confirm}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Đang lưu...' : 'Đổi mật khẩu'}
        </button>
      </div>
    </form>
  );
}
