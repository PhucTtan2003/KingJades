export type NotificationType =
    | "CONTACT_LEAD"
    | "CONTACT"
    | "NEWS_PUBLISHED"
    | "NEWS_SCHEDULED_PUBLISHED"
    | string;


export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  targetUrl: string;
  referenceId?: string;
  isRead: boolean;
  createdAtUtc: string;
}
