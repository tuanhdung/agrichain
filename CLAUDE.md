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
  api-config.js          # window.AgriChain.API_BASE_URL — nạp TRƯỚC api.js, ở MỌI trang (kể cả
                          # trang chưa dùng API). Sửa domain backend khi deploy chỉ sửa file này.
  api.js                 # Lớp gọi backend thật (FastAPI) — token/refresh/lỗi/hàm nghiệp vụ
                          # (api.auth.*/api.users.*/api.roles.*/api.permissions.*/api.farms.*/
                          # api.seasons.*/api.logs.*/api.supplies.*/api.certifications.*/
                          # api.workflowTemplates.*/api.batches.*). Nạp SAU api-config.js, KHÔNG
                          # defer, ở MỌI trang — xem mục "Kết nối backend"
  header.js              # Xử lý tương tác cho .site-header (toggle menu mobile, cuộn anchor) +
                          # renderHeaderAccountArea() (2026-09-12): thay 2 nút "Đăng Nhập"/"Bắt
                          # Đầu Ngay" ở .site-header__actions bằng 1 nút theo account_type + nút
                          # "Đăng Xuất" khi đã đăng nhập — dùng ở mọi trang công khai nạp
                          # .site-header (index.html, blog.html, blog-chi-tiet.html,
                          # styleguide.html, truy-xuat.html), xem mục "Đăng nhập/Đăng ký" bên dưới
  contact-form.js        # Validate + hiện thông báo thành công cho form ở section Liên Hệ
  chain.js               # Sổ cái băm nối chuỗi (hash chain) bằng Web Crypto API — chạy trong trình duyệt.
                          # ⚠️ MỒ CÔI TOÀN DỰ ÁN kể từ 2026-09-12 (rà lại lúc chuyển batches CRUD
                          # sang API): chỉ còn được gọi TỪ BÊN TRONG js/store.js
                          # (sha256()/append()/verify(), dùng cho registerUser()/changePassword()/
                          # sealBatch() mô phỏng cũ), nhưng KHÔNG còn trang nào gọi 3 hàm store.js
                          # đó nữa (auth.js/ho-so.js đã qua API, sealBatch() đã bỏ hẳn khỏi
                          # nong-trai-chi-tiet.js/lo-hang.js) — 2 file vẫn còn nạp ở mọi trang,
                          # chưa xoá, để lại cho một đợt dọn dẹp sau (chỉ báo cáo, không tự ý xoá).
  store.js               # Lớp lưu trữ qua localStorage (users, farms, supplies, batches, events, ledger,
                          # orgUsers, shops, products, orders, shippingAddresses, inventoryImports,
                          # workflowTemplates, phiên đăng nhập) — mọi trang đọc/ghi dữ liệu qua đây,
                          # không gọi thẳng localStorage. `orgUsers`/`workflowTemplates`/`batches`
                          # giờ MỒ CÔI (không còn trang nào đọc/ghi, đã chuyển hẳn sang API —
                          # `batches` xong 2026-09-12, hoàn tất giai đoạn 3) — chưa xoá khỏi
                          # COLLECTIONS (kể cả hàm `sealBatch()` mô phỏng blockchain, đã bỏ hẳn
                          # phía frontend), để lại cho một đợt dọn dẹp sau (xem "Kết nối backend").
  password-field.js      # Nút hiện/ẩn mật khẩu (data-password-toggle) + danh sách điều kiện mật khẩu
                          # (data-password-rules="<id ô mật khẩu>") dùng chung — tách từ js/auth.js để
                          # js/tai-khoan.js dùng lại được, không chép lại 2 hàm này.
  auth.js                # Xử lý form đăng nhập/đăng ký (dang-nhap.html, dang-ky.html) — ĐÃ
                          # CHUYỂN SANG API qua js/api.js (register Customer/Business + login),
                          # dựa thêm vào js/password-field.js. redirectTarget() dùng chung cho
                          # cả 2 form, nhận account_type để điều hướng đúng trang (xem mục
                          # "Đăng nhập/Đăng ký" bên dưới)
  app-shell.js            # Tương tác khung quản trị (nút hamburger: trượt overlay dưới 960px, thu gọn
                           # hẳn sidebar từ 960px — xem mục "Sidebar" bên dưới; thu gọn/xổ nhóm menu,
                           # tab dùng chung, hộp thoại xác nhận AgriChain.confirm...). Từ 2026-09-12
                           # còn ẩn hẳn nhóm menu "Thương mại điện tử" khỏi Đơn vị không phải nhà
                           # phân phối (updateDistributorOnlyNav()) — xem mục
                           # "AgriChain.api.requireDistributor()". Từ 2026-09-13 còn ẩn mục "Quản
                           # lý Tài khoản" khỏi platform_admin (updatePlatformAdminOnlyNav()) — xem
                           # mục "Quản trị hệ thống (platform_admin)"
  map-layers.js           # 3 lớp nền bản đồ Leaflet dùng chung (vệ tinh/địa hình/mặc định) —
                           # AgriChain.addMapBaseLayers(map), dùng ở cả nong-trai.js lẫn nong-trai-chi-tiet.js
  location-select.js      # Cơ chế "2 select phụ thuộc nhau" dùng chung — AgriChain.setupCascadingSelect(),
                           # dùng ở nong-trai.js (Tỉnh/Thành phố -> Phường/Xã) và lo-hang.js
                           # (Nông trại -> Mùa vụ). Chỉ định nghĩa cơ chế, không biết gì về dữ liệu cụ thể.
  enums.js                 # Danh mục dùng chung (enum) cho "Hoạt động sản xuất" — hiện chỉ có
                           # AgriChain.ACTIVITY_TYPES (9 loại hoạt động kỹ thuật), nguồn DUY NHẤT
                           # dùng ở cả mau-quy-trinh.js lẫn nong-trai-chi-tiet.js (trước đây mỗi
                           # file tự khai báo lại, lệch nhãn/icon — xem SCHEMA-EXPORT.md). Nạp SAU
                           # store.js, TRƯỚC 2 file trên.
  nong-trai.js            # Logic riêng cho nong-trai.html (danh sách + thêm/sửa/xoá nông trại) —
                          # ĐÃ CHUYỂN SANG BACKEND THẬT qua api.farms.* — xem mục "Kết nối backend".
                          # Với platform_admin: đổi sang api.system.farms.* — xem mục "Quản trị hệ
                          # thống (platform_admin)"
  nong-trai-chi-tiet.js   # Logic riêng cho nong-trai-chi-tiet.html (trang xem chi tiết 1 nông trại,
                          # gồm cả chứng nhận/mùa vụ/nhật ký/lô hàng con của nó, và checklist "Quy
                          # trình mùa vụ" áp dụng từ workflowTemplates — xem mục riêng bên dưới).
                          # farms/seasons/logs/certifications/workflowTemplates/batches ĐÃ CHUYỂN
                          # SANG API HẾT (batches xong 2026-09-12, giai đoạn 3 hoàn tất) — xem mục
                          # "Kết nối backend"
  vat-tu.js               # Logic riêng cho vat-tu.html — ĐÃ CHUYỂN SANG BACKEND THẬT qua
                          # api.supplies.*. Với platform_admin: đổi sang api.system.supplies.* —
                          # xem mục "Quản trị hệ thống (platform_admin)"
  mau-quy-trinh.js         # Logic riêng cho mau-quy-trinh.html — ĐÃ CHUYỂN SANG BACKEND THẬT qua
                           # api.workflowTemplates.* (danh sách + tìm kiếm/phân trang + thêm/sửa/xoá
                           # mẫu quy trình mùa vụ), KHÔNG khoá ownerId, theo đúng quy ước "Hoạt động
                           # sản xuất" như farms/supplies — xem mục "Kết nối backend". Với
                           # platform_admin: đổi sang api.system.workflowTemplates.* — xem mục
                           # "Quản trị hệ thống (platform_admin)"
  lo-hang.js               # Logic riêng cho lo-hang.html (danh sách lô hàng, lọc theo nông trại/mùa
                           # vụ + QR — thêm/sửa/xoá vẫn ở nong-trai-chi-tiet.html, nút sửa/xoá ở đây
                           # chỉ điều hướng qua đó). ĐÃ CHUYỂN SANG BACKEND THẬT (2026-09-12) qua
                           # api.batches.list(). Khối "Xác thực blockchain" đã BỎ HẲN — xem mục
                           # "Kết nối backend". Với platform_admin: đổi sang api.system.batches.*,
                           # ẨN bộ lọc + nút sửa/xoá — xem mục "Quản trị hệ thống (platform_admin)"
  tai-khoan.js            # Logic riêng cho tai-khoan.html — ĐÃ CHUYỂN SANG BACKEND THẬT qua
                          # js/api.js (GET/POST/PATCH/DELETE /users, /roles, /permissions),
                          # không còn dùng store.js/collection "orgUsers" nữa — xem mục
                          # "Kết nối backend" bên dưới.
  ho-so.js                # Logic riêng cho ho-so.html (xem/sửa hồ sơ CHÍNH tài khoản đang đăng nhập
                          # + đổi mật khẩu. Mở từ menu tài khoản ở topbar, không phải mục sidebar).
                          # ĐÃ CHUYỂN SANG BACKEND THẬT (2026-09-12) qua api.auth.updateMe()
                          # (PATCH /auth/me) + api.auth.changePassword() (POST /auth/change-password)
                          # — xem mục "Kết nối backend"
  truy-xuat.js            # Logic riêng cho truy-xuat.html (trang truy xuất công khai — KHÔNG nạp
                          # js/app-shell.js, trang này không cần đăng nhập). Tra lô hàng qua
                          # api.batches.getByCode() (route public GET /batches/by-code/{code}),
                          # KHÔNG còn đọc store.list('batches') — xem mục "Kết nối backend"
  blog.js                 # Logic riêng cho blog.html (fetch() data/blog-posts.json rồi dựng từng
                          # .post-card vào lưới — trang công khai, không nạp app-shell.js)
  blog-chi-tiet.js        # Logic riêng cho blog-chi-tiet.html (đọc ?slug= trên URL, fetch() CÙNG
                          # data/blog-posts.json với blog.js để tìm đúng bài rồi dựng nội dung —
                          # xem mục "Blog" bên dưới)
  ecommerce.js             # Logic riêng cho ecommerce.html (trang sàn mua sắm công khai) — đọc
                          # THẲNG store.list('shops')/store.list('products') qua AgriChain.store
                          # (không fetch() như blog, vì đây là dữ liệu localStorage thật của
                          # store.js, không phải file tĩnh) — xem mục riêng bên dưới
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
  exabyte-icon-only-transparent.png  # Logo THẬT của công ty Exabyte (chỉ phần biểu tượng kim
                          # cương xanh/cam, nền trong suốt, KHÔNG có chữ "EXABYTE.VN") — thay
                          # cho logo giả lập "A" trên nền vuông xanh trước đây, xem mục "Logo
                          # công ty" bên dưới
images/
  blog/                   # Ảnh bìa bài viết Blog (post-1.jpg, post-2.jpg, post-3.jpg, hero.jpg...) —
                          # hiện chỉ có .gitkeep giữ chỗ thư mục, CHƯA có ảnh thật, nền
                          # --color-bg-subtle của .post-card__media giữ chỗ tạm (xem blog.html)
index.html                # Trang chủ thật của AgriChain
styleguide.html           # Trang demo design system (living style guide) — không phải trang thật
dang-nhap.html            # Đăng nhập (giả lập, xem cảnh báo trong js/auth.js và js/store.js)
dang-ky.html              # Đăng ký tài khoản — 2 tab "Khách hàng"/"Nông hộ / Doanh nghiệp"
                          # (account_type customer/business), ĐÃ CHUYỂN SANG API (2026-09-11)
                          # qua api.auth.registerCustomer()/registerBusiness() — xem mục
                          # "Đăng nhập/Đăng ký" bên dưới
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
tai-khoan.html            # Trang quản trị: danh sách người dùng trong Đơn vị + phân quyền theo VAI
                          # TRÒ (dùng chung khung app-shell) — mục "Quản lý Tài khoản" trong nhóm
                          # sidebar "Quản lý Đơn vị". Trang ĐẦU TIÊN trong dự án chuyển hẳn sang
                          # backend thật (không còn store.js) — xem mục "Kết nối backend" bên dưới.
ho-so.html                # Trang quản trị: hồ sơ CHÍNH tài khoản đang đăng nhập + đổi mật khẩu (dùng
                          # chung khung app-shell) — mở từ menu tài khoản ở topbar (bấm avatar), KHÔNG
                          # phải mục sidebar (xem mục "Menu tài khoản" bên dưới). ĐÃ CHUYỂN SANG
                          # BACKEND THẬT (2026-09-12) — xem mục "Kết nối backend"
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
quan-tri-he-thong.html    # Dashboard CHỈ ĐỌC dành riêng cho account_type='platform_admin' (Quản
                          # trị hệ thống) — 7 bảng dữ liệu (Nông trại/Mùa vụ/Nhật ký/Chứng nhận/
                          # Vật tư/Mẫu quy trình/Lô hàng) của MỌI Đơn vị qua GET /system/*. KHÔNG
                          # dùng chung layout sidebar/topbar của 16 trang app-shell (chỉ mượn vài
                          # class CSS thuần tuý từ css/app-shell.css: .tabs/.async-state/
                          # .empty-state/.pagination/.page-header/.toast) — xem mục "Quản trị hệ
                          # thống (platform_admin)".
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
ecommerce.html            # Trang sàn mua sắm nông sản CÔNG KHAI (không cần đăng nhập) — mở từ
                          # link "E-commerce" ở header/footer mọi trang. KHÔNG dùng lại
                          # .site-header/.site-footer (xem mục riêng bên dưới để biết lý do) —
                          # có header/footer dạng storefront riêng (tìm kiếm, giỏ hàng, tài khoản
                          # khách hàng thay vì menu marketing). Đọc thật `shops`/`products` qua
                          # js/ecommerce.js, không hard-code dữ liệu mẫu.
```

Khi thêm trang mới: tạo file `.html` ở gốc (hoặc thư mục con theo tính năng),
luôn nạp CSS theo đúng thứ tự: `tokens.css` → `base.css` → `components.css`,
và chèn lại `.site-header` (copy nguyên khối từ `index.html` hoặc `styleguide.html`,
kèm `<script src="js/header.js" defer>` trước `</body>`) — dự án không có templating
nên mỗi trang tự chứa markup header riêng. Riêng `dang-nhap.html`/`dang-ky.html` và
`nong-trai.html`/`vat-tu.html` KHÔNG dùng `.site-header` (layout riêng: auth 2 cột,
app-shell có sidebar) — đừng chèn header vào các trang này. `ecommerce.html` cũng KHÔNG
dùng `.site-header`/`.site-footer` dù là trang công khai — đây là 1 sàn mua sắm (storefront),
vai trò khác hẳn trang giới thiệu doanh nghiệp, nên có header/footer riêng (`.shop-header`/
`.shop-footer`, xem mục riêng bên dưới) với tìm kiếm/giỏ hàng/tài khoản khách hàng thay vì
menu marketing. **`index.html` phải luôn
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

`ho-so.html` **ĐÃ CHUYỂN SANG BACKEND THẬT** (2026-09-12) — xem mục "Kết nối backend" để biết
chi tiết đầy đủ (bug thật đã phát hiện + phát hiện field `dob`/`gender`/`bio` không tồn tại ở
backend nên đã bỏ hẳn khỏi trang, chỉ còn `full_name`/`phone`).

## Đăng nhập / Đăng ký

**Cả `dang-nhap.html` (đăng nhập) VÀ `dang-ky.html` (đăng ký, 2026-09-11) đã chuyển sang
backend thật** qua `js/api.js` — xem mục "Kết nối backend" ngay bên dưới. Vài điểm cần
nhớ khi đụng vào:
- `js/chain.js`/`js/store.js` **vẫn được nạp** ở cả 2 trang này dù `js/auth.js` không còn
  gọi tới (từ khi đăng nhập, rồi đăng ký, chuyển lần lượt sang API) — gỡ 2 thẻ `<script>`
  thừa này ngoài phạm vi các lần chuyển đổi đó, để lại cho một đợt dọn dẹp sau, cùng cách
  xử lý với collection `orgUsers`/`workflowTemplates` mồ côi (xem dưới).
- Nút "Đăng Nhập"/"Bắt Đầu Ngay" ở mọi trang (header, hero, CTA) phải trỏ thẳng
  `dang-nhap.html`/`dang-ky.html` — **không dùng anchor `#dang-nhap`/`#bat-dau-ngay`
  nữa** (đó là placeholder từ lúc 2 trang này chưa tồn tại; đã sửa ở `index.html` và
  `styleguide.html`, nếu thêm trang mới nhớ trỏ đúng luôn).
- Nút hiện/ẩn mật khẩu và danh sách điều kiện mật khẩu tách riêng thành
  `js/password-field.js` (dùng chung giữa `dang-ky.html` và modal "Thêm người dùng" ở
  `tai-khoan.html`) — sửa logic mật khẩu thì sửa ở đó, không sửa trong `js/auth.js`.
- **Collection `orgUsers` (store.js) giờ MỒ CÔI, không còn trang nào dùng tới** — trước
  đây `tai-khoan.html` quản lý người dùng Đơn vị qua đây (cố tình không lưu mật khẩu, chỉ
  validate định dạng rồi bỏ), nhưng trang đó đã chuyển hẳn sang `/users` của backend thật
  (xem mục "Kết nối backend"). Chưa xoá `orgUsers` khỏi `COLLECTIONS` trong `store.js` vì
  đây là thay đổi ngoài phạm vi lần chuyển đổi này — để lại cho một đợt dọn dẹp sau.

### Đăng ký — 2 loại tài khoản: `customer` / `business`

`dang-ky.html` có 2 tab — **"Khách hàng"** (`account_type='customer'`, qua
`api.auth.registerCustomer()`, body `{ email, password, full_name, phone? }`) và
**"Nông hộ / Doanh nghiệp"** (`account_type='business'`, qua `api.auth.registerBusiness()`,
body `{ organization: { name, tax_code?, phone?, address? }, email, password, full_name,
phone? }`) — **4 field Đơn vị PHẢI gói vào object con `organization`**, không gửi rời ở
top-level (khuôn thật của `RegisterBusinessRequest`, đã xác nhận qua Swagger). Radio
`name="type"` dùng đúng 2 giá trị `customer`/`business` (khớp `account_type`, không còn
`org` như tên cũ). Chỉ `organization.name` bắt buộc — 3 field còn lại của Đơn vị
(`tax_code`/`phone`/`address`) và field `phone` cấp ngoài (số điện thoại NGƯỜI đăng ký,
khác số của Đơn vị) đều tuỳ chọn, gửi `null` nếu bỏ trống (không gửi chuỗi rỗng). Input nào
cần bắt buộc KHI tab đang active thì đánh dấu tĩnh `[data-required]` trong HTML —
`setupTypeTabs()` (`js/auth.js`) chỉ gắn `required` cho input có dấu này lúc kích hoạt
tab, KHÔNG còn gắn `required` tràn lên mọi input trong `[data-when-type]` như cũ (hồi đó
mọi field trong tab "org" đều bắt buộc nên chưa cần phân biệt).

Đăng ký thành công (201) → **tự gọi `api.auth.login()` luôn** (không bắt người dùng gõ lại
email/mật khẩu) → điều hướng theo `account_type` của response: `customer` → `agriverse-3d.html`,
`business` → `nong-trai.html` (xem `redirectTarget()` ngay dưới). Lỗi trùng email (400
`VALIDATION_ERROR`, `details.field = "email"`) hiện thẳng `error.message` từ backend
("Email đã được sử dụng.") vào đúng ô email qua `registerFieldNodeFor()` — map thêm cả
field lồng trong `organization` (trả về dạng `"organization.name"`, Pydantic nối `loc` bằng
`.`, xem `app/errors.py:_field_path` của `agrichain-api`) sang đúng input, không chỉ field
phẳng như các trang CRUD khác.

### `redirectTarget()` — nhận biết `account_type` (2026-09-11)

`redirectTarget()` (`js/auth.js`, dùng chung bởi `setupLogin()` VÀ `setupRegister()`) giờ
nhận tham số `accountType` (`'customer'`/`'business'`/`null` nếu chưa rõ — coi như
`'business'` để giữ hành vi mặc định cũ): mặc định `customer` → `agriverse-3d.html`,
`business` (hoặc chưa rõ) → `nong-trai.html`. **`agriverse-3d.html`, KHÔNG phải
`ecommerce.html`** (đổi 2026-09-11, xem mục "Trang thương mại điện tử chính thức" ở dưới) —
tham số `?redirect=` vẫn qua đúng regex chống open-redirect như trước, nhưng THÊM 1 lớp
chặn: khai báo mảng `ADMIN_SHELL_PAGES` (**16** trang dùng khung quản trị app-shell —
`nong-trai`, `nong-trai-chi-tiet`, `vat-tu`, `mau-quy-trinh`, `lo-hang`, `tai-khoan`,
`ho-so`, `goi-phan-mem`, `lich-su-mua-goi`, và 7 trang `thuong-mai-*`) — nếu `?redirect=`
trỏ vào 1 trong số này MÀ `accountType === 'customer'`, bỏ qua giá trị đó, dùng mặc định
(`agriverse-3d.html`) thay vào. **Đây là bản vá cho lỗi đã gặp thật**: tài khoản `customer`
đăng nhập xong từng bị đưa vào `nong-trai.html` (mặc định cũ, không phân biệt loại tài
khoản) rồi nhận lỗi 403 ngay khi tải dữ liệu farms/supplies — RBAC backend không gán quyền
gì cho vai trò hệ thống `'customer'`. Từ bản vá này, tài khoản `customer` không bao giờ
được đưa vào khu quản trị qua `?redirect=`, dù chỉ thoáng qua. `ADMIN_SHELL_PAGES` là mảng
DUY NHẤT khai báo danh sách 16 trang này trong toàn dự án — mọi chỗ khác cần danh sách
tương tự (VD chèn `requireBusiness()`, xem ngay dưới) phải đối chiếu lại đúng mảng này,
không gõ tay lại để tránh lệch.

### `AgriChain.api.requireBusiness()` — áp dụng cho ĐỦ 16 trang `ADMIN_SHELL_PAGES` (2026-09-11)

`js/api.js` có sẵn từ B1: `AgriChain.api.getAccountType()`/`isBusiness()`/
`getOrganizationId()` đọc đồng bộ từ `agrichain.user` đã lưu (không gọi API), và
`AgriChain.api.requireBusiness()` — tài khoản `customer` bị đá thẳng sang
`agriverse-3d.html` ngay trong `<head>` (không `defer`), trước khi trang kịp vẽ ra. Listener `pageshow` chống
bfcache (xem mục "Kết nối backend" → `js/api.js`) áp THÊM đúng mẫu này cho
`requireBusiness()`: tài khoản `business` A xem trang quản trị, đăng xuất, `customer` B đăng
nhập cùng trình duyệt, bấm Back → bfcache khôi phục lại trang quản trị của A với phiên B
(vẫn hợp lệ, `requireAuth()` không bắt được) nhưng sai `account_type` → `requireBusiness()`
bắt đúng ca này.

**Đã gắn CẢ `AgriChain.api.requireAuth()` LẪN `requireBusiness()` vào `<head>` của ĐỦ 16
trang `ADMIN_SHELL_PAGES`** (2026-09-12 — vá nốt lỗ hổng để lại từ B3, xem lịch sử ngay
dưới). Ban đầu (B3) chỉ 6/16 trang (`nong-trai`, `nong-trai-chi-tiet`, `vat-tu`,
`mau-quy-trinh`, `lo-hang`, `tai-khoan` — đúng nhóm đã migrate farms/supplies/... sang API)
có sẵn `requireAuth()`; B3 chỉ thêm `requireBusiness()` cho 10 trang còn lại
(`ho-so`, `goi-phan-mem`, `lich-su-mua-goi`, và 7 trang `thuong-mai-*`) mà KHÔNG thêm
`requireAuth()`, để lại lỗ hổng: khách CHƯA đăng nhập gõ thẳng URL 1 trong 10 trang này vẫn
thấy chớp khung sidebar/topbar trước khi `requireSession()` (`js/app-shell.js`, chạy SAU
`DOMContentLoaded`) kịp đá đi — chặn muộn hơn hẳn 6 trang kia. Đã vá bằng cách thêm
`AgriChain.api.requireAuth();` ngay trước `requireBusiness();` trong cùng khối `<script>`
có sẵn ở cả 10 trang, đúng thứ tự/vị trí như 6 trang gốc — không còn phân biệt "6 trang" vs
"10 trang còn lại" nữa, cả 16 trang giờ dùng chung đúng 1 khuôn `<script>` (`api-config.js`
→ `api.js` → `requireAuth()` → `requireBusiness()`, không `defer`).

### `AgriChain.api.requireDistributor()` — chặn 7 trang `thuong-mai-*.html` khỏi mọi tài khoản không phải `platform_admin` (2026-09-12, điều kiện đổi hẳn 2026-09-14)

Backend expose **`organization_is_distributor`** qua `GET /auth/me` (field PHẲNG, cùng cấp
với `user`/`permissions` trong `MeResponse`, KHÔNG lồng trong `user`) — `true` cho "Đơn vị
mặc định" (công ty vận hành AgriChain), `false` cho Đơn vị khác (nông trại tự đăng ký qua
`POST /auth/register/business`), `null` cho tài khoản `customer` (không thuộc Đơn vị nào).
`me()`/`updateMe()` (`js/api.js`) đều phải tự gắn field này vào `agrichain.user` trước khi
lưu — CÙNG LOẠI lỗi đã gặp với `permissions` (`GET /auth/me` trả về object bọc ngoài, không
phải `user` phẳng): thiếu bước gắn thì `getUser().organization_is_distributor` luôn đọc ra
`undefined`. `updateMe()` (response là `UserOut` phẳng, không có field này) phải giữ nguyên
giá trị đã lưu trước đó — route đó không đổi được Đơn vị nên chắc chắn không đổi.

**⚠️ `AgriChain.api.isDistributor()` giờ MỒ CÔI (2026-09-14)** — ban đầu (2026-09-12) dùng để
chặn `requireDistributor()`/ẩn menu TMĐT khỏi Đơn vị KHÔNG phải nhà phân phối (business của
Đơn vị phân phối thật, VD `admin@agrichain.vn`, vẫn thấy được). Yêu cầu đã đổi lại, xác nhận
rõ: nhóm "Thương mại điện tử" giờ **CHỈ dành cho `platform_admin`**, KỂ CẢ business của Đơn
vị phân phối thật cũng không còn thấy nữa — `isDistributor()` không còn được gọi ở đâu trong
dự án nữa (cùng cách xử lý `orgUsers`/`workflowTemplates`/`js/chain.js` đã mồ côi trước đó:
KHÔNG xoá hàm này lẫn field `organization_is_distributor`/migration `009` phía backend, để
dành cho mục đích khác sau này, chỉ ngừng gọi). Chi tiết đầy đủ lý do đổi hướng xem mục
"Quản trị hệ thống (platform_admin)" bên dưới.

**`AgriChain.api.requireDistributor()`** — đúng mẫu `requireBusiness()`, gắn vào `<head>`
của **7 trang `thuong-mai-*.html`** (Tổng quan/Sản phẩm/Đơn hàng/Vận chuyển/Nhập hàng/Máy
tính tiền/Thiết lập Shop), **NGAY SAU** `requireAuth()`/`requireBusiness()` đã có sẵn —
KHÔNG áp cho 9 trang admin còn lại. Giờ chỉ kiểm `isPlatformAdmin()` — `true` thì qua,
ngược lại (miễn `isLoggedIn() && isBusiness()`, để `requireAuth()`/`requireBusiness()` đã
gọi trước đó tự xử lý ca chưa đăng nhập/`customer`) đá thẳng về `nong-trai.html` (khu quản
trị chung), KHÔNG phải `agriverse-3d.html` (đích riêng cho `customer`) — người bị chặn ở
đây vẫn là `account_type='business'` hợp lệ.

**Listener `pageshow` chống bfcache** (xem mục "Kết nối backend" → `js/api.js`) áp THÊM
đúng mẫu cho `requireDistributor()`: `platform_admin` A xem xong 1 trang `thuong-mai-*.html`,
đăng xuất, tài khoản business B đăng nhập cùng trình duyệt (bất kể Đơn vị của B có phải
phân phối hay không — không còn quan trọng), bấm Back → bfcache khôi phục lại trang của A
với phiên B (vẫn hợp lệ, `requireAuth()`/`requireBusiness()` không bắt được ca này) nhưng
không phải `platform_admin` — điều kiện chỉ còn `isBusiness()` (đã đủ, vì `platform_admin`
không bao giờ `isBusiness()`). 3 điều kiện (`requireAuth`/`requireBusiness`/
`requireDistributor`) xét ĐỘC LẬP nhau trong cùng 1 listener, không gộp `else if`, vì mỗi
điều kiện đá về 1 đích khác nhau.

**Ẩn nhóm menu sidebar "Thương mại điện tử" (`js/app-shell.js`)** — lớp thứ 2, độc lập với
`requireDistributor()` (thiếu 1 trong 2 vẫn còn hở: ẩn menu không chặn được URL gõ trực
tiếp, và chặn URL không tự ẩn menu) — điều kiện PHẢI khớp nhau. `updateDistributorOnlyNav()`
tìm `#nav-thuong-mai` (id CỐ ĐỊNH, giống hệt nhau trên cả 16 trang app-shell) rồi lên tới
`.app-nav__section` cha để ẩn CẢ nút bấm mở nhóm lẫn danh sách bên trong (ẩn mỗi `<ul>` vẫn
để lộ tiêu đề nhóm trống trơn). Giờ chỉ còn `section.hidden = !!(api && !api.isPlatformAdmin())`
— gán `hidden` TƯỜNG MINH cả 2 chiều (không chỉ set `true` có điều kiện) — cùng bài học đã
rút ra ở `renderAccountArea()` (`agriverse-3d.html`)/`renderHeaderAccountArea()`
(`js/header.js`): hàm này còn được gọi lại từ 1 listener `pageshow` RIÊNG trong
`js/app-shell.js` khi khôi phục từ bfcache, nếu chỉ set `true` có điều kiện thì gọi lại sẽ
không bao giờ HIỆN LẠI đúng cho `platform_admin`. Gọi 1 lần trong `DOMContentLoaded` (sau
`setupLogout()`).

**Không đụng gì tới dữ liệu `shops`/`products`/`orders`** (vẫn ở `store.js`, chưa migrate)
— lần sửa này CHỈ ẩn/chặn ở tầng giao diện theo `organization_is_distributor`, không đổi
cách các collection thương mại điện tử đó được đọc/ghi.

### Quản trị hệ thống (`platform_admin`) — dùng CHUNG khu quản trị, không có trang riêng (2026-09-13)

Backend thêm `account_type` thứ 3 — **`platform_admin`** (`app/schemas/enums.py`, migration
`010_platform_admin_accounts.sql`) — bên cạnh `customer`/`business`: đứng TRÊN mọi Đơn vị,
`organization_id` LUÔN `NULL` (CHECK ràng buộc DB, cùng điều kiện với `customer` nhưng khác
mục đích — không mua hàng, chỉ dùng để XEM dữ liệu MỌI Đơn vị qua 7 route
**`GET /system/farms|seasons|logs|certifications|supplies|workflow-templates|batches`**
(router `app/routers/system.py`, chặn cứng bằng dependency `require_platform_admin` —
account_type khác đều 403, **KHÔNG dùng cơ chế permission thông thường** nên role
`platform_admin` không có mã quyền nào cả — `hasPermission(code)` luôn trả `false` với
account_type này, đúng ý "read-only mọi nơi"). Không tự đăng ký được (`dang-ky.html` chỉ có
2 tab `customer`/`business`), không seed sẵn — tạo thủ công qua
`migrations/seed_platform_admin.py` (mặc định `sysadmin@agrichain.vn`, mật khẩu random in
ra 1 lần khi chạy script, không lưu ở đâu khác).

**⚠️ Quyết định thiết kế đã ĐỔI HƯỚNG 1 lần (2026-09-13, cùng ngày)**: lần đầu triển khai
platform_admin có 1 trang dashboard RIÊNG (`quan-tri-he-thong.html` + `js/quan-tri-he-thong.js`,
7 tab tự dựng) và bị **chặn hẳn** khỏi 16 trang app-shell (`requireBusiness()` đá đi,
`requireDistributor()` không áp dụng vì không phải business). Đã **BỎ HẲN hướng đó, xoá 2
file trên** — hướng CHỐT: platform_admin dùng **CHUNG giao diện** 16 trang app-shell với
`business`, chỉ khác NGUỒN DỮ LIỆU (gọi `api.system.*` thay vì `api.farms.*`/`api.supplies.*`/
... — xem chi tiết bên dưới). Lý do đổi hướng: tận dụng lại toàn bộ UI/UX đã có (tìm kiếm,
phân trang, card...) thay vì xây một bộ UI hoàn toàn mới chỉ để hiển thị lại đúng dữ liệu đó;
chỉ 4 trang danh sách chính (farms/supplies/workflow-templates/batches) có route
`/system/*` tương ứng nên chỉ 4 trang này cần đổi nguồn dữ liệu.

**`AgriChain.api.isPlatformAdmin()`** (`js/api.js`) — đọc đồng bộ
`getAccountType() === 'platform_admin'`, không gọi API, cùng mẫu `isBusiness()`/
`isDistributor()`. Đây là API DUY NHẤT còn lại liên quan tới platform_admin trong `js/api.js`
— **không có `requirePlatformAdmin()`** (đã xoá cùng đợt đổi hướng, không còn trang riêng
nào cần guard kiểu đó).

**`requireBusiness()` sửa để platform_admin qua được (không bị đá đi);
`requireDistributor()`/`updateDistributorOnlyNav()` sửa lại LẦN NỮA (2026-09-14) — TMĐT giờ
CHỈ dành cho platform_admin, không còn phân biệt theo `is_distributor` nữa:**
- `requireBusiness()` (gắn ở cả 16 trang app-shell): `!isBusiness() && !isPlatformAdmin()`
  mới đá sang `agriverse-3d.html` — trước đó (bản đổi-hướng-tạm-thời) từng có nhánh đá
  platform_admin sang 1 trang riêng, đã bỏ.
- `requireDistributor()` (gắn ở 7 trang `thuong-mai-*.html`): CHỈ còn kiểm `isPlatformAdmin()`
  — `true` thì qua (`if (!isLoggedIn() || isPlatformAdmin()) return true;`), còn lại (miễn
  `isBusiness()`) đá về `nong-trai.html`. **KHÔNG còn kiểm `organization_is_distributor`** —
  bản 2026-09-13 (giữa chừng) từng để business của Đơn vị phân phối thật (VD
  `admin@agrichain.vn`) vẫn qua được, đã xác nhận lại và bỏ hẳn: giờ MỌI business (kể cả Đơn
  vị phân phối) đều bị chặn, chỉ platform_admin mới vào được.
- `updateDistributorOnlyNav()` (`js/app-shell.js`, ẩn/hiện nhóm menu sidebar "Thương mại
  điện tử") áp lại đúng logic — giờ chỉ còn `!api.isPlatformAdmin()` (bỏ hẳn `isBusiness()`
  và `isDistributor()` khỏi điều kiện), 2 lớp (ẩn menu + chặn URL) phải khớp nhau.
- `defaultTargetFor()`/`redirectTarget()` (`js/auth.js`): **cố tình KHÔNG liệt kê nhánh
  riêng nào cho `platform_admin`** — rơi thẳng vào nhánh mặc định `nong-trai.html` giống hệt
  `business` (khớp đúng hướng "dùng chung giao diện"). `ADMIN_SHELL_PAGES` guard trong
  `redirectTarget()` cũng chỉ còn chặn `customer` như nguyên bản — platform_admin dùng
  `?redirect=` vào 1 trong 16 trang là bình thường, không còn bị chặn.

**`AgriChain.api.system.*`** (`js/api.js`) — 7 hàm `list(params)` bọc mỏng quanh
`GET /system/...` (farms/seasons/logs/certifications/supplies/workflowTemplates/batches),
cùng khuôn `{ items, total, page, page_size }` (`Page[T]`) như `api.farms.list()`... nhưng
**KHÔNG có tham số tìm kiếm `q`, không lọc được `farm_id`/`season_id`** — xác nhận qua router
thật trước khi viết (chỉ `page`/`page_size`), không suy đoán như các domain khác. Mỗi bản
ghi trả về kèm field PHẲNG **`organization_name`** (chỉ có ở `*SystemOut`, KHÔNG có ở `*Out`
thường dùng cho `api.farms.list()`... của tài khoản `business`) — CÁCH DUY NHẤT phân biệt
bản ghi giữa các Đơn vị trong danh sách gộp này, vì mã (nông trại, mùa vụ, lô hàng...) chỉ
duy nhất trong phạm vi 1 Đơn vị, có thể TRÙNG giữa các Đơn vị khác nhau (org-scoped từ đầu,
xem mục "Trang `tai-khoan.html`").

**Chỉ 4 trang danh sách chính đổi nguồn dữ liệu theo `AgriChain.api.isPlatformAdmin()`** —
`js/nong-trai.js`, `js/vat-tu.js`, `js/mau-quy-trinh.js`, `js/lo-hang.js` (biến module-scope
`isPlatformAdminMode`, tính 1 lần lúc tải trang):
- Gọi `api.system.<domain>.list({ page, page_size })` thay vì `api.<domain>.list({ q, page,
  page_size })` — KHÔNG gửi `q` (route system không hỗ trợ). Ô tìm kiếm bị **vô hiệu hoá**
  (`disabled = true` + đổi placeholder giải thích) ở chế độ này thay vì để nó trông như hoạt
  động mà thực ra không lọc được gì.
- Thêm dòng/cột **"Đơn vị sở hữu"** (đọc `organization_name`) — CHỈ hiện khi
  `isPlatformAdminMode`. Đặt tên "Đơn vị **sở hữu**", không phải "Đơn vị" trơn, vì
  `vat-tu.html` đã có sẵn 1 cột tên "Đơn vị" cho **đơn vị TÍNH** (kg/Lít/...) — trùng nhãn 2
  khái niệm khác nhau sẽ gây hiểu lầm. `vat-tu.js` chèn `<th>` này bằng JS
  (`headRow.insertBefore(...)`) thay vì sửa HTML tĩnh, vì bảng dùng chung với `business`.
  `nong-trai.js`/`mau-quy-trinh.js` (dạng card) thêm 1 dòng thông tin; `lo-hang.js` (dạng
  card) thêm 1 hàng trong `.batch-card__rows`.
- **Ẩn nút Thêm/Sửa/Xoá**: phần lớn ĐÃ TỰ ĐỘNG đúng nhờ hạ tầng permission có sẵn —
  `hasPermission(code)` luôn `false` với platform_admin (role không có permission nào), nên
  mọi nút gắn `data-requires-permission`/`api.hasPermission(...)` (nút "Thêm...", nút Sửa/Xoá
  trong `nong-trai.js`/`vat-tu.js`/`mau-quy-trinh.js`) tự ẩn, KHÔNG cần sửa thêm.
  **Ngoại lệ phải sửa tay: `lo-hang.js`** — nút Sửa/Xoá ở đây vốn là `<a>` điều hướng thẳng
  sang `nong-trai-chi-tiet.html` (không qua `hasPermission()` nào cả, vì CRUD lô hàng thật
  sự nằm ở trang đó) — đã bọc thêm `if (!isPlatformAdminMode)` quanh việc dựng 2 nút này.
- **Tránh dẫn vào ngõ cụt 403**: `nong-trai-chi-tiet.html` (trang chi tiết nông trại,
  `lo-hang.js` cũng điều hướng sửa/xoá lô hàng về đây) **KHÔNG được chuyển đổi** ở lần đổi
  hướng này (ngoài phạm vi) — gọi `api.farms.get()`/`api.seasons.*` thường sẽ 403 ngay khi
  platform_admin lỡ vào được. `nong-trai.js`'s `farmCard()` vì vậy dựng thẻ dạng `<div>`
  KHÔNG điều hướng (thay vì `<a href="nong-trai-chi-tiet.html?ma=...">`) khi
  `isPlatformAdminMode`, kèm ẩn luôn nút "Xem chi tiết" (vốn không có sự kiện riêng, chỉ ăn
  theo việc cả thẻ là `<a>`) — nút chết nếu không ẩn. `mau-quy-trinh.js`'s `templateCard()`
  không có vấn đề này (nút Sửa mở modal TRONG TRANG, không điều hướng) — ẩn nút Sửa qua
  `hasPermission()` cũng đồng nghĩa platform_admin không xem được `steps[]` chi tiết của mẫu
  quy trình, chỉ thấy tên/mô tả/số bước — chấp nhận được, ngoài phạm vi xây thêm 1 modal
  xem-only chỉ để lộ dữ liệu này.
- **`lo-hang.js` còn ẩn hẳn khối "Bộ lọc" (Nông trại/Mùa vụ)** ở chế độ platform_admin —
  `api.system.batches.list()` không lọc được `farm_id`/`season_id`, và tự dựng lại cơ chế lọc
  (gọi `api.farms.list()`/`api.seasons.list()` thường để đổ vào 2 select) sẽ 403 ngay từ bước
  đổ dữ liệu cho chính bộ lọc đó — ẩn hẳn thay vì để 2 select trống/lỗi.

**7 trang `thuong-mai-*.html` — KHÔNG sửa gì thêm lần này**: platform_admin vào được nhờ mục
1+2 ở trên (`requireBusiness()`/`requireDistributor()` đều cho qua), nhưng dữ liệu
`shops`/`products`/`orders` vẫn ở `store.js`/localStorage theo phiên của CHÍNH platform_admin
(không có Đơn vị nào) nên các trang này sẽ luôn trống với tài khoản này — biết trước, chấp
nhận được, KHÔNG nằm trong phạm vi lần đổi hướng này (câu hỏi "dữ liệu TMĐT theo Đơn vị nào
với platform_admin" để lại quyết định sau).

**`tai-khoan.html` (Quản lý Tài khoản) — ẩn khỏi sidebar, không vỡ trang nếu gõ thẳng URL**:
`updatePlatformAdminOnlyNav()` (`js/app-shell.js`, cùng mẫu `updateDistributorOnlyNav()`,
gọi ở `DOMContentLoaded` VÀ listener `pageshow` chống bfcache) ẩn mục sidebar dẫn tới trang
này (chọn qua `a[href="tai-khoan.html"]`, không có id riêng, lặp lại y hệt ở cả 16 trang
app-shell) khi `api.isPlatformAdmin()` — tài khoản này không thuộc Đơn vị nào nên không có
người dùng "của Đơn vị mình" để quản lý. Gõ thẳng URL vẫn KHÔNG vỡ trang dù không chặn cứng
bằng redirect (theo đúng yêu cầu, ưu tiên đơn giản/an toàn hơn điều hướng đẹp ở đây):
`js/tai-khoan.js`'s `DOMContentLoaded` kiểm `api.isPlatformAdmin()` NGAY ĐẦU, nếu đúng thì
thay hẳn `.app-content` bằng 1 `.empty-state` báo "Không áp dụng cho tài khoản Quản trị hệ
thống" rồi `return` sớm — không chạy `loadUsers()`/`GET /roles`... (sẽ 403 hàng loạt).

### Trang thương mại điện tử chính thức: `agriverse-3d.html` (KHÔNG phải `ecommerce.html`, 2026-09-11)

Toàn bộ luồng điều hướng tài khoản `customer` (`defaultTargetFor()`/`redirectTarget()` ở
`js/auth.js`, `requireBusiness()` + listener `pageshow` ở `js/api.js`) giờ trỏ về
**`agriverse-3d.html`**, không còn `ecommerce.html` — khớp đúng thực tế đã có từ trước
(2026-09-08) ở menu header/footer "E-commerce" của `index.html`/`blog.html`/
`blog-chi-tiet.html`/`styleguide.html` (xác nhận lại còn đúng, không bị các lần sửa
B1–B3 ở trên vô tình đổi ngược — những lần đó chỉ đụng tới luồng đăng nhập/redirect,
không đụng menu).

**`ecommerce.html` giờ MỒ CÔI HOÀN TOÀN** — không còn bất kỳ `href`/`location.href` nào
trong dự án trỏ tới nó nữa (trước đây chỉ mồ côi khỏi menu chính, nhưng vẫn còn là đích
mặc định sau đăng nhập/đăng ký cho tài khoản `customer`; giờ cả đường đó cũng đã đổi sang
`agriverse-3d.html`). **CHƯA xoá file** — `ecommerce.html`/`js/ecommerce.js` vẫn còn
nguyên trên đĩa, cùng cách xử lý với collection `orgUsers`/`workflowTemplates` mồ côi
trong `store.js` (xem mục "Đăng nhập/Đăng ký" ở trên) — việc dọn hẳn (xoá file hoặc gắn
lại link) ngoài phạm vi các lần sửa này, để lại cho một đợt dọn dẹp sau. Các tham chiếu
`href="ecommerce.html"` CÒN LẠI bên trong chính `ecommerce.html` (link tới trang chủ của
chính nó ở header) là tự trỏ vào chính nó, không phải sót — không cần sửa.

**Nợ kỹ thuật của `agriverse-3d.html`**: toàn bộ dữ liệu sản phẩm/gian hàng
(`PRODUCTS_DATA`, `ENTERPRISE_SHOPS`) hiện là **hardcode trong JS demo ngay trong trang**
— KHÔNG đọc `shops`/`products` thật qua `store.js` (khác `ecommerce.html`/`js/ecommerce.js`
cũ, vốn đọc thẳng dữ liệu thật) hay qua API. Nối `agriverse-3d.html` vào dữ liệu
`shops`/`products` thật (qua `store.js` hoặc API) là việc CHƯA làm, ngoài phạm vi các lần
sửa điều hướng/khu tài khoản ở đây.

### Khu vực tài khoản ở header `agriverse-3d.html` (2026-09-11)

Trang này ban đầu KHÔNG nạp `js/api.js`/`js/api-config.js` (đứng độc lập, tự viết Tailwind
+ Three.js riêng — xem mục "Hero — video giới thiệu" phía trên) — nghĩa là khách hàng đăng
nhập xong bị đưa vào đây (đích mặc định cho `account_type='customer'`, xem mục trên)
nhưng **không có cách nào biết mình đang đăng nhập hay đăng xuất**, chặn hẳn việc test
luồng đăng nhập/đăng ký thật. Đã vá bằng cách nạp thêm `js/api-config.js` rồi `js/api.js`
ở cuối `<head>` (đúng thứ tự, KHÔNG `defer` — cùng quy ước mọi trang khác) — **vẫn KHÔNG
gọi `requireAuth()`/`requireBusiness()`**, đúng chủ đích vì đây là trang công khai, khách
chưa đăng nhập hay tài khoản `customer` đều phải vào được bình thường; chỉ dùng
`AgriChain.api` để ĐỌC trạng thái đã đăng nhập (nếu có), không để CHẶN trang.

`#account-area` trong header (cạnh icon giỏ hàng) mặc định tĩnh là link "Đăng Nhập" —
`renderAccountArea()` (cuối `<script>` chính của trang, gọi trong `window.addEventListener
('load', ...)` cùng `renderProductGrid()`/`initSupermarketVR360()`) LUÔN tự vẽ lại TOÀN BỘ
`#account-area` mỗi lần gọi, cả 2 nhánh — **không** early-return "coi như mặc định vẫn còn"
ở nhánh chưa đăng nhập (xem lý do ở mục bfcache ngay dưới). Nếu `AgriChain.api.isLoggedIn()`
đúng: hiện avatar chữ cái đầu + tên (`user.full_name`, đọc qua `AgriChain.api.getUser()`)
kèm dropdown (`toggleAccountMenu()`, tự đóng khi bấm ra ngoài — nghe `click` ở `document`,
không dùng thư viện ngoài cho 1 dropdown nhỏ) gồm:
- **"Khu Quản Lý"** → `nong-trai.html` — CHỈ hiện nếu `AgriChain.api.isBusiness()` đúng
  (tài khoản `business` vừa mua hàng vừa quản trị Đơn vị cần đường quay lại khu quản trị).
- **"Đăng Xuất"** (`handleAccountLogout()`) → `AgriChain.api.auth.logout()` rồi tải lại
  chính `agriverse-3d.html` (không phải `dang-nhap.html` — đăng xuất ở trang công khai
  không bắt buộc phải rời khỏi nó).

`fullName`/`email` của người dùng gán vào DOM qua `textContent` (KHÔNG nội suy thẳng vào
chuỗi HTML của `innerHTML`) — phòng rủi ro XSS nếu giá trị này từng lọt ký tự HTML qua
đường đăng ký/sửa hồ sơ; chỉ phần khung HTML tĩnh (icon, class, cấu trúc) do chính trang
viết mới nằm trong chuỗi `innerHTML`.

**⚠️ Bug bfcache đã vá (2026-09-11)**: đăng xuất ở `agriverse-3d.html` xong bấm Back từng
hiện lại avatar/tên CŨ dù access token đã bị xoá thật (F5 lại mới đúng — bug hiển thị
thuần tuý, KHÔNG phải lỗ hổng bảo mật, mọi gọi API vẫn bị chặn đúng vì token đã mất thật).
Nguyên nhân giống hệt bug bfcache đã vá 2026-09-08 cho `requireAuth()`/`requireBusiness()`
(xem `js/api.js` ở mục "Kết nối backend" ngay dưới): trình duyệt khôi phục trang từ bfcache
thay vì tải lại thật, JS không chạy lại nên DOM giữ nguyên trạng thái CŨ tại thời điểm rời
trang (lúc đó vẫn đang đăng nhập, vì logout mới chỉ xoá token RỒI mới điều hướng đi, DOM
của trang A chưa kịp tự vẽ lại trước khi rời). Vá bằng 1 listener `pageshow` RIÊNG ngay
trong `agriverse-3d.html` (trang này không nạp `js/auth.js`, không dùng chung listener
toàn cục của `js/api.js` — 2 cơ chế độc lập, cùng mẫu `event.persisted === true`): gọi lại
`renderAccountArea()` để vẽ lại đúng theo trạng thái đăng nhập THẬT, không cần tải lại cả
trang. Đây cũng chính là lý do `renderAccountArea()` phải LUÔN tự vẽ lại cả 2 nhánh thay vì
early-return — nếu không, gọi lại từ `pageshow` sẽ vô tác dụng ở đúng ca cần vá nhất.

**⚠️ Lỗ hổng UX đã vá (2026-09-12) — không có đường quay lại `index.html`**: trang này là
đích đến DUY NHẤT sau đăng nhập/đăng ký cho tài khoản `customer` (xem `redirectTarget()`
trong `js/auth.js`) nhưng trước đó KHÔNG có bất kỳ liên kết nào trỏ về `index.html` (trang
giới thiệu công ty — Tính Năng/Quy Trình/Lợi Ích/Liên Hệ). Khách đăng nhập từ 1 tab mới
(không xuất phát từ `index.html`) sẽ bị kẹt hoàn toàn: không có lịch sử trình duyệt để bấm
Back, không có link nào trên trang để tới được phần giới thiệu/liên hệ công ty. Đã vá bằng
1 link `<a href="index.html">` mới ("Về AgriChain", icon `fa-arrow-left-long`) đặt CẠNH khối
logo "AgriVerse" (bọc chung 1 flex container mới, ngăn cách bằng `border-l`) — **KHÔNG** đổi
`onclick` cuộn-lên-đầu-trang sẵn có của chính logo (giữ nguyên hành vi cũ, tránh vừa cuộn vừa
điều hướng cùng lúc trên cùng 1 phần tử). Icon LUÔN hiện kể cả màn hình nhỏ nhất, chữ "Về
AgriChain" chỉ hiện từ `sm:` — cùng mẫu `hidden sm:inline` đã dùng cho nút "Trợ Lý AI Tiến
Phát" trong file này, đảm bảo khách trên di động cũng bấm được, không riêng desktop. Link
này hiện với **MỌI người dùng, bất kể đã đăng nhập hay `account_type` nào** — khác nút "Khu
Quản Lý" trong `#account-area` (chỉ hiện cho `business`), đây là điều hướng chung về trang
chủ công ty, không phải chức năng theo vai trò, nên đặt CỐ ĐỊNH trong HTML (không qua
`renderAccountArea()`).

### Khu vực tài khoản ở `.site-header__actions` (2026-09-12)

Cùng vấn đề đã vá cho `agriverse-3d.html` ở trên, nhưng lộ ra ở NHÓM trang khác: mọi trang
công khai dùng chung `.site-header` (`index.html`, `blog.html`, `blog-chi-tiet.html`,
`styleguide.html`, `truy-xuat.html`) đều nạp sẵn `js/api-config.js`/`js/api.js` từ trước
(không phải vá thêm như `agriverse-3d.html`), nhưng chưa trang nào ĐỌC trạng thái đó để đổi
`.site-header__actions` — luôn tĩnh 2 nút "Đăng Nhập"/"Bắt Đầu Ngay" dù khách đã đăng nhập.
Vá trong `js/header.js` (`renderHeaderAccountArea()`) — dùng chung 1 chỗ cho cả 5 trang thay
vì vá riêng từng trang, vì cả 5 đều nạp `js/header.js` và có cùng hệt markup
`.site-header__actions`. **Làm theo đúng hệ `.site-header`/`.btn` của trang giới thiệu —
không copy cách Tailwind + avatar dropdown của `agriverse-3d.html`.**

Khác `agriverse-3d.html` (giữ nguyên 2 nút khi chưa đăng nhập + thêm avatar/dropdown khi đã
đăng nhập), `.site-header__actions` ở đây đơn giản hơn: **thay hẳn 2 nút cũ bằng 1 nút duy
nhất** trỏ theo `account_type` (`AgriChain.api.isBusiness()`) — `business` → `nong-trai.html`
("Vào Trang Quản Lý"), `customer` → `agriverse-3d.html` ("Vào Mua Sắm", KHÔNG phải
`ecommerce.html` — xem mục "Trang thương mại điện tử chính thức") — kèm 1 nút "Đăng Xuất"
nhỏ cạnh đó (`AgriChain.api.auth.logout()` rồi `location.reload()`, không điều hướng đi đâu
— đăng xuất ở trang công khai không bắt buộc phải rời trang).

`headerActionsDefaultHtml` chụp lại đúng HTML gốc (2 nút "Đăng Nhập"/"Bắt Đầu Ngay") của
`.site-header__actions` ngay LẦN GỌI ĐẦU của `renderHeaderAccountArea()`, dùng để khôi phục
lại y nguyên khi chưa/không còn đăng nhập — khỏi phải chép tay markup 2 nút đó thành chuỗi
JS (HTML trong trang vẫn là nguồn duy nhất cho trạng thái "chưa đăng nhập"). Nhãn nút
("Vào Trang Quản Lý"/"Vào Mua Sắm") là chuỗi tĩnh, không có dữ liệu người dùng, nên ghép
thẳng vào `innerHTML` an toàn — khác `fullName`/`email` ở `agriverse-3d.html`, không cần
tách qua `textContent`.

Cùng mẫu bfcache đã vá ở `agriverse-3d.html`/`js/api.js`: `js/header.js` có 1 listener
`pageshow` RIÊNG (file này không nạp `js/auth.js`/`js/app-shell.js` ở các trang công khai
này, không dùng chung listener toàn cục nào khác), gọi lại `renderHeaderAccountArea()` khi
`event.persisted === true` để tránh hiện lại nút cũ sau khi đăng xuất rồi bấm Back.

Đã rà `.site-footer__links` ở cả `index.html`/`blog.html`/`blog-chi-tiet.html` — KHÔNG có
nút "Bắt Đầu Ngay"/liên kết đăng nhập nào tương tự trong footer (chỉ có anchor nội bộ,
"E-commerce", "Blog", thông tin liên hệ), nên không cần đồng bộ gì thêm ở đó. `styleguide.html`
và `truy-xuat.html` không có `<footer>` (`truy-xuat.html` chỉ có `.site-header`, xem cấu trúc
thư mục) nên không có gì để rà ở 2 trang này.

## Kết nối backend

Dự án bắt đầu chuyển dần từ `store.js` (localStorage giả lập) sang backend thật (FastAPI,
repo riêng `agrichain-api`, mặc định chạy ở `http://127.0.0.1:8000`, tài liệu Swagger tại
`/docs`). Hai lớp cùng tồn tại song song trong giai đoạn chuyển tiếp — **không phải mọi
trang đều dùng backend thật ngay**:

- **Đã chuyển sang API**: `dang-nhap.html` (chỉ đăng nhập), `dang-ky.html` (đăng ký,
  2026-09-11 — cả 2 luồng `customer`/`business`, xem mục "Đăng nhập/Đăng ký" phía trên),
  `tai-khoan.html` (toàn bộ), `nong-trai.html` (farms), `vat-tu.html` (supplies),
  `nong-trai-chi-tiet.html` (toàn bộ — farms + seasons + logs + certifications + batches,
  `batches` xong 2026-09-12, xem mục riêng bên dưới), `mau-quy-trinh.html` (toàn bộ — mẫu
  quy trình qua `api.workflowTemplates.*`, dropdown chọn vật tư trong bước mẫu qua
  `api.supplies.*` từ trước), `ho-so.html` (toàn bộ), `lo-hang.html` (toàn bộ, 2026-09-12
  — danh sách lô hàng qua `api.batches.list()`, xem mục riêng bên dưới).
- **Vẫn dùng `store.js`**: mọi trang còn lại. **Giai đoạn 3 ĐÃ HOÀN TẤT** (2026-09-12) —
  `batches` (lô hàng) là collection CUỐI CÙNG chuyển sang API, không còn domain nghiệp vụ
  nào ở `store.js` nữa (chỉ còn các collection thương mại điện tử `shops`/`products`/
  `orders`/`shippingAddresses`/`inventoryImports` và hồ sơ `users` của `ho-so.html`/CHÍNH
  tài khoản — xem mục riêng, chưa nằm trong phạm vi "Hoạt động sản xuất"). Collection
  `workflowTemplates` trong `store.js` giờ **MỒ CÔI** (không còn trang nào đọc/ghi) kể từ
  khi `mau-quy-trinh.html` chuyển sang API — cùng tình trạng với `orgUsers` (xem mục "Đăng
  nhập/Đăng ký"), chưa xoá khỏi `COLLECTIONS` vì ngoài phạm vi lần chuyển đổi này. Mẫu quy
  trình đã tạo trước lúc migrate (lưu trong `localStorage`, id dạng `store.newId()` không
  phải UUID) sẽ KHÔNG tự chuyển lên backend — biến mất khỏi danh sách sau khi migrate,
  người dùng tự tạo lại qua giao diện mới nếu cần.
- **`truy-xuat.html`/`js/truy-xuat.js`** (trang truy xuất công khai, quét mã QR, không đăng
  nhập) **ĐÃ CHUYỂN tra cứu lô hàng sang API** (2026-09-12, vá lỗi: trước đó đọc
  `store.list('batches')`, chỉ ai dùng ĐÚNG trình duyệt đã tạo ra lô hàng mới xem được, khách
  quét QR bằng máy khác luôn ra "không tìm thấy" dù dữ liệu đã có trong database). Tra
  farm/season qua `api.farms.get()`/`api.seasons.get()` — backend mở riêng 2 route này thành
  **public-read** (`GET /farms/{id}`, `GET /seasons/{id}`, không cần Bearer token), xem
  `getFarmSafe()`/`getSeasonSafe()` trong `js/truy-xuat.js`. Riêng lô hàng: `GET /batches`
  (danh sách, có `q=<mã>`) **yêu cầu đăng nhập** — khác farms/seasons, KHÔNG dùng được ở
  trang công khai này, nên mẫu `loadFarmByCode()` (gọi `q=` rồi tự so khớp client, xem
  `js/nong-trai-chi-tiet.js`) không áp dụng được cho batches. Backend vì vậy có thêm 1 route
  public-read riêng — **`GET /batches/by-code/{code}`** (tra CHÍNH XÁC theo mã, không phân
  biệt hoa/thường, bỏ qua lọc theo Đơn vị — cùng ngoại lệ công khai với `GET /batches/{id}`,
  xem `app/routers/batches.py::get_batch_by_code` phía `agrichain-api`) — gọi qua
  `api.batches.getByCode()` (`js/api.js`) — trang này chỉ dùng 2 hàm ĐỌC (`get`/`getByCode`,
  cả 2 đều `{ auth: false }`) trong số 6 hàm CRUD đầy đủ của `api.batches.*`, vì đây là trang
  công khai không có phiên đăng nhập để gửi kèm cho `create`/`update`/`remove`/`list`.
  Danh sách chứng nhận trên trang này vẫn đọc `store.js` — không phải vì `certifications`
  chưa có ở backend (đã có, xem `nong-trai-chi-tiet.html`), mà vì endpoint đó vẫn yêu cầu
  đăng nhập và trang công khai này không có phiên nào để gửi kèm — NGOÀI PHẠM VI lần sửa
  batches này. Khối "Xác thực blockchain" trên trang cũng đã **TẠM ẨN** (`hidden` trong
  HTML): response `BatchOut` thật của backend KHÔNG có field `sealed`/`hash`/`blockIndex`/
  `sealedAt` (mô phỏng client-side cũ của `js/chain.js`), chỉ có `verification_status` (luôn
  `'pending'` — anchoring blockchain thật chưa code)/`tx_hash`/`anchored_at` — xem
  `agrichain-api/CLAUDE.md` mục "Giai đoạn 3".
- **`ho-so.html`/`js/ho-so.js` ĐÃ CHUYỂN SANG API** (2026-09-12) — **vá 1 bug thật nghiêm
  trọng**: trang từng đọc `store.getSession()` (phiên `localStorage` GIẢ LẬP, tồn tại độc lập
  với phiên đăng nhập API thật kể từ khi `dang-nhap.html` chuyển hẳn sang API) nên có thể hiện
  đúng dữ liệu rác cũ còn sót trong `localStorage` của MỘT NGƯỜI KHÁC — không phải người đang
  đăng nhập — dù sidebar/topbar (đã dùng API từ trước) vẫn hiện đúng tên thật; bất kỳ ai bấm
  vào "Hồ sơ" đều có thể thấy thông tin cá nhân của người khác. Giờ đọc `AgriChain.api.getUser()`
  (đã có sẵn trong storage, không gọi lại API) làm dữ liệu ban đầu.
  - **Lưu họ tên/SĐT qua `api.auth.updateMe()` (`PATCH /auth/me`, endpoint MỚI thêm ở
    `agrichain-api`)** — KHÔNG dùng `PATCH /users/{id}` (`api.users.update()`): route đó yêu
    cầu quyền `users.edit`, mà theo seed mặc định vai trò `manager` chỉ có `users.view`,
    `farmer` không có gì cả — dùng nhầm sẽ khiến phần lớn nhân viên không phải `admin` nhận
    403 ngay khi tự lưu hồ sơ MÌNH. Xem `agrichain-api/CLAUDE.md` mục "Tự sửa hồ sơ —
    PATCH /auth/me" để biết đầy đủ lý do + cách route mới chặn tự nâng quyền.
  - **Đổi mật khẩu qua `api.auth.changePassword()` (`POST /auth/change-password`, đã có sẵn
    từ trước, KHÔNG phải endpoint mới)** — khác `POST /users/{id}/reset-password` (dành cho
    admin đặt lại mật khẩu NGƯỜI KHÁC, không cần mật khẩu cũ). Form "Bảo mật" thêm ô "Mật khẩu
    hiện tại" (`profile-current-password`) — trước đó KHÔNG có, vì `store.changePassword()` cũ
    không đòi mật khẩu cũ; `ChangePasswordRequest` thật thì bắt buộc `old_password`.
  - `api.auth.changePassword()` (`js/api.js`) giờ tự `saveSession()` ngay với `TokenPair` trả
    về — backend thu hồi HẾT refresh token cũ khi đổi mật khẩu, không lưu lại cặp token mới
    thì lần làm mới token tiếp theo của phiên hiện tại sẽ thất bại, tự đăng xuất oan ngay sau
    khi vừa đổi mật khẩu thành công.
  - `api.auth.updateMe()` sau khi lưu thành công tự cập nhật lại `agrichain.user` (giữ nguyên
    mảng `permissions` cũ — route này không đổi được vai trò nên permissions chắc chắn không
    đổi) — để sidebar/topbar hiện tên mới NGAY, không cần đăng nhập lại, cùng bài học đã rút ra
    ở transfer-admin (`tai-khoan.html`).
  - **3 field `dob`/`gender`/`bio`** (Ngày sinh/Giới tính/Giới thiệu) đã **BỎ HẲN** khỏi cả
    `ho-so.html` lẫn `js/ho-so.js` — `UserOut`/`MeUpdate` thật của backend không có 3 field
    này, chỉ có `full_name`/`phone`; đây từng là field CHỈ tồn tại ở `store.js`, không tự bịa
    ra chỗ lưu nào khác. Vai trò hiển thị (`data-profile-role`) đọc thẳng `user.role_name`
    (VD "Quản trị viên", "Nông dân") từ `UserOut` thật — không cần bảng tra tên riêng như hồi
    còn `store.js` (chỉ có đúng 2 giá trị `'org'`/`'customer'` cố định).
- **`batches` (lô hàng) CRUD ĐÃ CHUYỂN SANG API** (2026-09-12, hoàn tất giai đoạn 3) —
  `nong-trai-chi-tiet.js` (tạo/sửa/xoá lô hàng trong tab "Lô hàng" của modal xem mùa vụ,
  cơ chế liên kết batch với bước quy trình `completeWorkflowStep()`/`linkBatchToStep()`)
  và `lo-hang.js` (danh sách + lọc `farm_id`/`season_id`) đều dùng chung `api.batches.*`
  (`list`/`get`/`getByCode`/`create`/`update`/`remove`, khuôn CRUD chuẩn giống
  farms/seasons). Field gửi lên đổi tên sang snake_case khớp `BatchCreate`/`BatchUpdate`
  thật (`startDate` -> `start_date`, `harvestDate` -> `harvest_date`,
  `actualHarvestDate` -> `actual_harvest_date`, `expectedYield` -> `expected_yield`);
  response giữ nguyên snake_case, đọc thẳng. **KHÔNG gửi `farm_id` lúc tạo** — backend tự
  điền từ `season_id` (`BatchCreate` không có field này, xem `create_batch()` phía
  `agrichain-api`).
  - `lo-hang.js` đọc THẲNG `farm_code`/`farm_name`/`season_code`/`season_name` có sẵn
    trong `BatchOut` (join sống ở backend) để dựng link sửa/xoá — không còn tự gọi
    `api.farms.get()`/`api.seasons.get()` + cache riêng cho từng lô hàng như hồi còn
    `store.js`. Nhánh "lô hàng mồ côi" (nông trại/mùa vụ đã bị xoá) cũng bỏ theo — backend
    chặn xoá 1 mùa vụ còn lô hàng sống (`batch_repo.count_by_season()`), nên tình huống đó
    không còn xảy ra được qua API thật.
  - **Khối "Xác thực blockchain" (nút niêm phong, hiển thị hash/khối, khoá sửa/xoá khi đã
    niêm phong) đã BỎ HẲN khỏi CẢ HAI trang** — cùng quyết định đã áp dụng cho
    `truy-xuat.html`: `BatchOut` thật KHÔNG có `sealed`/`hash`/`blockIndex`/`sealedAt` (mô
    phỏng client-side cũ của `js/chain.js`/`store.sealBatch()`), chỉ có
    `verification_status`/`tx_hash`/`anchored_at` (luôn `'pending'`/`null` — anchoring thật
    CHƯA code). Hiện `verification_status` ra sẽ làm sai lệch những lô đã "niêm phong" bằng
    cơ chế mô phỏng cũ (mọi lô đều hiện "chưa xác thực" như nhau, kể cả lô cũ từng bấm nút
    niêm phong) — ẩn hẳn trung thực hơn. Sửa/xoá vì vậy LUÔN dùng được, không còn khái niệm
    "đã niêm phong thì khoá sửa/xoá". Sẽ hiện lại khi backend có anchoring thật, xem
    `agrichain-api/CLAUDE.md` mục "Giai đoạn 3".
  - `js/nong-trai-chi-tiet.js`/`js/lo-hang.js` không còn gọi `js/store.js`/`js/chain.js` ở
    đâu nữa — 2 thẻ `<script>` đó vẫn còn nạp ở cả 2 trang (cùng cách xử lý mọi trang khác
    trong dự án đã hết phụ thuộc, để lại cho một đợt dọn dẹp sau, ngoài phạm vi lần sửa này).
  - Ma trận phân quyền `tai-khoan.html` thêm hàng "Lô hàng" (`batches.*`) vào
    `PREFIX_ORDER`/`PREFIX_LABELS`/`PREFIX_ICONS` — đủ **9 hàng x 4 cột = 36 mã quyền**,
    hoàn tất việc bị hoãn lại từ B4 (xem mục "Trang `tai-khoan.html`" bên dưới).
  - **Vá hồi quy (2026-09-12, cùng ngày)**: `js/thuong-mai-san-pham.js` (dropdown "gắn lô
    hàng thật vào biến thể sản phẩm") từng đọc `store.list('batches')`, rỗng trơn với mọi lô
    hàng tạo sau lần migrate CRUD ở trên — đã đổi sang `api.batches.list()`, xem mục
    "Thương mại điện tử — sản phẩm" bên dưới để biết đầy đủ (kèm lưu ý về quyền
    `batches.view` mà vai trò `manager`/`farmer` CHƯA có).

### `js/api-config.js`

Chỉ khai báo `AgriChain.API_BASE_URL`. Tách riêng khỏi `js/api.js` để khi deploy chỉ cần
sửa đúng 1 dòng (đổi domain), không đụng tới logic gọi API. Nạp ở **mọi trang HTML**, kể
cả trang chưa dùng API — để lần chuyển tiếp theo không phải thêm lại thẻ `<script>` vào
từng file.

### `js/api.js`

Nạp SAU `api-config.js`, ở mọi trang, **không `defer`** (một số trang cần gọi
`AgriChain.api.requireAuth()` ngay trong `<head>` để chặn hiển thị trước khi kịp chuyển
hướng — script `defer` chạy quá trễ cho việc đó).

- **Lưu phiên**: `agrichain.access_token`, `agrichain.refresh_token`, `agrichain.user`
  (JSON, gồm cả mảng quyền trả về từ `/auth/me`) — lưu ở `localStorage` **hoặc**
  `sessionStorage` tuỳ checkbox "Ghi nhớ đăng nhập" ở `dang-nhap.html` lúc đăng nhập, xem
  mục "Checkbox 'Ghi nhớ đăng nhập'" ngay dưới đây.
- **`AgriChain.api.isLoggedIn()`** — có access token hay không.
  **`AgriChain.api.hasPermission(code)`** — dò trong mảng quyền đã lưu của user, dùng để
  ẩn/hiện nút trên giao diện (đánh dấu bằng `data-requires-permission="<mã quyền>"` trên
  phần tử, xem cách dùng ở `tai-khoan.html`/`js/tai-khoan.js`).
- **`AgriChain.api.requireAuth()`** — gọi ở đầu `<head>` bằng script thường (không defer)
  cho các trang cần đăng nhập; chưa có token thì chuyển hướng ngay sang
  `dang-nhap.html?redirect=<trang hiện tại>`.
- **Checkbox "Ghi nhớ đăng nhập" (`dang-nhap.html`) giờ có tác dụng THẬT (2026-09-08)** —
  trước đó chỉ là UI, API chưa dùng tới. `js/auth.js` đọc `form.querySelector('[name=
  "remember"]').checked` lúc submit, truyền vào `api.auth.login(email, password, remember)`.
  Trong `js/api.js`: cờ `agrichain.storage_mode` (`'local'`/`'session'`, LUÔN nằm ở
  `localStorage` — phải đọc được ngay lúc tải trang, trước khi biết nên tìm token ở đâu, nên
  không thể tự đặt vào `sessionStorage`) quyết định `activeStorage()` trả về `localStorage`
  hay `sessionStorage`; toàn bộ hàm đọc/ghi/xoá token (`getAccessToken`/`saveSession`/
  `clearSession`...) đều đi qua `activeStorage()`, không gọi thẳng `localStorage.*` nữa.
  `login()` gọi `clearBothStorages()` rồi mới `setStorageMode(remember ? 'local' : 'session')`
  — dọn sạch token cũ ở storage không active trước khi đổi chế độ, tránh sót phiên cũ.
  **Đây là giải pháp GIẢM NHẸ, không phải giải quyết dứt điểm**: `sessionStorage` tự mất khi
  đóng hẳn trình duyệt (đúng ý nghĩa "không ghi nhớ"), nhưng cả 2 kiểu Web Storage vẫn đọc
  được bởi bất kỳ JS nào chạy trên trang (kể cả từ thư viện ngoài bị lỗi) — **không an toàn
  trước XSS như cookie `httpOnly`**. Nợ kỹ thuật "chuyển sang cookie `httpOnly` + `Secure` +
  `SameSite` trước khi lên production" (xem mục "Nợ kỹ thuật đã biết" cuối file) vẫn còn
  nguyên, checkbox này không thay thế được việc đó.
- **⚠️ Bug bảo mật đã vá — bfcache sau khi đăng xuất (2026-09-08):** đăng xuất xong bấm
  nút Back của trình duyệt từng hiện lại trang cần đăng nhập (VD `nong-trai.html`) kèm dữ
  liệu cũ, dù access token đã bị xoá. Nguyên nhân: trình duyệt khôi phục trang từ **bfcache**
  (back-forward cache) thay vì tải lại thật, nên `requireAuth()` ở `<head>` — chỉ chạy đúng
  1 lần lúc tải trang ban đầu — không có cơ hội chạy lại để phát hiện phiên đã mất. Đã vá
  bằng listener `pageshow` đăng ký **ở phạm vi toàn cục** (chạy trên MỌI trang có nạp
  `api.js`, kể cả trang công khai): khi `event.persisted === true` (trang được khôi phục từ
  bfcache) VÀ trang hiện tại có gọi `requireAuth()` (cờ nội bộ `pageRequiresAuth`, chỉ được
  bật lên khi `requireAuth()` chạy — nhờ vậy KHÔNG áp nhầm logic này vào trang công khai như
  `index.html`/`truy-xuat.html`) VÀ không còn access token hợp lệ → chuyển hướng ngay sang
  `dang-nhap.html?redirect=...`, y hệt logic `requireAuth()`. Nếu sau này thêm cơ chế kiểm
  tra phiên đăng nhập nào khác ngoài `requireAuth()`, nhớ áp dụng lại đúng mẫu "kiểm tra lại
  trên `pageshow` khi `persisted`" này — bfcache là hành vi trình duyệt, không riêng gì
  `requireAuth()`.
- **Lỗi**: mọi lỗi ném ra là `AgriChain.api.ApiError` — luôn có `.status` (mã HTTP, `0` =
  lỗi mạng), `.code` (`VALIDATION_ERROR`/`UNAUTHORIZED`/`FORBIDDEN`/`NOT_FOUND`/`CONFLICT`/
  `INTERNAL_ERROR`/`NETWORK_ERROR`), `.message` (tiếng Việt, hiển thị thẳng được),
  `.details` (VD `{ field: 'email' }`, dùng để gắn lỗi đúng ô trên form). Response không
  đúng khuôn `{ error: {...} }` (lỗi 500 trần, HTML báo lỗi của proxy...) → tự dùng thông
  báo mặc định theo mã HTTP thay vì hiện chuỗi rác. **`NETWORK_ERROR`** (fetch ném lỗi,
  backend chưa chạy) tách riêng khỏi lỗi 500 — đây là ca gặp thường xuyên nhất lúc phát
  triển (quên bật `agrichain-api`).
- **Tự làm mới token khi gặp 401**: giữ 1 `refreshPromise` dùng chung ở phạm vi module —
  nhiều request cùng 401 thì tất cả chờ chung 1 lần gọi `/auth/refresh`, không gọi song
  song (backend xoay vòng refresh token, gọi song song sẽ khiến token bị thu hồi và đăng
  xuất oan). Refresh xong thì request gốc tự chạy lại **đúng 1 lần** (`retry: false`) rồi
  thôi — không lặp vô hạn nếu vẫn tiếp tục 401. Refresh thất bại → xoá phiên + chuyển
  hướng `dang-nhap.html?redirect=...`. `/auth/login` và `/auth/refresh` luôn gọi với
  `auth: false, retry: false`.
- **`api.auth.login()`** gọi `/auth/login` xong gọi LUÔN `/auth/me` để lấy bản user đầy đủ
  nhất kèm mảng quyền (đề phòng response `/auth/login` không kèm sẵn quyền), rồi mới lưu
  vào `agrichain.user`.
- Các hàm nghiệp vụ (`api.users.*`, `api.roles.*`, `api.permissions.*`) chỉ bọc mỏng
  quanh `request()`, không tự suy luận gì thêm — validate/điều hướng dữ liệu là việc của
  từng trang, đúng quy ước "store.js/api.js chỉ generic" đã áp dụng cho `store.js`.

### `js/app-shell.js` đã bỏ hẳn nhánh dự phòng `store.js` (2026-09-12)

`requireSession()`/`setupLogout()` (dùng chung cho mọi trang có khung app-shell — sidebar/
topbar) từng có nhánh dự phòng đọc `store.getSession()`/`store.clearSession()` khi chưa có
phiên API — gọi là "cầu nối TẠM cho tới khi mọi trang cùng chuyển sang API". Điều kiện đó
giờ ĐÃ ĐỦ: `dang-nhap.html`/`dang-ky.html` đăng nhập/đăng ký HOÀN TOÀN qua `js/api.js` (không
còn trang nào ghi phiên vào `store.js` nữa), và cả 16/16 trang `ADMIN_SHELL_PAGES` đều đã gọi
`AgriChain.api.requireAuth()` ngay trong `<head>` (xem mục "`AgriChain.api.requireBusiness()`
— áp dụng cho ĐỦ 16 trang" phía trên) — nhánh `store` trong `requireSession()`/`setupLogout()`
vì vậy không còn đường nào để chạy tới nữa, đã gỡ hẳn. `requireSession()` giờ chỉ còn: đọc
`apiUser` để trả về cho `fillSession()` (tên/tổ chức hiển thị ở sidebar/avatar), và 1 lệnh
`location.replace('dang-nhap.html?redirect=...')` giữ lại làm lớp phòng hờ (không phải cơ chế
chặn chính — `requireAuth()` ở `<head>` đã làm việc đó trước khi hàm này kịp chạy).
`setupLogout()` giờ luôn gọi thẳng `api.auth.logout()`, không còn nhánh `else` gọi
`store.clearSession()`. `js/app-shell.js` không còn phụ thuộc `js/store.js` (biến `store` đã
gỡ khỏi file) — `js/store.js` vẫn được nạp ở cả 16 trang vì các collection thương mại điện
tử (`shops`, `products`, `orders`, `shippingAddresses`, `inventoryImports`) vẫn cần nó (xem
7 trang `thuong-mai-*`), chỉ riêng phần phiên đăng nhập của khung app-shell là không dùng
tới nữa — `batches` KHÔNG còn nằm trong nhóm lý do này nữa (đã chuyển hẳn sang API,
2026-09-12, xem mục "Kết nối backend").

### Chuyển hướng sau khi đăng nhập (`redirectTarget()` trong `js/auth.js`)

Trang đích mặc định sau khi đăng nhập thành công (hoặc khi mở `dang-nhap.html` lúc đã có
sẵn phiên) là **`nong-trai.html`** — trang đầu tiên của khu quản trị, KHÔNG phải
`index.html` (đó là trang giới thiệu công khai, không thuộc app-shell nên không hợp lý làm
đích đến sau đăng nhập). Nếu URL có tham số `?redirect=`, ưu tiên dùng giá trị đó thay cho
mặc định — nhưng chỉ chấp nhận khi khớp `/^[A-Za-z][\w.-]*\.html(\?.*)?$/` (bắt đầu bằng
chữ cái, kết thúc `.html`, không chứa `/`): giá trị dạng `http://`, `https://` hay `//...`
sẽ không khớp regex này (vì chứa `:`/`/`) nên bị bỏ qua, dùng mặc định thay thế — chặn lỗ
hổng open redirect qua tham số này.

### Trang `tai-khoan.html` — phân quyền theo VAI TRÒ, không còn theo từng người dùng

Khác hẳn model cũ (`orgUsers`, mỗi người dùng có ma trận quyền RIÊNG lưu ngay trên bản ghi
của họ): backend dùng RBAC — quyền gắn vào **vai trò** (`role`), người dùng chỉ giữ
`role_id`. Bấm icon "Phân quyền" ở 1 người dùng thực chất mở ra **quyền của vai trò người
đó đang giữ** — lưu lại sẽ ảnh hưởng tới MỌI người dùng khác cùng vai trò, không chỉ riêng
người vừa bấm. Modal có ghi chú rõ điều này ngay trong giao diện
(`[data-permission-role-notice]`) để tránh gây bất ngờ cho người quản trị.

Trang có đủ luồng CRUD: **Thêm** (modal `user-modal`, `POST /users`, bắt buộc chọn vai trò
qua `<select>` nạp từ `GET /roles` — `UserCreate` của backend yêu cầu `role_id`), **Sửa**
(modal riêng `edit-user-modal`, `PATCH /users/{id}` — sửa họ tên/SĐT/vai trò/trạng thái hoạt
động, KHÔNG có email/mật khẩu vì `UserUpdate` không nhận 2 field này), **Đặt lại mật khẩu**
(modal riêng `reset-password-modal`, `POST /users/{id}/reset-password` — quản trị viên đặt
thẳng mật khẩu mới, không cần biết mật khẩu cũ), **Vô hiệu hoá** (`DELETE /users/{id}`, xoá
mềm). Cột "Vai trò" trong bảng đọc thẳng `user.role_name` có sẵn trên `UserOut`, không cần
gọi thêm `GET /roles` chỉ để hiển thị tên vai trò.

**Khuôn dữ liệu `role`/`permission` đã được XÁC NHẬN THẬT** (gọi trực tiếp `/openapi.json`
và dữ liệu thật của `GET /permissions`, `GET /roles` trên backend đang chạy — không còn là
giả định):
- **Permission KHÔNG có `id` số** — chỉ có `code` (chuỗi, VD `"farms.view"`), `name`
  (chuỗi hiển thị, VD `"Xem nông trại"`), `group_name`. Toàn bộ thao tác chọn/lưu quyền
  trong `js/tai-khoan.js` làm việc trực tiếp trên `code`, không có khái niệm id quyền.
- Đúng **36 mã quyền**, dạng `"<nhóm số nhiều>.<hành động>"` — 4 hành động
  `add`/`edit`/`view`/`delete` x 9 nhóm nghiệp vụ `batches`/`certifications`/`farms`/`logs`/
  `roles`/`seasons`/`supplies`/`users`/`workflow_templates`. Danh sách đầy đủ:
  ```
  batches.add / batches.delete / batches.edit / batches.view
  certifications.add / certifications.delete / certifications.edit / certifications.view
  farms.add / farms.delete / farms.edit / farms.view
  logs.add / logs.delete / logs.edit / logs.view
  roles.add / roles.delete / roles.edit / roles.view
  seasons.add / seasons.delete / seasons.edit / seasons.view
  supplies.add / supplies.delete / supplies.edit / supplies.view
  users.add / users.delete / users.edit / users.view
  workflow_templates.add / workflow_templates.delete / workflow_templates.edit / workflow_templates.view
  ```
  Nhóm `workflow_templates` xác nhận qua `GET /permissions` thật lúc chuyển
  `mau-quy-trinh.html` sang API (2026-09-08); nhóm `batches` (`group_name` "Lô hàng") có
  từ backend migration 005 nhưng chỉ thêm vào ma trận này khi `batches` CRUD chuyển sang
  API (2026-09-12, xem mục "Kết nối backend") — trước đó CỐ TÌNH chưa thêm vì chưa có
  trang nào thật sự cần gán quyền `batches.*` qua giao diện.
  **`js/tai-khoan.js` giờ hiện đúng 9 hàng** (`PREFIX_ORDER`, xem bên dưới), quyền
  `batches.*`/`workflow_templates.*` của 1 vai trò đều sửa được qua giao diện như các nhóm
  gốc. Quy ước đặt tên này áp dụng cho MỌI phân hệ sẽ chuyển sang API sau này — trang mới
  nào gọi `AgriChain.api.hasPermission(code)` thì dùng đúng mẫu `"<nhóm số nhiều>.<add|edit|
  view|delete>"` ngay từ đầu, không suy đoán số ít/số nhiều hay từ đồng nghĩa khác.
- `GET /permissions` trả về **đã nhóm sẵn** theo `group_name`, nhưng `roles.*` và `users.*`
  bị gộp chung vào 1 group_name duy nhất là `"Quản lý đơn vị"` (8 quyền/nhóm thay vì 4) —
  nếu ma trận phân quyền hiển thị thẳng theo `group_name` thì 1 ô (nhóm x hành động) sẽ chứa
  2 mã quyền (`roles.view` và `users.view` cùng rơi vào ô "Xem" của "Quản lý đơn vị"), phá
  vỡ giả định "1 checkbox = 1 mã quyền". `js/tai-khoan.js` vì vậy **bỏ qua `group_name`**,
  tự nhóm lại theo TIỀN TỐ mã quyền (phần trước dấu `.` đầu tiên — `PREFIX_ORDER`/
  `PREFIX_LABELS`/`PREFIX_ICONS`) để luôn ra đúng 9 hàng, mỗi hàng 1 mã quyền/hành động
  (Lô hàng, Nông trại, Chứng nhận, Mùa vụ, Vật tư, Nhật ký, Mẫu quy trình, Vai trò,
  Người dùng).
- `role.permissions` (cả trong `GET /roles` lẫn body gửi lên `PATCH /roles/{id}`) là **mảng
  chuỗi mã quyền thuần** (`["farms.view", "farms.add", ...]`), không phải mảng object/id.
- `PATCH /roles/{id}` nhận field **`permissions`** (không phải `permission_ids` như suy đoán
  ban đầu) — THAY THẾ TOÀN BỘ danh sách quyền hiện có. `handlePermissionSave()` vẫn phải tự
  GHÉP LẠI các mã quyền nằm ngoài lưới 9×4 đang hiển thị (nhóm lạ/hành động lạ mà backend
  thêm sau này) với các mã quyền vừa tick trong lưới trước khi gửi lên, tránh vô tình xoá
  mất quyền không hiển thị trên giao diện này — xem biến `managedCodes`.
- `UserCreate` yêu cầu `email`, `password`, `full_name`, `role_id` (bắt buộc), `phone` (tuỳ
  chọn). `UserUpdate` chỉ nhận `full_name`, `phone`, `role_id`, `is_active` — không có
  `email`/`password`, nên form Sửa là modal RIÊNG với form Thêm, không dùng chung.
- Field lỗi validate (`details.field`) trả về đúng tên field đã gửi lên (`email`/
  `full_name`/`password`/`role_id`/`phone`) để gắn lỗi vào đúng ô trên form — xem
  `fieldNodeFor()` (modal Thêm) và `editFieldNodeFor()` (modal Sửa).
- **`GET /auth/me` trả về `{ user, permissions }`** (object bọc ngoài), KHÔNG phải bản user
  phẳng — lỗi này từng khiến `js/api.js`'s `me()` lưu nhầm cả object bọc làm "user" (mọi
  field như `full_name`/`email`/`role_id` đọc ra `undefined` ở nơi dùng `getUser()`, kể cả
  tên hiển thị ở sidebar `app-shell.js`; `hasPermission()` vẫn chạy đúng do trùng tên field
  `permissions` ở cả 2 tầng — thuần trùng hợp, không phải vì code đúng). Đã sửa: `me()` giờ
  bóc `data.user`, gắn thêm `data.permissions` vào rồi mới lưu.

Nếu backend thật đổi khuôn dữ liệu ở lần cập nhật sau, sửa lại đúng chỗ tương ứng trong
`js/tai-khoan.js` (`PREFIX_ORDER`/`PREFIX_LABELS`/`PREFIX_ICONS`, `actionFromCode()`,
`groupPermissions()`, `handlePermissionSave()`) — không cần sửa `js/api.js` vì lớp đó chỉ
truyền dữ liệu thô, không diễn giải khuôn dạng permission/role.

#### Vai trò `is_system` — modal Phân quyền READ-ONLY, "Nhường quyền quản trị" (2026-09-11)

`RoleOut.is_system` (boolean, xác nhận đúng tên field qua `/openapi.json` thật — KHÔNG suy
đoán) đánh dấu vai trò hệ thống, hiện chỉ có **"Quản trị Đơn vị"** (tạo tự động lúc
`POST /auth/register/business`, xem mục "Đăng ký — 2 loại tài khoản" phía trên). Backend
chặn cứng ở tầng API: `PATCH /roles/{id}` sửa `permissions` của vai trò này → **409
CONFLICT** (`"Không thể sửa danh sách quyền của vai trò hệ thống."`) — xác nhận qua curl
thật. `loadPermissionMatrix()` (`js/tai-khoan.js`) đọc `currentRole.is_system`: nếu đúng,
khoá hết checkbox trong bảng (kể cả ô đã tick sẵn), ẩn nút Lưu, hiện ghi chú
`[data-permission-readonly-notice]` — thuần UX (không mời bấm vào thao tác chắc chắn thất
bại ở tầng API), không phải lớp bảo mật (lớp đó nằm ở backend).

**Nút "Nhường quyền quản trị"** (`[data-open-transfer-admin]` trong `.page-header`, ẩn mặc
định) chỉ hiện khi **vai trò của CHÍNH người đang đăng nhập** là `is_system=true` —
`UserOut` (từ `AgriChain.api.getUser()`) không có field `is_system`, nên
`refreshTransferAdminVisibility()` phải tự đối chiếu `role_id` của mình với danh sách
`GET /roles` mỗi lần tải trang. Modal `transfer-admin-modal` gồm: select người nhận (lọc
`is_active`, loại chính mình, tải qua `api.users.list({ is_active: true, page_size: 100 })`
— KHÔNG dùng phân trang 10/trang như bảng chính), select vai trò mới cho chính mình (tải
qua `GET /roles`, **loại bỏ vai trò `is_system`** — không có ý nghĩa "chuyển sang chính vai
trò mình sắp nhường"), và ô mật khẩu hiện tại để xác nhận danh tính. Submit gọi
`api.users.transferAdmin(targetId, { new_role_id_for_current_admin, password })` (đã có từ
B1) — khuôn lỗi xác nhận qua curl thật: sai mật khẩu → **401 UNAUTHORIZED** (không phải
403, vì đây là xác thực lại danh tính giống `old_password` của đổi mật khẩu, không phải
phân quyền); tự thao tác chính mình → 403 FORBIDDEN (không nên xảy ra ở luồng UI này vì đã
loại chính mình khỏi select người nhận, xử lý phòng hờ); vi phạm ràng buộc khác (VD mất
admin cuối cùng) → 409 CONFLICT, hiện qua toast bằng đúng `err.message` thật từ backend.

**⚠️ QUAN TRỌNG — vì sao KHÔNG chỉ gọi `api.auth.me()` sau khi nhường quyền thành công**:
đã xác nhận qua đọc code thật (`agrichain-api/app/dependencies.py`, docstring của
`CurrentUser.permissions`: *"lấy từ payload JWT chứ không truy vấn database — đổi quyền của
vai trò chỉ có hiệu lực với token cấp SAU đó"*) VÀ kiểm chứng bằng curl thật (gọi
`GET /auth/me` bằng token CŨ ngay sau `transfer-admin`: `role_name` tự cập nhật đúng — đọc
từ DB — nhưng mảng `permissions` VẪN CÒN `users.add` — đọc từ JWT cũ) — `/auth/me` một mình
tạo ra trạng thái **nửa vời, tự mâu thuẫn** (tên vai trò mới, quyền cũ), còn tệ hơn không
gọi gì. Cách đúng DUY NHẤT để có token mới phản ánh đúng vai trò mới là cấp lại token —
`handleTransferAdminSubmit()` vì vậy **tự đăng nhập lại ngầm** bằng chính email (từ
`api.getUser().email`) + mật khẩu vừa nhập trong form, qua `api.auth.login(email, password,
api.isRemembered())` (đã kiểm chứng qua curl: token mới có cả `role_name` LẪN `permissions`
đúng vai trò mới) — không dùng `remember=true` cứng mà đọc lại đúng chế độ hiện tại qua
`AgriChain.api.isRemembered()` (helper mới thêm trong `js/api.js`, đọc cờ
`agrichain.storage_mode`) để không vô tình đổi 1 phiên "không ghi nhớ" thành "ghi nhớ".
Đăng nhập lại xong `global.location.reload()` — tải lại toàn trang để MỌI thứ (sidebar,
`applyPermissionGates()`, nút "Nhường quyền quản trị") tự vẽ lại đúng theo phiên mới, thay
vì tự tay cập nhật từng phần DOM. Lỗi ở bước đăng nhập lại ngầm này (hiếm, VD mạng chập
chờn) được `.catch()` RIÊNG, không lẫn với lỗi của chính `transferAdmin()` — tránh hiện
nhầm "sai mật khẩu" cho 1 thao tác nhường quyền thực ra ĐÃ THÀNH CÔNG.

Backend cũng tự thu hồi refresh token của CẢ NGƯỜI GỌI lẫn người nhận ngay trong
`transfer_admin()` (`agrichain-api/app/routers/users.py`) — vì vậy nếu KHÔNG chủ động đăng
nhập lại, lần `/auth/refresh` tự động kế tiếp của `js/api.js` (khi access token cũ hết hạn,
tối đa 15 phút sau) sẽ thất bại và tự đá người dùng về `dang-nhap.html` một cách bất ngờ —
chủ động đăng nhập lại ngay tránh được trải nghiệm đó.

### Trang "Hoạt động sản xuất" — farms/seasons/logs/certifications/supplies

5 domain giai đoạn 2 (`farms`, `seasons`, `logs`, `certifications`, `supplies`) theo đúng
khuôn CRUD chuẩn (`GET` phân trang + tìm kiếm/lọc, `POST`, `GET /{id}`, `PATCH`, `DELETE` —
xoá mềm). `js/api.js` bọc thêm `api.farms.*`/`api.seasons.*`/`api.logs.*`/
`api.supplies.*`/`api.certifications.*`, cùng khuôn `list/get/create/update/remove` như
`api.users.*`/`api.roles.*` đã có.

- **Payload gửi lên đổi tên field sang snake_case khớp cột backend** (`startDate` ->
  `start_date`, `plannedArea` -> `planned_area`, `nationalPuc` -> `national_puc`...);
  **response trả về giữ nguyên snake_case, đọc thẳng** — không có lớp chuyển đổi 2 chiều
  nào trong `js/api.js`, việc đổi tên nằm ở đúng trang gọi API (`js/nong-trai.js`,
  `js/nong-trai-chi-tiet.js`, `js/vat-tu.js`).
- **`farms.polygon` là NOT NULL, tối thiểu 3 điểm** (`FarmCreate`/`FarmUpdate`: `minItems: 3`)
  — đã xác nhận qua `/openapi.json` thật, khớp đúng ràng buộc `js/nong-trai.js` đang áp từ
  trước (không nới lỏng thành tuỳ chọn dù có lúc cân nhắc — xem lịch sử quyết định trong
  `SCHEMA-EXPORT.md`).
- **Xoá farm/season bị CHẶN (409) nếu còn dữ liệu con** — farm còn mùa vụ chưa xoá, mùa vụ
  đã có nhật ký — `js/nong-trai.js`/`js/nong-trai-chi-tiet.js` hiện đúng message tiếng Việt
  từ backend qua toast, KHÔNG báo "xoá thành công" giả như hồi còn `store.js`.
- **`GET /farms`/`GET /seasons` không có endpoint "tìm theo `code`"**, chỉ có `q` (tìm kiếm
  tự do) — `nong-trai-chi-tiet.html?ma=<code>` (và `&season=<code>`) phải tự tải kèm lọc gần
  đúng rồi so khớp CHÍNH XÁC (không phân biệt hoa/thường) ở client, xem `loadFarmByCode()`/
  `maybeOpenSeasonFromQuery()`.
- **`GET /logs`/`GET /certifications` (danh sách) chỉ trả metadata tệp/ảnh** (`LogImageOut`:
  `name/mime/size`, không có `url`; `CertificationOut`: `file_name/file_mime/file_size`,
  không có `file_url`) — xem ảnh/tệp thật phải gọi thêm `api.logs.get(id)`/
  `api.certifications.get(id)` (bản `*DetailOut` mới có nội dung), và CHỈ gọi khi người
  dùng thật sự bấm xem/sửa, không tải trước cho toàn bộ danh sách.
- **`LogSupply` có 7 trường, không phải 6** — xác nhận qua Swagger thật trước khi code (yêu
  cầu của lần nối API này): `supply_id, code, name, unit, quantity, method, purpose`. `code`
  là BẮT BUỘC, đã cập nhật `SCHEMA-EXPORT.md` và `getMaterialRowsData()` trong
  `js/nong-trai-chi-tiet.js`.
- **⚠️ Bug backend đang chờ sửa — `WorkflowStep.status` vs `done`**: dự án đã đổi tên field
  tiến độ của 1 bước quy trình trong `seasons.workflow_steps[]` từ `status`
  (`'pending'`/`'completed'`) thành `done` (boolean) để tránh trùng tên với `seasons.status`
  (5 giá trị khác hẳn phạm vi). Backend hiện **VẪN CÒN dùng `status`** ở `WorkflowStep`
  Pydantic model — gửi `done` lên sẽ bị Pydantic âm thầm bỏ qua, bước sẽ không thực sự được
  đánh dấu hoàn thành phía server dù giao diện tưởng đã xong. `js/nong-trai-chi-tiet.js` vẫn
  code đúng theo `done` (quyết định giữ nguyên phía frontend, KHÔNG lùi về `status`) — phần
  hoàn thành bước quy trình (`completeWorkflowStep()`) vì vậy **chưa kiểm chứng được đầu-cuối
  cho tới khi backend sửa xong**. Có banner "Thử lại cập nhật trạng thái bước"
  (`[data-process-retry-notice]`) phòng trường hợp nhật ký tạo được nhưng PATCH mùa vụ lỗi —
  không để trạng thái nửa vời trong im lặng.
- **`batches` (lô hàng) CRUD ĐÃ CHUYỂN SANG API** (2026-09-12, hoàn tất giai đoạn 3) —
  `nong-trai-chi-tiet.js` (tạo/sửa/xoá) và `lo-hang.js` (danh sách + lọc) đều qua
  `api.batches.*`, xem mục "Kết nối backend" ở trên để biết đầy đủ chi tiết. Nút "Xác thực
  blockchain" đã BỎ HẲN (không viết lại theo `verification_status`/`tx_hash`/`anchored_at`
  thật) — quyết định ẩn hẳn thay vì hiện trạng thái luôn `'pending'`, cùng lý do đã áp dụng
  cho `truy-xuat.html`, xem `agrichain-api/CLAUDE.md` mục "Giai đoạn 3".
- **`workflowTemplates` (mẫu quy trình) ĐÃ CHUYỂN SANG API** (`mau-quy-trinh.html`, 2026-09-08)
  qua `api.workflowTemplates.*` — xem mục "Mẫu quy trình mùa vụ" bên dưới. Trên
  `nong-trai-chi-tiet.html`, khi áp dụng 1 mẫu cho mùa vụ, mẫu giờ đọc qua
  `api.workflowTemplates.list()` (`fillProcessTemplateSelect()`/`findLoadedWorkflowTemplate()`)
  — KẾT QUẢ snapshot (`workflow_template_id`/`_name`/`_steps`) vẫn gửi qua `PATCH /seasons/{id}`
  của API thật như trước, đây là điểm nối 2 hệ dữ liệu (mẫu ↔ mùa vụ), không phải lớp chuyển
  đổi thừa (xem `cloneTemplateSteps()`). `TemplateStep` (mẫu) và `WorkflowStep` (mùa vụ) đều
  snake_case và gần như trùng tên field — `cloneTemplateSteps()` giờ chỉ thêm 4 field trạng
  thái riêng của mùa vụ (`done`/`completed_at`/`log_id`/`batch_id`), không còn phải đổi tên
  field từ camelCase như hồi còn đọc `store.js`.
  Mẫu quy trình tạo TRƯỚC lúc migrate (lưu trong `localStorage`, id không phải UUID —
  `store.newId()`) sẽ KHÔNG tự động xuất hiện lại trên `mau-quy-trinh.html` sau khi migrate,
  cũng KHÔNG chọn được ở dropdown "Chọn mẫu quy trình áp dụng" này — người dùng tạo lại qua
  giao diện mới nếu cần.
- Dropdown chọn vật tư ở MỌI nơi trên `nong-trai-chi-tiet.html`/`mau-quy-trinh.html` (form
  nhật ký, form bước quy trình mẫu, form tuỳ biến bước quy trình mùa vụ) đọc qua
  `api.supplies.list()`, tải 1 lần lúc trang khởi động — không đọc `store.js` nữa, nếu không
  id vật tư chọn được sẽ không khớp bản ghi thật trong DB.

### Nợ kỹ thuật đã biết

**Lưu access/refresh token trong `localStorage`/`sessionStorage` không an toàn trước tấn
công XSS** (bất kỳ đoạn JS nào chạy được trên trang, kể cả từ thư viện ngoài bị lỗi, cũng
đọc được token — checkbox "Ghi nhớ đăng nhập" (2026-09-08, xem mục "Kết nối backend") chỉ
đổi TUỔI THỌ của token (sống sót qua đóng/mở trình duyệt hay không), không đổi việc nó vẫn
là Web Storage đọc được bởi mọi JS, KHÔNG giải quyết được lỗ hổng XSS này). Đây là đánh đổi
CHỦ ĐỘNG cho giai đoạn phát triển (đơn giản, không cần cấu hình CORS/cookie phức tạp) —
**bắt buộc phải chuyển sang cookie `httpOnly` + `Secure` + `SameSite` (backend set cookie,
frontend không đụng tới token nữa) trước khi lên production.**

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

## Logo công ty (2026-09-12)

`.site-header__logo-mark`/`.site-footer__logo-mark` (`css/components.css`) và
`.app-topbar__brand-mark` (`css/app-shell.css`) trước đây là 1 `<span>` giả lập (nền
`--color-primary` hình vuông bo góc + chữ "A" trắng) — đã đổi hẳn sang `<img
src="icons/exabyte-icon-only-transparent.png">` (logo THẬT của công ty Exabyte, chỉ phần
biểu tượng kim cương xanh/cam, nền trong suốt, không có chữ "EXABYTE.VN"). Cả 3 class giờ
chỉ còn `width`/`height: var(--space-8)` + `object-fit: contain` (đã bỏ hẳn
`background`/`color`/`font-size`/`border-radius`/`display: inline-flex`+`align-items`+
`justify-content` — những khai báo đó chỉ có ý nghĩa khi phần tử là `<span>` chứa chữ căn
giữa, không cần cho `<img>`). Nhờ nền ảnh trong suốt, logo hiển thị đúng trên cả nền trắng
(`.site-header`) lẫn nền tối (`.site-footer`, `.app-topbar`) mà không cần khung nền riêng.
Chữ "AgriChain" đứng cạnh (`.site-header__logo-text`, hoặc `<span>` không class ở
`.site-footer__logo`/`.app-topbar__brand`) **giữ nguyên** — đây là đổi ICON nhận diện,
không đổi tên thương hiệu sản phẩm hiển thị.

Đã thay ở **24 vị trí** trên 21 file: 5 `.site-header__logo-mark` (`index.html`,
`blog.html`, `blog-chi-tiet.html`, `styleguide.html`, `truy-xuat.html`), 3
`.site-footer__logo-mark` (`index.html`, `blog.html`, `blog-chi-tiet.html`), và 16
`.app-topbar__brand-mark` (đủ 16 trang `ADMIN_SHELL_PAGES`, xem mục
"`AgriChain.api.requireBusiness()`").

**`dang-nhap.html`/`dang-ky.html` ĐÃ ĐỒNG BỘ THEO** (cùng ngày) — 2 trang này dùng
`.auth-brand__mark-box` (`css/auth.css`), khác hẳn cấu trúc "span chữ A" ở trên: đây là 1
`<span>` khung tròn bo góc (`--space-12`, nền `--overlay-white-subtle`) BỌC NGOÀI 1
`<svg class="icon icon--lg"><use href="icons/sprite.svg#icon-leaf">`. Icon lá này thuần
trang trí (không animation, không state động) nên đổi trực tiếp: giữ nguyên khung
`.auth-brand__mark-box`, chỉ đổi phần tử BÊN TRONG từ `<svg>` sang
`<img class="icon icon--lg" src="icons/exabyte-icon-only-transparent.png" alt="">` (tái
dùng đúng class `.icon`/`.icon--lg` có sẵn để giữ nguyên kích thước 32px — 2 class này chỉ
khai báo `width`/`height`/`flex-shrink`, không có gì riêng cho `<svg>` nên áp lên `<img>`
vẫn đúng). Thêm 1 rule mới `.auth-brand__mark-box img { object-fit: contain }` (scoped
riêng, không áp lên `.icon`/`.icon--lg` toàn cục) để logo không bị méo bên trong khung
tròn. `icon-leaf` vẫn còn dùng nguyên ở nơi khác (`nong-trai.html`, `vat-tu.html`,
`dang-ky.html` — dòng khác, `styleguide.html`) nên KHÔNG mồ côi khỏi `icons/sprite.svg`,
không cần dọn gì thêm ở sprite.

**Chỉ còn ngoại lệ DUY NHẤT**: logo "AgriVerse" ở `agriverse-3d.html` (khối gradient
xanh-cam + icon `fa-cube` của Font Awesome, dựng bằng Tailwind thuần, không dùng chung
class nào với các class logo AgriChain ở trên) — đây là nhận diện RIÊNG của sub-brand
AgriVerse, khác hệ thiết kế site-wide/app-shell/auth, cố tình để nguyên.

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
Form Liên Hệ mới validate + hiện thông báo phía client, chưa gửi đi đâu thật. Menu header/
footer mục "E-commerce" trỏ sang `agriverse-3d.html` (2026-09-08) — từ 2026-09-11,
`agriverse-3d.html` cũng là đích điều hướng DUY NHẤT cho tài khoản `customer` trong toàn
bộ luồng đăng nhập/đăng ký, khiến `ecommerce.html` giờ MỒ CÔI HOÀN TOÀN (không còn bất kỳ
`href`/redirect nào trỏ tới, kể cả sau đăng nhập) — trang cũ vẫn còn nguyên trên đĩa, chưa
bị xoá, xem mục "Trang thương mại điện tử chính thức" phía trên để biết chi tiết đầy đủ
(mục "E-commerce công khai" bên dưới mô tả tính năng của `ecommerce.html` như trước khi mồ
côi, vẫn đúng về mặt kỹ thuật của trang, chỉ không còn ai truy cập tới qua điều hướng
trong app nữa — xem mục "Hero — video giới thiệu" bên dưới cho phần Hero). Chưa có: tích
hợp AI thật.

Trang Blog (`blog.html` + `blog-chi-tiet.html`) đã có ở mức cơ bản: hero + danh sách 3 bài viết
+ trang chi tiết đọc nội dung đầy đủ (đoạn văn/tiêu đề phụ/danh sách), cả 2 trang cùng đọc từ
`data/blog-posts.json`. Chưa có: phân trang/tải thêm, tìm kiếm/lọc theo danh mục, bình luận,
backend quản lý nội dung thật (thêm/sửa/xoá bài viết), ảnh bìa thật (thư mục `images/blog/`
mới chỉ có `.gitkeep`).

Trang E-commerce công khai (`ecommerce.html`) đã có ở mức cơ bản: hero + dải tính năng + danh
mục nông sản + cửa hàng nổi bật + lưới sản phẩm nổi bật, đọc THẲNG collection `shops`/
`products` thật từ khu quản trị (không hard-code) — xem mục riêng bên dưới. Chưa có: trang chi
tiết 1 cửa hàng, trang chi tiết 1 sản phẩm, giỏ hàng/thanh toán thật (nút giỏ hàng/"Ghé thăm
cửa hàng"/"Xem chi tiết" tạm để `href="#"`), trang danh sách "Cửa hàng"/"Nhà nông" riêng
(menu header tạm để `href="#"`), hệ thống đánh giá sao thật (hiện luôn hiện tĩnh "5 (0)"),
chương trình khuyến mãi thật (tab "Khuyến mãi" luôn rỗng vì chưa có trường giảm giá trên
`products`), ảnh sản phẩm/cửa hàng thật nếu Đơn vị chưa từng tự tải lên qua khu quản trị.

Trang truy xuất nguồn gốc (`truy-xuat.html`) đã có ở mức cơ bản: xem 1 lô hàng qua mã QR
(hoặc `?ma=...` trực tiếp, tra thật qua API — xem mục "Kết nối backend"), thấy thông tin
nông trại/mùa vụ liên quan. Khối "Xác thực blockchain" đang TẠM ẨN (backend chưa có anchoring
thật, xem mục trên) — sẽ hiện lại khi có. Chưa có: liệt kê nhiều lô hàng, tìm kiếm theo mã
tự nhập tay trên trang.

## Hero — video giới thiệu (`index.html`)

Cột phải của Hero (`.hero__showcase`) **không còn hiện thẻ "Đã xác thực"** (badge + mã lô
`#AGC-2408-0193` + timeline gieo trồng/thu hoạch/vận chuyển/lên kệ, class `.hero__card`,
2026-09-09 đã xoá hẳn) — thay bằng khung video giới thiệu 16:9 (`.hero__video`), giữ nguyên
vị trí và bố cục 2 cột của `.hero__layout` (kích thước rộng hơn 1 chút so với `.hero__card`
cũ — `max-width: 540px` thay vì `420px`, video cần không gian ngang nhiều hơn 1 thẻ thông
tin). 4 icon từng dùng ở timeline đó (`icon-seedling`/`icon-leaf`/`icon-truck`/
`icon-warehouse`) đã kiểm tra vẫn được dùng rộng rãi ở nhiều trang khác trong dự án
(sidebar, badge trạng thái...) — **không xoá khỏi `icons/sprite.svg`**.

**⚠️ Bug đã vá — flex item chứa con `width: 100%` tự co về 0 ở bố cục hàng ngang**:
`.hero__showcase` bản thân cũng là `display: flex` (chỉ để canh `.hero__video` sang phải ở
desktop), và là 1 flex item của `.hero__layout` khi layout đó chuyển `flex-direction: row`
(≥960px). Chỉ đặt `width: 100%` trên `.hero__video` (con) là KHÔNG đủ nếu `.hero__showcase`
(cha, cũng là flex item) không có width cố định — cha co theo nội dung, nội dung lại tính %
theo chính cha, vòng lặp không giải được nên trình duyệt co cả 2 về gần 0. Lỗi CHỈ lộ ra ở
≥960px vì dưới đó `.hero__layout` là `column`, `.hero__showcase` tự nhận đủ bề rộng qua
`align-items: stretch` mặc định (không phụ thuộc con). Đã vá bằng cách cho `.hero__showcase`
1 `width: 540px` cố định (khớp `max-width` của `.hero__video`) + `min-width: 0` (phá mặc
định `min-width: auto` của flex item, để vẫn co được nếu màn hẹp hơn 540px) trong đúng
`@media (min-width: 960px)`. Bài học chung: khi 1 phần tử `display: flex` được đặt LÀM flex
item của 1 flex container khác, và con trực tiếp của nó dùng `width`/`height` theo phần
trăm, luôn kiểm tra chính nó (không chỉ con) có nguồn kích thước xác định (width cố định,
hoặc `flex-basis` không phải `auto`/content-based) hay chưa — thiếu 1 mắt xích là sập cả
chuỗi %.

**Kỹ thuật nhúng — facade, KHÔNG nhúng `<iframe>` YouTube ngay từ đầu**: iframe YouTube tải
sẵn JS nặng ngay cả khi chưa bấm play, làm chậm trang chủ — đây là trang đầu tiên khách vào,
cần tải nhanh nhất có thể. `js/video-intro.js` ban đầu chỉ hiện `.hero__video-facade` (nút
`<button>` — có sẵn hành vi bàn phím Enter/Space, không cần tự bắt `keydown`) chứa ảnh
thumbnail YouTube (`img.youtube.com/vi/<id>/maxresdefault.jpg`) + lớp phủ tối mờ (CSS
`::after`) + nút play tròn `.hero__video-play-button` (tam giác vẽ bằng CSS `border-*` thuần,
KHÔNG có icon play nào trong `icons/sprite.svg`). Bấm vào mới tạo `<iframe>` thật và chèn vào
`.hero__video-frame` (`data-video-frame`), trỏ **`youtube-nocookie.com`** (không phải
`youtube.com`) để giảm cookie/tracking khi người dùng chưa chắc đã muốn xem.

**⚠️ Video ID hiện tại (`5dK7Ek3KkU8`) là TẠM THỜI** — chưa phải video giới thiệu chính thức
của AgriChain, đánh dấu bằng comment `// TODO: thay bằng ID video giới thiệu chính thức khi
có` ngay trên khai báo `VIDEO_ID` trong `js/video-intro.js`. Nhớ thay ID này (và ảnh
thumbnail sẽ tự đổi theo vì lấy từ đúng ID) trước khi lên production.

## Mẫu quy trình mùa vụ (`mau-quy-trinh.html`)

**ĐÃ CHUYỂN SANG BACKEND THẬT** (2026-09-08) qua `api.workflowTemplates.*`
(`GET/POST/PATCH/DELETE /workflow-templates`) — không còn đọc/ghi qua
`AgriChain.store`/collection `workflowTemplates` nữa. Cùng khuôn danh sách với
`nong-trai.html`/`vat-tu.html`: tìm kiếm (debounce), phân trang, khối loading/lỗi/rỗng
(`.async-state`/`.empty-state`), nút "Sửa"/"Xoá" mỗi thẻ và nút "Tạo quy trình mới" ẩn theo
`api.hasPermission('workflow_templates.edit'/'delete'/'add')` — xem mục "Trang tai-khoan.html"
phía trên để biết 4 mã quyền nhóm `workflow_templates` (mới xác nhận, ngoài 28 mã gốc).
Backend **không khoá theo `ownerId`** (giống trang cũ) — danh sách chung cho Đơn vị đang đăng
nhập, không có khái niệm nhiều chủ sở hữu trong 1 phiên.

Payload gửi lên đổi tên field sang snake_case khớp `TemplateStep` thật của backend
(`activityType` -> `activity_type`, `requireQr` -> `require_qr`, `requireSupply` ->
`require_supply`, `supplyId` -> `supply_id`, `requireImage` -> `require_image`); response trả
về giữ nguyên snake_case, đọc thẳng. `TemplateStep` xác nhận qua `/openapi.json` **không có
`id` riêng** (khác `seasons.workflow_steps[]`/`WorkflowStep`, cần `id` để theo dõi tiến độ mùa
vụ) — mẫu chỉ là bản thiết kế tĩnh, chưa gắn lần thực hiện nào, khớp đúng giả định code từ
trước nên không có rủi ro định dạng UUID nào phát sinh ở lần chuyển đổi này.
`GET /workflow-templates/{id}` (và cả bản danh sách) trả về **đầy đủ** `steps[]` ngay trong
response — không tách list/detail như `logs`/`certifications`, nên modal Sửa không cần gọi
thêm request nào để lấy đủ dữ liệu bước.

Mỗi mẫu quy trình gồm nhiều "bước thực hiện" (`steps[]`), mỗi bước có: tên, loại hoạt động kỹ
thuật (`activity_type`, dùng lại đúng 9 giá trị/icon của `ACTIVITY_TYPES` trong
`js/nong-trai-chi-tiet.js` — Gieo trồng/Gieo hạt, Bón phân, Tưới nước, Phòng trừ sâu bệnh, Làm
cỏ, Cắt tỉa, Thu hoạch, Kiểm tra/Giám sát, Hoạt động khác), hướng dẫn thực hiện, và 3 cờ
boolean (`require_qr`, `require_supply` kèm `supply_id` tuỳ chọn trỏ tới `api.supplies.list()`,
`require_image`). Modal build từng thẻ bước bằng `stepCard()` (giống cách `variantCard()` dựng
biến thể sản phẩm ở `js/thuong-mai-san-pham.js`) — nhưng KHÔNG dùng mảng JS giữ trạng thái
sống: dữ liệu bước đọc/ghi thẳng qua DOM bằng các class đánh dấu (`.step-name`, `.step-type`...)
lúc `collectSteps()` chạy ở submit (trả về đúng snake_case), y hệt cách `collectVariants()`
hoạt động.

Nút lên/xuống mỗi bước **di chuyển thẳng DOM node** (`insertBefore`) thay vì re-render từ mảng —
đơn giản hơn và tận dụng luôn việc DOM đã là nguồn dữ liệu (xem lý do ở trên). Số thứ tự hiển
thị (`1`, `2`, `3`...) được tính lại từ vị trí DOM thật qua `renumberSteps()` sau MỌI thao tác
đổi số lượng/thứ tự bước (thêm, xoá, di chuyển) — biến đếm `stepCount` chỉ dùng nội bộ lúc khởi
tạo 1 thẻ mới, không dùng để hiển thị số, nên không bao giờ bị lệch dù người dùng thêm/xoá xen
kẽ nhiều lần. Xoá bước cuối cùng còn lại sẽ tự thêm ngay 1 bước trống thay thế — modal không
bao giờ để danh sách bước rỗng hoàn toàn.

Dữ liệu mẫu quy trình tạo TRƯỚC lúc migrate (localStorage, id dạng `store.newId()` không phải
UUID) KHÔNG tự động chuyển lên backend — biến mất khỏi danh sách sau khi migrate (collection
`workflowTemplates` trong `store.js` giờ mồ côi, xem mục "Nợ kỹ thuật đã biết"), tự tạo lại
qua giao diện mới nếu cần.

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
`supplyId`, `requireImage`) cộng thêm state riêng: `id` (sinh bằng `store.newId()`), `done`
(boolean — **đổi tên từ `status` dạng `'pending'`/`'completed'`** để tránh trùng tên với
`seasons.status`, vốn có 5 giá trị hoàn toàn khác phạm vi, xem `SCHEMA-EXPORT.md`),
`completedAt`, `logId` (trỏ tới `seasonLogs` khi hoàn thành), `batchId` (trỏ tới `batches`
nếu bước yêu cầu QR). Nhờ chụp bản sao, sửa/xoá mẫu gốc sau đó không ảnh hưởng tới checklist
đã áp dụng. **`workflowTemplateId`/`workflowTemplateName`/`workflowSteps` chỉ còn ĐÚNG 2
trạng thái**: cả 3 đều `null` (chưa áp dụng quy trình nào — `handleSeasonSubmit()` khởi tạo
tường minh cả 3 về `null` ngay lúc tạo mùa vụ mới, không để `undefined`), hoặc `workflowSteps`
là mảng (đã áp dụng, kể cả mảng rỗng `[]` cho ca "Tạo quy trình rỗng" — lúc đó
`workflowTemplateId` vẫn có thể là `null` vì không dựa trên mẫu nào, chỉ `workflowSteps` mới
là field quyết định trạng thái) — `renderSeasonProcess()` kiểm `workflowSteps` để quyết định
hiện khối chọn mẫu hay hiện checklist.

**Bước "tới lượt" duy nhất** là bước `!done` ĐẦU TIÊN theo thứ tự mảng
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
`id`/`done`/`completedAt`/`logId`/`batchId` qua `dataset` (không phải input người dùng sửa
được — `done` lưu dưới dạng chuỗi `'true'`/`'false'` vì `dataset` luôn ép kiểu chuỗi, đọc lại
qua so sánh `=== 'true'`) để **KHÔNG mất tiến độ đã hoàn thành** khi người dùng chỉ sửa tên/hướng dẫn của 1 bước
khác trong cùng danh sách — `collectProcessSteps()` đọc lại các giá trị này lúc lưu thay vì
reset về mặc định. "Tạo quy trình rỗng" (`createEmptyWorkflow()`) đặt `workflowSteps: []` rồi
mở LUÔN modal này để tự thêm bước đầu tiên, vì checklist đang trống không có gì để hiển thị.

## Thương mại điện tử — hồ sơ cửa hàng (`thuong-mai-tong-quan.html`)

Collection `shops` (`store.js`) chỉ có **1 bản ghi cho mỗi Đơn vị đăng nhập**, khoá bằng
`ownerId = session.id` (không phải id tổ chức thật — dự án chưa có khái niệm đó). Trang tự
lọc `store.list('shops')` để tìm bản ghi khớp `ownerId`, không có hàm riêng trong `store.js`
cho việc này (theo đúng quy ước: `store.js` chỉ generic insert/update/list, lọc theo nghiệp
vụ nằm ở JS riêng của trang, giống cách `js/thuong-mai-san-pham.js` tự lọc `products` theo
`ownerId` — xem mục riêng bên dưới).

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
qua `variant.batchId` (select trong modal, xem `batchOptions()`/`loadBatches()`) — mã lô đã
tự mang thông tin nông trại+mùa vụ nhờ định dạng `<mã nông trại>-<mã mùa vụ>-NNN`, xem
`js/nong-trai-chi-tiet.js`. Đây là điểm nối giữa "Hoạt động sản xuất" và "Thương mại điện
tử": sản phẩm rao bán có thể truy xuất ngược về đúng lô hàng đã ghi nhận trên blockchain.

**Lô hàng ĐÃ CHUYỂN SANG API (2026-09-12) — vá hồi quy**: dropdown chọn lô hàng từng đọc
`store.list('batches')` (collection MỒ CÔI kể từ khi `batches` CRUD chuyển hẳn sang API,
xem mục "Kết nối backend") nên rỗng trơn với mọi lô hàng tạo sau thời điểm migrate đó — vá
bằng `loadBatches()` (gọi `api.batches.list({ page_size: 100 })` MỘT LẦN lúc trang khởi
động, cùng mẫu `availableSupplies`/`loadSupplyOptions()` ở `js/nong-trai-chi-tiet.js`, không
tải lại mỗi lần mở modal). Nhãn option giờ có thêm `farm_name`/`season_name` (đọc thẳng từ
`BatchOut`, không gọi thêm request nào) cho dễ phân biệt các lô cùng sản phẩm — trước đó chỉ
hiện `batch.code`.

⚠️ **`GET /batches` yêu cầu quyền `batches.view`** — theo seed mặc định
(`002_seed_roles_permissions.sql`, xem mục "Trang `tai-khoan.html`"), vai trò `manager` và
`farmer` (2 vai trò business KHÔNG phải admin duy nhất tồn tại) đều **KHÔNG có** quyền này
(nhóm `batches.*` được thêm ở migration 005, sau khi 002 đã seed xong `manager`/`farmer`,
và chưa từng được bổ sung ngược lại). Nghĩa là 1 người dùng giữ vai trò `manager`/`farmer`
mở `thuong-mai-san-pham.html` sẽ nhận 403 khi `loadBatches()` chạy — dropdown chọn lô hàng
sẽ trống (đã bắt lỗi qua `.catch()`, chỉ hiện toast, không làm vỡ trang). **CHƯA tự ý cấp
quyền `batches.view` cho 2 vai trò này** (ngoài phạm vi lần vá này, cần quyết định có chủ
đích) — dự án cũng chưa có vai trò riêng cho nhân sự "Thương mại điện tử", chỉ có
`admin`/`manager`/`farmer` dùng chung cho mọi phân hệ nghiệp vụ.

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

## E-commerce công khai (`ecommerce.html`)

Sàn mua sắm nông sản CÔNG KHAI (không cần đăng nhập, mở từ link "E-commerce" ở header/footer
mọi trang) — khác hẳn nhóm "Thương mại điện tử" ở khung quản trị (`thuong-mai-*.html`, dành
cho Đơn vị bán hàng quản lý shop của MÌNH): đây là mặt trước công khai cho khách hàng duyệt
**tất cả** cửa hàng/sản phẩm của **mọi** Đơn vị cùng lúc. Vì vậy trang **KHÔNG lọc theo
`ownerId`** như các trang quản trị — `store.list('shops')`/`store.list('products')` trả về
sao thì hiển thị hết vậy (đúng vai trò 1 sàn thương mại điện tử thật).

**Có header/footer riêng dạng storefront** (`.shop-header`/`.shop-footer`, định nghĩa ngay
trong `<style>` của chính trang) — KHÔNG dùng lại `.site-header`/`.site-footer` như
`index.html`/`blog.html`, vì đây không phải trang giới thiệu doanh nghiệp: header có ô tìm
kiếm, icon giỏ hàng, avatar tài khoản khách hàng (trỏ `dang-nhap.html`) thay vì menu Tính
Năng/Quy Trình/Liên Hệ. Vì header không phải `.site-header`, trang không nạp `js/header.js` —
menu không cần thu gọn qua JS vì đơn giản chỉ ẩn bớt (tìm kiếm ẩn dưới 768px, menu ẩn dưới
960px) bằng CSS thuần, không có hamburger.

**Dữ liệu thật, không hard-code**: `js/ecommerce.js` đọc thẳng `AgriChain.store` (KHÔNG
`fetch()` như `blog.js`, vì đây là dữ liệu `localStorage` thật của `store.js`, không phải file
tĩnh) — cùng nguyên tắc "trang công khai đọc thẳng dữ liệu thật" như `truy-xuat.html`.
- **Danh Mục Nông Sản**: mảng `CATEGORIES` chép lại Y HỆT `js/thuong-mai-san-pham.js`
  (`['Cà Phê Nhân', 'Hồ Tiêu', 'Gạo', 'Đồ uống', 'Gia vị']`) — bấm 1 danh mục sẽ lọc lưới sản
  phẩm bên dưới theo đúng `product.category`, không phải link tới trang riêng (chưa có).
- **Cửa Hàng Nổi Bật**: 3 bản ghi `shops` đầu tiên, đếm số sản phẩm thật của từng shop bằng
  `products.filter(p => p.ownerId === shop.ownerId && p.status === 'published').length`. Chưa
  có hệ thống đánh giá nên số sao luôn tĩnh "0.0" — không bịa số ngẫu nhiên.
- **Nông Sản Nổi Bật**: chỉ hiện sản phẩm `status === 'published'` (bỏ qua bản nháp `'draft'`
  đang sửa dở ở khu quản trị). 3 tab lọc: "Tất cả" (mặc định), "Mới thu hoạch" (sắp xếp theo
  `createdAt` giảm dần — không có trường ngày thu hoạch thật trên `products` nên dùng ngày tạo
  làm proxy hợp lý nhất), "Khuyến mãi" (LUÔN rỗng — `products` chưa có trường giảm giá nào,
  hiện trạng thái rỗng trung thực thay vì bịa dữ liệu khuyến mãi giả). Giá hiển thị là giá thấp
  nhất trong `variants[]` (`minPrice()`, chép lại từ `js/thuong-mai-san-pham.js`). Badge "Truy
  xuất BC" chỉ hiện khi sản phẩm có ít nhất 1 biến thể đã gắn `batchId` thật.
- Ô tìm kiếm lọc lưới sản phẩm theo tên/danh mục (client-side, không phải trang kết quả tìm
  kiếm riêng) — gõ Enter hoặc bấm icon kính lúp đều chạy, rồi tự cuộn xuống đúng lưới sản phẩm.

Link "Ghé thăm cửa hàng"/"Xem chi tiết" sản phẩm/mục "Cửa hàng"/"Nhà nông" ở menu đều tạm để
`href="#"` — chưa có trang chi tiết 1 cửa hàng, trang chi tiết 1 sản phẩm, hay trang danh sách
riêng cho các mục này (xem "Việc chưa làm" phía trên).

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
