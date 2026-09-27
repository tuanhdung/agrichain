# AgriChain — app/ (SPA React + Vite, đang migrate dần khu quản trị)

Đây là tài liệu quy ước RIÊNG cho thư mục `app/` — đọc CLAUDE.md ở gốc repo
trước (quy ước chung, mô tả 16 trang app-shell tĩnh, lớp `js/api.js` gốc,
`css/` dùng chung...), tài liệu này chỉ ghi thêm phần khác biệt khi làm việc
trong `app/`.

## Vì sao có thư mục này

Dự án gốc là HTML/CSS/JS thuần, không framework/build tool (xem CLAUDE.md gốc).
`app/` là một **pilot**: thử tách khu quản trị (16 trang app-shell — nong-trai,
vat-tu, nong-trai-chi-tiet, mau-quy-trinh, lo-hang, tai-khoan, ho-so,
goi-phan-mem, lich-su-mua-goi, 7 trang thuong-mai-\*) sang SPA React + Vite,
**KHÔNG tách repo mới** — vẫn nằm trong `agrichain`, các trang tĩnh còn lại
(index.html, blog.html, truy-xuat.html, dang-nhap.html, dang-ky.html,
agriverse-3d.html, ecommerce.html...) giữ nguyên, không đụng tới.

**Tính tới thời điểm này, 8 trang đã migrate: Nông trại (`/nong-trai`), Vật
tư (`/vat-tu`), Mẫu quy trình (`/mau-quy-trinh`), Quản lý Tài khoản
(`/tai-khoan`), Lô hàng (`/lo-hang`), Hồ sơ (`/ho-so`), Gói Phần mềm
(`/goi-phan-mem`) và Lịch sử mua Gói (`/lich-su-mua-goi`)** — bản gốc
`nong-trai.html`/`js/nong-trai.js`, `vat-tu.html`/`js/vat-tu.js`,
`mau-quy-trinh.html`/`js/mau-quy-trinh.js`, `tai-khoan.html`/
`js/tai-khoan.js`, `lo-hang.html`/`js/lo-hang.js`, `ho-so.html`/
`js/ho-so.js`, `goi-phan-mem.html` và `lich-su-mua-goi.html` (2 trang cuối
không có file `.js` riêng — trang tĩnh, không nghiệp vụ) **vẫn còn nguyên,
vẫn hoạt động bình thường song song** (không xoá, không sửa gì cả 8 file
này ngoài 1 dòng href sidebar/menu tài khoản mỗi trang — xem mục "Sidebar
cũ trỏ sang đây" bên dưới). 8 trang admin còn lại KHÔNG đụng tới.

## Quyết định công nghệ đã chốt (đọc trước khi đổi)

- **TypeScript**, không phải JS thuần — người dùng chọn tường minh lúc scaffold.
  Lý do: CLAUDE.md gốc ghi nhận nhiều bug THẬT do đoán sai khuôn response
  backend (`/auth/me` bọc object, `organization_is_distributor` đặt sai cấp,
  `LogSupply` 7 field chứ không phải 6...) — khai báo type cho response API
  (`src/api/types.ts`, và type riêng từng domain như `src/api/supplies.ts`)
  bắt được lớp lỗi này ngay lúc code.
- **React 18** (không phải 19) + **react-router-dom v6** (không phải v7) —
  chọn bản ổn định, tài liệu/Stack Overflow phổ biến nhất tại thời điểm
  scaffold, tránh rủi ro breaking change của bản mới nhất cho 1 pilot nội bộ.
  **Vite 6** + **@vitejs/plugin-react 4** cùng lý do.
- **Kiến trúc host: SUBDOMAIN riêng** — `app.agrichain.org.vn` (SPA) khác hẳn
  `agrichain.org.vn` (site tĩnh), 2 ORIGIN THẬT SỰ khác nhau — đã CHỐT
  (2026-09-22), xem mục "Giả định host" bên dưới để biết đầy đủ hệ quả.
- **Bản đồ: Leaflet THUẦN, KHÔNG `react-leaflet`** (2026-09-22, trang
  `/nong-trai`) — port gần nguyên văn bản `.js` gốc, tránh rủi ro viết sai
  hành vi tinh vi khi phải diễn đạt lại qua API khai báo của 1 thư viện
  khác. Xem đầy đủ lý do ở mục "Trang `/nong-trai`".
- Không có ESLint/Prettier riêng cho `app/` — chưa scaffold, ngoài phạm vi
  pilot này. `npm run lint` hiện chỉ là type-check (`tsc -b --noEmit`).

## Cấu trúc thư mục

```
app/
  package.json / tsconfig*.json / vite.config.ts / index.html
  .env                  # VITE_MAIN_SITE_URL cho dev (Live Server, 127.0.0.1:5500) — COMMIT, dùng chung
  .env.production        # VITE_MAIN_SITE_URL cho build prod (https://agrichain.org.vn) — COMMIT, ghi đè .env
  .env.example            # copy thành .env.local để trỏ VITE_API_BASE_URL sang backend local (KHÔNG commit .env.local)
  src/
    main.tsx            # import 4 file CSS gốc (../../css/*.css) + mount React
    App.tsx             # khai báo route — /login (công khai), /nong-trai, /vat-tu, /mau-quy-trinh,
                         # /tai-khoan, /lo-hang, /ho-so, /goi-phan-mem, /lich-su-mua-goi (bảo vệ)
    icons.tsx           # <Icon name="box"/> + SPRITE_URL + BRAND_MARK_URL — dùng lại icons/sprite.svg
                         # và icons/exabyte-icon-only-transparent.png gốc qua `?url` import
    enums.ts             # ACTIVITY_TYPES — dùng lại NGUYÊN js/enums.js qua `?raw` import + thực thi
                          # thật (không hard-code lại), xem mục "Thêm 1 trang mới" bước 2b
    mapLayers.ts          # port addMapBaseLayers() (js/map-layers.js) — DÙNG CHUNG giữa pages/nong-trai/
                          # (BoundaryEditor.tsx) và pages/nong-trai-chi-tiet/ (FarmDetailMap.tsx), khớp
                          # đúng việc bản gốc js/map-layers.js cũng là 1 file dùng chung 2 trang
    vite-env.d.ts        # /// <reference types="vite/client" /> — cần cho import.meta.env, ?url, ?raw
    api/
      config.ts          # VITE_API_BASE_URL + VITE_MAIN_SITE_URL + mainSiteUrl(path) helper
      error.ts            # class ApiError, buildApiError, networkError — port từ js/api.js
      session.ts          # storage/token/user/hasPermission/redirectToLogin/redirectToAgriverse — port từ js/api.js
      http.ts              # request() lõi + refresh token + auth.* (auth.login() dùng ở LoginPage.tsx) — port từ js/api.js
      supplies.ts          # api.supplies.* — domain module ĐẦU TIÊN, mẫu cho domain khác
      workflowTemplates.ts  # api.workflowTemplates.* — domain THỨ HAI, TemplateStep KHÔNG có `id` riêng
      farms.ts              # api.farms.* — domain THỨ BA, polygon: [{lat,lng}] NOT NULL tối thiểu 3 điểm
      users.ts              # api.users.* — domain trang /tai-khoan, role_id là SỐ NGUYÊN (không phải UUID)
      roles.ts               # api.roles.* — list/get/create/update/remove (UI /tai-khoan chỉ dùng list/update)
      permissions.ts          # api.permissions.* — CHỈ list(), permission KHÔNG có id số (chỉ có code)
      seasons.ts              # api.seasons.* — CHỈ list() (đủ cho dropdown lọc ở /lo-hang), thêm get/
                               # create/update/remove khi nong-trai-chi-tiet.html migrate
      batches.ts               # api.batches.* — CHỈ list/get/getByCode (trang /lo-hang chỉ xem/lọc,
                                # KHÔNG create/update/remove — CRUD thật vẫn ở nong-trai-chi-tiet.html)
      system.ts            # api.system.* (platform_admin, read-only) — supplies + workflowTemplates +
                            # farms + batches
      index.ts              # gộp lại thành `api` — import { api } from '../api', giống AgriChain.api
      types.ts               # User/Page<T>/MeResponse/TokenPair dùng chung
    context/
      AuthContext.tsx     # thay AgriChain.api phần phiên đăng nhập — useAuth() (có cả login())
    hooks/
      usePermission.ts        # thay AgriChain.api.hasPermission(code), reactive
      useSidebarState.ts       # 2 key localStorage sidebar — DÙNG CHUNG với 8 trang .html còn lại
      useAppShellSidebar.ts     # port setupSidebar() (mobile overlay / desktop collapse)
      useDialog.ts               # wrap <dialog>.showModal()/close() — xem "Modal (dialog)" bên dưới;
                                  # trả thêm `openCount` (tăng mỗi lần open() thật sự chạy) — xem
                                  # mục "⚠️ Bug đã vá — bản đồ Leaflet..." trong "Trang /nong-trai"
      useDebouncedCallback.ts     # debounce ô tìm kiếm
      useCascadingSelect.ts       # port AgriChain.setupCascadingSelect (js/location-select.js) —
                                   # Tỉnh/Thành→Phường/Xã (nong-trai, allowEmptyParent mặc định false)
                                   # VÀ Nông trại→Mùa vụ (bộ lọc /lo-hang, allowEmptyParent: true —
                                   # thêm option này lúc migrate /lo-hang, xem "Trang /lo-hang")
    routes/
      ProtectedRoute.tsx    # thay requireAuth()/requireBusiness() — redirect nội bộ tới /login
      postLogin.ts           # port redirectTarget()/defaultTargetFor() (js/auth.js gốc) — xem "Trang /login"
    layout/
      AppShell.tsx          # khung sidebar+topbar+scrim dùng chung cho MỌI route bảo vệ — mount cả
                             # ToastProvider LẪN ConfirmDialogProvider
      Sidebar.tsx             # markup y hệt .app-sidebar gốc — khai báo route trong useNavSections()
      Topbar.tsx               # markup y hệt .app-topbar gốc
      UserMenu.tsx              # dropdown avatar — port setupUserMenu(); mục "Hồ sơ" trỏ route
                                 # THẬT /ho-so từ 2026-09-23 (Link, không còn mainSiteUrl())
    components/
      ToastProvider.tsx      # thay AgriChain.toast(message)
      ConfirmDialogProvider.tsx  # thay AgriChain.confirm(message) — xem mục "Trang /mau-quy-trinh"
      PasswordField.tsx           # port js/password-field.js (nút hiện/ẩn + rules tuỳ chọn qua
                                   # `showRules`) — dùng ở /tai-khoan VÀ /ho-so (tab "Bảo mật"),
                                   # xem mục "Trang /tai-khoan"/"Trang /ho-so"
      PlaceholderPage.tsx          # khung "Đang phát triển" dùng CHUNG cho /goi-phan-mem VÀ
                                   # /lich-su-mua-goi — xem mục "Trang /goi-phan-mem"
    pages/
      Login/
        LoginPage.tsx         # route /login — xem mục "Trang /login" bên dưới
      vat-tu/                # 1 thư mục / 1 trang đã migrate — xem "Thêm 1 trang mới"
        VatTuPage.tsx
        SupplyFormModal.tsx
        DeleteSupplyModal.tsx
        SupplyStats.tsx
        SupplyTable.tsx
        constants.ts
        format.ts
      mau-quy-trinh/          # trang THỨ HAI đã migrate — xem mục "Trang /mau-quy-trinh"
        MauQuyTrinhPage.tsx
        TemplateFormModal.tsx
        TemplateCard.tsx
        StepFields.tsx
        stepForm.ts
        workflow-step.css      # CSS riêng trang (port <style> của mau-quy-trinh.html gốc)
        constants.ts
      nong-trai/              # trang THỨ BA đã migrate — xem mục "Trang /nong-trai"
        NongTraiPage.tsx
        FarmFormModal.tsx
        FarmCard.tsx
        BoundaryEditor.tsx      # bản đồ Leaflet vẽ polygon — Leaflet THUẦN, KHÔNG react-leaflet
        locationData.ts         # loadProvinces()/loadWards() — fetch() qua API_BASE_URL (ĐÃ đổi từ
                                 # mainSiteUrl(), xem mục riêng)
        geo.ts                  # geodesicArea()/hectares()/formatHectares() (công thức lượng giác cầu)
        map-layout.css          # CSS riêng trang (port <style> của nong-trai.html gốc)
        format.ts
        constants.ts
      nong-trai-chi-tiet/     # CẢ 5 BƯỚC đã code xong, CHƯA xác nhận qua test tay (xem mục
                              # "Trang /nong-trai-chi-tiet") — CHƯA cộng vào số trang đã xong
        NongTraiChiTietPage.tsx  # đọc ?ma=/?id= qua useSearchParams(), 3 tab cấp trang
        FarmDetailMap.tsx        # bản đồ Leaflet CHỈ XEM (khác BoundaryEditor.tsx — không vẽ tương tác)
        CertificationCard.tsx    # tab "Chứng nhận nông trại" — Bước 2
        CertificationFormModal.tsx  # modal Thêm/Sửa chứng nhận — Bước 2
        SeasonCard.tsx            # tab "Lịch sử mùa vụ" — Bước 3
        SeasonFormModal.tsx       # modal Thêm/Sửa mùa vụ — Bước 3
        SeasonViewModal.tsx       # modal "Xem chi tiết mùa vụ", ĐỦ 4 tab con (Thông tin/Timeline/Lô hàng/Quy
                                  # trình mùa vụ) — Bước 3+4+5, sở hữu state điều phối completingStepId/
                                  # pendingQrStepId (xem mục "Trang /nong-trai-chi-tiet" — Bước 5)
        LogItem.tsx               # 1 nhật ký trong tab con "Timeline mùa vụ" — Bước 3
        LogFormModal.tsx          # modal Thêm/Sửa nhật ký (vật tư + ảnh base64) — Bước 3, mở rộng thêm
                                  # prefillActivityType/prefillDescription/completingStepId ở Bước 5
        BatchCard.tsx             # tab con "Lô hàng" — KHÁC pages/lo-hang/BatchCard.tsx, xem mục Bước 4
        BatchFormModal.tsx        # modal Thêm/Sửa lô hàng (kiểm trùng mã ở FE) — Bước 4
        ProcessStepViewCard.tsx   # 1 bước trong checklist "Quy trình mùa vụ" — Bước 5
        ProcessStepEditorModal.tsx  # modal "Tuỳ biến bước quy trình" — Bước 5
        ProcessStepFields.tsx     # 1 dòng biên tập bước trong modal trên, GIỮ NGUYÊN 4 field trạng thái — Bước 5
        processStepForm.ts        # StepEditorRow/emptyProcessStep()/toPayloadStep() — Bước 5
        systemPaging.ts          # fetchAllSystemPages()/MAX_SYSTEM_PAGES
        format.ts
        constants.ts              # CERT_STATUSES/SEASON_STATUSES/BATCH_STATUSES/MATERIAL_*/MAX_LOG_*
        view-detail.css          # CSS riêng trang, port TOÀN BỘ <style> gốc 1 lần
      tai-khoan/              # trang THỨ TƯ đã migrate — RBAC + ma trận quyền + transfer-admin,
                               # xem mục "Trang /tai-khoan"
        TaiKhoanPage.tsx
        UserTable.tsx
        UserModal.tsx           # Thêm người dùng
        EditUserModal.tsx        # Sửa RIÊNG với Thêm (UserUpdate không có email/password)
        ResetPasswordModal.tsx
        PermissionModal.tsx      # ma trận phân quyền 9×4 — RỦI RO BẢO MẬT CAO NHẤT trong SPA
        permissionMatrix.ts       # logic thuần: groupPermissions()/computeManagedCodes()/...
        permission-table.css      # CSS riêng trang (port <style> của tai-khoan.html gốc)
        TransferAdminModal.tsx    # nhường quyền quản trị
        constants.ts
        format.ts
      lo-hang/                # trang THỨ NĂM đã migrate — xem mục "Trang /lo-hang"
        LoHangPage.tsx
        BatchCard.tsx
        filter-card.css         # CSS riêng trang (port <style> của lo-hang.html gốc, PHẦN filter-card
                                 # — chưa port phần qr-modal, xem mục riêng)
        constants.ts
        format.ts
      ho-so/                  # trang THỨ SÁU đã migrate — self-service, xem mục "Trang /ho-so"
        HoSoPage.tsx             # trang ĐẦU TIÊN trong app/ dùng tabs (.tabs/.tabs__tab/.tabs__panel),
                                 # tự quản lý bằng 1 state cục bộ — setupTabs() gốc CHƯA có bản port
                                 # dùng chung (chỉ 1 trang cần, chưa đáng tách)
        ProfileInfoForm.tsx      # tab "Thông tin cá nhân" — PATCH /auth/me
        SecurityForm.tsx         # tab "Bảo mật" — POST /auth/change-password
        profile-card.css         # CSS riêng trang (port <style> của ho-so.html gốc)
        format.ts
      goi-phan-mem/           # trang THỨ BẢY đã migrate — "Đang phát triển", xem mục
                              # "Trang /goi-phan-mem"
        GoiPhanMemPage.tsx       # 3 dòng, chỉ gọi PlaceholderPage (components/)
      lich-su-mua-goi/        # trang THỨ TÁM đã migrate — "Đang phát triển", xem mục
                              # "Trang /goi-phan-mem"
        LichSuMuaGoiPage.tsx     # 3 dòng, chỉ gọi PlaceholderPage (components/)
```

Phía site tĩnh có thêm **`js/app-config.js`** (mô tả đầy đủ trong CLAUDE.md
gốc, mục file structure của `js/`) — file MỚI, cặp đôi với `src/api/config.ts`
ở phía SPA, xem mục "Sidebar cũ trỏ sang đây" bên dưới.

## Giả định host — ĐÃ CHỐT: subdomain riêng (2026-09-22)

`app/` build ra 1 SPA, phục vụ ở **subdomain riêng `app.agrichain.org.vn`**;
site tĩnh (index.html, dang-nhap.html, agriverse-3d.html, và 8 trang
app-shell chưa migrate) ở `agrichain.org.vn`. **Đây là 2 ORIGIN THẬT SỰ khác
nhau** (khác cả domain, không chỉ khác path) — quyết định đã chốt, thay hẳn
giả định "subpath" (`/app/...`) của bản trước, KHÔNG còn đúng nữa.

- Mọi điều hướng RA NGOÀI SPA (đăng xuất, chưa đăng nhập, sai account_type,
  sidebar/topbar/breadcrumb trỏ về trang tĩnh...) dùng **URL TUYỆT ĐỐI** qua
  `mainSiteUrl(path)` (`src/api/config.ts`) — đọc biến môi trường Vite
  **`VITE_MAIN_SITE_URL`**:
  - `app/.env` (nạp mọi mode, dùng khi `npm run dev`) —
    `http://127.0.0.1:5500` (đúng cổng mặc định Live Server, xem CLAUDE.md
    gốc mục "Kiểm thử giao diện").
  - `app/.env.production` (CHỈ nạp khi `vite build`, GHI ĐÈ `.env`) —
    `https://agrichain.org.vn`.
  - Cả 2 file **CÓ COMMIT** (khác `.env.local`/`VITE_API_BASE_URL` — biến đó
    vẫn qua `.env.local` KHÔNG commit, vì là override cá nhân cho backend
    local, còn 2 file trên là giá trị DÙNG CHUNG cho cả team).
  - `mainSiteUrl('dang-nhap.html')` -> `http://127.0.0.1:5500/dang-nhap.html`
    (dev) hoặc `https://agrichain.org.vn/dang-nhap.html` (prod build) — tự
    xử lý dấu `/` thừa/thiếu, chỗ gọi không cần tự nhớ quy ước ghép chuỗi.
  - **KHÔNG còn dùng đường dẫn tương đối `../` ở bất kỳ đâu trong `src/`** —
    2 origin khác nhau thì `../` không có ý nghĩa điều hướng liên-origin
    (trình duyệt chỉ hiểu `../` trong phạm vi CÙNG origin).
- **Asset tĩnh (logo, sprite icon) KHÔNG dùng `mainSiteUrl()`** — bundle
  thẳng qua Vite (`?url` import trong `icons.tsx`, xem mục "Vì sao KHÔNG copy
  css/icons vào app/"), để SPA không phụ thuộc site chính còn sống hay không
  chỉ để hiện logo/icon.

### ⚠️ Hệ quả ĐÃ GIẢM NHẸ (2026-09-25): phiên đăng nhập giờ dùng chung được MỘT CHIỀU giữa 2 origin qua cookie httpOnly

`agrichain.access_token`/`agrichain.refresh_token`/`agrichain.user` lưu ở
`localStorage`/`sessionStorage` — Web Storage **scope theo origin**, KHÔNG tự
chia sẻ được giữa `app.agrichain.org.vn` và `agrichain.org.vn` (2 origin khác
nhau). Đoạn này TỪNG mô tả nguyên trạng "không dùng chung được gì cả" — giờ
đã đúng hơn với **"dùng chung được qua cookie, nhưng phải chủ động dò lúc SPA
khởi động"**:

- Backend (`agrichain-api`) giờ set THÊM 1 cookie `httpOnly` tên
  `access_token`, `Domain=COOKIE_DOMAIN` (VD `.agrichain.local` lúc dev qua
  hosts file, `.agrichain.org.vn` ở production — CHƯA deploy, domain thật
  chưa mua) ở `/auth/login`/`/auth/refresh`/`/auth/change-password` — xem
  `agrichain-api/CLAUDE.md` mục "Cookie httpOnly chứa access token". Trình
  duyệt tự gửi cookie này cho MỌI request cross-subdomain cùng domain cha,
  kể cả request `app.*` gọi sang `api.*`.
- **Vẫn KHÔNG tự động** theo nghĩa "chỉ cần đăng nhập ở site tĩnh là SPA lập
  tức 'thấy' mình đã đăng nhập" — cookie `httpOnly` vốn KHÔNG đọc được bằng
  JS (đúng mục đích chống XSS), và trạng thái `isLoggedIn`/`user` của SPA
  (`AuthContext`) vẫn đọc từ `localStorage` của CHÍNH origin `app.*` (rỗng
  nếu chưa từng đăng nhập TRỰC TIẾP trên SPA). Phải có 1 bước BOOTSTRAP chủ
  động: `AuthContext` (`src/context/AuthContext.tsx`) lúc mount, NẾU
  `localStorage` của `app.*` rỗng, tự gọi `api.auth.bootstrapFromCookie()`
  (`GET /auth/me` với `auth: false, retry: false` — không gắn header vì
  không có token cục bộ, không để 401 kích hoạt `refreshTokenOnce()`/
  `redirectToLogin()` của `request()` thường, vì 401 ở đây là ca BÌNH THƯỜNG
  "chưa đăng nhập ở đâu cả", không phải lỗi phiên giữa chừng) — cookie
  (nếu hợp lệ) tự được trình duyệt gửi kèm, backend xác thực qua đó, trả về
  đúng user, `AuthContext` lưu lại vào `localStorage` của `app.*` NGAY. Từ
  lần tải trang sau, `app.*` đã có sẵn user trong storage, không cần bootstrap
  lại (cho tới khi cookie hết hạn — `JWT_ACCESS_TTL_MINUTES`, mặc định 15
  phút, KHÔNG có cơ chế tự làm mới cookie ngoài việc gọi lại
  `/auth/login`/`/auth/refresh`/`/auth/change-password`).
- **`isBootstrapping`** (context value mới, `true` cho tới khi bootstrap xong
  HOẶC ngay lập tức `false` nếu `app.*` vốn đã có user) — `ProtectedRoute.tsx`
  PHẢI chờ giá trị này về `false` trước khi kết luận "chưa đăng nhập" (return
  `null`, không vẽ gì, trong lúc chờ — thường dưới 1 lượt round-trip mạng),
  nếu không sẽ đá NHẦM người dùng đã đăng nhập (ở site tĩnh) ra `/login` ngay
  cả khi cookie sắp xác nhận thành công. `LoginPage.tsx`'s effect "đã đăng
  nhập rồi thì đá đi luôn" cũng phải đợi `isBootstrapping` xong mới chạy,
  cùng lý do.
- **Chỉ hoạt động cross-subdomain khi dev qua domain giả** (`agrichain.local`/
  `app.agrichain.local`/`api.agrichain.local`, hosts file trỏ `127.0.0.1` —
  xem `agrichain/CLAUDE.md` mục "Kết nối backend") **HOẶC** production thật
  (`agrichain.org.vn`/`app.agrichain.org.vn`, chưa deploy). Dev qua
  `127.0.0.1`/`localhost` như trước (chưa cấu hình hosts file) thì
  `COOKIE_DOMAIN` không áp dụng được (`127.0.0.1` là địa chỉ IP, trình duyệt
  không chấp nhận `Set-Cookie: Domain=` cho IP) — cookie vẫn được set nhưng
  chỉ same-origin, bootstrap sẽ luôn thất bại (401, không có cookie nào tới
  nơi) — quay lại đúng hành vi CŨ (2 phiên tách biệt, mô tả ở đoạn dưới).
- **Đăng xuất VẪN chưa đồng bộ 2 chiều** — đăng xuất ở SPA xoá cookie (backend
  `_clear_auth_cookie()`) NHƯNG site tĩnh (nếu đang mở ở tab khác) không tự
  biết để xoá `localStorage`/vẽ lại UI của NÓ; ngược lại cũng vậy. Đây là hạn
  chế còn lại, ngoài phạm vi lần thêm cookie 2026-09-25.
- **Refresh token CHƯA từng vào cookie** (chỉ access token) — hạn 15 phút của
  cookie hết thì phải đăng nhập lại thật (không có `refresh_token` nào để
  "làm mới ngầm" từ phía không sở hữu nó ban đầu). Site tĩnh và SPA vẫn tự
  giữ `refresh_token` RIÊNG của chính phiên đăng nhập nó tạo ra — bootstrap
  chỉ mượn được access token qua cookie, không mượn được khả năng tự làm mới
  dài hạn.

Xem `agrichain/CLAUDE.md` mục "Kết nối backend" → "Cookie httpOnly dùng
chung phiên đăng nhập" và `agrichain-api/CLAUDE.md` mục "Cookie httpOnly
chứa access token" để biết đầy đủ chi tiết backend + hướng dẫn dev qua hosts
file.

**✅ Giải pháp TẠM trước đó (2026-09-22, vẫn còn nguyên): SPA có trang
`/login` RIÊNG** — xem mục "Trang `/login`" bên dưới. Đây là lớp DỰ PHÒNG khi
bootstrap-qua-cookie thất bại (dev qua `127.0.0.1`/`localhost`, hoặc cookie
đã hết hạn) — người dùng vẫn đăng nhập lại được TRỰC TIẾP trên SPA, không bị
"vòng lặp không vào được trang" như trước khi có trang `/login` này.

## Sidebar cũ trỏ sang đây — `js/app-config.js` + `data-app-link`

Vì URL sang SPA giờ khác nhau THẬT SỰ giữa dev/prod (localhost:5173 vs
`https://app.agrichain.org.vn`, không phải build-time constant như phía
`app/`), và site tĩnh KHÔNG có build step để nạp `.env` kiểu Vite, mỗi mục
tương ứng 1 route đã migrate trong sidebar (hoặc menu tài khoản, xem ngoại
lệ "Hồ sơ" bên dưới) của **ĐỦ 16 trang `.html` app-shell** (kể cả 8 trang
CHÍNH nó — `nong-trai.html`/`vat-tu.html`/`mau-quy-trinh.html`/
`tai-khoan.html`/`lo-hang.html`/`ho-so.html`/`goi-phan-mem.html`/
`lich-su-mua-goi.html`) dùng cơ chế:

```html
<a class="app-nav__link" href="#" data-app-link="nong-trai">
<!-- hoặc -->
<a class="app-nav__link" href="#" data-app-link="vat-tu">
<!-- hoặc -->
<a class="app-nav__link" href="#" data-app-link="mau-quy-trinh">
<!-- hoặc -->
<a class="app-nav__link" href="#" data-app-link="tai-khoan">
<!-- hoặc -->
<a class="app-nav__link" href="#" data-app-link="lo-hang">
<!-- hoặc -->
<a class="app-nav__link" href="#" data-app-link="goi-phan-mem">
<!-- hoặc -->
<a class="app-nav__link" href="#" data-app-link="lich-su-mua-goi">
```

**Ngoại lệ vị trí — "Hồ sơ" (`ho-so`, 2026-09-23) nằm trong MENU TÀI KHOẢN
(`.user-menu__item`, bấm avatar ở topbar), KHÔNG phải `.app-nav__link` trong
sidebar** như 5 mục còn lại — cùng cơ chế `data-app-link`/`href="#"`/
`wireAppLinks()` hệt nhau, chỉ khác vị trí trong DOM:
```html
<a class="user-menu__item" href="#" data-app-link="ho-so">
```
`js/app-shell.js`'s `updatePlatformAdminOnlyNav()`/`updateDistributorOnlyNav()`
KHÔNG có selector nào tham chiếu `href="ho-so.html"` (khác bug đã gặp ở
`tai-khoan` — xem mục "Trang `/tai-khoan`" phía CLAUDE.md gốc), nên đổi link
này KHÔNG kéo theo phải vá thêm gì ở `js/app-shell.js`.

**Ngoại lệ khác — `nong-trai-chi-tiet.html`**: mục "Nông trại" ở sidebar
trang này GIỮ NGUYÊN `aria-current="page"` (khác `nong-trai.html` tự trỏ về
CHÍNH nó, đã bỏ `aria-current`) — ý nghĩa gốc là đánh dấu mục CHA đang active
khi xem trang chi tiết 1 nông trại (khác hẳn "đang đứng đúng trang này"),
không đụng gì thêm ngoài `href`/`data-app-link` giống các trang còn lại. Chỉ
`.app-nav__link` (sidebar) đổi — `.app-topbar__brand`/`.breadcrumb__link` ở
các trang `.html` KHÁC vẫn trỏ thẳng `nong-trai.html` tĩnh như cũ (KHÔNG đổi,
đúng phạm vi "chỉ 1 dòng sidebar/menu tài khoản" — trang `nong-trai.html`
thật vẫn còn nguyên nên các link đó vẫn hoạt động đúng, chỉ không đi qua SPA).

— `href="#"` chỉ là fallback tĩnh, được **`js/app-config.js`** (file MỚI,
nạp SAU `js/api-config.js`, CHỈ ở 16 trang app-shell — xem CLAUDE.md gốc)
gán lại đúng URL lúc `DOMContentLoaded`, tự nhận diện dev/prod qua
`location.hostname` (mở qua Live Server/`localhost` thì trỏ
`http://localhost:5173`, mở ở domain thật thì trỏ
`https://app.agrichain.org.vn`) — vì site tĩnh không "build ra 2 bản" được
như `app/`, đây là cách gần nhất để có hành vi tương đương.

Thêm 1 route SPA mới thì **chỉ cần thêm `data-app-link="<route>"`** vào
đúng `<a>` tương ứng trong 16 trang `.html` — KHÔNG phải sửa
`js/app-config.js` (hàm `wireAppLinks()` tự quét mọi `[data-app-link]`, bất
kể nằm trong sidebar hay menu tài khoản).

`nong-trai.html`/`vat-tu.html`/`mau-quy-trinh.html`/`tai-khoan.html`/
`lo-hang.html`/`goi-phan-mem.html`/`lich-su-mua-goi.html` không còn
`aria-current="page"` ở đúng mục sidebar của chính nó (link không còn trỏ
về chính nó nữa) — riêng `ho-so.html` mục "Hồ sơ" trong menu tài khoản CHƯA
TỪNG có `aria-current="page"` ở bản gốc (menu tài khoản không đánh dấu
"đang đứng trang nào"), nên không có gì phải bỏ.

## Vì sao KHÔNG copy css/icons vào app/

`src/main.tsx` import thẳng 4 file CSS gốc qua đường dẫn tương đối
(`../../css/tokens.css`...) — Vite gộp NGUYÊN VĂN vào bundle CSS của SPA,
không có bản sao nào cả, sửa `css/components.css` ở gốc repo là SPA tự thấy
ngay (chạy lại `npm run dev`/`npm run build`). Tương tự, `src/icons.tsx`
import `icons/sprite.svg` VÀ `icons/exabyte-icon-only-transparent.png` qua
hậu tố **`?url`** — Vite coi đây là asset tĩnh, đọc thẳng từ đĩa lúc dev,
copy kèm hash lúc build — KHÔNG publicDir, KHÔNG copy tay. (Lưu ý: đây là
import module JS, KHÁC hẳn `mainSiteUrl()` — asset tĩnh của CHÍNH SPA thì
bundle qua Vite, còn LINK sang 1 TRANG khác ở site tĩnh thì mới dùng
`mainSiteUrl()`, xem mục "Giả định host".)

Cơ chế `?url` này cần `vite.config.ts`'s `server.fs.allow` liệt kê tường
minh thư mục gốc repo (`staticSiteRoot`) — vì Vite mặc định CHỈ cho đọc file
bên trong project root (`app/`), còn 2 import trên đọc file NGOÀI `app/`.

## Chạy thử

Vì kiến trúc là 2 origin thật sự khác nhau, **chạy 2 server riêng biệt** để
test đúng thực tế (khác bản trước — bản đó có 1 mẹo gộp chung 1 origin lúc
dev, đã BỎ vì gây hiểu lầm sai kiến trúc thật, xem git history của
`vite.config.ts` nếu cần đối chiếu):

```bash
# Terminal 1 — site tĩnh, ĐÚNG cổng app/.env đang trỏ tới
#   VS Code: chuột phải index.html (hoặc dang-nhap.html) -> "Open with Live Server"
#   -> mặc định http://127.0.0.1:5500

# Terminal 2 — SPA
cd app
npm install
npm run dev      # http://localhost:5173/nong-trai (mặc định), /vat-tu, /mau-quy-trinh
```

**Do hệ quả ở mục "Giả định host" ở trên (phiên không dùng chung được giữa 2
origin)**, bấm link "Vật tư" từ site tĩnh (đã đăng nhập bên đó) sang SPA sẽ
KHÔNG tự vào được — SPA đưa tới `/login` của chính nó (route nội bộ, xem mục
"Trang `/login`"), cần đăng nhập LẦN NỮA ở đây bằng CHÍNH tài khoản đó. Đây
là hành vi ĐÚNG với kiến trúc hiện tại (dù chưa hoàn thiện — 2 phiên tách
biệt), không phải bug của cách chạy thử.

```bash
npm run build     # tsc -b && vite build -> app/dist, đọc app/.env.production
                   # (VITE_MAIN_SITE_URL=https://agrichain.org.vn)
npm run preview   # xem thử bản build
npm run lint       # chỉ type-check (tsc -b --noEmit), CHƯA có ESLint
```

`.env.local` (copy từ `.env.example`, không commit) đặt `VITE_API_BASE_URL`
để trỏ về backend chạy local (`http://127.0.0.1:8000`) thay vì domain
production mặc định trong `src/api/config.ts` — biến này ĐỘC LẬP với
`VITE_MAIN_SITE_URL` (2 mục đích khác nhau: 1 cái là domain backend API, 1
cái là domain site tĩnh chứa các trang chưa migrate).

## Cách gọi API — `import { api } from '../api'`

Mental model giống hệt `AgriChain.api` ở bản .html cũ, chỉ đổi `import` thay
`window.AgriChain`:

```ts
import { api, ApiError } from '../../api'; // đường dẫn tuỳ độ sâu file

api.supplies.list({ q: 'PB', page: 1, page_size: 50 }).then(...).catch((err) => {
  if (err instanceof ApiError) toast(err.message); // tiếng Việt, hiển thị thẳng được
});

api.hasPermission('supplies.edit'); // đồng bộ, đọc từ user đã lưu — dùng usePermission() trong component
api.isPlatformAdmin();
```

`http.ts`'s `request<T>(method, path, options)` là lõi DÙNG CHUNG cho mọi
domain module — hành vi giữ NGUYÊN bản `js/api.js` gốc: tự gắn Bearer token,
tự refresh khi 401 (1 `refreshPromise` dùng chung, chống gọi `/auth/refresh`
song song), refresh thất bại thì xoá phiên + điều hướng về `/login` CỦA
CHÍNH SPA (`redirectToLogin()` ở `session.ts`, KHÔNG còn ra site chính nữa —
xem mục "Trang `/login`").

## AuthContext / usePermission / ProtectedRoute

- `useAuth()` (từ `src/context/AuthContext.tsx`) — `{ user, isLoggedIn,
  isBusiness, isPlatformAdmin, hasPermission, login, logout, refreshFromStorage }`.
  `login(email, password, remember)` bọc `api.auth.login()` + tự cập nhật
  state, dùng ở `LoginPage.tsx` (xem mục "Trang `/login`"). Khác bản .js gốc
  (mỗi lần chuyển trang là tải lại HTML thật, tự đọc storage mới): SPA có 2
  listener (`storage`, `pageshow`) để state React không bị LỆCH khi đăng
  nhập/đăng xuất ở tab khác **CÙNG origin SPA** (KHÔNG giải quyết được lệch
  giữa SPA và site tĩnh — xem mục "Giả định host"), hoặc bfcache khôi phục
  JS heap cũ — xem comment đầu file để hiểu đầy đủ lý do.
- `usePermission(code)` — tương đương `AgriChain.api.hasPermission(code)`,
  reactive. `platform_admin` LUÔN có `permissions = []` (role không gán
  quyền nào — xem CLAUDE.md gốc mục "Quản trị hệ thống (platform_admin)")
  nên tự động `false` với MỌI mã quyền, không cần logic chặn riêng.
- `<ProtectedRoute>` (`src/routes/ProtectedRoute.tsx`) — bọc quanh mọi route
  cần đăng nhập + tài khoản business/platform_admin (mặc định
  `requireBusinessAccount = true`, khớp 16/16 trang app-shell gốc đều gọi cả
  `requireAuth()` LẪN `requireBusiness()`). Chưa đăng nhập -> route NỘI BỘ
  `/login?redirect=<đường dẫn hiện tại>` (react-router `<Navigate>`, KHÔNG
  còn ra `dang-nhap.html` tĩnh nữa — xem mục "Trang `/login`"); đăng nhập rồi
  nhưng là `customer` -> `agriverse-3d.html` tĩnh THẬT (qua `mainSiteUrl()`,
  vì SPA không có gì cho loại tài khoản này).

## Trang `/login` (2026-09-22 — giải pháp TẠM cho pilot)

SPA có **form đăng nhập RIÊNG** (`src/pages/Login/LoginPage.tsx`), route
`/login`, **CÔNG KHAI** (không bọc `<ProtectedRoute>`, khai báo TRƯỚC mọi
route khác trong `App.tsx`). Lý do tồn tại: `app.agrichain.org.vn` và
`agrichain.org.vn` là 2 origin khác nhau, `localStorage` không chia sẻ được
— đăng nhập ở `dang-nhap.html` (site chính) KHÔNG giúp SPA nhận được token
(xem mục "Giả định host"). **`dang-nhap.html`/`dang-ky.html` ở site chính
GIỮ NGUYÊN HOÀN TOÀN, không đụng tới** — vẫn phục vụ đăng nhập cho 15 trang
`.html` chưa migrate.

- Form chỉ 2 field (email, mật khẩu) + checkbox "Ghi nhớ đăng nhập" — gọi
  THẲNG `login()` từ `useAuth()` (bọc `api.auth.login()`, xem mục
  "AuthContext"), KHÔNG viết lại logic gọi API. Markup chỉ dùng class có sẵn
  từ `components.css` (`.card`, `.field`, `.label`, `.input`, `.checkbox`,
  `.btn--primary`, `.field__error`) — không thêm CSS mới, căn giữa trang
  bằng inline style (cùng cách `VatTuPage.tsx` đã làm cho `.search-field`).
- **Đăng nhập thành công -> điều hướng theo ĐÚNG logic `redirectTarget()`/
  `defaultTargetFor()` của `js/auth.js` gốc**, port lại ở
  `src/routes/postLogin.ts` (hàm `resolvePostLoginTarget()`):
  - `account_type === 'customer'` -> **KHÔNG có gì trong SPA** (16 trang
    app-shell chỉ dành cho business/platform_admin) -> đá RA NGOÀI, full
    navigation sang `mainSiteUrl('agriverse-3d.html')` — kể cả khi
    `?redirect=` có giá trị (khớp đúng bản vá "chặn customer" của bản gốc).
  - `business`/`platform_admin`/chưa rõ -> route NỘI BỘ: dùng `?redirect=`
    nếu khớp 1 route đã biết trong `KNOWN_ROUTES` (mảng nhỏ trong
    `postLogin.ts`, PHẢI khớp các `<Route>` ở `App.tsx` — thêm route mới thì
    thêm vào đây, xem "Thêm 1 trang mới"), không thì về mặc định `/vat-tu`
    (tương đương `nong-trai.html` của bản gốc — trang đầu tiên của khu quản
    trị).
  - Validate `?redirect=` theo whitelist (`KNOWN_ROUTES`), không tin bất kỳ
    chuỗi nào đi thẳng — khác quy ước cũ (regex bắt buộc đuôi `.html`) vì
    đây là route react-router, nhưng CÙNG TINH THẦN chống open-redirect.
- Gõ thẳng URL `/login` khi ĐÃ đăng nhập sẵn (VD còn phiên cũ) -> tự đá đi
  ngay theo đúng logic trên, không hiện lại form.
- `ProtectedRoute` giờ redirect chưa-đăng-nhập TỚI ĐÂY (route nội bộ, dùng
  `<Navigate>`, không còn full-page reload) thay vì ra `dang-nhap.html` tĩnh
  — xem mục "AuthContext / usePermission / ProtectedRoute" ở trên.
- `src/api/session.ts`'s `redirectToLogin(pathname, search)` — dùng RIÊNG
  cho ca "mất phiên GIỮA CHỪNG" (refresh token hết hạn, gọi từ `http.ts`, một
  module JS thuần không có quyền dùng react-router) — điều hướng
  `window.location.href = '/login?redirect=...'` (route NỘI BỘ, cùng origin
  SPA, KHÔNG dùng `mainSiteUrl()` nữa).

## Trang `/mau-quy-trinh` (2026-09-22 — trang thứ 2 đã migrate)

Port `mau-quy-trinh.html` + `js/mau-quy-trinh.js` — danh sách **lưới thẻ**
(`.grid.grid--3`, KHÔNG phải bảng như Vật tư — `PAGE_SIZE = 12`, khác `50`
của `/vat-tu`) + modal thêm/sửa gồm `steps[]` sắp xếp được. Đây là trang đầu
tiên kéo theo 2 hạ tầng dùng chung MỚI, cả 2 đều tái dùng được cho trang
migrate sau:

- **`ACTIVITY_TYPES` — `src/enums.ts`**: `js/enums.js` là nguồn DUY NHẤT cho
  danh mục 9 loại hoạt động (đã áp dụng từ trước cho cả `js/mau-quy-trinh.js`
  lẫn `js/nong-trai-chi-tiet.js` gốc — xem CLAUDE.md gốc). File viết cho site
  TĨNH (IIFE gán `window.AgriChain.ACTIVITY_TYPES` khi nạp qua `<script>`),
  không phải ES module nên không `import` thẳng được — `enums.ts` nạp
  **source THẬT** của file qua hậu tố Vite **`?raw`** (chuỗi text, không copy
  tay 1 ký tự nào), rồi **THỰC THI đúng IIFE đó** (`new Function(source)()`
  — an toàn vì đây là file CỦA CHÍNH DỰ ÁN, không phải input người dùng),
  file tự gán kết quả vào `window.AgriChain.ACTIVITY_TYPES` y hệt lúc chạy
  trên site tĩnh (không có gì khác trong SPA đọc/ghi `window.AgriChain` nên
  không xung đột), đọc lại ngay sau đó. `js/enums.js` đổi cấu trúc/thêm loại
  hoạt động mới thì `enums.ts` tự động theo kịp, không cần sửa gì. Icon lấy
  ra GIỮ NGUYÊN tiền tố `"icon-"` như file gốc (khác quy ước các hằng số icon
  tự khai báo riêng trong `app/`, VD `pages/vat-tu/constants.ts` không có
  tiền tố) — dùng `<Icon name=.../>` thì phải tự bỏ tiền tố, xem
  `StepFields.tsx`.
- **`AgriChain.confirm()` — `src/components/ConfirmDialogProvider.tsx`**:
  hộp thoại xác nhận dùng chung, `useConfirm()` trả về `(message) =>
  Promise<boolean>`. Bản gốc mỗi trang TỰ CHỨA markup `#confirm-dialog`
  riêng trong `.html` của nó (`mau-quy-trinh.html` có, `vat-tu.html` KHÔNG
  có — trang đó tự có modal xoá riêng); bản React mount **1 LẦN trong
  `AppShell`** (giống `ToastProvider`), dùng chung cho MỌI trang đã migrate.
  Đây là lần ĐẦU TIÊN cơ chế này được port (trước đó ghi nhận "chưa port,
  chưa trang nào cần" ở mục "Nợ kỹ thuật" — `js/mau-quy-trinh.js`'s
  `handleDelete()` gọi `AgriChain.confirm()`, khác `js/vat-tu.js` tự có modal
  xoá riêng, nên MauQuyTrinhPage.tsx KHÔNG có `DeleteTemplateModal.tsx` như
  `pages/vat-tu/DeleteSupplyModal.tsx` — gọi thẳng `useConfirm()` rồi
  `api.workflowTemplates.remove()`).

Còn lại port ĐÚNG y hệt mẫu Vật tư — permission gate
(`workflow_templates.add/edit/delete/view`), chế độ chỉ-xem cho
`platform_admin` (`api.system.workflowTemplates.list()` không có `q`, cột
"Đơn vị sở hữu" trong `TemplateCard.tsx`, nút Sửa đổi icon con mắt LUÔN hiện
mở modal `readOnly` — khoá mọi input/select kể cả từng bước, ẩn nút
Lưu/"Thêm bước mới"/xoá bước/di chuyển, xem `StepFields.tsx`/
`TemplateFormModal.tsx`), lỗi tiếng Việt lấy thẳng từ backend.

**`steps[]` trong modal — mảng state React thật, KHÁC "DOM là nguồn dữ liệu"
của bản `.js` gốc** (`src/pages/mau-quy-trinh/stepForm.ts`): `TemplateStep`
(backend) KHÔNG có `id` riêng (mẫu chỉ là bản thiết kế tĩnh, chưa gắn lần
thực hiện nào — xem `api/workflowTemplates.ts`) nên mỗi bước có thêm field
**`_key`** CHỈ dùng làm React list key nội bộ, KHÔNG BAO GIỜ gửi lên backend
— `toPayloadStep()` tự bóc field này ra trước khi submit. Xoá bước cuối cùng
còn lại thì tự thêm ngay 1 bước trống thay thế (khớp bản gốc — modal không
bao giờ để danh sách bước rỗng hoàn toàn). Nút lên/xuống ở biên (bước đầu
bấm "lên", bước cuối bấm "xuống") KHÔNG làm gì (khớp `moveStep()` gốc) —
khác bản gốc có bọc thêm `disabled` trực quan ở biên (bản `.js` gốc không
disable, chỉ no-op).

`supply_id`/`instruction`/`description` rỗng gửi `null`, không phải chuỗi
rỗng (khớp `anyOf[string|null]`/`anyOf[uuid|null]` của schema backend thật —
xem `TemplateFormModal.tsx`'s `toPayloadStep()`/`handleSubmit()`).

`workflow-step.css` (CSS riêng trang, port nguyên văn khối `<style>` của
`mau-quy-trinh.html` gốc) import trực tiếp trong `TemplateFormModal.tsx` —
KHÔNG đưa vào `css/components.css` dùng chung, khớp quy ước "CSS chỉ dùng
riêng cho 1 trang thì để trong `<style>` của chính trang đó" (CLAUDE.md gốc
mục "Quy ước CSS") — chỉ khác chỗ đặt (file `.css` riêng thay vì thẻ
`<style>` inline, vì component React không có "thẻ trang" để nhúng inline).

## Trang `/nong-trai` (2026-09-22 — trang thứ 3 đã migrate)

Port `nong-trai.html` + `js/nong-trai.js` — danh sách lưới thẻ phân trang
(`PAGE_SIZE = 12`, giống Mẫu quy trình) + tìm kiếm (debounce) + modal
thêm/sửa gồm form thông tin cơ bản + 2 select phụ thuộc Tỉnh/Thành→Phường/Xã
+ bản đồ Leaflet vẽ ranh giới polygon + xoá qua `useConfirm()` (đã có từ Mẫu
quy trình) + permission gate (`farms.add/edit/delete`).

### Quyết định: Leaflet THUẦN, KHÔNG dùng `react-leaflet`

Đã cân nhắc 2 hướng trước khi code (người dùng yêu cầu ghi rõ lý do):

- **(a) `react-leaflet`** — wrapper React chính thức, idiomatic hơn nhưng
  thêm 1 dependency mới và đòi học lại toàn bộ tương tác (điểm khép kín ranh
  giới bằng cách bấm lại điểm đầu, đường nét đứt bám chuột, làm nổi bật điểm
  đầu tiên, control "Về vị trí của tôi" tự chế) theo API khai báo của
  `react-leaflet` — RỦI RO viết sai/thiếu 1 chi tiết hành vi tinh vi nào đó
  so với bản gốc.
- **(b) Leaflet thuần** (ĐÃ CHỌN) — cùng thư viện `leaflet` (npm, ghim ĐÚNG
  bản `1.9.4` như CDN bản gốc dùng, xem `package.json`), bọc trong
  `BoundaryEditor.tsx` dùng `useRef` giữ các đối tượng Leaflet (map,
  markerLayer, shapeLayer, guideLine, firstMarker — mutate trực tiếp,
  KHÔNG phải state React) + `useEffect`/`useImperativeHandle` để mount/
  unmount thủ công, gần như port NGUYÊN VĂN từng hàm của bản gốc
  (`ensureMap()`→`mountMapIfNeeded()`, `refreshShape()`→effect theo dõi
  `[points, boundaryClosed]`, `isNearFirstPoint()`, `closeBoundary()`,
  `updateGuideLine()`...). Chỉ 2 biến THẬT SỰ cần re-render UI khác
  (`points`, `boundaryClosed`) mới là state React — đường nét đứt gợi ý +
  highlight điểm đầu (tần suất cao theo mousemove, thuần hiệu ứng trực quan,
  KHÔNG tính vào diện tích) CỐ TÌNH giữ ngoài state, mutate Leaflet trực
  tiếp, khớp đúng ghi chú "KHÔNG tính vào points/geodesicArea()" của bản gốc.

  Lý do chọn theo đúng gợi ý mặc định của yêu cầu — "port hành vi 1:1, không
  viết lại logic" đã áp dụng nhất quán từ `/vat-tu`: (b) rủi ro thấp hơn hẳn
  vì gần như copy-lại-đổi-cú-pháp thay vì phải TỰ THIẾT KẾ LẠI cách diễn đạt
  từng tương tác qua API khai báo của thư viện khác. Đánh đổi: `BoundaryEditor.tsx`
  vẫn còn vài chỗ "không React" thật sự (thao tác DOM trực tiếp qua
  `marker.getElement()` để đổi màu highlight, gọi `L.DomUtil`/`L.DomEvent`
  để tự dựng 1 Leaflet Control) — CHẤP NHẬN ĐƯỢC, đây là ranh giới tự nhiên
  giữa 2 thư viện, không phải code cẩu thả.

`js/map-layers.js`'s `addMapBaseLayers()` (3 lớp nền: vệ tinh/địa hình/mặc
định) **KHÔNG dùng kỹ thuật `?raw` + thực thi như `enums.ts`** — transcribe
trực tiếp sang `mapLayers.ts` (nhận thêm tham số `leaflet: typeof L` vì
component dùng `import * as L from 'leaflet'`, không có `window.L` toàn cục
như site tĩnh). Lý do khác `enums.ts`: đây chỉ là 3 URL tile tĩnh + chữ
attribution (dữ liệu cấu hình, không phải danh mục có thể mở rộng theo thời
gian như `ACTIVITY_TYPES`), và việc "threading" biến toàn cục `L` qua cơ chế
thực thi IIFE giả lập sẽ phức tạp hơn lợi ích mang lại. Nếu `js/map-layers.js`
đổi URL/thêm lớp nền mới, sửa đồng thời cả 2 nơi.

### `useCascadingSelect` — port `js/location-select.js`

`src/hooks/useCascadingSelect.ts` — hook dùng chung (KHÔNG đặt riêng trong
`pages/nong-trai/`) vì bản gốc `AgriChain.setupCascadingSelect()` CỐ TÌNH
dùng chung cho CẢ Tỉnh/Thành→Phường/Xã (`nong-trai.js`) LẪN Nông trại→Mùa vụ
(`lo-hang.js`, CHƯA migrate) — giữ đúng vị trí `hooks/` để dùng lại được khi
`lo-hang.html` migrate sau này, đừng tạo bản thứ 2 trong `pages/lo-hang/` lúc
đó. Trả về `{ children, childValue, setChildValue, status, refresh }` —
`status` (`'no-parent'|'loading'|'ready'|'error'`) thay cho cách bản gốc tự
đổi `<option>` placeholder bằng tay; nơi gọi tự map `status` sang text hiển
thị (xem `WARD_PLACEHOLDER` trong `FarmFormModal.tsx`).

### `data/provinces.json` + `data/wards/{code}.json` — ĐÃ ĐỔI NGUỒN sang backend (2026-09-23), không còn `mainSiteUrl()`

**Lịch sử quyết định**: bản đầu tiên (2026-09-22) `locationData.ts` gọi
`fetch(mainSiteUrl('data/provinces.json'))`/`fetch(mainSiteUrl('data/wards/'
+ code + '.json'))` — cùng helper mọi liên kết ra ngoài SPA khác đã dùng,
nhưng là lần ĐẦU TIÊN trong `app/` dùng `mainSiteUrl()` cho 1 lệnh gọi
**AJAX** (`fetch()`) thay vì chỉ điều hướng (`<a href>`/`window.location`) —
khác biệt quan trọng: điều hướng KHÔNG BAO GIỜ bị trình duyệt chặn bởi CORS,
`fetch()` THÌ CÓ. Test thật (2026-09-23) xác nhận đúng là **lỗi CORS thật**:
VS Code Live Server (`http://127.0.0.1:5500`) không tự gửi header
`Access-Control-Allow-Origin` cho phép `http://localhost:5173` (origin của
Vite dev server) đọc — dropdown "Tỉnh/Thành phố" rỗng kèm lỗi CORS trong
Console.

**Đã cân nhắc 2 hướng sửa, chọn hướng (b)**:
- (a) Cấu hình `liveServer.settings.headers` (VS Code Live Server CÓ hỗ trợ
  set `Access-Control-Allow-Origin` qua `.vscode/settings.json`) — bị loại vì
  chỉ sửa được môi trường DEV, production vẫn cần cấu hình CORS riêng ở đúng
  host tĩnh thật (chưa chọn), tạo 2 lần cấu hình CORS rời rạc cho cùng 1 vấn
  đề.
- **(b) Backend (`agrichain-api`) phục vụ tĩnh 2 route MỚI** —
  **`GET /static/locations/provinces.json`** và
  **`GET /static/locations/wards/{code}.json`** — ĐÃ CHỌN: tận dụng
  `CORS_ORIGINS` đã cấu hình sẵn cho API (dùng chung cho MỌI client gọi API,
  không phân biệt dev/prod), đúng luôn cho cả 2 môi trường mà không cần sửa
  gì thêm ở phía SPA khi đổi `.env`/`.env.production`. Đánh đổi: backend giờ
  phải tự giữ 1 bản dữ liệu hành chính (copy từ `data/` của repo tĩnh) —
  ngoài phạm vi tài liệu này, xem `agrichain-api/CLAUDE.md` nếu cần biết
  backend đọc/đồng bộ 2 file này thế nào.

`locationData.ts` giờ gọi thẳng
`fetch(\`${API_BASE_URL}/static/locations/provinces.json\`)`/
`fetch(\`${API_BASE_URL}/static/locations/wards/${provinceCode}.json\`)` —
dùng **`API_BASE_URL`** (`src/api/config.ts`), **KHÔNG còn `mainSiteUrl()`**
cho 2 file này — dữ liệu giờ đến từ BACKEND, không phải "site chính" nữa,
nên không đi qua helper dành riêng cho link/asset của site tĩnh.

**⚠️ Nợ kỹ thuật có chủ đích — 2 nguồn dữ liệu hành chính song song, tạm
thời**: `js/nong-trai.js` và `js/thuong-mai-tong-quan.js` (2 trang site tĩnh
CHƯA migrate) **vẫn đọc trực tiếp `data/provinces.json`/`data/wards/{code}.json`
CÙNG ORIGIN với chính chúng** (không qua `mainSiteUrl()`, không có lỗi CORS
gì vì fetch cùng origin) — **CỐ TÌNH không đổi 2 file này**, ngoài phạm vi
lần sửa. Từ nay dự án có 2 nguồn cho cùng 1 dữ liệu (file tĩnh cho site cũ,
route backend cho SPA mới) — tình trạng này sẽ tự biến mất khi
`nong-trai.html` gốc và `thuong-mai-tong-quan.html` lần lượt được migrate
sang SPA và dùng chung nguồn `API_BASE_URL` này, không cần dọn gì chủ động
trước đó.

### ⚠️ Sai khác so với yêu cầu ban đầu: KHÔNG có "nút mắt mở modal readonly" cho `platform_admin`

Yêu cầu ban đầu (dựa theo đúng mẫu `/vat-tu`, `/mau-quy-trinh`) muốn nút Sửa
đổi thành icon con mắt LUÔN hiện cho `platform_admin`, mở modal ở chế độ chỉ
xem. **Sau khi đọc lại `js/nong-trai.js`'s `farmCard()` gốc, phát hiện trang
Nông trại KHÔNG có cơ chế này** — khác hẳn 2 trang kia:

- Nút Sửa ở `farmCard()` gốc CHỈ gate qua `if
  (!api.hasPermission('farms.edit')) editButton.hidden = true;` — KHÔNG có
  nhánh `isPlatformAdminMode` nào riêng. `platform_admin` không có quyền
  nào (permissions rỗng) nên nút này **ẨN HẲN**, y hệt các trang danh sách
  KHÁC dùng permission thường (không phải ngoại lệ như `/vat-tu`/
  `/mau-quy-trinh`).
- Lý do: **Nông trại đã có `nong-trai-chi-tiet.html` RIÊNG để xem** (chưa
  migrate, ngoài phạm vi lần này) — `farmCard()` dựng thẻ LUÔN LÀ 1 `<a>`
  (`card = el('a', ...)`) trỏ `nong-trai-chi-tiet.html?id=<uuid>` (cho
  `platform_admin`, route đó ĐÃ hỗ trợ đọc xuyên Đơn vị — xem CLAUDE.md gốc
  mục "Trang chi tiết nông trại... cho platform_admin") hoặc `?ma=<mã>` (cho
  business) — nút "Xem chi tiết" (icon mắt) LUÔN hiện nhưng chỉ là TRANG
  TRÍ, ăn theo việc bấm bất kỳ đâu trên thẻ cũng điều hướng (đúng ghi chú
  gốc: "Không cần bắt sự kiện riêng... nút này nằm trong `<a>`"). Với
  `/vat-tu`/`/mau-quy-trinh`, KHÔNG có trang chi tiết riêng nào — nút mắt
  readonly-modal là CÁCH DUY NHẤT `platform_admin` xem được dữ liệu không
  lọt hết ra bảng/thẻ tóm tắt (VD `steps[]` đầy đủ của mẫu quy trình).

`FarmCard.tsx` port ĐÚNG hành vi gốc: cả thẻ luôn là `<a href={mainSiteUrl(
'nong-trai-chi-tiet.html?...')}>` (trang tĩnh CHƯA migrate, không đụng),
nút mắt luôn hiện (trang trí), nút Sửa CHỈ gate qua `canEdit` (không có
`isPlatformAdminMode` override) — `FarmFormModal.tsx` vì vậy KHÔNG có mode
`'view'`/`readOnly` nào cả (khác `SupplyFormModal`/`TemplateFormModal`, chỉ
có `'create'`/`'edit'`). Nếu sau này MUỐN thêm khả năng xem nhanh (không qua
`nong-trai-chi-tiet.html`) cho `platform_admin`, đây là tính năng MỚI ngoài
phạm vi port, cần quyết định riêng.

### ⚠️ Bug đã vá — bản đồ Leaflet chỉ tải tile góc trên-trái + toạ độ bấm bị lệch (2026-09-23)

Xác nhận qua test tay ở modal "Thêm nông trại mới": mở modal lần đầu, bản đồ
chỉ tải đúng 1 ô tile ở góc trên-trái (phần còn lại xám), bấm các điểm gần
nhau trên màn hình nhưng `lat`/`lng` tính ra cách xa nhau bất thường. Đây là
lỗi kinh điển của Leaflet khi `L.map(container, {center, zoom})` được gọi
lúc `container` có kích thước `0×0` (constructor gọi `setView()` ngay lúc
đó, tính sai `_pixelOrigin` — sai lệch này KHÔNG tự phục hồi chỉ bằng
`invalidateSize()` gọi sau đó nếu bản thân map đã được TẠO trong lúc ẩn).

**Nguyên nhân gốc — nằm ở 2 file, không chỉ ở nơi gọi `L.map()`**:
- `BoundaryEditor.tsx`'s `mountMapIfNeeded()` (dòng gọi `L.map(...)`) chỉ tạo
  map **ĐÚNG 1 LẦN** (guard `if (mapRef.current) return`) — đúng ý định gốc
  (map sống suốt vòng đời modal, không tạo lại mỗi lần mở), nhưng vì vậy nếu
  lần tạo ĐẦU TIÊN đó rơi đúng lúc container ẩn, lỗi sẽ tồn tại vĩnh viễn cho
  mọi lần mở sau.
- `FarmFormModal.tsx`'s effect `useEffect(..., [farm, mode, suggestedCode])`
  (nơi gọi `ensureMapReady()`, nơi RỐT CUỘC dẫn tới `mountMapIfNeeded()`) có
  **2 lỗi thời điểm cộng dồn**:
  1. Effect này CŨNG chạy ngay lúc `FarmFormModal` MOUNT (giá trị mặc định
     `farm=null`/`mode='create'`) — TRƯỚC KHI người dùng bấm mở modal lần
     nào, lúc `<dialog>` vẫn đóng (`container` đo ra `0×0`) — đây là lần gọi
     `ensureMapReady()` làm hỏng map ngay từ đầu.
  2. Bấm "Thêm nông trại" làm hành động ĐẦU TIÊN trên trang (`farm`/`mode`
     giữ nguyên `null`/`'create'`, TRÙNG HỆT giá trị mặc định lúc mount) làm
     React **bỏ qua** việc chạy lại effect (so sánh dependency bằng
     `Object.is`, coi `null === null` và `'create' === 'create'` là "không
     đổi") — `ensureMapReady()` (và do đó `invalidateSize()`) hoàn toàn
     KHÔNG được gọi lại cho lần mở THẬT SỰ đó, dù `<dialog>` lúc này đã
     hiển thị với kích thước đúng.

**Đã vá bằng 2 thay đổi phối hợp**:
1. **`useDialog.ts`** (hook dùng chung, KHÔNG chỉ riêng `/nong-trai`) — thêm
   state `openCount`, tăng lên mỗi lần `open()` được gọi THẬT (bên trong
   cùng hàm gọi `showModal()`). Trả thêm ra `{ ref, open, close, openCount }`
   — bất kỳ trang nào khác dùng `useDialog()` sau này gặp cùng lớp bug "effect
   phụ thuộc dependency không đổi giá trị nhưng vẫn cần chạy lại mỗi lần mở"
   đều tận dụng lại được field này ngay, không cần tự nghĩ lại cơ chế.
2. **`FarmFormModal.tsx`** — nhận thêm prop `openToken` (truyền
   `formModal.openCount` từ `NongTraiPage.tsx`), thêm vào dependency array
   của effect (`[farm, mode, suggestedCode, openToken]`) — đảm bảo effect
   LUÔN chạy lại đúng 1 lần cho MỖI lần `open()` thật, bất kể `farm`/`mode`
   có đổi giá trị hay không. Đồng thời bọc thêm `if (dialogRef.current?.open)`
   quanh khối gọi `ensureMapReady()` (cả ở ngoài lẫn trong
   `requestAnimationFrame`) — chặn hẳn việc gọi `ensureMapReady()` khi
   `<dialog>` chưa thật sự mở (ca effect chạy lúc MOUNT), không để
   `mountMapIfNeeded()` có cơ hội tạo map với container `0×0` nữa.

Không cần sửa `BoundaryEditor.tsx` — `mountMapIfNeeded()`/`ensureMapReady()`
ở đó vốn đã đúng ý định (`invalidateSize()` sau khi mount, guard tạo map 1
lần); vấn đề chỉ nằm ở CHỖ GỌI (thời điểm + tần suất), không nằm ở logic
Leaflet.

**⚠️ CHƯA xác minh lại bằng trình duyệt thật sau khi vá** (ngoài khả năng
của phiên làm việc — xem CLAUDE.md gốc mục "Kiểm thử giao diện", không tự
cài công cụ trình duyệt tự động) — người dùng tự test: mở modal "Thêm nông
trại mới" làm hành động ĐẦU TIÊN trên trang (không bấm gì trước, đúng ca đã
gây lỗi), xác nhận bản đồ tải tile phủ đủ khung nhìn + bấm 3-4 điểm gần nhau
cho ra toạ độ gần nhau tương ứng trong "Danh sách toạ độ", rồi cập nhật mục
này. Không có dữ liệu nông trại test sai nào bị lưu lại phía backend trong
lúc chẩn đoán lỗi này (lỗi chỉ xảy ra ở bước VẼ ranh giới trên bản đồ, trước
khi submit form) — không cần dọn gì thêm.

### Field/polygon — validate y hệt bản gốc, không nới lỏng

`polygon` NOT NULL, tối thiểu 3 điểm (`FarmCreate`/`FarmUpdate`, xác nhận qua
`/openapi.json` — xem CLAUDE.md gốc) — nhưng riêng ở modal, KHÔNG chỉ cần đủ
3 điểm mà phải đã **KHÉP KÍN thật sự** (bấm lại điểm đầu tiên, hoặc "Hiển
thị" từ toạ độ nhập tay) mới coi là hợp lệ — đường mở dù đủ điểm vẫn CHƯA
phải 1 ranh giới hoàn chỉnh, khớp `boundaryClosed` + thông báo lỗi
"`Vẽ ít nhất 3 điểm rồi bấm lại vào điểm đầu tiên...`" của bản gốc
(`FarmFormModal.tsx`'s `validate()`). `geodesicArea()`/`hectares()`/
`formatHectares()` (`geo.ts`) port NGUYÊN công thức lượng giác cầu — KHÔNG
viết lại thuật toán, chỉ đổi cú pháp sang TypeScript.

Toạ độ của 1 điểm ĐÃ đặt (từ bấm bản đồ/"Hiển thị") hiện trong danh sách qua
`<input readOnly>` — khớp đúng bản gốc: `buildCoordRow()` chỉ gắn listener
cập nhật giá trị cho dòng NHÁP (`pendingRows`, qua "Thêm điểm"), dòng đã
thuộc `points` hiện giá trị nhưng KHÔNG có xử lý sửa trực tiếp (chỉ xoá +
đặt lại qua bản đồ/nhập thủ công) — `readOnly` ở bản React chỉ là cách diễn
đạt tường minh hơn cho ĐÚNG hành vi đó (tránh cảnh báo "controlled input
without onChange" của React), không phải thay đổi hành vi.

## Trang `/tai-khoan` (2026-09-23 — trang thứ 4 đã migrate)

Port `tai-khoan.html` + `js/tai-khoan.js` — trang **PHỨC TẠP HƠN HẲN** 3 trang
trước (RBAC theo vai trò + ma trận phân quyền 9×4 + nhường quyền quản trị).
Làm THEO 4 BƯỚC tuần tự, mỗi bước được xác nhận qua test tay thật trước khi
làm bước kế — không port dồn 1 lần như 3 trang trước, vì đây là **trang rủi
ro bảo mật cao nhất trong toàn SPA** (RBAC sai = lộ quyền hoặc khoá nhầm tài
khoản).

**⚠️ Đọc mục này trước khi đụng vào bất kỳ file nào trong `pages/tai-khoan/`
— sai 1 dòng ở `PermissionModal.tsx`/`permissionMatrix.ts` có thể khiến 1
vai trò bị cấp/thu hồi nhầm quyền cho MỌI người dùng đang giữ vai trò đó,
không chỉ 1 tài khoản.**

### Bước 1 — API layer + đọc/hiển thị + chặn `platform_admin`

`api/users.ts`/`api/roles.ts`/`api/permissions.ts` (mới) — khuôn CRUD chuẩn,
port 1:1 `api.users.*`/`api.roles.*`/`api.permissions.*` của `js/api.js` gốc.
**`role_id` là SỐ NGUYÊN** (khác UUID của farms/supplies/batches/...) — bản
gốc dùng `Number(data.get('roleId'))` và so sánh `role.id === user.role_id`
KHÔNG ép kiểu, xác nhận qua chính code gốc. Đã sửa lại `User.role_id` trong
`api/types.ts` từ `string` (khai sai lúc scaffold `/vat-tu`, chưa ai dùng tới
nên chưa lộ ra) sang `number`.

`TaiKhoanPage.tsx` tách thành 2 component: `TaiKhoanPage()` (kiểm
`isPlatformAdmin` NGAY ĐẦU, return sớm `.empty-state` "Không áp dụng cho tài
khoản Quản trị hệ thống" nếu đúng — **không gọi bất kỳ API nào**, khớp
nhánh đầu `DOMContentLoaded` gốc, tránh 403 hàng loạt vì role `platform_admin`
không có permission nào) và `TaiKhoanBusinessView()` (toàn bộ hook thật —
tách riêng để KHÔNG vi phạm rule-of-hooks, vì nhánh return sớm ở trên phải
đứng TRƯỚC mọi lời gọi hook của luồng business).

**"Danh sách vai trò" nêu trong yêu cầu ban đầu KHÔNG có khu vực hiển thị
riêng** — đã xác nhận `tai-khoan.html` gốc không có bảng/danh sách vai trò
độc lập nào (vai trò chỉ xuất hiện trong `<select>` của modal và trong
`PermissionModal.tsx`) — không tự bịa thêm UI mới ngoài phạm vi port.

### Bước 2 — CRUD người dùng

`UserModal.tsx` (Thêm, `POST /users`, bắt buộc chọn `role_id`),
`EditUserModal.tsx` (Sửa — **modal RIÊNG** với Thêm vì `UserUpdate` không có
`email`/`password`), `ResetPasswordModal.tsx` (`POST /users/{id}/reset-password`
— quản trị viên đặt thẳng mật khẩu mới, không cần mật khẩu cũ, khác đổi mật
khẩu CHÍNH mình ở `ho-so.html` CHƯA migrate). Vô hiệu hoá (`DELETE
/users/{id}`) đi qua `useConfirm()` có sẵn, không phải modal riêng.

**`components/PasswordField.tsx`** (mới, dùng CHUNG — không đặt trong
`pages/tai-khoan/`) — port `js/password-field.js` (nút hiện/ẩn + 4 điều kiện
mật khẩu). Cả 3 modal (`UserModal`/`EditUserModal` dùng nó gián tiếp qua
`UserModal`/`ResetPasswordModal`) đều dùng `openToken` (từ `useDialog()`'s
`openCount`, cơ chế thêm khi vá bug bản đồ Leaflet ở `/nong-trai`) làm
dependency của effect nạp lại vai trò/reset form — **bắt buộc**, vì bấm mở
modal Thêm làm hành động ĐẦU TIÊN trên trang (giá trị mặc định trùng lần
mount) sẽ khiến React bỏ qua effect nếu chỉ dựa vào props không đổi giá trị,
cùng lớp bug đã gặp ở `/nong-trai`.

### Bước 3 — Ma trận phân quyền (RỦI RO CAO NHẤT)

`pages/tai-khoan/permissionMatrix.ts` — logic THUẦN (không đụng DOM):
`groupPermissions()` tự nhóm 36 mã quyền theo TIỀN TỐ (`PREFIX_ORDER`, 9
hàng: batches/farms/certifications/seasons/supplies/logs/workflow_templates/
roles/users), **KHÔNG dùng `group_name`** — backend gộp chung `roles.*` và
`users.*` vào 1 `group_name` ("Quản lý đơn vị"), dùng thẳng sẽ phá vỡ giả
định "1 checkbox = 1 mã quyền".

**`computeManagedCodes()`** — điểm dễ sai nhất: CHỈ tính mã quyền THẬT SỰ
khớp 1 trong 4 `ACTIONS` (view/add/edit/delete) là "managed", KHÔNG PHẢI mọi
mã có mặt trong `group.permissions` — khớp đúng `managedCodes[permission.code]
= true` chỉ chạy trong nhánh `if (permission)` của `permissionRow()` gốc.
`handlePermissionSave()` ghép `keptCodes` (quyền hiện có CỦA VAI TRÒ nhưng
KHÔNG "managed") với `checkedCodes` (đang tick trong lưới) trước khi
`PATCH /roles/{id}` — route này THAY THẾ TOÀN BỘ `permissions`, thiếu bước
ghép này sẽ xoá nhầm quyền không hiển thị trên UI.

`role.is_system=true` — khoá TOÀN BỘ checkbox (kể cả ô đã tick sẵn), ẩn nút
Lưu hoàn toàn (không chỉ disable), hiện notice cảnh báo — backend chặn
`PATCH /roles/{id}` sửa `permissions` của vai trò này (409 CONFLICT).

**`permission-table.css`** (mới) — port nguyên văn khối `<style>` của
`tai-khoan.html` gốc (table-layout: fixed, canh giữa checkbox/icon, tooltip
lật xuống dưới cho hàng tiêu đề) — phát hiện khi làm bước này: CSS đó nằm
trong `<style>` của file `.html`, SPA không tự có, thiếu file này bảng phân
quyền vỡ layout (4 cột quyền không đều nhau).

**2 chiều Xem/hành động khác** (`handleToggle()`) — đã XÁC NHẬN đây là port
1:1 từ `syncViewPermission()` sẵn có trong bản gốc (`js/tai-khoan.js`, có
comment giải thích rõ "Thêm/Sửa/Xoá không có nghĩa nếu không xem được"),
KHÔNG PHẢI logic tự thêm ngoài phạm vi port — tắt Xem thì tắt luôn Thêm/Sửa/
Xoá của hàng đó; bật 1 trong 3 cái đó thì tự bật Xem theo.

**Checklist test tay đã dùng để xác nhận Bước 3 (rủi ro bảo mật)**:
1. `is_system` → checkbox + nút Lưu đều khoá, 2 notice hiện đúng.
2. Có `roles.view` không có `roles.edit` → xem được ma trận, nút Lưu ẩn.
3. Lưu quyền có tác dụng THẬT lên toàn hệ thống (kiểm chứng qua việc mở lại
   `/vat-tu`/trang chi tiết nông trại của 1 tài khoản khác CÙNG vai trò sau
   khi đổi quyền — phải bị chặn/cho phép đúng theo thay đổi vừa lưu).
4. Đổi quyền role A qua user X, mở lại modal cho user Y (cùng role A) → thấy
   đúng thay đổi.
5. Lỗi mạng lúc Lưu → toast rõ ràng, form không mất trạng thái đang tick.

### Bước 4 — Nhường quyền quản trị (`TransferAdminModal.tsx`)

Nút "Nhường quyền quản trị" ở `page-header` CHỈ hiện khi vai trò CỦA CHÍNH
người đăng nhập là `is_system=true` — `User` (phiên đăng nhập, `api/types.ts`)
KHÔNG có field `is_system`, `TaiKhoanBusinessView()` tự đối chiếu `role_id`
với `GET /roles` qua 1 effect riêng (`isOrgAdmin` state), khớp
`refreshTransferAdminVisibility()` gốc.

**Phát hiện lúc làm bước này — sửa lại giả định sai ở `PasswordField.tsx`**:
component này ban đầu (Bước 2) giả định "nút hiện/ẩn + rules mật khẩu LUÔN đi
cùng nhau" — SAI với ô "Mật khẩu hiện tại" của modal này (xác nhận mật khẩu
ĐÃ CÓ, không phải đặt mật khẩu MỚI, HTML gốc không có `<ul class=
"password-rules">`). Đã thêm prop `showRules` (mặc định `true`, không phá 2
modal cũ), truyền `showRules={false}` ở đây.

**`handleSubmit()` — 2 tầng `.catch()` lồng nhau, KHÔNG được gộp lại**:
`api.users.transferAdmin()` thành công xong **BẮT BUỘC** gọi lại
`api.auth.login(user.email, password, api.isRemembered())` để lấy token JWT
MỚI — permissions trong token hiện tại lấy thẳng từ payload lúc CẤP, gọi lại
`/auth/me` một mình KHÔNG cấp lại token nên vẫn trả `permissions` CŨ dù
`role_name` đã đổi (đã xác nhận qua code thật + curl trong CLAUDE.md gốc).
Lỗi ở bước đăng nhập lại NGẦM này bị `catch` RIÊNG (chỉ toast cảnh báo,
KHÔNG coi là lỗi của thao tác nhường quyền — nhường quyền ĐÃ THÀNH CÔNG dù
bước này lỗi) — khác lỗi của chính `transferAdmin()` (401 sai mật khẩu/
`details.field`/403/409, dừng hẳn, KHÔNG đăng nhập lại/reload). Sau cả 2
bước, đóng modal + `window.location.reload()` TOÀN TRANG — không tự tay cập
nhật từng phần DOM/state.

## Trang `/lo-hang` (2026-09-23 — trang thứ 5 đã migrate)

Port `lo-hang.html` + `js/lo-hang.js` — đơn giản hơn hẳn `/nong-trai`/
`/tai-khoan`: **KHÔNG có modal thêm/sửa lô hàng ở trang này** — CRUD lô hàng
thật vẫn nằm ở tab "Lô hàng" trong modal xem mùa vụ của
`nong-trai-chi-tiet.html` (CHƯA migrate), 2 nút Sửa/Xoá trên mỗi thẻ chỉ
**điều hướng** sang đó. Danh sách KHÔNG phân trang (khác `/nong-trai`/
`/vat-tu`/`/mau-quy-trinh`/`/tai-khoan`) — bản gốc fetch cố định
`page_size: 100`, "Tổng số" hiển thị là `items.length` của lần fetch đó,
KHÔNG phải `data.total` từ API — giữ đúng hành vi này, không tự ý thêm
pagination controls không có trong bản gốc.

**`api/batches.ts` (mới) — CHỈ `list`/`get`/`getByCode`, CỐ TÌNH KHÔNG có
`create`/`update`/`remove`** — khác các domain khác đã port đủ CRUD dù UI
chưa dùng hết (VD `roles.ts`), ở đây được yêu cầu rõ KHÔNG port 3 hàm ghi vì
trang này thật sự không bao giờ cần tới (CRUD lô hàng thuộc phạm vi
`nong-trai-chi-tiet.html` khi trang đó migrate sau này). `farm_code`/
`farm_name`/`season_code`/`season_name` đọc THẲNG từ `BatchOut` (join sống
có sẵn ở backend) — không tự gọi thêm `api.farms.get()`/`api.seasons.get()`
cho từng lô hàng.

**`api/seasons.ts` (mới) — CHỈ `list()`** — cần cho dropdown "Mùa vụ" của bộ
lọc, chưa trang nào khác trong `app/` cần `get`/`create`/`update`/`remove`
của domain này (sẽ thêm khi `nong-trai-chi-tiet.html` migrate).

**`api/system.ts` mở rộng thêm `system.batches.list()`** — đã XÁC NHẬN lại
qua CLAUDE.md gốc (mục "Quản trị hệ thống (platform_admin)"): route
`GET /system/batches` CHỈ nhận `page`/`page_size`, KHÔNG có `farm_id`/
`season_id`/`q` — không suy đoán, đúng như 6 route `/system/*` khác đã port.

### `useCascadingSelect` — thêm `allowEmptyParent` (mở rộng hook đã có)

Hook này được tạo lúc migrate `/nong-trai` với comment sẵn "dùng lại được
khi `lo-hang.html` migrate sau này" — nhưng bản gốc lúc đó **THIẾU** 1 tính
năng cần cho đúng ca này: `setupCascadingSelect()` gốc có cờ
`allowEmptyParent` (dùng cho bộ lọc — "chưa chọn nông trại" nghĩa là "MỌI
nông trại", tải TẤT CẢ mùa vụ, khác hẳn "chưa sẵn sàng" của Tỉnh/Thành ->
Phường/Xã) mà `useCascadingSelect.ts` chưa hề có. Đã thêm option
`allowEmptyParent?: boolean` (mặc định `false`, KHÔNG đổi hành vi hiện tại
của `FarmFormModal.tsx`), `refresh()` chỉ dừng ở trạng thái `'no-parent'`
khi `!parentValue && !allowEmptyParent`. Bộ lọc "Nông trại → Mùa vụ" ở
`LoHangPage.tsx` truyền `allowEmptyParent: true`.

### Chế độ `platform_admin`

Đúng mẫu `/nong-trai`/`/vat-tu`/`/mau-quy-trinh`: đổi nguồn dữ liệu sang
`api.system.batches.list()`, thêm dòng "Đơn vị sở hữu" (đọc
`organization_name`, field PHẲNG chỉ có ở `BatchSystemRow`) trên mỗi thẻ,
ẩn 2 nút Sửa/Xoá.

**⚠️ Khối "Bộ lọc" ẨN HẲN (không phải disable)** — khác các trang khác (chỉ
vô hiệu hoá ô tìm kiếm): `api.system.batches.list()` không lọc được
`farm_id`/`season_id`, và tự dựng lại cascading (gọi `api.farms.list()`/
`api.seasons.list()` thường để đổ 2 dropdown) sẽ 403 ngay từ bước đổ dữ liệu
cho chính bộ lọc đó (platform_admin không có quyền `farms.view`/
`seasons.view`) — ẩn hẳn trung thực hơn để lộ 2 select trống/lỗi, khớp đúng
`js/lo-hang.js` gốc (`filterCard.hidden = true`).

**Nút Sửa/Xoá phải BỌC TAY, không có `hasPermission()` nào để tự ẩn** — khác
đa số nút khác trong dự án (gắn `data-requires-permission`/`usePermission()`
tự ẩn theo quyền), 2 nút này ở bản gốc là `<a>` điều hướng thẳng sang
`nong-trai-chi-tiet.html`, KHÔNG qua permission nào — `BatchCard.tsx` tự bọc
`{!isPlatformAdminMode && (...)}` quanh cả khối, khớp đúng cách `js/lo-hang.js`
gốc tự kiểm `isPlatformAdminMode` bằng tay ở `batchCard()`.

### Link "Xem chi tiết"/"Sửa"/"Xoá" trỏ RA NGOÀI SPA — hợp lệ, không phải lỗi

`BatchCard.tsx` dựng `editUrl` qua `mainSiteUrl(\`nong-trai-chi-tiet.html?ma=
${farm_code}&season=${season_code}#lo-hang\`)` — `nong-trai-chi-tiet.html`
**CHƯA migrate**, đây là liên kết liên-trang hợp lệ (cùng nguyên tắc đã áp
dụng cho `FarmCard.tsx` ở `/nong-trai`: trang chưa migrate thì link ra site
tĩnh, không port khống 1 trang chưa tới lượt). KHÔNG đụng gì tới
`nong-trai-chi-tiet.html`/`js/nong-trai-chi-tiet.js`.

### ⚠️ Nút "Truy xuất nguồn gốc" (QR) — CHƯA port, cần quyết định riêng

Bản gốc mỗi thẻ lô hàng có thêm 1 nút mở modal QR (dùng thư viện
`qrcodejs` nạp qua CDN `<script>`, xem `openQrModal()`/`traceabilityUrl()`
trong `js/lo-hang.js`) — **CỐ TÌNH KHÔNG port trong lần migrate này**, vì
không nằm trong danh sách việc cụ thể được giao, và việc thêm nó đòi hỏi 1
quyết định riêng (cài `npm install` 1 thư viện QR mới cho `app/`, hay nạp
lại qua thẻ `<script>` CDN như bản gốc — `app/` hiện chưa có tiền lệ nào
nạp thư viện ngoài kiểu CDN, mọi thứ khác đều qua `npm`). `BatchCard.tsx`
vì vậy thiếu hẳn nút này so với bản gốc — **đây là 1 khoảng lùi thật sự về
tính năng so với `lo-hang.html`**, không phải sơ suất, cần người dùng xác
nhận hướng đi trước khi thêm. Modal QR y hệt cũng tồn tại ở
`nong-trai-chi-tiet.html` (CHƯA migrate) — nên cân nhắc port CHUNG 1 lần khi
trang đó migrate, tránh dựng 2 cơ chế QR khác nhau trong cùng SPA.

## Trang `/ho-so` (2026-09-23 — trang thứ 6 đã migrate)

Port `ho-so.html` + `js/ho-so.js` — **đơn giản hơn hẳn** các trang trước:
self-service (chỉ sửa hồ sơ/mật khẩu của CHÍNH mình), không CRUD người
khác, không RBAC. Mở từ mục "Hồ sơ" trong **menu tài khoản** (bấm avatar ở
topbar, `UserMenu.tsx`) — KHÔNG phải mục sidebar chính như 5 trang trước,
xem mục "Sidebar cũ trỏ sang đây" bên dưới để biết vị trí khác đi thế nào ở
16 trang `.html` cũ.

### 2 hàm API — hoá ra ĐÃ CÓ SẴN từ trước, không cần thêm

Yêu cầu ban đầu tưởng cần thêm `api.auth.updateMe()`/`api.auth.changePassword()`
vào `src/api/http.ts` — kiểm tra lại thì **cả 2 đã tồn tại sẵn** (scaffold từ
trước, comment gốc ghi rõ "port đủ để dùng khi cần... KHÔNG phải vì app/ đã
có UI đăng nhập/đổi mật khẩu", chưa trang nào gọi tới cho tới lần migrate
này) — và đã đúng luôn cả 2 điểm dễ sai nêu trong yêu cầu:
- `updateMe()` tự giữ nguyên `permissions`/`organization_is_distributor` từ
  bản đã lưu trước đó rồi lưu lại NGAY vào storage (route `PATCH /auth/me`
  không đổi được vai trò nên 2 field đó chắc chắn không đổi) — phía
  `ProfileInfoForm.tsx` chỉ cần gọi `refreshFromStorage()` (từ `useAuth()`)
  ngay sau khi `updateMe()` thành công để đồng bộ lại `AuthContext`, không
  phải tự tay ghép field nào.
- `changePassword()` tự `saveSession(data)` với `TokenPair` MỚI trả về —
  không cần thêm bước lưu token thủ công ở tầng trang.

**Lưu ý chữ ký khác nhỏ so với mô tả ban đầu**: `changePassword()` nhận 2
tham số vị trí `(oldPassword: string, newPassword: string)`, KHÔNG phải 1
object `{old_password, new_password}` — giữ nguyên chữ ký đã có sẵn (đang
hoạt động đúng), không đổi lại chỉ để khớp cách diễn đạt trong yêu cầu.

### `ProfileInfoForm.tsx` — CHỈ 2 field `full_name`/`phone`

Cố tình KHÔNG thêm `dob`/`gender`/`bio` dù tên trang "Hồ sơ" gợi ý cần nhiều
field hơn — `MeUpdate` thật của backend KHÔNG có 3 field này (đã bỏ hẳn từ
bản gốc `.html`, xác nhận qua CLAUDE.md phía `agrichain-api`), đây là chủ
đích thiết kế backend, không phải thiếu sót cần bù lại. Dữ liệu ban đầu đọc
THẲNG từ `useAuth().user` (đã có sẵn trong `AuthContext` từ lúc đăng nhập/
`/auth/me` chạy) — KHÔNG gọi API riêng để tải, khớp `renderProfile()` gốc
đọc `api.getUser()`.

### `SecurityForm.tsx` — đổi mật khẩu CHÍNH mình, khác hẳn Đặt lại mật khẩu ở `/tai-khoan`

`POST /auth/change-password` (yêu cầu nhập ĐÚNG mật khẩu hiện tại) — KHÁC
hẳn `POST /users/{id}/reset-password` (`ResetPasswordModal.tsx` ở
`/tai-khoan`, dành cho ADMIN đặt lại mật khẩu NGƯỜI KHÁC, không cần mật
khẩu cũ) — 2 route này không dùng lẫn cho nhau được. Lỗi `details.field`
phân biệt `old_password` (sai mật khẩu hiện tại) và `new_password` (không
đạt quy tắc độ mạnh), khớp `ChangePasswordRequest` thật.

3 ô mật khẩu dùng `PasswordField.tsx` (component dùng chung, xem mục "Trang
`/tai-khoan`") với `showRules` khác nhau theo TỪNG Ô, khớp đúng bản gốc
(chỉ ô "Mật khẩu mới" có `<ul class="password-rules">`, "Mật khẩu hiện tại"
và "Xác nhận mật khẩu mới" thì không):
- "Mật khẩu hiện tại" — `showRules={false}` (xác nhận mật khẩu ĐÃ CÓ).
- "Mật khẩu mới" — `showRules` mặc định `true` (**đây LÀ** đặt mật khẩu
  mới, khác hẳn ô "Mật khẩu hiện tại" của modal Nhường quyền quản trị ở
  `/tai-khoan` — nơi `showRules={false}` vì đó là xác nhận mật khẩu CŨ,
  không phải đặt mới).
- "Xác nhận mật khẩu mới" — `showRules={false}` (chỉ so khớp với ô trên,
  không kiểm độ mạnh riêng).

### Tabs — trang ĐẦU TIÊN trong `app/` cần tới

`setupTabs()` (`js/app-shell.js` gốc) trước đó ghi nhận "CHƯA port, chưa
trang nào cần" (mục "Nợ kỹ thuật") — `/ho-so` là trang ĐẦU TIÊN thật sự cần
2 tab ("Thông tin cá nhân"/"Bảo mật"). Vì chỉ có ĐÚNG 1 trang cần và chỉ 2
tab cố định (không lặp lại ở nơi khác trong `app/`), **KHÔNG** dựng
hook/component tabs dùng chung — `HoSoPage.tsx` tự quản lý bằng 1
`useState<'info' | 'security'>` cục bộ, toggle `is-active`/`aria-selected`/
`hidden` y hệt `setupTabs()` gốc. Nếu trang sau cần tabs, lúc đó mới cân
nhắc rút thành hook dùng chung (đừng port khống trước, cùng bài học đã áp
dụng cho `setupZeroDefaultInputs()`).

## Trang `/goi-phan-mem` và `/lich-su-mua-goi` (2026-09-23 — trang thứ 7 và 8 đã migrate)

Port `goi-phan-mem.html` và `lich-su-mua-goi.html` — **2 trang "Đang phát
triển", CHƯA có nghiệp vụ thật** (đúng mô tả gốc: không API, không form,
không dữ liệu) — nên gộp chung 1 mục ở đây thay vì tách 2 mục dài. Cả 2 bản
gốc đều CHỈ có breadcrumb + `page-header` + 1 khối `.empty-state` tĩnh
("Đang phát triển" / "Tính năng này chưa sẵn sàng. Quay lại sau nhé.") —
khác nhau đúng 3 chỗ: icon (`box` vs `file-text`), tiêu đề, và câu mô tả ở
`page-header__meta`.

Vì 2 trang giống hệt nhau tới từng chữ ngoài 3 chỗ đó, đã tách 1 component
dùng chung **`components/PlaceholderPage.tsx`** (nhận `icon`/`title`/`meta`
qua props) thay vì chép JSX 2 lần — đây là **ngoại lệ có chủ đích** với quy
ước "mỗi trang tự chứa JSX riêng" đã áp dụng cho mọi trang khác trong
`app/`: ngoại lệ này hợp lý vì cả 2 trang đang dùng component ĐỀU rỗng,
không có logic gì để mỗi trang "tự chứa" ngoài 3 giá trị prop, và gộp lại
giúp nội dung "Đang phát triển" chỉ có ĐÚNG 1 nguồn (tránh lệch chữ giữa 2
trang nếu sau này ai đó sửa 1 trang mà quên trang kia). `GoiPhanMemPage.tsx`/
`LichSuMuaGoiPage.tsx` vì vậy chỉ còn đúng 3 dòng mỗi file — không port
khống thêm bất kỳ tính năng nào không có trong bản gốc.

Không có logic gì khác để ghi chú — 2 trang này không gọi API, không có
state, không có hook, không có CSS riêng (dùng thẳng `.empty-state`/
`.page-header` có sẵn trong `components.css`/`app-shell.css`).

## Trang `/nong-trai-chi-tiet` (2026-09-23 — CẢ 5 BƯỚC đã code xong, CHƯA xác nhận qua test tay, chưa tính vào 8 trang đã xong)

Port `nong-trai-chi-tiet.html` + `js/nong-trai-chi-tiet.js` — trang **PHỨC
TẠP NHẤT** trong toàn dự án (file gốc lớn nhất frontend). Làm THEO 5 BƯỚC
tuần tự (theo đúng 5 mảng nghiệp vụ: Thông tin, Chứng nhận, Timeline mùa vụ,
Lô hàng, Quy trình mùa vụ), báo cáo sau MỖI bước, dừng lại chờ xác nhận
trước khi làm bước kế — **chưa cộng vào số "8 trang đã migrate" ở đầu file
cho tới khi xong ĐỦ 5 bước**, tránh đếm 1 trang chưa hoàn chỉnh là "đã xong".

### ⚠️ Sai khác đã phát hiện so với khung "5 tab" nêu trong yêu cầu ban đầu

Yêu cầu ban đầu mô tả Bước 1 là "dựng khung 5 tab (Thông tin/Chứng nhận/
Timeline mùa vụ/Lô hàng/Quy trình mùa vụ)" ngay trên trang chi tiết nông
trại. **Sau khi đọc lại `nong-trai-chi-tiet.html` gốc, cấu trúc THẬT chỉ có
ĐÚNG 3 tab ở cấp trang**: "Thông tin", "Chứng nhận nông trại", "Lịch sử mùa
vụ" (`#view-tab-info`/`#view-tab-certifications`/`#view-tab-seasons`, dùng
`.tabs`/`.tabs__tab`/`.tabs__panel`). 3 tab còn lại mà yêu cầu liệt kê
("Timeline mùa vụ", "Lô hàng", "Quy trình mùa vụ") thực ra nằm **LỒNG BÊN
TRONG** — đó là 4 tab (kể cả 1 tab "Thông tin" khác, của MÙA VỤ chứ không
phải nông trại) của `#season-view-modal`, modal MỞ RA khi bấm xem 1 thẻ mùa
vụ trong tab "Lịch sử mùa vụ" — 1 tầng lồng sâu hơn hẳn.

Đã chọn dựng ĐÚNG cấu trúc thật (3 tab cấp trang + để dành modal 4-tab cho
Bước 3/4/5) thay vì ép trang chi tiết nông trại có 5 tab phẳng không tồn tại
trong bản gốc — khớp nguyên tắc "port hành vi 1:1, không tự đoán/tự thêm cấu
trúc" đã áp dụng xuyên suốt dự án. `NongTraiChiTietPage.tsx`'s state `tab`
hiện có 3 giá trị (`'info' | 'certifications' | 'seasons'`), 2 tab sau đang
là placeholder `.async-state` tạm ghi "Đang tải — Bước N" — số bước đúng như
kế hoạch 5 bước ban đầu, chỉ khác VỊ TRÍ hiển thị (trong tab "Lịch sử mùa
vụ", chưa phải modal `season-view-modal` — modal đó sẽ dựng ở Bước 3).

### Bước 1 — Khung trang + tab "Thông tin"

**`api/certifications.ts` (mới)** — khuôn CRUD chuẩn, port 1:1
`api.certifications.*` của `js/api.js` gốc. Tách riêng `Certification` (bản
LIST, chỉ có `file_name` — metadata) và `CertificationDetail` (bản GET theo
id, có thêm `file_url` thật) — khớp đúng giới hạn đã ghi nhận trong CLAUDE.md
gốc ("danh sách chỉ trả metadata tệp, xem nội dung phải gọi chi tiết"). Chưa
đăng ký `system.certifications.list()` ở bước này — để dành Bước 2 (tab
"Chứng nhận" là nơi đầu tiên thật sự cần tới, tránh thêm khống trước khi có
chỗ dùng).

**Đọc `?ma=`/`?id=`** — `NongTraiChiTietPage.tsx` dùng `useSearchParams()`
(react-router v6, không phải route param `:code` — xác nhận đúng theo yêu
cầu "đây là trang DUY NHẤT đọc `?ma=` HOẶC `?id=` tuỳ ai gọi"). Có `?id=` thì
ưu tiên gọi `api.farms.get(id)` (route public-read, dùng cho platform_admin
qua nút "Xem chi tiết" ở `FarmCard.tsx`); không có `?id=` thì rơi về nhánh
`?ma=` — `api.farms.list({ q: ma, page_size: 100 })` rồi tự so khớp CHÍNH XÁC
(không phân biệt hoa/thường) ở client, đúng `loadFarmByCode()` gốc (route
`GET /farms` không có endpoint "tìm theo code"). **Khác bản `.js` gốc ở 1
điểm tinh tế**: bản gốc quyết định nhánh dựa vào việc URL CÓ tham số `id`
không (không xét `isPlatformAdmin()`) — port giữ ĐÚNG hành vi này (không tự
thêm điều kiện `isPlatformAdmin` vào nhánh chọn, dù về logic 2 cái luôn khớp
nhau trong thực tế sử dụng).

**Không tìm thấy** — `.empty-state` + nút quay lại `/nong-trai` (`<Link>` nội
bộ, khác bản gốc `<a href="nong-trai.html">` vì giờ đã có route SPA thật).

**Bản đồ Leaflet chỉ xem** (`FarmDetailMap.tsx`, mới) — port `showFarmOnMap()`
gốc: vẽ tĩnh polygon đã lưu + `fitBounds`, KHÔNG có cơ chế vẽ tương tác
(click-để-đánh-dấu, đường nét đứt bám chuột...) như `BoundaryEditor.tsx` của
`/nong-trai` (modal Thêm/Sửa) — đây là bản đồ read-only, đơn giản hơn hẳn.
**Effect khoá theo `farm.id`, KHÔNG chỉ tạo map 1 lần lúc mount** (khác
`BoundaryEditor.tsx`'s `mountMapIfNeeded()` — guard `if (mapRef.current)
return` chỉ đúng cho modal, nơi `farm` cố định suốt 1 lần mở): trang này có
thể giữ nguyên mounted khi người dùng điều hướng sang `?ma=`/`?id=` KHÁC
(cùng route `/nong-trai-chi-tiet`, chỉ đổi query string, React Router không
remount) — nếu chỉ tạo map 1 lần, bản đồ sẽ đứng yên với polygon của nông
trại CŨ. Dọn map cũ (`map.remove()` trong cleanup effect) + tạo lại map mới
mỗi khi `farm.id` đổi mới đúng ý "mỗi lần vào trang chi tiết là 1 bản đồ mới"
của bản `.html` gốc (ở đó MỌI lần đổi `?ma=` là 1 lần tải lại trang thật,
không có khái niệm "giữ nguyên mounted").

**`src/mapLayers.ts` — CHUYỂN ra khỏi `pages/nong-trai/`** (dùng chung, không
phải bug/refactor ngoài phạm vi): bản gốc `js/map-layers.js` CHÍNH LÀ 1 file
dùng chung giữa `js/nong-trai.js` VÀ `js/nong-trai-chi-tiet.js` (xem CLAUDE.md
gốc). Bản React trước đó đặt `mapLayers.ts` trong `pages/nong-trai/` (chỉ 1
trang cần lúc đó) — nay `pages/nong-trai-chi-tiet/FarmDetailMap.tsx` cũng cần
tới, đã chuyển file lên `src/mapLayers.ts` (top-level, cạnh `enums.ts`) và sửa
lại đường dẫn `import` duy nhất còn lại (`BoundaryEditor.tsx`) — cùng lý do
`useCascadingSelect` từng được đặt sẵn trong `hooks/` (không phải
`pages/nong-trai/`) ngay từ đầu vì biết trước `/lo-hang` sẽ cần dùng lại.

**`view-detail.css` (mới)** — port NGUYÊN VĂN TOÀN BỘ khối `<style>` của
`nong-trai-chi-tiet.html` gốc trong 1 lần (không chỉ phần Bước 1 cần
— `.view-map`/`.tab-panel-header`), vì đây là 1 khối CSS DUY NHẤT trong bản
gốc, tách nhỏ theo từng bước sẽ phải quay lại sửa cùng 1 file nhiều lần và dễ
bỏ sót class dùng chéo giữa các tab (VD `.tab-panel-header` dùng ở CẢ tab
"Chứng nhận" lẫn tab "Timeline mùa vụ" bên trong modal). Các phần chưa dùng
tới ở Bước 1 (`.workflow-step*`, `.log-*`, `.qr-modal__*`...) nằm sẵn trong
file, sẽ có chỗ dùng dần qua Bước 2-5 — không phải CSS thừa/đoán mò, đúng 1:1
với khối gốc.

Type-check + `npm run build` sạch (127 modules, không lỗi).

### Bước 2 — Tab "Chứng nhận nông trại"

**⚠️ Đã hỏi và xác nhận lại với người dùng trước khi code** (2026-09-23): yêu
cầu ban đầu ghi modal Chứng nhận cần "giới hạn 2MB, chỉ nhận
http(s)/data:image/jpeg|png|webp/data:application/pdf, CHẶN
data:image/svg+xml" cho ô tệp đính kèm. Đối chiếu `handleCertFileChange()`
trong `js/nong-trai-chi-tiet.js` gốc thì **KHÔNG có** giới hạn dung lượng lẫn
kiểm tra MIME nào cho tệp chứng nhận — chỉ có `accept="image/*,.pdf"` (gợi ý
trình duyệt, không enforce bằng JS, form còn có `novalidate`). Giới hạn 2MB
mà yêu cầu nhắc tới thực ra thuộc **ẢNH NHẬT KÝ MÙA VỤ** (`MAX_LOG_IMAGE_BYTES`,
sẽ port ở Bước 3), khác hẳn tệp chứng nhận. Người dùng đã xác nhận: **port
đúng 1:1, KHÔNG thêm validate ngoài bản gốc** — `CertificationFormModal.tsx`
vì vậy chỉ có `accept="image/*,.pdf"` trên input, không giới hạn kích thước/
MIME nào bằng JS.

**`api/certifications.ts`** (mới ở Bước 1, dùng thật ở Bước 2) — tách
`Certification` (bản LIST, chỉ có `file_name`) và `CertificationDetail`
(bản `get(id)`, có thêm `file_url` thật) — `CertificationCard.tsx` chỉ nhận
bản LIST, `CertificationFormModal.tsx` tự gọi `get(id)` khi mở modal Sửa 1
chứng nhận CÓ tệp, để lấy `file_url` thật cho link "Xem tệp"/logic "giữ
nguyên tệp cũ".

**`api/system.ts` mở rộng thêm `system.certifications.list()`** — cùng mẫu
`system.batches.list()` (không có `q`/`farm_id`, chỉ `page`/`page_size`).
**`pages/nong-trai-chi-tiet/systemPaging.ts`** (mới) — port
`fetchAllSystemPages()`/`MAX_SYSTEM_PAGES` gốc, đặt RIÊNG trong thư mục trang
này (không phải `hooks/` hay `src/`) vì bản gốc cũng chỉ định nghĩa 1 lần
NGAY TRONG `js/nong-trai-chi-tiet.js`, không dùng chung với trang nào khác
trong dự án (khác `useCascadingSelect`/`mapLayers.ts`) — sẽ dùng lại cho cả 3
danh sách con còn lại (mùa vụ/nhật ký/lô hàng) ở Bước 3/4/5.

**`loadCertifications()` nạp NGAY khi nông trại tải xong, không chờ bấm vào
tab** — khớp `showFarm()` gốc gọi `renderCertifications()` ngay sau khi có
dữ liệu nông trại (để số "Tổng số" ở tiêu đề tab luôn đúng dù người dùng
chưa từng bấm vào tab đó). Khác các trang danh sách top-level khác trong
`app/` (đều có 4 trạng thái `loading/data/empty/error` với `.async-state`
riêng cho TOÀN TRANG) — ở đây `loadCertifications()` là 1 danh sách CON
(nested) trong 1 trang đã tải xong, nhưng vẫn áp dụng ĐÚNG 4-trạng-thái đó
(khác bản gốc chỉ toast lỗi + để mặc định empty-state cho tới khi có dữ
liệu) — đây là ĐIỂM NHẤT QUÁN với quy ước chung của `app/` (mọi list async
khác đã port trong SPA đều có state này), không phải tự ý thêm tính năng
nghiệp vụ mới, chỉ là 1 khuôn hiển thị đã áp dụng xuyên suốt dự án.

**`CertificationFormModal.tsx`** — dùng `openToken` (từ `useDialog()`'s
`openCount`) làm dependency của effect nạp lại form, cùng mẫu đã áp dụng ở
`/nong-trai`/`/tai-khoan` (bấm "Thêm mới" 2 lần liên tiếp không đổi giá trị
`cert`/`mode` sẽ khiến React bỏ qua effect nếu chỉ dựa vào 2 prop đó).

**`CertificationCard.tsx`** — cột "Tệp tin": `isPlatformAdminMode` quyết
định hiện `<span>` tĩnh hay `<button>` mở tệp (GET /certifications/{id} lọc
theo Đơn vị, platform_admin luôn 404 với chứng nhận Đơn vị khác — hiện tĩnh
trung thực hơn nút dẫn tới lỗi). Nút Sửa/Xoá chỉ gate qua `canEdit`/
`canDelete` (từ `usePermission`), KHÔNG cần thêm điều kiện
`isPlatformAdminMode` riêng — `hasPermission()` tự trả `false` với
platform_admin (không có quyền nào), khớp đúng cơ chế đã ghi nhận nhiều lần
trong CLAUDE.md gốc.

Type-check + `npm run build` sạch (131 modules, không lỗi).

### Bước 3 — Tab "Lịch sử mùa vụ" (mùa vụ + nhật ký, KHÔNG gồm "Lô hàng"/"Quy trình mùa vụ")

**⚠️ Đã hỏi và xác nhận lại với người dùng trước khi code** (2026-09-23,
lần 2): yêu cầu ban đầu ghi modal mùa vụ cần "end_date > start_date validate
ở FE lẫn tin cậy BE trả lỗi". Đối chiếu `validateSeason()` trong
`js/nong-trai-chi-tiet.js` gốc thì **KHÔNG có** bước so sánh khoảng ngày nào
ở client — chỉ kiểm tra CÓ NHẬP hay không cho từng field, hoàn toàn tin cậy
lỗi backend trả về nếu khoảng ngày sai. Người dùng đã xác nhận: **port đúng
1:1, KHÔNG thêm so sánh ngày ở FE** — `SeasonFormModal.tsx`'s `validate()`
chỉ kiểm tra field rỗng, không có logic `endDate > startDate` nào.

**`api/seasons.ts` mở rộng đầy đủ CRUD** (trước đó chỉ có `list()`, đủ cho
dropdown lọc ở `/lo-hang`) — thêm `get`/`create`/`update`/`remove`, và mở
rộng `Season` từ 4 field tối thiểu lên ĐẦY ĐỦ field thật (`planned_area`,
`actual_area`, `expected_yield`, `yield_unit`, `status`, `note`,
`workflow_template_id`/`_name`/`_steps`). Thêm mới **`WorkflowStep`** (1 bước
trong `workflow_steps` của MỘT mùa vụ cụ thể, khác `TemplateStep` của mẫu
quy trình gốc — có thêm state `done`/`completed_at`/`log_id`/`batch_id`) —
khai báo SẴN ở Bước 3 dù CHƯA thao tác gì tới (để `Season.workflow_steps` có
kiểu đúng ngay từ đầu, tránh dùng `any`), sẽ dùng đầy đủ ở Bước 5.
**`SeasonPayload` KHÔNG có 3 field `workflow_template_*`** — tách riêng
`SeasonWorkflowFields`, dùng cho các lần PATCH RIÊNG chỉ đổi quy trình (Bước
5) — khớp đúng comment gốc "KHÔNG gửi 3 field này trong
`handleSeasonSubmit()`, PATCH giữ nguyên quy trình đã áp dụng nếu không gửi".
`Season` mở rộng này KHÔNG phá `/lo-hang` (chỉ dùng `id`/`code`/`name`/
`farm_id`, các field mới thêm không bắt buộc phải có mặt ở nơi gọi).

**`api/logs.ts`** (mới) — CRUD đầy đủ. `LogSupply` **ĐÚNG 7 trường**
(`supply_id`/`code`/`name`/`quantity`/`unit`/`method`/`purpose` — đã xác
nhận qua CLAUDE.md gốc trước khi code, không suy đoán 6 trường như
`SCHEMA-EXPORT.md` bản cũ). Tách `Log` (bản LIST, `images` chỉ metadata
`name`/`mime`/`size`) và `LogDetail` (bản `get(id)`, `images` có `url` thật)
— cùng mẫu `Certification`/`CertificationDetail` ở Bước 2.

**`api/system.ts` mở rộng thêm `system.seasons.list()`/`system.logs.list()`**
— cùng mẫu các route `/system/*` khác (không có `farm_id`/`season_id`/`q`).

**`SeasonFormModal.tsx`** — port `openSeasonModal()`/`validateSeason()`/
`handleSeasonSubmit()`. Numeric field (`planned_area`/`actual_area`/
`expected_yield`) dùng `useState<string>` + `Number(value) || 0` lúc submit —
khớp quy ước đã dùng ở `FarmFormModal.tsx`'s field "Diện tích".
`suggestedSeasonCode()` (ở `NongTraiChiTietPage.tsx`, gọi lại mỗi lần render
theo `seasonsTotal`) chỉ là GỢI Ý — backend tự kiểm tra trùng mã thật, khớp
`suggestSeasonCode()` gốc.

**`SeasonViewModal.tsx`** (mới) — port modal "Xem chi tiết mùa vụ"
(`season-view-modal`), ĐỦ CẢ 4 TAB CON theo đúng cấu trúc thật đã xác nhận ở
Bước 1: "Thông tin" (view-field, ĐÃ xong), "Timeline mùa vụ" (danh sách nhật
ký + modal thêm/sửa, ĐÃ xong ở Bước 3 này), "Lô hàng" và "Quy trình mùa vụ"
(placeholder `.async-state` "Đang tải — Bước 4/5"). Dùng `openToken` (từ
`useDialog().openCount`) làm dependency của effect reset-tab-về-"Thông
tin"-và-nạp-lại-nhật-ký — **bắt buộc** vì xem lại ĐÚNG mùa vụ vừa đóng trước
đó (season không đổi identity) vẫn phải reset về tab đầu + nạp lại dữ liệu
mới nhất, khớp `openSeasonViewModal()` gốc luôn gọi `resetSeasonViewTabs()`/
`renderSeasonLogs()` không điều kiện.

**`LogFormModal.tsx`** (mới, phần phức tạp nhất Bước 3) — port đủ 3
`form-section`: Thông tin hoạt động, Vật tư sử dụng (từng dòng thêm/xoá qua
mảng state React — KHÁC "DOM là nguồn dữ liệu" của bản gốc, cùng cách tiếp
cận `steps[]` đã dùng ở `/mau-quy-trinh`), Hình ảnh minh hoạ (`MAX_LOG_IMAGES=5`,
`MAX_LOG_IMAGE_BYTES=2MB` — **ĐÚNG CHỖ lần này**, xem ghi chú Bước 2 ở trên).
Chọn 1 vật tư tự gợi ý đơn vị của vật tư đó (LUÔN ghi đè, không chỉ khi ô đơn
vị đang trống) — khớp `select.addEventListener('change', ...)` gốc.

**`step_id` LUÔN gửi `null`** trong `LogFormModal.tsx` ở bước này — luồng
"Ghi nhật ký & hoàn thành" 1 bước quy trình (mở modal này kèm
`activity_type`/`instruction` điền sẵn, tự đánh dấu bước hoàn thành sau khi
lưu) thuộc **Bước 5**, chưa port. Đã ghi chú rõ trong code: sẽ cần thêm prop
`completingStepId` ở Bước 5 mà KHÔNG phải đổi lại phần còn lại của form.

**`LogItem.tsx`** (mới) — port `logItem()`. Nút "Xem ảnh" gọi
`api.logs.get(id)` CHỈ khi bấm (không tải trước cho toàn bộ danh sách,
đúng comment gốc); `isPlatformAdminMode` thay bằng ghi chú tĩnh (GET
`/logs/{id}` org-scoped, platform_admin luôn 404 với nhật ký Đơn vị khác) —
cùng mẫu cột "Tệp tin" của `CertificationCard.tsx` ở Bước 2.

Type-check + `npm run build` sạch (137 modules, không lỗi).

### Bước 4 — Tab "Lô hàng" (trong `SeasonViewModal.tsx`)

Không phát hiện sai lệch cấu trúc nào ở bước này (khác Bước 1/3) — đã đối
chiếu kỹ `batchCard()`/`openBatchModal()`/`validateBatch()`/
`handleBatchSubmit()`/`deleteBatch()` trong `js/nong-trai-chi-tiet.js` gốc
trước khi code, đúng như kế hoạch ban đầu.

**`api/batches.ts` mở rộng đầy đủ CRUD** (trước đó chỉ có `list`/`get`/
`getByCode`, đủ cho `/lo-hang` chỉ xem/lọc) — thêm `create`/`update`/`remove`
+ `BatchPayload`. Đây là việc đã LƯỜNG TRƯỚC từ lúc port `/lo-hang` (comment
gốc trong file lúc đó: "CRUD lô hàng thuộc phạm vi `nong-trai-chi-tiet.html`
khi trang đó migrate sau này"), không phải sai lệch cần hỏi lại. `create()`
**KHÔNG nhận `farm_id`** — backend tự điền từ `season_id` (`BatchCreate`
không có field này).

**⚠️ Lô hàng KHÔNG có khái niệm phân quyền qua giao diện này — khác hẳn
Chứng nhận/Mùa vụ/Nhật ký ở Bước 2/3** (đã xác nhận qua đọc lại HTML gốc
trước khi code): nút "Thêm lô hàng mới" (`[data-open-batch-form]`) và nút
Sửa/Xoá trong `batchCard()` **KHÔNG có `data-requires-permission` nào cả**
— khớp CLAUDE.md gốc mục "Quản trị hệ thống (platform_admin)": *"Nút Sửa/Xoá
không qua `data-requires-permission` nào cả... batches chưa được gắn quyền
qua giao diện này"*. `BatchCard.tsx`/`BatchFormModal`'s nút Thêm ở
`SeasonViewModal.tsx` vì vậy **CHỈ gate qua `isPlatformAdminMode`** (bọc tay,
giống `lo-hang.js` gốc), **KHÔNG dùng `usePermission('batches.add'/'edit'/
'delete')`** như 3 tab con trước — cố tình không thêm permission gate không
có trong bản gốc dù dữ liệu quyền `batches.*` đã tồn tại ở `/tai-khoan`
(ma trận phân quyền có hàng "Lô hàng", nhưng KHÔNG được frontend gốc sử dụng
ở đúng form này — sự bất đối xứng có sẵn trong bản gốc, không phải lỗi cần
"sửa" khi port).

**`BatchCard.tsx`** (mới, KHÁC hẳn `pages/lo-hang/BatchCard.tsx`) — bản gốc
có 2 hàm `batchCard()` riêng biệt trong `js/lo-hang.js` và
`js/nong-trai-chi-tiet.js` (chỉ dùng chung class CSS `.batch-card`, không
dùng chung hàm) — port đúng 2 component React riêng, KHÔNG tái sử dụng
`pages/lo-hang/BatchCard.tsx` (nút Sửa/Xoá ở đó là `<a>` điều hướng sang
trang này, còn ở ĐÂY nút Sửa/Xoá mở thẳng modal tại chỗ — hành vi khác hẳn
nhau, không thể dùng chung 1 component). Card ở đây KHÔNG có dòng "Đơn vị sở
hữu" (khác `/lo-hang`) — mọi lô hàng trong tab này đều cùng 1 mùa vụ/Đơn vị
đang xem, khớp `batchCard()` gốc của `nong-trai-chi-tiet.js` không có dòng
này.

**`BatchFormModal.tsx`** — `validate()` có kiểm tra TRÙNG MÃ ở client
(`existingBatches` prop, so khớp không phân biệt hoa/thường, loại trừ chính
bản ghi đang sửa) — khác Chứng nhận/Mùa vụ (không kiểm dup ở FE, tin cậy
backend), khớp đúng `validateBatch()` gốc CÓ bước kiểm tra này (khác 2 form
kia). `suggestedBatchCode()` (ở `SeasonViewModal.tsx`) dạng
`<mã nông trại>-<mã mùa vụ>-NNN` — cần thêm prop `farmCode` truyền từ
`NongTraiChiTietPage.tsx` (season không tự mang mã nông trại).

**⚠️ Nút "Truy xuất nguồn gốc" (QR) — VẪN CHƯA port, cùng nợ kỹ thuật đã
ghi ở `/lo-hang`** — không phải bỏ sót, là quyết định ĐÃ CHỐT từ trước (cần
chọn thư viện QR trước, xem app/CLAUDE.md mục "Trang `/lo-hang`"), áp dụng
chung cho cả 2 nơi có nút này trong bản gốc (`lo-hang.js` và
`nong-trai-chi-tiet.js` đều gọi chung `openQrModal()`/`traceabilityUrl()`
theo đúng comment gốc "nên cân nhắc port CHUNG 1 lần khi trang đó migrate").

**`stepForQr`/luồng mở modal QR tự động sau khi lưu lô hàng cho 1 bước yêu
cầu QR** — thuộc Bước 5 (Quy trình mùa vụ), CHƯA port, cùng lý do `step_id`
của `LogFormModal.tsx` ở Bước 3.

Type-check + `npm run build` sạch (139 modules, không lỗi — chỉ có cảnh báo
kích thước bundle >500kB của Vite, không phải lỗi, không nằm trong phạm vi
xử lý của lần port này).

### Bước 5 — Tab "Quy trình mùa vụ" (RỦI RO CAO NHẤT toàn trang)

**⚠️ CHƯA được xác nhận qua checklist test tay riêng** — người dùng sẽ test
kỹ (đây là phần lồng ghép nghiệp vụ phức tạp nhất: áp dụng mẫu, checklist,
mở lại LogFormModal/BatchFormModal đã có, tuỳ biến bước) trước khi coi
`nong-trai-chi-tiet.html` là trang thứ 9 đã migrate. Không có sai lệch cấu
trúc nào phát hiện thêm ở bước này (đã đọc kỹ `renderSeasonProcess()`/
`cloneTemplateSteps()`/`currentActionableStepId()`/`startStepCompletion()`/
`completeWorkflowStep()`/`linkBatchToStep()`/`processStepViewCard()`/
`collectProcessSteps()` gốc trước khi code, đúng cấu trúc yêu cầu đã mô tả).

**Vấn đề kỹ thuật quan trọng nhất đã tự phát hiện và xử lý — hiệu ứng phụ
không mong muốn nếu khoá effect theo object `season`**: `SeasonViewModal.tsx`
đã có 1 effect (từ Bước 3) reset về tab "Thông tin" + nạp lại nhật ký/lô
hàng, khoá theo `[season, isPlatformAdmin, openToken]`. Mọi thao tác ở tab
"Quy trình mùa vụ" (áp dụng mẫu/hoàn thành bước/gắn lô hàng/tuỳ biến bước)
đều PATCH `/seasons/{id}` rồi gọi `onSeasonUpdated(updated)` — season CÙNG
`id` nhưng ĐỔI tham chiếu object. Nếu effect đó vẫn khoá theo object
`season`, MỖI lần cập nhật quy trình sẽ vô tình kích hoạt lại — nhảy tab về
"Thông tin" + tải lại nhật ký/lô hàng không cần thiết, phá luồng người dùng
đang thao tác ở tab "Quy trình mùa vụ" (VD vừa hoàn thành 1 bước xong bị bật
ngược về tab "Thông tin"). Đã sửa: đổi khoá effect thành `season?.id` (chỉ
so sánh id, không so sánh object reference) — season vẫn đọc qua closure
bình thường bên trong effect.

**Kiến trúc state điều phối — đặt trong `SeasonViewModal.tsx`, KHÔNG tách
`ProcessTab.tsx` con riêng**: hoàn thành 1 bước phải mở lại CHÍNH
`LogFormModal` (tab "Timeline mùa vụ", đã có từ Bước 3), và nếu bước yêu cầu
QR thì mở tiếp CHÍNH `BatchFormModal` (tab "Lô hàng", Bước 4) — vì
`SeasonViewModal.tsx` đã sở hữu sẵn 2 modal đó, toàn bộ state điều phối
(`completingStepId`/`pendingQrStepId`/`logPrefill`) đặt luôn ở component cha
này thay vì tách 1 `ProcessTab.tsx` con rồi phải xuyên state qua thêm 1 tầng
prop không cần thiết.

**`LogFormModal.tsx`/`BatchFormModal.tsx` (Bước 3/4) phải SỬA LẠI** để phục
vụ luồng này — cả 2 thay đổi đều NGƯỢC TƯƠNG THÍCH với cách dùng cũ (tab
Timeline/Lô hàng bình thường không đổi hành vi):
- `onSaved` đổi từ `() => void` sang `(saved: Log | Batch) => void` — cần id
  bản ghi vừa lưu để gọi `completeWorkflowStep(stepId, savedLog.id)`/
  `linkBatchToStep(stepId, savedBatch.id)`.
- `LogFormModal.tsx` thêm 3 prop tuỳ chọn: `prefillActivityType`/
  `prefillDescription` (điền sẵn khi mở từ "Ghi nhật ký & hoàn thành", khớp
  `startStepCompletion()` gốc gán trực tiếp vào 2 ô này) và
  `completingStepId` (gắn thẳng vào `LogPayload.step_id` lúc TẠO — khớp
  `record.step_id = stepToComplete || null` gốc, CHỈ áp dụng khi
  `mode === 'create'`).

**`completingStepId`/`pendingQrStepId` PHẢI xoá sạch mỗi khi modal tương ứng
đóng vì BẤT KỲ lý do gì** (Huỷ/X, HOẶC ngầm sau khi lưu thành công — vì
`LogFormModal`/`BatchFormModal` tự gọi `onClose()` TRƯỚC `onSaved()`) — khớp
đúng bug cụ thể bản gốc đã cố tình phòng (`closeSeasonLogModal()`/
`closeBatchModal()` luôn reset 2 biến này). Đã port bằng 2 hàm bọc
`closeLogModal()`/`closeBatchModal()` (KHÔNG dùng trực tiếp
`logModal.close`/`batchModal.close`), truyền vào `onClose` của cả 2 modal.
**Xác nhận đã ĐÚNG thứ tự đọc giá trị**: dù `onClose()` (xoá state) chạy
TRƯỚC `onSaved()` (đọc state) trong cùng 1 lần lưu thành công, đóng `onSaved`
truyền cho `LogFormModal`/`BatchFormModal` được React tạo mới ở MỖI LẦN
render — giá trị `completingStepId`/`pendingQrStepId` đọc qua closure bên
trong vẫn là giá trị ĐÚNG tại thời điểm render đó (`setState` chỉ LÊN LỊCH
cập nhật, không thay đổi biến đã capture trong closure đang chạy) — khớp
cách bản gốc chụp `stepToComplete`/`stepForQr` vào biến local TRƯỚC khi gọi
hàm đóng modal.

**`ProcessStepEditorModal.tsx`/`ProcessStepFields.tsx`/`processStepForm.ts`**
(mới) — modal "Tuỳ biến bước quy trình", dùng mảng state React (khác "DOM
là nguồn dữ liệu" gốc), CÙNG cách tiếp cận `steps[]` đã dùng ở
`/mau-quy-trinh` NHƯNG khác biệt quan trọng nhất: mỗi `StepEditorRow` giữ
NGUYÊN 4 field trạng thái `id`/`done`/`completed_at`/`log_id`/`batch_id` của
`WorkflowStep`, `ProcessStepFields.tsx` CHỈ cho sửa
`name`/`activity_type`/`instruction`/3 cờ qua `onChange(patch)` — không có ô
nhập nào đụng tới 4 field trạng thái đó, tránh đúng bug "tái dùng nhầm
StepFields.tsx của /mau-quy-trinh" mà yêu cầu đã cảnh báo trước. "Tạo quy
trình rỗng" xong tự mở modal này (khớp `openProcessStepModal()` gốc gọi
ngay sau `createEmptyWorkflow()`).

**`ProcessStepViewCard.tsx`** (mới) — 1 bước trong checklist, nhận
`isCurrent`/`isPlatformAdminMode` để quyết định hiện nút "Ghi nhật ký & hoàn
thành", ghi chú "Chờ đến lượt", hay "Đã hoàn thành" — platform_admin
**KHÔNG BAO GIỜ** thấy nút hành động dù đang ở bước "tới lượt" (hiện y hệt
"Chờ đến lượt thực hiện"), khớp `!isPlatformAdminMode` trong điều kiện
`processStepViewCard()` gốc.

Type-check + `npm run build` sạch (143 modules, không lỗi — chỉ cảnh báo
kích thước bundle, không phải lỗi).

## AppShell / Sidebar / Topbar / UserMenu

Markup/class CSS giữ NGUYÊN từ `css/app-shell.css` — không thiết kế lại.
Thêm 1 mục sidebar mới thì sửa mảng trong `useNavSections()`
(`src/layout/Sidebar.tsx`): `{ href: mainSiteUrl('trang.html'), icon:
'tên-icon', label: '...' }` cho trang TĨNH cũ, hoặc `{ to: '/route', ... }`
cho trang ĐÃ migrate (route thật trong `App.tsx`).

`useAppShellSidebar()` port đúng `setupSidebar()` gốc — nút hamburger làm 2
việc tuỳ độ rộng màn hình (dưới 960px: overlay; từ 960px: thu gọn hẳn, class
`is-sidebar-collapsed` gắn lên `<body class="app-shell">` qua
`document.body.classList` trong `useEffect`, KHÔNG gắn lên 1 wrapper con —
CSS thật target đúng `.app-shell.is-sidebar-collapsed`, xem comment trong
hook). Trạng thái thu gọn/mở nhóm nhớ qua **ĐÚNG 2 key localStorage** của
bản gốc (`agrichain:sidebarCollapsed`, `agrichain:sidebarSections`) — chỉ
đồng bộ được giữa các trang **CÙNG origin** (VD giữa các route SPA với nhau,
hoặc giữa các trang `.html` với nhau) — KHÔNG đồng bộ được XUYÊN 2 origin
SPA/site tĩnh (cùng hệ quả đã ghi ở mục "Giả định host").

## Modal (dialog)

CSS gốc target `.modal[open]` (thuộc tính `open` THẬT của `<dialog>`, không
phải class) — `useDialog()` (`src/hooks/useDialog.ts`) trả về `{ ref, open,
close }`, gọi thẳng `ref.current.showModal()`/`.close()` qua `useRef`, KHÔNG
điều khiển việc mount/unmount `<dialog>` bằng state React (`open && <dialog>`
sẽ làm mất focus-trap/animation gốc của trình duyệt và không tự có thuộc
tính `open` ở lần render đầu) — xem comment trong hook, đây là bài học port
từ đúng cảnh báo trong CLAUDE.md gốc mục "Quy ước CSS".

## Toast

`useToast()` (`src/components/ToastProvider.tsx`) — thay `AgriChain.toast(message)`.
`<AppShell>` tự mount `<ToastProvider>` 1 lần cho toàn bộ cây route bên
trong nó — component con gọi `useToast().showToast('...')`, không cần biết
DOM `.toast` nằm ở đâu.

## Thêm 1 trang mới (port từ .html cũ sang app/)

Theo đúng thứ tự đã làm với Vật tư — dùng làm checklist:

1. Đọc trang `.html` + file `js/<trang>.js` tương ứng trong CLAUDE.md gốc,
   ghi lại: field gửi lên (snake_case), field lỗi backend trả về
   (`details.field`), mã quyền (`data-requires-permission`), có nhánh
   `platform_admin` không (đọc mục "Quản trị hệ thống (platform_admin)").
2. Nếu trang cần domain API chưa có trong `src/api/`: tạo file mới theo mẫu
   `src/api/supplies.ts` (type response + `list/get/create/update/remove`
   dùng chung `request()` từ `./http`), thêm vào `src/api/index.ts`. Domain
   chỉ platform_admin xem được thì thêm vào `src/api/system.ts` theo mẫu
   `system.supplies`/`system.workflowTemplates`.
   - **Nếu trang cần 1 danh mục/enum dùng chung với site tĩnh** (VD
     `js/enums.js`'s `ACTIVITY_TYPES`, dùng lại ở `js/nong-trai-chi-tiet.js`
     gốc): port theo mẫu `src/enums.ts` (`?raw` import + thực thi IIFE thật
     — xem mục "Trang `/mau-quy-trinh`") — **KHÔNG hard-code lại danh sách**,
     đúng lý do các file `js/enums.js`-kiểu này tồn tại ở site tĩnh.
   - **Nếu trang có thao tác xoá dùng `AgriChain.confirm()`** (khác trang có
     modal xoá riêng như Vật tư): dùng `useConfirm()`
     (`src/components/ConfirmDialogProvider.tsx`, đã mount sẵn trong
     `AppShell`) — KHÔNG tự dựng modal xoá riêng nếu bản gốc dùng cơ chế
     chung này.
3. Tạo thư mục `src/pages/<ten-trang>/` — 1 component chính (`<TenTrang>Page.tsx`)
   + tách modal/bảng (hoặc lưới thẻ)/thống kê ra file riêng nếu trang có
   (theo đúng cách `pages/vat-tu/` hoặc `pages/mau-quy-trinh/` đã làm, không
   dồn hết vào 1 file). Trang có CSS riêng (khối `<style>` trong `.html` gốc)
   thì tách thành 1 file `.css` cùng thư mục, import trực tiếp trong
   component dùng nó — xem `pages/mau-quy-trinh/workflow-step.css`.
4. Thêm `<Route>` trong `App.tsx`, bọc `<ProtectedRoute><AppShell>...</AppShell></ProtectedRoute>`.
5. Sửa `useNavSections()` trong `Sidebar.tsx`: đổi mục tương ứng từ
   `{ href: mainSiteUrl('<trang>.html'), ... }` sang `{ to: '/<route>', ... }`.
6. Thêm route mới vào `KNOWN_ROUTES` trong `src/routes/postLogin.ts` — không
   thì `?redirect=` trỏ tới route đó sẽ bị `resolvePostLoginTarget()` coi là
   không hợp lệ, rơi về mặc định `/nong-trai` sau khi đăng nhập lại (xem mục
   "Trang `/login`").
7. **KHÔNG xoá trang `.html`/file `js/*.js` cũ** — để nguyên, hoạt động song
   song, cho tới khi TOÀN BỘ 16 trang đã migrate và được xác nhận ổn định
   (quyết định dọn dẹp để sau, ngoài phạm vi từng lần port).
8. Cập nhật sidebar CỦA 16 trang `.html` còn lại: thêm `data-app-link="<route>"`
   vào `<a>` tương ứng (theo đúng mẫu đã làm cho "Vật tư" — xem mục "Sidebar
   cũ trỏ sang đây") — KHÔNG phải sửa `js/app-config.js`.

## Nợ kỹ thuật / việc cố tình chưa làm trong pilot này

- **⚠️ Phiên đăng nhập giữa `app.agrichain.org.vn` và `agrichain.org.vn` —
  ĐÃ GIẢM NHẸ (2026-09-25), chưa dứt điểm** — xem mục "Giả định host" (phần
  "Hệ quả ĐÃ GIẢM NHẸ") để biết đầy đủ cơ chế cookie httpOnly +
  `bootstrapFromCookie()`. Tóm tắt: đăng nhập ở site tĩnh RỒI bấm sang SPA giờ
  KHÔNG còn bị chặn (SPA tự dò phiên qua cookie lúc mount) — nhưng vẫn CẦN
  cấu hình hosts file domain giả (`agrichain.local`/`app.agrichain.local`/
  `api.agrichain.local`) lúc dev để cookie chia sẻ được (`127.0.0.1` không
  set `Domain=` được, xem `agrichain/CLAUDE.md` mục "Kết nối backend"), đăng
  xuất vẫn chưa đồng bộ 2 chiều, và refresh token vẫn KHÔNG qua cookie (chỉ
  access token 15 phút). **SPA có trang `/login` RIÊNG** (2026-09-22, xem mục
  "Trang `/login`") vẫn còn nguyên làm lớp dự phòng khi bootstrap thất bại
  (dev qua `127.0.0.1`/`localhost`, hoặc cookie hết hạn).
- **`src/routes/postLogin.ts`'s `KNOWN_ROUTES`** hiện có 9 route
  (`/nong-trai`, `/nong-trai-chi-tiet`, `/vat-tu`, `/mau-quy-trinh`,
  `/tai-khoan`, `/lo-hang`, `/ho-so`, `/goi-phan-mem`, `/lich-su-mua-goi`) —
  thêm route mới thì PHẢI
  thêm vào đây (bước 6 ở checklist trên), không thì `?redirect=` trỏ vào
  route đó sau khi đăng nhập lại sẽ bị coi là không hợp lệ, rơi về mặc định
  `/nong-trai` (`DEFAULT_ROUTE`, ĐÃ đổi từ `/vat-tu` — giờ trỏ đúng
  `nong-trai.html` tương đương của bản gốc, không còn là "tạm" nữa).
- **CORS của `data/provinces.json`/`data/wards/{code}.json` — ĐÃ GIẢI QUYẾT**
  (2026-09-23): gặp lỗi CORS thật giữa Live Server và Vite dev server, đã đổi
  `locationData.ts` sang gọi 2 route static mới của backend
  (`${API_BASE_URL}/static/locations/...`) thay vì `mainSiteUrl()` — xem mục
  "Trang `/nong-trai`" để biết đầy đủ lý do + nợ kỹ thuật "2 nguồn dữ liệu
  song song" còn lại với site tĩnh cũ.
- **`AgriChain.confirm()` ĐÃ PORT** (2026-09-22, `ConfirmDialogProvider.tsx`,
  xem mục "Trang `/mau-quy-trinh`"). **`setupZeroDefaultInputs()` ĐÃ PORT
  CỤC BỘ** (2026-09-22, ô "Diện tích" ở `FarmFormModal.tsx` — `onFocus` chọn
  sẵn nội dung khi giá trị đang là "0", KHÔNG dựng listener toàn trang như
  bản gốc vì hiện chỉ 1 input số duy nhất trong `app/`; trang sau có thêm
  input số thì cân nhắc rút thành hook dùng chung nếu lặp lại nhiều nơi).
  **`setupTabs()` của `js/app-shell.js` gốc VẪN CHƯA port** (3 trang đã
  migrate không có tab nào). Trang sau cần thì port lúc đó, đừng port khống
  trước.
- **Domain module `src/api/`** đã có `supplies`, `workflowTemplates`,
  `farms`, `users`, `roles`, `permissions`, `seasons` (chỉ `list()`),
  `batches` (chỉ `list`/`get`/`getByCode` — trang `/lo-hang` không cần
  create/update/remove) (+ `system.supplies`, `system.workflowTemplates`,
  `system.farms`, `system.batches`, `auth`) — các domain khác của
  `js/api.js` gốc (`logs`, `certifications`, CRUD đầy đủ của `seasons`/
  `batches`, các nhánh còn lại của `system.*`) CHƯA port — thêm khi trang
  tương ứng được migrate (bước 2 ở checklist trên), chắc chắn sẽ cần khi
  `nong-trai-chi-tiet.html` migrate (trang đó là nơi CRUD lô hàng/mùa vụ/
  nhật ký/chứng nhận thật sự diễn ra).
- **Sai khác so với yêu cầu ban đầu ở `/nong-trai`**: KHÔNG có "nút mắt mở
  modal readonly" cho `platform_admin` như `/vat-tu`/`/mau-quy-trinh` — đã
  xác nhận qua đọc lại `js/nong-trai.js`'s `farmCard()` gốc rằng trang này
  KHÔNG có cơ chế đó (có `nong-trai-chi-tiet.html` riêng để xem thay thế).
  Xem đầy đủ lý do ở mục "Trang `/nong-trai`" — nếu vẫn muốn thêm, đây là
  tính năng MỚI ngoài phạm vi port, cần quyết định riêng.
- **`so-cai.html` — dangling link PORT NGUYÊN VĂN, không phải bug mới**: nút
  "Blockchain" ở `Topbar.tsx` trỏ `mainSiteUrl('so-cai.html')`, trang này
  KHÔNG tồn tại trong repo — đã xác nhận đây là link hỏng CÓ SẴN ở bản
  `vat-tu.html` gốc (và 15 trang app-shell khác), không phải lỗi phát sinh
  từ lần port này. Không tự ý sửa/xoá — ngoài phạm vi pilot.
- **`npm WARN EBADENGINE`** lúc `npm install`: Vite khai báo hỗ trợ Node
  `^18 || ^20 || >=22`, máy scaffold đang chạy Node 21 (lẻ) — chỉ là cảnh
  báo, `npm run dev`/`build` đã CHẠY THẬT và test qua (xem lịch sử làm việc),
  không chặn gì. Không cần hạ/nâng cấp Node chỉ vì cảnh báo này.
