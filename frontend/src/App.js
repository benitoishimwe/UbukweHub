import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import DashboardPage from './pages/DashboardPage';
import StaffDashboard from './pages/StaffDashboard';
import ClientDashboard from './pages/ClientDashboard';
import VendorDashboard from './pages/VendorDashboard';
import EventManagerDashboard from './pages/EventManagerDashboard';
import EventsPage from './pages/EventsPage';
import InventoryPage from './pages/InventoryPage';
import TransactionsPage from './pages/TransactionsPage';
import StaffPage from './pages/StaffPage';
import VendorsPage from './pages/VendorsPage';
import AdminPage from './pages/AdminPage';
import AIAssistantPage from './pages/AIAssistantPage';
import ReportsPage from './pages/ReportsPage';
import PricingPage from './pages/PricingPage';
import SettingsPage from './pages/SettingsPage';
import AlbumGalleryPage from './pages/AlbumGalleryPage';
import GuestUploadPage from './pages/GuestUploadPage';
import PlannerPage from './pages/PlannerPage';
import SaveTheDatePage from './pages/SaveTheDatePage';
import MarketplacePage from './pages/MarketplacePage';
import VendorProfilePage from './pages/VendorProfilePage';
import PublicSaveTheDatePage from './pages/PublicSaveTheDatePage';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import AcceptVendorInvite from './pages/AcceptVendorInvite';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OnboardingWizardPage from './pages/OnboardingWizardPage';
import MessagesPage from './pages/MessagesPage';
import BillingPage from './pages/BillingPage';
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import TenantsPage from './pages/super-admin/TenantsPage';
import TenantDetailsPage from './pages/super-admin/TenantDetailsPage';
import AuditLogsPage from './pages/super-admin/AuditLogsPage';
import SubscriptionsPage from './pages/super-admin/SubscriptionsPage';
import TestAccountsPage from './pages/super-admin/TestAccountsPage';
import SuperAdminUsersPage from './pages/super-admin/SuperAdminUsersPage';
import GuestCheckinPage from './pages/GuestCheckinPage';
import SupportCenter from './pages/SupportCenter';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import SupportDashboard from './pages/admin/SupportDashboard';
import { Toaster } from 'sonner';
import { registerServiceWorker } from './services/offline';
import './App.css';

registerServiceWorker();

const Wrap = ({ children }) => (
  <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>
);

/** Routes to the role-specific dashboard component. */
function DashboardGate() {
  const { isStaff, isClient, isVendor, isEventManager } = useAuth();
  if (isVendor)       return <VendorDashboard />;
  if (isStaff)        return <StaffDashboard />;
  if (isClient)       return <ClientDashboard />;
  if (isEventManager) return <EventManagerDashboard />;
  return <DashboardPage />;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/"                   element={<LandingPage />} />
      <Route path="/login"              element={<LoginPage />} />
      <Route path="/auth/callback"      element={<AuthCallback />} />
      <Route path="/upload/:token"      element={<GuestUploadPage />} />
      <Route path="/accept-invitation"       element={<AcceptInvitationPage />} />
      <Route path="/accept-vendor-invite"    element={<AcceptVendorInvite />} />
      <Route path="/reset-password"          element={<ResetPasswordPage />} />
      <Route path="/marketplace"        element={<MarketplacePage />} />
      <Route path="/card/:designId"     element={<PublicSaveTheDatePage />} />
      <Route path="/guest/checkin/:eventId" element={<GuestCheckinPage />} />
      <Route path="/privacy-policy"       element={<PrivacyPolicyPage />} />
      <Route path="/terms"                element={<TermsPage />} />

      {/* Onboarding */}
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizardPage /></ProtectedRoute>} />

      {/* Authenticated app */}
      <Route path="/dashboard"          element={<Wrap><DashboardGate /></Wrap>} />
      <Route path="/events"             element={<Wrap><EventsPage /></Wrap>} />
      <Route path="/inventory"          element={<Wrap><InventoryPage /></Wrap>} />
      <Route path="/transactions"       element={<Wrap><TransactionsPage /></Wrap>} />
      <Route path="/staff"              element={<Wrap><StaffPage /></Wrap>} />
      <Route path="/vendors"            element={<Wrap><VendorsPage /></Wrap>} />
      <Route path="/ai"                 element={<Wrap><AIAssistantPage /></Wrap>} />
      <Route path="/reports"            element={<Wrap><ReportsPage /></Wrap>} />
      <Route path="/settings"           element={<Wrap><SettingsPage /></Wrap>} />
      <Route path="/pricing"            element={<Wrap><PricingPage /></Wrap>} />
      <Route path="/planner"            element={<Wrap><PlannerPage /></Wrap>} />
      <Route path="/save-the-date"      element={<Wrap><SaveTheDatePage /></Wrap>} />
      <Route path="/vendor-profile"     element={<Wrap><VendorProfilePage /></Wrap>} />
      <Route path="/messages"           element={<Wrap><MessagesPage /></Wrap>} />
      <Route path="/billing"            element={<Wrap><BillingPage /></Wrap>} />
      <Route path="/events/:eventId/album" element={<Wrap><AlbumGalleryPage /></Wrap>} />
      <Route path="/support"             element={<Wrap><SupportCenter /></Wrap>} />

      {/* Admin */}
      <Route path="/admin/support" element={
        <ProtectedRoute roles={['tenant_admin', 'super_admin']}>
          <Layout><SupportDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute roles={['tenant_admin', 'super_admin', 'event_manager']}>
          <Layout><AdminPage /></Layout>
        </ProtectedRoute>
      } />

      {/* Super admin */}
      <Route path="/super-admin" element={
        <ProtectedRoute roles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>
      } />
      <Route path="/super-admin/users" element={
        <ProtectedRoute roles={['super_admin']}><SuperAdminDashboard><SuperAdminUsersPage /></SuperAdminDashboard></ProtectedRoute>
      } />
      <Route path="/super-admin/tenants" element={
        <ProtectedRoute roles={['super_admin']}><SuperAdminDashboard><TenantsPage /></SuperAdminDashboard></ProtectedRoute>
      } />
      <Route path="/super-admin/tenants/:tenantId" element={
        <ProtectedRoute roles={['super_admin']}><SuperAdminDashboard><TenantDetailsPage /></SuperAdminDashboard></ProtectedRoute>
      } />
      <Route path="/super-admin/subscriptions" element={
        <ProtectedRoute roles={['super_admin']}><SuperAdminDashboard><SubscriptionsPage /></SuperAdminDashboard></ProtectedRoute>
      } />
      <Route path="/super-admin/audit-logs" element={
        <ProtectedRoute roles={['super_admin']}><SuperAdminDashboard><AuditLogsPage /></SuperAdminDashboard></ProtectedRoute>
      } />
      <Route path="/super-admin/support" element={
        <ProtectedRoute roles={['super_admin']}><SuperAdminDashboard><SupportDashboard /></SuperAdminDashboard></ProtectedRoute>
      } />
      <Route path="/super-admin/test-accounts" element={
        <ProtectedRoute roles={['super_admin']}><SuperAdminDashboard><TestAccountsPage /></SuperAdminDashboard></ProtectedRoute>
      } />

      {/* Catch-all: authenticated users go to dashboard */}
      <Route path="*" element={<Wrap><DashboardGate /></Wrap>} />
    </Routes>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <BrowserRouter>
            <AppRouter />
            <Toaster position="top-right" richColors closeButton />
          </BrowserRouter>
        </SubscriptionProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
