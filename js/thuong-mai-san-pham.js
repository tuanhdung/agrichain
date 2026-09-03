/* ==========================================================================
   AgriChain — Trang Thương mại điện tử / Sản phẩm
   Danh sách + thêm/sửa/xoá sản phẩm của cửa hàng. Mỗi sản phẩm thuộc về
   Đơn vị đang đăng nhập (ownerId = session.id, cùng quy ước với "shops" —
   xem js/thuong-mai-tong-quan.js). Mỗi sản phẩm có thể có nhiều "biến thể"
   (size/quy cách đóng gói khác nhau), mỗi biến thể tuỳ chọn gắn với 1 lô
   hàng thật trong collection "batches" để truy xuất nguồn gốc.
   Nạp SAU js/store.js, js/app-shell.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var store = global.AgriChain.store;
  var session = store.getSession();

  var CATEGORIES = ['Cà Phê Nhân', 'Hồ Tiêu', 'Gạo', 'Đồ uống', 'Gia vị'];
  var PRODUCT_TYPES = ['Nguyên liệu thô', 'Nông sản tươi', 'Đã qua sơ chế', 'Hàng đóng gói'];
  var VARIANT_UNITS = ['KG', 'G', 'L', 'Cái', 'Hộp', 'Thùng'];
  var STATUSES = [
    { key: 'draft', label: 'Bản nháp', badge: 'badge--neutral' },
    { key: 'published', label: 'Đã đăng', badge: 'badge--success' },
    { key: 'archived', label: 'Lưu trữ', badge: 'badge--warning' }
  ];

  function statusOf(key) {
    for (var i = 0; i < STATUSES.length; i++) {
      if (STATUSES[i].key === key) return STATUSES[i];
    }
    return STATUSES[0];
  }

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
    var num = Number(value) || 0;
    return num.toLocaleString('vi-VN') + ' đ';
  }

  function myProducts() {
    if (!session) return [];
    return store.list('products').filter(function (product) {
      return product.ownerId === session.id;
    });
  }

  function minPrice(product) {
    var variants = product.variants || [];
    if (!variants.length) return null;
    var prices = variants.map(function (v) { return Number(v.price) || 0; });
    return Math.min.apply(null, prices);
  }

  function nextSku() {
    var seq = myProducts().length + 1;
    var text = String(seq);
    while (text.length < 3) text = '0' + text;
    return 'SKU-' + text;
  }

  /* --- Danh sách + bộ lọc ---------------------------------------------------- */

  var searchInput = document.getElementById('product-search');
  var categoryFilter = document.getElementById('product-filter-category');
  var statusFilter = document.getElementById('product-filter-status');
  var sortSelect = document.getElementById('product-filter-sort');

  var tablePanel = document.querySelector('[data-product-table-panel]');
  var tableBody = document.querySelector('[data-product-table-body]');
  var emptyNode = document.querySelector('[data-product-empty]');
  var emptyTitle = document.querySelector('[data-product-empty-title]');
  var emptyDesc = document.querySelector('[data-product-empty-desc]');
  var emptyAction = document.querySelector('[data-product-empty-action]');

  function fillFilterOptions() {
    CATEGORIES.forEach(function (category) {
      var option = el('option', null, category);
      option.value = category;
      categoryFilter.appendChild(option);
    });
    STATUSES.forEach(function (status) {
      var option = el('option', null, status.label);
      option.value = status.key;
      statusFilter.appendChild(option);
    });
  }

  function filteredProducts() {
    var all = myProducts();
    var keyword = searchInput.value.trim().toLowerCase();
    var category = categoryFilter.value;
    var status = statusFilter.value;

    var result = all.filter(function (product) {
      if (keyword) {
        var haystack = (product.name + ' ' + product.sku).toLowerCase();
        if (haystack.indexOf(keyword) === -1) return false;
      }
      if (category && product.category !== category) return false;
      if (status && product.status !== status) return false;
      return true;
    });

    var sort = sortSelect.value;
    result.sort(function (a, b) {
      if (sort === 'oldest') return (a.createdAt || '').localeCompare(b.createdAt || '');
      if (sort === 'price-asc') return (minPrice(a) || 0) - (minPrice(b) || 0);
      if (sort === 'price-desc') return (minPrice(b) || 0) - (minPrice(a) || 0);
      return (b.createdAt || '').localeCompare(a.createdAt || ''); // 'newest' mặc định
    });

    return result;
  }

  function productRow(product) {
    var row = el('tr');

    var imageCell = el('td');
    if (product.images && product.images.length) {
      var img = document.createElement('img');
      img.src = product.images[0];
      img.alt = '';
      img.className = 'table__thumb';
      imageCell.appendChild(img);
    } else {
      var placeholder = el('div', 'table__thumb table__thumb--placeholder');
      placeholder.appendChild(svgIcon('icon-box', 'icon icon--sm'));
      imageCell.appendChild(placeholder);
    }
    row.appendChild(imageCell);

    row.appendChild(el('td', 'table__name', product.name));
    row.appendChild(el('td', 'table__code', product.sku));
    row.appendChild(el('td', 'table__muted', product.type || '—'));

    var price = minPrice(product);
    row.appendChild(el('td', null, price != null ? formatVnd(price) : 'Chưa có giá'));

    var statusCell = el('td');
    var status = statusOf(product.status);
    statusCell.appendChild(el('span', 'badge ' + status.badge, status.label));
    row.appendChild(statusCell);

    var actionsCell = el('td', 'table__actions');

    var editButton = el('button', 'icon-btn');
    editButton.type = 'button';
    editButton.setAttribute('aria-label', 'Sửa ' + product.name);
    editButton.setAttribute('data-tooltip', 'Sửa');
    editButton.appendChild(svgIcon('icon-pencil'));
    editButton.addEventListener('click', function () { openModal(product); });
    actionsCell.appendChild(editButton);

    var deleteButton = el('button', 'icon-btn icon-btn--danger');
    deleteButton.type = 'button';
    deleteButton.setAttribute('aria-label', 'Xoá ' + product.name);
    deleteButton.setAttribute('data-tooltip', 'Xoá');
    deleteButton.appendChild(svgIcon('icon-trash'));
    deleteButton.addEventListener('click', function () { handleDelete(product); });
    actionsCell.appendChild(deleteButton);

    row.appendChild(actionsCell);

    return row;
  }

  function render() {
    var totalCount = myProducts().length;
    var products = filteredProducts();

    tableBody.textContent = '';

    if (!products.length) {
      tablePanel.hidden = true;
      emptyNode.hidden = false;

      if (totalCount === 0) {
        emptyTitle.textContent = 'Chưa có sản phẩm nào';
        emptyDesc.textContent = 'Thêm sản phẩm đầu tiên để bắt đầu đăng bán trên gian hàng của bạn.';
        emptyAction.hidden = false;
      } else {
        emptyTitle.textContent = 'Không tìm thấy sản phẩm nào';
        emptyDesc.textContent = 'Thử thay đổi từ khoá tìm kiếm hoặc bộ lọc.';
        emptyAction.hidden = true;
      }
      return;
    }

    tablePanel.hidden = false;
    emptyNode.hidden = true;
    products.forEach(function (product) {
      tableBody.appendChild(productRow(product));
    });
  }

  function handleDelete(product) {
    global.AgriChain.confirm(
      'Xoá sản phẩm "' + product.name + '"? Hành động này không thể hoàn tác.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      store.remove('products', product.id);
      render();
      global.AgriChain.toast('Đã xoá sản phẩm.');
    });
  }

  /* --- Ảnh sản phẩm (nhiều ảnh) ------------------------------------------------ */

  var imagesInput = document.getElementById('product-images-input');
  var imagesGrid = document.querySelector('[data-product-images-grid]');
  var productImages = []; // [dataUrl, ...] của sản phẩm đang mở trong modal

  function renderProductImages() {
    imagesGrid.textContent = '';
    productImages.forEach(function (dataUrl, index) {
      var thumb = el('div', 'image-thumb');
      var img = document.createElement('img');
      img.src = dataUrl;
      img.alt = '';
      thumb.appendChild(img);

      var remove = el('button', 'image-thumb__remove', '×');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Xoá ảnh ' + (index + 1));
      remove.addEventListener('click', function () {
        productImages.splice(index, 1);
        renderProductImages();
      });
      thumb.appendChild(remove);

      imagesGrid.appendChild(thumb);
    });
  }

  function handleImagesPick() {
    var files = imagesInput.files;
    Array.prototype.forEach.call(files, function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        productImages.push(reader.result);
        renderProductImages();
      };
      reader.readAsDataURL(file);
    });
    imagesInput.value = '';
  }

  /* --- Biến thể sản phẩm ------------------------------------------------------- */

  var variantsList = document.querySelector('[data-variants-list]');
  var variantsEmpty = document.querySelector('[data-variants-empty]');
  var variantCount = 0; // chỉ dùng để đánh số #1, #2... hiển thị, không phải id thật

  function batchOptions(selectedBatchId) {
    var select = el('select', 'select');
    var emptyOption = el('option', null, '— Chưa chọn lô sản xuất —');
    emptyOption.value = '';
    select.appendChild(emptyOption);

    store.list('batches').forEach(function (batch) {
      var option = el('option', null, batch.code);
      option.value = batch.id;
      if (batch.id === selectedBatchId) option.selected = true;
      select.appendChild(option);
    });
    return select;
  }

  function variantCard(data) {
    variantCount++;
    var index = variantCount;
    var card = el('div', 'variant-card');
    card.dataset.variantCard = '';

    var header = el('div', 'variant-card__header');
    header.appendChild(el('span', null, '#' + index));
    var remove = el('button', 'icon-btn icon-btn--danger');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Xoá biến thể #' + index);
    remove.appendChild(svgIcon('icon-trash'));
    remove.addEventListener('click', function () {
      card.remove();
      if (!variantsList.children.length) variantsEmpty.hidden = false;
    });
    header.appendChild(remove);
    card.appendChild(header);

    function field(label, inputNode) {
      var wrap = el('div', 'field');
      wrap.appendChild(el('label', 'label', label));
      wrap.appendChild(inputNode);
      return wrap;
    }

    function textInput(className, value, placeholder) {
      var input = el('input', className || 'input');
      input.type = 'text';
      if (value) input.value = value;
      if (placeholder) input.placeholder = placeholder;
      return input;
    }

    function numberInput(className, value) {
      var input = el('input', className || 'input');
      input.type = 'number';
      input.min = '0';
      input.value = value != null ? value : 0;
      return input;
    }

    var grid1 = el('div', 'form-grid');
    var nameInput = textInput('input variant-name', data.name);
    var skuInput = textInput('input variant-sku', data.sku);
    grid1.appendChild(field('Tên biến thể', nameInput));
    grid1.appendChild(field('SKU', skuInput));
    card.appendChild(grid1);

    var grid2 = el('div', 'form-grid');
    var priceInput = numberInput('input variant-price', data.price);
    var priceAffix = el('div', 'input-affix');
    priceAffix.appendChild(priceInput);
    priceAffix.appendChild(el('span', 'input-affix__unit', 'đ'));
    grid2.appendChild(field('Giá bán', priceAffix));

    var stockInput = numberInput('input variant-stock', data.stock);
    grid2.appendChild(field('Tồn kho', stockInput));

    var barcodeInput = textInput('input variant-barcode', data.barcode);
    grid2.appendChild(field('Mã vạch', barcodeInput));
    card.appendChild(grid2);

    var grid3 = el('div', 'form-grid');
    var weightInput = numberInput('input variant-weight', data.weight);
    grid3.appendChild(field('Trọng lượng', weightInput));

    var unitSelect = el('select', 'select variant-unit');
    VARIANT_UNITS.forEach(function (unit) {
      var option = el('option', null, unit);
      option.value = unit;
      if (unit === (data.unit || VARIANT_UNITS[0])) option.selected = true;
      unitSelect.appendChild(option);
    });
    grid3.appendChild(field('Đơn vị', unitSelect));

    var packagingInput = textInput('input variant-packaging', data.packaging, 'Ví dụ: Thùng 24 lon, Hộp 500g...');
    grid3.appendChild(field('Quy cách đóng gói', packagingInput));
    card.appendChild(grid3);

    var grid4 = el('div', 'form-grid');
    var lengthInput = numberInput('input variant-length', data.length);
    grid4.appendChild(field('Chiều dài (cm)', lengthInput));
    var widthInput = numberInput('input variant-width', data.width);
    grid4.appendChild(field('Chiều rộng (cm)', widthInput));
    var heightInput = numberInput('input variant-height', data.height);
    grid4.appendChild(field('Chiều cao (cm)', heightInput));
    card.appendChild(grid4);

    var batchSelect = batchOptions(data.batchId);
    batchSelect.classList.add('variant-batch');
    card.appendChild(field('Lô sản xuất', batchSelect));

    return card;
  }

  function addVariant(data) {
    variantsEmpty.hidden = true;
    variantsList.appendChild(variantCard(data || {}));
  }

  function resetVariants() {
    variantCount = 0;
    variantsList.textContent = '';
    variantsEmpty.hidden = false;
  }

  function collectVariants() {
    return Array.prototype.map.call(variantsList.querySelectorAll('[data-variant-card]'), function (card) {
      return {
        name: card.querySelector('.variant-name').value.trim(),
        sku: card.querySelector('.variant-sku').value.trim(),
        price: Number(card.querySelector('.variant-price').value) || 0,
        stock: Number(card.querySelector('.variant-stock').value) || 0,
        barcode: card.querySelector('.variant-barcode').value.trim(),
        weight: Number(card.querySelector('.variant-weight').value) || 0,
        unit: card.querySelector('.variant-unit').value,
        packaging: card.querySelector('.variant-packaging').value.trim(),
        length: Number(card.querySelector('.variant-length').value) || 0,
        width: Number(card.querySelector('.variant-width').value) || 0,
        height: Number(card.querySelector('.variant-height').value) || 0,
        batchId: card.querySelector('.variant-batch').value || ''
      };
    });
  }

  /* --- Modal thêm/sửa sản phẩm -------------------------------------------------- */

  var modal = document.getElementById('product-modal');
  var form = document.getElementById('product-form');
  var modalTitle = document.getElementById('product-modal-title');
  var submitLabel = document.querySelector('[data-product-submit-label]');
  var categorySelect = document.getElementById('product-category');
  var typeSelect = document.getElementById('product-type');
  var statusSelect = document.getElementById('product-status');

  var editingProductId = null;

  function fillFormSelects() {
    CATEGORIES.forEach(function (category) {
      var option = el('option', null, category);
      option.value = category;
      categorySelect.appendChild(option);
    });
    PRODUCT_TYPES.forEach(function (type) {
      var option = el('option', null, type);
      option.value = type;
      typeSelect.appendChild(option);
    });
    STATUSES.forEach(function (status) {
      var option = el('option', null, status.label);
      option.value = status.key;
      statusSelect.appendChild(option);
    });
  }

  function openModal(product) {
    form.reset();
    clearErrors();
    editingProductId = product ? product.id : null;
    productImages = product && product.images ? product.images.slice() : [];
    renderProductImages();
    resetVariants();

    if (product) {
      modalTitle.textContent = 'Sửa sản phẩm';
      submitLabel.textContent = 'Lưu thay đổi';

      document.getElementById('product-name').value = product.name || '';
      document.getElementById('product-sku').value = product.sku || '';
      document.getElementById('product-short-desc').value = product.shortDesc || '';
      document.getElementById('product-description').value = product.description || '';
      categorySelect.value = product.category || '';
      typeSelect.value = product.type || PRODUCT_TYPES[0];
      statusSelect.value = product.status || 'draft';
      document.getElementById('product-featured').checked = !!product.featured;
      document.getElementById('product-allow-delivery').checked = product.allowDelivery !== false;
      document.getElementById('product-allow-pickup').checked = product.allowPickup !== false;
      document.getElementById('product-highlights').value = product.highlights || '';
      document.getElementById('product-usage-guide').value = product.usageGuide || '';
      document.getElementById('product-storage').value = product.storage || '';

      (product.variants || []).forEach(function (variant) { addVariant(variant); });
    } else {
      modalTitle.textContent = 'Thêm sản phẩm mới';
      submitLabel.textContent = 'Lưu sản phẩm';

      document.getElementById('product-sku').value = nextSku();
      typeSelect.value = PRODUCT_TYPES[0];
      statusSelect.value = 'draft';
      document.getElementById('product-allow-delivery').checked = true;
      document.getElementById('product-allow-pickup').checked = true;
    }

    modal.showModal();
    document.getElementById('product-name').focus();
  }

  function closeModal() {
    modal.close();
  }

  /* --- Kiểm tra dữ liệu --------------------------------------------------------- */

  function clearErrors() {
    form.querySelectorAll('.field__error').forEach(function (node) { node.remove(); });
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (node) {
      node.removeAttribute('aria-invalid');
    });
  }

  function showError(field, message) {
    field.setAttribute('aria-invalid', 'true');
    field.parentNode.appendChild(el('p', 'field__error', message));
  }

  function validate() {
    clearErrors();
    var problems = [];

    var name = document.getElementById('product-name');
    var sku = document.getElementById('product-sku');
    var category = categorySelect;

    if (!name.value.trim()) { showError(name, 'Nhập tên sản phẩm.'); problems.push(name); }

    if (!sku.value.trim()) {
      showError(sku, 'Nhập mã sản phẩm (SKU).');
      problems.push(sku);
    } else {
      var duplicate = myProducts().some(function (product) {
        return product.id !== editingProductId &&
          product.sku.toLowerCase() === sku.value.trim().toLowerCase();
      });
      if (duplicate) {
        showError(sku, 'Mã SKU này đã dùng cho sản phẩm khác.');
        problems.push(sku);
      }
    }

    if (!category.value) { showError(category, 'Chọn danh mục.'); problems.push(category); }

    if (problems.length) {
      problems[0].focus();
      return false;
    }
    return true;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    var data = new FormData(form);

    var payload = {
      ownerId: session.id,
      name: String(data.get('name') || '').trim(),
      sku: String(data.get('sku') || '').trim(),
      shortDesc: String(data.get('shortDesc') || '').trim(),
      description: String(data.get('description') || '').trim(),
      category: String(data.get('category') || ''),
      type: String(data.get('type') || ''),
      status: String(data.get('status') || 'draft'),
      featured: document.getElementById('product-featured').checked,
      allowDelivery: document.getElementById('product-allow-delivery').checked,
      allowPickup: document.getElementById('product-allow-pickup').checked,
      images: productImages.slice(),
      variants: collectVariants(),
      highlights: String(data.get('highlights') || '').trim(),
      usageGuide: String(data.get('usageGuide') || '').trim(),
      storage: String(data.get('storage') || '').trim()
    };

    if (editingProductId) {
      store.update('products', editingProductId, payload);
    } else {
      store.insert('products', payload);
    }

    closeModal();
    render();
    global.AgriChain.toast(editingProductId ? 'Đã lưu thay đổi sản phẩm.' : 'Đã thêm sản phẩm.');
  }

  /* --- Khởi động ---------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    if (!session) return; // app-shell.js đã tự chuyển hướng về trang đăng nhập

    fillFilterOptions();
    fillFormSelects();
    render();

    [searchInput, categoryFilter, statusFilter, sortSelect].forEach(function (input) {
      input.addEventListener('input', render);
      input.addEventListener('change', render);
    });

    document.querySelectorAll('[data-open-product-form]').forEach(function (button) {
      button.addEventListener('click', function () { openModal(); });
    });
    document.querySelectorAll('[data-close-product-form]').forEach(function (button) {
      button.addEventListener('click', closeModal);
    });

    imagesInput.addEventListener('change', handleImagesPick);
    document.querySelector('[data-add-variant]').addEventListener('click', function () { addVariant(); });

    form.addEventListener('submit', handleSubmit);
  });
})(window);
