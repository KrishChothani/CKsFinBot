/** @format */

// src/services/apiClient.js
import axios from "axios";
import BACKEND_URL from "../Config/index.js";

const apiClient = axios.create({
  baseURL: `${BACKEND_URL}/api/v1`,
  withCredentials: true, // Important for cookies
});

// --- Interceptor to add the access token to every request ---
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// --- Interceptor to handle token refresh on 401 errors ---
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Use the refresh token stored in the cookie (managed by the browser)
        const { data } = await apiClient.post("/users/refresh-token");
        const newAccessToken = data.data.accessToken;
        localStorage.setItem("accessToken", newAccessToken);
        apiClient.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${newAccessToken}`;
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, log out the user
        console.error("Session expired. Please log in again.", refreshError);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        window.location.href = "/login"; // Force redirect to login
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// --- User API Calls ---
export const loginUser = (credentials) =>
  apiClient.post("/users/login", credentials);
export const registerUser = (userData) =>
  apiClient.post("/users/register", userData);
export const logoutUser = () => apiClient.post("/users/logout");
export const getCurrentUser = () => apiClient.get("/users/current-user");

// --- Conversation API Calls ---
export const getAllConversations = () => apiClient.get("/conversations");
export const getConversationById = (id) =>
  apiClient.get(`/conversations/${id}`);
export const createConversation = (title = "New Chat", featureUsed = "Smart_Chat") =>
  apiClient.post("/conversations", { title, featureUsed });

export const updateConversationFeature = (conversationId, featureUsed) =>
  apiClient.patch(`/conversations/${conversationId}/feature`, { featureUsed });
export const deleteConversation = (id) =>
  apiClient.delete(`/conversations/${id}`);

// --- Message & Document API Calls ---
export const createChatMessage = (conversationId, content) =>
  apiClient.post(`/conversations/${conversationId}/messages`, { content });
export const uploadDocuments = (conversationId, files) => {
  const formData = new FormData();
  formData.append("conversationId", conversationId);
  files.forEach((file) => {
    formData.append("documents", file);
  });

  return apiClient.post("/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// Generate presigned URL for S3 upload (bypasses 10MB limit)
export const generatePresignedUrl = (fileName, fileType) =>
  apiClient.post("/s3/generate-presigned-url", { fileName, fileType });

// Upload file directly to S3 using presigned URL
export const uploadToS3 = async (presignedUrl, file) => {
  return fetch(presignedUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });
};

// Register documents uploaded via S3 with the backend
export const registerS3Documents = (conversationId, documents) =>
  apiClient.post("/documents/upload-s3", { conversationId, documents });

export default apiClient;
