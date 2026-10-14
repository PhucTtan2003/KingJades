import React, {

  ChangeEvent,

  useEffect,

  useMemo,

  useState,

} from "react";

import {

  productApi,

  ProductImagePayload,

} from "../api/productApi";

import { getImageUrl } from "../utils/getImageUrl";

import "../styles/ProductMediaLibraryPage.css";



type ProductImage = ProductImagePayload;



type AdminProduct = {

  id: string;

  name: string;

  sku: string;

  slug: string;

  parentCategoryName?: string;

  categoryName: string;

  images: ProductImage[];

};



type Props = {

  onBack?: () => void;

};



type MediaItem = {

  productId: string;

  productName: string;

  sku: string;

  parentCategoryName?: string;

  categoryName: string;

  image: ProductImage;

};



const normalizeImages = (

  images: ProductImage[]

): ProductImage[] => {

  const ordered = [...(images || [])].sort(

    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)

  );



  const mainIndex = ordered.findIndex((image) => image.isMain);

  const resolvedMainIndex =

    ordered.length === 0 ? -1 : mainIndex >= 0 ? mainIndex : 0;



  return ordered.map((image, index) => ({

    ...image,

    isMain: index === resolvedMainIndex,

    sortOrder: index + 1,

  }));

};



const DEFAULT_PAGE_SIZE = 24;

const PAGE_SIZE_OPTIONS = [12, 24, 48];

const ProductMediaLibraryPage: React.FC<Props> = ({

  onBack,

}) => {

  const [products, setProducts] = useState<AdminProduct[]>([]);

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");



  const [search, setSearch] = useState("");

  const [productFilter, setProductFilter] = useState("all");

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [uploadProductId, setUploadProductId] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);



  const load = async () => {

    setLoading(true);

    setError("");



    try {

      const data = await productApi.getAllAdminProducts();



      const nextProducts: AdminProduct[] = (data.products || []).map(

        (product: AdminProduct) => ({

          ...product,

          images: normalizeImages(product.images || []),

        })

      );



      setProducts(nextProducts);



      if (!uploadProductId && nextProducts.length > 0) {

        setUploadProductId(nextProducts[0].id);

      }

    } catch (requestError) {

      const err = requestError as Error;

      setError(err.message || "Không tải được thư viện hình ảnh.");

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, []);



  const mediaItems = useMemo<MediaItem[]>(() => {

    const keyword = search.trim().toLowerCase();



    return products

      .flatMap((product) =>

        (product.images || []).map((image) => ({

          productId: product.id,

          productName: product.name,

          sku: product.sku,

          parentCategoryName:

            product.parentCategoryName,

          categoryName:

            product.categoryName,

          image,

        }))

      )

      .filter((item) => {

        const matchProduct =

          productFilter === "all" || item.productId === productFilter;



        if (!matchProduct) {

          return false;

        }



        if (!keyword) {

          return true;

        }



        const haystack = [

          item.productName,

          item.sku,

          item.parentCategoryName,

          item.categoryName,

          item.image.fileName,

          item.image.alt,

          item.image.url,

        ]

          .join(" ")

          .toLowerCase();



        return haystack.includes(keyword);

      });

  }, [products, productFilter, search]);



  const totalPages = Math.max(
    1,
    Math.ceil(mediaItems.length / pageSize)
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const pagedMediaItems = useMemo(() => {
    const startIndex =
      (safeCurrentPage - 1) * pageSize;

    return mediaItems.slice(
      startIndex,
      startIndex + pageSize
    );
  }, [mediaItems, pageSize, safeCurrentPage]);

  const paginationItems = useMemo<
    Array<number | "ellipsis-left" | "ellipsis-right">
  >(() => {
    if (totalPages <= 7) {
      return Array.from(
        { length: totalPages },
        (_, index) => index + 1
      );
    }

    const items: Array<
      number | "ellipsis-left" | "ellipsis-right"
    > = [1];

    const rangeStart = Math.max(
      2,
      safeCurrentPage - 1
    );

    const rangeEnd = Math.min(
      totalPages - 1,
      safeCurrentPage + 1
    );

    if (rangeStart > 2) {
      items.push("ellipsis-left");
    }

    for (
      let pageNumber = rangeStart;
      pageNumber <= rangeEnd;
      pageNumber += 1
    ) {
      items.push(pageNumber);
    }

    if (rangeEnd < totalPages - 1) {
      items.push("ellipsis-right");
    }

    items.push(totalPages);

    return items;
  }, [safeCurrentPage, totalPages]);

  const firstVisibleImage =
    mediaItems.length === 0
      ? 0
      : (safeCurrentPage - 1) * pageSize + 1;

  const lastVisibleImage = Math.min(
    safeCurrentPage * pageSize,
    mediaItems.length
  );

  const goToPage = (pageNumber: number) => {
    const nextPage = Math.min(
      Math.max(pageNumber, 1),
      totalPages
    );

    setCurrentPage(nextPage);
    setSelectedKey(null);

    requestAnimationFrame(() => {
      document
        .querySelector(".kj-media-toolbar")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  };

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
      setSelectedKey(null);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedKey(null);
  }, [search, productFilter]);


  const selectedItem = useMemo(() => {

    if (!selectedKey) {

      return null;

    }



    return mediaItems.find(

      (item) => `${item.productId}::${item.image.url}` === selectedKey

    ) || null;

  }, [mediaItems, selectedKey]);



  const replaceProductImages = (

    productId: string,

    images: ProductImage[]

  ) => {

    setProducts((previous) =>

      previous.map((product) =>

        product.id === productId

          ? {

              ...product,

              images: normalizeImages(images),

            }

          : product

      )

    );

  };



  const saveImages = async (

    productId: string,

    images: ProductImage[],

    successMessage: string

  ) => {

    setSaving(true);

    setError("");

    setMessage("");



    try {

      const normalized = normalizeImages(images);

      const data = await productApi.updateProductImages(

        productId,

        normalized

      );



      replaceProductImages(

        productId,

        data.product?.images || normalized

      );



      setMessage(successMessage);

    } catch (requestError) {

      const err = requestError as Error;

      setError(err.message || "Không thể cập nhật hình ảnh.");

    } finally {

      setSaving(false);

    }

  };



  const handleSetMain = async (item: MediaItem) => {

    const product = products.find((entry) => entry.id === item.productId);



    if (!product) {

      return;

    }



    const next = product.images.map((image) => ({

      ...image,

      isMain: image.url === item.image.url,

    }));



    await saveImages(

      item.productId,

      next,

      "Đã đặt ảnh đại diện cho sản phẩm."

    );

  };



  const handleDelete = async (item: MediaItem) => {

    const ok = window.confirm(

      `Xóa ảnh "${item.image.fileName || item.image.url}" khỏi "${item.productName}"?`

    );



    if (!ok) {

      return;

    }



    const product = products.find((entry) => entry.id === item.productId);



    if (!product) {

      return;

    }



    const next = product.images.filter(

      (image) => image.url !== item.image.url

    );



    await saveImages(

      item.productId,

      next,

      "Đã xóa ảnh khỏi sản phẩm."

    );



    setSelectedKey(null);

  };



  const handleMove = async (

    item: MediaItem,

    direction: -1 | 1

  ) => {

    const product = products.find((entry) => entry.id === item.productId);



    if (!product) {

      return;

    }



    const ordered = normalizeImages(product.images);

    const currentIndex = ordered.findIndex(

      (image) => image.url === item.image.url

    );

    const targetIndex = currentIndex + direction;



    if (

      currentIndex < 0 ||

      targetIndex < 0 ||

      targetIndex >= ordered.length

    ) {

      return;

    }



    const next = [...ordered];

    [next[currentIndex], next[targetIndex]] = [

      next[targetIndex],

      next[currentIndex],

    ];



    await saveImages(

      item.productId,

      next,

      "Đã thay đổi thứ tự hình ảnh."

    );

  };



  const handleUpload = async (

    event: ChangeEvent<HTMLInputElement>

  ) => {

    const files = Array.from(event.target.files || []);

    event.target.value = "";



    if (!uploadProductId) {

      setError("Vui lòng chọn sản phẩm cần gán ảnh.");

      return;

    }



    if (files.length === 0) {

      return;

    }



    setSaving(true);

    setError("");

    setMessage("");



    try {

      const data = await productApi.addProductImages(

        uploadProductId,

        files

      );



      replaceProductImages(

        uploadProductId,

        data.product?.images || []

      );



      setMessage(`Đã thêm ${files.length} ảnh vào sản phẩm.`);

    } catch (requestError) {

      const err = requestError as Error;

      setError(err.message || "Upload hình ảnh thất bại.");

    } finally {

      setSaving(false);

    }

  };



  return (
    <div className="kj-media-page">
      <style>{`
        .kj-media-page-size {
          min-width: 170px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .kj-media-page-size > span {
          color: #7d7a72;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }

        .kj-media-page-size select {
          min-height: 42px;
          padding: 0 34px 0 12px;
          border: 1px solid rgba(20, 37, 67, 0.12);
          border-radius: 12px;
          outline: none;
          background: rgba(255, 255, 255, 0.94);
          color: #142543;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
        }

        .kj-media-pagination {
          grid-column: 1 / -1;
          margin-top: 8px;
          padding: 14px 16px;
          border: 1px solid rgba(20, 37, 67, 0.09);
          border-radius: 18px;
          display: grid;
          grid-template-columns: minmax(130px, 1fr) auto minmax(130px, 1fr);
          align-items: center;
          gap: 14px;
          background: rgba(255, 253, 248, 0.96);
          box-shadow: 0 12px 32px rgba(20, 37, 67, 0.055);
        }

        .kj-media-pagination__summary {
          display: flex;
          align-items: baseline;
          gap: 5px;
          color: #817d74;
          font-size: 11px;
        }

        .kj-media-pagination__summary strong {
          color: #142543;
          font-size: 13px;
        }

        .kj-media-pagination__controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .kj-media-pagination__page,
        .kj-media-pagination__nav {
          min-width: 36px;
          height: 36px;
          padding: 0 10px;
          border: 1px solid rgba(20, 37, 67, 0.11);
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          color: #142543;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
          transition: 160ms ease;
        }

        .kj-media-pagination__page:hover:not(:disabled),
        .kj-media-pagination__nav:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(213, 175, 52, 0.7);
          box-shadow: 0 7px 16px rgba(167, 131, 46, 0.11);
        }

        .kj-media-pagination__page.is-active {
          border-color: #d5af34;
          background: linear-gradient(135deg, #e3c359, #d5af34);
          color: #091733;
          box-shadow: 0 8px 18px rgba(167, 131, 46, 0.19);
        }

        .kj-media-pagination__nav:disabled {
          cursor: not-allowed;
          opacity: 0.4;
        }

        .kj-media-pagination__ellipsis {
          min-width: 24px;
          color: #9a968d;
          font-weight: 800;
          text-align: center;
        }

        .kj-media-pagination__jump {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 7px;
          color: #817d74;
          font-size: 11px;
          white-space: nowrap;
        }

        .kj-media-pagination__jump select {
          min-height: 36px;
          padding: 0 30px 0 10px;
          border: 1px solid rgba(20, 37, 67, 0.11);
          border-radius: 10px;
          outline: none;
          background: #ffffff;
          color: #142543;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
        }

        @media (max-width: 900px) {
          .kj-media-pagination {
            grid-template-columns: 1fr;
          }

          .kj-media-pagination__summary,
          .kj-media-pagination__jump {
            justify-content: center;
          }

          .kj-media-page-size {
            min-width: 0;
            justify-content: stretch;
          }

          .kj-media-page-size select {
            width: 100%;
          }
        }
      `}</style>

      <header className="kj-media-header">

        <div>

          <span className="kj-media-eyebrow">Product Media Library</span>

          <h1>Quản lý hình ảnh sản phẩm</h1>

          <p>

            Tìm kiếm, upload, đặt ảnh chính, đổi thứ tự và xóa ảnh

            mà không cần mở từng form sản phẩm.

          </p>

        </div>



        <div className="kj-media-header-actions">

          {onBack && (

            <button

              type="button"

              className="kj-media-btn kj-media-btn--outline"

              onClick={onBack}

            >

              ← Danh sách sản phẩm

            </button>

          )}

        </div>

      </header>



      <section className="kj-media-upload-card">

        <div>

          <strong>Upload ảnh vào sản phẩm</strong>

          <span>

            Chọn sản phẩm trước, sau đó có thể chọn nhiều ảnh cùng lúc.

          </span>

        </div>



        <select

          value={uploadProductId}

          onChange={(event) => setUploadProductId(event.target.value)}

          disabled={saving || loading}

        >

          <option value="">Chọn sản phẩm</option>

          {products.map((product) => (

            <option key={product.id} value={product.id}>

              {product.sku ? `${product.sku} - ` : ""}

              {product.name}

            </option>

          ))}

        </select>



        <label

          className={`kj-media-btn kj-media-btn--gold ${

            saving ? "is-disabled" : ""

          }`}

        >

          + Upload nhiều ảnh

          <input

            type="file"

            accept="image/*"

            multiple

            onChange={handleUpload}

            disabled={saving || loading}

          />

        </label>

      </section>



      {(message || error) && (

        <div

          className={`kj-media-alert ${

            error ? "is-error" : "is-success"

          }`}

        >

          {error || message}

        </div>

      )}



      <section className="kj-media-toolbar">

        <input

          value={search}

          onChange={(event) => {
            setSearch(event.target.value);
            setCurrentPage(1);
          }}

          placeholder="Tìm theo SKU, tên sản phẩm, tên file..."

        />



        <select

          value={productFilter}

          onChange={(event) => {

            setProductFilter(event.target.value);

                        setCurrentPage(1);

            setSelectedKey(null);

          }}

        >

          <option value="all">Tất cả sản phẩm</option>

          {products.map((product) => (

            <option key={product.id} value={product.id}>

              {product.sku ? `${product.sku} - ` : ""}

              {product.name}

            </option>

          ))}

        </select>
        <div className="kj-media-page-size">
          <span>Hiển thị</span>

          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(
                Number(event.target.value)
              );
              setCurrentPage(1);
              setSelectedKey(null);
            }}
            aria-label="Số ảnh mỗi trang"
          >
            {PAGE_SIZE_OPTIONS.map(
              (size) => (
                <option key={size} value={size}>
                  {size} ảnh / trang
                </option>
              )
            )}
          </select>
        </div>




        <div className="kj-media-count">

          <strong>{mediaItems.length}</strong>

          <span>ảnh</span>

        </div>

      </section>



      {loading ? (

        <div className="kj-media-state">Đang tải thư viện ảnh...</div>

      ) : mediaItems.length === 0 ? (

        <div className="kj-media-state">

          <h2>Chưa có hình ảnh phù hợp</h2>

          <p>Upload ảnh mới hoặc thay đổi điều kiện tìm kiếm.</p>

        </div>

      ) : (

        <div className="kj-media-layout">

          <section className="kj-media-grid">

            {pagedMediaItems.map((item) => {

              const key = `${item.productId}::${item.image.url}`;

              const active = selectedKey === key;



              return (

                <button

                  type="button"

                  key={key}

                  className={`kj-media-card ${active ? "is-active" : ""}`}

                  onClick={() => setSelectedKey(key)}

                >

                  <div className="kj-media-card-image">

                    <img

                      src={getImageUrl(item.image.url)}

                      alt={item.image.alt || item.productName}

                      loading="lazy"

                    />



                    {item.image.isMain && (

                      <span className="kj-media-main-badge">★ Ảnh chính</span>

                    )}



                    <span className="kj-media-order">

                      #{item.image.sortOrder || 1}

                    </span>

                  </div>



                  <div className="kj-media-card-copy">

                    <strong>{item.productName}</strong>

                    <span>{item.sku || "Chưa có SKU"}</span>

                    <small>{item.image.fileName || item.image.url}</small>

                  </div>

                </button>

              );

            })}

          </section>



          
            <nav
              className="kj-media-pagination"
              aria-label="Phân trang thư viện hình ảnh"
            >
              <div className="kj-media-pagination__summary">
                <strong>
                  {firstVisibleImage}–{lastVisibleImage}
                </strong>
                <span>
                  / {mediaItems.length} ảnh
                </span>
              </div>

              <div className="kj-media-pagination__controls">
                <button
                  type="button"
                  className="kj-media-pagination__nav"
                  onClick={() =>
                    goToPage(safeCurrentPage - 1)
                  }
                  disabled={safeCurrentPage <= 1}
                  aria-label="Trang trước"
                >
                  ←
                </button>

                {paginationItems.map((item) =>
                  typeof item === "number" ? (
                    <button
                      type="button"
                      key={item}
                      className={`kj-media-pagination__page ${
                        item === safeCurrentPage
                          ? "is-active"
                          : ""
                      }`}
                      onClick={() => goToPage(item)}
                      aria-current={
                        item === safeCurrentPage
                          ? "page"
                          : undefined
                      }
                    >
                      {item}
                    </button>
                  ) : (
                    <span
                      key={item}
                      className="kj-media-pagination__ellipsis"
                      aria-hidden="true"
                    >
                      …
                    </span>
                  )
                )}

                <button
                  type="button"
                  className="kj-media-pagination__nav"
                  onClick={() =>
                    goToPage(safeCurrentPage + 1)
                  }
                  disabled={
                    safeCurrentPage >= totalPages
                  }
                  aria-label="Trang sau"
                >
                  →
                </button>
              </div>

              <div className="kj-media-pagination__jump">
                <span>Trang</span>

                <select
                  value={safeCurrentPage}
                  onChange={(event) =>
                    goToPage(
                      Number(event.target.value)
                    )
                  }
                  aria-label="Đi đến trang"
                >
                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1
                  ).map((pageNumber) => (
                    <option
                      key={pageNumber}
                      value={pageNumber}
                    >
                      {pageNumber} / {totalPages}
                    </option>
                  ))}
                </select>
              </div>
            </nav>


          <aside className="kj-media-detail">

            {!selectedItem ? (

              <div className="kj-media-detail-empty">

                Chọn một ảnh để quản lý.

              </div>

            ) : (

              <>

                <div className="kj-media-detail-preview">

                  <img

                    src={getImageUrl(selectedItem.image.url)}

                    alt={

                      selectedItem.image.alt ||

                      selectedItem.productName

                    }

                  />

                </div>



                <div className="kj-media-detail-copy">

                  <span>Sản phẩm</span>

                  <strong>{selectedItem.productName}</strong>



                  <span>SKU</span>

                  <strong>{selectedItem.sku || "—"}</strong>



                  <span>Danh mục</span>

                  <strong>

                    {selectedItem.parentCategoryName

                      ? `${selectedItem.parentCategoryName} › ${selectedItem.categoryName || ""}`

                      : selectedItem.categoryName || "—"}

                  </strong>



                  <span>File</span>

                  <strong>

                    {selectedItem.image.fileName ||

                      selectedItem.image.url}

                  </strong>



                  <span>Alt text</span>

                  <strong>{selectedItem.image.alt || "—"}</strong>

                </div>



                <div className="kj-media-detail-actions">

                  <button

                    type="button"

                    onClick={() => handleSetMain(selectedItem)}

                    disabled={saving || selectedItem.image.isMain}

                  >

                    ★ Đặt làm ảnh chính

                  </button>



                  <div className="kj-media-order-actions">

                    <button

                      type="button"

                      onClick={() => handleMove(selectedItem, -1)}

                      disabled={saving}

                    >

                      ↑ Lên

                    </button>



                    <button

                      type="button"

                      onClick={() => handleMove(selectedItem, 1)}

                      disabled={saving}

                    >

                      ↓ Xuống

                    </button>

                  </div>



                  <button

                    type="button"

                    className="danger"

                    onClick={() => handleDelete(selectedItem)}

                    disabled={saving}

                  >

                    Xóa ảnh

                  </button>

                </div>

              </>

            )}

          </aside>

        </div>

      )}

    </div>

  );

};



export default ProductMediaLibraryPage;
