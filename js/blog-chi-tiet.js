/* ==========================================================================
   AgriChain — Trang chi tiết 1 bài viết Blog (blog-chi-tiet.html?slug=...)
   Đọc slug từ query string (?slug=), tìm trong data/blog-posts.json (cùng
   nguồn dữ liệu với js/blog.js) rồi dựng nội dung bài viết. Trang KHÔNG cần
   đăng nhập nên không nạp js/app-shell.js/js/store.js (không có
   AgriChain.initials()/AgriChain.toast() — 2 hàm nhỏ cần dùng được viết lại
   riêng ở đây).
   ========================================================================== */

(function (global) {
  'use strict';

  var notFoundNode = document.querySelector('[data-not-found]');
  var detailNode = document.querySelector('[data-post-detail]');

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function initials(text) {
    if (!text) return '?';
    var words = text.trim().split(/\s+/).slice(-2);
    return words.map(function (word) {
      return word.charAt(0).toUpperCase();
    }).join('');
  }

  function fillField(selector, value) {
    var node = document.querySelector(selector);
    if (node) node.textContent = value || '';
  }

  function renderBody(post) {
    var bodyNode = document.querySelector('[data-post-body]');
    bodyNode.textContent = '';

    post.body.forEach(function (block) {
      if (block.type === 'heading') {
        bodyNode.appendChild(el('h2', null, block.text));
      } else if (block.type === 'list') {
        var list = el('ul');
        block.items.forEach(function (item) {
          var li = el('li');
          if (item.strong) li.appendChild(el('strong', null, item.strong + ' '));
          li.appendChild(document.createTextNode(item.text));
          list.appendChild(li);
        });
        bodyNode.appendChild(list);
      } else {
        bodyNode.appendChild(el('p', null, block.text));
      }
    });
  }

  function renderTags(post) {
    var tagsNode = document.querySelector('[data-post-tags]');
    tagsNode.textContent = '';
    (post.tags || []).forEach(function (tag) {
      tagsNode.appendChild(el('span', 'badge badge--info', '#' + tag));
    });
  }

  function setupShare(post) {
    var url = global.location.href;

    var fbLink = document.querySelector('[data-share-facebook]');
    fbLink.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);

    var twLink = document.querySelector('[data-share-twitter]');
    twLink.href = 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) +
      '&text=' + encodeURIComponent(post.title);

    var copyBtn = document.querySelector('[data-copy-link]');
    copyBtn.addEventListener('click', function () {
      var iconUse = copyBtn.querySelector('use');
      var originalHref = iconUse.getAttribute('href');
      navigator.clipboard.writeText(url).then(function () {
        iconUse.setAttribute('href', 'icons/sprite.svg#icon-check-circle');
        setTimeout(function () {
          iconUse.setAttribute('href', originalHref);
        }, 1500);
      });
    });
  }

  function showNotFound() {
    notFoundNode.hidden = false;
    detailNode.hidden = true;
  }

  function showPost(post) {
    notFoundNode.hidden = true;
    detailNode.hidden = false;

    document.title = post.title + ' — AgriChain Blog';

    fillField('[data-post-category]', post.category);
    fillField('[data-post-title]', post.title);
    fillField('[data-post-author]', post.author);
    fillField('[data-post-author-initials]', initials(post.author));
    fillField('[data-post-date]', post.date);
    fillField('[data-post-read-time]', post.readTime);

    var cover = document.querySelector('[data-post-cover]');
    cover.src = post.cover;

    renderBody(post);
    renderTags(post);
    setupShare(post);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var slug = new URLSearchParams(global.location.search).get('slug') || '';

    fetch('data/blog-posts.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (posts) {
        var post = posts.find(function (item) { return item.slug === slug; });
        if (!post) {
          showNotFound();
          return;
        }
        showPost(post);
      })
      .catch(function () {
        showNotFound();
      });
  });
})(window);
