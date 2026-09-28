# Schema JSON — `GET /batches/by-code/{code}/public`

Tài liệu này mô tả cấu trúc JSON mà `truy-xuat.html` (trang truy xuất nguồn
gốc công khai, xem `CLAUDE.md` mục "Kết nối backend") kỳ vọng nhận được từ
route **`GET /batches/by-code/{code}/public`**.

**Cập nhật 2026-09-27: route đã IMPLEMENT thật ở `agrichain-api`** (migration
`011_batch_blockchain_fields.sql`, `app/schemas/public_batch.py`,
`routers/batches.py::get_batch_public_traceability` — xem
`agrichain-api/CLAUDE.md` mục "Xác thực blockchain lô hàng" để biết chi
tiết). `js/truy-xuat.js` hiện VẪN đọc dữ liệu MẪU từ
`data/public-batch-mock.json` (cờ `USE_MOCK_DATA = true`) — việc đổi cờ này
sang gọi route thật là việc CỦA REPO NÀY, **VẪN CHƯA làm** ở lần cập nhật
này (Giai đoạn C, xem mục "`POST /batches/{id}/verify-blockchain`" bên dưới,
chỉ đụng tới SPA `app/`, không đụng `js/truy-xuat.js`).

**Cập nhật 2026-09-28 (Giai đoạn C): route GHI `POST
/batches/{id}/verify-blockchain` cũng đã IMPLEMENT thật** — xem mục riêng
ngay dưới đây. Vẫn còn 1 việc CHƯA làm ở phía backend: contract
`AgriChainRegistry.sol` **CHƯA được deploy** lên Polygon Amoy thật (đang chờ
token testnet) — mọi lần gọi route ghi ở MỌI môi trường hiện tại (kể cả local
dev) đều trả **503**, KHÔNG có ca thành công thật nào để kiểm chứng được cho
tới khi deploy xong (xem `agrichain-api/CLAUDE.md` mục "Xác thực blockchain
lô hàng").

Khuôn JSON dưới đây khớp ĐÚNG với response thật, TRỪ 2 điểm sai khác đã ghi
chú ngay tại chỗ: `certifications` route thật luôn trả mảng rỗng (không như
mock có sẵn 2 chứng nhận mẫu), và mọi field blockchain (`contract_address`
trở xuống) đều `null` vì chưa có lô hàng nào được anchor thật.

Route public, KHÔNG cần đăng nhập — đúng khuôn 4 route public-read đã có
(`GET /farms/{id}`, `GET /seasons/{id}`, `GET /batches/{id}`,
`GET /batches/by-code/{code}`): bỏ `require_permission`, gọi thẳng repo với
`organization_id=None`.

## Khuôn JSON đầy đủ

```jsonc
{
  "batch": {
    "code": "VUON3-VU2-2026",
    "status": "harvested",              // enum BatchStatus (xem agrichain-api/app/schemas/enums.py)
    "start_date": "2026-07-20",
    "harvest_date": "2026-09-19",        // dự kiến
    "actual_harvest_date": "2026-09-21", // null nếu chưa thu hoạch
    "expected_yield": 6000,
    "unit": "kg",
    "note": "Phát triển tốt, không sâu bệnh.",

    // 3 field đã có sẵn từ migration 004 (verification_status/tx_hash/anchored_at)
    "verification_status": "anchored",   // 'pending' | 'anchored' | 'mismatch'
    "tx_hash": "0x1a2b3c...",            // null nếu 'pending'
    "anchored_at": "2026-09-22T03:15:00Z",

    // 4 field MỚI, migration 011_batch_blockchain_fields.sql — CỘT ĐÃ CÓ,
    // nhưng CHƯA lô hàng nào được anchor thật (app/blockchain.py chưa làm)
    // nên hiện luôn null. Tên cột giữ nguyên đúng như đã chốt ở đây.
    "contract_address": "0xAbCdEf...",   // null cho tới khi anchor thật
    "signer_address": "0x...",           // ví backend đã ký giao dịch ghi hash (Signer/Tenant Wallet trên UI), null tương tự
    "network": "Polygon Amoy Testnet",   // chuỗi cố định, xem quyết định đã chốt — null tương tự
    "block_number": 12345678,            // null tương tự

    // TÍNH TOÁN, không lưu DB — ghép base URL explorer + tx_hash lúc trả response
    "explorer_url": "https://amoy.polygonscan.com/tx/0x1a2b3c...",  // null khi tx_hash null

    // ĐÃ CHỐT (khác băn khoăn trước đây): lưu CỘT THẬT, không tính lại lúc trả
    // response — cùng pattern với tx_hash/anchored_at. Cột `data_hash` đã có
    // ở migration 011, hiện null cho tới khi có app/blockchain.py::compute_data_hash()
    // thật gửi giá trị lên contract lúc anchor.
    "data_hash": "0x9f8e7d..."           // null cho tới khi anchor thật
  },

  "farm": {
    "name": "Vườn Tiến Phát 3",
    "code": "VUON3",
    "address": "Thôn 4, xã Tân Lập",
    "ward": "Xã Tân Lập",
    "province": "Lâm Đồng",
    "national_puc": "VN-LD-00123",        // mã vùng trồng, null nếu chưa có
    "polygon": [                          // ranh giới thửa đất, tối thiểu 3 điểm
      { "lat": 11.9404, "lng": 108.4583 },
      { "lat": 11.9412, "lng": 108.4590 },
      { "lat": 11.9398, "lng": 108.4599 }
    ]
  },

  "season": {
    "name": "Vụ 2",
    "code": "VU2-2026",
    "start_date": "2026-07-01",
    "end_date": "2026-10-15"
  },

  // ĐÃ CÓ CHỖ LƯU (migration 011): organizations.logo_url/tagline, nullable.
  // CHƯA có route nào GHI giá trị (chưa làm CRUD Đơn vị, xem
  // agrichain-api/CLAUDE.md mục "Giai đoạn 4 — còn lại những gì") nên route
  // public hiện luôn trả `null` cho cả 2 field — trang vẫn cần fallback dùng
  // chữ cái đầu của `name` làm avatar chữ (giống `.avatar` component đã có ở
  // khu quản trị) cho tới khi có nơi ghi giá trị thật.
  "organization": {
    "name": "HTX Nông Nghiệp Tiến Phát",
    "tagline": null,
    "logo_url": null
  },

  // Chứng nhận CỦA NÔNG TRẠI — route thật (2026-09-27) CỐ TÌNH luôn trả
  // MẢNG RỖNG ở bước này, KHÔNG query certifications thật (quyết định lúc
  // implement: giữ đúng phạm vi ban đầu, tránh phải quyết thêm về filter/
  // quyền cho một ngoại lệ public mới). Mock vẫn giữ 2 bản ghi mẫu bên dưới
  // để dựng giao diện, nhưng khi đổi USE_MOCK_DATA sang false, phần này trên
  // trang thật sẽ RỖNG cho tới khi làm riêng.
  "certifications": [
    { "name": "VietGAP", "issuer": "Trung tâm Chất lượng Nông lâm thuỷ sản" }
  ],

  // TOÀN BỘ season_logs của season chứa batch này (KHÔNG lọc riêng theo
  // batch — xem lý do ở kế hoạch Giai đoạn B đã chốt), sắp xếp theo
  // performed_at TĂNG DẦN (đúng thứ tự "hành trình sinh trưởng").
  "logs": [
    {
      "activity_type": "planting",   // 1 trong 9 giá trị CỐ ĐỊNH — xem bên dưới
      "performed_at": "2026-07-20T02:00:00Z",
      "performed_by": "Anh Nguyễn Văn Tiến",
      "weather": "Nắng nhẹ, 28°C",
      "description": "Xuống giống dưa lưới giống Huỳnh Long trên luống đã chuẩn bị.",
      "images": [
        { "url": "https://.../log1-1.jpg", "name": "luong-cay.jpg" }
      ]
    }
  ]
}
```

## `POST /batches/{id}/verify-blockchain` (Giai đoạn C, 2026-09-28)

Route GHI DUY NHẤT của tính năng blockchain — neo `data_hash` (tính tất định
từ batch + season + logs, xem `app/blockchain.py::compute_data_hash()` phía
`agrichain-api`) lên smart contract `AgriChainRegistry` (Polygon Amoy
testnet). **Yêu cầu đăng nhập + quyền `batches.edit`** (dùng lại, KHÔNG có
quyền riêng cho việc này) — khác `GET /batches/by-code/{code}/public` ở
phần trên (route đó public, route này thì không). Gọi từ `app/`
(`api.batches.verifyBlockchain(id)`, xem `app/CLAUDE.md` mục "Nút Xác thực
blockchain"), KHÔNG gọi từ `js/lo-hang.js`/`js/nong-trai-chi-tiet.js` (2
file site tĩnh đã BỎ HẲN khối "Xác thực blockchain" từ trước, xem
`CLAUDE.md` gốc mục "Kết nối backend" — ngoài phạm vi Giai đoạn C này, chưa
port lại cho site tĩnh).

**Request**: không có body. **Response THÀNH CÔNG (200)**: `BatchOut` đầy đủ
(cùng khuôn field `batch` ở trên, phẳng — không lồng trong object `batch`
như response public), với 6 field blockchain đã điền:
`verification_status: "anchored"`, `tx_hash`, `anchored_at`,
`contract_address`, `signer_address`, `network` (cố định
`"Polygon Amoy Testnet"`), `block_number`, `data_hash`.

**Điều kiện + lỗi (đã xác nhận qua đọc source thật `routers/batches.py` +
test tay bằng backend local, KHÔNG suy đoán):**

| Điều kiện | HTTP | `error.code` | `error.message` |
|---|---|---|---|
| `batch.status` không thuộc `{harvested, processed, completed}` | 409 | `CONFLICT` | "Chỉ neo được lô hàng ở trạng thái đã thu hoạch, đang xử lý hoặc hoàn tất." |
| `batch.verification_status` đã là `"anchored"` | 409 | `CONFLICT` | "Lô hàng này đã được xác thực blockchain trước đó." |
| Thiếu `BLOCKCHAIN_PRIVATE_KEY`/`BLOCKCHAIN_CONTRACT_ADDRESS`, mất kết nối RPC, hoặc giao dịch bị revert | 503 | `SERVICE_UNAVAILABLE` | 1 trong vài câu tuỳ nguyên nhân (VD "Chưa cấu hình đủ BLOCKCHAIN_PRIVATE_KEY/BLOCKCHAIN_CONTRACT_ADDRESS — chưa thể neo hash lên blockchain.") — **KHÔNG BAO GIỜ** nội suy chi tiết kỹ thuật/exception gốc vào message |

Lỗi 503 **KHÔNG ghi gì vào database** — transaction rollback hoàn toàn (xem
`agrichain-api/CLAUDE.md`), batch giữ nguyên `verification_status='pending'`,
gọi lại `POST /batches/{id}/verify-blockchain` ngay sau đó là an toàn, không
có trạng thái nửa vời nào phải lo. Đây là lý do UI phía `app/` hiện thông
báo lỗi 503 CỐ ĐỊNH ("Chưa xác thực được, vui lòng thử lại sau.") thay vì
message kỹ thuật ở trên, và KHÔNG khoá nút vĩnh viễn sau khi lỗi.

**Đã kiểm chứng thật** (2026-09-28, backend local, `BLOCKCHAIN_CONTRACT_ADDRESS`
còn trống — đúng trạng thái mọi môi trường hiện tại): tạo batch trạng thái
`harvested` qua API thật rồi gọi route này → nhận đúng 503 với message ở
bảng trên; tạo batch trạng thái `planning` rồi gọi → nhận đúng 409 với đúng
message dòng đầu bảng trên. Chưa kiểm chứng được nhánh 200 thành công (cần
contract đã deploy) và nhánh 409 "đã anchored" (cần ít nhất 1 lần anchor
thành công trước đó) — cả 2 phụ thuộc vào việc deploy contract thật, ngoài
khả năng kiểm ở máy dev hiện tại.

## ⚠️ Danh mục hoạt động (`activity_type`) — DÙNG ĐÚNG 9 GIÁ TRỊ CỐ ĐỊNH, không tự thêm

Bản mô tả thiết kế ban đầu có nhắc "Thụ phấn" như 1 loại hoạt động riêng —
**giá trị này KHÔNG tồn tại** trong ràng buộc CHECK của cột
`season_logs.activity_type` (`agrichain-api/migrations/003_business_domains.sql`)
lẫn nguồn nhãn/icon DUY NHẤT của dự án (`js/enums.js`,
`AgriChain.ACTIVITY_TYPES` — file này ghi rõ *"KHÔNG được có hai bản nhãn cho
cùng một enum trong dự án"*). Timeline ở `truy-xuat.html` vì vậy dùng **đúng
9 giá trị đã có**, không phải danh sách rút gọn trong yêu cầu ban đầu:

| `activity_type` | Nhãn | Icon (`icons/sprite.svg`) |
|---|---|---|
| `planting` | Gieo trồng / Gieo hạt | `icon-seed` |
| `fertilizing` | Bón phân | `icon-flask` |
| `watering` | Tưới nước | `icon-droplet` |
| `pest_control` | Phòng trừ sâu bệnh | `icon-bug` |
| `weeding` | Làm cỏ | `icon-grass` |
| `pruning` | Cắt tỉa | `icon-scissors` |
| `harvesting` | Thu hoạch | `icon-wheat` |
| `inspection` | Kiểm tra / Giám sát | `icon-eye` |
| `other` | Hoạt động khác | `icon-box` |

Muốn có "Thụ phấn" thật thì cần 1 migration mới đổi CHECK constraint +
thêm vào `js/enums.js` — ngoài phạm vi trang public này.

## Sai khác khác so với mô tả thiết kế ban đầu

- **URL param dùng `?ma=`, không phải `?code=`** — toàn dự án đã dùng thống
  nhất `?ma=<mã>` cho MỌI trang "chi tiết 1 bản ghi" (xem `CLAUDE.md` gốc,
  quy ước "trang chi tiết dùng query string"), kể cả link QR sẽ sinh ra từ
  `BatchCard.tsx` (`mainSiteUrl('truy-xuat.html?ma=' + code)`, xem kế hoạch
  Giai đoạn C). Đổi sang `?code=` sẽ tạo 2 tên tham số khác nhau cho cùng 1
  khái niệm trong cùng dự án — giữ nguyên `?ma=`.
- **Không có route dạng đường dẫn `/qr/{code}`** — dự án là site tĩnh không
  có router phía server (xem `CLAUDE.md` gốc, mục đầu file) — mọi trang
  "chi tiết" đều dùng query string trên 1 file `.html` dùng chung, không thể
  dùng path động như `/qr/VUON3-VU2-2026` nếu không cấu hình rewrite rule ở
  tầng hosting (ngoài phạm vi).

## Việc chưa làm (cập nhật 2026-09-27)

- ~~Cột `data_hash` cho bảng `batches`~~ — **ĐÃ CÓ** (migration 011), null cho
  tới khi anchor thật.
- ~~`organizations.logo_url`/`organizations.tagline` — chưa có chỗ lưu~~ —
  **ĐÃ CÓ CHỖ LƯU** (migration 011), nhưng vẫn CHƯA có route ghi giá trị.
- ~~route `POST /batches/{id}/verify-blockchain` + `app/blockchain.py`~~ —
  **ĐÃ LÀM** (2026-09-28, Giai đoạn C — xem mục riêng ở trên), gọi từ SPA
  `app/` qua `api.batches.verifyBlockchain()`. Vẫn còn 1 việc CHƯA làm:
  **deploy contract thật lên Polygon Amoy** (đang chờ token testnet) —
  không có contract thì MỌI lần gọi route này đều trả 503, không có ca
  thành công thật nào để kiểm chứng cho tới lúc đó.
- **Vẫn chưa làm**: ngoại lệ public thật cho phần `certifications` (hiện route
  luôn trả mảng rỗng, xem ghi chú tại chỗ ở trên).
- **Chưa làm ở repo này**: đổi `USE_MOCK_DATA` sang `false` trong
  `js/truy-xuat.js` để gọi route thật — route backend đã sẵn sàng. Route
  ghi (`verify-blockchain`) cũng CHƯA được gọi lại từ site tĩnh
  (`js/lo-hang.js`/`js/nong-trai-chi-tiet.js`) — Giai đoạn C chỉ thêm ở SPA
  `app/`, khối "Xác thực blockchain" ở 2 file site tĩnh đó vẫn đang BỎ HẲN
  như trước (xem `CLAUDE.md` gốc mục "Kết nối backend").
