import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

import kingJadesLogo from "../assets/auth/kingjades-logo-full.svg";
import loginVisual from "../assets/auth/model-wearing.png";

import "../styles/LoginPage.css";

const REMEMBER_ACCOUNT_KEY = "king_jades_remembered_account";

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2.8 12s3.2-5.4 9.2-5.4S21.2 12 21.2 12 18 17.4 12 17.4 2.8 12 2.8 12Z" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m3 3 18 18" />
    <path d="M10.3 6.8A9.8 9.8 0 0 1 12 6.6c6 0 9.2 5.4 9.2 5.4a16 16 0 0 1-2.4 3.1" />
    <path d="M6.2 6.2C4 7.6 2.8 12 2.8 12s3.2 5.4 9.2 5.4a9.7 9.7 0 0 0 3.1-.5" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m14 7 5 5-5 5" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3 5.5 5.6v5.8c0 4.1 2.7 7.7 6.5 9.6 3.8-1.9 6.5-5.5 6.5-9.6V5.6L12 3Z" />
    <path d="m9.3 12 1.8 1.8 3.9-4" />
  </svg>
);

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberAccount, setRememberAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const rememberedAccount = window.localStorage.getItem(
        REMEMBER_ACCOUNT_KEY
      );

      if (rememberedAccount) {
        setUsernameOrEmail(rememberedAccount);
        setRememberAccount(true);
      }
    } catch {
      // Không chặn đăng nhập nếu trình duyệt không cho dùng localStorage.
    }
  }, []);

  const validateForm = () => {
    if (!usernameOrEmail.trim()) {
      return "Vui lòng nhập tài khoản hoặc email.";
    }

    if (!password) {
      return "Vui lòng nhập mật khẩu.";
    }

    return "";
  };

  const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const user = await login(
        usernameOrEmail.trim(),
        password
      );

      try {
        if (rememberAccount) {
          window.localStorage.setItem(
            REMEMBER_ACCOUNT_KEY,
            usernameOrEmail.trim()
          );
        } else {
          window.localStorage.removeItem(
            REMEMBER_ACCOUNT_KEY
          );
        }
      } catch {
        // Đăng nhập vẫn tiếp tục nếu localStorage không hoạt động.
      }

     const normalizedRole = (user.roleName || "")
  .trim()
  .toLowerCase();

      if (normalizedRole === "admin") {
        navigate("/admin-dashboard", {
          replace: true,
        });
        return;
      }

      if (normalizedRole === "staff") {
        navigate("/staff", {
          replace: true,
        });
        return;
      }

      navigate("/user", {
        replace: true,
      });
    } catch (loginError: any) {
      setError(
        loginError?.response?.data?.message ||
          loginError?.message ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kj-login-page">
      <div
        className="kj-login-page__glow kj-login-page__glow--left"
        aria-hidden="true"
      />
      <div
        className="kj-login-page__glow kj-login-page__glow--right"
        aria-hidden="true"
      />

      <div className="kj-login-shell">
        <section className="kj-login-visual">
          <img
            className="kj-login-visual__image"
            src={loginVisual}
            alt="King Jades"
          />

          <div
            className="kj-login-visual__shade"
            aria-hidden="true"
          />

          <Link
            to="/"
            className="kj-login-brand"
            aria-label="Về trang chủ King Jades"
          >
            <img
              src={kingJadesLogo}
              alt="King Jades"
            />
          </Link>

          <div className="kj-login-visual__copy">
            <span className="kj-login-eyebrow">
              ĐẶC QUYỀN KING JADES
            </span>

            <h1>
              Giá trị được lưu giữ bằng sự tin cậy.
            </h1>

          
            <div className="kj-login-visual__trust">
              <span>
                <ShieldIcon />
              </span>

              <div>
                <strong>Không gian truy cập bảo mật</strong>
                <small>
                  Thông tin đăng nhập được gửi qua hệ
                  thống xác thực của King Jades.
                </small>
              </div>
            </div>
          </div>

          <span className="kj-login-visual__caption">
            Vẻ đẹp tự nhiên · Tư vấn tận tâm · Giá trị bền vững
          </span>
        </section>

        <section className="kj-login-card">
          <Link
            to="/"
            className="kj-login-card__mobile-brand"
            aria-label="Về trang chủ King Jades"
          >
            <img
              src={kingJadesLogo}
              alt="King Jades"
            />
          </Link>

          <div className="kj-login-card__heading">
            <span className="kj-login-eyebrow">
              Chào Mừng Bạn Đến Với King Jades
            </span>

            <h2>Đăng nhập tài khoản</h2>

            <p>
              Nhập tên đăng nhập hoặc email để tiếp tục.
            </p>
          </div>

          {error && (
            <div
              className="kj-login-alert"
              role="alert"
            >
              {error}
            </div>
          )}

          <form
            className="kj-login-form"
            onSubmit={handleLogin}
            noValidate
          >
            <label className="kj-login-field">
              <span>Tài khoản hoặc email</span>

              <input
                value={usernameOrEmail}
                onChange={(event) =>
                  setUsernameOrEmail(
                    event.target.value
                  )
                }
                placeholder="Nhập username hoặc email"
                autoComplete="username"
                autoFocus
              />
            </label>

            <label className="kj-login-field">
              <span>Mật khẩu</span>

              <div className="kj-login-password">
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (previous) => !previous
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Ẩn mật khẩu"
                      : "Hiện mật khẩu"
                  }
                  title={
                    showPassword
                      ? "Ẩn mật khẩu"
                      : "Hiện mật khẩu"
                  }
                >
                  {showPassword ? (
                    <EyeOffIcon />
                  ) : (
                    <EyeIcon />
                  )}
                </button>
              </div>
            </label>

            <div className="kj-login-options">
              <label className="kj-login-remember">
                <input
                  type="checkbox"
                  checked={rememberAccount}
                  onChange={(event) =>
                    setRememberAccount(
                      event.target.checked
                    )
                  }
                />
                <span>Ghi nhớ tài khoản</span>
              </label>

              <Link to="/contact">
                Cần hỗ trợ?
              </Link>
            </div>

            <button
              type="submit"
              className="kj-login-submit"
              disabled={loading}
            >
              {loading
                ? "Đang đăng nhập..."
                : "Đăng nhập"}

              {!loading && <ArrowIcon />}
            </button>
          </form>

          <div className="kj-login-register">
            <span>Chưa có tài khoản?</span>
            <Link to="/register">
              Đăng ký tài khoản khách hàng
            </Link>
          </div>

        
          
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
