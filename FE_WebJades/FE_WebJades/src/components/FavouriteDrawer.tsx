import React from "react";
import "../styles/FavoriteDrawer.css";

export type FavoriteProduct = {
  id: string | number;
  name: string;
  price: number;
  image: string;
  slug?: string;
  sku?: string;
  categoryName?: string;
  salePrice?: number;
  shortDescription?: string;
};

type FavoriteDrawerProps = {
  isOpen: boolean;
  items: FavoriteProduct[];
  onClose: () => void;
  onRemove: (id: string | number) => void;
  onAddToCart: (product: FavoriteProduct) => void;
};

const formatPrice = (price: number) => {
  return price.toLocaleString("vi-VN") + " đ";
};

const FavoriteDrawer: React.FC<FavoriteDrawerProps> = ({
  isOpen,
  items,
  onClose,
  onRemove,
  onAddToCart,
}) => {
  return (
    <div className={`favorite-drawer-wrap ${isOpen ? "show" : ""}`}>
      <div className="favorite-backdrop" onClick={onClose}></div>

      <aside className="favorite-drawer">
        <div className="favorite-header">
          <h2>
            <span>♥</span> Bảo Vật Yêu Thích ({items.length})
          </h2>

          <button type="button" className="favorite-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="favorite-body">
          {items.length === 0 ? (
            <div className="favorite-empty">
              <div className="favorite-empty-icon">♡</div>
              <h3>Chưa có sản phẩm yêu thích</h3>
              <p>Hãy chọn trái tim ở sản phẩm bạn yêu thích.</p>
            </div>
          ) : (
            items.map((item) => (
              <div className="favorite-item" key={item.id}>
                <img src={item.image} alt={item.name} />

                <div className="favorite-info">
                  <h3>{item.name}</h3>
                  <p>{formatPrice(item.price)}</p>

                  <button
                    type="button"
                    className="favorite-cart-btn"
                    onClick={() => onAddToCart(item)}
                  >
                    THÊM GIỎ HÀNG
                  </button>
                </div>

                <button
                  type="button"
                  className="favorite-remove"
                  onClick={() => onRemove(item.id)}
                >
                  Xóa
                </button>
              </div>
            ))
          )}
        </div>

        <div className="favorite-footer">
          <button type="button" onClick={onClose}>QUAY LẠI MUA SẮM</button>
        </div>
      </aside>
    </div>
  );
};

export default FavoriteDrawer;