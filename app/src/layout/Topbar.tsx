import { Link } from 'react-router-dom';
import { BRAND_MARK_URL, Icon } from '../icons';
import { useAuth } from '../context/AuthContext';
import { mainSiteUrl } from '../api/config';
import { UserMenu } from './UserMenu';

interface TopbarProps {
  onToggleSidebar: () => void;
  toggleExpanded: boolean;
}

export function Topbar({ onToggleSidebar, toggleExpanded }: TopbarProps) {
  const { user } = useAuth();
  const orgName = user?.full_name || user?.email || 'Tổ chức';

  return (
    <header className="app-topbar">
      <button
        type="button"
        className="app-topbar__toggle"
        aria-controls="app-sidebar"
        aria-expanded={toggleExpanded}
        aria-label="Mở menu"
        onClick={onToggleSidebar}
      >
        <span className="app-topbar__toggle-bar"></span>
        <span className="app-topbar__toggle-bar"></span>
        <span className="app-topbar__toggle-bar"></span>
      </button>

      {/* /nong-trai ĐÃ migrate (xem app/CLAUDE.md) — route NỘI BỘ qua <Link>,
          không còn ra site tĩnh nữa (khác so-cai.html bên dưới, vẫn chưa
          migrate). Logo bundle qua Vite (xem icons.tsx). */}
      <Link className="app-topbar__brand" to="/nong-trai">
        <img className="app-topbar__brand-mark" src={BRAND_MARK_URL} alt="" aria-hidden="true" />
        <span>AgriChain</span>
      </Link>
      <span className="app-topbar__org">
        — <span>{orgName}</span>
      </span>

      <span className="app-topbar__spacer"></span>

      {/* Link "so-cai.html" — port NGUYÊN VĂN từ vat-tu.html gốc. Trang đích
          này KHÔNG tồn tại trong repo (dangling link SẴN CÓ ở bản tĩnh, đã
          xác nhận trước khi port — không phải lỗi phát sinh từ lần migrate
          này) — giữ nguyên để đúng "port y hệt hành vi", không tự ý sửa/xoá. */}
      <a className="btn btn--outline btn--sm" href={mainSiteUrl('so-cai.html')}>
        <Icon name="blockchain" className="icon--sm" />
        Blockchain
      </a>

      <UserMenu />
    </header>
  );
}
