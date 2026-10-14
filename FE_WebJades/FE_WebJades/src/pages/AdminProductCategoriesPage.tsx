import React from "react";

import {
  categoryApi,
  ProductCategory,
} from "../api/categoryApi";

import {
  LEGACY_PRODUCT_MENU,
} from "../config/productMenuConfig";

import "../styles/AdminProductCategoriesPage.css";

type CreateMode =
  | "root"
  | "item";

const slugify = (
  value: string
) =>
  value
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

const AdminProductCategoriesPage:
  React.FC = () => {
  const [
    categories,
    setCategories,
  ] =
    React.useState<
      ProductCategory[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    React.useState(
      true
    );

  const [
    saving,
    setSaving,
  ] =
    React.useState(
      false
    );

  const [
    error,
    setError,
  ] =
    React.useState("");

  const [
    message,
    setMessage,
  ] =
    React.useState("");

  const [
    mode,
    setMode,
  ] =
    React.useState<
      CreateMode
    >("item");

  const [
    name,
    setName,
  ] =
    React.useState("");

  const [
    slug,
    setSlug,
  ] =
    React.useState("");

  const [
    parentId,
    setParentId,
  ] =
    React.useState("");

  const [
    groupId,
    setGroupId,
  ] =
    React.useState("");

  const [
    groupName,
    setGroupName,
  ] =
    React.useState("");

  const [
    sortOrder,
    setSortOrder,
  ] =
    React.useState(0);

  const [
    showOnMenu,
    setShowOnMenu,
  ] =
    React.useState(
      true
    );

  const load = React.useCallback(
    async () => {
      setLoading(
        true
      );

      setError("");

      try {
        const response =
          await categoryApi
            .getAll();

        const list:
          ProductCategory[] =
          Array.isArray(
            response?.categories
          )
            ? response.categories
            : [];

        setCategories(
          list
        );
      } catch (requestError: any) {
        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError
            ?.message ||
          "Không tải được danh mục."
        );
      } finally {
        setLoading(
          false
        );
      }
    },
    []
  );

  React.useEffect(
    () => {
      load();
    },
    [load]
  );

  const roots =
    React.useMemo(
      () =>
        categories
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
          ),
      [categories]
    );

  const childrenByRoot =
    React.useMemo(
      () => {
        const map =
          new Map<
            string,
            ProductCategory[]
          >();

        roots.forEach(
          (root) => {
            map.set(
              root.id,
              categories
                .filter(
                  (candidate) =>
                    candidate.parentId ===
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
                )
            );
          }
        );

        return map;
      },
      [
        categories,
        roots,
      ]
    );

  const selectedRoot =
    roots.find(
      (root) =>
        root.id ===
        parentId
    );

  const availableGroups =
    React.useMemo(
      () => {
        if (
          !selectedRoot
        ) {
          return [];
        }

        const legacyRoot =
          LEGACY_PRODUCT_MENU
            .find(
              (category) =>
                category.id ===
                  selectedRoot.slug ||
                category.name ===
                  selectedRoot.name
            );

        const fromLegacy =
          (
            legacyRoot
              ?.groups ||
            []
          )
            .filter(
              (group) =>
                Boolean(
                  group.name
                )
            )
            .map(
              (group) => ({
                id:
                  group.id,
                name:
                  group.name,
              })
            );

        const fromDb =
          categories
            .filter(
              (category) =>
                category.parentId ===
                  selectedRoot.id &&
                Boolean(
                  category
                    .menuGroupId
                )
            )
            .map(
              (category) => ({
                id:
                  category
                    .menuGroupId ||
                  "",
                name:
                  category
                    .menuGroupName ||
                  "",
              })
            );

        const merged =
          [
            ...fromLegacy,
            ...fromDb,
          ];

        const unique =
          new Map<
            string,
            {
              id: string;
              name: string;
            }
          >();

        merged.forEach(
          (group) => {
            if (
              !group.id
            ) {
              return;
            }

            unique.set(
              group.id,
              group
            );
          }
        );

        return Array.from(unique.values());
      },
      [
        categories,
        selectedRoot,
      ]
    );

  const resetForm =
    () => {
      setName("");
      setSlug("");
      setGroupId("");
      setGroupName("");
      setSortOrder(0);
      setShowOnMenu(
        true
      );
    };

  const submit =
    async (
      event:
        React.FormEvent
    ) => {
      event.preventDefault();

      setMessage("");
      setError("");

      if (
        !name.trim()
      ) {
        setError(
          "Vui lòng nhập tên."
        );

        return;
      }

      if (
        mode === "item" &&
        !parentId
      ) {
        setError(
          "Vui lòng chọn danh mục menu."
        );

        return;
      }

      setSaving(
        true
      );

      try {
        await categoryApi
          .createWithOptions({
            name:
              name.trim(),

            slug:
              slug.trim() ||
              undefined,

            parentId:
              mode ===
              "root"
                ? ""
                : parentId,

            menuGroupId:
              mode ===
              "item"
                ? groupId
                    .trim()
                : "",

            menuGroupName:
              mode ===
              "item"
                ? groupName
                    .trim()
                : "",

            sortOrder,

            isActive:
              true,

            showOnMenu,
          });

        setMessage(
          mode === "root"
            ? "Đã thêm danh mục menu."
            : "Đã thêm mục sản phẩm."
        );

        resetForm();

        await load();
      } catch (requestError: any) {
        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError
            ?.message ||
          "Không thể thêm danh mục."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  const remove =
    async (
      category:
        ProductCategory
    ) => {
      if (
        !window.confirm(
          `Xóa "${category.name}"? Hệ thống sẽ tự chặn nếu category đang có sản phẩm.`
        )
      ) {
        return;
      }

      setError("");
      setMessage("");

      try {
        await categoryApi
          .delete(
            category.id
          );

        setMessage(
          `Đã xóa "${category.name}".`
        );

        await load();
      } catch (requestError: any) {
        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError
            ?.message ||
          "Không thể xóa danh mục."
        );
      }
    };

  return (
    <main className="kj-category-admin">
      <header className="kj-category-admin__hero">
        <span>
          PRODUCT TAXONOMY
        </span>

        <h1>
          Quản lý danh mục sản phẩm
        </h1>

        <p>
          Thêm menu hoặc mục sản phẩm mới mà không sửa lại
          Product, URL sản phẩm, ảnh, SEO hay logic filter hiện tại.
        </p>
      </header>

      {error ? (
        <div className="kj-category-admin__alert error">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="kj-category-admin__alert success">
          {message}
        </div>
      ) : null}

      <section className="kj-category-admin__layout">
        <form
          className="kj-category-admin__form"
          onSubmit={
            submit
          }
        >
          <h2>
            Thêm mới
          </h2>

          <label>
            Loại
            <select
              value={
                mode
              }
              onChange={(
                event
              ) => {
                const next =
                  event
                    .target
                    .value as
                    CreateMode;

                setMode(
                  next
                );

                if (
                  next ===
                  "root"
                ) {
                  setParentId(
                    ""
                  );
                  setGroupId(
                    ""
                  );
                  setGroupName(
                    ""
                  );
                }
              }}
            >
              <option value="item">
                Mục sản phẩm
              </option>

              <option value="root">
                Danh mục menu
              </option>
            </select>
          </label>

          <label>
            Tên
            <input
              value={
                name
              }
              onChange={(
                event
              ) => {
                const value =
                  event
                    .target
                    .value;

                setName(
                  value
                );

                if (
                  !slug
                ) {
                  setSlug(
                    slugify(
                      value
                    )
                  );
                }
              }}
              placeholder={
                mode ===
                "root"
                  ? "Ví dụ: Quà Tặng Ngọc"
                  : "Ví dụ: Vòng Ngọc Hoàng Long"
              }
            />
          </label>

          <label>
            Slug
            <input
              value={
                slug
              }
              onChange={(
                event
              ) =>
                setSlug(
                  slugify(
                    event
                      .target
                      .value
                  )
                )
              }
              placeholder="Để trống để backend tự tạo"
            />
          </label>

          {mode ===
          "item" ? (
            <>
              <label>
                Danh mục menu
                <select
                  value={
                    parentId
                  }
                  onChange={(
                    event
                  ) => {
                    setParentId(
                      event
                        .target
                        .value
                    );

                    setGroupId(
                      ""
                    );

                    setGroupName(
                      ""
                    );
                  }}
                >
                  <option value="">
                    Chọn danh mục
                  </option>

                  {roots.map(
                    (root) => (
                      <option
                        key={
                          root.id
                        }
                        value={
                          root.id
                        }
                      >
                        {
                          root.name
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Nhóm sản phẩm
                <select
                  value={
                    groupId
                  }
                  onChange={(
                    event
                  ) => {
                    const id =
                      event
                        .target
                        .value;

                    const found =
                      availableGroups
                        .find(
                          (
                            group
                          ) =>
                            group.id ===
                            id
                        );

                    setGroupId(
                      id
                    );

                    setGroupName(
                      found
                        ?.name ||
                      ""
                    );
                  }}
                >
                  <option value="">
                    Không cần nhóm
                  </option>

                  {availableGroups
                    .map(
                      (
                        group
                      ) => (
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
              </label>

              <div className="kj-category-admin__group-new">
                <strong>
                  Hoặc tạo nhóm mới cùng lúc với mục này
                </strong>

                <input
                  value={
                    groupName
                  }
                  onChange={(
                    event
                  ) => {
                    const value =
                      event
                        .target
                        .value;

                    setGroupName(
                      value
                    );

                    if (
                      value.trim()
                    ) {
                      setGroupId(
                        slugify(
                          value
                        )
                      );
                    }
                  }}
                  placeholder="Tên nhóm mới"
                />

                <input
                  value={
                    groupId
                  }
                  onChange={(
                    event
                  ) =>
                    setGroupId(
                      slugify(
                        event
                          .target
                          .value
                      )
                    )
                  }
                  placeholder="group-id"
                />
              </div>
            </>
          ) : null}

          <label>
            Thứ tự
            <input
              type="number"
              value={
                sortOrder
              }
              onChange={(
                event
              ) =>
                setSortOrder(
                  Number(
                    event
                      .target
                      .value
                  ) || 0
                )
              }
            />
          </label>

          <label className="kj-category-admin__check">
            <input
              type="checkbox"
              checked={
                showOnMenu
              }
              onChange={(
                event
              ) =>
                setShowOnMenu(
                  event
                    .target
                    .checked
                )
              }
            />

            Hiện ngoài website
          </label>

          <button
            type="submit"
            disabled={
              saving
            }
          >
            {saving
              ? "Đang lưu..."
              : "Thêm danh mục"}
          </button>
        </form>

        <section className="kj-category-admin__tree">
          <div className="kj-category-admin__tree-head">
            <h2>
              Cấu trúc hiện tại
            </h2>

            <button
              type="button"
              onClick={
                load
              }
            >
              Làm mới
            </button>
          </div>

          {loading ? (
            <p>
              Đang tải...
            </p>
          ) : null}

          {!loading &&
          roots.map(
            (root) => (
              <article
                key={
                  root.id
                }
                className="kj-category-admin__root"
              >
                <header>
                  <div>
                    <strong>
                      {
                        root.name
                      }
                    </strong>

                    <small>
                      {root.slug}
                    </small>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      remove(
                        root
                      )
                    }
                  >
                    Xóa
                  </button>
                </header>

                <div className="kj-category-admin__children">
                  {(
                    childrenByRoot
                      .get(
                        root.id
                      ) ||
                    []
                  ).map(
                    (
                      child
                    ) => (
                      <div
                        key={
                          child.id
                        }
                        className="kj-category-admin__child"
                      >
                        <div>
                          <strong>
                            {
                              child.name
                            }
                          </strong>

                          <small>
                            {
                              child.slug
                            }

                            {child.menuGroupName
                              ? ` · Nhóm: ${child.menuGroupName}`
                              : " · Không nhóm"}
                          </small>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            remove(
                              child
                            )
                          }
                        >
                          Xóa
                        </button>
                      </div>
                    )
                  )}

                  {(
                    childrenByRoot
                      .get(
                        root.id
                      ) ||
                    []
                  ).length ===
                  0 ? (
                    <p className="kj-category-admin__empty">
                      Chưa có mục sản phẩm.
                    </p>
                  ) : null}
                </div>
              </article>
            )
          )}
        </section>
      </section>
    </main>
  );
};

export default AdminProductCategoriesPage;
