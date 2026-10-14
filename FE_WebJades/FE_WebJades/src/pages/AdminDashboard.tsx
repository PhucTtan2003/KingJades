import React, {


  useEffect,


  useMemo,


  useState,


} from "react";


import {


  Link,


  useNavigate,


  useSearchParams,


} from "react-router-dom";


import { useAuth } from "../contexts/AuthContext";


import NotificationBell from "../components/admin/NotificationBell";


import AccountPage from "./AccountPage";


import AdminProductsPage from "./AdminProductsPage";


import AdminNewsPage from "./AdminNewsPage";


import AdminContactLeadsPage from "./AdminContactLeadsPage";


import kingJadesLogo from "../assets/admin/kingjades-logo-full.svg";


import "../styles/AdminDashboard.css";


type AdminPage =


  | "dashboard"


  | "account"


  | "products"


  | "news"


  | "contact"


  | "service"


  | "certificate";


type MenuItem = {


  key: AdminPage;


  label: string;


  desc: string;


  icon: React.ReactNode;


};


const SIDEBAR_STORAGE_KEY =


  "king-jades-admin-sidebar-collapsed";


const DashboardIcon = () => (


  <svg viewBox="0 0 24 24" aria-hidden="true">


    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />


    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />


    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />


    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />


  </svg>


);


const AccountIcon = () => (


  <svg viewBox="0 0 24 24" aria-hidden="true">


    <circle cx="12" cy="8" r="3.5" />


    <path d="M5 20c.6-4 3-6 7-6s6.4 2 7 6" />


  </svg>


);


const ProductIcon = () => (


  <svg viewBox="0 0 24 24" aria-hidden="true">


    <path d="m12 3 7 4v10l-7 4-7-4V7l7-4Z" />


    <path d="m5 7 7 4 7-4M12 11v10" />


  </svg>


);


const NewsIcon = () => (


  <svg viewBox="0 0 24 24" aria-hidden="true">


    <rect x="4" y="4" width="16" height="16" rx="2" />


    <path d="M8 8h8M8 12h8M8 16h5" />


  </svg>


);


const ContactIcon = () => (


  <svg viewBox="0 0 24 24" aria-hidden="true">


    <path d="M4 5.5h16v11H9l-5 3v-14Z" />


    <path d="M8 9h8M8 13h5" />


  </svg>


);


const ServiceIcon = () => (


  <svg viewBox="0 0 24 24" aria-hidden="true">


    <path d="m12 3 1.8 4.4L18 9.2l-4.2 1.8L12 15.5 10.2 11 6 9.2l4.2-1.8L12 3Z" />


    <path d="m18.5 14 1 2.4L22 17.5l-2.5 1.1-1 2.4-1-2.4-2.5-1.1 2.5-1.1 1-2.4Z" />


  </svg>


);


const CertificateIcon = () => (


  <svg viewBox="0 0 24 24" aria-hidden="true">


    <circle cx="12" cy="10" r="6.5" />


    <path d="m8.5 15.5-1 5 4.5-2.2 4.5 2.2-1-5" />


    <path d="m9.5 10 1.6 1.6 3.4-3.4" />


  </svg>


);


const MenuIcon = () => (


  <svg viewBox="0 0 24 24" aria-hidden="true">


    <path d="M4 7h16M4 12h16M4 17h16" />


  </svg>


);


const CloseIcon = () => (


  <svg viewBox="0 0 24 24" aria-hidden="true">


    <path d="m6 6 12 12M18 6 6 18" />


  </svg>


);


const CollapseIcon = () => (


  <svg viewBox="0 0 24 24" aria-hidden="true">


    <path d="m15 6-6 6 6 6" />


  </svg>


);


const ArrowIcon = () => (


  <svg viewBox="0 0 24 24" aria-hidden="true">


    <path d="M5 12h14" />


    <path d="m14 7 5 5-5 5" />


  </svg>


);


const HomeIcon = () => (


  <svg viewBox="0 0 24 24" aria-hidden="true">


    <path d="m3.5 11 8.5-7 8.5 7" />


    <path d="M5.5 10v10h13V10M9.5 20v-6h5v6" />


  </svg>


);


const LogoutIcon = () => (


  <svg viewBox="0 0 24 24" aria-hidden="true">


    <path d="M10 4H5v16h5" />


    <path d="M14 8l4 4-4 4M18 12H9" />


  </svg>


);


const CheckIcon = () => (


  <svg viewBox="0 0 24 24" aria-hidden="true">


    <path d="m5 12 4 4L19 6" />


  </svg>


);


const menuItems: MenuItem[] = [


  {


    key: "dashboard",


    label: "Tổng quan",


    desc: "Dashboard hệ thống",


    icon: <DashboardIcon />,


  },


  {


    key: "account",


    label: "Tài khoản",


    desc: "Admin, Staff và User",


    icon: <AccountIcon />,


  },


  {


    key: "products",


    label: "Sản phẩm",


    desc: "Bộ sưu tập King Jades",


    icon: <ProductIcon />,


  },


  {


    key: "news",


    label: "Tin tức",


    desc: "Bài viết và layout",


    icon: <NewsIcon />,


  },


  {


    key: "contact",


    label: "Liên hệ",


    desc: "Lead tư vấn khách hàng",


    icon: <ContactIcon />,


  },


  {


    key: "service",


    label: "Dịch vụ",


    desc: "Tư vấn và chăm sóc",


    icon: <ServiceIcon />,


  },


  {


    key: "certificate",


    label: "Chứng nhận",


    desc: "Kiểm định và nguồn gốc",


    icon: <CertificateIcon />,


  },


];


const AdminDashboard: React.FC = () => {


  const navigate = useNavigate();


  const [searchParams] = useSearchParams();


  const { user, logout } = useAuth();


  const [


    activePage,


    setActivePage,


  ] = useState<AdminPage>(


    "dashboard"


  );


  const [


    isSidebarCollapsed,


    setIsSidebarCollapsed,


  ] = useState<boolean>(() => {


    if (


      typeof window ===


      "undefined"


    ) {


      return false;


    }


    return (


      window.localStorage.getItem(


        SIDEBAR_STORAGE_KEY


      ) === "true"


    );


  });


  const [


    isMobileMenuOpen,


    setIsMobileMenuOpen,


  ] = useState(false);


  useEffect(() => {


    window.localStorage.setItem(


      SIDEBAR_STORAGE_KEY,


      String(


        isSidebarCollapsed


      )


    );


  }, [isSidebarCollapsed]);


  useEffect(() => {


    setIsMobileMenuOpen(


      false


    );


  }, [activePage]);


  // Đồng bộ tab khi click từ NotificationBell


  useEffect(() => {


    const tab = searchParams.get("tab");


    if (


      tab === "contact" ||


      tab === "news" ||


      tab === "products" ||


      tab === "account"


    ) {


      setActivePage(tab as AdminPage);


    }


  }, [searchParams]);


  const username =


    user?.username || "Admin";


  const roleName =


    user?.roleName || "admin";


  const email =


    user?.email ||


    "admin@kingjades.com";


  const avatarText = username


    .trim()


    .charAt(0)


    .toUpperCase();


  const activePageLabel =


    useMemo(() => {


      return (


        menuItems.find(


          (item) =>


            item.key ===


            activePage


        )?.label ||


        "Tổng quan"


      );


    }, [activePage]);


  const handleLogout = () => {


    logout();


    navigate(


      "/login",


      {


        replace: true,


      }


    );


  };


  const handleMenuSelect = (


    key: MenuItem["key"]


  ) => {


    setActivePage(key);


    // Bỏ deep-link notification khi người dùng chủ động đổi menu.


    navigate(`/admin-dashboard?tab=${key}`, { replace: true });


    setIsMobileMenuOpen(


      false


    );


  };


  const renderComingSoon = (


    title: string,


    description: string,


    icon: React.ReactNode


  ) => {


    return (


      <div className="kj-admin-content-page">


        <header className="kj-admin-content-hero">


          <div>


            <span className="kj-admin-eyebrow">


              King Jades Admin


            </span>


            <h1>{title}</h1>


            <p>{description}</p>


          </div>


          <div className="kj-admin-content-user">


            <span>


              Đang đăng nhập


            </span>


            <strong>


              {username}


            </strong>


          </div>


        </header>


        <section className="kj-admin-coming-soon">


          <div className="kj-admin-coming-soon__icon">


            {icon}


          </div>


          <span className="kj-admin-eyebrow">


            Coming Soon


          </span>


          <h2>


            Chức năng đang được


            phát triển


          </h2>


          <p>


            Khu vực này chưa có


            module dữ liệu hoàn


            chỉnh. Bạn vẫn có thể


            tiếp tục quản lý tài


            khoản, sản phẩm, tin


            tức và lead khách hàng.


          </p>


          <button


            type="button"


            onClick={() =>


              setActivePage(


                "dashboard"


              )


            }


          >


            Quay về tổng quan


          </button>


        </section>


      </div>


    );


  };


  const renderDashboard = () => {


    return (


      <div className="kj-admin-dashboard-home">


        <section className="kj-admin-welcome">


          <div


            className="kj-admin-welcome__glow kj-admin-welcome__glow--left"


            aria-hidden="true"


          />


          <div


            className="kj-admin-welcome__glow kj-admin-welcome__glow--right"


            aria-hidden="true"


          />


          <div className="kj-admin-welcome__copy">


            <span className="kj-admin-eyebrow">


              King Jades Admin


            </span>


            <h1>


              Quản trị thương hiệu


              King Jades.


            </h1>


            <p>


              Quản lý tài khoản,


              sản phẩm, nội dung


              tin tức và yêu cầu tư


              vấn trong một không


              gian vận hành thống


              nhất.


            </p>


            <div className="kj-admin-welcome__actions">


              <button


                type="button"


                onClick={() =>


                  setActivePage(


                    "products"


                  )


                }


              >


                Quản lý sản phẩm


                <ArrowIcon />


              </button>


              <button


                type="button"


                onClick={() =>


                  setActivePage(


                    "contact"


                  )


                }


              >


                Xem lead tư vấn


              </button>


            </div>


          </div>


          <div className="kj-admin-welcome__account">


            <span>


              {avatarText || "A"}


            </span>


            <div>


              <small>


                Tài khoản hiện tại


              </small>


              <strong>


                {username}


              </strong>


              <p>


                Vai trò:{" "}


                {roleName}


              </p>


            </div>


          </div>


        </section>


        <section className="kj-admin-section">


          <header className="kj-admin-section__heading">


            <div>


              <span className="kj-admin-eyebrow">


                Management Areas


              </span>


              <h2>


                Khu vực quản trị


              </h2>


            </div>


            <p>


              Các card bên dưới dẫn


              tới những module đã có


              trong source hiện tại,


              không sử dụng số liệu


              thống kê giả.


            </p>


          </header>


          <div className="kj-admin-module-grid">


            <button


              type="button"


              className="kj-admin-module-card"


              onClick={() =>


                setActivePage(


                  "account"


                )


              }


            >


              <span className="kj-admin-module-card__index">


                01


              </span>


              <span className="kj-admin-module-card__icon">


                <AccountIcon />


              </span>


              <h3>


                Quản lý tài khoản


              </h3>


              <p>


                Tạo mới, chỉnh sửa,


                phân quyền, khóa và


                mở khóa tài khoản.


              </p>


              <strong>


                Mở Account Page


                <ArrowIcon />


              </strong>


            </button>


            <button


              type="button"


              className="kj-admin-module-card"


              onClick={() =>


                setActivePage(


                  "products"


                )


              }


            >


              <span className="kj-admin-module-card__index">


                02


              </span>


              <span className="kj-admin-module-card__icon">


                <ProductIcon />


              </span>


              <h3>


                Quản lý sản phẩm


              </h3>


              <p>


                Thêm, chỉnh sửa,


                xóa và quản lý trạng


                thái hiển thị sản


                phẩm.


              </p>


              <strong>


                Mở Product Manager


                <ArrowIcon />


              </strong>


            </button>


            <button


              type="button"


              className="kj-admin-module-card"


              onClick={() =>


                setActivePage(


                  "news"


                )


              }


            >


              <span className="kj-admin-module-card__index">


                03


              </span>


              <span className="kj-admin-module-card__icon">


                <NewsIcon />


              </span>


              <h3>


                Quản lý tin tức


              </h3>


              <p>


                Tạo bài viết, chọn


                layout và quản lý


                nội dung Journal.


              </p>


              <strong>


                Mở News Builder


                <ArrowIcon />


              </strong>


            </button>


            <button


              type="button"


              className="kj-admin-module-card"


              onClick={() =>


                setActivePage(


                  "contact"


                )


              }


            >


              <span className="kj-admin-module-card__index">


                04


              </span>


              <span className="kj-admin-module-card__icon">


                <ContactIcon />


              </span>


              <h3>


                Lead khách hàng


              </h3>


              <p>


                Theo dõi yêu cầu,


                cập nhật trạng thái


                và ghi chú nội bộ.


              </p>


              <strong>


                Mở Contact Leads


                <ArrowIcon />


              </strong>


            </button>


          </div>


        </section>


        <section className="kj-admin-overview">


          <header className="kj-admin-section__heading">


            <div>


              <span className="kj-admin-eyebrow">


                Operation Flow


              </span>


              <h2>


                Quy trình vận hành


              </h2>


            </div>


            <Link to="/">


              <HomeIcon />


              Xem website


            </Link>


          </header>


          <div className="kj-admin-overview__grid">


            <article>


              <span>01</span>


              <CheckIcon />


              <h3>


                Cập nhật nội dung


              </h3>


              <p>


                Hoàn thiện sản phẩm,


                hình ảnh và bài viết


                trước khi xuất bản.


              </p>


            </article>


            <article>


              <span>02</span>


              <CheckIcon />


              <h3>


                Kiểm tra hiển thị


              </h3>


              <p>


                Xem lại website public


                và xác nhận nội dung


                đúng định vị thương


                hiệu.


              </p>


            </article>


            <article>


              <span>03</span>


              <CheckIcon />


              <h3>


                Tiếp nhận khách hàng


              </h3>


              <p>


                Theo dõi lead, liên hệ


                khách và cập nhật trạng


                thái xử lý.


              </p>


            </article>


          </div>


        </section>


      </div>


    );


  };


  const renderContent = () => {


    if (


      activePage === "account"


    ) {


      return <AccountPage />;


    }


    if (


      activePage === "products"


    ) {


      return (


        <AdminProductsPage />


      );


    }


    if (


      activePage === "news"


    ) {


      return <AdminNewsPage />;


    }


    if (


      activePage === "contact"


    ) {


      return (


        <AdminContactLeadsPage />


      );


    }


    if (


      activePage === "service"


    ) {


      return renderComingSoon(


        "Quản lý dịch vụ",


        "Khu vực cập nhật dịch vụ tư vấn, chăm sóc và hỗ trợ khách hàng.",


        <ServiceIcon />


      );


    }


    if (


      activePage ===


      "certificate"


    ) {


      return renderComingSoon(


        "Quản lý chứng nhận",


        "Khu vực quản lý chứng nhận, kiểm định, nguồn gốc và cam kết chất lượng.",


        <CertificateIcon />


      );


    }


    return renderDashboard();


  };


  return (


    <div


      className={`kj-admin-layout ${


        isSidebarCollapsed


          ? "is-collapsed"


          : ""


      }`}


    >


      <button


        type="button"


        className={`kj-admin-backdrop ${


          isMobileMenuOpen


            ? "is-open"


            : ""


        }`}


        onClick={() =>


          setIsMobileMenuOpen(


            false


          )


        }


        aria-label="Đóng menu quản trị"


      />


      <aside


        className={`kj-admin-sidebar ${


          isMobileMenuOpen


            ? "is-mobile-open"


            : ""


        }`}


      >


        <div className="kj-admin-sidebar__brand">


          <Link


            to="/"


            aria-label="Về trang chủ King Jades"


          >


            <img


              src={kingJadesLogo}


              alt="King Jades"


            />


          </Link>


          <button


            type="button"


            className="kj-admin-sidebar__mobile-close"


            onClick={() =>


              setIsMobileMenuOpen(


                false


              )


            }


            aria-label="Đóng menu"


          >


            <CloseIcon />


          </button>


        </div>


        <div className="kj-admin-sidebar__account">


          <span>


            {avatarText || "A"}


          </span>


          <div>


            <strong>


              {username}


            </strong>


            <small>


              {roleName}


            </small>


          </div>


        </div>


        <nav


          className="kj-admin-menu"


          aria-label="Menu quản trị"


        >


          <span className="kj-admin-menu__label">


            Khu vực làm việc


          </span>


          {menuItems.map(


            (item) => {


              const isActive =


                item.key ===


                activePage;


              return (


                <button


                  type="button"


                  key={item.key}


                  className={


                    isActive


                      ? "active"


                      : ""


                  }


                  onClick={() =>


                    handleMenuSelect(


                      item.key


                    )


                  }


                  aria-current={


                    isActive


                      ? "page"


                      : undefined


                  }


                  title={


                    isSidebarCollapsed


                      ? item.label


                      : undefined


                  }


                >


                  <span className="kj-admin-menu__icon">


                    {item.icon}


                  </span>


                  <span className="kj-admin-menu__copy">


                    <strong>


                      {item.label}


                    </strong>


                    <small>


                      {item.desc}


                    </small>


                  </span>


                </button>


              );


            }


          )}


        </nav>


        <div className="kj-admin-sidebar__footer">


          <Link

            to="/admin/product-categories"

            title={

              isSidebarCollapsed

                ? "Quản lý danh mục sản phẩm"

                : undefined

            }

            onClick={() =>

              setIsMobileMenuOpen(false)

            }

          >

            <ProductIcon />


            <span>

              Quản lý danh mục sản phẩm

            </span>

          </Link>


          <Link


            to="/"


            title={


              isSidebarCollapsed


                ? "Xem website"


                : undefined


            }


          >


            <HomeIcon />


            <span>


              Xem website


            </span>


          </Link>


          <button


            type="button"


            onClick={


              handleLogout


            }


            title={


              isSidebarCollapsed


                ? "Đăng xuất"


                : undefined


            }


          >


            <LogoutIcon />


            <span>


              Đăng xuất


            </span>


          </button>


          <small>


            King Jades Admin


          </small>


        </div>


      </aside>


      <div className="kj-admin-workspace">


        <header className="kj-admin-topbar">


          <button


            type="button"


            className="kj-admin-mobile-menu"


            onClick={() =>


              setIsMobileMenuOpen(


                true


              )


            }


            aria-label="Mở menu quản trị"


          >


            <MenuIcon />


          </button>


          <button


            type="button"


            className="kj-admin-collapse-button"


            onClick={() =>


              setIsSidebarCollapsed(


                (previous) =>


                  !previous


              )


            }


            aria-label={


              isSidebarCollapsed


                ? "Mở rộng sidebar"


                : "Thu gọn sidebar"


            }


            title={


              isSidebarCollapsed


                ? "Mở rộng sidebar"


                : "Thu gọn sidebar"


            }


          >


            <CollapseIcon />


          </button>


          <div className="kj-admin-topbar__title">


    <span>


        ADMIN WORKSPACE


    </span>


    <strong>


        Tổng quan


    </strong>


</div>


<div className="kj-admin-topbar__actions">


            <div className="kj-admin-notification">


              <NotificationBell />


            </div>


            <div className="kj-admin-topbar__account">


              <span>


                {avatarText || "A"}


              </span>


              <div>


                <strong>


                  {username}


                </strong>


                <small>


                  {email}


                </small>


              </div>


            </div>


          </div>


        </header>


        <main className="kj-admin-main">


          {renderContent()}


        </main>


      </div>


    </div>


  );


};


export default AdminDashboard;
