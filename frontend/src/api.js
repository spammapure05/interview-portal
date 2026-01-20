import axios from "axios";

const api = axios.create({
  baseURL: "/api"
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor per gestire errori 401 (token scaduto/invalido)
api.interceptors.response.use(
  response => response,
  error => {
    // Non fare redirect per /auth/me - viene gestito dall'authContext
    const isAuthMeRequest = error.config?.url === "/auth/me";

    if (error.response?.status === 401 && !isAuthMeRequest) {
      // Token non valido, rimuovi e ricarica
      localStorage.removeItem("token");
      localStorage.removeItem("lastActivity");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
