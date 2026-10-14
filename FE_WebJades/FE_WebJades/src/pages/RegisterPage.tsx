import React, {
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import apiClient from "../api/apiClient";

import kingJadesLogo from "../assets/auth/kingjades-logo-full.svg";
import registerVisual from "../assets/auth/model-wearing.png";

import "../styles/RegisterPage.css";

/* =====================================================
   TYPES
===================================================== */

type RegisterFormState = {
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

type RoleName =
  | "admin"
  | "staff"
  | "user";

type VerifyCodeResponse = {
  message?: string;

  token?: string;
  expiresAt?: string;

  accountId?: string;
  username?: string;
  email?: string;

  roleId?: number;
  roleName?: RoleName;

  isEmailVerified?: boolean;
};

/* =====================================================
   CONSTANTS
===================================================== */

const OTP_LENGTH =
  6;

/* =====================================================
   INITIAL FORM
===================================================== */

const initialForm: RegisterFormState = {
  username: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

/* =====================================================
   ICONS
===================================================== */

const EyeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M2.8 12s3.2-5.4 9.2-5.4S21.2 12 21.2 12 18 17.4 12 17.4 2.8 12 2.8 12Z" />

    <circle
      cx="12"
      cy="12"
      r="2.6"
    />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="m3 3 18 18" />

    <path d="M10.3 6.8A9.8 9.8 0 0 1 12 6.6c6 0 9.2 5.4 9.2 5.4a16 16 0 0 1-2.4 3.1" />

    <path d="M6.2 6.2C4 7.6 2.8 12 2.8 12s3.2 5.4 9.2 5.4a9.7 9.7 0 0 0 3.1-.5" />

    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);

const ArrowIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m14 7 5 5-5 5" />
  </svg>
);

const ShieldIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M12 3 5.5 5.6v5.8c0 4.1 2.7 7.7 6.5 9.6 3.8-1.9 6.5-5.5 6.5-9.6V5.6L12 3Z" />

    <path d="m9.3 12 1.8 1.8 3.9-4" />
  </svg>
);

const MailIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <rect
      x="3.5"
      y="5.5"
      width="17"
      height="13"
      rx="2"
    />

    <path d="m5 7 7 5 7-5" />
  </svg>
);

/* =====================================================
   REGISTER PAGE
===================================================== */

const RegisterPage: React.FC = () => {
  /* ===================================================
     REGISTER FORM
  =================================================== */

  const [
    form,
    setForm,
  ] =
    useState<RegisterFormState>(
      initialForm
    );

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(false);

  /* ===================================================
     PAGE STATE
  =================================================== */

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  /* ===================================================
     OTP STATE
  =================================================== */

  const [
    verificationMode,
    setVerificationMode,
  ] =
    useState(false);

  const [
    pendingAccountId,
    setPendingAccountId,
  ] =
    useState("");

  const [
    pendingEmail,
    setPendingEmail,
  ] =
    useState("");

  const [
    verificationDigits,
    setVerificationDigits,
  ] =
    useState<string[]>(
      Array(
        OTP_LENGTH
      ).fill("")
    );

  const otpInputRefs =
    useRef<
      Array<
        HTMLInputElement | null
      >
    >([]);

  /* =====================================================
     PASSWORD STRENGTH
  ===================================================== */

  const passwordStrength =
    useMemo(() => {
      const password =
        form.password;

      if (!password) {
        return {
          score: 0,
          label:
            "Chưa nhập mật khẩu",
        };
      }

      let score = 0;

      if (
        password.length >= 8
      ) {
        score += 1;
      }

      if (
        /[a-z]/.test(password) &&
        /[A-Z]/.test(password)
      ) {
        score += 1;
      }

      if (
        /\d/.test(password)
      ) {
        score += 1;
      }

      if (
        /[^A-Za-z0-9]/.test(
          password
        )
      ) {
        score += 1;
      }

      if (score <= 1) {
        return {
          score: 1,
          label:
            "Mức cơ bản",
        };
      }

      if (score <= 3) {
        return {
          score: 2,
          label:
            "Mức khá",
        };
      }

      return {
        score: 3,
        label:
          "Mức mạnh",
      };
    }, [form.password]);

  /* =====================================================
     REGISTER INPUT CHANGE
  ===================================================== */

  const handleChange = (
    event:
      React.ChangeEvent<HTMLInputElement>
  ) => {
    const {
      name,
      value,
    } =
      event.target;

    setForm(
      previous => ({
        ...previous,
        [name]:
          value,
      })
    );

    if (error) {
      setError("");
    }
  };

  /* =====================================================
     VALIDATE REGISTER
  ===================================================== */

  const validateForm =
    () => {
      const username =
        form.username.trim();

      const email =
        form.email.trim();

      const phone =
        form.phone.trim();

      if (!username) {
        return "Vui lòng nhập tên đăng nhập.";
      }

      if (
        username.length <
          4 ||
        username.length >
          50
      ) {
        return "Tên đăng nhập phải từ 4 đến 50 ký tự.";
      }

      if (
        /\s/.test(
          username
        )
      ) {
        return "Tên đăng nhập không được chứa khoảng trắng.";
      }

      if (!email) {
        return "Vui lòng nhập email.";
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        return "Email chưa đúng định dạng.";
      }

      if (!phone) {
        return "Vui lòng nhập số điện thoại.";
      }

      if (
        !/^0\d{9}$/.test(
          phone
        )
      ) {
        return "Số điện thoại phải gồm 10 số và bắt đầu bằng 0.";
      }

      if (
        !form.password
      ) {
        return "Vui lòng nhập mật khẩu.";
      }

      if (
        form.password
          .length < 6
      ) {
        return "Mật khẩu phải có ít nhất 6 ký tự.";
      }

      if (
        !form
          .confirmPassword
      ) {
        return "Vui lòng xác nhận mật khẩu.";
      }

      if (
        form.password !==
        form.confirmPassword
      ) {
        return "Mật khẩu xác nhận không khớp.";
      }

      return "";
    };

  /* =====================================================
     REGISTER
  ===================================================== */

  const handleSubmit =
    async (
      event:
        React.FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      setMessage("");
      setError("");

      const validationMessage =
        validateForm();

      if (
        validationMessage
      ) {
        setError(
          validationMessage
        );

        return;
      }

      setLoading(true);

      try {
        const payload = {
          username:
            form.username
              .trim(),

          email:
            form.email
              .trim()
              .toLowerCase(),

          phone:
            form.phone
              .trim(),

          password:
            form.password,
        };

        console.log(
          "[REGISTER] Sending:",
          {
            username:
              payload.username,

            email:
              payload.email,

            phone:
              payload.phone,
          }
        );

        /* ===========================================
           REGISTER API
        =========================================== */

        const response =
          await apiClient.post(
            "/api/auth/register",
            payload
          );

        console.log(
          "[REGISTER] Response:",
          response.data
        );

        /* ===========================================
           ACCOUNT ID
        =========================================== */

        const accountId =
          response.data
            ?.accountId;

        if (!accountId) {
          setError(
            "Đăng ký thành công nhưng hệ thống không trả về mã tài khoản."
          );

          return;
        }

        /* ===========================================
           CHUYỂN SANG OTP MODE
        =========================================== */

        setPendingAccountId(
          String(
            accountId
          )
        );

        setPendingEmail(
          payload.email
        );

        setVerificationDigits(
          Array(
            OTP_LENGTH
          ).fill("")
        );

        setMessage(
          response.data
            ?.message ||
            "Đăng ký thành công. Mã xác thực đã được gửi đến email của bạn."
        );

        setVerificationMode(
          true
        );

        setShowPassword(
          false
        );

        setShowConfirmPassword(
          false
        );

        /*
         * Focus ô OTP đầu tiên.
         */
        window.setTimeout(
          () => {
            otpInputRefs
              .current[0]
              ?.focus();
          },
          100
        );
      } catch (
        requestError: any
      ) {
        const status =
          requestError
            ?.response
            ?.status;

        const responseData =
          requestError
            ?.response
            ?.data;

        console.error(
          "[REGISTER ERROR]",
          {
            status,
            responseData,
            requestError,
          }
        );

        if (
          status === 409
        ) {
          setError(
            responseData
              ?.message ||
              "Tên đăng nhập, email hoặc số điện thoại đã tồn tại."
          );

          return;
        }

        if (
          status === 400
        ) {
          setError(
            responseData
              ?.message ||
              "Thông tin đăng ký chưa hợp lệ."
          );

          return;
        }

        if (
          status === 500
        ) {
          setError(
            responseData
              ?.message ||
              "Không thể hoàn tất đăng ký hoặc gửi mã xác thực."
          );

          return;
        }

        if (
          requestError
            ?.code ===
            "ERR_NETWORK" ||
          requestError
            ?.message ===
            "Network Error"
        ) {
          setError(
            "Không thể kết nối đến máy chủ. Vui lòng kiểm tra API backend."
          );

          return;
        }

        setError(
          responseData
            ?.message ||
            requestError
              ?.message ||
            "Đăng ký thất bại. Vui lòng thử lại."
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  /* =====================================================
     OTP CHANGE
  ===================================================== */

  const handleOtpChange = (
    index: number,
    value: string
  ) => {
    const cleaned =
      value.replace(
        /\D/g,
        ""
      );

    /*
     * Không cho ký tự ngoài số.
     */
    if (
      value &&
      !cleaned
    ) {
      return;
    }

    const digit =
      cleaned.slice(-1);

    const nextDigits = [
      ...verificationDigits,
    ];

    nextDigits[index] =
      digit;

    setVerificationDigits(
      nextDigits
    );

    if (error) {
      setError("");
    }

    /*
     * Có số thì tự nhảy
     * sang ô tiếp theo.
     */
    if (
      digit &&
      index <
        OTP_LENGTH - 1
    ) {
      otpInputRefs
        .current[
          index + 1
        ]
        ?.focus();
    }
  };

  /* =====================================================
     OTP KEYBOARD
  ===================================================== */

  const handleOtpKeyDown = (
    index: number,
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) => {
    /*
     * Backspace ô trống
     * => quay ô trước.
     */
    if (
      event.key ===
        "Backspace" &&
      !verificationDigits[
        index
      ] &&
      index > 0
    ) {
      otpInputRefs
        .current[
          index - 1
        ]
        ?.focus();

      return;
    }

    if (
      event.key ===
        "ArrowLeft" &&
      index > 0
    ) {
      event.preventDefault();

      otpInputRefs
        .current[
          index - 1
        ]
        ?.focus();

      return;
    }

    if (
      event.key ===
        "ArrowRight" &&
      index <
        OTP_LENGTH - 1
    ) {
      event.preventDefault();

      otpInputRefs
        .current[
          index + 1
        ]
        ?.focus();
    }
  };

  /* =====================================================
     OTP PASTE

     Paste:
     631578

     =>
     [6][3][1][5][7][8]
  ===================================================== */

  const handleOtpPaste = (
    event:
      React.ClipboardEvent<HTMLInputElement>
  ) => {
    event.preventDefault();

    const pasted =
      event.clipboardData
        .getData("text")
        .replace(
          /\D/g,
          ""
        )
        .slice(
          0,
          OTP_LENGTH
        );

    if (!pasted) {
      return;
    }

    const digits =
      Array(
        OTP_LENGTH
      )
        .fill("")
        .map(
          (
            _,
            index
          ) =>
            pasted[index] ||
            ""
        );

    setVerificationDigits(
      digits
    );

    setError("");

    const lastIndex =
      Math.min(
        pasted.length,
        OTP_LENGTH
      ) - 1;

    if (
      lastIndex >= 0
    ) {
      otpInputRefs
        .current[
          lastIndex
        ]
        ?.focus();
    }
  };

  /* =====================================================
     VERIFY OTP
  ===================================================== */

  const handleVerifyCode =
    async (
      event:
        React.FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      setError("");

      const code =
        verificationDigits
          .join("");

      if (
        !pendingAccountId
      ) {
        setError(
          "Không tìm thấy tài khoản đang chờ xác thực."
        );

        return;
      }

      if (
        code.length !==
          OTP_LENGTH ||
        !/^\d{6}$/.test(
          code
        )
      ) {
        setError(
          "Vui lòng nhập đầy đủ 6 số xác thực."
        );

        return;
      }

      setLoading(true);

      try {
        /* ===========================================
           VERIFY API
        =========================================== */

        const response =
          await apiClient.post<VerifyCodeResponse>(
            "/api/auth/verify-email-code",
            {
              accountId:
                pendingAccountId,

              code,
            }
          );

        const data =
          response.data;

        console.log(
          "[VERIFY CODE SUCCESS]",
          data
        );

        /* ===========================================
           VALIDATE RESPONSE
        =========================================== */

        if (
          !data.token ||
          !data.accountId ||
          !data.username ||
          !data.email ||
          data.roleId ===
            undefined ||
          !data.roleName
        ) {
          setError(
            "Xác thực thành công nhưng thông tin đăng nhập trả về chưa đầy đủ."
          );

          return;
        }

        /* ===========================================
           BUILD USER
        =========================================== */

        const loginUser = {
          accountId:
            data.accountId,

          username:
            data.username,

          email:
            data.email,

          roleId:
            data.roleId,

          roleName:
            data.roleName,
        };

        /* ===========================================
           SAVE JWT
        =========================================== */

        localStorage.setItem(
          "token",
          data.token
        );

        /* ===========================================
           SAVE USER
        =========================================== */

        localStorage.setItem(
          "user",
          JSON.stringify(
            loginUser
          )
        );

        /* ===========================================
           SAVE ROLE
        =========================================== */

        localStorage.setItem(
          "roleName",
          data.roleName
        );

        localStorage.setItem(
          "roleId",
          String(
            data.roleId
          )
        );

        /* ===========================================
           HOME + AUTO LOGIN
        =========================================== */

        window.location.replace(
          "/"
        );
      } catch (
        requestError: any
      ) {
        const status =
          requestError
            ?.response
            ?.status;

        const responseData =
          requestError
            ?.response
            ?.data;

        const code =
          responseData
            ?.code;

        console.error(
          "[VERIFY CODE ERROR]",
          {
            status,
            code,
            responseData,
          }
        );

        if (
          code ===
            "VERIFICATION_EXPIRED" ||
          code ===
            "CODE_EXPIRED"
        ) {
          setError(
            responseData
              ?.message ||
              "Mã xác thực đã hết hạn. Vui lòng đăng ký lại để nhận mã mới."
          );

          return;
        }

        if (
          code ===
            "INVALID_CODE" ||
          code ===
            "INVALID_VERIFICATION_CODE"
        ) {
          setError(
            responseData
              ?.message ||
              "Mã xác thực không đúng."
          );

          return;
        }

        if (
          status === 400 ||
          status === 401
        ) {
          setError(
            responseData
              ?.message ||
              "Mã xác thực không đúng hoặc đã hết hạn."
          );

          return;
        }

        if (
          requestError
            ?.code ===
            "ERR_NETWORK" ||
          requestError
            ?.message ===
            "Network Error"
        ) {
          setError(
            "Không thể kết nối đến máy chủ."
          );

          return;
        }

        setError(
          responseData
            ?.message ||
            "Không thể xác thực mã. Vui lòng thử lại."
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  /* =====================================================
     VIEW
  ===================================================== */

  return (
    <div className="kj-register-page">
    
      <div
        className="
          kj-register-page__glow
          kj-register-page__glow--left
        "
        aria-hidden="true"
      />

      <div
        className="
          kj-register-page__glow
          kj-register-page__glow--right
        "
        aria-hidden="true"
      />

      <div className="kj-register-shell">
        {/* =================================================
            LEFT VISUAL
        ================================================= */}

        <section className="kj-register-visual">
          <img
            className="kj-register-visual__image"
            src={
              registerVisual
            }
            alt="King Jades"
          />

          <div
            className="kj-register-visual__shade"
            aria-hidden="true"
          />

          <Link
            to="/"
            className="kj-register-brand"
            aria-label="Về trang chủ King Jades"
          >
            <img
              src={
                kingJadesLogo
              }
              alt="King Jades"
            />
          </Link>

          <div className="kj-register-visual__copy">
            <span className="kj-register-eyebrow">
              {verificationMode
                ? "Email Verification"
                : "Create Your Private Account"}
            </span>

            <h1>
              {verificationMode
                ? "Chỉ còn một bước để hoàn tất tài khoản."
                : "Bắt đầu hành trình chọn ngọc của riêng bạn."}
            </h1>

            <p>
              {verificationMode
                ? "Nhập mã xác thực 6 số được gửi đến email để kích hoạt tài khoản King Jades."
                : "Tạo tài khoản khách hàng để lưu sản phẩm quan tâm, gửi yêu cầu tư vấn và theo dõi thông tin phù hợp với bạn."}
            </p>

            <div className="kj-register-visual__features">
              <article>
                <span>
                  <ShieldIcon />
                </span>

                <div>
                  <strong>
                    Thông tin được bảo mật
                  </strong>

                  <small>
                    Dữ liệu tài khoản được
                    gửi qua hệ thống xác thực
                    của King Jades.
                  </small>
                </div>
              </article>

              <article>
                <span>
                  <MailIcon />
                </span>

                <div>
                  <strong>
                    Xác thực email
                  </strong>

                  <small>
                    Mã xác thực chỉ sử dụng
                    một lần và có hiệu lực
                    trong 10 phút.
                  </small>
                </div>
              </article>
            </div>
          </div>

          <span className="kj-register-visual__caption">
            Natural beauty ·
            Personal guidance ·
            Lasting value
          </span>
        </section>

        {/* =================================================
            RIGHT CARD
        ================================================= */}

        <section className="kj-register-card">
          <Link
            to="/"
            className="kj-register-card__mobile-brand"
            aria-label="Về trang chủ King Jades"
          >
            <img
              src={
                kingJadesLogo
              }
              alt="King Jades"
            />
          </Link>

          {/* =================================================
              REGISTER MODE
          ================================================= */}

          {!verificationMode ? (
            <>
              <div className="kj-register-card__heading">
                <span className="kj-register-eyebrow">
                  Join King Jades
                </span>

                <h2>
                  Tạo tài khoản
                </h2>

                <p>
                  Điền thông tin bên dưới
                  để đăng ký tài khoản
                  khách hàng.
                </p>
              </div>

              {/* ERROR */}

              {error && (
                <div
                  className="
                    kj-register-alert
                    kj-register-alert--error
                  "
                  role="alert"
                >
                  {error}
                </div>
              )}

              {/* REGISTER FORM */}

              <form
                className="kj-register-form"
                onSubmit={
                  handleSubmit
                }
                noValidate
              >
                <div className="kj-register-form__row">
                  <label className="kj-register-field">
                    <span>
                      Tên đăng nhập{" "}
                      <b>*</b>
                    </span>

                    <input
                      name="username"
                      value={
                        form.username
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Ví dụ: client01"
                      autoComplete="username"
                      autoFocus
                      disabled={
                        loading
                      }
                    />
                  </label>

                  <label className="kj-register-field">
                    <span>
                      Số điện thoại{" "}
                      <b>*</b>
                    </span>

                    <input
                      name="phone"
                      type="tel"
                      value={
                        form.phone
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="0900000000"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={10}
                      disabled={
                        loading
                      }
                    />
                  </label>
                </div>

                <label className="kj-register-field">
                  <span>
                    Email <b>*</b>
                  </span>

                  <input
                    name="email"
                    type="email"
                    value={
                      form.email
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="client@gmail.com"
                    autoComplete="email"
                    disabled={
                      loading
                    }
                  />
                </label>

                <label className="kj-register-field">
                  <span>
                    Mật khẩu{" "}
                    <b>*</b>
                  </span>

                  <div className="kj-register-password">
                    <input
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        form.password
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Nhập mật khẩu"
                      autoComplete="new-password"
                      minLength={6}
                      disabled={
                        loading
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          previous =>
                            !previous
                        )
                      }
                      disabled={
                        loading
                      }
                      aria-label={
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

                {/* PASSWORD STRENGTH */}

                <div className="kj-register-strength">
                  <div>
                    <span
                      className={
                        passwordStrength
                          .score >= 1
                          ? "active"
                          : ""
                      }
                    />

                    <span
                      className={
                        passwordStrength
                          .score >= 2
                          ? "active"
                          : ""
                      }
                    />

                    <span
                      className={
                        passwordStrength
                          .score >= 3
                          ? "active"
                          : ""
                      }
                    />
                  </div>

                  <small>
                    {
                      passwordStrength
                        .label
                    }
                  </small>
                </div>

                <label className="kj-register-field">
                  <span>
                    Xác nhận mật khẩu{" "}
                    <b>*</b>
                  </span>

                  <div className="kj-register-password">
                    <input
                      name="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        form.confirmPassword
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Nhập lại mật khẩu"
                      autoComplete="new-password"
                      minLength={6}
                      disabled={
                        loading
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          previous =>
                            !previous
                        )
                      }
                      disabled={
                        loading
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Ẩn mật khẩu xác nhận"
                          : "Hiện mật khẩu xác nhận"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOffIcon />
                      ) : (
                        <EyeIcon />
                      )}
                    </button>
                  </div>
                </label>

                <p className="kj-register-consent">
                  Bằng việc đăng ký,
                  bạn đồng ý cung cấp
                  thông tin để King Jades
                  tạo tài khoản và hỗ trợ
                  chăm sóc khách hàng.
                </p>

                <button
                  type="submit"
                  className="kj-register-submit"
                  disabled={
                    loading
                  }
                >
                  {loading
                    ? "Đang đăng ký..."
                    : "Tạo tài khoản"}

                  {!loading && (
                    <ArrowIcon />
                  )}
                </button>
              </form>

              <div className="kj-register-login-link">
                <span>
                  Đã có tài khoản?
                </span>

                <Link to="/login">
                  Đăng nhập ngay
                </Link>
              </div>

              <p className="kj-register-card__privacy">
                King Jades không lưu mật
                khẩu trong trình duyệt.
                Email và số điện thoại
                chỉ được gửi đến API đăng
                ký tài khoản.
              </p>
            </>
          ) : (
            <>
              {/* =================================================
                  OTP MODE
              ================================================= */}

              <div className="kj-register-card__heading">
                <span className="kj-register-eyebrow">
                  Email Verification
                </span>

                <h2>
                  Xác thực email
                </h2>

                <p>
                  Nhập mã xác thực 6 số
                  để kích hoạt tài khoản.
                </p>
              </div>

              {/* SUCCESS INFO */}

              <div
                className="
                  kj-register-alert
                  kj-register-alert--success
                  kj-register-otp-info
                "
                role="status"
              >
                <MailIcon />

                <div>
                  <strong>
                    {message ||
                      "Mã xác thực đã được gửi đến email của bạn."}
                  </strong>

                  <span>
                    Mã đã được gửi đến{" "}
                    <span className="kj-register-verification-email">
                      {pendingEmail}
                    </span>
                  </span>
                </div>
              </div>

              {/* OTP ERROR */}

              {error && (
                <div
                  className="
                    kj-register-alert
                    kj-register-alert--error
                  "
                  role="alert"
                >
                  {error}
                </div>
              )}

              {/* OTP FORM */}

              <form
                className="kj-register-form"
                onSubmit={
                  handleVerifyCode
                }
                noValidate
              >
                <div
                  className="
                    kj-register-field
                    kj-register-otp-wrap
                  "
                >
                  <span>
                    Mã xác thực{" "}
                    <b>*</b>
                  </span>

                  <div className="kj-register-otp-group">
                    {verificationDigits.map(
                      (
                        digit,
                        index
                      ) => (
                        <input
                          key={
                            index
                          }
                          ref={
                            element => {
                              otpInputRefs
                                .current[
                                  index
                                ] =
                                element;
                            }
                          }
                          className="kj-register-otp-input"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete={
                            index === 0
                              ? "one-time-code"
                              : "off"
                          }
                          aria-label={`Số xác thực ${
                            index + 1
                          }`}
                          maxLength={1}
                          value={
                            digit
                          }
                          disabled={
                            loading
                          }
                          onChange={
                            event =>
                              handleOtpChange(
                                index,
                                event
                                  .target
                                  .value
                              )
                          }
                          onKeyDown={
                            event =>
                              handleOtpKeyDown(
                                index,
                                event
                              )
                          }
                          onPaste={
                            handleOtpPaste
                          }
                        />
                      )
                    )}
                  </div>

                  <small className="kj-register-otp-note">
                    Mã xác thực chỉ sử dụng
                    một lần và có hiệu lực
                    trong 10 phút.
                  </small>
                </div>

                <button
                  type="submit"
                  className="kj-register-submit"
                  disabled={
                    loading ||
                    verificationDigits
                      .join("")
                      .length !==
                      OTP_LENGTH
                  }
                >
                  {loading
                    ? "Đang xác thực..."
                    : "Xác nhận mã"}

                  {!loading && (
                    <ArrowIcon />
                  )}
                </button>
              </form>

              <p className="kj-register-card__privacy">
                Sau khi nhập đúng mã,
                tài khoản sẽ được kích
                hoạt và bạn sẽ được
                chuyển về trang chủ trong
                trạng thái đã đăng nhập.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default RegisterPage;