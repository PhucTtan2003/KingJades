import React from "react";
import { Link } from "react-router-dom";
import "../styles/FavoriteDrawer.css";

export type FavoriteProduct = {
  id: string | number;
  name: string;
  price: number;
  image: string;
  slug?: string;
  categoryName?: string;
};

type FavoriteDrawerProps = {
  isOpen: boolean;
  items: FavoriteProduct[];
  onClose: () => void;
  onRemove: (id: string | number) => void;
  onAddToCart: (product: FavoriteProduct) => void;
};

// Đồng bộ cách che giá với ProductDetailPage (VD: 5.000 -> 5.xxx đ).
// Chỉ che chữ hiển thị; giá số gốc của sản phẩm vẫn được giữ nguyên.
const formatPrice = (price: number) => {
  if (!Number.isFinite(price) || price <= 0) return "Giá liên hệ";

  const formattedPrice = new Intl.NumberFormat("vi-VN").format(price);
  const priceParts = formattedPrice.split(".");
  const firstPart = priceParts[0] || "";
  const maskedFirstPart = firstPart.length > 1
    ? `${firstPart.charAt(0)}${"x".repeat(firstPart.length - 1)}`
    : firstPart;
  const maskedPrice = [
    maskedFirstPart,
    ...priceParts.slice(1).map(() => "xxx"),
  ].join(".");

  return `${maskedPrice} đ`;
};

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.8 4.8a5.2 5.2 0 0 0-7.4 0L12 6.2l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

const BagIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5.5 8.5h13l-1 11h-11l-1-11Z" />
    <path d="M9 9V6.8a3 3 0 0 1 6 0V9" />
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

const FavoriteDrawer: React.FC<FavoriteDrawerProps> = ({
  isOpen,
  items,
  onClose,
  onRemove,
  onAddToCart,
}) => {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.price || 0), 0);

  const handleAddToCart = (item: FavoriteProduct) => {
    onAddToCart(item);
  };

  return (
    <div
      className={`kj-favorite-drawer ${isOpen ? "is-open" : ""}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        className="kj-favorite-drawer__backdrop"
        onClick={onClose}
        aria-label="Đóng danh sách yêu thích"
      />

      <aside
        className="kj-favorite-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Sản phẩm yêu thích"
      >
        <header className="kj-favorite-drawer__header">
          <div>
            <span className="kj-favorite-drawer__eyebrow">
              King Jades Selection
            </span>

            <h2>
              Bảo vật yêu thích
              <small>{items.length}</small>
            </h2>
          </div>

          <button
            type="button"
            className="kj-favorite-drawer__close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="kj-favorite-drawer__divider" />

        <div className="kj-favorite-drawer__body">
          {items.length === 0 ? (
            <div className="kj-favorite-drawer__empty">
              <span className="kj-favorite-drawer__empty-icon">
                <HeartIcon />
              </span>

              <span className="kj-favorite-drawer__eyebrow">
                Your Collection
              </span>

              <h3>Chưa có sản phẩm yêu thích</h3>

              <p>
                Lưu lại những mẫu vòng ngọc bạn quan tâm để so sánh và nhận tư
                vấn sau.
              </p>

              <Link to="/products" onClick={onClose}>
                Khám phá bộ sưu tập
                <ArrowIcon />
              </Link>
            </div>
          ) : (
            <div className="kj-favorite-drawer__list">
              {items.map((item) => {
                const content = (
                  <>
                    {item.image ? (
                      <img src={item.image} alt={item.name} />
                    ) : (
                      <div className="kj-favorite-drawer__placeholder">
                        <span>KJ</span>
                        <small>King Jades</small>
                      </div>
                    )}
                  </>
                );

                return (
                  <article
                    className="kj-favorite-drawer__item"
                    key={item.id}
                  >
                    <div className="kj-favorite-drawer__image">
                      {item.slug ? (
                        <Link
                          to={`/products/${item.slug}`}
                          onClick={onClose}
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}

                      <span className="kj-favorite-drawer__heart">
                        <HeartIcon />
                      </span>
                    </div>

                    <div className="kj-favorite-drawer__info">
                      <span className="kj-favorite-drawer__category">
                        {item.categoryName || "King Jades"}
                      </span>

                      <h3>
                        {item.slug ? (
                          <Link
                            to={`/products/${item.slug}`}
                            onClick={onClose}
                          >
                            {item.name}
                          </Link>
                        ) : (
                          item.name
                        )}
                      </h3>

                      <strong>{formatPrice(item.price)}</strong>

                      <div className="kj-favorite-drawer__actions">
                        <button
                          type="button"
                          className="kj-favorite-drawer__cart-button"
                          onClick={() => handleAddToCart(item)}
                        >
                          <BagIcon />
                          Thêm vào giỏ
                        </button>

                        <button
                          type="button"
                          className="kj-favorite-drawer__remove-button"
                          onClick={() => onRemove(item.id)}
                          aria-label={`Xóa ${item.name} khỏi yêu thích`}
                          title="Xóa khỏi yêu thích"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <footer className="kj-favorite-drawer__footer">
            <div className="kj-favorite-drawer__summary">
              <span>
                Đã lưu <strong>{items.length}</strong> sản phẩm
              </span>

              <span>
                Tạm tính
                <strong>{total > 0 ? formatPrice(total) : "Giá liên hệ"}</strong>
              </span>
            </div>

            <Link
              to="/products"
              className="kj-favorite-drawer__continue"
              onClick={onClose}
            >
              Tiếp tục xem bộ sưu tập
              <ArrowIcon />
            </Link>

            <button
              type="button"
              className="kj-favorite-drawer__back"
              onClick={onClose}
            >
              Quay lại trang đang xem
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
};

export default FavoriteDrawer;