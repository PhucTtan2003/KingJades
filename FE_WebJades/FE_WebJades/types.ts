export type NewsStatus = "Draft" | "Review" | "Scheduled" | "Published" | "Hidden" | "Archived";
export type NewsBlockType = "Heading" | "Text" | "Image" | "ImageText" | "Quote" | "Callout" | "Button" | "Video" | "Divider";

export type NewsBlock = {
  id: string;
  type: NewsBlockType;
  order: number;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  responsive: {
    hideOnDesktop: boolean;
    hideOnTablet: boolean;
    hideOnMobile: boolean;
    stackOnMobile: boolean;
  };
};

export type NewsSeo = {
  seoTitle: string;
  metaDescription: string;
  openGraphImageUrl?: string | null;
  canonicalUrl?: string | null;
};

export type NewsArticle = {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  summary: string;
  coverImageUrl: string;
  bannerImageUrl?: string | null;
  category: string;
  tags: string[];
  authorId: string;
  authorName: string;
  status: NewsStatus;
  isFeatured: boolean;
  showOnHomePage: boolean;
  publishedAtUtc?: string | null;
  scheduledAtUtc?: string | null;
  viewCount: number;
  blocks: NewsBlock[];
  seo: NewsSeo;
  version: number;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type NewsListItem = Pick<NewsArticle,
  "id" | "title" | "subtitle" | "slug" | "summary" | "coverImageUrl" |
  "category" | "authorName" | "status" | "isFeatured" | "showOnHomePage" |
  "publishedAtUtc" | "updatedAtUtc" | "viewCount" | "version"
>;

export type NewsPayload = {
  title: string;
  subtitle: string;
  slug?: string;
  summary: string;
  coverImageUrl: string;
  bannerImageUrl?: string | null;
  category: string;
  tags: string[];
  isFeatured: boolean;
  showOnHomePage: boolean;
  blocks: NewsBlock[];
  seo: NewsSeo;
};

export type PagedResult<T> = {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type NewsLayout = {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  isDefault: boolean;
  blocks: NewsBlock[];
  createdByName: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};
