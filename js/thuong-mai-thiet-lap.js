/* ==========================================================================
   AgriChain — Trang Thương mại điện tử / Thiết lập Shop
   Trang xem/sửa hồ sơ cửa hàng dạng đầy đủ trên 1 trang (3 cột), ĐỌC/GHI
   CÙNG một bản ghi trong collection "shops" như modal "Khởi tạo cửa hàng"
   ở thuong-mai-tong-quan.html (cùng ownerId = session.id) — nhưng chỉ quản
   lý phần "Thông tin thương hiệu"/"Thông tin pháp lý & Liên hệ"/"Vận hành &
   Chính sách" hiển thị trên trang này. Các trường khác của "shops" (liên hệ
   khách hàng, website, mạng xã hội, cấu hình bán hàng...) vẫn chỉ sửa được
   qua modal ở Tổng quan — store.update() chỉ ghi đè đúng field trang này
   quản lý nên không đụng tới phần dữ liệu do trang kia quản lý.
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

  var form = document.getElementById('shop-settings-form');
  var submitButton = document.querySelector('[data-shop-settings-submit]');

  var logoInput = document.getElementById('settings-logo-input');
  var bannerInput = document.getElementById('settings-banner-input');
  var logoPreview = document.querySelector('[data-settings-logo-preview]');
  var bannerPreview = document.querySelector('[data-settings-banner-preview]');

  var provinceSelect = document.getElementById('settings-province');
  var wardSelect = document.getElementById('settings-ward');

  var logoDataUrl = '';
  var bannerDataUrl = '';
  var currentShopId = null;

  function currentShop() {
    if (!session) return null;
    var shops = store.list('shops');
    for (var i = 0; i < shops.length; i++) {
      if (shops[i].ownerId === session.id) return shops[i];
    }
    return null;
  }

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
    placeholderNoParent: 'Chọn tỉnh/thành phố trước',
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

  /* --- Điền sẵn dữ liệu (nếu đã có cửa hàng) -------------------------------- */

  function fillForm() {
    var shop = currentShop();
    currentShopId = shop ? shop.id : null;
    var orgName = session.type === 'org' && session.orgName ? session.orgName : (session.fullName || '');

    if (shop) {
      submitButton.textContent = 'Lưu thay đổi';

      document.getElementById('settings-name').value = shop.name || '';
      document.getElementById('settings-slogan').value = shop.slogan || '';
      document.getElementById('settings-description').value = shop.description || '';
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

      document.getElementById('settings-owner-name').value = shop.ownerName || orgName;
      document.getElementById('settings-owner-phone').value = shop.ownerPhone || '';
      document.getElementById('settings-owner-email').value = shop.ownerEmail || session.email || '';
      document.getElementById('settings-tax-code').value = shop.taxCode || '';
      document.getElementById('settings-business-license').value = shop.businessLicense || '';

      provinceSelect.value = shop.province || '';
      wardCascade.refresh(shop.ward);
      document.getElementById('settings-address').value = shop.addressDetail || '';

      document.getElementById('settings-working-hours').value = shop.workingHours || '';
      document.getElementById('settings-working-days').value = shop.workingDays || '';
      document.getElementById('settings-shipping-policy').value = shop.shippingPolicy || '';
      document.getElementById('settings-return-policy').value = shop.returnPolicy || '';
      document.getElementById('settings-warranty-policy').value = shop.warrantyPolicy || '';
    } else {
      submitButton.textContent = 'Tạo cửa hàng mới';
      document.getElementById('settings-owner-name').value = orgName;
      document.getElementById('settings-owner-email').value = session.email || '';
      document.getElementById('settings-working-hours').value = '08:00 - 18:00';
      document.getElementById('settings-working-days').value = 'Thứ 2 - Thứ 7';
      wardCascade.refresh();
    }
  }

  /* --- Kiểm tra dữ liệu ----------------------------------------------------- */

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

    var name = document.getElementById('settings-name');
    var ownerName = document.getElementById('settings-owner-name');
    var ownerPhone = document.getElementById('settings-owner-phone');
    var ownerEmail = document.getElementById('settings-owner-email');
    var address = document.getElementById('settings-address');

    if (!name.value.trim()) { showError(name, 'Nhập tên cửa hàng.'); problems.push(name); }
    if (!ownerName.value.trim()) { showError(ownerName, 'Nhập chủ sở hữu.'); problems.push(ownerName); }
    if (!ownerPhone.value.trim()) { showError(ownerPhone, 'Nhập số điện thoại chủ shop.'); problems.push(ownerPhone); }
    if (!ownerEmail.value.trim()) { showError(ownerEmail, 'Nhập email chủ shop.'); problems.push(ownerEmail); }
    if (!provinceSelect.value) { showError(provinceSelect, 'Chọn tỉnh/thành phố.'); problems.push(provinceSelect); }
    if (!wardSelect.value.trim()) { showError(wardSelect, 'Chọn phường/xã.'); problems.push(wardSelect); }
    if (!address.value.trim()) { showError(address, 'Nhập địa chỉ chi tiết.'); problems.push(address); }

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
      slogan: String(data.get('slogan') || '').trim(),
      description: String(data.get('description') || '').trim(),
      logoDataUrl: logoDataUrl,
      bannerDataUrl: bannerDataUrl,
      ownerName: String(data.get('ownerName') || '').trim(),
      ownerPhone: String(data.get('ownerPhone') || '').trim(),
      ownerEmail: String(data.get('ownerEmail') || '').trim(),
      taxCode: String(data.get('taxCode') || '').trim(),
      businessLicense: String(data.get('businessLicense') || '').trim(),
      province: String(data.get('province') || ''),
      ward: String(data.get('ward') || '').trim(),
      addressDetail: String(data.get('address') || '').trim(),
      workingHours: String(data.get('workingHours') || '').trim(),
      workingDays: String(data.get('workingDays') || '').trim(),
      shippingPolicy: String(data.get('shippingPolicy') || '').trim(),
      returnPolicy: String(data.get('returnPolicy') || '').trim(),
      warrantyPolicy: String(data.get('warrantyPolicy') || '').trim()
    };

    if (currentShopId) {
      store.update('shops', currentShopId, payload);
    } else {
      var created = store.insert('shops', payload);
      currentShopId = created.id;
    }

    submitButton.textContent = 'Lưu thay đổi';
    global.AgriChain.toast('Đã lưu hồ sơ cửa hàng.');
  }

  /* --- Khởi động -------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    if (!session) return; // app-shell.js đã tự chuyển hướng về trang đăng nhập

    fillProvinces().then(fillForm);

    logoInput.addEventListener('change', function () {
      handleImagePick(logoInput, logoPreview, function (dataUrl) { logoDataUrl = dataUrl; });
    });
    bannerInput.addEventListener('change', function () {
      handleImagePick(bannerInput, bannerPreview, function (dataUrl) { bannerDataUrl = dataUrl; });
    });

    form.addEventListener('submit', handleSubmit);
  });
})(window);
