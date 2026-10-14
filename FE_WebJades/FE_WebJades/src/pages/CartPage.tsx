import React, { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  contactApi,
  PreferredContactChannel,
} from "../api/contactapi";
import { useCart } from "../contexts/CartContext";
import "../styles/CartPage.css";

type CartLeadForm = {
  fullName: string;
  phone: string;
  email: string;
  need: string;
  preferredContactChannel: PreferredContactChannel;
  message: string;
};

const needOptions = [
  "Báo giá sản phẩm trong giỏ",
  "Tư vấn chọn sản phẩm",
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

const formatPrice = (value?: number) => {
  if (!value || value <= 0) return "Giá liên hệ";

  return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
};

const getFinalPrice = (
  price?: number,
  salePrice?: number
) => {
  return salePrice && salePrice > 0
    ? salePrice
    : price || 0;
};

const MinusIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M12 5v14" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4.5 7h15M9 7V4.5h6V7M7 7l.8 12h8.4L17 7M10 10.5v5M14 10.5v5" />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m14 7 5 5-5 5" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3 5.5 5.6v5.8c0 4.1 2.7 7.7 6.5 9.6 3.8-1.9 6.5-5.5 6.5-9.6V5.6L12 3Z" />
    <path d="m9.3 12 1.8 1.8 3.9-4" />
  </svg>
);

const MessageIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 5.5h16v11H9l-5 3v-14Z" />
    <path d="M8 9h8M8 13h5" />
  </svg>
);

const GiftIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13" />
    <path d="M12 7H8.5A2.5 2.5 0 1 1 11 4.5L12 7Zm0 0h3.5A2.5 2.5 0 1 0 13 4.5L12 7Z" />
  </svg>
);

const CartPage: React.FC = () => {
  const {
    items,
    cartCount,
    updateQuantity,
    removeFromCart,
    clearCart,
    openCart,
  } = useCart();

  const [form, setForm] = useState<CartLeadForm>({
    fullName: "",
    phone: "",
    email: "",
    need: "Báo giá sản phẩm trong giỏ",
    preferredContactChannel: "zalo",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const total = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum +
        getFinalPrice(
          item.price,
          item.salePrice
        ) *
          item.quantity,
      0
    );
  }, [items]);

  const pricedItemCount = useMemo(() => {
    return items.filter(
      (item) =>
        getFinalPrice(
          item.price,
          item.salePrice
        ) > 0
    ).length;
  }, [items]);

  const updateField = (
    field: keyof CartLeadForm,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const buildCartMessage = () => {
    const productLines = items.map(
      (item, index) => {
        const price = formatPrice(
          getFinalPrice(
            item.price,
            item.salePrice
          )
        );

        const skuText = item.sku
          ? ` · SKU: ${item.sku}`
          : "";

        const slugText = item.slug
          ? ` · Link: /products/${item.slug}`
          : "";

        return `${index + 1}. ${item.name} x${item.quantity} · ${price}${skuText}${slugText}`;
      }
    );

    return [
      "Khách gửi yêu cầu tư vấn/báo giá từ giỏ hàng.",
      "",
      "Danh sách sản phẩm quan tâm:",
      ...productLines,
      "",
      `Tạm tính: ${
        total > 0
          ? formatPrice(total)
          : "Giá liên hệ"
      }`,
      `Kênh liên hệ ưu tiên: ${form.preferredContactChannel}`,
      "",
      form.message.trim()
        ? `Ghi chú khách: ${form.message.trim()}`
        : "Ghi chú khách: -",
    ].join("\n");
  };

  const validateForm = () => {
    if (items.length === 0) {
      return "Giỏ hàng đang trống. Vui lòng thêm sản phẩm trước khi gửi yêu cầu.";
    }

    if (!form.fullName.trim()) {
      return "Vui lòng nhập họ tên.";
    }

    if (!form.phone.trim()) {
      return "Vui lòng nhập số điện thoại.";
    }

    const normalizedPhone =
      form.phone.replace(/\s+/g, "");

    if (!/^[0-9+]{9,15}$/.test(normalizedPhone)) {
      return "Số điện thoại chưa đúng định dạng.";
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim()
      )
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
      setSuccess("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await contactApi.createContactLead({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        need: form.need,
        preferredContactChannel:
          form.preferredContactChannel,
        message: buildCartMessage(),
        productId: "",
        productName: items
          .map((item) => item.name)
          .join(", ")
          .slice(0, 250),
        productSlug: "",
        source: "cart",
      });

      setSuccess(
        "King Jades đã nhận yêu cầu từ giỏ hàng. Đội ngũ tư vấn sẽ liên hệ theo kênh bạn đã chọn."
      );

      setForm({
        fullName: "",
        phone: "",
        email: "",
        need: "Báo giá sản phẩm trong giỏ",
        preferredContactChannel: "zalo",
        message: "",
      });

      clearCart();
    } catch (requestError) {
      const apiError = requestError as Error;

      setError(
        apiError.message ||
          "Không thể gửi yêu cầu từ giỏ hàng lúc này."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header
        cartCount={cartCount}
        onOpenCart={openCart}
      />

      <div className="kj-cart-page">
        <main className="kj-cart-main">
          <section className="kj-cart-hero">
            <div
              className="kj-cart-hero__glow kj-cart-hero__glow--left"
              aria-hidden="true"
            />
            <div
              className="kj-cart-hero__glow kj-cart-hero__glow--right"
              aria-hidden="true"
            />

            <div className="kj-cart-shell">
              <span className="kj-cart-eyebrow">
                King Jades Concierge Cart
              </span>

              <div className="kj-cart-hero__heading">
                <div>
                  <h1>
                    Giỏ sản phẩm
                    <br />
                    bạn đang quan tâm.
                  </h1>

                  <p>
                    Tổng hợp những mẫu vòng ngọc cần
                    tư vấn, sau đó gửi một yêu cầu chung
                    đến đội ngũ King Jades.
                  </p>
                </div>

                <div className="kj-cart-steps">
                  <article className="active">
                    <span>01</span>
                    <div>
                      <strong>Chọn sản phẩm</strong>
                      <small>
                        Lưu các mẫu bạn quan tâm
                      </small>
                    </div>
                  </article>

                  <article>
                    <span>02</span>
                    <div>
                      <strong>Gửi yêu cầu</strong>
                      <small>
                        Điền thông tin liên hệ
                      </small>
                    </div>
                  </article>

                  <article>
                    <span>03</span>
                    <div>
                      <strong>Nhận tư vấn</strong>
                      <small>
                        Sale liên hệ lại 1:1
                      </small>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </section>

          <section className="kj-cart-content">
            <div className="kj-cart-shell kj-cart-layout">
              <div className="kj-cart-products">
                <header className="kj-cart-products__header">
                  <div>
                    <span className="kj-cart-eyebrow">
                      Selected Pieces
                    </span>
                    <h2>Sản phẩm trong giỏ</h2>
                    <p>
                      {items.length > 0
                        ? `${items.length} dòng sản phẩm · ${cartCount} sản phẩm`
                        : "Chưa có sản phẩm nào được chọn"}
                    </p>
                  </div>

                  {items.length > 0 && (
                    <button
                      type="button"
                      className="kj-cart-clear-button"
                      onClick={clearCart}
                    >
                      <TrashIcon />
                      Xóa tất cả
                    </button>
                  )}
                </header>

                {items.length === 0 ? (
                  <div className="kj-cart-empty">
                    <div className="kj-cart-empty__mark">
                      <span>KJ</span>
                      <small>King Jades</small>
                    </div>

                    <span className="kj-cart-eyebrow">
                      Your Selection
                    </span>

                    <h3>
                      Giỏ sản phẩm đang trống
                    </h3>

                    <p>
                      Quay lại bộ sưu tập để chọn các
                      mẫu vòng ngọc cần được tư vấn hoặc
                      báo giá.
                    </p>

                    <Link to="/products">
                      Khám phá bộ sưu tập
                      <ArrowIcon />
                    </Link>
                  </div>
                ) : (
                  <div className="kj-cart-list">
                    {items.map((item) => (
                      <article
                        className="kj-cart-item"
                        key={item.id}
                      >
                        <Link
                          className="kj-cart-item__image"
                          to={
                            item.slug
                              ? `/products/${item.slug}`
                              : "/products"
                          }
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                            />
                          ) : (
                            <div className="kj-cart-item__placeholder">
                              <span>KJ</span>
                              <small>
                                King Jades
                              </small>
                            </div>
                          )}
                        </Link>

                        <div className="kj-cart-item__content">
                          <div className="kj-cart-item__top">
                            <div>
                              <span>
                                {item.categoryName ||
                                  item.sku ||
                                  "King Jades"}
                              </span>

                              <h3>
                                <Link
                                  to={
                                    item.slug
                                      ? `/products/${item.slug}`
                                      : "/products"
                                  }
                                >
                                  {item.name}
                                </Link>
                              </h3>
                            </div>

                            <button
                              type="button"
                              className="kj-cart-item__remove"
                              onClick={() =>
                                removeFromCart(
                                  item.id
                                )
                              }
                              aria-label={`Gỡ ${item.name}`}
                              title="Gỡ sản phẩm"
                            >
                              <TrashIcon />
                            </button>
                          </div>

                          <p>
                            Sản phẩm sẽ được gửi kèm
                            trong yêu cầu tư vấn để đội
                            ngũ King Jades hỗ trợ chính
                            xác hơn.
                          </p>

                          <div className="kj-cart-item__bottom">
                            <div className="kj-cart-quantity">
                              <button
                                type="button"
                                disabled={
                                  item.quantity <= 1
                                }
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    item.quantity - 1
                                  )
                                }
                                aria-label="Giảm số lượng"
                              >
                                <MinusIcon />
                              </button>

                              <span>
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    item.quantity + 1
                                  )
                                }
                                aria-label="Tăng số lượng"
                              >
                                <PlusIcon />
                              </button>
                            </div>

                            <div className="kj-cart-item__price">
                              <small>
                                {item.quantity > 1
                                  ? `${formatPrice(
                                      getFinalPrice(
                                        item.price,
                                        item.salePrice
                                      )
                                    )} / sản phẩm`
                                  : "Giá tham khảo"}
                              </small>

                              <strong>
                                {formatPrice(
                                  getFinalPrice(
                                    item.price,
                                    item.salePrice
                                  ) *
                                    item.quantity
                                )}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {items.length > 0 && (
                  <div className="kj-cart-products__continue">
                    <Link to="/products">
                      ← Tiếp tục xem bộ sưu tập
                    </Link>
                  </div>
                )}
              </div>

              <aside className="kj-cart-inquiry">
                <div className="kj-cart-inquiry__header">
                  <span className="kj-cart-eyebrow">
                    Submit Inquiry
                  </span>

                  <h2>Gửi yêu cầu tư vấn</h2>

                  <p>
                    Thông tin trong giỏ sẽ được gửi đến
                    Admin/Sale để tiếp nhận và liên hệ lại.
                  </p>
                </div>

                {success && (
                  <div className="kj-cart-alert kj-cart-alert--success">
                    {success}
                  </div>
                )}

                {error && (
                  <div className="kj-cart-alert kj-cart-alert--error">
                    {error}
                  </div>
                )}

                <form
                  className="kj-cart-form"
                  onSubmit={handleSubmit}
                  noValidate
                >
                  <label className="kj-cart-field">
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

                  <div className="kj-cart-form__row">
                    <label className="kj-cart-field">
                      <span>
                        Số điện thoại <b>*</b>
                      </span>
                      <input
                        value={form.phone}
                        onChange={(event) =>
                          updateField(
                            "phone",
                            event.target.value
                          )
                        }
                        placeholder="0918xxxxxx"
                        inputMode="tel"
                        autoComplete="tel"
                      />
                    </label>

                    <label className="kj-cart-field">
                      <span>Email</span>
                      <input
                        value={form.email}
                        onChange={(event) =>
                          updateField(
                            "email",
                            event.target.value
                          )
                        }
                        placeholder="email@example.com"
                        type="email"
                        autoComplete="email"
                      />
                    </label>
                  </div>

                  <label className="kj-cart-field">
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
                        <option
                          value={item}
                          key={item}
                        >
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <fieldset className="kj-cart-channel">
                    <legend>
                      Kênh liên hệ ưu tiên
                    </legend>

                    <div>
                      {contactChannelOptions.map(
                        (item) => (
                          <label key={item.value}>
                            <input
                              type="radio"
                              name="cartPreferredContactChannel"
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
                            <span>
                              {item.label}
                            </span>
                          </label>
                        )
                      )}
                    </div>
                  </fieldset>

                  <label className="kj-cart-field">
                    <span>Ghi chú thêm</span>
                    <textarea
                      rows={4}
                      value={form.message}
                      onChange={(event) =>
                        updateField(
                          "message",
                          event.target.value
                        )
                      }
                      placeholder="Size cổ tay, màu sắc, ngân sách, thời gian muốn xem sản phẩm..."
                    />
                  </label>

                  <div className="kj-cart-summary">
                    <div>
                      <span>Số lượng</span>
                      <strong>
                        {cartCount} sản phẩm
                      </strong>
                    </div>

                    <div>
                      <span>Tạm tính</span>
                      <strong>
                        {total > 0
                          ? formatPrice(total)
                          : "Giá liên hệ"}
                      </strong>
                    </div>
                  </div>

                  {items.length > 0 &&
                    pricedItemCount <
                      items.length && (
                      <p className="kj-cart-price-note">
                        Một số sản phẩm cần liên hệ để
                        nhận báo giá chính xác.
                      </p>
                    )}

                  <button
                    type="submit"
                    className="kj-cart-submit"
                    disabled={
                      loading ||
                      items.length === 0
                    }
                  >
                    {loading
                      ? "Đang gửi..."
                      : "Gửi yêu cầu tư vấn"}

                    {!loading && <ArrowIcon />}
                  </button>

                  <small className="kj-cart-form__note">
                    Gửi yêu cầu không đồng nghĩa với đặt
                    hàng hoặc thanh toán.
                  </small>
                </form>
              </aside>
            </div>
          </section>

          <section className="kj-cart-assurance">
            <div className="kj-cart-shell kj-cart-assurance__grid">
              <article>
                <span>
                  <ShieldIcon />
                </span>
                <div>
                  <strong>
                    Thông tin được bảo mật
                  </strong>
                  <p>
                    Dữ liệu chỉ dùng để tiếp nhận yêu
                    cầu và chăm sóc khách hàng.
                  </p>
                </div>
              </article>

              <article>
                <span>
                  <MessageIcon />
                </span>
                <div>
                  <strong>
                    Tư vấn trực tiếp 1:1
                  </strong>
                  <p>
                    Đội ngũ King Jades liên hệ theo kênh
                    bạn lựa chọn.
                  </p>
                </div>
              </article>

              <article>
                <span>
                  <GiftIcon />
                </span>
                <div>
                  <strong>
                    Hỗ trợ chọn quà tặng
                  </strong>
                  <p>
                    Tư vấn mẫu vòng phù hợp người nhận
                    và dịp quan trọng.
                  </p>
                </div>
              </article>
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </>
  );
};

export default CartPage;