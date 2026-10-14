import apiClient from "../api/apiClient";
import type { NewsArticle, NewsLayout, NewsListItem, NewsPayload, NewsStatus, PagedResult } from "../../types";

export type NewsRatingSummary = {
  articleId: string;
  slug: string;
  adminRating: number;
  customerRatingAverage: number;
  customerRatingCount: number;
  overallRating: number;
  myRating: number;
  canRate: boolean;
};

const queryString = (query: { search?: string; category?: string; status?: NewsStatus | ""; page?: number; pageSize?: number }) => {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.category?.trim()) params.set("category", query.category.trim());
  if (query.status) params.set("status", query.status);
  params.set("page", String(query.page || 1));
  params.set("pageSize", String(query.pageSize || 10));
  return params.toString();
};

export const adminNewsApi = {
  async getPage(query: { search?: string; status?: NewsStatus | ""; page?: number; pageSize?: number }) {
    return (await apiClient.get<PagedResult<NewsListItem>>(`/api/admin/news?${queryString(query)}`)).data;
  },
  async getById(id: string) {
    return (await apiClient.get<NewsArticle>(`/api/admin/news/${id}`)).data;
  },
  async create(payload: NewsPayload) {
    return (await apiClient.post<NewsArticle>("/api/admin/news", payload)).data;
  },
  async update(id: string, payload: NewsPayload & { version: number }) {
    return (await apiClient.put<NewsArticle>(`/api/admin/news/${id}`, payload)).data;
  },
  async remove(id: string) {
    await apiClient.delete(`/api/admin/news/${id}`);
  },
  async publish(id: string, version: number) {
    return (await apiClient.post<NewsArticle>(`/api/admin/news/${id}/publish?version=${version}`)).data;
  },
  async unpublish(id: string, version: number) {
    return (await apiClient.post<NewsArticle>(`/api/admin/news/${id}/unpublish?version=${version}`)).data;
  },
  async schedule(id: string, version: number, scheduledAtUtc: string) {
    return (await apiClient.post<NewsArticle>(`/api/admin/news/${id}/schedule?version=${version}`, { scheduledAtUtc })).data;
  },
  async duplicate(id: string) {
    return (await apiClient.post<NewsArticle>(`/api/admin/news/${id}/duplicate`)).data;
  },
  async uploadImage(file: File) {
    const body =
      new FormData();

    body.append(
      "file",
      file,
      file.name
    );

    /*
     * KHÔNG truyền headers Content-Type ở đây.
     * apiClient interceptor sẽ nhận ra FormData và
     * xóa Content-Type JSON, sau đó browser tự thêm
     * multipart boundary chính xác.
     */
    const response =
      await apiClient.post<{
        url: string;
        message?: string;
      }>(
        "/api/admin/news/uploads/image",
        body
      );

    return response.data.url;
  },
  async getLayouts() {
    return (await apiClient.get<NewsLayout[]>("/api/admin/news-layouts")).data;
  },
  async createLayout(payload: { name: string; description: string; thumbnailUrl: string; isDefault: boolean; blocks: NewsArticle["blocks"] }) {
    return (await apiClient.post<NewsLayout>("/api/admin/news-layouts", payload)).data;
  },
  async removeLayout(id: string) {
    await apiClient.delete(`/api/admin/news-layouts/${id}`);
  },
};

export const publicNewsApi = {
  async getPage(query: { search?: string; category?: string; page?: number; pageSize?: number }) {
    return (await apiClient.get<PagedResult<NewsListItem>>(`/api/news?${queryString(query)}`)).data;
  },
  async getFeatured(take = 3) {
    return (await apiClient.get<NewsListItem[]>(`/api/news/featured?take=${take}`)).data;
  },
  async getBySlug(slug: string) {
    return (await apiClient.get<NewsArticle>(`/api/news/${encodeURIComponent(slug)}`)).data;
  },

  async getRating(
    slug: string,
    visitorId?: string
  ) {
    const params = new URLSearchParams();

    if (visitorId?.trim()) {
      params.set("visitorId", visitorId.trim());
    }

    const suffix = params.toString()
      ? `?${params.toString()}`
      : "";

    return (
      await apiClient.get<NewsRatingSummary>(
        `/api/news/${encodeURIComponent(slug)}/rating${suffix}`
      )
    ).data;
  },

  async submitRating(
    slug: string,
    value: number,
    visitorId?: string
  ) {
    return (
      await apiClient.post<NewsRatingSummary>(
        `/api/news/${encodeURIComponent(slug)}/rating`,
        {
          value,
          visitorId: visitorId?.trim() || null,
        }
      )
    ).data;
  },
};
