/* ==========================================================================
   AgriChain — Trang Thương mại điện tử / Nhập hàng
   Quét (gõ tay) mã barcode của 1 biến thể sản phẩm để cộng thêm số lượng
   tồn kho — tìm trong collection "products" (mỗi sản phẩm có mảng
   variants, mỗi biến thể có trường barcode tuỳ chọn, xem js/thuong-mai-
   san-pham.js). Mỗi lần xác nhận ghi thêm 1 dòng lịch sử vào collection
   "inventoryImports" để xem lại.
   Nạp SAU js/store.js, js/app-shell.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var store = global.AgriChain.store;
  var session = store.getSession();

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

  function formatDateTime(iso) {
    if (!iso) return '—';
    var date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + date.getFullYear() +
      ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function myProducts() {
    if (!session) return [];
    return store.list('products').filter(function (product) {
      return product.ownerId === session.id;
    });
  }

  function myImports() {
    if (!session) return [];
    return store.list('inventoryImports').filter(function (record) {
      return record.ownerId === session.id;
    });
  }

  // Biến thể không có id riêng (xem js/thuong-mai-san-pham.js) — tìm theo
  // barcode rồi trả về cả sản phẩm lẫn VỊ TRÍ biến thể trong mảng, dùng để
  // ghi ngược lại product.variants[index].stock.
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

  /* --- Ô tìm/quét barcode ------------------------------------------------------ */

  var barcodeInput = document.getElementById('import-barcode-input');
  var searchButton = document.getElementById('import-search-btn');

  var resultCard = document.querySelector('[data-import-result]');
  var resultName = document.querySelector('[data-result-name]');
  var resultMeta = document.querySelector('[data-result-meta]');
  var resultStock = document.querySelector('[data-result-stock]');
  var resultPreview = document.querySelector('[data-result-preview]');
  var quantityInput = document.getElementById('import-quantity');

  var notFoundNode = document.querySelector('[data-import-not-found]');
  var notFoundMessage = document.querySelector('[data-not-found-message]');

  var currentMatch = null; // { product, variantIndex, variant } của lần tìm gần nhất

  function updatePreview() {
    if (!currentMatch) return;
    var quantity = Number(quantityInput.value) || 0;
    var newStock = (Number(currentMatch.variant.stock) || 0) + quantity;
    resultPreview.textContent = String(newStock);
  }

  function showResult(match) {
    currentMatch = match;
    notFoundNode.hidden = true;
    resultCard.hidden = false;

    var variantLabel = match.variant.name || match.variant.sku || 'Biến thể';
    resultName.textContent = match.product.name;
    resultMeta.textContent = variantLabel + (match.variant.sku ? ' · SKU ' + match.variant.sku : '');
    resultStock.textContent = 'Tồn kho hiện tại: ' + (Number(match.variant.stock) || 0);

    quantityInput.value = '1';
    updatePreview();
  }

  function showNotFound(barcode) {
    currentMatch = null;
    resultCard.hidden = true;
    notFoundNode.hidden = false;
    notFoundMessage.textContent = 'Không tìm thấy sản phẩm với mã barcode "' + barcode + '".';
  }

  function handleSearch() {
    var barcode = barcodeInput.value.trim();
    if (!barcode) {
      resultCard.hidden = true;
      notFoundNode.hidden = true;
      return;
    }

    var match = findVariantByBarcode(barcode);
    if (match) {
      showResult(match);
    } else {
      showNotFound(barcode);
    }
  }

  /* --- Lịch sử nhập hàng gần đây ------------------------------------------------ */

  var historyBody = document.querySelector('[data-import-history-body]');

  function historyRow(record) {
    var row = el('tr');
    var productCell = el('td');
    productCell.appendChild(el('div', 'table__name', record.productName));
    if (record.variantName) productCell.appendChild(el('div', 'table__muted', record.variantName));
    row.appendChild(productCell);

    row.appendChild(el('td', 'table__code', record.barcode));
    row.appendChild(el('td', null, '+' + record.quantity));
    row.appendChild(el('td', null, String(record.newStock)));
    row.appendChild(el('td', 'table__nowrap', formatDateTime(record.createdAt)));
    return row;
  }

  function emptyHistoryRow() {
    var row = el('tr');
    var cell = el('td', 'table-empty');
    cell.colSpan = 5;
    cell.appendChild(svgIcon('icon-barcode', 'icon icon--lg'));
    cell.appendChild(el('p', null, 'Chưa có lượt nhập hàng nào.'));
    row.appendChild(cell);
    return row;
  }

  function renderHistory() {
    var records = myImports().slice().sort(function (a, b) {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    historyBody.textContent = '';
    if (!records.length) {
      historyBody.appendChild(emptyHistoryRow());
      return;
    }

    records.forEach(function (record) {
      historyBody.appendChild(historyRow(record));
    });
  }

  /* --- Xác nhận nhập kho --------------------------------------------------------- */

  function clearQuantityError() {
    var error = quantityInput.parentNode.querySelector('.field__error');
    if (error) error.remove();
    quantityInput.removeAttribute('aria-invalid');
  }

  function handleConfirmImport() {
    if (!currentMatch) return;
    clearQuantityError();

    var quantity = Number(quantityInput.value) || 0;
    if (quantity <= 0) {
      quantityInput.setAttribute('aria-invalid', 'true');
      quantityInput.parentNode.appendChild(el('p', 'field__error', 'Nhập số lượng lớn hơn 0.'));
      quantityInput.focus();
      return;
    }

    var product = currentMatch.product;
    var variant = currentMatch.variant;
    var previousStock = Number(variant.stock) || 0;
    var newStock = previousStock + quantity;

    var variants = product.variants.slice();
    variants[currentMatch.variantIndex] = {
      name: variant.name,
      sku: variant.sku,
      price: variant.price,
      stock: newStock,
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

    store.insert('inventoryImports', {
      ownerId: session.id,
      productId: product.id,
      productName: product.name,
      variantName: variant.name || variant.sku || '',
      barcode: variant.barcode,
      quantity: quantity,
      previousStock: previousStock,
      newStock: newStock
    });

    global.AgriChain.toast('Đã nhập thêm ' + quantity + ' vào tồn kho.');

    barcodeInput.value = '';
    resultCard.hidden = true;
    notFoundNode.hidden = true;
    currentMatch = null;
    renderHistory();
    barcodeInput.focus();
  }

  /* --- Khởi động ---------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    if (!session) return; // app-shell.js đã tự chuyển hướng về trang đăng nhập

    renderHistory();
    barcodeInput.focus();

    barcodeInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSearch();
      }
    });
    searchButton.addEventListener('click', handleSearch);

    quantityInput.addEventListener('input', updatePreview);
    document.querySelector('[data-confirm-import]').addEventListener('click', handleConfirmImport);
  });
})(window);
