// Tiện ích dùng chung của nhóm trang quản trị TMĐT: tạo slug từ tên + bộ nông sản mẫu cho nút
// "Nạp nông sản mẫu". Toàn bộ dữ liệu nghiệp vụ (đơn hàng, danh mục, bài viết, sản phẩm, tài khoản) đã
// nằm ở backend — qua `api.system.*`, không còn lưu trong trình duyệt.

/** 'Rau Củ Quả Hữu Cơ' → 'rau-cu-qua-huu-co' (cùng quy tắc với app/schemas/category.py::slugify bên backend). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface SampleProduct {
  name: string;
  sku: string;
  category: string;
  origin: string;
  stock: number;
  unit: string;
  retailPrice: number;
  wholesalePrice: number;
  moq: number;
  standards: string;
  featured: boolean;
}

export function sampleProducts(): SampleProduct[] {
  const rows: [string, string, string, number, string, number, number, number, string, boolean][] = [
    ['Dưa Lưới Tiến Phát Hữu Cơ', 'Trái Cây Đặc Sản', 'Lâm Đồng', 320, 'Quả', 145000, 130000, 10, 'VietGAP', true],
    ['Dưa Lưới Huỳnh Long', 'Trái Cây Đặc Sản', 'Lâm Đồng', 210, 'Quả', 165000, 150000, 10, 'VietGAP', true],
    ['Cà Phê Moka Langbiang Rang Mộc', 'Cà Phê & Cacao', 'Lâm Đồng', 150, 'Gói', 245000, 225000, 5, 'OCOP', true],
    ['Cà Phê Fine Robusta Honey', 'Cà Phê & Cacao', 'Đắk Lắk', 180, 'Gói', 180000, 165000, 5, '', false],
    ['Mít Thái Sấy Dẻo Ít Đường', 'Hoa Quả Sấy', 'Đồng Tháp', 400, 'Gói', 120000, 108000, 10, 'OCOP', false],
    ['Xoài Cát Chu Sấy Dẻo OCOP', 'Hoa Quả Sấy', 'Đồng Tháp', 260, 'Gói', 110000, 99000, 10, 'OCOP', false],
    ['Mật Chiết Hoa Dưa Lưới & Bạc Hà', 'Mật Ong & Gia Vị', 'Lâm Đồng', 90, 'Chai', 210000, 190000, 6, 'Hữu cơ', true],
    ['Gạo ST25 Lúa Tôm Hữu Cơ - Bao 10kg', 'Gạo & Ngũ Cốc', 'Sóc Trăng', 500, 'Bao', 250000, 240000, 10, 'Hữu cơ', true]
  ];
  return rows.map((r, i) => ({
    name: r[0],
    sku: 'SP-' + String(i + 1).padStart(3, '0'),
    category: r[1],
    origin: r[2],
    stock: r[3],
    unit: r[4],
    retailPrice: r[5],
    wholesalePrice: r[6],
    moq: r[7],
    standards: r[8],
    featured: r[9]
  }));
}
