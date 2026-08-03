import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend is hosted on Railway - works from any network, no local IP or ngrok needed
const API_BASE_URL = 'https://stylebook-production-0f92.up.railway.app/api';
console.log('>>> API_BASE_URL IS:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  // 10s was too tight. A container that has been idle takes a few seconds to answer its
  // first request, and image uploads over mobile data are slower still — both were
  // timing out and surfacing as "Failed to save" on a request that would have succeeded.
  timeout: 25000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // No error.response means the request never reached the server or never came back:
    // a timeout, no signal, or the backend being unreachable. Screens all read
    // error.response.data.error, so fill that in centrally rather than leaving each one
    // to show its own vague fallback — "Failed to save" gave no hint it was the network.
    if (!error.response) {
      error.response = {
        status: 0,
        data: {
          error: error.code === 'ECONNABORTED'
            ? 'The server took too long to respond. Check your connection and try again.'
            : 'Could not reach the server. Check your connection and try again.',
        },
      };
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  registerCustomer: (data: any) => api.post('/auth/register/customer', data),
  registerOwner: (data: any) => api.post('/auth/register/owner', data),
  login: (data: any) => api.post('/auth/login', data),
  verifyOtp: (data: any) => api.post('/auth/verify-otp', data),
  resendOtp: (data: any) => api.post('/auth/resend-otp', data),
  forgotPassword: (data: any) => api.post('/auth/forgot-password', data),
  resetPassword: (data: any) => api.post('/auth/reset-password', data),
};

export const shopsAPI = {
  getAll: (query?: string, category?: string) => api.get('/shops', { params: { query, category } }),
  getNearby: (lat: number, lng: number) => api.get('/shops/nearby', { params: { lat, lng } }),
  getById: (id: string) => api.get(`/shops/${id}`),
  getMyShop: () => api.get('/shops/my-shop'),
  update: (data: any) => api.put('/shops/my-shop', data),
  uploadCover: (formData: FormData) => api.post('/shops/my-shop/cover-photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  addGalleryPhoto: (formData: FormData) => api.post('/shops/my-shop/gallery', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteGalleryPhoto: (photoId: string) => api.delete(`/shops/my-shop/gallery/${photoId}`),
  addService: (data: any) => api.post('/shops/my-shop/services', data),
  updateService: (serviceId: string, data: any) => api.put(`/shops/my-shop/services/${serviceId}`, data),
  removeService: (serviceId: string) => api.delete(`/shops/my-shop/services/${serviceId}`),
  updatePlan: (data: any) => api.put('/shops/my-shop/plan', data),
  toggleFavourite: (shopId: string) => api.post(`/shops/${shopId}/favourite`),
  getFavourites: () => api.get('/shops/favourites'),
};

export const bookingsAPI = {
  create: (data: any) => api.post('/bookings', data),
  getSlots: (shopId: string, date: string, serviceId: string) =>
    api.get(`/bookings/shop/${shopId}/slots`, { params: { date, serviceId } }),
  getUpcoming: () => api.get('/bookings/upcoming'),
  getPast: () => api.get('/bookings/past'),
  getShopUpcoming: () => api.get('/bookings/shop/upcoming'),
  getShopAll: () => api.get('/bookings/shop/all'),
  confirm: (id: string) => api.put(`/bookings/${id}/confirm`),
  cancel: (id: string) => api.put(`/bookings/${id}/cancel`),
  reschedule: (id: string, data: any) => api.put(`/bookings/${id}/reschedule`, data),
  // Owner records payment taken at the shop; omit fields to use listed price + cash
  recordPayment: (id: string, data?: { method?: string; amount?: number }) =>
    api.put(`/bookings/${id}/payment`, data ?? {}),
  deleteCancelled: (id: string) => api.delete(`/bookings/${id}`),
  deleteAllCancelled: () => api.delete('/bookings/shop/cancelled'),
};

export const reviewsAPI = {
  create: (data: any) => api.post('/reviews', data),
  getByShop: (shopId: string) => api.get(`/reviews/shop/${shopId}`),
  getBreakdown: (shopId: string) => api.get(`/reviews/shop/${shopId}/breakdown`),
  getMyReviews: () => api.get('/reviews/my-reviews'),
  addReply: (reviewId: string, data: any) => api.post(`/reviews/${reviewId}/reply`, data),
  deleteReply: (reviewId: string) => api.delete(`/reviews/${reviewId}/reply`),
};

export const postsAPI = {
  getFeed: () => api.get('/posts/feed'),
  getTrending: () => api.get('/posts/trending'),
  getByShop: (shopId: string) => api.get(`/posts/shop/${shopId}`),
  create: (data: any) => api.post('/posts', data),
  uploadImage: (formData: FormData) => api.post('/posts/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  toggleLike: (postId: string) => api.post(`/posts/${postId}/like`),
  addComment: (postId: string, data: any) => api.post(`/posts/${postId}/comments`, data),
  getComments: (postId: string) => api.get(`/posts/${postId}/comments`),
  delete: (postId: string) => api.delete(`/posts/${postId}`),
};

export const promosAPI = {
  getAll: () => api.get('/promos'),
  getMine: () => api.get('/promos/my'),
  uploadImage: (formData: FormData) => api.post('/promos/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  create: (data: any) => api.post('/promos', data),
  remove: (promoId: string) => api.delete(`/promos/${promoId}`),
};

export const notificationsAPI = {
  list: (userId: string, params?: { page?: number; size?: number; unread?: boolean }) =>
    api.get('/notifications', { params: { userId, ...params } }),
  unreadCount: (userId: string) => api.get('/notifications/unread-count', { params: { userId } }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: (userId: string) => api.patch('/notifications/mark-all-read', null, { params: { userId } }),

  // Server-side notification settings (shared across all the user's devices)
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data: Partial<NotificationPreferences>) =>
    api.put('/notifications/preferences', data),

  // Push token registration
  registerDevice: (data: { token: string; platform: string }) =>
    api.post('/notifications/devices', data),
  unregisterDevice: (token: string) =>
    api.delete('/notifications/devices', { params: { token } }),
};

export const messagesAPI = {
  getConversations: () => api.get('/messages/conversations'),
  // Opens the thread with a shop, or reopens the existing one
  openConversation: (shopId: string) => api.post('/messages/conversations', { shopId }),
  getMessages: (conversationId: string) => api.get(`/messages/conversations/${conversationId}`),
  send: (conversationId: string, body: string) =>
    api.post(`/messages/conversations/${conversationId}`, { body }),
  markRead: (conversationId: string) =>
    api.patch(`/messages/conversations/${conversationId}/read`),
  unreadCount: () => api.get('/messages/unread-count'),
};

export interface Conversation {
  id: string;
  shopId: string;
  otherPartyName: string;
  otherPartyImageUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  mine: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  bookingEnabled: boolean;
  messageEnabled: boolean;
  reviewEnabled: boolean;
  socialEnabled: boolean;
  paymentEnabled: boolean;
}

export default api;