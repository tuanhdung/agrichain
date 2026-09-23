// Port batchCard() (js/lo-hang.js gốc) — markup/class giữ NGUYÊN
// (.card.batch-card, .batch-card__header/__code/__rows/__row/__row-label/
// __yield/__yield-value/__yield-label/__note/__note-label/__actions,
// .icon-btn.batch-card__action--edit/--delete — đã có sẵn trong
// css/components.css, dùng chung với tab "Lô hàng" của
// nong-trai-chi-tiet.html).
//
// ⚠️ Nút "Truy xuất nguồn gốc" (QR) của bản gốc CHƯA port — cần thêm
// dependency mới (thư viện tạo QR) ngoài phạm vi các việc đã liệt kê khi
// migrate trang này, xem app/CLAUDE.md mục "Trang /lo-hang" để biết đầy đủ
// lý do hoãn lại.
import { Icon } from '../../icons';
import { mainSiteUrl } from '../../api/config';
import { statusOf } from './constants';
import { formatArea, formatDate } from './format';
import type { Batch, BatchSystemRow } from '../../api';

interface BatchCardProps {
  batch: Batch | BatchSystemRow;
  isPlatformAdminMode: boolean;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="batch-card__row">
      <span className="batch-card__row-label">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function BatchCard({ batch, isPlatformAdminMode }: BatchCardProps) {
  const status = statusOf(batch.status);
  const organizationName = 'organization_name' in batch ? batch.organization_name : null;

  // farm_code/season_code LUÔN có (BatchOut không cho null) — season còn
  // batch sống thì backend chặn xoá, nên không có ca "mồ côi" phải xử lý
  // riêng như hồi còn store.js (xem js/lo-hang.js gốc).
  const editUrl = mainSiteUrl(
    `nong-trai-chi-tiet.html?ma=${encodeURIComponent(batch.farm_code)}&season=${encodeURIComponent(batch.season_code)}#lo-hang`
  );

  return (
    <article className="card batch-card">
      <div className="batch-card__header">
        <h2 className="batch-card__code">{batch.code}</h2>
        <span className={`badge ${status.badge}`}>{status.label}</span>
      </div>

      <div className="batch-card__rows">
        {isPlatformAdminMode && <Row label="Đơn vị sở hữu" value={organizationName || '—'} />}
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
      {!isPlatformAdminMode && (
        <div className="batch-card__actions">
          {/* platform_admin: ẩn hẳn 2 nút Sửa/Xoá — đây là <a> điều hướng
              thẳng sang nong-trai-chi-tiet.html để mở modal Sửa/Xoá lô hàng
              (KHÔNG qua hasPermission() nào để tự ẩn, phải bọc điều kiện
              tay), trang đó tự ẩn hết nút ghi khi mở qua ?id= cho
              platform_admin — không có lý do điều hướng qua đây để sửa/xoá. */}
          <a className="icon-btn batch-card__action--edit" href={editUrl} aria-label={`Sửa lô hàng ${batch.code}`} data-tooltip="Chỉnh sửa">
            <Icon name="pencil" />
          </a>
          <a
            className="icon-btn batch-card__action--delete"
            href={editUrl}
            aria-label={`Xoá lô hàng ${batch.code}`}
            data-tooltip="Xoá (mở trang mùa vụ)"
          >
            <Icon name="trash" />
          </a>
        </div>
      )}
    </article>
  );
}
