import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BASE_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ubukwe_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ubukwe_token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  verifyMfa: (data) => api.post('/auth/verify-mfa', data),
  sendEmailOtp: (user_id) => api.post('/auth/send-email-otp', { user_id }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  google: (session_id) => api.post('/auth/google', { session_id }),
  getTotpSetup: () => api.get('/auth/totp-setup'),
  verifyTotpSetup: (code) => api.post('/auth/verify-totp-setup', { code }),
};

// Inventory
export const inventoryAPI = {
  list: (params) => api.get('/inventory', { params }),
  get: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
  scan: (qr) => api.get(`/inventory/scan/${qr}`),
  stats: () => api.get('/inventory/stats'),
  categories: () => api.get('/inventory/categories'),
};

// Transactions
export const transactionAPI = {
  list: (params) => api.get('/transactions', { params }),
  get: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  stats: () => api.get('/transactions/stats'),
};

// Events
export const eventsAPI = {
  list: (params) => api.get('/events', { params }),
  get: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  stats: () => api.get('/events/stats'),
  getReport: (id) => api.get(`/events/${id}/report`, { responseType: 'blob' }),
};

// Staff
export const staffAPI = {
  list: (params) => api.get('/staff', { params }),
  get: (id) => api.get(`/staff/${id}`),
  update: (id, data) => api.put(`/staff/${id}`, data),
  shifts: (params) => api.get('/staff/shifts/all', { params }),
  createShift: (data) => api.post('/staff/shifts', data),
  updateShift: (id, data) => api.put(`/staff/shifts/${id}`, data),
  deleteShift: (id) => api.delete(`/staff/shifts/${id}`),
  stats: () => api.get('/staff/stats'),
};

// Vendors
export const vendorsAPI = {
  list: (params) => api.get('/vendors', { params }),
  get: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
};

// Admin
export const adminAPI = {
  users: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  auditLogs: (params) => api.get('/admin/audit-logs', { params }),
  stats: () => api.get('/admin/stats'),
  sessions: () => api.get('/admin/sessions'),
};

// Albums
export const albumAPI = {
  createForEvent: (eventId, data) => api.post(`/events/${eventId}/albums`, data),
  getByEvent: (eventId) => api.get(`/events/${eventId}/albums`),
  getById: (albumId) => api.get(`/albums/${albumId}`),
  qrCode: (albumId) => api.get(`/albums/${albumId}/qrcode`, { responseType: 'blob' }),
  deleteMedia: (albumId, mediaId) => api.delete(`/albums/${albumId}/media/${mediaId}`),
  toggleFavorite: (albumId, mediaId) => api.put(`/albums/${albumId}/media/${mediaId}/favorite`),
  deleteAlbum: (albumId) => api.delete(`/albums/${albumId}`),
};

// Wedding Planner
export const plannerAPI = {
  create: (data) => api.post('/wedding-plans', data),
  getCurrent: () => api.get('/wedding-plans/current'),
  get: (planId) => api.get(`/wedding-plans/${planId}`),
  update: (planId, data) => api.put(`/wedding-plans/${planId}`, data),
  delete: (planId) => api.delete(`/wedding-plans/${planId}`),
  dashboard: (planId) => api.get(`/wedding-plans/${planId}/dashboard`),
  // Budget
  listBudget: (planId) => api.get(`/wedding-plans/${planId}/budget`),
  budgetSummary: (planId) => api.get(`/wedding-plans/${planId}/budget/summary`),
  addBudget: (planId, data) => api.post(`/wedding-plans/${planId}/budget`, data),
  updateBudget: (planId, itemId, data) => api.put(`/wedding-plans/${planId}/budget/${itemId}`, data),
  deleteBudget: (planId, itemId) => api.delete(`/wedding-plans/${planId}/budget/${itemId}`),
  // Guests
  listGuests: (planId, params) => api.get(`/wedding-plans/${planId}/guests`, { params }),
  guestSummary: (planId) => api.get(`/wedding-plans/${planId}/guests/summary`),
  addGuest: (planId, data) => api.post(`/wedding-plans/${planId}/guests`, data),
  importGuests: (planId, formData) => api.post(`/wedding-plans/${planId}/guests/import`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateGuest: (planId, guestId, data) => api.put(`/wedding-plans/${planId}/guests/${guestId}`, data),
  deleteGuest: (planId, guestId) => api.delete(`/wedding-plans/${planId}/guests/${guestId}`),
  // Venues
  listVenues: (planId) => api.get(`/wedding-plans/${planId}/venues`),
  addVenue: (planId, data) => api.post(`/wedding-plans/${planId}/venues`, data),
  updateVenue: (planId, venueId, data) => api.put(`/wedding-plans/${planId}/venues/${venueId}`, data),
  deleteVenue: (planId, venueId) => api.delete(`/wedding-plans/${planId}/venues/${venueId}`),
  // Menu
  listMenu: (planId) => api.get(`/wedding-plans/${planId}/menu`),
  mealSummary: (planId) => api.get(`/wedding-plans/${planId}/menu/meal-summary`),
  addMenuItem: (planId, data) => api.post(`/wedding-plans/${planId}/menu`, data),
  updateMenuItem: (planId, itemId, data) => api.put(`/wedding-plans/${planId}/menu/${itemId}`, data),
  deleteMenuItem: (planId, itemId) => api.delete(`/wedding-plans/${planId}/menu/${itemId}`),
  // Design Assets
  listAssets: (planId) => api.get(`/wedding-plans/${planId}/design-assets`),
  uploadAsset: (planId, formData) => api.post(`/wedding-plans/${planId}/design-assets`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateAsset: (planId, assetId, data) => api.put(`/wedding-plans/${planId}/design-assets/${assetId}`, data),
  deleteAsset: (planId, assetId) => api.delete(`/wedding-plans/${planId}/design-assets/${assetId}`),
};

// AI
export const aiAPI = {
  greatness: (data) => api.post('/ai/greatness', data),
  checklist: (data) => api.post('/ai/checklist', data),
  budget: (data) => api.post('/ai/budget', data),
  vendors: (data) => api.post('/ai/vendors', data),
  chat: (data) => api.post('/ai/chat', data),
};
