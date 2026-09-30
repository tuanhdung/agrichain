// Port renderStats() — thống kê tính trên TRANG dữ liệu đang tải (page_size
// lớn), KHÔNG phải toàn bộ hệ thống nếu vượt quá page_size (khớp cảnh báo
// trong js/vat-tu.js gốc). Thêm class .supply-stat (vat-tu.css, KHÔNG sửa
// .stat-card dùng chung) cho hiệu ứng hiện dần so le + icon phóng to/xoay
// nhẹ khi hover.
import { Icon } from '../../icons';
import { TYPES } from './constants';
import type { Supply } from '../../api';
import './vat-tu.css';

export function SupplyStats({ supplies }: { supplies: Supply[] }) {
  return (
    <div className="stat-grid">
      <div className="stat-card stat-card--total supply-stat">
        <div className="stat-card__icon">
          <Icon name="box" className="icon--lg" />
        </div>
        <div>
          <div className="stat-card__value">{supplies.length}</div>
          <div className="stat-card__label">Tổng số vật tư</div>
        </div>
      </div>

      {TYPES.map((type) => {
        const count = supplies.filter((item) => item.type === type.key).length;
        return (
          <div className="stat-card supply-stat" key={type.key}>
            <div className={`stat-card__icon badge--cat-${type.key}`}>
              <Icon name={type.icon} />
            </div>
            <div>
              <div className="stat-card__value">{count}</div>
              <div className="stat-card__label">{type.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
