import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import apiClient from "../../api/apiClient";
import { notificationApi } from "../../api/notificationApi";
import { Notification } from "../../types/notification";

import "../../styles/NotificationBell.css";

const BellIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

export default function NotificationBell() {
  const navigate = useNavigate();

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const openRef = useRef(false);
  const syncingRef = useRef(false);
  const pendingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const processingRef = useRef(false);

  // =====================================================
  // 1. ĐỒNG BỘ THÔNG BÁO
  // =====================================================

  const refresh = useCallback(async () => {
    if (syncingRef.current) {
      pendingRef.current = true;
      return;
    }

    syncingRef.current = true;

    try {
      do {
        pendingRef.current = false;

        const shouldLoadList = openRef.current;

        if (shouldLoadList) {
          setLoading(true);
        }

        try {
          const [items, unread] = await Promise.all([
            shouldLoadList
              ? notificationApi.getAll()
              : Promise.resolve(null),
            notificationApi.getUnreadCount(),
          ]);

          setCount(unread);

          if (items !== null) {
            setNotifications(items);
          }

          setError("");
        } catch (err) {
          console.error(
            "Notification refresh error:",
            err
          );

          setError("Không thể đồng bộ thông báo.");
        } finally {
          setLoading(false);
        }
      } while (pendingRef.current);
    } finally {
      syncingRef.current = false;
    }
  }, []);

  // =====================================================
  // 2. GỘP CÁC TÍN HIỆU ĐẾN LIÊN TIẾP
  // Không giới hạn tốc độ tạo Notification ở Backend.
  // =====================================================

  const scheduleRefresh = useCallback(() => {
    if (timerRef.current !== null) {
      return;
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void refresh();
    }, 150);
  }, [refresh]);

  // =====================================================
  // 3. MỞ CHUÔNG
  // =====================================================

  useEffect(() => {
    openRef.current = open;

    if (open) {
      scheduleRefresh();
    }
  }, [open, scheduleRefresh]);

  // =====================================================
  // 4. POLLING DỰ PHÒNG
  // =====================================================

  useEffect(() => {
    void refresh();

    const polling = window.setInterval(() => {
      scheduleRefresh();
    }, 30000);

    const onFocus = () => {
      scheduleRefresh();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        scheduleRefresh();
      }
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);

    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    return () => {
      window.clearInterval(polling);

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);

      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, [refresh, scheduleRefresh]);

  // =====================================================
  // 5. LẤY JWT TỪ LOCALSTORAGE
  // FIX: KHÔNG GỌI API ĐỂ LẤY TOKEN
  // =====================================================

  const getAccessToken = useCallback((): string => {
    return localStorage.getItem("token")?.trim() || "";
  }, []);

  // =====================================================
  // 6. CHUYỂN ĐẾN ĐÚNG TRANG
  // =====================================================

  const goToTarget = (item: Notification) => {
    const type = (item.type || "").toUpperCase();

    if (
      type === "CONTACT_LEAD" ||
      type === "CONTACT"
    ) {
      const params = new URLSearchParams({
        tab: "contact",
        notificationOpen: `${item.id}-${Date.now()}`,
      });

      const leadId = item.referenceId?.trim();

      if (
        leadId &&
        /^[a-f0-9]{24}$/i.test(leadId)
      ) {
        params.set("leadId", leadId);
      } else {
        params.set("missingLead", "1");
      }

      navigate(
        `/admin-dashboard?${params.toString()}`
      );

      return;
    }

    if (
      type === "NEWS_PUBLISHED" ||
      type === "NEWS_SCHEDULED_PUBLISHED"
    ) {
      navigate("/admin-dashboard?tab=news");
      return;
    }

    navigate(
      item.targetUrl || "/admin-dashboard"
    );
  };

  // =====================================================
  // 7. ĐÁNH DẤU ĐÃ ĐỌC
  // =====================================================

  const handleClick = async (item: Notification) => {
    if (processingRef.current) {
      return;
    }

    processingRef.current = true;
    setBusyId(item.id);

    try {
      if (!item.isRead) {
        await notificationApi.markRead(item.id);

        setNotifications((previous) =>
          previous.map((current) =>
            current.id === item.id
              ? {
                  ...current,
                  isRead: true,
                }
              : current
          )
        );

        setCount((previous) =>
          Math.max(0, previous - 1)
        );
      }

      setOpen(false);

      goToTarget(item);

      scheduleRefresh();
    } catch (err) {
      console.error(
        "Mark notification read:",
        err
      );

      setError("Không thể đánh dấu đã đọc.");

      scheduleRefresh();
    } finally {
      processingRef.current = false;
      setBusyId(null);
    }
  };

  // =====================================================
  // 8. GIAO DIỆN CHUÔNG
  // =====================================================

  return (
    <div className="notification-wrapper">
      <button
        type="button"
        className="notification-button"
        aria-label="Thông báo"
        aria-expanded={open}
        onClick={() =>
          setOpen((previous) => !previous)
        }
      >
        <BellIcon />

        {count > 0 && (
          <span className="notification-count">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <h3>Thông báo</h3>

          {error && (
            <p className="notification-error">
              {error}
            </p>
          )}

          {loading ? (
            <p className="notification-empty">
              Đang tải thông báo...
            </p>
          ) : notifications.length === 0 ? (
            <p className="notification-empty">
              Không có thông báo
            </p>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={
                  item.isRead
                    ? "notification-item"
                    : "notification-item unread"
                }
                onClick={() =>
                  void handleClick(item)
                }
              >
                <strong>{item.title}</strong>

                <p>{item.message}</p>

                <div className="notification-item-footer">
                  {!item.isRead ? (
                    <button
                      type="button"
                      className="notification-read-button"
                      disabled={busyId !== null}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleClick(item);
                      }}
                    >
                      {busyId === item.id
                        ? "Đang xử lý..."
                        : "Đã đọc"}
                    </button>
                  ) : (
                    <span className="notification-read-status">
                      Đã đọc
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}