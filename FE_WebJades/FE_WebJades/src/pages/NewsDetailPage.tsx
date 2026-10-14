import React from "react";
import {
  Link,
  useParams,
} from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import NewsBlockRenderer from "../components/News/NewsBlockRenderer";
import { publicNewsApi, type NewsRatingSummary } from "../api/newsApi";
import type {
  NewsArticle,
  NewsBlock,
  NewsListItem,
} from "../../types";
import {
  absoluteAssetUrl,
  formatDate,
  getErrorMessage,
} from "../utils/utils";
import "../styles/News.css";
import "../styles/NewsRating.css";
import "../styles/NewsArticleStyle.css";
import "../styles/NewsWordEditor.css";

const NEWS_VISITOR_ID_KEY =
  "kingjades_news_visitor_id";

const getOrCreateNewsVisitorId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const existing =
      window.localStorage.getItem(
        NEWS_VISITOR_ID_KEY
      );

    if (existing?.trim()) {
      return existing.trim();
    }

    const generated =
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `visitor-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 12)}`;

    window.localStorage.setItem(
      NEWS_VISITOR_ID_KEY,
      generated
    );

    return generated;
  } catch {
    return `visitor-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 12)}`;
  }
};

const normalizeDisplayRating = (
  value: unknown
) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.min(
    5,
    Math.max(0, parsed)
  );
};

const getArticleRating = (
  article: NewsArticle
) => {
  const value = Number(
    (article as NewsArticle & {
      rating?: number;
    }).rating ?? 0
  );

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    5,
    Math.max(0, Math.round(value))
  );
};

type ArticleTypography = {
  titleFont: string;
  headingFont: string;
  bodyFont: string;
  letterSpacing: number;
  lineHeight: number;
};

type ArticleTextStyle = {
  titleSize: number;
  headingSize: number;
  bodySize: number;
  titleColor: string;
  headingColor: string;
  bodyColor: string;
  linkColor: string;
  titleAlign: "left" | "center" | "right";
  bodyAlign: "left" | "center" | "right" | "justify";
  contentWidth: number;
};

const clampNumber = (
  value: unknown,
  min: number,
  max: number,
  fallback: number
) => {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? Math.min(max, Math.max(min, parsed))
    : fallback;
};

const getTypography = (
  article: NewsArticle
): ArticleTypography => {
  const value = ((article as any).typography || {}) as Record<
    string,
    unknown
  >;

  return {
    titleFont:
      String(value.titleFont || "Lora").trim() ||
      "Lora",
    headingFont:
      String(value.headingFont || "Lora").trim() ||
      "Lora",
    bodyFont:
      String(value.bodyFont || "SVN-Gilroy").trim() ||
      "SVN-Gilroy",
    letterSpacing: clampNumber(
      value.letterSpacing,
      -0.05,
      0.2,
      0.01
    ),
    lineHeight: clampNumber(
      value.lineHeight,
      1.2,
      2.6,
      1.8
    ),
  };
};

const getTextStyle = (
  article: NewsArticle
): ArticleTextStyle => {
  const value = ((article as any).textStyle || {}) as Record<
    string,
    unknown
  >;

  const rawTitleAlign = String(
    value.titleAlign || "center"
  );

  const titleAlign: ArticleTextStyle["titleAlign"] =
    rawTitleAlign === "left" ||
    rawTitleAlign === "right"
      ? rawTitleAlign
      : "center";

  const rawBodyAlign = String(
    value.bodyAlign || "left"
  );

  const bodyAlign: ArticleTextStyle["bodyAlign"] =
    rawBodyAlign === "center" ||
    rawBodyAlign === "right" ||
    rawBodyAlign === "justify"
      ? rawBodyAlign
      : "left";

  return {
    titleSize: clampNumber(
      value.titleSize,
      28,
      88,
      56
    ),
    headingSize: clampNumber(
      value.headingSize,
      20,
      56,
      32
    ),
    bodySize: clampNumber(
      value.bodySize,
      13,
      24,
      16
    ),
    titleColor:
      String(value.titleColor || "#142543"),
    headingColor:
      String(value.headingColor || "#142543"),
    bodyColor:
      String(value.bodyColor || "#5f655f"),
    linkColor:
      String(value.linkColor || "#0b5d48"),
    titleAlign,
    bodyAlign,
    contentWidth: clampNumber(
      value.contentWidth,
      620,
      1100,
      800
    ),
  };
};

const getFontStack = (
  font: string,
  kind: "serif" | "sans"
) => {
  const safeFont = font
    .trim()
    .replace(/["']/g, "");

  if (!safeFont) {
    return kind === "serif"
      ? '"Lora", Georgia, serif'
      : '"SVN-Gilroy", Arial, sans-serif';
  }

  return kind === "serif"
    ? `"${safeFont}", "Lora", Georgia, serif`
    : `"${safeFont}", "SVN-Gilroy", Arial, sans-serif`;
};

const upsertMeta = (
  selector: string,
  attributes: Record<string, string>
) => {
  let element =
    document.head.querySelector<HTMLMetaElement>(
      selector
    );

  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(
    ([key, value]) =>
      element?.setAttribute(key, value)
  );

  return element;
};

const upsertCanonical = (href: string) => {
  let element =
    document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    );

  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }

  element.href = href;
};


type NewsTocItem = {
  blockId: string;
  anchorId: string;
  text: string;
  level: number;
  number: string;
};

const getHeadingText = (block: NewsBlock) => {
  if (block.type !== "Heading") {
    return "";
  }

  return String(
    (block.content as Record<string, unknown>)?.text ||
      ""
  ).trim();
};

const getHeadingLevel = (block: NewsBlock) => {
  const raw = Number(
    (block.content as Record<string, unknown>)?.level ||
      2
  );

  if (!Number.isFinite(raw)) {
    return 2;
  }

  return Math.min(5, Math.max(2, raw));
};

const buildTableOfContents = (
  blocks: NewsBlock[]
): NewsTocItem[] => {
  const headingBlocks = blocks
    .slice()
    .sort((a, b) => a.order - b.order)
    .filter(
      (block) =>
        block.type === "Heading" &&
        Boolean(getHeadingText(block))
    );

  if (!headingBlocks.length) {
    return [];
  }

  const baseLevel = Math.min(
    ...headingBlocks.map(getHeadingLevel)
  );

  const counters: Record<number, number> = {};

  return headingBlocks.map((block) => {
    const level = getHeadingLevel(block);

    counters[level] =
      (counters[level] || 0) + 1;

    for (
      let deeper = level + 1;
      deeper <= 5;
      deeper += 1
    ) {
      counters[deeper] = 0;
    }

    for (
      let parent = baseLevel;
      parent < level;
      parent += 1
    ) {
      if (!counters[parent]) {
        counters[parent] = 1;
      }
    }

    const number = Array.from(
      {
        length:
          Math.max(level, baseLevel) -
          baseLevel +
          1,
      },
      (_, index) => {
        const currentLevel =
          baseLevel + index;

        return counters[currentLevel] || 1;
      }
    ).join(".");

    return {
      blockId: block.id,
      anchorId: `news-section-${block.id}`,
      text: getHeadingText(block),
      level,
      number,
    };
  });
};

const NewsDetailPage: React.FC = () => {
  const { slug = "" } = useParams();

  const [
    article,
    setArticle,
  ] =
    React.useState<NewsArticle | null>(
      null
    );

  const [loading, setLoading] =
    React.useState(true);

  const [error, setError] =
    React.useState("");

  const [visitorId] =
    React.useState(
      () =>
        getOrCreateNewsVisitorId()
    );

  const [
    ratingSummary,
    setRatingSummary,
  ] =
    React.useState<NewsRatingSummary | null>(
      null
    );

  const [
    ratingLoading,
    setRatingLoading,
  ] =
    React.useState(false);

  const [
    ratingSubmitting,
    setRatingSubmitting,
  ] =
    React.useState(false);

  const [
    ratingError,
    setRatingError,
  ] =
    React.useState("");

  const [
    hoverRating,
    setHoverRating,
  ] =
    React.useState(0);

  const [
    relatedArticles,
    setRelatedArticles,
  ] = React.useState<NewsListItem[]>([]);

  const [
    relatedLoading,
    setRelatedLoading,
  ] = React.useState(false);

  const [
    relatedSlideIndex,
    setRelatedSlideIndex,
  ] = React.useState(0);

  const [
    relatedVisibleCount,
    setRelatedVisibleCount,
  ] = React.useState(3);

  const [
    relatedCarouselPaused,
    setRelatedCarouselPaused,
  ] = React.useState(false);

  const relatedCarouselRef =
    React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError("");
    setArticle(null);
    setRatingSummary(null);
    setRatingError("");
    setHoverRating(0);
    setRelatedArticles([]);
    setRelatedSlideIndex(0);

    (async () => {
      try {
        const data =
          await publicNewsApi.getBySlug(
            slug
          );

        if (mounted) {
          setArticle(data);


        }
      } catch (e) {
        if (mounted) {
          setError(
            getErrorMessage(
              e,
              "Không tìm thấy bài viết."
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
  }, [slug]);

  React.useEffect(() => {
    let mounted = true;

    const loadRating = async () => {
      setRatingLoading(true);
      setRatingError("");

      try {
        const result =
          await publicNewsApi.getRating(
            slug,
            visitorId
          );

        if (mounted) {
          setRatingSummary(result);

          setArticle((previous) => {
            if (!previous) {
              return previous;
            }

            return {
              ...previous,
              customerRatingAverage:
                result.customerRatingAverage,
              customerRatingCount:
                result.customerRatingCount,
              overallRating:
                result.overallRating,
            } as NewsArticle;
          });
        }
      } catch (ratingLoadError) {
        if (mounted) {
          setRatingError(
            getErrorMessage(
              ratingLoadError,
              "Không tải được đánh giá bài viết."
            )
          );
        }
      } finally {
        if (mounted) {
          setRatingLoading(false);
        }
      }
    };

    if (slug) {
      loadRating();
    }

    return () => {
      mounted = false;
    };
  }, [slug, visitorId]);

  const relatedArticleSlug =
    article?.slug || "";

  const relatedArticleCategory =
    article?.category || "";

  React.useEffect(() => {
    if (!relatedArticleSlug) {
      setRelatedArticles([]);
      setRelatedLoading(false);
      return;
    }

    let mounted = true;

    const loadRelatedArticles = async () => {
      setRelatedLoading(true);

      try {
        // Tận dụng API danh sách hiện có, không cần thay backend.
        // Ưu tiên bài cùng danh mục; nếu chưa đủ thì bổ sung
        // bài mới khác để carousel có đủ nội dung để tự chạy.
        const result = await publicNewsApi.getPage({
          page: 1,
          pageSize: 18,
        });

        if (!mounted) {
          return;
        }

        const currentSlug = String(
          relatedArticleSlug || slug
        )
          .trim()
          .toLowerCase();

        const currentCategory = String(
          relatedArticleCategory
        )
          .trim()
          .toLowerCase();

        const candidates = result.items.filter(
          (item) =>
            String(item.slug || "")
              .trim()
              .toLowerCase() !== currentSlug
        );

        const sameCategory = currentCategory
          ? candidates.filter(
              (item) =>
                String(item.category || "")
                  .trim()
                  .toLowerCase() === currentCategory
            )
          : [];

        const sameCategoryIds = new Set(
          sameCategory.map((item) => item.id)
        );

        const fallback = candidates.filter(
          (item) => !sameCategoryIds.has(item.id)
        );

        setRelatedArticles(
          [...sameCategory, ...fallback].slice(0, 9)
        );
        setRelatedSlideIndex(0);
      } catch {
        if (mounted) {
          setRelatedArticles([]);
        }
      } finally {
        if (mounted) {
          setRelatedLoading(false);
        }
      }
    };

    loadRelatedArticles();

    return () => {
      mounted = false;
    };
  }, [
    relatedArticleSlug,
    relatedArticleCategory,
    slug,
  ]);

  React.useEffect(() => {
    const updateRelatedVisibleCount = () => {
      const width =
        relatedCarouselRef.current?.clientWidth ||
        window.innerWidth;

      setRelatedVisibleCount(
        width <= 620 ? 1 : width <= 820 ? 2 : 3
      );
    };

    updateRelatedVisibleCount();
    window.addEventListener(
      "resize",
      updateRelatedVisibleCount
    );

    return () =>
      window.removeEventListener(
        "resize",
        updateRelatedVisibleCount
      );
  }, []);

  const relatedMaxSlideIndex = Math.max(
    0,
    relatedArticles.length - relatedVisibleCount
  );

  const scrollToRelatedSlide =
    React.useCallback(
      (requestedIndex: number) => {
        const viewport = relatedCarouselRef.current;
        const maxIndex = Math.max(
          0,
          relatedArticles.length - relatedVisibleCount
        );

        const nextIndex =
          requestedIndex < 0
            ? maxIndex
            : requestedIndex > maxIndex
              ? 0
              : requestedIndex;

        setRelatedSlideIndex(nextIndex);

        if (!viewport) {
          return;
        }

        const cards = Array.from(
          viewport.querySelectorAll<HTMLElement>(
            ".news-related-card"
          )
        );

        const target = cards[nextIndex];

        if (!target) {
          return;
        }

        viewport.scrollTo({
          left: target.offsetLeft,
          behavior: "smooth",
        });
      },
      [
        relatedArticles.length,
        relatedVisibleCount,
      ]
    );

  React.useEffect(() => {
    if (relatedSlideIndex > relatedMaxSlideIndex) {
      scrollToRelatedSlide(relatedMaxSlideIndex);
    }
  }, [
    relatedMaxSlideIndex,
    relatedSlideIndex,
    scrollToRelatedSlide,
  ]);

  React.useEffect(() => {
    if (
      relatedLoading ||
      relatedCarouselPaused ||
      relatedArticles.length <= relatedVisibleCount
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      scrollToRelatedSlide(relatedSlideIndex + 1);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [
    relatedLoading,
    relatedCarouselPaused,
    relatedArticles.length,
    relatedVisibleCount,
    relatedSlideIndex,
    scrollToRelatedSlide,
  ]);

  const submitClientRating =
    React.useCallback(
      async (value: number) => {
        if (
          ratingSubmitting ||
          value < 1 ||
          value > 5
        ) {
          return;
        }

        setRatingSubmitting(true);
        setRatingError("");

        try {
          const result =
            await publicNewsApi.submitRating(
              slug,
              value,
              visitorId
            );

          setRatingSummary(result);

          setArticle((previous) => {
            if (!previous) {
              return previous;
            }

            return {
              ...previous,
              customerRatingAverage:
                result.customerRatingAverage,
              customerRatingCount:
                result.customerRatingCount,
              overallRating:
                result.overallRating,
            } as NewsArticle;
          });
        } catch (ratingSubmitError) {
          setRatingError(
            getErrorMessage(
              ratingSubmitError,
              "Không thể gửi đánh giá. Vui lòng thử lại."
            )
          );
        } finally {
          setRatingSubmitting(false);
          setHoverRating(0);
        }
      },
      [
        ratingSubmitting,
        slug,
        visitorId,
      ]
    );

  React.useEffect(() => {
    if (!article) {
      return;
    }

    const seo = ((article as any).seo || {}) as Record<
      string,
      unknown
    >;

    const seoTitle =
      String(seo.seoTitle || "").trim() ||
      `${article.title} | King Jades`;

    const description =
      String(seo.metaDescription || "").trim() ||
      article.summary ||
      article.title;

    const robots =
      String(seo.robots || "index,follow").trim() ||
      "index,follow";

    const keywords =
      String(seo.keywords || "").trim();

    const canonical =
      String(seo.canonicalUrl || "").trim() ||
      window.location.href;

    const ogImageRaw =
      String(seo.openGraphImageUrl || "").trim() ||
      article.coverImageUrl;

    const ogImage = ogImageRaw
      ? absoluteAssetUrl(ogImageRaw)
      : "";

    document.title = seoTitle;

    upsertMeta(
      'meta[name="description"]',
      {
        name: "description",
        content: description,
      }
    );

    upsertMeta(
      'meta[name="robots"]',
      {
        name: "robots",
        content: robots,
      }
    );

    if (keywords) {
      upsertMeta(
        'meta[name="keywords"]',
        {
          name: "keywords",
          content: keywords,
        }
      );
    }

    upsertMeta(
      'meta[property="og:title"]',
      {
        property: "og:title",
        content: seoTitle,
      }
    );

    upsertMeta(
      'meta[property="og:description"]',
      {
        property: "og:description",
        content: description,
      }
    );

    upsertMeta(
      'meta[property="og:type"]',
      {
        property: "og:type",
        content: "article",
      }
    );

    if (ogImage) {
      upsertMeta(
        'meta[property="og:image"]',
        {
          property: "og:image",
          content: ogImage,
        }
      );
    }

    upsertCanonical(canonical);

    const schemaType =
      String(seo.schemaType || "BlogPosting").trim() ||
      "BlogPosting";

    const schema = {
      "@context": "https://schema.org",
      "@type": schemaType,
      headline: article.title,
      description,
      image: ogImage ? [ogImage] : undefined,
      datePublished:
        article.publishedAtUtc || undefined,
      dateModified:
        (article as any).updatedAtUtc || undefined,
      author: {
        "@type": "Person",
        name:
          article.authorName ||
          "King Jades",
      },
      publisher: {
        "@type": "Organization",
        name: "King Jades",
      },
      mainEntityOfPage: canonical,
      aggregateRating:
        Number(
          (article as any)
            .customerRatingCount || 0
        ) > 0
          ? {
              "@type": "AggregateRating",
              ratingValue:
                normalizeDisplayRating(
                  (article as any)
                    .customerRatingAverage
                ),
              ratingCount:
                Number(
                  (article as any)
                    .customerRatingCount
                ),
              bestRating: 5,
              worstRating: 1,
            }
          : undefined,
    };

    let script =
      document.head.querySelector<HTMLScriptElement>(
        "#kingjades-news-schema"
      );

    if (!script) {
      script = document.createElement("script");
      script.id = "kingjades-news-schema";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(schema);
  }, [article]);

  const typography = article
    ? getTypography(article)
    : null;

  const textStyle = article
    ? getTextStyle(article)
    : null;

  const articleStyleVariables = article &&
    typography &&
    textStyle
      ? ({
          "--kj-news-title-font":
            getFontStack(
              typography.titleFont,
              "serif"
            ),
          "--kj-news-heading-font":
            getFontStack(
              typography.headingFont,
              "serif"
            ),
          "--kj-news-body-font":
            getFontStack(
              typography.bodyFont,
              "sans"
            ),
          "--kj-news-letter-spacing":
            `${typography.letterSpacing}em`,
          "--kj-news-line-height":
            String(typography.lineHeight),
          "--kj-news-title-size":
            `${textStyle.titleSize}px`,
          "--kj-news-heading-size":
            `${textStyle.headingSize}px`,
          "--kj-news-body-size":
            `${textStyle.bodySize}px`,
          "--kj-news-title-color":
            textStyle.titleColor,
          "--kj-news-heading-color":
            textStyle.headingColor,
          "--kj-news-body-color":
            textStyle.bodyColor,
          "--kj-news-link-color":
            textStyle.linkColor,
          "--kj-news-title-align":
            textStyle.titleAlign,
          "--kj-news-body-align":
            textStyle.bodyAlign,
          "--kj-news-content-width":
            `${textStyle.contentWidth}px`,
        } as React.CSSProperties)
      : undefined;

  const sortedBlocks = React.useMemo(
    () =>
      article
        ? article.blocks
            .slice()
            .sort(
              (a, b) =>
                a.order - b.order
            )
        : [],
    [article]
  );

  const tableOfContents = React.useMemo(
    () =>
      buildTableOfContents(
        sortedBlocks
      ),
    [sortedBlocks]
  );

  const tocByBlockId = React.useMemo(
    () =>
      new Map(
        tableOfContents.map((item) => [
          item.blockId,
          item,
        ])
      ),
    [tableOfContents]
  );

  const scrollToSection = React.useCallback(
    (
      anchorId: string,
      updateHash = true
    ) => {
      const target =
        document.getElementById(
          anchorId
        );

      if (!target) {
        return;
      }

      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      if (updateHash) {
        window.history.replaceState(
          null,
          "",
          `#${anchorId}`
        );
      }
    },
    []
  );

  React.useEffect(() => {
    if (
      !article ||
      !window.location.hash
    ) {
      return;
    }

    const anchorId =
      decodeURIComponent(
        window.location.hash.slice(1)
      );

    if (!anchorId) {
      return;
    }

    const timer = window.setTimeout(
      () =>
        scrollToSection(
          anchorId,
          false
        ),
      120
    );

    return () =>
      window.clearTimeout(timer);
  }, [
    article,
    scrollToSection,
  ]);

  const adminRating = article
    ? getArticleRating(article)
    : 0;

  const customerRatingAverage =
    ratingSummary
      ? normalizeDisplayRating(
          ratingSummary.customerRatingAverage
        )
      : normalizeDisplayRating(
          (article as any)
            ?.customerRatingAverage
        );

  const customerRatingCount =
    ratingSummary
      ? Math.max(
          0,
          Number(
            ratingSummary.customerRatingCount
          ) || 0
        )
      : Math.max(
          0,
          Number(
            (article as any)
              ?.customerRatingCount
          ) || 0
        );

  const overallRating =
    ratingSummary
      ? normalizeDisplayRating(
          ratingSummary.overallRating
        )
      : normalizeDisplayRating(
          (article as any)
            ?.overallRating ||
            adminRating
        );

  const myRating =
    Math.max(
      0,
      Math.min(
        5,
        Number(
          ratingSummary?.myRating || 0
        ) || 0
      )
    );

  const interactiveRating =
    hoverRating || myRating;

  return (
    <div className="news-detail-page">
      <Header />

      <main>
        {loading ? (
          <div className="news-detail-state">
            Đang tải bài viết...
          </div>
        ) : !article ? (
          <div className="news-detail-state">
            <h1>
              Không thể mở bài viết
            </h1>

            <p>{error}</p>

            <Link to="/news">
              Quay lại tin tức
            </Link>
          </div>
        ) : (
          <article
            className="news-detail-article news-article-designed"
            style={articleStyleVariables}
          >
            <nav>
              <Link to="/">
                Trang chủ
              </Link>

              <span>/</span>

              <Link to="/news">
                Tin tức
              </Link>

              <span>/</span>

              <b>{article.category}</b>
            </nav>

            <header>
              <span>
                {article.category ||
                  "Tin tức"}
              </span>

              <h1>{article.title}</h1>

              {article.subtitle ? (
                <h2>
                  {article.subtitle}
                </h2>
              ) : null}

              <p>{article.summary}</p>

              {overallRating > 0 ||
              adminRating > 0 ||
              customerRatingCount > 0 ? (
                <div className="news-rating-overview">
                  {overallRating > 0 ? (
                    <div className="news-rating-overview__main">
                      <span className="news-rating-display__stars">
                        {[1, 2, 3, 4, 5].map(
                          (star) => (
                            <i
                              key={star}
                              className={
                                star <=
                                Math.round(
                                  overallRating
                                )
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
                        {overallRating.toFixed(1)}/5
                      </b>

                      <small>
                        Điểm tổng hợp
                      </small>
                    </div>
                  ) : null}

                  <div className="news-rating-overview__meta">
                    {adminRating > 0 ? (
                      <span>
                        King Jades:{" "}
                        <b>{adminRating}/5</b>
                      </span>
                    ) : null}

                    {customerRatingCount > 0 ? (
                      <span>
                        Khách hàng:{" "}
                        <b>
                          {customerRatingAverage.toFixed(
                            1
                          )}
                          /5
                        </b>{" "}
                        ({customerRatingCount} lượt)
                      </span>
                    ) : (
                      <span>
                        Chưa có đánh giá khách hàng
                      </span>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="news-detail-meta">
                <span>
                  {article.viewCount} lượt xem
                </span>
              </div>
            </header>

            {article.coverImageUrl ? (
              <img
                className="news-detail-cover"
                src={absoluteAssetUrl(
                  article.coverImageUrl
                )}
                alt={article.title}
              />
            ) : null}

            {tableOfContents.length ? (
              <nav
                className="news-toc"
                aria-label="Mục lục bài viết"
              >
                <div className="news-toc__header">
                  <div>
                    <span>
                      TABLE OF CONTENTS
                    </span>

                    <h2>Mục lục</h2>
                  </div>

                  <small>
                    {tableOfContents.length} mục
                  </small>
                </div>

                <ol className="news-toc__list">
                  {tableOfContents.map(
                    (item) => (
                      <li
                        key={item.blockId}
                        className={`level-${item.level}`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            scrollToSection(
                              item.anchorId
                            )
                          }
                        >
                          <span className="news-toc__number">
                            {item.number}
                          </span>

                          <span className="news-toc__text">
                            {item.text}
                          </span>
                        </button>
                      </li>
                    )
                  )}
                </ol>
              </nav>
            ) : null}

            <div className="news-detail-content">
              {sortedBlocks.map((block) => {
                const tocItem =
                  tocByBlockId.get(
                    block.id
                  );

                return (
                  <section
                    key={block.id}
                    id={
                      tocItem
                        ? tocItem.anchorId
                        : undefined
                    }
                    className={[
                      "news-article-section",
                      tocItem
                        ? "is-heading-section"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-toc-number={
                      tocItem?.number
                    }
                  >
                    {tocItem ? (
                      <span
                        className="news-section-number"
                        aria-hidden="true"
                      >
                        {tocItem.number}
                      </span>
                    ) : null}

                    <NewsBlockRenderer
                      block={block}
                    />
                  </section>
                );
              })}
            </div>

            <section
              className="news-client-rating-card"
              aria-labelledby="news-client-rating-title"
            >
              <div className="news-client-rating-card__copy">
                <span>
                  CẢM NHẬN BÀI VIẾT
                </span>

                <h2 id="news-client-rating-title">
                  Bạn đánh giá bài viết này thế nào?
                </h2>

                <p>
                  Admin có đánh giá biên tập riêng.
                  Khách hàng cũng có thể chấm từ
                  1–5 sao. Mỗi tài khoản hoặc trình
                  duyệt được lưu một đánh giá và có
                  thể thay đổi lại.
                </p>
              </div>

              <div className="news-client-rating-card__control">
                <div
                  className="news-client-rating-stars"
                  role="radiogroup"
                  aria-label="Đánh giá bài viết từ 1 đến 5 sao"
                  onMouseLeave={() =>
                    setHoverRating(0)
                  }
                >
                  {[1, 2, 3, 4, 5].map(
                    (star) => (
                      <button
                        key={star}
                        type="button"
                        role="radio"
                        aria-checked={
                          myRating === star
                        }
                        aria-label={`${star} sao`}
                        disabled={
                          ratingSubmitting ||
                          ratingLoading ||
                          ratingSummary?.canRate ===
                            false
                        }
                        className={
                          star <=
                          interactiveRating
                            ? "is-active"
                            : ""
                        }
                        onMouseEnter={() =>
                          setHoverRating(star)
                        }
                        onFocus={() =>
                          setHoverRating(star)
                        }
                        onBlur={() =>
                          setHoverRating(0)
                        }
                        onClick={() =>
                          submitClientRating(
                            star
                          )
                        }
                      >
                        ★
                      </button>
                    )
                  )}
                </div>

                <div className="news-client-rating-card__status">
                  {ratingSubmitting ? (
                    <strong>
                      Đang lưu đánh giá...
                    </strong>
                  ) : myRating > 0 ? (
                    <strong>
                      Bạn đã đánh giá {myRating}/5
                    </strong>
                  ) : (
                    <strong>
                      Chọn số sao của bạn
                    </strong>
                  )}

                  {customerRatingCount > 0 ? (
                    <span>
                      Trung bình khách hàng:{" "}
                      {customerRatingAverage.toFixed(
                        1
                      )}
                      /5 · {customerRatingCount} lượt
                    </span>
                  ) : (
                    <span>
                      Hãy là người đầu tiên đánh giá.
                    </span>
                  )}
                </div>
              </div>

              {ratingError ? (
                <div className="news-client-rating-error">
                  {ratingError}
                </div>
              ) : null}
            </section>

            {(relatedLoading || relatedArticles.length > 0) ? (
              <section
                className="news-related"
                aria-labelledby="news-related-title"
              >
                <div className="news-related__heading">
                  <div>
                    <span>ĐỌC TIẾP</span>
                    <h2 id="news-related-title">
                      Bài viết liên quan
                    </h2>
                  </div>

                  <div className="news-related__actions">
                    {relatedArticles.length > relatedVisibleCount ? (
                      <div
                        className="news-related__arrows"
                        aria-label="Điều khiển bài viết liên quan"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            scrollToRelatedSlide(
                              relatedSlideIndex - 1
                            )
                          }
                          aria-label="Xem bài viết trước"
                        >
                          ←
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            scrollToRelatedSlide(
                              relatedSlideIndex + 1
                            )
                          }
                          aria-label="Xem bài viết tiếp theo"
                        >
                          →
                        </button>
                      </div>
                    ) : null}

                    <Link
                      className="news-related__all"
                      to="/news"
                    >
                      Xem tất cả
                      <span>→</span>
                    </Link>
                  </div>
                </div>

                {relatedLoading ? (
                  <div
                    className="news-related__loading"
                    aria-live="polite"
                  >
                    Đang tải bài viết liên quan...
                  </div>
                ) : (
                  <div
                    ref={relatedCarouselRef}
                    className="news-related__viewport"
                    role="region"
                    aria-roledescription="carousel"
                    aria-label="Bài viết liên quan"
                    onMouseEnter={() =>
                      setRelatedCarouselPaused(true)
                    }
                    onMouseLeave={() =>
                      setRelatedCarouselPaused(false)
                    }
                    onFocusCapture={() =>
                      setRelatedCarouselPaused(true)
                    }
                    onBlurCapture={(event) => {
                      const nextFocus =
                        event.relatedTarget as Node | null;

                      if (
                        !nextFocus ||
                        !event.currentTarget.contains(nextFocus)
                      ) {
                        setRelatedCarouselPaused(false);
                      }
                    }}
                    onPointerDown={() =>
                      setRelatedCarouselPaused(true)
                    }
                    onPointerUp={() =>
                      setRelatedCarouselPaused(false)
                    }
                    onPointerCancel={() =>
                      setRelatedCarouselPaused(false)
                    }
                  >
                    <div className="news-related__track">
                    {relatedArticles.map((item) => (
                      <article
                        key={item.id}
                        className="news-related-card"
                      >
                        <Link
                          className="news-related-card__media"
                          to={`/news/${item.slug}`}
                          aria-label={`Đọc bài: ${item.title}`}
                        >
                          {item.coverImageUrl ? (
                            <img
                              src={absoluteAssetUrl(
                                item.coverImageUrl
                              )}
                              alt={item.title}
                            />
                          ) : (
                            <span className="news-related-card__placeholder">
                              KJ
                            </span>
                          )}

                          <span
                            className="news-related-card__frame"
                            aria-hidden="true"
                          />
                        </Link>

                        <div className="news-related-card__body">
                          <div className="news-related-card__meta">
                            <span>
                              {item.category || "Tin tức"}
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

                          {item.summary ? (
                            <p>{item.summary}</p>
                          ) : null}

                          <Link
                            className="news-related-card__read"
                            to={`/news/${item.slug}`}
                          >
                            Đọc bài
                            <span>→</span>
                          </Link>
                        </div>
                      </article>
                    ))}
                    </div>
                  </div>
                )}
              </section>
            ) : null}

            {article.tags.length ? (
              <footer className="news-tags">
                <b>Tags:</b>

                {article.tags.map(
                  (tag) => (
                    <span key={tag}>
                      {tag}
                    </span>
                  )
                )}
              </footer>
            ) : null}
          </article>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default NewsDetailPage;