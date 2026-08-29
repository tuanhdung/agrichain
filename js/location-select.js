/* ==========================================================================
   AgriChain — Cơ chế 2 <select> phụ thuộc nhau (chọn cái trước mới xổ ra
   cái sau), dùng chung cho:
     - Tỉnh/Thành phố -> Phường/Xã (js/nong-trai.js, nạp data từ file JSON)
     - Nông trại -> Mùa vụ (js/lo-hang.js, lọc mảng có sẵn trong localStorage)
   Chỉ định nghĩa CƠ CHẾ (điền option, disable/loading/lỗi, reset khi đổi
   select cha) — dữ liệu và cách hiển thị lỗi do nơi gọi tự quyết định qua
   các callback, không phụ thuộc AgriChain.store hay bất kỳ trang cụ thể nào.
   ========================================================================== */

(function (global) {
  'use strict';

  /* config:
     - parentSelect, childSelect: 2 phần tử <select>
     - loadChildren(parentValue): trả mảng, hoặc Promise<mảng> — danh sách
       mục con tương ứng với lựa chọn cha hiện tại
     - getOptionValue(item), getOptionLabel(item): mặc định trả thẳng item
     - placeholderEmpty: option đầu tiên của select con khi đã có dữ liệu
       (mặc định "— Chọn —")
     - placeholderNoParent: hiện khi select cha chưa chọn gì — BỎ QUA nếu
       allowEmptyParent=true (dùng cho bộ lọc, nơi "chưa chọn" = "Tất cả",
       vẫn cần tải dữ liệu chứ không phải trạng thái "chưa sẵn sàng")
     - placeholderLoading, placeholderError
     - onError(error): tuỳ nơi gọi tự hiện lỗi kiểu gì (VD showError() riêng
       của từng trang)
     - onChange(): gọi sau khi select con đã điền xong (dù thành công hay
       lỗi) — dùng khi nơi gọi cần làm gì đó tiếp theo (VD lọc lại danh sách
       theo select con vừa đổi), vì refresh() chạy bất đồng bộ nên không thể
       chỉ addEventListener('change', ...) riêng rồi đọc luôn giá trị mới.
     Trả về { refresh: function(selectedChildValue) } — gọi refresh() để chủ
     động tải lại (VD lúc mở modal sửa, cần chọn sẵn giá trị con đã lưu). */
  function setupCascadingSelect(config) {
    var parentSelect = config.parentSelect;
    var childSelect = config.childSelect;
    var loadChildren = config.loadChildren;
    var getOptionValue = config.getOptionValue || function (item) { return item; };
    var getOptionLabel = config.getOptionLabel || function (item) { return item; };
    var placeholderEmpty = config.placeholderEmpty || '— Chọn —';
    var placeholderNoParent = config.placeholderNoParent || '— Chọn mục ở trên trước —';
    var placeholderLoading = config.placeholderLoading || 'Đang tải...';
    var placeholderError = config.placeholderError || '— Không tải được —';
    var allowEmptyParent = !!config.allowEmptyParent;
    var onError = config.onError;
    var onChange = config.onChange;

    function setChildPlaceholder(text) {
      childSelect.textContent = '';
      var option = document.createElement('option');
      option.value = '';
      option.textContent = text;
      childSelect.appendChild(option);
      childSelect.disabled = true;
    }

    function fillChild(items, selectedValue) {
      childSelect.textContent = '';

      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = placeholderEmpty;
      childSelect.appendChild(placeholder);

      items.forEach(function (item) {
        var option = document.createElement('option');
        option.value = getOptionValue(item);
        option.textContent = getOptionLabel(item);
        childSelect.appendChild(option);
      });

      childSelect.disabled = false;
      if (selectedValue) childSelect.value = selectedValue;
    }

    function refresh(selectedChildValue) {
      var parentValue = parentSelect.value;

      if (!parentValue && !allowEmptyParent) {
        setChildPlaceholder(placeholderNoParent);
        if (onChange) onChange();
        return Promise.resolve();
      }

      setChildPlaceholder(placeholderLoading);

      var result = loadChildren(parentValue);
      var promise = (result && typeof result.then === 'function')
        ? result
        : Promise.resolve(result);

      return promise.then(function (items) {
        fillChild(items, selectedChildValue);
      }).catch(function (error) {
        setChildPlaceholder(placeholderError);
        if (onError) onError(error);
      }).then(function () {
        if (onChange) onChange();
      });
    }

    parentSelect.addEventListener('change', function () {
      refresh(); // đổi cha bằng tay thì luôn bỏ trống con, không giữ nhầm lựa chọn cũ
    });

    return { refresh: refresh };
  }

  global.AgriChain = global.AgriChain || {};
  global.AgriChain.setupCascadingSelect = setupCascadingSelect;
})(window);
