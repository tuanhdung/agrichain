/* ==========================================================================
   AgriChain — Trang Thương mại điện tử / Tổng quan
   Khởi tạo + xem hồ sơ cửa hàng Ecommerce của Đơn vị đang đăng nhập. Mỗi
   Đơn vị chỉ có 1 cửa hàng, lưu trong collection "shops", gắn với
   ownerId = id phiên đăng nhập hiện tại (không phải id thật của tổ chức —
   dự án chưa có khái niệm đó, xem js/store.js).
   Nạp SAU js/store.js, js/app-shell.js, js/location-select.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var store = global.AgriChain.store;
  var session = store.getSession();

  var wardCache = {}; // provinceCode -> Promise<[{id,name,provinceId}]>, giống js/nong-trai.js

  function loadProvinces() {
    return fetch('data/provinces.json').then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  function loadWards(provinceCode) {
    if (!wardCache[provinceCode]) {
      wardCache[provinceCode] = fetch('data/wards/' + provinceCode + '.json').then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      });
    }
    return wardCache[provinceCode];
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  var PAYMENT_METHODS = [
    { value: 'cod', label: 'Thanh toán khi nhận hàng (COD)' },
    { value: 'bank-transfer', label: 'Chuyển khoản ngân hàng' },
    { value: 'e-wallet', label: 'Ví điện tử (Momo/ZaloPay)' },
    { value: 'card', label: 'Thẻ tín dụng/ghi nợ' }
  ];
  var SHIPPING_METHODS = [
    { value: 'standard', label: 'Giao hàng tiêu chuẩn' },
    { value: 'express', label: 'Giao hàng nhanh' },
    { value: 'pickup', label: 'Tự đến lấy hàng (Pickup)' }
  ];

  var modal = document.getElementById('shop-modal');
  var form = document.getElementById('shop-form');
  var modalTitle = document.getElementById('shop-modal-title');
  var submitLabel = document.querySelector('[data-shop-submit-label]');

  var provinceSelect = document.getElementById('shop-province');
  var wardSelect = document.getElementById('shop-ward');

  var logoInput = document.getElementById('shop-logo-input');
  var bannerInput = document.getElementById('shop-banner-input');
  var logoPreview = document.querySelector('[data-logo-preview]');
  var bannerPreview = document.querySelector('[data-banner-preview]');

  var freeShippingToggle = document.getElementById('shop-free-shipping-enabled');
  var freeShippingThreshold = document.getElementById('shop-free-shipping-threshold');

  var paymentGroup = document.querySelector('[data-payment-methods]');
  var shippingGroup = document.querySelector('[data-shipping-methods]');

  var logoDataUrl = '';
  var bannerDataUrl = '';

  /* --- Tỉnh/Thành phố -> Phường/Xã (dùng lại cơ chế chung) ------------------ */

  function currentProvinceCode() {
    var option = provinceSelect.selectedOptions[0];
    return option ? option.dataset.code : '';
  }

  var wardCascade = global.AgriChain.setupCascadingSelect({
    parentSelect: provinceSelect,
    childSelect: wardSelect,
    loadChildren: function () {
      var code = currentProvinceCode();
      return code ? loadWards(code) : [];
    },
    getOptionValue: function (ward) { return ward.name; },
    getOptionLabel: function (ward) { return ward.name; },
    placeholderEmpty: '— Chọn phường/xã —',
    placeholderNoParent: '— Chọn tỉnh/thành phố trước —',
    onError: function () {
      showError(wardSelect, 'Không tải được danh sách phường/xã. Thử chọn lại tỉnh/thành phố.');
    }
  });

  function fillProvinces() {
    return loadProvinces().then(function (provinces) {
      provinces.forEach(function (province) {
        var option = el('option', null, province.name);
        option.value = province.name;
        option.dataset.code = province.id;
        provinceSelect.appendChild(option);
      });
    }).catch(function () {
      global.AgriChain.toast('Không tải được danh sách tỉnh/thành phố.');
    });
  }

  /* --- Ảnh logo/banner: đọc qua FileReader, lưu base64 giống ảnh nhật ký ---- */

  function handleImagePick(input, preview, onLoaded) {
    var file = input.files && input.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function () {
      onLoaded(reader.result);
      preview.src = reader.result;
      preview.hidden = false;
      preview.parentNode.classList.add('is-filled');
    };
    reader.readAsDataURL(file);
  }

  /* --- Nhóm chip chọn nhiều (phương thức thanh toán/vận chuyển) ------------ */

  function buildChipGroup(container, options) {
    container.textContent = '';
    options.forEach(function (option) {
      var chip = el('button', 'chip', option.label);
      chip.type = 'button';
      chip.dataset.value = option.value;
      chip.setAttribute('aria-pressed', 'false');
      chip.addEventListener('click', function () {
        var pressed = chip.getAttribute('aria-pressed') === 'true';
        chip.setAttribute('aria-pressed', String(!pressed));
      });
      container.appendChild(chip);
    });
  }

  function setChipGroupValues(container, values) {
    var set = values || [];
    container.querySelectorAll('.chip').forEach(function (chip) {
      chip.setAttribute('aria-pressed', String(set.indexOf(chip.dataset.value) !== -1));
    });
  }

  function chipGroupValues(container) {
    return Array.prototype.map.call(
      container.querySelectorAll('.chip[aria-pressed="true"]'),
      function (chip) { return chip.dataset.value; }
    );
  }

  /* --- Overview: trạng thái chưa có / đã có cửa hàng ------------------------ */

  var emptyNode = document.querySelector('[data-shop-empty]');
  var createdNode = document.querySelector('[data-shop-created]');
  var nameNode = document.querySelector('[data-shop-name]');
  var sloganNode = document.querySelector('[data-shop-slogan]');
  var descNode = document.querySelector('[data-shop-desc]');
  var logoNode = document.querySelector('[data-shop-logo]');
  var logoPlaceholderNode = document.querySelector('[data-shop-logo-placeholder]');

  function currentShop() {
    if (!session) return null;
    var shops = store.list('shops');
    for (var i = 0; i < shops.length; i++) {
      if (shops[i].ownerId === session.id) return shops[i];
    }
    return null;
  }

  function render() {
    var shop = currentShop();

    if (!shop) {
      emptyNode.hidden = false;
      createdNode.hidden = true;
      return;
    }

    emptyNode.hidden = true;
    createdNode.hidden = false;

    nameNode.textContent = shop.name;
    sloganNode.textContent = shop.slogan || '';
    sloganNode.hidden = !shop.slogan;
    descNode.textContent = shop.description || 'Chưa có mô tả cửa hàng.';

    if (shop.logoDataUrl) {
      logoNode.src = shop.logoDataUrl;
      logoNode.hidden = false;
      logoPlaceholderNode.hidden = true;
    } else {
      logoNode.hidden = true;
      logoPlaceholderNode.hidden = false;
    }
  }

  /* --- Modal ----------------------------------------------------------------- */

  function resetUpload(input, preview) {
    input.value = '';
    preview.src = '';
    preview.hidden = true;
    preview.parentNode.classList.remove('is-filled');
  }

  function activateTab(targetId) {
    var tab = form.querySelector('[data-tab-target="' + targetId + '"]');
    if (tab) tab.click();
  }

  function openModal() {
    form.reset();
    clearErrors();
    logoDataUrl = '';
    bannerDataUrl = '';
    resetUpload(logoInput, logoPreview);
    resetUpload(bannerInput, bannerPreview);
    buildChipGroup(paymentGroup, PAYMENT_METHODS);
    buildChipGroup(shippingGroup, SHIPPING_METHODS);
    freeShippingThreshold.disabled = true;
    activateTab('shop-tab-overview');

    var shop = currentShop();
    var orgName = session.type === 'org' && session.orgName ? session.orgName : (session.fullName || '');

    if (shop) {
      modalTitle.textContent = 'Chỉnh sửa cửa hàng Ecommerce';
      submitLabel.textContent = 'Lưu thay đổi';

      document.getElementById('shop-name').value = shop.name || '';
      document.getElementById('shop-slogan').value = shop.slogan || '';
      document.getElementById('shop-description').value = shop.description || '';
      if (shop.logoDataUrl) {
        logoDataUrl = shop.logoDataUrl;
        logoPreview.src = shop.logoDataUrl;
        logoPreview.hidden = false;
        logoPreview.parentNode.classList.add('is-filled');
      }
      if (shop.bannerDataUrl) {
        bannerDataUrl = shop.bannerDataUrl;
        bannerPreview.src = shop.bannerDataUrl;
        bannerPreview.hidden = false;
        bannerPreview.parentNode.classList.add('is-filled');
      }

      document.getElementById('shop-owner-name').value = shop.ownerName || orgName;
      document.getElementById('shop-owner-phone').value = shop.ownerPhone || '';
      document.getElementById('shop-owner-email').value = shop.ownerEmail || session.email || '';
      document.getElementById('shop-contact-phone').value = shop.contactPhone || '';
      document.getElementById('shop-contact-email').value = shop.contactEmail || session.email || '';
      document.getElementById('shop-website').value = shop.website || '';
      document.getElementById('shop-facebook').value = shop.facebook || '';
      document.getElementById('shop-instagram').value = shop.instagram || '';
      document.getElementById('shop-tiktok').value = shop.tiktok || '';
      document.getElementById('shop-youtube').value = shop.youtube || '';

      provinceSelect.value = shop.province || '';
      wardCascade.refresh(shop.ward);
      document.getElementById('shop-address').value = shop.addressDetail || '';
      document.getElementById('shop-tax-code').value = shop.taxCode || '';
      document.getElementById('shop-business-license').value = shop.businessLicense || '';

      document.getElementById('shop-working-hours').value = shop.workingHours || '';
      document.getElementById('shop-working-days').value = shop.workingDays || '';
      document.getElementById('shop-min-order').value = shop.minOrderValue != null ? shop.minOrderValue : 0;
      freeShippingToggle.checked = !!shop.freeShippingEnabled;
      freeShippingThreshold.disabled = !shop.freeShippingEnabled;
      freeShippingThreshold.value = shop.freeShippingThreshold != null ? shop.freeShippingThreshold : 0;
      document.getElementById('shop-cod-enabled').checked = shop.codEnabled !== false;
      setChipGroupValues(paymentGroup, shop.paymentMethods);
      setChipGroupValues(shippingGroup, shop.shippingMethods);
      document.getElementById('shop-shipping-policy').value = shop.shippingPolicy || '';
      document.getElementById('shop-return-policy').value = shop.returnPolicy || '';
      document.getElementById('shop-warranty-policy').value = shop.warrantyPolicy || '';
    } else {
      modalTitle.textContent = 'Khởi tạo cửa hàng Ecommerce';
      submitLabel.textContent = 'Bắt đầu ngay';

      document.getElementById('shop-name').value = orgName;
      document.getElementById('shop-owner-name').value = orgName;
      document.getElementById('shop-owner-email').value = session.email || '';
      document.getElementById('shop-contact-email').value = session.email || '';
      document.getElementById('shop-min-order').value = '0';
      document.getElementById('shop-cod-enabled').checked = true;
      setChipGroupValues(paymentGroup, ['cod', 'bank-transfer']);
      setChipGroupValues(shippingGroup, ['standard']);
      wardCascade.refresh(); // reset phường/xã về trạng thái "chưa chọn tỉnh"
    }

    modal.showModal();
  }

  function closeModal() {
    modal.close();
  }

  /* --- Kiểm tra dữ liệu ------------------------------------------------------ */

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

  // Field -> id của tab chứa nó, để nhảy đúng tab trước khi focus lỗi đầu tiên
  // (các trường bắt buộc nằm rải trên cả 3 tab, không riêng tab đang mở).
  function tabOf(field) {
    var panel = field.closest('[data-tab-panel]');
    return panel ? panel.id : null;
  }

  function validate() {
    clearErrors();
    var problems = [];

    var name = document.getElementById('shop-name');
    var ownerName = document.getElementById('shop-owner-name');
    var contactPhone = document.getElementById('shop-contact-phone');
    var contactEmail = document.getElementById('shop-contact-email');
    var province = provinceSelect;
    var ward = wardSelect;
    var address = document.getElementById('shop-address');
    var taxCode = document.getElementById('shop-tax-code');
    var businessLicense = document.getElementById('shop-business-license');

    if (!name.value.trim()) { showError(name, 'Nhập tên cửa hàng.'); problems.push(name); }
    if (!ownerName.value.trim()) { showError(ownerName, 'Nhập họ và tên chủ shop.'); problems.push(ownerName); }
    if (!contactPhone.value.trim()) { showError(contactPhone, 'Nhập số điện thoại liên hệ.'); problems.push(contactPhone); }
    if (!contactEmail.value.trim()) { showError(contactEmail, 'Nhập email liên hệ.'); problems.push(contactEmail); }
    if (!province.value) { showError(province, 'Chọn tỉnh/thành phố.'); problems.push(province); }
    if (!ward.value.trim()) { showError(ward, 'Chọn phường/xã.'); problems.push(ward); }
    if (!address.value.trim()) { showError(address, 'Nhập địa chỉ chi tiết.'); problems.push(address); }
    if (!taxCode.value.trim()) { showError(taxCode, 'Nhập mã số thuế.'); problems.push(taxCode); }
    if (!businessLicense.value.trim()) { showError(businessLicense, 'Nhập số đăng ký kinh doanh.'); problems.push(businessLicense); }

    if (problems.length) {
      activateTab(tabOf(problems[0]));
      problems[0].focus();
      return false;
    }
    return true;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    var data = new FormData(form);
    var shop = currentShop();

    var payload = {
      ownerId: session.id,
      name: String(data.get('name') || '').trim(),
      slogan: String(data.get('slogan') || '').trim(),
      description: String(data.get('description') || '').trim(),
      logoDataUrl: logoDataUrl,
      bannerDataUrl: bannerDataUrl,
      ownerName: String(data.get('ownerName') || '').trim(),
      ownerPhone: String(data.get('ownerPhone') || '').trim(),
      ownerEmail: String(data.get('ownerEmail') || '').trim(),
      contactPhone: String(data.get('contactPhone') || '').trim(),
      contactEmail: String(data.get('contactEmail') || '').trim(),
      website: String(data.get('website') || '').trim(),
      facebook: String(data.get('facebook') || '').trim(),
      instagram: String(data.get('instagram') || '').trim(),
      tiktok: String(data.get('tiktok') || '').trim(),
      youtube: String(data.get('youtube') || '').trim(),
      province: String(data.get('province') || ''),
      ward: String(data.get('ward') || '').trim(),
      addressDetail: String(data.get('address') || '').trim(),
      taxCode: String(data.get('taxCode') || '').trim(),
      businessLicense: String(data.get('businessLicense') || '').trim(),
      workingHours: String(data.get('workingHours') || '').trim(),
      workingDays: String(data.get('workingDays') || '').trim(),
      minOrderValue: Number(data.get('minOrderValue')) || 0,
      freeShippingEnabled: freeShippingToggle.checked,
      freeShippingThreshold: Number(data.get('freeShippingThreshold')) || 0,
      codEnabled: document.getElementById('shop-cod-enabled').checked,
      paymentMethods: chipGroupValues(paymentGroup),
      shippingMethods: chipGroupValues(shippingGroup),
      shippingPolicy: String(data.get('shippingPolicy') || '').trim(),
      returnPolicy: String(data.get('returnPolicy') || '').trim(),
      warrantyPolicy: String(data.get('warrantyPolicy') || '').trim()
    };

    if (shop) {
      store.update('shops', shop.id, payload);
    } else {
      store.insert('shops', payload);
    }

    closeModal();
    render();
    global.AgriChain.toast(shop ? 'Đã lưu thay đổi cửa hàng.' : 'Đã khởi tạo cửa hàng.');
  }

  /* --- Khởi động -------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    if (!session) return; // app-shell.js đã tự chuyển hướng về trang đăng nhập

    fillProvinces();
    render();

    document.querySelectorAll('[data-open-shop-form]').forEach(function (button) {
      button.addEventListener('click', openModal);
    });
    document.querySelectorAll('[data-close-shop-form]').forEach(function (button) {
      button.addEventListener('click', closeModal);
    });

    logoInput.addEventListener('change', function () {
      handleImagePick(logoInput, logoPreview, function (dataUrl) { logoDataUrl = dataUrl; });
    });
    bannerInput.addEventListener('change', function () {
      handleImagePick(bannerInput, bannerPreview, function (dataUrl) { bannerDataUrl = dataUrl; });
    });

    freeShippingToggle.addEventListener('change', function () {
      freeShippingThreshold.disabled = !freeShippingToggle.checked;
    });

    form.addEventListener('submit', handleSubmit);
  });
})(window);
