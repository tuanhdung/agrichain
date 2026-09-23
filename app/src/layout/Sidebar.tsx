// Tái tạo ĐÚNG markup/class của .app-sidebar ở vat-tu.html (và 15 trang
// app-shell còn lại) — không thiết kế lại. Chỉ "Vật tư" là route THẬT trong
// SPA (<Link>); mọi mục khác vẫn là <a> trỏ ra trang .html tĩnh cũ ở
// SUBDOMAIN KHÁC (agrichain.org.vn) — full navigation, URL tuyệt đối qua
// mainSiteUrl(), xem app/CLAUDE.md mục "Giả định host".
import { NavLink } from 'react-router-dom';
import { Icon } from '../icons';
import { useAuth } from '../context/AuthContext';
import { useSidebarSections } from '../hooks/useSidebarState';
import { mainSiteUrl } from '../api/config';

interface NavItem {
  href?: string;
  to?: string;
  icon: string;
  label: string;
}

interface NavSectionDef {
  id: string;
  label: string;
  items: NavItem[];
  /** Ẩn hẳn cả nhóm (kể cả tiêu đề) khi trả về true — port
   *  updateDistributorOnlyNav()/updatePlatformAdminOnlyNav() (js/app-shell.js gốc). */
  hidden?: boolean;
}

function useNavSections(): NavSectionDef[] {
  const { isPlatformAdmin } = useAuth();

  return [
    {
      id: 'nav-san-xuat',
      label: 'Hoạt động sản xuất',
      items: [
        { to: '/nong-trai', icon: 'seedling', label: 'Nông trại' },
        { to: '/vat-tu', icon: 'box', label: 'Vật tư' },
        { to: '/mau-quy-trinh', icon: 'workflow', label: 'Mẫu quy trình' },
        { to: '/lo-hang', icon: 'warehouse', label: 'Quản lý lô hàng' }
      ]
    },
    {
      id: 'nav-thuong-mai',
      label: 'Thương mại điện tử',
      // Port updateDistributorOnlyNav(): nhóm này CHỈ dành cho platform_admin.
      hidden: !isPlatformAdmin,
      items: [
        { href: mainSiteUrl('thuong-mai-tong-quan.html'), icon: 'monitor', label: 'Tổng quan' },
        { href: mainSiteUrl('thuong-mai-san-pham.html'), icon: 'box', label: 'Sản phẩm' },
        { href: mainSiteUrl('thuong-mai-don-hang.html'), icon: 'shopping-cart', label: 'Đơn hàng' },
        { href: mainSiteUrl('thuong-mai-van-chuyen.html'), icon: 'truck', label: 'Vận chuyển' },
        { href: mainSiteUrl('thuong-mai-nhap-hang.html'), icon: 'barcode', label: 'Nhập hàng' },
        { href: mainSiteUrl('thuong-mai-may-tinh-tien.html'), icon: 'credit-card', label: 'Máy tính tiền (POS)' },
        { href: mainSiteUrl('thuong-mai-thiet-lap.html'), icon: 'settings', label: 'Thiết lập Shop' }
      ]
    },
    {
      id: 'nav-quan-ly-don-vi',
      label: 'Quản lý Đơn vị',
      items: [
        // Port updatePlatformAdminOnlyNav(): platform_admin không thuộc Đơn
        // vị nào nên KHÔNG có "Quản lý Tài khoản" — lọc mục này ra thẳng khỏi
        // mảng thay vì render rồi ẩn, đơn giản hơn ẩn qua CSS cho 1 mục lẻ.
        ...(!isPlatformAdmin ? [{ to: '/tai-khoan', icon: 'user', label: 'Quản lý Tài khoản' } as NavItem] : []),
        { to: '/goi-phan-mem', icon: 'box', label: 'Gói Phần mềm' },
        { to: '/lich-su-mua-goi', icon: 'file-text', label: 'Lịch sử mua Gói' }
      ]
    }
  ];
}

function NavSection({ section }: { section: NavSectionDef }) {
  const { isOpen, setSectionOpen } = useSidebarSections();
  if (section.hidden) return null;
  const open = isOpen(section.id);

  return (
    <div className="app-nav__section">
      <button
        type="button"
        className="app-nav__section-toggle"
        aria-expanded={open}
        aria-controls={section.id}
        onClick={() => setSectionOpen(section.id, !open)}
      >
        <span className="app-nav__section-label">{section.label}</span>
        <Icon name="chevron-down" className="icon--sm app-nav__section-chevron" />
      </button>
      <ul className="app-nav__list" role="list" id={section.id} hidden={!open}>
        {section.items.map((item) => (
          <li key={item.label}>
            {item.to ? (
              <NavLink className="app-nav__link" to={item.to}>
                <Icon name={item.icon} className="icon--sm" />
                {item.label}
              </NavLink>
            ) : (
              <a className="app-nav__link" href={item.href}>
                <Icon name={item.icon} className="icon--sm" />
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sidebar({ mobileOpen }: { mobileOpen: boolean }) {
  const { user } = useAuth();
  const sections = useNavSections();
  const orgName = user?.full_name || user?.email || 'Tổ chức';
  const initials = orgName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  return (
    <aside className={`app-sidebar${mobileOpen ? ' is-open' : ''}`} id="app-sidebar">
      <div className="app-sidebar__brand">
        <span className="app-sidebar__avatar" aria-hidden="true">
          {initials || '?'}
        </span>
        <span className="app-sidebar__org">{orgName}</span>
      </div>

      <div className="app-sidebar__scroll">
        <nav aria-label="Menu quản trị">
          {sections.map((section) => (
            <NavSection key={section.id} section={section} />
          ))}
        </nav>
      </div>
    </aside>
  );
}
