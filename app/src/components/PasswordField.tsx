// Port js/password-field.js gốc (nút hiện/ẩn mật khẩu + danh sách điều kiện
// mật khẩu) — file gốc CỐ TÌNH tách khỏi js/auth.js để dùng chung giữa
// dang-ky.html VÀ modal "Thêm người dùng"/"Đặt lại mật khẩu" ở tai-khoan.html
// (chưa trang đăng ký nào migrate sang app/ nên hiện chỉ trang /tai-khoan
// dùng, nhưng đặt ở components/ dùng chung — KHÔNG đặt trong pages/tai-khoan/
// — đúng tinh thần "sửa 1 chỗ, mọi nơi dùng chung cập nhật theo" của file gốc).
import { useState } from 'react';
import { Icon } from '../icons';

interface Rule {
  key: string;
  label: string;
  test: (value: string) => boolean;
}

const RULES: Rule[] = [
  { key: 'length', label: 'Ít nhất 8 ký tự', test: (v) => v.length >= 8 },
  { key: 'upper', label: '1 chữ hoa', test: (v) => /[A-Z]/.test(v) },
  { key: 'digit', label: '1 chữ số', test: (v) => /[0-9]/.test(v) },
  { key: 'special', label: '1 ký tự đặc biệt', test: (v) => /[^A-Za-z0-9]/.test(v) }
];

/** Port passwordProblems() gốc — dùng cho validate client-side trước khi gửi lên. */
export function passwordProblems(value: string): string[] {
  return RULES.filter((rule) => !rule.test(value)).map((rule) => rule.label.charAt(0).toLowerCase() + rule.label.slice(1));
}

interface PasswordFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'new-password' | 'current-password';
  invalid?: boolean;
  // Mặc định true (khớp Thêm người dùng/Đặt lại mật khẩu — 2 modal ĐẦU TIÊN
  // dùng component này, cả 2 đều có <ul class="password-rules"> trong HTML
  // gốc). ⚠️ KHÔNG phải lúc nào 2 khối cũng đi cùng nhau — modal "Nhường
  // quyền quản trị" chỉ xác nhận MẬT KHẨU HIỆN TẠI (không phải đặt mật khẩu
  // mới), HTML gốc của ô đó KHÔNG có <ul class="password-rules"> — phát hiện
  // khi làm Bước 4, sửa lại giả định sai ban đầu ("2 khối luôn xuất hiện
  // cùng nhau") thay vì lặp lại đúng bug đó. Truyền `showRules={false}` cho
  // ca xác nhận mật khẩu cũ.
  showRules?: boolean;
}

/** Ô mật khẩu + nút hiện/ẩn (.password-field), kèm tuỳ chọn danh sách điều
 *  kiện (.password-rules) — xem `showRules` ở trên để biết khi nào tắt. */
export function PasswordField({ id, value, onChange, autoComplete, invalid, showRules = true }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <div className="password-field">
        <input
          className="input"
          type={visible ? 'text' : 'password'}
          id={id}
          name={id}
          autoComplete={autoComplete}
          required
          aria-invalid={invalid ? 'true' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          onClick={() => setVisible((v) => !v)}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} className="icon--sm" />
        </button>
      </div>

      {showRules && (
        <ul className="password-rules" role="list" aria-live="polite">
          {RULES.map((rule) => (
            <li key={rule.key} className={`password-rule${rule.test(value) ? ' is-met' : ''}`}>
              <Icon name="check-circle" className="icon--sm" />
              {rule.label}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
