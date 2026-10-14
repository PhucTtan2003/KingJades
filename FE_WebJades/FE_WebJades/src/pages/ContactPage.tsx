import React, { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  contactApi,
  PreferredContactChannel,
} from "../api/contactapi";
import serviceContactImage from "../assets/contact/service-contact.png";
import customerStory01 from "../assets/contact/1.png";
import customerStory02 from "../assets/contact/2.png";
import customerStory03 from "../assets/contact/3.png";
import customerStory04 from "../assets/contact/customer-story-04.jpg";
import customerStory05 from "../assets/contact/5.png";
import customerStory06 from "../assets/contact/customer-story-06.png";
import contactPattern from "../assets/contact/form-pattern.svg";
import "../styles/ContactPage.css";
type ContactFormState = {
  fullName: string;
  phone: string;
  phoneCountryCode: string;
  email: string;
  need: string;
  preferredContactChannel: PreferredContactChannel;
  message: string;
};
type FooterContactNavigationState = {
  fromFooter?: boolean;
  email?: string;
};
const HOTLINE_DISPLAY = "0901191141";
const HOTLINE_LINK = "0901191141";
const ZALO_URL = `https://zalo.me/3354373045960365130`;
// Mã quốc gia dùng riêng ở giao diện; API vẫn nhận một trường phone.
const phoneCountryOptions = [
  { code: "+84", name: "Việt Nam", nationalPrefix: "0" },
  { code: "+1", name: "Mỹ / Canada", nationalPrefix: "" },
  { code: "+44", name: "Anh", nationalPrefix: "0" },
  { code: "+61", name: "Úc", nationalPrefix: "0" },
  { code: "+65", name: "Singapore", nationalPrefix: "" },
  { code: "+66", name: "Thái Lan", nationalPrefix: "0" },
  { code: "+60", name: "Malaysia", nationalPrefix: "0" },
  { code: "+81", name: "Nhật Bản", nationalPrefix: "0" },
  { code: "+82", name: "Hàn Quốc", nationalPrefix: "0" },
  { code: "+86", name: "Trung Quốc", nationalPrefix: "0" },
  { code: "+852", name: "Hồng Kông", nationalPrefix: "" },
  { code: "+886", name: "Đài Loan", nationalPrefix: "0" },
  { code: "+855", name: "Campuchia", nationalPrefix: "0" },
  { code: "+856", name: "Lào", nationalPrefix: "0" },
  { code: "+33", name: "Pháp", nationalPrefix: "0" },
  { code: "+49", name: "Đức", nationalPrefix: "0" },
  { code: "+39", name: "Ý", nationalPrefix: "" },
  { code: "+34", name: "Tây Ban Nha", nationalPrefix: "" },
  { code: "+91", name: "Ấn Độ", nationalPrefix: "0" },
  { code: "+971", name: "UAE", nationalPrefix: "0" },
];
const getPhoneMaxLength = (countryCode: string) => {
  if (countryCode === "+84") return 9;
  const country = phoneCountryOptions.find((item) => item.code === countryCode);
  // E.164: tối đa 15 chữ số sau khi ghép mã quốc gia và bỏ tiền tố nội địa.
  return 15 - countryCode.slice(1).length + (country?.nationalPrefix.length || 0);
};
const normalizePhoneInput = (value: string, countryCode: string) => {
  const text = value.trim();
  let digits = text.replace(/[^0-9]/g, "");
  const callingCode = countryCode.slice(1);
  const internationalPrefix = text.startsWith("+")
    ? callingCode
    : text.startsWith("00")
      ? `00${callingCode}`
      : "";
  // Hỗ trợ dán cả +84 901 191 141 hoặc 0084 901 191 141.
  if (internationalPrefix && digits.startsWith(internationalPrefix)) {
    digits = digits.slice(internationalPrefix.length);
  }
  if (countryCode === "+84") {
    digits = digits.replace(/^0+/, "");
  }
  return digits.slice(0, getPhoneMaxLength(countryCode));
};
const buildContactPhone = (phone: string, countryCode: string) => {
  const country = phoneCountryOptions.find((item) => item.code === countryCode);
  const prefix = country?.nationalPrefix || "";
  const nationalNumber = prefix && phone.startsWith(prefix)
    ? phone.slice(prefix.length)
    : phone;
  return `${countryCode}${nationalNumber}`;
};
const validateContactPhone = (phone: string, countryCode: string) => {
  if (!phone) return "Vui lòng nhập số điện thoại.";
  if (!phoneCountryOptions.some((item) => item.code === countryCode)) {
    return "Vui lòng chọn mã quốc gia hợp lệ.";
  }
  if (countryCode === "+84" && !/^[1-9][0-9]{8}$/.test(phone)) {
    return "Số điện thoại Việt Nam phải có đúng 9 chữ số, không có số 0 ở đầu.";
  }
  if (!/^[0-9]+$/.test(phone)) {
    return "Số điện thoại chỉ được chứa chữ số.";
  }
  const internationalPhone = buildContactPhone(phone, countryCode);
  const nationalLength = internationalPhone.length - countryCode.length;
  if (nationalLength < 6 || internationalPhone.slice(1).length > 15) {
    return "Số điện thoại chưa đúng độ dài. Vui lòng kiểm tra mã quốc gia và số điện thoại.";
  }
  return "";
};
const needOptions = [
  "Tư vấn chọn sản phẩm",
  "Báo giá sản phẩm",
  "Chọn ngọc theo bản mệnh",
  "Hỏi về kiểm định / nguồn gốc",
  "Đặt lịch xem sản phẩm",
  "Liên hệ khác",
];
const contactChannelOptions: {
  value: PreferredContactChannel;
  label: string;
}[] = [
  { value: "zalo", label: "Zalo" },
  { value: "phone", label: "Điện thoại" },
  { value: "email", label: "Email" },
];
const customerStories = [
  {
    number: "01",
    image: customerStory01,
    alt: "Khách hàng được King Jades hỗ trợ xác nhận thông tin tại bàn tư vấn",
    title: "Chồng dẫn mua tìm ngọc vì vợ hay mất ngủ",
    text: "Vợ thời gian gần đây thường xuyên bị mất ngủ, trằn trọc và mệt mỏi. muốn tìm một chiếc vòng ngọc tự nhiên mang năng lượng bình an, hỗ trợ tĩnh tâm để giúp vợ ngủ ngon hơn, đồng thời kết hợp làm món quà kỷ niệm gắn kết tình cảm của hai người.",
  },
  {
    number: "02",
    image: customerStory02,
    alt: "Khách hàng trải nghiệm vòng ngọc cùng đội ngũ King Jades tại cửa hàng",
    title: "Tìm thấy vòng ngọc cho gu thời trang cá tính",
    text: "Là một người cực kỳ mê ngọc thì King Jades đúng là thiên đường luôn! Ở ngoài mẫu mã đa dạng mà chất ngọc trong, mát lịm. Mấy bạn tư vấn đúng gu, hỗ trợ mình thử từng chiếc một để chọn được màu chuẩn nhất với da và mang năng lượng cá nhân.",
  },
  {
    number: "03",
    image: customerStory03,
    alt: "Nhân viên King Jades đồng hành cùng khách hàng lựa chọn sản phẩm",
    title: "Biết đến King Jades qua lời giới thiệu của bạn bè",
    text: "Mình biết đến King Jades qua lời giới thiệu của một người bạn Việt Nam. vì thích nét văn hóa truyền thống phương Đông. Cửa hàng rất đón tiếp chu đáo, các bạn nhân viên tư vấn cực kỳ tinh tế và kiên nhẫn giải thích ý nghĩa phong thủy của từng chiếc vòng. Rất hạnh phúc vì đã chọn được món quà kỷ niệm vừa vặn và xinh đẹp mang về ",
  },
  {
    number: "04",
    image: customerStory04,
    alt: "Khách hàng và nhân viên King Jades lưu lại khoảnh khắc sau khi lựa chọn sản phẩm",
    title: "Tự thưởng bản thân món quà năng lượng đầu tiên tại King Jades",
    text: "Ban đầu cứ sợ phong cách của mình hơi cá tính thì đeo ngọc không hợp, nhưng lúc tới King Jades được chị nhân viên tư vấn tận tình lắm!\n\nKing Jades hỗ trợ chọn đúng dòng ngọc hợp mệnh, thiết kế vừa hiện đại vừa tôn da. Từ nay có thêm 'bùa may mắn' đồng hành trong công việc rồi, cảm ơn King Jades nha.",
  },
  {
    number: "05",
    image: customerStory05,
    alt: "Đội ngũ King Jades tư vấn khách hàng tại quầy trưng bày",
    title: "Món quà bình an dành tặng mẹ tại King Jades",
    text: "Muốn tặng Mẹ chiếc vòng ngọc dưỡng thân, hỗ trợ sức khỏe từ lâu rồi nhưng lần nào nói Mẹ cũng xót tiền rồi gạt đi. Tới hôm nay mới 'dụ' được Mẹ ghé King Jades.\n\nLúc mới vào Mẹ vẫn còn e ngại lắm, nhưng mấy bạn tư vấn ở đây siêu tâm lý và kiên nhẫn, trò chuyện cởi mở giải thích kỹ về chất ngọc cũng như công dụng hỗ trợ sức khỏe cho người lớn tuổi. Chọn được chiếc vòng vừa vặn, Mẹ đeo vào tay cứ ngắm nghía mãi rồi cười tươi rói. Cảm ơn King Jades đã giúp hai mẹ con có một trải nghiệm thật trọn vẹn và ý nghĩa!",
  },
  {
    number: "06",
    image: customerStory06,
    alt: "Khách hàng hoàn tất thông tin cùng nhân viên tư vấn King Jades",
    title: "Mua ngọc chọn niềm tin – dịch vụ minh bạch tại King Jades",
    text: "Giá trị một món ngọc tự nhiên không hề nhỏ nên tôi là người cực kỳ cẩn thận khi lựa chọn nơi mua. Điểm khiến tôi hoàn toàn bị thuyết phục tại King Jades chính là sự chỉn chu và quy trình làm việc rất rõ ràng. Từ khâu tư vấn, cung cấp thông tin sản phẩm đến các bước điền thông tin, ký xác nhận bảo hành và kiểm định đều được đội ngũ hỗ trợ làm tỉ mỉ từng chút một. Mua ngọc mà cảm thấy vô cùng yên tâm và hài lòng. Rất đáng tin cậy!",
  },
];
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8.2 3.8 5.8 4.9c-.7.3-1 1.1-.8 1.8 1.8 6.1 6.2 10.5 12.3 12.3.7.2 1.5-.1 1.8-.8l1.1-2.4c.3-.7.1-1.5-.6-1.9l-2.7-1.6c-.6-.3-1.3-.2-1.7.3l-1.2 1.5a14.4 14.4 0 0 1-4.1-4.1l1.5-1.2c.5-.4.6-1.1.3-1.7L10.1 4.4c-.4-.7-1.2-.9-1.9-.6Z" />
  </svg>
);
const MessageIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 5.5h16v11H9l-5 3v-14Z" />
    <path d="M8 9h8M8 13h5" />
  </svg>
);
const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m14 7 5 5-5 5" />
  </svg>
);
const ContactPage: React.FC = () => {
  const location = useLocation();
  const footerState =
    (location.state as FooterContactNavigationState | null) || null;
  const footerEmail =
    footerState?.fromFooter
      ? (footerState.email || "").trim()
      : "";
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("productId") || "";
  const productName = searchParams.get("productName") || "";
  const productSlug = searchParams.get("productSlug") || "";
  const source = productId || productName
    ? "product_detail"
    : footerState?.fromFooter
      ? "footer_email"
      : "contact_page";
  const [form, setForm] = useState<ContactFormState>({
    fullName: "",
    phone: "",
    phoneCountryCode: "+84",
    email: footerEmail,
    need: productName
      ? "Báo giá sản phẩm"
      : "Tư vấn chọn sản phẩm",
    preferredContactChannel:
      footerEmail ? "email" : "zalo",
    message: productName
      ? `Tôi muốn được tư vấn và báo giá sản phẩm: ${productName}`
      : "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sentAt, setSentAt] = useState("");
  const productLink = useMemo(() => {
    if (!productSlug) return "";
    return `/products/${productSlug}`;
  }, [productSlug]);
  const updateField = (
    field: keyof ContactFormState,
    value: string
  ) => {
    setForm((previous) => {
      if (field === "phoneCountryCode") {
        return {
          ...previous,
          phoneCountryCode: value,
          phone: normalizePhoneInput(previous.phone, value),
        };
      }
      return {
        ...previous,
        [field]: field === "phone"
          ? normalizePhoneInput(value, previous.phoneCountryCode)
          : value,
      };
    });
  };
  const validateForm = () => {
    if (!form.fullName.trim()) {
      return "Vui lòng nhập họ tên.";
    }
    const phoneError = validateContactPhone(form.phone, form.phoneCountryCode);
    if (phoneError) return phoneError;
    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      return "Email chưa đúng định dạng.";
    }
    return "";
  };
  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      setSuccessMessage("");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");
      setSentAt("");
      const data = await contactApi.createContactLead({
        fullName: form.fullName.trim(),
        phone: buildContactPhone(form.phone, form.phoneCountryCode),
        email: form.email.trim(),
        need: form.need,
        preferredContactChannel:
          form.preferredContactChannel,
        message: form.message.trim(),
        productId,
        productName,
        productSlug,
        source,
      });
      setSuccessMessage(
        data.message ||
          "King Jades đã nhận thông tin. Đội ngũ tư vấn sẽ liên hệ lại sớm."
      );
      if (data.lead?.createdAtUtc) {
        setSentAt(data.lead.createdAtUtc);
      }
      setForm((previous) => ({
        ...previous,
        fullName: "",
        phone: "",
        email: "",
        message: productName
          ? `Tôi muốn được tư vấn và báo giá sản phẩm: ${productName}`
          : "",
      }));
    } catch (requestError) {
      const apiError = requestError as Error;
      setError(
        apiError.message ||
          "Không thể gửi thông tin liên hệ lúc này."
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Header />
      <div className="kj-contact-page">
        <main className="kj-contact-main">
          <section className="kj-contact-hero">
            <div
              className="kj-contact-hero__pattern"
              style={{
                backgroundImage: `url(${contactPattern})`,
              }}
              aria-hidden="true"
            />
            <div
              className="kj-contact-hero__glow kj-contact-hero__glow--left"
              aria-hidden="true"
            />
            <div
              className="kj-contact-hero__glow kj-contact-hero__glow--right"
              aria-hidden="true"
            />
            <div className="kj-contact-shell kj-contact-hero__inner">
              <div className="kj-contact-visual">
                <div className="kj-contact-visual__image">
                  <img
                    src={serviceContactImage}
                    alt="Đội ngũ tư vấn King Jades"
                  />
                  <div className="kj-contact-visual__badge">
                    <span>CHĂM SÓC TỪ KING JADES</span>
                    <strong>Tư vấn riêng 1:1</strong>
                  </div>
                </div>
                <div className="kj-contact-guidance-card">
                  <span className="kj-contact-eyebrow">
                    ĐỒNG HÀNH CÙNG BẠN
                  </span>
                  <h1 className="kj-contact-guidance-title">
                    Kết nối để chọn đúng món ngọc dành cho bạn.
                  </h1>
                  <p>
                    Đội ngũ King Jades tiếp nhận nhu cầu về
                    sản phẩm, size vòng, màu sắc, kiểm định và
                    tư vấn theo bản mệnh.
                  </p>
                  <div className="kj-contact-visual__quick-actions">
                    <a href={`tel:${HOTLINE_LINK}`}>
                      <PhoneIcon />
                      Gọi {HOTLINE_DISPLAY}
                    </a>
                    <a
                      href={ZALO_URL}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageIcon />
                      Nhắn Zalo
                    </a>
                  </div>
                </div>
              </div>
              <div className="kj-contact-form-card">
                <div className="kj-contact-form-card__heading">
                  <div>
                    <span className="kj-contact-eyebrow">
                      KẾT NỐI CÙNG KING JADES
                    </span>
                    <h2>Gửi yêu cầu tư vấn</h2>
                    <p>
                      Điền thông tin bên dưới. Đội ngũ tư vấn sẽ
                      liên hệ theo kênh bạn ưu tiên.
                    </p>
                  </div>
                  {productName && (
                    <div className="kj-contact-product-reference">
                      <span>Sản phẩm quan tâm</span>
                      {productLink ? (
                        <Link to={productLink}>
                          {productName}
                        </Link>
                      ) : (
                        <strong>{productName}</strong>
                      )}
                    </div>
                  )}
                </div>
                {successMessage && (
                  <div className="kj-contact-alert kj-contact-alert--success">
                    <strong>{successMessage}</strong>
                    {sentAt && (
                      <span>
                        Gửi lúc:{" "}
                        {new Date(sentAt).toLocaleString(
                          "vi-VN"
                        )}
                      </span>
                    )}
                  </div>
                )}
                {error && (
                  <div className="kj-contact-alert kj-contact-alert--error">
                    {error}
                  </div>
                )}
                <form
                  className="kj-contact-form"
                  onSubmit={handleSubmit}
                  noValidate
                >
                  <div className="kj-contact-form__grid">
                    <label className="kj-contact-field">
                      <span>
                        Họ và tên <b>*</b>
                      </span>
                      <input
                        value={form.fullName}
                        onChange={(event) =>
                          updateField(
                            "fullName",
                            event.target.value
                          )
                        }
                        placeholder="Nhập họ tên"
                        autoComplete="name"
                      />
                    </label>
                    <div className="kj-contact-field" role="group" aria-labelledby="kj-contact-phone-label">
                      <span id="kj-contact-phone-label">
                        Số điện thoại <b>*</b>
                      </span>
                      <div className="kj-contact-phone-control">
                        <div className="kj-contact-phone-code-wrap">
                          <select
                            className="kj-contact-phone-code"
                            aria-label="Mã quốc gia"
                            autoComplete="tel-country-code"
                            value={form.phoneCountryCode}
                            onChange={(event) => updateField("phoneCountryCode", event.target.value)}
                          >
                            {phoneCountryOptions.map((country) => (
                              <option key={country.code} value={country.code}>
                                {country.code} {country.name}
                              </option>
                            ))}
                          </select>
                          {/* Mobile chỉ hiện mã số khi đóng; mở select vẫn đủ mã + quốc gia. */}
                          <span className="kj-contact-phone-code-value" aria-hidden="true">
                            {form.phoneCountryCode}
                          </span>
                        </div>
                        <input
                          className="kj-contact-phone-number"
                          aria-labelledby="kj-contact-phone-label"
                          aria-describedby="kj-contact-phone-hint"
                          aria-required="true"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          value={form.phone}
                          maxLength={getPhoneMaxLength(form.phoneCountryCode)}
                          onChange={(event) => updateField("phone", event.target.value)}
                          onPaste={(event) => {
                            // Xử lý trước maxLength để không cắt nhầm mã +84 khi dán.
                            event.preventDefault();
                            const input = event.currentTarget;
                            const start = input.selectionStart ?? 0;
                            const end = input.selectionEnd ?? input.value.length;
                            const pastedValue = event.clipboardData.getData("text");
                            updateField(
                              "phone",
                              input.value.slice(0, start) + pastedValue + input.value.slice(end)
                            );
                          }}
                          placeholder={form.phoneCountryCode === "+84" ? "VD: 901191141" : "Số điện thoại"}
                        />
                      </div>
                      <small className="kj-contact-phone-hint" id="kj-contact-phone-hint">
                        {form.phoneCountryCode === "+84"
                          ? "Nhập đúng 9 chữ số, bỏ số 0 đầu."
                          : `Nhập số điện thoại của bạn; mã ${form.phoneCountryCode} đã chọn ở bên cạnh.`}
                      </small>
                    </div>
                    <label className="kj-contact-field">
                      <span>Email</span>
                      <input
                        value={form.email}
                        onChange={(event) =>
                          updateField(
                            "email",
                            event.target.value
                          )
                        }
                        placeholder="example@gmail.com"
                        type="email"
                        autoComplete="email"
                      />
                    </label>
                    <label className="kj-contact-field">
                      <span>Nhu cầu tư vấn</span>
                      <select
                        value={form.need}
                        onChange={(event) =>
                          updateField(
                            "need",
                            event.target.value
                          )
                        }
                      >
                        {needOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <fieldset className="kj-contact-channel">
                    <legend>Kênh liên hệ ưu tiên</legend>
                    <div>
                      {contactChannelOptions.map((item) => (
                        <label key={item.value}>
                          <input
                            type="radio"
                            name="preferredContactChannel"
                            value={item.value}
                            checked={
                              form.preferredContactChannel ===
                              item.value
                            }
                            onChange={() =>
                              updateField(
                                "preferredContactChannel",
                                item.value
                              )
                            }
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="kj-contact-field">
                    <span>Nội dung cần tư vấn</span>
                    <textarea
                      value={form.message}
                      onChange={(event) =>
                        updateField(
                          "message",
                          event.target.value
                        )
                      }
                      rows={5}
                      placeholder="Sản phẩm quan tâm, size cổ tay, màu sắc, ngân sách dự kiến hoặc câu hỏi về kiểm định..."
                    />
                  </label>
                  <button
                    type="submit"
                    className="kj-contact-submit"
                    disabled={loading}
                  >
                    {loading
                      ? "Đang gửi..."
                      : "Gửi yêu cầu tư vấn"}
                    {!loading && <ArrowIcon />}
                  </button>
                </form>
              </div>
            </div>
          </section>
            <section className="kj-customer-stories" aria-labelledby="kj-customer-stories-title">
              <div className="kj-contact-shell">
                <header className="kj-customer-stories__heading">
                  <div>
                    <span className="kj-contact-eyebrow">
                     TRẢI NGHIỆM THỰC TẾ
                    </span>
                    <h2 id="kj-customer-stories-title">
                      Câu chuyện khách hàng.
                    </h2>
                  </div>
                  <p>
                    Những khoảnh khắc thật trong quá trình King Jades lắng nghe,
                    tư vấn và đồng hành cùng khách hàng khi lựa chọn món ngọc phù hợp.
                  </p>
                </header>
                <div className="kj-customer-stories__grid">
                  {customerStories.map((story) => (
                    <article
                      className="kj-customer-story-card"
                      key={story.number}
                    >
                      <figure className="kj-customer-story-card__media">
                        <img
                          src={story.image}
                          alt={story.alt}
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="kj-customer-story-card__number">
                          {story.number}
                        </span>
                      </figure>
                      <div className="kj-customer-story-card__content">
                        <span>King Jades Experience</span>
                        <h3>{story.title}</h3>
                        <p>{story.text}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
        </main>
      </div>
      <Footer />
    </>
  );
};
export default ContactPage;