// Test trang "Quản lý đánh giá" (nhóm TMĐT): chỉ platform_admin, đọc đánh giá THẬT qua API, lọc theo sao gọi lại
// API, gỡ đánh giá cần xác nhận rồi gọi DELETE. Mock `api` và `useAuth` — không gọi mạng.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReviewAdmin } from '../../api/reviews';

const { list, remove, auth, confirm } = vi.hoisted(() => ({
  confirm: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  auth: { isPlatformAdmin: true }
}));

vi.mock('../../api', async () => {
  const real = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...real, api: { system: { reviews: { list, remove } } } };
});
// jsdom không có <dialog>.showModal() → mock hộp thoại xác nhận chung
vi.mock('../../components/ConfirmDialogProvider', () => ({ useConfirm: () => confirm }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));

import { ToastProvider } from '../../components/ToastProvider';
import { DanhGiaPage } from './DanhGiaPage';

function review(overrides: Partial<ReviewAdmin> = {}): ReviewAdmin {
  return {
    id: 'r1',
    product_id: 'p1',
    product_name: 'Gạo ST25',
    user_id: 'u1',
    reviewer_name: 'Nguyễn A.',
    reviewer_email: 'a@example.com',
    rating: 5,
    comment: 'Gạo dẻo, thơm',
    created_at: '2026-10-10T01:00:00Z',
    updated_at: '2026-10-10T01:00:00Z',
    ...overrides
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <DanhGiaPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  list.mockReset();
  remove.mockReset();
  confirm.mockReset();
  confirm.mockResolvedValue(true);
  auth.isPlatformAdmin = true;
  list.mockResolvedValue({ items: [review()], total: 1, page: 1, page_size: 20 });
  remove.mockResolvedValue(null);
});

describe('DanhGiaPage', () => {
  it('tài khoản không phải platform_admin: báo chặn và KHÔNG gọi API', () => {
    auth.isPlatformAdmin = false;
    renderPage();

    expect(screen.getByText('Chỉ dành cho Quản trị hệ thống')).toBeInTheDocument();
    expect(list).not.toHaveBeenCalled();
  });

  it('hiện đánh giá từ API', async () => {
    renderPage();

    expect(await screen.findByText('Gạo ST25')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn A.')).toBeInTheDocument();
    expect(screen.getByText('Gạo dẻo, thơm')).toBeInTheDocument();
  });

  it('lọc theo số sao thì gọi lại API với rating và về trang 1', async () => {
    renderPage();
    await screen.findByText('Gạo ST25');

    fireEvent.change(screen.getByLabelText('Lọc theo số sao'), { target: { value: '2' } });

    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ rating: 2, page: 1, page_size: 20 })));
  });

  it('không có đánh giá: hiện trạng thái rỗng', async () => {
    list.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 });
    renderPage();

    expect(await screen.findByText('Chưa có đánh giá nào')).toBeInTheDocument();
  });

  it('gỡ đánh giá: xác nhận xong mới gọi DELETE rồi tải lại', async () => {
    renderPage();
    await screen.findByText('Gạo ST25');

    fireEvent.click(screen.getByRole('button', { name: 'Gỡ đánh giá của Nguyễn A.' }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith('r1'));
    expect(confirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(list.mock.calls.length).toBeGreaterThanOrEqual(2));
  });
});
