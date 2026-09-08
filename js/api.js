/* ==========================================================================
   AgriChain — Lớp gọi API backend thật (FastAPI, http://127.0.0.1:8000)
   Song song với js/store.js (localStorage) — KHÔNG thay thế store.js, chỉ
   dùng cho các trang đã chuyển sang backend thật (xem mục "Kết nối backend"
   trong CLAUDE.md để biết trang nào đã chuyển, trang nào vẫn dùng store.js).
   Nạp SAU js/api-config.js, ở mọi trang, KHÔNG defer (một số trang cần gọi
   AgriChain.api.requireAuth() ngay trong <head> để tránh chớp nội dung
   trước khi chuyển hướng — script defer sẽ chạy quá trễ cho việc đó).

   Token lưu trong localStorage (agrichain.access_token/refresh_token/user)
   — NỢ KỸ THUẬT đã biết, xem CLAUDE.md: cần chuyển sang cookie httpOnly
   trước khi lên production, localStorage không an toàn trước XSS.
   ========================================================================== */

(function (global) {
  'use strict';

  var ACCESS_TOKEN_KEY = 'agrichain.access_token';
  var REFRESH_TOKEN_KEY = 'agrichain.refresh_token';
  var USER_KEY = 'agrichain.user';

  /* --- Đọc/ghi localStorage — bọc try/catch giống store.js, không để trang
     chết trắng nếu localStorage không dùng được (chế độ ẩn danh...). ------- */
  function readStorage(key) {
    try {
      return global.localStorage.getItem(key);
    } catch (err) {
      console.warn('[api] Không đọc được "' + key + '":', err);
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      global.localStorage.setItem(key, value);
    } catch (err) {
      console.error('[api] Không ghi được "' + key + '":', err);
    }
  }

  function removeStorage(key) {
    try {
      global.localStorage.removeItem(key);
    } catch (err) {
      console.warn('[api] Không xoá được "' + key + '":', err);
    }
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

  function login(email, password) {
    return request('POST', '/auth/login', {
      body: { email: email, password: password },
      auth: false,
      retry: false
    }).then(function (data) {
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

  function changePassword(oldPassword, newPassword) {
    return request('POST', '/auth/change-password', {
      body: { old_password: oldPassword, new_password: newPassword }
    });
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

  /* --- Bảo vệ trang cần đăng nhập --------------------------------------------
     Gọi ở đầu <head> bằng script THƯỜNG (không defer) để chuyển hướng trước
     khi nội dung trang kịp vẽ ra. */
  function requireAuth() {
    if (isLoggedIn()) return true;
    var here = global.location.pathname.split('/').pop() + global.location.search;
    global.location.href = 'dang-nhap.html?redirect=' + encodeURIComponent(here);
    return false;
  }

  global.AgriChain = global.AgriChain || {};
  global.AgriChain.api = {
    ApiError: ApiError,
    isLoggedIn: isLoggedIn,
    hasPermission: hasPermission,
    getUser: getUser,
    getAccessToken: getAccessToken,
    clearSession: clearSession,
    requireAuth: requireAuth,
    auth: {
      login: login,
      logout: logout,
      me: me,
      changePassword: changePassword
    },
    users: users,
    roles: roles,
    permissions: permissions,
    farms: farms,
    seasons: seasons,
    logs: logs,
    supplies: supplies,
    certifications: certifications,
    workflowTemplates: workflowTemplates
  };
})(window);
