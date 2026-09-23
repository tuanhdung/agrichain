# AgriChain — Tổng quan nghiệp vụ dự án

> Tài liệu này mô tả **dự án đã làm được gì** theo góc độ sản phẩm/nghiệp vụ,
> dành cho người hoặc AI mới tiếp cận project lần đầu và cần hiểu nhanh bức
> tranh tổng thể — khác với `CLAUDE.md` (quy ước kỹ thuật chi tiết: cấu trúc
> file, tên biến, lịch sử từng lần sửa) và `SCHEMA-EXPORT.md` (cấu trúc dữ
> liệu thô của từng collection). Đọc file này trước, cần đào sâu kỹ thuật thì
> mới sang 2 file kia.

## 1. Dự án là gì

**AgriChain** là nền tảng **truy xuất nguồn gốc nông sản** kết hợp blockchain
và AI: nông trại ghi nhận toàn bộ quá trình sản xuất (mùa vụ, nhật ký chăm
sóc, vật tư sử dụng, chứng nhận chất lượng), đóng gói thành **lô hàng** gắn
mã QR; người tiêu dùng quét mã là xem được lịch sử canh tác của đúng lô sản
phẩm mình mua. Ngoài truy xuất, dự án còn có một lớp thương mại điện tử để
nông trại/doanh nghiệp bán trực tiếp nông sản có thể truy xuất được.

Frontend là **HTML/CSS/JS thuần**, không framework, không build tool — mỗi
trang là 1 file `.html` tĩnh, tự nạp CSS/JS riêng. Backend là một **repo
FastAPI riêng** (`agrichain-api`), expose REST API thật, dữ liệu lưu ở
database quan hệ với RBAC (phân quyền theo vai trò).

## 2. Ba loại tài khoản

| Loại | Ý nghĩa | Vào được đâu |
|---|---|---|
| `customer` | Người tiêu dùng mua hàng | Trang mua sắm `agriverse-3d.html`, truy xuất công khai |
| `business` | Nông hộ / doanh nghiệp sản xuất | Toàn bộ khu quản trị (nông trại, mùa vụ, lô hàng, nhân sự...) |
| `platform_admin` | Quản trị viên nền tảng AgriChain (không thuộc Đơn vị nào) | Dùng chung khu quản trị với `business`, nhưng **chỉ xem** dữ liệu của **mọi** Đơn vị cùng lúc |

Đăng ký (`dang-ky.html`) có 2 tab tương ứng `customer`/`business`.
`platform_admin` không tự đăng ký được, tạo thủ công qua script seed riêng.

## 3. Các nhóm nghiệp vụ đã hoàn thiện

### 3.1. Trang giới thiệu công khai
Trang chủ (`index.html`), Blog (bài viết cố định, chưa có CMS quản lý), trang
truy xuất nguồn gốc công khai (quét QR hoặc gõ mã lô hàng, không cần đăng
nhập) — tất cả dùng chung 1 bộ header/footer marketing.

### 3.2. Quản lý sản xuất ("Hoạt động sản xuất") — trục nghiệp vụ chính
Dành cho tài khoản `business`, theo chuỗi:

```
Nông trại (vùng trồng, toạ độ, diện tích)
   └─ Mùa vụ (1 vụ canh tác cụ thể, có ngày bắt đầu/thu hoạch dự kiến)
        ├─ Nhật ký hoạt động (bón phân, tưới nước, thu hoạch... kèm ảnh)
        ├─ Vật tư dùng trong nhật ký (phân bón, thuốc BVTV... định lượng)
        ├─ Chứng nhận (VietGAP, hữu cơ... kèm file/ảnh minh chứng)
        ├─ Quy trình mùa vụ = checklist các bước phải làm tuần tự,
        │   áp dụng từ 1 "Mẫu quy trình" đã soạn sẵn (hoặc tạo rỗng tự thêm bước)
        └─ Lô hàng (đóng gói sản phẩm ra khỏi mùa vụ, mỗi lô 1 mã QR
             để người mua truy xuất công khai)
```

**Mẫu quy trình** (`mau-quy-trinh.html`) là bản thiết kế dùng lại nhiều lần
(VD "Quy trình trồng lúa hữu cơ" gồm N bước: gieo hạt → bón phân → thu
hoạch...), còn "Quy trình mùa vụ" là 1 lần áp dụng cụ thể cho 1 mùa vụ, có
tiến độ thực hiện riêng (bước nào đã xong, gắn với nhật ký/lô hàng nào).

Vật tư (`vat-tu.html`) là danh mục phân bón/thuốc/vật tư dùng chung cho cả
Đơn vị, tham chiếu từ nhật ký và bước quy trình.

### 3.3. Quản lý người dùng & phân quyền
`tai-khoan.html` — Đơn vị tự quản lý nhân sự của mình: thêm/sửa/vô hiệu hoá
người dùng, đặt lại mật khẩu. Phân quyền theo **vai trò** (RBAC): 36 mã
quyền (9 nhóm nghiệp vụ × 4 hành động add/edit/view/delete), gán vào vai
trò chứ không gán riêng từng người. Có cơ chế "Nhường quyền quản trị" để
chuyển vai trò Quản trị Đơn vị (vai trò hệ thống, không sửa quyền được) cho
người khác.

`ho-so.html` — mỗi người tự xem/sửa hồ sơ và đổi mật khẩu của chính mình.

### 3.4. Thương mại điện tử nội bộ (7 trang `thuong-mai-*`)
Bộ công cụ bán hàng cho Đơn vị: hồ sơ cửa hàng, quản lý sản phẩm (mỗi sản
phẩm nhiều biến thể, có thể gắn 1 lô hàng thật để truy xuất), đơn hàng, địa
chỉ vận chuyển, nhập kho theo mã vạch, và máy tính tiền (POS) bán tại quầy.
**Hiện chỉ tài khoản `platform_admin` mở được nhóm menu này** (quyết định
sản phẩm mới nhất, chưa mở lại cho `business`); dữ liệu vẫn lưu cục bộ
(localStorage), chưa qua backend thật.

### 3.5. Sàn thương mại điện tử công khai
`agriverse-3d.html` — trang mua sắm chính thức dành cho `customer`, giao
diện 3D/hiệu ứng riêng. Hiện dữ liệu sản phẩm là hardcode demo, chưa nối vào
dữ liệu sản phẩm thật của Đơn vị.

### 3.6. Quản trị hệ thống (`platform_admin`)
Không có trang riêng — dùng chung giao diện khu quản trị của `business`,
nhưng đổi nguồn dữ liệu sang API riêng (`/system/*`) để xem **read-only**
farms/mùa vụ/nhật ký/chứng nhận/vật tư/mẫu quy trình/lô hàng của **mọi** Đơn
vị cùng lúc, kèm cột "Đơn vị sở hữu" để phân biệt. Không có nút thêm/sửa/xoá
nào (trừ vài chỗ mở modal ở chế độ chỉ xem để thấy chi tiết).

## 4. Mức độ hoàn thiện kết nối backend

- **Đã dùng backend thật (API)**: đăng nhập/đăng ký, quản lý nhân sự &
  phân quyền, nông trại, vật tư, mẫu quy trình, mùa vụ/nhật ký/chứng
  nhận/lô hàng (toàn bộ chuỗi "Hoạt động sản xuất"), hồ sơ cá nhân, truy
  xuất công khai, dashboard platform_admin.
- **Vẫn mô phỏng bằng localStorage (chưa có backend)**: thương mại điện tử
  nội bộ (shop/sản phẩm/đơn hàng/vận chuyển/nhập hàng/POS), sàn công khai
  AgriVerse (dữ liệu hardcode).
- **Đã bỏ hẳn**: cơ chế "niêm phong blockchain" mô phỏng phía client (hash
  chain giả lập) — backend thật chưa có anchoring blockchain, nên khối UI
  đó bị ẩn thay vì hiện dữ liệu sai.

## 5. Việc chưa làm (đáng chú ý nhất)

- Chưa có anchoring blockchain thật ở backend (mới có cột trạng thái
  `pending` cố định).
- Thương mại điện tử nội bộ + sàn công khai AgriVerse chưa nối dữ liệu thật
  với nhau và chưa có backend riêng.
- Chưa có giỏ hàng/thanh toán thật, chưa có trang chi tiết cửa hàng/sản
  phẩm trên sàn công khai.
- Form Liên hệ ở trang chủ chỉ validate phía client, chưa gửi đi đâu.
- Blog chưa có backend quản lý nội dung (bài viết là dữ liệu tĩnh).
- Token đăng nhập lưu ở localStorage/sessionStorage — cần chuyển sang cookie
  `httpOnly` trước khi lên production (rủi ro XSS đã ghi nhận).

## 6. Muốn biết chi tiết hơn thì đọc gì

- **`CLAUDE.md`** — quy ước code, cấu trúc file, lịch sử từng lần sửa/vá lỗi,
  chi tiết từng route API đã dùng. Đọc khi cần SỬA CODE.
- **`SCHEMA-EXPORT.md`** — cấu trúc dữ liệu (field, kiểu, quan hệ) của 7 thực
  thể "Hoạt động sản xuất". Đọc khi cần biết CHÍNH XÁC 1 bản ghi có field gì.
