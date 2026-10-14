import React, { useEffect, useMemo, useState } from "react";

import { Link, useLocation, useParams } from "react-router-dom";

import Header from "../components/Header";

import Footer from "../components/Footer";
import FavoriteDrawer, { FavoriteProduct } from "./FavoriteDrawer";

import {

  CartProductInput,

  useCart,

} from "../contexts/CartContext";

import { productApi } from "../api/productApi";

import { getImageUrl } from "../utils/getImageUrl";

import sizeGuideImage from "../assets/product/dosize.jpg";

import afterSaleContactPhoto from "../assets/product/after-sale-contact.png";

import afterSaleInspectionPhoto from "../assets/product/after-sale-inspection.png";

import afterSaleCarePhoto from "../assets/product/after-sale-care.png";

import afterSaleHandoverPhoto from "../assets/product/after-sale-handover.png";

import "../styles/ProductDetailPage.css";

// PRODUCT_DETAIL_DYNAMIC_ADMIN_SEO_VERSION_4

type ProductImage = {

  // Schema hiện tại.

  url?: string;

  fileName?: string;

  alt?: string;

  title?: string;

  description?: string;

  caption?: string;

  isMain?: boolean;

  sortOrder?: number;

  // Backward compatibility cho dữ liệu/import cũ.

  imageUrl?: string;

  image_url?: string;

};

type ProductSpecification = {

  label: string;

  value: string;

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

  specifications: ProductSpecification[];

  tags: string[];

  seo?: {

    title?: string;

    description?: string;

    keywords?: string[];

    canonicalUrl?: string;

    ogImage?: string;

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

    headingAlign?: string;

    bodyAlign?: string;

  };

  visibility: {

    isPublished: boolean;

    showOnMenu: boolean;

  };

  status: "active" | "draft" | "inactive";

};

const FAVORITE_STORAGE_KEY = "king_jades_favorites";

const readStoredFavoriteItems = (): FavoriteProduct[] => {
  if (typeof window === "undefined") return [];
  try {
    const data: unknown = JSON.parse(window.localStorage.getItem(FAVORITE_STORAGE_KEY) || "[]");
    return Array.isArray(data)
      ? data.filter((item): item is FavoriteProduct =>
          Boolean(item && typeof item === "object" &&
          "id" in item && "name" in item)
        )
      : [];
  } catch {
    return [];
  }
};

const ZALO_URL = "https://zalo.me/3354373045960365130";

const careCards = [

  {

    number: "01",

    title: "Tư vấn đúng nhu cầu",

    text: "Đội ngũ trao đổi về mẫu, size, màu sắc và mục đích sử dụng trước khi khách quyết định.",

  },

  {

    number: "02",

    title: "Xem hình ảnh thực tế",

    text: "Khách có thể yêu cầu thêm hình ảnh hoặc video ở nhiều điều kiện ánh sáng.",

  },

  {

    number: "03",

    title: "Hỗ trợ chọn size",

    text: "Đối chiếu cổ tay, bàn tay và thói quen đeo để chọn kích thước phù hợp.",

  },

  {

    number: "04",

    title: "Chăm sóc sau mua",

    text: "Hướng dẫn bảo quản, vệ sinh và tiếp nhận nhu cầu hỗ trợ sau khi bàn giao.",

  },

];

const afterSaleSteps = [

  {

    number: "01",

    title: "Liên hệ",

    text: "Khách liên hệ qua Zalo hoặc hotline để mô tả nhu cầu, tình trạng sản phẩm và mong muốn hỗ trợ.",

    image: afterSaleContactPhoto,

    imageAlt: "Khách hàng liên hệ với King Jades",

  },

  {

    number: "02",

    title: "Tiếp nhận & kiểm tra",

    text: "Chuyên viên kiểm tra màu, vân, độ bóng, kích thước và xác nhận lại tình trạng thực tế trước khi xử lý.",

    image: afterSaleInspectionPhoto,

    imageAlt: "Chuyên viên King Jades kiểm tra vòng ngọc cùng khách hàng",

  },

  {

    number: "03",

    title: "Xử lý & chăm sóc",

    text: "Tiến hành vệ sinh, làm mới hoặc chăm sóc theo nhu cầu với thao tác cẩn trọng và môi trường phù hợp.",

    image: afterSaleCarePhoto,

    imageAlt: "Chuyên viên King Jades chăm sóc và kiểm tra vòng ngọc",

  },

  {

    number: "04",

    title: "Bàn giao",

    text: "Sản phẩm được bàn giao lại cùng hướng dẫn bảo quản, thông tin xác nhận và hỗ trợ hậu mãi khi cần.",

    image: afterSaleHandoverPhoto,

    imageAlt: "King Jades bàn giao sản phẩm cho khách hàng",

  },

];

const formatPrice = (value: number) => {

  if (!value || value <= 0) {

    return "Giá liên hệ";

  }

  const formattedPrice =

    new Intl.NumberFormat("vi-VN").format(

      value

    );

  const priceParts =

    formattedPrice.split(".");

  const firstPart =

    priceParts[0] || "";

  const maskedFirstPart =

    firstPart.length > 1

      ? `${firstPart.charAt(0)}${"x".repeat(

          firstPart.length - 1

        )}`

      : firstPart;

  const maskedPrice = [

    maskedFirstPart,

    ...priceParts

      .slice(1)

      .map(() => "xxx"),

  ].join(".");

  return `${maskedPrice} đ`;

};

const getStoredImageUrl = (

  image?: ProductImage | null

): string => {

  if (!image) {

    return "";

  }

  const legacyImage = image as ProductImage & {

    Url?: string;

    ImageUrl?: string;

  };

  return (

    image.url ||

    image.imageUrl ||

    image.image_url ||

    legacyImage.Url ||

    legacyImage.ImageUrl ||

    ""

  ).trim();

};

const getImageSource = (

  image?: ProductImage | null

) => {

  const storedUrl = getStoredImageUrl(image);

  if (!storedUrl) {

    return "";

  }

  return /^https?:\/\//i.test(storedUrl)

    ? storedUrl

    : getImageUrl(storedUrl);

};

const getSeoImageSource = (

  value?: string | null

) => {

  const raw = (value || "").trim();

  if (!raw) {

    return "";

  }

  return /^https?:\/\//i.test(raw)

    ? raw

    : getImageUrl(raw);

};

const getMainProductImage = (

  product?: Product | null

) => {

  return (

    product?.images?.find(

      (image) =>

        Boolean(getStoredImageUrl(image)) &&

        Boolean(image.isMain)

    ) ||

    product?.images?.find((image) =>

      Boolean(getStoredImageUrl(image))

    ) ||

    null

  );

};

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M20.8 4.8a5.2 5.2 0 0 0-7.4 0L12 6.2l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z" />
  </svg>
);

const BackIcon = () => (

  <svg viewBox="0 0 24 24" aria-hidden="true">

    <path d="M19 12H5" />

    <path d="m10 7-5 5 5 5" />

  </svg>

);

const ArrowIcon = () => (

  <svg viewBox="0 0 24 24" aria-hidden="true">

    <path d="M5 12h14" />

    <path d="m14 7 5 5-5 5" />

  </svg>

);

const BagIcon = () => (

  <svg viewBox="0 0 24 24" aria-hidden="true">

    <path d="M5.5 8.5h13l-1 11h-11l-1-11Z" />

    <path d="M9 9V6.8a3 3 0 0 1 6 0V9" />

  </svg>

);

const MessageIcon = () => (

  <svg viewBox="0 0 24 24" aria-hidden="true">

    <path d="M4 5.5h16v11H9l-5 3v-14Z" />

    <path d="M8 9h8M8 13h5" />

  </svg>

);

const RulerIcon = () => (

  <svg viewBox="0 0 24 24" aria-hidden="true">

    <path d="m4 17 13-13 3 3-13 13H4v-3Z" />

    <path d="m14 7 3 3M11 10l2 2M8 13l3 3" />

  </svg>

);

const ShieldIcon = () => (

  <svg viewBox="0 0 24 24" aria-hidden="true">

    <path d="M12 3 5.5 5.6v5.8c0 4.1 2.7 7.7 6.5 9.6 3.8-1.9 6.5-5.5 6.5-9.6V5.6L12 3Z" />

    <path d="m9.3 12 1.8 1.8 3.9-4" />

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

  return (

    <div

      className="kjp-size-guide-modal"

      role="dialog"

      aria-modal="true"

      aria-labelledby="kjp-size-guide-title"

    >

      <button

        type="button"

        className="kjp-size-guide-backdrop"

        onClick={onClose}

        aria-label="Đóng hướng dẫn đo size vòng"

      />

      <section className="kjp-size-guide-panel">

        <header className="kjp-size-guide-head">

          <div>

            <span className="kjp-size-guide-eyebrow">HƯỚNG DẪN ĐO SIZE</span>

            <h2 id="kjp-size-guide-title">Hướng dẫn đo size vòng</h2>

            <p>

              Xem hình hướng dẫn đo size vòng bên dưới. Để chọn size chính xác,

              hãy đo thực tế hoặc trao đổi với đội ngũ tư vấn King Jades.

            </p>

          </div>

          <button

            type="button"

            className="kjp-size-guide-close"

            onClick={onClose}

            aria-label="Đóng"

          >

            <CloseIcon />

          </button>

        </header>

        <div className="kjp-size-guide-canvas" aria-label="Hình hướng dẫn đo size vòng">

          <img

            className="kjp-size-guide-image"

            src={sizeGuideImage}

            alt="Hướng dẫn đo size và chọn vòng ngọc King Jades"

          />

        </div>

        <div className="kjp-size-guide-note">

          <strong>Lưu ý đo size</strong>

          <span>

            Hình minh họa chỉ để tham khảo, không dùng kích thước hiển thị trên

            màn hình làm thước đo. Hãy xác nhận size thực tế trước khi chọn vòng.

          </span>

        </div>

      </section>

    </div>

  );

};

const ProductDetailPage: React.FC = () => {

  const { slug } = useParams<{

    slug: string;

  }>();

  const location = useLocation();

  /*

   * Dọn link legacy từng có ?id=... khỏi thanh địa chỉ.

   * Không reload trang và vẫn giữ nguyên router state hiện tại.

   */

  useEffect(() => {

    const params = new URLSearchParams(window.location.search);

    if (!params.has("id")) {

      return;

    }

    params.delete("id");

    const search = params.toString();

    const cleanUrl = `${window.location.pathname}${

      search ? `?${search}` : ""

    }${window.location.hash}`;

    window.history.replaceState(

      window.history.state,

      "",

      cleanUrl

    );

  }, [slug]);

  const { addToCart } = useCart();

  const [favoriteItems, setFavoriteItems] = useState<FavoriteProduct[]>(readStoredFavoriteItems);
  const [isFavoriteOpen, setIsFavoriteOpen] = useState(false);

  // Dùng chung dữ liệu yêu thích của trang Bộ sưu tập.
  useEffect(() => {
    window.localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(favoriteItems));
  }, [favoriteItems]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === FAVORITE_STORAGE_KEY) {
        setFavoriteItems(readStoredFavoriteItems());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);



  const navigationProduct = useMemo(() => {

    const state = location.state as

      | { productPreview?: Product }

      | null;

    const preview = state?.productPreview;

    if (!preview) {

      return null;

    }

    /*

     * Slug đã unique toàn hệ thống nên chỉ cần đối chiếu slug.

     * productPreview nằm trong router state, không xuất hiện trên URL.

     */

    return preview.slug === slug ? preview : null;

  }, [location.state, slug]);

  const [product, setProduct] =

    useState<Product | null>(() =>

      navigationProduct

    );

  const [selectedImage, setSelectedImage] =

    useState<ProductImage | null>(() =>

      getMainProductImage(navigationProduct)

    );

  const [loading, setLoading] =

    useState(() => !navigationProduct);

  const [message, setMessage] =

    useState("");

  const [addedMessage, setAddedMessage] =

    useState("");

  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);

  useEffect(() => {

    setIsDescriptionModalOpen(false);

  }, [slug]);

  useEffect(() => {

    if (!isSizeGuideOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {

      if (event.key === "Escape") setIsSizeGuideOpen(false);

    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {

      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleKeyDown);

    };

  }, [isSizeGuideOpen]);

  useEffect(() => {

    if (!isDescriptionModalOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleDescriptionKeyDown = (event: KeyboardEvent) => {

      if (event.key === "Escape") {

        setIsDescriptionModalOpen(false);

      }

    };

    window.addEventListener("keydown", handleDescriptionKeyDown);

    return () => {

      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleDescriptionKeyDown);

    };

  }, [isDescriptionModalOpen]);

  useEffect(() => {

    let mounted = true;

    const previousTitle = document.title;

    if (navigationProduct) {

      setProduct(navigationProduct);

      setSelectedImage(

        getMainProductImage(navigationProduct)

      );

      setLoading(false);

      setMessage("");

      document.title =

        navigationProduct.seo?.title ||

        `${navigationProduct.name} | King Jades`;

    }

    const fetchProductDetail = async () => {

      if (!slug) {

        if (mounted) {

          setMessage(

            "Không tìm thấy đường dẫn sản phẩm."

          );

          setLoading(false);

        }

        return;

      }

      try {

        if (!navigationProduct) {

          setLoading(true);

        }

        setMessage("");

        setAddedMessage("");

        const data =

          await productApi.getPublicProductDetail(

            slug

          );

        const productData =

          data?.product as

            | Product

            | null

            | undefined;

        if (!productData) {

          throw new Error(

            "API không trả về dữ liệu sản phẩm."

          );

        }

        if (!mounted) return;

        setProduct(productData);

        setSelectedImage(

          getMainProductImage(productData)

        );

        document.title =

          productData.seo?.title ||

          `${productData.name} | King Jades`;

      } catch (requestError) {

        if (!mounted) return;

        const error = requestError as Error;

        setMessage(

          error.message ||

            "Không thể tải chi tiết sản phẩm."

        );

      } finally {

        if (mounted) {

          setLoading(false);

        }

      }

    };

    fetchProductDetail();

    return () => {

      mounted = false;

      document.title = previousTitle;

    };

  }, [navigationProduct, slug]);

  useEffect(() => {

    if (!product) {

      return;

    }

    const pageTitle =

      product.seo?.title ||

      `${product.name} | King Jades`;

    const pageDescription =

      product.seo?.description ||

      product.shortDescription ||

      product.description ||

      "";

    const pageKeywords =

      product.seo?.keywords?.filter(Boolean).join(", ") ||

      product.seo?.focusKeyword ||

      "";

const canonicalUrl =

  `${window.location.origin}/products/${product.slug}`;

    const mainImage =

      getMainProductImage(product);

    const ogImage =

      product.seo?.ogImage

        ? getSeoImageSource(product.seo.ogImage)

        : getImageSource(mainImage);

    const robots =

      product.seo?.robots || "index,follow";

    const previousTitle = document.title;

    document.title = pageTitle;

    const upsertMeta = (

      attribute: "name" | "property",

      key: string,

      content: string

    ) => {

      const selector = `meta[${attribute}="${key}"]`;

      let element =

        document.head.querySelector<HTMLMetaElement>(

          selector

        );

      const existed = Boolean(element);

      const previousContent =

        element?.getAttribute("content") ?? null;

      if (!element) {

        element = document.createElement("meta");

        element.setAttribute(attribute, key);

        document.head.appendChild(element);

      }

      element.setAttribute("content", content);

      return () => {

        if (!element) return;

        if (!existed) {

          element.remove();

          return;

        }

        if (previousContent === null) {

          element.removeAttribute("content");

        } else {

          element.setAttribute(

            "content",

            previousContent

          );

        }

      };

    };

    const cleanups = [

      upsertMeta(

        "name",

        "description",

        pageDescription

      ),

      upsertMeta(

        "name",

        "keywords",

        pageKeywords

      ),

      upsertMeta("name", "robots", robots),

      upsertMeta(

        "property",

        "og:type",

        "product"

      ),

      upsertMeta(

        "property",

        "og:title",

        pageTitle

      ),

      upsertMeta(

        "property",

        "og:description",

        pageDescription

      ),

      upsertMeta(

        "property",

        "og:url",

        canonicalUrl

      ),

    ];

    if (ogImage) {

      cleanups.push(

        upsertMeta(

          "property",

          "og:image",

          ogImage

        )

      );

    }

    let canonicalLink =

      document.head.querySelector<HTMLLinkElement>(

        'link[rel="canonical"]'

      );

    const canonicalExisted = Boolean(canonicalLink);

    const previousCanonical =

      canonicalLink?.getAttribute("href") ?? null;

    if (!canonicalLink) {

      canonicalLink = document.createElement("link");

      canonicalLink.setAttribute("rel", "canonical");

      document.head.appendChild(canonicalLink);

    }

    canonicalLink.setAttribute(

      "href",

      canonicalUrl

    );

    const finalProductPrice =

      product.salePrice && product.salePrice > 0

        ? product.salePrice

        : product.price || 0;

    const productSchema: Record<string, unknown> = {

      "@context": "https://schema.org",

      "@type":

        product.seo?.schemaType || "Product",

      name: product.name,

      description: pageDescription,

      sku: product.sku || undefined,

      url: canonicalUrl,

      image: ogImage ? [ogImage] : undefined,

      brand: {

        "@type": "Brand",

        name: "King Jades",

      },

    };

    if (finalProductPrice > 0) {

      productSchema.offers = {

        "@type": "Offer",

        priceCurrency: "VND",

        price: finalProductPrice,

        url: canonicalUrl,

      };

    }

    let schemaScript =

      document.head.querySelector<HTMLScriptElement>(

        "#kingjades-product-schema"

      );

    const schemaExisted = Boolean(schemaScript);

    const previousSchema =

      schemaScript?.textContent ?? null;

    if (!schemaScript) {

      schemaScript = document.createElement("script");

      schemaScript.id = "kingjades-product-schema";

      schemaScript.type = "application/ld+json";

      document.head.appendChild(schemaScript);

    }

    schemaScript.textContent = JSON.stringify(

      productSchema

    );

    return () => {

      document.title = previousTitle;

      cleanups.forEach((cleanup) => cleanup());

      if (canonicalLink) {

        if (!canonicalExisted) {

          canonicalLink.remove();

        } else if (previousCanonical === null) {

          canonicalLink.removeAttribute("href");

        } else {

          canonicalLink.setAttribute(

            "href",

            previousCanonical

          );

        }

      }

      if (schemaScript) {

        if (!schemaExisted) {

          schemaScript.remove();

        } else {

          schemaScript.textContent = previousSchema;

        }

      }

    };

  }, [product]);

  const sortedImages = useMemo(() => {

    if (!product?.images?.length) {

      return [];

    }

    return [...product.images].sort(

      (first, second) => {

        if (

          first.isMain &&

          !second.isMain

        ) {

          return -1;

        }

        if (

          !first.isMain &&

          second.isMain

        ) {

          return 1;

        }

        return (

          (first.sortOrder || 0) -

          (second.sortOrder || 0)

        );

      }

    );

  }, [product]);

  const finalPrice = useMemo(() => {

    if (!product) return 0;

    return product.salePrice &&

      product.salePrice > 0

      ? product.salePrice

      : product.price || 0;

  }, [product]);

  const discountPercent = useMemo(() => {

    if (

      !product ||

      product.salePrice <= 0 ||

      product.price <= 0 ||

      product.salePrice >= product.price

    ) {

      return 0;

    }

    return Math.round(

      ((product.price -

        product.salePrice) /

        product.price) *

        100

    );

  }, [product]);

  const contactUrl = useMemo(() => {

    if (!product) {

      return "/contact";

    }

    const params = new URLSearchParams({

      productId: product.id,

      productName: product.name,

      productSlug: product.slug,

    });

    return `/contact?${params.toString()}`;

  }, [product]);

  if (loading && !product) {

    return (

      <>

        <Header />

        <div className="kj-product-detail-page">

          <main className="kj-product-detail-main">

            <section className="kj-pdp-state">

              <div className="kj-pdp-spinner" />

              <span className="kj-pdp-eyebrow">

                King Jades Collection

              </span>

              <h1>

                Đang tải chi tiết sản phẩm...

              </h1>

            </section>

          </main>

        </div>

        <Footer />

      </>

    );

  }

  if (!product) {

    return (

      <>

        <Header />

        <div className="kj-product-detail-page">

          <main className="kj-product-detail-main">

            <section className="kj-pdp-state kj-pdp-state--error">

              <span className="kj-pdp-eyebrow">

                Product Not Found

              </span>

              <h1>

                Không thể tải sản phẩm

              </h1>

              <p>

                {message ||

                  "Dữ liệu sản phẩm không tồn tại hoặc API không trả về sản phẩm."}

              </p>

              <Link to="/products">

                <BackIcon />

                Quay lại bộ sưu tập

              </Link>

            </section>

          </main>

        </div>

        <Footer />

      </>

    );

  }

  const fullDescription = (

    product.description ||

    product.shortDescription ||

    "Nội dung mô tả chi tiết đang được cập nhật."

  ).trim();

  const dedicatedShortDescription = (product.shortDescription || "").trim();

  const previewLimit = 360;

  const clippedDescription = fullDescription.slice(0, previewLimit);

  const lastPreviewSpace = clippedDescription.lastIndexOf(" ");

  const automaticShortDescription =

    fullDescription.length > previewLimit

      ? `${clippedDescription

          .slice(0, lastPreviewSpace > 260 ? lastPreviewSpace : previewLimit)

          .trim()}…`

      : fullDescription;

  const hasUsefulShortDescription =

    Boolean(dedicatedShortDescription) &&

    dedicatedShortDescription !== fullDescription &&

    dedicatedShortDescription.length < fullDescription.length;

  const collapsedDescription = hasUsefulShortDescription

    ? dedicatedShortDescription

    : automaticShortDescription;

  const canToggleDescription = fullDescription !== collapsedDescription;

  const descriptionLines = fullDescription

    .split(/\r?\n/)

    .map((line) => line.trim())

    .filter(Boolean);

  const isDescriptionHeading = (line: string) => {

    const lettersOnly = line.replace(/[^A-Za-zÀ-ỹĐđ]/g, "");

    return (

      line.length <= 90 &&

      lettersOnly.length >= 4 &&

      line === line.toLocaleUpperCase("vi-VN")

    );

  };

  const findSpecification = (

    keywords: string[]

  ) => {

    if (!product?.specifications?.length) {

      return "";

    }

    const specification =

      product.specifications.find((item) => {

        const label =

          item.label.toLowerCase();

        return keywords.some((keyword) =>

          label.includes(

            keyword.toLowerCase()

          )

        );

      });

    return specification?.value || "";

  };

  const certificationText =

    findSpecification([

      "kiểm định",

      "chứng nhận",

      "certificate",

      "certification",

    ]) ||

    "Liên hệ để kiểm tra hồ sơ áp dụng cho sản phẩm này.";

  // =====================================================

  // SPECIFICATIONS DYNAMIC

  // Admin nhập gì -> ProductDetail hiển thị đúng

  // =====================================================

  const dynamicSpecifications =

    product.specifications?.filter(

      (item) =>

        item.label?.trim() &&

        item.value?.trim()

    ) || [];

  const sizeText =

    findSpecification([

      "size",

      "kích thước",

      "đường kính",

      "chu vi",

    ]) || "Liên hệ tư vấn size";

  const normalizeAlignment = (

    value?: string,

    fallback = "left"

  ) => {

    const allowed = [

      "left",

      "center",

      "right",

      "justify",

    ];

    return value && allowed.includes(value)

      ? value

      : fallback;

  };

  const headingAlignment =

    normalizeAlignment(

      product.textStyle?.headingAlign ||

        product.textStyle?.alignment,

      "left"

    );

  const bodyAlignment =

    normalizeAlignment(

      product.textStyle?.bodyAlign ||

        product.textStyle?.alignment,

      "left"

    );

  const headingSize =

    Number(product.textStyle?.headingSize) > 0

      ? Number(product.textStyle?.headingSize)

      : 48;

  const bodySize =

    Number(product.textStyle?.bodySize) > 0

      ? Number(product.textStyle?.bodySize)

      : 16;

  const letterSpacing =

    Number.isFinite(

      Number(product.typography?.letterSpacing)

    )

      ? Number(product.typography?.letterSpacing)

      : 0.02;

  const lineHeight =

    Number(product.typography?.lineHeight) > 0

      ? Number(product.typography?.lineHeight)

      : 1.8;

  const productPageStyle = {

    "--kj-pdp-heading-font":

      product.typography?.titleFont || "Lora",

    "--kj-pdp-body-font":

      product.typography?.descriptionFont ||

      "SVN-Gilroy",

    "--kj-pdp-letter-spacing":

      `${letterSpacing}em`,

    "--kj-pdp-line-height":

      String(lineHeight),

    "--kj-pdp-heading-color":

      product.textStyle?.headingColor ||

      "#142543",

    "--kj-pdp-body-color":

      product.textStyle?.bodyColor ||

      "#706d65",

    "--kj-pdp-heading-size":

      `${headingSize}px`,

    "--kj-pdp-body-size":

      `${bodySize}px`,

    "--kj-pdp-heading-align":

      headingAlignment,

    "--kj-pdp-body-align":

      bodyAlignment,

  } as React.CSSProperties;

  const buildCartProduct = (

    productData: Product

  ): CartProductInput => {

    const image =

      selectedImage ||

      getMainProductImage(productData);

    return {

      id: productData.id,

      name: productData.name,

      slug: productData.slug,

      sku: productData.sku,

      categoryName:

        productData.categoryName,

      price: productData.price,

      salePrice: productData.salePrice,

      image: getImageSource(image),

      shortDescription:

        productData.shortDescription,

    };

  };

  const isFavorite = Boolean(product && favoriteItems.some(
    (item) => String(item.id) === String(product.id)
  ));

  const handleToggleFavorite = () => {
    if (!product) return;

    const item: FavoriteProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      categoryName: product.categoryName,
      price: finalPrice,
      image: getImageSource(selectedImage || getMainProductImage(product)),
    };

    setFavoriteItems((previous) =>
      previous.some((favorite) => String(favorite.id) === String(product.id))
        ? previous.filter((favorite) => String(favorite.id) !== String(product.id))
        : [...previous, item]
    );
    setIsFavoriteOpen(true);
  };

  const handleRemoveFavorite = (id: string | number) => {
    setFavoriteItems((previous) => previous.filter(
      (item) => String(item.id) !== String(id)
    ));
  };

  const handleFavoriteAddToCart = (item: FavoriteProduct) => {
    if (product && String(item.id) === String(product.id)) {
      addToCart(buildCartProduct(product), 1);
      return;
    }
    addToCart({
      id: String(item.id),
      name: item.name,
      slug: item.slug || "",
      sku: "",
      categoryName: item.categoryName || "King Jades",
      price: item.price,
      salePrice: 0,
      image: item.image,
      shortDescription: "",
    }, 1);
  };

  const handleAddToCart = () => {

    if (!product) return;

    addToCart(

      buildCartProduct(product),

      1

    );

    setAddedMessage(

      "Đã thêm sản phẩm vào giỏ quan tâm."

    );

    window.setTimeout(

      () => setAddedMessage(""),

      2600

    );

  };

  return (

    <>

      <div className="kjp-site-header">
          <Header favoriteCount={favoriteItems.length} onOpenFavorite={() => setIsFavoriteOpen(true)} />
        </div>
        <FavoriteDrawer
          isOpen={isFavoriteOpen}
          items={favoriteItems}
          onClose={() => setIsFavoriteOpen(false)}
          onRemove={handleRemoveFavorite}
          onAddToCart={handleFavoriteAddToCart}
        />

      <div className="kj-product-detail-page" style={productPageStyle}>

        <main className="kj-product-detail-main">

          {loading && (

            <section className="kjp-state" role="status">

              <div className="kjp-spinner" />

              <h1>Đang tải chi tiết sản phẩm...</h1>

            </section>

          )}

          {!loading && message && (

            <section className="kjp-state kjp-state--error">

              <h1>Không thể tải sản phẩm</h1>

              <p>{message}</p>

              <Link to="/products"><BackIcon />Quay lại bộ sưu tập</Link>

            </section>

          )}

          {!loading && !message && product && (

            <>

              <div className="kjp-top">

              <section className="kjp-hero" aria-label={`Hình ảnh ${product.name}`}>

                <div className="kjp-hero__placeholder" aria-hidden="true">King Jades</div>

                {getImageSource(selectedImage) ? (

                  <img

                    className="kjp-hero__photo"

                    src={getImageSource(selectedImage)}

                    alt={selectedImage?.alt || product.name}

                    title={selectedImage?.title || product.name}

                    onError={(event) => { event.currentTarget.style.visibility = "hidden"; }}

                    onLoad={(event) => { event.currentTarget.style.visibility = ""; }}

                  />

                ) : null}

                <div className="kjp-hero__shade" aria-hidden="true" />

                <nav className="kjp-nav" aria-label="Điều hướng sản phẩm">

                  <Link to="/" className="kjp-nav__brand"><span className="kjp-nav__mark">✦</span>KingJades</Link>
                  <button
                    type="button"
                    className={`kjp-nav__heart${isFavorite ? " is-active" : ""}`}
                    onClick={handleToggleFavorite}
                    aria-label={isFavorite ? `Bỏ ${product.name} khỏi yêu thích` : `Thêm ${product.name} vào yêu thích`}
                    aria-pressed={isFavorite}
                    title={isFavorite ? "Bỏ yêu thích" : "Yêu thích sản phẩm"}
                  >
                    <HeartIcon />
                  </button>

                </nav>

                <div className="kjp-hero__content kjp-hero__content--thumbs-only">

  {sortedImages.length > 0 && (

    <div className="kjp-thumbs" aria-label="Chọn ảnh sản phẩm">

      {sortedImages.slice(0, 4).map((image, index) => (

        <button

          type="button"

          key={`${getStoredImageUrl(image)}-${index}`}

          className={

            getStoredImageUrl(selectedImage) === getStoredImageUrl(image)

              ? "is-active"

              : ""

          }

          onClick={() => setSelectedImage(image)}

          aria-label={`Xem ảnh ${index + 1}`}

          aria-pressed={

            getStoredImageUrl(selectedImage) === getStoredImageUrl(image)

          }

        >

          <img

            src={getImageSource(image)}

            alt={image.alt || product.name}

            title={image.title || image.caption || product.name}

            onError={(event) => {

              event.currentTarget.style.visibility = "hidden";

            }}

            onLoad={(event) => {

              event.currentTarget.style.visibility = "";

            }}

          />

        </button>

      ))}

    </div>

  )}

</div>

              </section>

              <div className="kjp-top__summary">

                  <section className="kjp-intro" aria-labelledby="kjp-product-title">

                    <span className="kjp-kicker kjp-intro__eyebrow">THÔNG TIN SẢN PHẨM</span>

                    <h1 id="kjp-product-title">{product.name}</h1>

                    <p>{product.shortDescription || "Thông tin giới thiệu sản phẩm đang được cập nhật."}</p>

                    {product.tags?.length > 0 && (

                      <div className="kjp-tags">

                        {product.tags.slice(0, 6).map((tag) => <span key={tag}>{tag}</span>)}

                      </div>

                    )}

                  </section>

                  <section className="kjp-price-card" aria-label="Giá và tư vấn sản phẩm">

                    <span className="kjp-kicker">TƯ VẤN SẢN PHẨM</span>

                    <h2 className="kjp-price-card__heading">

                      <span className="kjp-price-card__heading-desktop">Liên hệ tư vấn giá</span>

                      <span className="kjp-price-card__heading-mobile">Thông tin minh bạch – rõ ràng</span>

                    </h2>

                    <p>King Jades xác nhận size, ảnh/video thực tế và tình trạng sản phẩm trước khi chốt đơn.</p>

                    <div className={`kjp-price-card__chips${dynamicSpecifications.length ? "" : " kjp-price-card__chips--only-size"}`} aria-label="Thông số nổi bật">

                      <span className="kjp-price-card__size-chip" title="Tư vấn size">{sizeText}</span>

                      {dynamicSpecifications.slice(0, 3).map((item, index) => (

                        <span key={`${item.label}-${index}`} title={item.label}>{item.value}</span>

                      ))}

                    </div>

                    <div className="kjp-price-card__price"><strong className="kjp-price-card__value">{formatPrice(finalPrice)}</strong>

                      {product.salePrice > 0 && product.price > 0 && <del>{formatPrice(product.price)}</del>}

                    </div>

                  </section>

                  <div className="kjp-primary-actions">

                    <a href={ZALO_URL} target="_blank" rel="noreferrer"><MessageIcon /> TƯ VẤN QUA ZALO</a>

                    <button type="button" onClick={() => setIsSizeGuideOpen(true)}><RulerIcon /><span className="kjp-primary-actions__size-label">HƯỚNG DẪN ĐO SIZE</span></button>

                  </div>

              </div>

              </div>

              <div className="kjp-light">

                <div className="kjp-container kjp-product-content">

                  <nav className="kjp-breadcrumb" aria-label="Điều hướng sản phẩm">

                    <Link to="/">Trang chủ</Link><span>/</span><Link to="/products">Sản phẩm</Link>

                    {product.parentCategoryName && (

                      <>

                        <span>/</span>

                        <Link to={product.parentCategoryId

                          ? `/products?parentCategoryId=${encodeURIComponent(product.parentCategoryId)}`

                          : `/products?parentCategory=${encodeURIComponent(product.parentCategoryName)}`}

                        >{product.parentCategoryName}</Link>

                      </>

                    )}

                    {product.categoryName && (

                      <>

                        <span>/</span>

                        <Link to={product.categoryId

                          ? `/products?categoryId=${encodeURIComponent(product.categoryId)}${product.parentCategoryId ? `&parentCategoryId=${encodeURIComponent(product.parentCategoryId)}` : ""}`

                          : `/products?category=${encodeURIComponent(product.categoryName)}${product.parentCategoryName ? `&parentCategory=${encodeURIComponent(product.parentCategoryName)}` : ""}`}

                        >{product.categoryName}</Link>

                      </>

                    )}

                    <span>/</span><strong>{product.name}</strong>

                  </nav>

                  <section className="kjp-details" aria-label="Chi tiết và cam kết sản phẩm">

                    <span className="kjp-kicker">THÔNG TIN SẢN PHẨM</span>

                    <h2>Chi tiết sản phẩm</h2>

                    <dl className="kjp-specs">

                      {product.categoryName && <div><dt>Loại sản phẩm</dt><dd>{product.categoryName}</dd></div>}

                      {product.parentCategoryName && <div><dt>Danh mục</dt><dd>{product.parentCategoryName}</dd></div>}

                      <div><dt>Mã sản phẩm</dt><dd>{product.sku || "Đang cập nhật"}</dd></div>

                     {/* {product.specifications?.length > 0

                        ? product.specifications.map((item, index) => (

                            <div key={`${item.label}-${index}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>

                          ))

                        : <div><dt>Thông số</dt><dd>Đang cập nhật</dd></div>}*/}

                    </dl>

                    {/* <p className="kjp-order-note">Gửi yêu cầu không đồng nghĩa với hoàn tất đặt hàng hoặc thanh toán.</p> */}

                    <div className="kjp-full-description is-collapsed">

                      <div className="kjp-full-description__head">

                        <div>

                          <span className="kjp-kicker">GIỚI THIỆU SẢN PHẨM</span>

                          <h3>Mô tả sản phẩm</h3>

                        </div>

                        {canToggleDescription && (

                          <span className="kjp-description-reading-time">

                            Nội dung chi tiết

                          </span>

                        )}

                      </div>

                      <div

                        className="kjp-description-text"

                        id="kjp-product-description"

                      >

                        <p>{collapsedDescription}</p>

                      </div>

                      {canToggleDescription && (

                        <button

                          type="button"

                          className="kjp-description-toggle"

                          onClick={() => setIsDescriptionModalOpen(true)}

                          aria-haspopup="dialog"

                          aria-controls="kjp-description-reader"

                        >

                          <span>Xem mô tả đầy đủ</span>

                          <span

                            className="kjp-description-toggle__icon"

                            aria-hidden="true"

                          >

                            →

                          </span>

                        </button>

                      )}

                    </div>

                    <div className="kjp-extra-details">

                      <details><summary>Kiểm định và hồ sơ</summary><p>{certificationText}</p></details>

                      <details><summary>Tư vấn size vòng</summary><p>{sizeText}. King Jades hỗ trợ chọn size theo kích thước cổ tay, bàn tay và cảm giác đeo mong muốn.</p><button type="button" className="kjp-extra-details__trigger" onClick={() => setIsSizeGuideOpen(true)}>Xem hướng dẫn đo size</button></details>

                      <details><summary>Giao nhận và hỗ trợ</summary><p>Thời gian giao nhận, phạm vi hỗ trợ và chính sách áp dụng sẽ được xác nhận trong quá trình tư vấn.</p></details>

                    </div>

                    <div className="kjp-commitment">

                      <span className="kjp-kicker">CAM KẾT KINGJADES</span>

                      <h2>Tư vấn kỹ trước khi mua</h2>

                      <div className="kjp-commitment__grid">

                        {careCards.map((card) => (

                          <article key={card.number}>

                            <span className="kjp-icon"><ShieldIcon /></span>

                            <h3>{card.title}</h3><p>{card.text}</p>

                          </article>

                        ))}

                      </div>

                    </div>

                  </section>

                  <section className="kjp-size-guide" id="size-guide" aria-labelledby="kjp-size-title">

                    <span className="kjp-kicker">TƯ VẤN SIZE VÒNG</span>

                    <h2 id="kjp-size-title">Bạn chưa chắc size vòng?</h2>

                    <p>Vòng ngọc là vòng cứng, nên size không chỉ dựa vào cổ tay mà còn phụ thuộc vào phần rộng nhất của bàn tay. King Jades có thể tư vấn lại trước khi xác nhận đơn hàng.</p>

                    <p className="kjp-size-guide__value">{sizeText}</p>

                    <Link to={contactUrl} className="kjp-dark-button">NHẬN TƯ VẤN SIZE <ArrowIcon /></Link>

                    <button type="button" className="kjp-size-open" onClick={() => setIsSizeGuideOpen(true)}>ƯỚM THỬ SIZE VÒNG <RulerIcon /></button>

                    <ol className="kjp-size-steps">

                      <li><span>1</span><div><h3>Đo phần rộng nhất của bàn tay</h3><p>Khép các ngón tay lại, đo quanh phần rộng nhất của bàn tay.</p></div></li>

                      <li><span>2</span><div><h3>Đo chu vi cổ tay</h3><p>Dùng thước dây mềm đo sát phần xương cổ tay.</p></div></li>

                      <li><span>3</span><div><h3>Gửi hình ảnh tham khảo</h3><p>Gửi ảnh vòng đang đeo vừa để đội ngũ so sánh.</p></div></li>

                    </ol>

                  </section>

                </div>

              </div>

              <section className="kjp-after-sale" aria-labelledby="kjp-after-title">

                <div className="kjp-container">

                  <div className="kjp-after-sale__head">

                    <div>

                      <span className="kjp-kicker">ĐỒNG HÀNH SAU MUA</span>

                      <h2 id="kjp-after-title">Chăm sóc sau bán hàng</h2>

                    </div>

                    <p className="kjp-after-sale__lead">King Jades đồng hành cùng khách hàng sau khi mua — từ tư vấn, kiểm tra, vệ sinh đến bàn giao lại sản phẩm trong tinh thần chỉn chu và an tâm.</p>

                  </div>

                  <div className="kjp-service-grid">

                    <article><span className="kjp-icon"><ShieldIcon /></span><h3>Bảo hành chính hãng</h3><p>Hỗ trợ theo chính sách áp dụng và xác nhận tình trạng sản phẩm trước khi xử lý.</p></article>

                    <article><span className="kjp-icon"><RulerIcon /></span><h3>Vệ sinh & làm mới</h3><p>Làm sạch, chăm sóc và hướng dẫn bảo quản để giữ vẻ đẹp của ngọc.</p></article>

                    <article><span className="kjp-icon"><ShieldIcon /></span><h3>Kiểm tra cẩn thận</h3><p>Đánh giá màu, vân và tổng thể sản phẩm trước khi đề xuất phương án phù hợp.</p></article>

                    <article><span className="kjp-icon"><MessageIcon /></span><h3>Tư vấn hậu mãi</h3><p>Hỗ trợ qua Zalo khi khách cần kiểm tra thêm hoặc hỏi về cách bảo quản.</p></article>

                  </div>

                  <div className="kjp-process-grid">

                    {afterSaleSteps.map((step) => (

                      <article key={step.number}>

                        <div className="kjp-process-visual">

                          <img src={step.image} alt={step.imageAlt} loading="lazy" decoding="async" />

                        </div>

                        <div className="kjp-process-copy"><div><span>{Number(step.number)}</span><h3>{step.title}</h3></div><p>{step.text}</p></div>

                      </article>

                    ))}

                  </div>

                  <div className="kjp-after-cta">

                    <div><span className="kjp-kicker">TƯ VẤN CÁ NHÂN</span><h2>Cần xem thêm hình ảnh hoặc tư vấn trực tiếp?</h2><p>Gửi mã sản phẩm và nhu cầu để đội ngũ King Jades hỗ trợ riêng.</p></div>

                    <Link to={contactUrl}>Liên hệ tư vấn <ArrowIcon /></Link>

                  </div>

                </div>

              </section>

              <div className="kjp-mobile-bar">

                <div><small>{product.name}</small><strong>{formatPrice(finalPrice)}</strong></div>

                {/* NÚT GIỎ HÀNG MOBILE - ẨN TẠM, KHÔNG XÓA

                <button type="button" onClick={handleAddToCart}><BagIcon />Thêm vào giỏ</button>

                */}

              </div>

            </>

          )}

        </main>

      </div>

      {isDescriptionModalOpen && (

        <div

          className="kjp-description-modal"

          role="dialog"

          aria-modal="true"

          aria-labelledby="kjp-description-reader-title"

          id="kjp-description-reader"

        >

          <button

            type="button"

            className="kjp-description-modal__backdrop"

            onClick={() => setIsDescriptionModalOpen(false)}

            aria-label="Đóng mô tả sản phẩm"

          />

          <section className="kjp-description-modal__panel">

            <header className="kjp-description-modal__head">

              <div>

                <span className="kjp-description-modal__eyebrow">

                  MÔ TẢ CHI TIẾT

                </span>

                <h2 id="kjp-description-reader-title">

                  {product.name}

                </h2>

              </div>

              <button

                type="button"

                className="kjp-description-modal__close"

                onClick={() => setIsDescriptionModalOpen(false)}

                aria-label="Đóng"

              >

                <CloseIcon />

              </button>

            </header>

            <div className="kjp-description-modal__body">

              <article className="kjp-description-article">

                {descriptionLines.map((line, index) =>

                  isDescriptionHeading(line) ? (

                    <h3 key={`${line}-${index}`}>{line}</h3>

                  ) : (

                    <p key={`${line}-${index}`}>{line}</p>

                  )

                )}

              </article>

            </div>

            <footer className="kjp-description-modal__footer">

              <span>

                Thông tin sản phẩm được trình bày đầy đủ để khách hàng dễ tham khảo.

              </span>

              <button

                type="button"

                onClick={() => setIsDescriptionModalOpen(false)}

              >

                Đóng mô tả

              </button>

            </footer>

          </section>

        </div>

      )}

      {isSizeGuideOpen && <SizeGuideModal onClose={() => setIsSizeGuideOpen(false)} />}

      <Footer />

    </>

  );

};

export default ProductDetailPage;