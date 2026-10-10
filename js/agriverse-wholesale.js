/* ==========================================================================
   AgriVerse — Hộp thoại "Tính Sỉ": nhập số lượng dự kiến, xem ngay giá áp dụng (lẻ/sỉ), tổng tiền và
   khoản tiết kiệm, rồi thêm vào giỏ đúng số lượng đó. Dùng ở san-pham.html và agriverse-3d.html.
   Nạp SAU js/agriverse-cart.js. API: AgriChain.wholesale.open(product, onAdded)
   product = { id, name, price, wholesale, moq, unit, stock, img, origin }
   Quy tắc giá = AgriChain.cart.unitPrice (giá sỉ khi số lượng ≥ MOQ); đơn thật luôn do backend tính lại.
   ========================================================================== */
(function (global) {
  'use strict';
  var AgriChain = (global.AgriChain = global.AgriChain || {});

  var root = null;
  var current = null;
  var qty = 1;
  var onAdded = null;

  function money(n) { return Math.round(n).toLocaleString('vi-VN') + ' đ'; }
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }

  function maxQty() {
    return current.stock != null && current.stock > 0 ? Math.min(10000, current.stock) : 10000;
  }

  function build() {
    if (root) return;
    root = document.createElement('div');
    root.id = 'wholesale-modal';
    root.className = 'fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm hidden items-center justify-center p-4';
    root.innerHTML =
      '<div class="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl" data-ws-panel>' +
      '<div class="bg-gradient-to-br from-emerald-900 to-brand-800 text-white p-6 relative">' +
      '<button type="button" data-ws-close class="absolute top-4 right-4 w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-lg" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button>' +
      '<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold"><span class="w-2 h-2 rounded-full bg-amber-400"></span>Công cụ tính giá sỉ</span>' +
      '<h3 id="ws-name" class="text-2xl font-black mt-3 pr-8"></h3><p id="ws-meta" class="text-sm text-emerald-100 mt-1"></p></div>' +
      '<div class="p-6 space-y-5">' +
      '<div class="grid grid-cols-2 gap-3">' +
      '<div id="ws-retail" class="rounded-2xl border-2 border-slate-200 p-4 transition"><p class="text-xs text-slate-500">Chính sách bán lẻ</p><p id="ws-retail-price" class="text-xl font-black text-slate-900 mt-1"></p><p id="ws-retail-note" class="text-xs text-slate-400 mt-1"></p></div>' +
      '<div id="ws-whole" class="rounded-2xl border-2 border-slate-200 p-4 transition relative"><span id="ws-active" class="hidden absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">ĐÃ KÍCH HOẠT</span>' +
      '<p class="text-xs text-slate-500">Chính sách bán buôn (sỉ)</p><p id="ws-whole-price" class="text-xl font-black text-slate-900 mt-1"></p><p id="ws-whole-note" class="text-xs text-slate-400 mt-1"></p></div></div>' +
      '<div><p class="text-sm font-bold text-slate-700 mb-2">Số lượng dự kiến đặt mua <span id="ws-unit" class="font-normal text-slate-500"></span>:</p>' +
      '<div class="flex flex-wrap items-center gap-2">' +
      '<div class="inline-flex items-center rounded-2xl border-2 border-brand-200 overflow-hidden">' +
      '<button type="button" id="ws-minus" class="w-11 h-11 text-xl font-bold text-slate-600 hover:bg-slate-50" aria-label="Giảm">−</button>' +
      '<input id="ws-qty" type="number" min="1" inputmode="numeric" class="w-20 h-11 text-center font-bold text-lg outline-none">' +
      '<button type="button" id="ws-plus" class="w-11 h-11 text-xl font-bold text-slate-600 hover:bg-slate-50" aria-label="Tăng">+</button></div>' +
      '<button type="button" id="ws-chip-moq" class="px-3 py-2 rounded-full border border-amber-300 bg-amber-50 text-amber-800 text-sm font-semibold"></button>' +
      '<button type="button" id="ws-chip-double" class="px-3 py-2 rounded-full border border-slate-200 text-slate-600 text-sm font-semibold"></button></div>' +
      '<p id="ws-stock" class="text-xs text-slate-400 mt-2"></p></div>' +
      '<div class="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">' +
      '<div class="flex items-center justify-between text-sm"><span class="font-semibold text-slate-700">Loại giá áp dụng:</span><span id="ws-kind" class="px-3 py-1 rounded-full text-xs font-black"></span></div>' +
      '<div class="flex justify-between text-sm text-slate-600 pt-2 border-t border-emerald-100"><span>Đơn giá áp dụng:</span><strong id="ws-unitprice" class="text-slate-900"></strong></div>' +
      '<div class="flex justify-between text-sm text-slate-600"><span>Số lượng mua:</span><strong id="ws-qty-label" class="text-slate-900"></strong></div>' +
      '<div class="flex justify-between items-center pt-2 border-t border-emerald-100"><span class="font-black text-slate-900">Tổng tiền thanh toán:</span><span id="ws-total" class="text-2xl font-black font-mono text-brand-700"></span></div>' +
      '<div id="ws-tip" class="mt-2 rounded-xl p-3 text-sm"></div></div>' +
      '</div>' +
      '<div class="px-6 pb-6 flex items-center justify-end gap-3">' +
      '<button type="button" data-ws-close class="px-5 py-3 rounded-2xl text-slate-600 font-semibold hover:bg-slate-50">Đóng</button>' +
      '<button type="button" id="ws-add" class="px-6 py-3 rounded-2xl bg-brand-700 hover:bg-brand-800 text-white font-bold shadow-lg transition"></button></div>' +
      '</div>';
    document.body.appendChild(root);

    root.addEventListener('click', function (e) {
      if (e.target === root || e.target.closest('[data-ws-close]')) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    $('ws-minus').addEventListener('click', function () { setQty(qty - 1); });
    $('ws-plus').addEventListener('click', function () { setQty(qty + 1); });
    $('ws-qty').addEventListener('input', function (e) {
      var v = parseInt(e.target.value, 10);
      if (!isNaN(v)) setQty(v, true);
    });
    $('ws-qty').addEventListener('blur', function () { $('ws-qty').value = qty; });
    $('ws-chip-moq').addEventListener('click', function () { setQty(current.moq); });
    $('ws-chip-double').addEventListener('click', function () { setQty(current.moq * 2); });
    $('ws-add').addEventListener('click', addToCart);
  }

  function setQty(v, fromInput) {
    qty = Math.max(1, Math.min(maxQty(), Math.floor(v) || 1));
    render(fromInput);
  }

  function render(fromInput) {
    var p = current;
    var hasWholesale = !!(p.wholesale && p.wholesale < p.price);
    var useWholesale = hasWholesale && qty >= p.moq;
    var unitPrice = useWholesale ? p.wholesale : p.price;
    var total = unitPrice * qty;

    $('ws-retail-price').textContent = money(p.price);
    $('ws-retail-note').textContent = hasWholesale ? 'Đơn dưới ' + p.moq + ' ' + p.unit : 'Áp dụng mọi số lượng';
    $('ws-whole-price').textContent = hasWholesale ? money(p.wholesale) : '—';
    $('ws-whole-note').textContent = hasWholesale ? 'Từ ' + p.moq + ' ' + p.unit : 'Sản phẩm không bán sỉ';
    $('ws-retail').className = 'rounded-2xl border-2 p-4 transition ' + (useWholesale ? 'border-slate-200' : 'border-brand-500 bg-white');
    $('ws-whole').className = 'rounded-2xl border-2 p-4 transition relative ' + (useWholesale ? 'border-amber-500 bg-amber-50' : 'border-slate-200');
    $('ws-active').classList.toggle('hidden', !useWholesale);

    if (!fromInput) $('ws-qty').value = qty;
    $('ws-minus').disabled = qty <= 1;
    $('ws-plus').disabled = qty >= maxQty();
    $('ws-chip-moq').textContent = 'Ngưỡng sỉ (' + p.moq + ' ' + p.unit + ')';
    $('ws-chip-double').textContent = p.moq * 2 + ' ' + p.unit;
    $('ws-chip-moq').classList.toggle('hidden', !hasWholesale);
    $('ws-chip-double').classList.toggle('hidden', !hasWholesale || p.moq * 2 > maxQty());
    $('ws-stock').textContent = p.stock != null ? 'Tồn kho: ' + p.stock + ' ' + p.unit + (qty >= maxQty() ? ' — đã đạt tối đa' : '') : '';

    var kind = $('ws-kind');
    kind.textContent = useWholesale ? '★ GIÁ BÁN BUÔN (SỈ)' : 'GIÁ BÁN LẺ';
    kind.className = 'px-3 py-1 rounded-full text-xs font-black ' + (useWholesale ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700');
    $('ws-unitprice').textContent = money(unitPrice) + ' / ' + p.unit;
    $('ws-qty-label').textContent = qty + ' ' + p.unit;
    $('ws-total').textContent = money(total);

    var tip = $('ws-tip');
    if (useWholesale) {
      var saved = (p.price - p.wholesale) * qty;
      var pct = (saved / (p.price * qty)) * 100;
      tip.className = 'mt-2 rounded-xl p-3 text-sm bg-amber-50 border border-amber-200 text-amber-900';
      tip.innerHTML = '<strong>Tuyệt vời! Bạn đã đạt điều kiện giá bán buôn (sỉ).</strong><br>Tiết kiệm ngay <strong>' + money(saved) + '</strong> (giảm ' + pct.toFixed(1) + '% so với giá bán lẻ thông thường).';
    } else if (hasWholesale) {
      var need = p.moq - qty;
      var canReach = p.moq <= maxQty();
      var wouldSave = (p.price - p.wholesale) * p.moq;
      tip.className = 'mt-2 rounded-xl p-3 text-sm bg-slate-50 border border-slate-200 text-slate-700';
      tip.innerHTML = canReach
        ? 'Mua thêm <strong>' + need + ' ' + esc(p.unit) + '</strong> để đạt giá sỉ ' + money(p.wholesale) + ' / ' + esc(p.unit) + ' (tiết kiệm ' + money(wouldSave) + ' cho ' + p.moq + ' ' + esc(p.unit) + ').'
        : 'Tồn kho hiện không đủ để đạt ngưỡng giá sỉ (' + p.moq + ' ' + esc(p.unit) + ').';
    } else {
      tip.className = 'hidden';
      tip.innerHTML = '';
    }
    $('ws-add').innerHTML = '<i class="fa-solid fa-basket-shopping mr-2"></i>Thêm vào giỏ hàng (' + money(total) + ')';
  }

  function addToCart() {
    var cart = AgriChain.cart;
    if (!cart || !current) return;
    var p = current;
    var result = cart.add({ id: p.id, name: p.name, price: p.price, img: p.img, wholesale: p.wholesale, moq: p.moq, stock: p.stock }, qty);
    close();
    if (typeof onAdded === 'function') onAdded(result, p, qty);
  }

  function open(product, callback) {
    if (!product || !product.id) return;
    build();
    current = {
      id: product.id, name: product.name, price: Number(product.price) || 0,
      wholesale: product.wholesale ? Number(product.wholesale) : null,
      moq: Math.max(1, Number(product.moq) || 1), unit: product.unit || '',
      stock: product.stock == null ? null : Number(product.stock), img: product.img || '', origin: product.origin || ''
    };
    onAdded = callback || null;
    $('ws-name').textContent = current.name;
    $('ws-meta').innerHTML = 'Quy cách: <strong>' + esc(current.unit) + '</strong>' + (current.origin ? ' &nbsp;•&nbsp; Xuất xứ: <strong>' + esc(current.origin) + '</strong>' : '');
    $('ws-unit').textContent = '(' + current.unit + ')';
    // Mặc định đặt đúng ngưỡng sỉ (nếu kho đủ) để người dùng thấy ngay mức giá sỉ
    var start = current.wholesale && current.moq <= maxQty() ? current.moq : 1;
    qty = start;
    render();
    root.classList.remove('hidden');
    root.classList.add('flex');
  }

  function close() {
    if (!root) return;
    root.classList.add('hidden');
    root.classList.remove('flex');
  }

  AgriChain.wholesale = { open: open, close: close };
})(window);
