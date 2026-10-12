// Test trang "Quản lý đơn hàng" (nhóm TMĐT): chỉ platform_admin, đọc đơn THẬT qua API, lọc gọi lại API
// với đúng tham số, lỗi tải hiện thông báo + nút "Thử lại". Mock `api` và `useAuth` — không gọi mạng.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AdminOrder, OrderStats } from '../../api';

const { list, stats, auth } = vi.hoisted(() => ({
  list: vi.fn(),
  stats: vi.fn(),
  auth: { isPlatformAdmin: true }
}));

vi.mock('../../api', async () => {
  const real = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...real, api: { system: { orders: { list, stats, update: vi.fn() } } } };
});
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));

import { ApiError } from '../../api';
import { ToastProvider } from '../../components/ToastProvider';
import { DonHangPage } from './DonHangPage';

function order(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: 'o1',
    code: 'AGR-2026-1001',
    status: 'received',
    payment_method: 'cod',
    payment_status: 'unpaid',
    subtotal: 300000,
    shipping_fee: 30000,
    total: 330000,
    receiver_name: 'Nguyễn Văn An',
    receiver_phone: '0912345678',
    receiver_email: null,
    province: 'Thành phố Hồ Chí Minh',
    ward: 'Phường Bến Nghé',
    detail: '128 Hai Bà Trưng',
    note: null,
    created_at: '2026-10-10T01:00:00Z',
    updated_at: '2026-10-10T01:00:00Z',
    items: [{ id: 'i1', product_id: 'p1', product_name: 'Gạo ST25', unit: 'kg', unit_price: 100000, quantity: 3 }],
    events: [{ status: 'received', created_at: '2026-10-10T01:00:00Z' }],
    user_id: 'u1',
    customer_name: 'An',
    customer_email: 'an@example.com',
    ...overrides
  };
}

const STATS: OrderStats = {
  total_orders: 7,
  revenue_total: 1000000,
  revenue_delivered: 400000,
  customers: 3,
  by_status: { received: 2, packing: 1, shipping: 4 },
  by_day: []
};

/** Giá trị của ô thống kê có nhãn `label` (nhãn có thể trùng chữ với badge/option khác trong trang). */
function statValue(label: string): string {
  const node = Array.from(document.querySelectorAll('.stat-card__label')).find((el) => el.textContent === label);
  return node?.previousElementSibling?.textContent ?? '';
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <DonHangPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  list.mockReset();
  stats.mockReset();
  auth.isPlatformAdmin = true;
  list.mockResolvedValue({ items: [order()], total: 1, page: 1, page_size: 20 });
  stats.mockResolvedValue(STATS);
});

describe('DonHangPage', () => {
  it('tài khoản không phải platform_admin: báo chặn và KHÔNG gọi API', () => {
    auth.isPlatformAdmin = false;
    renderPage();

    expect(screen.getByText('Chỉ dành cho Quản trị hệ thống')).toBeInTheDocument();
    expect(list).not.toHaveBeenCalled();
  });

  it('hiện đơn từ API cùng số liệu thống kê', async () => {
    renderPage();

    expect(await screen.findByText('#AGR-2026-1001')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('330.000 đ')).toBeInTheDocument();
    // 2 đơn received + 1 packing = 3 chờ xử lý; 4 đang giao; 400.000 đ doanh thu đã giao
    expect(statValue('Tổng đơn hàng')).toBe('7');
    expect(statValue('Chờ xử lý / đóng ggói'.replace('gg','g'))).toBe('3');
    expect(statValue('Xe lạnh đang giao')).toBe('4');
    expect(statValue('Doanh thu đã giao')).toBe('400.000 đ');
  });

  it('đổi bộ lọc trạng thái thì gọi lại API với status và về trang 1', async () => {
    renderPage();
    await screen.findByText('#AGR-2026-1001');

    fireEvent.change(screen.getByLabelText('Lọc trạng thái'), { target: { value: 'shipping' } });

    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'shipping', page: 1, page_size: 20 }))
    );
  });

  it('không có đơn: hiện trạng thái rỗng', async () => {
    list.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 });
    renderPage();

    expect(await screen.findByText('Không có đơn hàng')).toBeInTheDocument();
  });

  it('lỗi tải: hiện thông báo của máy chủ và nút Thử lại gọi lại API', async () => {
    list.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'Hệ thống gặp sự cố.', null));
    renderPage();

    expect(await screen.findByText('Hệ thống gặp sự cố.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByText('#AGR-2026-1001')).toBeInTheDocument();
  });
});
