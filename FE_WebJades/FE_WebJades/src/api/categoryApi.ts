import axiosClient from "./axiosClient";

export type ProductCategory = {
  id: string;
  name: string;
  slug: string;

  parentId: string;
  parentName: string;

  /*
   * Metadata UI mới.
   *
   * Không phải tầng category mới.
   * Không ảnh hưởng Product document.
   */
  menuGroupId?: string;
  menuGroupName?: string;

  sortOrder: number;

  isActive: boolean;
  showOnMenu: boolean;

  createdAtUtc?: string;
  updatedAtUtc?: string;
};

export type CreateProductCategoryPayload = {
  name: string;
  slug?: string;
  parentId?: string;
  menuGroupId?: string;
  menuGroupName?: string;
  sortOrder?: number;
  isActive?: boolean;
  showOnMenu?: boolean;
};

export type UpdateProductCategoryPresentationPayload = {
  menuGroupId?: string;
  menuGroupName?: string;
  sortOrder: number;
  isActive: boolean;
  showOnMenu: boolean;
};

const normalizeText = (
  value: string
) =>
  value
    .trim()
    .toLocaleLowerCase("vi");

const extractCategories = (
  response: any
): ProductCategory[] =>
  Array.isArray(
    response?.categories
  )
    ? response.categories
    : [];

// ==================================================
// CATEGORY API
// ==================================================

export const categoryApi = {
  // ==================================================
  // ADMIN - GET ALL
  // ==================================================

  getAll: async () => {
    const response =
      await axiosClient.get(
        "/api/admin/product-categories"
      );

    return response.data;
  },

  getAllList: async () => {
    const response =
      await categoryApi.getAll();

    return extractCategories(
      response
    );
  },

  // ==================================================
  // ADMIN - GET PARENTS
  // ==================================================

  getParents: async () => {
    const response =
      await axiosClient.get(
        "/api/admin/product-categories/parents"
      );

    return response.data;
  },

  // ==================================================
  // ADMIN - GET CHILDREN
  // ==================================================

  getChildren: async (
    parentId: string
  ) => {
    const response =
      await axiosClient.get(
        `/api/admin/product-categories/${encodeURIComponent(
          parentId
        )}/children`
      );

    return response.data;
  },

  // ==================================================
  // ADMIN - LEGACY CREATE SIGNATURE
  //
  // Giữ lại để code cũ không bị vỡ.
  // ==================================================

  create: async (
    name: string,
    parentId = ""
  ) => {
    return await categoryApi
      .createWithOptions({
        name,
        parentId,
      });
  },

  // ==================================================
  // ADMIN - CREATE WITH PRESENTATION METADATA
  // ==================================================

  createWithOptions: async (
    payload:
      CreateProductCategoryPayload
  ) => {
    const cleanName =
      payload.name.trim();

    const cleanParentId =
      (
        payload.parentId ||
        ""
      ).trim();

    if (!cleanName) {
      throw new Error(
        "Tên danh mục không được để trống."
      );
    }

    /*
     * Giữ kiểm tra trùng ở FE như code cũ.
     * Backend vẫn kiểm tra lại.
     */
    const allResponse =
      await categoryApi.getAll();

    const categories =
      extractCategories(
        allResponse
      );

    const existed =
      categories.find(
        (category) =>
          normalizeText(
            category.name
          ) ===
            normalizeText(
              cleanName
            ) &&
          (
            category.parentId ||
            ""
          ) ===
            cleanParentId
      );

    if (existed) {
      return {
        message:
          "Danh mục đã tồn tại.",

        existed: true,

        category:
          existed,
      };
    }

    const formData =
      new FormData();

    formData.append(
      "Name",
      cleanName
    );

    formData.append(
      "ParentId",
      cleanParentId
    );

    if (
      payload.slug?.trim()
    ) {
      formData.append(
        "Slug",
        payload.slug.trim()
      );
    }

    formData.append(
      "MenuGroupId",
      (
        payload.menuGroupId ||
        ""
      ).trim()
    );

    formData.append(
      "MenuGroupName",
      (
        payload.menuGroupName ||
        ""
      ).trim()
    );

    formData.append(
      "SortOrder",
      String(
        payload.sortOrder ??
        0
      )
    );

    formData.append(
      "IsActive",
      String(
        payload.isActive ??
        true
      )
    );

    formData.append(
      "ShowOnMenu",
      String(
        payload.showOnMenu ??
        true
      )
    );

    /*
     * Không set multipart Content-Type thủ công.
     * Browser/Axios tự thêm boundary.
     */
    const response =
      await axiosClient.post(
        "/api/admin/product-categories",
        formData
      );

    return response.data;
  },

  // ==================================================
  // ADMIN - UPDATE PRESENTATION ONLY
  // ==================================================

  updatePresentation: async (
    id: string,
    payload:
      UpdateProductCategoryPresentationPayload
  ) => {
    const response =
      await axiosClient.put(
        `/api/admin/product-categories/${encodeURIComponent(
          id
        )}/presentation`,
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
  // ADMIN - DELETE
  // ==================================================

  delete: async (
    id: string
  ) => {
    if (!id) {
      throw new Error(
        "Id danh mục không hợp lệ."
      );
    }

    const response =
      await axiosClient.delete(
        `/api/admin/product-categories/${encodeURIComponent(
          id
        )}`
      );

    return response.data;
  },

  // ==================================================
  // PUBLIC - SOURCE DYNAMIC MENU MỚI
  //
  // Endpoint nằm trong ProductsController để không phụ
  // thuộc controller category public cũ.
  // ==================================================

  getPublicMenuSource:
    async () => {
      const response =
        await axiosClient.get(
          "/api/product-menu"
        );

      return response.data;
    },

  // ==================================================
  // PUBLIC LEGACY API
  //
  // GIỮ NGUYÊN để component cũ không lỗi.
  // ==================================================

  getPublicAll: async () => {
    const response =
      await axiosClient.get(
        "/api/product-categories"
      );

    return response.data;
  },

  getPublicParents:
    async () => {
      const response =
        await axiosClient.get(
          "/api/product-categories/parents"
        );

      return response.data;
    },

  getPublicChildren:
    async (
      parentId: string
    ) => {
      const response =
        await axiosClient.get(
          `/api/product-categories/${encodeURIComponent(
            parentId
          )}/children`
        );

      return response.data;
    },
};

export default categoryApi;
