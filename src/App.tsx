import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SiteProvider } from "@/contexts/SiteContext";
import { ProtectedRoute, PublicOnlyRoute, AdminRoute } from "@/components/ProtectedRoute";
import MaintenanceWrapper from "@/components/MaintenanceWrapper";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TwoFactorVerify from "./pages/TwoFactorVerify";
import Support2FA from "./pages/Support2FA";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import OAuthCallback from "./pages/OAuthCallback";
import VerifyEmail from "./pages/VerifyEmail";
import Dashboard from "./pages/Dashboard";
import HostingList from "./pages/HostingList";
import CreateHosting from "./pages/CreateHosting";
import HostingDetails from "./pages/HostingDetails";
import HostingSettings from "./pages/HostingSettings";
import CpanelLogin from "./pages/CpanelLogin";
import UserTickets from "./pages/UserTickets";
import UserSettings from "./pages/UserSettings";
import UserNotifications from "./pages/UserNotifications";
import SSLManagement from "./pages/SSLManagement";
import SSLCertificateDetail from "./pages/SSLCertificateDetail";
import NotFound from "./pages/NotFound";
// Admin pages
import Install from "./pages/Install";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminHostings from "./pages/admin/AdminHostings";
import AdminHostingDetails from "./pages/admin/AdminHostingDetails";
import AdminEmailSettings from "./pages/admin/AdminEmailSettings";
import AdminSSLSettings from "./pages/admin/AdminSSLSettings";
import AdminSSLCertificates from "./pages/admin/AdminSSLCertificates";
import AdminSSLCertificateDetail from "./pages/admin/AdminSSLCertificateDetail";
import AdminSMTPSettings from "./pages/admin/AdminSMTPSettings";
import AdminEmailTemplates from "./pages/admin/AdminEmailTemplates";
import AdminEmailSend from "./pages/admin/AdminEmailSend";
import AdminEmailLogs from "./pages/admin/AdminEmailLogs";
import AdminGeneralSettings from "./pages/admin/AdminGeneralSettings";
import AdminBuilderSettings from "./pages/admin/AdminBuilderSettings";
import WebsiteBuilder from "./pages/WebsiteBuilder";
import AdminLandingPageEditor from "./pages/admin/AdminLandingPageEditor";
// Ticket pages
import AdminTickets from "./pages/admin/AdminTickets";
import AdminSupportRatings from "./pages/admin/AdminSupportRatings";
import AdminRedirect from "./pages/admin/AdminRedirect";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminBackup from "./pages/admin/AdminBackup";
// Tools pages
import Base64Tool from "./pages/tools/Base64Tool";
import CaseConverter from "./pages/tools/CaseConverter";
import CodeBeautifier from "./pages/tools/CodeBeautifier";
import ColorTools from "./pages/tools/ColorTools";
import CSSGridGenerator from "./pages/tools/CSSGridGenerator";
import CdnSearch from "./pages/CdnSearch";
// Knowledge Base
import KnowledgeBase from "./pages/KnowledgeBase";
import AdminKnowledgeBase from "./pages/admin/AdminKnowledgeBase";
import AdminKBArticleForm from "./pages/admin/AdminKBArticleForm";
import AdminKBCategoryForm from "./pages/admin/AdminKBCategoryForm";
// Upgrade / Premium Plans
import UpgradePlan from "./pages/UpgradePlan";
import AdminPremiumPlans from "./pages/admin/AdminPremiumPlans";
import AdminDataImport from "./pages/admin/AdminDataImport";
// Forum
import Forum from "./pages/Forum";
import ForumPostPage from "./pages/ForumPost";
import ForumCreatePost from "./pages/ForumCreatePost";
import AdminForumChannels from "./pages/admin/AdminForumChannels";
import AdminForumPosts from "./pages/admin/AdminForumPosts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: true, // Always refetch when component mounts
      retry: 1,
      staleTime: 0, // Data is immediately stale, will refetch on mount
      gcTime: 1000 * 60 * 5, // Keep unused data in cache for 5 minutes (for back navigation)
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="freehost-ui-theme">
      <LanguageProvider>
        <SiteProvider>
        <AuthProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <MaintenanceWrapper>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/install" element={<Install />} />
              <Route path="/login" element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              } />
              <Route path="/register" element={
                <PublicOnlyRoute>
                  <Register />
                </PublicOnlyRoute>
              } />
              <Route path="/2fa-verify" element={<TwoFactorVerify />} />
              <Route path="/support/2fa" element={<Support2FA />} />
              <Route path="/oauth-callback" element={<OAuthCallback />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={
                <PublicOnlyRoute>
                  <ForgotPassword />
                </PublicOnlyRoute>
              } />
              <Route path="/reset-password" element={
                <PublicOnlyRoute>
                  <ResetPassword />
                </PublicOnlyRoute>
              } />
              {/* Legacy redirects for old URLs */}
              <Route path="/dashboard" element={<Navigate to="/user/dashboard" replace />} />
              <Route path="/dashboard/*" element={<Navigate to="/user/dashboard" replace />} />
              <Route path="/hosting" element={<Navigate to="/user/hosting" replace />} />
              <Route path="/hosting/*" element={<Navigate to="/user/hosting" replace />} />
              {/* User Routes */}
              <Route path="/user/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/user/hosting" element={
                <ProtectedRoute>
                  <HostingList />
                </ProtectedRoute>
              } />
              <Route path="/user/hosting/create" element={
                <ProtectedRoute>
                  <CreateHosting />
                </ProtectedRoute>
              } />
              <Route path="/user/hosting/:username" element={
                <ProtectedRoute>
                  <HostingDetails />
                </ProtectedRoute>
              } />
              <Route path="/user/hosting/:username/settings" element={
                <ProtectedRoute>
                  <HostingSettings />
                </ProtectedRoute>
              } />
              <Route path="/user/hosting/:username/cpanel" element={
                <ProtectedRoute>
                  <CpanelLogin />
                </ProtectedRoute>
              } />
              <Route path="/user/hosting/:username/builder" element={
                <ProtectedRoute>
                  <WebsiteBuilder />
                </ProtectedRoute>
              } />
              <Route path="/user/ssl" element={
                <ProtectedRoute>
                  <SSLManagement />
                </ProtectedRoute>
              } />
              <Route path="/user/ssl/:id" element={
                <ProtectedRoute>
                  <SSLCertificateDetail />
                </ProtectedRoute>
              } />
              <Route path="/user/tickets" element={
                <ProtectedRoute>
                  <UserTickets />
                </ProtectedRoute>
              } />
              <Route path="/user/settings" element={
                <ProtectedRoute>
                  <UserSettings />
                </ProtectedRoute>
              } />
              <Route path="/user/notifications" element={
                <ProtectedRoute>
                  <UserNotifications />
                </ProtectedRoute>
              } />
              {/* Tools Routes */}
              <Route path="/user/tools/base64" element={
                <ProtectedRoute>
                  <Base64Tool />
                </ProtectedRoute>
              } />
              <Route path="/user/tools/case-converter" element={
                <ProtectedRoute>
                  <CaseConverter />
                </ProtectedRoute>
              } />
              <Route path="/user/tools/code-beautifier" element={
                <ProtectedRoute>
                  <CodeBeautifier />
                </ProtectedRoute>
              } />
              <Route path="/user/tools/color-tools" element={
                <ProtectedRoute>
                  <ColorTools />
                </ProtectedRoute>
              } />
              <Route path="/user/tools/css-grid" element={
                <ProtectedRoute>
                  <CSSGridGenerator />
                </ProtectedRoute>
              } />
              <Route path="/user/tools/cdn-search" element={
                <ProtectedRoute>
                  <CdnSearch />
                </ProtectedRoute>
              } />
              <Route path="/user/knowledge-base" element={
                <ProtectedRoute>
                  <KnowledgeBase />
                </ProtectedRoute>
              } />
              {/* Forum Routes */}
              <Route path="/user/forum" element={
                <ProtectedRoute>
                  <Forum />
                </ProtectedRoute>
              } />
              <Route path="/user/forum/post/:id" element={
                <ProtectedRoute>
                  <ForumPostPage />
                </ProtectedRoute>
              } />
              <Route path="/user/forum/new" element={
                <ProtectedRoute>
                  <ForumCreatePost />
                </ProtectedRoute>
              } />
              <Route path="/user/forum/edit/:id" element={
                <ProtectedRoute>
                  <ForumCreatePost />
                </ProtectedRoute>
              } />
              {/* Upgrade Plan - Hidden from menu */}
              <Route path="/user/upgrade" element={
                <ProtectedRoute>
                  <UpgradePlan />
                </ProtectedRoute>
              } />
              <Route path="/user/hosting/:username/upgrade" element={
                <ProtectedRoute>
                  <UpgradePlan />
                </ProtectedRoute>
              } />
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminRedirect />} />
              <Route path="/admin/dashboard" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              <Route path="/admin/users" element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              } />
              <Route path="/admin/hostings" element={
                <AdminRoute>
                  <AdminHostings />
                </AdminRoute>
              } />
              <Route path="/admin/hostings/:vpUsername" element={
                <AdminRoute>
                  <AdminHostingDetails />
                </AdminRoute>
              } />
              <Route path="/admin/tickets" element={
                <AdminRoute>
                  <AdminTickets />
                </AdminRoute>
              } />
              <Route path="/admin/support-ratings" element={
                <AdminRoute>
                  <AdminSupportRatings />
                </AdminRoute>
              } />
              <Route path="/admin/settings/*" element={
                <AdminRoute>
                  <AdminSettings />
                </AdminRoute>
              } />
              <Route path="/admin/email" element={
                <AdminRoute>
                  <AdminEmailSettings />
                </AdminRoute>
              } />
              <Route path="/admin/email/templates" element={
                <AdminRoute>
                  <AdminEmailTemplates />
                </AdminRoute>
              } />
              <Route path="/admin/email/send" element={
                <AdminRoute>
                  <AdminEmailSend />
                </AdminRoute>
              } />
              <Route path="/admin/email/logs" element={
                <AdminRoute>
                  <AdminEmailLogs />
                </AdminRoute>
              } />
              <Route path="/admin/notifications" element={
                <AdminRoute>
                  <AdminNotifications />
                </AdminRoute>
              } />
              <Route path="/admin/ssl" element={
                <AdminRoute>
                  <AdminSSLSettings />
                </AdminRoute>
              } />
              <Route path="/admin/ssl-certificates" element={
                <AdminRoute>
                  <AdminSSLCertificates />
                </AdminRoute>
              } />
              <Route path="/admin/ssl-certificates/:id" element={
                <AdminRoute>
                  <AdminSSLCertificateDetail />
                </AdminRoute>
              } />
              <Route path="/admin/settings/ssl" element={
                <AdminRoute>
                  <AdminSSLSettings />
                </AdminRoute>
              } />
              <Route path="/admin/settings/smtp" element={
                <AdminRoute>
                  <AdminSMTPSettings />
                </AdminRoute>
              } />
              <Route path="/admin/settings/general" element={
                <AdminRoute>
                  <AdminGeneralSettings />
                </AdminRoute>
              } />
              <Route path="/admin/settings/builder" element={
                <AdminRoute>
                  <AdminBuilderSettings />
                </AdminRoute>
              } />
              <Route path="/admin/settings/backup" element={
                <AdminRoute>
                  <AdminBackup />
                </AdminRoute>
              } />
              <Route path="/admin/landing-page" element={
                <AdminRoute>
                  <AdminLandingPageEditor />
                </AdminRoute>
              } />
              <Route path="/admin/knowledge-base" element={
                <AdminRoute>
                  <AdminKnowledgeBase />
                </AdminRoute>
              } />
              <Route path="/admin/knowledge-base/article/new" element={
                <AdminRoute>
                  <AdminKBArticleForm />
                </AdminRoute>
              } />
              <Route path="/admin/knowledge-base/article/:id" element={
                <AdminRoute>
                  <AdminKBArticleForm />
                </AdminRoute>
              } />
              <Route path="/admin/knowledge-base/category/new" element={
                <AdminRoute>
                  <AdminKBCategoryForm />
                </AdminRoute>
              } />
              <Route path="/admin/knowledge-base/category/:id" element={
                <AdminRoute>
                  <AdminKBCategoryForm />
                </AdminRoute>
              } />
              {/* Admin Forum Routes */}
              <Route path="/admin/forum/channels" element={
                <AdminRoute>
                  <AdminForumChannels />
                </AdminRoute>
              } />
              <Route path="/admin/forum/posts" element={
                <AdminRoute>
                  <AdminForumPosts />
                </AdminRoute>
              } />
              <Route path="/admin/premium-plans" element={
                <AdminRoute>
                  <AdminPremiumPlans />
                </AdminRoute>
              } />
              <Route path="/admin/data-import" element={
                <AdminRoute>
                  <AdminDataImport />
                </AdminRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </MaintenanceWrapper>
          </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
        </SiteProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
