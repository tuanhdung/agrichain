// Nạp ĐÚNG 4 file CSS gốc của dự án, ĐÚNG thứ tự tokens -> base -> components
// -> app-shell (xem CLAUDE.md gốc, mục "Khi thêm trang mới") — KHÔNG copy nội
// dung, import thẳng từ css/ ở gốc repo qua đường dẫn tương đối. Vite gộp cả
// 4 file vào 1 bundle CSS của app, không có url()/@import nào bên trong nên
// không phát sinh vấn đề path khi bundle (đã kiểm tra trước khi scaffold).
import '../../css/tokens.css';
import '../../css/base.css';
import '../../css/components.css';
import '../../css/app-shell.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';

const rootNode = document.getElementById('root');
if (!rootNode) {
  throw new Error('#root không tồn tại trong app/index.html');
}

ReactDOM.createRoot(rootNode).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
