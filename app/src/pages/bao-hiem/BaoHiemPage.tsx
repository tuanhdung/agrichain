// Trang "Đang phát triển" — CHƯA có nghiệp vụ thật (không API, không form).
import { PlaceholderPage } from '../../components/PlaceholderPage';

export function BaoHiemPage() {
  return (
    <PlaceholderPage
      icon="shield-check"
      title="Bảo hiểm"
      meta="Quản lý bảo hiểm nông nghiệp của Đơn vị bạn."
      parent={{ to: '/nong-trai', label: 'Hoạt động sản xuất' }}
    />
  );
}
