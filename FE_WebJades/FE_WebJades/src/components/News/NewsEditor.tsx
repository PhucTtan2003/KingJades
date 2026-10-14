import React from "react";
import type {
  NewsArticle,
  NewsBlock,
  NewsBlockType,
  NewsLayout,
} from "../../../types";
import { adminNewsApi } from "../../api/newsApi";
import {
  articleToForm,
  createBlock,
  emptyEditorForm,
  formToPayload,
  getErrorMessage,
  makeId,
  type EditorForm,
} from "../../utils/utils";
import NewsBlockEditor from "./NewsBlockEditor";
import NewsBlockRenderer from "./NewsBlockRenderer";
import "../../styles/NewsEditor.css";
import "../../styles/NewsRating.css";
import "../../styles/NewsArticleStyle.css";
import "../../styles/NewsWordEditor.css";
import "../../styles/NewsEditorScroll.css";
import "../../styles/NewsEditorToolbox.css";

const blockOptions: Array<{
  type: NewsBlockType;
  label: string;
}> = [
  { type: "Heading", label: "Header / mục lục" },
  { type: "Text", label: "Văn bản" },
  { type: "Image", label: "Hình ảnh" },
  { type: "ImageText", label: "Ảnh + chữ" },
  { type: "Quote", label: "Trích dẫn" },
  { type: "Callout", label: "Nổi bật" },
  { type: "Button", label: "Nút CTA" },
  { type: "Video", label: "Video" },
  { type: "Divider", label: "Phân cách" },
];

type LayoutPreset = {
  id: string;
  name: string;
  description: string;
  blocks: NewsBlock[];
};

const cloneBlocks = (blocks: NewsBlock[]): NewsBlock[] =>
  blocks.map((block, index) => ({
    ...block,
    id: makeId(),
    order: index,
    content: { ...block.content },
    settings: { ...block.settings },
    responsive: { ...block.responsive },
  }));

const createPresetBlock = (
  type: NewsBlockType,
  order: number,
  content: Record<string, unknown> = {},
  settings: Record<string, unknown> = {}
): NewsBlock => {
  const block = createBlock(type);

  return {
    ...block,
    order,
    content: {
      ...block.content,
      ...content,
    },
    settings: {
      ...block.settings,
      ...settings,
    },
  };
};

const createBuiltInLayouts = (): LayoutPreset[] => [
  {
    id: "builtin-standard-article",
    name: "Bài viết tiêu chuẩn",
    description:
      "Bố cục cơ bản gồm tiêu đề, đoạn mở đầu, hình ảnh, nội dung và trích dẫn.",
    blocks: [
      createPresetBlock("Heading", 0, {
        text: "Giới thiệu nội dung",
        level: 2,
      }),
      createPresetBlock("Text", 1, {
        html: `
          <p>
            Nhập đoạn giới thiệu ngắn giúp người đọc hiểu
            chủ đề chính của bài viết.
          </p>
        `,
      }),
      createPresetBlock("Image", 2, {
        imageUrl: "",
        alt: "Hình ảnh minh họa",
        caption: "Chú thích hình ảnh",
      }),
      createPresetBlock("Heading", 3, {
        text: "Nội dung chi tiết",
        level: 2,
      }),
      createPresetBlock("Text", 4, {
        html: `
          <p>
            Trình bày nội dung chính của bài viết tại đây.
          </p>
          <p>
            Có thể chia nội dung thành nhiều đoạn để người
            đọc dễ theo dõi.
          </p>
        `,
      }),
      createPresetBlock("Quote", 5, {
        quote:
          "Một sản phẩm tinh tế bắt đầu từ sự thấu hiểu giá trị bên trong.",
        author: "King Jades",
      }),
    ],
  },
  {
    id: "builtin-image-story",
    name: "Hình ảnh kể chuyện",
    description:
      "Phù hợp cho bài giới thiệu sản phẩm, nguồn gốc hoặc câu chuyện thương hiệu.",
    blocks: [
      createPresetBlock(
        "Heading",
        0,
        {
          text: "Câu chuyện nổi bật",
          level: 2,
        },
        {
          textAlign: "center",
          padding: 12,
        }
      ),
      createPresetBlock("ImageText", 1, {
        imageUrl: "",
        alt: "Hình ảnh sản phẩm",
        title: "Vẻ đẹp trong từng đường nét",
        description:
          "Mô tả hình ảnh, câu chuyện sản phẩm hoặc giá trị mà sản phẩm mang lại.",
        imagePosition: "left",
      }),
      createPresetBlock("Text", 2, {
        html: `
          <p>
            Bổ sung nội dung để giải thích sâu hơn về câu
            chuyện, nguồn gốc hoặc ý nghĩa của sản phẩm.
          </p>
        `,
      }),
      createPresetBlock("Divider", 3),
      createPresetBlock("ImageText", 4, {
        imageUrl: "",
        alt: "Hình ảnh minh họa",
        title: "Giá trị và ý nghĩa",
        description:
          "Trình bày giá trị phong thủy, cách sử dụng hoặc cách bảo quản sản phẩm.",
        imagePosition: "right",
      }),
      createPresetBlock(
        "Button",
        5,
        {
          text: "Nhận tư vấn",
          url: "/contact",
          openInNewTab: false,
        },
        {
          textAlign: "center",
          padding: 16,
        }
      ),
    ],
  },
  {
    id: "builtin-promotion",
    name: "Bài viết quảng bá",
    description:
      "Dùng cho bộ sưu tập mới, sản phẩm nổi bật hoặc chương trình truyền thông.",
    blocks: [
      createPresetBlock(
        "Heading",
        0,
        {
          text: "Bộ sưu tập mới",
          level: 2,
        },
        {
          textAlign: "center",
          padding: 10,
        }
      ),
      createPresetBlock("Callout", 1, {
        title: "Thông tin nổi bật",
        text:
          "Giới thiệu thông điệp chính, ưu điểm hoặc giá trị nổi bật của sản phẩm.",
        tone: "success",
      }),
      createPresetBlock("Image", 2, {
        imageUrl: "",
        alt: "Hình ảnh bộ sưu tập",
        caption: "Bộ sưu tập King Jades",
      }),
      createPresetBlock("Heading", 3, {
        text: "Điểm nổi bật",
        level: 2,
      }),
      createPresetBlock("Text", 4, {
        html: `
          <ul>
            <li>Thiết kế tinh tế và sang trọng.</li>
            <li>Chất liệu được chọn lọc cẩn thận.</li>
            <li>Phù hợp làm quà tặng hoặc sử dụng cá nhân.</li>
          </ul>
        `,
      }),
      createPresetBlock(
        "Button",
        5,
        {
          text: "Xem bộ sưu tập",
          url: "/products",
          openInNewTab: false,
        },
        {
          textAlign: "center",
          padding: 18,
        }
      ),
    ],
  },
];

const normalizeArticleRating = (
  article: NewsArticle | null | undefined
) => {
  const value = Number(
    (article as NewsArticle & { rating?: number })?.rating ?? 0
  );

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    5,
    Math.max(0, Math.round(value))
  );

};

const normalizeCustomerRatingStats = (
  article: NewsArticle | null | undefined
) => {
  const raw = article as
    | (NewsArticle & {
        customerRatingAverage?: number;
        customerRatingCount?: number;
        overallRating?: number;
      })
    | null
    | undefined;

  const average = Number(
    raw?.customerRatingAverage ?? 0
  );

  const count = Number(
    raw?.customerRatingCount ?? 0
  );

  const overall = Number(
    raw?.overallRating ?? 0
  );

  return {
    average: Number.isFinite(average)
      ? Math.min(
          5,
          Math.max(0, average)
        )
      : 0,
    count: Number.isFinite(count)
      ? Math.max(0, count)
      : 0,
    overall: Number.isFinite(overall)
      ? Math.min(
          5,
          Math.max(0, overall)
        )
      : 0,
  };
};

type AdvancedNewsSeo = {
  focusKeyword: string;
  keywords: string;
  robots: string;
  schemaType: string;
};

type NewsTypographyForm = {
  titleFont: string;
  headingFont: string;
  bodyFont: string;
  letterSpacing: number;
  lineHeight: number;
};

type NewsTextStyleForm = {
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

const DEFAULT_ADVANCED_SEO: AdvancedNewsSeo = {
  focusKeyword: "",
  keywords: "",
  robots: "index,follow",
  schemaType: "BlogPosting",
};

const DEFAULT_TYPOGRAPHY: NewsTypographyForm = {
  titleFont: "Lora",
  headingFont: "Lora",
  bodyFont: "SVN-Gilroy",
  letterSpacing: 0.01,
  lineHeight: 1.8,
};

const DEFAULT_TEXT_STYLE: NewsTextStyleForm = {
  titleSize: 56,
  headingSize: 32,
  bodySize: 16,
  titleColor: "#142543",
  headingColor: "#142543",
  bodyColor: "#5f655f",
  linkColor: "#0b5d48",
  titleAlign: "center",
  bodyAlign: "left",
  contentWidth: 800,
};

const clampNumber = (
  value: unknown,
  min: number,
  max: number,
  fallback: number
) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
};

const normalizeAdvancedSeo = (
  article: NewsArticle | null | undefined
): AdvancedNewsSeo => {
  const seo = ((article as any)?.seo || {}) as Record<
    string,
    unknown
  >;

  return {
    focusKeyword:
      String(seo.focusKeyword || "").trim(),
    keywords:
      String(seo.keywords || "").trim(),
    robots:
      String(seo.robots || "index,follow").trim() ||
      "index,follow",
    schemaType:
      String(seo.schemaType || "BlogPosting").trim() ||
      "BlogPosting",
  };
};

const normalizeTypography = (
  article: NewsArticle | null | undefined
): NewsTypographyForm => {
  const value = ((article as any)?.typography || {}) as Record<
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

const normalizeTextStyle = (
  article: NewsArticle | null | undefined
): NewsTextStyleForm => {
  const value = ((article as any)?.textStyle || {}) as Record<
    string,
    unknown
  >;

  const normalizeTitleAlign = (
    input: unknown
  ): NewsTextStyleForm["titleAlign"] => {
    const normalized = String(input || "center");
    return normalized === "left" ||
      normalized === "right"
      ? normalized
      : "center";
  };

  const normalizeBodyAlign = (
    input: unknown
  ): NewsTextStyleForm["bodyAlign"] => {
    const normalized = String(input || "left");

    return normalized === "center" ||
      normalized === "right" ||
      normalized === "justify"
      ? normalized
      : "left";
  };

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
    titleAlign: normalizeTitleAlign(
      value.titleAlign
    ),
    bodyAlign: normalizeBodyAlign(
      value.bodyAlign
    ),
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
  const trimmed = font.trim();

  if (!trimmed) {
    return kind === "serif"
      ? '"Lora", Georgia, serif'
      : '"SVN-Gilroy", Arial, sans-serif';
  }

  const safeFont = trimmed.replace(/["']/g, "");

  return kind === "serif"
    ? `"${safeFont}", "Lora", Georgia, serif`
    : `"${safeFont}", "SVN-Gilroy", Arial, sans-serif`;
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

type Props = {
  articleId?: string | null;
  onClose: () => void;
  onSaved: (article: NewsArticle) => void;
};

const NewsEditor: React.FC<Props> = ({
  articleId,
  onClose,
  onSaved,
}) => {
  const workspaceRef =
    React.useRef<HTMLDivElement | null>(null);

  const mainScrollRef =
    React.useRef<HTMLElement | null>(null);

  const [form, setForm] = React.useState<EditorForm>(
    emptyEditorForm()
  );

  const [id, setId] = React.useState<string | null>(
    articleId || null
  );

  const [status, setStatus] = React.useState("Draft");

  const [layouts, setLayouts] = React.useState<NewsLayout[]>(
    []
  );

  const builtInLayouts = React.useMemo(
    () => createBuiltInLayouts(),
    []
  );

  const [device, setDevice] = React.useState<
    "desktop" | "mobile"
  >("desktop");

  /*
   * Toolbox trái được tách khỏi grid chính.
   * Mặc định đóng để vùng soạn thảo rộng và gọn hơn.
   */
  const [isToolboxOpen, setIsToolboxOpen] =
    React.useState(false);

  /*
   * Toolbox nổi có thể kéo lên / xuống theo trục Y.
   * Có thêm chế độ thu gọn để không che vùng soạn thảo.
   */
  const toolboxRef =
    React.useRef<HTMLElement | null>(null);

  const toolboxDragRef =
    React.useRef<{
      pointerId: number;
      startY: number;
      startTop: number;
    } | null>(null);

  const [toolboxTop, setToolboxTop] =
    React.useState(110);

  const [isToolboxMinimized, setIsToolboxMinimized] =
    React.useState(false);

  const clampToolboxTop = React.useCallback(
    (nextTop: number) => {
      const viewportHeight =
        window.innerHeight || 900;

      const viewportWidth =
        window.innerWidth || 1440;

      const minTop =
        viewportWidth <= 700
          ? 68
          : viewportWidth <= 1180
            ? 76
            : 88;

      const estimatedHeight =
        toolboxRef.current?.offsetHeight ||
        Math.min(
          620,
          Math.round(viewportHeight * 0.68)
        );

      const maxTop = Math.max(
        minTop,
        viewportHeight - estimatedHeight - 16
      );

      return Math.min(
        maxTop,
        Math.max(minTop, nextTop)
      );
    },
    []
  );

  const nudgeToolbox = React.useCallback(
    (delta: number) => {
      setToolboxTop((current) =>
        clampToolboxTop(current + delta)
      );
    },
    [clampToolboxTop]
  );

  const beginToolboxDrag = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    toolboxDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startTop: toolboxTop,
    };

    document.body.style.userSelect = "none";
  };

  const moveToolboxDrag = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    const drag = toolboxDragRef.current;

    if (
      !drag ||
      drag.pointerId !== event.pointerId
    ) {
      return;
    }

    event.preventDefault();

    setToolboxTop(
      clampToolboxTop(
        drag.startTop +
          event.clientY -
          drag.startY
      )
    );
  };

  const endToolboxDrag = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    const drag = toolboxDragRef.current;

    if (
      drag &&
      drag.pointerId === event.pointerId
    ) {
      try {
        event.currentTarget.releasePointerCapture(
          event.pointerId
        );
      } catch {
        // Pointer capture có thể đã được browser tự giải phóng.
      }
    }

    toolboxDragRef.current = null;
    document.body.style.userSelect = "";
  };

  const [scheduleValue, setScheduleValue] =
    React.useState("");

  const [loading, setLoading] = React.useState(
    Boolean(articleId)
  );

  const [saving, setSaving] = React.useState(false);
  const [coverUploading, setCoverUploading] =
    React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [rating, setRating] = React.useState(0);

  const [
    customerRatingAverage,
    setCustomerRatingAverage,
  ] = React.useState(0);

  const [
    customerRatingCount,
    setCustomerRatingCount,
  ] = React.useState(0);

  const [
    overallRating,
    setOverallRating,
  ] = React.useState(0);

  const [advancedSeo, setAdvancedSeo] =
    React.useState<AdvancedNewsSeo>({
      ...DEFAULT_ADVANCED_SEO,
    });

  const [typography, setTypography] =
    React.useState<NewsTypographyForm>({
      ...DEFAULT_TYPOGRAPHY,
    });

  const [textStyle, setTextStyle] =
    React.useState<NewsTextStyleForm>({
      ...DEFAULT_TEXT_STYLE,
    });

  // Drag & drop block trực tiếp trong Live Preview.
  const [draggedBlockId, setDraggedBlockId] =
    React.useState<string | null>(null);

  const [dropTarget, setDropTarget] =
    React.useState<{
      index: number;
      position: "before" | "after";
    } | null>(null);

  React.useEffect(() => {
    const handleToolboxEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setIsToolboxOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleToolboxEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleToolboxEscape
      );
    };
  }, []);

  React.useEffect(() => {
    const keepToolboxInsideViewport = () => {
      setToolboxTop((current) =>
        clampToolboxTop(current)
      );
    };

    window.addEventListener(
      "resize",
      keepToolboxInsideViewport
    );

    return () => {
      window.removeEventListener(
        "resize",
        keepToolboxInsideViewport
      );

      document.body.style.userSelect = "";
    };
  }, [clampToolboxTop]);

  React.useEffect(() => {
    if (!isToolboxOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(
      () => {
        setToolboxTop((current) =>
          clampToolboxTop(current)
        );
      }
    );

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [
    isToolboxOpen,
    isToolboxMinimized,
    clampToolboxTop,
  ]);

  React.useEffect(() => {
    const updateWorkspaceHeight = () => {
      const workspace =
        workspaceRef.current;

      if (!workspace) {
        return;
      }

      const top =
        workspace.getBoundingClientRect().top;

      const availableHeight =
        Math.max(
          500,
          window.innerHeight -
            top -
            14
        );

      workspace.style.setProperty(
        "--news-workspace-height",
        `${availableHeight}px`
      );
    };

    const frame =
      window.requestAnimationFrame(
        updateWorkspaceHeight
      );

    window.addEventListener(
      "resize",
      updateWorkspaceHeight
    );

    return () => {
      window.cancelAnimationFrame(
        frame
      );

      window.removeEventListener(
        "resize",
        updateWorkspaceHeight
      );
    };
  }, []);

  const scrollEditorToTop = () => {
    mainScrollRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const scrollEditorToBottom = () => {
    const element =
      mainScrollRef.current;

    if (!element) {
      return;
    }

    element.scrollTo({
      top: element.scrollHeight,
      behavior: "smooth",
    });
  };

  React.useEffect(() => {
    let mounted = true;

    const loadEditorData = async () => {
      setLoading(true);
      setError("");

      try {
        try {
          const layoutData =
            await adminNewsApi.getLayouts();

          if (mounted) {
            setLayouts(
              Array.isArray(layoutData)
                ? layoutData
                : []
            );
          }
        } catch (layoutError) {
          if (mounted) {
            setLayouts([]);
            setError(
              getErrorMessage(
                layoutError,
                "Không tải được layout đã lưu. Bạn vẫn có thể dùng 3 layout có sẵn."
              )
            );
          }
        }

        if (articleId) {
          const article =
            await adminNewsApi.getById(articleId);

          if (mounted) {
            setId(article.id);
            setStatus(article.status);
            setForm(articleToForm(article));
            setRating(normalizeArticleRating(article));

            const customerStats =
              normalizeCustomerRatingStats(article);

            setCustomerRatingAverage(
              customerStats.average
            );
            setCustomerRatingCount(
              customerStats.count
            );
            setOverallRating(
              customerStats.overall
            );
            setAdvancedSeo(normalizeAdvancedSeo(article));
            setTypography(normalizeTypography(article));
            setTextStyle(normalizeTextStyle(article));
          }
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            getErrorMessage(
              loadError,
              "Không tải được bài viết."
            )
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadEditorData();

    return () => {
      mounted = false;
    };
  }, [articleId]);

  const update = <K extends keyof EditorForm>(
    key: K,
    value: EditorForm[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const normalized = (
    blocks: NewsBlock[]
  ): NewsBlock[] =>
    blocks.map((block, index) => ({
      ...block,
      order: index,
    }));

  const addBlock = (type: NewsBlockType) => {
    update(
      "blocks",
      normalized([
        ...form.blocks,
        createBlock(type),
      ])
    );
  };

  const changeBlock = (
    index: number,
    next: NewsBlock
  ) => {
    update(
      "blocks",
      form.blocks.map((block, blockIndex) =>
        blockIndex === index
          ? {
              ...next,
              order: blockIndex,
            }
          : block
      )
    );
  };

  const moveBlock = (
    index: number,
    direction: -1 | 1
  ) => {
    const target = index + direction;

    if (
      target < 0 ||
      target >= form.blocks.length
    ) {
      return;
    }

    const next = [...form.blocks];

    [next[index], next[target]] = [
      next[target],
      next[index],
    ];

    update("blocks", normalized(next));
  };

  const getDropPosition = (
    event: React.DragEvent<HTMLElement>
  ): "before" | "after" => {
    const rect =
      event.currentTarget.getBoundingClientRect();

    const middleY =
      rect.top + rect.height / 2;

    return event.clientY < middleY
      ? "before"
      : "after";
  };

  const resetPreviewDrag = () => {
    setDraggedBlockId(null);
    setDropTarget(null);
  };

  const moveBlockByDrop = (
    blockId: string,
    targetIndex: number,
    position: "before" | "after"
  ) => {
    setForm((previous) => {
      const sourceIndex =
        previous.blocks.findIndex(
          (block) => block.id === blockId
        );

      if (
        sourceIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= previous.blocks.length
      ) {
        return previous;
      }

      const nextBlocks = [
        ...previous.blocks,
      ];

      let insertionIndex =
        targetIndex +
        (position === "after" ? 1 : 0);

      const [movedBlock] =
        nextBlocks.splice(sourceIndex, 1);

      // Sau khi lấy block ra, các vị trí phía sau bị lùi 1.
      if (sourceIndex < insertionIndex) {
        insertionIndex -= 1;
      }

      insertionIndex = Math.max(
        0,
        Math.min(
          insertionIndex,
          nextBlocks.length
        )
      );

      nextBlocks.splice(
        insertionIndex,
        0,
        movedBlock
      );

      return {
        ...previous,
        blocks: nextBlocks.map(
          (block, index) => ({
            ...block,
            order: index,
          })
        ),
      };
    });
  };

  const duplicateBlock = (index: number) => {
    const source = form.blocks[index];

    const copy: NewsBlock = {
      ...source,
      id: makeId(),
      content: { ...source.content },
      settings: { ...source.settings },
      responsive: { ...source.responsive },
    };

    const next = [...form.blocks];
    next.splice(index + 1, 0, copy);

    update("blocks", normalized(next));
  };

  const removeBlock = (index: number) => {
    if (
      !window.confirm(
        "Xóa block nội dung này?"
      )
    ) {
      return;
    }

    update(
      "blocks",
      normalized(
        form.blocks.filter(
          (_, blockIndex) =>
            blockIndex !== index
        )
      )
    );
  };


  const updateAdvancedSeo = <
    K extends keyof AdvancedNewsSeo
  >(
    key: K,
    value: AdvancedNewsSeo[K]
  ) => {
    setAdvancedSeo((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateTypography = <
    K extends keyof NewsTypographyForm
  >(
    key: K,
    value: NewsTypographyForm[K]
  ) => {
    setTypography((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateTextStyle = <
    K extends keyof NewsTextStyleForm
  >(
    key: K,
    value: NewsTextStyleForm[K]
  ) => {
    setTextStyle((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const applyKingJadesEditorialPreset = () => {
    setTypography({
      ...DEFAULT_TYPOGRAPHY,
    });

    setTextStyle({
      ...DEFAULT_TEXT_STYLE,
    });

    setMessage(
      "Đã áp dụng preset King Jades Editorial: Lora cho tiêu đề/heading và SVN-Gilroy cho nội dung."
    );
  };

  const seoAudit = React.useMemo(() => {
    const focus =
      advancedSeo.focusKeyword
        .trim()
        .toLowerCase();

    const seoTitle = form.seoTitle
      .trim()
      .toLowerCase();

    const meta = form.metaDescription
      .trim()
      .toLowerCase();

    const slug = form.slug
      .trim()
      .toLowerCase();

    const checks = [
      {
        label: "Có Focus Keyword",
        passed: Boolean(focus),
        points: 10,
      },
      {
        label: "SEO Title dài 30–60 ký tự",
        passed:
          form.seoTitle.trim().length >= 30 &&
          form.seoTitle.trim().length <= 60,
        points: 15,
      },
      {
        label: "Focus Keyword có trong SEO Title",
        passed:
          Boolean(focus) &&
          seoTitle.includes(focus),
        points: 15,
      },
      {
        label: "Meta Description dài 120–160 ký tự",
        passed:
          form.metaDescription.trim().length >= 120 &&
          form.metaDescription.trim().length <= 160,
        points: 15,
      },
      {
        label: "Focus Keyword có trong Meta Description",
        passed:
          Boolean(focus) &&
          meta.includes(focus),
        points: 15,
      },
      {
        label: "Focus Keyword có trong slug",
        passed:
          Boolean(focus) &&
          slug.includes(
            focus
              .replace(/\s+/g, "-")
          ),
        points: 10,
      },
      {
        label: "Có Canonical URL",
        passed: Boolean(
          form.canonicalUrl.trim()
        ),
        points: 5,
      },
      {
        label: "Có Open Graph Image",
        passed: Boolean(
          form.openGraphImageUrl.trim() ||
          form.coverImageUrl.trim()
        ),
        points: 5,
      },
      {
        label: "Robots cho phép index",
        passed:
          advancedSeo.robots
            .toLowerCase()
            .includes("index") &&
          !advancedSeo.robots
            .toLowerCase()
            .includes("noindex"),
        points: 5,
      },
      {
        label: "Schema bài viết được thiết lập",
        passed: Boolean(
          advancedSeo.schemaType.trim()
        ),
        points: 5,
      },
    ];

    const score = checks.reduce(
      (total, item) =>
        total +
        (item.passed ? item.points : 0),
      0
    );

    return {
      score,
      checks,
    };
  }, [
    advancedSeo,
    form.canonicalUrl,
    form.coverImageUrl,
    form.metaDescription,
    form.openGraphImageUrl,
    form.seoTitle,
    form.slug,
  ]);

  const previewSortedBlocks = React.useMemo(
    () =>
      form.blocks
        .slice()
        .sort(
          (a, b) =>
            a.order - b.order
        ),
    [form.blocks]
  );

  const previewTableOfContents =
    React.useMemo(
      () =>
        buildTableOfContents(
          previewSortedBlocks
        ),
      [previewSortedBlocks]
    );

  const previewTocByBlockId =
    React.useMemo(
      () =>
        new Map(
          previewTableOfContents.map(
            (item) => [
              item.blockId,
              item,
            ]
          )
        ),
      [previewTableOfContents]
    );

  const scrollPreviewToSection = (
    anchorId: string
  ) => {
    const previewFrame =
      document.querySelector(
        ".news-preview-frame"
      );

    const target =
      previewFrame?.querySelector<HTMLElement>(
        `#preview-${anchorId}`
      );

    target?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const articleStyleVariables =
    React.useMemo(
      () =>
        ({
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
        }) as React.CSSProperties,
      [typography, textStyle]
    );

  const validate = () => {
    if (!form.title.trim()) {
      return "Vui lòng nhập tiêu đề.";
    }

    if (!form.coverImageUrl.trim()) {
      return "Vui lòng upload ảnh đại diện.";
    }

    return "";
  };

  const save = async () => {
    const validation = validate();

    if (validation) {
      setError(validation);
      return null;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const basePayload =
        formToPayload(form) as any;

      const payload = {
        ...basePayload,
        rating,
        seo: {
          ...(basePayload.seo || {}),
          focusKeyword:
            advancedSeo.focusKeyword.trim(),
          keywords:
            advancedSeo.keywords.trim(),
          robots:
            advancedSeo.robots.trim() ||
            "index,follow",
          schemaType:
            advancedSeo.schemaType.trim() ||
            "BlogPosting",
        },
        typography: {
          ...typography,
        },
        textStyle: {
          ...textStyle,
        },
      } as any;

      const article = id
        ? await adminNewsApi.update(id, {
            ...payload,
            version: form.version,
          })
        : await adminNewsApi.create(payload);

      setId(article.id);
      setStatus(article.status);
      setForm(articleToForm(article));
      setRating(normalizeArticleRating(article));

      const savedCustomerStats =
        normalizeCustomerRatingStats(article);

      setCustomerRatingAverage(
        savedCustomerStats.average
      );
      setCustomerRatingCount(
        savedCustomerStats.count
      );
      setOverallRating(
        savedCustomerStats.overall
      );

      setAdvancedSeo(normalizeAdvancedSeo(article));
      setTypography(normalizeTypography(article));
      setTextStyle(normalizeTextStyle(article));

      setMessage("Đã lưu bài viết.");
      onSaved(article);

      return article;
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          "Không thể lưu bài viết."
        )
      );

      return null;
    } finally {
      setSaving(false);
    }
  };

  const runStateAction = async (
    action:
      | "publish"
      | "unpublish"
      | "schedule"
  ) => {
    const saved = await save();

    if (!saved) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      let article: NewsArticle;

      if (action === "publish") {
        article = await adminNewsApi.publish(
          saved.id,
          saved.version
        );
      } else if (action === "unpublish") {
        article = await adminNewsApi.unpublish(
          saved.id,
          saved.version
        );
      } else {
        if (!scheduleValue) {
          throw new Error(
            "Vui lòng chọn thời gian đăng."
          );
        }

        const scheduledDate =
          new Date(scheduleValue);

        if (
          Number.isNaN(
            scheduledDate.getTime()
          )
        ) {
          throw new Error(
            "Thời gian đăng không hợp lệ."
          );
        }

        article = await adminNewsApi.schedule(
          saved.id,
          saved.version,
          scheduledDate.toISOString()
        );
      }

      setStatus(article.status);
      setForm(articleToForm(article));
      setRating(normalizeArticleRating(article));

      const actionCustomerStats =
        normalizeCustomerRatingStats(article);

      setCustomerRatingAverage(
        actionCustomerStats.average
      );
      setCustomerRatingCount(
        actionCustomerStats.count
      );
      setOverallRating(
        actionCustomerStats.overall
      );

      setAdvancedSeo(normalizeAdvancedSeo(article));
      setTypography(normalizeTypography(article));
      setTextStyle(normalizeTextStyle(article));
      onSaved(article);

      setMessage(
        action === "publish"
          ? "Xuất bản thành công."
          : action === "unpublish"
            ? "Đã gỡ xuất bản."
            : "Đã lên lịch xuất bản."
      );
    } catch (actionError) {
      setError(
        getErrorMessage(
          actionError,
          "Không thể cập nhật trạng thái."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const uploadCover = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    setCoverUploading(true);
    setError("");
    setMessage("");

    try {
      const url =
        await adminNewsApi.uploadImage(file);

      setForm((previous) => ({
        ...previous,
        coverImageUrl: url,
        openGraphImageUrl:
          previous.openGraphImageUrl || url,
      }));
    } catch (uploadError) {
      setError(
        getErrorMessage(
          uploadError,
          "Upload ảnh thất bại."
        )
      );
    } finally {
      setCoverUploading(false);
    }
  };

  const saveLayout = async () => {
    if (!form.blocks.length) {
      setError(
        "Cần ít nhất một block để lưu layout."
      );
      return;
    }

    const name =
      window.prompt("Tên layout:");

    if (!name?.trim()) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const layout =
        await adminNewsApi.createLayout({
          name: name.trim(),
          description: `Tạo từ bài ${
            form.title || "chưa đặt tên"
          }`,
          thumbnailUrl:
            form.coverImageUrl,
          isDefault: false,
          blocks: cloneBlocks(
            form.blocks
          ),
        });

      setLayouts((previous) => [
        layout,
        ...previous,
      ]);

      setMessage("Đã lưu layout.");
    } catch (layoutError) {
      setError(
        getErrorMessage(
          layoutError,
          "Không lưu được layout."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const applyLayout = (
    layoutId: string
  ) => {
    if (!layoutId) {
      return;
    }

    const selectedLayout =
      builtInLayouts.find(
        (layout) =>
          layout.id === layoutId
      ) ??
      layouts.find(
        (layout) =>
          layout.id === layoutId
      );

    if (!selectedLayout) {
      setError(
        "Không tìm thấy layout đã chọn."
      );
      return;
    }

    const accepted =
      form.blocks.length === 0 ||
      window.confirm(
        "Áp dụng layout mới sẽ thay toàn bộ danh sách block hiện tại. Bạn có muốn tiếp tục?"
      );

    if (!accepted) {
      return;
    }

    update(
      "blocks",
      cloneBlocks(
        selectedLayout.blocks
      )
    );

    setError("");
    setMessage(
      `Đã áp dụng layout: ${selectedLayout.name}.`
    );
  };

  const getAssetUrl = (
    assetUrl: string
  ) => {
    if (!assetUrl) {
      return "";
    }

    if (
      assetUrl.startsWith("http://") ||
      assetUrl.startsWith("https://")
    ) {
      return assetUrl;
    }

    const apiUrl = (
      process.env.REACT_APP_API_URL ||
      ""
    ).replace(/\/+$/, "");

    return `${apiUrl}${
      assetUrl.startsWith("/")
        ? ""
        : "/"
    }${assetUrl}`;
  };

  if (loading) {
    return (
      <div className="news-loading">
        Đang tải trình biên tập...
      </div>
    );
  }

  return (
    <div
      className={`news-editor-page ${
        isToolboxOpen
          ? "is-toolbox-open"
          : "is-toolbox-closed"
      }`}
    >
      <header className="news-editor-topbar">
        <div>
          <button
            type="button"
            className="news-back"
            onClick={onClose}
          >
            ← Danh sách tin
          </button>

          <span>NEWS BUILDER</span>

          <h1>
            {id
              ? "Chỉnh sửa bài viết"
              : "Tạo bài viết mới"}
          </h1>
        </div>

        <div className="news-top-actions">
          <b
            className={`news-status status-${status}`}
          >
            {status}
          </b>

          <button
            type="button"
            onClick={saveLayout}
            disabled={saving}
          >
            Lưu layout
          </button>

          <button
            type="button"
            onClick={save}
            disabled={saving}
          >
            {saving
              ? "Đang lưu..."
              : "Lưu nháp"}
          </button>

          {status === "Published" ? (
            <button
              type="button"
              className="warning"
              onClick={() =>
                runStateAction(
                  "unpublish"
                )
              }
              disabled={saving}
            >
              Gỡ xuất bản
            </button>
          ) : (
            <button
              type="button"
              className="primary"
              onClick={() =>
                runStateAction(
                  "publish"
                )
              }
              disabled={saving}
            >
              Xuất bản
            </button>
          )}
        </div>
      </header>

      {message || error ? (
        <div
          className={`news-alert ${
            message
              ? "success"
              : "error"
          }`}
        >
          {message || error}
        </div>
      ) : null}


      <button
        type="button"
        className="news-toolbox-toggle"
        onClick={() =>
          setIsToolboxOpen(
            (previous) => !previous
          )
        }
        aria-expanded={isToolboxOpen}
        aria-controls="news-editor-toolbox"
        title={
          isToolboxOpen
            ? "Ẩn bảng công cụ"
            : "Hiện bảng công cụ"
        }
      >
        <span
          className="news-toolbox-toggle__icon"
          aria-hidden="true"
        >
          {isToolboxOpen ? "×" : "☰"}
        </span>

        <span>
          {isToolboxOpen
            ? "Ẩn công cụ"
            : "Công cụ"}
        </span>
      </button>

      {isToolboxOpen ? (
        <>
          <button
            type="button"
            className="news-toolbox-backdrop"
            aria-label="Đóng bảng công cụ"
            onClick={() =>
              setIsToolboxOpen(false)
            }
          />

          <aside
            ref={toolboxRef}
            id="news-editor-toolbox"
            className={[
              "news-editor-sidebar",
              "news-editor-toolbox",
              isToolboxMinimized
                ? "is-minimized"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label="Công cụ tạo bài viết"
            style={
              {
                "--news-toolbox-top":
                  `${toolboxTop}px`,
              } as React.CSSProperties
            }
          >
            <div className="news-toolbox-head">
              <div className="news-toolbox-head__copy">
                <span>CÔNG CỤ BÀI VIẾT</span>
                <strong>Block & bố cục</strong>
              </div>

              <div className="news-toolbox-head__actions">
                <button
                  type="button"
                  className="news-toolbox-nudge"
                  onClick={() => nudgeToolbox(-72)}
                  aria-label="Đưa bảng công cụ lên"
                  title="Đưa bảng công cụ lên"
                >
                  ↑
                </button>

                <button
                  type="button"
                  className="news-toolbox-drag-handle"
                  onPointerDown={beginToolboxDrag}
                  onPointerMove={moveToolboxDrag}
                  onPointerUp={endToolboxDrag}
                  onPointerCancel={endToolboxDrag}
                  aria-label="Kéo bảng công cụ lên hoặc xuống"
                  title="Giữ và kéo lên / xuống"
                >
                  <span aria-hidden="true">↕</span>
                  <small>Kéo</small>
                </button>

                <button
                  type="button"
                  className="news-toolbox-nudge"
                  onClick={() => nudgeToolbox(72)}
                  aria-label="Đưa bảng công cụ xuống"
                  title="Đưa bảng công cụ xuống"
                >
                  ↓
                </button>

                <button
                  type="button"
                  className="news-toolbox-minimize"
                  onClick={() =>
                    setIsToolboxMinimized(
                      (previous) => !previous
                    )
                  }
                  aria-label={
                    isToolboxMinimized
                      ? "Mở rộng bảng công cụ"
                      : "Thu gọn bảng công cụ"
                  }
                  title={
                    isToolboxMinimized
                      ? "Mở rộng"
                      : "Thu gọn"
                  }
                >
                  {isToolboxMinimized ? "□" : "—"}
                </button>

                <button
                  type="button"
                  className="news-toolbox-close"
                  onClick={() =>
                    setIsToolboxOpen(false)
                  }
                  aria-label="Ẩn bảng công cụ"
                  title="Ẩn bảng công cụ"
                >
                  ×
                </button>
              </div>
            </div>

          <section className="news-card">
            <strong className="news-label">
              THÊM BLOCK
            </strong>

            <div className="news-palette">
              {blockOptions.map(
                (item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() =>
                      addBlock(
                        item.type
                      )
                    }
                  >
                    {item.label}
                  </button>
                )
              )}
            </div>
          </section>

          <section className="news-card">
            <strong className="news-label">
              MẪU BỐ CỤC
            </strong>

            <select
              defaultValue=""
              onChange={(event) => {
                applyLayout(
                  event.currentTarget.value
                );

                event.currentTarget.value =
                  "";
              }}
            >
              <option value="">
                Chọn layout...
              </option>

              <optgroup label="Mẫu có sẵn">
                {builtInLayouts.map(
                  (layout) => (
                    <option
                      key={layout.id}
                      value={layout.id}
                    >
                      {layout.name}
                    </option>
                  )
                )}
              </optgroup>

              {layouts.length > 0 ? (
                <optgroup label="Mẫu đã lưu">
                  {layouts.map(
                    (layout) => (
                      <option
                        key={layout.id}
                        value={layout.id}
                      >
                        {layout.name}
                        {layout.isDefault
                          ? " — Mặc định"
                          : ""}
                      </option>
                    )
                  )}
                </optgroup>
              ) : null}
            </select>

            <div className="news-layout-scroll">
              {builtInLayouts.map(
                (layout, index) => (
                  <button
                    key={layout.id}
                    type="button"
                    className="news-layout-option"
                    onClick={() =>
                      applyLayout(
                        layout.id
                      )
                    }
                    title={
                      layout.description
                    }
                  >
                    <span className="news-layout-number">
                      {String(index + 1).padStart(
                        2,
                        "0"
                      )}
                    </span>

                    <span className="news-layout-information">
                      <strong>
                        {layout.name}
                      </strong>

                      <small>
                        {
                          layout.description
                        }
                      </small>

                      <em>
                        {
                          layout.blocks
                            .length
                        }{" "}
                        block
                      </em>
                    </span>
                  </button>
                )
              )}

              {layouts.length > 0 ? (
                <>
                  <div className="news-layout-divider">
                    Mẫu đã lưu
                  </div>

                  {layouts.map(
                    (layout, index) => (
                      <button
                        key={layout.id}
                        type="button"
                        className="news-layout-option saved"
                        onClick={() =>
                          applyLayout(
                            layout.id
                          )
                        }
                        title={
                          layout.description ||
                          "Layout đã lưu"
                        }
                      >
                        <span className="news-layout-number">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <span className="news-layout-information">
                          <strong>
                            {
                              layout.name
                            }
                            {layout.isDefault
                              ? " — Mặc định"
                              : ""}
                          </strong>

                          <small>
                            {layout.description ||
                              "Layout đã lưu"}
                          </small>

                          <em>
                            {
                              layout.blocks
                                .length
                            }{" "}
                            block
                          </em>
                        </span>
                      </button>
                    )
                  )}
                </>
              ) : null}
            </div>
          </section>

          <section className="news-card">
            <strong className="news-label">
              LÊN LỊCH
            </strong>

            <input
              type="datetime-local"
              value={scheduleValue}
              onChange={(event) =>
                setScheduleValue(
                  event.target.value
                )
              }
            />

            <button
              type="button"
              className="schedule"
              onClick={() =>
                runStateAction(
                  "schedule"
                )
              }
              disabled={saving}
            >
              Lưu và lên lịch
            </button>
          </section>
        
          </aside>
        </>
      ) : null}

      <div
        ref={workspaceRef}
        className="news-editor-layout news-editor-workspace-scroll"
      >
        <div className="news-editor-main-wrap">
          <main
            ref={mainScrollRef}
            className="news-editor-main"
          >
          <section className="news-card news-meta">
            <div className="news-form-grid two">
              <label>
                Tiêu đề chính *

                <input
                  value={form.title}
                  onChange={(event) =>
                    update(
                      "title",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Slug

                <input
                  value={form.slug}
                  onChange={(event) =>
                    update(
                      "slug",
                      event.target.value
                    )
                  }
                  placeholder="Để trống để tự tạo"
                />
              </label>
            </div>

            <label>
              Tiêu đề phụ

              <input
                value={form.subtitle}
                onChange={(event) =>
                  update(
                    "subtitle",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Mô tả ngắn

              <textarea
                rows={3}
                value={form.summary}
                onChange={(event) =>
                  update(
                    "summary",
                    event.target.value
                  )
                }
              />
            </label>

            <div className="news-form-grid two">
              <label>
                Danh mục

                <input
                  value={form.category}
                  onChange={(event) =>
                    update(
                      "category",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Tags

                <input
                  value={form.tagsText}
                  onChange={(event) =>
                    update(
                      "tagsText",
                      event.target.value
                    )
                  }
                  placeholder="Ngọc, Phong thủy"
                />
              </label>
            </div>

            <div className="news-cover-row">
              <label>
                Ảnh đại diện *

                <input
                  value={
                    form.coverImageUrl
                  }
                  onChange={(event) =>
                    update(
                      "coverImageUrl",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="news-upload">
                Upload

                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadCover}
                />

                <span>
                  {coverUploading
                    ? "Đang tải..."
                    : "Chọn ảnh"}
                </span>
              </label>
            </div>

            <div className="news-checks">
              <label>
                <input
                  type="checkbox"
                  checked={
                    form.isFeatured
                  }
                  onChange={(event) =>
                    update(
                      "isFeatured",
                      event.target.checked
                    )
                  }
                />{" "}
                Bài nổi bật
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={
                    form.showOnHomePage
                  }
                  onChange={(event) =>
                    update(
                      "showOnHomePage",
                      event.target.checked
                    )
                  }
                />{" "}
                Hiển thị trang chủ
              </label>
            </div>

            <div className="news-rating-editor">
              <div className="news-rating-editor__copy">
                <span className="news-label">
                  ĐÁNH GIÁ HIỂN THỊ
                </span>

                <strong>
                  Đánh giá biên tập của King Jades
                </strong>

                <small>
                  Admin chấm 0–5 sao tại đây. Khách hàng
                  ngoài website cũng có hệ thống đánh giá
                  riêng; hai nguồn được lưu tách biệt và
                  hiển thị cùng nhau.
                </small>

                <div className="news-rating-editor__client-summary">
                  {customerRatingCount > 0 ? (
                    <>
                      Khách hàng hiện tại:{" "}
                      <b>
                        {customerRatingAverage.toFixed(
                          1
                        )}
                        /5
                      </b>{" "}
                      · {customerRatingCount} lượt
                      {overallRating > 0 ? (
                        <>
                          {" "}
                          · Tổng hợp:{" "}
                          <b>
                            {overallRating.toFixed(
                              1
                            )}
                            /5
                          </b>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      Chưa có đánh giá từ khách hàng.
                    </>
                  )}
                </div>
              </div>

              <div className="news-rating-editor__control">
                <div
                  className="news-rating-editor__stars"
                  role="radiogroup"
                  aria-label="Đánh giá bài viết"
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={
                        star <= rating
                          ? "is-active"
                          : ""
                      }
                      onClick={() =>
                        setRating(star)
                      }
                      role="radio"
                      aria-checked={
                        rating === star
                      }
                      aria-label={`${star} sao`}
                      title={`${star} sao`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <div className="news-rating-editor__value">
                  <b>
                    {rating > 0
                      ? `${rating}/5`
                      : "Chưa chấm"}
                  </b>

                  {rating > 0 ? (
                    <button
                      type="button"
                      className="news-rating-editor__clear"
                      onClick={() => setRating(0)}
                    >
                      Xóa đánh giá
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="news-card">
            <div className="news-section-head">
              <div>
                <strong className="news-label">
                  NỘI DUNG
                </strong>

                <h2>
                  Danh sách block
                </h2>
              </div>

              <span>
                {form.blocks.length}{" "}
                block
              </span>
            </div>

            {!form.blocks.length ? (
              <div className="news-empty">
                Chọn block ở cột bên
                trái hoặc áp dụng một
                layout có sẵn.
              </div>
            ) : (
              <div className="news-block-list">
                {form.blocks.map(
                  (block, index) => (
                    <NewsBlockEditor
                      key={block.id}
                      block={block}
                      index={index}
                      total={
                        form.blocks.length
                      }
                      onChange={(
                        next
                      ) =>
                        changeBlock(
                          index,
                          next
                        )
                      }
                      onMove={(
                        direction
                      ) =>
                        moveBlock(
                          index,
                          direction
                        )
                      }
                      onDuplicate={() =>
                        duplicateBlock(
                          index
                        )
                      }
                      onRemove={() =>
                        removeBlock(
                          index
                        )
                      }
                    />
                  )
                )}
              </div>
            )}
          </section>

          <details
            className="news-card news-rankmath-card"
            open
          >
            <summary>
              <span>
                Rank Math-style SEO
              </span>

              <b
                className={`news-seo-score ${
                  seoAudit.score >= 80
                    ? "is-good"
                    : seoAudit.score >= 60
                      ? "is-medium"
                      : "is-low"
                }`}
              >
                {seoAudit.score}/100
              </b>
            </summary>

            <div className="news-form-stack">
              <div className="news-seo-intro">
                <div>
                  <strong>
                    Tối ưu bài viết trước khi xuất bản
                  </strong>

                  <small>
                    Đây là bộ kiểm tra Rank Math-style dành
                    riêng cho CMS King Jades, không phải điểm
                    chính thức của Google.
                  </small>
                </div>

                <div
                  className="news-seo-score-ring"
                  style={{
                    ["--score" as any]:
                      `${seoAudit.score}%`,
                  }}
                >
                  <b>{seoAudit.score}</b>
                </div>
              </div>

              <div className="news-form-grid two">
                <label>
                  Focus Keyword

                  <input
                    value={
                      advancedSeo.focusKeyword
                    }
                    onChange={(event) =>
                      updateAdvancedSeo(
                        "focusKeyword",
                        event.target.value
                      )
                    }
                    placeholder="Ví dụ: vòng ngọc phỉ thúy"
                  />
                </label>

                <label>
                  Keywords phụ

                  <input
                    value={advancedSeo.keywords}
                    onChange={(event) =>
                      updateAdvancedSeo(
                        "keywords",
                        event.target.value
                      )
                    }
                    placeholder="ngọc jade, vòng ngọc, king jades"
                  />
                </label>
              </div>

              <label>
                SEO Title

                <input
                  maxLength={60}
                  value={form.seoTitle}
                  onChange={(event) =>
                    update(
                      "seoTitle",
                      event.target.value
                    )
                  }
                />

                <small className="news-field-counter">
                  {form.seoTitle.length}/60
                </small>
              </label>

              <label>
                Meta Description

                <textarea
                  rows={4}
                  maxLength={160}
                  value={
                    form.metaDescription
                  }
                  onChange={(event) =>
                    update(
                      "metaDescription",
                      event.target.value
                    )
                  }
                />

                <small className="news-field-counter">
                  {form.metaDescription.length}/160
                </small>
              </label>

              <div className="news-form-grid two">
                <label>
                  Open Graph Image

                  <input
                    value={
                      form.openGraphImageUrl
                    }
                    onChange={(event) =>
                      update(
                        "openGraphImageUrl",
                        event.target.value
                      )
                    }
                    placeholder="Để trống sẽ dùng ảnh đại diện"
                  />
                </label>

                <label>
                  Canonical URL

                  <input
                    value={
                      form.canonicalUrl
                    }
                    onChange={(event) =>
                      update(
                        "canonicalUrl",
                        event.target.value
                      )
                    }
                    placeholder="https://kingjades.com/news/..."
                  />
                </label>
              </div>

              <div className="news-form-grid two">
                <label>
                  Robots

                  <select
                    value={advancedSeo.robots}
                    onChange={(event) =>
                      updateAdvancedSeo(
                        "robots",
                        event.target.value
                      )
                    }
                  >
                    <option value="index,follow">
                      index, follow
                    </option>
                    <option value="index,nofollow">
                      index, nofollow
                    </option>
                    <option value="noindex,follow">
                      noindex, follow
                    </option>
                    <option value="noindex,nofollow">
                      noindex, nofollow
                    </option>
                  </select>
                </label>

                <label>
                  Schema Type

                  <select
                    value={
                      advancedSeo.schemaType
                    }
                    onChange={(event) =>
                      updateAdvancedSeo(
                        "schemaType",
                        event.target.value
                      )
                    }
                  >
                    <option value="BlogPosting">
                      BlogPosting
                    </option>
                    <option value="NewsArticle">
                      NewsArticle
                    </option>
                    <option value="Article">
                      Article
                    </option>
                  </select>
                </label>
              </div>

              <div className="news-seo-checklist">
                {seoAudit.checks.map(
                  (item) => (
                    <div
                      key={item.label}
                      className={
                        item.passed
                          ? "is-pass"
                          : "is-pending"
                      }
                    >
                      <span>
                        {item.passed
                          ? "✓"
                          : "•"}
                      </span>

                      <p>{item.label}</p>

                      <small>
                        +{item.points}
                      </small>
                    </div>
                  )
                )}
              </div>
            </div>
          </details>

          <details
            className="news-card news-style-card"
            open
          >
            <summary>
              Typography Style
            </summary>

            <div className="news-form-stack">
              <div className="news-style-preset">
                <div>
                  <strong>
                    King Jades Editorial
                  </strong>

                  <small>
                    Lora cho tiêu đề/heading và SVN-Gilroy
                    cho nội dung dài.
                  </small>
                </div>

                <button
                  type="button"
                  onClick={
                    applyKingJadesEditorialPreset
                  }
                >
                  Áp dụng preset
                </button>
              </div>

              <div className="news-form-grid three">
                <label>
                  Title Font

                  <select
                    value={
                      typography.titleFont
                    }
                    onChange={(event) =>
                      updateTypography(
                        "titleFont",
                        event.target.value
                      )
                    }
                  >
                    <option value="Lora">
                      Lora
                    </option>
                    <option value="SVN-Gilroy">
                      SVN-Gilroy
                    </option>
                    <option value="Georgia">
                      Georgia
                    </option>
                    <option value="Arial">
                      Arial
                    </option>
                  </select>
                </label>

                <label>
                  Heading Font

                  <select
                    value={
                      typography.headingFont
                    }
                    onChange={(event) =>
                      updateTypography(
                        "headingFont",
                        event.target.value
                      )
                    }
                  >
                    <option value="Lora">
                      Lora
                    </option>
                    <option value="SVN-Gilroy">
                      SVN-Gilroy
                    </option>
                    <option value="Georgia">
                      Georgia
                    </option>
                    <option value="Arial">
                      Arial
                    </option>
                  </select>
                </label>

                <label>
                  Body Font

                  <select
                    value={
                      typography.bodyFont
                    }
                    onChange={(event) =>
                      updateTypography(
                        "bodyFont",
                        event.target.value
                      )
                    }
                  >
                    <option value="SVN-Gilroy">
                      SVN-Gilroy
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
              </div>

              <div className="news-form-grid two">
                <label>
                  Letter Spacing (em)

                  <input
                    type="number"
                    min="-0.05"
                    max="0.2"
                    step="0.01"
                    value={
                      typography.letterSpacing
                    }
                    onChange={(event) =>
                      updateTypography(
                        "letterSpacing",
                        clampNumber(
                          event.target.value,
                          -0.05,
                          0.2,
                          0.01
                        )
                      )
                    }
                  />
                </label>

                <label>
                  Line Height

                  <input
                    type="number"
                    min="1.2"
                    max="2.6"
                    step="0.1"
                    value={
                      typography.lineHeight
                    }
                    onChange={(event) =>
                      updateTypography(
                        "lineHeight",
                        clampNumber(
                          event.target.value,
                          1.2,
                          2.6,
                          1.8
                        )
                      )
                    }
                  />
                </label>
              </div>
            </div>
          </details>

          <details
            className="news-card news-style-card"
            open
          >
            <summary>
              Text Style
            </summary>

            <div className="news-form-stack">
              <div className="news-form-grid three">
                <label>
                  Title Size

                  <input
                    type="number"
                    min="28"
                    max="88"
                    value={textStyle.titleSize}
                    onChange={(event) =>
                      updateTextStyle(
                        "titleSize",
                        clampNumber(
                          event.target.value,
                          28,
                          88,
                          56
                        )
                      )
                    }
                  />
                </label>

                <label>
                  Heading Size

                  <input
                    type="number"
                    min="20"
                    max="56"
                    value={
                      textStyle.headingSize
                    }
                    onChange={(event) =>
                      updateTextStyle(
                        "headingSize",
                        clampNumber(
                          event.target.value,
                          20,
                          56,
                          32
                        )
                      )
                    }
                  />
                </label>

                <label>
                  Body Size

                  <input
                    type="number"
                    min="13"
                    max="24"
                    value={textStyle.bodySize}
                    onChange={(event) =>
                      updateTextStyle(
                        "bodySize",
                        clampNumber(
                          event.target.value,
                          13,
                          24,
                          16
                        )
                      )
                    }
                  />
                </label>
              </div>

              <div className="news-form-grid four news-color-grid">
                <label>
                  Title Color
                  <input
                    type="color"
                    value={
                      textStyle.titleColor
                    }
                    onChange={(event) =>
                      updateTextStyle(
                        "titleColor",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Heading Color
                  <input
                    type="color"
                    value={
                      textStyle.headingColor
                    }
                    onChange={(event) =>
                      updateTextStyle(
                        "headingColor",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Body Color
                  <input
                    type="color"
                    value={
                      textStyle.bodyColor
                    }
                    onChange={(event) =>
                      updateTextStyle(
                        "bodyColor",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Link Color
                  <input
                    type="color"
                    value={
                      textStyle.linkColor
                    }
                    onChange={(event) =>
                      updateTextStyle(
                        "linkColor",
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>

              <div className="news-form-grid three">
                <label>
                  Title Align

                  <select
                    value={
                      textStyle.titleAlign
                    }
                    onChange={(event) =>
                      updateTextStyle(
                        "titleAlign",
                        event.target
                          .value as NewsTextStyleForm["titleAlign"]
                      )
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

                <label>
                  Body Align

                  <select
                    value={
                      textStyle.bodyAlign
                    }
                    onChange={(event) =>
                      updateTextStyle(
                        "bodyAlign",
                        event.target
                          .value as NewsTextStyleForm["bodyAlign"]
                      )
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

                <label>
                  Content Width

                  <select
                    value={
                      textStyle.contentWidth
                    }
                    onChange={(event) =>
                      updateTextStyle(
                        "contentWidth",
                        Number(
                          event.target.value
                        )
                      )
                    }
                  >
                    <option value={680}>
                      680px — Hẹp
                    </option>
                    <option value={800}>
                      800px — Chuẩn blog
                    </option>
                    <option value={920}>
                      920px — Rộng
                    </option>
                    <option value={1040}>
                      1040px — Rất rộng
                    </option>
                  </select>
                </label>
              </div>
            </div>
          </details>
          </main>

          <div
            className="news-editor-scroll-rail"
            aria-label="Điều hướng nhanh vùng chỉnh sửa"
          >
            <button
              type="button"
              title="Lên đầu vùng chỉnh sửa"
              aria-label="Lên đầu vùng chỉnh sửa"
              onClick={scrollEditorToTop}
            >
              ↑
            </button>

            <span
              className="news-editor-scroll-rail__track"
              aria-hidden="true"
            />

            <button
              type="button"
              title="Xuống cuối vùng chỉnh sửa"
              aria-label="Xuống cuối vùng chỉnh sửa"
              onClick={scrollEditorToBottom}
            >
              ↓
            </button>
          </div>
        </div>

        <aside className="news-preview">
          <header>
            <strong>
              LIVE PREVIEW
            </strong>

            <div>
              <button
                type="button"
                className={
                  device === "desktop"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setDevice(
                    "desktop"
                  )
                }
              >
                Desktop
              </button>

              <button
                type="button"
                className={
                  device === "mobile"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setDevice(
                    "mobile"
                  )
                }
              >
                Mobile
              </button>
            </div>
          </header>

          <div
            className={`news-preview-frame ${device}`}
          >
            <article
              className="news-article-designed"
              style={articleStyleVariables}
            >
              {form.coverImageUrl ? (
                <img
                  className="news-preview-cover"
                  src={getAssetUrl(
                    form.coverImageUrl
                  )}
                  alt=""
                />
              ) : (
                <div className="news-preview-cover empty">
                  KJ NEWS
                </div>
              )}

              <div className="news-preview-title">
                <span>
                  {form.category ||
                    "Tin tức"}
                </span>

                <h1>
                  {form.title ||
                    "Tiêu đề bài viết"}
                </h1>

                <p>
                  {form.summary ||
                    "Mô tả ngắn..."}
                </p>

                {rating > 0 ? (
                  <div
                    className="news-preview-rating"
                    aria-label={`${rating} trên 5 sao`}
                  >
                    <span>
                      {[1, 2, 3, 4, 5].map(
                        (star) => (
                          <i
                            key={star}
                            className={
                              star <= rating
                                ? "is-active"
                                : ""
                            }
                          >
                            ★
                          </i>
                        )
                      )}
                    </span>

                    <b>{rating}/5</b>
                  </div>
                ) : null}
              </div>

              {previewTableOfContents.length ? (
                <nav
                  className="news-toc news-toc--preview"
                  aria-label="Mục lục xem trước"
                >
                  <div className="news-toc__header">
                    <div>
                      <span>
                        TABLE OF CONTENTS
                      </span>

                      <h2>Mục lục</h2>
                    </div>

                    <small>
                      {previewTableOfContents.length} mục
                    </small>
                  </div>

                  <ol className="news-toc__list">
                    {previewTableOfContents.map(
                      (item) => (
                        <li
                          key={item.blockId}
                          className={`level-${item.level}`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              scrollPreviewToSection(
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

              <div
                className={[
                  "news-preview-blocks",
                  draggedBlockId
                    ? "is-dragging"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {form.blocks.map(
                  (block, index) => {
                    const isDragging =
                      draggedBlockId ===
                      block.id;

                    const isDropTarget =
                      dropTarget?.index ===
                      index;

                    const dropClass =
                      isDropTarget
                        ? dropTarget.position ===
                          "before"
                          ? "drag-over-before"
                          : "drag-over-after"
                        : "";

                    return (
                      <div
                        key={block.id}
                        id={
                          previewTocByBlockId.get(
                            block.id
                          )
                            ? `preview-${
                                previewTocByBlockId.get(
                                  block.id
                                )!.anchorId
                              }`
                            : undefined
                        }
                        data-toc-number={
                          previewTocByBlockId.get(
                            block.id
                          )?.number
                        }
                        className={[
                          "news-preview-sortable-block",
                          previewTocByBlockId.get(
                            block.id
                          )
                            ? "is-heading-section"
                            : "",
                          isDragging
                            ? "dragging"
                            : "",
                          dropClass,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onDragOver={(
                          event
                        ) => {
                          event.preventDefault();

                          event.dataTransfer.dropEffect =
                            "move";

                          if (
                            draggedBlockId ===
                            block.id
                          ) {
                            setDropTarget(
                              null
                            );
                            return;
                          }

                          setDropTarget({
                            index,
                            position:
                              getDropPosition(
                                event
                              ),
                          });
                        }}
                        onDrop={(event) => {
                          event.preventDefault();

                          const sourceId =
                            draggedBlockId ||
                            event.dataTransfer.getData(
                              "application/x-king-jades-news-block"
                            ) ||
                            event.dataTransfer.getData(
                              "text/plain"
                            );

                          if (!sourceId) {
                            resetPreviewDrag();
                            return;
                          }

                          const position =
                            dropTarget?.index ===
                            index
                              ? dropTarget.position
                              : getDropPosition(
                                  event
                                );

                          moveBlockByDrop(
                            sourceId,
                            index,
                            position
                          );

                          resetPreviewDrag();
                        }}
                      >
                        <button
                          type="button"
                          className="news-preview-drag-handle"
                          draggable
                          onDragStart={(
                            event
                          ) => {
                            setDraggedBlockId(
                              block.id
                            );

                            setDropTarget(
                              null
                            );

                            event.dataTransfer.effectAllowed =
                              "move";

                            event.dataTransfer.setData(
                              "application/x-king-jades-news-block",
                              block.id
                            );

                            event.dataTransfer.setData(
                              "text/plain",
                              block.id
                            );
                          }}
                          onDragEnd={
                            resetPreviewDrag
                          }
                          onClick={(
                            event
                          ) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          aria-label={`Kéo để di chuyển block ${
                            index + 1
                          }`}
                          title="Giữ và kéo để đổi vị trí block"
                        >
                          <span
                            aria-hidden="true"
                          >
                            ⋮⋮
                          </span>

                          <small>
                            Block {index + 1}
                          </small>
                        </button>

                        <div className="news-preview-sortable-content">
                          {previewTocByBlockId.get(
                            block.id
                          ) ? (
                            <span
                              className="news-section-number"
                              aria-hidden="true"
                            >
                              {
                                previewTocByBlockId.get(
                                  block.id
                                )!.number
                              }
                            </span>
                          ) : null}

                          <NewsBlockRenderer
                            block={block}
                            device={device}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </article>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default NewsEditor;