import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Backend is hosted on Railway - works from any network, no local IP or ngrok needed
const API_BASE_URL = 'https://stylebook-production-0f92.up.railway.app/api';
console.log('>>> API_BASE_URL IS:', API_BASE_URL);
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const authAPI = {
  registerCustomer: (data: any) => api.post('/auth/register/customer', data),
  registerOwner: (data: any) => api.post('/auth/register/owner', data),
  login: (data: any) => api.post('/auth/login', data),
  verifyOtp: (data: any) => api.post('/auth/verify-otp', data),
  resendOtp: (data: any) => api.post('/auth/resend-otp', data),
  forgotPassword: (data: any) => api.post('/auth/forgot-password', data),
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
};
export default api;