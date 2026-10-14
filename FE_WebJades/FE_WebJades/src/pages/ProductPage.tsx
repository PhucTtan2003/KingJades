
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Link, useLocation } from "react-router-dom";

import Header from "../components/Header";

import Footer from "../components/Footer";

import FavoriteDrawer, { FavoriteProduct } from "../pages/FavoriteDrawer";

import { productApi, PublicProductListItem } from "../api/productApi";

import { getImageUrl } from "../utils/getImageUrl";

import {

  PRODUCT_MENU,

  getAllPublicProductMenuItems,

  getProductMenuCategory,

  getProductMenuCategoryByName,

  resolveProductMenuSelection,

} from "../config/productMenuConfig";

import productHeroFallback from "../assets/product/hero-aodai-bangle.png";

import sizeGuideImage from "../assets/product/dosize.jpg";

import "../styles/ProductPage.css";



type ProductImage = {

  url: string;

  fileName?: string;

  alt: string;

  isMain: boolean;

  sortOrder: number;

};



type Product = {

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

  tags: string[];

  visibility: {

    isPublished: boolean;

    showOnMenu: boolean;

  };

  status: "active" | "draft" | "inactive";



  publishStatus?:

    | "Published"

    | "Scheduled"

    | "Draft";

};



type CartItem = FavoriteProduct & {

  quantity: number;

};



type SortType = "newest" | "price-asc" | "price-desc" | "sale";



const FAVORITE_STORAGE_KEY = "king_jades_favorites";

const CART_STORAGE_KEY = "king_jades_cart";

const PAGE_SIZE = 16;

// Ảnh popup đo size đã đặt trong src/assets/product/dosize.jpg.
// Nếu ảnh không tải được, modal sẽ hiển thị bảng SVG dự phòng.
const SIZE_GUIDE_IMAGE_URL = sizeGuideImage;




type PublicProductListItemExtended =

  PublicProductListItem & {

    tags?: string[];

    showOnMenu?: boolean;

    visibility?: {

      showOnMenu?: boolean;

    };

  };



const mapPublicListItemToProduct = (

  item: PublicProductListItemExtended

): Product => {

  const mainImage =

    item.mainImage?.trim() || "";



  return {

    id: item.id,

    name: item.name,

    slug: item.slug,

    sku: item.sku,



    parentCategoryId:

      item.parentCategoryId,



    parentCategoryName:

      item.parentCategoryName,



    categoryId:

      item.categoryId,



    categoryName:

      item.categoryName,



    price:

      item.price,



    salePrice:

      item.salePrice,



    shortDescription:

      item.shortDescription || "",



    description:

      "",



    images:

      mainImage

        ? [

            {

              url: mainImage,

              alt: item.name,

              isMain: true,

              sortOrder: 1,

            },

          ]

        : [],



    tags:

      Array.isArray(item.tags)

        ? item.tags

        : [],



    visibility: {

      isPublished: true,

      showOnMenu:

        item.showOnMenu === true ||

        item.visibility

          ?.showOnMenu === true,

    },



    status:

      "active",



    publishStatus:

      "Published",

  };

};



const formatPrice = (value: number) => {

  if (!value || value <= 0) return "Giá liên hệ";



  const formattedPrice = new Intl.NumberFormat("vi-VN").format(value);



  let hasKeptFirstDigit = false;



  const maskedPrice = formattedPrice.replace(/\d/g, (digit) => {

    if (!hasKeptFirstDigit) {

      hasKeptFirstDigit = true;

      return digit;

    }



    return "x";

  });



  return `${maskedPrice}\u00A0đ`;

};



const getFinalPrice = (product: Product) => {

  return product.salePrice && product.salePrice > 0

    ? product.salePrice

    : product.price;

};



const readStorageArray = <T,>(key: string): T[] => {

  if (typeof window === "undefined") return [];



  try {

    const saved = window.localStorage.getItem(key);

    return saved ? JSON.parse(saved) : [];

  } catch {

    return [];

  }

};



const SearchIcon = () => (

  <svg viewBox="0 0 24 24" aria-hidden="true">

    <circle cx="11" cy="11" r="6.5" />

    <path d="m16 16 4 4" />

  </svg>

);



const EyeIcon = () => (

  <svg viewBox="0 0 24 24" aria-hidden="true">

    <path d="M2.8 12s3.2-5.4 9.2-5.4S21.2 12 21.2 12 18 17.4 12 17.4 2.8 12 2.8 12Z" />

    <circle cx="12" cy="12" r="2.6" />

  </svg>

);



const BagIcon = () => (

  <svg viewBox="0 0 24 24" aria-hidden="true">

    <path d="M5.5 8.5h13l-1 11h-11l-1-11Z" />

    <path d="M9 9V6.8a3 3 0 0 1 6 0V9" />

  </svg>

);



const HeartIcon = () => (

  <svg viewBox="0 0 24 24" aria-hidden="true">

    <path d="M20.8 4.8a5.2 5.2 0 0 0-7.4 0L12 6.2l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z" />

  </svg>

);



const ResetIcon = () => (

  <svg viewBox="0 0 24 24" aria-hidden="true">

    <path d="M4 7v5h5" />

    <path d="M5.4 16.5A8 8 0 1 0 6 6.2L4 8" />

  </svg>

);



const ArrowIcon = () => (

  <svg viewBox="0 0 24 24" aria-hidden="true">

    <path d="M5 12h14" />

    <path d="m14 7 5 5-5 5" />

  </svg>

);



const SizeGuideIcon = () => (

  <svg viewBox="0 0 24 24" aria-hidden="true">

    <circle cx="12" cy="12" r="6.2" />

    <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3" />

    <path d="M7.7 7.7 5.6 5.6M16.3 7.7l2.1-2.1M7.7 16.3l-2.1 2.1M16.3 16.3l2.1 2.1" />

  </svg>

);



const CloseIcon = () => (

  <svg viewBox="0 0 24 24" aria-hidden="true">

    <path d="m6 6 12 12M18 6 6 18" />

  </svg>

);



const SizeGuideModal: React.FC<{

  onClose: () => void;

}> = ({ onClose }) => {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  return (

    <div

      className="kj-size-guide-modal"

      role="dialog"

      aria-modal="true"

      aria-labelledby="kj-size-guide-title"

    >

      <button

        type="button"

        className="kj-size-guide-backdrop"

        onClick={onClose}

        aria-label="Đóng hướng dẫn đo size vòng"

      />



      <section className="kj-size-guide-panel">

        <header className="kj-size-guide-head">

          <div>

            <span className="kj-shop-eyebrow">Ring Size SVG</span>

            <h2 id="kj-size-guide-title">Ướm thử size vòng</h2>

            <p>

              Xem hướng dẫn để tham khảo đường kính trong của vòng. Muốn đo

              chính xác nên in ở tỉ lệ 100% hoặc dùng thước đo thực tế.

            </p>

          </div>



          <button

            type="button"

            className="kj-size-guide-close"

            onClick={onClose}

            aria-label="Đóng"

          >

            <CloseIcon />

          </button>

        </header>



        <div className="kj-size-guide-canvas" aria-label="Bảng hướng dẫn đo size vòng">
          {SIZE_GUIDE_IMAGE_URL && !imageLoadFailed ? (
            <img
              className="kj-size-guide-custom-image"
              src={SIZE_GUIDE_IMAGE_URL}
              alt="Hình hướng dẫn đo size vòng ngọc"
              onError={() => setImageLoadFailed(true)}
            />
          ) : (
          <svg

            className="kj-size-guide-svg"

            viewBox="0 0 760 430"

            role="img"

            aria-labelledby="kj-size-guide-svg-title kj-size-guide-svg-desc"

          >

            <title id="kj-size-guide-svg-title">Bảng SVG đo size vòng đá</title>

            <desc id="kj-size-guide-svg-desc">

              Các vòng tròn tham khảo đường kính trong 50, 52, 54, 56, 58 và 60 mm.

            </desc>



            <defs>

              <radialGradient id="kjSizeGoldGlow" cx="50%" cy="45%" r="60%">

                <stop offset="0%" stopColor="#F8D169" stopOpacity="0.22" />

                <stop offset="100%" stopColor="#D9B21D" stopOpacity="0" />

              </radialGradient>

              <linearGradient id="kjSizeNavy" x1="0" y1="0" x2="1" y2="1">

                <stop offset="0%" stopColor="#1C2042" />

                <stop offset="100%" stopColor="#253065" />

              </linearGradient>

            </defs>



            <rect x="0" y="0" width="760" height="430" rx="34" fill="#FBF8F4" />

            <circle cx="640" cy="56" r="140" fill="url(#kjSizeGoldGlow)" />

            <path

              d="M56 73h648M56 73v18M164 73v18M272 73v18M380 73v18M488 73v18M596 73v18M704 73v18"

              fill="none"

              stroke="#D9B21D"

              strokeWidth="3"

              strokeLinecap="round"

            />

            <text x="56" y="48" fill="#253065" fontSize="18" fontWeight="700">

              Vạch kiểm tra tham khảo

            </text>

            <text x="56" y="118" fill="#706d65" fontSize="13">

              Đặt thước thật lên vạch này để kiểm tra tỉ lệ màn hình/in ấn.

            </text>



            <g className="kj-size-rings" fill="none" stroke="url(#kjSizeNavy)" strokeWidth="3">

              <circle cx="135" cy="245" r="50" />

              <circle cx="255" cy="245" r="52" />

              <circle cx="381" cy="245" r="54" />

              <circle cx="513" cy="245" r="56" />

              <circle cx="651" cy="245" r="58" />

            </g>



            <g fill="#253065" fontWeight="700" fontSize="17" textAnchor="middle">

              <text x="135" y="248">50 mm</text>

              <text x="255" y="248">52 mm</text>

              <text x="381" y="248">54 mm</text>

              <text x="513" y="248">56 mm</text>

              <text x="651" y="248">58 mm</text>

            </g>



            <g fill="#D9B21D" fontWeight="700" fontSize="11" textAnchor="middle" letterSpacing="1.5">

              <text x="135" y="315">SIZE NHỎ</text>

              <text x="255" y="315">SIZE 52</text>

              <text x="381" y="315">SIZE 54</text>

              <text x="513" y="315">SIZE 56</text>

              <text x="651" y="315">SIZE 58</text>

            </g>



            <g transform="translate(72 358)">

              <rect width="616" height="42" rx="21" fill="#F2EDE0" />

              <text x="24" y="27" fill="#253065" fontSize="13" fontWeight="700">

                Gợi ý: đo đường kính trong của vòng vừa tay, rồi so với vòng tròn gần nhất.

              </text>

            </g>

          </svg>
          )}
        </div>



        <div className="kj-size-guide-note">

          <strong>Lưu ý đo size</strong>

          <span>

            Kích thước trên màn hình có thể lệch tùy thiết bị. Bảng này dùng để

            tham khảo nhanh; tư vấn viên vẫn cần xác nhận lại size trước khi chốt.

          </span>

        </div>

      </section>

    </div>

  );

};



const ProductPage: React.FC = () => {

  const location = useLocation();



  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [message, setMessage] = useState<string>("");



  const [searchText, setSearchText] = useState<string>("");

  const [selectedParentCategory, setSelectedParentCategory] =

    useState<string>("all");

  const [selectedParentCategoryId, setSelectedParentCategoryId] =

    useState<string>("");

  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [selectedCategoryId, setSelectedCategoryId] =

    useState<string>("");

  const [sortType, setSortType] = useState<SortType>("newest");

  const [onlySale, setOnlySale] = useState<boolean>(false);

  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState<boolean>(false);



  const [isFavoriteOpen, setIsFavoriteOpen] = useState<boolean>(false);

  const [favoriteItems, setFavoriteItems] = useState<FavoriteProduct[]>(() =>

    readStorageArray<FavoriteProduct>(FAVORITE_STORAGE_KEY)

  );

  const [cartItems, setCartItems] = useState<CartItem[]>(() =>

    readStorageArray<CartItem>(CART_STORAGE_KEY)

  );



  const [totalProducts, setTotalProducts] =

    useState<number>(0);



  const [globalTotal, setGlobalTotal] =

    useState<number>(0);



  const [currentPage, setCurrentPage] =

    useState<number>(1);



  const [debouncedSearch, setDebouncedSearch] =

    useState<string>("");



  const [isUrlReady, setIsUrlReady] =

    useState<boolean>(false);



  const [heroProduct, setHeroProduct] =

    useState<Product | null>(null);



  const [featuredProductIds, setFeaturedProductIds] =

    useState<Set<string>>(

      () => new Set<string>()

    );



  const [parentCategoryCounts, setParentCategoryCounts] =

    useState<Record<string, number>>({});



  const activeRequestRef =

    useRef<AbortController | null>(null);



  const effectiveParentCategoryId =

    useMemo(

      () => {

        if (selectedParentCategoryId) {

          return selectedParentCategoryId;

        }



        if (

          selectedParentCategory ===

          "all"

        ) {

          return "";

        }



        return (

          getProductMenuCategoryByName(

            selectedParentCategory

          )?.id || ""

        );

      },

      [

        selectedParentCategory,

        selectedParentCategoryId,

      ]

    );



  const effectiveCategoryId =

    useMemo(

      () => {

        if (selectedCategoryId) {

          return selectedCategoryId;

        }



        if (

          selectedCategory ===

          "all"

        ) {

          return "";

        }



        const parent =

          getProductMenuCategory(

            effectiveParentCategoryId

          );



        const source =

          parent

            ? [parent]

            : PRODUCT_MENU;



        return (

          source

            .flatMap(

              (category) =>

                getAllPublicProductMenuItems(

                  category

                )

            )

            .find(

              (item) =>

                item.name ===

                selectedCategory

            )

            ?.id || ""

        );

      },

      [

        effectiveParentCategoryId,

        selectedCategory,

        selectedCategoryId,

      ]

    );



  const fetchProducts = useCallback(async (page = 1) => {

    const controller = new AbortController();

    activeRequestRef.current?.abort();

    activeRequestRef.current = controller;

    setLoading(true);

    setMessage("");



    try {

      const data = await productApi.getPublicProductsPaged(

        {

          page,

          pageSize: PAGE_SIZE,

          search: debouncedSearch,

          parentCategoryId: effectiveParentCategoryId,

          categoryId: effectiveCategoryId,

          saleOnly: onlySale,

          sort: sortType,

        },

        controller.signal

      );



      if (controller.signal.aborted) return;



      const mappedProducts = (data.items || []).map((item) =>

        mapPublicListItemToProduct(item as PublicProductListItemExtended)

      );

      setProducts(mappedProducts);

      setTotalProducts(Number(data.total || 0));

      setCurrentPage(Number(data.page || page));

    } catch (error) {

      if (controller.signal.aborted) return;



      setMessage((error as Error).message || "Không thể tải danh sách sản phẩm.");

      setProducts([]);

      setTotalProducts(0);

      setCurrentPage(page);

    } finally {

      // An older, aborted request must not turn off the newer page's loading state.

      if (activeRequestRef.current === controller) {

        activeRequestRef.current = null;

        setLoading(false);

      }

    }

  }, [

    debouncedSearch,

    effectiveParentCategoryId,

    effectiveCategoryId,

    onlySale,

    sortType,

  ]);



  /*

   * Debounce search để không gửi request

   * ở mỗi ký tự người dùng gõ.

   */

  useEffect(() => {

    const timer =

      window.setTimeout(

        () => {

          setDebouncedSearch(

            searchText.trim()

          );

        },

        350

      );



    return () => {

      window.clearTimeout(

        timer

      );

    };

  }, [searchText]);



  /*

   * Load metadata nhẹ dùng để:

   * - giữ tổng số sản phẩm ở Hero

   * - giữ count của category cards

   * - giữ sản phẩm nổi bật độc lập với filter hiện tại

   *

   * Không load toàn bộ catalog.

   */

  useEffect(() => {

    const controller =

      new AbortController();



    const loadMetadata =

      async () => {

        try {

          const countRequests =

            PRODUCT_MENU.map(

              async (

                category

              ) => {

                const result =

                  await productApi

                    .getPublicProductsPaged(

                      {

                        page: 1,

                        pageSize: 1,

                        parentCategoryId:

                          category.id,

                        sort:

                          "newest",

                      },

                      controller.signal

                    );



                return [

                  category.name,

                  Number(

                    result.total ||

                      0

                  ),

                ] as const;

              }

            );



          const [

            allProductsResult,

            menuResult,

            categoryCountEntries,

          ] =

            await Promise.all([

              productApi

                .getPublicProductsPaged(

                  {

                    page: 1,

                    pageSize: 1,

                    sort:

                      "newest",

                  },

                  controller.signal

                ),



              productApi

                .getMenuProducts(

                  controller.signal

                ),



              Promise.all(

                countRequests

              ),

            ]);



          if (

            controller.signal.aborted

          ) {

            return;

          }



          setGlobalTotal(

            Number(

              allProductsResult

                .total || 0

            )

          );



          setParentCategoryCounts(

            Object.fromEntries(

              categoryCountEntries

            )

          );



          const menuProducts =

            Array.isArray(

              menuResult?.products

            )

              ? (

                  menuResult.products as Product[]

                )

              : [];



          setFeaturedProductIds(

            new Set(

              menuProducts.map(

                (product) =>

                  product.id

              )

            )

          );



          if (

            menuProducts.length >

            0

          ) {

            setHeroProduct(

              menuProducts[0]

            );

          } else if (

            allProductsResult

              .items?.length >

            0

          ) {

            setHeroProduct(

              mapPublicListItemToProduct(

                allProductsResult

                  .items[0] as

                  PublicProductListItemExtended

              )

            );

          }

        } catch {

          /*

           * Metadata phụ không được làm fail ProductPage.

           * Danh sách chính vẫn hoạt động bình thường.

           */

        }

      };



    loadMetadata();



    return () => {

      controller.abort();

    };

  }, []);



  /*

   * Mỗi khi filter/search/sort thay đổi:

   * reset về page 1 và query server.

   */

  useEffect(() => {

    if (!isUrlReady) {

      return;

    }



    fetchProducts(1);



    return () => {

      activeRequestRef.current?.abort();

    };

  }, [

    fetchProducts,

    isUrlReady,

  ]);



  useEffect(() => {

    const params = new URLSearchParams(location.search);



    const keyword =

      params.get("search") || "";



    // Hỗ trợ cả URL mới dùng ID lẫn URL cũ dùng tên.

    const parentCategoryId =

      params.get("parentCategoryId") || "";



    const categoryId =

      params.get("categoryId") || "";



    const parentCategory =

      params.get("parentCategory") || "all";



    const category =

      params.get("category") || "all";



    setSearchText(keyword);

    setDebouncedSearch(

      keyword.trim()

    );



    setSelectedParentCategoryId(

      parentCategoryId

    );



    setSelectedCategoryId(

      categoryId

    );



    setSelectedParentCategory(

      parentCategoryId

        ? "all"

        : parentCategory

    );



    setSelectedCategory(

      categoryId

        ? "all"

        : category

    );



    setIsUrlReady(true);

  }, [location.search]);



  // Khi URL truyền fixed ID, suy ra tên từ PRODUCT_MENU.

  useEffect(() => {

    const resolved =

      resolveProductMenuSelection({

        parentCategoryId:

          selectedParentCategoryId,

        parentCategoryName:

          selectedParentCategory ===

          "all"

            ? ""

            : selectedParentCategory,

        categoryId:

          selectedCategoryId,

        categoryName:

          selectedCategory ===

          "all"

            ? ""

            : selectedCategory,

      });



    if (resolved) {

      setSelectedParentCategory(

        resolved.category.name

      );



      setSelectedCategory(

        resolved.item.name

      );



      return;

    }



    const parent =

      getProductMenuCategory(

        selectedParentCategoryId

      );



    if (parent) {

      setSelectedParentCategory(

        parent.name

      );

    }

  }, [

    selectedParentCategoryId,

    selectedCategoryId,

  ]);



  useEffect(() => {

    if (!isSizeGuideOpen) return;



    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";



    const handleKeyDown = (event: KeyboardEvent) => {

      if (event.key === "Escape") {

        setIsSizeGuideOpen(false);

      }

    };



    window.addEventListener("keydown", handleKeyDown);



    return () => {

      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleKeyDown);

    };

  }, [isSizeGuideOpen]);



  useEffect(() => {

    window.localStorage.setItem(

      FAVORITE_STORAGE_KEY,

      JSON.stringify(favoriteItems)

    );

  }, [favoriteItems]);



  useEffect(() => {

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));

  }, [cartItems]);



  const parentCategories =

    useMemo(

      () =>

        PRODUCT_MENU.map(

          (category) =>

            category.name

        ),

      []

    );



  const selectedFixedParent =

    useMemo(

      () =>

        getProductMenuCategory(

          selectedParentCategoryId

        ) ||

        (

          selectedParentCategory !==

          "all"

            ? getProductMenuCategoryByName(

                selectedParentCategory

              )

            : undefined

        ),

      [

        selectedParentCategory,

        selectedParentCategoryId,

      ]

    );



  const categories =

    useMemo(

      () => {

        const source =

          selectedFixedParent

            ? [

                selectedFixedParent,

              ]

            : PRODUCT_MENU;



        return source.flatMap(

          (category) =>

            getAllPublicProductMenuItems(

              category

            ).map(

              (item) =>

                item.name

            )

        );

      },

      [selectedFixedParent]

    );



  /*

   * Không xóa filter chỉ vì category hiện chưa có sản phẩm.

   * Menu là cố định, nên trang có thể hợp lệ và hiển thị 0 sản phẩm.

   */

  useEffect(() => {

    if (selectedCategoryId) {

      const exists =

        PRODUCT_MENU.some(

          (category) =>

            getAllPublicProductMenuItems(

              category

            ).some(

              (item) =>

                item.id ===

                selectedCategoryId

            )

        );



      if (!exists) {

        setSelectedCategoryId(

          ""

        );

        setSelectedCategory(

          "all"

        );

      }

    }

  }, [

    selectedCategoryId,

  ]);



  /*

   * Filter/search/sort đã được xử lý ở backend.

   * Giữ biến filteredProducts để JSX/CSS hiện tại không phải đổi.

   */

  const filteredProducts = products;

  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));

  const firstVisibleProduct = filteredProducts.length

    ? (currentPage - 1) * PAGE_SIZE + 1

    : 0;

  const lastVisibleProduct = Math.min(

    (currentPage - 1) * PAGE_SIZE + filteredProducts.length,

    totalProducts

  );

  const paginationItems = useMemo(() => {

    const visible = [1, 2, currentPage - 1, currentPage, currentPage + 1,

      totalPages - 1, totalPages]

      .filter((page) => page >= 1 && page <= totalPages)

      .sort((a, b) => a - b);

    const unique = visible.filter(

      (page, index) => index === 0 || page !== visible[index - 1]

    );

    const items: Array<number | "ellipsis"> = [];



    unique.forEach((page, index) => {

      const previous = unique[index - 1];

      if (previous && page - previous === 2) items.push(previous + 1);

      if (previous && page - previous > 2) items.push("ellipsis");

      items.push(page);

    });

    return items;

  }, [currentPage, totalPages]);



  const currentFilteredHeroProduct =

  products.find(

    (product) =>

      featuredProductIds.has(product.id)

  ) ||

  products.find(

    (product) =>

      product.images?.length > 0

  ) ||

  products[0] ||

  null;



const hasActiveCategoryFilter =

  Boolean(

    effectiveParentCategoryId ||

    effectiveCategoryId ||

    debouncedSearch

  );



const featuredProduct =

  hasActiveCategoryFilter

    ? currentFilteredHeroProduct

    : heroProduct || currentFilteredHeroProduct;





  const cartCount = useMemo(() => {

    return cartItems.reduce((total, item) => total + item.quantity, 0);

  }, [cartItems]);



  const getMainImage = (product: Product) => {

    return product.images?.find((img) => img.isMain) || product.images?.[0];

  };



  const buildProductDetailState = (product: Product) => ({

    productPreview: {

      ...product,

      specifications: [],

      seo: undefined,

    },

  });



  /*

   * Product detail URL:

   * - Slug đã unique toàn hệ thống.

   * - Public URL chỉ dùng slug để giữ URL sạch / SEO.

   * - Không public Mongo Product ID trên URL.

   */

  const buildProductDetailUrl = (product: Product) => {

    return `/products/${encodeURIComponent(product.slug)}`;

  };



  const buildFavoriteProduct = (product: Product): FavoriteProduct => {

    const mainImage = getMainImage(product);



    return {

      id: product.id,

      name: product.name,

      price: getFinalPrice(product),

      image: mainImage?.url ? getImageUrl(mainImage.url) : "",

    };

  };



  const buildContactUrl = (product: Product) => {

    const params = new URLSearchParams({

      productId: product.id,

      productName: product.name,

      productSlug: product.slug,

    });



    return `/contact?${params.toString()}`;

  };



  const isFavoriteProduct = (productId: string) => {

    return favoriteItems.some((item) => item.id === productId);

  };



  const handleToggleFavorite = (product: Product) => {

    const favoriteProduct = buildFavoriteProduct(product);



    setFavoriteItems((previous) => {

      const existed = previous.some((item) => item.id === product.id);



      if (existed) {

        return previous.filter((item) => item.id !== product.id);

      }



      return [...previous, favoriteProduct];

    });



    setIsFavoriteOpen(true);

  };



  const handleRemoveFavorite = (id: string | number) => {

    setFavoriteItems((previous) =>

      previous.filter((item) => item.id !== id)

    );

  };



  const handleAddToCart = (product: FavoriteProduct) => {

    setCartItems((previous) => {

      const existed = previous.find((item) => item.id === product.id);



      if (existed) {

        return previous.map((item) =>

          item.id === product.id

            ? { ...item, quantity: item.quantity + 1 }

            : item

        );

      }



      return [...previous, { ...product, quantity: 1 }];

    });

  };



  const resetFilters = () => {

    setSearchText("");

    setSelectedParentCategory("all");

    setSelectedParentCategoryId("");

    setSelectedCategory("all");

    setSelectedCategoryId("");

    setSortType("newest");

    setOnlySale(false);

  };



  const goToPage = (page: number) => {

    if (page < 1 || page > totalPages || page === currentPage || loading) return;

    fetchProducts(page);

    document.getElementById("product-list")?.scrollIntoView({

      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches

        ? "auto"

        : "smooth",

      block: "start",

    });

  };



  const featuredImage = featuredProduct

    ? getMainImage(featuredProduct)

    : null;



  const featuredImageUrl = featuredImage?.url

    ? getImageUrl(featuredImage.url)

    : productHeroFallback;



  const featuredPrice = featuredProduct

    ? getFinalPrice(featuredProduct)

    : 0;



  return (

    <div className="kj-shop-page">

      <Header

        favoriteCount={favoriteItems.length}

        cartCount={cartCount}

        onOpenFavorite={() => setIsFavoriteOpen(true)}

      />



      <FavoriteDrawer

        isOpen={isFavoriteOpen}

        items={favoriteItems}

        onClose={() => setIsFavoriteOpen(false)}

        onRemove={handleRemoveFavorite}

        onAddToCart={handleAddToCart}

      />



      {isSizeGuideOpen && (

        <SizeGuideModal onClose={() => setIsSizeGuideOpen(false)} />

      )}



      <main className="kj-shop-main">

        <section className="kj-shop-hero">

          <div className="kj-shop-hero__pattern" aria-hidden="true" />

          <div className="kj-shop-hero__glow kj-shop-hero__glow--left" aria-hidden="true" />

          <div className="kj-shop-hero__glow kj-shop-hero__glow--right" aria-hidden="true" />



          <div className="kj-shop-shell kj-shop-hero__inner">

            <div className="kj-shop-hero__copy">

              <span className="kj-shop-eyebrow">BỘ SƯU TẬP KING JADES</span>



              <h1>Tuyển chọn vòng ngọc cho từng phong thái sống.</h1>



              <p>

                Khám phá những mẫu vòng ngọc được trình bày rõ ràng theo dòng

                sản phẩm, sắc độ và nhu cầu sử dụng. Mỗi lựa chọn đều có thể

                được tư vấn riêng về size, màu sắc và ý nghĩa.

              </p>



              <div className="kj-shop-hero__actions">

                <a href="#product-list" className="kj-shop-button kj-shop-button--gold">

                  Xem bộ sưu tập

                  <ArrowIcon />

                </a>



                <a href="/#fengshui" className="kj-shop-button kj-shop-button--light">

                  Xem ngọc hợp mệnh

                </a>

              </div>



              <div className="kj-shop-hero__facts" aria-label="Thông tin dịch vụ">

                <div>

                  <strong>{globalTotal || "KJ"}</strong>

                  <span>Sản phẩm trưng bày</span>

                </div>

                <div>

                  <strong>1:1</strong>

                  <span>Tư vấn riêng</span>

                </div>

                <button

                  type="button"

                  className="kj-shop-size-trigger"

                  onClick={() => setIsSizeGuideOpen(true)}

                  aria-label="Mở bảng SVG ướm thử size vòng"

                >

                  <span className="kj-shop-size-trigger__icon">

                    <SizeGuideIcon />

                  </span>



                  <span className="kj-shop-size-trigger__text">

                    <strong>Đo size</strong>

                    <small>Ướm vòng SVG</small>

                  </span>

                </button>

              </div>

            </div>



            <div className="kj-shop-hero__visual">

              <div className="kj-shop-hero__image-card">

                <img

                  src={featuredImageUrl}

                  alt={featuredProduct?.name || "Vòng ngọc King Jades"}

                />



                <span className="kj-shop-hero__image-label">

                  Tuyển chọn nổi bật

                </span>

              </div>



              <div className="kj-shop-hero__product-card">

                <span>

                  {featuredProduct?.categoryName || "King Jades Selected"}

                </span>



                <h2>{featuredProduct?.name || "Bộ sưu tập vòng ngọc"}</h2>



                <p>

                  {featuredProduct?.shortDescription ||

                    "Khám phá các mẫu vòng ngọc tinh tuyển và nhận tư vấn theo nhu cầu cá nhân."}

                </p>



                <div>

                  <strong>

                    {featuredProduct

                      ? formatPrice(featuredPrice)

                      : "Giá liên hệ"}

                  </strong>



                  {featuredProduct ? (

                    <Link

                      to={buildProductDetailUrl(featuredProduct)}

                      state={buildProductDetailState(featuredProduct)}

                    >

                      Xem chi tiết

                      <ArrowIcon />

                    </Link>

                  ) : (

                    <a href="#product-list">

                      Xem bộ sưu tập

                      <ArrowIcon />

                    </a>

                  )}

                </div>

              </div>

            </div>

          </div>

        </section>



        <section className="kj-shop-service-strip">

          <div className="kj-shop-shell kj-shop-service-strip__inner">

            <article>

              <span>01</span>

              <div>

                <strong>Tuyển chọn tinh tế</strong>

                <p>Trình bày sản phẩm theo hình ảnh, sắc độ và kiểu dáng.</p>

              </div>

            </article>



            <article>

              <span>02</span>

              <div>

                <strong>Tư vấn đúng nhu cầu</strong>

                <p>Hỗ trợ chọn size, màu sắc và mục đích sử dụng.</p>

              </div>

            </article>



            <article>

              <span>03</span>

              <div>

                <strong>Thông tin rõ ràng</strong>

                <p>Mã sản phẩm, danh mục, tag và nội dung dễ theo dõi.</p>

              </div>

            </article>



            <article>

              <span>04</span>

              <div>

                <strong>Hỗ trợ riêng 1:1</strong>

                <p>Gửi yêu cầu để King Jades liên hệ tư vấn trực tiếp.</p>

              </div>

            </article>

          </div>

        </section>



        {/*{(parentCategories.length > 0 ||

          categories.length > 0) && (

          <section className="kj-shop-collections">

            <div className="kj-shop-shell">

              <div className="kj-shop-section-heading">

                <div>

                  <span className="kj-shop-eyebrow">

                    Curated Categories

                  </span>

                  <h2>

                    Khám phá theo bộ sưu tập

                  </h2>

                </div>



                <p>

                  Chọn danh mục chính trước,

                  sau đó lọc tiếp theo từng mục

                  sản phẩm bên trong.

                </p>

              </div>



              <div className="kj-shop-category-cards">

                <button

                  type="button"

                  className={

                    selectedParentCategory ===

                      "all"

                      ? "active"

                      : ""

                  }

                  onClick={() => {

                    setSelectedParentCategory(

                      "all"

                    );

                    setSelectedParentCategoryId(

                      ""

                    );

                    setSelectedCategory(

                      "all"

                    );

                    setSelectedCategoryId(

                      ""

                    );

                  }}

                >

                  <small>

                    {globalTotal} mẫu

                  </small>

                  <strong>

                    Tất cả sản phẩm

                  </strong>

                  <span>

                    Xem bộ sưu tập

                  </span>

                </button>



                {parentCategories.length > 0

                  ? parentCategories

                      .slice(0, 5)

                      .map(

                        (parentCategory) => {

                          const count =

                            parentCategoryCounts[

                              parentCategory

                            ] ??

                            products.filter(

                              (product) =>

                                product.parentCategoryName ===

                                parentCategory

                            ).length;



                          return (

                            <button

                              type="button"

                              key={

                                parentCategory

                              }

                              className={

                                selectedParentCategory ===

                                parentCategory

                                  ? "active"

                                  : ""

                              }

                              onClick={() => {

                                const fixedParent =

                                  getProductMenuCategoryByName(

                                    parentCategory

                                  );



                                setSelectedParentCategory(

                                  parentCategory

                                );



                                setSelectedParentCategoryId(

                                  fixedParent?.id ||

                                    ""

                                );



                                setSelectedCategory(

                                  "all"

                                );



                                setSelectedCategoryId(

                                  ""

                                );

                              }}

                            >

                              <small>

                                {count} mẫu

                              </small>

                              <strong>

                                {

                                  parentCategory

                                }

                              </strong>

                              <span>

                                Xem mục bên trong

                              </span>

                            </button>

                          );

                        }

                      )

                  : categories

                      .slice(0, 5)

                      .map(

                        (category) => {

                          const count =

                            products.filter(

                              (product) =>

                                product.categoryName ===

                                category

                            ).length;



                          return (

                            <button

                              type="button"

                              key={category}

                              className={

                                selectedCategory ===

                                category

                                  ? "active"

                                  : ""

                              }

                              onClick={() => {

                                setSelectedCategory(

                                  category

                                );

                                setSelectedCategoryId(

                                  ""

                                );

                              }}

                            >

                              <small>

                                {count} mẫu

                              </small>

                              <strong>

                                {category}

                              </strong>

                              <span>

                                Khám phá ngay

                              </span>

                            </button>

                          );

                        }

                      )}

              </div>

            </div>

          </section>

        )}*/}



        <section className="kj-shop-products" id="product-list">

          <div className="kj-shop-shell">

            <div className="kj-shop-products__heading">

              <div>

                <span className="kj-shop-eyebrow">TUYỂN CHỌN DÀNH CHO BẠN</span>

                <h2>Tất cả sản phẩm</h2>

                <p>

                  Đang hiển thị <strong>{firstVisibleProduct}–{lastVisibleProduct}</strong> /{" "}

                  {totalProducts} sản phẩm.

                </p>

              </div>



              {/*<button

                type="button"

                className="kj-shop-refresh"

                onClick={() => fetchProducts()}

                disabled={loading}

              >

                <ResetIcon />

                {loading ? "Đang tải..." : "Làm mới"}

              </button>*/}&#x20;

            </div>



            <div className="kj-shop-toolbar">

              <label className="kj-shop-search">

                <SearchIcon />

                <input

                  value={searchText}

                  onChange={(event) => setSearchText(event.target.value)}

                  placeholder="Tìm tên sản phẩm, mã SKU, danh mục..."

                  aria-label="Tìm sản phẩm"

                />

              </label>



              {parentCategories.length > 0 && (

                <label className="kj-shop-select">

                  <span>Danh mục chính</span>

                  <select

                    value={

                      selectedParentCategory

                    }

                    onChange={(event) => {

                      const nextName =

                        event.target.value;



                      const fixedParent =

                        nextName ===

                        "all"

                          ? undefined

                          : getProductMenuCategoryByName(

                              nextName

                            );



                      setSelectedParentCategory(

                        nextName

                      );



                      setSelectedParentCategoryId(

                        fixedParent?.id ||

                          ""

                      );



                      setSelectedCategory(

                        "all"

                      );



                      setSelectedCategoryId(

                        ""

                      );

                    }}

                  >

                    <option value="all">

                      Tất cả danh mục chính

                    </option>



                    {parentCategories.map(

                      (parentCategory) => (

                        <option

                          value={

                            parentCategory

                          }

                          key={

                            parentCategory

                          }

                        >

                          {

                            parentCategory

                          }

                        </option>

                      )

                    )}

                  </select>

                </label>

              )}



              <label className="kj-shop-select">

                <span>Mục sản phẩm</span>

                <select

                  value={selectedCategory}

                  onChange={(event) => {

                    const nextName =

                      event.target.value;



                    const searchParents =

                      selectedFixedParent

                        ? [

                            selectedFixedParent,

                          ]

                        : PRODUCT_MENU;



                    const matchedItem =

                      searchParents

                        .flatMap(

                          (category) =>

                            getAllPublicProductMenuItems(

                              category

                            )

                        )

                        .find(

                          (item) =>

                            item.name ===

                            nextName

                        );



                    setSelectedCategory(

                      nextName

                    );



                    setSelectedCategoryId(

                      matchedItem?.id ||

                        ""

                    );

                  }}

                >

                  <option value="all">

                    Tất cả mục sản phẩm

                  </option>

                  {categories.map((category) => (

                    <option value={category} key={category}>

                      {category}

                    </option>

                  ))}

                </select>

              </label>



              <label className="kj-shop-select">

                <span>Sắp xếp</span>

                <select

                  value={sortType}

                  onChange={(event) =>

                    setSortType(event.target.value as SortType)

                  }

                >

                  <option value="newest">Mặc định</option>

                  <option value="price-asc">Giá thấp đến cao</option>

                  <option value="price-desc">Giá cao đến thấp</option>

                  <option value="sale">Ưu tiên khuyến mãi</option>

                </select>

              </label>



              <button

                type="button"

                className={

                  onlySale

                    ? "kj-shop-sale-filter active"

                    : "kj-shop-sale-filter"

                }

                onClick={() => setOnlySale((previous) => !previous)}

                aria-pressed={onlySale}

              >

                SẢN PHẨM KHUYẾN MÃI

              </button>

            </div>



            {categories.length > 0 && (

              <div className="kj-shop-chips">

                <button

                  type="button"

                  className={selectedCategory === "all" ? "active" : ""}

                  onClick={() => {

                    setSelectedCategory("all");

                    setSelectedCategoryId("");

                  }}

                >

                  {selectedParentCategory === "all"

                    ? "Tất cả"

                    : `Tất cả ${selectedParentCategory}`}

                </button>



                {categories.map((category) => (

                  <button

                    type="button"

                    key={category}

                    className={

                      selectedCategory === category ? "active" : ""

                    }

                    onClick={() => {

                      const searchParents =

                        selectedFixedParent

                          ? [

                              selectedFixedParent,

                            ]

                          : PRODUCT_MENU;



                      const matchedItem =

                        searchParents

                          .flatMap(

                            (parent) =>

                              getAllPublicProductMenuItems(

                                parent

                              )

                          )

                          .find(

                            (item) =>

                              item.name ===

                              category

                          );



                      setSelectedCategory(

                        category

                      );



                      setSelectedCategoryId(

                        matchedItem?.id ||

                          ""

                      );

                    }}

                  >

                    {category}

                  </button>

                ))}

              </div>

            )}



            {loading && (

              <div className="kj-shop-state">

                <div className="kj-shop-spinner" />

                <strong>Đang tải sản phẩm...</strong>

              </div>

            )}



            {!loading && message && (

              <div className="kj-shop-state kj-shop-state--error">

                <strong>Không thể tải sản phẩm</strong>

                <p>{message}</p>

                <button type="button" onClick={() => fetchProducts()}>

                  Thử lại

                </button>

              </div>

            )}



            {!loading && !message && products.length === 0 && (

              <div className="kj-shop-state">

                <strong>Chưa có sản phẩm</strong>

                <p>

                  Khi Admin thêm sản phẩm và bật hiển thị trên website, sản phẩm

                  sẽ xuất hiện tại đây.

                </p>

              </div>

            )}



            {!loading &&

              !message &&

              products.length > 0 &&

              filteredProducts.length === 0 && (

                <div className="kj-shop-state">

                  <strong>Không tìm thấy sản phẩm phù hợp</strong>

                  <p>Thử đổi từ khóa hoặc bỏ bớt bộ lọc đang chọn.</p>

                  <button type="button" onClick={resetFilters}>

                    Xóa bộ lọc

                  </button>

                </div>

              )}



            {!loading && !message && filteredProducts.length > 0 && (

              <div className="kj-shop-grid">

                {filteredProducts.map((product) => {

                  const mainImage = getMainImage(product);

                  const finalPrice = getFinalPrice(product);

                  const isFavorite = isFavoriteProduct(product.id);



                  const discountPercent =

                    product.salePrice > 0 && product.price > 0

                      ? Math.round(

                          ((product.price - product.salePrice) / product.price) *

                            100

                        )

                      : 0;



                  return (

                    <article className="kj-shop-card" key={product.id}>

                      <div className="kj-shop-card__image">

                        <Link

                          to={buildProductDetailUrl(product)}

                          state={buildProductDetailState(product)}

                        >

                          {mainImage?.url ? (

                            <img

                              src={getImageUrl(mainImage.url)}

                              alt={mainImage.alt || product.name}

                              loading="lazy"

                            />

                          ) : (

                            <div className="kj-shop-card__placeholder">

                              <span>KJ</span>

                              <small>King Jades</small>

                            </div>

                          )}

                        </Link>



                        <div className="kj-shop-card__badges">

                          {discountPercent > 0 && (

                            <span className="sale">-{discountPercent}%</span>

                          )}



                          {featuredProductIds.has(product.id) && (

                            <span className="featured">Nổi bật</span>

                          )}

                        </div>



                        <div className="kj-shop-card__tools">

                          <Link

                            to={buildProductDetailUrl(product)}

                            state={buildProductDetailState(product)}

                            aria-label={`Xem ${product.name}`}

                            title="Xem chi tiết"

                          >

                            <EyeIcon />

                          </Link>



                          {/* NÚT GIỎ HÀNG - ẨN TẠM, KHÔNG XÓA

                          <button

                            type="button"

                            onClick={() =>

                              handleAddToCart(buildFavoriteProduct(product))

                            }

                            aria-label={`Thêm ${product.name} vào giỏ`}

                            title="Thêm vào giỏ"

                          >

                            <BagIcon />

                          </button>

                          */}



                          <button

                            type="button"

                            className={isFavorite ? "active" : ""}

                            onClick={() => handleToggleFavorite(product)}

                            aria-label={`Yêu thích ${product.name}`}

                            aria-pressed={isFavorite}

                            title="Yêu thích"

                          >

                            <HeartIcon />

                          </button>

                        </div>

                      </div>



                      <div className="kj-shop-card__body">

                        <div className="kj-shop-card__meta">

                          <span>

                            {product.parentCategoryName

                              ? `${product.parentCategoryName} › ${product.categoryName || ""}`

                              : product.categoryName || "King Jades"}

                          </span>

                          {product.sku && <small>{product.sku}</small>}

                        </div>



                        <h3>

                          <Link

                            to={buildProductDetailUrl(product)}

                            state={buildProductDetailState(product)}

                          >

                            {product.name}

                          </Link>

                        </h3>



                        <p>

                          {product.shortDescription ||

                            "Sản phẩm vòng ngọc King Jades được trình bày rõ ràng để khách dễ tham khảo."}

                        </p>



                        {product.tags && product.tags.length > 0 && (

                          <div className="kj-shop-card__tags">

                            {product.tags.slice(0, 3).map((tag) => (

                              <span key={tag}>{tag}</span>

                            ))}

                          </div>

                        )}



                        <div className="kj-shop-card__bottom">

                          <div className="kj-shop-card__price">

                            <strong>{formatPrice(finalPrice)}</strong>



                            {product.salePrice > 0 && product.price > 0 && (

                              <del>{formatPrice(product.price)}</del>

                            )}

                          </div>



                          <div className="kj-shop-card__actions">

                            <Link

                              to={buildProductDetailUrl(product)}

                              state={buildProductDetailState(product)}

                            >

                              Chi tiết

                            </Link>



                            <Link

                              to={buildContactUrl(product)}

                              className="consult"

                            >

                              Tư vấn

                            </Link>

                          </div>

                        </div>

                      </div>

                    </article>

                  );

                })}

              </div>

            )}



            {!loading && !message && totalPages > 1 && (

              <nav className="kj-shop-pagination" aria-label="Phân trang sản phẩm">

                <div className="kj-shop-pagination__controls">

                  <button

                    type="button"

                    className="kj-shop-pagination__arrow"

                    onClick={() => goToPage(currentPage - 1)}

                    disabled={currentPage === 1}

                    aria-label="Trang trước"

                  >

                    <span aria-hidden="true">←</span> Trước

                  </button>



                  {paginationItems.map((item, index) =>

                    item === "ellipsis" ? (

                      <span

                        className="kj-shop-pagination__ellipsis"

                        aria-hidden="true"

                        key={`ellipsis-${index}`}

                      >

                        …

                      </span>

                    ) : (

                      <button

                        type="button"

                        className={`kj-shop-pagination__page${item === currentPage ? " active" : ""}`}

                        key={item}

                        onClick={() => goToPage(item)}

                        aria-label={`Trang ${item}`}

                        aria-current={item === currentPage ? "page" : undefined}

                      >

                        {item}

                      </button>

                    )

                  )}



                  <button

                    type="button"

                    className="kj-shop-pagination__arrow"

                    onClick={() => goToPage(currentPage + 1)}

                    disabled={currentPage === totalPages}

                    aria-label="Trang sau"

                  >

                    Sau <span aria-hidden="true">→</span>

                  </button>

                </div>

                <p className="kj-shop-pagination__summary">

                  Trang {currentPage} / {totalPages}

                </p>

              </nav>

            )}

          </div>

        </section>



        <section className="kj-shop-cta">

          <div className="kj-shop-cta__pattern" aria-hidden="true" />



          <div className="kj-shop-shell kj-shop-cta__inner">

            <div>

              <span className="kj-shop-eyebrow">TƯ VẤN THEO NHU CẦU</span>

              <h2>Chưa chắc mẫu vòng nào phù hợp với bạn?</h2>

              <p>

                Gửi nhu cầu về màu sắc, size, mục đích sử dụng hoặc sản phẩm đang

                quan tâm. King Jades sẽ tiếp nhận và tư vấn riêng.

              </p>

            </div>



            <Link to="/contact" className="kj-shop-button kj-shop-button--gold">

              Nhận tư vấn riêng

              <ArrowIcon />

            </Link>

          </div>

        </section>

      </main>



      <Footer />

    </div>

  );

};



export default ProductPage;
