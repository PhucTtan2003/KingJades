import React, {
  useEffect,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import apiClient from "../api/apiClient";

/* =====================================================
   TYPES
===================================================== */

type RoleName =
  | "admin"
  | "staff"
  | "user";

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
   CHỐNG REACT STRICT MODE VERIFY 2 LẦN
===================================================== */

const verifyRequests =
  new Map<
    string,
    Promise<VerifyEmailResponse>
  >();

const verifyTokenOnce = (
  token: string
): Promise<VerifyEmailResponse> => {
  const existing =
    verifyRequests.get(token);

  if (existing) {
    return existing;
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

    useEffect(() => {
      let active = true;

      const verifyEmail =
        async () => {
          /* =========================================
             TOKEN INVALID
          ========================================= */

          if (!token) {
            window.location.replace(
              "/register?verification=invalid"
            );

            return;
          }

          try {
            /* =======================================
               CALL BACKEND
            ======================================= */

            const data =
              await verifyTokenOnce(
                token
              );

            if (!active) {
              return;
            }

            console.log(
              "[VERIFY EMAIL SUCCESS]",
              data
            );

            /* =======================================
               VALIDATE RESPONSE
            ======================================= */

            if (
              !data.token ||
              !data.accountId ||
              !data.username ||
              !data.email ||
              data.roleId ===
                undefined ||
              !data.roleName
            ) {
              window.location.replace(
                "/register?verification=error"
              );

              return;
            }

            /* =======================================
               USER OBJECT
            ======================================= */

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

            /* =======================================
               SAVE LOGIN
            ======================================= */

            localStorage.setItem(
              "token",
              data.token
            );

            localStorage.setItem(
              "user",
              JSON.stringify(
                loginUser
              )
            );

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

            /* =======================================
               GỬI TÍN HIỆU CHO TAB REGISTER

               Storage event sẽ chạy ở tab khác
               cùng localhost:3000.
            ======================================= */

            localStorage.setItem(
              "emailVerificationSuccess",
              JSON.stringify({
                accountId:
                  data.accountId,

                verifiedAt:
                  Date.now(),
              })
            );

            /* =======================================
               TAB REGISTER LÚC NÀY SẼ:
               
               /register
                   ↓
               /
               
               và đã login.
            ======================================= */

            window.setTimeout(
              () => {
                /*
                 * Thử đóng tab được Gmail mở.
                 *
                 * Chrome có thể không cho phép
                 * nếu tab không được JS mở.
                 */
                window.close();

                /*
                 * Nếu không đóng được thì tab
                 * verify cũng về Homepage.
                 */
                window.setTimeout(
                  () => {
                    if (
                      !window.closed
                    ) {
                      window.location.replace(
                        "/"
                      );
                    }
                  },
                  300
                );
              },
              400
            );
          } catch (
            error: any
          ) {
            if (!active) {
              return;
            }

            const data =
              error?.response?.data;

            const code =
              data?.code;

            console.error(
              "[VERIFY EMAIL ERROR]",
              data || error
            );

            if (
              code ===
              "VERIFICATION_EXPIRED"
            ) {
              window.location.replace(
                "/register?verification=expired"
              );

              return;
            }

            if (
              code ===
              "INVALID_TOKEN"
            ) {
              window.location.replace(
                "/register?verification=invalid"
              );

              return;
            }

            window.location.replace(
              "/register?verification=error"
            );
          }
        };

      verifyEmail();

      return () => {
        active = false;
      };
    }, [token]);

    /*
     * Không render trang xác thực riêng.
     */
    return null;
  };

export default VerifyEmailPage;