import React, {
  createContext,
  useContext,
  useState,
} from "react";

import apiClient from "../api/apiClient";

/* =====================================================
   TYPES
===================================================== */

export type RoleName =
  | "admin"
  | "staff"
  | "user";

export type UserInfo = {
  accountId: string;
  username: string;
  email: string;
  roleId: number;
  roleName: RoleName;
};

type LoginResponse = {
  token: string;
  expiresAt: string;

  accountId: string;
  username: string;
  email: string;

  roleId: number;
  roleName: RoleName;
};

type AuthContextType = {
  user:
    | UserInfo
    | null;

  isAuthenticated:
    boolean;

  login: (
    usernameOrEmail: string,
    password: string
  ) => Promise<UserInfo>;

  logout: () => void;
};

/* =====================================================
   CONTEXT
===================================================== */

const AuthContext =
  createContext<
    AuthContextType | null
  >(null);

/* =====================================================
   CLEAR STORAGE
===================================================== */

function clearAuthStorage() {
  localStorage.removeItem(
    "token"
  );

  localStorage.removeItem(
    "user"
  );

  localStorage.removeItem(
    "roleName"
  );

  localStorage.removeItem(
    "roleId"
  );
}

/* =====================================================
   GET STORED USER
===================================================== */

function getStoredUser():
  UserInfo | null {
  const token =
    localStorage.getItem(
      "token"
    );

  const rawUser =
    localStorage.getItem(
      "user"
    );

  /*
   * Muốn được xem là đăng nhập:
   *
   * phải có:
   *
   * token
   * +
   * user
   */

  if (
    !token ||
    !rawUser
  ) {
    clearAuthStorage();

    return null;
  }

  try {
    const parsedUser =
      JSON.parse(
        rawUser
      ) as UserInfo;

    /* ===============================================
       VALIDATE STORED USER
    =============================================== */

    if (
      !parsedUser ||
      !parsedUser.accountId ||
      !parsedUser.username ||
      !parsedUser.email ||
      parsedUser.roleId ===
        undefined ||
      !parsedUser.roleName
    ) {
      clearAuthStorage();

      return null;
    }

    return parsedUser;
  } catch {
    clearAuthStorage();

    return null;
  }
}

/* =====================================================
   AUTH PROVIDER
===================================================== */

export const AuthProvider = ({
  children,
}: {
  children:
    React.ReactNode;
}) => {
  const [
    user,
    setUser,
  ] =
    useState<
      UserInfo | null
    >(
      getStoredUser
    );

  /* ===================================================
     LOGIN
  =================================================== */

  const login =
    async (
      usernameOrEmail:
        string,

      password:
        string
    ): Promise<UserInfo> => {
      const response =
        await apiClient.post<LoginResponse>(
          "/api/login",
          {
            usernameOrEmail,
            password,
          }
        );

      const data =
        response.data;

      /* ===============================================
         VALIDATE LOGIN RESPONSE
      =============================================== */

      if (
        !data.token ||
        !data.accountId ||
        !data.username ||
        !data.email ||
        data.roleId ===
          undefined ||
        !data.roleName
      ) {
        throw new Error(
          "Thông tin đăng nhập từ máy chủ chưa đầy đủ."
        );
      }

      /* ===============================================
         USER OBJECT
      =============================================== */

      const loginUser:
        UserInfo = {
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

      /* ===============================================
         SAVE TOKEN
      =============================================== */

      localStorage.setItem(
        "token",
        data.token
      );

      /* ===============================================
         SAVE USER

         VerifyEmailPage / RegisterPage
         cũng phải lưu đúng format này.
      =============================================== */

      localStorage.setItem(
        "user",
        JSON.stringify(
          loginUser
        )
      );

      /* ===============================================
         SAVE ROLE
      =============================================== */

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

      /* ===============================================
         REACT STATE
      =============================================== */

      setUser(
        loginUser
      );

      return loginUser;
    };

  /* ===================================================
     LOGOUT
  =================================================== */

  const logout = () => {
    clearAuthStorage();

    setUser(
      null
    );
  };

  /* ===================================================
     PROVIDER
  =================================================== */

  return (
    <AuthContext.Provider
      value={{
        user,

        isAuthenticated:
          Boolean(user),

        login,

        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* =====================================================
   USE AUTH
===================================================== */

export function useAuth() {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}