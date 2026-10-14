import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/apiClient";

import "../styles/AccountPage.css";

type AccountStatus =
  | "active"
  | "inactive"
  | string;

type AccountItem = {
  id: string;
  username: string;
  email: string;
  phone: string;
  roleId: number;
  role?: string;
  roleName?: string;
  status: AccountStatus;
};

type RoleOption = {
  roleId: number;
  role: string;
  roleName: string;
  description?: string;
  status?: string;
};

type FormMode =
  | "list"
  | "create"
  | "edit";

type AccountFormState = {
  username: string;
  email: string;
  phone: string;
  password: string;
  roleId: string;
  status: "active" | "inactive";
};

const emptyForm: AccountFormState = {
  username: "",
  email: "",
  phone: "",
  password: "",
  roleId: "2",
  status: "active",
};

const fallbackRoles: RoleOption[] = [
  {
    roleId: 1,
    role: "admin",
    roleName: "Admin",
  },
  {
    roleId: 2,
    role: "staff",
    roleName: "Staff",
  },
  {
    roleId: 3,
    role: "user",
    roleName: "User",
  },
];

const SearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      cx="11"
      cy="11"
      r="6.5"
    />
    <path d="m16 16 4 4" />
  </svg>
);

const PlusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M5 12h14M12 5v14" />
  </svg>
);

const ArrowIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M19 12H5" />
    <path d="m10 7-5 5 5 5" />
  </svg>
);

const UserIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="8"
      r="3.5"
    />
    <path d="M5 20c.6-4 3-6 7-6s6.4 2 7 6" />
  </svg>
);

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const LockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <rect
      x="5"
      y="10"
      width="14"
      height="10"
      rx="2"
    />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

const EditIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Z" />
    <path d="m13.5 7 3.5 3.5" />
  </svg>
);

const TrashIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M4.5 7h15M9 7V4.5h6V7M7 7l.8 12h8.4L17 7M10 10.5v5M14 10.5v5" />
  </svg>
);

const RefreshIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M4 7v5h5" />
    <path d="M5.4 16.5A8 8 0 1 0 6 6.2L4 8" />
  </svg>
);

const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

const AccountPage: React.FC = () => {
  const navigate = useNavigate();

  const [accounts, setAccounts] =
    useState<AccountItem[]>([]);
  const [roles, setRoles] =
    useState<RoleOption[]>(fallbackRoles);

  const [mode, setMode] =
    useState<FormMode>("list");
  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");
  const [submittedSearch, setSubmittedSearch] =
    useState("");

  const [form, setForm] =
    useState<AccountFormState>(emptyForm);

  const [pageLoading, setPageLoading] =
    useState(false);
  const [submitLoading, setSubmitLoading] =
    useState(false);
  const [
    actionLoadingId,
    setActionLoadingId,
  ] = useState<string | null>(null);

  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  const normalizeStatus = (
    value?: string
  ) => {
    return (value || "")
      .trim()
      .toLowerCase();
  };

  const isActive = (
    account: AccountItem
  ) => {
    return (
      normalizeStatus(account.status) ===
      "active"
    );
  };

  const stats = useMemo(() => {
    const total = accounts.length;

    const active = accounts.filter(
      isActive
    ).length;

    const inactive =
      total - active;

    const staff = accounts.filter(
      (item) => {
        const role = (
          item.roleName ||
          item.role ||
          ""
        )
          .trim()
          .toLowerCase();

        return (
          item.roleId === 2 ||
          role === "staff"
        );
      }
    ).length;

    return {
      total,
      active,
      inactive,
      staff,
    };
  }, [accounts]);

  const showSuccess = (
    text: string
  ) => {
    setMessage(text);
    setError("");
  };

  const showError = (
    text: string
  ) => {
    setError(text);
    setMessage("");
  };

  const loadAccounts = useCallback(
    async (keyword = "") => {
      setPageLoading(true);
      setError("");

      try {
        const query = keyword.trim();

        const url = query
          ? `/api/accounts?search=${encodeURIComponent(
              query
            )}`
          : "/api/accounts";

        const response =
          await apiClient.get<AccountItem[]>(
            url
          );

        setAccounts(
          Array.isArray(response.data)
            ? response.data
            : []
        );
      } catch (requestError: any) {
        showError(
          requestError?.response?.data
            ?.message ||
            "Không tải được danh sách tài khoản."
        );
      } finally {
        setPageLoading(false);
      }
    },
    []
  );

  const loadRoles = useCallback(
    async () => {
      try {
        const response =
          await apiClient.get<RoleOption[]>(
            "/api/accounts/roles"
          );

        const responseRoles =
          Array.isArray(response.data) &&
          response.data.length > 0
            ? response.data
            : fallbackRoles;

        setRoles(responseRoles);
      } catch {
        setRoles(fallbackRoles);
      }
    },
    []
  );

  useEffect(() => {
    loadRoles();
    loadAccounts("");
  }, [loadAccounts, loadRoles]);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement
    >
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMode("list");
  };

  const handleOpenCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMode("create");
    setMessage("");
    setError("");
  };

  const handleOpenEdit = (
    account: AccountItem
  ) => {
    setForm({
      username:
        account.username || "",
      email:
        account.email || "",
      phone:
        account.phone || "",
      password: "",
      roleId: String(
        account.roleId || 2
      ),
      status: isActive(account)
        ? "active"
        : "inactive",
    });

    setEditingId(account.id);
    setMode("edit");
    setMessage("");
    setError("");
  };

  const validateForm = () => {
    const username =
      form.username.trim();
    const email =
      form.email.trim();
    const phone =
      form.phone.trim();
    const password =
      form.password.trim();

    if (!username) {
      return "Tên đăng nhập không được để trống.";
    }

    if (!email) {
      return "Email không được để trống.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return "Email chưa đúng định dạng.";
    }

    if (!phone) {
      return "Số điện thoại không được để trống.";
    }

    if (
      !/^[0-9+]{9,15}$/.test(
        phone.replace(/\s+/g, "")
      )
    ) {
      return "Số điện thoại chưa đúng định dạng.";
    }

    if (
      mode === "create" &&
      !password
    ) {
      return "Mật khẩu không được để trống.";
    }

    if (
      password &&
      password.length < 6
    ) {
      return "Mật khẩu phải có ít nhất 6 ký tự.";
    }

    if (
      !Number.isFinite(
        Number(form.roleId)
      )
    ) {
      return "Vai trò chưa hợp lệ.";
    }

    return "";
  };

  const buildPayload = () => {
    const payload: {
      username: string;
      email: string;
      phone: string;
      password?: string;
      roleId: number;
      status: string;
    } = {
      username:
        form.username.trim(),
      email:
        form.email.trim(),
      phone:
        form.phone.trim(),
      roleId:
        Number(form.roleId),
      status:
        form.status,
    };

    if (
      mode === "create" ||
      form.password.trim()
    ) {
      payload.password =
        form.password.trim();
    }

    return payload;
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMessage("");
    setError("");

    const validationMessage =
      validateForm();

    if (validationMessage) {
      showError(validationMessage);
      return;
    }

    setSubmitLoading(true);

    try {
      const payload =
        buildPayload();

      if (
        mode === "edit" &&
        editingId
      ) {
        const response =
          await apiClient.put(
            `/api/accounts/${editingId}`,
            payload
          );

        showSuccess(
          response.data?.message ||
            "Cập nhật tài khoản thành công."
        );
      } else {
        const response =
          await apiClient.post(
            "/api/accounts",
            payload
          );

        showSuccess(
          response.data?.message ||
            "Tạo tài khoản thành công."
        );
      }

      resetForm();
      await loadAccounts(
        submittedSearch
      );
    } catch (requestError: any) {
      showError(
        requestError?.response?.data
          ?.message ||
          "Thao tác tài khoản thất bại."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleToggleStatus =
    async (
      account: AccountItem
    ) => {
      const nextStatus =
        isActive(account)
          ? "inactive"
          : "active";

      const actionText =
        nextStatus === "active"
          ? "mở khóa"
          : "khóa";

      const confirmed =
        window.confirm(
          `Bạn có chắc muốn ${actionText} tài khoản ${account.username}?`
        );

      if (!confirmed) {
        return;
      }

      setActionLoadingId(
        account.id
      );
      setMessage("");
      setError("");

      try {
        const response =
          await apiClient.patch(
            `/api/accounts/${account.id}/status`,
            {
              status: nextStatus,
            }
          );

        showSuccess(
          response.data?.message ||
            "Cập nhật trạng thái thành công."
        );

        await loadAccounts(
          submittedSearch
        );
      } catch (requestError: any) {
        showError(
          requestError?.response?.data
            ?.message ||
            "Cập nhật trạng thái thất bại."
        );
      } finally {
        setActionLoadingId(null);
      }
    };

  const handleDelete = async (
    account: AccountItem
  ) => {
    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa tài khoản ${account.username}? Hành động này không thể hoàn tác.`
      );

    if (!confirmed) {
      return;
    }

    setActionLoadingId(account.id);
    setMessage("");
    setError("");

    try {
      const response =
        await apiClient.delete(
          `/api/accounts/${account.id}`
        );

      showSuccess(
        response.data?.message ||
          "Xóa tài khoản thành công."
      );

      if (
        editingId === account.id
      ) {
        resetForm();
      }

      await loadAccounts(
        submittedSearch
      );
    } catch (requestError: any) {
      showError(
        requestError?.response?.data
          ?.message ||
          "Xóa tài khoản thất bại."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSearchSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const keyword =
      search.trim();

    setSubmittedSearch(keyword);
    loadAccounts(keyword);
  };

  const handleClearSearch = () => {
    setSearch("");
    setSubmittedSearch("");
    loadAccounts("");
  };

  const handleRefresh = () => {
    loadAccounts(
      submittedSearch
    );
  };

  return (
    <div className="kj-account-page">
      <div className="kj-account-shell">
        <header className="kj-account-header">
          <div>
            <span className="kj-account-eyebrow">
              Account Management
            </span>

            <h1>
              Quản lý tài khoản
            </h1>

            <p>
              Tạo mới, chỉnh sửa vai trò,
              khóa, mở khóa và quản lý
              tài khoản trong hệ thống
              King Jades.
            </p>
          </div>

          <div className="kj-account-header__actions">
            <button
              type="button"
              className="kj-account-button kj-account-button--outline"
              onClick={() =>
                navigate(
                  "/admin-dashboard"
                )
              }
            >
              <ArrowIcon />
              Quay lại
            </button>

            <button
              type="button"
              className="kj-account-button kj-account-button--gold"
              onClick={
                handleOpenCreate
              }
            >
              <PlusIcon />
              Tạo tài khoản
            </button>
          </div>
        </header>

        <section
          className="kj-account-stats"
          aria-label="Thống kê tài khoản"
        >
          <article>
            <span>
              <UserIcon />
            </span>

            <div>
              <small>
                Tổng tài khoản
              </small>
              <strong>
                {stats.total}
              </strong>
            </div>
          </article>

          <article>
            <span>
              <CheckIcon />
            </span>

            <div>
              <small>
                Đang hoạt động
              </small>
              <strong>
                {stats.active}
              </strong>
            </div>
          </article>

          <article>
            <span>
              <LockIcon />
            </span>

            <div>
              <small>
                Đã khóa
              </small>
              <strong>
                {stats.inactive}
              </strong>
            </div>
          </article>

          <article>
            <span>
              <UserIcon />
            </span>

            <div>
              <small>
                Nhân viên
              </small>
              <strong>
                {stats.staff}
              </strong>
            </div>
          </article>
        </section>

        {message && (
          <div className="kj-account-alert kj-account-alert--success">
            <CheckIcon />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="kj-account-alert kj-account-alert--error">
            <span>!</span>
            <p>{error}</p>
          </div>
        )}

        <section className="kj-account-panel">
          <header className="kj-account-panel__header">
            <div>
              <span className="kj-account-eyebrow">
                Account Directory
              </span>

              <h2>
                Danh sách tài khoản
              </h2>

              <p>
                {submittedSearch
                  ? `Kết quả cho “${submittedSearch}”`
                  : "Hiển thị tất cả tài khoản hiện có."}
              </p>
            </div>

            <form
              className="kj-account-search"
              onSubmit={
                handleSearchSubmit
              }
            >
              <SearchIcon />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Tìm username, email, số điện thoại..."
                aria-label="Tìm tài khoản"
              />

              {submittedSearch && (
                <button
                  type="button"
                  className="kj-account-search__clear"
                  onClick={
                    handleClearSearch
                  }
                  aria-label="Xóa tìm kiếm"
                >
                  ×
                </button>
              )}

              <button
                type="submit"
                className="kj-account-search__submit"
              >
                Tìm
              </button>

              <button
                type="button"
                className="kj-account-search__refresh"
                onClick={
                  handleRefresh
                }
                aria-label="Tải lại danh sách"
                title="Tải lại"
              >
                <RefreshIcon />
              </button>
            </form>
          </header>

          {pageLoading ? (
            <div className="kj-account-state">
              <div className="kj-account-spinner" />
              <strong>
                Đang tải danh sách...
              </strong>
            </div>
          ) : accounts.length ===
            0 ? (
            <div className="kj-account-state">
              <span className="kj-account-state__icon">
                <UserIcon />
              </span>

              <strong>
                Chưa có tài khoản phù hợp
              </strong>

              <p>
                Tạo tài khoản mới hoặc thay
                đổi từ khóa tìm kiếm.
              </p>

              <button
                type="button"
                onClick={
                  handleOpenCreate
                }
              >
                <PlusIcon />
                Tạo tài khoản
              </button>
            </div>
          ) : (
            <div className="kj-account-table-wrap">
              <table className="kj-account-table">
                <thead>
                  <tr>
                    <th>Tài khoản</th>
                    <th>Liên hệ</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {accounts.map(
                    (account) => {
                      const accountActive =
                        isActive(
                          account
                        );

                      const roleName =
                        account.roleName ||
                        account.role ||
                        "Chưa phân quyền";

                      const isActionLoading =
                        actionLoadingId ===
                        account.id;

                      return (
                        <tr
                          key={account.id}
                        >
                          <td data-label="Tài khoản">
                            <div className="kj-account-user-cell">
                              <span>
                                {account.username
                                  ?.charAt(0)
                                  ?.toUpperCase() ||
                                  "K"}
                              </span>

                              <div>
                                <strong>
                                  {
                                    account.username
                                  }
                                </strong>

                                <small
                                  title={
                                    account.id
                                  }
                                >
                                  ID:{" "}
                                  {account.id}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td data-label="Liên hệ">
                            <div className="kj-account-contact-cell">
                              <strong>
                                {
                                  account.email
                                }
                              </strong>

                              <small>
                                {
                                  account.phone
                                }
                              </small>
                            </div>
                          </td>

                          <td data-label="Vai trò">
                            <span className="kj-account-role">
                              {roleName}
                            </span>
                          </td>

                          <td data-label="Trạng thái">
                            <span
                              className={`kj-account-status ${
                                accountActive
                                  ? "is-active"
                                  : "is-inactive"
                              }`}
                            >
                              <i />
                              {accountActive
                                ? "Hoạt động"
                                : "Đã khóa"}
                            </span>
                          </td>

                          <td data-label="Thao tác">
                            <div className="kj-account-row-actions">
                              <button
                                type="button"
                                className="kj-account-icon-button kj-account-icon-button--edit"
                                onClick={() =>
                                  handleOpenEdit(
                                    account
                                  )
                                }
                                disabled={
                                  isActionLoading
                                }
                                aria-label={`Sửa ${account.username}`}
                                title="Chỉnh sửa"
                              >
                                <EditIcon />
                              </button>

                              <button
                                type="button"
                                className={`kj-account-icon-button ${
                                  accountActive
                                    ? "kj-account-icon-button--lock"
                                    : "kj-account-icon-button--unlock"
                                }`}
                                onClick={() =>
                                  handleToggleStatus(
                                    account
                                  )
                                }
                                disabled={
                                  isActionLoading
                                }
                                aria-label={
                                  accountActive
                                    ? `Khóa ${account.username}`
                                    : `Mở khóa ${account.username}`
                                }
                                title={
                                  accountActive
                                    ? "Khóa tài khoản"
                                    : "Mở khóa tài khoản"
                                }
                              >
                                {accountActive ? (
                                  <LockIcon />
                                ) : (
                                  <CheckIcon />
                                )}
                              </button>

                              <button
                                type="button"
                                className="kj-account-icon-button kj-account-icon-button--delete"
                                onClick={() =>
                                  handleDelete(
                                    account
                                  )
                                }
                                disabled={
                                  isActionLoading
                                }
                                aria-label={`Xóa ${account.username}`}
                                title="Xóa tài khoản"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {mode !== "list" && (
          <section className="kj-account-form-panel">
            <header className="kj-account-form-panel__header">
              <div>
                <span className="kj-account-eyebrow">
                  {mode === "create"
                    ? "Create Account"
                    : "Update Account"}
                </span>

                <h2>
                  {mode === "create"
                    ? "Tạo tài khoản mới"
                    : "Chỉnh sửa tài khoản"}
                </h2>

                <p>
                  {mode === "create"
                    ? "Nhập đầy đủ thông tin và chọn vai trò phù hợp."
                    : "Để trống mật khẩu khi không cần thay đổi mật khẩu hiện tại."}
                </p>
              </div>

              <button
                type="button"
                className="kj-account-form-panel__close"
                onClick={resetForm}
                aria-label="Đóng form"
              >
                <CloseIcon />
              </button>
            </header>

            <form
              className="kj-account-form"
              onSubmit={
                handleSubmit
              }
              noValidate
            >
              <div className="kj-account-form__grid">
                <label className="kj-account-field">
                  <span>
                    Tên đăng nhập
                    <b>*</b>
                  </span>

                  <input
                    name="username"
                    value={
                      form.username
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Ví dụ: staff01"
                    autoComplete="username"
                  />
                </label>

                <label className="kj-account-field">
                  <span>
                    Email
                    <b>*</b>
                  </span>

                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={
                      handleChange
                    }
                    placeholder="staff01@kingjades.com"
                    autoComplete="email"
                  />
                </label>

                <label className="kj-account-field">
                  <span>
                    Số điện thoại
                    <b>*</b>
                  </span>

                  <input
                    name="phone"
                    value={form.phone}
                    onChange={
                      handleChange
                    }
                    placeholder="0900000001"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </label>

                <label className="kj-account-field">
                  <span>
                    Mật khẩu
                    {mode === "edit" && (
                      <small>
                        Không bắt buộc
                      </small>
                    )}
                  </span>

                  <input
                    name="password"
                    type="password"
                    value={
                      form.password
                    }
                    onChange={
                      handleChange
                    }
                    placeholder={
                      mode === "edit"
                        ? "Để trống nếu không đổi"
                        : "Nhập mật khẩu"
                    }
                    autoComplete="new-password"
                  />
                </label>

                <label className="kj-account-field">
                  <span>
                    Vai trò
                    <b>*</b>
                  </span>

                  <select
                    name="roleId"
                    value={form.roleId}
                    onChange={
                      handleChange
                    }
                  >
                    {roles.map(
                      (role) => (
                        <option
                          key={
                            role.roleId
                          }
                          value={
                            role.roleId
                          }
                        >
                          {role.roleName ||
                            role.role}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="kj-account-field">
                  <span>
                    Trạng thái
                    <b>*</b>
                  </span>

                  <select
                    name="status"
                    value={form.status}
                    onChange={
                      handleChange
                    }
                  >
                    <option value="active">
                      Hoạt động
                    </option>

                    <option value="inactive">
                      Khóa
                    </option>
                  </select>
                </label>
              </div>

              <div className="kj-account-form__actions">
                <button
                  type="button"
                  className="kj-account-button kj-account-button--outline"
                  onClick={resetForm}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="kj-account-button kj-account-button--gold"
                  disabled={
                    submitLoading
                  }
                >
                  {submitLoading
                    ? "Đang lưu..."
                    : mode === "create"
                      ? "Tạo tài khoản"
                      : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
};

export default AccountPage;