import {
  categoryApi,
  ProductCategory,
} from "../api/categoryApi";

export type ProductMenuItem = {
  /*
   * id luôn là slug public.
   * Vì vậy URL cũ / URL đẹp vẫn giữ nguyên.
   */
  id: string;
  name: string;

  /*
   * Mongo ObjectId chỉ dùng để tương thích dữ liệu Product đã lưu.
   */
  mongoId?: string;
};

export type ProductMenuGroup = {
  id: string;
  name: string;
  items: ProductMenuItem[];

  /*
   * Giữ nguyên semantics cũ.
   * Admin vẫn nhìn thấy.
   * Public Header/ProductPage có thể ẩn.
   */
  hiddenOnPublic?: boolean;
};

export type ProductMenuCategory = {
  id: string;
  name: string;
  groups: ProductMenuGroup[];
  mongoId?: string;
};

/*
 * =========================================================
 * LEGACY TAXONOMY - KHÔNG XÓA
 * =========================================================
 *
 * Đây là fallback an toàn:
 * - API ProductCategories lỗi -> menu cũ vẫn hoạt động.
 * - DB thiếu metadata group -> layout cũ vẫn giữ nguyên.
 * - ID/URL cũ không đổi.
 *
 * Dynamic category chỉ MERGE THÊM vào cấu trúc này.
 */
export const LEGACY_PRODUCT_MENU:
  ProductMenuCategory[] = [
  {
    id: "vong-ngoc-thien-nhien",
    name: "Vòng Ngọc Thiên Nhiên",
    groups: [
      {
        id:
          "vong-ngoc-thien-nhien-items",
        name: "",
        items: [
          {
            id:
              "vong-ngoc-son-thuy",
            name:
              "Vòng Ngọc Sơn Thủy",
          },
          {
            id:
              "vong-ngoc-phi-thuy",
            name:
              "Vòng Ngọc Phỉ Thúy",
          },
          {
            id:
              "vong-ngoc-tu-nham",
            name:
              "Vòng Ngọc Tụ Nham",
          },
          {
            id:
              "vong-lam-ngoc",
            name:
              "Vòng Lam Ngọc",
          },
          {
            id:
              "vong-ngoc-bich",
            name:
              "Vòng Ngọc Bích",
          },
          {
            id:
              "vong-ngoc-huyet",
            name:
              "Vòng Ngọc Huyết",
          },
          {
            id:
              "vong-ngoc-hoa-dien",
            name:
              "Vòng Ngọc Hòa Điền",
          },
          {
            id:
              "vong-bach-ngoc",
            name:
              "Vòng Bạch Ngọc",
          },
          {
            id:
              "vong-ngoc-vip",
            name:
              "Vòng Ngọc VIP",
          },
        ],
      },
    ],
  },

  {
    id: "trang-suc-ngoc",
    name: "Trang Sức Ngọc",
    groups: [
      {
        id: "phat-ngoc",
        name: "Phật Ngọc",
        items: [
          {
            id: "duc-chua",
            name: "Đức Chúa",
          },
          {
            id:
              "phat-ba-quan-am",
            name:
              "Phật Bà Quan Âm",
          },
          {
            id: "phat-di-lac",
            name: "Phật Di Lặc",
          },
          {
            id: "phat-adida",
            name: "Phật Adida",
          },
          {
            id: "phat-ban-menh",
            name: "Phật Bản Mệnh",
          },
        ],
      },

      {
        id: "chuoi-ngoc",
        name: "Chuỗi Ngọc",
        items: [
          {
            id:
              "chuoi-ngoc-deo-tay",
            name:
              "Chuỗi Ngọc Đeo Tay",
          },
          {
            id:
              "chuoi-ngoc-deo-co",
            name:
              "Chuỗi Ngọc Đeo Cổ",
          },
        ],
      },

      {
        id:
          "trang-suc-ngoc-group",
        name: "Trang Sức Ngọc",
        items: [
          {
            id: "ngoc-hoa-dien",
            name: "Ngọc Hòa Điền",
          },
          {
            id: "nhan-ngoc",
            name: "Nhẫn Ngọc",
          },
          {
            id:
              "day-chuyen-ngoc",
            name:
              "Dây Chuyền Ngọc",
          },
          {
            id: "bong-tai-ngoc",
            name: "Bông Tai Ngọc",
          },
          {
            id: "vong-ngoc",
            name: "Vòng Ngọc",
          },
        ],
      },

      {
        id: "trang-suc-da-quy",
        name: "Trang Sức Đá Quý",
        hiddenOnPublic: true,
        items: [
          {
            id: "nhan-da-quy",
            name: "Nhẫn",
          },
          {
            id:
              "day-chuyen-da-quy",
            name: "Dây Chuyền",
          },
          {
            id:
              "bong-tai-da-quy",
            name: "Bông Tai",
          },
        ],
      },

      {
        id:
          "trang-suc-phong-thuy",
        name:
          "Trang Sức Phong Thủy",
        items: [
          {
            id:
              "chuoi-thach-anh",
            name:
              "Chuỗi Thạch Anh",
          },
        ],
      },

      {
        id:
          "tuong-ngoc-dieu-khac",
        name: "Tượng Điêu Khắc",
        items: [
          {
            id:
              "tuong-ngoc-dieu-khac",
            name:
              "Tượng Điêu Khắc",
          },
        ],
      },
    ],
  },
];

const cloneMenu = (
  source:
    ProductMenuCategory[]
): ProductMenuCategory[] =>
  source.map(
    (category) => ({
      ...category,
      groups:
        category.groups.map(
          (group) => ({
            ...group,
            items:
              group.items.map(
                (item) => ({
                  ...item,
                })
              ),
          })
        ),
    })
  );

/*
 * Giữ export cũ để toàn bộ source hiện tại không bị vỡ.
 *
 * Array này được MERGE runtime.
 * Nếu API lỗi thì nó vẫn chính xác là menu legacy.
 */
export const PRODUCT_MENU:
  ProductMenuCategory[] =
  cloneMenu(
    LEGACY_PRODUCT_MENU
  );

const normalizeText = (
  value?: string | null
) =>
  (value || "")
    .trim()
    .toLocaleLowerCase("vi");

const slugifyMenuValue = (
  value?: string | null
) =>
  (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(/đ/g, "d")
    .replace(
      /[^a-z0-9\s-]/g,
      ""
    )
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const getCategoryPublicId = (
  category: ProductCategory
) =>
  category.slug?.trim() ||
  slugifyMenuValue(
    category.name
  ) ||
  category.id;

const findMenuCategory = (
  menu:
    ProductMenuCategory[],
  dbCategory:
    ProductCategory
) => {
  const slug =
    getCategoryPublicId(
      dbCategory
    );

  return menu.find(
    (category) =>
      category.id === slug ||
      normalizeText(
        category.name
      ) ===
        normalizeText(
          dbCategory.name
        )
  );
};

const findMenuItem = (
  category:
    ProductMenuCategory,
  dbItem:
    ProductCategory
) => {
  const slug =
    getCategoryPublicId(
      dbItem
    );

  for (
    const group
    of category.groups
  ) {
    const item =
      group.items.find(
        (candidate) =>
          candidate.id ===
            slug ||
          normalizeText(
            candidate.name
          ) ===
            normalizeText(
              dbItem.name
            )
      );

    if (item) {
      return {
        group,
        item,
      };
    }
  }

  return null;
};

const findLegacyGroupForItem = (
  rootId: string,
  itemSlug: string,
  itemName: string
) => {
  const legacyRoot =
    LEGACY_PRODUCT_MENU.find(
      (category) =>
        category.id === rootId
    );

  if (!legacyRoot) {
    return null;
  }

  for (
    const group
    of legacyRoot.groups
  ) {
    const found =
      group.items.some(
        (item) =>
          item.id === itemSlug ||
          normalizeText(
            item.name
          ) ===
            normalizeText(
              itemName
            )
      );

    if (found) {
      return group;
    }
  }

  return null;
};

export const mergeProductMenuFromCategories = (
  categories:
    ProductCategory[]
): ProductMenuCategory[] => {
  const menu =
    cloneMenu(
      LEGACY_PRODUCT_MENU
    );

  const active =
    categories.filter(
      (category) =>
        category &&
        category.isActive !== false
    );

  const roots =
    active
      .filter(
        (category) =>
          !(
            category.parentId ||
            ""
          ).trim()
      )
      .sort(
        (a, b) =>
          (a.sortOrder || 0) -
            (b.sortOrder || 0) ||
          a.name.localeCompare(
            b.name,
            "vi"
          )
      );

  for (
    const root
    of roots
  ) {
    const rootId =
      getCategoryPublicId(
        root
      );

    let menuRoot =
      findMenuCategory(
        menu,
        root
      );

    if (!menuRoot) {
      menuRoot = {
        id: rootId,
        name: root.name,
        mongoId:
          root.id,
        groups: [],
      };

      menu.push(
        menuRoot
      );
    } else {
      /*
       * Với menu legacy:
       * giữ id/name cũ để URL/label không tự đổi.
       * Chỉ bổ sung Mongo ID thật.
       */
      menuRoot.mongoId =
        root.id;
    }

    const children =
      active
        .filter(
          (candidate) =>
            (
              candidate.parentId ||
              ""
            ).trim() ===
              root.id
        )
        .sort(
          (a, b) =>
            (a.sortOrder || 0) -
              (b.sortOrder || 0) ||
            a.name.localeCompare(
              b.name,
              "vi"
            )
        );

    for (
      const child
      of children
    ) {
      const childId =
        getCategoryPublicId(
          child
        );

      /*
       * Nếu item đã có trong menu legacy,
       * chỉ gắn Mongo ObjectId.
       *
       * Không di chuyển item cũ sang group khác.
       */
      const existing =
        findMenuItem(
          menuRoot,
          child
        );

      if (existing) {
        existing.item.mongoId =
          child.id;

        continue;
      }

      const legacyGroup =
        findLegacyGroupForItem(
          menuRoot.id,
          childId,
          child.name
        );

      const requestedGroupId =
        (
          child.menuGroupId ||
          legacyGroup?.id ||
          ""
        ).trim();

      const requestedGroupName =
        (
          child.menuGroupName ||
          legacyGroup?.name ||
          ""
        ).trim();

      /*
       * Không có group:
       * dùng group phẳng, đúng kiến trúc
       * Vòng Ngọc Thiên Nhiên hiện tại.
       */
      const finalGroupId =
        requestedGroupId ||
        `${menuRoot.id}-items`;

      let group =
        menuRoot.groups.find(
          (candidate) =>
            candidate.id ===
              finalGroupId ||
            (
              requestedGroupName &&
              normalizeText(
                candidate.name
              ) ===
                normalizeText(
                  requestedGroupName
                )
            )
        );

      if (!group) {
        group = {
          id: finalGroupId,
          name:
            requestedGroupName,
          items: [],
        };

        menuRoot.groups.push(
          group
        );
      }

      group.items.push({
        id: childId,
        name: child.name,
        mongoId:
          child.id,
      });
    }

    /*
     * Root mới nhưng chưa có child:
     * vẫn giữ trong runtime menu.
     *
     * Header sẽ có menu cha; Add Product
     * sẽ chờ Admin tạo Mục sản phẩm.
     */
  }

  return menu;
};

const replaceRuntimeMenu = (
  nextMenu:
    ProductMenuCategory[]
) => {
  PRODUCT_MENU.splice(
    0,
    PRODUCT_MENU.length,
    ...cloneMenu(
      nextMenu
    )
  );
};

export type ProductMenuLoadMode =
  | "public"
  | "admin";

export const loadDynamicProductMenu =
  async (
    mode:
      ProductMenuLoadMode =
      "public"
  ) => {
    try {
      const response =
        mode === "admin"
          ? await categoryApi
              .getAll()
          : await categoryApi
              .getPublicMenuSource();

      const categories:
        ProductCategory[] =
        Array.isArray(
          response?.categories
        )
          ? response.categories
          : [];

      /*
       * DB rỗng:
       * KHÔNG xóa menu cũ.
       */
      if (
        categories.length ===
        0
      ) {
        replaceRuntimeMenu(
          LEGACY_PRODUCT_MENU
        );

        return cloneMenu(
          PRODUCT_MENU
        );
      }

      const merged =
        mergeProductMenuFromCategories(
          categories
        );

      replaceRuntimeMenu(
        merged
      );

      return cloneMenu(
        PRODUCT_MENU
      );
    } catch (error) {
      /*
       * API lỗi:
       * fallback legacy để Header/ProductPage
       * không bị trắng menu.
       */
      replaceRuntimeMenu(
        LEGACY_PRODUCT_MENU
      );

      throw error;
    }
  };

export const getProductMenuCategory = (
  categoryId?:
    string | null,
  source:
    ProductMenuCategory[] =
    PRODUCT_MENU
) => {
  const value =
    (
      categoryId ||
      ""
    ).trim();

  return source.find(
    (category) =>
      category.id ===
        value ||
      category.mongoId ===
        value
  );
};

export const getProductMenuCategoryByName = (
  name?:
    string | null,
  source:
    ProductMenuCategory[] =
    PRODUCT_MENU
) =>
  source.find(
    (category) =>
      normalizeText(
        category.name
      ) ===
      normalizeText(name)
  );

export const getProductMenuGroup = (
  parentCategoryId?:
    string | null,
  groupId?:
    string | null,
  source:
    ProductMenuCategory[] =
    PRODUCT_MENU
) =>
  getProductMenuCategory(
    parentCategoryId,
    source
  )?.groups.find(
    (group) =>
      group.id ===
      (
        groupId ||
        ""
      ).trim()
  );

export const getAllProductMenuItems = (
  category:
    ProductMenuCategory
) =>
  category.groups.flatMap(
    (group) =>
      group.items.map(
        (item) => ({
          ...item,
          groupId:
            group.id,
          groupName:
            group.name,
        })
      )
  );

export const getPublicProductMenuGroups = (
  category:
    ProductMenuCategory
) =>
  category.groups.filter(
    (group) =>
      group.hiddenOnPublic !==
      true
  );

export const getAllPublicProductMenuItems = (
  category:
    ProductMenuCategory
) =>
  getPublicProductMenuGroups(
    category
  ).flatMap(
    (group) =>
      group.items.map(
        (item) => ({
          ...item,
          groupId:
            group.id,
          groupName:
            group.name,
        })
      )
  );

export const resolveProductMenuSelection = (
  input: {
    parentCategoryId?:
      string | null;
    parentCategoryName?:
      string | null;
    categoryId?:
      string | null;
    categoryName?:
      string | null;
  },
  source:
    ProductMenuCategory[] =
    PRODUCT_MENU
) => {
  const parent =
    getProductMenuCategory(
      input.parentCategoryId,
      source
    ) ||
    getProductMenuCategoryByName(
      input.parentCategoryName,
      source
    );

  const searchCategories =
    parent
      ? [parent]
      : source;

  for (
    const category
    of searchCategories
  ) {
    for (
      const group
      of category.groups
    ) {
      const item =
        group.items.find(
          (candidate) =>
            (
              input.categoryId &&
              (
                candidate.id ===
                  input.categoryId
                ||
                candidate.mongoId ===
                  input.categoryId
              )
            )
            ||
            (
              input.categoryName &&
              normalizeText(
                candidate.name
              ) ===
                normalizeText(
                  input.categoryName
                )
            )
        );

      if (item) {
        return {
          category,
          group,
          item,
        };
      }
    }
  }

  return null;
};

export const buildProductCategoryUrl = (
  category:
    ProductMenuCategory,
  item?:
    ProductMenuItem
) => {
  const params =
    new URLSearchParams();

  /*
   * URL luôn dùng slug public cũ/mới,
   * KHÔNG dùng Mongo ObjectId.
   *
   * Backend hiện tại đã có compatibility:
   * slug -> ProductCategory ObjectId.
   */
  params.set(
    "parentCategoryId",
    category.id
  );

  params.set(
    "parentCategory",
    category.name
  );

  if (item) {
    params.set(
      "categoryId",
      item.id
    );

    params.set(
      "category",
      item.name
    );
  }

  return `/products?${params.toString()}`;
};
