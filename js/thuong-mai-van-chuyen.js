/* ==========================================================================
   AgriChain — Trang Thương mại điện tử / Vận chuyển
   Quản lý địa chỉ lấy hàng ("pickup") và trả hàng ("return") của cửa hàng —
   collection "shippingAddresses", nhiều bản ghi/loại/Đơn vị, cùng khoá
   ownerId = session.id như "shops"/"products". Mỗi loại chỉ có tối đa 1 địa
   chỉ mặc định tại một thời điểm.
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

  function svgIcon(name, className) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', className || 'icon icon--sm');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', 'icons/sprite.svg#' + name);
    svg.appendChild(use);
    return svg;
  }

  function myAddresses(type) {
    if (!session) return [];
    return store.list('shippingAddresses').filter(function (address) {
      return address.ownerId === session.id && address.type === type;
    });
  }

  /* --- Danh sách theo từng loại ----------------------------------------------- */

  var pickupList = document.querySelector('[data-pickup-list]');
  var pickupEmpty = document.querySelector('[data-pickup-empty]');
  var returnList = document.querySelector('[data-return-list]');
  var returnEmpty = document.querySelector('[data-return-empty]');

  function addressCard(address) {
    var card = el('div', 'shipping-address-card');

    var header = el('div', 'shipping-address-card__header');
    var name = el('div', 'shipping-address-card__name');
    name.appendChild(el('span', null, address.contactName));
    if (address.isDefault) {
      name.appendChild(el('span', 'badge badge--info', 'Mặc định'));
    }
    header.appendChild(name);

    var actions = el('div', 'shipping-address-card__actions');
    var editButton = el('button', 'icon-btn');
    editButton.type = 'button';
    editButton.setAttribute('aria-label', 'Sửa địa chỉ của ' + address.contactName);
    editButton.setAttribute('data-tooltip', 'Sửa');
    editButton.appendChild(svgIcon('icon-pencil'));
    editButton.addEventListener('click', function () { openModal(address); });
    actions.appendChild(editButton);

    var deleteButton = el('button', 'icon-btn icon-btn--danger');
    deleteButton.type = 'button';
    deleteButton.setAttribute('aria-label', 'Xoá địa chỉ của ' + address.contactName);
    deleteButton.setAttribute('data-tooltip', 'Xoá');
    deleteButton.appendChild(svgIcon('icon-trash'));
    deleteButton.addEventListener('click', function () { handleDelete(address); });
    actions.appendChild(deleteButton);
    header.appendChild(actions);

    card.appendChild(header);

    var phoneRow = el('div', 'shipping-address-card__row');
    phoneRow.appendChild(svgIcon('icon-phone'));
    phoneRow.appendChild(el('span', null, address.phone));
    card.appendChild(phoneRow);

    var addressRow = el('div', 'shipping-address-card__row');
    addressRow.appendChild(svgIcon('icon-map-pin'));
    var place = [address.addressDetail, address.ward, address.province].filter(Boolean).join(', ');
    addressRow.appendChild(el('span', null, place));
    card.appendChild(addressRow);

    return card;
  }

  function renderType(type, listNode, emptyNode) {
    var addresses = myAddresses(type);
    listNode.textContent = '';

    if (!addresses.length) {
      listNode.hidden = true;
      emptyNode.hidden = false;
      return;
    }

    emptyNode.hidden = true;
    listNode.hidden = false;
    addresses.forEach(function (address) {
      listNode.appendChild(addressCard(address));
    });
  }

  function render() {
    renderType('pickup', pickupList, pickupEmpty);
    renderType('return', returnList, returnEmpty);
  }

  function handleDelete(address) {
    global.AgriChain.confirm(
      'Xoá địa chỉ của "' + address.contactName + '"? Hành động này không thể hoàn tác.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      store.remove('shippingAddresses', address.id);
      render();
      global.AgriChain.toast('Đã xoá địa chỉ.');
    });
  }

  /* --- Modal thêm/sửa địa chỉ -------------------------------------------------- */

  var modal = document.getElementById('shipping-modal');
  var form = document.getElementById('shipping-form');
  var modalTitle = document.getElementById('shipping-modal-title');
  var submitLabel = document.querySelector('[data-shipping-submit-label]');
  var typeSelect = document.getElementById('shipping-type');
  var provinceSelect = document.getElementById('shipping-province');
  var wardSelect = document.getElementById('shipping-ward');
  var defaultCheckbox = document.getElementById('shipping-default');

  var editingAddressId = null;

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

  function openModal(address, presetType) {
    form.reset();
    clearErrors();
    editingAddressId = address ? address.id : null;

    if (address) {
      modalTitle.textContent = 'Sửa địa chỉ';
      submitLabel.textContent = 'Lưu thay đổi';

      typeSelect.value = address.type;
      document.getElementById('shipping-contact-name').value = address.contactName || '';
      document.getElementById('shipping-phone').value = address.phone || '';
      provinceSelect.value = address.province || '';
      wardCascade.refresh(address.ward);
      document.getElementById('shipping-address').value = address.addressDetail || '';
      defaultCheckbox.checked = !!address.isDefault;
    } else {
      modalTitle.textContent = 'Thêm địa chỉ';
      submitLabel.textContent = 'Xác nhận';
      typeSelect.value = presetType || 'pickup';
      wardCascade.refresh();
    }

    modal.showModal();
    document.getElementById('shipping-contact-name').focus();
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

    var contactName = document.getElementById('shipping-contact-name');
    var phone = document.getElementById('shipping-phone');
    var address = document.getElementById('shipping-address');

    if (!contactName.value.trim()) { showError(contactName, 'Nhập tên người liên hệ.'); problems.push(contactName); }
    if (!phone.value.trim()) { showError(phone, 'Nhập số điện thoại.'); problems.push(phone); }
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
    var type = String(data.get('type') || 'pickup');
    var isDefault = defaultCheckbox.checked;

    var payload = {
      ownerId: session.id,
      type: type,
      contactName: String(data.get('contactName') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      province: String(data.get('province') || ''),
      ward: String(data.get('ward') || '').trim(),
      addressDetail: String(data.get('addressDetail') || '').trim(),
      isDefault: isDefault
    };

    // Chỉ 1 địa chỉ mặc định/loại — bỏ mặc định ở các địa chỉ CÙNG loại khác
    // trước khi lưu bản ghi đang sửa/thêm.
    if (isDefault) {
      myAddresses(type).forEach(function (address) {
        if (address.id !== editingAddressId && address.isDefault) {
          store.update('shippingAddresses', address.id, { isDefault: false });
        }
      });
    }

    if (editingAddressId) {
      store.update('shippingAddresses', editingAddressId, payload);
    } else {
      store.insert('shippingAddresses', payload);
    }

    closeModal();
    render();
    global.AgriChain.toast(editingAddressId ? 'Đã lưu thay đổi địa chỉ.' : 'Đã thêm địa chỉ.');
  }

  /* --- Khởi động ---------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    if (!session) return; // app-shell.js đã tự chuyển hướng về trang đăng nhập

    fillProvinces();
    render();

    document.querySelectorAll('[data-open-shipping-form]').forEach(function (button) {
      button.addEventListener('click', function () {
        openModal(null, button.dataset.shippingType);
      });
    });
    document.querySelectorAll('[data-close-shipping-form]').forEach(function (button) {
      button.addEventListener('click', closeModal);
    });

    form.addEventListener('submit', handleSubmit);
  });
})(window);
