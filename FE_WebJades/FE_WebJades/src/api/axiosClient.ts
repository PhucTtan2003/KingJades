import axios from "axios";

const axiosClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "",
});
axiosClient.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token");

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    // ==========================================
    // FORMDATA
    // ==========================================
    //
    // Không set Content-Type.
    // Browser phải tự sinh:
    //
    // multipart/form-data; boundary=...
    //
    if (config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers[
          "Content-Type"
        ];
      }

      return config;
    }

    // ==========================================
    // JSON
    // ==========================================

    if (
      config.data !== undefined &&
      config.data !== null
    ) {
      config.headers[
        "Content-Type"
      ] = "application/json";
    }

    return config;
  },

  (error) =>
    Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) =>
    response,

  (error) => {
    const serverMessage =
      error.response?.data?.message;

    if (serverMessage) {
      error.message =
        serverMessage;
    }

    return Promise.reject(error);
  }
);

export default axiosClient;