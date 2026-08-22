# AgriChain

Nền tảng truy xuất nguồn gốc nông sản bằng blockchain kết hợp AI.
HTML/CSS/JS thuần — **không dùng framework, không dùng build tool** (không Webpack/Vite/npm build).

## Ngôn ngữ giao tiếp

- Luôn trả lời và giải thích bằng **tiếng Việt**.
- Message commit git vẫn giữ **tiếng Anh**.

## Cấu trúc thư mục

```
css/
  tokens.css      # Biến CSS gốc: màu, khoảng cách, cỡ chữ, bo góc, đổ bóng
  base.css        # Reset + typography mặc định
  components.css  # Component dùng chung: button, card, container, grid, form, badge, icon, header
js/
  header.js       # Xử lý tương tác cho .site-header (toggle menu mobile)
icons/
  sprite.svg      # SVG sprite dùng chung, tham chiếu bằng <use href="icons/sprite.svg#icon-...">
index.html        # Trang chủ thật của AgriChain
styleguide.html   # Trang demo design system (living style guide) — không phải trang thật
```

Khi thêm trang mới: tạo file `.html` ở gốc (hoặc thư mục con theo tính năng),
luôn nạp CSS theo đúng thứ tự: `tokens.css` → `base.css` → `components.css`,
và chèn lại `.site-header` (copy nguyên khối từ `index.html` hoặc `styleguide.html`,
kèm `<script src="js/header.js" defer>` trước `</body>`) — dự án không có templating
nên mỗi trang tự chứa markup header riêng.

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
- **`js/header.js` hay bị trình duyệt cache lại** (kể cả sau khi Live Server reload trang) —
  từng khiến việc sửa JS trông như "không có tác dụng" dù code đã đúng. Thẻ `<script>` nạp
  file này ở `index.html`/`styleguide.html` gắn sẵn query string phiên bản
  (`js/header.js?v=3`) để ép tải bản mới; **mỗi lần sửa `header.js`, tăng số `v=` này lên**
  ở cả hai file, đừng chỉ dựa vào hard refresh.

## Việc chưa làm (ngoài phạm vi giai đoạn này)

Trang chủ (`index.html`) hiện có Hero, Tính Năng, Quy Trình. Chưa có: các section còn lại
của trang chủ (Lợi Ích, E-commerce, Blog, Liên Hệ — mục tiêu của các anchor trong menu
header), trang truy xuất nguồn gốc, JS tương tác ngoài toggle menu, tích hợp blockchain/AI thật.

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
