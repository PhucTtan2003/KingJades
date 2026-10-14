const DEFAULT_LOCAL_API_URL = "";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const isAbsoluteUrl = (value: string) => {
  return /^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:");
};

const getApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL?.trim();

  if (envUrl) {
    return trimTrailingSlash(envUrl);
  }

  if (process.env.NODE_ENV === "development") {
    return DEFAULT_LOCAL_API_URL;
  }

  if (typeof window !== "undefined") {
    return trimTrailingSlash(window.location.origin);
  }

  return "";
};

export const getImageUrl = (url?: string | null): string => {
  if (!url) return "";

  const value = String(url).trim();
  if (!value) return "";

  if (isAbsoluteUrl(value)) {
    return value;
  }

  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  const apiBaseUrl = getApiBaseUrl();

  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
};

export default getImageUrl;