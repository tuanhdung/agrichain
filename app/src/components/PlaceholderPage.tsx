// Khung dùng chung cho các trang "Đang phát triển" (goi-phan-mem.html,
// lich-su-mua-goi.html gốc — cùng 1 khuôn breadcrumb/page-header/empty-state
// hệt nhau, chỉ khác icon/tiêu đề/mô tả) — tách thành 1 component dùng
// chung thay vì chép JSX 2 lần, để nội dung "Đang phát triển" chỉ có ĐÚNG 1
// nguồn (tránh lệch chữ giữa 2 trang nếu sau này sửa). KHÔNG áp dụng cho
// các trang khác trong app/ — mọi trang có nghiệp vụ thật đều tự chứa JSX
// riêng, đúng quy ước "mỗi trang tự chứa" của dự án; đây là ngoại lệ hợp lý
// vì cả 2 trang đang dùng component này ĐỀU rỗng, giống hệt nhau tới từng
// chữ ngoài icon/tiêu đề/mô tả.
import { Link } from 'react-router-dom';
import { Icon } from '../icons';

interface PlaceholderPageProps {
  icon: string;
  title: string;
  meta: string;
}

export function PlaceholderPage({ icon, title, meta }: PlaceholderPageProps) {
  return (
    <>
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link className="breadcrumb__link" to="/tai-khoan">
          <Icon name="shield-check" className="icon--sm" />
          Quản lý đơn vị
        </Link>
        <span className="breadcrumb__sep" aria-hidden="true">
          /
        </span>
        <span className="breadcrumb__current" aria-current="page">
          {title}
        </span>
      </nav>

      <div className="page-header">
        <div className="page-header__icon">
          <Icon name={icon} className="icon--lg" />
        </div>
        <div className="page-header__text">
          <h1 className="page-header__title">{title}</h1>
          <p className="page-header__meta">{meta}</p>
        </div>
      </div>

      <div className="empty-state">
        <Icon name={icon} className="icon--lg" />
        <p className="empty-state__title">Đang phát triển</p>
        <p className="empty-state__desc">Tính năng này chưa sẵn sàng. Quay lại sau nhé.</p>
      </div>
    </>
  );
}
