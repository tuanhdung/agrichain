// Phần dùng chung của 6 trang quản trị TMĐT: khung chỉ-dành-cho-platform_admin, tiêu đề trang,
// định dạng tiền/ngày, nhãn trạng thái đơn hàng.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../icons';
import { useAuth } from '../../context/AuthContext';
import type { OrderStatus, PaymentStatus } from '../../api';
import './tmdt.css';

export const money = (n: number) => n.toLocaleString('vi-VN') + ' đ';

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  received: { label: 'Đã tiếp nhận', cls: 'badge--info' },
  packing: { label: 'Chờ đóng gói', cls: 'badge--warning' },
  shipping: { label: 'Xe lạnh đang giao', cls: 'badge--info' },
  delivered: { label: 'Đã giao', cls: 'badge--success' },
  cancelled: { label: 'Đã huỷ', cls: 'badge--danger' }
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; cls: string }> = {
  unpaid: { label: 'Chờ thanh toán', cls: 'badge--warning' },
  paid: { label: 'Đã thanh toán', cls: 'badge--success' }
};

/** Cả nhóm menu "Thương mại điện tử" CHỈ dành cho platform_admin (khớp Sidebar.tsx). */
export function PlatformAdminOnly({ children }: { children: ReactNode }) {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) {
    return (
      <div className="empty-state">
        <Icon name="shield-check" className="icon--lg" />
        <p className="empty-state__title">Chỉ dành cho Quản trị hệ thống</p>
        <p className="empty-state__desc">Nhóm Thương mại điện tử chỉ mở cho tài khoản Quản trị hệ thống.</p>
        <Link className="btn btn--primary" to="/nong-trai">
          Về khu quản lý
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

interface TmdtHeaderProps {
  icon: string;
  title: string;
  meta: string;
  count?: string;
  actions?: ReactNode;
}

export function TmdtHeader({ icon, title, meta, count, actions }: TmdtHeaderProps) {
  return (
    <>
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link className="breadcrumb__link" to="/tmdt/tong-quan">
          <Icon name="shopping-cart" className="icon--sm" />
          Thương mại điện tử
        </Link>
        <span className="breadcrumb__sep" aria-hidden="true">
          /
        </span>
        <span className="breadcrumb__current" aria-current="page">
          {title}
        </span>
      </nav>

      <div className="page-header">
        <div className="page-header__icon">
          <Icon name={icon} className="icon--lg" />
        </div>
        <div className="page-header__text">
          <h1 className="page-header__title">
            {title} {count && <span className="badge badge--success tmdt-count">{count}</span>}
          </h1>
          <p className="page-header__meta">{meta}</p>
        </div>
        {actions}
      </div>
    </>
  );
}

export function StatCard({ icon, value, label, total }: { icon: string; value: string | number; label: string; total?: boolean }) {
  return (
    <div className={`stat-card tmdt-stat${total ? ' stat-card--total' : ''}`}>
      <div className="stat-card__icon">
        <Icon name={icon} className="icon--lg" />
      </div>
      <div>
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
      </div>
    </div>
  );
}

export function EmptyBlock({ icon, title, desc, children }: { icon: string; title: string; desc: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <Icon name={icon} className="icon--lg" />
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__desc">{desc}</p>
      {children}
    </div>
  );
}
