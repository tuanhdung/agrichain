// Port tab "Thông tin cá nhân" (#profile-info-form) + handleProfileSubmit()
// của js/ho-so.js gốc — CHỈ 2 field full_name/phone (khớp MeUpdate thật của
// backend, KHÔNG có dob/gender/bio — đã bỏ hẳn từ bản gốc, không tự thêm
// lại). Gọi PATCH /auth/me qua api.auth.updateMe() (ĐÃ có sẵn trong
// src/api/http.ts từ trước, tự giữ nguyên permissions/organization_is_
// distributor cũ và tự lưu vào storage) — KHÔNG dùng api.users.update()
// (PATCH /users/{id}, đòi quyền users.edit mà phần lớn nhân viên không có,
// xem CLAUDE.md phía agrichain-api mục "Tự sửa hồ sơ — PATCH /auth/me").
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ToastProvider';

type FieldName = 'full_name' | 'phone';

export function ProfileInfoForm() {
  const { user, refreshFromStorage } = useAuth();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});

    if (!fullName.trim()) {
      setErrors({ full_name: 'Nhập họ và tên.' });
      return;
    }

    setSubmitting(true);
    api.auth
      .updateMe({ full_name: fullName.trim(), phone: phone.trim() || null })
      .then(() => {
        // updateMe() đã tự lưu user mới vào storage (giữ nguyên permissions/
        // organization_is_distributor cũ, xem http.ts) — chỉ cần đọc lại vào
        // AuthContext để sidebar/topbar hiện tên mới NGAY, không cần đăng
        // nhập lại, khớp renderProfile() gọi lại sau khi lưu ở bản gốc.
        refreshFromStorage();
        showToast('Đã cập nhật hồ sơ.');
      })
      .catch((err: unknown) => {
        const apiErr = err instanceof ApiError ? err : null;
        const field = apiErr?.details?.field as FieldName | undefined;
        if (field === 'full_name' || field === 'phone') {
          setErrors({ [field]: apiErr!.message });
        } else {
          showToast(apiErr?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
        }
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-grid" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="field">
          <label className="label" htmlFor="profile-full-name">
            Họ và tên
          </label>
          <input
            className="input"
            type="text"
            id="profile-full-name"
            aria-invalid={errors.full_name ? 'true' : undefined}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          {errors.full_name && <p className="field__error">{errors.full_name}</p>}
        </div>
        <div className="field">
          <label className="label" htmlFor="profile-phone">
            Số điện thoại
          </label>
          <input
            className="input"
            type="tel"
            id="profile-phone"
            aria-invalid={errors.phone ? 'true' : undefined}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {errors.phone && <p className="field__error">{errors.phone}</p>}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Đang lưu...' : 'Xác nhận'}
        </button>
      </div>
    </form>
  );
}
