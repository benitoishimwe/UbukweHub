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

// AI
export const aiAPI = {
  greatness: (data) => api.post('/ai/greatness', data),
  checklist: (data) => api.post('/ai/checklist', data),
  budget: (data) => api.post('/ai/budget', data),
  vendors: (data) => api.post('/ai/vendors', data),
  chat: (data) => api.post('/ai/chat', data),
};
