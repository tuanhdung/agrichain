/* ==========================================================================
   AgriChain — Lớp gọi API backend thật (FastAPI, http://127.0.0.1:8000)
   Song song với js/store.js (localStorage) — KHÔNG thay thế store.js, chỉ
   dùng cho các trang đã chuyển sang backend thật (xem mục "Kết nối backend"
   trong CLAUDE.md để biết trang nào đã chuyển, trang nào vẫn dùng store.js).
   Nạp SAU js/api-config.js, ở mọi trang, KHÔNG defer (một số trang cần gọi
   AgriChain.api.requireAuth() ngay trong <head> để tránh chớp nội dung
   trước khi chuyển hướng — script defer sẽ chạy quá trễ cho việc đó).

   Token lưu trong localStorage HOẶC sessionStorage tuỳ checkbox "Ghi nhớ
   đăng nhập" lúc submit (xem activeStorage() ngay dưới đây và api.auth.
   login()) — NỢ KỸ THUẬT vẫn còn (dù đã giảm nhẹ): cả 2 kiểu Web Storage
   đều không an toàn trước XSS như cookie httpOnly, cần chuyển hẳn sang đó
   trước khi lên production. Xem CLAUDE.md mục "Kết nối backend".
   ========================================================================== */

(function (global) {
  'use strict';

  var ACCESS_TOKEN_KEY = 'agrichain.access_token';
  var REFRESH_TOKEN_KEY = 'agrichain.refresh_token';
  var USER_KEY = 'agrichain.user';

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

  // Xoá sạch token/user còn sót ở CẢ 2 storage — gọi lúc đăng nhập, TRƯỚC
  // khi setStorageMode() đổi chế độ, để không bao giờ có tình huống 1 token
  // cũ (VD từ lần đăng nhập trước, khác chế độ "Ghi nhớ") còn nằm im ở
  // storage không active — dù không đọc/ghi qua đó nữa, vẫn là dữ liệu phiên
  // cũ vô tình còn sống trong trình duyệt lâu hơn cần thiết.
  function clearBothStorages() {
    [global.localStorage, global.sessionStorage].forEach(function (storage) {
      try {
        storage.removeItem(ACCESS_TOKEN_KEY);
        storage.removeItem(REFRESH_TOKEN_KEY);
        storage.removeItem(USER_KEY);
      } catch (err) { /* im lặng — chế độ ẩn danh có thể chặn cả 2 storage */ }
    });
  }

  /* --- Phiên đăng nhập ------------------------------------------------------ */

  function getAccessToken() {
    return readStorage(ACCESS_TOKEN_KEY);
  }

  function getRefreshToken() {
    return readStorage(REFRESH_TOKEN_KEY);
  }

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

  // data: { access_token, refresh_token, user } — user là tuỳ chọn vì
  // /auth/refresh chỉ trả về cặp token, không kèm lại thông tin user.
  function saveSession(data) {
    if (data.access_token) writeStorage(ACCESS_TOKEN_KEY, data.access_token);
    if (data.refresh_token) writeStorage(REFRESH_TOKEN_KEY, data.refresh_token);
    if (data.user) saveUser(data.user);
  }

  function clearSession() {
    removeStorage(ACCESS_TOKEN_KEY);
    removeStorage(REFRESH_TOKEN_KEY);
    removeStorage(USER_KEY);
  }

  function isLoggedIn() {
    return !!getAccessToken();
  }

  // Đọc đồng bộ từ agrichain.user đã lưu (UserOut, xem /auth/me) — KHÔNG gọi
  // API. account_type: 'customer' (khách hàng, không thuộc Đơn vị nào) hay
  // 'business' (nông hộ/doanh nghiệp, luôn có organization_id) — xác nhận
  // đúng 2 giá trị này qua app/schemas/enums.py (AccountType) của
  // agrichain-api, không phải suy đoán.
  function getAccountType() {
    var user = getUser();
    return user ? (user.account_type || null) : null;
  }

  function isBusiness() {
    return getAccountType() === 'business';
  }

  function getOrganizationId() {
    var user = getUser();
    return user ? (user.organization_id || null) : null;
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

  function performRefresh() {
    var refreshToken = getRefreshToken();
    if (!refreshToken) {
      return Promise.reject(new ApiError(401, 'UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn.', null));
    }
    return request('POST', '/auth/refresh', {
      body: { refresh_token: refreshToken },
      auth: false,
      retry: false
    }).then(function (data) {
      saveSession(data);
      return data;
    });
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
    var fetchOptions = { method: method, headers: headers };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(options.body);
    }
    if (auth) {
      var token = getAccessToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
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
  // quyết định token lưu ở localStorage (true — sống sót qua đóng/mở lại
  // trình duyệt) hay sessionStorage (false/mặc định — tự mất khi đóng hẳn
  // trình duyệt, không chỉ đóng tab). Đổi chế độ TRƯỚC saveSession() để bản
  // ghi mới đi đúng chỗ; clearBothStorages() trước đó dọn sạch token cũ ở
  // storage không active, tránh sót dữ liệu phiên cũ.
  function login(email, password, remember) {
    return request('POST', '/auth/login', {
      body: { email: email, password: password },
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

  function logout() {
    var refreshToken = getRefreshToken();
    var done = refreshToken
      ? request('POST', '/auth/logout', { body: { refresh_token: refreshToken } }).catch(function () {})
      : Promise.resolve();
    return done.then(function () {
      clearSession();
    });
  }

  // GET /auth/me trả về { user: UserOut, permissions: string[] } (xác nhận qua
  // /openapi.json thật, khuôn "MeResponse") — KHÔNG phải bản user phẳng. Phải
  // gắn permissions vào user trước khi lưu, nếu không mọi field của user
  // (full_name, email, role_id...) sẽ đọc ra undefined ở mọi nơi dùng getUser().
  function me() {
    return request('GET', '/auth/me').then(function (data) {
      var user = data.user;
      user.permissions = data.permissions || [];
      saveUser(user);
      return user;
    });
  }

  // PATCH /auth/me — tự sửa hồ sơ CHÍNH mình (full_name/phone), dùng ở
  // ho-so.html. KHÁC users.update(id, data) (PATCH /users/{id}, dành cho
  // quản trị sửa NGƯỜI KHÁC, yêu cầu quyền users.edit) — route này không
  // yêu cầu quyền gì ngoài đăng nhập, xem CLAUDE.md phía agrichain-api mục
  // "Tự sửa hồ sơ — PATCH /auth/me". Response là UserOut PHẲNG, không có
  // mảng permissions như MeResponse của me() ở trên — giữ nguyên permissions
  // đã lưu trước đó (route này không đổi được vai trò nên permissions chắc
  // chắn không đổi) rồi lưu lại NGAY, để sidebar/topbar (data-session-name...)
  // hiện tên mới mà không cần đăng nhập lại — cùng bài học đã rút ra ở
  // transfer-admin (tai-khoan.html): không được để agrichain.user lệch với
  // dữ liệu thật trên server sau khi sửa thành công.
  function updateMe(payload) {
    return request('PATCH', '/auth/me', { body: payload }).then(function (user) {
      var existing = getUser() || {};
      user.permissions = existing.permissions || [];
      saveUser(user);
      return user;
    });
  }

  // POST /auth/change-password trả về 1 cặp token MỚI (backend thu hồi hết
  // token cũ khi đổi mật khẩu) — PHẢI lưu lại ngay bằng saveSession(), nếu
  // không lần làm mới token tiếp theo của phiên hiện tại sẽ dùng refresh
  // token cũ đã bị thu hồi, tự đăng xuất oan ngay sau khi vừa đổi mật khẩu
  // thành công. Không có user trong response nên saveSession() chỉ ghi đè
  // 2 token, giữ nguyên agrichain.user đang có.
  function changePassword(oldPassword, newPassword) {
    return request('POST', '/auth/change-password', {
      body: { old_password: oldPassword, new_password: newPassword }
    }).then(function (data) {
      saveSession(data);
      return data;
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

  // Chỉ 2 hàm ĐỌC — batches CHƯA migrate CRUD sang API (nong-trai-chi-tiet.js/
  // lo-hang.js vẫn tạo/sửa/xoá qua store.js, giai đoạn 3 chưa làm tới, xem
  // CLAUDE.md mục "Kết nối backend"). Thêm 2 hàm này CHỈ để phục vụ
  // truy-xuat.js (trang công khai) tra cứu 1 lô hàng theo mã QR.
  var batches = {
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
  // giờ mồ côi, không còn nơi nào trỏ tới, xem CLAUDE.md). Gọi SAU
  // requireAuth() ở đầu <head>: giả định trang ĐÃ đăng nhập rồi mới tới
  // lượt kiểm account_type — nếu gọi khi chưa đăng nhập (auth chưa chạy,
  // hoặc gọi nhầm thứ tự), !isLoggedIn() sớm return true luôn, để
  // requireAuth() (nếu có gọi) tự xử lý ca "chưa đăng nhập",
  // requireBusiness() không giẫm lên việc đó.
  var pageRequiresBusiness = false;

  function requireBusiness() {
    pageRequiresBusiness = true;
    if (!isLoggedIn()) return true;
    if (!isBusiness()) {
      global.location.href = 'agriverse-3d.html';
      return false;
    }
    return true;
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
  global.addEventListener('pageshow', function (event) {
    if (!event.persisted) return;
    if (pageRequiresAuth && !isLoggedIn()) {
      redirectToLogin();
      return;
    }
    if (pageRequiresBusiness && isLoggedIn() && !isBusiness()) {
      global.location.href = 'agriverse-3d.html';
    }
  });

  global.AgriChain = global.AgriChain || {};
  global.AgriChain.api = {
    ApiError: ApiError,
    isLoggedIn: isLoggedIn,
    hasPermission: hasPermission,
    getUser: getUser,
    getAccessToken: getAccessToken,
    clearSession: clearSession,
    requireAuth: requireAuth,
    getAccountType: getAccountType,
    isBusiness: isBusiness,
    getOrganizationId: getOrganizationId,
    requireBusiness: requireBusiness,
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
    batches: batches
  };
})(window);
