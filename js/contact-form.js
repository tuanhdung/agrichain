document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('contact-form');
  var successMessage = document.getElementById('contact-form-success');
  if (!form || !successMessage) return;

  var hideTimeout = null;

  function hideSuccess() {
    successMessage.classList.remove('is-visible');
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  function showSuccess() {
    successMessage.classList.add('is-visible');
    successMessage.focus();
    hideTimeout = setTimeout(hideSuccess, 5000);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    form.reset();
    showSuccess();
  });

  form.addEventListener('input', hideSuccess);
});
