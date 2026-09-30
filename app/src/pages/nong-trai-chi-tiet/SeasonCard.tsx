// Port seasonCard() (js/nong-trai-chi-tiet.js gốc) — markup/class giữ NGUYÊN
// (.card.card--hover, .data-card__header/__title/__rows/__row/__row-label/
// __chip-group/__actions).
import type { ReactNode } from 'react';
import { Icon } from '../../icons';
import { seasonStatusOf } from './constants';
import { formatArea, formatDate } from './format';
import type { Season, SeasonSystemRow } from '../../api';

interface SeasonCardProps {
  season: Season | SeasonSystemRow;
  canEdit: boolean;
  canDelete: boolean;
  onView: (season: Season) => void;
  onEdit: (season: Season) => void;
  onDelete: (season: Season) => void;
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

export function SeasonCard({ season, canEdit, canDelete, onView, onEdit, onDelete }: SeasonCardProps) {
  const status = seasonStatusOf(season.status);

  return (
    <article className="card card--hover detail-card">
      <div className="card__header data-card__header">
        <h2 className="data-card__title">{season.name}</h2>
        <span className={`badge ${status.badge}`}>{status.label}</span>
      </div>

      <div className="data-card__rows">
        <Row icon="qr-code" label="Mã" value={season.code} />
        <Row icon="calendar" label="Ngày bắt đầu" value={formatDate(season.start_date)} />
        <Row icon="calendar" label="Ngày kết thúc" value={formatDate(season.end_date)} />
        <Row
          icon="chart-bar"
          label="Diện tích"
          value={
            <div className="data-card__chip-group">
              <span className="badge badge--info">Dự kiến: {formatArea(season.planned_area)}</span>
              <span className="badge badge--warning">Thực tế: {formatArea(season.actual_area)}</span>
            </div>
          }
        />
        {season.expected_yield != null && (
          <Row icon="wheat" label="Sản lượng dự kiến" value={`${season.expected_yield} ${season.yield_unit || ''}`} />
        )}
        {season.note && <Row icon="file-text" label="Ghi chú" value={season.note} />}
      </div>

      <div className="data-card__actions">
        {/* KHÔNG gate theo quyền — mọi vai trò (kể cả platform_admin) đều xem
            được modal chi tiết, khớp view.addEventListener() gốc không kiểm
            hasPermission() nào. */}
        <button type="button" className="icon-btn" aria-label={`Xem chi tiết ${season.name}`} data-tooltip="Xem chi tiết" onClick={() => onView(season)}>
          <Icon name="eye" />
        </button>

        {canEdit && (
          <button type="button" className="icon-btn" aria-label={`Sửa ${season.name}`} data-tooltip="Chỉnh sửa" onClick={() => onEdit(season)}>
            <Icon name="pencil" />
          </button>
        )}

        {canDelete && (
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            aria-label={`Xoá ${season.name}`}
            data-tooltip="Xoá"
            onClick={() => onDelete(season)}
          >
            <Icon name="trash" />
          </button>
        )}
      </div>
    </article>
  );
}
