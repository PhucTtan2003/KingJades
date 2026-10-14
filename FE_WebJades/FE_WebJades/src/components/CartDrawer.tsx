import React, {
  useEffect,
  useMemo,
} from "react";
import { Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";

import "../styles/CartDrawer.css";

const formatPrice = (
  value?: number
) => {
  if (!value || value <= 0) {
    return "Giá liên hệ";
  }

  return `${new Intl.NumberFormat(
    "vi-VN"
  ).format(value)} đ`;
};

const getFinalPrice = (
  price?: number,
  salePrice?: number
) => {
  return salePrice &&
    salePrice > 0
    ? salePrice
    : price || 0;
};

const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

const BagIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 9V6a3 3 0 0 1 6 0v3" />
  </svg>
);

const MinusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M6 12h12" />
  </svg>
);

const PlusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M6 12h12M12 6v12" />
  </svg>
);

const TrashIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M4.5 7h15M9 7V4.5h6V7M7 7l.8 12h8.4L17 7M10 10.5v5M14 10.5v5" />
  </svg>
);

const ArrowIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m14 7 5 5-5 5" />
  </svg>
);

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const CartDrawer: React.FC = () => {
  const {
    items,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

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

  const productCount = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );
  }, [items]);

  useEffect(() => {
    if (!isCartOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape"
      ) {
        closeCart();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    isCartOpen,
    closeCart,
  ]);

  if (!isCartOpen) {
    return null;
  }

  return (
    <div
      className="kj-cart-drawer-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kj-cart-drawer-title"
    >
      <button
        type="button"
        className="kj-cart-backdrop"
        onClick={closeCart}
        aria-label="Đóng giỏ hàng"
      />

      <aside className="kj-cart-panel">
        <header className="kj-cart-head">
          <div className="kj-cart-head__title">
            <span>
              King Jades Selection
            </span>

            <h2 id="kj-cart-drawer-title">
              Sản phẩm quan tâm
            </h2>

            <p>
              {productCount > 0
                ? `${productCount} sản phẩm đang được lưu`
                : "Giỏ hàng chưa có sản phẩm"}
            </p>
          </div>

          <button
            type="button"
            className="kj-cart-close"
            onClick={closeCart}
            aria-label="Đóng giỏ hàng"
          >
            <CloseIcon />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="kj-cart-empty">
            <span className="kj-cart-empty__icon">
              <BagIcon />
            </span>

            <span className="kj-cart-empty__eyebrow">
              Your Selection
            </span>

            <strong>
              Giỏ hàng đang trống
            </strong>

            <p>
              Thêm những sản phẩm bạn
              quan tâm để King Jades tư
              vấn và gửi báo giá phù hợp.
            </p>

            <Link
              to="/products"
              onClick={closeCart}
            >
              Xem bộ sưu tập
              <ArrowIcon />
            </Link>
          </div>
        ) : (
          <>
            <div className="kj-cart-list">
              {items.map(
                (item, index) => {
                  const finalPrice =
                    getFinalPrice(
                      item.price,
                      item.salePrice
                    );

                  const hasSale =
                    Boolean(
                      item.salePrice &&
                        item.salePrice >
                          0 &&
                        item.price &&
                        item.price >
                          item.salePrice
                    );

                  return (
                    <article
                      className="kj-cart-item"
                      key={item.id}
                    >
                      <Link
                        to={
                          item.slug
                            ? `/products/${item.slug}`
                            : "/products"
                        }
                        className="kj-cart-item-image"
                        onClick={closeCart}
                        aria-label={`Xem ${item.name}`}
                      >
                        <span className="kj-cart-item-image__fallback">
                          KJ
                        </span>

                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            onError={(
                              event
                            ) => {
                              event.currentTarget.style.display =
                                "none";
                            }}
                          />
                        )}

                        <small>
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </small>
                      </Link>

                      <div className="kj-cart-item-info">
                        <div className="kj-cart-item-info__top">
                          <div>
                            <p>
                              {item.categoryName ||
                                item.sku ||
                                "King Jades"}
                            </p>

                            <Link
                              to={
                                item.slug
                                  ? `/products/${item.slug}`
                                  : "/products"
                              }
                              onClick={
                                closeCart
                              }
                              className="kj-cart-item-name"
                            >
                              {item.name}
                            </Link>
                          </div>

                          <button
                            type="button"
                            className="kj-cart-remove"
                            onClick={() =>
                              removeFromCart(
                                item.id
                              )
                            }
                            aria-label={`Gỡ ${item.name} khỏi giỏ hàng`}
                            title="Gỡ sản phẩm"
                          >
                            <TrashIcon />
                          </button>
                        </div>

                        <div className="kj-cart-item-price">
                          <strong>
                            {formatPrice(
                              finalPrice
                            )}
                          </strong>

                          {hasSale && (
                            <del>
                              {formatPrice(
                                item.price
                              )}
                            </del>
                          )}
                        </div>

                        <div className="kj-cart-item-bottom">
                          <div
                            className="kj-cart-quantity"
                            aria-label={`Số lượng ${item.name}`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.id,
                                  item.quantity -
                                    1
                                )
                              }
                              disabled={
                                item.quantity <=
                                1
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
                                  item.quantity +
                                    1
                                )
                              }
                              aria-label="Tăng số lượng"
                            >
                              <PlusIcon />
                            </button>
                          </div>

                          <small>
                            {finalPrice > 0
                              ? formatPrice(
                                  finalPrice *
                                    item.quantity
                                )
                              : "Liên hệ báo giá"}
                          </small>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>

            <footer className="kj-cart-footer">
              <div className="kj-cart-assurance">
                <CheckIcon />

                <p>
                  Đây là danh sách sản
                  phẩm cần tư vấn, chưa
                  phải thanh toán trực
                  tuyến.
                </p>
              </div>

              <div className="kj-cart-total-row">
                <div>
                  <span>
                    Tạm tính
                  </span>

                  <small>
                    {productCount} sản
                    phẩm
                  </small>
                </div>

                <strong>
                  {total > 0
                    ? formatPrice(
                        total
                      )
                    : "Giá liên hệ"}
                </strong>
              </div>

              <div className="kj-cart-footer-actions">
                <Link
                  to="/cart"
                  onClick={closeCart}
                >
                  Gửi yêu cầu báo giá
                  <ArrowIcon />
                </Link>

                <button
                  type="button"
                  onClick={clearCart}
                >
                  <TrashIcon />
                  Xóa giỏ
                </button>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
};

export default CartDrawer;