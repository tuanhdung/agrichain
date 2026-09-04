/* ==========================================================================
   AgriChain — Lớp lưu trữ (localStorage)
   Mọi trang trong app đọc/ghi dữ liệu qua đây, không gọi thẳng localStorage.
   Nạp SAU js/chain.js (hàm seal() cần AgriChain.chain).
   ========================================================================== */

(function (global) {
  'use strict';

  var PREFIX = 'agrichain:';

  // Các "bảng" dữ liệu. Mỗi bảng là một mảng lưu dưới 1 key riêng.
  var COLLECTIONS = ['users', 'farms', 'supplies', 'batches', 'events', 'ledger',
    'certifications', 'seasons', 'seasonLogs', 'orgUsers', 'shops', 'products', 'orders',
    'shippingAddresses', 'inventoryImports', 'workflowTemplates'];

  /* --- Đọc/ghi thô ---------------------------------------------------------
     localStorage có thể ném lỗi: chế độ riêng tư (Safari), người dùng tắt
     cookie, hoặc hết dung lượng (~5MB). Bọc try/catch để trang không chết
     trắng, và trả về mảng rỗng thay vì undefined. */
  function readRaw(key, fallback) {
    try {
      var text = global.localStorage.getItem(PREFIX + key);
      if (text === null) return fallback;
      return JSON.parse(text);
    } catch (err) {
      console.warn('[store] Không đọc được "' + key + '":', err);
      return fallback;
    }
  }

  function writeRaw(key, value) {
    try {
      global.localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('[store] Không ghi được "' + key + '":', err);
      return false;
    }
  }

  function list(name) {
    return readRaw(name, []);
  }

  function save(name, items) {
    return writeRaw(name, items);
  }

  /* --- Sinh id nội bộ ------------------------------------------------------
     Không dùng cho hiển thị — mã hiển thị (NV01, AGC-...) sinh riêng bên dưới. */
  function newId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function find(name, id) {
    var items = list(name);
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  function insert(name, record) {
    var items = list(name);
    record.id = record.id || newId();
    record.createdAt = record.createdAt || new Date().toISOString();
    items.push(record);
    save(name, items);
    return record;
  }

  function update(name, id, changes) {
    var items = list(name);
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        Object.keys(changes).forEach(function (key) {
          items[i][key] = changes[key];
        });
        items[i].updatedAt = new Date().toISOString();
        save(name, items);
        return items[i];
      }
    }
    return null;
  }

  function remove(name, id) {
    var items = list(name).filter(function (item) { return item.id !== id; });
    save(name, items);
  }

  /* --- Sinh mã hiển thị ----------------------------------------------------
     Nông trại: NV01, NV02...  |  Lô hàng: AGC-2608-0001 (năm+tháng tạo). */
  function nextFarmCode() {
    var count = list('farms').length + 1;
    return 'NV' + (count < 10 ? '0' + count : String(count));
  }

  function nextBatchCode() {
    var now = new Date();
    var yy = String(now.getFullYear()).slice(-2);
    var mm = String(now.getMonth() + 1);
    if (mm.length === 1) mm = '0' + mm;
    var seq = String(list('batches').length + 1);
    while (seq.length < 4) seq = '0' + seq;
    return 'AGC-' + yy + mm + '-' + seq;
  }

  /* --- Phiên đăng nhập -----------------------------------------------------
     KHÔNG phải xác thực thật: không có máy chủ nào kiểm tra gì cả, mọi thứ
     nằm trong trình duyệt và người dùng sửa được bằng DevTools. Đây là lớp
     điều hướng cho bản demo, đừng dùng cho dữ liệu thật.

     "Ghi nhớ" quyết định phiên nằm ở đâu:
       - có tick  -> localStorage, còn nguyên sau khi tắt trình duyệt;
       - không    -> sessionStorage, đóng tab là mất. */
  var SESSION_KEY = PREFIX + 'session';

  function getSession() {
    try {
      var text = global.sessionStorage.getItem(SESSION_KEY) ||
        global.localStorage.getItem(SESSION_KEY);
      return text ? JSON.parse(text) : null;
    } catch (err) {
      console.warn('[store] Không đọc được phiên:', err);
      return null;
    }
  }

  function setSession(user, remember) {
    var target = remember ? global.localStorage : global.sessionStorage;
    try {
      // Dọn bên kia trước để không còn hai phiên lệch nhau cùng lúc.
      global.localStorage.removeItem(SESSION_KEY);
      global.sessionStorage.removeItem(SESSION_KEY);
      target.setItem(SESSION_KEY, JSON.stringify(user));
      return true;
    } catch (err) {
      console.error('[store] Không ghi được phiên:', err);
      return false;
    }
  }

  function clearSession() {
    try {
      global.localStorage.removeItem(SESSION_KEY);
      global.sessionStorage.removeItem(SESSION_KEY);
    } catch (err) {
      console.warn('[store] Không xoá được phiên:', err);
    }
  }

  // Cập nhật vài field của phiên đang đăng nhập (VD sau khi trang Hồ sơ lưu
  // họ tên/SĐT...) mà không bắt đăng nhập lại — ghi thẳng lại đúng chỗ
  // (localStorage/sessionStorage) đang giữ phiên hiện tại, dựa vào việc
  // localStorage có key phiên hay không để suy ra "remember" ban đầu là gì.
  function updateSession(changes) {
    var session = getSession();
    if (!session) return null;
    Object.keys(changes).forEach(function (key) {
      session[key] = changes[key];
    });
    var remember = false;
    try {
      remember = !!global.localStorage.getItem(SESSION_KEY);
    } catch (err) {
      remember = false;
    }
    setSession(session, remember);
    return session;
  }

  /* --- Mật khẩu ------------------------------------------------------------
     Băm kèm salt ngẫu nhiên để mật khẩu không nằm dạng chữ thô trong
     localStorage. Nói cho rõ: băm ở phía trình duyệt KHÔNG phải bảo mật —
     ai mở DevTools cũng sửa được dữ liệu. Làm vậy chỉ để không tập cho mình
     thói quen lưu mật khẩu thô. */
  function randomSalt() {
    var bytes = new Uint8Array(16);
    global.crypto.getRandomValues(bytes);
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
      var part = bytes[i].toString(16);
      out += part.length === 1 ? '0' + part : part;
    }
    return out;
  }

  function hashPassword(password, salt) {
    return global.AgriChain.chain.sha256(salt + ':' + password);
  }

  function findUserByEmail(email) {
    var target = String(email || '').trim().toLowerCase();
    var users = list('users');
    for (var i = 0; i < users.length; i++) {
      if (String(users[i].email).toLowerCase() === target) return users[i];
    }
    return null;
  }

  function registerUser(data) {
    if (findUserByEmail(data.email)) {
      return Promise.reject(new Error('Email này đã được đăng ký.'));
    }
    var salt = randomSalt();
    return hashPassword(data.password, salt).then(function (hash) {
      return insert('users', {
        type: data.type,                        // 'customer' | 'org'
        fullName: String(data.fullName || '').trim(),
        orgName: String(data.orgName || '').trim(),
        taxCode: String(data.taxCode || '').trim(),
        email: String(data.email).trim(),
        salt: salt,
        passwordHash: hash
      });
    });
  }

  function login(email, password) {
    var user = findUserByEmail(email);
    if (!user) return Promise.reject(new Error('Email hoặc mật khẩu không đúng.'));

    return hashPassword(password, user.salt).then(function (hash) {
      if (hash !== user.passwordHash) {
        throw new Error('Email hoặc mật khẩu không đúng.');
      }
      return user;
    });
  }

  // Đổi mật khẩu của 1 tài khoản trong "users" (collection đăng nhập thật —
  // KHÁC "orgUsers" trong tai-khoan.html, nơi tuyệt đối không lưu mật khẩu
  // dưới bất kỳ hình thức nào, xem CLAUDE.md). Sinh salt mới + băm lại, cùng
  // cơ chế với registerUser().
  function changePassword(userId, newPassword) {
    var salt = randomSalt();
    return hashPassword(newPassword, salt).then(function (hash) {
      return update('users', userId, { salt: salt, passwordHash: hash });
    });
  }

  /* --- Niêm phong một sự kiện lên sổ cái -----------------------------------
     Băm nội dung sự kiện cùng hash khối trước rồi nối vào `ledger`, sau đó
     đánh dấu sự kiện là đã niêm phong kèm hash để giao diện hiển thị.
     Trả về Promise chứa khối vừa tạo. */
  function seal(eventId) {
    var event = find('events', eventId);
    if (!event) return Promise.reject(new Error('Không tìm thấy sự kiện: ' + eventId));
    if (event.sealed) return Promise.reject(new Error('Sự kiện này đã ghi lên blockchain rồi.'));

    var payload = {
      eventId: event.id,
      batchId: event.batchId,
      stage: event.stage,
      date: event.date,
      note: event.note || '',
      supplies: event.supplies || []
    };

    var ledger = list('ledger');
    return global.AgriChain.chain.append(ledger, payload).then(function (block) {
      ledger.push(block);
      save('ledger', ledger);
      update('events', eventId, {
        sealed: true,
        sealedAt: block.timestamp,
        hash: block.hash,
        blockIndex: block.index
      });
      return block;
    });
  }

  /* --- Niêm phong một lô hàng lên sổ cái ------------------------------------
     Cùng cơ chế với seal() ở trên nhưng băm thẳng dữ liệu lô hàng, không qua
     bảng `events` trung gian — lô hàng không phải lúc nào cũng có sự kiện
     canh tác gắn kèm, nên niêm phong trực tiếp cho đơn giản. */
  function sealBatch(batchId) {
    var batch = find('batches', batchId);
    if (!batch) return Promise.reject(new Error('Không tìm thấy lô hàng: ' + batchId));
    if (batch.sealed) return Promise.reject(new Error('Lô hàng này đã ghi lên blockchain rồi.'));

    var payload = {
      batchId: batch.id,
      code: batch.code,
      seasonId: batch.seasonId,
      farmId: batch.farmId,
      startDate: batch.startDate,
      harvestDate: batch.harvestDate,
      actualHarvestDate: batch.actualHarvestDate,
      area: batch.area,
      expectedYield: batch.expectedYield,
      unit: batch.unit,
      status: batch.status
    };

    var ledger = list('ledger');
    return global.AgriChain.chain.append(ledger, payload).then(function (block) {
      ledger.push(block);
      save('ledger', ledger);
      update('batches', batchId, {
        sealed: true,
        sealedAt: block.timestamp,
        hash: block.hash,
        blockIndex: block.index
      });
      return block;
    });
  }

  function verifyLedger() {
    return global.AgriChain.chain.verify(list('ledger'));
  }

  /* --- Xoá sạch dữ liệu demo ----------------------------------------------- */
  function reset() {
    COLLECTIONS.concat(['session']).forEach(function (key) {
      try {
        global.localStorage.removeItem(PREFIX + key);
      } catch (err) {
        console.warn('[store] Không xoá được "' + key + '":', err);
      }
    });
  }

  global.AgriChain = global.AgriChain || {};
  global.AgriChain.store = {
    COLLECTIONS: COLLECTIONS,
    list: list,
    save: save,
    find: find,
    insert: insert,
    update: update,
    remove: remove,
    newId: newId,
    nextFarmCode: nextFarmCode,
    nextBatchCode: nextBatchCode,
    getSession: getSession,
    setSession: setSession,
    updateSession: updateSession,
    clearSession: clearSession,
    changePassword: changePassword,
    findUserByEmail: findUserByEmail,
    registerUser: registerUser,
    login: login,
    seal: seal,
    sealBatch: sealBatch,
    verifyLedger: verifyLedger,
    reset: reset
  };
})(window);