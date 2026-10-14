import React from "react";
import { Link, useNavigate } from "react-router-dom";
import kingJadesFooterLogo from "../assets/brand/kingjades-logo-footer.svg";
import kingJadesFooterLogoFooter from "../assets/Footer/Footer1.png";
import "../styles/Footer.css";
import GoogleMapsReviews from "./GoogleMapsReviews";

const ZALO_URL = "https://zalo.me/3354373045960365130";
const FACEBOOK_URL = "https://www.facebook.com/vuangocphithuymyanmar"; // Thay bằng link Facebook Page King Jades của bạn
const SALE_TRINH_PHONE = "0901191141";
const SALE_TRINH_DISPLAY = "0901 191 141";
const HOTLINE_PHONE = "0388191141";
const HOTLINE_DISPLAY = "0388 191 141";
const AI_MI_PHONE = "0385911141";
const AI_MI_DISPLAY = "0385 911 141";

const EMAIL = "info@kingjades.com.vn";

const LocationIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7.2 3.5 10 7.7 7.9 9.8c1.4 2.8 3.6 5 6.3 6.3l2.1-2.1 4.2 2.8-.8 3.2c-.2.8-.9 1.3-1.7 1.3C9.6 21.3 2.7 14.4 2.7 6c0-.8.5-1.5 1.3-1.7l3.2-.8Z" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M14 7l5 5-5 5" />
  </svg>
);


const BrandIcon = () => (
  <svg
    viewBox="0 0 100 100"
    aria-hidden="true"
    className="kj-footer-brand-icon"
    fill="none"
    stroke="currentColor"
    strokeWidth="3.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="50" cy="50" r="44" />
    <circle cx="50" cy="50" r="5.5" />
    <path d="M50 6v88M6 50h88M18.9 18.9l62.2 62.2M81.1 18.9 18.9 81.1" />
    <path d="M50 6 74.5 25.5 94 50 74.5 74.5 50 94 25.5 74.5 6 50 25.5 25.5 50 6Z" />
    <path d="M50 6 61.8 38.2 94 50 61.8 61.8 50 94 38.2 61.8 6 50 38.2 38.2 50 6Z" />
    <path d="M25.5 25.5 50 50 74.5 25.5M25.5 74.5 50 50 74.5 74.5" />
  </svg>
);

const Footer: React.FC = () => {
  const navigate = useNavigate();

  const handleSubscribe = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();

    navigate("/contact", {
      state: {
        fromFooter: true,
        email,
      },
    });
  };

  return (
    <footer className="kj-footer">
      <div className="kj-footer-pattern" aria-hidden="true" />
      <div
        className="kj-footer-orbit kj-footer-orbit-left"
        aria-hidden="true"
      />
      <div
        className="kj-footer-orbit kj-footer-orbit-right"
        aria-hidden="true"
      />

      <div className="kj-footer-container">
        <section
          className="kj-footer-brand"
          aria-label="Thông tin King Jades"
        >
          <Link
            to="/"
            className="kj-footer-logo"
            aria-label="King Jades - về trang chủ"
          >
            <img src={kingJadesFooterLogo} alt="King Jades" />
          </Link>

          

          <p className="kj-footer-description">
            King Jades tôn vinh vẻ đẹp ngọc phỉ thúy tự nhiên qua tuyển chọn
            tinh tế, tư vấn cá nhân hóa và dịch vụ chăm sóc bền vững theo thời
            gian.
          </p>

          <div className="kj-footer-brand-actions">
            <a
              href={ZALO_URL}
              target="_blank"
              rel="noreferrer"
              className="kj-footer-zalo"
            >
              Tư vấn Zalo
              <ArrowIcon />
            </a>

            <Link to="/contact" className="kj-footer-outline-action">
              Đặt lịch riêng
            </Link>
          </div>
        </section>

        <section
          className="kj-footer-link-group kj-footer-mobile-hidden"
          aria-labelledby="footer-explore-title"
        >
          <span className="kj-footer-kicker">Khám phá</span>

          <h2 id="footer-explore-title">King Jades</h2>

          <nav aria-label="Khám phá King Jades">
            <Link to="/">Trang chủ</Link>
            <a href="/#about">Về thương hiệu</a>
            <Link to="/products">Bộ sưu tập</Link>
            <a href="/#fengshui">Xem ngọc hợp mệnh</a>
            <Link to="/news">Kiến thức ngọc</Link>
          </nav>
        </section>

        <section
          className="kj-footer-link-group kj-footer-mobile-hidden"
          aria-labelledby="footer-service-title"
        >
          <span className="kj-footer-kicker">Đồng hành</span>

          <h2 id="footer-service-title">Dịch vụ</h2>

          <nav aria-label="Dịch vụ King Jades">
            <Link to="/contact">Đặt lịch tư vấn</Link>
            <a href="http://pm.liulab.edu.vn/clients">Tra cứu kiểm định</a>
            <Link to="/cau-chuyen-thuong-hieu">Bảo hành & chăm sóc</Link>
            <Link to="/cau-chuyen-thuong-hieu">Chính sách bảo mật</Link>
          </nav>
        </section>

        {/* Mobile ONLY: thay hai cot Khám phá/Dịch vụ bằng đánh giá Google Maps */}
        <div className="kj-footer-google-reviews-mobile">
          <GoogleMapsReviews />
        </div>

        <section
          className="kj-footer-private-card"
          aria-labelledby="footer-private-title"
        >
          <span className="kj-footer-kicker">Private consultation</span>

          <h2 id="footer-private-title">Nhận thông tin riêng</h2>

          <p>
            Đăng ký email để nhận bộ sưu tập mới, tác phẩm giới hạn và lịch tư
            vấn chọn ngọc theo nhu cầu cá nhân.
          </p>

          <form className="kj-footer-subscribe" onSubmit={handleSubscribe}>
            <label className="kj-visually-hidden" htmlFor="footer-email">
              Email của quý khách
            </label>

            <input
              id="footer-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Email của quý khách"
              required
            />

            <button type="submit" aria-label="Gửi email đăng ký">
              Gửi
              <ArrowIcon />
            </button>
          </form>

          <div className="kj-footer-company-box">
            <span className="kj-footer-company-mark">
  <img
    src={kingJadesFooterLogoFooter}
    alt="King Jades"
    className="kj-footer-company-logo"
  />
</span>

            <div className="kj-footer-company-info">
              <strong>Công ty King Jades</strong>
              <span>Mã số thuế: 0315822999</span>
              <span>Sở KH&ĐT TP.HCM cấp ngày 15/07/2019</span>
            </div>
          </div>
        </section>
      </div>

      <div className="kj-footer-contact-strip">
        <div className="kj-footer-contact-item">
          <span className="kj-footer-contact-icon">
            <LocationIcon />
          </span>

          <div>
            <small>Showroom Quận 10</small>
            <p>
              388 Nguyễn Tri Phương, Phường Vườn Lài, TP.HCM.
            </p>
          </div>
        </div>

        <div className="kj-footer-contact-item kj-footer-contact-item--phones">
          <div className="kj-footer-phone-list" aria-label="Số điện thoại King Jades">
            <a href={`tel:${SALE_TRINH_PHONE}`} className="kj-footer-phone-row">
              <span className="kj-footer-contact-icon">
                <PhoneIcon />
              </span>
              <span className="kj-footer-phone-copy">
                <small>Sale Trinh</small>
                <strong>{SALE_TRINH_DISPLAY}</strong>
              </span>
            </a>

            <a href={`tel:${HOTLINE_PHONE}`} className="kj-footer-phone-row">
              <span className="kj-footer-contact-icon">
                <PhoneIcon />
              </span>
              <span className="kj-footer-phone-copy">
                <small>Hotline</small>
                <strong>{HOTLINE_DISPLAY}</strong>
              </span>
            </a>

            <a href={`tel:${AI_MI_PHONE}`} className="kj-footer-phone-row">
              <span className="kj-footer-contact-icon">
                <PhoneIcon />
              </span>
              <span className="kj-footer-phone-copy">
                <small>Ái Mi</small>
                <strong>{AI_MI_DISPLAY}</strong>
              </span>
            </a>
          </div>
        </div>

        <a className="kj-footer-contact-item" href={`mailto:${EMAIL}`}>
          <span className="kj-footer-contact-icon">
            <MailIcon />
          </span>

          <div>
            <small>Email</small>
            <p>{EMAIL}</p>
          </div>
        </a>
      </div>

      <div className="kj-footer-bottom">
        <p>© {new Date().getFullYear()} King Jades. All rights reserved.</p>

        <nav aria-label="Liên kết cuối trang">
          <a href="/#certificate">Kiểm định</a>
          <span aria-hidden="true">•</span>
          <a href="/#fengshui">Chọn ngọc hợp mệnh</a>
          <span aria-hidden="true">•</span>
          <Link to="/contact">Liên hệ tư vấn</Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;