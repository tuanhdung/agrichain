// Port certCard() (js/nong-trai-chi-tiet.js gốc) — markup/class giữ NGUYÊN
// (.card.card--hover, .data-card__header/__title/__rows/__row/__row-label/
// __actions — dùng chung .data-card__* đã có sẵn từ FarmCard.tsx).
import type { ReactNode } from 'react';
import { Icon } from '../../icons';
import { certStatusOf } from './constants';
import { formatDate } from './format';
import type { Certification, CertificationSystemRow } from '../../api';

interface CertificationCardProps {
  cert: Certification | CertificationSystemRow;
  isPlatformAdminMode: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onOpenEdit: (cert: Certification) => void;
  onOpenDelete: (cert: Certification) => void;
  onOpenFile: (certId: string) => void;
}

function Row({ icon, label, value }: { icon: string; label: string; value: ReactNode }) {
  return (
    <div className="data-card__row">
      <Icon name={icon} />
      <div>
        <div className="data-card__row-label">{label}</div>
        <div>{value}</div>
      </div>
    </div>
  );
}

export function CertificationCard({ cert, isPlatformAdminMode, canEdit, canDelete, onOpenEdit, onOpenDelete, onOpenFile }: CertificationCardProps) {
  const status = certStatusOf(cert.status);

  let fileValue: ReactNode = '—';
  if (cert.file_name) {
    // GET /certifications/{id} lọc theo Đơn vị của người gọi — platform_admin
    // (không thuộc Đơn vị nào) sẽ luôn nhận 404 khi bấm xem tệp của chứng
    // nhận thuộc Đơn vị khác. Hiện tên tệp dạng tĩnh (không bấm được) trung
    // thực hơn là để nút dẫn tới lỗi, khớp certCard() gốc.
    fileValue = isPlatformAdminMode ? (
      <span className="badge badge--info">{cert.file_name}</span>
    ) : (
      <button type="button" className="badge badge--info" onClick={() => onOpenFile(cert.id)}>
        {cert.file_name}
      </button>
    );
  }

  return (
    <article className="card card--hover">
      <div className="card__header data-card__header">
        <h2 className="data-card__title">{cert.name}</h2>
        <span className={`badge ${status.badge}`}>{status.label}</span>
      </div>

      <div className="data-card__rows">
        <Row icon="qr-code" label="Mã" value={cert.code} />
        {cert.issuer && <Row icon="factory" label="Cơ quan cấp" value={cert.issuer} />}
        <Row icon="calendar" label="Ngày cấp" value={formatDate(cert.issue_date)} />
        <Row icon="calendar" label="Ngày hết hạn" value={formatDate(cert.expiry_date)} />
        <Row icon="paperclip" label="Tệp tin" value={fileValue} />
        {cert.note && <Row icon="file-text" label="Ghi chú" value={cert.note} />}
      </div>

      <div className="data-card__actions">
        {canEdit && (
          <button type="button" className="icon-btn" aria-label={`Sửa ${cert.name}`} data-tooltip="Chỉnh sửa" onClick={() => onOpenEdit(cert)}>
            <Icon name="pencil" />
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            aria-label={`Xoá ${cert.name}`}
            data-tooltip="Xoá"
            onClick={() => onOpenDelete(cert)}
          >
            <Icon name="trash" />
          </button>
        )}
      </div>
    </article>
  );
}
