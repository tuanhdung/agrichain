// CSS gốc (css/components.css) target `.modal[open]` — PHẢI dùng đúng
// phương thức showModal()/close() của <dialog> để trình duyệt tự gắn/gỡ
// thuộc tính `open` thật (xem CLAUDE.md gốc mục "Quy ước CSS", cảnh báo về
// việc đặt `display` lên phần tử tự ẩn/hiện bằng thuộc tính trình duyệt) —
// KHÔNG được thay bằng state React kiểu `open && <dialog>...` (React sẽ
// unmount/mount lại <dialog>, mất animation/focus-trap gốc của trình duyệt,
// và không tự thêm thuộc tính `open` cho lần render đầu). Dùng ref trỏ thẳng
// vào DOM node, gọi 2 phương thức đó y hệt bản .js gốc.
import { useCallback, useRef, useState } from 'react';

export function useDialog<T extends HTMLDialogElement = HTMLDialogElement>() {
  const ref = useRef<T | null>(null);
  // openCount: tăng mỗi lần open() được gọi THẬT SỰ — dùng làm dependency
  // React cho nơi cần biết "vừa có 1 lần mở mới xảy ra" (VD BoundaryEditor
  // của /nong-trai cần chạy lại invalidateSize() sau MỖI lần mở, kể cả khi
  // farm/mode truyền vào không đổi giá trị so với lần trước — effect dựa
  // vào [farm, mode] đơn thuần sẽ bị React bỏ qua vì Object.is coi là không
  // đổi, xem BoundaryEditor.tsx/FarmFormModal.tsx). Đặt trong hook dùng
  // chung này (không phải riêng /nong-trai) vì bất kỳ trang nào khác dùng
  // useDialog() sau này gặp cùng vấn đề đều tận dụng lại được ngay.
  const [openCount, setOpenCount] = useState(0);

  const open = useCallback(() => {
    ref.current?.showModal();
    setOpenCount((count) => count + 1);
  }, []);
  const close = useCallback(() => ref.current?.close(), []);

  return { ref, open, close, openCount };
}
