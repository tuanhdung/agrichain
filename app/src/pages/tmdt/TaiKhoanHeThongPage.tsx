// "Quản lý tài khoản" (nhóm Thương mại điện tử) — người dùng THẬT của MỌI Đơn vị qua `/system/users`
// (customer, business, platform_admin). Chỉ xem: tạo/sửa/vô hiệu hoá tài khoản vẫn làm ở khu quản lý của từng Đơn vị.
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../../icons';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { api, ApiError, type SystemUser, type SystemUserSummary } from '../../api';
import type { SystemAccountType } from '../../api/orders';
import { EmptyBlock, formatDate, PlatformAdminOnly, StatCard, TmdtHeader } from './shared';

const PAGE_SIZE = 20;

const ACCOUNT_TYPES: Record<SystemAccountType, { label: string; cls: string }> = {
  customer: { label: 'Khách hàng', cls: 'badge--info' },
  business: { label: 'Doanh nghiệp / Nông hộ', cls: 'badge--success' },
  platform_admin: { label: 'Quản trị hệ thống', cls: 'badge--warning' }
};

type View = 'loading' | 'data' | 'error';

function TaiKhoanHeThongPageContent() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<SystemUserSummary | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<SystemAccountType | ''>('');
  const [view, setView] = useState<View>('loading');
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setView('loading');
    Promise.all([
      api.system.users.list({ q: query || undefined, account_type: typeFilter || undefined, page, page_size: PAGE_SIZE }),
      api.system.users.summary()
    ])
      .then(([list, counts]) => {
        setUsers(list.items);
        setTotal(list.total);
        setSummary(counts);
        setView('data');
      })
      .catch((err: unknown) => {
        setMessage(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
        setView('error');
      });
  }, [query, typeFilter, page]);

  useEffect(load, [load]);

  const onSearch = useDebouncedCallback((value: string) => {
    setQuery(value.trim());
    setPage(1);
  }, 300);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const count = (type: SystemAccountType) => summary?.by_account_type[type] ?? 0;

  return (
    <>
      <TmdtHeader
        icon="user"
        title="Quản trị người dùng & phân quyền"
        count={summary ? `${summary.total} tài khoản` : undefined}
        meta="Giám sát tài khoản của mọi Đơn vị và khách hàng trên toàn hệ thống."
      />

      <div className="stat-grid">
        <StatCard icon="user" value={summary?.total ?? '—'} label="Tổng người dùng" total />
        <StatCard icon="shopping-cart" value={summary ? count('customer') : '—'} label="Khách hàng" />
        <StatCard icon="factory" value={summary ? count('business') : '—'} label="Doanh nghiệp / Nông hộ" />
        <StatCard icon="shield-check" value={summary ? count('platform_admin') : '—'} label="Quản trị hệ thống" />
      </div>

      <div className="tmdt-toolbar">
        <div className="search-field">
          <Icon name="search" className="search-field__icon" />
          <input
            className="input" type="search" placeholder="Tìm theo họ tên, email, số điện thoại..."
            value={searchInput} onChange={(e) => { setSearchInput(e.target.value); onSearch(e.target.value); }}
          />
        </div>
        <select className="select" value={typeFilter} aria-label="Lọc loại tài khoản" onChange={(e) => { setTypeFilter(e.target.value as SystemAccountType | ''); setPage(1); }}>
          <option value="">Tất cả loại tài khoản</option>
          {Object.entries(ACCOUNT_TYPES).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}
        </select>
      </div>

      {view === 'loading' && (
        <div className="async-state">
          <span className="spinner spinner--lg"></span>
          <p className="async-state__title">Đang tải danh sách tài khoản...</p>
        </div>
      )}

      {view === 'error' && (
        <div className="async-state async-state--error">
          <Icon name="x-circle" className="icon--lg" />
          <p className="async-state__title">Không tải được danh sách tài khoản</p>
          <p className="async-state__desc">{message}</p>
          <button type="button" className="btn btn--outline btn--sm" onClick={load}>Thử lại</button>
        </div>
      )}

      {view === 'data' && users.length === 0 && <EmptyBlock icon="user" title="Không có tài khoản" desc="Thử từ khoá hoặc bộ lọc khác." />}

      {view === 'data' && users.length > 0 && (
        <>
          <div className="table-panel">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Người dùng / Email</th>
                    <th>Số điện thoại</th>
                    <th>Loại tài khoản</th>
                    <th>Đơn vị</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="table__name">{u.full_name}</div>
                        <div className="table__muted">{u.email}</div>
                      </td>
                      <td>{u.phone || '—'}</td>
                      <td><span className={`badge ${ACCOUNT_TYPES[u.account_type].cls}`}>{ACCOUNT_TYPES[u.account_type].label}</span></td>
                      <td>{u.organization_name || '—'}</td>
                      <td>{u.role_name}</td>
                      <td>
                        <span className={`badge ${u.is_active ? 'badge--success' : 'badge--neutral'}`}>
                          {u.is_active ? 'Hoạt động bình thường' : 'Đã vô hiệu hoá'}
                        </span>
                      </td>
                      <td className="table__muted table__nowrap">{formatDate(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pagination">
            <button type="button" className="btn btn--outline btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Trước</button>
            <span className="pagination__info">Trang {page} / {totalPages} ({total} tài khoản)</span>
            <button type="button" className="btn btn--outline btn--sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau ›</button>
          </div>
        </>
      )}
    </>
  );
}

// Chỉ gắn nội dung (và các lời gọi API trong đó) SAU khi đã qua cổng platform_admin — tài khoản khác không
// gửi request nào tới /system/* (vốn chỉ trả 403).
export function TaiKhoanHeThongPage() {
  return (
    <PlatformAdminOnly>
      <TaiKhoanHeThongPageContent />
    </PlatformAdminOnly>
  );
}
