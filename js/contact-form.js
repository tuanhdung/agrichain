document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('contact-form');
  var successMessage = document.getElementById('contact-form-success');
  if (!form || !successMessage) return;

  var submitButton = form.querySelector('.contact__submit');
  var submitLabel = submitButton ? submitButton.querySelector('.contact__submit-label') : null;
  var submitLabelDefault = submitLabel ? submitLabel.textContent : '';

  var hideTimeout = null;

  function hideSuccess() {
    successMessage.classList.remove('is-visible');
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  // Xoá rồi ép reflow trước khi thêm lại ".is-visible" — nếu không, ở lần
  // gửi thứ 2 trở đi trình duyệt sẽ KHÔNG chạy lại @keyframes vẽ dấu tích/
  // thanh đếm ngược vì với nó class không hề đổi giá trị (vẫn y hệt lần
  // trước), animation coi như "đã chạy xong rồi".
  function showSuccess() {
    successMessage.classList.remove('is-visible');
    void successMessage.offsetWidth;
    successMessage.classList.add('is-visible');
    successMessage.focus();
    hideTimeout = setTimeout(hideSuccess, 5000);
  }

  function setLoading(isLoading) {
    if (!submitButton) return;
    submitButton.classList.toggle('is-loading', isLoading);
    submitButton.disabled = isLoading;
    if (submitLabel) submitLabel.textContent = isLoading ? 'Đang gửi...' : submitLabelDefault;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Form này vẫn chỉ xử lý phía client, chưa gửi đi đâu thật (xem
    // CLAUDE.md mục "Việc chưa làm") — độ trễ giả lập chỉ để trạng thái
    // "Đang gửi..." có cảm giác thật hơn là phản hồi tức thì.
    setLoading(true);
    setTimeout(function () {
      setLoading(false);
      form.reset();
      showSuccess();
    }, 700);
  });

  form.addEventListener('input', hideSuccess);
});
