// Port modal "Xoá vật tư" (delete-modal) — markup/class giữ NGUYÊN
// (.modal.modal--sm). Xử lý lỗi 409 (backend chặn xoá vật tư còn được tham
// chiếu ở nhật ký/bước quy trình) hiện đúng message thật, KHÔNG giả vờ xoá
// thành công.
import type { RefObject } from 'react';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import type { Supply } from '../../api';
import { useToast } from '../../components/ToastProvider';

interface DeleteSupplyModalProps {
  dialogRef: RefObject<HTMLDialogElement>;
  supply: Supply | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteSupplyModal({ dialogRef, supply, onClose, onDeleted }: DeleteSupplyModalProps) {
  const { showToast } = useToast();

  function confirmDelete() {
    if (!supply) {
      onClose();
      return;
    }
    api.supplies
      .remove(supply.id)
      .then(() => {
        onDeleted();
        showToast('Đã xoá vật tư.');
      })
      .catch((err: unknown) => {
        showToast(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
      });
    onClose();
  }

  return (
    <dialog className="modal modal--sm" ref={dialogRef} aria-labelledby="delete-modal-title">
      <div className="modal__form">
        <div className="modal__header">
          <Icon name="trash" />
          <h2 className="modal__title" id="delete-modal-title">
            Xoá vật tư
          </h2>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal__body">
          <p>
            Xoá <strong>{supply?.name}</strong> khỏi danh sách vật tư?
          </p>
          <p className="field__hint" style={{ marginTop: 'var(--space-2)' }}>
            Các sự kiện đã ghi lên sổ cái vẫn giữ nguyên tên vật tư tại thời điểm ghi — xoá ở đây không làm sai lệch dữ
            liệu đã niêm phong.
          </p>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Giữ lại
          </button>
          <button type="button" className="btn btn--primary" onClick={confirmDelete}>
            Xoá
          </button>
        </div>
      </div>
    </dialog>
  );
}
