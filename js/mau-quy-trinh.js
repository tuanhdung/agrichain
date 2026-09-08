/* ==========================================================================
   AgriChain — Trang Mẫu quy trình (mùa vụ)
   ĐÃ CHUYỂN SANG BACKEND THẬT qua js/api.js (GET/POST/PATCH/DELETE
   /workflow-templates) — không còn đọc/ghi qua AgriChain.store/collection
   "workflowTemplates" nữa. Payload gửi lên đổi tên field sang snake_case
   khớp cột backend (activityType -> activity_type, requireQr -> require_qr,
   requireSupply -> require_supply, supplyId -> supply_id, requireImage ->
   require_image); response trả về giữ nguyên snake_case, đọc thẳng — đúng
   quy ước đã dùng cho farms/seasons/supplies. `TemplateStep` (backend) xác
   nhận KHÔNG có `id` riêng — khớp đúng giả định code từ trước, không có
   rủi ro định dạng UUID như vụ `seasons.workflowSteps[]`.

   Mã quyền `workflow_templates.view/add/edit/delete` đã được xác nhận THẬT
   qua GET /permissions (2026-09-08) — KHÔNG nằm trong danh sách 28 mã ghi
   trong CLAUDE.md trước đây (nhóm này thêm sau, khi domain workflow-
   templates lên backend), đã cập nhật lại tài liệu.

   Vật tư (bước "Chỉ định vật tư cụ thể") ĐÃ CHUYỂN SANG API từ trước, đọc
   qua api.supplies.list() — không đổi gì thêm ở lần migrate này.

   Nạp SAU js/api-config.js, js/api.js, js/app-shell.js, js/enums.js
   (ACTIVITY_TYPES dùng chung).
   ========================================================================== */

(function (global) {
  'use strict';

  var api = global.AgriChain.api;
  var PAGE_SIZE = 12;
  var SEARCH_DEBOUNCE_MS = 300;

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

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      global.clearTimeout(timer);
      timer = global.setTimeout(function () { fn.apply(null, args); }, wait);
    };
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

  /* --- Danh sách -------------------------------------------------------------- */

  var listNode = document.querySelector('[data-template-list]');
  var emptyNode = document.querySelector('[data-template-empty]');
  var emptyTitleNode = document.querySelector('[data-template-empty-title]');
  var emptyDescNode = document.querySelector('[data-template-empty-desc]');
  var countNode = document.querySelector('[data-template-count]');
  var searchInput = document.querySelector('[data-template-search]');
  var loadingNode = document.querySelector('[data-template-loading]');
  var errorNode = document.querySelector('[data-template-error]');
  var errorMessageNode = document.querySelector('[data-template-error-message]');
  var paginationNode = document.querySelector('[data-template-pagination]');
  var pageInfoNode = document.querySelector('[data-template-page-info]');
  var prevPageBtn = document.querySelector('[data-template-prev-page]');
  var nextPageBtn = document.querySelector('[data-template-next-page]');

  var listState = { page: 1, q: '', total: 0 };

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
    if (!api.hasPermission('workflow_templates.edit')) editButton.hidden = true;
    editButton.appendChild(svgIcon('icon-pencil'));
    editButton.addEventListener('click', function () { openModal(template); });
    footer.appendChild(editButton);

    var deleteButton = el('button', 'icon-btn icon-btn--danger');
    deleteButton.type = 'button';
    deleteButton.setAttribute('aria-label', 'Xoá ' + template.name);
    deleteButton.setAttribute('data-tooltip', 'Xoá');
    if (!api.hasPermission('workflow_templates.delete')) deleteButton.hidden = true;
    deleteButton.appendChild(svgIcon('icon-trash'));
    deleteButton.addEventListener('click', function () { handleDelete(template); });
    footer.appendChild(deleteButton);

    card.appendChild(footer);
    return card;
  }

  function setListView(view) {
    loadingNode.hidden = view !== 'loading';
    errorNode.hidden = view !== 'error';
    listNode.hidden = view !== 'data';
    emptyNode.hidden = view !== 'empty';
    paginationNode.hidden = view !== 'data';
  }

  function renderTemplates(data) {
    var templates = data.items || [];
    listState.total = data.total || 0;
    countNode.textContent = listState.total;

    listNode.textContent = '';

    if (!templates.length) {
      if (listState.q) {
        emptyTitleNode.textContent = 'Không tìm thấy mẫu quy trình nào';
        emptyDescNode.textContent = 'Thử lại với từ khoá khác.';
      } else {
        emptyTitleNode.textContent = 'Chưa có Mẫu Quy Trình nào';
        emptyDescNode.textContent = 'Tạo mẫu quy trình chuẩn gồm các bước bón phân, tưới tiêu, ' +
          'bón lót, thu hoạch... để nông dân thực hiện theo trên App.';
      }
      setListView('empty');
      return;
    }

    templates.forEach(function (template) {
      listNode.appendChild(templateCard(template));
    });
    setListView('data');

    var totalPages = Math.max(1, Math.ceil(listState.total / PAGE_SIZE));
    pageInfoNode.textContent = 'Trang ' + listState.page + ' / ' + totalPages;
    prevPageBtn.disabled = listState.page <= 1;
    nextPageBtn.disabled = listState.page >= totalPages;
  }

  function loadTemplates() {
    setListView('loading');
    api.workflowTemplates.list({
      q: listState.q || undefined,
      page: listState.page,
      page_size: PAGE_SIZE
    }).then(function (data) {
      renderTemplates(data);
    }).catch(function (err) {
      errorMessageNode.textContent = err.message;
      setListView('error');
    });
  }

  var handleSearchInput = debounce(function () {
    listState.q = searchInput.value.trim();
    listState.page = 1;
    loadTemplates();
  }, SEARCH_DEBOUNCE_MS);

  function handleDelete(template) {
    global.AgriChain.confirm(
      'Xoá mẫu quy trình "' + template.name + '"? Hành động này không thể hoàn tác.'
    ).then(function (confirmed) {
      if (!confirmed) return;
      api.workflowTemplates.remove(template.id).then(function () {
        loadTemplates();
        global.AgriChain.toast('Đã xoá mẫu quy trình.');
      }).catch(function (err) {
        // Sửa/xoá mẫu KHÔNG ảnh hưởng mùa vụ đã áp dụng nó trước đó (mùa vụ
        // lưu bản chụp riêng ở seasons.workflow_steps[]) — 409 ở đây (nếu
        // có) không phải vì "đang được dùng", hiện đúng message backend trả.
        global.AgriChain.toast(err.message);
      });
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

  // `data` đọc snake_case (activity_type, require_qr, require_supply,
  // supply_id, require_image) — khớp response thật của GET /workflow-
  // templates/{id}, dùng chung cho cả lúc sửa (điền sẵn từ API) lẫn lúc
  // thêm bước mới (data={}).
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
    fillActivitySelect(typeSelect, data.activity_type);
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
    qrInput.checked = !!data.require_qr;
    qrLabel.appendChild(qrInput);
    qrLabel.appendChild(el('span', 'checkbox__label', 'Yêu cầu tạo QR truy xuất'));
    instructionRow.appendChild(qrLabel);
    body.appendChild(instructionRow);

    var flagsRow = el('div', 'workflow-step__flags');

    var supplyLabel = el('label', 'checkbox');
    var supplyInput = el('input', 'checkbox__input step-require-supply');
    supplyInput.type = 'checkbox';
    supplyInput.checked = !!data.require_supply;
    supplyLabel.appendChild(supplyInput);
    supplyLabel.appendChild(el('span', 'checkbox__label', 'Yêu cầu dùng vật tư'));
    flagsRow.appendChild(supplyLabel);

    var imageLabel = el('label', 'checkbox');
    var imageInput = el('input', 'checkbox__input step-require-image');
    imageInput.type = 'checkbox';
    imageInput.checked = !!data.require_image;
    imageLabel.appendChild(imageInput);
    imageLabel.appendChild(el('span', 'checkbox__label', 'Bắt buộc hình ảnh'));
    flagsRow.appendChild(imageLabel);

    body.appendChild(flagsRow);

    var supplyField = el('div', 'field workflow-step__supply-field');
    supplyField.hidden = !data.require_supply;
    supplyField.appendChild(el('label', 'label', 'Chỉ định vật tư cụ thể (Tuỳ chọn)'));
    var supplySelect = el('select', 'select step-supply-id');
    var emptyOption = el('option', null, '— Không chỉ định —');
    emptyOption.value = '';
    supplySelect.appendChild(emptyOption);
    availableSupplies.forEach(function (supply) {
      var option = el('option', null, supply.code + ' — ' + supply.name);
      option.value = supply.id;
      if (supply.id === data.supply_id) option.selected = true;
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

  // Trả về snake_case khớp TemplateStep thật (backend) — supplyId/instruction
  // rỗng gửi `null` thay vì chuỗi rỗng, đúng khuôn anyOf[string|null]/
  // anyOf[uuid|null] của schema (không phải optional string luôn có giá trị).
  function collectSteps() {
    return Array.prototype.map.call(stepsList.querySelectorAll('[data-step-card]'), function (card) {
      var requireSupply = card.querySelector('.step-require-supply').checked;
      var supplyId = requireSupply ? card.querySelector('.step-supply-id').value : '';
      var instruction = card.querySelector('.step-instruction').value.trim();
      return {
        name: card.querySelector('.step-name').value.trim(),
        activity_type: card.querySelector('.step-type').value,
        instruction: instruction || null,
        require_qr: card.querySelector('.step-require-qr').checked,
        require_supply: requireSupply,
        supply_id: supplyId || null,
        require_image: card.querySelector('.step-require-image').checked
      };
    });
  }

  /* --- Modal thêm/sửa mẫu quy trình --------------------------------------------- */

  var modal = document.getElementById('template-modal');
  var form = document.getElementById('template-form');
  var modalTitle = document.getElementById('template-modal-title');
  var submitLabel = document.querySelector('[data-template-submit-label]');
  var submitButton = form.querySelector('button[type="submit"]');

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
    editingTemplateId = null;
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

  // Ánh xạ tên field backend trả về trong lỗi (details.field) sang đúng
  // input trên form — khớp WorkflowTemplateCreate/Update thật. Lỗi ở field
  // "steps" (mảng, VD 1 bước thiếu activity_type hợp lệ) không map được về
  // 1 input cụ thể — rơi về toast chung.
  function fieldNodeFor(fieldName) {
    var map = {
      name: 'template-name',
      description: 'template-description'
    };
    var id = map[fieldName];
    return id ? document.getElementById(id) : null;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    var data = new FormData(form);
    var payload = {
      name: String(data.get('name') || '').trim(),
      description: String(data.get('description') || '').trim() || null,
      steps: collectSteps()
    };

    submitButton.disabled = true;
    submitLabel.textContent = 'Đang lưu...';

    var request = editingTemplateId
      ? api.workflowTemplates.update(editingTemplateId, payload)
      : api.workflowTemplates.create(payload);

    request.then(function () {
      closeModal();
      loadTemplates();
      global.AgriChain.toast(editingTemplateId ? 'Đã lưu thay đổi.' : 'Đã tạo mẫu quy trình.');
    }).catch(function (err) {
      if (err.details && err.details.field) {
        var field = fieldNodeFor(err.details.field);
        if (field) {
          showError(field, err.message);
          field.focus();
        } else {
          global.AgriChain.toast(err.message);
        }
      } else {
        global.AgriChain.toast(err.message);
      }
    }).then(function () {
      submitButton.disabled = false;
      submitLabel.textContent = editingTemplateId ? 'Lưu thay đổi' : 'Lưu quy trình';
    });
  }

  // Ẩn nút nào người dùng hiện tại không có quyền — đánh dấu sẵn bằng
  // data-requires-permission="<mã quyền>" trên nút trong HTML.
  function applyPermissionGates() {
    document.querySelectorAll('[data-requires-permission]').forEach(function (node) {
      var code = node.getAttribute('data-requires-permission');
      if (!api.hasPermission(code)) node.hidden = true;
    });
  }

  /* --- Khởi động -------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    applyPermissionGates();
    loadSupplyOptions();
    loadTemplates();

    searchInput.addEventListener('input', handleSearchInput);
    prevPageBtn.addEventListener('click', function () {
      if (listState.page <= 1) return;
      listState.page -= 1;
      loadTemplates();
    });
    nextPageBtn.addEventListener('click', function () {
      listState.page += 1;
      loadTemplates();
    });
    document.querySelector('[data-template-retry]').addEventListener('click', loadTemplates);

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
