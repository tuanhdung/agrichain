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
  blog-posts.json        # 3 bài viết Blog — nội dung chép lại đúng bài thật trên agrichain.com.vn/blog
                          # (không phải tự bịa), chưa có backend quản lý. {slug, category, date,
                          # readTime, title, author, excerpt, cover, tags[], body[]}. body[] là mảng
                          # khối nội dung {type: 'paragraph'|'heading'|'list', ...} để render tuần tự —
                          # khối 'list' có thêm cờ tuỳ chọn `ordered: true` để render <ol> (danh sách
                          # đánh số, VD 3 trụ cột ESG) thay vì <ul> (danh sách gạch đầu dòng, mặc
                          # định). Nạp qua fetch() bởi CẢ blog.html (danh sách) lẫn blog-chi-tiet.html
                          # (chi tiết, lọc theo slug) — 1 nguồn dữ liệu duy nhất, tránh lệch nội dung
                          # giữa 2 trang, cùng cơ chế fetch() như provinces.json.
css/
  tokens.css             # Biến CSS gốc: màu, khoảng cách, cỡ chữ, bo góc, đổ bóng
  base.css               # Reset + typography mặc định
  components.css         # Component dùng chung: button, card, container, grid, form, badge, icon, header
  auth.css               # Layout riêng cho dang-nhap.html/dang-ky.html (2 cột: giới thiệu + form) —
                          # .password-field/.password-rules đã chuyển sang components.css (dùng chung
                          # với tai-khoan.html), auth.css giờ chỉ còn layout 2 cột thật sự riêng
  app-shell.css          # Layout riêng cho khung quản trị (sidebar + topbar): nong-trai.html, vat-tu.html,
                          # nong-trai-chi-tiet.html, mau-quy-trinh.html, lo-hang.html, tai-khoan.html,
                          # goi-phan-mem.html, lich-su-mua-goi.html, và 7 trang thuong-mai-*.html
js/
  header.js              # Xử lý tương tác cho .site-header (toggle menu mobile, cuộn anchor)
  contact-form.js        # Validate + hiện thông báo thành công cho form ở section Liên Hệ
  chain.js               # Sổ cái băm nối chuỗi (hash chain) bằng Web Crypto API — chạy trong trình duyệt
  store.js               # Lớp lưu trữ qua localStorage (users, farms, supplies, batches, events, ledger,
                          # orgUsers, shops, products, orders, shippingAddresses, inventoryImports,
                          # workflowTemplates, phiên đăng nhập) — mọi trang đọc/ghi dữ liệu qua đây,
                          # không gọi thẳng localStorage
  password-field.js      # Nút hiện/ẩn mật khẩu (data-password-toggle) + danh sách điều kiện mật khẩu
                          # (data-password-rules="<id ô mật khẩu>") dùng chung — tách từ js/auth.js để
                          # js/tai-khoan.js dùng lại được, không chép lại 2 hàm này.
  auth.js                # Xử lý form đăng nhập/đăng ký (dang-nhap.html, dang-ky.html), dựa vào store.js
                          # và js/password-field.js
  app-shell.js            # Tương tác khung quản trị (nút hamburger: trượt overlay dưới 960px, thu gọn
                           # hẳn sidebar từ 960px — xem mục "Sidebar" bên dưới; thu gọn/xổ nhóm menu,
                           # tab dùng chung, hộp thoại xác nhận AgriChain.confirm...)
  map-layers.js           # 3 lớp nền bản đồ Leaflet dùng chung (vệ tinh/địa hình/mặc định) —
                           # AgriChain.addMapBaseLayers(map), dùng ở cả nong-trai.js lẫn nong-trai-chi-tiet.js
  location-select.js      # Cơ chế "2 select phụ thuộc nhau" dùng chung — AgriChain.setupCascadingSelect(),
                           # dùng ở nong-trai.js (Tỉnh/Thành phố -> Phường/Xã) và lo-hang.js
                           # (Nông trại -> Mùa vụ). Chỉ định nghĩa cơ chế, không biết gì về dữ liệu cụ thể.
  nong-trai.js            # Logic riêng cho nong-trai.html (danh sách + thêm/sửa/xoá nông trại)
  nong-trai-chi-tiet.js   # Logic riêng cho nong-trai-chi-tiet.html (trang xem chi tiết 1 nông trại,
                          # gồm cả chứng nhận/mùa vụ/nhật ký/lô hàng con của nó, và checklist "Quy
                          # trình mùa vụ" áp dụng từ workflowTemplates — xem mục riêng bên dưới)
  vat-tu.js               # Logic riêng cho vat-tu.html
  mau-quy-trinh.js         # Logic riêng cho mau-quy-trinh.html (danh sách + thêm/sửa/xoá mẫu quy
                           # trình mùa vụ — collection "workflowTemplates", KHÔNG khoá ownerId, theo
                           # đúng quy ước "Hoạt động sản xuất" như farms/supplies/batches)
  lo-hang.js               # Logic riêng cho lo-hang.html (danh sách TẤT CẢ lô hàng, lọc theo nông trại/
                           # mùa vụ, QR + xác thực blockchain tại chỗ — thêm/sửa/xoá vẫn ở
                           # nong-trai-chi-tiet.html, nút sửa/xoá ở đây chỉ điều hướng qua đó)
  tai-khoan.js            # Logic riêng cho tai-khoan.html (danh sách người dùng trong Đơn vị + modal
                          # thêm người dùng + modal phân quyền theo phân hệ)
  ho-so.js                # Logic riêng cho ho-so.html (xem/sửa hồ sơ CHÍNH tài khoản đang đăng nhập
                          # — collection "users", KHÁC "orgUsers" của tai-khoan.js — + đổi mật khẩu.
                          # Mở từ menu tài khoản ở topbar, không phải mục sidebar)
  truy-xuat.js            # Logic riêng cho truy-xuat.html (trang truy xuất công khai — KHÔNG nạp
                          # js/app-shell.js, trang này không cần đăng nhập)
  blog.js                 # Logic riêng cho blog.html (fetch() data/blog-posts.json rồi dựng từng
                          # .post-card vào lưới — trang công khai, không nạp app-shell.js)
  blog-chi-tiet.js        # Logic riêng cho blog-chi-tiet.html (đọc ?slug= trên URL, fetch() CÙNG
                          # data/blog-posts.json với blog.js để tìm đúng bài rồi dựng nội dung —
                          # xem mục "Blog" bên dưới)
  thuong-mai-tong-quan.js  # Logic riêng cho thuong-mai-tong-quan.html (khởi tạo/chỉnh sửa hồ sơ
                           # cửa hàng Ecommerce — collection "shops", 1 bản ghi/Đơn vị, khoá bằng
                           # ownerId = session.id hiện tại)
  thuong-mai-san-pham.js   # Logic riêng cho thuong-mai-san-pham.html (danh sách + thêm/sửa/xoá sản
                           # phẩm — collection "products", nhiều bản ghi/Đơn vị cùng khoá ownerId;
                           # mỗi sản phẩm có nhiều "biến thể", mỗi biến thể tuỳ chọn gắn 1 lô hàng
                           # thật từ collection "batches" để truy xuất nguồn gốc)
  thuong-mai-don-hang.js   # Logic riêng cho thuong-mai-don-hang.html (CHỈ xem/lọc/đổi trạng thái —
                           # collection "orders" chưa có nơi nào trong app ghi dữ liệu vào, trang sẽ
                           # luôn rỗng cho tới khi có trang mua hàng công khai)
  thuong-mai-van-chuyen.js # Logic riêng cho thuong-mai-van-chuyen.html (thêm/sửa/xoá địa chỉ lấy
                           # hàng + trả hàng — collection "shippingAddresses", nhiều bản ghi/loại/
                           # Đơn vị, mỗi loại tối đa 1 địa chỉ mặc định tại một thời điểm)
  thuong-mai-nhap-hang.js  # Logic riêng cho thuong-mai-nhap-hang.html (gõ/quét mã barcode để cộng
                           # thêm tồn kho 1 biến thể sản phẩm — tìm trong products[].variants[].
                           # barcode, ghi lịch sử vào collection "inventoryImports")
  thuong-mai-may-tinh-tien.js  # Logic riêng cho thuong-mai-may-tinh-tien.html (POS: quét barcode
                               # thêm vào giỏ, "Thanh toán" trừ tồn kho + ghi 1 đơn hàng MỚI vào
                               # collection "orders" — nơi DUY NHẤT trong app tạo dữ liệu orders
                               # thật, xem mục riêng bên dưới)
  thuong-mai-thiet-lap.js  # Logic riêng cho thuong-mai-thiet-lap.html (hồ sơ cửa hàng dạng đầy đủ
                           # trên 1 trang, 3 cột — đọc/ghi CÙNG bản ghi "shops" như modal ở
                           # thuong-mai-tong-quan.html, chỉ khác tập field quản lý, xem mục riêng
                           # bên dưới)
icons/
  sprite.svg              # SVG sprite dùng chung, tham chiếu bằng <use href="icons/sprite.svg#icon-...">
images/
  blog/                   # Ảnh bìa bài viết Blog (post-1.jpg, post-2.jpg, post-3.jpg, hero.jpg...) —
                          # hiện chỉ có .gitkeep giữ chỗ thư mục, CHƯA có ảnh thật, nền
                          # --color-bg-subtle của .post-card__media giữ chỗ tạm (xem blog.html)
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
mau-quy-trinh.html        # Trang quản trị: mẫu quy trình mùa vụ (dùng chung khung app-shell) — mục
                          # "Mẫu quy trình" trong nhóm sidebar "Hoạt động sản xuất", thêm/sửa/xoá mẫu
                          # gồm nhiều bước sắp xếp được (xem js/mau-quy-trinh.js)
lo-hang.html              # Trang quản trị: danh sách tất cả lô hàng (dùng chung khung app-shell) —
                          # CHỈ xem/lọc/QR/xác thực blockchain, không có form thêm/sửa lô hàng riêng
                          # (xem js/lo-hang.js)
tai-khoan.html            # Trang quản trị: danh sách người dùng trong Đơn vị + phân quyền theo phân hệ
                          # (dùng chung khung app-shell) — mục "Quản lý Tài khoản" trong nhóm sidebar
                          # "Quản lý Đơn vị"
ho-so.html                # Trang quản trị: hồ sơ CHÍNH tài khoản đang đăng nhập + đổi mật khẩu (dùng
                          # chung khung app-shell) — mở từ menu tài khoản ở topbar (bấm avatar), KHÔNG
                          # phải mục sidebar (xem mục "Menu tài khoản" bên dưới)
goi-phan-mem.html         # Trang tạm "Đang phát triển" — mục "Gói Phần mềm" trong nhóm sidebar
                          # "Quản lý Đơn vị", chưa có nghiệp vụ thật
lich-su-mua-goi.html      # Trang tạm "Đang phát triển" — mục "Lịch sử mua Gói" trong nhóm sidebar
                          # "Quản lý Đơn vị", chưa có nghiệp vụ thật
thuong-mai-tong-quan.html    # Mục "Tổng quan" trong nhóm sidebar "Thương mại điện tử" — khởi tạo/
                             # xem/sửa hồ sơ cửa hàng Ecommerce của Đơn vị (modal 4 tab, xem
                             # js/thuong-mai-tong-quan.js). Cả 7 mục trong nhóm này đều đã có
                             # nghiệp vụ thật — xem mô tả riêng từng trang bên dưới.
thuong-mai-san-pham.html     # Mục "Sản phẩm" trong nhóm sidebar "Thương mại điện tử" — đã có nghiệp
                             # vụ thật: danh sách/lọc/tìm kiếm + thêm/sửa/xoá sản phẩm, mỗi sản phẩm
                             # nhiều biến thể có thể gắn lô hàng thật (xem js/thuong-mai-san-pham.js)
thuong-mai-don-hang.html     # Mục "Đơn hàng" trong nhóm sidebar "Thương mại điện tử" — xem/lọc/đổi
                             # trạng thái đơn hàng, nhưng KHÔNG có form tạo đơn (xem js/thuong-mai-
                             # don-hang.js ở trên và mục riêng bên dưới)
thuong-mai-van-chuyen.html   # Mục "Vận chuyển" trong nhóm sidebar "Thương mại điện tử" — quản lý địa
                             # chỉ lấy hàng/trả hàng của cửa hàng (xem js/thuong-mai-van-chuyen.js)
thuong-mai-nhap-hang.html    # Mục "Nhập hàng" trong nhóm sidebar "Thương mại điện tử" — gõ/quét mã
                             # barcode để cộng thêm tồn kho (xem js/thuong-mai-nhap-hang.js)
thuong-mai-may-tinh-tien.html # Mục "Máy tính tiền (POS)" trong nhóm sidebar "Thương mại điện tử" —
                              # bán tại quầy bằng barcode, "Thanh toán" tạo đơn hàng thật (xem
                              # js/thuong-mai-may-tinh-tien.js)
thuong-mai-thiet-lap.html    # Mục "Thiết lập Shop" trong nhóm sidebar "Thương mại điện tử" — hồ sơ
                             # cửa hàng dạng trang đầy đủ (3 cột), cùng bản ghi "shops" với modal ở
                             # thuong-mai-tong-quan.html (xem js/thuong-mai-thiet-lap.js)
thuong-mai-nhap-hang.html    # Trang tạm "Đang phát triển" — mục "Nhập hàng"
thuong-mai-may-tinh-tien.html # Trang tạm "Đang phát triển" — mục "Máy tính tiền (POS)"
thuong-mai-thiet-lap.html    # Trang tạm "Đang phát triển" — mục "Thiết lập Shop"
truy-xuat.html            # Trang truy xuất nguồn gốc CÔNG KHAI (không cần đăng nhập, không dùng
                          # app-shell) — đọc mã lô hàng qua query string ?ma=..., mở từ mã QR ở nút
                          # "Truy xuất nguồn gốc" trên thẻ lô hàng (nong-trai-chi-tiet.js). Dùng lại
                          # .site-header như index.html/styleguide.html vì đây là trang công khai,
                          # không phải khu vực quản trị.
blog.html                 # Trang Blog CÔNG KHAI (không cần đăng nhập, không dùng app-shell) — dùng
                          # lại .site-header/.site-footer như index.html (mục "Blog" ở menu gắn
                          # .site-header__link--active). Danh sách bài viết nạp qua fetch()
                          # data/blog-posts.json rồi dựng bằng js/blog.js (component .post-card,
                          # xem mục riêng bên dưới) — mở từ link "Blog" ở header/footer mọi trang.
blog-chi-tiet.html        # Trang chi tiết 1 bài viết Blog CÔNG KHAI, mở từ tiêu đề/"Đọc tiếp" của
                          # 1 .post-card ở blog.html — đọc slug qua query string ?slug=... (xem quy
                          # ước "trang chi tiết dùng query string" ở trên; dùng `slug` thay vì `ma`
                          # vì bài viết không có trường "mã" nghiệp vụ). fetch() CÙNG
                          # data/blog-posts.json với blog.js (js/blog-chi-tiet.js), không tìm thấy
                          # thì hiện `.empty-card` tự định nghĩa riêng trong trang (không phải
                          # `.empty-state` — component đó ở app-shell.css, trang công khai không
                          # nạp, giống cách truy-xuat.html đã làm) + nút quay lại blog.html. Nút chia
                          # sẻ Facebook/Twitter (link share thật, mở tab mới) và "sao chép liên kết"
                          # (`navigator.clipboard`, đổi tạm icon thành icon-check-circle 1.5s làm
                          # phản hồi — trang không nạp app-shell.js nên không có AgriChain.toast()).
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

## Khung quản trị (app-shell) — sidebar & menu tài khoản

Nút hamburger ở topbar (`.app-topbar__toggle`) làm **2 việc khác nhau tuỳ độ rộng màn hình**,
xử lý trong `setupSidebar()` (`js/app-shell.js`):
- Dưới 960px: trượt sidebar ra **đè lên** nội dung (overlay), kèm lớp phủ `.app-scrim` — bấm ra
  ngoài lớp phủ hoặc Esc để đóng lại. Đây là hành vi gốc.
- Từ 960px: **thu gọn hẳn** sidebar cố định (không phải overlay) — bật `.is-sidebar-collapsed`
  trên `.app-shell` (thẻ `<body>`), CSS tương ứng đẩy `.app-topbar`/`.app-main` về
  `margin-left: 0` để nội dung lấp đầy chỗ trống (`css/app-shell.css`, trong khối
  `@media (min-width: 960px)`).

**Trạng thái sidebar được nhớ qua `localStorage`** (`agrichain:sidebarCollapsed` — có thu gọn
hay không; `agrichain:sidebarSections` — object `{id nhóm: đang mở hay đóng}`) — bắt buộc phải
làm vậy vì dự án không có router/SPA: mỗi lần bấm 1 mục menu là tải lại một trang tĩnh khác
hoàn toàn, nên nếu không lưu, sidebar sẽ tự "giật" về mặc định (mở hết) sau MỖI lần chuyển
trang, rất khó chịu khi dùng thật. `readUiState()`/`writeUiState()` trong `js/app-shell.js`
bọc `try/catch` giống `store.js`: mất tính năng nhớ trạng thái nếu `localStorage` không dùng
được (chế độ ẩn danh...), nhưng không chặn sidebar hoạt động. `setupNavSections()` chỉ áp dụng
trạng thái đã lưu khi giá trị là `false` rõ ràng (mặc định vẫn luôn là mở nếu chưa từng bấm).

**Menu tài khoản** (bấm avatar ở góc phải topbar) mở `.user-menu__panel` — component chung
trong `css/app-shell.css`, xử lý bằng `setupUserMenu()` (`js/app-shell.js`, đóng lại khi bấm ra
ngoài/Esc/bấm lại avatar). Gồm 3 mục: **Hồ sơ** (mở `ho-so.html` — xem/sửa thông tin cá nhân +
đổi mật khẩu của CHÍNH tài khoản đang đăng nhập, khác `tai-khoan.html` vốn quản lý người dùng
KHÁC trong Đơn vị), **Về trang giới thiệu**, và **Đăng xuất**. `.app-sidebar` **không còn khối
chân trang riêng nữa** (`.app-sidebar__footer`/`.app-sidebar__logout` đã xoá hẳn khỏi mọi
trang lẫn `css/app-shell.css` — tên người dùng + link "Về trang giới thiệu" + nút "Đăng xuất"
từng nằm ở đó giờ đều chuyển hết vào menu tài khoản này) — `.app-sidebar__scroll` (danh sách
menu) nhờ vậy chiếm trọn chiều cao còn lại của sidebar (`flex: 1`), không phải chừa chỗ cho
chân trang nữa.

`ho-so.html` thêm 4 field tuỳ chọn mới vào bản ghi `users` (collection đăng nhập thật, KHÔNG
phải `orgUsers`): `phone`, `dob`, `gender`, `bio` — lưu qua `store.update('users', session.id,
...)` VÀ `store.updateSession(...)` cùng lúc để phiên đăng nhập hiện tại thấy thay đổi ngay,
không cần đăng nhập lại (`updateSession()` tự suy ra đang lưu ở `localStorage` hay
`sessionStorage` dựa vào cái nào đang giữ session, xem `js/store.js`). Tab "Bảo mật" đổi mật
khẩu thật qua `store.changePassword(userId, mậtKhẩuMới)` — sinh salt mới + băm lại đúng cơ chế
`registerUser()`, hợp lệ vì đây là `users` (có xác thực, dù giả lập) — KHÁC quy tắc "không lưu
mật khẩu dưới bất kỳ hình thức nào" chỉ áp dụng riêng cho `orgUsers` (xem mục "Đăng nhập/Đăng
ký" bên dưới).

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
- Nút hiện/ẩn mật khẩu và danh sách điều kiện mật khẩu tách riêng thành
  `js/password-field.js` (dùng chung giữa `dang-ky.html` và modal "Thêm người dùng" ở
  `tai-khoan.html`) — sửa logic mật khẩu thì sửa ở đó, không sửa trong `js/auth.js`.
- **Người dùng trong "Quản lý Tài khoản" (`orgUsers`, tách khỏi `users` — collection
  gốc dùng cho đăng nhập/đăng ký) KHÔNG lưu mật khẩu dưới bất kỳ hình thức nào**, kể cả
  "giả vờ" băm bằng `chain.js` (đó là hash một-chiều cho sổ cái, không phải hashing mật
  khẩu đúng nghĩa — dùng sai mục đích sẽ tạo cảm giác an toàn giả). Mật khẩu nhập vào chỉ
  để validate định dạng phía trình duyệt rồi bỏ, chờ backend thật đảm nhiệm xác thực sau
  này (xem comment ở `handleUserSubmit()` trong `js/tai-khoan.js`).

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
- `.table` — bảng dữ liệu: header nền `--color-bg-subtle`, viền dưới mỗi dòng theo
  `--color-border`. Bọc trong `.table-wrap` (`overflow-x: auto`) để cuộn ngang trên màn
  hình hẹp thay vì vỡ layout. `.table-panel`/`.table-panel__header`/`.table-panel__title`
  (khung card + tiêu đề bọc ngoài) và `.table__code`/`.table__name`/`.table__muted`/
  `.table__nowrap`/`.table__desc`/`.table__actions` (căn chỉnh riêng theo cột dữ liệu) vẫn
  ở `app-shell.css`, không phải phần cốt lõi của component.
- `.avatar` — vòng tròn chữ cái viết tắt tên (nền `--color-primary-subtle`, chữ
  `--color-primary-active`); cỡ mặc định, `--sm`, `--lg`.
- `.password-field`/`.password-toggle`/`.password-rules`/`.password-rule` — ô mật khẩu có
  nút hiện/ẩn + danh sách điều kiện (đủ 8 ký tự, 1 chữ hoa, 1 chữ số, 1 ký tự đặc biệt),
  tô xanh khi đạt (`.is-met`). Logic JS ở `js/password-field.js`.
- `.upload-box` — khung tải ảnh dạng viền đứt nét, bọc `<input type="file">` phủ kín
  (`opacity:0`) để bấm bất kỳ đâu trong khung cũng mở hộp thoại chọn tệp. Gắn class
  `.is-filled` bằng JS (mỗi trang tự viết, không có helper JS chung) sau khi đã đọc xong
  ảnh qua `FileReader` và gán vào `.upload-box__preview` (`<img>`) — ẩn icon/hint đi để
  không đè chữ lên ảnh. Dùng ở `thuong-mai-tong-quan.html` (logo/banner cửa hàng) và
  `thuong-mai-san-pham.html` (hình ảnh sản phẩm).
- `.search-field`/`.search-field__icon` — ô `.input` bọc trong `.search-field` để icon kính
  lúp (`icon-search`) nằm đè bên trái, `.input` tự chừa `padding-left`. Dùng ở
  `thuong-mai-san-pham.html` và `thuong-mai-don-hang.html`.
- `.barcode-search__box`/`__input`/`__submit` — ô quét/nhập mã barcode, icon `icon-barcode`
  bên trái + nút icon `icon-search` bên phải; không dùng `<input class="input">` (input con tự
  style riêng, không viền — viền nằm ở khung ngoài `__box`). Dùng ở `thuong-mai-nhap-hang.html`
  (canh giữa trong khung `.barcode-search` riêng của trang) và `thuong-mai-may-tinh-tien.html`
  (chiếm hết bề rộng cột trái).
- `.view-field` — cặp nhãn/giá trị chỉ đọc (`<span class="label">` + giá trị), dùng trong
  modal/tab chỉ xem (không phải form nhập). Dùng ở `nong-trai-chi-tiet.html` (tab "Thông
  tin") và `thuong-mai-don-hang.html` (modal chi tiết đơn hàng).
- `td.table-empty` — dòng "rỗng" của bảng, render NGAY trong `<tbody>` bằng 1
  `<tr><td colspan="..." class="table-empty">` (icon + thông báo) thay vì ẩn cả bảng và hiện
  `.empty-state` tách riêng — nhờ vậy hàng tiêu đề cột luôn hiển thị. Dùng ở
  `thuong-mai-san-pham.html`, `thuong-mai-don-hang.html`.
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
  phần tử mang id, nên id đặt sai chỗ vẫn cuộn lệch. `.site-header__link--active` đánh dấu
  mục menu ứng với trang đang xem (chỉ đổi màu chữ + đậm, không gạch chân) — dùng ở
  `blog.html` cho mục "Blog", trang chủ không gắn vì bản thân nó không phải 1 mục menu.
- `.site-footer` — footer site-wide: 3 cột (logo+mô tả, liên kết nhanh, liên hệ) + dòng
  bản quyền dưới cùng. Chuyển từ `<style>` riêng của `index.html` sang `components.css`
  từ khi `blog.html` cần dùng lại y hệt — không còn là CSS riêng 1 trang.
- `.badge` — biến thể: `--success`, `--warning`, `--info`, `--neutral`, `--danger`,
  `--solid` (nền đặc, dùng khi đặt đè lên ảnh — VD nhãn danh mục trên ảnh bìa bài viết
  Blog, các biến thể subtle còn lại quá mờ để đọc được trên ảnh). Dùng cho nhãn ngắn
  kiểu "Hữu cơ", "Đã xác thực".
- `.icon` — bọc `<svg>` tham chiếu `icons/sprite.svg`; cỡ mặc định, `--sm`, `--lg`.
  Icon dùng `stroke="currentColor"` nên đổi màu qua CSS `color`.
- `.post-card` — thẻ bài viết Blog, dùng ở `blog.html`. **Cả thẻ là 1 liên kết**
  (`<a class="post-card" href="blog-chi-tiet.html?slug=...">`, không phải `<article>`) — bấm
  bất kỳ đâu trong thẻ (ảnh, tiêu đề, mô tả...) đều mở bài viết, không chỉ riêng chữ "Đọc
  tiếp" (bài học rút ra sau khi người dùng phản hồi "chỉ click Đọc tiếp mới chuyển trang" —
  ban đầu chỉ tiêu đề + "Đọc tiếp" là `<a>` lồng bên trong, đã bỏ để tránh link lồng link).
  Gồm `.post-card__media` (ảnh bìa `object-fit: cover` + `.post-card__category` là
  `.badge--solid` đè góc trên trái), `.post-card__body` (`.post-card__meta` ngày+thời gian
  đọc, `.post-card__title` cắt tối đa 2 dòng bằng `-webkit-line-clamp`, `.post-card__excerpt`
  cắt tối đa 3 dòng cùng kỹ thuật), và `.post-card__footer` (`.post-card__author` +
  `.post-card__link` "Đọc tiếp" giờ chỉ là `<span>` trang trí — đổi màu/dịch icon phải theo
  `:hover` của CẢ thẻ `a.post-card`, không phải hover riêng span này).
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
section E-commerce (mục tiêu của anchor `#ecommerce` trong menu header), tích hợp AI thật.

Trang Blog (`blog.html` + `blog-chi-tiet.html`) đã có ở mức cơ bản: hero + danh sách 3 bài viết
+ trang chi tiết đọc nội dung đầy đủ (đoạn văn/tiêu đề phụ/danh sách), cả 2 trang cùng đọc từ
`data/blog-posts.json`. Chưa có: phân trang/tải thêm, tìm kiếm/lọc theo danh mục, bình luận,
backend quản lý nội dung thật (thêm/sửa/xoá bài viết), ảnh bìa thật (thư mục `images/blog/`
mới chỉ có `.gitkeep`).

Trang truy xuất nguồn gốc (`truy-xuat.html`) đã có ở mức cơ bản: xem 1 lô hàng qua mã QR
(hoặc `?ma=...` trực tiếp), thấy trạng thái xác thực blockchain + thông tin nông trại/mùa
vụ liên quan. Chưa có: liệt kê nhiều lô hàng, tìm kiếm theo mã tự nhập tay trên trang, xác
thực lại (verify) hash ngay tại trang này thay vì chỉ đọc `batch.hash` đã lưu sẵn.

## Mẫu quy trình mùa vụ (`mau-quy-trinh.html`)

Collection `workflowTemplates` (`store.js`) — **KHÔNG khoá theo `ownerId`** như nhóm "Thương
mại điện tử": trang này thuộc "Hoạt động sản xuất", theo đúng quy ước sẵn có của
`farms`/`supplies`/`batches` (danh sách chung cho Đơn vị đang đăng nhập, không có khái niệm
nhiều chủ sở hữu trong 1 phiên — xem `js/vat-tu.js` để đối chiếu).

Mỗi mẫu quy trình gồm nhiều "bước thực hiện" (`steps[]`), mỗi bước có: tên, loại hoạt động kỹ
thuật (`activityType`, dùng lại đúng 9 giá trị/icon của `ACTIVITY_TYPES` trong
`js/nong-trai-chi-tiet.js` — Gieo trồng/Gieo hạt, Bón phân, Tưới nước, Phòng trừ sâu bệnh, Làm
cỏ, Cắt tỉa, Thu hoạch, Kiểm tra/Giám sát, Hoạt động khác), hướng dẫn thực hiện, và 3 cờ
boolean (`requireQr`, `requireSupply` kèm `supplyId` tuỳ chọn trỏ tới `store.list('supplies')`,
`requireImage`). Modal build từng thẻ bước bằng `stepCard()` (giống cách `variantCard()` dựng
biến thể sản phẩm ở `js/thuong-mai-san-pham.js`) — nhưng KHÔNG dùng mảng JS giữ trạng thái
sống: dữ liệu bước đọc/ghi thẳng qua DOM bằng các class đánh dấu (`.step-name`, `.step-type`...)
lúc `collectSteps()` chạy ở submit, y hệt cách `collectVariants()` hoạt động.

Nút lên/xuống mỗi bước **di chuyển thẳng DOM node** (`insertBefore`) thay vì re-render từ mảng —
đơn giản hơn và tận dụng luôn việc DOM đã là nguồn dữ liệu (xem lý do ở trên). Số thứ tự hiển
thị (`1`, `2`, `3`...) được tính lại từ vị trí DOM thật qua `renumberSteps()` sau MỌI thao tác
đổi số lượng/thứ tự bước (thêm, xoá, di chuyển) — biến đếm `stepCount` chỉ dùng nội bộ lúc khởi
tạo 1 thẻ mới, không dùng để hiển thị số, nên không bao giờ bị lệch dù người dùng thêm/xoá xen
kẽ nhiều lần. Xoá bước cuối cùng còn lại sẽ tự thêm ngay 1 bước trống thay thế — modal không
bao giờ để danh sách bước rỗng hoàn toàn.

## Quy trình mùa vụ — áp dụng cho 1 mùa vụ cụ thể (tab "Quy trình mùa vụ")

Tab "Quy trình mùa vụ" trong modal xem chi tiết mùa vụ (`nong-trai-chi-tiet.html`, cạnh
"Timeline mùa vụ"/"Lô hàng") cho phép áp dụng 1 Mẫu Quy Trình (`workflowTemplates`, xem mục
trên) vào ĐÚNG mùa vụ đang xem, biến nó thành 1 checklist các bước phải thực hiện tuần tự.
Đây là khái niệm KHÁC với `mau-quy-trinh.html`: mẫu là bản thiết kế dùng lại nhiều lần, còn
đây là 1 lần áp dụng cụ thể, có tiến độ thực hiện riêng cho từng mùa vụ.

**Không tham chiếu ngược tới mẫu gốc — CHỤP (snapshot) `steps[]` vào 2 field mới trên bản ghi
`seasons`**: `workflowTemplateId`/`workflowTemplateName` (tên mẫu tại thời điểm áp dụng, hiện
ở tiêu đề "Checklist Quy Trình: ...") và `workflowSteps` — mảng bước, mỗi bước là 1 bản sao
đầy đủ field của bước mẫu (`name`, `activityType`, `instruction`, `requireQr`, `requireSupply`,
`supplyId`, `requireImage`) cộng thêm state riêng: `id` (sinh bằng `store.newId()`), `status`
(`'pending'`/`'completed'`), `completedAt`, `logId` (trỏ tới `seasonLogs` khi hoàn thành),
`batchId` (trỏ tới `batches` nếu bước yêu cầu QR). Nhờ chụp bản sao, sửa/xoá mẫu gốc sau đó
không ảnh hưởng tới checklist đã áp dụng. **`workflowSteps` dùng `null`/`undefined` để phân
biệt "chưa áp dụng quy trình nào" với mảng rỗng `[]`** (trường hợp "Tạo quy trình rỗng" — tự
thiết lập nhanh, chưa kịp thêm bước nào) — `renderSeasonProcess()` dựa vào đúng phân biệt này
để quyết định hiện khối chọn mẫu hay hiện checklist.

**Bước "tới lượt" duy nhất** là bước `status !== 'completed'` ĐẦU TIÊN theo thứ tự mảng
(`currentActionableStepId()`) — chỉ bước này hiện nút "Ghi nhật ký & hoàn thành", các bước
chưa hoàn thành phía sau hiện "Chờ đến lượt thực hiện" thay vì nút bấm được. Bấm nút này
(`startStepCompletion()`) mở THẲNG modal "Thêm nhật ký mùa vụ" đã có sẵn ở tab Timeline
(`openSeasonLogModal()`), điền sẵn loại hoạt động + hướng dẫn của bước — tái dùng nguyên vẹn
form/validate/lưu nhật ký, không tạo form riêng. `handleSeasonLogSubmit()` sau khi lưu xong
(chỉ khi THÊM MỚI, không áp dụng lúc sửa nhật ký cũ) gọi `completeWorkflowStep()` để đánh dấu
đúng bước đó hoàn thành + gắn `logId`. Nếu bước có `requireQr: true`, `completeWorkflowStep()`
mở tiếp modal "Thêm lô hàng mới" đã có sẵn ở tab Lô hàng (`openBatchModal()`) — sau khi lưu lô
hàng, `handleBatchSubmit()` gắn `batchId` vào đúng bước (`linkBatchToStep()`) rồi tự mở luôn
modal QR (`openQrModal()`) cho lô hàng vừa tạo, không cần bấm thêm. Cả 2 modal (`season-log-
modal`/`batch-modal`) đều có thể bị đóng bằng Huỷ giữa chừng — `closeSeasonLogModal()`/
`closeBatchModal()` luôn xoá biến theo dõi (`completingStepId`/`pendingQrStepId`) để tránh
hoàn thành nhầm bước ở lần thêm nhật ký/lô hàng kế tiếp không liên quan.

"Tuỳ biến bước quy trình" mở modal riêng (`process-step-modal`) thao tác trên
`currentViewedSeason.workflowSteps`, dùng lại **y hệt** cơ chế "DOM là nguồn dữ liệu" của mẫu
quy trình gốc (`collectSteps()`/`moveStep()`/`renumberSteps()` ở `mau-quy-trinh.js`, chép lại
CSS `.workflow-step`/`.steps-header` nguyên vẹn vào `nong-trai-chi-tiet.html` theo đúng quy
ước "mỗi trang tự chứa CSS/JS riêng") — khác biệt duy nhất: mỗi thẻ bước còn giữ
`id`/`status`/`completedAt`/`logId`/`batchId` qua `dataset` (không phải input người dùng sửa
được) để **KHÔNG mất tiến độ đã hoàn thành** khi người dùng chỉ sửa tên/hướng dẫn của 1 bước
khác trong cùng danh sách — `collectProcessSteps()` đọc lại các giá trị này lúc lưu thay vì
reset về mặc định. "Tạo quy trình rỗng" (`createEmptyWorkflow()`) đặt `workflowSteps: []` rồi
mở LUÔN modal này để tự thêm bước đầu tiên, vì checklist đang trống không có gì để hiển thị.

## Thương mại điện tử — hồ sơ cửa hàng (`thuong-mai-tong-quan.html`)

Collection `shops` (`store.js`) chỉ có **1 bản ghi cho mỗi Đơn vị đăng nhập**, khoá bằng
`ownerId = session.id` (không phải id tổ chức thật — dự án chưa có khái niệm đó). Trang tự
lọc `store.list('shops')` để tìm bản ghi khớp `ownerId`, không có hàm riêng trong `store.js`
cho việc này (theo đúng quy ước: `store.js` chỉ generic insert/update/list, lọc theo nghiệp
vụ nằm ở JS riêng của trang, giống cách `lo-hang.js` tự lọc `batches` theo farm/season).

Modal "Khởi tạo/Chỉnh sửa cửa hàng" chia 4 tab (Tổng quan, Liên hệ & Social, Địa chỉ & Pháp
lý, Vận hành & Chính sách) — các trường bắt buộc nằm rải trên nhiều tab khác nhau, nên
`validate()` trong `js/thuong-mai-tong-quan.js` phải tự nhảy đúng tab (`tabOf(field)` +
`activateTab()` gọi `.click()` lên đúng nút tab) trước khi `.focus()` field lỗi đầu tiên —
`.focus()` trên field nằm trong tab đang ẩn (`hidden`) sẽ không có tác dụng.

Logo/banner cửa hàng đọc qua `FileReader` thành base64 (`dataUrl`), lưu thẳng trong bản ghi
`shops` — cùng cơ chế với ảnh minh hoạ nhật ký mùa vụ (`js/nong-trai-chi-tiet.js`), không có
backend upload thật. Khung tải ảnh dùng component `.upload-box` chung (xem "Component hiện
có" bên dưới) — dùng lại y hệt cho hình ảnh sản phẩm ở `thuong-mai-san-pham.html`.

Địa chỉ kinh doanh dùng lại đúng cơ chế Tỉnh/Thành phố → Phường/Xã của `nong-trai.html`
(`data/provinces.json` + `data/wards/{code}.json` qua `AgriChain.setupCascadingSelect()`) —
`js/thuong-mai-tong-quan.js` tự chép lại 2 hàm `loadProvinces()`/`loadWards()` nhỏ thay vì
import từ `nong-trai.js`, đúng quy ước "mỗi trang tự chứa JS riêng" của dự án.

"Phương thức thanh toán/vận chuyển hỗ trợ" là nhóm chip chọn nhiều (bấm để bật/tắt
`aria-pressed`) và công tắc "Cho phép miễn phí vận chuyển"/"Cho phép thanh toán COD" là
toggle switch tự dựng bằng `<input type="checkbox">` ẩn + `<span>` — cả 2 kiểu control này
(`.chip`/`.chip-group`, `.switch`) hiện chỉ dùng ở trang này nên để trong `<style>` riêng của
`thuong-mai-tong-quan.html`, chưa đưa vào `components.css`; nếu trang khác cần dùng lại thì
mới tách ra theo đúng quy ước "component dùng lại nhiều nơi".

## Thương mại điện tử — sản phẩm (`thuong-mai-san-pham.html`)

Collection `products` (`store.js`) — nhiều bản ghi/Đơn vị, mỗi bản ghi khoá bằng
`ownerId = session.id` (cùng quy ước với `shops`, xem mục trên). Trang tự lọc
`store.list('products')` theo `ownerId` trong `js/thuong-mai-san-pham.js`, không có hàm lọc
riêng trong `store.js` — đúng quy ước "store.js chỉ generic, lọc nghiệp vụ nằm ở JS trang".

Mỗi sản phẩm có mảng `variants` (biến thể: size/quy cách đóng gói khác nhau, mỗi cái có giá/
tồn kho/mã vạch/trọng lượng/kích thước riêng) — **mỗi biến thể có thể gắn với 1 lô hàng thật**
trong collection `batches` qua `variant.batchId` (select trong modal liệt kê
`store.list('batches')`, hiển thị `batch.code` — mã lô đã tự mang thông tin nông trại+mùa vụ
nhờ định dạng `<mã nông trại>-<mã mùa vụ>-NNN`, xem `js/nong-trai-chi-tiet.js`). Đây là điểm
nối giữa "Hoạt động sản xuất" và "Thương mại điện tử": sản phẩm rao bán có thể truy xuất
ngược về đúng lô hàng đã ghi nhận trên blockchain.

Modal thêm/sửa không dùng `<dialog>` full-page như bản tham khảo (dự án không có router) —
vẫn theo đúng quy ước "modal trên cùng trang danh sách" như mọi form khác trong app. Layout
2 cột (`Thông tin cơ bản`/`Hình ảnh`/`Biến thể` bên trái, `Phân loại & Trạng thái`/`Cấu hình
O2O`/`Thông tin bổ sung` bên phải) chỉ để trong `<style>` riêng của trang
(`.product-form-grid`), không phải component chung.

Ảnh sản phẩm (nhiều ảnh, khác với logo/banner cửa hàng chỉ 1 ảnh) đọc qua `FileReader` giống
`shops`, hiển thị dạng lưới thumbnail có nút xoá — CSS `.image-grid`/`.image-thumb` chép lại
từ `.log-images__grid`/`.log-image-thumb` đã có ở `nong-trai-chi-tiet.html` (cùng kiểu, khác
trang, cố tình không gộp — xem quy ước "mỗi trang tự chứa CSS/JS riêng" ở đầu file này).

Bảng danh sách sản phẩm **không** dùng cặp `.table-panel[hidden]`/`.empty-state` tách rời như
`tai-khoan.html` — hàng tiêu đề cột (Ảnh/Tên sản phẩm/...) phải luôn hiển thị kể cả khi chưa
có/không lọc ra sản phẩm nào (khớp giao diện tham khảo), nên trạng thái rỗng render thành 1
`<tr><td colspan="..." class="table-empty">` nằm ngay trong `<tbody>` (`emptyRow()` trong
`js/thuong-mai-san-pham.js`, cùng cơ chế ở `js/thuong-mai-don-hang.js`) thay vì ẩn nguyên khối
bảng đi — `.table-empty` đã chuyển sang `components.css` vì dùng ở cả 2 trang (xem "Component
hiện có").

## Thương mại điện tử — đơn hàng & vận chuyển & nhập hàng & POS

`thuong-mai-don-hang.html` **cố tình không có form tạo đơn hàng thủ công** — trang chỉ xem/
lọc theo trạng thái (tab dạng viên thuốc, `.status-tabs`/`.status-tab` — khác `.tabs` gạch
chân dùng để chuyển nội dung ở nơi khác trong app) + tìm kiếm + sắp xếp + modal xem chi tiết
kèm đổi trạng thái, đọc từ collection `orders` (`store.js`). Ban đầu collection này luôn rỗng
vì chưa có trang mua hàng công khai nào cho khách đặt đơn thật — từ khi có
`thuong-mai-may-tinh-tien.html` (xem bên dưới), đơn bán tại quầy (POS) là nguồn dữ liệu thật
DUY NHẤT hiện có cho `orders`, tương tự quan hệ giữa `lo-hang.html` (chỉ xem lô hàng) và
`nong-trai-chi-tiet.html` (nơi tạo ra chúng thật sự) — modal xem chi tiết ở
`thuong-mai-don-hang.html` còn hiện thêm "Ghi chú đơn hàng" (`order.note`, ẩn cả khối nếu
rỗng) do đơn từ POS có thể kèm ghi chú.

`thuong-mai-van-chuyen.html` quản lý địa chỉ lấy hàng/trả hàng — collection
`shippingAddresses`, khoá `ownerId` như các collection thương mại điện tử khác, thêm trường
`type` (`'pickup'`/`'return'`) và `isDefault`. Mỗi loại địa chỉ chỉ được phép có tối đa 1 địa
chỉ mặc định tại một thời điểm — khi tick "Đặt làm mặc định", `js/thuong-mai-van-chuyen.js`
tự bỏ tick ở các địa chỉ khác CÙNG loại trước khi lưu (không giới hạn qua UI, xử lý hoàn toàn
ở tầng logic). Form địa chỉ dùng lại đúng cơ chế Tỉnh/Thành phố → Phường/Xã của
`nong-trai.html`/`thuong-mai-tong-quan.html` (chép lại 2 hàm `loadProvinces()`/`loadWards()`
nhỏ, đúng quy ước "mỗi trang tự chứa JS riêng").

`thuong-mai-nhap-hang.html` mô phỏng máy quét mã vạch bằng 1 ô nhập tay (Enter = tìm, giống
cách máy quét thật gõ chuỗi ký tự rồi gửi phím Enter) — tìm khớp `barcode` trong TẤT CẢ biến
thể của TẤT CẢ sản phẩm thuộc Đơn vị (`products[].variants[].barcode`, đặt ở modal sản phẩm
của `thuong-mai-san-pham.html`). Biến thể không có `id` riêng (mảng thuần trong bản ghi sản
phẩm) nên tra cứu trả về cả sản phẩm lẫn **vị trí (index)** của biến thể trong mảng, dùng để
ghi đè đúng phần tử khi cộng tồn kho — xem `findVariantByBarcode()` trong
`js/thuong-mai-nhap-hang.js`. Mỗi lần xác nhận ghi thêm 1 dòng vào collection
`inventoryImports` (lịch sử nhập hàng, hiển thị ngay dưới trang) — collection này CÓ nơi tạo
dữ liệu thật ngay trong app (khác `orders`), nên không rơi vào tình trạng luôn rỗng.

`thuong-mai-may-tinh-tien.html` (POS) dùng lại đúng cơ chế quét barcode + tra `variantIndex`
của `thuong-mai-nhap-hang.html`, nhưng CỘNG dồn vào giỏ hàng tạm trong bộ nhớ (mảng `cart`,
JS) thay vì ghi ngay xuống store — chỉ khi bấm "Thanh toán" mới thật sự trừ tồn kho từng biến
thể trong giỏ VÀ chèn 1 bản ghi mới vào `orders` (khách mặc định `'Khách tại quầy'`, trạng
thái đơn `'completed'`, `paymentStatus` là `'unpaid'` nếu chọn COD còn lại đều `'paid'`) — đây
là nơi DUY NHẤT trong app hiện tạo dữ liệu `orders` thật, xem mục trên. Component
`.barcode-search__box`/`__input`/`__submit` (icon barcode trái + nút tìm phải) đã chuyển sang
`components.css` vì dùng ở cả 2 trang nhập hàng/POS — trang nhập hàng còn bọc thêm khung
`.barcode-search` riêng (canh giữa, giới hạn bề rộng) mà POS không cần vì ô quét đã chiếm hết
bề rộng cột trái theo layout `.pos-layout` (lưới 2 cột `2fr 1fr`, riêng của trang này).

**Sửa số lượng trong giỏ KHÔNG được gọi lại toàn bộ `renderCart()`** — nếu render lại cả
`<tbody>` mỗi lần gõ số lượng, DOM sẽ tạo `<input>` mới thay cho ô đang gõ dở, làm mất focus/
con trỏ sau mỗi phím bấm (tự phát hiện khi rà lại code trước khi bàn giao, không phải do
người dùng báo). Cách đúng: chỉ cập nhật `textContent` của đúng ô "Thành tiền" dòng đó +
gọi `updateTotals()` (chỉ tính lại số, không đụng DOM danh sách) — xem `cartRow()` trong
`js/thuong-mai-may-tinh-tien.js`. Nếu sau này sửa lại bảng nào có input inline tương tự
(số lượng, giá...), nhớ tránh đúng lỗi này.

`thuong-mai-thiet-lap.html` ("Hồ sơ cửa hàng") và modal "Khởi tạo cửa hàng" ở
`thuong-mai-tong-quan.html` đọc/ghi **CÙNG MỘT bản ghi** trong collection `shops` (cùng lọc
theo `ownerId = session.id`) — không phải 2 khái niệm khác nhau. Trang Thiết lập Shop chỉ hiển
thị/quản lý 1 tập con field (thương hiệu, pháp lý, chủ shop, địa chỉ, giờ mở cửa/ngày làm
việc, 3 chính sách) — các field còn lại của `shops` (liên hệ khách hàng, website, mạng xã hội,
cấu hình bán hàng/vận chuyển, phương thức thanh toán) vẫn chỉ sửa được qua modal ở Tổng quan.
`store.update()` chỉ ghi đè đúng field trong `payload` truyền vào (merge nông theo từng key,
xem `update()` trong `js/store.js`) nên 2 trang không đụng dữ liệu của nhau dù cùng sửa 1 bản
ghi. Tạo cửa hàng mới từ trang nào cũng khiến trang kia thấy ngay bản ghi đó (không cần đồng
bộ gì thêm, cùng đọc thẳng từ `store.list('shops')`) — VD tạo từ Thiết lập Shop xong thì Tổng
quan tự chuyển sang trạng thái "đã khởi tạo" ở lần tải trang kế tiếp.

Trang JS trùng lặp gần như toàn bộ cơ chế province/ward cascading + đọc ảnh qua `FileReader`
với `js/thuong-mai-tong-quan.js` (đúng quy ước "mỗi trang tự chứa JS riêng", không import lẫn
nhau) — 2 field "Giờ mở cửa"/"Ngày làm việc" có giá trị mặc định gợi ý (`'08:00 - 18:00'`,
`'Thứ 2 - Thứ 7'`) khi CHƯA có cửa hàng, khớp giao diện tham khảo (2 field này hiện chữ đen
chứ không phải placeholder xám như các field khác).

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
