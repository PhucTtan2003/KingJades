import axiosClient from "./axiosClient";

/* =========================================================
   PRODUCT IMAGE
========================================================= */

export type ProductImagePayload = {
  url: string;
  fileName?: string;
  alt: string;
  isMain: boolean;
  sortOrder: number;
};

/* =========================================================
   PUBLISH
========================================================= */

export type ProductPublishStatus =
  | "Published"
  | "Scheduled"
  | "Draft";

export type ProductPublishSchedulePayload = {
  publishStatus: ProductPublishStatus;
  publishAtUtc: string | null;
};

/* =========================================================
   PUBLIC PRODUCT LIST
   DTO nhẹ dùng cho trang /products
========================================================= */

export type PublicProductListItem = {
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

  mainImage?: string | null;

  createdAtUtc?: string;
};

export type PublicProductSort =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "sale";

export type PublicProductQuery = {
  page?: number;
  pageSize?: number;

  search?: string;

  parentCategoryId?: string;
  categoryId?: string;

  saleOnly?: boolean;

  sort?: PublicProductSort;
};

export type PublicProductsPagedResponse = {
  products: PublicProductListItem[];
  items: PublicProductListItem[];

  page: number;
  pageSize: number;

  total: number;
  totalPages: number;

  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

/* =========================================================
   ADMIN LIST RESPONSE
========================================================= */

export type AdminProductsResponse<T = any> = {
  products: T[];
  total: number;
  skip?: number;
  take?: number;
};

/* =========================================================
   HELPERS
========================================================= */

const normalizePositiveInteger = (
  value: number | undefined,
  fallback: number
) => {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    1,
    Math.floor(value)
  );
};

const normalizePublicProductQuery = (
  query: PublicProductQuery = {}
) => {
  const page =
    normalizePositiveInteger(
      query.page,
      1
    );

  /*
   * Backend giới hạn tối đa 60 sản phẩm / request.
   */
  const pageSize =
    Math.min(
      60,
      normalizePositiveInteger(
        query.pageSize,
        24
      )
    );

  const search =
    query.search?.trim() || undefined;

  const parentCategoryId =
    query.parentCategoryId?.trim() ||
    undefined;

  const categoryId =
    query.categoryId?.trim() ||
    undefined;

  return {
    page,
    pageSize,
    search,
    parentCategoryId,
    categoryId,

    saleOnly:
      query.saleOnly === true
        ? true
        : undefined,

    sort:
      query.sort || "newest",
  };
};

export type ProductCategoryRepairResponse = {
  mode: "PREVIEW" | "APPLY";
  totalProducts: number;
  detectedChanges: number;
  repaired: number;
  skippedCount: number;
  changes: any[];
  skipped: any[];
};

export type ProductNecklaceSlugRepairResponse = {
  mode: "PREVIEW" | "APPLY";
  scope: string;
  totalProducts: number;
  scopedProducts: number;
  duplicateSlugGroups: number;
  detectedChanges: number;
  repaired: number;
  changes: Array<{
    productId: string;
    name: string;
    sku: string;
    categoryName: string;
    fromSlug: string;
    toSlug: string;
  }>;
  safety: string;
};

/* =========================================================
   PRODUCT API
========================================================= */

export const productApi = {
  // ==================================================
  // ADMIN - PRODUCT LIST
  // ==================================================

  getAdminProducts: async <T = any>(
    skip = 0,
    take = 50
  ): Promise<AdminProductsResponse<T>> => {
    const safeSkip =
      Math.max(
        0,
        Math.floor(skip || 0)
      );

    const safeTake =
      Math.min(
        100,
        Math.max(
          1,
          Math.floor(take || 50)
        )
      );

    const response =
      await axiosClient.get<
        AdminProductsResponse<T>
      >(
        "/api/admin/products",
        {
          params: {
            skip: safeSkip,
            take: safeTake,
          },
        }
      );

    return response.data;
  },

  // ==================================================
  // ADMIN - GET ALL PRODUCTS
  //
  // TẠM GIỮ cho:
  // - Media Library
  // - Bulk Import
  //
  // Sau này Media Library sẽ tách pagination riêng.
  // ==================================================

  getAllAdminProducts: async <
    T = any
  >(): Promise<
    AdminProductsResponse<T>
  > => {
    const take = 100;

    let skip = 0;
    let total = 0;

    const products: T[] = [];

    /*
     * Guard tránh vòng lặp vô hạn nếu backend lỗi total.
     */
    const maxBatches = 10_000;
    let batchCount = 0;

    do {
      batchCount += 1;

      if (
        batchCount >
        maxBatches
      ) {
        throw new Error(
          "Dừng tải sản phẩm vì vượt giới hạn an toàn."
        );
      }

      const response =
        await axiosClient.get<
          AdminProductsResponse<T>
        >(
          "/api/admin/products",
          {
            params: {
              skip,
              take,
            },
          }
        );

      const data =
        response.data || {
          products: [],
          total: 0,
        };

      const batch =
        Array.isArray(
          data.products
        )
          ? data.products
          : [];

      products.push(
        ...batch
      );

      total =
        Number.isFinite(
          Number(data.total)
        )
          ? Number(data.total)
          : products.length;

      /*
       * Tăng theo số record thật backend trả.
       */
      skip +=
        batch.length;

      /*
       * Tránh loop vô hạn khi backend trả [].
       */
      if (
        batch.length === 0
      ) {
        break;
      }
    } while (
      products.length <
      total
    );

    return {
      products,
      total,
    };
  },

  // ==================================================
  // ADMIN - PRODUCT DETAIL
  // ==================================================

  getAdminProductDetail: async (
    id: string
  ) => {
    const response =
      await axiosClient.get(
        `/api/admin/products/${encodeURIComponent(
          id
        )}`
      );

    return response.data;
  },

  // ==================================================
  // ADMIN - CREATE PRODUCT
  // ==================================================

  createProduct: async (
    formData: FormData
  ) => {
    /*
     * Không set multipart/form-data thủ công.
     * Browser/Axios tự thêm boundary.
     */
    const response =
      await axiosClient.post(
        "/api/admin/products",
        formData
      );

    return response.data;
  },

  // ==================================================
  // ADMIN - UPDATE PRODUCT
  // ==================================================

  updateProduct: async (
    id: string,
    formData: FormData
  ) => {
    const response =
      await axiosClient.put(
        `/api/admin/products/${encodeURIComponent(
          id
        )}`,
        formData
      );

    return response.data;
  },

  // ==================================================
  // ADMIN - UPDATE PUBLISH SCHEDULE
  // ==================================================

  updatePublishSchedule: async (
    id: string,
    payload:
      ProductPublishSchedulePayload
  ) => {
    const response =
      await axiosClient.put(
        `/api/admin/products/${encodeURIComponent(
          id
        )}/publish-schedule`,
        payload,
        {
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );

    return response.data;
  },

  // ==================================================
  // ADMIN - DELETE PRODUCT
  // ==================================================

  deleteProduct: async (
    id: string
  ) => {
    const response =
      await axiosClient.delete(
        `/api/admin/products/${encodeURIComponent(
          id
        )}`
      );

    return response.data;
  },

  // ==================================================
  // ADMIN - ADD PRODUCT IMAGES
  // ==================================================

  addProductImages: async (
    id: string,
    files: File[]
  ) => {
    const formData =
      new FormData();

    files.forEach(
      (file) => {
        formData.append(
          "images",
          file
        );
      }
    );

    const response =
      await axiosClient.post(
        `/api/admin/products/${encodeURIComponent(
          id
        )}/images`,
        formData
      );

    return response.data;
  },

  // ==================================================
  // ADMIN - UPDATE PRODUCT IMAGES
  // ==================================================

  updateProductImages: async (
    id: string,
    images:
      ProductImagePayload[]
  ) => {
    const response =
      await axiosClient.put(
        `/api/admin/products/${encodeURIComponent(
          id
        )}/images`,
        {
          images,
        },
        {
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );

    return response.data;
  },

  // ==================================================
  // ADMIN - AUDIT / REPAIR PRODUCT CATEGORY LINKS
  // ==================================================

  auditProductCategoryLinks: async (): Promise<
    ProductCategoryRepairResponse
  > => {
    const response =
      await axiosClient.get(
        "/api/admin/products/category-audit"
      );

    return response.data;
  },

  repairProductCategoryLinks: async (
    apply = false
  ): Promise<ProductCategoryRepairResponse> => {
    const response =
      await axiosClient.post(
        "/api/admin/products/repair-category-links",
        null,
        {
          params: {
            apply,
          },
        }
      );

    return response.data;
  },

  // ==================================================
  // ADMIN - AUDIT / REPAIR DUPLICATE SLUGS
  // CHỈ: Trang Sức Ngọc > Chuỗi Ngọc Đeo Cổ
  // Không đụng category/ảnh/giá và không đụng Vòng Ngọc Thiên Nhiên.
  // ==================================================

  auditNecklaceDuplicateSlugs: async (): Promise<
    ProductNecklaceSlugRepairResponse
  > => {
    const response =
      await axiosClient.get(
        "/api/admin/products/necklace-slug-audit"
      );

    return response.data;
  },

  repairNecklaceDuplicateSlugs: async (
    apply = false
  ): Promise<ProductNecklaceSlugRepairResponse> => {
    const response =
      await axiosClient.post(
        "/api/admin/products/repair-necklace-duplicate-slugs",
        null,
        {
          params: {
            apply,
          },
        }
      );

    return response.data;
  },

  // ==================================================
  // PUBLIC - PRODUCTS LEGACY
  //
  // GIỮ LẠI tạm thời để các component cũ không lỗi.
  // ProductPage mới sẽ dùng getPublicProductsPaged().
  // ==================================================

  getPublicProducts: async () => {
    const response =
      await axiosClient.get(
        "/api/products"
      );

    return response.data;
  },

  // ==================================================
  // PUBLIC - PRODUCTS PAGED
  //
  // GET /api/products/paged
  //
  // Ví dụ:
  //
  // productApi.getPublicProductsPaged({
  //   page: 1,
  //   pageSize: 24,
  //   search: "ngọc",
  //   parentCategoryId: "trang-suc-ngoc",
  //   categoryId: "nhan-ngoc",
  //   saleOnly: false,
  //   sort: "newest",
  // });
  // ==================================================

  getPublicProductsPaged: async (
    query:
      PublicProductQuery = {},
    signal?: AbortSignal
  ): Promise<
    PublicProductsPagedResponse
  > => {
    const params =
      normalizePublicProductQuery(
        query
      );

    const response =
      await axiosClient.get<
        PublicProductsPagedResponse
      >(
        "/api/products/paged",
        {
          params,
          signal,
        }
      );

    const data =
      response.data;

    /*
     * Hỗ trợ cả 2 key products/items để migration an toàn.
     */
    const items =
      Array.isArray(
        data?.items
      )
        ? data.items
        : Array.isArray(
              data?.products
            )
          ? data.products
          : [];

    const products =
      Array.isArray(
        data?.products
      )
        ? data.products
        : items;

    const page =
      Number(
        data?.page
      ) ||
      params.page;

    const pageSize =
      Number(
        data?.pageSize
      ) ||
      params.pageSize;

    const total =
      Number(
        data?.total
      ) ||
      0;

    const totalPages =
      Number(
        data?.totalPages
      ) ||
      (
        pageSize > 0
          ? Math.ceil(
              total /
              pageSize
            )
          : 0
      );

    return {
      products,
      items,

      page,
      pageSize,
      total,
      totalPages,

      hasPreviousPage:
        data?.hasPreviousPage ??
        page > 1,

      hasNextPage:
        data?.hasNextPage ??
        page < totalPages,
    };
  },

  // ==================================================
  // PUBLIC - PRODUCT DETAIL
  // ==================================================

  getPublicProductDetail: async (
    slug: string,
    signal?: AbortSignal
  ) => {
    const response =
      await axiosClient.get(
        `/api/products/${encodeURIComponent(
          slug
        )}`,
        {
          signal,
        }
      );

    return response.data;
  },

  // ==================================================
  // PUBLIC - MENU PRODUCTS
  // ==================================================

  getMenuProducts: async (
    signal?: AbortSignal
  ) => {
    const response =
      await axiosClient.get(
        "/api/products/menu",
        {
          signal,
        }
      );

    return response.data;
  },
};

export default productApi;
