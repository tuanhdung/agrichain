/* ==========================================================================
   AgriChain — Trang E-commerce công khai (ecommerce.html)
   Sàn mua sắm công khai (không cần đăng nhập) đọc THẲNG collection "shops"/
   "products" đã có sẵn từ khu quản trị Thương mại điện tử (thuong-mai-*.html)
   qua AgriChain.store — cùng cơ chế trang công khai đọc dữ liệu thật như
   truy-xuat.html, không hard-code danh sách cửa hàng/sản phẩm giả. Trang này
   không nạp js/app-shell.js (không cần đăng nhập).
   ========================================================================== */

(function (global) {
  'use strict';

  var store = global.AgriChain.store;

  // Trùng với CATEGORIES trong js/thuong-mai-san-pham.js (khai báo lại vì 2
  // trang không nạp chéo JS của nhau, đúng quy ước dự án).
  var CATEGORIES = ['Cà Phê Nhân', 'Hồ Tiêu', 'Gạo', 'Đồ uống', 'Gia vị'];

  var categoryListNode = document.querySelector('[data-category-list]');
  var storeListNode = document.querySelector('[data-store-list]');
  var productListNode = document.querySelector('[data-product-list]');
  var filterTabsNode = document.querySelector('[data-product-filters]');
  var productsSection = document.querySelector('[data-products-section]');
  var searchInput = document.querySelector('[data-shop-search-input]');
  var searchSubmit = document.querySelector('[data-shop-search-submit]');

  var activeFilter = 'all';
  var activeCategory = '';
  var searchTerm = '';

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

  function minPrice(product) {
    var variants = product.variants || [];
    if (!variants.length) return 0;
    var prices = variants.map(function (v) { return Number(v.price) || 0; });
    return Math.min.apply(null, prices);
  }

  function publishedProducts() {
    return store.list('products').filter(function (product) {
      return product.status === 'published';
    });
  }

  function productCountOf(shop) {
    return publishedProducts().filter(function (product) {
      return product.ownerId === shop.ownerId;
    }).length;
  }

  /* --- Danh mục nông sản --- */

  function categoryCard(category) {
    var card = el('button', 'shop-category');
    card.type = 'button';
    if (category === activeCategory) card.classList.add('is-active');

    var thumb = el('span', 'shop-category__thumb');
    thumb.appendChild(svgIcon('icon-leaf', 'icon icon--lg'));
    card.appendChild(thumb);
    card.appendChild(el('span', 'shop-category__label', category));

    card.addEventListener('click', function () {
      activeCategory = activeCategory === category ? '' : category;
      renderCategories();
      renderProducts();
      productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return card;
  }

  function renderCategories() {
    categoryListNode.textContent = '';
    CATEGORIES.forEach(function (category) {
      categoryListNode.appendChild(categoryCard(category));
    });
  }

  /* --- Cửa hàng nổi bật --- */

  function storeCard(shop) {
    var card = el('article', 'shop-store-card');

    var banner = el('div', 'shop-store-card__banner');
    if (shop.bannerDataUrl) {
      var bannerImg = document.createElement('img');
      bannerImg.src = shop.bannerDataUrl;
      bannerImg.alt = '';
      banner.appendChild(bannerImg);
    }
    var logo = el('div', 'shop-store-card__logo');
    if (shop.logoDataUrl) {
      var logoImg = document.createElement('img');
      logoImg.src = shop.logoDataUrl;
      logoImg.alt = '';
      logo.appendChild(logoImg);
    } else {
      logo.appendChild(svgIcon('icon-warehouse', 'icon icon--lg'));
    }
    banner.appendChild(logo);
    card.appendChild(banner);

    var body = el('div', 'shop-store-card__body');
    body.appendChild(el('h3', 'shop-store-card__name', shop.name));

    var meta = el('div', 'shop-store-card__meta');
    meta.appendChild(svgIcon('icon-star'));
    meta.appendChild(document.createTextNode(' 0.0 · ' + productCountOf(shop) + ' sản phẩm'));
    body.appendChild(meta);

    var visitBtn = el('a', 'btn btn--outline btn--sm', 'Ghé thăm cửa hàng');
    visitBtn.href = '#';
    body.appendChild(visitBtn);

    card.appendChild(body);
    return card;
  }

  function renderStores() {
    var shops = store.list('shops').slice(0, 3);
    storeListNode.textContent = '';

    if (!shops.length) {
      var empty = el('div', 'shop-empty');
      empty.appendChild(svgIcon('icon-warehouse', 'icon icon--lg'));
      empty.appendChild(el('p', null, 'Chưa có cửa hàng nào tham gia AgriChain.'));
      storeListNode.appendChild(empty);
      return;
    }

    shops.forEach(function (shop) {
      storeListNode.appendChild(storeCard(shop));
    });
  }

  /* --- Nông sản nổi bật --- */

  function productCard(product) {
    var link = el('a', 'shop-product-card');
    link.href = '#';

    var media = el('div', 'shop-product-card__media');
    if (product.images && product.images.length) {
      var img = document.createElement('img');
      img.src = product.images[0];
      img.alt = '';
      media.appendChild(img);
    }

    var hasBatch = (product.variants || []).some(function (v) { return v.batchId; });
    if (hasBatch) {
      var trace = el('span', 'badge badge--info shop-product-card__trace', 'Truy xuất BC');
      media.appendChild(trace);
    }

    var overlay = el('span', 'shop-product-card__overlay');
    overlay.appendChild(svgIcon('icon-eye'));
    overlay.appendChild(document.createTextNode(' Xem chi tiết'));
    media.appendChild(overlay);
    link.appendChild(media);

    var body = el('div', 'shop-product-card__body');

    var category = el('span', 'shop-product-card__category');
    category.appendChild(svgIcon('icon-map-pin'));
    category.appendChild(document.createTextNode(' ' + (product.category || 'Khác')));
    body.appendChild(category);

    body.appendChild(el('h3', 'shop-product-card__name', product.name));

    var rating = el('div', 'shop-product-card__rating');
    rating.appendChild(svgIcon('icon-star'));
    rating.appendChild(document.createTextNode(' 5 (0)'));
    body.appendChild(rating);

    body.appendChild(el('p', 'shop-product-card__price', formatVnd(minPrice(product))));

    link.appendChild(body);
    return link;
  }

  function matchesSearch(product) {
    if (!searchTerm) return true;
    var haystack = (product.name + ' ' + (product.category || '')).toLowerCase();
    return haystack.indexOf(searchTerm) !== -1;
  }

  function renderProducts() {
    productListNode.textContent = '';

    if (activeFilter === 'promo') {
      var promoEmpty = el('div', 'shop-empty');
      promoEmpty.appendChild(svgIcon('icon-box', 'icon icon--lg'));
      promoEmpty.appendChild(el('p', null, 'Chưa có chương trình khuyến mãi nào.'));
      productListNode.appendChild(promoEmpty);
      return;
    }

    var products = publishedProducts().filter(function (product) {
      if (activeCategory && product.category !== activeCategory) return false;
      return matchesSearch(product);
    });

    if (activeFilter === 'new') {
      products = products.slice().sort(function (a, b) {
        return String(b.createdAt).localeCompare(String(a.createdAt));
      });
    }

    if (!products.length) {
      var empty = el('div', 'shop-empty');
      empty.appendChild(svgIcon('icon-box', 'icon icon--lg'));
      empty.appendChild(el('p', null, 'Chưa có sản phẩm nào phù hợp.'));
      productListNode.appendChild(empty);
      return;
    }

    products.forEach(function (product) {
      productListNode.appendChild(productCard(product));
    });
  }

  function handleSearch() {
    searchTerm = searchInput.value.trim().toLowerCase();
    renderProducts();
    productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderCategories();
    renderStores();
    renderProducts();

    filterTabsNode.querySelectorAll('[data-filter]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        activeFilter = tab.getAttribute('data-filter');
        filterTabsNode.querySelectorAll('[data-filter]').forEach(function (other) {
          other.classList.toggle('is-active', other === tab);
        });
        renderProducts();
      });
    });

    document.querySelector('[data-scroll-to-products]').addEventListener('click', function () {
      productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    searchSubmit.addEventListener('click', handleSearch);
    searchInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSearch();
      }
    });
  });
})(window);
