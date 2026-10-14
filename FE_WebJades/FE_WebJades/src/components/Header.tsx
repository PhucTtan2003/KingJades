import React, {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import {
  PRODUCT_MENU,
  buildProductCategoryUrl,
  getPublicProductMenuGroups,
} from "../config/productMenuConfig";

import kingJadesLogo from "../assets/brand/kingjades-logo-full.svg";

import "../styles/Header.css";

/* ==================================================
   TYPES
================================================== */

type HeaderProps = {
  favoriteCount?: number;
  cartCount?: number;
  onOpenFavorite?: () => void;
  onOpenCart?: () => void;
};

type AuthModalMode =
  | "login"
  | null;

type LoginFormState = {
  usernameOrEmail: string;
  password: string;
};

/* ==================================================
   CONSTANTS
================================================== */

const ZALO_URL =
  "https://zalo.me/3354373045960365130";

const initialLoginForm: LoginFormState = {
  usernameOrEmail: "",
  password: "",
};

/* ==================================================
   ICONS
================================================== */

const SearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      cx="11"
      cy="11"
      r="6.5"
    />

    <path d="m16 16 4 4" />
  </svg>
);

const HeartIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M20.8 4.8a5.2 5.2 0 0 0-7.4 0L12 6.2l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z" />
  </svg>
);

const CartIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20.2 8H6.1" />

    <circle
      cx="9"
      cy="19"
      r="1.4"
    />

    <circle
      cx="17"
      cy="19"
      r="1.4"
    />
  </svg>
);

const UserIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="8"
      r="3.5"
    />

    <path d="M5 20c.6-4 3-6 7-6s6.4 2 7 6" />
  </svg>
);

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

const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

const LogoutIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M10 5H5v14h5" />

    <path d="m15 8 4 4-4 4" />

    <path d="M19 12H9" />
  </svg>
);

/* ==================================================
   HEADER
================================================== */

const Header: React.FC<HeaderProps> = ({
  favoriteCount = 0,
  cartCount,
  onOpenFavorite,
  onOpenCart,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    cartCount: contextCartCount,
    openCart,
  } = useCart();

  const {
    user,
    isAuthenticated,
    login,
    logout,
  } = useAuth();

  const displayCartCount =
    cartCount ?? contextCartCount;

  /* ==================================================
     HEADER STATE
  ================================================== */

  const [
    isMenuOpen,
    setIsMenuOpen,
  ] = useState(false);

  const [
    isSearchOpen,
    setIsSearchOpen,
  ] = useState(false);

  const [
    openMobileCategoryId,
    setOpenMobileCategoryId,
  ] = useState<string | null>(null);

  /*
   * Desktop mega menu dùng state + close delay.
   * Khi rê chuột từ menu cha xuống dropdown, menu vẫn được giữ
   * trong một khoảng ngắn để tránh "mất hover" ở khoảng trống.
   */
  const [
    openDesktopCategoryId,
    setOpenDesktopCategoryId,
  ] = useState<string | null>(null);

  const desktopCategoryCloseTimer =
    useRef<number | null>(null);

  const mobileNavRef = useRef<HTMLElement | null>(null);

  const [
    keyword,
    setKeyword,
  ] = useState("");

  const [
    authModal,
    setAuthModal,
  ] =
    useState<AuthModalMode>(
      null
    );

  const [
    accountMenuOpen,
    setAccountMenuOpen,
  ] = useState(false);

  /* ==================================================
     LOGIN FORM STATE
  ================================================== */

  const [
    loginForm,
    setLoginForm,
  ] =
    useState<LoginFormState>(
      initialLoginForm
    );

  const [
    showLoginPassword,
    setShowLoginPassword,
  ] = useState(false);

  const [
    authLoading,
    setAuthLoading,
  ] = useState(false);

  const [
    authError,
    setAuthError,
  ] = useState("");

  /* ==================================================
     DESKTOP PRODUCT MENU HOVER INTENT
  ================================================== */

  const cancelDesktopCategoryClose = () => {
    if (
      desktopCategoryCloseTimer.current !== null
    ) {
      window.clearTimeout(
        desktopCategoryCloseTimer.current
      );

      desktopCategoryCloseTimer.current = null;
    }
  };

  const openDesktopCategory = (
    categoryId: string
  ) => {
    cancelDesktopCategoryClose();

    setOpenDesktopCategoryId(
      categoryId
    );
  };

  const closeDesktopCategoryNow = () => {
    cancelDesktopCategoryClose();

    setOpenDesktopCategoryId(
      null
    );
  };

  const closeDesktopCategoryWithDelay = () => {
    cancelDesktopCategoryClose();

    desktopCategoryCloseTimer.current =
      window.setTimeout(
        () => {
          setOpenDesktopCategoryId(
            null
          );

          desktopCategoryCloseTimer.current =
            null;
        },
        420
      );
  };

  /* ==================================================
     CLOSE
  ================================================== */

  const closeMenu = () => {
    setIsMenuOpen(false);
    setOpenMobileCategoryId(null);
    closeDesktopCategoryNow();
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setKeyword("");
  };

  const closeAuthModal = () => {
    setAuthModal(null);

    setAuthError("");

    setLoginForm(
      initialLoginForm
    );

    setShowLoginPassword(
      false
    );
  };

  const closeAll = () => {
    closeMenu();
    closeSearch();

    setAccountMenuOpen(
      false
    );
  };

  /* ==================================================
     CLEANUP DESKTOP CATEGORY TIMER
  ================================================== */

  useEffect(() => {
    return () => {
      if (
        desktopCategoryCloseTimer.current !== null
      ) {
        window.clearTimeout(
          desktopCategoryCloseTimer.current
        );
      }
    };
  }, []);

  /* ==================================================
     ROUTE CHANGE
  ================================================== */

  useEffect(() => {
    closeAll();

    /*
     * Mỗi lần đổi route / đổi danh mục / đổi query filter,
     * đưa trang về đầu để người dùng luôn bắt đầu từ phần trên cùng.
     *
     * Đặc biệt áp dụng cho Product Category:
     * /products?parentCategoryId=...&categoryId=...
     */
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    location.pathname,
    location.search,
    location.hash,
  ]);

  /* ==================================================
     ESC
  ================================================== */

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape"
      ) {
        closeAll();
        closeAuthModal();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  /* ==================================================
     MOBILE MENU: AVAILABLE HEIGHT + BACKGROUND SCROLL LOCK
  ================================================== */

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const tabletQuery = window.matchMedia("(max-width: 1080px)");
    const menu = mobileNavRef.current;

    if (!tabletQuery.matches || !menu) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const viewport = window.visualViewport;

    const updateMenuHeight = () => {
      // Khi chuyển sang desktop, đóng menu để trả lại cuộn cho trang.
      if (!tabletQuery.matches) {
        setIsMenuOpen(false);
        setOpenMobileCategoryId(null);
        return;
      }

      // Đo từ vị trí thật của panel đến đáy vùng màn hình đang nhìn thấy.
      // Cập nhật cả khi xoay máy, thanh trình duyệt hoặc bàn phím thay đổi.
      const viewportBottom =
        (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
      const availableHeight = Math.max(
        0,
        Math.floor(viewportBottom - menu.getBoundingClientRect().top - 12)
      );

      menu.style.setProperty("--kj-mobile-menu-height", `${availableHeight}px`);
    };

    menu.scrollTop = 0;
    updateMenuHeight();

    window.addEventListener("resize", updateMenuHeight);
    viewport?.addEventListener("resize", updateMenuHeight);
    viewport?.addEventListener("scroll", updateMenuHeight);

    const shellObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateMenuHeight)
        : null;

    if (menu.parentElement) {
      shellObserver?.observe(menu.parentElement);
    }

    return () => {
      window.removeEventListener("resize", updateMenuHeight);
      viewport?.removeEventListener("resize", updateMenuHeight);
      viewport?.removeEventListener("scroll", updateMenuHeight);
      shellObserver?.disconnect();
      menu.style.removeProperty("--kj-mobile-menu-height");
      document.body.style.overflow = originalOverflow;
    };
  }, [isMenuOpen]);

  /* ==================================================
     PREVENT BODY SCROLL
  ================================================== */

  useEffect(() => {
    if (!authModal) {
      return;
    }

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        originalOverflow;
    };
  }, [authModal]);

  /* ==================================================
     FIXED PRODUCT MENU

     Header dùng cùng PRODUCT_MENU với Add Product.
     Không gọi API ProductCategories.
  ================================================== */

  const isProductCategoryActive = (
    parentCategoryId: string,
    categoryId?: string
  ) => {
    if (
      !location.pathname.startsWith(
        "/products"
      )
    ) {
      return false;
    }

    const params =
      new URLSearchParams(
        location.search
      );

    const currentParentId =
      params.get(
        "parentCategoryId"
      ) || "";

    const currentCategoryId =
      params.get(
        "categoryId"
      ) || "";

    if (categoryId) {
      return (
        currentParentId ===
          parentCategoryId &&
        currentCategoryId ===
          categoryId
      );
    }

    return (
      currentParentId ===
      parentCategoryId
    );
  };

  /* ==================================================
     ACTIVE MENU
  ================================================== */

  const isActive = (
    path: string
  ) => {
    if (
      path === "/products"
    ) {
      return location.pathname.startsWith(
        "/products"
      );
    }

    if (
      path === "/contact"
    ) {
      return location.pathname.startsWith(
        "/contact"
      );
    }

    if (
      path === "/news"
    ) {
      return location.pathname.startsWith(
        "/news"
      );
    }

    if (
      path ===
      "/cau-chuyen-thuong-hieu"
    ) {
      return location.pathname.startsWith(
        "/cau-chuyen-thuong-hieu"
      );
    }

    return (
      location.pathname === path
    );
  };

  /* ==================================================
     SEARCH
  ================================================== */

  const handleSearchSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const value =
      keyword.trim();

    navigate(
      value
        ? `/products?search=${encodeURIComponent(
            value
          )}`
        : "/products"
    );

    closeAll();
  };

  /* ==================================================
     FAVORITE
  ================================================== */

  const handleOpenFavorite = () => {
    closeAll();

    if (onOpenFavorite) {
      onOpenFavorite();

      return;
    }

    window.dispatchEvent(
      new Event(
        "king-jades-open-favorites"
      )
    );
  };

  /* ==================================================
     CART
  ================================================== */

  const handleOpenCart = () => {
    closeAll();

    if (onOpenCart) {
      onOpenCart();

      return;
    }

    openCart();
  };

  /* ==================================================
     OPEN LOGIN
  ================================================== */

  const openLogin = () => {
    closeAll();

    setAuthError("");

    setAuthModal(
      "login"
    );
  };

  /* ==================================================
     OPEN REGISTER

     QUAN TRỌNG:
     Header KHÔNG còn tự register.

     Toàn bộ Register nằm tại:
     /r
egister
     RegisterPage.tsx
  ================================================== */

  const openRegister = () => {
    closeAll();
    closeAuthModal();

    navigate(
      "/register"
    );
  };

  /* ==================================================
     LOGIN
  ================================================== */

  const handleLoginSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setAuthError("");

      const usernameOrEmail =
        loginForm
          .usernameOrEmail
          .trim();

      const password =
        loginForm.password;

      /* ==========================================
         VALIDATE
      ========================================== */

      if (!usernameOrEmail) {
        setAuthError(
          "Vui lòng nhập tên đăng nhập hoặc email."
        );

        return;
      }

      if (!password) {
        setAuthError(
          "Vui lòng nhập mật khẩu."
        );

        return;
      }

      setAuthLoading(
        true
      );

      try {
        /* ========================================
           AUTH CONTEXT LOGIN
        ======================================== */

        const loggedUser =
          await login(
            usernameOrEmail,
            password
          );

        const role =
          String(
            loggedUser.roleName ||
              ""
          )
            .trim()
            .toLowerCase();

        console.log(
          "LOGIN USER:",
          loggedUser
        );

        console.log(
          "LOGIN ROLE:",
          role
        );

        setLoginForm(
          initialLoginForm
        );

        closeAuthModal();

        /* ========================================
           ADMIN
        ======================================== */

        if (
          role === "admin"
        ) {
          navigate(
            "/admin-dashboard",
            {
              replace: true,
            }
          );

          return;
        }

        /* ========================================
           STAFF
        ======================================== */

        if (
          role === "staff"
        ) {
          navigate(
            "/staff",
            {
              replace: true,
            }
          );

          return;
        }

        /* ========================================
           USER
        ======================================== */

        if (
          role === "user"
        ) {
          navigate(
            "/user",
            {
              replace: true,
            }
          );

          return;
        }

        /* ========================================
           INVALID ROLE
        ======================================== */

        logout();

        navigate(
          "/unauthorized",
          {
            replace: true,
          }
        );
      } catch (
        requestError: any
      ) {
        console.error(
          "LOGIN ERROR:",
          requestError
            ?.response
            ?.data ||
            requestError
        );

        setAuthError(
          requestError
            ?.response
            ?.data
            ?.message ||
            requestError
              ?.message ||
            "Đăng nhập thất bại."
        );
      } finally {
        setAuthLoading(
          false
        );
      }
    };

  /* ==================================================
     LOGOUT
  ================================================== */

  const handleLogout =
    () => {
      logout();

      setAccountMenuOpen(
        false
      );

      navigate(
        "/"
      );
    };

  /* ==================================================
     ROLE LABEL
  ================================================== */

  const getRoleLabel =
    () => {
      switch (
        user?.roleName
      ) {
        case "admin":
          return "Quản trị viên";

        case "staff":
          return "Nhân viên";

        case "user":
          return "Khách hàng";

        default:
          return "";
      }
    };

  /* ==================================================
     RENDER
  ================================================== */

  return (
    <>
      <header className="kj-header">
        <div className="kj-header-shell">
          {/* ================= LOGO ================= */}

          <Link
            to="/"
            className="kj-header-logo"
            onClick={
              closeAll
            }
            aria-label="King Jades - về trang chủ"
          >
            <img
              src={
                kingJadesLogo
              }
              alt="King Jades"
            />
          </Link>

          {/* ================= NAV ================= */}

          <nav
            ref={mobileNavRef}
            className={`kj-main-nav ${
              isMenuOpen
                ? "open"
                : ""
            }`}
            aria-label="Điều hướng chính"
          >
           <div className="kj-main-nav-links">
              <Link
                to="/cau-chuyen-thuong-hieu"
                onClick={closeAll}
                className={
                  isActive(
                    "/cau-chuyen-thuong-hieu"
                  )
                    ? "active"
                    : ""
                }
              >
                Câu chuyện
              </Link>

              {PRODUCT_MENU.map(
                (category) => {
                  const isMobileCategoryOpen =
                    openMobileCategoryId === category.id;

                  const isDesktopCategoryOpen =
                    openDesktopCategoryId === category.id;

                  return (
                    <div
                      className={`kj-category-nav-item ${
                        isMobileCategoryOpen
                          ? "is-mobile-open"
                          : ""
                      } ${
                        isDesktopCategoryOpen
                          ? "is-desktop-open"
                          : ""
                      }`}
                      key={category.id}
                      onMouseEnter={() => {
                        if (
                          window.matchMedia(
                            "(min-width: 1081px)"
                          ).matches
                        ) {
                          openDesktopCategory(
                            category.id
                          );
                        }
                      }}
                      onMouseLeave={() => {
                        if (
                          window.matchMedia(
                            "(min-width: 1081px)"
                          ).matches
                        ) {
                          closeDesktopCategoryWithDelay();
                        }
                      }}
                    >
                      <Link
                        to={buildProductCategoryUrl(category)}
                        onClick={closeAll}
                        className={`kj-category-nav-main-link ${
                          isProductCategoryActive(category.id)
                            ? "active"
                            : ""
                        }`}
                      >
                        {category.name}

                        <span className="kj-category-nav-caret">
                          ▾
                        </span>
                      </Link>

                      <button
                        type="button"
                        className="kj-category-nav-toggle"
                        aria-label={`${
                          isMobileCategoryOpen ? "Thu gọn" : "Mở"
                        } danh mục ${category.name}`}
                        aria-expanded={isMobileCategoryOpen}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();

                          setOpenMobileCategoryId((previous) =>
                            previous === category.id
                              ? null
                              : category.id
                          );
                        }}
                      >
                        <span aria-hidden="true">⌄</span>
                      </button>

                      <div
                        className={`kj-category-dropdown ${
                          category.groups.length > 1
                            ? "kj-category-dropdown--mega"
                            : "kj-category-dropdown--flat"
                        } ${
                          isMobileCategoryOpen
                            ? "is-mobile-open"
                            : ""
                        }`}
                        onMouseEnter={() => {
                          if (
                            window.matchMedia(
                              "(min-width: 1081px)"
                            ).matches
                          ) {
                            cancelDesktopCategoryClose();
                          }
                        }}
                        onMouseLeave={() => {
                          if (
                            window.matchMedia(
                              "(min-width: 1081px)"
                            ).matches
                          ) {
                            closeDesktopCategoryWithDelay();
                          }
                        }}
                      >
                        {getPublicProductMenuGroups(category).map(
                          (group) => (
                            <div
                              className="kj-category-dropdown__group"
                              key={group.id}
                            >
                              {group.name && (
                                <strong className="kj-category-dropdown__title">
                                  {group.name}
                                </strong>
                              )}

                              <div className="kj-category-dropdown__links">
                                {group.items.map(
                                  (item) => (
                                    <Link
                                      key={item.id}
                                      to={buildProductCategoryUrl(
                                        category,
                                        item
                                      )}
                                      onClick={closeAll}
                                      className={
                                        isProductCategoryActive(
                                          category.id,
                                          item.id
                                        )
                                          ? "active"
                                          : ""
                                      }
                                    >
                                      {item.name}
                                    </Link>
                                  )
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  );
                }
              )}

              <Link
                to="/news"
                onClick={closeAll}
                className={
                  isActive("/news")
                    ? "active"
                    : ""
                }
              >
                Kiến thức ngọc
              </Link>

              <Link
  to="/xem-menh"
  onClick={closeAll}
  className={
    isActive("/xem-menh")
      ? "active"
      : ""
  }
>
  Mệnh Khuyết
</Link>

              <Link
                to="/contact"
                onClick={closeAll}
                className={`kj-mobile-nav-contact-link ${
                  isActive("/contact")
                    ? "active"
                    : ""
                }`} 
              >
                Liên hệ
              </Link>
            </div>

            {/* ================= MOBILE ================= */}

            <div className="kj-mobile-nav-actions">
              <button
                type="button"
                onClick={() =>
                  setIsSearchOpen(
                    true
                  )
                }
              >
                <SearchIcon />

                Tìm sản phẩm
              </button>

              <button
                type="button"
                onClick={
                  handleOpenFavorite
                }
              >
                <HeartIcon />

                Yêu thích{" "}
                {favoriteCount >
                0
                  ? `(${favoriteCount})`
                  : ""}
              </button>

              {/* CART MOBILE - ẨN TẠM, KHÔNG XÓA
              <button
                type="button"
                onClick={
                  handleOpenCart
                }
              >
                <CartIcon />

                Giỏ quan tâm{" "}
                {displayCartCount >
                0
                  ? `(${displayCartCount})`
                  : ""}
              </button>
              */}

              {/* ================= MOBILE AUTH ================= */}

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() =>
                    setAccountMenuOpen(
                      (previous) =>
                        !previous
                    )
                  }
                >
                  <UserIcon />

                  {user?.username}
                </button>
              )}

              <Link
                to="/news"
                onClick={
                  closeAll
                }
                className={`kj-mobile-nav-knowledge ${
                  isActive("/news")
                    ? "active"
                    : ""
                }`} 
              >
                Kiến thức ngọc
              </Link>
            </div>
          </nav>

          {/* ================= ACTIONS ================= */}

          <div className="kj-header-actions">
            <div className="kj-header-utility-actions">
              {/* SEARCH */}

              <button
                type="button"
                className="kj-header-icon-button"
                onClick={() =>
                  setIsSearchOpen(
                    (
                      previous
                    ) =>
                      !previous
                  )
                }
                aria-label="Tìm kiếm sản phẩm"
                aria-expanded={
                  isSearchOpen
                }
              >
                <SearchIcon />
              </button>

              {/* FAVORITE */}

              <button
                type="button"
                className="kj-header-icon-button"
                onClick={
                  handleOpenFavorite
                }
                aria-label="Sản phẩm yêu thích"
              >
                <HeartIcon />

                {favoriteCount >
                  0 && (
                  <span className="kj-header-count">
                    {
                      favoriteCount
                    }
                  </span>
                )}
              </button>

              {/* CART DESKTOP - ẨN TẠM, KHÔNG XÓA
              <button
                type="button"
                className="kj-header-icon-button"
                onClick={
                  handleOpenCart
                }
                aria-label="Giỏ sản phẩm quan tâm"
              >
                <CartIcon />

                {displayCartCount >
                  0 && (
                  <span className="kj-header-count">
                    {
                      displayCartCount
                    }
                  </span>
                )}
              </button>
              */}
            </div>

            {/* ================= ZALO HIDDEN BY DESIGN ================= */}

            {/* ==================================================
                REGISTER / LOGIN / ACCOUNT
            ================================================== */}

            {isAuthenticated && (
              <div className="kj-header-auth">
                {/* ================= USER BUTTON ================= */}

                <button
                  type="button"
                  className="kj-header-account-button"
                  onClick={() =>
                    setAccountMenuOpen(
                      (previous) =>
                        !previous
                    )
                  }
                  aria-expanded={
                    accountMenuOpen
                  }
                >
                  <span className="kj-header-account-avatar">
                    {user?.username
                      ?.charAt(0)
                      ?.toUpperCase() ||
                      "K"}
                  </span>

                  <span className="kj-header-account-name">
                    {user?.username}
                  </span>

                  <span className="kj-header-account-arrow">
                    ▾
                  </span>
                </button>

                {/* ================= ACCOUNT MENU ================= */}

                {accountMenuOpen && (
                  <div className="kj-header-account-menu">
                    <div className="kj-header-account-menu__top">
                      <span className="kj-header-account-menu__avatar">
                        {user?.username
                          ?.charAt(0)
                          ?.toUpperCase() ||
                          "K"}
                      </span>

                      <div>
                        <strong>
                          {user?.username}
                        </strong>

                        <small>
                          {user?.email}
                        </small>
                      </div>
                    </div>

                    <div className="kj-header-account-role">
                      {getRoleLabel()}
                    </div>

                    {user?.roleName ===
                      "admin" && (
                      <Link
                        to="/admin-dashboard"
                        onClick={
                          closeAll
                        }
                      >
                        Trang quản trị
                      </Link>
                    )}

                    {user?.roleName ===
                      "staff" && (
                      <Link
                        to="/staff"
                        onClick={
                          closeAll
                        }
                      >
                        Trang nhân viên
                      </Link>
                    )}

                    <button
                      type="button"
                      className="kj-header-logout"
                      onClick={
                        handleLogout
                      }
                    >
                      <LogoutIcon />

                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ================= CONSULT ================= */}

            <Link
              to="/contact"
              className="kj-header-consult"
              onClick={
                closeAll
              }
            >
              Tư Vấn
            </Link>

            {/* ================= MOBILE MENU ================= */}

            <button
              type="button"
              className={`kj-menu-button ${
                isMenuOpen
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setIsMenuOpen(
                  (
                    previous
                  ) =>
                    !previous
                )
              }
              aria-label={
                isMenuOpen
                  ? "Đóng menu"
                  : "Mở menu"
              }
              aria-expanded={
                isMenuOpen
              }
            >
              <span />
              <span />
              <span />
            </button>
          </div>

          {/* ================= SEARCH FORM ================= */}

          {isSearchOpen && (
            <form
              className="kj-header-search"
              onSubmit={
                handleSearchSubmit
              }
            >
              <SearchIcon />

              <input
                autoFocus
                value={
                  keyword
                }
                onChange={(
                  event
                ) =>
                  setKeyword(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Tìm tên sản phẩm, dòng ngọc, mã SKU..."
                aria-label="Từ khóa tìm kiếm"
              />

              <button
                type="submit"
              >
                Tìm
              </button>

              <button
                type="button"
                onClick={
                  closeSearch
                }
                aria-label="Đóng tìm kiếm"
              >
                ×
              </button>
            </form>
          )}
        </div>
      </header>

      {/* ==================================================
          LOGIN MODAL

          Header chỉ còn modal LOGIN.
          Register đã chuyển sang RegisterPage.tsx.
      ================================================== */}

      {authModal ===
        "login" && (
        <div
          className="kj-auth-overlay"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeAuthModal();
            }
          }}
        >
          <div
            className="kj-auth-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Đăng nhập King Jades"
          >
            {/* ================= CLOSE ================= */}

            <button
              type="button"
              className="kj-auth-modal__close"
              onClick={
                closeAuthModal
              }
              aria-label="Đóng"
            >
              <CloseIcon />
            </button>

            {/* ================= LOGO ================= */}

            <Link
              to="/"
              className="kj-auth-modal__logo"
              onClick={
                closeAuthModal
              }
            >
              <img
                src={
                  kingJadesLogo
                }
                alt="King Jades"
              />
            </Link>

            {/* ================= HEADING ================= */}

            <div className="kj-auth-modal__heading">
              <span>
                Welcome Back
              </span>

              <h2>
                Đăng nhập
              </h2>

              <p>
                Đăng nhập để tiếp tục
                trải nghiệm King Jades.
              </p>
            </div>

            {/* ================= ERROR ================= */}

            {authError && (
              <div
                className="
                  kj-auth-alert
                  kj-auth-alert--error
                "
                role="alert"
              >
                {
                  authError
                }
              </div>
            )}

            {/* ================= LOGIN FORM ================= */}

            <form
              className="kj-auth-form"
              onSubmit={
                handleLoginSubmit
              }
            >
              <label>
                <span>
                  Tên đăng nhập hoặc
                  Email
                </span>

                <input
                  autoFocus
                  value={
                    loginForm
                      .usernameOrEmail
                  }
                  onChange={(
                    event
                  ) =>
                    setLoginForm(
                      (
                        previous
                      ) => ({
                        ...previous,

                        usernameOrEmail:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder="Nhập username hoặc email"
                  autoComplete="username"
                  disabled={
                    authLoading
                  }
                />
              </label>

              <label>
                <span>
                  Mật khẩu
                </span>

                <div className="kj-auth-password">
                  <input
                    type={
                      showLoginPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      loginForm
                        .password
                    }
                    onChange={(
                      event
                    ) =>
                      setLoginForm(
                        (
                          previous
                        ) => ({
                          ...previous,

                          password:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    placeholder="Nhập mật khẩu"
                    autoComplete="current-password"
                    disabled={
                      authLoading
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowLoginPassword(
                        (
                          previous
                        ) =>
                          !previous
                      )
                    }
                    aria-label={
                      showLoginPassword
                        ? "Ẩn mật khẩu"
                        : "Hiện mật khẩu"
                    }
                    disabled={
                      authLoading
                    }
                  >
                    {showLoginPassword ? (
                      <EyeOffIcon />
                    ) : (
                      <EyeIcon />
                    )}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                className="kj-auth-submit"
                disabled={
                  authLoading
                }
              >
                {authLoading
                  ? "Đang đăng nhập..."
                  : "Đăng nhập"}
              </button>
            </form>

            {/* ==================================================
                REGISTER LINK

                Không còn đổi modal.
                Chuyển hẳn sang /register.
            ================================================== */}

            <div className="kj-auth-switch">
              <span>
                Chưa có tài khoản?
              </span>

              <button
                type="button"
                onClick={
                  openRegister
                }
              >
                Đăng ký ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;