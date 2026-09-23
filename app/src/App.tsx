import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppShell } from './layout/AppShell';
import { VatTuPage } from './pages/vat-tu/VatTuPage';
import { MauQuyTrinhPage } from './pages/mau-quy-trinh/MauQuyTrinhPage';
import { NongTraiPage } from './pages/nong-trai/NongTraiPage';
import { NongTraiChiTietPage } from './pages/nong-trai-chi-tiet/NongTraiChiTietPage';
import { TaiKhoanPage } from './pages/tai-khoan/TaiKhoanPage';
import { LoHangPage } from './pages/lo-hang/LoHangPage';
import { HoSoPage } from './pages/ho-so/HoSoPage';
import { GoiPhanMemPage } from './pages/goi-phan-mem/GoiPhanMemPage';
import { LichSuMuaGoiPage } from './pages/lich-su-mua-goi/LichSuMuaGoiPage';
import { LoginPage } from './pages/Login/LoginPage';

// /login là route CÔNG KHAI DUY NHẤT — không bọc <ProtectedRoute>, xem
// src/pages/Login/LoginPage.tsx. Mọi route còn lại thêm route mới thì thêm 1
// <Route> ở đây, bọc đúng <ProtectedRoute><AppShell>...</AppShell></ProtectedRoute>,
// và nhớ thêm vào KNOWN_ROUTES (src/routes/postLogin.ts) — xem app/CLAUDE.md
// mục "Thêm 1 trang mới".
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/nong-trai"
        element={
          <ProtectedRoute>
            <AppShell>
              <NongTraiPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/nong-trai-chi-tiet"
        element={
          <ProtectedRoute>
            <AppShell>
              <NongTraiChiTietPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vat-tu"
        element={
          <ProtectedRoute>
            <AppShell>
              <VatTuPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mau-quy-trinh"
        element={
          <ProtectedRoute>
            <AppShell>
              <MauQuyTrinhPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tai-khoan"
        element={
          <ProtectedRoute>
            <AppShell>
              <TaiKhoanPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lo-hang"
        element={
          <ProtectedRoute>
            <AppShell>
              <LoHangPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ho-so"
        element={
          <ProtectedRoute>
            <AppShell>
              <HoSoPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/goi-phan-mem"
        element={
          <ProtectedRoute>
            <AppShell>
              <GoiPhanMemPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lich-su-mua-goi"
        element={
          <ProtectedRoute>
            <AppShell>
              <LichSuMuaGoiPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/nong-trai" replace />} />
      <Route path="*" element={<Navigate to="/nong-trai" replace />} />
    </Routes>
  );
}
