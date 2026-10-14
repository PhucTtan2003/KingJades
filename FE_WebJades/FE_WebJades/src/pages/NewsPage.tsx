import React from "react";

import { Link } from "react-router-dom";

import Header from "../components/Header";
import Footer from "../components/Footer";

import { publicNewsApi } from "../api/newsApi";

import type {
  NewsListItem,
  PagedResult,
} from "../../types";

import {
  absoluteAssetUrl,
  formatDate,
  getErrorMessage,
} from "../utils/utils";

import "../styles/News.css";
import "../styles/NewsRating.css";
import "../styles/NewsArticleStyle.css";

const empty: PagedResult<NewsListItem> = {
  items: [],
  totalItems: 0,
  page: 1,
  pageSize: 9,
  totalPages: 0,
};

const getNewsRating = (
  item: NewsListItem
) => {
  const raw = item as NewsListItem & {
    rating?: number;
    customerRatingAverage?: number;
    customerRatingCount?: number;
    overallRating?: number;
  };

  const adminRating = Math.min(
    5,
    Math.max(0, Number(raw.rating) || 0)
  );

  const customerAverage = Math.min(
    5,
    Math.max(
      0,
      Number(raw.customerRatingAverage) || 0
    )
  );

  const customerCount = Math.max(
    0,
    Number(raw.customerRatingCount) || 0
  );

  const overall = Math.min(
    5,
    Math.max(
      0,
      Number(raw.overallRating) ||
        customerAverage ||
        adminRating
    )
  );

  return {
    adminRating,
    customerAverage,
    customerCount,
    overall,
  };
};

const NewsRatingDisplay: React.FC<{
  item: NewsListItem;
  compact?: boolean;
}> = ({
  item,
  compact = false,
}) => {
  const rating = getNewsRating(item);

  if (rating.overall <= 0) {
    return null;
  }

  return (
    <div
      className={`news-rating-display ${
        compact ? "is-compact" : ""
      }`}
      aria-label={`${rating.overall.toFixed(
        1
      )} trên 5 sao`}
      title={
        rating.customerCount > 0
          ? `${rating.customerAverage.toFixed(
              1
            )}/5 từ ${
              rating.customerCount
            } lượt khách hàng`
          : `King Jades: ${rating.adminRating}/5`
      }
    >
      <span className="news-rating-display__stars">
        {[1, 2, 3, 4, 5].map(
          (star) => (
            <i
              key={star}
              className={
                star <=
                Math.round(rating.overall)
                  ? "is-active"
                  : ""
              }
            >
              ★
            </i>
          )
        )}
      </span>

      <b>
        {rating.overall.toFixed(1)}/5
      </b>

      {rating.customerCount > 0 ? (
        <small>
          ({rating.customerCount})
        </small>
      ) : null}
    </div>
  );
};

const NewsPage: React.FC = () => {
  const [data, setData] =
    React.useState(empty);

  const [latestArticle, setLatestArticle] =
    React.useState<NewsListItem | null>(null);

  const [search, setSearch] =
    React.useState("");

  const [submitted, setSubmitted] =
    React.useState("");

  const [page, setPage] =
    React.useState(1);

  const [loading, setLoading] =
    React.useState(true);

  const [error, setError] =
    React.useState("");

  const newsListSectionRef =
    React.useRef<HTMLElement | null>(null);

  const shouldScrollAfterPageChange =
    React.useRef(false);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const [
          pageData,
          latestData,
        ] = await Promise.all([
          publicNewsApi.getPage({
            search: submitted,
            page,
            pageSize: 9,
          }),
          // Lấy riêng bài mới nhất để làm khối editorial lớn.
          // Không phụ thuộc Featured và cũng không bị thay đổi khi search/chuyển trang.
          publicNewsApi.getPage({
            page: 1,
            pageSize: 1,
          }),
        ]);

        if (mounted) {
          setData(pageData);
          setLatestArticle(
            latestData.items[0] ?? null
          );
        }
      } catch (e) {
        if (mounted) {
          setError(
            getErrorMessage(
              e,
              "Không tải được tin tức."
            )
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [page, submitted]);

  React.useEffect(() => {
    if (
      loading ||
      !shouldScrollAfterPageChange.current
    ) {
      return;
    }

    shouldScrollAfterPageChange.current = false;

    window.requestAnimationFrame(() => {
      newsListSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [loading, data.page]);

  const changePage = (nextPage: number) => {
    if (
      nextPage < 1 ||
      nextPage > data.totalPages ||
      nextPage === page
    ) {
      return;
    }

    shouldScrollAfterPageChange.current = true;
    setPage(nextPage);
  };

  const paginationPages = React.useMemo(() => {
    const total = data.totalPages;

    if (total <= 0) {
      return [] as number[];
    }

    if (total <= 5) {
      return Array.from(
        { length: total },
        (_, index) => index + 1
      );
    }

    return Array.from(
      new Set(
        [
          1,
          page - 1,
          page,
          page + 1,
          total,
        ].filter(
          (value) =>
            value >= 1 && value <= total
        )
      )
    ).sort((a, b) => a - b);
  }, [data.totalPages, page]);

  const primaryLatest = latestArticle;

  return (
    <div className="public-news-page public-news-page--journal">
      <Header />

      <main>
        {/* =====================================================
            JOURNAL INTRO
            Layout lấy cảm hứng từ file HTML mẫu.
            Header/Footer và toàn bộ data/API vẫn dùng source hiện tại.
        ====================================================== */}
        <section className="news-journal-intro">
          <div className="news-journal-shell">
            <div className="news-journal-intro__row">
              <div className="news-journal-intro__title">
                <span>NHẬT KÝ KING JADES</span>

                <h1>
                  Chuyện ngọc
                  <i>&amp;</i>
                  <br />
                  nghệ thuật sống
                </h1>
              </div>

              <p>
                Kiến thức ngọc phỉ thúy, phong thủy và cách
                chăm sóc trang sức — được tuyển chọn và chia sẻ
                trong không gian nội dung của King Jades.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            LATEST STORY
            Khối editorial lớn luôn lấy bài viết mới nhất.
            Không sử dụng trạng thái Featured.
        ====================================================== */}
        {primaryLatest ? (
          <section className="news-journal-featured">
            <div className="news-journal-shell">
              <article className="news-journal-featured__main">
                <Link
                  className="news-journal-featured__media"
                  to={`/news/${primaryLatest.slug}`}
                >
                  {primaryLatest.coverImageUrl ? (
                    <img
                      src={absoluteAssetUrl(
                        primaryLatest.coverImageUrl
                      )}
                      alt={primaryLatest.title}
                    />
                  ) : (
                    <span className="news-journal-image-placeholder">
                      KJ
                    </span>
                  )}

                  <span className="news-journal-featured__frame" />
                  <span className="news-journal-featured__label">
                    Bài viết mới nhất
                  </span>
                </Link>

                <div className="news-journal-featured__copy">
                  <div className="news-journal-meta">
                    <span>
                      {primaryLatest.category ||
                        "Tin tức"}
                    </span>
                    <i />
                    <time>
                      {formatDate(
                        primaryLatest.publishedAtUtc
                      )}
                    </time>
                  </div>

                  <h2>
                    <Link
                      to={`/news/${primaryLatest.slug}`}
                    >
                      {primaryLatest.title}
                    </Link>
                  </h2>

                  <NewsRatingDisplay
                    item={primaryLatest}
                    compact
                  />

                  <p>
                    {primaryLatest.summary}
                  </p>

                  <Link
                    className="news-journal-read-link"
                    to={`/news/${primaryLatest.slug}`}
                  >
                    Đọc bài viết
                    <span>→</span>
                  </Link>
                </div>
              </article>

            </div>
          </section>
        ) : null}

        {/* =====================================================
            ALL ARTICLES
            Search / loading / error / pagination giữ nguyên logic.
        ====================================================== */}
        <section
          ref={newsListSectionRef}
          className="news-journal-list"
          style={{ scrollMarginTop: "100px" }}
        >
          <div className="news-journal-shell">
            <div className="news-journal-toolbar">
              <div className="news-journal-toolbar__title">
                <i className="news-journal-toolbar__accent" />
                  <h2>Tất cả bài viết</h2>
              </div> 
              <form
                onSubmit={(e) => {
                  e.preventDefault();

                  setSubmitted(
                    search.trim()
                  );

                  setPage(1);
                }}
              >
                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Tìm bài viết…"
                  aria-label="Tìm bài viết"
                />

                <button type="submit">
                  Tìm
                </button>
              </form>
            </div>

            {error ? (
              <div className="news-alert error">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="news-loading">
                Đang tải...
              </div>
            ) : !data.items.length ? (
              <div className="news-empty">
                Chưa có bài viết.
              </div>
            ) : (
              <div className="news-journal-grid">
                {data.items.map(
                  (item, index) => (
                    <article key={item.id}>
                      <Link
                        className="news-journal-card__media"
                        to={`/news/${item.slug}`}
                      >
                        {item.coverImageUrl ? (
                          <img
                            src={absoluteAssetUrl(
                              item.coverImageUrl
                            )}
                            alt={item.title}
                          />
                        ) : (
                          <span className="news-journal-image-placeholder">
                            KJ
                          </span>
                        )}

                        <span className="news-journal-card__frame" />
                        <span className="news-journal-card__number">
                          {String(
                            (data.page - 1) *
                              data.pageSize +
                              index +
                              1
                          ).padStart(2, "0")}
                        </span>
                      </Link>

                      <div className="news-journal-card__body">
                        <div className="news-journal-meta">
                          <span>
                            {item.category ||
                              "Tin tức"}
                          </span>
                          <i />
                          <time>
                            {formatDate(
                              item.publishedAtUtc
                            )}
                          </time>
                        </div>

                        <h3>
                          <Link
                            to={`/news/${item.slug}`}
                          >
                            {item.title}
                          </Link>
                        </h3>

                        <NewsRatingDisplay
                          item={item}
                          compact
                        />

                        <p>{item.summary}</p>

                        <Link
                          className="news-journal-read-link news-journal-read-link--small"
                          to={`/news/${item.slug}`}
                        >
                          Đọc bài
                          <span>→</span>
                        </Link>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}

            {data.totalPages > 1 ? (
              <nav
                className="news-journal-pagination"
                aria-label="Phân trang bài viết"
              >
                <button
                  type="button"
                  className="news-journal-pagination__side"
                  disabled={page <= 1}
                  onClick={() =>
                    changePage(page - 1)
                  }
                >
                  ← Trước
                </button>

                <div className="news-journal-pagination__pages">
                  {paginationPages.map(
                    (pageNumber, index) => {
                      const previous =
                        paginationPages[index - 1];

                      const showEllipsis =
                        index > 0 &&
                        previous !== undefined &&
                        pageNumber - previous > 1;

                      return (
                        <React.Fragment
                          key={pageNumber}
                        >
                          {showEllipsis ? (
                            <span
                              className="news-journal-pagination__ellipsis"
                              aria-hidden="true"
                            >
                              …
                            </span>
                          ) : null}

                          <button
                            type="button"
                            className={
                              pageNumber === page
                                ? "is-active"
                                : ""
                            }
                            aria-current={
                              pageNumber === page
                                ? "page"
                                : undefined
                            }
                            onClick={() =>
                              changePage(
                                pageNumber
                              )
                            }
                          >
                            {pageNumber}
                          </button>
                        </React.Fragment>
                      );
                    }
                  )}
                </div>

                <button
                  type="button"
                  className="news-journal-pagination__side"
                  disabled={
                    page >= data.totalPages
                  }
                  onClick={() =>
                    changePage(page + 1)
                  }
                >
                  Sau →
                </button>
              </nav>
            ) : null}
          </div>
        </section>

        {/* =====================================================
            EDITORIAL CTA
            Không tạo chức năng newsletter giả; CTA dẫn sang Contact.
        ====================================================== */}
        <section className="news-journal-consultation">
          <div className="news-journal-shell">
            <div>
              <span>PRIVATE CONSULTATION</span>

              <h2>
                Tư vấn riêng cùng
                <br />
                <i>King Jades</i>
              </h2>
            </div>

            <div className="news-journal-consultation__copy">
              <p>
                Khám phá sản phẩm phù hợp, đặt lịch tư vấn và nhận
                hỗ trợ trực tiếp từ đội ngũ King Jades.
              </p>

              <Link to="/contact">
                Đặt lịch tư vấn
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default NewsPage;