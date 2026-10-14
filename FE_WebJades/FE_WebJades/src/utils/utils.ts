import type { NewsArticle, NewsBlock, NewsBlockType, NewsPayload, NewsStatus } from "../../types";

const API_ORIGIN = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

export const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const absoluteAssetUrl = (url?: string | null) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const formatDate = (value?: string | null) => {
  if (!value) return "Chưa xuất bản";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Không xác định"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

export const statusLabel: Record<NewsStatus, string> = {
  Draft: "Bản nháp",
  Review: "Chờ duyệt",
  Scheduled: "Đã lên lịch",
  Published: "Đã xuất bản",
  Hidden: "Đang ẩn",
  Archived: "Đã lưu trữ",
};

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  const anyError = error as { response?: { data?: { message?: string } }; message?: string };
  return anyError?.response?.data?.message || anyError?.message || fallback;
};

export const createBlock = (type: NewsBlockType): NewsBlock => {
  const common = {
    id: makeId(),
    type,
    order: 0,
    settings: { textAlign: "left", backgroundColor: "", padding: 0, borderRadius: 0 },
    responsive: { hideOnDesktop: false, hideOnTablet: false, hideOnMobile: false, stackOnMobile: true },
  };

  const contentByType: Record<NewsBlockType, Record<string, unknown>> = {
    Heading: { text: "Tiêu đề nội dung", level: 2 },
    Text: { html: "<p>Nhập nội dung bài viết tại đây...</p>" },
    Image: { imageUrl: "", alt: "", caption: "" },
    ImageText: { imageUrl: "", alt: "", title: "Tiêu đề nội dung", description: "Mô tả nội dung...", imagePosition: "left" },
    Quote: { quote: "Nội dung trích dẫn nổi bật", author: "" },
    Callout: { title: "Thông tin nổi bật", text: "Nhập nội dung cần nhấn mạnh.", tone: "info" },
    Button: { text: "Xem thêm", url: "/contact", openInNewTab: false },
    Video: { url: "", title: "" },
    Divider: {},
  };

  return { ...common, content: contentByType[type] };
};

export type EditorForm = {
  title: string;
  subtitle: string;
  slug: string;
  summary: string;
  coverImageUrl: string;
  bannerImageUrl: string;
  category: string;
  tagsText: string;
  isFeatured: boolean;
  showOnHomePage: boolean;
  blocks: NewsBlock[];
  seoTitle: string;
  metaDescription: string;
  openGraphImageUrl: string;
  canonicalUrl: string;
  version: number;
};

export const emptyEditorForm = (): EditorForm => ({
  title: "", subtitle: "", slug: "", summary: "", coverImageUrl: "", bannerImageUrl: "",
  category: "", tagsText: "", isFeatured: false, showOnHomePage: false, blocks: [],
  seoTitle: "", metaDescription: "", openGraphImageUrl: "", canonicalUrl: "", version: 1,
});

export const articleToForm = (article: NewsArticle): EditorForm => ({
  title: article.title || "",
  subtitle: article.subtitle || "",
  slug: article.slug || "",
  summary: article.summary || "",
  coverImageUrl: article.coverImageUrl || "",
  bannerImageUrl: article.bannerImageUrl || "",
  category: article.category || "",
  tagsText: (article.tags || []).join(", "),
  isFeatured: article.isFeatured,
  showOnHomePage: article.showOnHomePage,
  blocks: (article.blocks || []).slice().sort((a, b) => a.order - b.order),
  seoTitle: article.seo?.seoTitle || "",
  metaDescription: article.seo?.metaDescription || "",
  openGraphImageUrl: article.seo?.openGraphImageUrl || "",
  canonicalUrl: article.seo?.canonicalUrl || "",
  version: article.version,
});

export const formToPayload = (form: EditorForm): NewsPayload => ({
  title: form.title.trim(),
  subtitle: form.subtitle.trim(),
  slug: form.slug.trim() || undefined,
  summary: form.summary.trim(),
  coverImageUrl: form.coverImageUrl.trim(),
  bannerImageUrl: form.bannerImageUrl.trim() || null,
  category: form.category.trim(),
  tags: form.tagsText.split(",").map((x) => x.trim()).filter(Boolean),
  isFeatured: form.isFeatured,
  showOnHomePage: form.showOnHomePage,
  blocks: form.blocks.map((block, index) => ({ ...block, order: index })),
  seo: {
    seoTitle: form.seoTitle.trim(),
    metaDescription: form.metaDescription.trim(),
    openGraphImageUrl: form.openGraphImageUrl.trim() || null,
    canonicalUrl: form.canonicalUrl.trim() || null,
  },
});

export const sanitizeHtml = (value: string) => {
  if (!value || typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(value, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,form,input,textarea,button,link,meta").forEach((node) => node.remove());
  doc.body.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const attrValue = attr.value.trim().toLowerCase();
      if (name.startsWith("on") || name === "srcdoc" || ((name === "href" || name === "src") && attrValue.startsWith("javascript:"))) {
        node.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
};
