/* ==========================================================================
   AgriVerse — Giỏ hàng DÙNG CHUNG cho agriverse-3d.html, san-pham.html, san-pham-chi-tiet.html,
   thanh-toan.html và tai-khoan-khach-hang.html (trước đây mỗi trang tự chép logic giỏ riêng).

   Nạp SAU js/api-config.js + js/api.js (không defer). API: AgriChain.cart.

   - Chưa đăng nhập: giỏ chỉ ở localStorage (key 'agriverse:cart').
   - Đã đăng nhập: giỏ ĐỒNG BỘ với máy chủ (GET/PUT /me/cart) nên đổi máy vẫn còn. localStorage chỉ là
     bộ nhớ đệm để vẽ ngay lúc tải trang. Máy chủ chỉ lưu product_id + số lượng + cờ tick; tên/giá/ảnh/tồn kho
     luôn lấy lại từ sản phẩm nên giá trong giỏ không bao giờ cũ.
   - Lần ĐẦU đồng bộ sau khi đăng nhập: GỘP giỏ máy này vào giỏ máy chủ (cùng sản phẩm lấy số lượng lớn hơn);
     các lần sau máy chủ là nguồn sự thật.
   - Mỗi thay đổi đẩy lên máy chủ sau 400ms (gộp nhiều thao tác liên tiếp). Lỗi mạng thì giỏ vẫn chạy cục bộ.
   - Đăng xuất: gọi AgriChain.cart.clearLocal() để người dùng kế tiếp trên cùng trình duyệt không thấy giỏ cũ.

   Giá áp dụng cho 1 dòng: giá sỉ khi sản phẩm có giá sỉ và số lượng đạt MOQ, ngược lại giá lẻ — CÙNG quy tắc
   backend (app/routers/orders.py::effective_unit_price); đơn thật luôn được backend tính lại.
   ========================================================================== */

(function (global) {
  'use strict';

  var AgriChain = (global.AgriChain = global.AgriChain || {});

  var KEY = 'agriverse:cart';
  var MERGED_KEY_PREFIX = 'agriverse:cart:merged:';
  var DIRTY_KEY = 'agriverse:cart:dirty'; // có thay đổi ở máy CHƯA đẩy lên máy chủ (vd. rời trang trong 400ms đầu)
  var MAX_QTY = 10000;
  var PUSH_DELAY_MS = 400;
  // Cùng hằng với backend (app/routers/orders.py) — số hiển thị xem trước, backend là nguồn sự thật.
  var FREESHIP_THRESHOLD = 500000;
  var SHIPPING_FEE = 30000;

  var items = loadLocal();
  var listeners = [];
  var pushTimer = null;
  var pushing = false;

  function api() {
    return AgriChain.api || null;
  }

  function loggedIn() {
    var a = api();
    return !!(a && a.isLoggedIn && a.isLoggedIn());
  }

  function userId() {
    var a = api();
    var u = a && a.getUser ? a.getUser() : null;
    return u && u.id ? u.id : null;
  }

  // --- localStorage --------------------------------------------------------------

  function sanitize(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(function (i) { return i && i.id && i.qty > 0; }) // giỏ rất cũ không có id: không đặt được, bỏ
      .map(function (i) {
        return {
          id: String(i.id),
          name: String(i.name || ''),
          price: Number(i.price) || 0,
          wholesale: i.wholesale ? Number(i.wholesale) : null,
          moq: Number(i.moq) || 1,
          stock: i.stock == null ? null : Number(i.stock),
          img: i.img || '',
          qty: Math.min(MAX_QTY, Math.max(1, Math.floor(Number(i.qty) || 1))),
          selected: i.selected !== false
        };
      });
  }

  function loadLocal() {
    try { return sanitize(JSON.parse(global.localStorage.getItem(KEY) || '[]')); } catch (e) { return []; }
  }

  function saveLocal() {
    try { global.localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* storage không dùng được: giỏ chỉ sống trong phiên */ }
  }

  function emit() {
    listeners.forEach(function (fn) { try { fn(copy()); } catch (e) { /* một trang lỗi không được chặn trang khác */ } });
  }

  function copy() {
    return items.map(function (i) { return Object.assign({}, i); });
  }

  function setDirty(on) {
    try {
      if (on) global.localStorage.setItem(DIRTY_KEY, '1');
      else global.localStorage.removeItem(DIRTY_KEY);
    } catch (e) { /* bỏ qua */ }
  }

  function isDirty() {
    try { return global.localStorage.getItem(DIRTY_KEY) === '1'; } catch (e) { return false; }
  }

  var version = 0; // tăng mỗi lần giỏ đổi: chỉ xoá cờ dirty nếu không có thay đổi mới trong lúc đẩy

  function changed() {
    version++;
    if (loggedIn()) setDirty(true);
    saveLocal();
    emit();
    schedulePush();
  }

  // --- Đồng bộ máy chủ -------------------------------------------------------------

  function fromServer(row) {
    return {
      id: String(row.product_id),
      name: row.name,
      price: Number(row.retail_price),
      wholesale: row.wholesale_price ? Number(row.wholesale_price) : null,
      moq: Number(row.moq) || 1,
      stock: Number(row.stock),
      img: row.thumbnail_url || '',
      qty: Number(row.quantity),
      selected: row.selected !== false
    };
  }

  function payload() {
    return items.map(function (i) { return { product_id: i.id, quantity: i.qty, selected: i.selected }; });
  }

  function schedulePush() {
    if (!loggedIn()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, PUSH_DELAY_MS);
  }

  function push(opts) {
    pushTimer = null;
    if (!loggedIn() || !api().cart) return Promise.resolve();
    pushing = true;
    var sentVersion = version;
    return api().cart.replace(payload(), opts).then(function (res) {
      if (sentVersion === version) setDirty(false);
      // Máy chủ trả giá/tồn kho MỚI NHẤT và bỏ sản phẩm đã gỡ — cập nhật thông tin hiển thị,
      // GIỮ số lượng/tick đang có ở máy (người dùng có thể vừa sửa tiếp trong lúc chờ).
      var byId = {};
      (res.items || []).forEach(function (row) { byId[String(row.product_id)] = fromServer(row); });
      items = items.filter(function (i) { return byId[i.id]; }).map(function (i) {
        var fresh = byId[i.id];
        return Object.assign({}, i, { name: fresh.name, price: fresh.price, wholesale: fresh.wholesale, moq: fresh.moq, stock: fresh.stock, img: fresh.img });
      });
      saveLocal();
      emit();
    }).catch(function () { /* mất mạng: giữ giỏ cục bộ, lần thay đổi sau sẽ đẩy lại */ })
      .then(function () { pushing = false; });
  }

  /* Gọi 1 lần lúc tải trang. Chưa đăng nhập thì chỉ vẽ giỏ cục bộ. */
  function init() {
    emit();
    var uid = userId();
    if (!loggedIn() || !uid || !api().cart) return Promise.resolve();
    // Đang có thay đổi chưa đẩy lên: đẩy trước rồi mới coi máy chủ là sự thật
    if (pushTimer || pushing || isDirty()) return push();

    return api().cart.get().then(function (res) {
      var server = (res.items || []).map(fromServer);
      var mergedFlag = MERGED_KEY_PREFIX + uid;
      var alreadyMerged = false;
      try { alreadyMerged = global.localStorage.getItem(mergedFlag) === '1'; } catch (e) { /* bỏ qua */ }

      if (alreadyMerged) {
        items = server;
        saveLocal();
        emit();
        return;
      }
      // Lần đầu sau đăng nhập: gộp giỏ máy này vào giỏ máy chủ rồi đẩy lên
      var byId = {};
      server.forEach(function (i) { byId[i.id] = i; });
      items.forEach(function (local) {
        if (byId[local.id]) byId[local.id].qty = Math.max(byId[local.id].qty, local.qty);
        else byId[local.id] = local;
      });
      items = Object.keys(byId).map(function (id) { return byId[id]; });
      try { global.localStorage.setItem(mergedFlag, '1'); } catch (e) { /* bỏ qua */ }
      saveLocal();
      emit();
      return push();
    }).catch(function () { /* mất mạng/API lỗi: dùng giỏ cục bộ */ });
  }

  // --- Thao tác giỏ ----------------------------------------------------------------------

  function clampQty(item, qty) {
    var max = item.stock != null && item.stock > 0 ? Math.min(MAX_QTY, item.stock) : MAX_QTY;
    return Math.min(max, Math.max(1, Math.floor(qty)));
  }

  function find(id) {
    return items.find(function (i) { return i.id === String(id); });
  }

  /* product: { id, name, price, img, wholesale, moq, stock }. Trả về { ok, limited }:
     limited = true khi số lượng bị chặn ở mức tồn kho. */
  function add(product, qty) {
    if (!product || !product.id) return { ok: false, limited: false };
    qty = qty || 1;
    var existing = find(product.id);
    var fresh = {
      name: product.name, price: Number(product.price) || 0,
      wholesale: product.wholesale ? Number(product.wholesale) : null,
      moq: Number(product.moq) || 1, stock: product.stock == null ? null : Number(product.stock),
      img: product.img || ''
    };
    var target;
    if (existing) {
      Object.assign(existing, fresh); // luôn cập nhật theo dữ liệu mới nhất của sản phẩm
      target = existing;
      target.qty = clampQty(target, existing.qty + qty);
    } else {
      target = Object.assign({ id: String(product.id), qty: 1, selected: true }, fresh);
      target.qty = clampQty(target, qty);
      items.push(target);
    }
    var limited = target.stock != null && target.stock > 0 && target.qty >= target.stock;
    changed();
    return { ok: true, limited: limited };
  }

  function setQty(id, qty) {
    var item = find(id);
    if (!item) return;
    if (qty <= 0) return remove(id);
    item.qty = clampQty(item, qty);
    changed();
  }

  function remove(id) {
    items = items.filter(function (i) { return i.id !== String(id); });
    changed();
  }

  function removeMany(ids) {
    var set = {};
    ids.forEach(function (id) { set[String(id)] = true; });
    items = items.filter(function (i) { return !set[i.id]; });
    changed();
  }

  function toggle(id) {
    var item = find(id);
    if (!item) return;
    item.selected = !item.selected;
    changed();
  }

  function unitPrice(item) {
    return item.wholesale && item.qty >= item.moq ? item.wholesale : item.price;
  }

  function totals() {
    var selected = items.filter(function (i) { return i.selected; });
    var subtotal = selected.reduce(function (sum, i) { return sum + unitPrice(i) * i.qty; }, 0);
    var shipping = subtotal > 0 && subtotal < FREESHIP_THRESHOLD ? SHIPPING_FEE : 0;
    return {
      lines: items.length,
      quantity: items.reduce(function (n, i) { return n + i.qty; }, 0),
      selectedLines: selected.length,
      subtotal: subtotal,
      shipping: shipping,
      total: subtotal + shipping
    };
  }

  /* Đăng xuất: xoá giỏ + cờ gộp ở máy này (giỏ thật vẫn còn trên máy chủ cho lần đăng nhập sau). */
  function clearLocal() {
    clearTimeout(pushTimer);
    pushTimer = null;
    var uid = userId();
    items = [];
    setDirty(false);
    try {
      global.localStorage.removeItem(KEY);
      // Bỏ cờ "đã gộp": giỏ khách vãng lai tạo sau khi đăng xuất sẽ được GỘP vào giỏ máy chủ ở lần đăng nhập tới
      if (uid) global.localStorage.removeItem(MERGED_KEY_PREFIX + uid);
    } catch (e) { /* bỏ qua */ }
    emit();
  }

  // Tab khác đổi giỏ -> cập nhật tab này
  global.addEventListener('storage', function (event) {
    if (event.key !== KEY) return;
    items = loadLocal();
    emit();
  });

  AgriChain.cart = {
    FREESHIP_THRESHOLD: FREESHIP_THRESHOLD,
    SHIPPING_FEE: SHIPPING_FEE,
    items: copy,
    add: add,
    setQty: setQty,
    remove: remove,
    removeMany: removeMany,
    toggle: toggle,
    unitPrice: unitPrice,
    totals: totals,
    onChange: function (fn) { listeners.push(fn); },
    init: init,
    clearLocal: clearLocal
  };

  // Rời/đóng trang khi còn thay đổi chưa đẩy: gửi ngay bằng keepalive (trình duyệt vẫn hoàn tất request sau khi trang đóng).
  // Nếu vẫn lỡ, cờ dirty còn đó và lần tải trang sau sẽ đẩy tiếp.
  function flushOnLeave() {
    if (pushTimer || isDirty()) {
      clearTimeout(pushTimer);
      push({ keepalive: true });
    }
  }
  global.addEventListener('pagehide', flushOnLeave);
  global.document.addEventListener('visibilitychange', function () {
    if (global.document.visibilityState === 'hidden') flushOnLeave();
  });

  // Khôi phục từ bfcache (Back sau khi đăng xuất/đăng nhập...) — đọc lại + đồng bộ
  global.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      items = loadLocal();
      init();
    }
  });
})(window);
