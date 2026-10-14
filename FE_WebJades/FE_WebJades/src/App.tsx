import React from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";

import ProtectedRoute from "./routes/ProtectedRoute";
import CartDrawer from "./components/CartDrawer";
import FloatingContactCTA from "./components/FloatingContactCTA";

/* ================= PUBLIC PAGES ================= */

import HomePage from "./pages/HomePage";
import ProductPage from "./pages/ProductPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import ContactPage from "./pages/ContactPage";
import CartPage from "./pages/CartPage";
import StoryPage from "./pages/StoryPage";
import DestinyPage from "./pages/DestinyPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RegisterSuccessPage from "./pages/RegisterSuccessPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";

import NewsPage from "./pages/NewsPage";
import NewsDetailPage from "./pages/NewsDetailPage";

/* ================= ADMIN PAGES ================= */
import AdminProductCategoriesPage from "./pages/AdminProductCategoriesPage";

import AdminDashboard from "./pages/AdminDashboard";
import AdminContactLeadsPage from "./pages/AdminContactLeadsPage";
import AccountPage from "./pages/AccountPage";

/* ================= STAFF PAGES ================= */

import StaffDashboard from "./pages/StaffDashboard";

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          {/* Giỏ hàng hiển thị toàn website */}
          <CartDrawer />

          {/* CTA Zalo / Facebook / Điện thoại hiển thị toàn website */}
          <FloatingContactCTA />

          <Routes>
            {/* ==================================================
                PUBLIC ROUTES
            ================================================== */}

            <Route
              path="/"
              element={<HomePage />}
            />
            <Route
  path="/cau-chuyen-thuong-hieu"
  element={<StoryPage />}
/>
            <Route
              path="/products"
              element={<ProductPage />}
            />

            <Route
              path="/products/:slug"
              element={<ProductDetailPage />}
            />

            <Route
              path="/xem-menh"
              element={<DestinyPage />}
            />

            <Route
              path="/contact"
              element={<ContactPage />}
            />

            <Route
              path="/cart"
              element={<CartPage />}
            />

            {/* ================= AUTH ================= */}

            <Route
              path="/login"
              element={<LoginPage />}
            />

            <Route
              path="/register"
              element={<RegisterPage />}
            />

            {/* 
              Trang thông báo sau khi đăng ký.

              Có thể sử dụng khi muốn:
              RegisterPage
                  ↓
              /register-success
                  ↓
              Người dùng kiểm tra email
            */}
            <Route
              path="/register-success"
              element={<RegisterSuccessPage />}
            />

            {/*
              Backend redirect về:

              /verify-email?status=success
              /verify-email?status=expired
              /verify-email?status=invalid
              /verify-email?status=error
            */}
            <Route
              path="/verify-email"
              element={<VerifyEmailPage />}
            />

            {/* ================= NEWS ================= */}

            <Route
              path="/news"
              element={<NewsPage />}
            />

            <Route
              path="/news/:slug"
              element={<NewsDetailPage />}
            />

            {/* ==================================================
                ADMIN ROUTES
            ================================================== */}

            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Quản lý tài khoản */}
            <Route
              path="/admin/accounts"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/product-categories"
              element={
                <AdminProductCategoriesPage />
              }
            />
            {/*
              Route cũ.

              Nếu sidebar hoặc code cũ còn gọi:
              /admin/accounts/create

              thì tự động chuyển về trang quản lý account.
            */}
            <Route
              path="/admin/accounts/create"
              element={
                <Navigate
                  to="/admin/accounts"
                  replace
                />
              }
            />

            {/* Quản lý khách hàng liên hệ */}
            <Route
              path="/admin/contact-leads"
              element={
                <ProtectedRoute
                  roles={["admin", "staff"]}
                >
                  <AdminContactLeadsPage />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                STAFF ROUTES
            ================================================== */}

            <Route
              path="/staff"
              element={
                <ProtectedRoute
                  roles={["admin", "staff"]}
                >
                  <StaffDashboard />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                USER ROUTES
            ================================================== */}

            {/*
              Customer không sử dụng dashboard riêng.

              Sau khi đăng nhập nếu hệ thống điều hướng tới /user
              thì chuyển về trang chủ.

              Tuy nhiên vẫn kiểm tra quyền để người chưa đăng nhập
              không thể truy cập route này trực tiếp.
            */}
            <Route
              path="/user"
              element={
                <ProtectedRoute
                  roles={[
                    "admin",
                    "staff",
                    "user",
                  ]}
                >
                  <Navigate
                    to="/"
                    replace
                  />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                SYSTEM ROUTES
            ================================================== */}

            <Route
              path="/unauthorized"
              element={
                <div className="kj-unauthorized-page">
                  <h1>
                    Không có quyền truy cập
                  </h1>

                  <p>
                    Tài khoản của bạn không
                    được phép vào trang này.
                  </p>
                </div>
              }
            />

            {/* 
              URL không tồn tại
              → đưa người dùng về trang chủ
            */}
            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;