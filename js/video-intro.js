/* ==========================================================================
   AgriChain — Facade video giới thiệu ở Hero (index.html)
   Không nhúng <iframe> YouTube ngay từ đầu (facade pattern): iframe YouTube
   tải sẵn JS nặng ngay cả khi chưa bấm play, làm chậm trang chủ — đây là
   trang đầu tiên khách vào, cần tải nhanh. Ban đầu chỉ hiện ảnh thumbnail +
   nút play; bấm vào mới thay nội dung bằng <iframe> thật, dùng domain
   youtube-nocookie.com để giảm cookie/tracking khi chưa cần thiết.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  var frame = document.querySelector('[data-video-frame]');
  var facade = document.querySelector('[data-video-facade]');
  if (!frame || !facade) return;

  // TODO: thay bằng ID video giới thiệu chính thức khi có
  var VIDEO_ID = '5dK7Ek3KkU8';

  function playVideo() {
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + VIDEO_ID + '?autoplay=1';
    iframe.title = 'Video giới thiệu AgriChain';
    iframe.allow = 'autoplay; encrypted-media';
    iframe.allowFullscreen = true;

    frame.textContent = '';
    frame.appendChild(iframe);
  }

  facade.addEventListener('click', playVideo);
});
