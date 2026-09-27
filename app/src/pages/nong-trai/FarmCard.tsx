// Port farmCard() (js/nong-trai.js gốc) — markup/class giữ NGUYÊN
// (.card.card--hover, .data-card__header/__title/__code/__rows/__row/
// __row-label/__actions, .icon-btn/.icon-btn--danger).
import { Link } from 'react-router-dom';
import { Icon } from '../../icons';
import type { Farm, FarmSystemRow } from '../../api';
import { formatArea, formatDate } from './format';

interface FarmCardProps {
  farm: Farm | FarmSystemRow;
  isPlatformAdminMode: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onOpenEdit: (farm: Farm) => void;
  onOpenDelete: (farm: Farm) => void;
}

function Row({ icon, primary, secondary }: { icon: string; primary: string; secondary?: string }) {
  return (
    <div className="data-card__row">
      <Icon name={icon} />
      <div>
        <div>{primary}</div>
        {secondary && <div className="data-card__row-label">{secondary}</div>}
      </div>
    </div>
  );
}

export function FarmCard({ farm, isPlatformAdminMode, canEdit, canDelete, onOpenEdit, onOpenDelete }: FarmCardProps) {
  const organizationName = 'organization_name' in farm ? farm.organization_name : null;

  // platform_admin: dùng ?id=<UUID thật> thay vì ?ma=<mã> — mã nông trại chỉ
  // duy nhất trong phạm vi 1 Đơn vị (org-scoped), có thể TRÙNG giữa các Đơn
  // vị khác nhau, không đủ để xác định 1 bản ghi khi xem xuyên Đơn vị.
  // /nong-trai-chi-tiet (route SPA, đã migrate) tự đọc ?id= để tra qua
  // GET /farms/{id} (public-read) thay vì api.farms.list({ q }).
  const href = isPlatformAdminMode
    ? `/nong-trai-chi-tiet?id=${encodeURIComponent(farm.id)}`
    : `/nong-trai-chi-tiet?ma=${encodeURIComponent(farm.code)}`;

  const place = [farm.ward, farm.province].filter(Boolean).join(', ');

  function stop(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <Link className="card card--hover" to={href}>
      <div className="card__header">
        <h2 className="data-card__title">{farm.name}</h2>
        <p className="data-card__code">{farm.code}</p>
      </div>

      <div className="data-card__rows">
        {isPlatformAdminMode && <Row icon="factory" primary={`Đơn vị sở hữu: ${organizationName || '—'}`} />}
        {farm.address ? <Row icon="map-pin" primary={farm.address} secondary={place} /> : <Row icon="map-pin" primary={place} />}
        <Row icon="chart-bar" primary={`Diện tích: ${formatArea(farm.area)}`} />
        <Row icon="seedling" primary={`Ngày bắt đầu: ${formatDate(farm.start_date)}`} />
        {farm.national_puc && <Row icon="qr-code" primary={`Mã vùng trồng: ${farm.national_puc}`} />}
        {farm.polygon && farm.polygon.length >= 3 && <Row icon="map-pin" primary={`Đã khoanh ranh giới (${farm.polygon.length} điểm)`} />}
      </div>

      <div className="data-card__actions">
        {/* Không cần bắt sự kiện riêng: nút này nằm trong <Link> nên bấm vào
            cũng tự điều hướng như bấm vào chỗ khác trên thẻ — chỉ thêm cho
            quen mắt, khớp bản gốc (LUÔN hiện, không gate theo quyền/chế độ). */}
        <button type="button" className="icon-btn" aria-label={`Xem chi tiết ${farm.name}`} data-tooltip="Xem chi tiết">
          <Icon name="eye" />
        </button>

        {canEdit && (
          <button
            type="button"
            className="icon-btn"
            aria-label={`Chỉnh sửa ${farm.name}`}
            data-tooltip="Chỉnh sửa"
            onClick={(e) => {
              stop(e);
              onOpenEdit(farm);
            }}
          >
            <Icon name="pencil" />
          </button>
        )}

        {canDelete && (
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            aria-label={`Xoá ${farm.name}`}
            data-tooltip="Xoá"
            onClick={(e) => {
              stop(e);
              onOpenDelete(farm);
            }}
          >
            <Icon name="trash" />
          </button>
        )}
      </div>
    </Link>
  );
}
