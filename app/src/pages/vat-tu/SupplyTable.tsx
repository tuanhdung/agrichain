// Port row()/renderList() (bảng) trong js/vat-tu.js gốc — markup/class giữ
// NGUYÊN (.table, .table__code, .table__name, .table__desc, .table__muted,
// .table__nowrap, .icon-btn, .icon-btn--danger, .badge--cat-<type>). Cột
// "Đơn vị sở hữu" chỉ hiện khi isPlatformAdminMode (organization_name chỉ có
// ở SupplySystemRow, không có ở Supply thường). Thêm .supply-table-panel/
// .supply-row (vat-tu.css, KHÔNG sửa .table-panel/.table dùng chung) cho
// hiệu ứng hiện dần + hover mượt hơn.
import { Icon } from '../../icons';
import { typeOf } from './constants';
import { formatDateTime } from './format';
import type { Supply } from '../../api';
import type { SupplySystemRow } from '../../api';
import './vat-tu.css';

interface SupplyTableProps {
  supplies: (Supply | SupplySystemRow)[];
  isPlatformAdminMode: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onOpenEdit: (supply: Supply) => void;
  onOpenDelete: (supply: Supply) => void;
}

export function SupplyTable({ supplies, isPlatformAdminMode, canEdit, canDelete, onOpenEdit, onOpenDelete }: SupplyTableProps) {
  return (
    <div className="table-panel supply-table-panel">
      <div className="table-panel__header">
        <h2 className="table-panel__title">Danh sách vật tư</h2>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {isPlatformAdminMode && <th scope="col">Đơn vị sở hữu</th>}
              <th scope="col">Mã</th>
              <th scope="col">Loại</th>
              <th scope="col">Tên</th>
              <th scope="col">Mô tả</th>
              <th scope="col">Nhà sản xuất</th>
              <th scope="col">Đơn vị</th>
              <th scope="col">Cập nhật lúc</th>
              <th scope="col">
                <span className="sr-only">Thao tác</span>#
              </th>
            </tr>
          </thead>
          <tbody>
            {supplies.map((material) => {
              const type = typeOf(material.type);
              const organizationName = 'organization_name' in material ? material.organization_name : null;

              // platform_admin: nút này LUÔN hiện (đổi hẳn sang icon con mắt)
              // và mở ĐÚNG modal Sửa nhưng ở chế độ chỉ xem — cách duy nhất
              // xem đủ thông tin 1 vật tư ngoài các cột đã có sẵn trên bảng.
              // Business vẫn theo đúng quyền supplies.edit như cũ.
              const showEdit = isPlatformAdminMode || canEdit;

              return (
                <tr key={material.id} className="supply-row">
                  {isPlatformAdminMode && <td>{organizationName || '—'}</td>}
                  <td className="table__code">{material.code}</td>
                  <td>
                    <span className={`badge badge--cat-${type.key}`}>
                      <Icon name={type.icon} />
                      <span>{type.label}</span>
                    </span>
                  </td>
                  <td className="table__name">{material.name}</td>
                  <td className="table__desc">{material.description || '—'}</td>
                  <td>{material.manufacturer || '—'}</td>
                  <td>
                    <span className="badge badge--neutral">{material.unit}</span>
                  </td>
                  <td className="table__muted table__nowrap">{formatDateTime(material.updated_at || material.created_at)}</td>
                  <td>
                    <div className="table__actions">
                      {showEdit && (
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`${isPlatformAdminMode ? 'Xem chi tiết' : 'Sửa'} ${material.name}`}
                          data-tooltip={isPlatformAdminMode ? 'Xem chi tiết' : 'Chỉnh sửa'}
                          onClick={() => onOpenEdit(material)}
                        >
                          <Icon name={isPlatformAdminMode ? 'eye' : 'pencil'} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          aria-label={`Xoá ${material.name}`}
                          data-tooltip="Xoá"
                          onClick={() => onOpenDelete(material)}
                        >
                          <Icon name="trash" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
