// Trang "Đang phát triển" — CHƯA có nghiệp vụ thật (không API, không form).
import { PlaceholderPage } from '../../components/PlaceholderPage';

export function NganHangPage() {
  return (
    <PlaceholderPage
      icon="credit-card"
      title="Ngân hàng"
      meta="Quản lý dịch vụ và liên kết ngân hàng của Đơn vị bạn."
      parent={{ to: '/nong-trai', label: 'Hoạt động sản xuất' }}
    />
  );
}
