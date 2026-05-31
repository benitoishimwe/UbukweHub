import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BASE_URL}/api`;

const TOKEN_KEY = 'plani_token';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap backend's { data: ..., message: ... } envelope and handle 401 globally
api.interceptors.response.use(
  (res) => {
    // Unwrap the R.ok / R.created envelope so callers get the payload directly
    if (res.data && typeof res.data === 'object' && 'data' in res.data && 'message' in res.data) {
      res.data = res.data.data;
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
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
  sendEmailOtp: (userId) => api.post('/auth/send-email-otp', { userId }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  getTotpSetup: () => api.get('/auth/totp-setup'),
  verifyTotpSetup: (code) => api.post('/auth/verify-totp-setup', { code }),
  previewInvitation: (token) => api.get(`/auth/invitation/${token}`),
  acceptInvitation: (data) => api.post('/auth/accept-invitation', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Inventory
export const inventoryAPI = {
  list: (params) => api.get('/inventory', { params }),
  get: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
  scan: (qr) => api.get(`/inventory/scan/${qr}`),
  qrCode: (id) => api.get(`/inventory/${id}/qrcode`, { responseType: 'blob' }),
  qrCodeData: (id) => api.get(`/inventory/${id}/qrcode/data`),
  stats: () => api.get('/inventory/stats'),
  categories: () => api.get('/inventory/categories'),
};

// Transactions
export const transactionAPI = {
  list: (params) => api.get('/transactions', { params }),
  get: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.patch(`/transactions/${id}`, data),
  stats: () => api.get('/transactions/stats'),
};

// Events
export const eventsAPI = {
  list: (params) => api.get('/events', { params }),
  get: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.patch(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  stats: () => api.get('/events/stats'),
  getTypes: () => api.get('/events/types'),
  getReport: (id) => api.get(`/events/${id}/report`, { responseType: 'blob' }),
  // Tasks
  listTasks:        (eventId, params) => api.get(`/events/${eventId}/tasks`, { params }),
  createTask:       (eventId, data)   => api.post(`/events/${eventId}/tasks`, data),
  updateTask:       (eventId, taskId, data) => api.patch(`/events/${eventId}/tasks/${taskId}`, data),
  deleteTask:       (eventId, taskId) => api.delete(`/events/${eventId}/tasks/${taskId}`),
  assignTask:       (taskId, assigneeId) => api.post(`/events/tasks/${taskId}/assign`, { assigneeId }),
  updateTaskStatus: (taskId, status)  => api.patch(`/events/tasks/${taskId}/status`, { status }),
  assignedToMe:     ()                => api.get('/events/tasks/assigned-to-me'),
};

// Notifications
export const notificationsAPI = {
  list:        () => api.get('/notifications'),
  markRead:    (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  dismiss:     (id) => api.delete(`/notifications/${id}`),
  clearAll:    () => api.delete('/notifications/clear-all'),
};

// Staff
export const staffAPI = {
  list: (params) => api.get('/staff', { params }),
  get: (id) => api.get(`/staff/${id}`),
  update: (id, data) => api.put(`/staff/${id}`, data),
  shifts: (params) => api.get('/staff/shifts/all', { params }),
  createShift: (data) => api.post('/staff/shifts', data),
  updateShift: (id, data) => api.patch(`/staff/shifts/${id}`, data),
  deleteShift: (id) => api.delete(`/staff/shifts/${id}`),
  stats: () => api.get('/staff/stats'),
  // Self-service endpoints for logged-in staff member
  myShifts: () => api.get('/staff/me/shifts'),
  myTasks: () => api.get('/staff/me/tasks'),
  updateMyTask: (taskId, data) => api.patch(`/staff/me/tasks/${taskId}`, data),
  myRecentTransactions: () => api.get('/staff/me/recent-transactions'),
};

// Vendors (admin CRUD + approval workflow)
export const vendorsAPI = {
  list: (params) => api.get('/vendors', { params }),
  get: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  approve: (id) => api.post(`/vendors/${id}/approve`),
  reject: (id, data) => api.post(`/vendors/${id}/reject`, data),
  updateInternalNotes: (id, notes) => api.patch(`/vendors/${id}/internal-notes`, { notes }),
  // Invite flow
  inviteVendor: (data) => api.post('/admin/vendors/invite', data),
  searchMarketplace: (params) => api.get('/admin/vendors/search', { params }),
  // Vendor invite acceptance (public)
  previewInvite: (token) => api.get('/vendors/accept-invite', { params: { token } }),
  acceptInvite: (data) => api.post('/vendors/accept-invite', data),
  // Event-vendor connections
  getEventVendors: (eventId) => api.get(`/admin/events/${eventId}/vendors`),
  connectToEvent: (eventId, vendorId) => api.post(`/admin/events/${eventId}/vendors/${vendorId}`),
  disconnectFromEvent: (eventId, vendorId) => api.delete(`/admin/events/${eventId}/vendors/${vendorId}`),
};

// Vendor self-service — legacy /me routes (kept for backward compat)
export const vendorMeAPI = {
  me: () => api.get('/vendors/me'),
  init: (data) => api.post('/vendors/me/init', data),
  updateMe: (data) => api.patch('/vendors/me', data),
  reviews: (params) => api.get('/vendors/me/reviews', { params }),
  inquiries: (params) => api.get('/vendors/me/inquiries', { params }),
};

// Vendor portal — full self-service suite
export const vendorPortalAPI = {
  profile: () => api.get('/vendors/portal/profile'),
  updateProfile: (data) => api.patch('/vendors/portal/profile', data),
  togglePublic: () => api.patch('/vendors/portal/profile/toggle-public'),
  onboarding: () => api.get('/vendors/portal/onboarding'),
  completeStep: (step) => api.post('/vendors/portal/onboarding/step', { step }),
  analytics: (params) => api.get('/vendors/portal/analytics', { params }),
  reviews: (params) => api.get('/vendors/portal/reviews', { params }),
  inquiries: (params) => api.get('/vendors/portal/inquiries', { params }),
  markInquiryRead: (id) => api.patch(`/vendors/portal/inquiries/${id}/mark-read`),
};

// Admin
export const adminAPI = {
  users: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  inviteUser: (data) => api.post('/admin/users/invite', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  changeRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  deactivateUser: (id) => api.post(`/admin/users/${id}/deactivate`),
  activateUser: (id) => api.post(`/admin/users/${id}/activate`),
  resendInvite: (id) => api.post(`/admin/users/${id}/resend-invite`),
  resetPassword: (id) => api.post(`/admin/users/${id}/reset-password`),
  linkVendor: (userId, vendorId) => api.post(`/admin/users/${userId}/link-vendor`, { vendorId }),
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
  update: (planId, data) => api.patch(`/wedding-plans/${planId}`, data),
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

// Super Admin
export const superAdminAPI = {
  stats: () => api.get('/super-admin/stats'),
  plans: () => api.get('/super-admin/plans'),
  // All users (platform-wide)
  listAllUsers: (params) => api.get('/super-admin/users', { params }),
  // Tenants
  listTenants: (params) => api.get('/super-admin/tenants', { params }),
  createTenant: (data) => api.post('/super-admin/tenants', data),
  getTenant: (id) => api.get(`/super-admin/tenants/${id}`),
  updateTenant: (id, data) => api.put(`/super-admin/tenants/${id}`, data),
  deactivateTenant: (id) => api.delete(`/super-admin/tenants/${id}`),
  hardDeleteTenant: (id) => api.delete(`/super-admin/tenants/${id}/hard-delete`),
  // Tenant users
  listTenantUsers: (tenantId, params) => api.get(`/super-admin/tenants/${tenantId}/users`, { params }),
  createTenantAdmin: (tenantId, data) => api.post(`/super-admin/tenants/${tenantId}/users`, data),
  // Invitations
  inviteUser: (tenantId, data) => api.post(`/super-admin/tenants/${tenantId}/invite`, data),
  listInvitations: (tenantId, params) => api.get(`/super-admin/tenants/${tenantId}/invitations`, { params }),
  // Subscription management
  grantPlan: (tenantId, data) => api.post(`/super-admin/tenants/${tenantId}/grant-plan`, data),
  grantTrial: (tenantId, data) => api.post(`/super-admin/tenants/${tenantId}/grant-trial`, data),
  emailTenant: (tenantId, data) => api.post(`/super-admin/tenants/${tenantId}/email`, data),
  // Feature gates
  features: () => api.get('/super-admin/features'),
  featureMatrix: () => api.get('/super-admin/feature-matrix'),
  updateFeature: (id, data) => api.patch(`/super-admin/features/${id}`, data),
  upsertFeatureGate: (data) => api.post('/super-admin/feature-gates', data),
  deleteFeatureGate: (id) => api.delete(`/super-admin/feature-gates/${id}`),
  // Subscriptions list
  subscriptions: (params) => api.get('/super-admin/subscriptions', { params }),
  // Custom email (any recipient)
  sendEmail: (data) => api.post('/super-admin/email', data),
  // Impersonation
  impersonate: (userId) => api.post(`/super-admin/impersonate/${userId}`),
  // Audit logs
  auditLogs: (params) => api.get('/super-admin/audit-logs', { params }),
  // Test accounts
  listTestAccounts:   ()     => api.get('/super-admin/test-accounts'),
  createTestAccount:  (data) => api.post('/super-admin/test-accounts', data),
  deleteTestAccount:  (id)   => api.delete(`/super-admin/test-accounts/${id}`),
};

// Messages
export const messagesAPI = {
  // Team DMs
  team:              ()           => api.get('/messages/team'),
  conversations:     ()           => api.get('/messages/conversations'),
  conversation:      (partnerId)  => api.get(`/messages/conversation/${partnerId}`),
  sendDM:            (data)       => api.post('/messages/dm', data),
  markConvRead:      (partnerId)  => api.patch(`/messages/conversation/${partnerId}/read`),
  unreadCount:       ()           => api.get('/messages/unread-count'),
  // Client broadcast (admin Clients tab)
  clientMessages:    ()           => api.get('/messages/clients'),
  sendClientMsg:     (data)       => api.post('/messages/clients', data),
  markClientsRead:   ()           => api.patch('/messages/clients/read'),
};

// Event chat channels
export const eventMessagesAPI = {
  // Channels
  listChannels: () => api.get('/channels'),

  // Messages
  list:   (eventId, params) => api.get(`/events/${eventId}/messages`, { params }),
  send:   (eventId, data)   => api.post(`/events/${eventId}/messages`, data),
  search: (eventId, q)      => api.get(`/events/${eventId}/messages/search`, { params: { q } }),
  markRead: (eventId)       => api.patch(`/events/${eventId}/read`),

  // File upload
  uploadFile: (eventId, formData) =>
    api.post(`/events/${eventId}/messages/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Pin / unpin
  pin:   (eventId, messageId, isPinned) => api.patch(`/events/${eventId}/messages/${messageId}/pin`, { isPinned }),

  // Convert to task
  createTask: (eventId, messageId, data) => api.post(`/events/${eventId}/messages/${messageId}/task`, data),

  // Typing
  setTyping: (eventId) => api.post(`/events/${eventId}/typing`),
  getTyping: (eventId) => api.get(`/events/${eventId}/typing`),
};

// Subscriptions
export const subscriptionsAPI = {
  plans:            ()         => api.get('/subscriptions/plans'),
  current:          ()         => api.get('/subscriptions/current'),
  me:               ()         => api.get('/subscriptions/me'),
  startTrial:       (plan)     => api.post('/subscriptions/trial', { plan }),
  mockUpgrade:      (plan)     => api.post('/subscriptions/mock-upgrade', { plan }),
  checkout:         (data)     => api.post('/subscriptions/checkout', data),
  weddingCheckout:  ()         => api.post('/subscriptions/wedding-checkout'),
  cancel:           ()         => api.post('/subscriptions/cancel'),
  resume:           ()         => api.post('/subscriptions/resume'),
  portal:           ()         => api.post('/subscriptions/portal'),
  invoices:         ()         => api.get('/subscriptions/invoices'),
};

// AI
export const aiAPI = {
  greatness: (data) => api.post('/ai/greatness', data),
  checklist: (data) => api.post('/ai/checklist', data),
  budget: (data) => api.post('/ai/budget', data),
  vendors: (data) => api.post('/ai/vendors', data),
  chat: (data) => api.post('/ai/chat', data),
};

// Guest Check-in (admin)
export const guestCheckinAPI = {
  getQr:       (eventId)          => api.get(`/events/${eventId}/guest-qr`),
  toggle:      (eventId, enabled) => api.patch(`/events/${eventId}/guest-checkin-toggle`, { enabled }),
  getCheckins: (eventId)          => api.get(`/events/${eventId}/guest-checkins`),
};

// Support
export const supportAPI = {
  // Chatbot
  chat:                 (data)     => api.post('/support/chat', data),
  publicChat:           (data)     => api.post('/public/support/chat', data),
  getChatHistory:       ()         => api.get('/support/chat/conversation'),
  // Tickets (user)
  createTicket:         (data)     => api.post('/support/ticket', data),
  createPublicTicket:   (data)     => api.post('/public/support/ticket', data),
  myTickets:            ()         => api.get('/support/tickets/mine'),
  replyTicket:          (id, msg)  => api.post(`/support/tickets/${id}/reply`, { message: msg }),
  getMessages:          (id)       => api.get(`/support/tickets/${id}/messages`),
  // Admin
  listTickets:          (params)   => api.get('/support/tickets', { params }),
  getTicket:            (id)       => api.get(`/support/tickets/${id}`),
  updateStatus:         (id, data) => api.patch(`/support/tickets/${id}/status`, data),
};
