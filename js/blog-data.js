/* ==========================================================================
   AgriChain — Nguồn dữ liệu CHUNG của trang Blog (blog.html + blog-chi-tiet.html).

   Gộp 2 nguồn thành cùng 1 khuôn bài viết {slug, category, date, readTime, title,
   author, excerpt, cover, tags[], body[]}:
   - data/blog-posts.json: các bài tĩnh có sẵn (chép từ bài thật trên agrichain.com.vn/blog);
   - GET /articles (agrichain-api): bài viết quản trị hệ thống soạn ở khu quản trị, CHỈ bài đã
     xuất bản. Bài từ máy chủ đứng TRƯỚC (mới hơn).

   API lỗi/chưa chạy thì Blog vẫn hiện bài tĩnh — nguồn máy chủ chỉ là phần THÊM VÀO.
   Cần nạp sau js/api-config.js và js/api.js. Cả 2 trang Blog dùng chung file này để không lệch
   cách dựng bài (xem js/blog.js, js/blog-chi-tiet.js).
   ========================================================================== */

(function (global) {
  'use strict';

  var AgriChain = (global.AgriChain = global.AgriChain || {});

  function fetchStaticPosts() {
    return fetch('data/blog-posts.json').then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  function hasArticlesApi() {
    return !!(AgriChain.api && AgriChain.api.articles);
  }

  /* Nội dung bài viết là văn bản thuần: đoạn cách nhau 1 dòng trống;
     "## " đầu đoạn = tiêu đề phụ; mọi dòng "- " = danh sách gạch đầu dòng. */
  function contentToBlocks(content) {
    return String(content || '')
      .split(/\n\s*\n/)
      .map(function (chunk) { return chunk.trim(); })
      .filter(Boolean)
      .map(function (chunk) {
        var lines = chunk.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        if (/^##\s+/.test(lines[0]) && lines.length === 1) {
          return { type: 'heading', text: lines[0].replace(/^##\s+/, '') };
        }
        if (lines.every(function (l) { return /^-\s+/.test(l); })) {
          return {
            type: 'list',
            items: lines.map(function (l) { return { text: l.replace(/^-\s+/, '') }; })
          };
        }
        return { type: 'paragraph', text: lines.join(' ') };
      });
  }

  function readTimeOf(text) {
    var words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200)) + ' phút';
  }

  function articleToPost(article) {
    var content = article.content || '';
    var summary = article.summary || content.replace(/\s+/g, ' ').slice(0, 160);
    return {
      slug: article.slug,
      category: article.category_name || 'Cẩm nang',
      date: String(article.published_at || article.created_at || '').slice(0, 10),
      readTime: readTimeOf(content || summary),
      title: article.title,
      author: article.author || 'Ban biên tập AgriChain',
      excerpt: summary,
      cover: article.cover_url || '',
      tags: (article.tags || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean),
      body: contentToBlocks(content)
    };
  }

  /* Danh sách cho blog.html: bài từ máy chủ trước, rồi bài tĩnh. Danh sách API không có `content`
     nên readTime ước lượng theo phần tóm tắt. */
  AgriChain.loadBlogPosts = function () {
    var apiPosts = hasArticlesApi()
      ? AgriChain.api.articles.list({ page_size: 100 }).then(
          function (page) { return (page.items || []).map(articleToPost); },
          function () { return []; }
        )
      : Promise.resolve([]);
    return Promise.all([apiPosts, fetchStaticPosts()]).then(function (results) {
      var fromApi = results[0], fromStatic = results[1];
      var seen = {};
      fromApi.forEach(function (p) { seen[p.slug] = true; });
      return fromApi.concat(fromStatic.filter(function (p) { return !seen[p.slug]; }));
    });
  };

  /* Chi tiết cho blog-chi-tiet.html: tìm bài tĩnh trước (không tốn request), không có thì hỏi máy chủ. */
  AgriChain.loadBlogPost = function (slug) {
    return fetchStaticPosts()
      .catch(function () { return []; })
      .then(function (posts) {
        var found = posts.find(function (p) { return p.slug === slug; });
        if (found) return found;
        if (!hasArticlesApi() || !slug) return null;
        return AgriChain.api.articles.getBySlug(slug).then(articleToPost, function () { return null; });
      });
  };

  AgriChain.contentToBlocks = contentToBlocks;
})(window);
