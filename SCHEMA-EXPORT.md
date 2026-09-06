# SCHEMA-EXPORT — Cấu trúc dữ liệu "Hoạt động sản xuất"

Tài liệu này mô tả cấu trúc dữ liệu hiện có của 6 thực thể thuộc nhóm
"Hoạt động sản xuất": **farms** (nông trại), **seasons** (mùa vụ),
**seasonLogs** (nhật ký hoạt động), **supplies** (vật tư), **certifications**
(chứng nhận), **workflowTemplates** (mẫu quy trình).

Mục đích: làm tài liệu tham chiếu khi thiết kế backend thật (API) thay thế
dần cho lớp `js/store.js` (localStorage) hiện tại — cùng tinh thần với mục
"Kết nối backend" đã áp dụng cho `tai-khoan.html`/`dang-nhap.html` trong
`CLAUDE.md`.

## Cách đọc tài liệu này

- Nguồn: đọc trực tiếp `js/store.js` (lớp lưu trữ generic, không tự định
  nghĩa khuôn dữ liệu — chỉ có `list/insert/update/remove` thô) và toàn bộ
  trang đang đọc/ghi 6 collection trên: `js/nong-trai.js`, `js/nong-trai-chi-tiet.js`,
  `js/vat-tu.js`, `js/mau-quy-trinh.js`, `js/lo-hang.js`, `js/truy-xuat.js`.
  Khuôn dữ liệu suy ra từ chính các form/validate()/payload gửi vào
  `store.insert()`/`store.update()` trong các file này — không có schema
  khai báo tường minh ở đâu khác trong dự án.
- **⚠️ Bản ghi mẫu ở mỗi mục là dữ liệu MINH HOẠ do agent dựng lại đúng theo
  khuôn/quy ước trong code, KHÔNG PHẢI trích xuất từ dữ liệu thật đang nằm
  trong `localStorage` trình duyệt của bạn** — agent chạy trong terminal,
  không có quyền truy cập trình duyệt/localStorage của bạn nên không thể đọc
  dữ liệu bạn đã nhập. Nếu cần bản ghi THẬT, mở DevTools Console ở bất kỳ
  trang nào trong app rồi chạy:
  ```js
  JSON.parse(localStorage.getItem('agrichain:farms'))       // hoặc seasons/seasonLogs/...
  ```
  rồi tự ẩn các trường nhạy cảm (địa chỉ thật, tên người...) trước khi chia sẻ.

## Quy ước chung (áp dụng cho cả 6 thực thể)

- **Key localStorage**: `agrichain:<tên collection>` — tiền tố `agrichain:`
  cộng thẳng tên trong mảng `COLLECTIONS` của `js/store.js` (VD
  `agrichain:farms`). Giá trị là 1 mảng JSON chứa toàn bộ bản ghi (không
  phân trang phía lưu trữ — phân trang nếu có là do trang tự cắt mảng khi
  hiển thị).
- **`id`**: mọi bản ghi đều có, do `store.insert()` tự sinh qua `newId()` —
  `Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)`
  (VD `"mgk3x1z-a9f3q2"`). Đây là mã NỘI BỘ, không phải mã hiển thị
  (`code`) — xem mục "Trường chỉ dùng ở client" bên dưới.
- **`createdAt`**: chuỗi ISO 8601, do `store.insert()` tự gán nếu bản ghi
  gửi lên chưa có sẵn — LUÔN có mặt ngay từ khi tạo, không null.
- **`updatedAt`**: chuỗi ISO 8601, do `store.update()` tự gán MỖI LẦN gọi
  update — **KHÔNG có mặt trên bản ghi vừa tạo mới**, chỉ xuất hiện sau lần
  sửa đầu tiên. Khi đọc để hiển thị, code trong app luôn ưu tiên
  `updatedAt || createdAt` để tránh `undefined`.
- **Không có `ownerId`**: khác nhóm "Thương mại điện tử" (`shops`,
  `products`... khoá theo `ownerId = session.id`), cả 6 collection này dùng
  chung 1 danh sách cho toàn bộ phiên đăng nhập hiện tại — đúng quy ước
  "Hoạt động sản xuất" đã ghi trong `CLAUDE.md`.
- Mọi validate() hiện tại đều chạy **phía client only** (không có server nào
  kiểm tra lại) — khi chuyển sang API thật, các ràng buộc "bắt buộc"/"không
  trùng mã" liệt kê dưới đây cần được backend validate lại, không thể tin
  tưởng dữ liệu gửi lên đã hợp lệ.

---

## 1. `farms` (Nông trại)

**Key localStorage**: `agrichain:farms`
**Trang/JS quản lý**: `nong-trai.html` / `js/nong-trai.js` (thêm/sửa/xoá/danh sách),
đọc thêm ở `js/nong-trai-chi-tiet.js`, `js/lo-hang.js`, `js/truy-xuat.js` (public).

| Trường | Kiểu | Bắt buộc | Null? | Ý nghĩa |
|---|---|---|---|---|
| `id` | string | có (auto) | không | Mã nội bộ, xem "Quy ước chung". |
| `code` | string | **có** | không | Mã hiển thị do người dùng đặt (gợi ý sẵn `NV01`, `NV02`... qua `store.nextFarmCode()`, đếm theo tổng số farm hiện có — có thể trùng nếu 2 nông trại bị xoá/thêm xen kẽ, chỉ là gợi ý). Phải **duy nhất toàn cục** (validate so sánh với mọi farm khác, không phân biệt hoa/thường). Dùng làm khoá trên URL (`nong-trai-chi-tiet.html?ma=<code>`) — xem quy ước "trang chi tiết dùng query string" trong `CLAUDE.md`. |
| `name` | string | **có** | không | Tên nông trại. |
| `nationalPuc` | string | không | có thể rỗng `''` | **Mã vùng trồng nội địa** (Production Unit Code) — mã số vùng trồng do cơ quan trong nước cấp, dùng truy xuất nguồn gốc nội địa. |
| `internationalPuc` | string | không | có thể rỗng `''` | **Mã vùng trồng quốc tế** — mã tương đương dùng khi xuất khẩu (yêu cầu bởi thị trường nhập khẩu, VD GACC Trung Quốc). |
| `province` | string | **có** | không | **Tên** tỉnh/thành phố (không phải mã số) — theo 34 tỉnh/thành sau sáp nhập 2025, nạp từ `data/provinces.json`. Lưu tên để hiển thị trực tiếp, không cần join. |
| `ward` | string | **có** | không | Tên phường/xã (không phải mã), nạp phụ thuộc theo `province` từ `data/wards/{provinceCode}.json`. |
| `address` | string | **có** | không | Địa chỉ chi tiết (số nhà, đường/thôn...). |
| `startDate` | string (`YYYY-MM-DD`) | **có** | không | Ngày bắt đầu canh tác/thành lập nông trại. |
| `area` | number | **có** | không | Diện tích, đơn vị **hecta (ha)**. Có thể tự động điền lại từ diện tích tính ra khi khoanh `polygon` (nút "Áp dụng diện tích"), nhưng vẫn là 1 field độc lập, người dùng sửa tay được sau đó — **không đảm bảo luôn khớp diện tích hình học của `polygon`**. |
| `description` | string | **có** | không | Mô tả tự do về nông trại. |
| `polygon` | `Array<{lat:number, lng:number}>` | **có — BẮT BUỘC, tối thiểu 3 điểm** | không | **Ranh giới thửa đất**, vẽ bằng cách bấm liên tiếp lên bản đồ Leaflet (mỗi lần bấm thêm 1 điểm `{lat, lng}` làm tròn 6 chữ số thập phân). ≥ 3 điểm mới khép được thành đa giác — **quyết định nghiệp vụ (2026-09-06): `polygon` là NOT NULL, khớp constraint đã có sẵn trong migration `003` của backend, KHÔNG nới lỏng thành nullable.** `validate()` phía client chặn submit nếu < 3 điểm (0, 1 hoặc 2 điểm đều bị chặn như nhau — không có "bỏ qua bước khoanh"). Diện tích hình học tính từ đây dùng công thức lượng giác cầu (không phải công thức phẳng) vì lệch ở Việt Nam ~4%. |
| `createdAt` | string (ISO) | có (auto) | không | Xem "Quy ước chung". |
| `updatedAt` | string (ISO) | không (auto khi sửa) | có thể vắng mặt | Xem "Quy ước chung". |

**Bản ghi mẫu (minh hoạ, không phải dữ liệu thật) — trường hợp ĐÃ khoanh ranh giới:**

```json
{
  "id": "mgk3x1z-a9f3q2",
  "code": "NV01",
  "name": "Nông trại Xanh Tây Nguyên",
  "nationalPuc": "VN-DL-00123",
  "internationalPuc": "",
  "province": "Lâm Đồng",
  "ward": "Phường Xuân Trường",
  "address": "Thôn 4, đường Nguyễn Văn A",
  "startDate": "2024-03-01",
  "area": 2.35,
  "description": "Nông trại trồng cà phê Arabica theo hướng hữu cơ, canh tác từ 2024.",
  "polygon": [
    { "lat": 11.912345, "lng": 108.441234 },
    { "lat": 11.913456, "lng": 108.442345 },
    { "lat": 11.911234, "lng": 108.443456 }
  ],
  "createdAt": "2026-08-10T02:15:30.000Z",
  "updatedAt": "2026-08-20T07:42:11.000Z"
}
```

> **Đã đảo ngược quyết định trước đó (2026-09-06):** một phiên bản trước của
> tài liệu này từng mô tả `polygon` là tuỳ chọn (`null` khi chưa khoanh) và
> kèm 1 bản ghi mẫu minh hoạ trạng thái đó ("Nông trại Sen Đồng Tháp",
> `polygon: null`). Đây KHÔNG PHẢI là trạng thái hợp lệ — quyết định nghiệp
> vụ chính thức là giữ nguyên `polygon` NOT NULL, tối thiểu 3 điểm, khớp
> constraint đã có sẵn trong migration `003` của backend. `js/nong-trai.js`
> đã sửa lại đúng theo ràng buộc này (không còn cho submit khi 0 điểm).
> Không có bản ghi mẫu nào cho trạng thái "chưa khoanh ranh giới" nữa —
> mọi `farms` hợp lệ đều phải có `polygon` với ≥ 3 điểm.

**Quan hệ**: `farms.id` được tham chiếu bởi `seasons.farmId`,
`certifications.farmId`, `seasonLogs.farmId` (bản sao), và `batches.farmId`
(ngoài phạm vi tài liệu này — xem mục "Quan hệ tổng hợp" cuối file).

**Trường chỉ dùng ở client**: không có field UI-thuần-tuý nào trên `farms` —
mọi trường đều là dữ liệu nghiệp vụ cần backend lưu. Duy nhất `id` là chi
tiết triển khai (định dạng sinh mã) sẽ đổi khi có backend thật (PK do
backend sinh — UUID/serial — thay vì `timestamp+random` của localStorage);
khái niệm "1 id nội bộ, khác `code` hiển thị" thì vẫn giữ nguyên.

---

## 2. `seasons` (Mùa vụ)

**Key localStorage**: `agrichain:seasons`
**Trang/JS quản lý**: `nong-trai-chi-tiet.html` / `js/nong-trai-chi-tiet.js`
(mở từ tab "Lịch sử mùa vụ" của 1 nông trại cụ thể).

| Trường | Kiểu | Bắt buộc | Null? | Ý nghĩa |
|---|---|---|---|---|
| `id` | string | có (auto) | không | Mã nội bộ. |
| `farmId` | string (FK → `farms.id`) | **có** | không | Nông trại sở hữu mùa vụ này — gán = `currentFarm.id` lúc lưu, không cho chọn nông trại khác. |
| `code` | string | **có** | không | Mã hiển thị, gợi ý `MV01`, `MV02`... đếm riêng **trong phạm vi từng nông trại** (khác `farms.code` là duy nhất TOÀN CỤC). Phải duy nhất trong các mùa vụ của CÙNG 1 `farmId` (validate lọc theo `farmId` trước khi so trùng). Ghép với `farms.code` tạo tiền tố mã lô hàng (`<mã nông trại>-<mã mùa vụ>-NNN`). |
| `name` | string | **có** | không | Tên mùa vụ. |
| `startDate` | string (`YYYY-MM-DD`) | **có** | không | Ngày bắt đầu mùa vụ. |
| `endDate` | string (`YYYY-MM-DD`) | **có** | không | Ngày kết thúc (dự kiến/thực tế tuỳ giai đoạn, không tách 2 field riêng). |
| `plannedArea` | number | **có** | không | Diện tích DỰ KIẾN canh tác cho mùa vụ này (ha) — có thể nhỏ hơn `farms.area` nếu chỉ dùng một phần diện tích nông trại. |
| `actualArea` | number | **có** | không | Diện tích THỰC TẾ đã canh tác (ha), có thể lệch so với `plannedArea`. |
| `status` | string (enum) | **có** | không | 1 trong 5 giá trị: `planned` (Kế hoạch) · `in_progress` (Đang thực hiện) · `harvested` (Đã thu hoạch) · `completed` (Hoàn thành) · `failed` (Thất bại). |
| `note` | string | không | có thể rỗng `''` | Ghi chú tự do. |
| `workflowTemplateId` | string \| `null` | không | **có** — `null` là giá trị MẶC ĐỊNH tường minh ngay từ lúc tạo mùa vụ (xem ghi chú "Đã chuẩn hoá" bên dưới), và **vẫn có thể là `null` ngay cả khi ĐÃ áp dụng quy trình** (trường hợp "Tạo quy trình rỗng" — tự thiết kế, không dựa trên mẫu nào). Khi có giá trị: id của `workflowTemplates` đã áp dụng, chụp **tại thời điểm áp dụng** — KHÔNG cập nhật lại nếu mẫu gốc bị sửa/xoá sau đó (có thể trỏ tới 1 template đã không còn tồn tại — phải tự chịu, không coi là lỗi dữ liệu). |
| `workflowTemplateName` | string \| `null` | không | **có** — `null` khi chưa áp dụng quy trình nào; có giá trị (kể cả `"Quy trình tự tạo"` cho ca tự thiết kế) ngay khi đã áp dụng, bất kể `workflowTemplateId` là gì. **Tên mẫu ĐÃ CHỤP** tại thời điểm áp dụng — không đồng bộ lại nếu tên mẫu gốc đổi sau đó. |
| `workflowSteps` | `Array<WorkflowStep>` \| `null` | không | **Trường quyết định trạng thái** — chỉ còn ĐÚNG 2 trạng thái (đã chuẩn hoá, xem bên dưới): `null` → CHƯA áp dụng quy trình nào cho mùa vụ; mảng (kể cả rỗng `[]`, dù nên tránh — xem ghi chú `steps` của `workflowTemplates`) → ĐÃ áp dụng, checklist đang chạy. Xem cấu trúc `WorkflowStep` bên dưới. |
| `createdAt` / `updatedAt` | string (ISO) | như quy ước chung | | |

> **Đã chuẩn hoá (sửa code, không chỉ tài liệu):** trước đây `handleSeasonSubmit()`
> (`js/nong-trai-chi-tiet.js`) tạo mùa vụ mới mà KHÔNG gán 3 field này —
> khiến chúng ở trạng thái `undefined` (field vắng mặt hoàn toàn khỏi object)
> cho tới khi áp dụng quy trình, tồn tại song song với trạng thái `null`
> tường minh của "Tạo quy trình rỗng" ở `workflowTemplateId`. 2 cách biểu
> diễn "chưa có gì" (`undefined` vs `null`) cho cùng 1 ý nghĩa rất dễ gây
> lỗi khi backend/consumer khác kiểm tra kiểu dữ liệu nghiêm ngặt (`undefined`
> không hợp lệ trong JSON, sẽ bị `JSON.stringify()` âm thầm LƯỢC BỎ field
> đó — khác hẳn `null`, vốn vẫn giữ nguyên key trong JSON). Đã sửa: mọi mùa
> vụ mới tạo giờ LUÔN có sẵn `workflowTemplateId: null, workflowTemplateName:
> null, workflowSteps: null` ngay từ `store.insert()` — chỉ còn 1 cách biểu
> diễn duy nhất cho trạng thái "chưa áp dụng".

### Danh sách giá trị `seasons.status`

5 giá trị, KHÔNG liên quan gì tới `WorkflowStep.done` (field khác cấp, đã
đổi tên để tránh nhầm — xem ghi chú "Đã chuẩn hoá" dưới bảng `WorkflowStep`):

| Giá trị | Nhãn hiển thị | Ý nghĩa |
|---|---|---|
| `planned` | Kế hoạch | Mùa vụ đã được tạo/lên kế hoạch nhưng CHƯA bắt đầu canh tác thực tế — trạng thái mặc định khi tạo mới. |
| `in_progress` | Đang thực hiện | Đang trong quá trình canh tác (đã xuống giống, đang chăm sóc...), chưa tới ngày/đợt thu hoạch. |
| `harvested` | Đã thu hoạch | Đã thu hoạch xong nhưng mùa vụ CHƯA đóng — có thể còn hoạt động sau thu hoạch (sơ chế, tổng kết...) trước khi chuyển sang `completed`. |
| `completed` | Hoàn thành | Mùa vụ đã kết thúc toàn bộ, coi như đóng hồ sơ — không còn hoạt động canh tác nào tiếp theo cho mùa vụ này. |
| `failed` | Thất bại | Mùa vụ không đạt kết quả như kế hoạch (mất mùa, thiên tai, sâu bệnh nặng, huỷ bỏ giữa chừng...) — kết thúc mùa vụ theo hướng KHÔNG thành công, phân biệt với `completed`. |

Không có ràng buộc chuyển trạng thái (state machine) nào được enforce ở
tầng dữ liệu hiện tại — người dùng có thể đổi tự do giữa 5 giá trị qua
`<select>` trong modal Sửa mùa vụ, kể cả đi "lùi" trạng thái.

**Cấu trúc `WorkflowStep`** (mỗi phần tử của `seasons.workflowSteps[]`) — là
**bản sao (snapshot) độc lập** từ `workflowTemplates.steps[]` tại thời điểm
áp dụng, cộng thêm trạng thái tiến độ riêng cho mùa vụ này:

| Trường | Kiểu | Bắt buộc | Null? | Ý nghĩa |
|---|---|---|---|---|
| `id` | string | có | không | Sinh mới bằng `store.newId()` lúc snapshot — **KHÔNG trùng** với id của bước trong mẫu gốc (`workflowTemplates.steps[]` không có `id` field). |
| `name` | string | có | không | Bản sao tên bước tại thời điểm áp dụng. |
| `activityType` | string (enum, xem "Danh mục dùng chung") | có | không | Bản sao. |
| `instruction` | string | không | có thể rỗng | Bản sao — hướng dẫn cho nông dân, cũng được điền sẵn vào ô "Mô tả" khi bấm "Ghi nhật ký & hoàn thành". |
| `requireQr` | boolean | có | không | Bản sao — bước này có bắt buộc tạo lô hàng (QR truy xuất) khi hoàn thành không. |
| `requireSupply` | boolean | có | không | Bản sao — SỞ DĨ TỒN TẠI NHƯNG KHÔNG ĐƯỢC ENFORCE: hiện chỉ hiển thị trên giao diện mẫu, chưa có logic nào bắt buộc chọn vật tư khi hoàn thành bước ngoài field `supplyId` đi kèm. |
| `supplyId` | string (FK → `supplies.id`) | không | có thể rỗng `''` | Bản sao — vật tư gợi ý cho bước, rỗng nếu không chỉ định. |
| `requireImage` | boolean | có | không | Bản sao — tương tự `requireSupply`, chưa có logic ép buộc đính ảnh khi hoàn thành. |
| `done` | boolean | có | không | Trạng thái THỰC HIỆN riêng của mùa vụ này (không có trên mẫu gốc). **Đã đổi tên từ `status` (chuỗi `'pending'`\|`'completed'`) sang `done` (boolean)** — xem ghi chú "Đã chuẩn hoá" ngay dưới bảng này. Bước `done: false` **đầu tiên** theo thứ tự mảng mới "tới lượt" (hiện nút hoàn thành); các bước `done: false` phía sau hiện "Chờ đến lượt". |
| `completedAt` | string (ISO) \| `null` | có (khởi tạo `null`) | có | Thời điểm hoàn thành bước, gán khi `done` chuyển `true`. |
| `logId` | string (FK → `seasonLogs.id`) \| `null` | có (khởi tạo `null`) | có | Nhật ký được tạo/liên kết khi hoàn thành bước này (qua modal "Ghi nhật ký & hoàn thành"). |
| `batchId` | string (FK → `batches.id`, ngoài phạm vi tài liệu) \| `null` | có (khởi tạo `null`) | có | Lô hàng được tạo khi bước có `requireQr: true` — gắn NGAY sau khi lưu lô hàng mới, tự mở QR luôn. |

> **Đã chuẩn hoá (sửa code, không chỉ tài liệu):** `WorkflowStep.status` (2
> giá trị `'pending'`/`'completed'`) trước đây trùng TÊN với `seasons.status`
> (5 giá trị, phạm vi giá trị hoàn toàn khác — xem mục "Danh sách giá trị
> `seasons.status`" bên dưới) dù 2 field không liên quan gì tới nhau, chỉ
> tình cờ cùng tên `status` trên 2 cấp lồng nhau của cùng 1 bản ghi
> `seasons`. Dễ nhầm lẫn khi đọc code hoặc migrate dữ liệu (VD lỡ áp dụng
> đúng enum 5 giá trị vào field chỉ có 2 giá trị). Đã đổi tên trường +
> kiểu dữ liệu thành `done` (boolean) trong `js/nong-trai-chi-tiet.js`
> (`cloneTemplateSteps()`, `currentActionableStepId()`, `completeWorkflowStep()`,
> `processStepViewCard()`, `collectProcessSteps()`) — không còn field nào
> tên `status` ở cấp `WorkflowStep`.

**Bản ghi mẫu (minh hoạ) — mùa vụ ĐÃ áp dụng 1 mẫu quy trình, đang thực hiện:**

```json
{
  "id": "mgk4a2b-c8d9e1",
  "farmId": "mgk3x1z-a9f3q2",
  "code": "MV01",
  "name": "Vụ Đông Xuân 2026",
  "startDate": "2026-01-15",
  "endDate": "2026-05-30",
  "plannedArea": 2.0,
  "actualArea": 1.9,
  "status": "in_progress",
  "note": "Áp dụng canh tác hữu cơ, không dùng thuốc hoá học.",
  "workflowTemplateId": "mgk2p0q-r5s6t7",
  "workflowTemplateName": "Quy trình canh tác cà phê hữu cơ",
  "workflowSteps": [
    {
      "id": "mgk5f3g-h1i2j3",
      "name": "Xuống giống",
      "activityType": "planting",
      "instruction": "Gieo hạt giống đã ủ mầm, khoảng cách hàng 1.5m.",
      "requireQr": false,
      "requireSupply": true,
      "supplyId": "mgk1a0b-c2d3e4",
      "requireImage": true,
      "done": true,
      "completedAt": "2026-01-16T02:00:00.000Z",
      "logId": "mgk6h4i-j2k3l4",
      "batchId": null
    },
    {
      "id": "mgk5f3g-h1i2j4",
      "name": "Thu hoạch đợt 1",
      "activityType": "harvesting",
      "instruction": "Thu hái quả chín trên 90%, đóng bao ngay tại vườn.",
      "requireQr": true,
      "requireSupply": false,
      "supplyId": "",
      "requireImage": true,
      "done": false,
      "completedAt": null,
      "logId": null,
      "batchId": null
    }
  ],
  "createdAt": "2026-01-10T01:00:00.000Z",
  "updatedAt": "2026-01-16T02:00:05.000Z"
}
```

**Trường hợp CHƯA áp dụng quy trình nào** (mùa vụ vừa tạo, mặc định sau khi
chuẩn hoá code) — 3 field quy trình đều `null` tường minh:

```json
{
  "id": "mgk4a2b-d1e2f3",
  "farmId": "mgk3x1z-a9f3q2",
  "code": "MV02",
  "name": "Vụ Hè Thu 2026",
  "startDate": "2026-06-01",
  "endDate": "2026-09-30",
  "plannedArea": 2.0,
  "actualArea": 0,
  "status": "planned",
  "note": "",
  "workflowTemplateId": null,
  "workflowTemplateName": null,
  "workflowSteps": null,
  "createdAt": "2026-05-20T01:00:00.000Z"
}
```

**Quan hệ**: `seasons.farmId → farms.id`; `seasons.id` được tham chiếu bởi
`seasonLogs.seasonId`, `batches.seasonId` (ngoài phạm vi); `seasons.workflowTemplateId → workflowTemplates.id`
(tham chiếu snapshot, có thể "treo" nếu mẫu gốc đã xoá); `seasons.workflowSteps[].supplyId → supplies.id`;
`seasons.workflowSteps[].logId → seasonLogs.id`; `seasons.workflowSteps[].batchId → batches.id`.

**Trường chỉ dùng ở client**: không có — `workflowTemplateId`/`workflowTemplateName`
là snapshot CHỦ ĐÍCH (không phải cache tiện lợi có thể suy ra bằng join),
nên backend thật vẫn PHẢI lưu cả 2 field này y hệt, không được thay bằng
join sống tới `workflowTemplates` (sẽ làm sai lịch sử nếu mẫu gốc đổi sau).

---

## 3. `seasonLogs` (Nhật ký hoạt động)

**Key localStorage**: `agrichain:seasonLogs`
**Trang/JS quản lý**: `nong-trai-chi-tiet.html` / `js/nong-trai-chi-tiet.js`
(tab "Timeline mùa vụ" trong modal xem chi tiết 1 mùa vụ).

| Trường | Kiểu | Bắt buộc | Null? | Ý nghĩa |
|---|---|---|---|---|
| `id` | string | có (auto) | không | Mã nội bộ. |
| `seasonId` | string (FK → `seasons.id`) | **có** | không | Mùa vụ mà nhật ký này thuộc về. |
| `farmId` | string (FK → `farms.id`) | **có** | không | **Bản sao (denormalize)** của `seasons.farmId` tại thời điểm ghi — lưu kèm để lọc/hiển thị không cần join ngược qua `seasons`. |
| `activityType` | string (enum, xem "Danh mục dùng chung") | **có** | không | Loại hoạt động kỹ thuật. |
| `performedAt` | string (`YYYY-MM-DDTHH:mm`, từ `<input type="datetime-local">`) | **có** | không | Thời điểm THỰC HIỆN hoạt động (không phải thời điểm ghi nhật ký — 2 mốc có thể khác nhau nếu nhập trễ). Không có giây/múi giờ. |
| `performedBy` | string | **có** | không | Tên người thực hiện (chuỗi tự do, không phải id user). |
| `weather` | string | không | có thể rỗng `''` | Điều kiện thời tiết lúc thực hiện. |
| `description` | string | không | có thể rỗng `''` | Mô tả chi tiết — cũng là nơi được điền sẵn hướng dẫn của bước quy trình khi mở modal từ checklist. |
| `supplies` | `Array<LogSupply>` | không | mảng rỗng `[]` nếu không dùng vật tư nào | Danh sách vật tư đã dùng trong hoạt động này — xem cấu trúc bên dưới. |
| `images` | `Array<{name:string, dataUrl:string}>` | không | mảng rỗng `[]` nếu không có ảnh | Ảnh hiện trường minh hoạ, đọc qua `FileReader`. |
| `createdAt` / `updatedAt` | string (ISO) | như quy ước chung | | |

**Cấu trúc `LogSupply`** (mỗi phần tử `seasonLogs.supplies[]`):

| Trường | Kiểu | Bắt buộc | Ý nghĩa |
|---|---|---|---|
| `supplyId` | string (FK → `supplies.id`) | có | Vật tư đã dùng. |
| `name` | string | có | **Tên vật tư ĐÃ CHỤP** tại thời điểm ghi nhật ký — không tự cập nhật nếu vật tư gốc đổi tên/bị xoá sau đó (lịch sử vẫn hiển thị đúng tên lúc dùng). |
| `quantity` | number | có (mặc định 0 nếu bỏ trống) | Số lượng đã dùng. |
| `unit` | string | có | Đơn vị tính — GỢI Ý mặc định theo đơn vị của vật tư (`supplies.unit`) nhưng **cho phép chọn khác** cho đúng lần dùng cụ thể (VD vật tư đo bằng "kg" nhưng lần này ghi theo "Gói"). |
| `method` | string | không (có thể rỗng `''`) | Phương pháp sử dụng — chọn từ danh sách gợi ý (`MATERIAL_METHODS`, xem "Danh mục dùng chung"), KHÔNG ràng buộc cứng, field vẫn nhận giá trị tự do vì control là `<select>` không có validate riêng. |
| `purpose` | string | không (có thể rỗng `''`) | Mục đích sử dụng (tự do). |

**Bản ghi mẫu (minh hoạ):**

```json
{
  "id": "mgk6h4i-j2k3l4",
  "seasonId": "mgk4a2b-c8d9e1",
  "farmId": "mgk3x1z-a9f3q2",
  "activityType": "fertilizing",
  "performedAt": "2026-02-01T07:30",
  "performedBy": "Nguyễn Văn Nông",
  "weather": "Nắng nhẹ, không mưa",
  "description": "Bón phân hữu cơ đợt 1 sau khi cây bén rễ.",
  "supplies": [
    {
      "supplyId": "mgk1a0b-c2d3e4",
      "name": "Phân hữu cơ vi sinh Compost+",
      "quantity": 50,
      "unit": "kg",
      "method": "Bón đất",
      "purpose": "Bổ sung dinh dưỡng nền cho cây con"
    }
  ],
  "images": [
    { "name": "hien-truong-01.jpg", "dataUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg..." }
  ],
  "createdAt": "2026-02-01T07:35:00.000Z"
}
```

**Quan hệ**: `seasonLogs.seasonId → seasons.id`; `seasonLogs.farmId → farms.id`
(bản sao); `seasonLogs.supplies[].supplyId → supplies.id`; `seasons.workflowSteps[].logId → seasonLogs.id`
(chiều ngược lại, từ seasons trỏ vào).

**Trường chỉ dùng ở client**: **`images[].dataUrl`** — ảnh được đọc qua
`FileReader` thành chuỗi base64 và **nhúng thẳng vào bản ghi JSON** vì dự án
chưa có backend upload file thật. Khi có API thật, trường này **PHẢI đổi
thành URL trỏ tới file đã upload** (S3/object storage/CDN...) thay vì nhúng
base64 — nhúng thẳng sẽ làm payload mỗi bản ghi phình to bất hợp lý (1 ảnh
vài MB base64 hoá còn nặng hơn ~33%) và không tận dụng được cache trình
duyệt cho ảnh tĩnh.

---

## 4. `supplies` (Vật tư)

**Key localStorage**: `agrichain:supplies`
**Trang/JS quản lý**: `vat-tu.html` / `js/vat-tu.js`. Được `js/nong-trai-chi-tiet.js`
và `js/mau-quy-trinh.js` đọc lại (chọn vật tư cho bước nhật ký/bước quy trình).

| Trường | Kiểu | Bắt buộc | Null? | Ý nghĩa |
|---|---|---|---|---|
| `id` | string | có (auto) | không | Mã nội bộ. |
| `code` | string | **có** | không | Mã hiển thị, DUY NHẤT toàn cục (validate không phân biệt hoa/thường). Có gợi ý tự động dạng `<viết tắt loại không dấu><số thứ tự 2 chữ số>` (VD loại "Thuốc trị nấm" → `TTN01`), đếm riêng theo từng `type` — chỉ là gợi ý, sửa tay được. |
| `type` | string (enum) | **có** | không | 1 trong 7 giá trị: `fertilizer` (Phân bón) · `pesticide` (Thuốc trừ sâu) · `herbicide` (Thuốc diệt cỏ) · `fungicide` (Thuốc trị nấm) · `seed` (Hạt giống) · `bio` (Chế phẩm sinh học) · `other` (Khác). |
| `name` | string | **có** | không | Tên vật tư. |
| `manufacturer` | string | **có** | không | Nhà sản xuất. |
| `unit` | string (enum) | **có** (luôn có giá trị mặc định từ `<select>`) | không | Đơn vị tính — 1 trong: `kg`, `g`, `Lít`, `ml`, `Gói`, `Chai`, `Thùng/Hộp`, `Bao`, `Cái`. |
| `description` | string | không | có thể rỗng `''` | Mô tả/ghi chú vật tư. |
| `createdAt` / `updatedAt` | string (ISO) | như quy ước chung | | |

**Bản ghi mẫu (minh hoạ):**

```json
{
  "id": "mgk1a0b-c2d3e4",
  "code": "PB01",
  "type": "fertilizer",
  "name": "Phân hữu cơ vi sinh Compost+",
  "manufacturer": "Công ty TNHH Nông nghiệp Xanh",
  "unit": "kg",
  "description": "Phân hữu cơ ủ hoai mục, dùng cho canh tác hữu cơ.",
  "createdAt": "2025-12-01T01:00:00.000Z"
}
```

**Quan hệ**: `supplies.id` được tham chiếu bởi `seasonLogs.supplies[].supplyId`,
`workflowTemplates.steps[].supplyId`, `seasons.workflowSteps[].supplyId`.

**Trường chỉ dùng ở client**: không có.

---

## 5. `certifications` (Chứng nhận)

**Key localStorage**: `agrichain:certifications`
**Trang/JS quản lý**: `nong-trai-chi-tiet.html` / `js/nong-trai-chi-tiet.js`
(tab "Chứng nhận" của 1 nông trại). Đọc lại (chỉ xem) ở `truy-xuat.html` công khai.

| Trường | Kiểu | Bắt buộc | Null? | Ý nghĩa |
|---|---|---|---|---|
| `id` | string | có (auto) | không | Mã nội bộ. |
| `farmId` | string (FK → `farms.id`) | **có** | không | Nông trại sở hữu chứng nhận. |
| `name` | string | **có** | không | Tên chứng nhận (VD "VietGAP", "Hữu cơ USDA"...). |
| `code` | string | **có** | không | Mã chứng nhận, duy nhất **trong phạm vi từng nông trại** (validate lọc theo `farmId`). |
| `issuer` | string | **có** | không | Cơ quan/tổ chức cấp chứng nhận. |
| `status` | string (enum) | **có** | không | 1 trong 4 giá trị: `active` (Hoạt động) · `expired` (Hết hạn) · `suspended` (Tạm đình chỉ) · `revoked` (Đã thu hồi). |
| `issueDate` | string (`YYYY-MM-DD`) | **có** | không | Ngày cấp. |
| `expiryDate` | string (`YYYY-MM-DD`) | **có** | không | Ngày hết hạn — **không có logic nào tự động chuyển `status` sang `expired` khi qua ngày này**, phải tự cập nhật tay. |
| `note` | string | không | có thể rỗng `''` | Ghi chú. |
| `fileName` | string | **có tại thời điểm lưu thành công** (không cho lưu nếu chưa có tệp) | có thể rỗng `''` khi vừa "Gỡ tệp" giữa chừng (trạng thái tạm, submit sẽ bị chặn cho tới khi chọn tệp khác) | Tên tệp gốc người dùng đã tải lên (chứng chỉ dạng ảnh/PDF...). |
| `fileDataUrl` | string (base64 data URL) | như `fileName` | như `fileName` | Nội dung tệp đính kèm, xem "Trường chỉ dùng ở client". |
| `createdAt` / `updatedAt` | string (ISO) | như quy ước chung | | |

**Bản ghi mẫu (minh hoạ):**

```json
{
  "id": "mgk7k5l-m3n4o5",
  "farmId": "mgk3x1z-a9f3q2",
  "name": "Chứng nhận VietGAP",
  "code": "VGAP-2026-0088",
  "issuer": "Trung tâm Chất lượng Nông Lâm Thủy sản Vùng 3",
  "status": "active",
  "issueDate": "2026-01-05",
  "expiryDate": "2028-01-04",
  "note": "Tái cấp sau đợt kiểm tra định kỳ.",
  "fileName": "vietgap-nv01-2026.pdf",
  "fileDataUrl": "data:application/pdf;base64,JVBERi0xLjQKJ...",
  "createdAt": "2026-01-06T03:20:00.000Z"
}
```

**Quan hệ**: `certifications.farmId → farms.id`.

**Trường chỉ dùng ở client**: **`fileDataUrl`** — cùng lý do với
`seasonLogs.images[].dataUrl`: base64 nhúng thẳng vì chưa có backend upload
file thật, cần đổi thành URL file khi có API. `fileName` vẫn nên giữ (tên
hiển thị cho link tải), chỉ riêng cách LƯU NỘI DUNG tệp mới cần đổi.

---

## 6. `workflowTemplates` (Mẫu quy trình)

**Key localStorage**: `agrichain:workflowTemplates`
**Trang/JS quản lý**: `mau-quy-trinh.html` / `js/mau-quy-trinh.js`. Được
`js/nong-trai-chi-tiet.js` đọc lại để áp dụng cho 1 mùa vụ cụ thể (xem
`seasons.workflowSteps` — CHỤP bản sao, không tham chiếu ngược).

| Trường | Kiểu | Bắt buộc | Null? | Ý nghĩa |
|---|---|---|---|---|
| `id` | string | có (auto) | không | Mã nội bộ — được `seasons.workflowTemplateId` tham chiếu (snapshot, có thể "treo" nếu mẫu bị xoá sau khi đã áp dụng). |
| `name` | string | **có** | không | Tên mẫu quy trình. |
| `description` | string | không | có thể rỗng `''` | Mô tả mẫu. |
| `steps` | `Array<TemplateStep>` | không bị ép buộc bởi validate() bằng độ dài mảng, nhưng **UI luôn đảm bảo tối thiểu 1 bước** (modal tự thêm 1 thẻ bước trống khi mở, và tự thêm lại nếu người dùng xoá hết) | mảng rỗng `[]` VẪN CÓ THỂ xảy ra nếu gọi thẳng `store.insert()` ngoài luồng UI bình thường | Danh sách bước thực hiện theo thứ tự — thứ tự trong mảng CHÍNH LÀ thứ tự thực hiện (không có field `order`/`sequence` riêng, kéo-thả chỉ đổi vị trí phần tử trong mảng). |
| `createdAt` / `updatedAt` | string (ISO) | như quy ước chung | | |

**Cấu trúc `TemplateStep`** (mỗi phần tử `workflowTemplates.steps[]`) —
**không có `id` riêng** (khác hẳn `seasons.workflowSteps[]`, vốn có `id` vì
cần theo dõi tiến độ; mẫu chỉ là bản thiết kế tĩnh):

| Trường | Kiểu | Bắt buộc | Null? | Ý nghĩa |
|---|---|---|---|---|
| `name` | string | **có** | không | Tên bước. |
| `activityType` | string (enum, xem "Danh mục dùng chung") | có (luôn có giá trị mặc định từ `<select>`) | không | Loại hoạt động kỹ thuật của bước. |
| `instruction` | string | không | có thể rỗng `''` | Hướng dẫn thực hiện cho nông dân — được copy nguyên văn vào `description` của nhật ký khi hoàn thành bước tương ứng lúc áp dụng cho mùa vụ. |
| `requireQr` | boolean | có | không | Bước này có bắt buộc tạo QR truy xuất (tức tạo 1 lô hàng mới) khi hoàn thành hay không. |
| `requireSupply` | boolean | có | không | Cờ "yêu cầu dùng vật tư" — hiện **chỉ mang tính khai báo/hiển thị**, chưa có logic nào chặn hoàn thành bước nếu thiếu vật tư. |
| `supplyId` | string (FK → `supplies.id`) | không | rỗng `''` nếu `requireSupply` là `false` hoặc chưa chỉ định vật tư cụ thể | Vật tư gợi ý cho bước (tuỳ chọn dù `requireSupply` là `true`). |
| `requireImage` | boolean | có | không | Cờ "bắt buộc hình ảnh" — tương tự `requireSupply`, chưa được enforce bằng logic. |
| `createdAt` / `updatedAt` | (không áp dụng — đây là phần tử mảng, không phải bản ghi độc lập) | | | |

**Bản ghi mẫu (minh hoạ):**

```json
{
  "id": "mgk2p0q-r5s6t7",
  "name": "Quy trình canh tác cà phê hữu cơ",
  "description": "Áp dụng cho các mùa vụ trồng cà phê Arabica theo hướng hữu cơ, không dùng hoá chất tổng hợp.",
  "steps": [
    {
      "name": "Xuống giống",
      "activityType": "planting",
      "instruction": "Gieo hạt giống đã ủ mầm, khoảng cách hàng 1.5m.",
      "requireQr": false,
      "requireSupply": true,
      "supplyId": "mgk1a0b-c2d3e4",
      "requireImage": true
    },
    {
      "name": "Bón phân đợt 1",
      "activityType": "fertilizing",
      "instruction": "Bón phân hữu cơ hoai mục quanh gốc, cách gốc 20cm.",
      "requireQr": false,
      "requireSupply": true,
      "supplyId": "",
      "requireImage": false
    },
    {
      "name": "Thu hoạch đợt 1",
      "activityType": "harvesting",
      "instruction": "Thu hái quả chín trên 90%, đóng bao ngay tại vườn.",
      "requireQr": true,
      "requireSupply": false,
      "supplyId": "",
      "requireImage": true
    }
  ],
  "createdAt": "2025-11-20T01:00:00.000Z"
}
```

**Quan hệ**: `workflowTemplates.id` được tham chiếu bởi `seasons.workflowTemplateId`
(snapshot); `workflowTemplates.steps[].supplyId → supplies.id`.

**Trường chỉ dùng ở client**: không có.

---

## Danh mục dùng chung (enum)

### `activityType` (9 giá trị) — ĐÃ HỢP NHẤT về 1 nguồn duy nhất

Dùng ở `seasonLogs.activityType`, `workflowTemplates.steps[].activityType`,
`seasons.workflowSteps[].activityType`.

**Trước đây** (đã sửa) `js/mau-quy-trinh.js` và `js/nong-trai-chi-tiet.js`
mỗi file tự khai báo lại y hệt 9 khoá này, nhưng **nhãn/icon lệch nhau ở 3
khoá** — bảng đối chiếu lịch sử (giữ lại để biết đã đổi những gì):

| Khoá | Nhãn ở `mau-quy-trinh.js` (cũ) | Nhãn ở `nong-trai-chi-tiet.js` (cũ) | Icon `mau-quy-trinh.js` (cũ) | Icon `nong-trai-chi-tiet.js` (cũ) |
|---|---|---|---|---|
| `planting` | Gieo trồng / Gieo hạt | **Đang xuống giống** | `icon-seed` | `icon-seed` |
| `fertilizing` | Bón phân | Bón phân | `icon-flask` | `icon-flask` |
| `watering` | Tưới nước | Tưới nước | `icon-droplet` | `icon-droplet` |
| `pest_control` | Phòng trừ sâu bệnh | Phòng trừ sâu bệnh | `icon-bug` | `icon-bug` |
| `weeding` | Làm cỏ | Làm cỏ | `icon-grass` | `icon-grass` |
| `pruning` | Cắt tỉa | Cắt tỉa | `icon-scissors` | `icon-scissors` |
| `harvesting` | Thu hoạch | Thu hoạch | **`icon-tractor`** | **`icon-wheat`** |
| `inspection` | Kiểm tra / Giám sát | **Kiểm tra** | **`icon-search`** | **`icon-eye`** |
| `other` | Hoạt động khác | **Khác** | **`icon-file-text`** | **`icon-box`** |

**Đã chuẩn hoá (sửa code, không chỉ tài liệu):** tạo file `js/enums.js` làm
**nguồn duy nhất**, khai báo `global.AgriChain.ACTIVITY_TYPES` — cả
`js/mau-quy-trinh.js` và `js/nong-trai-chi-tiet.js` giờ đọc thẳng biến này
(`var ACTIVITY_TYPES = global.AgriChain.ACTIVITY_TYPES;`), không tự khai
báo lại nữa. `js/enums.js` nạp SAU `js/store.js`, TRƯỚC 2 file trên (xem
`<script>` trong `mau-quy-trinh.html`/`nong-trai-chi-tiet.html`). Nhãn/icon
**hiện tại** (giữ nguyên vẹn):

| Khoá | Nhãn | Icon | Màu (`color`, dùng cho `.log-item--*`/`.workflow-checklist__activity--*`) |
|---|---|---|---|
| `planting` | Gieo trồng / Gieo hạt | `icon-seed` | `success` |
| `fertilizing` | Bón phân | `icon-flask` | `info` |
| `watering` | Tưới nước | `icon-droplet` | `info` |
| `pest_control` | Phòng trừ sâu bệnh | `icon-bug` | `danger` |
| `weeding` | Làm cỏ | `icon-grass` | `warning` |
| `pruning` | Cắt tỉa | `icon-scissors` | `warning` |
| `harvesting` | Thu hoạch | `icon-wheat` | `success` |
| `inspection` | Kiểm tra / Giám sát | `icon-eye` | `neutral` |
| `other` | Hoạt động khác | `icon-box` | `neutral` |

**Lưu ý cho backend**: nhãn hiển thị tiếng Việt (`name`/label) là chuyện của
frontend — backend chỉ cần lưu đúng `key` (chuỗi, VD `"planting"`) làm giá
trị enum, không cần lưu nhãn.

### Các enum còn lại — vẫn khai báo lặp lại ở nhiều file (chưa hợp nhất)

Đúng quy ước "mỗi trang tự chứa JS riêng" của dự án (xem `CLAUDE.md`), các
danh mục dưới đây vẫn khai báo lại y hệt ở nhiều file — khác `activityType`
ở trên, các enum này KHÔNG bị phát hiện lệch nội dung giữa các file, nên
chưa cần gộp vào `js/enums.js` (chỉ gộp khi nào phát hiện lệch, tránh tạo
trừu tượng thừa cho những gì đang nhất quán):

- **`supplies.type`** (7 giá trị, chỉ ở `js/vat-tu.js`): `fertilizer`,
  `pesticide`, `herbicide`, `fungicide`, `seed`, `bio`, `other`.
- **`supplies.unit`** / **`seasonLogs.supplies[].unit`** (9 giá trị, khai
  báo riêng ở `js/vat-tu.js` là `UNITS` và ở `js/nong-trai-chi-tiet.js` là
  `MATERIAL_UNITS`, cùng nội dung): `kg`, `g`, `Lít`, `ml`, `Gói`, `Chai`,
  `Thùng/Hộp`, `Bao`, `Cái`.
- **`seasonLogs.supplies[].method`** (10 gợi ý, không ràng buộc cứng, chỉ ở
  `js/nong-trai-chi-tiet.js` là `MATERIAL_METHODS`): `Phun thuốc`, `Tưới nước`,
  `Bón vãi`, `Bón lá`, `Bón đất`, `Xử lý hạt giống`, `Bón phân qua hệ thống
  tưới`, `Tưới nhỏ giọt`, `Xông hơi`, `Khác`.
- **`certifications.status`** (4 giá trị): `active`, `expired`, `suspended`,
  `revoked`.
- **`seasons.status`** (5 giá trị, ý nghĩa từng giá trị xem mục "Danh sách
  giá trị `seasons.status`" ở trên): `planned`, `in_progress`, `harvested`,
  `completed`, `failed`.
- **`seasons.workflowSteps[].done`** (boolean, **đã đổi tên từ `status`**
  — xem ghi chú "Đã chuẩn hoá" ngay dưới bảng `WorkflowStep` ở mục `seasons`
  phía trên. KHÔNG còn field tên `status` ở cấp `WorkflowStep`, tránh trùng
  tên với `seasons.status` vốn có phạm vi giá trị hoàn toàn khác).

---

## Quan hệ tổng hợp (khoá ngoại)

```
farms (1) ──< seasons (nhiều)              seasons.farmId → farms.id
farms (1) ──< certifications (nhiều)       certifications.farmId → farms.id
seasons (1) ──< seasonLogs (nhiều)         seasonLogs.seasonId → seasons.id
farms (1) ──< seasonLogs (nhiều, bản sao)  seasonLogs.farmId → farms.id  (denormalize từ seasons.farmId)
workflowTemplates (1) ··> seasons (nhiều)  seasons.workflowTemplateId → workflowTemplates.id  (SNAPSHOT, không phải FK sống — có thể trỏ tới bản ghi đã xoá)
supplies (1) ──< seasonLogs.supplies[]     seasonLogs.supplies[].supplyId → supplies.id
supplies (1) ──< workflowTemplates.steps[] workflowTemplates.steps[].supplyId → supplies.id
supplies (1) ──< seasons.workflowSteps[]   seasons.workflowSteps[].supplyId → supplies.id
seasonLogs (1) ··> seasons.workflowSteps[] seasons.workflowSteps[].logId → seasonLogs.id
```

**Ngoài phạm vi tài liệu này nhưng có liên hệ trực tiếp** (thực thể
`batches` — chưa được yêu cầu mô tả chi tiết ở đây):
`batches.farmId → farms.id`, `batches.seasonId → seasons.id`,
`seasons.workflowSteps[].batchId → batches.id`. Mã lô hàng (`batches.code`)
có định dạng `<farms.code>-<seasons.code>-NNN` (ghép chuỗi hiển thị, không
phải khoá ngoại thật).

## Nhận xét chung về "trường chỉ dùng ở client"

Tổng hợp lại trên cả 6 thực thể, chỉ có **2 kiểu trường** thật sự cần đổi
cách lưu khi chuyển sang backend (không phải "bỏ đi", mà là "đổi cách biểu
diễn"):

1. **File đính kèm dạng base64** (`seasonLogs.images[].dataUrl`,
   `certifications.fileDataUrl`) — hiện nhúng thẳng nội dung tệp vào bản ghi
   JSON vì dự án chưa có endpoint upload file. Backend thật nên có API
   upload riêng, trả về URL, rồi các field này đổi thành lưu URL thay vì
   base64.
2. **Định dạng `id`** — hiện sinh bằng `Date.now().toString(36) + random`
   phía trình duyệt (không đảm bảo duy nhất tuyệt đối giữa nhiều trình
   duyệt/thiết bị cùng thao tác — chỉ chấp nhận được vì đây là bản demo
   single-user localStorage). Backend thật cần thay bằng cơ chế sinh id đảm
   bảo duy nhất toàn hệ thống (UUID hoặc serial do DB cấp).

Không có trường nào thuần tuý là "trạng thái UI" (như cờ đang mở rộng/thu
gọn 1 khối, đang hover...) bị trộn lẫn vào dữ liệu nghiệp vụ của 6 thực thể
này — toàn bộ field còn lại đều cần backend lưu trữ nguyên vẹn.
