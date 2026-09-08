/* ==========================================================================
   AgriChain — Trang Mẫu quy trình (mùa vụ)
   Danh sách + thêm/sửa/xoá mẫu quy trình sản xuất chuẩn hoá — collection
   "workflowTemplates". KHÔNG khoá theo ownerId như nhóm "Thương mại điện
   tử": đây là dữ liệu "Hoạt động sản xuất", theo đúng quy ước của farms/
   supplies/batches (danh sách chung của Đơn vị đang đăng nhập, không có
   khái niệm nhiều chủ sở hữu trong 1 phiên).
   Vật tư (bước "Chỉ định vật tư cụ thể") ĐÃ CHUYỂN SANG API — đọc qua
   api.supplies.list(), không đọc store.js nữa (supplies đã migrate, dữ
   liệu local collection "supplies" không còn được ghi mới).
   Nạp SAU js/api-config.js, js/api.js, js/store.js, js/app-shell.js,
   js/enums.js (ACTIVITY_TYPES dùng chung).
   ========================================================================== */

(function (global) {
  'use strict';

  var api = global.AgriChain.api;
  var store = global.AgriChain.store;

  // Vật tư — tải 1 lần lúc trang khởi động, dùng chung cho mọi bước quy
  // trình mở trong modal (giống cách js/nong-trai-chi-tiet.js làm).
  var availableSupplies = [];

  function loadSupplyOptions() {
    return api.supplies.list({ page_size: 100 }).then(function (data) {
      availableSupplies = data.items || [];
    }).catch(function (err) {
      global.AgriChain.toast('Không tải được danh sách vật tư: ' + err.message);
    });
  }

  // Nguồn duy nhất cho danh mục "loại hoạt động" — js/enums.js, nạp trước
  // file này (xem thứ tự script trong mau-quy-trinh.html). Trước đây khai
  // báo riêng ở đây, lệch nhãn/icon với bản ở js/nong-trai-chi-tiet.js.
  var ACTIVITY_TYPES = global.AgriChain.ACTIVITY_TYPES;

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

  /* --- Danh sách -------------------------------------------------------------- */

  var listNode = document.querySelector('[data-template-list]');
  var emptyNode = document.querySelector('[data-template-empty]');
  var countNode = document.querySelector('[data-template-count]');

  function templateCard(template) {
    var card = el('div', 'card card--hover');

    var header = el('div', 'card__header');
    header.appendChild(el('h2', 'card__title', template.name));
    var stepCount = (template.steps || []).length;
    header.appendChild(el('p', 'card__subtitle', stepCount + ' bước thực hiện'));
    card.appendChild(header);

    var body = el('div', 'card__body', template.description || 'Chưa có mô tả.');
    card.appendChild(body);

    var footer = el('div', 'card__footer');

    var editButton = el('button', 'icon-btn');
    editButton.type = 'button';
    editButton.setAttribute('aria-label', 'Sửa ' + template.name);
    editButton.setAttribute('data-tooltip', 'Sửa');
    editButton.appendChild(svgIcon('icon-pencil'));
    editButton.addEventListener('click', function () { openModal(template); });
    footer.appendChild(editButton);

    var deleteButton = el('button', 'icon-btn icon-btn--danger');
    deleteButton.type = 'button';
    deleteButton.setAttribute('aria-label', 'Xoá ' + template.name);
    deleteButton.setAttribute('data-tooltip', 'Xoá');
    deleteButton.appendChild(svgIcon('icon-trash'));
    deleteButton.addEventListener('click', function () { handleDelete(template); });
    footer.appendChild(deleteButton);

    card.appendChild(footer);
    return card;
  }

  function render() {
    var templates = store.list('workflowTemplates');
    countNode.textContent = templates.length;

    listNode.textContent = '';
    if (!templates.length) {
      listNode.hidden = true;
      emptyNode.hidden = false;
      return;
    }

    emptyNode.hidden = true;
    listNode.hidden = false;
    templates.forEach(function (template) {
      listNode.appendChild(templateCard(template));
    });
  }

  function handleDelete(template) {
    global.AgriChain.confirm(
      'Xoá mẫu quy trình "' + template.name + '"? Hành động này không thể hoàn tác.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      store.remove('workflowTemplates', template.id);
      render();
      global.AgriChain.toast('Đã xoá mẫu quy trình.');
    });
  }

  /* --- Từng bước trong modal --------------------------------------------------- */

  var stepsList = document.querySelector('[data-steps-list]');
  var stepCount = 0;

  function fillActivitySelect(select, selectedKey) {
    ACTIVITY_TYPES.forEach(function (type) {
      var option = el('option', null, type.label);
      option.value = type.key;
      if (type.key === (selectedKey || ACTIVITY_TYPES[0].key)) option.selected = true;
      select.appendChild(option);
    });
  }

  function renumberSteps() {
    Array.prototype.forEach.call(stepsList.children, function (card, index) {
      card.querySelector('[data-step-number]').textContent = String(index + 1);
    });
  }

  function moveStep(card, direction) {
    var sibling = direction === 'up' ? card.previousElementSibling : card.nextElementSibling;
    if (!sibling) return;
    if (direction === 'up') {
      stepsList.insertBefore(card, sibling);
    } else {
      stepsList.insertBefore(sibling, card);
    }
    renumberSteps();
  }

  function stepCard(data) {
    stepCount++;
    var card = el('div', 'workflow-step');
    card.dataset.stepCard = '';

    var side = el('div', 'workflow-step__side');
    side.appendChild(el('span', 'workflow-step__number', String(stepCount)));
    side.querySelector('.workflow-step__number').setAttribute('data-step-number', '');

    var reorder = el('div', 'workflow-step__reorder');
    var upButton = el('button', 'icon-btn');
    upButton.type = 'button';
    upButton.setAttribute('aria-label', 'Di chuyển bước lên trên');
    upButton.appendChild(svgIcon('icon-chevron-down', 'icon icon--sm workflow-step__chevron-up'));
    upButton.addEventListener('click', function () { moveStep(card, 'up'); });
    var downButton = el('button', 'icon-btn');
    downButton.type = 'button';
    downButton.setAttribute('aria-label', 'Di chuyển bước xuống dưới');
    downButton.appendChild(svgIcon('icon-chevron-down'));
    downButton.addEventListener('click', function () { moveStep(card, 'down'); });
    reorder.appendChild(upButton);
    reorder.appendChild(downButton);
    side.appendChild(reorder);
    card.appendChild(side);

    var body = el('div', 'workflow-step__body');

    var topRow = el('div', 'workflow-step__top');
    var grid1 = el('div', 'form-grid');

    var nameField = el('div', 'field');
    nameField.appendChild(el('label', 'label', 'Tên bước'));
    var nameInput = el('input', 'input step-name');
    nameInput.type = 'text';
    if (data.name) nameInput.value = data.name;
    nameField.appendChild(nameInput);
    grid1.appendChild(nameField);

    var typeField = el('div', 'field');
    typeField.appendChild(el('label', 'label', 'Loại hoạt động kỹ thuật'));
    var typeSelect = el('select', 'select step-type');
    fillActivitySelect(typeSelect, data.activityType);
    typeField.appendChild(typeSelect);
    grid1.appendChild(typeField);

    topRow.appendChild(grid1);

    var removeButton = el('button', 'icon-btn icon-btn--danger workflow-step__remove');
    removeButton.type = 'button';
    removeButton.setAttribute('aria-label', 'Xoá bước');
    removeButton.appendChild(svgIcon('icon-x'));
    removeButton.addEventListener('click', function () {
      card.remove();
      renumberSteps();
      if (!stepsList.children.length) addStep();
    });
    topRow.appendChild(removeButton);
    body.appendChild(topRow);

    var instructionRow = el('div', 'workflow-step__instruction-row');
    var instructionField = el('div', 'field');
    instructionField.appendChild(el('label', 'label', 'Hướng dẫn thực hiện cho nông dân'));
    var instructionInput = el('input', 'input step-instruction');
    instructionInput.type = 'text';
    if (data.instruction) instructionInput.value = data.instruction;
    instructionField.appendChild(instructionInput);
    instructionRow.appendChild(instructionField);

    var qrLabel = el('label', 'checkbox workflow-step__qr');
    var qrInput = el('input', 'checkbox__input step-require-qr');
    qrInput.type = 'checkbox';
    qrInput.checked = !!data.requireQr;
    qrLabel.appendChild(qrInput);
    qrLabel.appendChild(el('span', 'checkbox__label', 'Yêu cầu tạo QR truy xuất'));
    instructionRow.appendChild(qrLabel);
    body.appendChild(instructionRow);

    var flagsRow = el('div', 'workflow-step__flags');

    var supplyLabel = el('label', 'checkbox');
    var supplyInput = el('input', 'checkbox__input step-require-supply');
    supplyInput.type = 'checkbox';
    supplyInput.checked = !!data.requireSupply;
    supplyLabel.appendChild(supplyInput);
    supplyLabel.appendChild(el('span', 'checkbox__label', 'Yêu cầu dùng vật tư'));
    flagsRow.appendChild(supplyLabel);

    var imageLabel = el('label', 'checkbox');
    var imageInput = el('input', 'checkbox__input step-require-image');
    imageInput.type = 'checkbox';
    imageInput.checked = !!data.requireImage;
    imageLabel.appendChild(imageInput);
    imageLabel.appendChild(el('span', 'checkbox__label', 'Bắt buộc hình ảnh'));
    flagsRow.appendChild(imageLabel);

    body.appendChild(flagsRow);

    var supplyField = el('div', 'field workflow-step__supply-field');
    supplyField.hidden = !data.requireSupply;
    supplyField.appendChild(el('label', 'label', 'Chỉ định vật tư cụ thể (Tuỳ chọn)'));
    var supplySelect = el('select', 'select step-supply-id');
    var emptyOption = el('option', null, '— Không chỉ định —');
    emptyOption.value = '';
    supplySelect.appendChild(emptyOption);
    availableSupplies.forEach(function (supply) {
      var option = el('option', null, supply.code + ' — ' + supply.name);
      option.value = supply.id;
      if (supply.id === data.supplyId) option.selected = true;
      supplySelect.appendChild(option);
    });
    supplyField.appendChild(supplySelect);
    body.appendChild(supplyField);

    supplyInput.addEventListener('change', function () {
      supplyField.hidden = !supplyInput.checked;
    });

    card.appendChild(body);
    return card;
  }

  function addStep(data) {
    stepsList.appendChild(stepCard(data || {}));
    renumberSteps();
  }

  function resetSteps() {
    stepCount = 0;
    stepsList.textContent = '';
    addStep();
  }

  function collectSteps() {
    return Array.prototype.map.call(stepsList.querySelectorAll('[data-step-card]'), function (card) {
      var requireSupply = card.querySelector('.step-require-supply').checked;
      return {
        name: card.querySelector('.step-name').value.trim(),
        activityType: card.querySelector('.step-type').value,
        instruction: card.querySelector('.step-instruction').value.trim(),
        requireQr: card.querySelector('.step-require-qr').checked,
        requireSupply: requireSupply,
        supplyId: requireSupply ? card.querySelector('.step-supply-id').value : '',
        requireImage: card.querySelector('.step-require-image').checked
      };
    });
  }

  /* --- Modal thêm/sửa mẫu quy trình --------------------------------------------- */

  var modal = document.getElementById('template-modal');
  var form = document.getElementById('template-form');
  var modalTitle = document.getElementById('template-modal-title');
  var submitLabel = document.querySelector('[data-template-submit-label]');

  var editingTemplateId = null;

  function openModal(template) {
    form.reset();
    clearErrors();
    editingTemplateId = template ? template.id : null;
    resetSteps();

    if (template) {
      modalTitle.textContent = 'Sửa mẫu quy trình';
      submitLabel.textContent = 'Lưu thay đổi';
      document.getElementById('template-name').value = template.name || '';
      document.getElementById('template-description').value = template.description || '';

      if (template.steps && template.steps.length) {
        stepsList.textContent = '';
        stepCount = 0;
        template.steps.forEach(function (step) { addStep(step); });
      }
    } else {
      modalTitle.textContent = 'Thiết Kế Mẫu Quy Trình Mới';
      submitLabel.textContent = 'Lưu quy trình';
    }

    modal.showModal();
    document.getElementById('template-name').focus();
  }

  function closeModal() {
    modal.close();
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

    var name = document.getElementById('template-name');
    if (!name.value.trim()) { showError(name, 'Nhập tên quy trình mẫu.'); problems.push(name); }

    var stepCards = stepsList.querySelectorAll('[data-step-card]');
    Array.prototype.forEach.call(stepCards, function (card) {
      var stepNameInput = card.querySelector('.step-name');
      if (!stepNameInput.value.trim()) {
        showError(stepNameInput, 'Nhập tên bước.');
        problems.push(stepNameInput);
      }
    });

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
      name: String(data.get('name') || '').trim(),
      description: String(data.get('description') || '').trim(),
      steps: collectSteps()
    };

    if (editingTemplateId) {
      store.update('workflowTemplates', editingTemplateId, payload);
    } else {
      store.insert('workflowTemplates', payload);
    }

    closeModal();
    render();
    global.AgriChain.toast(editingTemplateId ? 'Đã lưu thay đổi.' : 'Đã tạo mẫu quy trình.');
  }

  /* --- Khởi động -------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    loadSupplyOptions();
    render();

    document.querySelectorAll('[data-open-template-form]').forEach(function (button) {
      button.addEventListener('click', function () { openModal(); });
    });
    document.querySelectorAll('[data-close-template-form]').forEach(function (button) {
      button.addEventListener('click', closeModal);
    });
    document.querySelector('[data-add-step]').addEventListener('click', function () { addStep(); });

    form.addEventListener('submit', handleSubmit);
  });
})(window);
