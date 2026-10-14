import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

import kingJadesLogo from "../assets/staff/kingjades-logo-full.svg";

import "../styles/StaffDashboard.css";

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </svg>
);

const LeadIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 5.5h16v11H9l-5 3v-14Z" />
    <path d="M8 9h8M8 13h5" />
  </svg>
);

const StoreIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9h16l-1-5H5L4 9Z" />
    <path d="M5 9v10h14V9M9 19v-6h6v6" />
    <path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
  </svg>
);

const ContactIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8.2 3.8 5.8 4.9c-.7.3-1 1.1-.8 1.8 1.8 6.1 6.2 10.5 12.3 12.3.7.2 1.5-.1 1.8-.8l1.1-2.4c.3-.7.1-1.5-.6-1.9l-2.7-1.6c-.6-.3-1.3-.2-1.7.3l-1.2 1.5a14.4 14.4 0 0 1-4.1-4.1l1.5-1.2c.5-.4.6-1.1.3-1.7L10.1 4.4c-.4-.7-1.2-.9-1.9-.6Z" />
  </svg>
);

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m3.5 11 8.5-7 8.5 7" />
    <path d="M5.5 10v10h13V10M9.5 20v-6h5v6" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c.6-4 3-6 7-6s6.4 2 7 6" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M10 4H5v16h5" />
    <path d="M14 8l4 4-4 4M18 12H9" />
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

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m14 7 5 5-5 5" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [isMenuOpen, setIsMenuOpen] =
    useState(false);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 11) {
      return "Chào buổi sáng";
    }

    if (hour < 18) {
      return "Chào buổi chiều";
    }

    return "Chào buổi tối";
  }, []);

  const username =
    user?.username || "Nhân viên King Jades";

  const roleName =
    user?.roleName || "Staff";

  const avatarText = username
    .trim()
    .charAt(0)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    navigate("/login", {
      replace: true,
    });
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className="kj-staff-dashboard">
      <button
        type="button"
        className={`kj-staff-backdrop ${
          isMenuOpen ? "is-open" : ""
        }`}
        onClick={closeMenu}
        aria-label="Đóng menu"
      />

      <aside
        className={`kj-staff-sidebar ${
          isMenuOpen ? "is-open" : ""
        }`}
      >
        <div className="kj-staff-sidebar__brand">
          <Link
            to="/"
            onClick={closeMenu}
            aria-label="Về trang chủ King Jades"
          >
            <img
              src={kingJadesLogo}
              alt="King Jades"
            />
          </Link>

          <button
            type="button"
            onClick={closeMenu}
            aria-label="Đóng menu"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="kj-staff-sidebar__account">
          <span>{avatarText || "KJ"}</span>

          <div>
            <strong>{username}</strong>
            <small>{roleName}</small>
          </div>
        </div>

        <nav className="kj-staff-nav">
          <span className="kj-staff-nav__label">
            Khu vực làm việc
          </span>

          <Link
            to="/staff"
            className="active"
            onClick={closeMenu}
          >
            <DashboardIcon />
            Tổng quan
          </Link>

          <Link
            to="/admin/contact-leads"
            onClick={closeMenu}
          >
            <LeadIcon />
            Lịch sử liên hệ
          </Link>

          <span className="kj-staff-nav__label">
            Truy cập nhanh
          </span>

          <Link
            to="/products"
            onClick={closeMenu}
          >
            <StoreIcon />
            Xem sản phẩm
          </Link>

          <Link
            to="/contact"
            onClick={closeMenu}
          >
            <ContactIcon />
            Trang liên hệ
          </Link>

          <Link
            to="/"
            onClick={closeMenu}
          >
            <HomeIcon />
            Trang chủ website
          </Link>
        </nav>

        <div className="kj-staff-sidebar__footer">
          <button
            type="button"
            onClick={handleLogout}
          >
            <LogoutIcon />
            Đăng xuất
          </button>

          <small>
            King Jades Staff Workspace
          </small>
        </div>
      </aside>

      <div className="kj-staff-workspace">
        <header className="kj-staff-topbar">
          <button
            type="button"
            className="kj-staff-menu-button"
            onClick={() =>
              setIsMenuOpen(true)
            }
            aria-label="Mở menu"
          >
            <MenuIcon />
          </button>

          <div className="kj-staff-topbar__title">
            <span>Staff Dashboard</span>
            <strong>
              Không gian làm việc nhân viên
            </strong>
          </div>

          <div className="kj-staff-topbar__account">
            <span>{avatarText || "KJ"}</span>

            <div>
              <strong>{username}</strong>
              <small>{roleName}</small>
            </div>
          </div>
        </header>

        <main className="kj-staff-main">
          <section className="kj-staff-welcome">
            <div
              className="kj-staff-welcome__glow kj-staff-welcome__glow--left"
              aria-hidden="true"
            />
            <div
              className="kj-staff-welcome__glow kj-staff-welcome__glow--right"
              aria-hidden="true"
            />

            <div className="kj-staff-welcome__content">
              <span className="kj-staff-eyebrow">
                King Jades Staff
              </span>

              <h1>
                {greeting}, {username}.
              </h1>

              <p>
                Tiếp nhận yêu cầu của khách hàng,
                theo dõi lịch sử liên hệ và truy
                cập nhanh các khu vực cần thiết
                trên website King Jades.
              </p>

              <div className="kj-staff-welcome__actions">
                <Link to="/admin/contact-leads">
                  Mở danh sách liên hệ
                  <ArrowIcon />
                </Link>

                <Link to="/">
                  Xem website
                </Link>
              </div>
            </div>

            <div className="kj-staff-welcome__status">
              <span>
                <CheckIcon />
              </span>

              <div>
                <small>Trạng thái tài khoản</small>
                <strong>
                  Đang hoạt động
                </strong>
                <p>
                  Vai trò hiện tại: {roleName}
                </p>
              </div>
            </div>
          </section>

          <section className="kj-staff-section">
            <header className="kj-staff-section__heading">
              <div>
                <span className="kj-staff-eyebrow">
                  Main Workspace
                </span>

                <h2>
                  Công việc chính
                </h2>
              </div>

              <p>
                Staff hiện được phân quyền xem và
                cập nhật trạng thái các lead khách
                hàng gửi từ Contact Page và giỏ
                sản phẩm.
              </p>
            </header>

            <div className="kj-staff-action-grid">
              <Link
                to="/admin/contact-leads"
                className="kj-staff-action-card kj-staff-action-card--primary"
              >
                <div className="kj-staff-action-card__icon">
                  <LeadIcon />
                </div>

                <span className="kj-staff-eyebrow">
                  Contact Leads
                </span>

                <h3>
                  Lịch sử liên hệ khách hàng
                </h3>

                <p>
                  Xem các yêu cầu được gửi từ
                  Contact Page, Product Page và
                  giỏ sản phẩm; cập nhật trạng
                  thái xử lý theo quy trình hiện
                  tại.
                </p>

                <strong>
                  Mở khu vực xử lý
                  <ArrowIcon />
                </strong>
              </Link>

              <div className="kj-staff-action-card">
                <div className="kj-staff-action-card__icon">
                  <UserIcon />
                </div>

                <span className="kj-staff-eyebrow">
                  Staff Account
                </span>

                <h3>
                  Thông tin phiên đăng nhập
                </h3>

                <dl>
                  <div>
                    <dt>Tài khoản</dt>
                    <dd>{username}</dd>
                  </div>

                  <div>
                    <dt>Vai trò</dt>
                    <dd>{roleName}</dd>
                  </div>

                  <div>
                    <dt>Quyền chính</dt>
                    <dd>
                      Contact Leads
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section className="kj-staff-section kj-staff-section--quick">
            <header className="kj-staff-section__heading">
              <div>
                <span className="kj-staff-eyebrow">
                  Quick Access
                </span>

                <h2>
                  Truy cập nhanh website
                </h2>
              </div>

              <p>
                Mở các trang public để kiểm tra
                nội dung hoặc hỗ trợ khách hàng
                trong lúc tư vấn.
              </p>
            </header>

            <div className="kj-staff-quick-grid">
              <Link to="/">
                <span>
                  <HomeIcon />
                </span>

                <div>
                  <strong>Trang chủ</strong>
                  <small>
                    Kiểm tra nội dung homepage
                  </small>
                </div>

                <ArrowIcon />
              </Link>

              <Link to="/products">
                <span>
                  <StoreIcon />
                </span>

                <div>
                  <strong>Sản phẩm</strong>
                  <small>
                    Xem bộ sưu tập đang hiển thị
                  </small>
                </div>

                <ArrowIcon />
              </Link>

              <Link to="/contact">
                <span>
                  <ContactIcon />
                </span>

                <div>
                  <strong>Liên hệ</strong>
                  <small>
                    Kiểm tra form khách hàng
                  </small>
                </div>

                <ArrowIcon />
              </Link>
            </div>
          </section>

          <section className="kj-staff-guideline">
            <div>
              <span className="kj-staff-eyebrow">
                Working Note
              </span>

              <h2>
                Gợi ý quy trình tiếp nhận lead
              </h2>
            </div>

            <ol>
              <li>
                <span>01</span>
                <p>
                  Mở danh sách lịch sử liên hệ và
                  kiểm tra yêu cầu mới.
                </p>
              </li>

              <li>
                <span>02</span>
                <p>
                  Đọc sản phẩm quan tâm, nội dung
                  và kênh liên hệ ưu tiên.
                </p>
              </li>

              <li>
                <span>03</span>
                <p>
                  Liên hệ khách hàng và cập nhật
                  trạng thái xử lý trong hệ thống.
                </p>
              </li>
            </ol>
          </section>
        </main>
      </div>
    </div>
  );
};

export default StaffDashboard;