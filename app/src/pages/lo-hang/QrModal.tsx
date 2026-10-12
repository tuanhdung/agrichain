// Modal "Truy xuất nguồn gốc" (QR) — port markup/class .qr-modal__* nguyên
// văn từ lo-hang.html gốc (xem filter-card.css). Giai đoạn C (2026-09-28):
// bản gốc dùng thư viện qrcodejs nạp qua CDN (project KHÔNG có tiền lệ CDN
// trong app/, xem app/CLAUDE.md mục "Trang /lo-hang") — bản React dùng
// package npm `qrcode` (đã xác nhận với người phụ trách trước khi thêm vào
// package.json), vẽ trực tiếp vào <canvas> qua QRCode.toCanvas().
import { useEffect, useRef, type RefObject } from 'react';
import QRCode from 'qrcode';
import { Icon } from '../../icons';
import { mainSiteUrl } from '../../api/config';
import type { Batch, BatchSystemRow } from '../../api';

interface QrModalProps {
  dialogRef: RefObject<HTMLDialogElement>;
  batch: Batch | BatchSystemRow | null;
  onClose: () => void;
}

export function QrModal({ dialogRef, batch, onClose }: QrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // URL PHẢI trỏ về SITE TĨNH (mainSiteUrl), KHÔNG dùng location.origin của
  // chính SPA — truy-xuat.html là trang công khai ở agrichain.org.vn, không
  // tồn tại ở app.agrichain.org.vn (2 origin thật sự khác nhau, xem
  // app/CLAUDE.md mục "Giả định host"). Khác js/lo-hang.js gốc
  // (traceabilityUrl() dùng global.location.origin) — SAI KHÁC CÓ CHỦ ĐÍCH
  // bắt buộc cho kiến trúc subdomain của SPA, không phải sơ suất khi port.
  const url = batch ? mainSiteUrl(`truy-xuat.html?ma=${encodeURIComponent(batch.code)}`) : '';

  useEffect(() => {
    if (!batch || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, { width: 200, margin: 1 }, (err) => {
      if (err) {
        // Không có ToastProvider trong phạm vi modal nhỏ này — ghi log, để
        // khung canvas trống thay vì crash cả modal vì 1 mã QR vẽ lỗi.
        // eslint-disable-next-line no-console
        console.error('Không tạo được mã QR:', err);
      }
    });
  }, [batch, url]);

  function handleDownload() {
    if (!batch || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `qr-${batch.code}.png`;
    link.click();
  }

  return (
    <dialog className="modal modal--sm" ref={dialogRef} aria-labelledby="qr-modal-title">
      <div className="modal__form">
        <div className="modal__header">
          <Icon name="qr-code" />
          <h2 className="modal__title" id="qr-modal-title">
            Truy xuất nguồn gốc
          </h2>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal__body qr-modal__body">
          <p className="qr-modal__code">Mã lô hàng: {batch?.code}</p>
          <div className="qr-modal__canvas">
            <canvas ref={canvasRef} width={200} height={200} />
          </div>
          <p className="qr-modal__hint">Quét mã QR bằng điện thoại, hoặc mở trực tiếp liên kết bên dưới.</p>
          <div className="qr-modal__actions">
            <a className="btn btn--outline btn--sm" href={url} target="_blank" rel="noopener">
              Mở trang truy xuất
            </a>
            <button type="button" className="btn btn--outline btn--sm" onClick={handleDownload}>
              Tải mã QR
            </button>
          </div>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </dialog>
  );
}
