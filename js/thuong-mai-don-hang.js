/* ==========================================================================
   AgriChain — Trang Thương mại điện tử / Đơn hàng
   Chỉ xem/lọc/đổi trạng thái — KHÔNG có form tạo đơn hàng, vì đơn hàng thật
   phải do khách đặt qua cửa hàng, mà dự án chưa có trang mua hàng công khai
   nào tạo ra dữ liệu này. Trang sẽ luôn rỗng cho tới khi có nơi khác trong
   app ghi vào collection "orders" (giống cách lo-hang.html chỉ xem lô hàng,
   việc tạo lô hàng nằm ở nong-trai-chi-tiet.html).
   Nạp SAU js/store.js, js/app-shell.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var store = global.AgriChain.store;
  var session = store.getSession();

  var ORDER_STATUSES = [
    { key: 'pending', label: 'Chờ xác nhận', badge: 'badge--warning' },
    { key: 'confirmed', label: 'Đã xác nhận', badge: 'badge--info' },
    { key: 'shipping', label: 'Đang giao', badge: 'badge--info' },
    { key: 'completed', label: 'Hoàn thành', badge: 'badge--success' },
    { key: 'cancelled', label: 'Đã hủy', badge: 'badge--danger' }
  ];
  var PAYMENT_STATUSES = [
    { key: 'paid', label: 'Đã thanh toán', badge: 'badge--success' },
    { key: 'unpaid', label: 'Chưa thanh toán', badge: 'badge--warning' }
  ];

  function statusOf(key) {
    for (var i = 0; i < ORDER_STATUSES.length; i++) {
      if (ORDER_STATUSES[i].key === key) return ORDER_STATUSES[i];
    }
    return null;
  }

  function paymentStatusOf(key) {
    for (var i = 0; i < PAYMENT_STATUSES.length; i++) {
      if (PAYMENT_STATUSES[i].key === key) return PAYMENT_STATUSES[i];
    }
    return null;
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
    return (Number(value) || 0).toLocaleString('vi-VN') + ' đ';
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    var date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + date.getFullYear() +
      ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function myOrders() {
    if (!session) return [];
    return store.list('orders').filter(function (order) {
      return order.ownerId === session.id;
    });
  }

  /* --- Tab trạng thái + tìm kiếm + sắp xếp ----------------------------------- */

  var activeStatus = '';
  var sortKey = 'createdAt';
  var sortDir = 'desc';

  var searchInput = document.getElementById('order-search');
  var tableBody = document.querySelector('[data-order-table-body]');
  var statusTabs = document.querySelectorAll('[data-status-tab]');
  var sortButtons = document.querySelectorAll('[data-sort-key]');

  function updateSortArrows() {
    sortButtons.forEach(function (button) {
      var arrow = button.querySelector('[data-sort-arrow]');
      if (button.dataset.sortKey === sortKey) {
        arrow.textContent = sortDir === 'asc' ? '↑' : '↓';
      } else {
        arrow.textContent = '';
      }
    });
  }

  function filteredOrders() {
    var all = myOrders();
    var keyword = searchInput.value.trim().toLowerCase();

    var result = all.filter(function (order) {
      if (activeStatus && order.status !== activeStatus) return false;
      if (keyword) {
        var haystack = (order.code + ' ' + order.customerName).toLowerCase();
        if (haystack.indexOf(keyword) === -1) return false;
      }
      return true;
    });

    result.sort(function (a, b) {
      var av = sortKey === 'total' ? (Number(a.total) || 0) : (a.createdAt || '');
      var bv = sortKey === 'total' ? (Number(b.total) || 0) : (b.createdAt || '');
      var cmp = av > bv ? 1 : (av < bv ? -1 : 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }

  function orderRow(order) {
    var row = el('tr');

    var codeCell = el('td', 'table__code', order.code);
    row.appendChild(codeCell);

    var customerCell = el('td');
    customerCell.appendChild(el('div', 'table__name', order.customerName));
    if (order.customerPhone) {
      customerCell.appendChild(el('div', 'table__muted', order.customerPhone));
    }
    row.appendChild(customerCell);

    row.appendChild(el('td', 'table__nowrap', formatDateTime(order.createdAt)));
    row.appendChild(el('td', null, formatVnd(order.total)));

    var paymentCell = el('td');
    var payment = paymentStatusOf(order.paymentStatus);
    if (payment) paymentCell.appendChild(el('span', 'badge ' + payment.badge, payment.label));
    row.appendChild(paymentCell);

    var statusCell = el('td');
    var status = statusOf(order.status);
    if (status) statusCell.appendChild(el('span', 'badge ' + status.badge, status.label));
    row.appendChild(statusCell);

    var actionsCell = el('td', 'table__actions');
    var viewButton = el('button', 'icon-btn');
    viewButton.type = 'button';
    viewButton.setAttribute('aria-label', 'Xem chi tiết đơn hàng ' + order.code);
    viewButton.setAttribute('data-tooltip', 'Xem chi tiết');
    viewButton.appendChild(svgIcon('icon-eye'));
    viewButton.addEventListener('click', function () { openOrderModal(order); });
    actionsCell.appendChild(viewButton);
    row.appendChild(actionsCell);

    return row;
  }

  function emptyRow() {
    var row = el('tr');
    var cell = el('td', 'table-empty');
    cell.colSpan = 7;
    cell.appendChild(svgIcon('icon-shopping-cart-off', 'icon icon--lg'));
    cell.appendChild(el('p', null, 'Không có đơn hàng nào'));
    cell.appendChild(el('p', 'field__hint', 'Dữ liệu đơn hàng cho trạng thái này trống.'));
    row.appendChild(cell);
    return row;
  }

  function render() {
    updateSortArrows();
    var orders = filteredOrders();

    tableBody.textContent = '';
    if (!orders.length) {
      tableBody.appendChild(emptyRow());
      return;
    }

    orders.forEach(function (order) {
      tableBody.appendChild(orderRow(order));
    });
  }

  /* --- Modal chi tiết đơn hàng ------------------------------------------------ */

  var modal = document.getElementById('order-modal');
  var statusSelect = document.getElementById('order-status-select');
  var itemsList = document.querySelector('[data-order-items]');
  var editingOrderId = null;

  function fillStatusSelect() {
    ORDER_STATUSES.forEach(function (status) {
      var option = el('option', null, status.label);
      option.value = status.key;
      statusSelect.appendChild(option);
    });
  }

  function openOrderModal(order) {
    editingOrderId = order.id;

    document.querySelector('[data-order-code]').textContent = order.code;
    document.querySelector('[data-order-time]').textContent = formatDateTime(order.createdAt);
    document.querySelector('[data-order-customer]').textContent = order.customerName;
    document.querySelector('[data-order-phone]').textContent = order.customerPhone || '—';
    document.querySelector('[data-order-total]').textContent = formatVnd(order.total);

    var payment = paymentStatusOf(order.paymentStatus);
    document.querySelector('[data-order-payment]').textContent = payment ? payment.label : '—';

    itemsList.textContent = '';
    (order.items || []).forEach(function (item) {
      var line = el('li', 'order-items__row');
      line.appendChild(el('span', null, item.name + ' × ' + item.quantity));
      line.appendChild(el('span', null, formatVnd((Number(item.price) || 0) * (Number(item.quantity) || 0))));
      itemsList.appendChild(line);
    });

    statusSelect.value = order.status;

    modal.showModal();
  }

  function closeOrderModal() {
    modal.close();
    editingOrderId = null;
  }

  function handleSaveStatus() {
    if (!editingOrderId) return;
    store.update('orders', editingOrderId, { status: statusSelect.value });
    closeOrderModal();
    render();
    global.AgriChain.toast('Đã cập nhật trạng thái đơn hàng.');
  }

  /* --- Khởi động ---------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    if (!session) return; // app-shell.js đã tự chuyển hướng về trang đăng nhập

    fillStatusSelect();
    render();

    statusTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activeStatus = tab.dataset.statusTab;
        statusTabs.forEach(function (other) {
          var active = other === tab;
          other.classList.toggle('is-active', active);
          other.setAttribute('aria-selected', String(active));
        });
        render();
      });
    });

    sortButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var key = button.dataset.sortKey;
        if (sortKey === key) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = key;
          sortDir = 'desc';
        }
        render();
      });
    });

    searchInput.addEventListener('input', render);

    document.querySelectorAll('[data-close-order-modal]').forEach(function (button) {
      button.addEventListener('click', closeOrderModal);
    });
    document.querySelector('[data-save-order-status]').addEventListener('click', handleSaveStatus);
  });
})(window);
