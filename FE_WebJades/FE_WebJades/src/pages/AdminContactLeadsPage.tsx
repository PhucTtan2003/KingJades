import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import apiClient from "../api/apiClient";

import {
  ContactLead,
  ContactLeadStatus,
  contactApi,
} from "../api/contactapi";

import "../styles/AdminContactLeadsPage.css";

const TAKE = 50;

const statusOptions: {
  value: ContactLeadStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "Tất cả" },
  { value: "new", label: "Mới gửi" },
  { value: "contacted", label: "Đã liên hệ" },
  { value: "quoted", label: "Đã báo giá" },
  { value: "closed", label: "Đã chốt" },
  { value: "cancelled", label: "Không tiềm năng" },
];

const leadStatusOptions: {
  value: ContactLeadStatus;
  label: string;
}[] = [
  { value: "new", label: "Mới gửi" },
  { value: "contacted", label: "Đã liên hệ" },
  { value: "quoted", label: "Đã báo giá" },
  { value: "closed", label: "Đã chốt" },
  { value: "cancelled", label: "Không tiềm năng" },
];

const getStatusLabel = (status: string) =>
  leadStatusOptions.find(
    (item) => item.value === status
  )?.label || status;

const getStatusClass = (status: string) => {
  if (status === "new") return "aclp-status-badge--new";
  if (status === "contacted") return "aclp-status-badge--contacted";
  if (status === "quoted") return "aclp-status-badge--quoted";
  if (status === "closed") return "aclp-status-badge--closed";
  return "aclp-status-badge--cancelled";
};

const toLocalDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
};

const AdminContactLeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const selectedLeadId =
    searchParams.get("leadId")?.trim() || "";

  const openToken =
    searchParams.get("notificationOpen") || "";

  const missingLead =
    searchParams.get("missingLead") === "1";

  const [leads, setLeads] = useState<ContactLead[]>([]);

  const [selectedLead, setSelectedLead] =
    useState<ContactLead | null>(null);

  const [highlightLeadId, setHighlightLeadId] =
    useState("");

  const [loading, setLoading] = useState(false);

  const [selectedLoading, setSelectedLoading] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedError, setSelectedError] = useState("");

  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);

  const [status, setStatus] =
    useState<ContactLeadStatus | "all">("all");

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [noteById, setNoteById] =
    useState<Record<string, string>>({});

  const listRequestRef = useRef(0);

  const isFocusedView = Boolean(selectedLeadId);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / TAKE)),
    [total]
  );

  const currentPage = useMemo(
    () => Math.floor(skip / TAKE) + 1,
    [skip]
  );

  const visibleLeads = isFocusedView
    ? selectedLead
      ? [selectedLead]
      : []
    : leads;

  const displayLoading = isFocusedView
    ? selectedLoading
    : loading;

  const buildDateParams = () => {
    const fromUtc = fromDate
      ? new Date(`${fromDate}T00:00:00`).toISOString()
      : undefined;

    const toUtc = toDate
      ? new Date(`${toDate}T23:59:59`).toISOString()
      : undefined;

    return { fromUtc, toUtc };
  };

  // ==========================================
  // DANH SÁCH LIÊN HỆ THÔNG THƯỜNG
  // ==========================================
  const fetchLeads = async (nextSkip = 0) => {
    const request = ++listRequestRef.current;

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const { fromUtc, toUtc } = buildDateParams();

      const data = await contactApi.getAdminContactLeads({
        skip: nextSkip,
        take: TAKE,
        status,
        search: search.trim() || undefined,
        fromUtc,
        toUtc,
      });

      if (request !== listRequestRef.current) return;

      setLeads(data.leads || []);
      setTotal(data.total || 0);
      setSkip(nextSkip);
    } catch (err: any) {
      if (request !== listRequestRef.current) return;

      console.error("GET CONTACT LEADS ERROR:", err);

      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Không thể tải lịch sử liên hệ."
      );
    } finally {
      if (request === listRequestRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (selectedLeadId) {
      ++listRequestRef.current;
      return;
    }

    setSelectedLead(null);
    setSelectedError("");
    setHighlightLeadId("");

    void fetchLeads(0);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeadId, openToken]);

  // ==========================================
  // MỞ KHÁCH THEO ID TỪ CHUÔNG THÔNG BÁO
  // ==========================================
  useEffect(() => {
    if (!selectedLeadId) return;

    let cancelled = false;

    const openLead = async () => {
      setSelectedLoading(true);
      setSelectedError("");
      setSelectedLead(null);
      setHighlightLeadId("");

      if (!/^[a-f0-9]{24}$/i.test(selectedLeadId)) {
        setSelectedError("Mã liên hệ không hợp lệ.");
        setSelectedLoading(false);
        return;
      }

      try {
        const response = await apiClient.get<ContactLead>(
          `/api/admin/contact-leads/${encodeURIComponent(
            selectedLeadId
          )}`
        );

        if (cancelled) return;

        const lead = response.data;

        if (!lead?.id) {
          setSelectedError(
            "Không tìm thấy thông tin khách hàng."
          );
          return;
        }

        setSelectedLead(lead);
        setHighlightLeadId(lead.id);
      } catch (err: any) {
        if (cancelled) return;

        const responseStatus = err?.response?.status;

        if (responseStatus === 404) {
          setSelectedError(
            "Không tìm thấy liên hệ. Có thể dữ liệu đã bị xóa."
          );
        } else if (
          responseStatus === 401 ||
          responseStatus === 403
        ) {
          setSelectedError(
            "Bạn chưa đăng nhập hoặc không có quyền xem liên hệ."
          );
        } else {
          setSelectedError(
            "Không thể tải thông tin khách hàng."
          );
        }
      } finally {
        if (!cancelled) setSelectedLoading(false);
      }
    };

    void openLead();

    return () => {
      cancelled = true;
    };
  }, [selectedLeadId, openToken]);

  // ==========================================
  // CUỘN ĐẾN DÒNG KHÁCH VÀ TÔ VÀNG
  // ==========================================
  useEffect(() => {
    if (!highlightLeadId || displayLoading) return;

    const scrollTimer = window.setTimeout(() => {
      const row = document.getElementById(
        `contact-lead-${highlightLeadId}`
      );

      if (!row) return;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      row.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
        inline: "nearest",
      });
    }, 180);

    const clearTimer = window.setTimeout(() => {
      setHighlightLeadId("");
    }, 3500);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightLeadId, displayLoading, selectedLead]);

  const handleFilter = () => {
    void fetchLeads(0);
  };

  const handleViewAll = () => {
    setStatus("all");
    setSearch("");
    setFromDate("");
    setToDate("");
    setSkip(0);

    navigate("/admin-dashboard?tab=contact");
  };

  // ==========================================
  // CẬP NHẬT TRẠNG THÁI VÀ GHI CHÚ
  // ==========================================
  const handleUpdateStatus = async (
    lead: ContactLead,
    nextStatus: ContactLeadStatus
  ) => {
    try {
      setError("");
      setMessage("");

      const data = await contactApi.updateContactLeadStatus(
        lead.id,
        {
          status: nextStatus,
          internalNote:
            noteById[lead.id] ?? lead.internalNote ?? "",
        }
      );

      const updatedLead = data.lead as ContactLead;

      setLeads((previous) =>
        previous.map((item) =>
          item.id === updatedLead.id ? updatedLead : item
        )
      );

      setSelectedLead((previous) =>
        previous?.id === updatedLead.id
          ? updatedLead
          : previous
      );

      setMessage("Cập nhật trạng thái lead thành công.");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Không thể cập nhật trạng thái lead."
      );
    }
  };

  return (
    <div className="aclp-page">
      <style>{`
        @keyframes aclp-notification-flash {
          0%, 100% {
            background-color: #fff9e4;
          }
          25%, 75% {
            background-color: #f6cf63;
          }
          50% {
            background-color: #fff9e4;
          }
        }

        .aclp-table tbody tr.aclp-lead-highlight > td {
          animation:
            aclp-notification-flash 1s ease-in-out 2 !important;
          background-color: #fff4c2 !important;
          box-shadow:
            inset 0 2px 0 #c79b2b,
            inset 0 -2px 0 #c79b2b;
        }

        .aclp-table tbody tr.aclp-lead-highlight > td:first-child {
          box-shadow:
            inset 3px 0 0 #c79b2b,
            inset 0 2px 0 #c79b2b,
            inset 0 -2px 0 #c79b2b;
        }

        .aclp-table tbody tr.aclp-lead-highlight {
          scroll-margin-top: 120px;
        }

        @media (prefers-reduced-motion: reduce) {
          .aclp-table tbody tr.aclp-lead-highlight > td {
            animation: none !important;
          }
        }
      `}</style>

      <div className="aclp-container">
        <div className="aclp-hero-card">
          <span className="aclp-eyebrow">
            Contact Lead Management
          </span>

          <div className="aclp-hero-content">
            <div>
              <h1>Lịch sử liên hệ khách hàng</h1>

              <p>
                Theo dõi thông tin khách gửi form Contact,
                ngày gửi, sản phẩm quan tâm và trạng thái
                xử lý để Sale/Admin thống kê sau này.
              </p>
            </div>

            <div className="aclp-total-card">
              <span>
                {isFocusedView ? "Đang xem" : "Tổng lead"}
              </span>

              <strong>
                {isFocusedView
                  ? selectedLead ? 1 : 0
                  : total}
              </strong>
            </div>
          </div>
        </div>

        {isFocusedView && (
          <div className="aclp-alert aclp-focus-notice">
            <span>
              {selectedLoading
                ? "Đang mở liên hệ từ thông báo..."
                : selectedError ||
                  "Đang xem khách hàng được mở từ chuông thông báo."}
            </span>

            <button
              type="button"
              onClick={handleViewAll}
            >
              Xem tất cả liên hệ
            </button>
          </div>
        )}

        {!isFocusedView && missingLead && (
          <div className="aclp-alert aclp-alert--error">
            Thông báo cũ chưa có ID liên hệ nên không thể
            tự chọn chính xác khách hàng. Bạn có thể tìm
            khách trong danh sách bên dưới.
          </div>
        )}

        {!isFocusedView && (
          <section className="aclp-filter-card">
            <div className="aclp-filter-grid">
              <label className="aclp-field aclp-field--search">
                <span>Tìm kiếm</span>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Tên, SĐT, email, sản phẩm..."
                />
              </label>

              <label className="aclp-field">
                <span>Trạng thái</span>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as ContactLeadStatus | "all"
                    )
                  }
                >
                  {statusOptions.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="aclp-field">
                <span>Từ ngày</span>

                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) =>
                    setFromDate(event.target.value)
                  }
                />
              </label>

              <label className="aclp-field">
                <span>Đến ngày</span>

                <input
                  type="date"
                  value={toDate}
                  onChange={(event) =>
                    setToDate(event.target.value)
                  }
                />
              </label>

              <div className="aclp-filter-action">
                <button
                  type="button"
                  onClick={handleFilter}
                >
                  Lọc
                </button>
              </div>
            </div>
          </section>
        )}

        {message && (
          <div className="aclp-alert aclp-alert--success">
            {message}
          </div>
        )}

        {error && (
          <div className="aclp-alert aclp-alert--error">
            {error}
          </div>
        )}

        {selectedError && isFocusedView && (
          <div className="aclp-alert aclp-alert--error">
            {selectedError}
          </div>
        )}

        <section className="aclp-table-card">
          {displayLoading ? (
            <div className="aclp-empty-state">
              Đang tải lịch sử liên hệ...
            </div>
          ) : visibleLeads.length === 0 ? (
            <div className="aclp-empty-state">
              <h2>
                {isFocusedView
                  ? "Không tìm thấy liên hệ"
                  : "Chưa có lead"}
              </h2>

              <p>
                {isFocusedView
                  ? "Bạn có thể quay lại danh sách liên hệ để tìm thủ công."
                  : "Khi khách gửi form Contact, dữ liệu sẽ hiện ở đây."}
              </p>
            </div>
          ) : (
            <div className="aclp-table-wrap">
              <table className="aclp-table">
                <thead>
                  <tr>
                    <th>Ngày gửi</th>
                    <th>Thông tin khách</th>
                    <th>Nhu cầu</th>
                    <th>Sản phẩm</th>
                    <th>Nội dung</th>
                    <th>Trạng thái</th>
                    <th>Ghi chú nội bộ</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      id={`contact-lead-${lead.id}`}
                      className={
                        lead.id === highlightLeadId
                          ? "aclp-lead-highlight"
                          : undefined
                      }
                    >
                      <td className="aclp-date-cell">
                        <strong>
                          {toLocalDateTime(lead.createdAtUtc)}
                        </strong>

                        <p>
                          Nguồn: {lead.source || "contact_page"}
                        </p>
                      </td>

                      <td className="aclp-customer-cell">
                        <strong>{lead.fullName}</strong>

                        <a
                          href={`tel:${lead.phone}`}
                          className="aclp-phone-link"
                        >
                          {lead.phone}
                        </a>

                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="aclp-email-link"
                          >
                            {lead.email}
                          </a>
                        )}
                      </td>

                      <td>
                        <span className="aclp-need-badge">
                          {lead.need || "Tư vấn"}
                        </span>
                      </td>

                      <td>
                        {lead.productName ? (
                          <a
                            href={`/products/${lead.productSlug}`}
                            className="aclp-product-link"
                          >
                            {lead.productName}
                          </a>
                        ) : (
                          <span className="aclp-muted-text">
                            Không gắn sản phẩm
                          </span>
                        )}
                      </td>

                      <td className="aclp-message-cell">
                        {lead.message || "-"}
                      </td>

                      <td>
                        <span
                          className={`aclp-status-badge ${getStatusClass(
                            lead.status
                          )}`}
                        >
                          {getStatusLabel(lead.status)}
                        </span>

                        <select
                          value={lead.status}
                          onChange={(event) =>
                            handleUpdateStatus(
                              lead,
                              event.target.value as ContactLeadStatus
                            )
                          }
                          className="aclp-status-select"
                        >
                          {leadStatusOptions.map((item) => (
                            <option
                              key={item.value}
                              value={item.value}
                            >
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <textarea
                          value={
                            noteById[lead.id] ??
                            lead.internalNote ??
                            ""
                          }
                          onChange={(event) =>
                            setNoteById((previous) => ({
                              ...previous,
                              [lead.id]: event.target.value,
                            }))
                          }
                          rows={3}
                          className="aclp-note-input"
                          placeholder="Ghi chú tình trạng xử lý..."
                        />

                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(lead, lead.status)
                          }
                          className="aclp-save-note-btn"
                        >
                          Lưu ghi chú
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {!isFocusedView && (
          <div className="aclp-pagination">
            <span>
              Trang {currentPage}/{totalPages} · Hiển thị{" "}
              {leads.length}/{total} lead
            </span>

            <div className="aclp-pagination-actions">
              <button
                type="button"
                disabled={skip <= 0 || loading}
                onClick={() =>
                  fetchLeads(Math.max(0, skip - TAKE))
                }
              >
                Trước
              </button>

              <button
                type="button"
                disabled={skip + TAKE >= total || loading}
                onClick={() =>
                  fetchLeads(skip + TAKE)
                }
                className="aclp-next-btn"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminContactLeadsPage;