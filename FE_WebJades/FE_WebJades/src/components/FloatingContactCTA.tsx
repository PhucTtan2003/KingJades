import React from "react";
import zaloLogo from "../assets/brand/zalo-logo.png";
import facebookLogo from "../assets/brand/facebook.png";
import "../styles/FloatingContactCTA.css";

const ZALO_URL = "https://zalo.me/3354373045960365130";
const FACEBOOK_URL = "https://www.facebook.com/vuangocphithuymyanmar";
const PHONE_NUMBER = "0901191141";
const DISPLAY_PHONE = "0901.191.141";

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7.2 3.5 10 7.7 7.9 9.8c1.4 2.8 3.6 5 6.3 6.3l2.1-2.1 4.2 2.8-.8 3.2c-.2.8-.9 1.3-1.7 1.3C9.6 21.3 2.7 14.4 2.7 6c0-.8.5-1.5 1.3-1.7l3.2-.8Z" />
  </svg>
);

const FloatingContactCTA: React.FC = () => {
  return (
    <aside className="kj-global-contact-cta" aria-label="Liên hệ nhanh">
      <a
        className="kj-global-contact-cta__item kj-global-contact-cta__item--zalo"
        href={ZALO_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Liên hệ King Jades qua Zalo"
        title="Zalo"
      >
        <img src={zaloLogo} alt="" aria-hidden="true" />
        <span>Zalo</span>
      </a>

      <a
        className="kj-global-contact-cta__item kj-global-contact-cta__item--facebook"
        href={FACEBOOK_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Mở Facebook King Jades"
        title="Facebook"
      >
        <img src={facebookLogo} alt="" aria-hidden="true" />
        <span>Facebook</span>
      </a>

      <a
        className="kj-global-contact-cta__item kj-global-contact-cta__item--phone"
        href={`tel:${PHONE_NUMBER}`}
        aria-label={`Gọi ${DISPLAY_PHONE}`}
        title={DISPLAY_PHONE}
      >
        <PhoneIcon />
        <span>{DISPLAY_PHONE}</span>
      </a>
    </aside>
  );
};

export default FloatingContactCTA;