import axios from "axios";

/* =====================================================
   AXIOS CLIENT
===================================================== */

const apiClient = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL || "",

  timeout: 30000,
});

/* =====================================================
   REQUEST INTERCEPTOR
===================================================== */

apiClient.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token");

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    /*
     * IMPORTANT:
     * FormData phải để browser tự tạo Content-Type:
     *
     * multipart/form-data; boundary=----...
     *
     * Nếu giữ application/json hoặc set
     * multipart/form-data thủ công thì ASP.NET Core
     * có thể trả 415 Unsupported Media Type.
     */
    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData
    ) {
      const headers =
        config.headers as any;

      if (
        headers &&
        typeof headers.delete ===
          "function"
      ) {
        headers.delete(
          "Content-Type"
        );
      } else if (headers) {
        delete headers[
          "Content-Type"
        ];

        delete headers[
          "content-type"
        ];
      }

      return config;
    }

    /*
     * JSON request bình thường.
     */
    if (
      config.data !== undefined &&
      config.data !== null
    ) {
      const headers =
        config.headers as any;

      if (
        headers &&
        typeof headers.set ===
          "function"
      ) {
        headers.set(
          "Content-Type",
          "application/json"
        );
      } else if (headers) {
        headers[
          "Content-Type"
        ] = "application/json";
      }
    }

    return config;
  },

  (error) =>
    Promise.reject(error)
);

/* =====================================================
   RESPONSE INTERCEPTOR
===================================================== */

apiClient.interceptors.response.use(
  (response) => response,

  (error) => {
    const serverMessage =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.response?.data?.title;

    if (serverMessage) {
      error.message =
        serverMessage;
    }

    return Promise.reject(error);
  }
);

export default apiClient;
