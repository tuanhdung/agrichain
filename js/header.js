document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.site-header__toggle');
  var panel = document.getElementById('site-header-panel');
  if (!toggle || !panel) return;

  function openPanel() {
    panel.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Đóng menu');
  }

  function closePanel() {
    panel.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Mở menu');
  }

  toggle.addEventListener('click', function () {
    if (panel.classList.contains('is-open')) {
      closePanel();
    } else {
      openPanel();
    }
  });

  panel.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closePanel);
  });

  document.addEventListener('click', function (event) {
    if (!panel.classList.contains('is-open')) return;
    var clickedInsidePanel = panel.contains(event.target);
    var clickedToggle = toggle.contains(event.target);
    if (!clickedInsidePanel && !clickedToggle) closePanel();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) {
      closePanel();
      toggle.focus();
    }
  });

  var desktopQuery = window.matchMedia('(min-width: 960px)');
  desktopQuery.addEventListener('change', function (event) {
    if (event.matches) closePanel();
  });
});
