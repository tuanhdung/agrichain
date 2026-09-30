/* ==========================================================================
   AgriChain — Trang Blog công khai (blog.html)
   Nạp danh sách bài viết từ data/blog-posts.json (giống cơ chế fetch()
   data/provinces.json ở nong-trai.js) rồi dựng từng .post-card. Trang KHÔNG
   cần đăng nhập nên không nạp js/app-shell.js/js/store.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var gridNode = document.querySelector('[data-post-grid]');

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function postCard(post, index) {
    var detailUrl = 'blog-chi-tiet.html?slug=' + encodeURIComponent(post.slug);

    // Cả thẻ là 1 liên kết (<a>, không phải <article>) — bấm vào bất kỳ đâu
    // trong thẻ đều mở bài viết, không chỉ riêng chữ "Đọc tiếp"/tiêu đề.
    var article = el('a', 'post-card');
    article.href = detailUrl;
    // Hiện dần khi cuộn tới, so le theo vị trí trong lưới (xem
    // js/scroll-reveal.js) — chặn ở 3 mức trễ (0/100/200ms) bằng modulo,
    // không tăng vô hạn theo số bài viết (nếu danh sách dài ra sau này, các
    // hàng dưới không phải chờ hàng trên "chạy" xong theo kiểu domino).
    article.setAttribute('data-reveal', '');
    article.style.setProperty('--reveal-delay', (index % 3) * 100 + 'ms');

    var media = el('div', 'post-card__media');
    var cover = el('img', 'post-card__cover');
    cover.src = post.cover;
    cover.alt = '';
    cover.loading = 'lazy';
    var category = el('span', 'badge badge--solid post-card__category', post.category);
    media.appendChild(cover);
    media.appendChild(category);

    var body = el('div', 'post-card__body');
    var meta = el('div', 'post-card__meta');

    var dateItem = el('span', 'post-card__meta-item');
    dateItem.innerHTML = '<svg class="icon icon--sm"><use href="icons/sprite.svg#icon-calendar"></use></svg>';
    var time = el('time', null, post.date);
    time.dateTime = post.date;
    dateItem.appendChild(time);

    var readItem = el('span', 'post-card__meta-item');
    readItem.innerHTML = '<svg class="icon icon--sm"><use href="icons/sprite.svg#icon-clock"></use></svg>';
    readItem.appendChild(el('span', null, post.readTime));

    meta.appendChild(dateItem);
    meta.appendChild(readItem);

    var title = el('h3', 'post-card__title', post.title);

    var excerpt = el('p', 'post-card__excerpt', post.excerpt);

    body.appendChild(meta);
    body.appendChild(title);
    body.appendChild(excerpt);

    var footer = el('div', 'post-card__footer');
    var author = el('span', 'post-card__author');
    author.innerHTML = '<svg class="icon icon--sm"><use href="icons/sprite.svg#icon-user"></use></svg>';
    author.appendChild(el('span', null, post.author));

    var readMore = el('span', 'post-card__link');
    readMore.appendChild(el('span', null, 'Đọc tiếp'));
    readMore.insertAdjacentHTML('beforeend', '<svg class="icon icon--sm"><use href="icons/sprite.svg#icon-arrow-right"></use></svg>');

    footer.appendChild(author);
    footer.appendChild(readMore);

    article.appendChild(media);
    article.appendChild(body);
    article.appendChild(footer);

    return article;
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!gridNode) return;

    fetch('data/blog-posts.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (posts) {
        gridNode.textContent = '';
        posts.forEach(function (post, index) {
          gridNode.appendChild(postCard(post, index));
        });
        // Thẻ [data-reveal] vừa được thêm vào SAU thời điểm DOMContentLoaded
        // (phải chờ fetch() xong) — lần quan sát tự động lúc tải trang của
        // js/scroll-reveal.js không thấy được chúng, phải tự gọi lại đúng
        // trong phạm vi lưới vừa dựng.
        if (global.AgriChain && global.AgriChain.initScrollReveal) {
          global.AgriChain.initScrollReveal(gridNode);
        }
      })
      .catch(function () {
        gridNode.textContent = 'Không tải được danh sách bài viết.';
      });
  });
})(window);
