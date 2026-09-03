/* ==========================================================================
   AgriChain — Trang Thương mại điện tử / Máy tính tiền (POS)
   Bán hàng trực tiếp tại quầy: quét (gõ tay) mã barcode để thêm vào giỏ,
   chỉnh số lượng, chọn phương thức thanh toán rồi "Thanh toán" — lúc đó mới
   thật sự trừ tồn kho từng biến thể (products[].variants[], xem js/thuong-
   mai-san-pham.js) và ghi 1 đơn hàng MỚI vào collection "orders" với
   status "completed" (bán tại quầy = giao ngay) — đây là nơi DUY NHẤT
   trong app hiện tạo ra dữ liệu thật cho "orders" (trang Đơn hàng chỉ xem,
   xem ghi chú trong js/thuong-mai-don-hang.js).
   Nạp SAU js/store.js, js/app-shell.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var store = global.AgriChain.store;
  var session = store.getSession();

  var PAYMENT_METHODS = [
    { key: 'cash', label: 'Tiền mặt' },
    { key: 'qr', label: 'Thanh toán QR' },
    { key: 'cod', label: 'Thanh toán khi nhận hàng (COD)' },
    { key: 'card', label: 'Thẻ tín dụng' }
  ];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function svgIcon(name, className) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', className || 'icon icon--sm');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', 'icons/sprite.svg#' + name);
    svg.appendChild(use);
    return svg;
  }

  function formatVnd(value) {
    return (Number(value) || 0).toLocaleString('vi-VN') + ' đ';
  }

  function myProducts() {
    if (!session) return [];
    return store.list('products').filter(function (product) {
      return product.ownerId === session.id;
    });
  }

  function myOrders() {
    if (!session) return [];
    return store.list('orders').filter(function (order) {
      return order.ownerId === session.id;
    });
  }

  function nextOrderCode() {
    var seq = myOrders().length + 1;
    var text = String(seq);
    while (text.length < 4) text = '0' + text;
    return 'DH-' + text;
  }

  // Biến thể không có id riêng — tìm theo barcode, trả về cả sản phẩm lẫn
  // VỊ TRÍ biến thể trong mảng (giống js/thuong-mai-nhap-hang.js) để có thể
  // ghi đè đúng phần tử khi trừ tồn kho lúc thanh toán.
  function findVariantByBarcode(barcode) {
    var target = barcode.trim().toLowerCase();
    if (!target) return null;

    var products = myProducts();
    for (var i = 0; i < products.length; i++) {
      var variants = products[i].variants || [];
      for (var j = 0; j < variants.length; j++) {
        if (variants[j].barcode && variants[j].barcode.trim().toLowerCase() === target) {
          return { product: products[i], variantIndex: j, variant: variants[j] };
        }
      }
    }
    return null;
  }

  /* --- Giỏ hàng ---------------------------------------------------------------- */

  var cart = []; // [{ productId, productName, variantIndex, variantName, price, barcode, stock, quantity }]

  function cartKey(item) {
    return item.productId + ':' + item.variantIndex;
  }

  function addToCart(match) {
    var key = match.product.id + ':' + match.variantIndex;
    var existing = cart.filter(function (item) { return cartKey(item) === key; })[0];

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        productId: match.product.id,
        productName: match.product.name,
        variantIndex: match.variantIndex,
        variantName: match.variant.name || match.variant.sku || '',
        price: Number(match.variant.price) || 0,
        barcode: match.variant.barcode,
        stock: Number(match.variant.stock) || 0,
        quantity: 1
      });
    }
    renderCart();
  }

  function removeFromCart(item) {
    cart = cart.filter(function (other) { return other !== item; });
    renderCart();
  }

  function cartTotal() {
    return cart.reduce(function (sum, item) {
      return sum + item.price * item.quantity;
    }, 0);
  }

  var cartBody = document.querySelector('[data-cart-body]');
  var subtotalNode = document.querySelector('[data-subtotal]');
  var totalNode = document.querySelector('[data-total]');

  // Hàng "rỗng" nằm NGAY trong <tbody> (colspan hết các cột) thay vì ẩn cả
  // bảng — cùng cơ chế .table-empty dùng ở thuong-mai-san-pham.html/thuong-
  // mai-don-hang.html, giữ hàng tiêu đề cột luôn hiển thị.
  function emptyCartRow() {
    var row = el('tr');
    var cell = el('td', 'table-empty');
    cell.colSpan = 4;
    cell.appendChild(svgIcon('icon-shopping-cart', 'icon icon--lg'));
    cell.appendChild(el('p', null, 'Giỏ hàng trống. Hãy quét sản phẩm để bắt đầu.'));
    row.appendChild(cell);
    return row;
  }

  // Chỉ cập nhật lại đúng ô "Thành tiền" của dòng đang sửa số lượng + tổng
  // tiền chung — KHÔNG render lại toàn bộ <tbody>, vì làm vậy sẽ thay mới
  // <input> số lượng đang gõ dở, khiến focus/con trỏ bị mất sau mỗi phím gõ.
  function updateTotals() {
    var total = cartTotal();
    subtotalNode.textContent = formatVnd(total);
    totalNode.textContent = formatVnd(total);
    updateChange();
  }

  function cartRow(item) {
    var row = el('tr');

    var nameCell = el('td');
    nameCell.appendChild(el('div', 'table__name', item.productName));
    var metaText = item.variantName ? item.variantName : '';
    metaText += (metaText ? ' · ' : '') + 'Tồn: ' + item.stock;
    nameCell.appendChild(el('div', 'table__muted', metaText));
    row.appendChild(nameCell);

    row.appendChild(el('td', null, formatVnd(item.price)));

    var qtyCell = el('td');
    var qtyInput = el('input', 'input pos-cart__qty');
    qtyInput.type = 'number';
    qtyInput.min = '1';
    qtyInput.value = String(item.quantity);
    qtyInput.setAttribute('aria-label', 'Số lượng ' + item.productName);
    qtyCell.appendChild(qtyInput);
    row.appendChild(qtyCell);

    var lineCell = el('td', 'table__actions');
    var lineTotal = el('span', null, formatVnd(item.price * item.quantity));
    lineCell.appendChild(lineTotal);

    qtyInput.addEventListener('input', function () {
      item.quantity = Math.max(1, Number(qtyInput.value) || 1);
      lineTotal.textContent = formatVnd(item.price * item.quantity);
      updateTotals();
    });

    var removeButton = el('button', 'icon-btn icon-btn--danger');
    removeButton.type = 'button';
    removeButton.setAttribute('aria-label', 'Bỏ ' + item.productName + ' khỏi giỏ hàng');
    removeButton.appendChild(svgIcon('icon-trash'));
    removeButton.addEventListener('click', function () { removeFromCart(item); });
    lineCell.appendChild(removeButton);
    row.appendChild(lineCell);

    return row;
  }

  function renderCart() {
    cartBody.textContent = '';

    if (!cart.length) {
      cartBody.appendChild(emptyCartRow());
    } else {
      cart.forEach(function (item) {
        cartBody.appendChild(cartRow(item));
      });
    }

    updateTotals();
  }

  /* --- Ô quét barcode ------------------------------------------------------------ */

  var barcodeInput = document.getElementById('pos-barcode-input');
  var searchButton = document.getElementById('pos-search-btn');

  function handleScan() {
    var barcode = barcodeInput.value.trim();
    barcodeInput.value = '';
    if (!barcode) return;

    var match = findVariantByBarcode(barcode);
    if (match) {
      addToCart(match);
    } else {
      global.AgriChain.toast('Không tìm thấy sản phẩm với mã barcode "' + barcode + '".');
    }
    barcodeInput.focus();
  }

  /* --- Phương thức thanh toán + tiền mặt ----------------------------------------- */

  var paymentSelect = document.getElementById('pos-payment-method');
  var cashFields = document.querySelector('[data-cash-fields]');
  var cashGivenInput = document.getElementById('pos-cash-given');
  var changeNode = document.querySelector('[data-change]');

  function fillPaymentMethods() {
    PAYMENT_METHODS.forEach(function (method) {
      var option = el('option', null, method.label);
      option.value = method.key;
      paymentSelect.appendChild(option);
    });
  }

  function updateChange() {
    if (paymentSelect.value !== 'cash') return;
    var given = Number(cashGivenInput.value) || 0;
    var change = given - cartTotal();
    changeNode.textContent = formatVnd(Math.max(0, change));
  }

  function togglePaymentFields() {
    cashFields.hidden = paymentSelect.value !== 'cash';
    if (!cashFields.hidden) updateChange();
  }

  /* --- Thanh toán ----------------------------------------------------------------- */

  var noteInput = document.getElementById('pos-note');
  var checkoutButton = document.querySelector('[data-checkout]');

  function clearCashError() {
    var error = cashGivenInput.parentNode.querySelector('.field__error');
    if (error) error.remove();
    cashGivenInput.removeAttribute('aria-invalid');
  }

  function handleCheckout() {
    if (!cart.length) {
      global.AgriChain.toast('Giỏ hàng đang trống.');
      return;
    }

    var total = cartTotal();
    var method = paymentSelect.value;
    clearCashError();

    if (method === 'cash') {
      var given = Number(cashGivenInput.value) || 0;
      if (given < total) {
        cashGivenInput.setAttribute('aria-invalid', 'true');
        cashGivenInput.parentNode.appendChild(el('p', 'field__error', 'Tiền khách đưa chưa đủ tổng tiền.'));
        cashGivenInput.focus();
        return;
      }
    }

    // Trừ tồn kho từng biến thể trong giỏ.
    cart.forEach(function (item) {
      var product = store.find('products', item.productId);
      if (!product) return;
      var variants = product.variants.slice();
      var variant = variants[item.variantIndex];
      variants[item.variantIndex] = {
        name: variant.name,
        sku: variant.sku,
        price: variant.price,
        stock: Math.max(0, (Number(variant.stock) || 0) - item.quantity),
        barcode: variant.barcode,
        weight: variant.weight,
        unit: variant.unit,
        packaging: variant.packaging,
        length: variant.length,
        width: variant.width,
        height: variant.height,
        batchId: variant.batchId
      };
      store.update('products', product.id, { variants: variants });
    });

    // Ghi đơn hàng — bán tại quầy nên coi như đã thanh toán và giao ngay.
    store.insert('orders', {
      ownerId: session.id,
      code: nextOrderCode(),
      customerName: 'Khách tại quầy',
      customerPhone: '',
      items: cart.map(function (item) {
        return { name: item.productName + (item.variantName ? ' — ' + item.variantName : ''), quantity: item.quantity, price: item.price };
      }),
      total: total,
      paymentMethod: method,
      paymentStatus: method === 'cod' ? 'unpaid' : 'paid',
      status: 'completed',
      note: noteInput.value.trim()
    });

    global.AgriChain.toast('Đã thanh toán ' + formatVnd(total) + '.');

    cart = [];
    noteInput.value = '';
    cashGivenInput.value = '';
    paymentSelect.value = 'cash';
    togglePaymentFields();
    renderCart();
    barcodeInput.focus();
  }

  /* --- Khởi động ---------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    if (!session) return; // app-shell.js đã tự chuyển hướng về trang đăng nhập

    fillPaymentMethods();
    togglePaymentFields();
    renderCart();
    barcodeInput.focus();

    barcodeInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleScan();
      }
    });
    searchButton.addEventListener('click', handleScan);

    paymentSelect.addEventListener('change', togglePaymentFields);
    cashGivenInput.addEventListener('input', updateChange);

    checkoutButton.addEventListener('click', handleCheckout);
  });
})(window);
