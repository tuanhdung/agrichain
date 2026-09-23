// Port NGUYÊN hàm tính diện tích trên mặt cầu của js/nong-trai.js gốc —
// KHÔNG viết lại thuật toán, chỉ đổi cú pháp sang TypeScript.
import type { FarmPoint } from '../../api';

/* --- Diện tích trên mặt cầu ----------------------------------------------
   Không dùng công thức phẳng: ở vĩ độ Việt Nam, 1 độ kinh tuyến ngắn hơn
   1 độ vĩ tuyến khoảng 4%, tính phẳng sẽ lệch thấy rõ trên thửa lớn.
   Đây là công thức lượng giác cầu chuẩn, trả về mét vuông. */
export function geodesicArea(list: FarmPoint[]): number {
  if (list.length < 3) return 0;

  const R = 6378137; // bán kính Trái Đất theo WGS84, mét
  const rad = Math.PI / 180;
  let sum = 0;

  for (let i = 0; i < list.length; i++) {
    const p1 = list[i];
    const p2 = list[(i + 1) % list.length]; // điểm cuối nối về điểm đầu
    sum += (p2.lng - p1.lng) * rad * (2 + Math.sin(p1.lat * rad) + Math.sin(p2.lat * rad));
  }

  return Math.abs((sum * R * R) / 2);
}

export function hectares(squareMeters: number): number {
  return squareMeters / 10000;
}

export function formatHectares(value: number): string {
  if (value >= 1) return `${value.toFixed(2)} ha`;
  // Thửa nhỏ dưới 1 ha thì hiện thêm số mét vuông cho dễ hình dung
  return `${value.toFixed(4)} ha (${Math.round(value * 10000)} m²)`;
}
