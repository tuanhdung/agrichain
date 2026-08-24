/* ==========================================================================
   AgriChain — Sổ cái băm nối chuỗi (hash chain)
   Chạy hoàn toàn trong trình duyệt bằng Web Crypto API, không cần thư viện.

   LƯU Ý: crypto.subtle chỉ hoạt động trong "secure context" — tức là
   https:// hoặc http://localhost. Mở file bằng file:// (double-click) sẽ
   KHÔNG chạy được. Luôn mở qua Live Server.
   ========================================================================== */

(function (global) {
  'use strict';

  // Hash của "khối 0" — không có khối nào trước nó.
  var GENESIS_HASH = new Array(65).join('0'); // 64 số 0

  /* --- Chuỗi hoá tất định (canonical JSON) ---------------------------------
     JSON.stringify không đảm bảo thứ tự khoá giống nhau giữa các lần chạy,
     mà hash thì đổi 1 ký tự là đổi hoàn toàn. Nên phải tự sắp xếp khoá để
     cùng một dữ liệu luôn cho ra cùng một chuỗi, rồi mới đem đi băm. */
  function canonical(value) {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return '[' + value.map(canonical).join(',') + ']';
    }
    var keys = Object.keys(value).sort();
    return '{' + keys.map(function (key) {
      return JSON.stringify(key) + ':' + canonical(value[key]);
    }).join(',') + '}';
  }

  function bufferToHex(buffer) {
    var bytes = new Uint8Array(buffer);
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
      var part = bytes[i].toString(16);
      out += part.length === 1 ? '0' + part : part;
    }
    return out;
  }

  function sha256(text) {
    if (!global.crypto || !global.crypto.subtle) {
      return Promise.reject(new Error(
        'Web Crypto không khả dụng. Hãy mở trang qua Live Server ' +
        '(http://localhost:...), không mở trực tiếp bằng file://'
      ));
    }
    var data = new TextEncoder().encode(text);
    return global.crypto.subtle.digest('SHA-256', data).then(bufferToHex);
  }

  /* --- Băm một khối --------------------------------------------------------
     Chỉ băm 4 trường cố định. KHÔNG băm chính trường `hash` (bất khả thi)
     và không băm thêm gì khác, để hàm kiểm tra sau này tính lại được y hệt. */
  function hashBlock(block) {
    return sha256(canonical({
      index: block.index,
      timestamp: block.timestamp,
      prevHash: block.prevHash,
      payload: block.payload
    }));
  }

  /* --- Thêm khối mới vào cuối chuỗi ----------------------------------------
     Trả về Promise chứa khối đã có hash. Không tự ghi vào localStorage —
     việc lưu do store.js đảm nhiệm, giữ hai lớp tách bạch. */
  function append(chain, payload) {
    var prev = chain.length ? chain[chain.length - 1] : null;
    var block = {
      index: prev ? prev.index + 1 : 0,
      timestamp: new Date().toISOString(),
      prevHash: prev ? prev.hash : GENESIS_HASH,
      payload: payload
    };
    return hashBlock(block).then(function (hash) {
      block.hash = hash;
      return block;
    });
  }

  /* --- Kiểm tra tính toàn vẹn của cả chuỗi ---------------------------------
     Đi từ khối đầu, mỗi bước kiểm 2 điều:
       1. prevHash có khớp hash của khối liền trước không (mắt xích còn nối);
       2. băm lại nội dung có ra đúng hash đã lưu không (nội dung chưa bị sửa).
     Trả về { valid: true } hoặc { valid: false, index, reason }.
     reason: 'prev-hash' = đứt mắt xích, 'hash' = nội dung bị sửa. */
  function verify(chain) {
    var expectedPrev = GENESIS_HASH;
    var i = 0;

    function step() {
      if (i >= chain.length) {
        return Promise.resolve({ valid: true });
      }
      var block = chain[i];

      if (block.prevHash !== expectedPrev) {
        return Promise.resolve({
          valid: false,
          index: block.index,
          reason: 'prev-hash'
        });
      }

      return hashBlock(block).then(function (hash) {
        if (hash !== block.hash) {
          return { valid: false, index: block.index, reason: 'hash' };
        }
        expectedPrev = block.hash;
        i++;
        return step();
      });
    }

    return step();
  }

  /* --- Rút gọn hash để hiển thị: 9f3a1c…4b7e ------------------------------ */
  function shorten(hash, size) {
    var n = size || 6;
    if (!hash || hash.length <= n * 2) return hash || '';
    return hash.slice(0, n) + '…' + hash.slice(-4);
  }

  global.AgriChain = global.AgriChain || {};
  global.AgriChain.chain = {
    GENESIS_HASH: GENESIS_HASH,
    sha256: sha256,
    canonical: canonical,
    hashBlock: hashBlock,
    append: append,
    verify: verify,
    shorten: shorten
  };
})(window);