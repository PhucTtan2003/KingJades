import React from "react";
import { Link, useLocation } from "react-router-dom";

type RegisterSuccessState = {
  email?: string;
  message?: string;
};

const RegisterSuccessPage = () => {
  const location = useLocation();

  const state =
    location.state as RegisterSuccessState | null;

  const email = state?.email ?? "";

  const message =
    state?.message ??
    "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.";

  return (
    <main className="register-success-page">
      <section className="register-success-card">
        <div className="register-success-icon">
          ✓
        </div>

        <h1>Đăng ký thành công</h1>

        <p>{message}</p>

        {email && (
          <p>
            Email xác thực đã được gửi đến:
            <br />
            <strong>{email}</strong>
          </p>
        )}

        <p>
          Vui lòng kiểm tra cả thư mục Spam hoặc
          Thư rác nếu chưa thấy email.
        </p>

        <Link
          to="/login"
          className="register-success-button"
        >
          Đi đến đăng nhập
        </Link>
      </section>
    </main>
  );
};

export default RegisterSuccessPage;