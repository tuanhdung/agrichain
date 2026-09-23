// Port batchCard() (js/nong-trai-chi-tiet.js gốc, phần "Lô hàng" trong modal
// xem chi tiết mùa vụ) — KHÁC bản đã port ở pages/lo-hang/BatchCard.tsx (2
// hàm batchCard() riêng biệt trong bản gốc, chỉ dùng chung class CSS
// .batch-card, xem js/lo-hang.js vs js/nong-trai-chi-tiet.js): ở ĐÂY nút
// Sửa/Xoá mở THẲNG modal ngay tại trang này (không phải <a> điều hướng sang
// trang khác như ở /lo-hang), và card KHÔNG có dòng "Đơn vị sở hữu" (mọi lô
// hàng trong tab này đều CÙNG 1 mùa vụ/Đơn vị đang xem, không cần phân biệt).
//
// ⚠️ Nút Sửa/Xoá KHÔNG qua data-requires-permission/usePermission() nào cả —
// batches chưa được gắn quyền qua giao diện này (khớp CLAUDE.md gốc mục
// "Quản trị hệ thống (platform_admin)"), CHỈ bọc tay bằng isPlatformAdminMode,
// khác hẳn CertificationCard/SeasonCard/LogItem (đều gate qua canEdit/
// canDelete từ usePermission). Không tự ý thêm permission gate không có
// trong bản gốc.
//
// ⚠️ Nút "Truy xuất nguồn gốc" (QR) CHƯA port — cùng nợ kỹ thuật đã ghi nhận
// ở pages/lo-hang/BatchCard.tsx (cần quyết định thư viện QR riêng, xem
// app/CLAUDE.md mục "Trang /lo-hang"), áp dụng chung cho cả 2 nơi có nút này
// trong bản gốc.
import { Icon } from '../../icons';
import { batchStatusOf } from './constants';
import { formatArea, formatDate } from './format';
import type { Batch, BatchSystemRow } from '../../api';

interface BatchCardProps {
  batch: Batch | BatchSystemRow;
  isPlatformAdminMode: boolean;
  onEdit: (batch: Batch) => void;
  onDelete: (batch: Batch) => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="batch-card__row">
      <span className="batch-card__row-label">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function BatchCard({ batch, isPlatformAdminMode, onEdit, onDelete }: BatchCardProps) {
  const status = batchStatusOf(batch.status);

  return (
    <article className="card batch-card">
      <div className="batch-card__header">
        <h2 className="batch-card__code">{batch.code}</h2>
        <span className={`badge ${status.badge}`}>{status.label}</span>
      </div>

      <div className="batch-card__rows">
        <Row label="Diện tích" value={formatArea(batch.area)} />
        <Row label="Ngày bắt đầu" value={formatDate(batch.start_date)} />
        <Row label="Ngày thu hoạch" value={formatDate(batch.harvest_date)} />
        <Row label="Ngày thu hoạch thực tế" value={formatDate(batch.actual_harvest_date)} />
      </div>

      <div className="batch-card__yield">
        <strong className="batch-card__yield-value">
          {batch.expected_yield || 0} {batch.unit || ''}
        </strong>
        <span className="batch-card__yield-label">Sản lượng dự kiến</span>
      </div>

      {batch.note && (
        <div className="batch-card__note">
          <span className="batch-card__note-label">Ghi chú</span>
          <span>{batch.note}</span>
        </div>
      )}

      {/* Khối "Xác thực blockchain" đã BỎ HẲN ở bản gốc — không port lại. */}
      <div className="batch-card__actions">
        {/* Nút QR (icon-qr-code, "Truy xuất nguồn gốc") CHƯA port — xem ghi
            chú đầu file. */}

        {!isPlatformAdminMode && (
          <>
            <button
              type="button"
              className="icon-btn batch-card__action--edit"
              aria-label={`Sửa lô hàng ${batch.code}`}
              data-tooltip="Chỉnh sửa"
              onClick={() => onEdit(batch)}
            >
              <Icon name="pencil" />
            </button>
            <button
              type="button"
              className="icon-btn batch-card__action--delete"
              aria-label={`Xoá lô hàng ${batch.code}`}
              data-tooltip="Xoá"
              onClick={() => onDelete(batch)}
            >
              <Icon name="trash" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}
