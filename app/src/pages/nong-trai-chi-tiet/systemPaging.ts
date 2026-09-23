// Port fetchAllSystemPages()/MAX_SYSTEM_PAGES của js/nong-trai-chi-tiet.js
// gốc — 7 route /system/* (dùng cho platform_admin) KHÔNG có tham số lọc
// theo farm_id/season_id (chỉ page/page_size, xem CLAUDE.md gốc mục "Quản
// trị hệ thống (platform_admin)") nên phải tự tải HẾT các trang rồi lọc lại
// ở client (xem cách dùng ở CertificationCard/... — mỗi lần dùng tự filter
// theo farm_id/season_id sau khi gọi hàm này). MAX_SYSTEM_PAGES chặn vòng
// lặp nếu dữ liệu toàn hệ thống vượt quá quy mô demo hiện tại.
//
// Dùng chung cho CẢ 4 danh sách con (chứng nhận/mùa vụ/nhật ký/lô hàng) của
// trang này — đặt ở đây (không phải hooks/) vì bản gốc cũng chỉ định nghĩa 1
// lần TRONG CHÍNH js/nong-trai-chi-tiet.js, không dùng chung với trang nào
// khác trong dự án.
import type { Page } from '../../api';

const MAX_SYSTEM_PAGES = 50;

export function fetchAllSystemPages<T>(listFn: (params: { page: number; page_size: number }) => Promise<Page<T>>): Promise<T[]> {
  function loadPage(page: number, acc: T[]): Promise<T[]> {
    return listFn({ page, page_size: 100 }).then((data) => {
      const all = acc.concat(data.items || []);
      const total = data.total || 0;
      if (all.length < total && page < MAX_SYSTEM_PAGES) {
        return loadPage(page + 1, all);
      }
      return all;
    });
  }
  return loadPage(1, []);
}
