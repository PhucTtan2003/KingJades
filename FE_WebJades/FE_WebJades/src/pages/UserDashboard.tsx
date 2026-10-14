import React, {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import apiClient from "../api/apiClient";

/* =====================================================
   TYPES
===================================================== */

type VerifyStatus =
  | "loading"
  | "success"
  | "expired"
  | "invalid"
  | "error";

type RoleName =
  | "admin"
  | "staff"
  | "user";

type VerifyContent = {
  title: string;
  message: string;
  buttonText: string;
  buttonLink: string;
};

type VerifyEmailResponse = {
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
   CHỐNG VERIFY 2 LẦN TRONG REACT STRICT MODE

   React dev mode có thể mount component 2 lần.

   Request đầu tiên:
   - Verify thành công
   - Backend xóa verification token

   Nếu request thứ 2 chạy tiếp:
   - Backend sẽ báo token đã sử dụng

   Map này giúp cùng một token chỉ gửi 1 request.
===================================================== */

const verifyRequests =
  new Map<
    string,
    Promise<VerifyEmailResponse>
  >();

const verifyTokenOnce = (
  token: string
): Promise<VerifyEmailResponse> => {
  const existingRequest =
    verifyRequests.get(token);

  if (existingRequest) {
    return existingRequest;
  }

  const request =
    apiClient
      .get<VerifyEmailResponse>(
        "/api/auth/verify-email",
        {
          params: {
            token,
          },
        }
      )
      .then(
        (response) =>
          response.data
      );

  verifyRequests.set(
    token,
    request
  );

  return request;
};

/* =====================================================
   VERIFY EMAIL PAGE
===================================================== */

const VerifyEmailPage: React.FC =
  () => {
    const [searchParams] =
      useSearchParams();

   

    const token =
      searchParams
        .get("token")
        ?.trim() || "";

    /* =================================================
       STATE
    ================================================= */

    const [
      status,
      setStatus,
    ] =
      useState<VerifyStatus>(
        "loading"
      );

    const [
      serverMessage,
      setServerMessage,
    ] = useState("");

    /* =================================================
       VERIFY EMAIL
    ================================================= */

    useEffect(() => {
      let active = true;

      /*
       * FIX TS2322:
       *
       * Browser window.setTimeout()
       * trả về number.
       */
      let redirectTimer:
        number | null =
        null;

      const verifyEmail =
        async () => {
          /* ===========================================
             KHÔNG CÓ TOKEN
          =========================================== */

          if (!token) {
            if (!active) {
              return;
            }

            setStatus(
              "invalid"
            );

            setServerMessage(
              "Liên kết xác thực không hợp lệ."
            );

            return;
          }

          try {
            /* =========================================
               CALL BACKEND

               GET
               /api/auth/verify-email?token=xxxx
            ========================================= */

            const data =
              await verifyTokenOnce(
                token
              );

            console.log(
              "[VERIFY EMAIL SUCCESS]",
              data
            );

            if (!active) {
              return;
            }

            /* =========================================
               BACKEND PHẢI TRẢ JWT
            ========================================= */

            if (!data.token) {
              setStatus(
                "error"
              );

              setServerMessage(
                "Xác thực thành công nhưng không thể tự động đăng nhập."
              );

              return;
            }

            /* =========================================
               KIỂM TRA ACCOUNT DATA
            ========================================= */

            if (
              !data.accountId ||
              !data.username ||
              !data.email ||
              data.roleId ===
                undefined ||
              !data.roleName
            ) {
              setStatus(
                "error"
              );

              setServerMessage(
                "Xác thực thành công nhưng thông tin tài khoản trả về chưa đầy đủ."
              );

              return;
            }

            /* =========================================
               FORMAT USER

               Phải giống AuthContext.tsx
            ========================================= */

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

            /* =========================================
               SAVE JWT
            ========================================= */

            localStorage.setItem(
              "token",
              data.token
            );

            /* =========================================
               SAVE USER

               AuthContext đọc:
               localStorage["user"]
            ========================================= */

            localStorage.setItem(
              "user",
              JSON.stringify(
                loginUser
              )
            );

            /* =========================================
               SAVE ROLE
            ========================================= */

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

            /* =========================================
               SUCCESS
            ========================================= */

            setStatus(
              "success"
            );

            setServerMessage(
              "Email đã được xác thực. Đang đăng nhập vào King Jades..."
            );

            /* =========================================
               CHỜ 1 GIÂY → VỀ TRANG CHỦ

               Reload toàn bộ app để AuthProvider
               đọc lại localStorage["user"].
            ========================================= */

            redirectTimer =
              window.setTimeout(
                () => {
                  window.location.replace(
                    "/"
                  );
                },
                1000
              );
          } catch (
            error: any
          ) {
            if (!active) {
              return;
            }

            /* =========================================
               READ BACKEND ERROR
            ========================================= */

            const statusCode =
              error?.response
                ?.status;

            const responseData =
              error?.response
                ?.data;

            const message =
              responseData
                ?.message;

            const code =
              responseData
                ?.code;

            console.error(
              "[VERIFY EMAIL ERROR]",
              {
                statusCode,
                code,
                message,
                responseData,
              }
            );

            /* =========================================
               TOKEN HẾT HẠN

               Backend:
               VERIFICATION_EXPIRED
            ========================================= */

            if (
              code ===
              "VERIFICATION_EXPIRED"
            ) {
              setStatus(
                "expired"
              );

              setServerMessage(
                message ||
                  "Liên kết xác thực đã hết hạn. Vui lòng đăng ký lại."
              );

              return;
            }

            /* =========================================
               TOKEN SAI / ĐÃ DÙNG

               Backend:
               INVALID_TOKEN
            ========================================= */

            if (
              code ===
              "INVALID_TOKEN"
            ) {
              setStatus(
                "invalid"
              );

              setServerMessage(
                message ||
                  "Liên kết xác thực không hợp lệ hoặc đã được sử dụng."
              );

              return;
            }

            /* =========================================
               ACCOUNT BỊ KHÓA
            ========================================= */

            if (
              code ===
              "ACCOUNT_INACTIVE"
            ) {
              setStatus(
                "error"
              );

              setServerMessage(
                message ||
                  "Tài khoản hiện đang bị khóa."
              );

              return;
            }

            /* =========================================
               ROLE KHÔNG HỢP LỆ
            ========================================= */

            if (
              code ===
              "INVALID_ROLE"
            ) {
              setStatus(
                "error"
              );

              setServerMessage(
                message ||
                  "Vai trò tài khoản không hợp lệ."
              );

              return;
            }

            /* =========================================
               VERIFY FAILED
            ========================================= */

            if (
              code ===
              "VERIFY_FAILED"
            ) {
              setStatus(
                "error"
              );

              setServerMessage(
                message ||
                  "Không thể xác thực tài khoản."
              );

              return;
            }

            /* =========================================
               FALLBACK HTTP 400
            ========================================= */

            if (
              statusCode === 400
            ) {
              const lowerMessage =
                String(
                  message || ""
                ).toLowerCase();

              /* =======================================
                 MESSAGE CÓ "HẾT HẠN"
              ======================================= */

              if (
                lowerMessage.includes(
                  "hết hạn"
                )
              ) {
                setStatus(
                  "expired"
                );

                setServerMessage(
                  message ||
                    "Liên kết xác thực đã hết hạn."
                );

                return;
              }

              /* =======================================
                 CÒN LẠI COI LÀ TOKEN INVALID
              ======================================= */

              setStatus(
                "invalid"
              );

              setServerMessage(
                message ||
                  "Liên kết xác thực không hợp lệ hoặc đã được sử dụng."
              );

              return;
            }

            /* =========================================
               HTTP 401
            ========================================= */

            if (
              statusCode === 401
            ) {
              setStatus(
                "error"
              );

              setServerMessage(
                message ||
                  "Tài khoản không thể được xác thực."
              );

              return;
            }

            /* =========================================
               NETWORK / SERVER ERROR
            ========================================= */

            setStatus(
              "error"
            );

            setServerMessage(
              message ||
                "Đã xảy ra lỗi trong quá trình xác thực tài khoản."
            );
          }
        };

      /* ===============================================
         START VERIFY
      =============================================== */

      verifyEmail();

      /* ===============================================
         CLEANUP
      =============================================== */

      return () => {
        active = false;

        if (
          redirectTimer !== null
        ) {
          window.clearTimeout(
            redirectTimer
          );
        }
      };
    }, [token]);

    /* =================================================
       CONTENT
    ================================================= */

    const getContent =
      (): VerifyContent => {
        switch (status) {
          /* ===========================================
             LOADING
          =========================================== */

          case "loading":
            return {
              title:
                "Đang xác thực email",

              message:
                "Vui lòng chờ trong giây lát...",

              buttonText: "",

              buttonLink: "",
            };

          /* ===========================================
             SUCCESS
          =========================================== */

          case "success":
            return {
              title:
                "Xác thực thành công",

              message:
                serverMessage ||
                "Email của bạn đã được xác thực. Đang đăng nhập...",

              buttonText: "",

              buttonLink: "",
            };

          /* ===========================================
             EXPIRED
          =========================================== */

          case "expired":
            return {
              title:
                "Liên kết đã hết hạn",

              message:
                serverMessage ||
                "Liên kết xác thực đã hết hạn.",

              buttonText:
                "Về trang đăng ký",

              buttonLink:
                "/register",
            };

          /* ===========================================
             INVALID
          =========================================== */

          case "invalid":
            return {
              title:
                "Liên kết không hợp lệ",

              message:
                serverMessage ||
                "Liên kết xác thực không hợp lệ hoặc đã được sử dụng.",

              buttonText:
                "Về trang chủ",

              buttonLink:
                "/",
            };

          /* ===========================================
             ERROR
          =========================================== */

          case "error":
          default:
            return {
              title:
                "Không thể xác thực",

              message:
                serverMessage ||
                "Đã xảy ra lỗi trong quá trình xác thực tài khoản.",

              buttonText:
                "Về trang chủ",

              buttonLink:
                "/",
            };
        }
      };

    const content =
      getContent();

    /* =================================================
       VIEW

       KHÔNG tạo VerifyEmailPage.css
       KHÔNG import CSS mới.
    ================================================= */

    return (
      <main className="verify-email-page">
        <section className="verify-email-card">
          {/* ===========================================
              TITLE
          =========================================== */}

          <h1>
            {content.title}
          </h1>

          {/* ===========================================
              MESSAGE
          =========================================== */}

          <p>
            {content.message}
          </p>

          {/* ===========================================
              LOADING
          =========================================== */}

          {status ===
            "loading" && (
            <p>
              Đang kiểm tra liên kết
              xác thực...
            </p>
          )}

          {/* ===========================================
              SUCCESS
          =========================================== */}

          {status ===
            "success" && (
            <p>
              Bạn sẽ được chuyển về
              trang chủ tự động.
            </p>
          )}

          {/* ===========================================
              BUTTON
          =========================================== */}

          {status !==
            "loading" &&
            status !==
              "success" &&
            content.buttonLink && (
              <Link
                to={
                  content.buttonLink
                }
                className="verify-email-button"
              >
                {
                  content.buttonText
                }
              </Link>
            )}
        </section>
      </main>
    );
  };

export default VerifyEmailPage;