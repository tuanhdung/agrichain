/* ==========================================================================
   AgriVerse — Ngăn kéo giỏ hàng dùng chung cho san-pham.html, san-pham-chi-tiet.html,
   tai-khoan-khach-hang.html (agriverse-3d.html có ngăn kéo riêng; thanh-toan.html không dùng).
   Nạp SAU js/agriverse-cart.js. Tự gắn vào mọi link giỏ hàng (a[href*="gio-hang=1"]) để mở ngay tại trang,
   không đá người dùng về trang chủ sàn. Mọi quy tắc giá/tồn kho nằm ở AgriChain.cart.
   ========================================================================== */
(function (global) {
  'use strict';
  var AgriChain = (global.AgriChain = global.AgriChain || {});
  var cart = AgriChain.cart;
  if (!cart) return;

  var root = null;

  function money(n) { return Number(n).toLocaleString('vi-VN') + ' đ'; }
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }

  function build() {
    if (root) return;
    root = document.createElement('div');
    root.id = 'cart-drawer';
    root.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm hidden justify-end';
    root.innerHTML =
      '<div class="w-full max-w-md bg-white h-full shadow-2xl flex flex-col" data-drawer-panel>' +
      '<div class="bg-gradient-to-r from-emerald-900 to-brand-800 text-white p-5 flex items-start justify-between">' +
      '<div class="flex items-center gap-3"><div class="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-xl"><i class="fa-solid fa-bag-shopping"></i></div>' +
      '<div><div class="flex items-center gap-2"><h3 class="text-lg font-black">Giỏ Hàng Mua Sắm</h3>' +
      '<span id="cd-pill" class="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black">0 món</span></div>' +
      '<p class="text-xs text-emerald-100/90 mt-0.5">Nông sản sạch xác thực nguồn gốc Blockchain</p></div></div>' +
      '<button type="button" data-drawer-close class="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-lg" aria-label="Đóng giỏ hàng"><i class="fa-solid fa-xmark"></i></button></div>' +
      '<div class="px-5 py-3 bg-emerald-50 border-b border-emerald-100"><div class="flex items-center justify-between text-sm">' +
      '<span id="cd-ship-text" class="text-slate-700"></span><span id="cd-ship-percent" class="text-xs font-bold text-brand-700"></span></div>' +
      '<div class="mt-2 h-1.5 rounded-full bg-emerald-100 overflow-hidden"><div id="cd-ship-bar" class="h-full bg-brand-600 rounded-full transition-all duration-300" style="width:0%"></div></div></div>' +
      '<div id="cd-items" class="flex-1 overflow-y-auto px-5 divide-y divide-slate-100"></div>' +
      '<div class="px-5 pt-4 pb-5 border-t border-slate-100 bg-slate-50/60 space-y-3">' +
      '<div class="space-y-1.5 text-sm text-slate-600">' +
      '<div class="flex justify-between"><span id="cd-sub-label">Tạm tính (0 món được chọn):</span><strong id="cd-sub" class="font-mono text-slate-900">0 đ</strong></div>' +
      '<div class="flex justify-between"><span>Phí vận chuyển dự kiến:</span><strong id="cd-ship" class="font-mono text-slate-900">0 đ</strong></div></div>' +
      '<div class="flex justify-between items-center pt-2 border-t border-slate-200"><span class="font-black text-slate-900">Tổng thanh toán:</span>' +
      '<span id="cd-total" class="text-2xl font-black font-mono text-brand-700">0 đ</span></div>' +
      '<p id="cd-warn" class="hidden text-xs text-red-600"></p>' +
      '<button type="button" id="cd-checkout" class="w-full py-3.5 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-2xl shadow-lg transition">Tiến Hành Đặt Hàng <i class="fa-solid fa-arrow-right ml-1"></i></button>' +
      '</div></div>';
    document.body.appendChild(root);

    root.addEventListener('click', function (e) {
      if (e.target === root || e.target.closest('[data-drawer-close]')) return close();
      var qtyBtn = e.target.closest('[data-cd-qty]');
      if (qtyBtn && !qtyBtn.disabled) {
        var item = cart.items().find(function (i) { return i.id === qtyBtn.dataset.cdQty; });
        if (item) cart.setQty(item.id, item.qty + Number(qtyBtn.dataset.delta));
        return;
      }
      var rm = e.target.closest('[data-cd-remove]');
      if (rm) cart.remove(rm.dataset.cdRemove);
    });
    root.addEventListener('change', function (e) {
      var t = e.target.closest('[data-cd-toggle]');
      if (t) cart.toggle(t.dataset.cdToggle);
    });
    $('cd-checkout').addEventListener('click', function () {
      if (cart.totals().selectedLines === 0) {
        var w = $('cd-warn');
        w.textContent = 'Hãy chọn ít nhất 1 món để đặt hàng.';
        w.classList.remove('hidden');
        return;
      }
      global.location.href = 'thanh-toan.html';
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    cart.onChange(render);
    render();
  }

  function render() {
    if (!root) return;
    var items = cart.items();
    var t = cart.totals();
    $('cd-pill').textContent = t.lines + ' món';
    $('cd-warn').classList.add('hidden');
    var box = $('cd-items');
    if (!items.length) {
      box.innerHTML = '<p class="text-sm text-slate-400 text-center py-16"><i class="fa-solid fa-basket-shopping text-4xl text-slate-200 block mb-3"></i>Giỏ hàng của bạn đang trống.</p>';
    } else {
      box.innerHTML = items.map(function (item) {
        var wholesaleOn = item.wholesale && item.qty >= item.moq;
        var atStock = item.stock != null && item.stock > 0 && item.qty >= item.stock;
        var id = esc(item.id);
        return '<div class="flex items-start gap-3 py-4">' +
          '<input type="checkbox" ' + (item.selected ? 'checked' : '') + ' data-cd-toggle="' + id + '" class="mt-8 w-5 h-5 accent-brand-600 flex-shrink-0">' +
          '<div class="w-20 h-20 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center flex-shrink-0">' +
          (item.img ? '<img src="' + esc(item.img) + '" alt="" class="w-full h-full object-cover">' : '<i class="fa-solid fa-seedling text-2xl text-slate-300"></i>') + '</div>' +
          '<div class="flex-1 min-w-0"><div class="flex items-start justify-between gap-2">' +
          '<p class="font-bold text-slate-900 text-sm leading-snug">' + esc(item.name) + '</p>' +
          '<button type="button" data-cd-remove="' + id + '" class="text-slate-300 hover:text-red-500 transition" aria-label="Xoá khỏi giỏ"><i class="fa-regular fa-trash-can"></i></button></div>' +
          '<p class="text-sm font-mono font-bold text-brand-700 mt-0.5">' + money(cart.unitPrice(item)) +
          (wholesaleOn ? ' <span class="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold font-sans">Giá sỉ</span>' : '') + '</p>' +
          (item.wholesale && !wholesaleOn ? '<p class="text-[11px] text-amber-600 mt-0.5">Mua từ ' + item.moq + ' để được giá sỉ ' + money(item.wholesale) + '</p>' : '') +
          '<div class="flex items-center justify-between mt-3"><div class="inline-flex items-center rounded-full border border-slate-200">' +
          '<button type="button" data-cd-qty="' + id + '" data-delta="-1" class="w-8 h-8 font-bold text-slate-600 hover:text-brand-700" aria-label="Giảm">−</button>' +
          '<span class="w-8 text-center font-mono font-bold text-sm">' + item.qty + '</span>' +
          '<button type="button" data-cd-qty="' + id + '" data-delta="1" ' + (atStock ? 'disabled' : '') + ' class="w-8 h-8 font-bold text-slate-600 hover:text-brand-700 disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Tăng">+</button></div>' +
          '<span class="font-mono font-bold text-slate-900 text-sm">' + money(cart.unitPrice(item) * item.qty) + '</span></div>' +
          (atStock ? '<p class="text-[11px] text-slate-400 mt-1">Đã đạt tồn kho tối đa (' + item.stock + ').</p>' : '') +
          '</div></div>';
      }).join('');
    }
    var th = cart.FREESHIP_THRESHOLD;
    var pct = Math.min(100, Math.round(t.subtotal / th * 100));
    $('cd-ship-text').innerHTML = t.subtotal >= th
      ? '<i class="fa-solid fa-truck-fast text-brand-600 mr-1.5"></i>Bạn được <strong>MIỄN PHÍ</strong> vận chuyển!'
      : '<i class="fa-solid fa-truck-fast text-amber-500 mr-1.5"></i>Mua thêm <strong>' + money(th - t.subtotal) + '</strong> để FREESHIP';
    $('cd-ship-percent').textContent = pct + '%';
    $('cd-ship-bar').style.width = pct + '%';
    $('cd-sub-label').textContent = 'Tạm tính (' + t.selectedLines + ' món được chọn):';
    $('cd-sub').textContent = money(t.subtotal);
    $('cd-ship').textContent = money(t.shipping);
    $('cd-total').textContent = money(t.total);
  }

  function open() {
    build();
    render();
    root.classList.remove('hidden');
    root.classList.add('flex');
  }

  function close() {
    if (!root) return;
    root.classList.add('hidden');
    root.classList.remove('flex');
  }

  AgriChain.cartDrawer = { open: open, close: close };

  // Trang có ngăn kéo riêng (agriverse-3d) hoặc trang thanh toán thì không chặn link giỏ hàng
  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('cart-modal') || /thanh-toan/.test(global.location.pathname)) return;
    Array.prototype.forEach.call(document.querySelectorAll('a[href*="gio-hang=1"]'), function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); open(); });
    });
    if (new URLSearchParams(global.location.search).get('gio-hang') === '1') open();
  });
})(window);
