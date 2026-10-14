import React, {

  useEffect,

  useRef,

  useState,

} from "react";

import AddProductPage from "./AddProductPage";

import ProductMediaLibraryPage from "./ProductMediaLibraryPage";

import BulkProductImportPage from "./BulkProductImportPage";

import { productApi } from "../api/productApi";

import { getImageUrl } from "../utils/getImageUrl";

import "../styles/AdminProductsPage.css";



type ProductImage = {
  url: string;
  fileName?: string;
  alt: string;

  // Image SEO
  title?: string;
  description?: string;
  caption?: string;

  isMain: boolean;
  sortOrder: number;
};



export type AdminProduct = {

  id: string;

  name: string;

  slug: string;

  sku: string;

  parentCategoryId?: string;

  parentCategoryName?: string;

  categoryId?: string;

  categoryName: string;

  price: number;

  salePrice: number;

  shortDescription: string;

  description: string;

  images: ProductImage[];

  specifications: {

    label: string;

    value: string;

  }[];

  seo: {
    title: string;
    description: string;
    keywords: string[];
    canonicalUrl: string;
    ogImage: string;

    // Rank Math style SEO
    focusKeyword?: string;
    robots?: string;
    schemaType?: string;
  };

  typography?: {
    titleFont?: string;
    descriptionFont?: string;
    letterSpacing?: number;
    lineHeight?: number;
  };

  textStyle?: {
    headingSize?: number;
    bodySize?: number;
    headingColor?: string;
    bodyColor?: string;
    alignment?: string;
  };

  tags: string[];

  productTagging: {

    isFeatured: boolean;

    isBestSeller: boolean;

    isNewArrival: boolean;

    isPromotion: boolean;

    collectionTags: string[];

  };

  visibility: {

    isPublished: boolean;

    showOnMenu: boolean;

  };

  status: "active" | "draft" | "inactive";



  publishStatus?:

    | "Published"

    | "Scheduled"

    | "Draft";



  publishAtUtc?: string | null;

  publishedAtUtc?: string | null;



  createdAtUtc: string;

  updatedAtUtc: string;

};



type PageMode =

  | "list"

  | "add"

  | "edit"

  | "media"

  | "bulk";



const TAKE = 50;



const formatPrice = (value: number) => {

  return new Intl.NumberFormat("vi-VN").format(value || 0);

};



const formatDateTime = (

  value?: string | null

) => {

  if (!value) {

    return "";

  }



  const date = new Date(value);



  if (Number.isNaN(date.getTime())) {

    return "";

  }



  return date.toLocaleString(

    "vi-VN"

  );

};



const AdminProductsPage: React.FC = () => {

  const [products, setProducts] = useState<AdminProduct[]>([]);

  const [loading, setLoading] = useState<boolean>(false);

  const [message, setMessage] = useState<string>("");



  const [total, setTotal] = useState<number>(0);

  const [skip, setSkip] = useState<number>(0);



  const [mode, setMode] = useState<PageMode>("list");

  const [selectedProduct, setSelectedProduct] =

    useState<AdminProduct | null>(null);



  const didLoadRef = useRef(false);



  const fetchProducts = async (

    nextSkip = 0,

    silent = false

  ) => {

    try {

      if (!silent) {

        setLoading(true);

      }



      setMessage("");



      const data = await productApi.getAdminProducts(

        nextSkip,

        TAKE

      );



      setProducts(data.products || []);

      setTotal(data.total || 0);

      setSkip(nextSkip);

    } catch (error) {

      const err = error as Error;



      if (!silent) {

        setMessage(

          err.message ||

            "Có lỗi xảy ra khi tải sản phẩm."

        );

      }

    } finally {

      if (!silent) {

        setLoading(false);

      }

    }

  };



  useEffect(() => {

    if (didLoadRef.current) {

      return;

    }



    didLoadRef.current = true;

    fetchProducts(0);

  }, []);



  // Tự làm mới danh sách để Admin thấy sản phẩm

  // chuyển Scheduled -> Published sau khi Worker chạy.

  useEffect(() => {

    if (mode !== "list") {

      return;

    }



    const timer =

      window.setInterval(() => {

        fetchProducts(

          skip,

          true

        );

      }, 30_000);



    return () => {

      window.clearInterval(timer);

    };

  }, [mode, skip]);



  const handleAdd = () => {

    setSelectedProduct(null);

    setMode("add");

  };



  const handleEdit = async (

    product: AdminProduct

  ) => {

    try {

      setLoading(true);

      setMessage("");



      const data =

        await productApi.getAdminProductDetail(

          product.id

        );



      setSelectedProduct(data.product);

      setMode("edit");

    } catch (error) {

      const err = error as Error;



      setMessage(

        err.message ||

          "Không thể tải chi tiết sản phẩm."

      );

    } finally {

      setLoading(false);

    }

  };



  const handleBackToList = async () => {

    setMode("list");

    setSelectedProduct(null);

    await fetchProducts(skip);

  };



  const handleDelete = async (

    product: AdminProduct

  ) => {

    const ok = window.confirm(

      `Bạn có chắc muốn xóa sản phẩm "${product.name}" không?`

    );



    if (!ok) {

      return;

    }



    try {

      setMessage("");



      await productApi.deleteProduct(product.id);



      setMessage(

        "Xóa sản phẩm thành công."

      );



      const shouldGoPrevPage =

        products.length === 1 && skip > 0;



      const nextSkip = shouldGoPrevPage

        ? Math.max(0, skip - TAKE)

        : skip;



      await fetchProducts(nextSkip);

    } catch (error) {

      const err = error as Error;



      setMessage(

        err.message ||

          "Có lỗi xảy ra khi xóa sản phẩm."

      );

    }

  };



  if (mode === "add") {

    return (

      <AddProductPage

        mode="create"

        onBack={handleBackToList}

        onSaved={handleBackToList}

      />

    );

  }



  if (

    mode === "edit" &&

    selectedProduct

  ) {

    return (

      <AddProductPage
        mode="edit"
        initialProduct={{
          ...selectedProduct,

          seo: {
            title: selectedProduct.seo?.title || "",
            description: selectedProduct.seo?.description || "",
            keywords: selectedProduct.seo?.keywords || [],
            canonicalUrl: selectedProduct.seo?.canonicalUrl || "",
            ogImage: selectedProduct.seo?.ogImage || "",
            focusKeyword: selectedProduct.seo?.focusKeyword || "",
            robots: selectedProduct.seo?.robots || "index,follow",
            schemaType: selectedProduct.seo?.schemaType || "Product",
          },

          images: (selectedProduct.images || []).map((image) => ({
            ...image,
            alt: image.alt || selectedProduct.name,
            title: image.title || selectedProduct.name,
            description: image.description || "",
            caption: image.caption || "",
          })),
        }}
        onBack={handleBackToList}
        onSaved={handleBackToList}
      />

    );

  }



  if (mode === "media") {

    return (

      <ProductMediaLibraryPage

        onBack={handleBackToList}

      />

    );

  }



  if (mode === "bulk") {

    return (

      <BulkProductImportPage

        onBack={handleBackToList}

        onFinished={handleBackToList}

      />

    );

  }



  return (

    <div className="admin-products-page">

      <div className="products-header">

        <div>

          <span className="admin-eyebrow">

            Product Management

          </span>



          <h1>

            Danh sách sản phẩm

          </h1>



          <p>

            Quản lý sản phẩm, thư viện ảnh

            và import hàng loạt.

          </p>

        </div>



        <div className="product-management-actions">

          <button

            type="button"

            className="product-management-action secondary"

            onClick={() => setMode("media")}

          >

            ▧ Quản lý hình ảnh

          </button>



          <button

            type="button"

            className="product-management-action secondary"

            onClick={() => setMode("bulk")}

          >

            ⇧ Import hàng loạt

          </button>



          <button

            type="button"

            className="add-product-btn"

            onClick={handleAdd}

          >

            + Thêm sản phẩm

          </button>

        </div>

      </div>



      <div className="product-management-shortcuts">

        <button

          type="button"

          onClick={() => setMode("media")}

        >

          <span className="shortcut-number">

            01

          </span>



          <strong>

            Media Library

          </strong>



          <span>

            Xem toàn bộ ảnh theo SKU, đặt

            ảnh chính, đổi thứ tự và xóa ảnh.

          </span>

        </button>



        <button

          type="button"

          onClick={() => setMode("bulk")}

        >

          <span className="shortcut-number">

            02

          </span>



          <strong>

            Bulk Import

          </strong>



          <span>

            Import CSV + nhiều ảnh, tự động

            đối chiếu ảnh theo SKU.

          </span>

        </button>



        <button

          type="button"

          onClick={handleAdd}

        >

          <span className="shortcut-number">

            03

          </span>



          <strong>

            Single Product

          </strong>



          <span>

            Thêm hoặc chỉnh sửa thủ công

            từng sản phẩm.

          </span>

        </button>

      </div>



      {message && (

        <div className="admin-product-message">

          {message}

        </div>

      )}



      <section className="product-list-panel">

        {loading && (

          <div className="product-list-empty">

            Đang tải sản phẩm...

          </div>

        )}



        {!loading &&

          products.length === 0 && (

            <div className="product-list-empty">

              <h2>

                Chưa có sản phẩm

              </h2>



              <p>

                Bấm “Thêm sản phẩm” hoặc

                “Import hàng loạt”.

              </p>

            </div>

          )}



        {!loading &&

          products.length > 0 && (

            <>

              <div className="admin-product-table-wrap">

                <table className="admin-product-table">

                  <thead>

                    <tr>

                      <th>

                        Sản phẩm

                      </th>



                      <th>

                        Danh mục

                      </th>



                      <th>

                        Giá

                      </th>



                      <th>

                        Số ảnh

                      </th>



                      <th>

                        Hiển thị

                      </th>



                      <th>

                        Menu

                      </th>



                      <th>

                        Trạng thái / lịch đăng

                      </th>



                      <th>

                        Thao tác

                      </th>

                    </tr>

                  </thead>



                  <tbody>

                    {products.map(

                      (product) => {

                        const mainImage =

                          product.images?.find(

                            (image) =>

                              image.isMain

                          ) ||

                          product.images?.[0];



                        const publishStatus =

                          product.publishStatus ||

                          (product.visibility

                            ?.isPublished

                            ? "Published"

                            : "Draft");



                        const publishLabel =

                          publishStatus ===

                          "Published"

                            ? "Đã đăng"

                            : publishStatus ===

                                "Scheduled"

                              ? "Đã hẹn giờ"

                              : "Bản nháp";



                        return (

                          <tr

                            key={product.id}

                          >

                            <td>

                              <div className="product-cell">

                                <div className="product-thumb">

                                  {mainImage?.url ? (

                                    <img

                                      src={getImageUrl(

                                        mainImage.url

                                      )}

                                      alt={

                                        product.name

                                      }

                                      loading="lazy"

                                    />

                                  ) : (

                                    <span>

                                      ◆

                                    </span>

                                  )}

                                </div>



                                <div>

                                  <strong>

                                    {

                                      product.name

                                    }

                                  </strong>



                                  <small>

                                    {product.sku ||

                                      product.slug}

                                  </small>

                                </div>

                              </div>

                            </td>



                            <td>

                              <div className="product-category-cell">

                                <strong>

                                  {product.parentCategoryName ||

                                    "Chưa có danh mục chính"}

                                </strong>



                                <small

                                  style={{

                                    display: "block",

                                    marginTop: "4px",

                                  }}

                                >

                                  {product.categoryName

                                    ? `› ${product.categoryName}`

                                    : "› Chưa có mục sản phẩm"}

                                </small>

                              </div>

                            </td>



                            <td>

                              {product.salePrice >

                              0 ? (

                                <div className="price-cell">

                                  <strong>

                                    {formatPrice(

                                      product.salePrice

                                    )}{" "}

                                    VNĐ

                                  </strong>



                                  <small>

                                    {formatPrice(

                                      product.price

                                    )}{" "}

                                    VNĐ

                                  </small>

                                </div>

                              ) : (

                                <strong>

                                  {formatPrice(

                                    product.price

                                  )}{" "}

                                  VNĐ

                                </strong>

                              )}

                            </td>



                            <td>

                              <button

                                type="button"

                                className="image-count-button"

                                onClick={() =>

                                  setMode(

                                    "media"

                                  )

                                }

                                title="Mở thư viện hình ảnh"

                              >

                                <span>

                                  {product

                                    .images

                                    ?.length ||

                                    0}

                                </span>



                                ảnh

                              </button>

                            </td>



                            <td>

                              <span

                                className={

                                  product

                                    .visibility

                                    ?.isPublished

                                    ? "status-pill active"

                                    : "status-pill off"

                                }

                              >

                                {product

                                  .visibility

                                  ?.isPublished

                                  ? "ON"

                                  : "OFF"}

                              </span>

                            </td>



                            <td>

                              <span

                                className={

                                  product

                                    .visibility

                                    ?.showOnMenu

                                    ? "status-pill active"

                                    : "status-pill off"

                                }

                              >

                                {product

                                  .visibility

                                  ?.showOnMenu

                                  ? "ON"

                                  : "OFF"}

                              </span>

                            </td>



                            <td>

                              <div>

                                <span

                                  className={`status-pill ${product.status}`}

                                >

                                  {

                                    product.status

                                  }

                                </span>



                                <div

                                  style={{

                                    marginTop:

                                      "6px",

                                  }}

                                >

                                  <span

                                    className={

                                      publishStatus ===

                                      "Published"

                                        ? "status-pill active"

                                        : "status-pill off"

                                    }

                                  >

                                    {

                                      publishLabel

                                    }

                                  </span>

                                </div>



                                {publishStatus ===

                                  "Scheduled" &&

                                  product.publishAtUtc && (

                                    <small

                                      style={{

                                        display:

                                          "block",

                                        marginTop:

                                          "6px",

                                      }}

                                    >

                                      {formatDateTime(

                                        product.publishAtUtc

                                      )}

                                    </small>

                                  )}

                              </div>

                            </td>



                            <td>

                              <div className="table-actions">

                                <button

                                  type="button"

                                  className="edit-btn"

                                  onClick={() =>

                                    handleEdit(

                                      product

                                    )

                                  }

                                >

                                  Sửa

                                </button>



                                <button

                                  type="button"

                                  className="delete-btn"

                                  onClick={() =>

                                    handleDelete(

                                      product

                                    )

                                  }

                                >

                                  Xóa

                                </button>

                              </div>

                            </td>

                          </tr>

                        );

                      }

                    )}

                  </tbody>

                </table>

              </div>



              <div className="product-pagination">

                <button

                  type="button"

                  disabled={skip <= 0}

                  onClick={() =>

                    fetchProducts(

                      Math.max(

                        0,

                        skip - TAKE

                      )

                    )

                  }

                >

                  Trang trước

                </button>



                <span>

                  Đang hiển thị{" "}

                  {skip + 1} -{" "}

                  {Math.min(

                    skip + TAKE,

                    total

                  )}{" "}

                  / {total}

                </span>



                <button

                  type="button"

                  disabled={

                    skip + TAKE >=

                    total

                  }

                  onClick={() =>

                    fetchProducts(

                      skip + TAKE

                    )

                  }

                >

                  Trang sau

                </button>

              </div>

            </>

          )}

      </section>

    </div>

  );

};



export default AdminProductsPage;
