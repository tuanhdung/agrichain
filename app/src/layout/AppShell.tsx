// Tái tạo khung .app-shell (sidebar + topbar + .app-scrim) dùng chung cho 16
// trang app-shell gốc — markup/class y hệt (aside.app-sidebar,
// header.app-topbar, main.app-main > div.app-content), hành vi hamburger
// port qua useAppShellSidebar() (xem hook đó để biết chi tiết). Trang cụ thể
// (VD VatTuPage) truyền nội dung của nó qua `children`, tự chứa breadcrumb +
// page-header + phần thân trang — AppShell không biết gì về nghiệp vụ từng
// trang, đúng vai trò "khung" như app-shell.css/app-shell.js gốc.
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAppShellSidebar } from '../hooks/useAppShellSidebar';
import { ToastProvider } from '../components/ToastProvider';
import { ConfirmDialogProvider } from '../components/ConfirmDialogProvider';

export function AppShell({ children }: { children: ReactNode }) {
  const { mobileOpen, toggle, closeMobile, toggleExpanded } = useAppShellSidebar();

  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <div className={`app-scrim${mobileOpen ? ' is-visible' : ''}`} onClick={closeMobile}></div>

        <Sidebar mobileOpen={mobileOpen} />

        <Topbar onToggleSidebar={toggle} toggleExpanded={toggleExpanded} />

        <main className="app-main">
          <div className="app-content">{children}</div>
        </main>
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}
