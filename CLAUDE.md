# AgriChain

Nền tảng truy xuất nguồn gốc nông sản bằng blockchain kết hợp AI.
HTML/CSS/JS thuần — **không dùng framework, không dùng build tool** (không Webpack/Vite/npm build).

## Ngôn ngữ giao tiếp

- Luôn trả lời và giải thích bằng **tiếng Việt**.
- Message commit git vẫn giữ **tiếng Anh**.

## Cấu trúc thư mục

```
data/
  provinces.json         # 34 tỉnh/thành sau sáp nhập 2025 — {id, name}, xem mục "Dữ liệu hành
                          # chính" bên dưới để biết nguồn và cách làm mới
  wards/{provinceCode}.json  # Phường/xã của từng tỉnh, 1 file/tỉnh — {id, name, provinceId}
css/
  tokens.css             # Biến CSS gốc: màu, khoảng cách, cỡ chữ, bo góc, đổ bóng
  base.css               # Reset + typography mặc định
  components.css         # Component dùng chung: button, card, container, grid, form, badge, icon, header
  auth.css               # Layout riêng cho dang-nhap.html/dang-ky.html (2 cột: giới thiệu + form)
  app-shell.css          # Layout riêng cho khung quản trị (sidebar + topbar): nong-trai.html, vat-tu.html,
                          # nong-trai-chi-tiet.html, lo-hang.html
js/
  header.js              # Xử lý tương tác cho .site-header (toggle menu mobile, cuộn anchor)
  contact-form.js        # Validate + hiện thông báo thành công cho form ở section Liên Hệ
  chain.js               # Sổ cái băm nối chuỗi (hash chain) bằng Web Crypto API — chạy trong trình duyệt
  store.js               # Lớp lưu trữ qua localStorage (users, farms, supplies, batches, events, ledger,
                          # phiên đăng nhập) — mọi trang đọc/ghi dữ liệu qua đây, không gọi thẳng localStorage
  auth.js                # Xử lý form đăng nhập/đăng ký (dang-nhap.html, dang-ky.html), dựa vào store.js
  app-shell.js            # Tương tác khung quản trị (sidebar mobile, thu gọn/xổ nhóm menu, tab dùng chung,
                           # hộp thoại xác nhận AgriChain.confirm...)
  map-layers.js           # 3 lớp nền bản đồ Leaflet dùng chung (vệ tinh/địa hình/mặc định) —
                           # AgriChain.addMapBaseLayers(map), dùng ở cả nong-trai.js lẫn nong-trai-chi-tiet.js
  location-select.js      # Cơ chế "2 select phụ thuộc nhau" dùng chung — AgriChain.setupCascadingSelect(),
                           # dùng ở nong-trai.js (Tỉnh/Thành phố -> Phường/Xã) và lo-hang.js
                           # (Nông trại -> Mùa vụ). Chỉ định nghĩa cơ chế, không biết gì về dữ liệu cụ thể.
  nong-trai.js            # Logic riêng cho nong-trai.html (danh sách + thêm/sửa/xoá nông trại)
  nong-trai-chi-tiet.js   # Logic riêng cho nong-trai-chi-tiet.html (trang xem chi tiết 1 nông trại,
                          # gồm cả chứng nhận/mùa vụ/nhật ký/lô hàng con của nó)
  vat-tu.js               # Logic riêng cho vat-tu.html
  lo-hang.js               # Logic riêng cho lo-hang.html (danh sách TẤT CẢ lô hàng, lọc theo nông trại/
                           # mùa vụ, QR + xác thực blockchain tại chỗ — thêm/sửa/xoá vẫn ở
                           # nong-trai-chi-tiet.html, nút sửa/xoá ở đây chỉ điều hướng qua đó)
  truy-xuat.js            # Logic riêng cho truy-xuat.html (trang truy xuất công khai — KHÔNG nạp
                          # js/app-shell.js, trang này không cần đăng nhập)
icons/
  sprite.svg              # SVG sprite dùng chung, tham chiếu bằng <use href="icons/sprite.svg#icon-...">
index.html                # Trang chủ thật của AgriChain
styleguide.html           # Trang demo design system (living style guide) — không phải trang thật
dang-nhap.html            # Đăng nhập (giả lập, xem cảnh báo trong js/auth.js và js/store.js)
dang-ky.html              # Đăng ký tài khoản (khách hàng / đơn vị-tổ chức)
nong-trai.html            # Trang quản trị: nông trại (dùng chung khung app-shell)
nong-trai-chi-tiet.html   # Trang chi tiết 1 nông trại, mở từ thẻ nông trại ở nong-trai.html —
                          # đọc mã nông trại qua query string ?ma=..., KHÔNG phải route thật (xem ghi
                          # chú bên dưới). Còn nhận thêm ?season=<mã mùa vụ>#lo-hang (tuỳ chọn) để tự mở
                          # đúng modal mùa vụ và chuyển sẵn sang tab "Lô hàng" — dùng bởi nút sửa/xoá ở
                          # lo-hang.html.
vat-tu.html               # Trang quản trị: vật tư (dùng chung khung app-shell)
lo-hang.html              # Trang quản trị: danh sách tất cả lô hàng (dùng chung khung app-shell) —
                          # CHỈ xem/lọc/QR/xác thực blockchain, không có form thêm/sửa lô hàng riêng
                          # (xem js/lo-hang.js)
truy-xuat.html            # Trang truy xuất nguồn gốc CÔNG KHAI (không cần đăng nhập, không dùng
                          # app-shell) — đọc mã lô hàng qua query string ?ma=..., mở từ mã QR ở nút
                          # "Truy xuất nguồn gốc" trên thẻ lô hàng (nong-trai-chi-tiet.js). Dùng lại
                          # .site-header như index.html/styleguide.html vì đây là trang công khai,
                          # không phải khu vực quản trị.
```

Khi thêm trang mới: tạo file `.html` ở gốc (hoặc thư mục con theo tính năng),
luôn nạp CSS theo đúng thứ tự: `tokens.css` → `base.css` → `components.css`,
và chèn lại `.site-header` (copy nguyên khối từ `index.html` hoặc `styleguide.html`,
kèm `<script src="js/header.js" defer>` trước `</body>`) — dự án không có templating
nên mỗi trang tự chứa markup header riêng. Riêng `dang-nhap.html`/`dang-ky.html` và
`nong-trai.html`/`vat-tu.html` KHÔNG dùng `.site-header` (layout riêng: auth 2 cột,
app-shell có sidebar) — đừng chèn header vào các trang này. **`index.html` phải luôn
nằm ở gốc dự án** (không đưa vào thư mục con) — host tĩnh cần đúng vị trí này để nhận
diện làm trang mặc định.

**Trang "chi tiết 1 bản ghi" dùng query string, không phải route thật.** Dự án không
có server-side router nên không thể dùng URL dạng đường dẫn như `/nong-trai/NV01`.
Quy ước: 1 trang tĩnh dùng chung cho mọi bản ghi cùng loại, đọc mã bản ghi qua query
string, ví dụ `nong-trai-chi-tiet.html?ma=NV01` (xem `js/nong-trai-chi-tiet.js`).
Dùng `ma` (trường `code` người dùng tự đặt, hiển thị được) — **không dùng `id`** (mã
nội bộ tự sinh trong `store.js`, dạng `m8x2k1-a9f3`, không nên lộ ra URL). Trang phải
tự xử lý trường hợp không tìm thấy bản ghi (`.empty-state` + nút quay lại danh sách),
không được để trắng trang.

## Đăng nhập / Đăng ký (giả lập)

`js/auth.js` + `js/store.js` + `js/chain.js` mô phỏng một backend hoàn toàn trong
`localStorage` của trình duyệt — **không phải xác thực thật**, không có máy chủ nào
kiểm tra (đã ghi rõ trong comment đầu mỗi file). Vài điểm cần nhớ khi đụng vào:
- `js/chain.js` dùng `crypto.subtle` (Web Crypto API) — chỉ chạy được trong "secure
  context" (`https://` hoặc `http://localhost`/`127.0.0.1`). Mở file trực tiếp bằng
  `file://` (double-click) sẽ lỗi ngay khi băm mật khẩu.
- Nút "Đăng Nhập"/"Bắt Đầu Ngay" ở mọi trang (header, hero, CTA) phải trỏ thẳng
  `dang-nhap.html`/`dang-ky.html` — **không dùng anchor `#dang-nhap`/`#bat-dau-ngay`
  nữa** (đó là placeholder từ lúc 2 trang này chưa tồn tại; đã sửa ở `index.html` và
  `styleguide.html`, nếu thêm trang mới nhớ trỏ đúng luôn).

## Quy ước CSS

- **Không hard-code** màu sắc, khoảng cách, cỡ chữ, bo góc, đổ bóng trong `components.css`
  hay trong trang — luôn dùng biến từ `tokens.css` (`var(--color-primary)`, `var(--space-4)`...).
- Component dùng **biến ngữ nghĩa** (`--color-primary`, `--color-text`, `--color-border`),
  không dùng thẳng biến thang màu gốc (`--green-500`, `--neutral-800`). Biến ngữ nghĩa là lớp
  gián tiếp giúp đổi theme sau này mà không phải sửa từng component.
- Khoảng cách luôn là bội số 4px, dùng token `--space-*`, không viết số px tự do.
- Đặt tên class theo BEM nhẹ: `.block`, `.block__element`, `.block--modifier`.
  Ví dụ: `.card`, `.card__header`, `.btn--primary`, `.btn--sm`.
- CSS chỉ dùng riêng cho một trang demo (không phải component tái sử dụng) thì để trong
  thẻ `<style>` của chính trang đó, không đưa vào `css/components.css`.
- **Cẩn thận khi đặt `display` lên phần tử tự ẩn/hiện bằng thuộc tính trình duyệt**
  (`[hidden]`, `<dialog>` chưa có `open`, v.v.): CSS tác giả (author) luôn thắng CSS mặc
  định của trình duyệt (user-agent) bất kể độ đặc hiệu (specificity) — không liên quan gì
  đến thứ tự nạp file. Đặt `display` không điều kiện lên `.modal` từng khiến mọi `<dialog>`
  hiện ra ngay cả khi chưa gọi `showModal()` (phải sửa lại thành `.modal[open]`); tương tự,
  `[hidden]` từng bị `.empty-state{display:flex}` đè mất tác dụng, fix chung ở `base.css`
  bằng `[hidden]{display:none!important}`. Khi thêm class có `display` lên phần tử có thể
  ở trạng thái ẩn nhờ trình duyệt, luôn tự hỏi: class đó có vô tình làm mất tác dụng của
  `hidden`/`[open]`/... không?

## Màu sắc

- Xanh lá (`--green-50` → `--green-900`) là màu thương hiệu chính.
- `--green-500` là màu gốc; dùng cho hành động chính (nút primary, link nhấn mạnh).
- Neutral (`--neutral-50` → `--neutral-900`) dùng cho chữ, nền, đường viền — không dùng
  màu xám ngoài thang này.
- Màu trạng thái cho badge/thông báo/validate form: `--color-success`, `--color-warning`,
  `--color-info`, `--color-danger`, `--color-neutral` (mỗi màu có bản `-subtle` làm nền).
  `--color-success` tái dùng thang xanh lá thương hiệu; warning/info/danger có thang màu
  riêng (`--amber-*`, `--blue-*`, `--red-*`) — chỉ dùng qua alias ngữ nghĩa, không dùng
  thẳng raw scale.

## Font & tiếng Việt

- Font chính: **Be Vietnam Pro** (nạp qua Google Fonts trong `<head>` của từng trang bằng
  `<link>`, có `preconnect` đi kèm để tối ưu tốc độ tải).
- Fallback: `Inter`, `-apple-system`, `Segoe UI`, `Roboto`, `Arial`, `sans-serif`.
- Luôn kiểm tra chữ có dấu tiếng Việt (ví dụ: "Truy xuất nguồn gốc nông sản") hiển thị đúng
  khi thêm font hoặc cỡ chữ mới.

## Component hiện có

- `.btn` — biến thể: `--primary`, `--secondary`, `--outline`, `--ghost`, `--outline-inverse`
  (viền/chữ trắng, nền trong suốt — dùng trên nền tối như hero); cỡ: mặc định, `--sm`, `--lg`.
- `.card` — gồm `.card__header`, `.card__title`, `.card__subtitle`, `.card__body`,
  `.card__footer`. Thêm `.card--hover` nếu card có thể click/tương tác.
- `.batch-card` — thẻ lô hàng (kết hợp `class="card batch-card"`), dùng chung giữa tab
  "Lô hàng" ở `nong-trai-chi-tiet.html` và `lo-hang.html`. Gồm `.batch-card__header`
  (mã lô + badge trạng thái), `.batch-card__rows`/`.batch-card__row`/`.batch-card__row-label`
  (nhãn trái - giá trị phải), `.batch-card__yield`/`__yield-value`/`__yield-label` (khối sản
  lượng nổi bật), `.batch-card__note`/`__note-label`, `.batch-card__actions` (hàng icon
  cuối). Icon sửa/xoá dùng `.icon-btn.batch-card__action--edit`/`--delete` — màu cố định
  (cam/đỏ) chứ không chỉ tô lúc hover như `.icon-btn` thường; ghép 2 class để độ đặc hiệu
  thắng `.icon-btn` bất kể thứ tự nạp CSS.
- `.container` — bọc nội dung, giới hạn `--container-max-width` (1200px), tự canh giữa.
- `.grid` — kết hợp `.grid--2`, `.grid--3`, `.grid--4`, tự đổi cột theo breakpoint
  (640px, 960px).
- `.site-header` — header site-wide: logo trái, menu giữa (`.site-header__nav`),
  nút phải (`.site-header__actions`, tái dùng `.btn`). Dưới 960px thu thành hamburger
  (`.site-header__toggle`) mở `.site-header__panel`; JS xử lý ở `js/header.js`.
  Header là `position: sticky`; `--header-height` (`tokens.css`, = `--space-16`, 64px)
  và `.site-header__inner { min-height: var(--header-height) }` giữ chiều cao header cố
  định, dùng để `.hero` tính `min-height: calc(100vh - var(--header-height))` (lấp đủ màn
  hình mà không tràn xuống dưới, không che nút cuộn).
  **Cuộn tới anchor (`#id`) do `js/header.js` đảm nhiệm** (bắt click vào `a[href^="#"]`,
  tự trừ `header.offsetHeight`, và cuộn lại khi trang tải thẳng kèm `#hash` trên URL) —
  không dựa vào `scroll-padding-top`/`scroll-margin-top` thuần CSS vì độ tin cậy giữa các
  trình duyệt không nhất quán (đặc biệt khi web font tải xong làm layout đổi chiều cao
  sau khi trang đã tự cuộn). Section nào có `padding-block` lớn ở đầu (như `.features`)
  vẫn phải đặt id trên khối nội dung nằm ngay sau phần padding đó (VD `.features__intro`),
  không đặt trên chính section — vì JS đo vị trí bằng `getBoundingClientRect()` của đúng
  phần tử mang id, nên id đặt sai chỗ vẫn cuộn lệch.
- `.badge` — biến thể: `--success`, `--warning`, `--info`, `--neutral`. Dùng cho nhãn
  ngắn kiểu "Hữu cơ", "Đã xác thực".
- `.icon` — bọc `<svg>` tham chiếu `icons/sprite.svg`; cỡ mặc định, `--sm`, `--lg`.
  Icon dùng `stroke="currentColor"` nên đổi màu qua CSS `color`.
- Form: `.field` (bọc label + input + lỗi), `.label`, `.input`, `.textarea`, `.select`
  (dùng chung style, trạng thái `:disabled` và `[aria-invalid="true"]`), `.field__error`,
  `.checkbox`/`.checkbox__input`/`.checkbox__label`, `.radio`/`.radio__input`/`.radio__label`.

## Khi thêm token hoặc component mới

1. Thêm biến vào `tokens.css` trước, không định nghĩa giá trị "ngoài thang" ở nơi khác.
2. Nếu là component dùng lại nhiều nơi → thêm vào `components.css`.
3. Cập nhật `styleguide.html` để mọi token/component mới đều xuất hiện trong trang demo —
   đây là nguồn tham chiếu trực quan duy nhất của design system, phải luôn đầy đủ.

## Kiểm thử giao diện

- **Không tự ý cài công cụ trình duyệt tự động** (Playwright, Puppeteer, chromium-cli...)
  để chụp ảnh màn hình hay kiểm tra UI. Người dùng tự kiểm tra bằng Live Server (VS Code)
  hoặc trình duyệt thật.
- **Không chạy script kiểm tra cú pháp HTML/CSS (Node, bash...) sau khi sửa file.** VS Code
  đã tự báo lỗi cú pháp; việc xác nhận trực quan (responsive, hover, tương tác...) do người
  dùng thực hiện thủ công bằng Live Server.
- **File JS hay bị trình duyệt cache lại** (kể cả sau khi Live Server reload trang) — từng
  khiến việc sửa `header.js` trông như "không có tác dụng" dù code đã đúng. Mọi thẻ
  `<script src="js/....js?v=N">` đều gắn sẵn query string phiên bản để ép tải bản mới;
  **mỗi lần sửa một file JS, tăng số `v=` của đúng file đó** ở mọi trang có nạp nó, đừng chỉ
  dựa vào hard refresh.

## Việc chưa làm (ngoài phạm vi giai đoạn này)

Trang chủ (`index.html`) hiện có Hero, Tính Năng, Quy Trình, Lợi Ích, CTA, Liên Hệ, Footer.
Form Liên Hệ mới validate + hiện thông báo phía client, chưa gửi đi đâu thật. Chưa có:
section E-commerce/Blog (mục tiêu của anchor cùng tên trong menu header), tích hợp AI thật.

Trang truy xuất nguồn gốc (`truy-xuat.html`) đã có ở mức cơ bản: xem 1 lô hàng qua mã QR
(hoặc `?ma=...` trực tiếp), thấy trạng thái xác thực blockchain + thông tin nông trại/mùa
vụ liên quan. Chưa có: liệt kê nhiều lô hàng, tìm kiếm theo mã tự nhập tay trên trang, xác
thực lại (verify) hash ngay tại trang này thay vì chỉ đọc `batch.hash` đã lưu sẵn.

## Dữ liệu hành chính (tỉnh/thành, phường/xã)

`data/provinces.json` (34 tỉnh/thành) và `data/wards/{provinceCode}.json` (1 file/tỉnh,
3321 xã/phường) — dữ liệu hiệu lực từ 01/07/2025 sau sáp nhập, lấy từ gói MIT
[`vietnam-address-data`](https://github.com/phucanhle/vn-xaphuong-2025) (`{id, name}` cho
tỉnh, `{id, name, provinceId}` cho xã/phường). Form Thêm nông trại (`nong-trai.html`,
`js/nong-trai.js`) `fetch()` 2 file này lúc cần: nạp `provinces.json` một lần lúc dựng
trang để đổ vào `<select id="farm-province">`; đổi tỉnh xong mới `fetch()`
`wards/{code}.json` tương ứng để đổ vào `<select id="farm-ward">` (disabled tới lúc đó),
có cache theo mã tỉnh (`wardCache`) khỏi tải lại. `<option>` của tỉnh lưu `value` là TÊN
tỉnh (không phải mã) — khớp với cách `farm.province`/`farm.ward` đã lưu từ trước giờ (chuỗi
tên, không phải mã), mã tỉnh chỉ gắn thêm vào `data-code` để biết tải đúng file phường/xã.

Lý do dùng dữ liệu tĩnh thay vì gọi thẳng API AgriChain: 2 endpoint định dùng ban đầu
(`GET /1.0/commons/provinces`, `GET /1.0/commons/provinces/{code}/wards`) trả 401
Unauthorized khi gọi từ trình duyệt không kèm gì (2026-08-28), chưa rõ cách xác thực —
nếu sau này API mở public được thì có thể quay lại dùng API thay vì file tĩnh, nhưng dữ
liệu tĩnh vẫn hoạt động độc lập, không phụ thuộc dịch vụ ngoài.

**Cách làm mới lại dữ liệu nếu nguồn gốc cập nhật:** không tự tay sửa 2 thư mục trên —
tải lại `src/data/provinces.json` + `src/data/wards.json` từ repo nguồn, tách bằng script
Node tương tự lần đầu (đọc cả 2 file, `JSON.stringify` từng tỉnh ra `data/wards/{id}.json`,
sort theo tên bằng `Intl.Collator('vi')`), rồi xoá script đi — không để lại trong dự án.

## Lỗi đã biết, chưa xử lý xong

Cuộn tới anchor (`#tinh-nang`, qua menu header hoặc mũi tên cuộn ở hero) đôi khi dừng
sớm hơn dự kiến, để lộ một phần hero (nền xanh) phía trên section đích thay vì tiêu đề
nằm sát ngay dưới header. Đã thử: `scroll-padding-top`/`scroll-margin-top` (CSS thuần),
`window.scrollTo` tự tính tay, `scrollIntoView()`, `history.scrollRestoration = 'manual'`,
`overflow-anchor: none`, và vòng lặp chờ layout ổn định (`js/header.js`) — vẫn không dứt
điểm được trong mọi trường hợp (gọi thủ công qua Console thường cho kết quả tốt hơn nhiều
so với khi trang tự chạy). Đã tạm gác lại theo yêu cầu người dùng (2026-08-22) để ưu tiên
giữ bố cục section đúng tỉ lệ (không "đôn" `padding-top` lên để che lỗi — làm vậy đẩy nội
dung xuống quá xa header). Nếu quay lại xử lý: cân nhắc dùng `getBoundingClientRect()` +
`ResizeObserver`/`MutationObserver` để phát hiện đúng lúc layout ngừng đổi thay vì đoán
mốc thời gian hoặc polling cố định.
