// Port batchCard() (js/lo-hang.js gốc) — markup/class giữ NGUYÊN
// (.card.batch-card, .batch-card__header/__code/__rows/__row/__row-label/
// __yield/__yield-value/__yield-label/__note/__note-label/__actions,
// .icon-btn.batch-card__action--edit/--delete — đã có sẵn trong
// css/components.css, dùng chung với tab "Lô hàng" của
// nong-trai-chi-tiet.html).
//
// Giai đoạn C (2026-09-28) — 2 tính năng MỚI so với bản gốc .html (bản đó đã
// BỎ HẲN khối "Xác thực blockchain" vì lúc đó backend chưa có anchoring
// thật, xem app/CLAUDE.md/CLAUDE.md gốc mục "Kết nối backend"):
//   1. Nút "Xác thực blockchain" — POST /batches/{id}/verify-blockchain, chỉ
//      hiện cho business (không phải platform_admin, cùng quy ước ẩn nút
//      Sửa/Xoá bên dưới) khi trạng thái lô hàng đủ điều kiện VÀ chưa anchored.
//   2. Icon QR mở modal truy xuất — xem QrModal.tsx (thư viện `qrcode`, npm,
//      đã xác nhận với người phụ trách trước khi thêm dependency mới).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../icons';
import { api, ApiError } from '../../api';
import { useToast } from '../../components/ToastProvider';
import { statusOf, VERIFIABLE_BATCH_STATUSES } from './constants';
import { formatArea, formatDate, shorten } from './format';
import type { Batch, BatchSystemRow } from '../../api';

interface BatchCardProps {
  batch: Batch | BatchSystemRow;
  isPlatformAdminMode: boolean;
  /** Gọi sau khi xác thực blockchain thành công — cha (LoHangPage) tự thay
   *  đúng phần tử này trong danh sách, không tải lại toàn bộ trang. */
  onVerified: (updated: Batch) => void;
  /** Mở modal QR ở cha (LoHangPage) — 1 modal DÙNG CHUNG cho mọi thẻ, không
   *  phải mỗi BatchCard tự có <dialog> riêng, cùng mẫu useDialog() ở nơi khác. */
  onOpenQr: (batch: Batch | BatchSystemRow) => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="batch-card__row">
      <span className="batch-card__row-label">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function BatchCard({ batch, isPlatformAdminMode, onVerified, onOpenQr }: BatchCardProps) {
  const { showToast } = useToast();
  const [verifying, setVerifying] = useState(false);

  const status = statusOf(batch.status);
  const organizationName = 'organization_name' in batch ? batch.organization_name : null;
  const isAnchored = batch.verification_status === 'anchored';
  // Chỉ business (không phải platform_admin, cùng quy ước ẩn nút Sửa/Xoá bên
  // dưới) VÀ trạng thái lô hàng đủ điều kiện VÀ chưa anchored mới thấy nút —
  // backend cũng tự chặn bằng 409 nếu vẫn gọi được (race condition — batch bị
  // đổi trạng thái/anchored từ nơi khác giữa lúc trang đang mở), đây chỉ là
  // lớp UI tránh hiện nút chắc chắn sẽ lỗi ở đa số trường hợp.
  const canVerify = !isPlatformAdminMode && !isAnchored && VERIFIABLE_BATCH_STATUSES.has(batch.status);

  // farm_code/season_code LUÔN có (BatchOut không cho null) — season còn
  // batch sống thì backend chặn xoá, nên không có ca "mồ côi" phải xử lý
  // riêng như hồi còn store.js (xem js/lo-hang.js gốc).
  // /nong-trai-chi-tiet (route SPA, đã migrate) giữ nguyên query/hash ?ma=
  // &season=...#lo-hang để khớp URL bản gốc — LƯU Ý: trang đích CHƯA đọc
  // season/hash này để tự mở modal mùa vụ + chuyển tab "Lô hàng" như bản
  // tĩnh cũ, nên bấm vào đây chỉ vào đúng trang nông trại, còn lại phải tự
  // bấm thêm (quyết định đã xác nhận — xem app/CLAUDE.md nếu bổ sung sau).
  const editUrl = `/nong-trai-chi-tiet?ma=${encodeURIComponent(batch.farm_code)}&season=${encodeURIComponent(batch.season_code)}#lo-hang`;

  function handleVerify() {
    if (verifying) return;
    setVerifying(true);
    api.batches
      .verifyBlockchain(batch.id)
      .then((updated) => {
        onVerified(updated);
        showToast(`Đã xác thực blockchain lô hàng ${updated.code}.`);
      })
      .catch((err: unknown) => {
        // 503 — giao dịch chain thất bại/thiếu cấu hình, KHÔNG đổi gì trong
        // DB (xem batches.ts) — đây là lỗi TẠM THỜI, không phải lỗi dữ liệu,
        // nên hiện thông báo cố định, KHÔNG dùng message kỹ thuật backend trả
        // về (dù backend đã tránh lộ chi tiết nhạy cảm, message đó vẫn không
        // dễ hiểu với người dùng cuối) — nút tự bật lại ngay bên dưới (finally)
        // để bấm thử lại được luôn, không khoá vĩnh viễn.
        if (err instanceof ApiError && err.status === 503) {
          showToast('Chưa xác thực được, vui lòng thử lại sau.');
          return;
        }
        // 409 (đã anchored/sai trạng thái) và lỗi mạng (status 0, message đã
        // là "Không kết nối được máy chủ...") đều dùng thẳng err.message —
        // backend/ApiError đã trả tiếng Việt rõ ràng, cụ thể hơn hẳn 1 câu
        // gộp chung cho cả 2 trường hợp con của 409.
        if (err instanceof ApiError) {
          showToast(err.message);
          return;
        }
        showToast('Có lỗi xảy ra, vui lòng thử lại.');
      })
      .finally(() => setVerifying(false));
  }

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
        {isAnchored && (
          <div className="batch-card__row">
            <span className="batch-card__row-label">Xác thực blockchain</span>
            <span className="badge badge--success">
              <Icon name="shield-check" className="icon--sm" />
              Đã xác thực
            </span>
          </div>
        )}
        {isAnchored && <Row label="Mã giao dịch" value={shorten(batch.tx_hash)} />}
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

      {canVerify && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            disabled={verifying}
            onClick={handleVerify}
            style={{ width: '100%' }}
          >
            <Icon name="blockchain" className="icon--sm" />
            {verifying ? 'Đang xác thực blockchain...' : 'Xác thực blockchain'}
          </button>
        </div>
      )}

      <div className="batch-card__actions">
        {/* QR luôn hiện, kể cả platform_admin — thuần đọc, không phải thao
            tác ghi, cùng triết lý "chỉ ẩn nút ghi" đã áp dụng cho các trang
            khác trong chế độ platform_admin. */}
        <button
          type="button"
          className="icon-btn"
          aria-label={`Truy xuất nguồn gốc lô hàng ${batch.code}`}
          data-tooltip="Truy xuất nguồn gốc"
          onClick={() => onOpenQr(batch)}
        >
          <Icon name="qr-code" />
        </button>
        {/* platform_admin: ẩn hẳn 2 nút Sửa/Xoá — đây là <Link> điều hướng
            nội bộ sang /nong-trai-chi-tiet để mở modal Sửa/Xoá lô hàng
            (KHÔNG qua hasPermission() nào để tự ẩn, phải bọc điều kiện
            tay), trang đó tự ẩn hết nút ghi khi mở qua ?id= cho
            platform_admin — không có lý do điều hướng qua đây để sửa/xoá. */}
        {!isPlatformAdminMode && (
          <>
            <Link className="icon-btn batch-card__action--edit" to={editUrl} aria-label={`Sửa lô hàng ${batch.code}`} data-tooltip="Chỉnh sửa">
              <Icon name="pencil" />
            </Link>
            <Link
              className="icon-btn batch-card__action--delete"
              to={editUrl}
              aria-label={`Xoá lô hàng ${batch.code}`}
              data-tooltip="Xoá (mở trang mùa vụ)"
            >
              <Icon name="trash" />
            </Link>
          </>
        )}
      </div>
    </article>
  );
}
