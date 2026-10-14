import React, {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { productApi } from "../api/productApi";
import {
  getProductMenuCategory,
  resolveProductMenuSelection,
} from "../config/productMenuConfig";
import { useDynamicProductMenu } from "../hooks/useDynamicProductMenu";
import { getImageUrl } from "../utils/getImageUrl";
import "../styles/AddProductPage.css";

type Specification = {
  label: string;
  value: string;
};

type ProductImage = {
  id: string;
  name: string;
  url: string;
  alt: string;
  title: string;
  description: string;
  caption: string;
  isMain: boolean;
  sortOrder: number;
  file?: File;
  serverUrl?: string;
  fileName?: string;
};

type SeoForm = {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogImage: string;
  focusKeyword: string;
  robots: string;
  schemaType: string;
};

type TypographyForm = {
  titleFont: string;
  descriptionFont: string;
  letterSpacing: number;
  lineHeight: number;
};

type TextStyleForm = {
  headingSize: number;
  bodySize: number;
  headingColor: string;
  bodyColor: string;
  headingAlign: string;
  bodyAlign: string;
};

type ProductTagging = {
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isPromotion: boolean;
  collectionTags: string[];
};

type Visibility = {
  isPublished: boolean;
  showOnMenu: boolean;
};

type ProductStatus =
  | "active"
  | "draft"
  | "inactive";

type PublishStatus =
  | "Published"
  | "Scheduled"
  | "Draft";

type ProductForm = {
  name: string;
  slug: string;
  sku: string;
  parentCategoryId: string;
  parentCategoryName: string;
  categoryId: string;
  categoryName: string;
  price: string;
  salePrice: string;
  shortDescription: string;
  description: string;
  images: ProductImage[];
  specifications: Specification[];
  seo: SeoForm;
  typography: TypographyForm;
  textStyle: TextStyleForm;
  tags: string[];
  tagInput: string;
  productTagging: ProductTagging;
  collectionTagInput: string;
  visibility: Visibility;
  status: ProductStatus;

  // Trạng thái đăng sản phẩm:
  // Published = đăng ngay
  // Scheduled = hẹn giờ
  // Draft = lưu nháp
  publishStatus: PublishStatus;

  // Giá trị dùng cho input datetime-local.
  // Khi gửi backend sẽ được convert sang UTC.
  publishAtLocal: string;
};

type AdminProductImage = {
  // Schema hiện tại.
  url?: string;
  fileName?: string;
  alt?: string;
  title?: string;
  description?: string;
  caption?: string;
  isMain?: boolean;
  sortOrder?: number;

  // Backward compatibility cho dữ liệu/import cũ nếu API từng dùng tên khác.
  imageUrl?: string;
  image_url?: string;
};

type AdminProduct = {
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
  images?: AdminProductImage[];
  specifications?: Specification[];
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
  tags?: string[];
  productTagging?: ProductTagging;
  visibility?: Visibility;
  status: ProductStatus;

  publishStatus?: PublishStatus;
  publishAtUtc?: string | null;
  publishedAtUtc?: string | null;

  createdAtUtc?: string;
  updatedAtUtc?: string;

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
    headingAlign?: string;
    bodyAlign?: string;
    alignment?: string;
  };
};

type AddProductPageProps = {
  mode?: "create" | "edit";
  initialProduct?: AdminProduct | null;
  onBack?: () => void;
  onSaved?: () => void;
};

type MessageTone =
  | "success"
  | "error"
  | "";

const emptySpecification: Specification = {
  label: "",
  value: "",
};

const createId = (): string => {
  if (
    typeof crypto !== "undefined" &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
};

const createInitialForm = (): ProductForm => ({
  name: "",
  slug: "",
  sku: "",
  parentCategoryId: "",
  parentCategoryName: "",
  categoryId: "",
  categoryName: "",
  price: "",
  salePrice: "",
  shortDescription: "",
  description: "",
  images: [],
  specifications: [
    { ...emptySpecification },
  ],
  seo: {
    title: "",
    description: "",
    keywords: "",
    canonicalUrl: "",
    ogImage: "",
    focusKeyword: "",
    robots: "index,follow",
    schemaType: "Product",
  },
  typography: {
    titleFont: "Lora",
    descriptionFont: "SVN-Gilroy",
    letterSpacing: 0.02,
    lineHeight: 1.8,
  },
  textStyle: {
    headingSize: 48,
    bodySize: 16,
    headingColor: "#142543",
    bodyColor: "#706d65",
    headingAlign: "left",
    bodyAlign: "left",
  },
  tags: [],
  tagInput: "",
  productTagging: {
    isFeatured: false,
    isBestSeller: false,
    isNewArrival: false,
    isPromotion: false,
    collectionTags: [],
  },
  collectionTagInput: "",
  visibility: {
    isPublished: true,
    showOnMenu: false,
  },
  status: "active",

  // Giữ hành vi cũ: sản phẩm mới mặc định đăng ngay.
  publishStatus: "Published",
  publishAtLocal: "",
});

const toLocalDateTimeInput = (
  value?: string | null
): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number: number) =>
    String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const formatDateTextFromLocal = (
  value?: string | null
): string => {
  if (!value) {
    return "";
  }

  const datePart =
    value.split("T")[0];

  const [
    year,
    month,
    day,
  ] = datePart.split("-");

  if (
    !year ||
    !month ||
    !day
  ) {
    return "";
  }

  return `${day}/${month}/${year}`;
};

const getTimeTextFromLocal = (
  value?: string | null
): string => {
  if (!value) {
    return "";
  }

  return (
    value.split("T")[1]?.slice(
      0,
      5
    ) || ""
  );
};

const buildLocalDateTime = (
  dateText: string,
  timeText: string
): string | null => {
  const match =
    dateText.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

  if (
    !match ||
    !timeText
  ) {
    return null;
  }

  const [
    ,
    dayText,
    monthText,
    yearText,
  ] = match;

  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  const isValidDate =
    date.getFullYear() === year &&
    date.getMonth() ===
      month - 1 &&
    date.getDate() === day;

  if (!isValidDate) {
    return null;
  }

  return `${yearText}-${monthText}-${dayText}T${timeText}`;
};

const resolvePublishStatus = (
  product: AdminProduct
): PublishStatus => {
  if (
    product.publishStatus ===
      "Published" ||
    product.publishStatus ===
      "Scheduled" ||
    product.publishStatus === "Draft"
  ) {
    return product.publishStatus;
  }

  // Sản phẩm cũ chưa có PublishStatus:
  // đang public => Published
  // đang ẩn => Draft
  return product.visibility
    ?.isPublished
    ? "Published"
    : "Draft";
};

const formatPrice = (
  value: string
) => {
  const amount = Number(value || 0);

  if (!amount) {
    return "Giá liên hệ";
  }

  return `${new Intl.NumberFormat(
    "vi-VN"
  ).format(amount)} đ`;
};

const getStoredImageUrl = (
  image?: AdminProductImage | null
): string => {
  if (!image) {
    return "";
  }

  const legacyImage = image as AdminProductImage & {
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

const toServerImageUrl = (
  value?: string | null
): string => {
  const raw = (value || "").trim();

  if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return "";
  }

  const marker = "/uploads/products/";
  const markerIndex = raw.toLowerCase().indexOf(marker);

  if (markerIndex >= 0) {
    return raw
      .slice(markerIndex)
      .split("?")[0]
      .split("#")[0];
  }

  return raw;
};

const getPersistedImageUrl = (
  image: ProductImage
): string => {
  if (image.file) {
    return "";
  }

  return toServerImageUrl(
    image.serverUrl || image.url
  );
};

const BackIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 12H5" />
    <path d="m10 7-5 5 5 5" />
  </svg>
);

const SaveIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 4h12l2 2v14H5V4Z" />
    <path d="M8 4v6h8V4M8 20v-6h8v6" />
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M5 14v6h14v-6" />
  </svg>
);

const ImageIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="2" />
    <path d="m5 18 4.5-4.5 3 3 2-2L19 18" />
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

const StarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const AddProductPage: React.FC<
  AddProductPageProps
> = ({
  mode = "create",
  initialProduct = null,
  onBack,
  onSaved,
}) => {
  /*
   * Admin dùng ProductCategories động.
   * Nếu API lỗi, hook tự fallback về taxonomy cũ.
   */
  const productMenu =
    useDynamicProductMenu(
      "admin"
    );

  const [form, setForm] =
    useState<ProductForm>(
      createInitialForm
    );

  const [message, setMessage] =
    useState("");
  const [messageTone, setMessageTone] =
    useState<MessageTone>("");
  const [saving, setSaving] =
    useState(false);

  // Chỉ true khi người dùng thực sự thêm hoặc xóa ảnh.
  // Backend dùng cờ này để tránh xóa ảnh cũ do lỗi mapping/frontend legacy.
  const [imagesChanged, setImagesChanged] =
    useState(false);

  const [
    publishDateText,
    setPublishDateText,
  ] = useState("");

  const [
    publishTimeText,
    setPublishTimeText,
  ] = useState("");

  const [
    selectedMenuGroupId,
    setSelectedMenuGroupId,
  ] = useState("");

  const isEditMode =
    mode === "edit" &&
    Boolean(initialProduct?.id);

  const slugify = (
    text: string
  ): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(
        /[^a-z0-9\s-]/g,
        ""
      )
      .trim()
      .replace(/\s+/g, "-");
  };

  const mapProductToForm = (
    product: AdminProduct
  ): ProductForm => {
    const sourceImages =
      product.images || [];

    const hasExplicitMainImage =
      sourceImages.some((image) =>
        Boolean(image.isMain)
      );

    return {
      name: product.name || "",
      slug: product.slug || "",
      sku: product.sku || "",
      parentCategoryId:
        product.parentCategoryId || "",
      parentCategoryName:
        product.parentCategoryName || "",
      categoryId:
        product.categoryId || "",
      categoryName:
        product.categoryName || "",
      price: product.price
        ? String(product.price)
        : "",
      salePrice: product.salePrice
        ? String(product.salePrice)
        : "",
      shortDescription:
        product.shortDescription || "",
      description:
        product.description || "",
      images: sourceImages
        .map((image, index) => {
          const storedUrl =
            toServerImageUrl(
              getStoredImageUrl(image)
            );

          return {
            id: createId(),
            name:
              image.fileName ||
              `image-${index + 1}`,
            url: storedUrl
              ? getImageUrl(storedUrl)
              : "",
            alt:
              image.alt ||
              product.name,
            title:
              image.title ||
              product.name,
            description:
              image.description ||
              "",
            caption:
              image.caption ||
              "",
            isMain:
              Boolean(image.isMain) ||
              (!hasExplicitMainImage &&
                index === 0),
            sortOrder:
              image.sortOrder ||
              index + 1,
            // Giữ path gốc MongoDB để khi edit không biến thành data/blob/absolute URL.
            serverUrl: storedUrl,
            fileName: image.fileName,
          };
        })
        .filter((image) => Boolean(image.serverUrl)),
      specifications:
        product.specifications &&
        product.specifications.length > 0
          ? product.specifications.map(
              (item) => ({
                ...item,
              })
            )
          : [
              {
                ...emptySpecification,
              },
            ],
      seo: {
        title:
          product.seo?.title || "",
        description:
          product.seo
            ?.description || "",
        keywords:
          product.seo?.keywords?.join(
            ", "
          ) || "",
        canonicalUrl:
          product.seo
            ?.canonicalUrl || "",
        ogImage:
          product.seo?.ogImage || "",
        focusKeyword:
          product.seo?.focusKeyword || "",
        robots:
          product.seo?.robots || "index,follow",
        schemaType:
          product.seo?.schemaType || "Product",
      },
      typography: {
        titleFont: product.typography?.titleFont || "Lora",
        descriptionFont: product.typography?.descriptionFont || "SVN-Gilroy",
        letterSpacing: product.typography?.letterSpacing || 0.02,
        lineHeight: product.typography?.lineHeight || 1.8,
      },
      textStyle: {
        headingSize: product.textStyle?.headingSize || 48,
        bodySize: product.textStyle?.bodySize || 16,
        headingColor: product.textStyle?.headingColor || "#142543",
        bodyColor: product.textStyle?.bodyColor || "#706d65",
        headingAlign:
          product.textStyle?.headingAlign ||
          product.textStyle?.alignment ||
          "left",
        bodyAlign:
          product.textStyle?.bodyAlign ||
          product.textStyle?.alignment ||
          "left",
      },
      tags: [
        ...(product.tags || []),
      ],
      tagInput: "",
      productTagging: {
        isFeatured:
          product.productTagging
            ?.isFeatured || false,
        isBestSeller:
          product.productTagging
            ?.isBestSeller || false,
        isNewArrival:
          product.productTagging
            ?.isNewArrival || false,
        isPromotion:
          product.productTagging
            ?.isPromotion || false,
        collectionTags: [
          ...(product.productTagging
            ?.collectionTags || []),
        ],
      },
      collectionTagInput: "",
      visibility: {
        isPublished:
          product.visibility
            ?.isPublished ?? true,
        showOnMenu:
          product.visibility
            ?.showOnMenu ?? false,
      },
      status:
        product.status || "active",

      publishStatus:
        resolvePublishStatus(product),

      publishAtLocal:
        toLocalDateTimeInput(
          product.publishAtUtc
        ),
    };
  };

  useEffect(() => {
    if (
      isEditMode &&
      initialProduct
    ) {
      setForm(
        mapProductToForm(
          initialProduct
        )
      );
    } else {
      setForm(
        createInitialForm()
      );
    }

    const initialPublishLocal =
      isEditMode &&
      initialProduct
        ? toLocalDateTimeInput(
            initialProduct.publishAtUtc
          )
        : "";

    setPublishDateText(
      formatDateTextFromLocal(
        initialPublishLocal
      )
    );

    setPublishTimeText(
      getTimeTextFromLocal(
        initialPublishLocal
      )
    );

    setMessage("");
    setMessageTone("");
    setImagesChanged(false);
  }, [
    mode,
    initialProduct,
    isEditMode,
  ]);

  /*
   * ==================================================
   * SAFE DYNAMIC PRODUCT MENU
   *
   * Giữ taxonomy legacy làm fallback và merge thêm
   * ProductCategories từ MongoDB.
   * ==================================================
   */

  const selectedMenuCategory =
    useMemo(
      () =>
        getProductMenuCategory(
          form.parentCategoryId,
          productMenu
        ) ||
        productMenu.find(
          (category) =>
            category.name ===
            form.parentCategoryName
        ) ||
        null,
      [
        form.parentCategoryId,
        form.parentCategoryName,
        productMenu,
      ]
    );

  const availableMenuGroups =
    useMemo(
      () =>
        selectedMenuCategory
          ?.groups || [],
      [selectedMenuCategory]
    );

  const selectedMenuGroup =
    useMemo(
      () =>
        availableMenuGroups.find(
          (group) =>
            group.id ===
            selectedMenuGroupId
        ) ||
        (
          availableMenuGroups.length ===
          1
            ? availableMenuGroups[0]
            : null
        ),
      [
        availableMenuGroups,
        selectedMenuGroupId,
      ]
    );

  const availableMenuItems =
    useMemo(
      () =>
        selectedMenuGroup
          ?.items || [],
      [selectedMenuGroup]
    );

  /*
   * Tương thích sản phẩm cũ:
   * - ObjectId category cũ
   * - chỉ có CategoryName
   *
   * Khi edit, tự ánh xạ về taxonomy cố định.
   */
  useEffect(() => {
    const resolved =
      resolveProductMenuSelection(
        {
          parentCategoryId:
            form.parentCategoryId,
          parentCategoryName:
            form.parentCategoryName,
          categoryId:
            form.categoryId,
          categoryName:
            form.categoryName,
        },
        productMenu
      );

    if (!resolved) {
      if (
        !form.parentCategoryId &&
        !form.parentCategoryName
      ) {
        setSelectedMenuGroupId(
          ""
        );
      }

      return;
    }

    setSelectedMenuGroupId(
      resolved.group.id
    );

    const alreadyNormalized =
      form.parentCategoryId ===
        resolved.category.id &&
      form.parentCategoryName ===
        resolved.category.name &&
      form.categoryId ===
        resolved.item.id &&
      form.categoryName ===
        resolved.item.name;

    if (alreadyNormalized) {
      return;
    }

    setForm(
      (previous) => ({
        ...previous,

        parentCategoryId:
          resolved.category.id,

        parentCategoryName:
          resolved.category.name,

        categoryId:
          resolved.item.id,

        categoryName:
          resolved.item.name,
      })
    );
  }, [
    form.parentCategoryId,
    form.parentCategoryName,
    form.categoryId,
    form.categoryName,
    productMenu,
  ]);

  const handleParentCategoryChange = (
    event:
      ChangeEvent<HTMLSelectElement>
  ) => {
    const parentId =
      event.target.value;

    const parent =
      getProductMenuCategory(
        parentId,
        productMenu
      );

    const autoGroup =
      parent?.groups.length === 1
        ? parent.groups[0]
        : null;

    setSelectedMenuGroupId(
      autoGroup?.id || ""
    );

    setForm(
      (previous) => ({
        ...previous,

        parentCategoryId:
          parent?.id || "",

        parentCategoryName:
          parent?.name || "",

        categoryId: "",
        categoryName: "",
      })
    );
  };

  const handleMenuGroupChange = (
    event:
      ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedMenuGroupId(
      event.target.value
    );

    setForm(
      (previous) => ({
        ...previous,
        categoryId: "",
        categoryName: "",
      })
    );
  };

  const handleChildCategoryChange = (
    event:
      ChangeEvent<HTMLSelectElement>
  ) => {
    const categoryId =
      event.target.value;

    const category =
      selectedMenuGroup
        ?.items.find(
          (item) =>
            item.id ===
            categoryId
        );

    setForm(
      (previous) => ({
        ...previous,

        categoryId:
          category?.id || "",

        categoryName:
          category?.name || "",
      })
    );
  };

  const mainImage = useMemo(
    () =>
      form.images.find(
        (image) => image.isMain
      ) ||
      form.images[0] ||
      null,
    [form.images]
  );

  const completion = useMemo(() => {
    const checks = [
      Boolean(form.name.trim()),
      Boolean(
        form.parentCategoryName.trim()
      ),
      Boolean(
        form.categoryName.trim()
      ),
      Boolean(form.slug.trim()),
      form.images.length > 0,
      Boolean(
        form.shortDescription.trim()
      ),
      Boolean(
        form.description.trim()
      ),
      form.specifications.some(
        (item) =>
          item.label.trim() &&
          item.value.trim()
      ),
      Boolean(form.seo.title.trim()),
    ];

    const completed =
      checks.filter(Boolean).length;

    return Math.round(
      (completed / checks.length) *
        100
    );
  }, [form]);

  const seoScore = useMemo(() => {
    const focusKeyword =
      form.seo.focusKeyword
        .trim()
        .toLowerCase();

    const title =
      form.seo.title
        .trim()
        .toLowerCase();

    const description =
      form.seo.description
        .trim()
        .toLowerCase();

    const checks = [
      form.seo.title.trim().length >= 30 &&
        form.seo.title.trim().length <= 60,
      form.seo.description.trim().length >= 120 &&
        form.seo.description.trim().length <= 160,
      Boolean(focusKeyword),
      Boolean(
        focusKeyword &&
        title.includes(focusKeyword)
      ),
      Boolean(
        focusKeyword &&
        description.includes(focusKeyword)
      ),
    ];

    return Math.round(
      (checks.filter(Boolean).length /
        checks.length) *
        100
    );
  }, [
    form.seo.description,
    form.seo.focusKeyword,
    form.seo.title,
  ]);

  const showMessage = (
    text: string,
    tone: MessageTone
  ) => {
    setMessage(text);
    setMessageTone(tone);
  };

  const scrollToSection = (
    sectionId: string
  ) => {
    const section =
      document.getElementById(
        sectionId
      );

    if (!section) {
      return;
    }

    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleBasicChange = (
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
    >
  ) => {
    const {
      name,
      value,
    } = event.target;

    if (name === "name") {
      setForm((previous) => ({
        ...previous,
        name: value,
        slug: slugify(value),
        seo: {
          ...previous.seo,
          title:
            previous.seo.title ||
            `${value} | King Jades`,
        },
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSeoChange = (
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
    >
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      seo: {
        ...previous.seo,
        [name]: value,
      },
    }));
  };

  const handleTypographyChange = (
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;
    const field = name as keyof TypographyForm;

    setForm((previous) => ({
      ...previous,
      typography: {
        ...previous.typography,
        [field]:
          field === "letterSpacing" ||
          field === "lineHeight"
            ? Number(value || 0)
            : value,
      },
    }));
  };

  const handleTextStyleChange = (
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;
    const field = name as keyof TextStyleForm;

    setForm((previous) => ({
      ...previous,
      textStyle: {
        ...previous.textStyle,
        [field]:
          field === "headingSize" ||
          field === "bodySize"
            ? Number(value || 0)
            : value,
      },
    }));
  };

  const updateImageSeo = (
    id: string,
    field:
      | "alt"
      | "title"
      | "description"
      | "caption",
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      images: previous.images.map(
        (image) =>
          image.id === id
            ? {
                ...image,
                [field]: value,
              }
            : image
      ),
    }));
  };

  const handleVisibilityChange = (
    name: keyof Visibility
  ) => {
    setForm((previous) => {
      const nextValue =
        !previous.visibility[name];

      // Giữ đồng bộ giữa nút "Hiển thị website"
      // và trạng thái đăng sản phẩm.
      if (name === "isPublished") {
        return {
          ...previous,
          visibility: {
            ...previous.visibility,
            isPublished: nextValue,
          },
        };
      }

      return {
        ...previous,
        visibility: {
          ...previous.visibility,
          [name]: nextValue,
        },
      };
    });
  };

  const handlePublishStatusChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    const nextStatus =
      event.target.value as PublishStatus;

    if (
      nextStatus !== "Scheduled"
    ) {
      setPublishDateText("");
      setPublishTimeText("");
    }

    setForm((previous) => ({
      ...previous,

      publishStatus: nextStatus,

      // Chỉ Scheduled mới cần giữ thời gian.
      publishAtLocal:
        nextStatus === "Scheduled"
          ? previous.publishAtLocal
          : "",

      // Trạng thái đăng và trạng thái hiển thị website
      // là hai thiết lập độc lập.
      visibility: {
        ...previous.visibility,
      },
    }));
  };

  const handleProductTaggingChange = (
    name: keyof Omit<
      ProductTagging,
      "collectionTags"
    >
  ) => {
    setForm((previous) => ({
      ...previous,
      productTagging: {
        ...previous.productTagging,
        [name]:
          !previous
            .productTagging[name],
      },
    }));
  };

  const readFileAsDataUrl = (
    file: File
  ) =>
    new Promise<string>(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.onload = () => {
          if (
            typeof reader.result ===
            "string"
          ) {
            resolve(reader.result);
            return;
          }

          reject(
            new Error(
              "Không thể đọc hình ảnh."
            )
          );
        };

        reader.onerror = () =>
          reject(
            new Error(
              `Không thể đọc ${file.name}.`
            )
          );

        reader.readAsDataURL(file);
      }
    );

  const handleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(
      event.target.files || []
    );

    event.target.value = "";

    if (!files.length) {
      return;
    }

    setImagesChanged(true);

    try {
      const previews =
        await Promise.all(
          files.map(
            readFileAsDataUrl
          )
        );

      setForm((previous) => {
        const startIndex =
          previous.images.length;

        const newImages =
          files.map(
            (file, index) => ({
              id: createId(),
              name: file.name,
              url: previews[index],
              alt:
                previous.name ||
                "King Jades product image",
              title:
                previous.name ||
                file.name,
              description: "",
              caption: "",
              isMain:
                startIndex === 0 &&
                index === 0,
              sortOrder:
                startIndex +
                index +
                1,
              file,
            })
          );

        return {
          ...previous,
          images: [
            ...previous.images,
            ...newImages,
          ],
        };
      });
    } catch (error) {
      const uploadError =
        error as Error;

      showMessage(
        uploadError.message ||
          "Không thể đọc hình ảnh.",
        "error"
      );
    }
  };

  const setMainImage = (
    id: string
  ) => {
    setForm((previous) => {
      const selectedImage =
        previous.images.find(
          (image) =>
            image.id === id
        );

      return {
        ...previous,
        images:
          previous.images.map(
            (image) => ({
              ...image,
              isMain:
                image.id === id,
            })
          ),
        seo: {
          ...previous.seo,
          ogImage:
            selectedImage
              ?.serverUrl ||
            selectedImage?.url ||
            "",
        },
      };
    });
  };

  const removeImage = (
    id: string
  ) => {
    setImagesChanged(true);

    setForm((previous) => {
      const removedImage =
        previous.images.find(
          (image) =>
            image.id === id
        );

      const filteredImages =
        previous.images.filter(
          (image) =>
            image.id !== id
        );

      return {
        ...previous,
        images:
          filteredImages.map(
            (image, index) => ({
              ...image,
              sortOrder: index + 1,
              isMain:
                removedImage?.isMain
                  ? index === 0
                  : image.isMain ||
                    index === 0,
            })
          ),
      };
    });
  };

  const updateSpecification = (
    index: number,
    field: keyof Specification,
    value: string
  ) => {
    setForm((previous) => {
      const specifications = [
        ...previous.specifications,
      ];

      specifications[index] = {
        ...specifications[index],
        [field]: value,
      };

      return {
        ...previous,
        specifications,
      };
    });
  };

  const addSpecification = () => {
    setForm((previous) => ({
      ...previous,
      specifications: [
        ...previous.specifications,
        {
          ...emptySpecification,
        },
      ],
    }));
  };

  const removeSpecification = (
    index: number
  ) => {
    setForm((previous) => ({
      ...previous,
      specifications:
        previous.specifications
          .length === 1
          ? [
              {
                ...emptySpecification,
              },
            ]
          : previous.specifications.filter(
              (_, itemIndex) =>
                itemIndex !== index
            ),
    }));
  };

  const addTag = () => {
    const value =
      form.tagInput.trim();

    if (
      !value ||
      form.tags.includes(value)
    ) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      tags: [
        ...previous.tags,
        value,
      ],
      tagInput: "",
    }));
  };

  const removeTag = (
    tag: string
  ) => {
    setForm((previous) => ({
      ...previous,
      tags:
        previous.tags.filter(
          (item) => item !== tag
        ),
    }));
  };

  const addCollectionTag = () => {
    const value =
      form.collectionTagInput.trim();

    if (
      !value ||
      form.productTagging
        .collectionTags.includes(
          value
        )
    ) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      productTagging: {
        ...previous.productTagging,
        collectionTags: [
          ...previous.productTagging
            .collectionTags,
          value,
        ],
      },
      collectionTagInput: "",
    }));
  };

  const removeCollectionTag = (
    tag: string
  ) => {
    setForm((previous) => ({
      ...previous,
      productTagging: {
        ...previous.productTagging,
        collectionTags:
          previous.productTagging
            .collectionTags.filter(
              (item) =>
                item !== tag
            ),
      },
    }));
  };

  const resetForm = () => {
    if (
      isEditMode &&
      initialProduct
    ) {
      const mapped =
        mapProductToForm(
          initialProduct
        );

      setForm(mapped);

      setPublishDateText(
        formatDateTextFromLocal(
          mapped.publishAtLocal
        )
      );

      setPublishTimeText(
        getTimeTextFromLocal(
          mapped.publishAtLocal
        )
      );

    } else {
      setForm(
        createInitialForm()
      );

      setPublishDateText("");
      setPublishTimeText("");
      setSelectedMenuGroupId("");
    }

    setImagesChanged(false);
    setMessage("");
    setMessageTone("");
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      return "Vui lòng nhập tên sản phẩm.";
    }

    if (
      !form.parentCategoryId ||
      !form.parentCategoryName.trim()
    ) {
      return "Vui lòng chọn danh mục chính.";
    }

    if (
      !form.categoryId ||
      !form.categoryName.trim()
    ) {
      return "Vui lòng chọn mục sản phẩm.";
    }

    const price = Number(
      form.price || 0
    );
    const salePrice = Number(
      form.salePrice || 0
    );

    if (
      price < 0 ||
      salePrice < 0
    ) {
      return "Giá sản phẩm không được nhỏ hơn 0.";
    }

    if (
      price > 0 &&
      salePrice > price
    ) {
      return "Giá khuyến mãi không được lớn hơn giá bán.";
    }

    if (
      form.publishStatus ===
      "Scheduled"
    ) {
      if (!form.publishAtLocal) {
        return "Vui lòng chọn ngày giờ đăng sản phẩm.";
      }

      const publishDate =
        new Date(
          form.publishAtLocal
        );

      if (
        Number.isNaN(
          publishDate.getTime()
        )
      ) {
        return "Ngày giờ đăng sản phẩm không hợp lệ.";
      }

      if (
        publishDate.getTime() <=
        Date.now()
      ) {
        return "Thời gian hẹn đăng phải lớn hơn thời gian hiện tại.";
      }
    }

    return "";
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setMessage("");
    setMessageTone("");

    console.log(
      "=== PRODUCT SUBMIT ===",
      {
        mode,
        isEditMode,
        name:
          form.name,
        slug:
          form.slug,
        sku:
          form.sku,
        parentCategoryId:
          form.parentCategoryId,
        parentCategoryName:
          form.parentCategoryName,
        categoryId:
          form.categoryId,
        categoryName:
          form.categoryName,
        status:
          form.status,
        publishStatus:
          form.publishStatus,
        publishAtLocal:
          form.publishAtLocal,
        imageCount:
          form.images.length,
        visibility:
          form.visibility,
      }
    );

    const validationMessage =
      validateForm();

    if (validationMessage) {
      showMessage(
        validationMessage,
        "error"
      );

      console.warn(
        "PRODUCT VALIDATION BLOCKED:",
        {
          message:
            validationMessage,
          name:
            form.name,
          parentCategoryId:
            form.parentCategoryId,
          parentCategoryName:
            form.parentCategoryName,
          categoryId:
            form.categoryId,
          categoryName:
            form.categoryName,
          status:
            form.status,
          publishStatus:
            form.publishStatus,
        }
      );

      window.alert(
        validationMessage
      );

      scrollToSection(
        "kj-section-basic"
      );

      return;
    }

    try {
      setSaving(true);

      const formData =
        new FormData();

      const publishAtUtc =
        form.publishStatus ===
          "Scheduled" &&
        form.publishAtLocal
          ? new Date(
              form.publishAtLocal
            ).toISOString()
          : null;

      formData.append(
        "name",
        form.name.trim()
      );

      formData.append(
        "slug",
        form.slug.trim() ||
          slugify(form.name)
      );

      formData.append(
        "sku",
        form.sku.trim()
      );

      formData.append(
        "parentCategoryId",
        form.parentCategoryId
      );

      formData.append(
        "parentCategoryName",
        form.parentCategoryName.trim()
      );

      formData.append(
        "categoryId",
        form.categoryId
      );

      formData.append(
        "categoryName",
        form.categoryName.trim()
      );

      formData.append(
        "price",
        String(
          Number(form.price || 0)
        )
      );

      formData.append(
        "salePrice",
        String(
          Number(
            form.salePrice || 0
          )
        )
      );

      formData.append(
        "shortDescription",
        form.shortDescription.trim()
      );

      formData.append(
        "description",
        form.description.trim()
      );

      formData.append(
        "status",
        form.status
      );

      // Backend CreateProduct nhận trực tiếp 2 field này.
      formData.append(
        "publishStatus",
        form.publishStatus
      );

      if (publishAtUtc) {
        formData.append(
          "publishAtUtc",
          publishAtUtc
        );
      }

      const cleanSpecifications =
        form.specifications.filter(
          (item) =>
            item.label.trim() &&
            item.value.trim()
        );

      formData.append(
        "specifications",
        JSON.stringify(
          cleanSpecifications
        )
      );

      formData.append(
        "seo",
        JSON.stringify({
          title:
            form.seo.title.trim(),
          description:
            form.seo.description.trim(),
          keywords:
            form.seo.keywords
              .split(",")
              .map((item) =>
                item.trim()
              )
              .filter(Boolean),
          canonicalUrl:
            form.seo.canonicalUrl.trim(),
          ogImage:
            form.seo.ogImage || "",
          focusKeyword:
            form.seo.focusKeyword.trim(),
          robots:
            form.seo.robots,
          schemaType:
            form.seo.schemaType,
        })
      );

      formData.append(
        "Typography",
        JSON.stringify(form.typography)
      );

      formData.append(
        "TextStyle",
        JSON.stringify(form.textStyle)
      );

      formData.append(
        "tags",
        JSON.stringify(form.tags)
      );

      formData.append(
        "productTagging",
        JSON.stringify(
          form.productTagging
        )
      );

      formData.append(
        "visibility",
        JSON.stringify(
          form.visibility
        )
      );

      const existingImages =
        form.images
          .filter((image) => !image.file)
          .map((image, index) => {
            const storedUrl =
              getPersistedImageUrl(image);

            return {
              url: storedUrl,
              fileName:
                image.fileName || "",
              alt:
                image.alt || form.name,
              title:
                image.title || form.name,
              description:
                image.description || "",
              caption:
                image.caption || "",
              isMain:
                image.isMain,
              sortOrder: index + 1,
            };
          })
          .filter((image) =>
            Boolean(image.url)
          );

      formData.append(
        "existingImages",
        JSON.stringify(
          existingImages
        )
      );

      formData.append(
        "imagesChanged",
        String(imagesChanged)
      );

      const newImageMetadata =
        form.images
          .filter((image) =>
            Boolean(image.file)
          )
          .map((image, index) => ({
            alt: image.alt,
            title: image.title,
            description:
              image.description,
            caption: image.caption,
            isMain: image.isMain,
            sortOrder: index + 1,
          }));

      // Metadata của ảnh mới được gửi cùng thứ tự với các file "images".
      // Backend có thể map theo index để lưu Alt/Title/Description/Caption.
      formData.append(
        "imageMetadata",
        JSON.stringify(
          newImageMetadata
        )
      );

      form.images.forEach(
        (image) => {
          if (image.file) {
            formData.append(
              "images",
              image.file
            );
          }
        }
      );

      console.log(
        "PRODUCT FORMDATA READY:",
        {
          name:
            formData.get(
              "name"
            ),
          slug:
            formData.get(
              "slug"
            ),
          sku:
            formData.get(
              "sku"
            ),
          parentCategoryId:
            formData.get(
              "parentCategoryId"
            ),
          parentCategoryName:
            formData.get(
              "parentCategoryName"
            ),
          categoryId:
            formData.get(
              "categoryId"
            ),
          categoryName:
            formData.get(
              "categoryName"
            ),
          status:
            formData.get(
              "status"
            ),
          publishStatus:
            formData.get(
              "publishStatus"
            ),
          publishAtUtc:
            formData.get(
              "publishAtUtc"
            ),
          newImageCount:
            form.images.filter(
              (image) =>
                Boolean(image.file)
            ).length,
          existingImageCount:
            existingImages.length,
          imagesChanged,
        }
      );

      if (
        isEditMode &&
        initialProduct?.id
      ) {
        // Giữ nguyên API cập nhật thông tin sản phẩm hiện tại.
        const updateResponse =
          await productApi.updateProduct(
            initialProduct.id,
            formData
          );

        console.log(
          "PRODUCT UPDATE RESPONSE:",
          updateResponse
        );

        // Sau đó cập nhật riêng lịch đăng theo endpoint backend mới.
        const publishResponse =
          await productApi.updatePublishSchedule(
            initialProduct.id,
            {
              publishStatus:
                form.publishStatus,
              publishAtUtc,
            }
          );

        console.log(
          "PRODUCT PUBLISH RESPONSE:",
          publishResponse
        );
      } else {
        const createResponse =
          await productApi.createProduct(
            formData
          );

        console.log(
          "PRODUCT CREATE RESPONSE:",
          createResponse
        );

        /*
         * Backend debug hiện tại trả:
         *
         * debug.inserted
         * debug.insertedId
         * debug.totalAfterInsert
         * debug.mongoContextCount
         *
         * Nếu backend trả 201 nhưng inserted=false
         * thì không reset form để dễ kiểm tra.
         */
        if (
          createResponse?.debug &&
          createResponse.debug.inserted ===
            false
        ) {
          throw new Error(
            "Backend trả về thành công nhưng sản phẩm chưa được xác nhận trong MongoDB."
          );
        }

        if (
          createResponse?.debug
        ) {
          console.table({
            insertedId:
              createResponse.debug
                .insertedId || "",
            inserted:
              createResponse.debug
                .inserted,
            totalAfterInsert:
              createResponse.debug
                .totalAfterInsert,
            mongoContextCount:
              createResponse.debug
                .mongoContextCount,
          });
        }
      }

      const publishMessage =
        form.publishStatus ===
        "Scheduled"
          ? `Đã lưu sản phẩm và hẹn đăng lúc ${new Date(
              form.publishAtLocal
            ).toLocaleString(
              "vi-VN"
            )}.`
          : form.publishStatus ===
              "Draft"
            ? "Đã lưu sản phẩm ở trạng thái nháp."
            : isEditMode
              ? "Cập nhật sản phẩm thành công và đã đăng."
              : "Thêm sản phẩm thành công và đã đăng.";

      showMessage(
        publishMessage,
        "success"
      );

      resetForm();
      onSaved?.();
    } catch (error: any) {
      console.error(
        "PRODUCT SAVE ERROR:",
        {
          message:
            error?.message,
          status:
            error?.response?.status,
          response:
            error?.response?.data,
          error,
        }
      );

      const backendMessage =
        error?.response?.data?.message;

      const backendError =
        error?.response?.data?.error;

      const finalMessage =
        backendMessage ||
        backendError ||
        error?.message ||
        "Có lỗi xảy ra khi lưu sản phẩm.";

      showMessage(
        finalMessage,
        "error"
      );

      window.alert(
        finalMessage
      );

      scrollToSection(
        "kj-section-basic"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTagKeyDown = (
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      event.key === "Enter"
    ) {
      event.preventDefault();
      addTag();
    }
  };

  const handleCollectionKeyDown = (
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      event.key === "Enter"
    ) {
      event.preventDefault();
      addCollectionTag();
    }
  };

  const statusLabel = {
    active: "Đang hoạt động",
    draft: "Bản nháp",
    inactive: "Ngừng hoạt động",
  }[form.status];

  const publishStatusLabel = {
    Published: "Đăng ngay",
    Scheduled: "Hẹn giờ đăng",
    Draft: "Lưu nháp",
  }[form.publishStatus];

  // Live Preview chỉ mô phỏng tỷ lệ typography để sidebar không bị tràn.
  // ProductDetailPage vẫn dùng đúng kích thước người dùng đã cấu hình.
  const previewHeadingSize = Math.min(
    34,
    Math.max(22, Number(form.textStyle.headingSize || 48) * 0.62)
  );

  const previewBodySize = Math.min(
    14,
    Math.max(10, Number(form.textStyle.bodySize || 16) * 0.78)
  );

  const previewLineHeight = Math.min(
    1.65,
    Math.max(1.2, Number(form.typography.lineHeight || 1.8))
  );

  return (
    <div className="kj-add-product-page">
      <header className="kj-add-product-header">
        <div>
          <span className="kj-add-product-eyebrow">
            Product Management
          </span>

          <h1>
            {isEditMode
              ? "Chỉnh sửa sản phẩm"
              : "Thêm sản phẩm mới"}
          </h1>

          <p>
            {isEditMode
              ? "Cập nhật nội dung, hình ảnh, SEO và trạng thái hiển thị của sản phẩm King Jades."
              : "Tạo sản phẩm mới với đầy đủ thông tin, hình ảnh, thông số và thiết lập hiển thị."}
          </p>
        </div>

        <div className="kj-add-product-header__actions">
          <button
            type="button"
            className="kj-add-product-button kj-add-product-button--outline-light"
            onClick={
              onBack || resetForm
            }
            disabled={saving}
          >
            <BackIcon />
            {onBack
              ? "Quay lại danh sách"
              : "Làm mới form"}
          </button>

          <button
            type="submit"
            form="kj-add-product-form"
            className="kj-add-product-button kj-add-product-button--gold"
            disabled={saving}
          >
            <SaveIcon />
            {saving
              ? "Đang lưu..."
              : isEditMode
                ? "Cập nhật sản phẩm"
                : "Lưu sản phẩm"}
          </button>
        </div>
      </header>

      <section className="kj-add-product-overview">
        <article>
          <span
            className={`kj-add-product-status-dot ${
              form.visibility
                .isPublished
                ? "is-active"
                : "is-hidden"
            }`}
          />

          <div>
            <small>
              Hiển thị website
            </small>
            <strong>
              {form.visibility
                .isPublished
                ? "Đang công khai"
                : "Đang ẩn"}
            </strong>
          </div>
        </article>

        <article>
          <span className="kj-add-product-overview__icon">
            <ImageIcon />
          </span>

          <div>
            <small>Hình ảnh</small>
            <strong>
              {form.images.length} ảnh
            </strong>
          </div>
        </article>

        <article>
          <span className="kj-add-product-overview__icon">
            <SearchIcon />
          </span>

          <div>
            <small>
              Mức hoàn thiện
            </small>
            <strong>
              {completion}%
            </strong>
          </div>
        </article>

        <article>
          <span className="kj-add-product-overview__icon">
            <CheckIcon />
          </span>

          <div>
            <small>Trạng thái</small>
            <strong>
              {statusLabel}
            </strong>
            <small>
              {publishStatusLabel}
            </small>
          </div>
        </article>
      </section>

      <nav
        role="navigation"
        aria-label="Đi nhanh tới khu vực chỉnh sửa sản phẩm"
        style={{
          position: "sticky",
          top: "72px",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          overflowX: "auto",
          padding: "10px 12px",
          margin: "14px 0",
          border: "1px solid rgba(188, 145, 28, 0.22)",
          borderRadius: "16px",
          background: "rgba(255, 252, 244, 0.96)",
          boxShadow: "0 10px 28px rgba(15, 39, 73, 0.08)",
          backdropFilter: "blur(10px)",
        }}
      >
        {[
          ["kj-section-basic", "01 Cơ bản"],
          ["kj-section-images", "02 Hình ảnh"],
          ["kj-section-specs", "03 Thông số"],
          ["kj-section-seo", "04 SEO"],
          ["kj-section-typography", "05 Typography"],
          ["kj-section-text-style", "06 Text Style"],
          ["kj-section-tags", "07 Tag"],
          ["kj-section-visibility", "08 Hiển thị"],
          ["kj-section-publish", "09 Lịch đăng"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() =>
              scrollToSection(id)
            }
            style={{
              flex: "0 0 auto",
              border: "1px solid rgba(17, 46, 83, 0.16)",
              borderRadius: "999px",
              background: "#fff",
              color: "#102f55",
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        ))}

        <button
          type="button"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
          style={{
            flex: "0 0 auto",
            marginLeft: "auto",
            border: "1px solid rgba(188, 145, 28, 0.35)",
            borderRadius: "999px",
            background: "#f4c542",
            color: "#102f55",
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          ↑ Đầu trang
        </button>
      </nav>

      {message && (
        <div
          className={`kj-add-product-message kj-add-product-message--${
            messageTone || "error"
          }`}
          role={
            messageTone === "error"
              ? "alert"
              : "status"
          }
        >
          {messageTone ===
          "success" ? (
            <CheckIcon />
          ) : (
            <span>!</span>
          )}

          <p>{message}</p>
        </div>
      )}

      <form
        id="kj-add-product-form"
        className="kj-add-product-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="kj-add-product-content">
          <div className="kj-add-product-sections">
            <section
              id="kj-section-basic"
              className="kj-add-product-card"
              style={{ scrollMarginTop: "150px" }}
            >
              <header className="kj-add-product-card__header">
                <span>01</span>

                <div>
                  <h2>
                    Thông tin cơ bản
                  </h2>
                  <p>
                    Tên, danh mục, giá và nội dung chính của sản phẩm.
                  </p>
                </div>
              </header>

              <div className="kj-add-product-grid">
                <label className="kj-add-product-field kj-add-product-field--full">
                  <span>
                    Tên sản phẩm
                    <b>*</b>
                  </span>

                  <input
                    name="name"
                    value={form.name}
                    onChange={
                      handleBasicChange
                    }
                    placeholder="Ví dụ: Vòng ngọc phỉ thúy tự nhiên"
                  />
                </label>

                <label className="kj-add-product-field">
                  <span>
                    Slug / URL
                  </span>

                  <input
                    name="slug"
                    value={form.slug}
                    onChange={
                      handleBasicChange
                    }
                    placeholder="vong-ngoc-phi-thuy-tu-nhien"
                  />
                </label>

                <label className="kj-add-product-field">
                  <span>
                    Mã sản phẩm / SKU
                  </span>

                  <input
                    name="sku"
                    value={form.sku}
                    onChange={
                      handleBasicChange
                    }
                    placeholder="KJ-BR-001"
                  />
                </label>

                <div className="kj-add-product-field">
                  <span>
                    Danh mục menu
                    <b>*</b>
                  </span>

                  <select
                    value={
                      form.parentCategoryId
                    }
                    onChange={
                      handleParentCategoryChange
                    }
                  >
                    <option value="">
                      Chọn danh mục menu
                    </option>

                    {productMenu.map(
                      (category) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      )
                    )}
                  </select>

                  <small
                    style={{
                      display: "block",
                      marginTop: "8px",
                    }}
                  >
                    Danh mục lấy từ ProductCategories; taxonomy cũ vẫn được giữ làm fallback để không làm mất menu hiện tại.
                  </small>
                </div>

                <div className="kj-add-product-field">
                  <span>
                    Nhóm sản phẩm
                  </span>

                  <select
                    value={
                      selectedMenuGroup
                        ?.id || ""
                    }
                    onChange={
                      handleMenuGroupChange
                    }
                    disabled={
                      !selectedMenuCategory ||
                      availableMenuGroups.length <=
                        1
                    }
                  >
                    <option value="">
                      {!selectedMenuCategory
                        ? "Chọn danh mục menu trước"
                        : availableMenuGroups.length ===
                            1
                          ? (
                              availableMenuGroups[0]
                                .name ||
                              "Không cần chọn nhóm"
                            )
                          : "Chọn nhóm sản phẩm"}
                    </option>

                    {availableMenuGroups
                      .filter(
                        (group) =>
                          Boolean(
                            group.name
                          )
                      )
                      .map(
                        (group) => (
                          <option
                            key={
                              group.id
                            }
                            value={
                              group.id
                            }
                          >
                            {
                              group.name
                            }
                          </option>
                        )
                      )}
                  </select>

                  <small
                    style={{
                      display: "block",
                      marginTop: "8px",
                    }}
                  >
                    {selectedMenuCategory?.id ===
                    "trang-suc-ngoc"
                      ? "Ví dụ: Phật Ngọc, Chuỗi Ngọc, Trang Sức Đá Quý..."
                      : "Danh mục này không cần thêm tầng nhóm."}
                  </small>
                </div>

                <div className="kj-add-product-field">
                  <span>
                    Mục sản phẩm
                    <b>*</b>
                  </span>

                  <select
                    value={
                      form.categoryId
                    }
                    onChange={
                      handleChildCategoryChange
                    }
                    disabled={
                      !selectedMenuCategory ||
                      !selectedMenuGroup
                    }
                  >
                    <option value="">
                      {!selectedMenuCategory
                        ? "Chọn danh mục menu trước"
                        : !selectedMenuGroup
                          ? "Chọn nhóm sản phẩm trước"
                          : "Chọn mục sản phẩm"}
                    </option>

                    {availableMenuItems.map(
                      (item) => (
                        <option
                          key={
                            item.id
                          }
                          value={
                            item.id
                          }
                        >
                          {
                            item.name
                          }
                        </option>
                      )
                    )}
                  </select>

                  {form.parentCategoryName &&
                    form.categoryName && (
                      <small
                        style={{
                          display: "block",
                          marginTop: "8px",
                        }}
                      >
                        {
                          form.parentCategoryName
                        }

                        {selectedMenuGroup
                          ?.name
                          ? ` › ${selectedMenuGroup.name}`
                          : ""}

                        {" › "}

                        {
                          form.categoryName
                        }
                      </small>
                    )}
                </div>

                <label className="kj-add-product-field">
                  <span>
                    Trạng thái
                  </span>

                  <select
                    name="status"
                    value={form.status}
                    onChange={
                      handleBasicChange
                    }
                  >
                    <option value="active">
                      Active
                    </option>
                    <option value="draft">
                      Draft
                    </option>
                    <option value="inactive">
                      Inactive
                    </option>
                  </select>
                </label>

                <label className="kj-add-product-field">
                  <span>Giá bán</span>

                  <input
                    type="number"
                    min="0"
                    name="price"
                    value={form.price}
                    onChange={
                      handleBasicChange
                    }
                    placeholder="1200000"
                  />
                </label>

                <label className="kj-add-product-field">
                  <span>
                    Giá khuyến mãi
                  </span>

                  <input
                    type="number"
                    min="0"
                    name="salePrice"
                    value={
                      form.salePrice
                    }
                    onChange={
                      handleBasicChange
                    }
                    placeholder="990000"
                  />
                </label>

                <label className="kj-add-product-field kj-add-product-field--full">
                  <span>
                    Mô tả ngắn
                  </span>

                  <textarea
                    name="shortDescription"
                    value={
                      form.shortDescription
                    }
                    onChange={
                      handleBasicChange
                    }
                    placeholder="Mô tả ngắn hiển thị tại card sản phẩm."
                    rows={3}
                  />
                </label>

                <label className="kj-add-product-field kj-add-product-field--full">
                  <span>
                    Mô tả chi tiết
                  </span>

                  <textarea
                    name="description"
                    value={
                      form.description
                    }
                    onChange={
                      handleBasicChange
                    }
                    placeholder="Nhập câu chuyện sản phẩm, chất liệu, ý nghĩa và thông tin sử dụng..."
                    rows={7}
                  />
                </label>
              </div>
            </section>

            <section
              id="kj-section-images"
              className="kj-add-product-card"
              style={{ scrollMarginTop: "150px" }}
            >
              <header className="kj-add-product-card__header">
                <span>02</span>

                <div>
                  <h2>
                    Hình ảnh sản phẩm
                  </h2>
                  <p>
                    Tải nhiều ảnh, chọn ảnh chính và giữ lại ảnh cũ khi chỉnh sửa.
                  </p>
                </div>
              </header>

              <label className="kj-add-product-upload">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={
                    handleImageUpload
                  }
                />

                <span className="kj-add-product-upload__icon">
                  <UploadIcon />
                </span>

                <strong>
                  Chọn hình ảnh sản phẩm
                </strong>

                <p>
                  Có thể chọn nhiều file JPG, PNG hoặc WEBP cùng lúc.
                </p>

                <em>
                  Tải ảnh từ máy tính
                </em>
              </label>

              {form.images.length >
              0 ? (
                <div className="kj-add-product-image-list">
                  {form.images.map(
                    (image, index) => (
                      <article
                        className={`kj-add-product-image-item ${
                          image.isMain
                            ? "is-main"
                            : ""
                        }`}
                        key={image.id}
                      >
                        <div className="kj-add-product-image-item__preview">
                          <img
                            src={
                              image.url
                            }
                            alt={
                              image.alt
                            }
                          />

                          <span>
                            {index + 1}
                          </span>

                          {image.isMain && (
                            <b>
                              Ảnh chính
                            </b>
                          )}
                        </div>

                        <div className="kj-add-product-image-item__info">
                          <strong
                            title={
                              image.name
                            }
                          >
                            {image.name}
                          </strong>

                          <small>
                            {image.file
                              ? "Ảnh mới"
                              : "Ảnh đã lưu"}
                          </small>
                        </div>

                        <div className="kj-add-product-image-item__actions">
                          <button
                            type="button"
                            className="kj-add-product-image-main"
                            onClick={() =>
                              setMainImage(
                                image.id
                              )
                            }
                            disabled={
                              image.isMain
                            }
                          >
                            <StarIcon />
                            {image.isMain
                              ? "Đang là ảnh chính"
                              : "Đặt làm ảnh chính"}
                          </button>

                          <button
                            type="button"
                            className="kj-add-product-image-delete"
                            onClick={() =>
                              removeImage(
                                image.id
                              )
                            }
                            aria-label={`Xóa ${image.name}`}
                          >
                            <TrashIcon />
                          </button>
                        </div>

                        <div className="kj-add-product-grid kj-add-product-image-seo">
                          <label className="kj-add-product-field">
                            <span>
                              Alt Text
                            </span>
                            <input
                              value={image.alt}
                              onChange={(event) =>
                                updateImageSeo(
                                  image.id,
                                  "alt",
                                  event.target.value
                                )
                              }
                              placeholder="Ví dụ: Vòng Bạch Ngọc King Jades"
                            />
                            <small>
                              Mô tả nội dung ảnh cho Google và accessibility.
                            </small>
                          </label>

                          <label className="kj-add-product-field">
                            <span>
                              Image Title
                            </span>
                            <input
                              value={image.title}
                              onChange={(event) =>
                                updateImageSeo(
                                  image.id,
                                  "title",
                                  event.target.value
                                )
                              }
                              placeholder="Tiêu đề hình ảnh"
                            />
                          </label>

                          <label className="kj-add-product-field kj-add-product-field--full">
                            <span>
                              Image Description
                            </span>
                            <textarea
                              value={image.description}
                              onChange={(event) =>
                                updateImageSeo(
                                  image.id,
                                  "description",
                                  event.target.value
                                )
                              }
                              rows={3}
                              placeholder="Mô tả chi tiết nội dung hình ảnh..."
                            />
                          </label>

                          <label className="kj-add-product-field kj-add-product-field--full">
                            <span>
                              Caption
                            </span>
                            <input
                              value={image.caption}
                              onChange={(event) =>
                                updateImageSeo(
                                  image.id,
                                  "caption",
                                  event.target.value
                                )
                              }
                              placeholder="Chú thích ảnh hiển thị nếu giao diện cần dùng"
                            />
                          </label>
                        </div>
                      </article>
                    )
                  )}
                </div>
              ) : (
                <div className="kj-add-product-empty-images">
                  Chưa có hình ảnh. Sản phẩm ngoài website sẽ hiển thị placeholder King Jades.
                </div>
              )}
            </section>

            <section
              id="kj-section-specs"
              className="kj-add-product-card"
              style={{ scrollMarginTop: "150px" }}
            >
              <header className="kj-add-product-card__header">
                <span>03</span>

                <div>
                  <h2>
                    Thông số sản phẩm
                  </h2>
                  <p>
                    Chất liệu, màu sắc, kích thước, kiểm định hoặc xuất xứ.
                  </p>
                </div>
              </header>

              <div className="kj-add-product-spec-list">
                {form.specifications.map(
                  (
                    specification,
                    index
                  ) => (
                    <div
                      className="kj-add-product-spec-row"
                      key={index}
                    >
                      <span className="kj-add-product-spec-number">
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </span>

                      <input
                        value={
                          specification.label
                        }
                        onChange={(
                          event
                        ) =>
                          updateSpecification(
                            index,
                            "label",
                            event.target
                              .value
                          )
                        }
                        placeholder="Tên thông số, ví dụ: Chất liệu"
                      />

                      <input
                        value={
                          specification.value
                        }
                        onChange={(
                          event
                        ) =>
                          updateSpecification(
                            index,
                            "value",
                            event.target
                              .value
                          )
                        }
                        placeholder="Giá trị, ví dụ: Ngọc phỉ thúy tự nhiên"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeSpecification(
                            index
                          )
                        }
                        aria-label="Xóa thông số"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )
                )}
              </div>

              <button
                type="button"
                className="kj-add-product-add-row"
                onClick={
                  addSpecification
                }
              >
                <PlusIcon />
                Thêm thông số
              </button>
            </section>

            <section
              id="kj-section-seo"
              className="kj-add-product-card"
              style={{ scrollMarginTop: "150px" }}
            >
              <header className="kj-add-product-card__header">
                <span>04</span>

                <div>
                  <h2>SEO</h2>
                  <p>
                    Tối ưu tiêu đề, mô tả, từ khóa và canonical URL.
                  </p>
                </div>
              </header>

              <div className="kj-add-product-grid">
                <label className="kj-add-product-field kj-add-product-field--full">
                  <span>
                    SEO Title
                  </span>

                  <input
                    name="title"
                    value={
                      form.seo.title
                    }
                    onChange={
                      handleSeoChange
                    }
                    placeholder="Vòng ngọc phỉ thúy tự nhiên | King Jades"
                  />

                  <small>
                    {
                      form.seo.title
                        .length
                    }
                    /60 ký tự
                  </small>
                </label>

                <label className="kj-add-product-field kj-add-product-field--full">
                  <span>
                    SEO Description
                  </span>

                  <textarea
                    name="description"
                    value={
                      form.seo
                        .description
                    }
                    onChange={
                      handleSeoChange
                    }
                    rows={4}
                    placeholder="Mô tả SEO ngắn gọn cho sản phẩm."
                  />

                  <small>
                    {
                      form.seo
                        .description
                        .length
                    }
                    /160 ký tự
                  </small>
                </label>

                <label className="kj-add-product-field kj-add-product-field--full">
                  <span>
                    SEO Keywords
                  </span>

                  <input
                    name="keywords"
                    value={
                      form.seo.keywords
                    }
                    onChange={
                      handleSeoChange
                    }
                    placeholder="vòng ngọc, phỉ thúy, vòng phong thủy"
                  />
                </label>

                <label className="kj-add-product-field kj-add-product-field--full">
                  <span>
                    Canonical URL
                  </span>

                  <input
                    name="canonicalUrl"
                    value={
                      form.seo
                        .canonicalUrl
                    }
                    onChange={
                      handleSeoChange
                    }
                    placeholder="https://www.kingjades.com.vn/products/..."
                  />
                </label>

                <label className="kj-add-product-field kj-add-product-field--full">
                  <span>
                    Focus Keyword
                  </span>

                  <input
                    name="focusKeyword"
                    value={
                      form.seo.focusKeyword
                    }
                    onChange={
                      handleSeoChange
                    }
                    placeholder="Ví dụ: vòng bạch ngọc"
                  />

                  <small>
                    Từ khóa chính dùng để kiểm tra mức độ tối ưu SEO.
                  </small>
                </label>

                <label className="kj-add-product-field">
                  <span>
                    Robots
                  </span>

                  <select
                    name="robots"
                    value={form.seo.robots}
                    onChange={handleSeoChange}
                  >
                    <option value="index,follow">
                      index, follow
                    </option>
                    <option value="noindex,follow">
                      noindex, follow
                    </option>
                    <option value="index,nofollow">
                      index, nofollow
                    </option>
                    <option value="noindex,nofollow">
                      noindex, nofollow
                    </option>
                  </select>
                </label>

                <label className="kj-add-product-field">
                  <span>
                    Schema Type
                  </span>

                  <select
                    name="schemaType"
                    value={
                      form.seo.schemaType
                    }
                    onChange={
                      handleSeoChange
                    }
                  >
                    <option value="Product">
                      Product
                    </option>
                    <option value="Article">
                      Article
                    </option>
                    <option value="WebPage">
                      WebPage
                    </option>
                  </select>
                </label>

                <label className="kj-add-product-field kj-add-product-field--full">
                  <span>
                    OG Image
                  </span>

                  <input
                    name="ogImage"
                    value={
                      form.seo.ogImage
                    }
                    onChange={
                      handleSeoChange
                    }
                    placeholder="/uploads/products/... hoặc https://..."
                  />

                  <small>
                    Khi chọn ảnh chính, hệ thống sẽ tự cập nhật OG Image.
                  </small>
                </label>
              </div>

              <div
                style={{
                  marginTop: "18px",
                  padding: "16px",
                  border:
                    "1px solid rgba(17, 46, 83, 0.12)",
                  borderRadius: "14px",
                  background: "#fffdf8",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: "12px",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <strong>
                    Rank Math-style SEO Score
                  </strong>

                  <strong
                    style={{
                      fontSize: "24px",
                    }}
                  >
                    {seoScore}/100
                  </strong>
                </div>

                <small
                  style={{
                    display: "block",
                    lineHeight: 1.7,
                  }}
                >
                  Kiểm tra nhanh: SEO Title 30–60 ký tự, Meta Description 120–160 ký tự,
                  có Focus Keyword và từ khóa chính xuất hiện trong Title/Description.
                </small>
              </div>

              <div className="kj-add-product-search-preview">
                <span>
                  Google Preview
                </span>

                <strong>
                  {form.seo.title ||
                    form.name ||
                    "Tên sản phẩm | King Jades"}
                </strong>

                <small>
                  {form.seo
                    .canonicalUrl ||
                    `https://www.kingjades.com.vn/products/${
                      form.slug ||
                      "product-slug"
                    }`}
                </small>

                <p>
                  {form.seo
                    .description ||
                    form.shortDescription ||
                    "Mô tả ngắn của sản phẩm sẽ xuất hiện tại đây."}
                </p>
              </div>
            </section>

            <section
              id="kj-section-typography"
              className="kj-add-product-card"
              style={{ scrollMarginTop: "150px" }}
            >
              <header className="kj-add-product-card__header">
                <span>05</span>

                <div>
                  <h2>
                    Typography Style
                  </h2>
                  <p>
                    Thiết lập font và khoảng cách chữ cho trang chi tiết sản phẩm.
                  </p>
                </div>
              </header>

              <div className="kj-add-product-grid">
                <label className="kj-add-product-field">
                  <span>
                    Font tiêu đề
                  </span>

                  <select
                    name="titleFont"
                    value={
                      form.typography.titleFont
                    }
                    onChange={
                      handleTypographyChange
                    }
                  >
                    <option value="Lora">
                      Lora
                    </option>
                    <option value="SVN-Gilroy">
                      SVN-Gilroy
                    </option>
                    <option value="Gilroy">
                      Gilroy
                    </option>
                    <option value="Georgia">
                      Georgia
                    </option>
                    <option value="Arial">
                      Arial
                    </option>
                    <option value="Times New Roman">
                      Times New Roman
                    </option>
                  </select>
                </label>

                <label className="kj-add-product-field">
                  <span>
                    Font nội dung
                  </span>

                  <select
                    name="descriptionFont"
                    value={
                      form.typography
                        .descriptionFont
                    }
                    onChange={
                      handleTypographyChange
                    }
                  >
                    <option value="SVN-Gilroy">
                      SVN-Gilroy
                    </option>
                    <option value="Gilroy">
                      Gilroy
                    </option>
                    <option value="Lora">
                      Lora
                    </option>
                    <option value="Arial">
                      Arial
                    </option>
                    <option value="Georgia">
                      Georgia
                    </option>
                  </select>
                </label>

                <label className="kj-add-product-field">
                  <span>
                    Letter Spacing (em)
                  </span>

                  <input
                    type="number"
                    step="0.01"
                    min="-0.2"
                    max="1"
                    name="letterSpacing"
                    value={
                      form.typography
                        .letterSpacing
                    }
                    onChange={
                      handleTypographyChange
                    }
                  />
                </label>

                <label className="kj-add-product-field">
                  <span>
                    Line Height
                  </span>

                  <input
                    type="number"
                    step="0.1"
                    min="0.8"
                    max="4"
                    name="lineHeight"
                    value={
                      form.typography
                        .lineHeight
                    }
                    onChange={
                      handleTypographyChange
                    }
                  />
                </label>
              </div>
            </section>

            <section
              id="kj-section-text-style"
              className="kj-add-product-card"
              style={{ scrollMarginTop: "150px" }}
            >
              <header className="kj-add-product-card__header">
                <span>06</span>

                <div>
                  <h2>
                    Text Style
                  </h2>
                  <p>
                    Điều chỉnh kích thước, màu sắc và căn lề cho tiêu đề và nội dung.
                  </p>
                </div>
              </header>

              <div className="kj-add-product-grid">
                <label className="kj-add-product-field">
                  <span>
                    Cỡ tiêu đề (px)
                  </span>

                  <input
                    type="number"
                    min="16"
                    max="120"
                    name="headingSize"
                    value={
                      form.textStyle
                        .headingSize
                    }
                    onChange={
                      handleTextStyleChange
                    }
                  />
                </label>

                <label className="kj-add-product-field">
                  <span>
                    Cỡ nội dung (px)
                  </span>

                  <input
                    type="number"
                    min="10"
                    max="48"
                    name="bodySize"
                    value={
                      form.textStyle.bodySize
                    }
                    onChange={
                      handleTextStyleChange
                    }
                  />
                </label>

                <label className="kj-add-product-field">
                  <span>
                    Màu tiêu đề
                  </span>

                  <input
                    type="color"
                    name="headingColor"
                    value={
                      form.textStyle
                        .headingColor
                    }
                    onChange={
                      handleTextStyleChange
                    }
                  />
                </label>

                <label className="kj-add-product-field">
                  <span>
                    Màu nội dung
                  </span>

                  <input
                    type="color"
                    name="bodyColor"
                    value={
                      form.textStyle
                        .bodyColor
                    }
                    onChange={
                      handleTextStyleChange
                    }
                  />
                </label>

                <label className="kj-add-product-field">
                  <span>
                    Căn tiêu đề
                  </span>

                  <select
                    name="headingAlign"
                    value={
                      form.textStyle
                        .headingAlign
                    }
                    onChange={
                      handleTextStyleChange
                    }
                  >
                    <option value="left">
                      Trái
                    </option>
                    <option value="center">
                      Giữa
                    </option>
                    <option value="right">
                      Phải
                    </option>
                  </select>
                </label>

                <label className="kj-add-product-field">
                  <span>
                    Căn nội dung
                  </span>

                  <select
                    name="bodyAlign"
                    value={
                      form.textStyle
                        .bodyAlign
                    }
                    onChange={
                      handleTextStyleChange
                    }
                  >
                    <option value="left">
                      Trái
                    </option>
                    <option value="center">
                      Giữa
                    </option>
                    <option value="right">
                      Phải
                    </option>
                    <option value="justify">
                      Căn đều
                    </option>
                  </select>
                </label>
              </div>
            </section>

            <section
              id="kj-section-tags"
              className="kj-add-product-card"
              style={{ scrollMarginTop: "150px" }}
            >
              <header className="kj-add-product-card__header">
                <span>07</span>

                <div>
                  <h2>
                    Tag và nhóm sản phẩm
                  </h2>
                  <p>
                    Gắn từ khóa và thiết lập nhóm hiển thị đặc biệt.
                  </p>
                </div>
              </header>

              <div className="kj-add-product-subsection">
                <label>
                  Tag sản phẩm
                </label>

                <div className="kj-add-product-tag-input">
                  <input
                    value={
                      form.tagInput
                    }
                    onChange={(
                      event
                    ) =>
                      setForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          tagInput:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    onKeyDown={
                      handleTagKeyDown
                    }
                    placeholder="Nhập tag, ví dụ: vòng ngọc"
                  />

                  <button
                    type="button"
                    onClick={addTag}
                  >
                    <PlusIcon />
                    Thêm tag
                  </button>
                </div>

                <div className="kj-add-product-tag-list">
                  {form.tags.length >
                  0 ? (
                    form.tags.map(
                      (tag) => (
                        <span
                          key={tag}
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() =>
                              removeTag(
                                tag
                              )
                            }
                          >
                            ×
                          </button>
                        </span>
                      )
                    )
                  ) : (
                    <small>
                      Chưa có tag sản phẩm.
                    </small>
                  )}
                </div>
              </div>

              <div className="kj-add-product-toggle-grid">
                <label>
                  <input
                    type="checkbox"
                    checked={
                      form
                        .productTagging
                        .isFeatured
                    }
                    onChange={() =>
                      handleProductTaggingChange(
                        "isFeatured"
                      )
                    }
                  />

                  <span>
                    <StarIcon />
                  </span>

                  <div>
                    <strong>
                      Sản phẩm nổi bật
                    </strong>
                    <small>
                      Ưu tiên tại khu vực featured.
                    </small>
                  </div>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={
                      form
                        .productTagging
                        .isBestSeller
                    }
                    onChange={() =>
                      handleProductTaggingChange(
                        "isBestSeller"
                      )
                    }
                  />

                  <span>
                    <CheckIcon />
                  </span>

                  <div>
                    <strong>
                      Bán chạy
                    </strong>
                    <small>
                      Đánh dấu sản phẩm best seller.
                    </small>
                  </div>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={
                      form
                        .productTagging
                        .isNewArrival
                    }
                    onChange={() =>
                      handleProductTaggingChange(
                        "isNewArrival"
                      )
                    }
                  />

                  <span>
                    <PlusIcon />
                  </span>

                  <div>
                    <strong>
                      Hàng mới
                    </strong>
                    <small>
                      Đánh dấu sản phẩm vừa cập nhật.
                    </small>
                  </div>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={
                      form
                        .productTagging
                        .isPromotion
                    }
                    onChange={() =>
                      handleProductTaggingChange(
                        "isPromotion"
                      )
                    }
                  />

                  <span>
                    <StarIcon />
                  </span>

                  <div>
                    <strong>
                      Khuyến mãi
                    </strong>
                    <small>
                      Hiển thị trong nhóm promotion.
                    </small>
                  </div>
                </label>
              </div>

              <div className="kj-add-product-subsection">
                <label>
                  Collection tag
                </label>

                <div className="kj-add-product-tag-input">
                  <input
                    value={
                      form.collectionTagInput
                    }
                    onChange={(
                      event
                    ) =>
                      setForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          collectionTagInput:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    onKeyDown={
                      handleCollectionKeyDown
                    }
                    placeholder="Ví dụ: home-featured"
                  />

                  <button
                    type="button"
                    onClick={
                      addCollectionTag
                    }
                  >
                    <PlusIcon />
                    Thêm collection
                  </button>
                </div>

                <div className="kj-add-product-tag-list kj-add-product-tag-list--collection">
                  {form.productTagging
                    .collectionTags
                    .length > 0 ? (
                    form.productTagging.collectionTags.map(
                      (tag) => (
                        <span
                          key={tag}
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() =>
                              removeCollectionTag(
                                tag
                              )
                            }
                          >
                            ×
                          </button>
                        </span>
                      )
                    )
                  ) : (
                    <small>
                      Chưa có collection tag.
                    </small>
                  )}
                </div>
              </div>
            </section>

            <section
              id="kj-section-visibility"
              className="kj-add-product-card"
              style={{ scrollMarginTop: "150px" }}
            >
              <header className="kj-add-product-card__header">
                <span>08</span>

                <div>
                  <h2>
                    Hiển thị sản phẩm
                  </h2>
                  <p>
                    Bật hoặc tắt sản phẩm ngoài website và trong menu.
                  </p>
                </div>
              </header>

              <div className="kj-add-product-switch-list">
                <article>
                  <div>
                    <strong>
                      Hiển thị trên website
                    </strong>
                    <p>
                      {form.publishStatus ===
                      "Scheduled"
                        ? form.visibility.isPublished
                          ? "Đang bật hiển thị. Sản phẩm sẽ tự xuất hiện khi tới giờ hẹn."
                          : "Đang tắt hiển thị. Tới giờ hẹn sản phẩm sẽ được publish nhưng vẫn ẩn cho tới khi Admin bật lại."
                        : "Khi bật, khách hàng có thể xem sản phẩm tại các trang public."}
                    </p>
                  </div>

                  <button
                    type="button"
                    className={`kj-add-product-switch ${
                      form.visibility
                        .isPublished
                        ? "is-on"
                        : ""
                    }`}
                    onClick={() =>
                      handleVisibilityChange(
                        "isPublished"
                      )
                    }
                    aria-pressed={
                      form.visibility
                        .isPublished
                    }
                  >
                    <span />
                  </button>
                </article>

                <article>
                  <div>
                    <strong>
                      Hiển thị trên menu
                    </strong>
                    <p>
                      Khi bật, sản phẩm hoặc nhóm sản phẩm có thể được dùng trong menu.
                    </p>
                  </div>

                  <button
                    type="button"
                    className={`kj-add-product-switch ${
                      form.visibility
                        .showOnMenu
                        ? "is-on"
                        : ""
                    }`}
                    onClick={() =>
                      handleVisibilityChange(
                        "showOnMenu"
                      )
                    }
                    aria-pressed={
                      form.visibility
                        .showOnMenu
                    }
                  >
                    <span />
                  </button>
                </article>
              </div>
            </section>

            <section
              id="kj-section-publish"
              className="kj-add-product-card"
              style={{ scrollMarginTop: "150px" }}
            >
              <header className="kj-add-product-card__header">
                <span>09</span>

                <div>
                  <h2>
                    Lịch đăng sản phẩm
                  </h2>
                  <p>
                    Chọn đăng ngay, lưu nháp hoặc hẹn giờ để hệ thống tự động công khai sản phẩm.
                  </p>
                </div>
              </header>

              <div className="kj-add-product-grid">
                <label className="kj-add-product-field kj-add-product-field--full">
                  <span>
                    Cách đăng sản phẩm
                  </span>

                  <select
                    value={
                      form.publishStatus
                    }
                    onChange={
                      handlePublishStatusChange
                    }
                  >
                    <option value="Published">
                      Đăng ngay
                    </option>

                    <option value="Scheduled">
                      Hẹn giờ đăng
                    </option>

                    <option value="Draft">
                      Lưu nháp
                    </option>
                  </select>

                  <small>
                    {form.publishStatus ===
                    "Published"
                      ? "Sản phẩm sẽ hiển thị ngay sau khi lưu."
                      : form.publishStatus ===
                          "Scheduled"
                        ? "Backend sẽ tự chuyển sang Published khi tới giờ. Việc có hiển thị ngoài website hay không phụ thuộc switch Hiển thị trên website."
                        : "Sản phẩm được lưu nhưng chưa hiển thị cho khách hàng."}
                  </small>
                </label>

                {form.publishStatus ===
                  "Scheduled" && (
                  <div className="kj-add-product-field kj-add-product-field--full">
                    <span>
                      Ngày giờ tự động đăng
                      <b>*</b>
                    </span>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(0, 1fr) minmax(160px, 0.38fr)",
                        gap: "12px",
                      }}
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="dd/mm/yyyy"
                        maxLength={10}
                        value={
                          publishDateText
                        }
                        onChange={(
                          event
                        ) => {
                          let value =
                            event.target.value
                              .replace(
                                /[^0-9]/g,
                                ""
                              )
                              .slice(
                                0,
                                8
                              );

                          if (
                            value.length >
                            4
                          ) {
                            value =
                              `${value.slice(
                                0,
                                2
                              )}/${value.slice(
                                2,
                                4
                              )}/${value.slice(
                                4
                              )}`;
                          } else if (
                            value.length >
                            2
                          ) {
                            value =
                              `${value.slice(
                                0,
                                2
                              )}/${value.slice(
                                2
                              )}`;
                          }

                          setPublishDateText(
                            value
                          );

                          const localValue =
                            buildLocalDateTime(
                              value,
                              publishTimeText
                            );

                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,
                              publishAtLocal:
                                localValue ||
                                "",
                            })
                          );
                        }}
                        aria-label="Ngày đăng theo định dạng ngày tháng năm"
                      />

                      <input
                        type="time"
                        value={
                          publishTimeText
                        }
                        onChange={(
                          event
                        ) => {
                          const time =
                            event.target
                              .value;

                          setPublishTimeText(
                            time
                          );

                          const localValue =
                            buildLocalDateTime(
                              publishDateText,
                              time
                            );

                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,
                              publishAtLocal:
                                localValue ||
                                "",
                            })
                          );
                        }}
                        aria-label="Giờ đăng"
                      />
                    </div>

                    <small>
                      Nhập ngày theo định dạng dd/mm/yyyy và chọn giờ đăng. Hệ thống sẽ tự chuyển sang UTC trước khi gửi backend.
                    </small>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="kj-add-product-preview">
            <div className="kj-add-product-preview__card">
              <header>
                <span className="kj-add-product-eyebrow">
                  Live Preview
                </span>
                <h2>
                  Xem trước sản phẩm
                </h2>
              </header>

              <div className="kj-add-product-preview__image">
                {mainImage ? (
                  <img
                    src={
                      mainImage.url
                    }
                    alt={
                      mainImage.alt
                    }
                  />
                ) : (
                  <div>
                    <ImageIcon />
                    <span>KJ</span>
                    <small>
                      Chưa có ảnh
                    </small>
                  </div>
                )}

                <b>
                  {form.parentCategoryName &&
                  form.categoryName
                    ? `${form.parentCategoryName} › ${form.categoryName}`
                    : form.categoryName ||
                      form.parentCategoryName ||
                      "King Jades"}
                </b>
              </div>

              <div className="kj-add-product-preview__content">
                <span>
                  {form.sku ||
                    "SKU đang cập nhật"}
                </span>

                <h3
                  style={{
                    fontFamily:
                      form.typography
                        .titleFont,
                    fontSize: `${previewHeadingSize}px`,
                    color:
                      form.textStyle
                        .headingColor,
                    letterSpacing: `${
                      form.typography
                        .letterSpacing
                    }em`,
                    lineHeight: previewLineHeight,
                    overflowWrap: "anywhere",
                    textAlign:
                      form.textStyle
                        .headingAlign as React.CSSProperties["textAlign"],
                  }}
                >
                  {form.name ||
                    "Tên sản phẩm"}
                </h3>

                <p
                  style={{
                    fontFamily:
                      form.typography
                        .descriptionFont,
                    fontSize: `${previewBodySize}px`,
                    color:
                      form.textStyle
                        .bodyColor,
                    letterSpacing: `${
                      form.typography
                        .letterSpacing
                    }em`,
                    lineHeight: previewLineHeight,
                    overflowWrap: "anywhere",
                    textAlign:
                      form.textStyle
                        .bodyAlign as React.CSSProperties["textAlign"],
                  }}
                >
                  {form.shortDescription ||
                    "Mô tả ngắn của sản phẩm sẽ xuất hiện tại đây."}
                </p>

                <strong>
                  {formatPrice(
                    form.salePrice ||
                      form.price
                  )}
                </strong>

                {form.salePrice &&
                  Number(
                    form.salePrice
                  ) > 0 &&
                  Number(
                    form.price
                  ) > 0 && (
                    <del>
                      {formatPrice(
                        form.price
                      )}
                    </del>
                  )}
              </div>

              <footer>
                <div>
                  <small>
                    Hoàn thiện nội dung
                  </small>

                  <strong>
                    {completion}%
                  </strong>
                </div>

                <div className="kj-add-product-progress">
                  <span
                    style={{
                      width: `${completion}%`,
                    }}
                  />
                </div>
              </footer>
            </div>

            <div className="kj-add-product-preview__notes">
              <strong>
                Kiểm tra trước khi lưu
              </strong>

              <ul>
                <li
                  className={
                    form.name.trim()
                      ? "done"
                      : ""
                  }
                >
                  <CheckIcon />
                  Tên sản phẩm
                </li>

                <li
                  className={
                    form.parentCategoryName.trim() &&
                    form.categoryName.trim()
                      ? "done"
                      : ""
                  }
                >
                  <CheckIcon />
                  Danh mục
                </li>

                <li
                  className={
                    form.images.length >
                    0
                      ? "done"
                      : ""
                  }
                >
                  <CheckIcon />
                  Hình ảnh
                </li>

                <li
                  className={
                    form.description.trim()
                      ? "done"
                      : ""
                  }
                >
                  <CheckIcon />
                  Mô tả chi tiết
                </li>

                <li
                  className={
                    form.seo.title.trim()
                      ? "done"
                      : ""
                  }
                >
                  <CheckIcon />
                  SEO Title
                </li>
              </ul>
            </div>
          </aside>
        </div>

        <div className="kj-add-product-bottom-actions">
          <button
            type="button"
            className="kj-add-product-button kj-add-product-button--outline"
            onClick={
              onBack || resetForm
            }
            disabled={saving}
          >
            <BackIcon />
            {onBack
              ? "Quay lại danh sách"
              : "Hủy thay đổi"}
          </button>

          <button
            type="submit"
            className="kj-add-product-button kj-add-product-button--gold"
            disabled={saving}
          >
            <SaveIcon />
            {saving
              ? "Đang lưu..."
              : isEditMode
                ? "Cập nhật sản phẩm"
                : "Lưu sản phẩm"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProductPage;