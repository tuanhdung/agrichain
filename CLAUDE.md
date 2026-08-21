# AgriChain

Nền tảng truy xuất nguồn gốc nông sản bằng blockchain kết hợp AI.
HTML/CSS/JS thuần — **không dùng framework, không dùng build tool** (không Webpack/Vite/npm build).

## Cấu trúc thư mục

```
css/
  tokens.css      # Biến CSS gốc: màu, khoảng cách, cỡ chữ, bo góc, đổ bóng
  base.css        # Reset + typography mặc định
  components.css  # Component dùng chung: button, card, container, grid
index.html        # Trang demo design system (living style guide)
```

Khi thêm trang mới: tạo file `.html` ở gốc (hoặc thư mục con theo tính năng),
luôn nạp CSS theo đúng thứ tự: `tokens.css` → `base.css` → `components.css`.

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

## Font & tiếng Việt

- Font chính: **Be Vietnam Pro** (nạp qua Google Fonts trong `<head>` của từng trang bằng
  `<link>`, có `preconnect` đi kèm để tối ưu tốc độ tải).
- Fallback: `Inter`, `-apple-system`, `Segoe UI`, `Roboto`, `Arial`, `sans-serif`.
- Luôn kiểm tra chữ có dấu tiếng Việt (ví dụ: "Truy xuất nguồn gốc nông sản") hiển thị đúng
  khi thêm font hoặc cỡ chữ mới.

## Component hiện có

- `.btn` — biến thể: `--primary`, `--secondary`, `--outline`, `--ghost`;
  cỡ: mặc định, `--sm`, `--lg`.
- `.card` — gồm `.card__header`, `.card__title`, `.card__subtitle`, `.card__body`,
  `.card__footer`. Thêm `.card--hover` nếu card có thể click/tương tác.
- `.container` — bọc nội dung, giới hạn `--container-max-width` (1200px), tự canh giữa.
- `.grid` — kết hợp `.grid--2`, `.grid--3`, `.grid--4`, tự đổi cột theo breakpoint
  (640px, 960px).

## Khi thêm token hoặc component mới

1. Thêm biến vào `tokens.css` trước, không định nghĩa giá trị "ngoài thang" ở nơi khác.
2. Nếu là component dùng lại nhiều nơi → thêm vào `components.css`.
3. Cập nhật `index.html` để mọi token/component mới đều xuất hiện trong trang demo —
   đây là nguồn tham chiếu trực quan duy nhất của design system, phải luôn đầy đủ.

## Việc chưa làm (ngoài phạm vi giai đoạn này)

Giai đoạn này mới chỉ dựng nền tảng CSS. Chưa có: trang chủ, trang truy xuất nguồn gốc,
JS tương tác, tích hợp blockchain/AI thật.
