// Trang đăng nhập RIÊNG cho SPA — tái dùng NGUYÊN api.auth.login() (đang
// nằm trong src/api/http.ts, gộp lại thành api.auth ở src/api/index.ts,
// KHÔNG viết lại logic gọi API). Markup chỉ dùng class CSS có sẵn từ
// components.css (đã import trong main.tsx): .card, .field, .label, .input,
// .checkbox, .btn--primary, .field__error — không thêm CSS mới, style layout
// (căn giữa) dùng inline style, cùng cách VatTuPage.tsx đã làm cho
// .search-field.
//
// ⚠️ Lý do trang này tồn tại: app.agrichain.org.vn và agrichain.org.vn là 2
// ORIGIN khác nhau, localStorage KHÔNG chia sẻ được giữa chúng — đăng nhập ở
// dang-nhap.html (site chính) không giúp SPA nhận được token. Đây là giải
// pháp TẠM cho giai đoạn pilot/demo (2 vùng có phiên đăng nhập ĐỘC LẬP) —
// xem app/CLAUDE.md mục "Nợ kỹ thuật" để biết đầy đủ, và hướng giải quyết
// dứt điểm (cookie chung Domain=.agrichain.org.vn, việc của backend).
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { resolvePostLoginTarget } from '../../routes/postLogin';
import { ApiError } from '../../api';
import type { AccountType } from '../../api';
import { mainSiteUrl } from '../../api/config';

export function LoginPage() {
  const { login, isLoggedIn, isBootstrapping, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function goToTarget(accountType: AccountType | null | undefined) {
    const target = resolvePostLoginTarget(accountType, redirectParam);
    if (target.type === 'external') {
      // agriverse-3d.html ở site chính (customer) — full navigation, không
      // dùng react-router (route đó không nằm trong SPA).
      window.location.href = target.url;
    } else {
      navigate(target.path, { replace: true });
    }
  }

  // Đã có sẵn phiên đăng nhập (VD gõ thẳng URL /login trong khi vẫn còn
  // đăng nhập, hoặc cookie httpOnly từ site tĩnh vừa xác nhận qua bootstrap —
  // xem AuthContext.tsx) — đá đi luôn theo đúng logic post-login, không hiện
  // lại form. Chờ `isBootstrapping` xong mới kết luận: lúc mount, cookie có
  // thể chưa kịp xác nhận (isLoggedIn/user vẫn rỗng), chạy effect NGAY sẽ bỏ
  // lỡ ca "hoá ra đã đăng nhập" — phụ thuộc `isBootstrapping` để effect tự
  // chạy lại đúng 1 lần nữa khi nó chuyển false. Sau khi submit thành công,
  // handleSubmit tự gọi goToTarget() rồi, không cần effect này chạy lại theo
  // user/isLoggedIn nữa.
  useEffect(() => {
    if (isBootstrapping) return;
    if (isLoggedIn && user) goToTarget(user.account_type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBootstrapping]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = await login(email, password, remember);
      goToTarget(loggedInUser.account_type);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)'
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <div className="card__header">
          <h1 className="card__title">Đăng nhập</h1>
          <p className="card__subtitle">Khu quản trị AgriChain</p>
        </div>

        <div className="card__body">
          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label className="label" htmlFor="login-email">
                Email
              </label>
              <input
                className="input"
                type="email"
                id="login-email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="login-password">
                Mật khẩu
              </label>
              <input
                className="input"
                type="password"
                id="login-password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <label className="checkbox" style={{ marginBottom: 'var(--space-4)' }}>
              <input
                className="checkbox__input"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span className="checkbox__label">Ghi nhớ đăng nhập</span>
            </label>

            {error && <p className="field__error">{error}</p>}

            <button type="submit" className="btn btn--primary btn--lg" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
            Chưa có tài khoản?{' '}
            <a href={mainSiteUrl('dang-ky.html')} style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
              Đăng ký
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
