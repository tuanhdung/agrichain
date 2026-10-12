/* ==========================================================================
   AgriChain — Lớp gọi API backend thật (FastAPI, http://127.0.0.1:8000)
   Song song với js/store.js (localStorage) — KHÔNG thay thế store.js, chỉ
   dùng cho các trang đã chuyển sang backend thật (xem mục "Kết nối backend"
   trong CLAUDE.md để biết trang nào đã chuyển, trang nào vẫn dùng store.js).
   Nạp SAU js/api-config.js, ở mọi trang, KHÔNG defer (một số trang cần gọi
   AgriChain.api.requireAuth() ngay trong <head> để tránh chớp nội dung
   trước khi chuyển hướng — script defer sẽ chạy quá trễ cho việc đó).

   KHÔNG còn lưu access/refresh token ở bất kỳ đâu phía trình duyệt: backend
   giữ chúng trong cookie httpOnly (access_token Path=/, refresh_token
   Path=/auth) mà JS không đọc được, mọi request gửi kèm cookie qua
   `credentials: 'include'`. Web Storage chỉ còn giữ `agrichain.user` (hồ sơ +
   quyền, KHÔNG phải bí mật) làm GỢI Ý để vẽ giao diện đồng bộ ngay lúc tải
   trang (requireAuth()/isBusiness()/hasPermission() đều đồng bộ) và cờ
   "Ghi nhớ đăng nhập" (localStorage hay sessionStorage, xem activeStorage()).
   Gợi ý này KHÔNG phải xác thực: quyền thật luôn do backend quyết định, và bị
   xoá ngay khi gặp 401 không làm mới được. Xem CLAUDE.md mục "Kết nối backend".
   ========================================================================== */

(function (global) {
  'use strict';

  var USER_KEY = 'agrichain.user';
  // Khoá token của các phiên bản CŨ (trước khi chuyển sang cookie-only) — chỉ
  // còn dùng để DỌN sạch, không bao giờ đọc/ghi nữa.
  var LEGACY_TOKEN_KEYS = ['agrichain.access_token', 'agrichain.refresh_token'];

  // Di trú một lần: xoá token cũ còn sót trong Web Storage của người dùng đã
  // đăng nhập từ bản trước (idempotent, chạy lại mỗi lần tải trang cũng vô hại).
  function purgeLegacyTokens() {
    [global.localStorage, global.sessionStorage].forEach(function (storage) {
      try {
        LEGACY_TOKEN_KEYS.forEach(function (key) { storage.removeItem(key); });
      } catch (err) { /* chế độ ẩn danh có thể chặn storage — bỏ qua */ }
    });
  }
  purgeLegacyTokens();

  /* --- Chọn storage: localStorage (Ghi nhớ đăng nhập) hay sessionStorage
     (không ghi nhớ — tự đăng xuất khi đóng hẳn trình duyệt) -----------------
     `STORAGE_MODE_KEY` là cờ nhỏ ('local'/'session') đánh dấu ĐANG dùng
     storage nào — bản thân cờ này LUÔN nằm ở localStorage (không phải nơi
     lưu token, không nhạy cảm) vì nó phải đọc được NGAY LÚC TẢI TRANG, TRƯỚC
     khi biết nên tìm token ở đâu — đặt cờ vào sessionStorage sẽ tự phá vỡ
     mục đích của chính nó (sessionStorage mất khi đóng trình duyệt, cờ cũng
     mất theo, không còn gì để biết "lần trước dùng sessionStorage"). Toàn bộ
     hàm đọc/ghi/xoá token bên dưới đi qua `activeStorage()`, không gọi thẳng
     `localStorage.*`/`sessionStorage.*` nữa. */
  var STORAGE_MODE_KEY = 'agrichain.storage_mode';

  function getStorageMode() {
    try {
      return global.localStorage.getItem(STORAGE_MODE_KEY) === 'session' ? 'session' : 'local';
    } catch (err) {
      return 'local';
    }
  }

  function setStorageMode(mode) {
    try {
      global.localStorage.setItem(STORAGE_MODE_KEY, mode);
    } catch (err) {
      console.warn('[api] Không ghi được chế độ lưu phiên:', err);
    }
  }

  // Đọc lại chế độ "Ghi nhớ đăng nhập" hiện tại (không đổi gì) — dùng khi cần
  // TỰ đăng nhập lại ngầm (VD sau transfer-admin ở tai-khoan.js, xem
  // CLAUDE.md) để giữ đúng lựa chọn ban đầu của người dùng, không vô tình
  // đổi 1 phiên "không ghi nhớ" thành "ghi nhớ" hay ngược lại.
  function isRemembered() {
    return getStorageMode() === 'local';
  }

  function activeStorage() {
    return getStorageMode() === 'session' ? global.sessionStorage : global.localStorage;
  }

  /* --- Đọc/ghi storage đang active — bọc try/catch giống store.js, không để
     trang chết trắng nếu localStorage/sessionStorage không dùng được (chế
     độ ẩn danh...). ---------------------------------------------------------- */
  function readStorage(key) {
    try {
      return activeStorage().getItem(key);
    } catch (err) {
      console.warn('[api] Không đọc được "' + key + '":', err);
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      activeStorage().setItem(key, value);
    } catch (err) {
      console.error('[api] Không ghi được "' + key + '":', err);
    }
  }

  function removeStorage(key) {
    try {
      activeStorage().removeItem(key);
    } catch (err) {
      console.warn('[api] Không xoá được "' + key + '":', err);
    }
  }

  // Xoá sạch hồ sơ gợi ý (và token cũ nếu còn) ở CẢ 2 storage — gọi lúc đăng
  // nhập, TRƯỚC khi setStorageMode() đổi chế độ, để bản `agrichain.user` của
  // lần đăng nhập trước (khác chế độ "Ghi nhớ") không nằm im ở storage không
  // active.
  function clearBothStorages() {
    [global.localStorage, global.sessionStorage].forEach(function (storage) {
      try {
        storage.removeItem(USER_KEY);
      } catch (err) { /* im lặng — chế độ ẩn danh có thể chặn cả 2 storage */ }
    });
    purgeLegacyTokens();
  }

  /* --- Phiên đăng nhập ------------------------------------------------------ */

  function saveUser(user) {
    if (!user) return;
    writeStorage(USER_KEY, JSON.stringify(user));
  }

  function getUser() {
    var text = readStorage(USER_KEY);
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (err) {
      return null;
    }
  }

  // data: response của /auth/login — chỉ lấy `user` để lưu gợi ý giao diện.
  // access_token/refresh_token trong body CỐ TÌNH bị bỏ qua: bản thật nằm
  // trong cookie httpOnly do backend đặt, không bao giờ chạm vào JS/Web Storage.
  function saveSession(data) {
    if (data && data.user) saveUser(data.user);
  }

  function clearSession() {
    removeStorage(USER_KEY);
    purgeLegacyTokens();
  }

  // "Có vẻ đã đăng nhập" theo gợi ý đã lưu — JS không đọc được cookie httpOnly
  // nên không thể biết chắc. Dùng để quyết định vẽ giao diện/điều hướng sớm;
  // phiên hết hạn thật sẽ lộ ra ở lần gọi API đầu tiên (401 -> làm mới thất bại
  // -> clearSession()).
  function isLoggedIn() {
    return !!getUser();
  }

  // Đọc đồng bộ từ agrichain.user đã lưu (UserOut, xem /auth/me) — KHÔNG gọi
  // API. account_type: 'customer' (khách hàng, không thuộc Đơn vị nào),
  // 'business' (nông hộ/doanh nghiệp, luôn có organization_id), hoặc
  // 'platform_admin' (Quản trị hệ thống, đứng trên mọi Đơn vị, organization_id
  // luôn NULL — CHECK ràng buộc DB, xem migrations/010_platform_admin_accounts.sql)
  // — xác nhận đúng 3 giá trị này qua app/schemas/enums.py (AccountType) của
  // agrichain-api, không phải suy đoán.
  function getAccountType() {
    var user = getUser();
    return user ? (user.account_type || null) : null;
  }

  function isBusiness() {
    return getAccountType() === 'business';
  }

  function isPlatformAdmin() {
    return getAccountType() === 'platform_admin';
  }

  function getOrganizationId() {
    var user = getUser();
    return user ? (user.organization_id || null) : null;
  }

  // organization_is_distributor (MeResponse, xem me() bên dưới): true = Đơn vị
  // phân phối (công ty vận hành AgriChain — "Đơn vị mặc định"), false = Đơn vị
  // khác (nông trại tự đăng ký qua register/business), null = tài khoản
  // 'customer' (không thuộc Đơn vị nào, khái niệm này không áp dụng). Đọc đồng
  // bộ từ agrichain.user đã lưu, KHÔNG gọi API.
  // ⚠️ MỒ CÔI kể từ 2026-09-14 (xem CLAUDE.md mục "Quản trị hệ thống
  // (platform_admin)"): hàm này TỪNG dùng để ẩn/chặn nhóm menu "Thương mại
  // điện tử" khỏi Đơn vị không phải nhà phân phối, nhưng yêu cầu đã đổi lại
  // — TMĐT giờ CHỈ dành cho platform_admin, không còn phân biệt theo
  // is_distributor nữa (`requireDistributor()`/`updateDistributorOnlyNav()`
  // đều đã bỏ điều kiện này). Không còn nơi nào gọi `isDistributor()` trong
  // dự án — vẫn giữ nguyên hàm + field `organization_is_distributor`
  // (backend/migration 009 cũng KHÔNG xoá) để dành cho mục đích khác sau
  // này, cùng cách xử lý đã áp dụng cho `orgUsers`/`workflowTemplates`
  // (store.js)/`js/chain.js`.
  function isDistributor() {
    var user = getUser();
    return !!(user && user.organization_is_distributor === true);
  }

  // Kiểm tra quyền trong mảng quyền đã lưu của user (từ /auth/me) — dùng để
  // ẩn/hiện nút trên giao diện. Đã xác nhận qua /openapi.json + dữ liệu thật
  // của GET /permissions, /roles: mảng quyền luôn là chuỗi mã quyền
  // ("farms.view"...), không phải object — không cần đoán 2 dạng nữa.
  function hasPermission(code) {
    var user = getUser();
    if (!user || !user.permissions) return false;
    return user.permissions.indexOf(code) !== -1;
  }

  /* --- Lỗi API --------------------------------------------------------------
     Luôn có .status (mã HTTP, 0 = lỗi mạng), .code, .message (tiếng Việt,
     hiển thị thẳng được), .details (VD { field: 'email' }). */
  function ApiError(status, code, message, details) {
    var err = Error.call(this, message) || this;
    err.name = 'ApiError';
    err.status = status;
    err.code = code;
    err.message = message;
    err.details = details || null;
    return err;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  var DEFAULT_MESSAGES = {
    400: 'Yêu cầu không hợp lệ.',
    401: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
    403: 'Bạn không có quyền thực hiện thao tác này.',
    404: 'Không tìm thấy dữ liệu.',
    409: 'Dữ liệu đã tồn tại hoặc xung đột với dữ liệu hiện có.'
  };
  var DEFAULT_CODES = {
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT'
  };

  // Response không đúng khuôn { error: {...} } (lỗi 500 trần, HTML báo lỗi
  // của proxy/webserver...) → dùng thông báo mặc định theo mã HTTP thay vì
  // hiện chuỗi rác cho người dùng.
  function buildApiError(status, body) {
    if (body && body.error && body.error.message) {
      return new ApiError(
        status,
        body.error.code || DEFAULT_CODES[status] || 'INTERNAL_ERROR',
        body.error.message,
        body.error.details || null
      );
    }
    return new ApiError(
      status,
      DEFAULT_CODES[status] || 'INTERNAL_ERROR',
      DEFAULT_MESSAGES[status] || 'Lỗi máy chủ, vui lòng thử lại sau.',
      null
    );
  }

  function networkError() {
    return new ApiError(
      0,
      'NETWORK_ERROR',
      'Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.',
      null
    );
  }

  /* --- Ghép query string, bỏ qua tham số rỗng ------------------------------- */
  function buildQuery(query) {
    if (!query) return '';
    var parts = [];
    Object.keys(query).forEach(function (key) {
      var value = query[key];
      if (value === undefined || value === null || value === '') return;
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    });
    return parts.length ? '?' + parts.join('&') : '';
  }

  /* --- Tự làm mới token khi gặp 401 -----------------------------------------
     Giữ CHUNG một Promise refresh ở phạm vi module — nhiều request 401 cùng
     lúc thì tất cả chờ chung 1 lần gọi /auth/refresh, không được gọi song
     song (backend xoay vòng refresh token, gọi song song sẽ khiến token bị
     thu hồi và đăng xuất oan). */
  var refreshPromise = null;

  // Không gửi body: backend đọc refresh token từ cookie httpOnly (Path=/auth)
  // và tự đặt lại cặp cookie mới trong response.
  function performRefresh() {
    return request('POST', '/auth/refresh', { auth: false, retry: false });
  }

  function refreshTokenOnce() {
    if (!refreshPromise) {
      refreshPromise = performRefresh().catch(function (err) {
        clearSession();
        var here = global.location.pathname.split('/').pop() + global.location.search;
        global.location.href = 'dang-nhap.html?redirect=' + encodeURIComponent(here);
        throw err;
      }).then(function (data) {
        refreshPromise = null;
        return data;
      }, function (err) {
        refreshPromise = null;
        throw err;
      });
    }
    return refreshPromise;
  }

  /* --- Hàm request lõi -------------------------------------------------------
     request(method, path, { body, query, auth = true, retry = true })
     Trả về Promise<dữ liệu đã parse JSON> (204 → null). */
  function request(method, path, options) {
    options = options || {};
    var auth = options.auth !== false;
    var retry = options.retry !== false;
    var url = global.AgriChain.API_BASE_URL + path + buildQuery(options.query);

    var headers = {};
    // credentials: 'include' — gửi kèm cookie httpOnly access_token (set bởi
    // /auth/login, /auth/refresh, /auth/change-password, xem CLAUDE.md mục
    // "Kết nối backend") dù gọi CROSS-ORIGIN sang backend (api.*). Bắt buộc
    // phải có để cookie Domain=COOKIE_DOMAIN hoạt động — thiếu dòng này thì
    // trình duyệt coi như request "ẩn danh", không đính kèm cookie dù đã có
    // sẵn. KHÔNG còn header Authorization: phiên chỉ nằm trong cookie httpOnly.
    // `options.auth` giờ chỉ quyết định có tự làm mới token khi gặp 401 hay không.
    var fetchOptions = { method: method, headers: headers, credentials: 'include' };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(options.body);
    }

    return global.fetch(url, fetchOptions)
      .catch(function () {
        throw networkError();
      })
      .then(function (response) {
        if (response.status === 204) return null;

        return response.text().then(function (text) {
          var body = null;
          if (text) {
            try { body = JSON.parse(text); } catch (err) { body = null; }
          }

          if (response.ok) return body;

          if (response.status === 401 && auth && retry) {
            return refreshTokenOnce().then(function () {
              return request(method, path, {
                body: options.body,
                query: options.query,
                auth: auth,
                retry: false
              });
            });
          }

          throw buildApiError(response.status, body);
        });
      });
  }

  /* --- auth ------------------------------------------------------------- */

  // `remember` (boolean, đọc từ checkbox "Ghi nhớ đăng nhập" ở dang-nhap.html)
  // gửi lên backend để chọn cookie sống lâu (true) hay cookie phiên, mất khi
  // đóng hẳn trình duyệt (false); đồng thời quyết định hồ sơ gợi ý
  // `agrichain.user` nằm ở localStorage hay sessionStorage cho khớp. Đổi chế độ
  // TRƯỚC saveSession() để bản ghi mới đi đúng chỗ; clearBothStorages() trước
  // đó dọn sạch bản cũ ở storage không active.
  function login(email, password, remember) {
    return request('POST', '/auth/login', {
      body: { email: email, password: password, remember: !!remember },
      auth: false,
      retry: false
    }).then(function (data) {
      clearBothStorages();
      setStorageMode(remember ? 'local' : 'session');
      saveSession(data);
      // /auth/login có thể chưa kèm đầy đủ mảng quyền — gọi thêm /auth/me để
      // có bản user đầy đủ nhất (kèm quyền) rồi ghi đè lại bản vừa lưu.
      return me();
    });
  }

  // Không gửi body: backend đọc refresh token (thu hồi đúng phiên này) và
  // access token từ cookie rồi tự xoá cả hai. Luôn xoá gợi ý phía trình duyệt kể
  // cả khi gọi API lỗi (mất mạng) — người dùng đã bấm Đăng xuất thì giao diện
  // phải coi như đã thoát.
  function logout() {
    return request('POST', '/auth/logout', { auth: false, retry: false })
      .catch(function () {})
      .then(function () {
        clearSession();
      });
  }

  // GET /auth/me trả về { user: UserOut, permissions: string[],
  // organization_is_distributor: bool|null } (xác nhận qua /openapi.json thật,
  // khuôn "MeResponse") — KHÔNG phải bản user phẳng, và
  // organization_is_distributor nằm PHẲNG cùng cấp với user, KHÔNG lồng bên
  // trong (UserOut dùng chung nhiều endpoint khác không cần field này). Phải
  // gắn permissions/organization_is_distributor vào user trước khi lưu, nếu
  // không mọi field của user (full_name, email, role_id...) sẽ đọc ra
  // undefined ở mọi nơi dùng getUser().
  function me() {
    return request('GET', '/auth/me').then(function (data) {
      var user = data.user;
      user.permissions = data.permissions || [];
      user.organization_is_distributor = data.organization_is_distributor;
      saveUser(user);
      return user;
    });
  }

  // PATCH /auth/me — tự sửa hồ sơ CHÍNH mình (full_name/phone), dùng ở
  // ho-so.html. KHÁC users.update(id, data) (PATCH /users/{id}, dành cho
  // quản trị sửa NGƯỜI KHÁC, yêu cầu quyền users.edit) — route này không
  // yêu cầu quyền gì ngoài đăng nhập, xem CLAUDE.md phía agrichain-api mục
  // "Tự sửa hồ sơ — PATCH /auth/me". Response là UserOut PHẲNG, không có
  // mảng permissions/organization_is_distributor như MeResponse của me() ở
  // trên — giữ nguyên 2 field đó từ bản đã lưu trước đó (route này không đổi
  // được vai trò hay Đơn vị nên cả 2 chắc chắn không đổi) rồi lưu lại NGAY,
  // để sidebar/topbar (data-session-name...) hiện tên mới mà không cần đăng
  // nhập lại — cùng bài học đã rút ra ở transfer-admin (tai-khoan.html):
  // không được để agrichain.user lệch với dữ liệu thật trên server sau khi
  // sửa thành công.
  function updateMe(payload) {
    return request('PATCH', '/auth/me', { body: payload }).then(function (user) {
      var existing = getUser() || {};
      user.permissions = existing.permissions || [];
      user.organization_is_distributor = existing.organization_is_distributor;
      saveUser(user);
      return user;
    });
  }

  // POST /auth/change-password: backend thu hồi hết refresh token cũ rồi tự đặt
  // lại cặp cookie MỚI trong response — trình duyệt tự áp dụng, JS không phải
  // làm gì để phiên hiện tại không bị đăng xuất oan. (Body vẫn có cặp token mới
  // nhưng bị bỏ qua, xem saveSession().)
  function changePassword(oldPassword, newPassword) {
    return request('POST', '/auth/change-password', {
      body: { old_password: oldPassword, new_password: newPassword }
    });
  }

  // Công khai (auth: false), không tự đăng nhập sau khi tạo — trang gọi
  // xong tự tiếp tục bằng api.auth.login(email, password) nếu muốn vào thẳng
  // (đúng mô tả "Đăng nhập bằng POST /auth/login sau khi đăng ký" của
  // agrichain-api). Trả về UserOut (201) khi thành công.
  // payload: { email, password, full_name, phone? }
  function registerCustomer(payload) {
    return request('POST', '/auth/register/customer', { body: payload, auth: false, retry: false });
  }

  // payload: { organization: { name, tax_code?, phone?, address? }, email,
  // password, full_name, phone? } — xem RegisterBusinessRequest/
  // OrganizationRegisterInfo trong agrichain-api (trường `phone` lồng riêng
  // trong `organization` là số của Đơn vị, khác `phone` ở cấp ngoài là số
  // của người đăng ký, không được gộp chung).
  function registerBusiness(payload) {
    return request('POST', '/auth/register/business', { body: payload, auth: false, retry: false });
  }

  /* --- users ------------------------------------------------------------- */

  var users = {
    list: function (params) {
      return request('GET', '/users', { query: params });
    },
    get: function (id) {
      return request('GET', '/users/' + id);
    },
    create: function (data) {
      return request('POST', '/users', { body: data });
    },
    update: function (id, data) {
      return request('PATCH', '/users/' + id, { body: data });
    },
    deactivate: function (id) {
      return request('DELETE', '/users/' + id);
    },
    resetPassword: function (id, newPassword) {
      return request('POST', '/users/' + id + '/reset-password', { body: { new_password: newPassword } });
    },
    // data: { new_role_id_for_current_admin, password } — password là mật
    // khẩu HIỆN TẠI của người gọi (xác thực lại danh tính), không phải mật
    // khẩu mới; khớp đúng tên field của TransferAdminRequest, không đổi tên
    // sang camelCase vì trang gọi hàm này tự chịu trách nhiệm map đúng field
    // (cùng quy ước với mọi hàm *.update() khác ở file này).
    transferAdmin: function (id, data) {
      return request('POST', '/users/' + id + '/transfer-admin', { body: data });
    }
  };

  /* --- roles / permissions ------------------------------------------------ */

  var roles = {
    list: function () {
      return request('GET', '/roles');
    },
    get: function (id) {
      return request('GET', '/roles/' + id);
    },
    create: function (data) {
      return request('POST', '/roles', { body: data });
    },
    update: function (id, data) {
      return request('PATCH', '/roles/' + id, { body: data });
    },
    remove: function (id) {
      return request('DELETE', '/roles/' + id);
    }
  };

  var permissions = {
    list: function () {
      return request('GET', '/permissions');
    }
  };

  /* --- farms / seasons / logs / supplies / certifications -----------------
     Khuôn CRUD chuẩn giống users/roles ở trên — chỉ bọc mỏng quanh
     request(), không tự suy luận gì thêm (validate/đổi tên field sang
     snake_case là việc của từng trang, xem CLAUDE.md mục "Kết nối backend"). */

  var farms = {
    list: function (params) {
      return request('GET', '/farms', { query: params });
    },
    // options tuỳ chọn { auth: false } — dùng ở truy-xuat.js (trang công khai,
    // GET /farms/{id} đã mở public-read) để KHÔNG gắn Authorization header dù
    // trình duyệt đang có sẵn token (VD admin quét QR bằng máy đã đăng nhập) —
    // tránh trường hợp token hết hạn kích hoạt refresh/redirect oan trên trang
    // không cần đăng nhập này.
    get: function (id, options) {
      return request('GET', '/farms/' + id, options);
    },
    create: function (data) {
      return request('POST', '/farms', { body: data });
    },
    update: function (id, data) {
      return request('PATCH', '/farms/' + id, { body: data });
    },
    remove: function (id) {
      return request('DELETE', '/farms/' + id);
    }
  };

  var seasons = {
    list: function (params) {
      return request('GET', '/seasons', { query: params });
    },
    // options tuỳ chọn { auth: false } — xem ghi chú tương tự ở farms.get() trên.
    get: function (id, options) {
      return request('GET', '/seasons/' + id, options);
    },
    create: function (data) {
      return request('POST', '/seasons', { body: data });
    },
    update: function (id, data) {
      return request('PATCH', '/seasons/' + id, { body: data });
    },
    remove: function (id) {
      return request('DELETE', '/seasons/' + id);
    }
  };

  var logs = {
    list: function (params) {
      return request('GET', '/logs', { query: params });
    },
    get: function (id) {
      return request('GET', '/logs/' + id);
    },
    create: function (data) {
      return request('POST', '/logs', { body: data });
    },
    update: function (id, data) {
      return request('PATCH', '/logs/' + id, { body: data });
    },
    remove: function (id) {
      return request('DELETE', '/logs/' + id);
    }
  };

  var supplies = {
    list: function (params) {
      return request('GET', '/supplies', { query: params });
    },
    get: function (id) {
      return request('GET', '/supplies/' + id);
    },
    create: function (data) {
      return request('POST', '/supplies', { body: data });
    },
    update: function (id, data) {
      return request('PATCH', '/supplies/' + id, { body: data });
    },
    remove: function (id) {
      return request('DELETE', '/supplies/' + id);
    }
  };

  var certifications = {
    list: function (params) {
      return request('GET', '/certifications', { query: params });
    },
    get: function (id) {
      return request('GET', '/certifications/' + id);
    },
    create: function (data) {
      return request('POST', '/certifications', { body: data });
    },
    update: function (id, data) {
      return request('PATCH', '/certifications/' + id, { body: data });
    },
    remove: function (id) {
      return request('DELETE', '/certifications/' + id);
    }
  };

  var workflowTemplates = {
    list: function (params) {
      return request('GET', '/workflow-templates', { query: params });
    },
    get: function (id) {
      return request('GET', '/workflow-templates/' + id);
    },
    create: function (data) {
      return request('POST', '/workflow-templates', { body: data });
    },
    update: function (id, data) {
      return request('PATCH', '/workflow-templates/' + id, { body: data });
    },
    remove: function (id) {
      return request('DELETE', '/workflow-templates/' + id);
    }
  };

  // ĐÃ CHUYỂN TOÀN BỘ CRUD sang API (2026-09-12) — nong-trai-chi-tiet.js
  // (tạo/sửa/xoá trong tab "Lô hàng") và lo-hang.js (danh sách + lọc) đều
  // dùng chung khối này. Khuôn CRUD chuẩn giống farms/seasons ở trên.
  var batches = {
    list: function (params) {
      return request('GET', '/batches', { query: params });
    },
    // options tuỳ chọn { auth: false } — dùng ở truy-xuat.js, cùng lý do với
    // farms.get()/seasons.get() ở trên.
    get: function (id, options) {
      return request('GET', '/batches/' + id, options);
    },
    // GET /batches (danh sách, có q=code) yêu cầu đăng nhập — KHÔNG dùng
    // được ở trang công khai. Route riêng này (public-read, xem CLAUDE.md
    // phía backend) tra CHÍNH XÁC theo mã, thay cho mẫu loadFarmByCode() vốn
    // chỉ áp dụng được cho trang ĐÃ đăng nhập.
    getByCode: function (code, options) {
      return request('GET', '/batches/by-code/' + encodeURIComponent(code), options);
    },
    create: function (data) {
      return request('POST', '/batches', { body: data });
    },
    update: function (id, data) {
      return request('PATCH', '/batches/' + id, { body: data });
    },
    remove: function (id) {
      return request('DELETE', '/batches/' + id);
    }
  };

  /* --- system.* — 7 route CHỈ ĐỌC cho platform_admin, nhìn xuyên mọi Đơn vị -
     GET /system/farms|seasons|logs|certifications|supplies|workflow-templates|
     batches — backend chặn cứng bằng require_platform_admin (account_type
     khác đều 403), KHÔNG dùng cơ chế permission thông thường nên không có
     create/update/remove nào ở đây (đúng nghĩa READ-ONLY, không phải chỉ
     thiếu quyền). Mỗi bản ghi trả về kèm `organization_name` (field PHẲNG,
     KHÔNG có ở *Out thường) để phân biệt vì mã nông trại/mùa vụ... có thể
     TRÙNG giữa các Đơn vị khác nhau (org-scoped từ đầu). Response vẫn đúng
     khuôn `Page` chung `{ items, total, page, page_size }` như farms/seasons/
     batches... nhưng KHÔNG có `q` tìm kiếm — chỉ `page`/`page_size`, xác nhận
     qua router thật (app/routers/system.py), không suy đoán. */
  var system = {
    farms: {
      list: function (params) {
        return request('GET', '/system/farms', { query: params });
      }
    },
    seasons: {
      list: function (params) {
        return request('GET', '/system/seasons', { query: params });
      }
    },
    logs: {
      list: function (params) {
        return request('GET', '/system/logs', { query: params });
      }
    },
    certifications: {
      list: function (params) {
        return request('GET', '/system/certifications', { query: params });
      }
    },
    supplies: {
      list: function (params) {
        return request('GET', '/system/supplies', { query: params });
      }
    },
    workflowTemplates: {
      list: function (params) {
        return request('GET', '/system/workflow-templates', { query: params });
      }
    },
    batches: {
      list: function (params) {
        return request('GET', '/system/batches', { query: params });
      }
    }
  };

  /* --- Bảo vệ trang cần đăng nhập --------------------------------------------
     Gọi ở đầu <head> bằng script THƯỜNG (không defer) để chuyển hướng trước
     khi nội dung trang kịp vẽ ra. */
  function redirectToLogin() {
    var here = global.location.pathname.split('/').pop() + global.location.search;
    global.location.href = 'dang-nhap.html?redirect=' + encodeURIComponent(here);
  }

  // Đánh dấu trang HIỆN TẠI có gọi requireAuth() hay không — dùng ở listener
  // 'pageshow' bên dưới để biết có cần kiểm tra lại phiên đăng nhập khi trang
  // được khôi phục từ bfcache hay không (tránh áp nhầm vào trang công khai
  // như index.html/truy-xuat.html, vốn không gọi requireAuth() nên cờ này
  // luôn ở false). Biến nội bộ trong closure — không cần lộ ra
  // AgriChain.api vì cả requireAuth() lẫn listener pageshow đều nằm chung
  // module này.
  var pageRequiresAuth = false;

  function requireAuth() {
    pageRequiresAuth = true;
    if (isLoggedIn()) return true;
    redirectToLogin();
    return false;
  }

  // Chặn trang dành riêng cho tài khoản 'business' (nông hộ/doanh nghiệp) —
  // account_type='customer' bị đá sang agriverse-3d.html (trang thương mại
  // điện tử ĐANG DÙNG THẬT của dự án, KHÔNG phải ecommerce.html — trang đó
  // giờ mồ côi, không còn nơi nào trỏ tới, xem CLAUDE.md). 'platform_admin'
  // (2026-09-13, đổi hướng thiết kế — xem CLAUDE.md mục "Quản trị hệ thống
  // (platform_admin)"): dùng CHUNG giao diện 16 trang app-shell với
  // 'business' thay vì có 1 trang riêng — coi là HỢP LỆ ở đây, KHÔNG bị đá
  // đi, chỉ khác nguồn dữ liệu (mỗi trang tự gọi api.system.* thay vì
  // api.farms.*... khi isPlatformAdmin(), xem js/nong-trai.js). Gọi SAU
  // requireAuth() ở đầu <head>: giả định trang ĐÃ đăng nhập rồi mới tới
  // lượt kiểm account_type — nếu gọi khi chưa đăng nhập (auth chưa chạy,
  // hoặc gọi nhầm thứ tự), !isLoggedIn() sớm return true luôn, để
  // requireAuth() (nếu có gọi) tự xử lý ca "chưa đăng nhập",
  // requireBusiness() không giẫm lên việc đó.
  var pageRequiresBusiness = false;

  function requireBusiness() {
    pageRequiresBusiness = true;
    if (!isLoggedIn()) return true;
    if (!isBusiness() && !isPlatformAdmin()) {
      global.location.href = 'agriverse-3d.html';
      return false;
    }
    return true;
  }

  // Chặn 7 trang "Thương mại điện tử" (thuong-mai-*.html) khỏi mọi tài khoản
  // KHÔNG phải platform_admin — dùng riêng cho nhóm 7 trang này, KHÔNG áp
  // cho 9 trang admin còn lại. 2026-09-14: đổi lại lần nữa theo yêu cầu đã
  // xác nhận rõ — TMĐT giờ CHỈ dành cho platform_admin, KỂ CẢ business của
  // Đơn vị phân phối thật (organization_is_distributor === true, VD
  // admin@agrichain.vn) cũng không còn được vào nữa. Trước đó (2026-09-12,
  // rồi sửa lại 2026-09-13) hàm này kiểm `organization_is_distributor` qua
  // `isDistributor()` — cờ đó giờ KHÔNG còn dùng ở đâu trong frontend nữa
  // (mồ côi, xem CLAUDE.md, cùng cách xử lý orgUsers/workflowTemplates/
  // js/chain.js — KHÔNG xoá hàm `isDistributor()`/migration/cột DB, chỉ
  // ngừng gọi). Người bị chặn ở đây vẫn là account_type='business' hợp lệ
  // (không phải 'customer') — đá về khu quản trị chung, KHÔNG phải
  // agriverse-3d.html (đích dành riêng cho 'customer'). Gọi SAU
  // requireAuth()/requireBusiness() ở đầu <head>: giả định trang ĐÃ đăng
  // nhập rồi mới tới lượt kiểm — nếu gọi khi chưa đăng nhập hoặc là
  // 'customer', !isLoggedIn() hoặc !isBusiness() sớm return true luôn, để 2
  // hàm kia (đã gọi trước) tự xử lý ca của mình, requireDistributor() không
  // giẫm lên việc đó.
  //
  // /nong-trai giờ là route SPA (đã xoá nong-trai.html tĩnh cùng 8 trang
  // "Hoạt động sản xuất" khác, xem CLAUDE.md mục "Kết nối backend") — dùng
  // AgriChain.APP_SPA_URL (js/app-config.js, đã nạp trước api.js ở cả 7 trang
  // thuong-mai-*) thay vì href tương đối cũ. Người bị đá sẽ cần đăng nhập lại
  // 1 lần nữa trên SPA (2 origin không chia sẻ được localStorage, xem
  // app/CLAUDE.md mục "Giả định host") — nợ kỹ thuật đã biết.
  var pageRequiresDistributor = false;

  function requireDistributor() {
    pageRequiresDistributor = true;
    if (!isLoggedIn() || isPlatformAdmin()) return true;
    if (!isBusiness()) return true;
    global.location.href = (global.AgriChain.APP_SPA_URL || '') + '/nong-trai';
    return false;
  }

  // Bug bảo mật đã vá (2026-09-08): đăng xuất xong bấm nút Back của trình
  // duyệt có thể hiện lại trang cần đăng nhập (VD nong-trai.html) kèm dữ
  // liệu cũ, dù access token đã bị xoá — do trình duyệt khôi phục trang từ
  // bfcache (back-forward cache) thay vì tải lại thật, nên requireAuth() ở
  // <head> (chỉ chạy đúng 1 lần lúc tải trang ban đầu) không có cơ hội chạy
  // lại để phát hiện phiên đã mất. Sự kiện 'pageshow' báo lại MỌI lần trang
  // được hiển thị, kể cả khi khôi phục từ bfcache (`event.persisted ===
  // true`, không có ở lần tải trang bình thường đầu tiên) — nghe sự kiện
  // này ở phạm vi toàn cục (mọi trang có nạp api.js).
  //
  // Áp THÊM đúng mẫu này cho requireBusiness() (2026-09-11): kịch bản tương
  // tự nhưng không cần đăng xuất — tài khoản 'business' A xem xong 1 trang
  // quản trị, đăng xuất, tài khoản 'customer' B đăng nhập TRÊN CÙNG trình
  // duyệt, rồi bấm Back → bfcache khôi phục lại trang quản trị của A, phiên
  // hiện tại (B) vẫn còn access token HỢP LỆ (requireAuth() sẽ không bắt
  // được ca này, vì B đang đăng nhập thật) nhưng sai account_type. Vì vậy 2
  // điều kiện xét ĐỘC LẬP nhau trong cùng 1 listener, không gộp else-if:
  // mất đăng nhập thì về trang đăng nhập; còn đăng nhập nhưng sai loại tài
  // khoản thì về agriverse-3d.html (không phải ecommerce.html, xem ghi chú
  // ở requireBusiness()).
  //
  // Áp THÊM đúng mẫu này cho requireDistributor() (2026-09-12, điều kiện cập
  // nhật 2026-09-14 theo TMĐT giờ chỉ dành riêng platform_admin): kịch bản
  // tương tự — platform_admin A xem xong 1 trang thuong-mai-*.html, đăng
  // xuất, tài khoản business B đăng nhập TRÊN CÙNG trình duyệt (bất kể Đơn
  // vị của B có phải phân phối hay không — không còn quan trọng nữa), rồi
  // bấm Back → bfcache khôi phục lại trang của A, phiên hiện tại (B) vẫn còn
  // access token HỢP LỆ và là 'business' (requireAuth()/requireBusiness()
  // không bắt được ca này, B vẫn hợp lệ ở 2 hàm đó) nhưng không phải
  // platform_admin. `isBusiness()` một mình đã đủ điều kiện — platform_admin
  // không bao giờ `isBusiness()` (account_type khác), không cần thêm
  // `!isPlatformAdmin()`. Cả 3 điều kiện xét ĐỘC LẬP nhau trong cùng 1
  // listener, không gộp else-if, vì mỗi điều kiện đá về 1 đích khác nhau.
  global.addEventListener('pageshow', function (event) {
    if (!event.persisted) return;
    if (pageRequiresAuth && !isLoggedIn()) {
      redirectToLogin();
      return;
    }
    if (pageRequiresBusiness && isLoggedIn() && !isBusiness() && !isPlatformAdmin()) {
      global.location.href = 'agriverse-3d.html';
      return;
    }
    if (pageRequiresDistributor && isLoggedIn() && isBusiness()) {
      global.location.href = (global.AgriChain.APP_SPA_URL || '') + '/nong-trai';
    }
  });

  global.AgriChain = global.AgriChain || {};
  global.AgriChain.api = {
    ApiError: ApiError,
    isLoggedIn: isLoggedIn,
    hasPermission: hasPermission,
    getUser: getUser,
    clearSession: clearSession,
    requireAuth: requireAuth,
    getAccountType: getAccountType,
    isBusiness: isBusiness,
    getOrganizationId: getOrganizationId,
    isDistributor: isDistributor,
    isPlatformAdmin: isPlatformAdmin,
    requireBusiness: requireBusiness,
    requireDistributor: requireDistributor,
    isRemembered: isRemembered,
    auth: {
      login: login,
      logout: logout,
      me: me,
      updateMe: updateMe,
      changePassword: changePassword,
      registerCustomer: registerCustomer,
      registerBusiness: registerBusiness
    },
    users: users,
    roles: roles,
    permissions: permissions,
    farms: farms,
    seasons: seasons,
    logs: logs,
    supplies: supplies,
    certifications: certifications,
    workflowTemplates: workflowTemplates,
    batches: batches,
    system: system
  };
})(window);
