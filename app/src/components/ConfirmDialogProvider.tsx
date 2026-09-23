// Port AgriChain.confirm(message) (js/app-shell.js gốc) — hộp thoại xác
// nhận dùng chung, trả về Promise<boolean>. Bản gốc mỗi trang TỰ CHỨA markup
// #confirm-dialog riêng (mau-quy-trinh.html có, vat-tu.html KHÔNG có — trang
// đó tự có modal xoá riêng, không dùng cơ chế chung này). Bản React mount 1
// LẦN trong AppShell (giống ToastProvider), dùng chung cho MỌI trang đã
// migrate — không phải mount lại markup từng trang như bản .html.
//
// Đây là lần ĐẦU TIÊN cơ chế này được port trong app/ (ghi nhận sẵn trong
// app/CLAUDE.md mục "Chưa port" từ lúc chỉ có vat-tu — trang Vật tư không
// cần tới, mau-quy-trinh mới là trang đầu tiên cần, xem js/mau-quy-trinh.js
// gốc hàm handleDelete()).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../icons';

interface ConfirmContextValue {
  confirm: (message: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolveRef = useRef<((result: boolean) => void) | null>(null);

  const settle = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  const confirm = useCallback((msg: string) => {
    setMessage(msg);
    dialogRef.current?.showModal();
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  // <dialog> tự bắn sự kiện 'cancel' khi người dùng nhấn Esc (trình duyệt tự
  // đóng dialog, không cần gọi .close() lại ở đây) — coi như huỷ, khớp đúng
  // confirmDialog() gốc.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    function onCancel() {
      settle(false);
    }
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, [settle]);

  function handleCancel() {
    dialogRef.current?.close();
    settle(false);
  }

  function handleOk() {
    dialogRef.current?.close();
    settle(true);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <dialog className="modal modal--sm" ref={dialogRef} aria-labelledby="confirm-dialog-title">
        <div className="modal__header">
          <Icon name="trash" />
          <h2 className="modal__title" id="confirm-dialog-title">
            Xác nhận
          </h2>
        </div>
        <div className="modal__body">
          <p>{message}</p>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={handleCancel}>
            Huỷ
          </button>
          <button type="button" className="btn btn--danger" onClick={handleOk}>
            Xoá
          </button>
        </div>
      </dialog>
    </ConfirmContext.Provider>
  );
}

/** Trả về hàm confirm(message) => Promise<boolean> — tương đương AgriChain.confirm() gốc. */
export function useConfirm(): (message: string) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm() phải gọi bên trong <ConfirmDialogProvider>');
  return ctx.confirm;
}
