import React from "react";
import { adminNewsApi } from "../api/newsApi";
import NewsEditor from "../components/News/NewsEditor";
import type {
  NewsArticle,
  NewsLayout,
  NewsListItem,
  NewsStatus,
  PagedResult,
} from "../../types";
import {
  absoluteAssetUrl,
  formatDate,
  getErrorMessage,
  statusLabel,
} from "../utils/utils";

import "../styles/News.css";
import "../styles/AdminNewPage.css";
import "../styles/NewsRating.css";

const emptyPage: PagedResult<NewsListItem> = {
  items: [],
  totalItems: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
};

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M12 5v14" />
  </svg>
);

const LayoutIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="4" width="17" height="16" rx="2" />
    <path d="M9 4v16M9 10h11" />
  </svg>
);

const ListIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" />
    <circle cx="4.5" cy="12" r="1" />
    <circle cx="4.5" cy="18" r="1" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Z" />
    <path d="m13.5 7 3.5 3.5" />
  </svg>
);

const PublishIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M5 14v6h14v-6" />
  </svg>
);

const UnpublishIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 8v12" />
    <path d="m17 15-5 5-5-5" />
    <path d="M5 10V4h14v6" />
  </svg>
);

const DuplicateIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="8" y="8" width="11" height="11" rx="2" />
    <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4.5 7h15M9 7V4.5h6V7M7 7l.8 12h8.4L17 7M10 10.5v5M14 10.5v5" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2.8 12s3.2-5.4 9.2-5.4S21.2 12 21.2 12 18 17.4 12 17.4 2.8 12 2.8 12Z" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
    <path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17" />
  </svg>
);

const getNewsRating = (
  item: NewsListItem
) => {
  const raw = item as NewsListItem & {
    rating?: number;
    customerRatingAverage?: number;
    customerRatingCount?: number;
    overallRating?: number;
  };

  return {
    admin: Math.min(
      5,
      Math.max(
        0,
        Number(raw.rating) || 0
      )
    ),
    customerAverage: Math.min(
      5,
      Math.max(
        0,
        Number(
          raw.customerRatingAverage
        ) || 0
      )
    ),
    customerCount: Math.max(
      0,
      Number(
        raw.customerRatingCount
      ) || 0
    ),
    overall: Math.min(
      5,
      Math.max(
        0,
        Number(raw.overallRating) || 0
      )
    ),
  };
};

const AdminNewsRating: React.FC<{
  item: NewsListItem;
}> = ({ item }) => {
  const rating = getNewsRating(item);

  if (
    rating.admin <= 0 &&
    rating.customerCount <= 0
  ) {
    return (
      <span className="kj-admin-news-rating is-empty">
        Chưa chấm
      </span>
    );
  }

  const display =
    rating.overall > 0
      ? rating.overall
      : rating.customerAverage > 0
        ? rating.customerAverage
        : rating.admin;

  return (
    <span
      className="kj-admin-news-rating"
      title={`Admin ${rating.admin}/5 · Khách ${rating.customerAverage.toFixed(
        1
      )}/5 (${rating.customerCount})`}
    >
      <span className="kj-admin-news-rating__stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <i
            key={star}
            className={
              star <= Math.round(display)
                ? "is-active"
                : ""
            }
          >
            ★
          </i>
        ))}
      </span>

      <span className="kj-admin-news-rating__values">
        <b>{display.toFixed(1)}/5</b>

        <small>
          Admin {rating.admin || "—"} · Khách{" "}
          {rating.customerCount > 0
            ? `${rating.customerAverage.toFixed(
                1
              )} (${rating.customerCount})`
            : "—"}
        </small>
      </span>
    </span>
  );
};

const AdminNewsPage: React.FC = () => {
  const [mode, setMode] =
    React.useState<"list" | "editor" | "layouts">("list");
  const [editingId, setEditingId] =
    React.useState<string | null>(null);
  const [data, setData] = React.useState(emptyPage);
  const [layouts, setLayouts] =
    React.useState<NewsLayout[]>([]);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] =
    React.useState<NewsStatus | "">("");
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [actionId, setActionId] =
    React.useState<string | null>(null);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setData(
        await adminNewsApi.getPage({
          search,
          status,
          page,
          pageSize: 10,
        })
      );
    } catch (e) {
      setError(
        getErrorMessage(
          e,
          "Không tải được danh sách bài viết."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  React.useEffect(() => {
    load();
  }, [load]);

  const openEditor = (id?: string) => {
    setEditingId(id || null);
    setMode("editor");
    setMessage("");
    setError("");
  };

  const closeEditor = () => {
    setEditingId(null);
    setMode("list");
    load();
  };

  const action = async (
    item: NewsListItem,
    type:
      | "publish"
      | "unpublish"
      | "duplicate"
      | "delete"
  ) => {
    if (
      type === "delete" &&
      !window.confirm(`Xóa bài viết "${item.title}"?`)
    ) {
      return;
    }

    setActionId(item.id);
    setError("");
    setMessage("");

    try {
      if (type === "publish") {
        await adminNewsApi.publish(
          item.id,
          item.version
        );
      }

      if (type === "unpublish") {
        await adminNewsApi.unpublish(
          item.id,
          item.version
        );
      }

      if (type === "delete") {
        await adminNewsApi.remove(item.id);
      }

      if (type === "duplicate") {
        const copy =
          await adminNewsApi.duplicate(item.id);

        openEditor(copy.id);
        return;
      }

      setMessage(
        type === "publish"
          ? "Đã xuất bản bài viết."
          : type === "unpublish"
            ? "Đã gỡ xuất bản."
            : "Đã xóa bài viết."
      );

      await load();
    } catch (e) {
      setError(
        getErrorMessage(
          e,
          "Không thể thực hiện thao tác."
        )
      );
    } finally {
      setActionId(null);
    }
  };

  const openLayouts = async () => {
    setMode("layouts");
    setError("");

    try {
      setLayouts(
        await adminNewsApi.getLayouts()
      );
    } catch (e) {
      setError(
        getErrorMessage(
          e,
          "Không tải được layout."
        )
      );
    }
  };

  const removeLayout = async (
    layout: NewsLayout
  ) => {
    if (
      !window.confirm(`Xóa layout "${layout.name}"?`)
    ) {
      return;
    }

    setActionId(layout.id);

    try {
      await adminNewsApi.removeLayout(layout.id);

      setLayouts(
        await adminNewsApi.getLayouts()
      );

      setMessage("Đã xóa layout.");
    } catch (e) {
      setError(
        getErrorMessage(
          e,
          "Không xóa được layout."
        )
      );
    } finally {
      setActionId(null);
    }
  };

  if (mode === "editor") {
    return (
      <NewsEditor
        articleId={editingId}
        onClose={closeEditor}
        onSaved={(article: NewsArticle) =>
          setEditingId(article.id)
        }
      />
    );
  }

  return (
    <div className="kj-admin-news-page">
      <header className="kj-admin-news-hero">
        <div className="kj-admin-news-hero__copy">
          <span className="kj-admin-news-eyebrow">
            King Jades Content
          </span>

          <h1>Quản lý tin tức</h1>

          <p>
            Tạo bài viết bằng block, quản lý layout và xuất
            bản nội dung lên website.
          </p>
        </div>

        <div className="kj-admin-news-hero__actions">
          <button
            type="button"
            className="kj-admin-news-button kj-admin-news-button--light"
            onClick={
              mode === "layouts"
                ? () => setMode("list")
                : openLayouts
            }
          >
            {mode === "layouts" ? (
              <ListIcon />
            ) : (
              <LayoutIcon />
            )}

            {mode === "layouts"
              ? "Danh sách bài"
              : "Mẫu layout"}
          </button>

          <button
            type="button"
            className="kj-admin-news-button kj-admin-news-button--gold"
            onClick={() => openEditor()}
          >
            <PlusIcon />
            Tạo bài viết
          </button>
        </div>
      </header>

      <section className="kj-admin-news-summary">
        <article>
          <span>01</span>

          <div>
            <small>Tổng bài viết</small>
            <strong>{data.totalItems}</strong>
          </div>
        </article>

        <article>
          <span>02</span>

          <div>
            <small>Trang hiện tại</small>
            <strong>
              {data.page || page}/{Math.max(data.totalPages, 1)}
            </strong>
          </div>
        </article>

        <article>
          <span>03</span>

          <div>
            <small>Layout đã lưu</small>
            <strong>{layouts.length}</strong>
          </div>
        </article>

        <article>
          <span>04</span>

          <div>
            <small>Chế độ</small>
            <strong>
              {mode === "layouts" ? "Layout" : "Bài viết"}
            </strong>
          </div>
        </article>
      </section>

      {message || error ? (
        <div
          className={`kj-admin-news-alert ${
            message ? "is-success" : "is-error"
          }`}
        >
          {message ? <CheckIcon /> : <b>!</b>}
          <span>{message || error}</span>
        </div>
      ) : null}

      {mode === "layouts" ? (
        <section className="kj-admin-news-panel">
          <header className="kj-admin-news-section-head">
            <div>
              <span className="kj-admin-news-eyebrow">
                Mẫu tái sử dụng
              </span>

              <h2>Layout bài viết</h2>

              <p>
                Các layout được lưu từ News Editor để tái sử
                dụng cho những bài viết tiếp theo.
              </p>
            </div>

            <b>{layouts.length} mẫu</b>
          </header>

          {!layouts.length ? (
            <div className="kj-admin-news-empty">
              <span className="kj-admin-news-empty__icon">
                <LayoutIcon />
              </span>

              <strong>Chưa có layout</strong>

              <p>
                Mở bài viết trong News Editor và chọn “Lưu
                layout” để tạo mẫu đầu tiên.
              </p>
            </div>
          ) : (
            <div className="kj-admin-news-layout-grid">
              {layouts.map((layout) => (
                <article key={layout.id}>
                  <div className="kj-admin-news-layout-thumb">
                    {layout.thumbnailUrl ? (
                      <img
                        src={absoluteAssetUrl(
                          layout.thumbnailUrl
                        )}
                        alt=""
                      />
                    ) : (
                      <span>KJ</span>
                    )}

                    <small>
                      {layout.blocks.length} block
                    </small>
                  </div>

                  <div className="kj-admin-news-layout-copy">
                    <span>Reusable Layout</span>
                    <h3>{layout.name}</h3>
                    <p>{layout.description}</p>
                  </div>

                  <footer>
                    {layout.isDefault ? (
                      <b>Mặc định</b>
                    ) : (
                      <span />
                    )}

                    <button
                      type="button"
                      disabled={actionId === layout.id}
                      onClick={() => removeLayout(layout)}
                    >
                      <TrashIcon />
                      {actionId === layout.id
                        ? "Đang xóa..."
                        : "Xóa"}
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="kj-admin-news-toolbar">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
                load();
              }}
            >
              <label className="kj-admin-news-search">
                <SearchIcon />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Tìm tiêu đề..."
                />
              </label>

              <select
                value={status}
                onChange={(e) => {
                  setStatus(
                    e.target.value as NewsStatus | ""
                  );
                  setPage(1);
                }}
              >
                <option value="">
                  Tất cả trạng thái
                </option>
                <option value="Draft">Bản nháp</option>
                <option value="Scheduled">
                  Đã lên lịch
                </option>
                <option value="Published">
                  Đã xuất bản
                </option>
              </select>

              <button type="submit">
                <SearchIcon />
                Tìm kiếm
              </button>
            </form>

            <b>{data.totalItems} bài</b>
          </section>

          <section className="kj-admin-news-panel">
            <header className="kj-admin-news-section-head">
              <div>
                <span className="kj-admin-news-eyebrow">
                  Article Directory
                </span>

                <h2>Danh sách bài viết</h2>

                <p>
                  Chỉnh sửa, xuất bản, gỡ đăng, nhân bản hoặc
                  xóa bài viết.
                </p>
              </div>

              <b>
                Trang {data.page || page}/
                {Math.max(data.totalPages, 1)}
              </b>
            </header>

            {loading ? (
              <div className="kj-admin-news-loading">
                <div />
                <strong>Đang tải danh sách bài viết...</strong>
              </div>
            ) : !data.items.length ? (
              <div className="kj-admin-news-empty">
                <span className="kj-admin-news-empty__icon">
                  <ListIcon />
                </span>

                <strong>Chưa có bài viết</strong>

                <p>
                  Tạo bài viết đầu tiên hoặc thay đổi từ khóa
                  và trạng thái tìm kiếm.
                </p>
              </div>
            ) : (
              <div className="kj-admin-news-table-wrap">
                <table className="kj-admin-news-table">
                  <thead>
                    <tr>
                      <th>Bài viết</th>
                      <th>Danh mục</th>
                      <th>Trạng thái</th>
                      <th>Cập nhật</th>
                      <th>Lượt xem</th>
                      <th>Đánh giá</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id}>
                        <td data-label="Bài viết">
                          <div className="kj-admin-news-article-cell">
                            <div>
                              {item.coverImageUrl ? (
                                <img
                                  src={absoluteAssetUrl(
                                    item.coverImageUrl
                                  )}
                                  alt=""
                                />
                              ) : (
                                <span>KJ</span>
                              )}
                            </div>

                            <div>
                              <strong>{item.title}</strong>
                              <small>/news/{item.slug}</small>
                            </div>
                          </div>
                        </td>

                        <td data-label="Danh mục">
                          <span className="kj-admin-news-category">
                            {item.category || "—"}
                          </span>
                        </td>

                        <td data-label="Trạng thái">
                          <span
                            className={`kj-admin-news-status status-${item.status}`}
                          >
                            <i />
                            {statusLabel[item.status]}
                          </span>
                        </td>

                        <td data-label="Cập nhật">
                          <span className="kj-admin-news-meta">
                            <CalendarIcon />
                            {formatDate(item.updatedAtUtc)}
                          </span>
                        </td>

                        <td data-label="Lượt xem">
                          <span className="kj-admin-news-meta">
                            <EyeIcon />
                            {item.viewCount}
                          </span>
                        </td>

                        <td data-label="Đánh giá">
                          <AdminNewsRating item={item} />
                        </td>

                        <td data-label="Thao tác">
                          <div className="kj-admin-news-row-actions">
                            <button
                              type="button"
                              onClick={() =>
                                openEditor(item.id)
                              }
                              title="Chỉnh sửa"
                            >
                              <EditIcon />
                              <span>Sửa</span>
                            </button>

                            {item.status === "Published" ? (
                              <button
                                type="button"
                                disabled={
                                  actionId === item.id
                                }
                                onClick={() =>
                                  action(item, "unpublish")
                                }
                                title="Gỡ đăng"
                              >
                                <UnpublishIcon />
                                <span>Gỡ đăng</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={
                                  actionId === item.id
                                }
                                onClick={() =>
                                  action(item, "publish")
                                }
                                title="Xuất bản"
                              >
                                <PublishIcon />
                                <span>Đăng</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={actionId === item.id}
                              onClick={() =>
                                action(item, "duplicate")
                              }
                              title="Nhân bản"
                            >
                              <DuplicateIcon />
                              <span>Nhân bản</span>
                            </button>

                            <button
                              type="button"
                              className="danger"
                              disabled={actionId === item.id}
                              onClick={() =>
                                action(item, "delete")
                              }
                              title="Xóa"
                            >
                              <TrashIcon />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.totalPages > 1 ? (
              <div className="kj-admin-news-pagination">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((p) => p - 1)
                  }
                >
                  ← Trước
                </button>

                <span>
                  Trang {data.page}/{data.totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= data.totalPages}
                  onClick={() =>
                    setPage((p) => p + 1)
                  }
                >
                  Sau →
                </button>
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
};

export default AdminNewsPage;