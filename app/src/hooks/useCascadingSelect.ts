// Port cơ chế "2 select phụ thuộc nhau" của js/location-select.js
// (AgriChain.setupCascadingSelect) — dùng cho Tỉnh/Thành phố -> Phường/Xã
// (pages/nong-trai/FarmFormModal.tsx) VÀ Nông trại -> Mùa vụ (bộ lọc
// pages/lo-hang/LoHangPage.tsx, xem app/CLAUDE.md mục "Trang /lo-hang") —
// hook này chỉ định nghĩa CƠ CHẾ, không biết gì về dữ liệu cụ thể, khớp đúng
// tinh thần setupCascadingSelect() gốc dùng chung cho cả 2 trang.
import { useCallback, useRef, useState } from 'react';

export type CascadingSelectStatus = 'no-parent' | 'loading' | 'ready' | 'error';

interface UseCascadingSelectOptions<TChild> {
  loadChildren: (parentValue: string) => Promise<TChild[]> | TChild[];
  getOptionValue: (item: TChild) => string;
  getOptionLabel: (item: TChild) => string;
  // Mặc định false (khớp Tỉnh/Thành -> Phường/Xã: chưa chọn tỉnh nghĩa là
  // "chưa sẵn sàng", không tải gì cả). Bộ lọc Nông trại -> Mùa vụ cần
  // true — "chưa chọn nông trại" ở đó nghĩa là "mọi nông trại" (tải TẤT CẢ
  // mùa vụ), không phải "chưa sẵn sàng", khớp allowEmptyParent của
  // setupCascadingSelect() gốc.
  allowEmptyParent?: boolean;
}

export interface CascadingSelectState<TChild> {
  children: TChild[];
  childValue: string;
  setChildValue: (value: string) => void;
  status: CascadingSelectStatus;
  getOptionValue: (item: TChild) => string;
  getOptionLabel: (item: TChild) => string;
  /** Gọi khi select cha đổi giá trị (tự bỏ trống con — khớp bản gốc: "đổi
   *  cha bằng tay thì luôn bỏ trống con, không giữ nhầm lựa chọn cũ"), hoặc
   *  chủ động gọi lúc mở modal sửa (kèm `selectedChildValue` để chọn sẵn
   *  giá trị con đã lưu — khớp wardCascade.refresh(farm.ward) gốc). */
  refresh: (parentValue: string, selectedChildValue?: string) => Promise<void>;
}

export function useCascadingSelect<TChild>(options: UseCascadingSelectOptions<TChild>): CascadingSelectState<TChild> {
  const [children, setChildren] = useState<TChild[]>([]);
  const [childValue, setChildValue] = useState('');
  const [status, setStatus] = useState<CascadingSelectStatus>('no-parent');

  // Giữ options mới nhất qua ref — tránh phải liệt kê loadChildren/
  // getOptionValue/getOptionLabel (closure mới mỗi render nếu định nghĩa
  // inline ở nơi gọi) làm dep của refresh(), theo đúng tinh thần
  // "config truyền vào lúc setup 1 lần" của setupCascadingSelect() gốc.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const refresh = useCallback(async (parentValue: string, selectedChildValue?: string) => {
    setChildValue('');

    if (!parentValue && !optionsRef.current.allowEmptyParent) {
      setChildren([]);
      setStatus('no-parent');
      return;
    }

    setStatus('loading');
    try {
      const result = await optionsRef.current.loadChildren(parentValue);
      setChildren(result);
      setStatus('ready');
      if (selectedChildValue) setChildValue(selectedChildValue);
    } catch {
      setChildren([]);
      setStatus('error');
    }
  }, []);

  return {
    children,
    childValue,
    setChildValue,
    status,
    getOptionValue: options.getOptionValue,
    getOptionLabel: options.getOptionLabel,
    refresh
  };
}
