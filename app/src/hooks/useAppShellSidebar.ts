// Port setupSidebar() (js/app-shell.js gốc) — nút hamburger làm 2 việc khác
// nhau tuỳ độ rộng màn hình (xem CLAUDE.md gốc mục "Khung quản trị (app-shell)
// — sidebar & menu tài khoản"):
//   - Dưới 960px: trượt sidebar ra ĐÈ LÊN nội dung (overlay + .app-scrim).
//   - Từ 960px: THU GỌN HẲN sidebar cố định (.is-sidebar-collapsed trên
//     .app-shell) — bật class này trên <body> (KHÔNG phải 1 phần tử con) vì
//     CSS thật targeting đúng `.app-shell.is-sidebar-collapsed .app-topbar`
//     (xem css/app-shell.css) — body vẫn giữ class "app-shell" tĩnh trong
//     app/index.html, hook này chỉ toggle THÊM class is-sidebar-collapsed.
// Trạng thái thu gọn (desktop) nhớ qua localStorage — xem useSidebarState.ts.
import { useCallback, useEffect, useState } from 'react';
import { useSidebarCollapsed } from './useSidebarState';

const DESKTOP_QUERY = '(min-width: 960px)';

export function useAppShellSidebar() {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Đồng bộ class is-sidebar-collapsed lên <body class="app-shell"> — cùng
  // phần tử mà css/app-shell.css nhắm tới (querySelector('.app-shell') ở
  // bản .js gốc TRẢ VỀ CHÍNH body, không phải 1 wrapper con).
  useEffect(() => {
    document.body.classList.toggle('is-sidebar-collapsed', collapsed);
  }, [collapsed]);

  // Kéo cửa sổ rộng ra thì sidebar thành cố định — dọn trạng thái overlay
  // mobile để lớp phủ không kẹt lại che nội dung, khớp đúng bản gốc.
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    function onChange(event: MediaQueryListEvent) {
      if (event.matches) setMobileOpen(false);
    }
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const toggle = useCallback(() => {
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      setCollapsed(!collapsed);
      return;
    }
    setMobileOpen((prev) => !prev);
  }, [collapsed, setCollapsed]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // aria-expanded của nút hamburger: ở desktop nghĩa là "sidebar đang xổ ra"
  // (ngược với collapsed); ở mobile nghĩa là overlay đang mở — khớp đúng
  // logic gốc (chỉ set 1 giá trị, không tách 2 nhánh hiển thị khác nhau).
  const toggleExpanded = window.matchMedia(DESKTOP_QUERY).matches ? !collapsed : mobileOpen;

  return { collapsed, mobileOpen, toggle, closeMobile, toggleExpanded };
}
